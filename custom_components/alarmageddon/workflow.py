"""
Aktionen als Ablauf: pro Anlage und Auslöser (Alarm im Modus Anwesend,
Abwesend, Nacht oder durch einen "immer aktiven" Sensor) eine Liste von
Schritten: Push-Meldung, beliebige HA-Aktion, Warten, Alarmton auf Medienplayern.

Sicherheitsregeln (CLAUDE.md):
- Ein Fehler in einem Schritt bricht die übrigen nicht ab.
- Deaktivieren stoppt alle laufenden Schritte und stellt den Zustand vor dem
  Alarm wieder her (Lautstärke, Wiedergabe, Schalter), auch nach einem Neustart.
  Darum speichert der Ablauf vor dem ersten Schritt einen eigenen Schnappschuss
  in einer Ablage; die Szenen von HA überleben keinen Neustart.
"""

from __future__ import annotations

import asyncio
from contextvars import ContextVar
from datetime import timedelta
from functools import partial
import logging
from typing import Any

from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.event import async_call_later
from homeassistant.helpers.network import NoURLAvailableError, get_url
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import ALL_SOUNDS, CONF_WORKFLOWS, CONF_WORKFLOWS_AFTER, CONF_WORKFLOWS_ARMED, RESTORABLE_DOMAINS, TEST_SECONDS, WORKFLOW_STORE_KEY
from .controller import ARMED_STATE, AlarmController
from .sound_loop import LOOP_MAX_SECONDS, loop_url

_LOGGER = logging.getLogger(__name__)

ARMED_STATES = frozenset(str(state) for state in ARMED_STATE.values())
# Ein Gerät, das länger nicht antwortet, hält den Ablauf nie auf: nach dieser Zeit (Sekunden) läuft er mit dem nächsten Schritt weiter.
# Der hängende Aufruf wird nicht abgebrochen (ein Skript soll weiterlaufen dürfen), nur nicht mehr abgewartet; Deaktivieren beendet ihn.
SERVICE_TIMEOUT = 10
# Der Schnappschuss vor dem ersten Schritt darf den Alarm höchstens so lange verzögern
SNAPSHOT_TIMEOUT = 3
# Wächter: Zuschlag (Sekunden) auf die erwartete Dauer, bevor er eingreift. Die erwartete Dauer eines Schritts steht in
# step_budget, die der Vorbereitung in start_budget. Der Wächter ist die zweite Sicherung hinter den Grenzen oben: er
# greift auch, wenn etwas aus einem Grund hängt, den niemand vorhergesehen hat.
WATCHDOG_GRACE = 2
# Was vom Zustand eines Geräts für die Wiederherstellung zählt
KEEP_ATTRS = ("brightness", "color_temp_kelvin", "current_position", "volume_level", "is_volume_muted", "source")


def step_budget(step: dict[str, Any]) -> float:
    """
    So lange darf ein abgewarteter Schritt höchstens dauern, bevor der Wächter ihn verlässt und der nächste Schritt läuft.
    Jede Art von Schritt hat eine endliche Grenze (tests/test_action_hang.py prüft das für jeden Typ aus schemas.STEP_SCHEMAS).
    """
    kind = step.get("type")
    if kind == "notify":
        return WATCHDOG_GRACE  # Meldungen gehen ohne Abwarten hinaus
    if kind == "acknowledge":
        return WATCHDOG_GRACE  # sofort, ohne Gerätezugriff
    if kind == "wait":
        return max(0, int(step.get("seconds", 0) or 0)) + WATCHDOG_GRACE
    if kind in ("sound", "chime", "prealarm"):
        length = ALL_SOUNDS.get(step.get("sound"), max(ALL_SOUNDS.values()))
        duration = step.get("duration")
        if duration is None:  # ältere Form: so oft wiederholen, jeder Aufruf höchstens SERVICE_TIMEOUT
            repeat = max(1, int(step.get("repeat", 1) or 1))
            return repeat * (length + SERVICE_TIMEOUT) + SERVICE_TIMEOUT + WATCHDOG_GRACE
        # Lautstärke, letzter Start und Stopp je höchstens SERVICE_TIMEOUT, dazu ein angefangener Ton
        return int(duration or 0) + length + 3 * SERVICE_TIMEOUT + WATCHDOG_GRACE
    return SERVICE_TIMEOUT + WATCHDOG_GRACE  # Aktion (und jeder künftige Typ, bis er eine eigene Grenze bekommt)


def step_waits(step: dict[str, Any]) -> bool:
    """
    Wartet der Ablauf auf das Ende dieses Schritts, bevor der nächste startet?

    Seit 1.10.0 laufen Schritte, die etwas ausführen (Gerät, Ton), standardmässig weiter: der nächste startet sofort. Nur mit
    "wait" wartet der Ablauf. Ältere Abläufe (bis 1.9.0) kennen "wait" nicht: dort wurde gewartet, ausser mit "detach"; sie
    verhalten sich unverändert, bis sie im Panel neu gespeichert werden. Ein Ton "bis zum Deaktivieren" (Dauer 0) endet nie von
    selbst, auf ihn lässt sich nicht warten. Warten, Meldung und Quittieren gehören zum Ablauf selbst (kein Nebenher).
    """
    kind = step.get("type")
    if kind not in ("action", "sound", "chime", "prealarm"):
        return True
    if kind == "sound" and step.get("duration") == 0:
        return False
    if "wait" in step:
        return bool(step["wait"])
    if kind == "chime":
        return False  # neue Schrittart (1.14.0): kennt die ältere Regel nicht, läuft ohne Angabe weiter
    if kind == "prealarm":
        return True  # Voralarm (1.15.0): er steht vor der Sirene, ohne Angabe wartet der Ablauf auf sein Ende
    return not step.get("detach")


def start_budget() -> float:
    """So lange darf es nach dem Auslösen höchstens dauern, bis der erste Schritt beginnt (Schnappschuss, Ablage, Zuschlag)."""
    return 2 * SNAPSHOT_TIMEOUT + WATCHDOG_GRACE


# Der Ablauf, in dem der laufende Code steht ("home", "away", "night" oder "always"). Zwei Abläufe können nebeneinander laufen
# (Modus und "Immer aktiv"); jeder läuft in seiner eigenen Aufgabe, darum trägt die Aufgabe ihren Ablauf mit.
_LANE: ContextVar[str | None] = ContextVar("alarmageddon_lane", default=None)


