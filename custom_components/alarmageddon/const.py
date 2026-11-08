"""Konstanten von Alarmageddon."""

from __future__ import annotations

from typing import Final

DOMAIN: Final = "alarmageddon"

# Modi der Anlage. "night" ist pro Anlage zuschaltbar (Vorgabe des Nutzers), die beiden anderen immer da.
MODE_HOME: Final = "home"
MODE_AWAY: Final = "away"
MODE_NIGHT: Final = "night"
MODES: Final = (MODE_HOME, MODE_AWAY, MODE_NIGHT)

# Daten des Config Entry (beim Anlegen festgelegt)
CONF_NAME: Final = "name"

# Optionen (im Optionsdialog änderbar, später auch im Panel)
CONF_NIGHT_ENABLED: Final = "night_enabled"
CONF_ZONE_PREFIX: Final = "zone_"  # zone_home, zone_away, zone_night: Liste von Entitäten
CONF_ENTRY_SENSORS: Final = "entry_sensors"  # Sensoren mit Eingangsverzögerung, alle anderen lösen sofort aus
CONF_EXIT_DELAY_PREFIX: Final = "exit_delay_"  # exit_delay_home usw., Sekunden
CONF_ENTRY_DELAY: Final = "entry_delay"
CONF_TRIGGER_TIME: Final = "trigger_time"  # Dauer des Alarms in Sekunden, 0 = bis zum Deaktivieren
CONF_OPEN_SENSORS: Final = "open_sensors"  # Verhalten bei offenem Sensor beim Scharfschalten
CONF_CODE_ARM_REQUIRED: Final = "code_arm_required"
CONF_CODE_HASH: Final = "code_hash"
CONF_CODE_SALT: Final = "code_salt"

# Felder im Formular (nicht gespeichert, nur Eingabe)
FIELD_CODE: Final = "code"
FIELD_REMOVE_CODE: Final = "remove_code"

OPEN_BLOCK: Final = "block"
OPEN_BYPASS: Final = "bypass"
OPEN_SENSOR_MODES: Final = (OPEN_BLOCK, OPEN_BYPASS)

DEFAULT_EXIT_DELAY: Final = {MODE_HOME: 0, MODE_AWAY: 60, MODE_NIGHT: 0}
DEFAULT_ENTRY_DELAY: Final = 30
DEFAULT_TRIGGER_TIME: Final = 180
DEFAULT_OPEN_SENSORS: Final = OPEN_BLOCK
MAX_DELAY: Final = 3600

# Code: 4 bis 8 Ziffern wie bei üblichen Bedienteilen
CODE_PATTERN: Final = r"^\d{4,8}$"
CODE_HASH_ITERATIONS: Final = 120_000
# Schutz gegen Durchprobieren: nach so vielen falschen Codes ist die Eingabe gesperrt
CODE_MAX_ATTEMPTS: Final = 5
CODE_LOCKOUT_SECONDS: Final = 60

MANUFACTURER: Final = "Alarmageddon"

# Panel (eingebautes iframe-Panel, siehe LEARNINGS)
PANEL_VERSION: Final = 2  # Cache-Buster: bei jeder Änderung unter panel/ erhöhen
PANEL_URL_PATH: Final = "alarmageddon"
PANEL_STATIC_URL_PATH: Final = "/alarmageddon_panel"
PANEL_DIR: Final = "panel"
PANEL_HTML_FILE: Final = "panel.html"
PANEL_TITLE: Final = "Alarmageddon"
PANEL_ICON: Final = "mdi:shield-home"
DATA_PANEL: Final = f"{DOMAIN}_panel_registered"
DATA_STATIC: Final = f"{DOMAIN}_static_registered"

# Ereignisprotokoll pro Anlage (Übersicht "Letzte Ereignisse")
EVENTS_STORE_KEY: Final = f"{DOMAIN}.events"
EVENTS_KEEP: Final = 50

