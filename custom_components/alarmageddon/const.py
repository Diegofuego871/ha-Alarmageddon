"""Konstanten von Alarmageddon."""

from __future__ import annotations

from typing import Final

DOMAIN: Final = "alarmageddon"

# Modi der Anlage. Seit 0.6.0 alle drei pro Anlage wählbar (Wunsch des Nutzers), mindestens einer; "night" standardmässig aus.
MODE_HOME: Final = "home"
MODE_AWAY: Final = "away"
MODE_NIGHT: Final = "night"
MODES: Final = (MODE_HOME, MODE_AWAY, MODE_NIGHT)

# Daten des Config Entry (beim Anlegen festgelegt)
CONF_NAME: Final = "name"

# Optionen (im Optionsdialog änderbar, später auch im Panel)
CONF_NIGHT_ENABLED: Final = "night_enabled"
CONF_HOME_ENABLED: Final = "home_enabled"
CONF_AWAY_ENABLED: Final = "away_enabled"
CONF_ZONE_PREFIX: Final = "zone_"  # zone_home, zone_away, zone_night: Liste von Entitäten
CONF_ENTRY_SENSORS: Final = "entry_sensors"  # Sensoren mit Eingangsverzögerung, alle anderen lösen sofort aus
CONF_EXIT_DELAY_PREFIX: Final = "exit_delay_"  # exit_delay_home usw., Sekunden
CONF_ENTRY_DELAY: Final = "entry_delay"
CONF_TRIGGER_TIME: Final = "trigger_time"  # Dauer des Alarms in Sekunden, 0 = bis zum Deaktivieren
CONF_OPEN_SENSORS: Final = "open_sensors"  # Verhalten bei offenem Sensor beim Scharfschalten
CONF_CODE_ARM_REQUIRED: Final = "code_arm_required"
CONF_CODE_HASH: Final = "code_hash"
CONF_CODE_SALT: Final = "code_salt"
# Weitere Codes, je einer Person zugeordnet (0.5.0): [{"id", "name", "user_id", "hash", "salt"}].
# Der Hauptcode (code_hash/code_salt aus dem Optionsdialog) gilt weiter, ohne Namen.
CONF_CODES: Final = "codes"
MAX_CODES: Final = 20

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
PANEL_VERSION: Final = 5  # Cache-Buster: bei jeder Änderung unter panel/ erhöhen
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
# Löst im scharfen Zustand erst aus, wenn ein zweiter Sensor innerhalb des Zeitfensters anspricht (gegen Fehlalarm
# durch Haustiere, Sonnenlicht). Nie voreingestellt: im Zweifel alarmieren (0.5.0)
OPT_CONFIRM: Final = "confirm"
SENSOR_OPTIONS: Final = (OPT_ALWAYS, OPT_OPEN_OK, OPT_ARM_ON_CLOSE, OPT_OFFLINE_ALARM, OPT_CONFIRM)
CONF_CONFIRM_WINDOW: Final = "confirm_window"
DEFAULT_CONFIRM_WINDOW: Final = 60
MAX_CONFIRM_WINDOW: Final = 600
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

# Benachrichtigungen (0.4.0, global). Empfänger als Dienste "notify.<name>", getrennt für Alarm und Wartung.
DEFAULT_NOTIFY: Final = {
    "alarm_targets": [],
    "maintenance_targets": [],
    "critical": True,
    "volume": 0.8,  # Lautstärke der kritischen Meldung (iOS), 0 bis 1
    "events": {"triggered": True, "pending": False, "armed": False, "disarmed": False, "arm_failed": True, "sensor_offline": True,
               "battery_low": True, "sensor_unavailable": True},
    # Wartung (0.5.0): Batterie schwach unter dieser Schwelle (%), nicht erreichbar ab so vielen Minuten
    "battery_threshold": 20,
    "offline_minutes": 60,
    # Aktion "Deaktivieren" in der Push-Meldung: standardmässig aus (Sicherheitsregel, wer das Handy hat, kann entschärfen)
    "disarm_action": False,
}
NOTIFY_EVENTS: Final = ("triggered", "pending", "armed", "disarmed", "arm_failed", "sensor_offline", "battery_low", "sensor_unavailable")
BATTERY_THRESHOLD_RANGE: Final = (5, 50)
OFFLINE_MINUTES_RANGE: Final = (5, 1440)
# Wartung: Prüfung alle 15 Minuten, die erste 5 Minuten nach dem Start (Geräte verbinden sich erst)
MAINTENANCE_STORE_KEY: Final = f"{DOMAIN}.maintenance"
DATA_MAINTENANCE: Final = f"{DOMAIN}_maintenance"
MAINTENANCE_INTERVAL: Final = 15 * 60
MAINTENANCE_START_DELAY: Final = 5 * 60
# Erst wieder melden, wenn die Batterie so viele Prozentpunkte über der Schwelle war (gewechselt)
BATTERY_HYSTERESIS: Final = 5
PUSH_ACTION_DISARM: Final = "ALARMAGEDDON_DISARM_"  # + entry_id
PUSH_ACTION_OPEN: Final = "ALARMAGEDDON_OPEN"

# Aktionen als Ablauf (0.4.0): pro Anlage und Auslöser eine Liste von Schritten (CONF_WORKFLOWS[auslöser])
CONF_WORKFLOWS: Final = "workflows"
WORKFLOW_ALWAYS: Final = "always"  # Alarm durch einen "immer aktiven" Sensor bei deaktivierter Anlage
WORKFLOW_TRIGGERS: Final = ("home", "away", "night", WORKFLOW_ALWAYS)
STEP_TYPES: Final = ("notify", "action", "wait", "sound")
WORKFLOW_STORE_KEY: Final = f"{DOMAIN}.workflow"
TEST_SECONDS: Final = 60  # ein Test endet spätestens nach so vielen Sekunden von selbst
MAX_STEPS: Final = 40
# Mitgelieferte Töne: Name und Länge in Sekunden (scripts/make_sounds.py)
SOUNDS: Final = {"siren": 4.0, "beep": 3.0, "klaxon": 3.0, "warning": 2.0, "chime": 2.0}
SOUNDS_URL_PATH: Final = "/alarmageddon_sounds"
DATA_SOUNDS: Final = f"{DOMAIN}_sounds_registered"
# Domänen, deren Zustand vor dem Alarm gespeichert und beim Deaktivieren wiederhergestellt werden kann
RESTORABLE_DOMAINS: Final = ("switch", "light", "input_boolean", "fan", "siren", "cover", "media_player")

# Modus an/aus: Schlüssel in den Optionen und Grundeinstellung (fehlt der Schlüssel, gilt sie)
MODE_ENABLED_KEY: Final = {"home": CONF_HOME_ENABLED, "away": CONF_AWAY_ENABLED, "night": CONF_NIGHT_ENABLED}
MODE_ENABLED_DEFAULT: Final = {"home": True, "away": True, "night": False}

# Zeitplan (0.6.0): pro Anlage Regeln {"id", "enabled", "action", "time" "HH:MM", "days" [0 = Montag … 6]}
CONF_SCHEDULES: Final = "schedules"
SCHEDULE_OFF: Final = "off"
SCHEDULE_ACTIONS: Final = (SCHEDULE_OFF, "home", "away", "night")
MAX_SCHEDULES: Final = 20
