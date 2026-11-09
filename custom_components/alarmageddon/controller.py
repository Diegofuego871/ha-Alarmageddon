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
from .last_change import is_real_change
from .const import (
    ARM_ON_CLOSE_SETTLE,
    CONF_CONFIRM_WINDOW,
    DEFAULT_CONFIRM_WINDOW,
    OPT_CONFIRM,
    CONF_SENSOR_OPTIONS,
    DEFAULT_PRESETS,
    OPT_ALWAYS,
    OPT_ARM_ON_CLOSE,
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
    CONF_NIGHT_ENABLED,
    CONF_OPEN_SENSORS,
    CONF_ZONE_PREFIX,
    DEFAULT_ENTRY_DELAY,
    DEFAULT_EXIT_DELAY,
    DEFAULT_OPEN_SENSORS,
    DOMAIN,
    MODE_AWAY,
    MODE_HOME,
    MODE_NIGHT,
    MODES,
    OPEN_BYPASS,
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
        self.state: AlarmControlPanelState = AlarmControlPanelState.DISARMED
        # Modus, der scharf ist oder scharf wird. Bleibt bei Verzögerung und Alarm erhalten,
        # damit die Anlage nach dem Alarm in denselben Modus zurückkehrt.
        self.mode: str | None = None
        self.deadline: datetime | None = None
        self.bypassed: set[str] = set()
        self.triggered_by: str | None = None
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

    # ----- Einstellungen (immer frisch aus den Optionen) -----

    @property
    def options(self) -> dict[str, Any]:
        return self.entry.options

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

    def open_sensors_for(self, mode: str | None) -> str:
        return str(self.mode_value(CONF_OPEN_SENSORS, mode, DEFAULT_OPEN_SENSORS))

    def confirm_window_for(self, mode: str | None) -> int:
        return int(self.mode_value(CONF_CONFIRM_WINDOW, mode, DEFAULT_CONFIRM_WINDOW))

    @property
    def entry_delay(self) -> int:
        """Eingangsverzögerung des Modus, in dem die Anlage gerade scharf ist (oder wird)."""
        return self.entry_delay_for(self.mode)

    @property
    def entry_sensors(self) -> set[str]:
        return set(self.options.get(CONF_ENTRY_SENSORS, []))

    @property
    def confirm_window(self) -> int:
        return self.confirm_window_for(self.mode)

    @property
    def codes(self) -> list[dict[str, Any]]:
        return [c for c in self.options.get(CONF_CODES, []) or [] if isinstance(c, dict) and c.get("hash")]

    @property
    def has_code(self) -> bool:
        return bool(self.options.get(CONF_CODE_HASH)) or bool(self.codes)

    def person_for_user(self, user_id: str | None) -> str | None:
        """Name der Person, deren Code mit diesem HA-Benutzer verknüpft ist (für "geändert von")."""
        return next((c["name"] for c in self.codes if user_id and c.get("user_id") == user_id), None)

    def _candidates(self) -> list[tuple[tuple[str, str], str | None]]:
        out: list[tuple[tuple[str, str], str | None]] = []
        if self.options.get(CONF_CODE_HASH):
            out.append(((self.options[CONF_CODE_HASH], self.options[CONF_CODE_SALT]), None))
        out.extend(((c["hash"], c["salt"]), c.get("name")) for c in self.codes)
        return out

    @property
    def code_arm_required(self) -> bool:
        return self.has_code and bool(self.options.get(CONF_CODE_ARM_REQUIRED, False))

    # ----- Optionen pro Sensor -----

    @property
    def sensor_overrides(self) -> dict[str, dict[str, bool]]:
        return self.options.get(CONF_SENSOR_OPTIONS, {}) or {}

    def preset(self, entity_id: str) -> list[str]:
        from .settings import sensor_type  # noqa: PLC0415 - vermeidet Kreisimport beim Laden

        presets = self.settings.presets if self.settings else DEFAULT_PRESETS
        return presets.get(sensor_type(self.hass, entity_id), [])

    def option(self, entity_id: str, key: str) -> bool:
        """Eigener Wert des Sensors, sonst Voreinstellung seiner Sensorart."""
        own = self.sensor_overrides.get(entity_id, {}).get(key)
        if own is not None:
            return bool(own)
        return key in self.preset(entity_id)

    def always_sensors(self) -> set[str]:
        """
        Immer aktiv sind Sensoren einer Zone mit dieser Option und alle, bei
        denen der Nutzer sie ausdrücklich eingeschaltet hat (Rauchmelder
        müssen dafür in keiner Zone sein).
        """
        zoned = {e for mode in self.modes for e in self.zone(mode)}
        explicit = {e for e, opts in self.sensor_overrides.items() if opts.get(OPT_ALWAYS)}
        return {e for e in zoned | explicit if self.option(e, OPT_ALWAYS)}

    def all_sensors(self) -> set[str]:
        return {entity for mode in self.modes for entity in self.zone(mode)} | self.always_sensors()

    def open_sensors(self, mode: str) -> list[str]:
        return [entity for entity in self.zone(mode) if (s := self.hass.states.get(entity)) and s.state == STATE_ON]

    def blocking_sensors(self, mode: str) -> list[str]:
        """Offene Sensoren, die das Scharfschalten verhindern ("darf offen sein" zählt nicht)."""
        return [e for e in self.open_sensors(mode) if not self.option(e, OPT_OPEN_OK)]

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
    def record(self, kind: str, **data: Any) -> None:
        """Hinweis für die Zeitachse eines laufenden Alarms."""
        for listener in list(self._record_listeners):
            listener(kind, data)

    @callback
    def emit(self, kind: str, **data: Any) -> None:
        """Ereignis ohne Zustandswechsel, auch von aussen (Zeitplan übersprungen)."""
        self._emit(kind, **data)

    @callback
    def _emit(self, kind: str, **data: Any) -> None:
        for listener in list(self._event_listeners):
            listener(kind, data)

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
        for listener in list(self._listeners):
            listener()

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
    def _go_armed(self, _now: Any = None) -> None:
        self._unsub_timer = None
        self.deadline = None
        self._arming_deadline = None
        self.triggered_by = None
        if self.mode is None:
            # Alarm von Hand aus "deaktiviert" ausgelöst: danach wieder deaktiviert
            self._set(AlarmControlPanelState.DISARMED)
            return
        self._set(ARMED_STATE[self.mode])

    @callback
    def _go_triggered(self, _now: Any = None) -> None:
        self._unsub_timer = None
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
        # "Letzte Änderung" der Liste: nur ein Wechsel offen <-> zu, nicht der Neustart von Home Assistant
        if self.settings is not None and is_real_change(old.state, new.state):
            self.settings.note_change(entity, new.last_changed.isoformat())
        # Nur ein echter Wechsel von "zu" auf "offen" zählt. "nicht verfügbar" -> "offen" kommt nach jedem
        # Neustart und jeder Neuverbindung vor und wäre ein Fehlalarm.
        went_on = old.state == STATE_OFF and new.state == STATE_ON
        went_off = old.state == STATE_ON and new.state == STATE_OFF
        went_away = old.state in (STATE_ON, STATE_OFF) and new.state in GONE

        # Immer aktiv (Rauch, Wasser): löst in jedem Zustand aus, sofort. Mit "Stiller Alarm" nur eine Meldung.
        if went_on and entity in self.always_sensors() and self.state != AlarmControlPanelState.TRIGGERED:
            if self.option(entity, OPT_REPORT_ONLY):
                self._report(entity)
                return
            self.triggered_by = entity
            self._go_triggered()
            return

        if self.state == AlarmControlPanelState.ARMING and self.mode and entity in self.zone(self.mode):
            self._on_arming_change(entity, went_on, went_off)
            return

        if self.state not in WATCHING or self.mode is None:
            return
        if entity not in self.zone(self.mode) or entity in self.bypassed:
            return

        if went_away:
            self._emit("sensor_offline", sensor=entity)
            if self.option(entity, OPT_OFFLINE_ALARM):
                self.triggered_by = entity
                self._go_triggered()
            return
        if not went_on:
            return
        # "Stiller Alarm": der Sensor löst nie aus (auch nicht mit Bestätigung), er meldet nur
        if self.option(entity, OPT_REPORT_ONLY):
            self._report(entity)
            return
        if self.state != AlarmControlPanelState.PENDING and not self._confirmed(entity):
            return

        delayed = entity in self.entry_sensors and self.entry_delay > 0
        if self.state == AlarmControlPanelState.PENDING:
            if delayed:
                return  # Verzögerung läuft schon, ein weiterer Eingangssensor verlängert sie nicht
            self.triggered_by = entity
            self._go_triggered()
            return
        self.triggered_by = entity
        if delayed:
            self._go_pending(self.entry_delay)
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
        if not self.option(entity, OPT_CONFIRM):
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
        if not self.option(entity, OPT_ARM_ON_CLOSE):
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

    async def async_arm(self, mode: str, code: str | None, changed_by: str | None = None, skip_code: bool = False) -> None:
        # skip_code nur für den Zeitplan, den ein Administrator eingerichtet hat
        if mode not in self.modes:
            raise _error("mode_not_enabled", mode=mode)
        if self.state in (AlarmControlPanelState.PENDING, AlarmControlPanelState.TRIGGERED):
            raise _error("disarm_first")
        if self.code_arm_required and not skip_code:
            changed_by = await self._async_check_code(code) or changed_by
        open_now = self.blocking_sensors(mode)
        bypassed: set[str] = set()
        if open_now:
            if self.open_sensors_for(mode) != OPEN_BYPASS:
                self._emit("arm_failed", mode=mode, sensors=list(open_now))
                raise _error("open_sensors", sensors=", ".join(self._name(e) for e in open_now))
            bypassed = set(open_now)
        self._cancel_timer()
        self.mode = mode
        self._arming_deadline = None
        self._unconfirmed.clear()
        self.bypassed = bypassed
        self.triggered_by = None
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
        self.deadline = None
        self._arming_deadline = None
        self._unconfirmed.clear()
        self.bypassed = set()
        self.triggered_by = None
        self.changed_by = changed_by
        self._set(AlarmControlPanelState.DISARMED)

    @callback
    def async_trigger(self, changed_by: str | None = None) -> None:
        """Alarm von Hand (Dienst alarm_trigger, Panik). Geht auch aus "deaktiviert"."""
        self.triggered_by = None
        self.changed_by = changed_by
        self._go_triggered()

    def _name(self, entity_id: str) -> str:
        state = self.hass.states.get(entity_id)
        return state.name if state else entity_id

    # ----- Neustart -----

    def restore_data(self) -> dict[str, Any]:
        return {
            "mode": self.mode,
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "bypassed": sorted(self.bypassed),
            "triggered_by": self.triggered_by,
            "changed_by": self.changed_by,
        }

    @callback
    def async_restore(self, last_state: str | None, data: dict[str, Any] | None) -> None:
        """
        Zustand nach Neustart oder Neuladen wiederherstellen. Zeitgeber laufen
        mit der Restzeit weiter; eine während des Neustarts abgelaufene
        Eingangsverzögerung wird zum Alarm.
        """
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
