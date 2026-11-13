"""
Zustandsautomat einer Alarmanlage.

Getrennt von der Entität, damit Panel (Phase 2) und Szenario-Engine
(Phase 3) später denselben Zustand lesen und steuern. Die Entität zeigt
nur an, was der Automat sagt.

Grundsatz: Eine Alarmanlage muss im Zweifel alarmieren, nicht schweigen.
Darum wird nach einem Neustart eine abgelaufene Eingangsverzögerung zum
Alarm und nicht zu "scharf".
"""

from __future__ import annotations

from uuid import uuid4

from collections.abc import Callable
from datetime import datetime, timedelta
from functools import partial
import logging
from typing import Any

from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import STATE_OFF, STATE_ON, STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import CALLBACK_TYPE, Event, EventStateChangedData, HomeAssistant, callback
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers.event import async_track_point_in_utc_time, async_track_state_change_event
from homeassistant.util import dt as dt_util

from .code import match_code
from .devices import display_name
from .last_change import is_real_change
from .const import (
    ARM_ON_CLOSE_SETTLE,
    CONF_WORKFLOWS,
    WORKFLOW_ALWAYS,
    CONF_CONFIRM_WINDOW,
    DEFAULT_CONFIRM_WINDOW,
    OPT_CONFIRM,
    CONF_PER_MODE_SENSORS,
    SCOPE_ALWAYS,
    CONF_SENSOR_MODES,
    CONF_SENSOR_OPTIONS,
    CONF_SENSORS,
    DEFAULT_PRESETS,
    MAX_DELAY,
    OPT_ALWAYS,
    OPT_ALWAYS_OFF,
    OPT_ENTRY_DELAY,
    OPT_ARM_ON_CLOSE,
    OPT_BYPASS,
    OPT_OFFLINE_ALARM,
    OPT_REPORT_ONLY,
    REPORT_THROTTLE,
    OPT_OPEN_OK,
    CODE_LOCKOUT_SECONDS,
    CODE_MAX_ATTEMPTS,
    CONF_CODE_ARM_REQUIRED,
    CONF_CODE_HASH,
    CONF_CODES,
    CONF_CODE_SALT,
    CONF_ENTRY_DELAY,
    CONF_ENTRY_SENSORS,
    CONF_EXIT_DELAY_PREFIX,
    MODE_ENABLED_DEFAULT,
    MODE_ENABLED_KEY,
    CONF_ALWAYS_ENABLED,
    CONF_NIGHT_ENABLED,
    CONF_ZONE_PREFIX,
    DEFAULT_ENTRY_DELAY,
    DEFAULT_EXIT_DELAY,
    DOMAIN,
    MODE_AWAY,
    MODE_HOME,
    MODE_NIGHT,
    MODES,
)

_LOGGER = logging.getLogger(__name__)

ARMED_STATE = {
    MODE_HOME: AlarmControlPanelState.ARMED_HOME,
    MODE_AWAY: AlarmControlPanelState.ARMED_AWAY,
    MODE_NIGHT: AlarmControlPanelState.ARMED_NIGHT,
}
STATE_MODE = {state: mode for mode, state in ARMED_STATE.items()}

# Zustände, in denen Sensoren überwacht werden
WATCHING = {*ARMED_STATE.values(), AlarmControlPanelState.PENDING}
GONE = {STATE_UNAVAILABLE, STATE_UNKNOWN}


def _error(key: str, **placeholders: str) -> ServiceValidationError:
    return ServiceValidationError(
        translation_domain=DOMAIN, translation_key=key, translation_placeholders=placeholders or None
    )


