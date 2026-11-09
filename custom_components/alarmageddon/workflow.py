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

from .const import CONF_WORKFLOW_END, CONF_WORKFLOWS, END_MODES, END_RESTORE_ALL, END_RESTORE_MARKED, END_STOP_ONLY, RESTORABLE_DOMAINS, SOUNDS, SOUNDS_URL_PATH, TEST_SECONDS, WORKFLOW_STORE_KEY
from .controller import AlarmController

_LOGGER = logging.getLogger(__name__)
SERVICE_TIMEOUT = 15
# Was vom Zustand eines Geräts für die Wiederherstellung zählt
KEEP_ATTRS = ("brightness", "color_temp_kelvin", "current_position", "volume_level", "is_volume_muted", "source")


def _store(hass: HomeAssistant, entry_id: str) -> Store:
    return Store(hass, 1, f"{WORKFLOW_STORE_KEY}.{entry_id}")


async def async_remove_workflow_store(hass: HomeAssistant, entry_id: str) -> None:
    await _store(hass, entry_id).async_remove()


def step_entities(step: dict[str, Any], end: str = END_RESTORE_MARKED) -> list[str]:
    """
    Geräte, die ein Schritt verändert und die beim Deaktivieren zurückgesetzt werden sollen. `end` ist die Wahl im Element
    "Alarm endet": markierte Schritte (Standard), alle Schritte oder nur stoppen (dann nur die Player, damit der Ton verstummt).
    """
    if step.get("type") == "sound" and (end != END_RESTORE_MARKED or step.get("restore", True)):
        return list(step.get("players", []))
    if step.get("type") == "action" and end != END_STOP_ONLY and (end == END_RESTORE_ALL or step.get("restore", False)):
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
        self._run: dict[str, Any] | None = None  # laufender Ablauf: Auslöser, Schritt, Schnappschuss, Test
        self._last_state: str | None = None
        self._unsubs: list[Any] = []
        self._test_timer = None

    # ----- Konfiguration -----

    def end_mode(self, trigger: str) -> str:
        """Wahl im Element "Alarm endet" für diesen Auslöser; unbekannte Werte gelten als Standard."""
        mode = (self.entry.options.get(CONF_WORKFLOW_END) or {}).get(trigger)
        return mode if mode in END_MODES else END_RESTORE_MARKED

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
                self._task = self._background(self._execute(saved["trigger"], int(saved.get("index", 0))))
            else:
                await self.async_stop()

    async def async_unload(self) -> None:
        """Beim Entladen (Neustart, neue Optionen) nur anhalten, nichts zurücksetzen: der Alarm geht weiter."""
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()
        if self._test_timer:
            self._test_timer()
            self._test_timer = None
        await self._cancel_task()

    @callback
    def _on_change(self) -> None:
        state = str(self._ctl.state)
        previous = self._last_state
        self._last_state = state
        if state == previous:
            return
        if state == AlarmControlPanelState.TRIGGERED:
            self.hass.async_create_task(self.async_run(self._ctl.mode or "always"))
        elif previous == AlarmControlPanelState.TRIGGERED:
            # Deaktiviert oder Alarmdauer vorbei: alles stoppen und zurücksetzen
            self.hass.async_create_task(self.async_stop())

    # ----- Ablauf -----

    async def async_run(self, trigger: str, test: bool = False, steps: list[dict[str, Any]] | None = None) -> bool:
        """
        Ablauf starten. Mit `steps` (nur im Test) läuft genau diese Liste statt des gespeicherten Ablaufs: so lässt sich ein
        einzelner Schritt testen, auch einer, der noch nicht gespeichert ist. Test und Stopp wie beim ganzen Ablauf.
        """
        if self._run is not None:
            return False  # läuft schon (kein doppelter Ablauf bei mehreren Auslösungen)
        override = steps if test and steps else None
        steps = override or self.steps(trigger)
        if not steps:
            return False
        end = self.end_mode(trigger)
        entities = sorted({e for s in steps for e in step_entities(s, end)})
        self._run = {"trigger": trigger, "index": 0, "test": test, "end": end, "snapshot": self._snapshot(entities), "sonos": [], "steps": override}
        # Nur stoppen: keine Sonos-Sicherung nötig, es wird nichts zurückgestellt
        self._run["sonos"] = [] if end == END_STOP_ONLY else await self._sonos_snapshot(entities)
        await self._store.async_save(self._run)
        self._task = self._background(self._execute(trigger, 0))
        if test:
            self._test_timer = async_call_later(self.hass, TEST_SECONDS, partial(self._test_over))
        return True

    def _background(self, coro: Any) -> asyncio.Task:
        # Hintergrund-Task: Ein Ablauf kann minutenlang warten; HA soll beim Start oder in Tests nicht auf ihn warten
        return self.hass.async_create_background_task(coro, f"alarmageddon workflow {self.entry.entry_id}")

    async def _sleep(self, seconds: float) -> None:
        """Warten über die Zeitgeber von HA (Ziel ist eine @callback-Funktion, keine lambda, siehe LEARNINGS)."""
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
        steps = (self._run or {}).get("steps") or self.steps(trigger)
        test = bool(self._run and self._run.get("test"))
        for index in range(start, len(steps)):
            if self._run is None:
                return
            self._run["index"] = index
            self._store.async_delay_save(lambda: self._run or {}, 0)
            self._record(steps[index], test)
            if steps[index].get("detach") and steps[index].get("type") in ("action", "sound"):
                # Nicht abwarten: läuft nebenher, der nächste Schritt startet sofort (langer Alarmton, träges Gerät)
                task = self._background(self._side(steps[index], test, index))
                self._side_tasks.add(task)
                task.add_done_callback(self._side_tasks.discard)
                continue
            try:
                await self._step(steps[index], test)
            except asyncio.CancelledError:
                raise
            except Exception:  # noqa: BLE001 - Sicherheitsregel: ein fehlerhafter Schritt stoppt die anderen nicht
                _LOGGER.exception("%s: step %s of the alarm actions failed", self.entry.title, index + 1)

    async def _side(self, step: dict[str, Any], test: bool, index: int) -> None:
        """Schritt ohne Abwarten: Fehler werden nur protokolliert, sie halten nichts auf."""
        try:
            await self._step(step, test)
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
        elif step.get("type") == "sound":
            entry["targets"] = list(step.get("players") or [])
            entry["sound"] = step.get("sound")
        elif step.get("type") == "wait":
            entry["seconds"] = step.get("seconds")
        self._ctl.record("step", **entry)

    async def _step(self, step: dict[str, Any], test: bool) -> None:
        kind = step.get("type")
        if kind == "wait":
            await self._sleep(max(0, int(step.get("seconds", 0))))
        elif kind == "notify":
            self._notifier.send_alarm(test=test, step=step)
        elif kind == "action":
            domain, _, service = str(step.get("action", "")).partition(".")
            data = dict(step.get("data") or {})
            if step.get("target"):
                data["entity_id"] = list(step["target"])
            await asyncio.wait_for(self.hass.services.async_call(domain, service, data, blocking=True), SERVICE_TIMEOUT)
        elif kind == "sound":
            await self._play(step)

    async def _play(self, step: dict[str, Any]) -> None:
        players = list(step.get("players", []))
        sound = step.get("sound", "siren")
        if not players or sound not in SOUNDS:
            return
        try:
            base = get_url(self.hass, allow_external=False, prefer_external=False)
        except NoURLAvailableError:
            try:
                base = get_url(self.hass)
            except NoURLAvailableError:
                _LOGGER.error("%s: no Home Assistant URL for the alarm sound; set it under Settings › System › Network", self.entry.title)
                return
        url = f"{base}{SOUNDS_URL_PATH}/{sound}.wav"
        if step.get("volume") is not None:
            await self._call("media_player", "volume_set", {"entity_id": players, "volume_level": float(step["volume"])})
        play = {"entity_id": players, "media_content_id": url, "media_content_type": "music"}
        duration = step.get("duration")
        if duration is None:  # ältere Form: so oft wiederholen
            for _ in range(max(1, int(step.get("repeat", 1)))):
                await self._call("media_player", "play_media", play)
                await self._sleep(SOUNDS[sound])
            return
        # Dauer in Sekunden; 0 = so lange, bis deaktiviert wird (oder die Alarmdauer endet): der Ablauf bricht den Schritt dann ab
        end = dt_util.utcnow() + timedelta(seconds=duration)
        try:
            while True:
                await self._call("media_player", "play_media", play)
                if duration == 0:
                    await self._sleep(SOUNDS[sound])
                    continue
                left = (end - dt_util.utcnow()).total_seconds()
                await self._sleep(min(SOUNDS[sound], max(left, 0)))
                if dt_util.utcnow() >= end:
                    break
        finally:
            # Zeit um, deaktiviert oder "Sirene stumm": der Ton darf nicht ausklingen oder weiterlaufen
            await self._call("media_player", "media_stop", {"entity_id": players})

    async def _call(self, domain: str, service: str, data: dict[str, Any]) -> None:
        try:
            await asyncio.wait_for(self.hass.services.async_call(domain, service, data, blocking=True), SERVICE_TIMEOUT)
        except Exception:  # noqa: BLE001 - ein Gerät, das nicht antwortet, hält den Ablauf nicht auf
            _LOGGER.exception("%s: %s.%s failed", self.entry.title, domain, service)

    async def _cancel_task(self) -> None:
        side, self._side_tasks = list(self._side_tasks), set()
        for t in side:
            t.cancel()
        for t in side:
            try:
                await t
            except (asyncio.CancelledError, Exception):  # noqa: BLE001 - nur das Ende abwarten
                pass
        task, self._task = self._task, None
        if task and not task.done():
            task.cancel()
            try:
                await task
            except (asyncio.CancelledError, Exception):  # noqa: BLE001 - nur das Ende abwarten
                pass

    async def async_silence(self) -> bool:
        """
        Sirene stumm (Knopf in der Meldung): alle Schritte stoppen und die Geräte zurückstellen, die Anlage bleibt im Alarm
        (Deaktivieren bleibt Sache des Nutzers). Nur bei einem echten, laufenden Ablauf; ein Test endet mit "Test stoppen".
        """
        if self._run and not self._run.get("test"):
            await self.async_stop()
            return True
        # Ablauf schon zu Ende (alle Schritte durch), der Ton klingt aber vielleicht noch: auf jeden Fall stoppen
        if self._run is None and self._ctl.state == AlarmControlPanelState.TRIGGERED:
            players = sorted({p for st in self.steps(self._ctl.mode or "always") if st.get("type") == "sound" for p in st.get("players", [])})
            if players:
                await self._call("media_player", "media_stop", {"entity_id": players})
                return True
        return False

    async def async_stop(self) -> None:
        """Alle Schritte abbrechen und den Zustand vor dem Alarm wiederherstellen."""
        if self._test_timer:
            self._test_timer()
            self._test_timer = None
        await self._cancel_task()
        run, self._run = self._run, None
        if run:
            await self._restore(run)
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
            await self._call("sonos", "snapshot", {"entity_id": sonos, "with_group": True})
        return sonos

    async def _restore(self, run: dict[str, Any]) -> None:
        snapshot: dict[str, Any] = run.get("snapshot") or {}
        sonos = set(run.get("sonos") or [])
        for entity_id, saved in snapshot.items():
            domain = entity_id.split(".")[0]
            state, attrs = saved.get("state"), saved.get("attributes", {})
            data = {"entity_id": entity_id}
            if run.get("end") == END_STOP_ONLY and domain != "media_player":
                continue
            if domain == "media_player":
                await self._call("media_player", "media_stop", data)
                if run.get("end") == END_STOP_ONLY:
                    continue
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
