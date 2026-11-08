"""Prüfung von Werten aus dem Panel und aus einer Sicherung (dieselben Regeln an beiden Stellen)."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.helpers import config_validation as cv

from .const import (
    CONF_AWAY_ENABLED,
    CONF_CONFIRM_WINDOW,
    CONF_HOME_ENABLED,
    CONF_SCHEDULES,
    MAX_SCHEDULES,
    SCHEDULE_ACTIONS,
    CONF_ENTRY_DELAY,
    CONF_ENTRY_SENSORS,
    CONF_SENSORS,
    CONF_EXIT_DELAY_PREFIX,
    CONF_NIGHT_ENABLED,
    CONF_OPEN_SENSORS,
    CONF_SENSOR_OPTIONS,
    CONF_TRIGGER_TIME,
    CONF_WORKFLOWS,
    CONF_ZONE_PREFIX,
    MAX_CONFIRM_WINDOW,
    MAX_DELAY,
    MAX_STEPS,
    MODES,
    OPEN_SENSOR_MODES,
    SCOPE_ALWAYS,
    SENSOR_OPTIONS,
    SOUNDS,
    WORKFLOW_TRIGGERS,
)

SECONDS = vol.All(vol.Coerce(int), vol.Range(min=0, max=MAX_DELAY))
ENTITY_LIST = [cv.entity_id]
STEP_SCHEMAS = {
    # Eigener Titel und Text der Alarmmeldung (0.19.0); fehlt eine Angabe, gilt der Standardtext. Platzhalter: {name} {sensor} {time} {mode}
    "notify": vol.Schema({
        vol.Required("type"): "notify",
        vol.Optional("title"): vol.All(str, vol.Length(max=100)),
        vol.Optional("message"): vol.All(str, vol.Length(max=300)),
        # Einstellungen der Alarmmeldung nur hier (0.20.0); fehlt eine Angabe, gilt der frühere globale Wert
        vol.Optional("critical"): bool,
        vol.Optional("volume"): vol.All(vol.Coerce(float), vol.Range(min=0, max=1)),
        vol.Optional("buttons"): {vol.Optional(vol.In(("open", "silence", "disarm"))): bool},
    }),
    "wait": vol.Schema({vol.Required("type"): "wait", vol.Required("seconds"): vol.All(vol.Coerce(int), vol.Range(min=0, max=MAX_DELAY))}),
    "action": vol.Schema({
        vol.Required("type"): "action",
        vol.Required("action"): cv.service,
        vol.Optional("target", default=[]): ENTITY_LIST,
        vol.Optional("data", default={}): dict,
        vol.Optional("restore", default=False): bool,
        # Nicht abwarten: der nächste Schritt startet sofort, dieser läuft nebenher (0.17.0)
        vol.Optional("detach"): bool,
    }),
    "sound": vol.Schema({
        vol.Required("type"): "sound",
        vol.Required("players"): vol.All(ENTITY_LIST, vol.Length(min=1)),
        vol.Required("sound"): vol.In(list(SOUNDS)),
        vol.Optional("volume"): vol.Any(None, vol.All(vol.Coerce(float), vol.Range(min=0, max=1))),
        vol.Optional("repeat", default=1): vol.All(vol.Coerce(int), vol.Range(min=1, max=50)),
        # Dauer in Sekunden (0 = bis zum Deaktivieren); ohne Angabe gilt die ältere Form mit Wiederholungen (0.18.0)
        vol.Optional("duration"): vol.All(vol.Coerce(int), vol.Range(min=0, max=MAX_DELAY)),
        vol.Optional("restore", default=True): bool,
        vol.Optional("detach"): bool,
    }),
}


def valid_step(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict) or value.get("type") not in STEP_SCHEMAS:
        raise vol.Invalid("unknown step type")
    return STEP_SCHEMAS[value["type"]](value)


def _days(value: Any) -> list[int]:
    days = vol.Schema([vol.All(vol.Coerce(int), vol.Range(min=0, max=6))])(value)
    if not days:
        raise vol.Invalid("at least one day")
    return sorted(set(days))


SCHEDULE_SCHEMA = vol.Schema(
    {
        vol.Required("id"): vol.All(str, vol.Length(min=1, max=32)),
        vol.Optional("enabled", default=True): bool,
        vol.Required("action"): vol.In(SCHEDULE_ACTIONS),
        vol.Required("time"): vol.All(str, vol.Match(r"^([01]\d|2[0-3]):[0-5]\d$")),
        vol.Required("days"): _days,
    }
)
SCHEDULES = vol.All([SCHEDULE_SCHEMA], vol.Length(max=MAX_SCHEDULES))


def _binary_sensors(value: Any) -> list[str]:
    ids = vol.Schema([cv.entity_id])(value)
    if any(not e.startswith("binary_sensor.") for e in ids):
        raise vol.Invalid("only binary sensors")
    return list(dict.fromkeys(ids))


# Optionen einer Anlage aus einer Sicherung. Codes gehören nie dazu (siehe backup.py).
SYSTEM_OPTIONS_SCHEMA = vol.Schema(
    {
        **{vol.Optional(f"{CONF_ZONE_PREFIX}{m}"): _binary_sensors for m in MODES},
        **{vol.Optional(f"{CONF_EXIT_DELAY_PREFIX}{m}"): SECONDS for m in MODES},
        vol.Optional(CONF_ENTRY_SENSORS): _binary_sensors,
        vol.Optional(CONF_SENSORS): _binary_sensors,
        vol.Optional(CONF_ENTRY_DELAY): SECONDS,
        vol.Optional(CONF_TRIGGER_TIME): SECONDS,
        # Einstellungen je Modus (0.10.0)
        **{vol.Optional(f"{CONF_ENTRY_DELAY}_{m}"): SECONDS for m in MODES},
        **{vol.Optional(f"{CONF_TRIGGER_TIME}_{m}"): SECONDS for m in (*MODES, SCOPE_ALWAYS)},
        **{vol.Optional(f"{CONF_OPEN_SENSORS}_{m}"): vol.In(OPEN_SENSOR_MODES) for m in MODES},
        **{vol.Optional(f"{CONF_CONFIRM_WINDOW}_{m}"): vol.All(vol.Coerce(int), vol.Range(min=5, max=MAX_CONFIRM_WINDOW)) for m in MODES},
        vol.Optional(CONF_NIGHT_ENABLED): bool,
        vol.Optional(CONF_HOME_ENABLED): bool,
        vol.Optional(CONF_AWAY_ENABLED): bool,
        vol.Optional(CONF_SCHEDULES): SCHEDULES,
        vol.Optional(CONF_OPEN_SENSORS): vol.In(OPEN_SENSOR_MODES),
        vol.Optional("code_arm_required"): bool,
        vol.Optional(CONF_CONFIRM_WINDOW): vol.All(vol.Coerce(int), vol.Range(min=5, max=MAX_CONFIRM_WINDOW)),
        vol.Optional(CONF_SENSOR_OPTIONS): {cv.entity_id: {vol.In(SENSOR_OPTIONS): bool}},
        vol.Optional(CONF_WORKFLOWS): {vol.In(WORKFLOW_TRIGGERS): vol.All([valid_step], vol.Length(max=MAX_STEPS))},
    },
    extra=vol.REMOVE_EXTRA,
)
