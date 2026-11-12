"""Prüfung von Werten aus dem Panel und aus einer Sicherung (dieselben Regeln an beiden Stellen)."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.helpers import config_validation as cv

from .const import (
    CONF_AWAY_ENABLED,
    CONF_CONFIRM_WINDOW,
    CONF_ALWAYS_ENABLED,
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
    CONF_PER_MODE_SENSORS,
    CONF_PER_MODE_SETTINGS,
    CONF_SENSOR_MODES,
    CONF_SENSOR_OPTIONS,
    CONF_TRIGGER_TIME,
    AFTER_STEP_TYPES,
    ALL_SOUNDS,
    ARMED_STEP_TYPES,
    ARMING_STEP_TYPES,
    CHIME_MAX_SECONDS,
    CONF_WORKFLOWS_ARMED,
    CONF_WORKFLOWS_ARMING,
    CONF_WORKFLOWS_ENTRY,
    ENTRY_STEP_TYPES,
    CONF_WORKFLOW_END,
    CONF_WORKFLOWS_AFTER,
    CONF_WORKFLOWS,
    CONF_ZONE_PREFIX,
    MAX_CONFIRM_WINDOW,
    MAX_DELAY,
    MAX_STEPS,
    MODES,
    OPT_ALWAYS_OFF,
    OPT_ENTRY_DELAY,
    OPEN_SENSOR_MODES,
    SCOPE_ALWAYS,
    SENSOR_OPTIONS,
    PREALARM_MAX_SECONDS,
    WORKFLOW_TRIGGERS,
)

SECONDS = vol.All(vol.Coerce(int), vol.Range(min=0, max=MAX_DELAY))
ENTITY_LIST = [cv.entity_id]
# Werte eines Sensors: die Schalter (SENSOR_OPTIONS) und die eigene Eingangsverzögerung in Sekunden
SENSOR_VALUES = vol.Schema({vol.Optional(vol.In(SENSOR_OPTIONS)): bool, vol.Optional(OPT_ALWAYS_OFF): bool, vol.Optional(OPT_ENTRY_DELAY): vol.All(vol.Coerce(int), vol.Range(min=0, max=MAX_DELAY))})
# Eigene Empfänger einer Meldung (statt der Alarm-Empfänger aus der Konfiguration): nur notify-Dienste, höchstens 20
NOTIFY_TARGETS = vol.All([vol.All(str, vol.Match(r"^notify\.[a-z0-9_]+$"))], vol.Length(max=20))
# Lautstärke je Medienplayer (1.16.0): eigene Werte für einzelne Lautsprecher; wer hier fehlt, bekommt "volume" des Schritts
PLAYER_VOLUMES = {vol.All(str, vol.Match(r"^media_player\.[a-z0-9_]+$")): vol.All(vol.Coerce(float), vol.Range(min=0, max=1))}

STEP_SCHEMAS = {
    # Eigener Titel und Text der Alarmmeldung (0.19.0); fehlt eine Angabe, gilt der Standardtext. Platzhalter: {name} {sensor} {time} {mode}
    "notify": vol.Schema({
        vol.Required("type"): "notify",
        vol.Optional("title"): vol.All(str, vol.Length(max=100)),
        vol.Optional("message"): vol.All(str, vol.Length(max=300)),
        # Einstellungen der Alarmmeldung nur hier (0.20.0); fehlt eine Angabe, gilt der frühere globale Wert
        vol.Optional("critical"): bool,
        vol.Optional("volume"): vol.All(vol.Coerce(float), vol.Range(min=0, max=1)),
        vol.Optional("buttons"): {vol.Optional(vol.In(("open", "silence", "acknowledge", "disarm"))): bool},
        # Klickziel der Meldung (0.23.0): "log" (Standard, Protokoll mit dem laufenden Alarm), "overview" oder "custom" mit eigenem Pfad
        vol.Optional("click"): vol.In(("log", "overview", "custom")),
        vol.Optional("click_path"): vol.All(str, vol.Length(max=200), vol.Match(r"^/[^\s]*$")),
        # Eigene Empfänger nur für diesen Schritt (1.1.0); fehlt die Angabe oder ist sie leer, gelten die Alarm-Empfänger der Konfiguration
        vol.Optional("targets"): NOTIFY_TARGETS,
    }),
    # Alarm quittieren (1.1.0): beendet den Alarm, die Anlage bleibt scharf
    "acknowledge": vol.Schema({vol.Required("type"): "acknowledge"}),
    "wait": vol.Schema({vol.Required("type"): "wait", vol.Required("seconds"): vol.All(vol.Coerce(int), vol.Range(min=0, max=MAX_DELAY))}),
    "action": vol.Schema({
        vol.Required("type"): "action",
        vol.Required("action"): cv.service,
        vol.Optional("target", default=[]): ENTITY_LIST,
        vol.Optional("data", default={}): dict,
        vol.Optional("restore", default=False): bool,
        # Auf das Ende warten (1.10.0): Schritte laufen standardmässig weiter, der nächste startet sofort; mit "wait" startet er
        # erst, wenn dieser fertig ist. "detach" ist die ältere Angabe (0.17.0, bis 1.9.0: ohne sie wurde gewartet); beide werden
        # gelesen (workflow.step_waits), das Panel schreibt nur noch "wait".
        vol.Optional("wait"): bool,
        vol.Optional("detach"): bool,
    }),
    "sound": vol.Schema({
        vol.Required("type"): "sound",
        vol.Required("players"): vol.All(ENTITY_LIST, vol.Length(min=1)),
        # Alarmtöne; Gong und Warnung (bis 1.14.0 hier wählbar, jetzt Töne des Voralarms) bleiben in gespeicherten Abläufen gültig
        vol.Required("sound"): vol.In(list(ALL_SOUNDS)),
        vol.Optional("volume"): vol.Any(None, vol.All(vol.Coerce(float), vol.Range(min=0, max=1))),
        vol.Optional("volumes"): PLAYER_VOLUMES,
        vol.Optional("repeat", default=1): vol.All(vol.Coerce(int), vol.Range(min=1, max=50)),
        # Dauer in Sekunden (0 = bis zum Deaktivieren); ohne Angabe gilt die ältere Form mit Wiederholungen (0.18.0)
        vol.Optional("duration"): vol.All(vol.Coerce(int), vol.Range(min=0, max=MAX_DELAY)),
        vol.Optional("restore", default=True): bool,
        vol.Optional("wait"): bool,
        vol.Optional("detach"): bool,
    }),
    # Aktivierungston (1.14.0): kurzer Ton auf Lautsprechern, mit Dauer in Sekunden (nie endlos), ohne Zurückstellen
    "chime": vol.Schema({
        vol.Required("type"): "chime",
        vol.Required("players"): vol.All(ENTITY_LIST, vol.Length(min=1)),
        # Eigene Töne (CHIMES, 1.15.0); ältere Wahl bleibt gültig (1.14.0 bot hier die Alarmtöne an). Das Panel bietet je Schritt nur
        # die eigenen Töne an; der Server prüft, dass es den Ton gibt.
        vol.Optional("sound", default="tone_pip"): vol.In(list(ALL_SOUNDS)),
        vol.Optional("volume"): vol.Any(None, vol.All(vol.Coerce(float), vol.Range(min=0, max=1))),
        vol.Optional("volumes"): PLAYER_VOLUMES,
        vol.Optional("duration", default=3): vol.All(vol.Coerce(int), vol.Range(min=1, max=CHIME_MAX_SECONDS)),
        # Lautsprecher nach dem Ton wieder so stellen, wie sie vorher waren (1.26.0, Standard an)
        vol.Optional("restore", default=True): bool,
        # So lange wie die laufende Verzögerung (1.18.0); nur in den Listen der Verzögerungen, sonst entfällt die Angabe (valid_step)
        vol.Optional("delay"): bool,
        vol.Optional("wait"): bool,
    }),
    # Voralarm (1.15.0): leiser Warnton vor der Sirene, mit Dauer; der Ablauf wartet standardmässig auf sein Ende
    "prealarm": vol.Schema({
        vol.Required("type"): "prealarm",
        vol.Required("players"): vol.All(ENTITY_LIST, vol.Length(min=1)),
        vol.Optional("sound", default="pre_beep"): vol.In(list(ALL_SOUNDS)),
        vol.Optional("volume"): vol.Any(None, vol.All(vol.Coerce(float), vol.Range(min=0, max=1))),
        vol.Optional("volumes"): PLAYER_VOLUMES,
        vol.Optional("duration", default=20): vol.All(vol.Coerce(int), vol.Range(min=1, max=PREALARM_MAX_SECONDS)),
        vol.Optional("restore", default=True): bool,
        vol.Optional("delay"): bool,
        vol.Optional("wait"): bool,
    }),
}


# Element "Alarm endet" (0.27.0): was Deaktivieren/Quittieren mit den Geräten macht und eine optionale eigene Meldung dazu
END_NOTIFY_SCHEMA = vol.Schema({
    vol.Optional("enabled", default=False): bool,
    vol.Optional("title"): vol.All(str, vol.Length(max=100)),
    vol.Optional("message"): vol.All(str, vol.Length(max=300)),
    vol.Optional("critical"): vol.Any(None, bool),
    vol.Optional("volume"): vol.Any(None, vol.All(vol.Coerce(float), vol.Range(min=0, max=1))),
    vol.Optional("click"): vol.In(("log", "overview", "custom")),
    vol.Optional("click_path"): vol.Any("", vol.All(str, vol.Length(max=200), vol.Match(r"^/[^\s]*$"))),
    vol.Optional("targets"): NOTIFY_TARGETS,
})
END_SCHEMA = vol.Schema({vol.Optional("notify"): END_NOTIFY_SCHEMA}, extra=vol.REMOVE_EXTRA)


def valid_end(value: Any) -> dict[str, Any]:
    """Ein Wert für "Alarm endet": die eigene Meldung. Frühere Angaben zur Wahl beim Deaktivieren (undo, Kurzform) fallen weg."""
    if not isinstance(value, dict):
        return {}
    return END_SCHEMA(value)


def valid_step(value: Any, delay: bool = False) -> dict[str, Any]:
    """Ein Schritt. `delay`: Liste einer Verzögerung; nur dort bleibt die Angabe "so lange wie die Verzögerung" erhalten."""
    if not isinstance(value, dict) or value.get("type") not in STEP_SCHEMAS:
        raise vol.Invalid("unknown step type")
    step = STEP_SCHEMAS[value["type"]](value)
    if not (delay and step.get("delay")):
        step.pop("delay", None)
    if "volumes" in step:
        # Nur für Lautsprecher dieses Schritts; ein leerer Eintrag entfällt
        step["volumes"] = {player: level for player, level in step["volumes"].items() if player in step.get("players", [])}
        if not step["volumes"]:
            del step["volumes"]
    return step


def valid_after_step(value: Any) -> dict[str, Any]:
    """
    Schritt der Aktionen nach dem Quittieren: nur Gerät, Ton und Warten. Ein Ton braucht dort eine Dauer (nach dem Alarm
    deaktiviert niemand mehr, ein Ton "bis zum Deaktivieren" liefe endlos), und "Rückgängig" gibt es nicht (danach folgt nichts).
    """
    step = valid_step(value)
    if step["type"] not in AFTER_STEP_TYPES:
        raise vol.Invalid("this step is not possible after the alarm")
    if step["type"] == "sound" and step.get("duration") in (0, None):
        raise vol.Invalid("a sound after the alarm needs a duration")
    if step["type"] == "action":
        step["restore"] = False
    return step


def valid_armed_step(value: Any) -> dict[str, Any]:
    """Schritt der Aktionen beim Scharfschalten: Gerät, Aktivierungston und Warten; "Rückgängig" gibt es dort nicht."""
    step = valid_step(value)
    if step["type"] not in ARMED_STEP_TYPES:
        raise vol.Invalid("this step is not possible when arming")
    if step["type"] == "action":
        step["restore"] = False
    return step


def _valid_delay_step(value: Any, types: tuple[str, ...]) -> dict[str, Any]:
    step = valid_step(value, delay=True)
    if step["type"] not in types:
        raise vol.Invalid("this step is not possible during a delay")
    if step["type"] == "action":
        step["restore"] = False
    return step


def valid_arming_step(value: Any) -> dict[str, Any]:
    """Schritt während der Ausgangsverzögerung: Gerät, Aktivierungston und Warten; "Rückgängig" gibt es dort nicht."""
    return _valid_delay_step(value, ARMING_STEP_TYPES)


def valid_entry_step(value: Any) -> dict[str, Any]:
    """Schritt während der Eingangsverzögerung: Gerät, Aktivierungston, Voralarm und Warten; "Rückgängig" gibt es dort nicht."""
    return _valid_delay_step(value, ENTRY_STEP_TYPES)


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
        vol.Optional(CONF_ALWAYS_ENABLED): bool,
        vol.Optional(CONF_HOME_ENABLED): bool,
        vol.Optional(CONF_AWAY_ENABLED): bool,
        vol.Optional(CONF_SCHEDULES): SCHEDULES,
        vol.Optional(CONF_OPEN_SENSORS): vol.In(OPEN_SENSOR_MODES),
        vol.Optional("code_arm_required"): bool,
        vol.Optional(CONF_CONFIRM_WINDOW): vol.All(vol.Coerce(int), vol.Range(min=5, max=MAX_CONFIRM_WINDOW)),
        vol.Optional(CONF_SENSOR_OPTIONS): {cv.entity_id: SENSOR_VALUES},
        vol.Optional(CONF_PER_MODE_SENSORS): bool,
        vol.Optional(CONF_PER_MODE_SETTINGS): bool,
        vol.Optional(CONF_SENSOR_MODES): {vol.In([*MODES, SCOPE_ALWAYS]): {cv.entity_id: SENSOR_VALUES}},
        vol.Optional(CONF_WORKFLOWS): {vol.In(WORKFLOW_TRIGGERS): vol.All([valid_step], vol.Length(max=MAX_STEPS))},
        vol.Optional(CONF_WORKFLOW_END): {vol.In(WORKFLOW_TRIGGERS): valid_end},
        vol.Optional(CONF_WORKFLOWS_AFTER): {vol.In(WORKFLOW_TRIGGERS): vol.All([valid_after_step], vol.Length(max=MAX_STEPS))},
        vol.Optional(CONF_WORKFLOWS_ARMED): {vol.In(MODES): vol.All([valid_armed_step], vol.Length(max=MAX_STEPS))},
        vol.Optional(CONF_WORKFLOWS_ARMING): {vol.In(MODES): vol.All([valid_arming_step], vol.Length(max=MAX_STEPS))},
        vol.Optional(CONF_WORKFLOWS_ENTRY): {vol.In(MODES): vol.All([valid_entry_step], vol.Length(max=MAX_STEPS))},
    },
    extra=vol.REMOVE_EXTRA,
)