# Sensoren, die das Panel als Kandidaten für Zonen anbietet (Geräteklassen von binary_sensor)
SENSOR_CLASSES: Final = (
    "door", "window", "opening", "garage_door", "motion", "occupancy", "presence",
    "smoke", "gas", "moisture", "vibration", "tamper", "safety", "sound", "carbon_monoxide",
    "glass_break", "heat", "lock", "moving",  # glass_break neu seit HA 2026.10
)

# Optionen pro Sensor (0.3.0). Gespeichert nur als eigene Werte in den Optionen der Anlage (CONF_SENSOR_OPTIONS),
# sonst gilt die Voreinstellung der Sensorart (globale Einstellungen).
CONF_SENSOR_OPTIONS: Final = "sensor_options"
OPT_ALWAYS: Final = "always"  # löst auch unscharf aus (Rauch, Wasser, Gas)
OPT_OPEN_OK: Final = "open_ok"  # darf beim Scharfschalten offen sein
OPT_ARM_ON_CLOSE: Final = "arm_on_close"  # Schliessen während der Ausgangsverzögerung schaltet sofort scharf
OPT_OFFLINE_ALARM: Final = "offline_alarm"  # nicht erreichbar im scharfen Zustand löst aus
SENSOR_OPTIONS: Final = (OPT_ALWAYS, OPT_OPEN_OK, OPT_ARM_ON_CLOSE, OPT_OFFLINE_ALARM)
# Zeit nach dem Schliessen, bevor "scharf, sobald geschlossen" greift: eine zufallende Tür prellt (wie Alarmo: Kontakt-Prellen)
ARM_ON_CLOSE_SETTLE: Final = 3

# Sensorarten (aus der Geräteklasse) und ihre Voreinstellungen
TYPE_DOOR: Final = "door"
TYPE_WINDOW: Final = "window"
TYPE_MOTION: Final = "motion"
TYPE_ENVIRONMENT: Final = "environment"
TYPE_TAMPER: Final = "tamper"
TYPE_OTHER: Final = "other"
SENSOR_TYPES: Final = (TYPE_DOOR, TYPE_WINDOW, TYPE_MOTION, TYPE_ENVIRONMENT, TYPE_TAMPER, TYPE_OTHER)
DEVICE_CLASS_TYPE: Final = {
    "door": TYPE_DOOR, "garage_door": TYPE_DOOR, "opening": TYPE_DOOR, "lock": TYPE_DOOR,
    "window": TYPE_WINDOW,
    "motion": TYPE_MOTION, "occupancy": TYPE_MOTION, "presence": TYPE_MOTION, "moving": TYPE_MOTION,
    "smoke": TYPE_ENVIRONMENT, "gas": TYPE_ENVIRONMENT, "moisture": TYPE_ENVIRONMENT, "carbon_monoxide": TYPE_ENVIRONMENT,
    "heat": TYPE_ENVIRONMENT,
    "glass_break": TYPE_TAMPER, "vibration": TYPE_TAMPER, "tamper": TYPE_TAMPER, "sound": TYPE_TAMPER, "safety": TYPE_TAMPER,
}
# Vorschlag aus dem Mockup 0.3.0 (angelehnt an Alarmo; Eingangsverzögerung bewusst nie voreingestellt)
DEFAULT_PRESETS: Final = {
    TYPE_DOOR: [OPT_ARM_ON_CLOSE],
    TYPE_WINDOW: [],
    TYPE_MOTION: [OPT_OPEN_OK],
    TYPE_ENVIRONMENT: [OPT_ALWAYS],
    TYPE_TAMPER: [OPT_OFFLINE_ALARM],
    TYPE_OTHER: [],
}

# Globale Einstellungen (für alle Anlagen gleich)
SETTINGS_STORE_KEY: Final = f"{DOMAIN}.settings"
DATA_SETTINGS: Final = f"{DOMAIN}_settings"