def _retrieve(task: asyncio.Task) -> None:
    """Ausnahme einer nicht mehr abgewarteten Aufgabe als abgeholt markieren (sonst meldet asyncio sie beim Aufräumen)."""
    if not task.cancelled():
        task.exception()


def _store(hass: HomeAssistant, entry_id: str) -> Store:
    return Store(hass, 1, f"{WORKFLOW_STORE_KEY}.{entry_id}")


async def async_remove_workflow_store(hass: HomeAssistant, entry_id: str) -> None:
    await _store(hass, entry_id).async_remove()


def step_entities(step: dict[str, Any]) -> list[str]:
    """Geräte, die ein Schritt verändert und die beim Deaktivieren zurückgesetzt werden sollen (Einstellung "Rückgängig" des Schritts)."""
    if step.get("type") == "sound" and step.get("restore", True):
        return list(step.get("players", []))
    if step.get("type") == "action" and step.get("restore", False):
        return [e for e in step.get("target", []) if e.split(".")[0] in RESTORABLE_DOMAINS]
    return []


class WorkflowRunner:
    def __init__(self, hass: HomeAssistant, entry: Any, controller: AlarmController, notifier: Any) -> None:
        self.hass = hass
        self.entry = entry
        self._ctl = controller
        self._notifier = notifier
        self._store = _store(hass, entry.entry_id)
        self._task: asyncio.Task | None = None
        self._side_tasks: set[asyncio.Task] = set()  # Schritte "nicht abwarten", laufen nebenher
        self._late: set[asyncio.Task] = set()  # Aufrufe, auf die nicht mehr gewartet wird (Zeit überschritten)
        self._run: dict[str, Any] | None = None  # laufender Ablauf: Auslöser, Schritt, Schnappschuss, Test
        self._last_state: str | None = None
        self._unsubs: list[Any] = []
        self._test_timer = None
        # Wächter: der Lauf, dessen Schritte schon gestartet sind (nie zweimal starten), der Schritt, an dem der Ablauf steht
        # (für das Weitermachen nach einem Abbruch), und die Aufsicht über den Start
        self._begun: dict[str, Any] | None = None
        self._plan: list[str] | None = None
        # Stand je Ablauf (Schlüssel: Auslöser). Neben dem Hauptablauf kann ein zweiter laufen ("Immer aktiv" zusätzlich zum Modus)
        self._positions: dict[str, int] = {}
        self._also_task: asyncio.Task | None = None
        self._guard: asyncio.Task | None = None

    # ----- Konfiguration -----

    def steps(self, trigger: str) -> list[dict[str, Any]]:
        return list((self.entry.options.get(CONF_WORKFLOWS) or {}).get(trigger, []))

    def has_notify(self, trigger: str) -> bool:
        return any(s.get("type") == "notify" for s in self.steps(trigger))

    @property
    def running(self) -> dict[str, Any] | None:
        return self._run

    # ----- Lebenszyklus -----

    async def async_start(self) -> None:
        """
        Nach dem Wiederherstellen des Zustands: Lief beim Neustart ein Alarm,
        läuft der Ablauf ab dem gespeicherten Schritt weiter; ist der Alarm
        inzwischen vorbei (deaktiviert), wird der Zustand vor dem Alarm
        wiederhergestellt.
        """
        self._last_state = str(self._ctl.state)
        self._unsubs.append(self._ctl.add_listener(self._on_change))
        saved = await self._store.async_load()
        if isinstance(saved, dict) and saved.get("trigger"):
            self._run = saved
            if self._ctl.state == AlarmControlPanelState.TRIGGERED and not saved.get("test"):
                self._begun = saved
                self._spawn(saved, int(saved.get("index", 0) or 0))
                also = saved.get("also")
                if isinstance(also, dict) and also.get("trigger"):
                    self._spawn(saved, int(also.get("index", 0) or 0), str(also["trigger"]))
            else:
                await self.async_stop()

    async def async_unload(self) -> None:
        """Beim Entladen (Neustart, neue Optionen) nur anhalten, nichts zurücksetzen: der Alarm geht weiter."""
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()
        self._cancel_timers()
        await self._cancel_task()
        if self._run is not None and not self._run.get("test"):
            # Stand des laufenden Alarms sofort schreiben (nicht erst verzögert): nach dem Neuladen geht es beim richtigen Schritt
            # weiter, kein Schritt läuft doppelt. Unter Aufsicht: eine hängende Ablage hält das Neuladen nicht auf.
            try:
                await self._watched(self._store.async_save(self._run), SNAPSHOT_TIMEOUT, "store")
            except Exception:  # noqa: BLE001 - ohne gespeicherten Stand beginnt der Ablauf nach dem Neuladen beim letzten gespeicherten Schritt
                _LOGGER.exception("%s: saving the state of the alarm actions failed", self.entry.title)

    @callback
    def _cancel_timers(self) -> None:
        if self._test_timer:
            self._test_timer()
            self._test_timer = None
        if self._guard is not None:
            self._guard.cancel()
            self._guard = None

    @callback
    def _on_change(self) -> None:
        state = str(self._ctl.state)
        previous = self._last_state
        self._last_state = state
        if state == previous:
            return
        if state == AlarmControlPanelState.TRIGGERED:
            # Hauptablauf des Alarms (Modus oder "Immer aktiv"); ein zweiter Ablauf kommt in async_run aus demselben Plan dazu
            self._plan = list(self._ctl.alarm_plan())  # für die Aktionen nach dem Quittieren: am Ende ist der Plan des Automaten schon geleert
            trigger = self._plan[0]
            # Zuerst die Aufsicht, dann der Start: scheitert oder hängt der Start, beginnt der Wächter die Schritte selbst
            self._watch_start(trigger)
            self.hass.async_create_task(self._start(trigger))
        elif previous == AlarmControlPanelState.TRIGGERED:
            # Quittiert oder deaktiviert: alles stoppen und zurückstellen, danach die Aktionen nach dem Quittieren
            run = self._run if self._run and not self._run.get("test") and not self._run.get("after") else None
            plan = self._plan or ([run["trigger"], *([run["also"]["trigger"]] if isinstance(run.get("also"), dict) else [])] if run else [])
            self._plan = None
            self.hass.async_create_task(self._end(plan))
        elif state in ARMED_STATES and previous not in (None, AlarmControlPanelState.PENDING):
            # Scharf geschaltet (auch Wechsel des Modus): die Aktionen beim Scharfschalten dieses Modus. Nicht beim Start von Home
            # Assistant (da war die Anlage schon scharf) und nicht nach einem quittierten Alarm (der Zweig darüber).
            self.hass.async_create_task(self.async_run_armed(self._ctl.mode))
        elif state == AlarmControlPanelState.DISARMED and self._run is not None and self._run.get("phase") == "armed":
            # Deaktiviert, während der Aktivierungston noch läuft: sofort still
            self.hass.async_create_task(self._stop_side_run())

    async def _end(self, plan: list[str]) -> None:
        """Der Alarm ist zu Ende: Ablauf stoppen und Geräte zurückstellen; erst dann laufen die Aktionen nach dem Quittieren."""
        await self.async_stop()
        try:
            await self.async_run_after(plan)
        except Exception:  # noqa: BLE001 - das Ende des Alarms selbst ist schon erledigt
            _LOGGER.exception("%s: the actions after the alarm could not be started", self.entry.title)

    async def _stop_side_run(self) -> None:
        """Einen Lauf beim Scharfschalten oder nach dem Quittieren vorzeitig beenden: Schritte abbrechen, laufende Töne stoppen."""
        run = self._run
        if run is None or not run.get("after"):
            return
        await self._end_test()
        players = sorted({p for step in run.get("steps") or [] if step.get("type") in ("sound", "chime") for p in step.get("players", [])})
        if players:
            await self._call("media_player", "media_stop", {"entity_id": players})
        self.hass.async_create_task(self._store.async_remove())

    def steps_armed(self, mode: str | None) -> list[dict[str, Any]]:
        return list((self.entry.options.get(CONF_WORKFLOWS_ARMED) or {}).get(mode or "") or [])

    async def async_run_armed(self, mode: str | None) -> bool:
        """
        Aktionen beim Scharfschalten starten (1.14.0): die Schritte, die der Nutzer unter "Anlage scharf geschaltet" gelegt hat,
        für den Modus, der gerade scharf wurde (zum Beispiel ein Aktivierungston). Der Lauf verhält sich wie die Aktionen nach dem
        Quittieren: unter Aufsicht, endet von selbst, stellt nichts zurück. Ein Alarm hat Vorrang und bricht ihn ab, Deaktivieren
        ebenso; läuft noch ein solcher Lauf (rasch hintereinander scharf geschaltet), ersetzt ihn der neue.
        """
        steps = self.steps_armed(mode)
        if not steps or self._ctl.state not in ARMED_STATES:
            return False
        if self._run is not None:
            if not self._run.get("after"):
                return False  # ein Alarm oder ein Test läuft
            await self._stop_side_run()
        run: dict[str, Any] = {"trigger": mode, "index": 0, "test": False, "after": True, "phase": "armed", "snapshot": {}, "sonos": [], "steps": steps}
        self._run = run
        self._begin(run)
        return True

    def steps_after(self, trigger: str) -> list[dict[str, Any]]:
        return list((self.entry.options.get(CONF_WORKFLOWS_AFTER) or {}).get(trigger) or [])

    async def async_run_after(self, plan: list[str]) -> bool:
        """
        Aktionen nach dem Quittieren starten (1.10.0): die Schritte, die der Nutzer hinter "Alarm endet" gelegt hat, für jeden
        Ablauf des beendeten Alarms (Modus, "Immer aktiv"; derselbe Ablauf nur einmal). Sie laufen unter derselben Aufsicht wie
        die Alarmaktionen. Ein neuer Alarm hat Vorrang: läuft schon einer, starten sie nicht, und ein Alarm bricht sie ab.
        """
        steps: list[dict[str, Any]] = []
        seen: list[list[dict[str, Any]]] = []
        for trigger in plan:
            own = self.steps_after(trigger)
            if own and own not in seen:
                seen.append(own)
                steps.extend(own)
        if not steps or self._run is not None or self._ctl.state == AlarmControlPanelState.TRIGGERED:
            return False
        run: dict[str, Any] = {"trigger": plan[0], "index": 0, "test": False, "after": True, "snapshot": {}, "sonos": [], "steps": steps}
        self._run = run
        self._begin(run)
        return True

    @callback
    def _finish_after(self, run: dict[str, Any], *_: Any) -> None:
        """Die Aktionen nach dem Quittieren sind durch (auch die, die nebenher liefen): der Lauf endet von selbst, es gibt nichts zurückzustellen."""
        if self._run is not run:
            return
        pending = [task for task in self._side_tasks if not task.done()]
        if pending:
            for task in pending:
                task.add_done_callback(partial(self._finish_after, run))
            return
        self._run = None
        self._begun = None
        self._task = None
        self.hass.async_create_task(self._store.async_remove())

    async def _start(self, trigger: str) -> None:
        """Ablauf beim Alarm starten. Scheitert der Start selbst, beginnt der Wächter die Schritte sofort (nicht erst nach der Startgrenze)."""
        try:
            await self.async_run(trigger)
        except asyncio.CancelledError:
            raise
        except Exception:  # noqa: BLE001 - Sicherheitsregel: die Schritte laufen in jedem Fall
            _LOGGER.exception("%s: starting the alarm actions failed; the watchdog starts them", self.entry.title)
            self._check_started(trigger)

    # ----- Ablauf -----

    async def async_run(self, trigger: str, test: bool = False, steps: list[dict[str, Any]] | None = None) -> bool:
        """
        Ablauf starten. Mit `steps` (nur im Test) läuft genau diese Liste statt des gespeicherten Ablaufs: so lässt sich ein
        einzelner Schritt testen, auch einer, der noch nicht gespeichert ist. Test und Stopp wie beim ganzen Ablauf.

        Jedes Warten hier steht unter Aufsicht des Wächters (`_watched`): nichts vor dem ersten Schritt kann ihn länger als
        seine Grenze aufhalten (tests/test_action_hang.py prüft das auch am Quelltext).
        """
        inherited: dict[str, Any] | None = None
        if self._run is not None and not test and (self._run.get("test") or self._run.get("after")):
            # Echter Alarm während eines Tests: der Test endet sofort, der echte Ablauf startet. Sonst liefe im Testfenster
            # weder der Ablauf noch die Alarmmeldung (Sicherheitsregel: im Zweifel alarmieren)
            inherited = self._run
            try:
                await self._watched(self._end_test(), SNAPSHOT_TIMEOUT, "test")
            except asyncio.CancelledError:
                raise
            except Exception:  # noqa: BLE001 - das Ende des Tests darf den echten Alarm nie verhindern
                _LOGGER.exception("%s: ending the test of the alarm actions failed; the real alarm goes on", self.entry.title)
            self._run = None  # auch wenn das Ende des Tests hängt: ab hier zählt nur der echte Alarm
        if self._run is not None:
            return False  # läuft schon (kein doppelter Ablauf bei mehreren Auslösungen)
        override = steps if test and steps else None
        steps = override or self.steps(trigger)
        if not steps:
            return False
        run: dict[str, Any] = {"trigger": trigger, "index": 0, "test": test, "snapshot": {}, "sonos": [], "steps": override}
        also = None if test else self._also(trigger)
        if also:
            # Zweiter Ablauf neben dem Hauptablauf, mit eigenem Stand (Schritt, Ende einer Wartezeit) für den Neustart
            run["also"] = {"trigger": also, "index": 0}
            steps = [*steps, *self.steps(also)]  # der Schnappschuss der Geräte umfasst beide Abläufe
        self._run = run
        try:
            await self._watched(self._prepare(run, steps, inherited), start_budget() - WATCHDOG_GRACE, "prepare")
        except asyncio.CancelledError:
            raise
        except Exception:  # noqa: BLE001 - die Vorbereitung ist Zusatz: scheitert sie, starten die Schritte ohne sie
            _LOGGER.exception("%s: preparing the alarm actions failed; they start without the snapshot", self.entry.title)
        if self._run is not run:
            return False  # währenddessen deaktiviert: nichts mehr starten
        self._begin(run)
        if test:
            self._test_timer = async_call_later(self.hass, TEST_SECONDS, partial(self._test_over))
        return True

    async def _end_test(self) -> None:
        """
        Test beenden, weil ein echter Alarm kommt: Schritte abbrechen, nichts zurückstellen. Das Zurückstellen könnte hängen
        und dürfte ein Gerät nicht wieder ausschalten, das der echte Alarm gerade einschaltet; der echte Lauf übernimmt
        stattdessen den Schnappschuss des Tests (siehe _prepare).
        """
        self._cancel_timers()
        self._run = None
        await self._cancel_task()

    async def _prepare(self, run: dict[str, Any], steps: list[dict[str, Any]], inherited: dict[str, Any] | None = None) -> None:
        """
        Vor dem ersten Schritt: Zustand der Geräte merken (für die Wiederherstellung beim Deaktivieren) und den Lauf speichern
        (für den Neustart). Alles hier ist Zusatz: scheitert oder hängt es, starten die Schritte trotzdem (Wächter).
        """
        entities = sorted({e for s in steps for e in step_entities(s)})
        before = (inherited or {}).get("snapshot") or {}
        sonos_before = [e for e in (inherited or {}).get("sonos") or [] if isinstance(e, str)]
        # Nach einem abgebrochenen Test gilt dessen Schnappschuss: er zeigt die Geräte vor dem Test, nicht mitten im Test
        run["snapshot"] = {**self._snapshot(entities), **before}
        run["sonos"] = sorted({*sonos_before, *await self._sonos_snapshot([e for e in entities if e not in sonos_before])})
        if self._run is not run:
            return
        await self._save_run(run)

    async def _save_run(self, run: dict[str, Any]) -> None:
        """
        Stand vor dem ersten Schritt speichern (für die Wiederherstellung nach einem Neustart). Die Ablage darf den Alarm nie
        aufhalten: hängt sie, geht es nach SNAPSHOT_TIMEOUT ohne sie weiter (das Schreiben läuft weiter), scheitert sie, sofort.
        """
        task = self.hass.async_create_task(self._store.async_save(run), f"alarmageddon workflow store {self.entry.entry_id}")
        done, _pending = await asyncio.wait({task}, timeout=SNAPSHOT_TIMEOUT)
        if not done:
            task.add_done_callback(lambda t: t.cancelled() or t.exception())  # Ausnahme als abgeholt markieren
            _LOGGER.error("%s: saving the state of the alarm actions took too long; the actions start without it", self.entry.title)
            return
        if not task.cancelled() and task.exception() is not None:
            _LOGGER.error("%s: saving the state of the alarm actions failed (%s); the actions start without it", self.entry.title, task.exception())

    @staticmethod
    def _runs_alongside(step: dict[str, Any]) -> bool:
        """Schritt läuft nebenher, der nächste startet sofort (Standard für Gerät und Ton, siehe step_waits)."""
        return not step_waits(step)

    # ----- Wächter: Aufsicht über Start, Vorbereitung, jeden Schritt und den Ablauf als Ganzes -----

    async def _watched(self, coro: Any, budget: float, label: str) -> bool:
        """
        Etwas abwarten, aber höchstens `budget` Sekunden. Dauert es länger, geht der Ablauf ohne es weiter: die Aufgabe läuft
        im Hintergrund zu Ende (ein Skript soll fertig werden dürfen) und endet spätestens beim Deaktivieren; der Eingriff
        steht im Log und auf der Zeitachse des Alarms. Gibt zurück, ob es rechtzeitig fertig wurde; ein Fehler des
        Beaufsichtigten geht an den Aufrufer.
        """
        task = self._background(coro)
        try:
            done, _pending = await asyncio.wait({task}, timeout=budget)
        except asyncio.CancelledError:
            task.cancel()
            raise
        if not done:
            self._late.add(task)
            task.add_done_callback(self._late.discard)
            task.add_done_callback(_retrieve)
            _LOGGER.error("%s: watchdog: '%s' did not finish within %.1f s; the alarm actions go on without waiting", self.entry.title, label, budget)
            self._note(label)
            return False
        if task.cancelled():
            return False
        task.result()
        return True

    def _note(self, label: str) -> None:
        """Eingriff des Wächters auf der Zeitachse des Alarms festhalten (nie mit einem Fehler)."""
        try:
            self._ctl.record("step_failed", action=label, reason="watchdog")
        except Exception:  # noqa: BLE001 - der Wächter selbst darf nie scheitern
            _LOGGER.exception("%s: the watchdog could not record its intervention", self.entry.title)

    def _also(self, trigger: str) -> str | None:
        """Zweiter Ablauf des laufenden Alarms neben `trigger` (aus dem Plan des Automaten), wenn es einen gibt."""
        try:
            plan = self._ctl.alarm_plan()
        except Exception:  # noqa: BLE001 - der Hauptablauf läuft in jedem Fall
            _LOGGER.exception("%s: the second flow of the alarm actions cannot be determined", self.entry.title)
            return None
        return next((flow for flow in plan if flow != trigger and self.steps(flow)), None)

    @property
    def _position(self) -> int:
        """Schritt, an dem der Hauptablauf steht."""
        return self._positions.get((self._run or {}).get("trigger", ""), 0)

    @staticmethod
    def _state(run: dict[str, Any], lane: str | None) -> dict[str, Any]:
        """Gespeicherter Stand eines Ablaufs: der Lauf selbst für den Hauptablauf, `run["also"]` für den zweiten."""
        also = run.get("also")
        if lane is not None and isinstance(also, dict) and also.get("trigger") == lane and lane != run.get("trigger"):
            return also
        return run

    @callback
    def _begin(self, run: dict[str, Any]) -> bool:
        """Die Schritte eines Laufs starten, genau einmal: nach der Vorbereitung oder, wenn die ausbleibt, durch den Wächter."""
        if self._run is not run or self._begun is run:
            return False
        self._begun = run
        self._spawn(run, 0)
        also = run.get("also")
        if isinstance(also, dict) and also.get("trigger"):
            self._spawn(run, 0, str(also["trigger"]))
        return True

    @callback
    def _spawn(self, run: dict[str, Any], start: int, lane: str | None = None) -> None:
        """Einen Ablauf ab `start` starten: den Hauptablauf oder (mit `lane`) den zweiten. Beide stehen unter derselben Aufsicht."""
        main = lane is None or lane == run["trigger"]
        trigger = run["trigger"] if main else lane
        self._positions[trigger] = start
        task = self._background(self._execute(trigger, start))
        if main:
            self._task = task
        else:
            self._also_task = task
        task.add_done_callback(partial(self._on_flow_done, run, trigger))

    @callback
    def _on_flow_done(self, run: dict[str, Any], trigger: str, task: asyncio.Task) -> None:
        """
        Aufsicht über den Ablauf als Ganzes: Endet er mit einem Fehler (ein Fehler ausserhalb eines Schritts, den die Schleife
        nicht abfängt), geht es mit dem nächsten Schritt weiter. Jeder Abbruch rückt um mindestens einen Schritt vor: nach dem
        letzten Schritt ist Schluss, eine Endlosschleife ist ausgeschlossen. Gilt für jeden der beiden Abläufe für sich.
        """
        main = trigger == run["trigger"]
        if task.cancelled() or self._run is not run or (self._task if main else self._also_task) is not task:
            return
        error = task.exception()
        if error is None:
            if run.get("after"):
                self._finish_after(run)
            return
        position = self._positions.get(trigger, 0)
        _LOGGER.error("%s: watchdog: the alarm actions (%s) stopped unexpectedly at step %s; continuing with the next step",
                      self.entry.title, trigger, position + 1, exc_info=error)
        self._note("flow")
        try:
            count = len((run.get("steps") if main else None) or self.steps(trigger))
        except Exception:  # noqa: BLE001 - ohne lesbare Schritte gibt es nichts fortzusetzen
            return
        if position + 1 < count:
            self._spawn(run, position + 1, trigger)

    @callback
    def _watch_start(self, trigger: str) -> None:
        """Aufsicht über den Start: läuft neben dem Start her und greift ein, wenn der erste Schritt ausbleibt."""
        if self._guard is not None:
            self._guard.cancel()
        self._guard = self._background(self._start_guard(trigger))

    async def _start_guard(self, trigger: str) -> None:
        # Echte Zeit, nicht die Zeitgeber von HA: der Wächter misst, wie lange der Start wirklich dauert
        await asyncio.sleep(start_budget())
        self._guard = None
        self._check_started(trigger)

    @callback
    def _check_started(self, trigger: str) -> None:
        """
        Letzte Sicherung: Ist der Alarm noch aktiv und hat kein Schritt begonnen, starten die Schritte jetzt ohne Vorbereitung
        (kein Schnappschuss: die Geräte kehren dann beim Deaktivieren nicht von selbst zurück, aber die Sirene läuft).
        """
        if self._ctl.state != AlarmControlPanelState.TRIGGERED:
            return
        run = self._run
        if run is not None and not run.get("test") and not run.get("after") and self._begun is run:
            return  # die Schritte laufen oder sind durchgelaufen
        try:
            steps = self.steps(trigger)
        except Exception:  # noqa: BLE001 - ohne lesbare Schritte gibt es nichts zu starten
            _LOGGER.exception("%s: watchdog: the alarm actions cannot be read", self.entry.title)
            return
        if not steps:
            return
        _LOGGER.error("%s: watchdog: the alarm actions did not start within %.1f s; starting them now without preparation",
                      self.entry.title, start_budget())
        if run is None or run.get("test") or run.get("after"):
            # Kein Lauf (der Start ist gescheitert) oder noch der Test (sein Ende hängt): ein neuer Lauf, die Aufgaben des alten enden
            for task in self._take_tasks():
                task.add_done_callback(_retrieve)
            inherited = run or {}
            run = {"trigger": trigger, "index": 0, "test": False, "snapshot": dict(inherited.get("snapshot") or {}),
                   "sonos": list(inherited.get("sonos") or []), "steps": None}
            also = self._also(trigger)
            if also:
                run["also"] = {"trigger": also, "index": 0}
            self._run = run
        self._note("start")
        self._begin(run)

    def _background(self, coro: Any) -> asyncio.Task:
        # Hintergrund-Task: Ein Ablauf kann minutenlang warten; HA soll beim Start oder in Tests nicht auf ihn warten
        return self.hass.async_create_background_task(coro, f"alarmageddon workflow {self.entry.entry_id}")

    async def _sleep(self, seconds: float) -> None:
        """Warten über die Zeitgeber von HA (Ziel ist eine @callback-Funktion, keine lambda, siehe LEARNINGS)."""
        if seconds <= 0:
            return  # nichts zu warten (auch: die Zeit eines Schritts war beim Wiederanlauf schon um)
        future = self.hass.loop.create_future()

        @callback
        def _done(_now: Any = None) -> None:
            if not future.done():
                future.set_result(None)

        unsub = async_call_later(self.hass, seconds, _done)
        try:
            await future
        finally:
            unsub()

    @callback
    def _test_over(self, _now: Any = None) -> None:
        self._test_timer = None
        if self._run and self._run.get("test"):
            self.hass.async_create_task(self.async_stop())

    async def _execute(self, trigger: str, start: int) -> None:
        """
        Die Schritte der Reihe nach. Jeder abgewartete Schritt läuft unter Aufsicht des Wächters (`_watched` mit der Grenze aus
        step_budget): keiner hält den nächsten länger auf als seine eigene Grenze, gleich aus welchem Grund.
        """
        _LANE.set(trigger)  # gilt für diese Aufgabe und alle, die sie startet (Schritte unter Aufsicht)
        main = trigger == (self._run or {}).get("trigger")
        steps = ((self._run or {}).get("steps") if main else None) or self.steps(trigger)
        test = bool(self._run and self._run.get("test"))
        for index in range(start, len(steps)):
            if self._run is None:
                return
            self._positions[trigger] = index  # zuerst und ohne Fehlerquelle: hier macht der Wächter nach einem Abbruch weiter
            step = steps[index]
            try:
                # Mitschreiben (gespeicherter Stand für den Neustart, Zeitachse) ist Zusatz: ein Fehler darin hält keinen Schritt auf
                self._state(self._run, trigger)["index"] = index
                self._store.async_delay_save(lambda: self._run or {}, 0)
                self._record(step, test)
            except Exception:  # noqa: BLE001 - Sicherheitsregel: die Schritte laufen in jedem Fall
                _LOGGER.exception("%s: bookkeeping for step %s of the alarm actions failed", self.entry.title, index + 1)
            try:
                if self._runs_alongside(step):
                    # Nicht abwarten: läuft nebenher, der nächste Schritt startet sofort (langer Alarmton, träges Gerät)
                    task = self._background(self._side(step, test, index))
                    self._side_tasks.add(task)
                    task.add_done_callback(self._side_tasks.discard)
                    continue
                await self._watched(self._step(step, test), step_budget(step), self._label(step))
            except asyncio.CancelledError:
                raise
            except Exception:  # noqa: BLE001 - Sicherheitsregel: ein fehlerhafter Schritt stoppt die anderen nicht
                _LOGGER.exception("%s: step %s of the alarm actions failed", self.entry.title, index + 1)

    @staticmethod
    def _label(step: dict[str, Any]) -> str:
        """Bezeichnung eines Schritts für Log und Zeitachse (ohne Daten des Schritts)."""
        kind = str(step.get("type") or "?")
        return str(step.get("action") or kind) if kind == "action" else kind

    async def _side(self, step: dict[str, Any], test: bool, index: int) -> None:
        """Schritt ohne Abwarten: Fehler werden nur protokolliert, sie halten nichts auf."""
        try:
            # Nicht fortsetzbar: ein Schritt nebenher läuft nach einem Neustart nicht weiter (nur die Schritte danach)
            await self._step(step, test, resumable=False)
        except asyncio.CancelledError:
            raise
        except Exception:  # noqa: BLE001 - Sicherheitsregel: ein fehlerhafter Schritt stoppt die anderen nicht
            _LOGGER.exception("%s: step %s of the alarm actions (not awaited) failed", self.entry.title, index + 1)

    def _record(self, step: dict[str, Any], test: bool) -> None:
        """Zeitachse des Alarms: welcher Schritt wann gestartet ist (ohne Daten, nur Art, Aktion und Ziele)."""
        entry: dict[str, Any] = {"step": step.get("type"), "test": test}
        if step.get("type") == "action":
            entry["action"] = step.get("action")
            entry["targets"] = list(step.get("target") or [])
        elif step.get("type") in ("sound", "chime", "prealarm"):
            entry["targets"] = list(step.get("players") or [])
            entry["sound"] = step.get("sound")
        elif step.get("type") == "wait":
            entry["seconds"] = step.get("seconds")
        self._ctl.record("step", **entry)

    def _remaining(self, seconds: float) -> float:
        """
        Verbleibende Zeit eines abgewarteten Schritts mit eingestellter Dauer (Warten, Alarmton mit Dauer).

        Die Dauer bestimmt der Nutzer, und sie zählt ab dem ersten Start des Schritts: Beim ersten Start wird das Ende gemerkt
        (im gespeicherten Stand des Laufs); nach einem Neuladen (Einstellungen mitten im Alarm gespeichert) oder einem
        Neustart von Home Assistant läuft nur der Rest. So schaltet "Sirene ein, 3 Minuten warten, Sirene aus" auch dann
        nach 3 Minuten aus und nicht erst nach einer vollen Wartezeit obendrauf (rechtlich wichtig: die Sirene endet nach
        der vom Betreiber gewählten Zeit).
        """
        run = self._run
        if run is None:
            return float(seconds)
        now = dt_util.utcnow()
        lane = _LANE.get() or run.get("trigger")
        state = self._state(run, lane)  # jeder Ablauf merkt das Ende seines eigenen Schritts
        position = self._positions.get(lane, 0)
        saved = state.get("until")
        if isinstance(saved, dict) and saved.get("index") == position:
            end = dt_util.parse_datetime(str(saved.get("at") or ""))
            if end is not None:
                # Nie länger als eingestellt (auch nicht nach einem Sprung der Uhr), nie negativ
                return min(float(seconds), max(0.0, (end - now).total_seconds()))
        state["until"] = {"index": position, "at": (now + timedelta(seconds=seconds)).isoformat()}
        try:
            self._store.async_delay_save(lambda: self._run or {}, 0)
        except Exception:  # noqa: BLE001 - Mitschreiben hält den Schritt nie auf
            _LOGGER.exception("%s: saving the end of a timed step failed", self.entry.title)
        return float(seconds)

    async def _step(self, step: dict[str, Any], test: bool, resumable: bool = True) -> None:
        """Einen Schritt ausführen. `resumable`: abgewarteter Schritt (seine Dauer zählt über Neuladen und Neustart hinweg)."""
        kind = step.get("type")
        if kind == "wait":
            seconds = max(0, int(step.get("seconds", 0) or 0))
            await self._sleep(self._remaining(seconds) if resumable else seconds)
        elif kind == "notify":
            self._notifier.send_alarm(test=test, step=step)
        elif kind == "action":
            domain, _, service = str(step.get("action", "")).partition(".")
            data = dict(step.get("data") or {})
            if step.get("target"):
                data["entity_id"] = list(step["target"])
            await self._bounded(self.hass.services.async_call(domain, service, data, blocking=True), f"{domain}.{service}")
        elif kind == "sound":
            await self._play(step, resumable)
        elif kind == "chime":
            await self._play_whole(step)
        elif kind == "prealarm":
            # Voralarm: derselbe Weg wie der Alarmton, als Schleife über seine Dauer (nie endlos)
            await self._play({**step, "sound": step.get("sound", "pre_beep"), "duration": int(step.get("duration") or 20)})
        elif kind == "acknowledge":
            # Alarm quittieren: im Test nie (ein Test darf den echten Zustand nicht ändern). Der Stopp des Ablaufs läuft als eigene
            # Aufgabe (_on_change), dieser Schritt kehrt vorher zurück und wird nicht selbst abgebrochen
            if not test:
                self._ctl.acknowledge(self._notifier.text("by_step"))

    async def _play(self, step: dict[str, Any], resumable: bool = False) -> None:
        players = list(step.get("players", []))
        sound = step.get("sound", "siren")
        if not players or sound not in ALL_SOUNDS:
            return
        try:
            base = get_url(self.hass, allow_external=False, prefer_external=False)
        except NoURLAvailableError:
            try:
                base = get_url(self.hass)
            except NoURLAvailableError:
                _LOGGER.error("%s: no Home Assistant URL for the alarm sound; set it under Settings › System › Network", self.entry.title)
                return
        await self._set_volumes(step, players)
        duration = step.get("duration")
        if duration is None:  # ältere Form (Wiederholungen): so lang wie die Wiederholungen zusammen
            duration = max(1, int(step.get("repeat", 1))) * ALL_SOUNDS[sound]
            resumable = False
        # Dauer in Sekunden, vom Nutzer eingestellt; 0 = so lange, bis deaktiviert wird: der Ablauf bricht den Schritt dann ab.
        # Ein abgewarteter Ton zählt seine Dauer ab dem ersten Start (nach Neuladen oder Neustart nur der Rest, siehe _remaining)
        left = self._remaining(duration) if resumable and duration else duration
        end = dt_util.utcnow() + timedelta(seconds=left)
        try:
            while True:
                # Eine Datei für die ganze Dauer (1.17.0, sound_loop.py): der Lautsprecher wird nur einmal gestartet, statt alle paar
                # Sekunden neu. Nur sehr lange Töne (und "bis zum Deaktivieren") bestehen aus mehreren Stücken von LOOP_MAX_SECONDS.
                rest = LOOP_MAX_SECONDS if duration == 0 else (end - dt_util.utcnow()).total_seconds()
                if rest <= 0:
                    break  # Zeit schon um (Wiederanlauf nach dem Ende): nichts mehr spielen, nur stoppen
                piece = min(LOOP_MAX_SECONDS, rest)
                await self._call("media_player", "play_media", {"entity_id": players, "media_content_id": loop_url(base, sound, piece), "media_content_type": "music"})
                await self._sleep(piece)
                if duration and dt_util.utcnow() >= end:
                    break
        finally:
            # Zeit um, deaktiviert oder "Alarmton stumm": der Ton darf nicht ausklingen oder weiterlaufen
            await self._call("media_player", "media_stop", {"entity_id": players})

    async def _set_volumes(self, step: dict[str, Any], players: list[str]) -> None:
        """
        Lautstärke vor dem Ton setzen: je Medienplayer sein eigener Wert ("volumes", 1.16.0), sonst der gemeinsame ("volume").
        Lautsprecher mit demselben Wert gehen in einen Aufruf; ohne Angabe bleibt die Lautstärke, wie sie ist.
        """
        own = step.get("volumes") or {}
        groups: dict[float, list[str]] = {}
        for player in players:
            level = own.get(player, step.get("volume"))
            if level is not None:
                groups.setdefault(float(level), []).append(player)
        for level, group in groups.items():
            await self._call("media_player", "volume_set", {"entity_id": group, "volume_level": level})

    async def _play_whole(self, step: dict[str, Any]) -> None:
        """
        Aktivierungston: nur ganze Wiederholungen, mindestens eine. Ein melodischer Ton (Dreiklang, Glocke) wird so nie mitten in
        der Melodie abgeschnitten: bei 3 Sekunden spielt ein Ton von 1 Sekunde dreimal, einer von 2 Sekunden einmal.
        """
        players = list(step.get("players", []))
        sound = step.get("sound", "tone_pip")
        if not players or sound not in ALL_SOUNDS:
            return
        try:
            base = get_url(self.hass, allow_external=False, prefer_external=False)
        except NoURLAvailableError:
            try:
                base = get_url(self.hass)
            except NoURLAvailableError:
                _LOGGER.error("%s: no Home Assistant URL for the arming tone; set it under Settings › System › Network", self.entry.title)
                return
        await self._set_volumes(step, players)
        # Ganze Wiederholungen in einer einzigen Datei (1.17.0): der Lautsprecher wird einmal gestartet
        length = ALL_SOUNDS[sound]
        total = max(1, int(int(step.get("duration") or 3) // length)) * length
        try:
            await self._call("media_player", "play_media", {"entity_id": players, "media_content_id": loop_url(base, sound, total), "media_content_type": "music"})
            await self._sleep(total)
        finally:
            await self._call("media_player", "media_stop", {"entity_id": players})

    async def _bounded(self, coro: Any, label: str, timeout: float | None = None) -> None:
        """
        Wartet höchstens `timeout` (Standard SERVICE_TIMEOUT) auf einen Aufruf. Antwortet das Gerät nicht, geht es weiter: Der Aufruf
        läuft als eigener Task weiter (auch wenn er Abbrüche ignoriert, wir warten nicht auf ihn) und endet spätestens beim
        Deaktivieren. Zeitüberschreitung und Fehler stehen auf der Zeitachse des Alarms.
        """
        limit = SERVICE_TIMEOUT if timeout is None else timeout
        # Eigener, von HA verfolgter Task (wie ein gewöhnlicher Dienstaufruf), damit "alles abgearbeitet" ihn mitzählt
        task = self.hass.async_create_task(coro, f"alarmageddon step call {self.entry.entry_id}")
        try:
            done, _pending = await asyncio.wait({task}, timeout=limit)
        except asyncio.CancelledError:
            task.cancel()
            raise
        if not done:
            self._late.add(task)
            task.add_done_callback(self._late.discard)
            task.add_done_callback(lambda t: t.cancelled() or t.exception())  # Ausnahme als abgeholt markieren
            self._ctl.record("step_failed", action=label, reason="timeout")
            raise TimeoutError(f"{label} did not respond within {limit} s")
        try:
            task.result()
        except asyncio.CancelledError:
            raise
        except Exception:
            self._ctl.record("step_failed", action=label, reason="error")
            raise

    async def _call(self, domain: str, service: str, data: dict[str, Any], timeout: float | None = None) -> None:
        try:
            await self._bounded(self.hass.services.async_call(domain, service, data, blocking=True), f"{domain}.{service}", timeout)
        except Exception:  # noqa: BLE001 - ein Gerät, das nicht antwortet, hält den Ablauf nicht auf
            _LOGGER.exception("%s: %s.%s failed", self.entry.title, domain, service)

    @callback
    def _take_tasks(self) -> list[asyncio.Task]:
        """
        Alle Aufgaben des laufenden Ablaufs übernehmen und abbrechen. Synchron, in einem Zug: ein neuer Lauf, der danach
        startet (echter Alarm nach einem Test, Start durch den Wächter), gehört nicht mehr dazu und bleibt unberührt.
        """
        late, self._late = list(self._late), set()
        side, self._side_tasks = list(self._side_tasks), set()
        task, self._task = self._task, None
        also, self._also_task = self._also_task, None
        for item in late:
            item.cancel()  # hängende Aufrufe enden mit dem Alarm; nicht abwarten
        waiting = [item for item in (*side, task, also) if item is not None and not item.done()]
        for item in waiting:
            item.cancel()
        return waiting

    async def _cancel_task(self) -> None:
        waiting = self._take_tasks()
        if waiting:
            for item in waiting:
                item.add_done_callback(_retrieve)
            # Das Ende abwarten (ein Ton stoppt beim Abbruch noch den Player), aber nie ohne Grenze: eine Aufgabe, die
            # Abbrüche ignoriert, darf das Deaktivieren nicht aufhalten
            await asyncio.wait(waiting, timeout=SERVICE_TIMEOUT)

    async def async_silence(self) -> bool:
        """
        Alarmton stumm (Knopf in der Meldung): alle Schritte stoppen und die Geräte zurückstellen, die Anlage bleibt im Alarm
        (Deaktivieren bleibt Sache des Nutzers). Nur bei einem echten, laufenden Ablauf; ein Test endet mit "Test stoppen".
        """
        if self._run and not self._run.get("test"):
            await self.async_stop()
            return True
        # Ablauf schon zu Ende (alle Schritte durch), der Ton klingt aber vielleicht noch: auf jeden Fall stoppen
        if self._run is None and self._ctl.state == AlarmControlPanelState.TRIGGERED:
            players = sorted({p for flow in self._ctl.alarm_plan() for st in self.steps(flow) if st.get("type") in ("sound", "prealarm", "chime") for p in st.get("players", [])})
            if players:
                await self._call("media_player", "media_stop", {"entity_id": players})
                return True
        return False

    async def async_stop(self) -> None:
        """Alle Schritte abbrechen und den Zustand vor dem Alarm wiederherstellen."""
        self._cancel_timers()
        # Zuerst und ohne Warten: ab hier gehört ein neuer Lauf (echter Alarm, Start durch den Wächter) nicht mehr zu diesem Stopp
        run, self._run = self._run, None
        await self._cancel_task()
        if run:
            await self._restore(run)
        if self._run is None:
            await self._store.async_remove()

    # ----- Schnappschuss und Wiederherstellung -----

    def _snapshot(self, entities: list[str]) -> dict[str, Any]:
        out = {}
        for entity_id in entities:
            if state := self.hass.states.get(entity_id):
                out[entity_id] = {"state": state.state, "attributes": {k: state.attributes[k] for k in KEEP_ATTRS if k in state.attributes}}
        return out

    async def _sonos_snapshot(self, entities: list[str]) -> list[str]:
        """Sonos kann die ganze Wiedergabe (Quelle, Titel, Gruppe) sichern; andere Player nur Lautstärke und Zustand."""
        if not self.hass.services.has_service("sonos", "snapshot"):
            return []
        registry = er.async_get(self.hass)
        sonos = [e for e in entities if e.startswith("media_player.") and (r := registry.async_get(e)) and r.platform == "sonos"]
        if sonos:
            await self._call("sonos", "snapshot", {"entity_id": sonos, "with_group": True}, SNAPSHOT_TIMEOUT)
        return sonos

    async def _restore(self, run: dict[str, Any]) -> None:
        snapshot: dict[str, Any] = run.get("snapshot") or {}
        sonos = set(run.get("sonos") or [])
        for entity_id, saved in snapshot.items():
            domain = entity_id.split(".")[0]
            state, attrs = saved.get("state"), saved.get("attributes", {})
            data = {"entity_id": entity_id}
            if domain == "media_player":
                await self._call("media_player", "media_stop", data)
                if entity_id in sonos and self.hass.services.has_service("sonos", "restore"):
                    await self._call("sonos", "restore", {**data, "with_group": True})
                    continue
                if "volume_level" in attrs:
                    await self._call("media_player", "volume_set", {**data, "volume_level": attrs["volume_level"]})
                if "is_volume_muted" in attrs:
                    await self._call("media_player", "volume_mute", {**data, "is_volume_muted": attrs["is_volume_muted"]})
            elif domain == "cover":
                if "current_position" in attrs:
                    await self._call("cover", "set_cover_position", {**data, "position": attrs["current_position"]})
                elif state in ("open", "closed"):
                    await self._call("cover", "open_cover" if state == "open" else "close_cover", data)
            elif domain == "light":
                if state == "on":
                    extra = {k: attrs[k] for k in ("brightness", "color_temp_kelvin") if k in attrs}
                    await self._call("light", "turn_on", {**data, **extra})
                elif state == "off":
                    await self._call("light", "turn_off", data)
            elif state in ("on", "off"):
                await self._call(domain, f"turn_{state}", data)