class AlarmController:
    """Zustand, Zeitgeber und Sensorüberwachung einer Anlage."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry, settings: Any = None) -> None:
        self.hass = hass
        self.entry = entry
        # Kennung dieses Laufs: ändert sich beim Neuladen der Anlage; das Panel erkennt daran, dass das Neuladen fertig ist
        self.instance = uuid4().hex
        # Globale Einstellungen (Voreinstellungen je Sensorart); ohne sie gelten die Grundeinstellungen
        self.settings = settings
        # Stundenwerte je Sensor für die Sensoransicht (sensor_history.SensorStats), von __init__ gesetzt
        self.stats: Any = None
        self.state: AlarmControlPanelState = AlarmControlPanelState.DISARMED
        # Modus, der scharf ist oder scharf wird. Bleibt bei Verzögerung und Alarm erhalten,
        # damit die Anlage nach dem Alarm in denselben Modus zurückkehrt.
        self.mode: str | None = None
        self.deadline: datetime | None = None
        self.bypassed: set[str] = set()
        self.triggered_by: str | None = None
        # Seit wann und von wem die Anlage scharf ist (1.11.0): die Kachel zeigt es während eines Alarms neben "Alarm seit …",
        # sonst sähe es aus, als hätte derjenige den Alarm ausgelöst, der scharf geschaltet hat
        self.armed_at: datetime | None = None
        self.armed_by: str | None = None
        self._restoring = False
        # Welche Abläufe der Alarmaktionen der laufende Alarm startet (siehe _flows_for und alarm_plan): der Modus, "always"
        # ("Immer aktiv") oder beide. Leer ohne Alarm.
        self.alarm_flows: list[str] = []
        self.changed_by: str | None = None
        self._listeners: list[Callable[[], None]] = []
        # Ereignisse ohne Zustandswechsel (Sensor ausgefallen) für Protokoll und später Meldungen
        self._event_listeners: list[Callable[[str, dict[str, Any]], None]] = []
        # Nur für die Alarm-Aufzeichnung (Aktionsschritte, gesendete Meldungen): nicht ins Ereignisprotokoll
        self._record_listeners: list[Callable[[str, dict[str, Any]], None]] = []
        # Ursprüngliches Ende der Ausgangsverzögerung, falls "scharf, sobald geschlossen" sie verkürzt hat
        self._arming_deadline: datetime | None = None
        self._unsub_timer: CALLBACK_TYPE | None = None
        self._unsub_sensors: CALLBACK_TYPE | None = None
        self._failed_codes = 0
        self._locked_until: datetime | None = None
        # Sensoren mit "braucht Bestätigung", die angesprochen haben, und wann (Zwei-Sensor-Bestätigung)
        self._unconfirmed: dict[str, datetime] = {}
        # Wann ein Sensor mit "Stiller Alarm" zuletzt gemeldet hat (höchstens eine Meldung pro Minute)
        self._last_report: dict[str, datetime] = {}
        # Eigene Werte der Sensoren, gemerkt je Stand der Optionen (siehe sensor_overrides)
        self._overrides: dict[str, dict[str, bool]] = {}
        self._overrides_for: Any = None

    # ----- Einstellungen (immer frisch aus den Optionen) -----

    @property
    def options(self) -> dict[str, Any]:
        return self.entry.options

    @property
    def always_enabled(self) -> bool:
        """"Immer aktiv" insgesamt an (Standard). Aus: kein Sensor ist immer aktiv, die Werte und Aktionen dazu bleiben gespeichert."""
        return bool(self.options.get(CONF_ALWAYS_ENABLED, True))

    @property
    def night_enabled(self) -> bool:
        return bool(self.options.get(CONF_NIGHT_ENABLED, False))

    def mode_enabled(self, mode: str) -> bool:
        return bool(self.options.get(MODE_ENABLED_KEY[mode], MODE_ENABLED_DEFAULT[mode]))

    @property
    def modes(self) -> tuple[str, ...]:
        modes = tuple(m for m in MODES if self.mode_enabled(m))
        # Das Panel verlangt mindestens einen Modus; falls doch keiner gesetzt ist, bleibt "Abwesend"
        return modes or (MODE_AWAY,)

    def zone(self, mode: str) -> list[str]:
        if mode not in self.modes:
            return []
        return list(self.options.get(f"{CONF_ZONE_PREFIX}{mode}", []))

    def exit_delay(self, mode: str) -> int:
        return int(self.options.get(f"{CONF_EXIT_DELAY_PREFIX}{mode}", DEFAULT_EXIT_DELAY[mode]))

    def mode_value(self, field: str, scope: str | None, default: Any) -> Any:
        """Wert einer Einstellung für einen Modus ("always" ohne Modus): eigener Wert, sonst der alte gemeinsame, sonst Grundeinstellung."""
        if scope is not None and (own := self.options.get(f"{field}_{scope}")) is not None:
            return own
        return self.options.get(field, default)

    def entry_delay_for(self, mode: str | None) -> int:
        return int(self.mode_value(CONF_ENTRY_DELAY, mode, DEFAULT_ENTRY_DELAY))

    def confirm_window_for(self, mode: str | None) -> int:
        return int(self.mode_value(CONF_CONFIRM_WINDOW, mode, DEFAULT_CONFIRM_WINDOW))

    @property
    def entry_delay(self) -> int:
        """Eingangsverzögerung des Modus, in dem die Anlage gerade scharf ist (oder wird)."""
        return self.entry_delay_for(self.mode)

    def longest_entry_delay(self, mode: str) -> int:
        """
        Längste Eingangsverzögerung, die in diesem Modus laufen kann: die der Eingangssensoren seiner Zone (eigener Wert des
        Sensors oder der des Modus). 0: in diesem Modus läuft nie eine Eingangsverzögerung, die Aktionen dazu kämen nie zum Zug.
        """
        entry_sensors = self.entry_sensors
        return max((self.sensor_entry_delay(entity, mode) for entity in self.zone(mode) if entity in entry_sensors), default=0)

    def delay_left(self) -> float | None:
        """Restzeit der Verzögerung, die gerade läuft (Ausgang oder Eingang), in Sekunden; sonst None."""
        if self.state not in (AlarmControlPanelState.ARMING, AlarmControlPanelState.PENDING) or self.deadline is None:
            return None
        return max(0.0, (self.deadline - dt_util.utcnow()).total_seconds())

    def sensor_entry_delay(self, entity_id: str, mode: str | None) -> int:
        """
        Eingangsverzögerung eines Sensors in Sekunden: bei Einstellungen je Modus der eigene Wert für diesen Modus, dann der eigene
        Wert des Sensors, sonst der Wert der Anlage für den Modus. Ungültige Werte (beschädigte Ablage) gelten als nicht gesetzt.
        """
        candidates = []
        if self.options.get(CONF_PER_MODE_SENSORS) and mode is not None:
            per_scope = (self.options.get(CONF_SENSOR_MODES) or {}).get(mode)
            own = per_scope.get(entity_id) if isinstance(per_scope, dict) else None
            candidates.append(own.get(OPT_ENTRY_DELAY) if isinstance(own, dict) else None)
        candidates.append(self.sensor_overrides.get(entity_id, {}).get(OPT_ENTRY_DELAY))
        for value in candidates:
            if isinstance(value, int) and not isinstance(value, bool) and 0 <= value <= MAX_DELAY:
                return value
        return self.entry_delay_for(mode)

    @property
    def entry_sensors(self) -> set[str]:
        return set(self.options.get(CONF_ENTRY_SENSORS, []))

    @property
    def confirm_window(self) -> int:
        return self.confirm_window_for(self.mode)

    @property
    def codes(self) -> list[dict[str, Any]]:
        # Nur vollständige Einträge (Hash und Salz): ein beschädigter Eintrag darf die Code-Prüfung nicht stören
        return [c for c in self.options.get(CONF_CODES, []) or [] if isinstance(c, dict) and c.get("hash") and c.get("salt")]

    @property
    def has_code(self) -> bool:
        return bool(self.options.get(CONF_CODE_HASH)) or bool(self.codes)

    def person_for_user(self, user_id: str | None) -> str | None:
        """Name der Person, deren Code mit diesem HA-Benutzer verknüpft ist (für "geändert von")."""
        return next((c["name"] for c in self.codes if user_id and c.get("user_id") == user_id), None)

    def _candidates(self) -> list[tuple[tuple[str, str], str | None]]:
        out: list[tuple[tuple[str, str], str | None]] = []
        # Ein Hauptcode ohne Salz (beschädigte Ablage) wird übersprungen, statt die Prüfung für alle Codes zu stören
        if self.options.get(CONF_CODE_HASH) and self.options.get(CONF_CODE_SALT):
            out.append(((self.options[CONF_CODE_HASH], self.options[CONF_CODE_SALT]), None))
        out.extend(((c["hash"], c["salt"]), c.get("name")) for c in self.codes)
        return out

    @property
    def code_arm_required(self) -> bool:
        return self.has_code and bool(self.options.get(CONF_CODE_ARM_REQUIRED, False))

    # ----- Optionen pro Sensor -----

    @property
    def sensor_overrides(self) -> dict[str, dict[str, bool]]:
        # Nur Wörterbücher: ein beschädigter Eintrag darf die Anlage nicht am Laden hindern.
        # Gemerkt je Stand der Optionen (Home Assistant ersetzt das Objekt bei jeder Änderung): option() fragt bei jedem
        # Sensorereignis für jeden Sensor, ohne Merker entstünde das Wörterbuch jedes Mal neu
        options = self.options
        if self._overrides_for is not options:
            self._overrides = {e: o for e, o in (options.get(CONF_SENSOR_OPTIONS) or {}).items() if isinstance(o, dict)}
            self._overrides_for = options
        return self._overrides

    def preset(self, entity_id: str) -> list[str]:
        from .settings import sensor_type  # noqa: PLC0415 - vermeidet Kreisimport beim Laden

        presets = self.settings.presets if self.settings else DEFAULT_PRESETS
        return presets.get(sensor_type(self.hass, entity_id), [])

    def own_option(self, entity_id: str, key: str, mode: str | None = None) -> bool | None:
        """
        Eigener Wert einer Sensor-Option oder None: bei eingeschalteten Einstellungen je Modus der eigene Wert für diesen Modus,
        dann der eigene Wert des Sensors (für alle Modi). Ohne Modus (deaktiviert) gelten die Werte für alle Modi.
        """
        if self.options.get(CONF_PER_MODE_SENSORS):
            # Der Reiter "Immer aktiv" (Bereich SCOPE_ALWAYS) gilt, wenn die Anlage deaktiviert ist, und immer für die Option "Immer aktiv"
            # selbst: sie hängt nie an einem Modus (ein Rauchmelder lässt sich nicht in einem Modus abschalten)
            scope = SCOPE_ALWAYS if (mode is None or key == OPT_ALWAYS) else mode
            per_scope = (self.options.get(CONF_SENSOR_MODES) or {}).get(scope)
            own = per_scope.get(entity_id) if isinstance(per_scope, dict) else None
            own_mode = own.get(key) if isinstance(own, dict) else None
            if own_mode is not None:
                return bool(own_mode)
        own = self.sensor_overrides.get(entity_id, {}).get(key)
        return None if own is None else bool(own)

    def option(self, entity_id: str, key: str, mode: str | None = None) -> bool:
        """Wirksamer Wert einer Sensor-Option: der eigene Wert (siehe own_option), sonst die Voreinstellung der Sensorart."""
        own = self.own_option(entity_id, key, mode)
        return own if own is not None else key in self.preset(entity_id)

    def only_mode(self, entity_id: str, mode: str | None) -> bool:
        """
        Schalter "Scharf: nur der Modus zählt" (OPT_ALWAYS_OFF) für einen Sensor, der "Immer aktiv" ist und zugleich in der Zone
        des Modus steht. An (Standard seit 1.7.0): ist die Anlage in diesem Modus scharf, gelten für den Sensor nur die
        Einstellungen und Aktionen des Modus. Aus: "Immer aktiv" gilt zusätzlich (löst sofort aus, beide Abläufe laufen).
        In Modi, deren Zone den Sensor nicht enthält, hat der Schalter keine Wirkung: dort gilt "Immer aktiv".
        """
        if mode is None or entity_id not in self.zone(mode):
            return False
        own = self.own_option(entity_id, OPT_ALWAYS_OFF, mode)
        return True if own is None else own

    def always_ignored(self, entity_id: str) -> bool:
        """"Immer aktiv" gilt für diesen Sensor gerade nicht: die Anlage ist in einem Modus scharf, der ihn enthält, und nur der Modus zählt."""
        return self.only_mode(entity_id, self.mode)

    def _flows_for(self, entity_id: str | None, by_always: bool) -> list[str]:
        """
        Abläufe der Alarmaktionen für einen Alarm durch diesen Sensor (für jeden Nutzer nachvollziehbar, so steht es im Blatt):
        - Anlage deaktiviert: "Immer aktiv".
        - Scharf, ausgelöst über die Regel des Modus: der Modus.
        - Scharf, ausgelöst über "Immer aktiv": steht der Sensor nicht in der Zone des Modus, "Immer aktiv"; steht er darin
          (dann ist "nur der Modus zählt" ausgeschaltet), beide: der Modus und "Immer aktiv".
        """
        mode = self.mode
        if mode is None:
            return [WORKFLOW_ALWAYS]
        if not by_always:
            return [mode]
        return [mode, WORKFLOW_ALWAYS] if entity_id is not None and entity_id in self.zone(mode) else [WORKFLOW_ALWAYS]

    def alarm_plan(self) -> list[str]:
        """
        Die Abläufe, die für den laufenden Alarm wirklich laufen (erster = Hauptablauf, er bestimmt auch die Alarmmeldung):
        die gewünschten aus alarm_flows, ohne leere und ohne doppelte (ohne "Einstellungen pro Modus" ist es derselbe Ablauf).
        Hat "Immer aktiv" keinen eigenen Ablauf, läuft bei scharfer Anlage der Ablauf des Modus (im Zweifel alarmieren).
        """
        flows = self.options.get(CONF_WORKFLOWS) or {}
        wanted = [f for f in self.alarm_flows if isinstance(f, str)] or [self.mode or WORKFLOW_ALWAYS]
        plan: list[str] = []
        for flow in wanted:
            steps = flows.get(flow) or []
            if steps and all(steps != (flows.get(other) or []) for other in plan):
                plan.append(flow)
        if not plan and self.mode and flows.get(self.mode):
            plan = [self.mode]
        return plan or wanted[:1]

    def always_sensors(self, mode: str | None = None) -> set[str]:  # noqa: ARG002 - "Immer aktiv" hängt an keinem Modus
        """
        Immer aktiv sind alle Sensoren der Anlage, bei denen die Option wirkt: die einer Zone, die in der Liste der Konfiguration
        stehen und alle mit eigenen Werten. Der Wert kommt wie überall aus dem eigenen Wert oder der Voreinstellung der Sensorart,
        auch ein Rauchmelder ohne eigene Einstellung und ohne Zone ist also immer aktiv (bis 1.4.0 fehlte er dann). Die Option hängt
        an keinem Modus: mit Einstellungen je Modus steht ihr Wert immer im Bereich "Immer aktiv" (SCOPE_ALWAYS), darum ist `mode`
        hier ohne Wirkung.
        """
        if not self.always_enabled:
            return set()
        known = {e for m in self.modes for e in self.zone(m)} | set(self.options.get(CONF_SENSORS) or []) | set(self.sensor_overrides)
        if self.options.get(CONF_PER_MODE_SENSORS):
            known |= {e for per in (self.options.get(CONF_SENSOR_MODES) or {}).values() if isinstance(per, dict) for e in per}
        return {e for e in known if isinstance(e, str) and self.option(e, OPT_ALWAYS, mode)}

    def all_sensors(self) -> set[str]:
        """Alle Sensoren, auf die gehört wird: die der Zonen und alle, die in irgendeinem Modus immer aktiv sein können."""
        return {entity for mode in self.modes for entity in self.zone(mode)} | self.always_sensors()

    def open_sensors(self, mode: str) -> list[str]:
        return [entity for entity in self.zone(mode) if (s := self.hass.states.get(entity)) and s.state == STATE_ON]

    def bypassable_sensors(self, mode: str) -> list[str]:
        """Offene Sensoren, die nicht offen sein dürfen ("darf offen sein" zählt nicht)."""
        return [e for e in self.open_sensors(mode) if not self.option(e, OPT_OPEN_OK, mode)]

    def blocking_sensors(self, mode: str) -> list[str]:
        """Offene Sensoren, die das Scharfschalten verhindern (weder "darf offen sein" noch "umgehen")."""
        return [e for e in self.bypassable_sensors(mode) if not self.option(e, OPT_BYPASS, mode)]

    def ready(self, mode: str) -> bool:
        return not self.blocking_sensors(mode)

    @callback
    def add_event_listener(self, listener: Callable[[str, dict[str, Any]], None]) -> CALLBACK_TYPE:
        self._event_listeners.append(listener)
        return partial(self._event_listeners.remove, listener)

    @callback
    def add_record_listener(self, listener: Callable[[str, dict[str, Any]], None]) -> CALLBACK_TYPE:
        self._record_listeners.append(listener)
        return partial(self._record_listeners.remove, listener)

    @callback
    def _call_each(self, listeners: list[Callable[..., None]], *args: Any) -> None:
        """
        Jeden Zuhörer einzeln aufrufen. Scheitert einer (Protokoll, Aufzeichnung, Meldung, Entität), laufen die übrigen
        trotzdem: Die Alarmaktionen hängen als letzter Zuhörer an derselben Liste, und ein Fehler beim Mitschreiben darf nie
        verhindern, dass die Sirene schaltet (Sicherheitsregel: im Zweifel alarmieren).
        """
        for listener in list(listeners):
            try:
                listener(*args)
            except Exception:  # noqa: BLE001 - ein Zuhörer hält die anderen nie auf
                _LOGGER.exception("%s: a listener failed, the others still run", self.entry.title)

    @callback
    def record(self, kind: str, **data: Any) -> None:
        """Hinweis für die Zeitachse eines laufenden Alarms."""
        self._call_each(self._record_listeners, kind, data)

    @callback
    def emit(self, kind: str, **data: Any) -> None:
        """Ereignis ohne Zustandswechsel, auch von aussen (Zeitplan übersprungen)."""
        self._emit(kind, **data)

    @callback
    def _emit(self, kind: str, **data: Any) -> None:
        self._call_each(self._event_listeners, kind, data)

    # ----- Lebenszyklus -----

    @callback
    def async_start(self) -> None:
        sensors = sorted(self.all_sensors())
        if sensors:
            self._unsub_sensors = async_track_state_change_event(self.hass, sensors, self._on_sensor)

    @callback
    def async_stop(self) -> None:
        if self._unsub_sensors:
            self._unsub_sensors()
            self._unsub_sensors = None
        self._cancel_timer()

    @callback
    def add_listener(self, listener: Callable[[], None]) -> CALLBACK_TYPE:
        self._listeners.append(listener)
        return partial(self._listeners.remove, listener)

    @callback
    def _notify(self) -> None:
        self._call_each(self._listeners)

    # ----- Zeitgeber -----

    @callback
    def _cancel_timer(self) -> None:
        if self._unsub_timer:
            self._unsub_timer()
            self._unsub_timer = None

    @callback
    def _schedule(self, when: datetime, action: Callable[[Any], None]) -> None:
        # Ziel ist eine @callback-Methode, keine lambda: sonst liefe sie als Executor-Job im Thread (LEARNINGS).
        self._cancel_timer()
        self.deadline = when
        self._unsub_timer = async_track_point_in_utc_time(self.hass, action, when)

    # ----- Übergänge -----

    @callback
    def _set(self, state: AlarmControlPanelState) -> None:
        if state != self.state:
            _LOGGER.debug("%s: %s -> %s", self.entry.title, self.state, state)
        self.state = state
        self._notify()

    @callback
    def _timer_spent(self, fired_at: Any) -> None:
        """
        Der Zeitgeber, der den Übergang auslöst, ist erledigt. Ruft ihn der Zeitgeber selbst (er übergibt die Zeit), ist er
        verbraucht; ruft ihn ein anderer Anlass direkt (Sensor, Panik, "Immer aktiv" mitten in der Verzögerung), läuft der Zeitgeber der
        Verzögerung noch und muss abgebrochen werden: sonst schlüge er später noch einmal zu (nach dem Deaktivieren wieder Alarm,
        am Ende der Ausgangsverzögerung "scharf" mitten im Alarm).
        """
        if fired_at is None:
            self._cancel_timer()
        else:
            self._unsub_timer = None

    @callback
    def _go_armed(self, _now: Any = None) -> None:
        self._timer_spent(_now)
        self.deadline = None
        self._arming_deadline = None
        self.triggered_by = None
        if self.mode is None:
            # Alarm von Hand aus "deaktiviert" ausgelöst: danach wieder deaktiviert
            self._set(AlarmControlPanelState.DISARMED)
            return
        # Nach einem quittierten Alarm und beim Wiederherstellen nach einem Neustart bleibt die Angabe: die Anlage war durchgehend scharf.
        # Fehlt sie (Alarm mitten in der Ausgangsverzögerung, die Anlage war noch nie scharf), gilt jetzt.
        if (self.state != AlarmControlPanelState.TRIGGERED or self.armed_at is None) and not self._restoring:
            self.armed_at = dt_util.utcnow()
            self.armed_by = self.changed_by
        self._set(ARMED_STATE[self.mode])

    @callback
    def _go_triggered(self, _now: Any = None) -> None:
        self._timer_spent(_now)
        self.deadline = None
        self._set(AlarmControlPanelState.TRIGGERED)

    @callback
    def _go_pending(self, remaining: float) -> None:
        self._schedule(dt_util.utcnow() + timedelta(seconds=remaining), self._go_triggered)
        self._set(AlarmControlPanelState.PENDING)

    @callback
    def _on_sensor(self, event: Event[EventStateChangedData]) -> None:
        old, new = event.data["old_state"], event.data["new_state"]
        if old is None or new is None:
            return
        entity = event.data["entity_id"]
        # Mitschreiben für die Anzeige. Es steht vor der Alarmlogik, darum nie ohne Schutz: ein Fehler dort darf den Alarm nicht verhindern
        # (Sicherheitsregel: im Zweifel alarmieren)
        try:
            # Stundenwerte der Sensoransicht (Anzahl Auslösungen, Zeit offen): jeder Wechsel eines überwachten Sensors
            if self.stats is not None:
                self.stats.note(entity, old.state, new.state, new.last_changed)
            # "Letzte Änderung" der Liste: nur ein Wechsel offen <-> zu, nicht der Neustart von Home Assistant
            if self.settings is not None and is_real_change(old.state, new.state):
                self.settings.note_change(entity, new.last_changed.isoformat())
        except Exception:  # noqa: BLE001 - die Anzeige hält den Alarm nie auf
            _LOGGER.exception("%s: recording the sensor change of %s failed, the alarm logic still runs", self.entry.title, entity)
        # Nur ein echter Wechsel von "zu" auf "offen" zählt. "nicht verfügbar" -> "offen" kommt nach jedem
        # Neustart und jeder Neuverbindung vor und wäre ein Fehlalarm.
        went_on = old.state == STATE_OFF and new.state == STATE_ON
        went_off = old.state == STATE_ON and new.state == STATE_OFF
        went_away = old.state in (STATE_ON, STATE_OFF) and new.state in GONE

        # Immer aktiv (Rauch, Wasser): löst sofort aus, bei deaktivierter Anlage und in jedem Modus, dessen Zone den Sensor nicht
        # enthält. Seine Optionen stehen im Bereich "Immer aktiv" (Modus None). Steht er in der Zone des scharfen Modus, zählt
        # standardmässig nur der Modus (only_mode): Regel und Aktionen des Modus. Ist das ausgeschaltet, gilt "Immer aktiv"
        # zusätzlich: sofort Alarm, beide Abläufe (_flows_for). Mit "Stiller Alarm" nur eine Meldung, danach die Regel des Modus.
        if went_on and entity in self.always_sensors(self.mode) and self.state != AlarmControlPanelState.TRIGGERED and not self.always_ignored(entity):
            if not self.option(entity, OPT_REPORT_ONLY, None):
                self.triggered_by = entity
                self.alarm_flows = self._flows_for(entity, by_always=True)
                self._go_triggered()
                return
            self._report(entity)

        if self.state == AlarmControlPanelState.ARMING and self.mode and entity in self.zone(self.mode):
            self._on_arming_change(entity, went_on, went_off)
            return

        if self.state not in WATCHING or self.mode is None:
            return
        if entity not in self.zone(self.mode) or entity in self.bypassed:
            return

        if went_away:
            self._emit("sensor_offline", sensor=entity)
            if self.option(entity, OPT_OFFLINE_ALARM, self.mode):
                self.triggered_by = entity
                self.alarm_flows = self._flows_for(entity, by_always=False)
                self._go_triggered()
            return
        if not went_on:
            return
        # "Stiller Alarm": der Sensor löst nie aus (auch nicht mit Bestätigung), er meldet nur
        if self.option(entity, OPT_REPORT_ONLY, self.mode):
            self._report(entity)
            return
        if self.state != AlarmControlPanelState.PENDING and not self._confirmed(entity):
            return

        delay = self.sensor_entry_delay(entity, self.mode) if entity in self.entry_sensors else 0
        delayed = delay > 0
        if self.state == AlarmControlPanelState.PENDING:
            if delayed:
                return  # Verzögerung läuft schon, ein weiterer Eingangssensor verlängert sie nicht
            self.triggered_by = entity
            self.alarm_flows = self._flows_for(entity, by_always=False)
            self._go_triggered()
            return
        self.triggered_by = entity
        self.alarm_flows = self._flows_for(entity, by_always=False)
        if delayed:
            self._go_pending(delay)
        else:
            self._go_triggered()

    @callback
    def _report(self, entity: str) -> None:
        now = dt_util.utcnow()
        last = self._last_report.get(entity)
        if last and (now - last).total_seconds() < REPORT_THROTTLE:
            return
        self._last_report[entity] = now
        self._emit("sensor_report", sensor=entity)

    @callback
    def _confirmed(self, entity: str) -> bool:
        """
        Zwei-Sensor-Bestätigung: Ein Sensor mit dieser Option löst nur aus,
        wenn ein anderer Sensor mit derselben Option innerhalb des Zeitfensters
        angesprochen hat. Sensoren ohne die Option lösen wie immer allein aus.
        Während der Eingangsverzögerung gilt sie nicht (die Tür war der erste Sensor).
        """
        if not self.option(entity, OPT_CONFIRM, self.mode):
            return True
        now = dt_util.utcnow()
        window = timedelta(seconds=self.confirm_window)
        self._unconfirmed = {e: t for e, t in self._unconfirmed.items() if now - t <= window}
        if any(e != entity for e in self._unconfirmed):
            self._unconfirmed.clear()
            return True
        self._unconfirmed[entity] = now
        self._emit("unconfirmed", sensor=entity)
        return False

    @callback
    def _on_arming_change(self, entity: str, went_on: bool, went_off: bool) -> None:
        """
        "Scharf, sobald geschlossen": Wer die Tür hinter sich zuzieht, muss
        nicht die ganze Ausgangsverzögerung abwarten. Kurze Wartezeit gegen
        Prellen; geht die Tür wieder auf, gilt die ursprüngliche Verzögerung.
        """
        if not self.option(entity, OPT_ARM_ON_CLOSE, self.mode):
            return
        if went_off:
            if self._arming_deadline is None:
                self._arming_deadline = self.deadline
            settle = dt_util.utcnow() + timedelta(seconds=ARM_ON_CLOSE_SETTLE)
            if self._arming_deadline and settle < self._arming_deadline:
                self._schedule(settle, self._go_armed)
                self._notify()
        elif went_on and self._arming_deadline:
            self._schedule(self._arming_deadline, self._go_armed)
            self._arming_deadline = None
            self._notify()

    # ----- Code -----

    async def _async_check_code(self, code: str | None) -> str | None:
        """Prüft den Code; gibt den Namen der Person zurück, wenn es ein persönlicher Code ist."""
        now = dt_util.utcnow()
        if self._locked_until and now < self._locked_until:
            raise _error("code_locked", seconds=str(int((self._locked_until - now).total_seconds()) + 1))
        candidates = self._candidates()
        index = await self.hass.async_add_executor_job(match_code, str(code), [c for c, _ in candidates]) if code else None
        if index is None:
            self._failed_codes += 1
            if self._failed_codes >= CODE_MAX_ATTEMPTS:
                self._failed_codes = 0
                self._locked_until = now + timedelta(seconds=CODE_LOCKOUT_SECONDS)
            raise _error("invalid_code")
        self._failed_codes = 0
        self._locked_until = None
        return candidates[index][1]

    # ----- Befehle -----

    async def async_arm(self, mode: str, code: str | None, changed_by: str | None = None, skip_code: bool = False, force: bool = False) -> None:
        # skip_code nur für den Zeitplan, den ein Administrator eingerichtet hat, und für die Knöpfe der Meldung "Scharfschalten
        # nicht möglich". force (nur dieser Knopf, 1.18.0): offene Sensoren verhindern das Scharfschalten nicht, sie werden bis
        # zum Deaktivieren übergangen wie mit der Option "Umgehen".
        if mode not in self.modes:
            raise _error("mode_not_enabled", mode=mode)
        if self.state in (AlarmControlPanelState.PENDING, AlarmControlPanelState.TRIGGERED):
            raise _error("disarm_first")
        if self.code_arm_required and not skip_code:
            changed_by = await self._async_check_code(code) or changed_by
            # Die Code-Prüfung läuft im Executor: löst währenddessen ein Sensor aus, darf das Scharfschalten die laufende
            # Eingangsverzögerung oder den Alarm nicht still beenden (Sicherheitsregel: im Zweifel alarmieren)
            if self.state in (AlarmControlPanelState.PENDING, AlarmControlPanelState.TRIGGERED):
                raise _error("disarm_first")
        # Offen und nicht erlaubt: mit der Option "Umgehen" bis zum Deaktivieren übergangen, sonst verhindert der Sensor das Scharfschalten
        open_now = [] if force else self.blocking_sensors(mode)
        if open_now:
            self._emit("arm_failed", mode=mode, sensors=list(open_now))
            raise _error("open_sensors", sensors=", ".join(self._name(e) for e in open_now))
        bypassed = {e for e in self.bypassable_sensors(mode)}
        self._cancel_timer()
        self.mode = mode
        self._arming_deadline = None
        self._unconfirmed.clear()
        self.bypassed = bypassed
        self.triggered_by = None
        self.alarm_flows = []
        self.changed_by = changed_by
        delay = self.exit_delay(mode)
        if delay > 0:
            self._schedule(dt_util.utcnow() + timedelta(seconds=delay), self._go_armed)
            self._set(AlarmControlPanelState.ARMING)
        else:
            self._go_armed()

    async def async_disarm(self, code: str | None, changed_by: str | None = None, skip_code: bool = False) -> None:
        # skip_code nur für die Push-Aktion "Deaktivieren", die der Nutzer ausdrücklich eingeschaltet hat
        if self.has_code and not skip_code:
            changed_by = await self._async_check_code(code) or changed_by
        self._cancel_timer()
        self.mode = None
        self.armed_at = None
        self.armed_by = None
        self.deadline = None
        self._arming_deadline = None
        self._unconfirmed.clear()
        self.bypassed = set()
        self.triggered_by = None
        self.alarm_flows = []
        self.changed_by = changed_by
        self._set(AlarmControlPanelState.DISARMED)

    @callback
    def acknowledge(self, changed_by: str | None = None) -> bool:
        """
        Alarm quittieren (1.1.0): der Alarm endet, die Anlage bleibt scharf (im selben Modus). Der Ablauf stoppt und die
        Gegenaktionen laufen wie beim Deaktivieren. Ohne laufenden Alarm geschieht nichts. Kein Code nötig: Quittieren schaltet
        nichts ab, ein neuer Auslöser alarmiert wieder. Aus "deaktiviert" (Alarm von Hand) endet der Alarm im Zustand "deaktiviert".
        """
        if self.state != AlarmControlPanelState.TRIGGERED:
            return False
        self._cancel_timer()
        self.changed_by = changed_by
        # Zuerst das Ereignis (Aufzeichnung merkt sich, von wem), dann der Zustandswechsel
        self.emit("acknowledged", by=changed_by)
        self._go_armed()
        return True

    @callback
    def async_trigger(self, changed_by: str | None = None) -> None:
        """Alarm von Hand (Dienst alarm_trigger, Panik). Geht auch aus "deaktiviert"."""
        self.triggered_by = None
        self.alarm_flows = self._flows_for(None, by_always=False)
        self.changed_by = changed_by
        self._go_triggered()

    def _name(self, entity_id: str) -> str:
        return display_name(self.hass, entity_id)

    # ----- Neustart -----

    def restore_data(self) -> dict[str, Any]:
        return {
            "mode": self.mode,
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "bypassed": sorted(self.bypassed),
            "triggered_by": self.triggered_by,
            "changed_by": self.changed_by,
            "armed_at": self.armed_at.isoformat() if self.armed_at else None,
            "armed_by": self.armed_by,
            "alarm_flows": list(self.alarm_flows),
        }

    @callback
    def async_restore(self, last_state: str | None, data: dict[str, Any] | None) -> None:
        """
        Zustand nach Neustart oder Neuladen wiederherstellen. Zeitgeber laufen
        mit der Restzeit weiter; eine während des Neustarts abgelaufene
        Eingangsverzögerung wird zum Alarm.
        """
        self._restoring = True
        try:
            self._restore(last_state, data)
        finally:
            self._restoring = False

    def _restore(self, last_state: str | None, data: dict[str, Any] | None) -> None:
        data = data or {}
        now = dt_util.utcnow()
        mode = data.get("mode")
        if mode not in self.modes:
            mode = STATE_MODE.get(last_state) if last_state in STATE_MODE else None
            mode = mode if mode in self.modes else None
        raw = data.get("deadline")
        deadline = dt_util.parse_datetime(raw) if raw else None
        remaining = (deadline - now).total_seconds() if deadline else None
        self.bypassed = set(data.get("bypassed") or []) & self.all_sensors()
        self.triggered_by = data.get("triggered_by")
        self.changed_by = data.get("changed_by")
        self.mode = mode
        # Ältere Stände kennen die Angabe nicht: dann fehlt sie bis zum nächsten Scharfschalten
        self.armed_at = (dt_util.parse_datetime(str(data["armed_at"])) if data.get("armed_at") else None) if mode else None
        self.armed_by = data.get("armed_by") if mode else None
        # Abläufe des laufenden Alarms; ältere Stände kennen sie nicht (dann gilt der Modus bzw. "Immer aktiv", siehe alarm_plan)
        flows = data.get("alarm_flows")
        valid = {*self.modes, WORKFLOW_ALWAYS}
        self.alarm_flows = [f for f in flows if f in valid] if isinstance(flows, list) else []

        if last_state in STATE_MODE and mode:
            self._go_armed()
        elif last_state == AlarmControlPanelState.ARMING and mode:
            if remaining and remaining > 0:
                self._schedule(deadline, self._go_armed)
                self._set(AlarmControlPanelState.ARMING)
            else:
                self._go_armed()
        elif last_state == AlarmControlPanelState.PENDING and mode:
            if remaining and remaining > 0:
                self._go_pending(remaining)
            else:
                self._go_triggered()
        elif last_state == AlarmControlPanelState.TRIGGERED:
            if deadline is None:
                self._set(AlarmControlPanelState.TRIGGERED)  # Alarm bis zum Deaktivieren
            elif remaining > 0:
                self._schedule(deadline, self._go_armed)
                self._set(AlarmControlPanelState.TRIGGERED)
            else:
                self._go_armed()
        else:
            self.mode = None
            self.bypassed = set()
            self._set(AlarmControlPanelState.DISARMED)
