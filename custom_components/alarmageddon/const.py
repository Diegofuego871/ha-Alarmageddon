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
# "Immer aktiv" als Ganzes ein- oder ausschalten (1.6.0); Standard an. Aus: kein Sensor ist immer aktiv, Werte und Aktionen bleiben erhalten
CONF_ALWAYS_ENABLED: Final = "always_enabled"
CONF_AWAY_ENABLED: Final = "away_enabled"
CONF_ZONE_PREFIX: Final = "zone_"  # zone_home, zone_away, zone_night: Liste von Entitäten
CONF_SENSORS: Final = "sensors"  # vom Nutzer für diese Anlage ausgewählte Sensoren (Liste im Panel); Zonen und eigene Werte zählen immer dazu
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
PANEL_VERSION: Final = 85  # Cache-Buster: bei jeder Änderung unter panel/ erhöhen
PANEL_URL_PATH: Final = "alarmageddon"
PANEL_STATIC_URL_PATH: Final = "/alarmageddon_panel"
PANEL_DIR: Final = "panel"
PANEL_HTML_FILE: Final = "panel.html"
PANEL_TITLE: Final = "Alarmageddon"
PANEL_ICON: Final = "mdi:shield-home"
DATA_PANEL: Final = f"{DOMAIN}_panel_registered"
DATA_PANEL_LOCK: Final = "alarmageddon_panel_lock"
DATA_STATIC: Final = f"{DOMAIN}_static_registered"

# Ereignisprotokoll pro Anlage (Übersicht "Letzte Ereignisse")
EVENTS_STORE_KEY: Final = f"{DOMAIN}.events"
EVENTS_KEEP: Final = 1000  # Einträge je Anlage (Protokoll mit Zeitraum und Export)
RECORDINGS_STORE_KEY: Final = f"{DOMAIN}.recordings"
RECORDINGS_KEEP: Final = 30  # Alarme je Anlage
RECORDINGS_ENTRIES_KEEP: Final = 300  # Einträge je Alarm

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
# Umgehen (0.32.0, ersetzt die globale Wahl "Offener Sensor beim Scharfschalten"): ist der Sensor beim Scharfschalten offen und darf nicht
# offen sein, wird er bis zum Deaktivieren übergangen, statt das Scharfschalten zu verhindern. Nie voreingestellt.
OPT_BYPASS: Final = "bypass"
# Einstellungen pro Sensor je Modus (0.32.0): Schalter CONF_PER_MODE_SENSORS; dann gelten CONF_SENSOR_MODES[modus][sensor][option] vor den
# Werten für alle Modi (CONF_SENSOR_OPTIONS) und der Voreinstellung der Sensorart.
# Zeiten und Verhalten der Anlage je Modus (0.34.0): Schalter nur für die Anzeige im Panel (aus: ein Satz Werte für alle Modi, ein: je Modus);
# die Engine liest die Werte je Modus wie bisher
CONF_PER_MODE_SETTINGS: Final = "per_mode_settings"
CONF_PER_MODE_SENSORS: Final = "per_mode_sensors"
CONF_SENSOR_MODES: Final = "sensor_modes"
OPT_ARM_ON_CLOSE: Final = "arm_on_close"  # Schliessen während der Ausgangsverzögerung schaltet sofort scharf
OPT_OFFLINE_ALARM: Final = "offline_alarm"  # nicht erreichbar im scharfen Zustand löst aus
# Löst im scharfen Zustand erst aus, wenn ein zweiter Sensor innerhalb des Zeitfensters anspricht (gegen Fehlalarm
# durch Haustiere, Sonnenlicht). Nie voreingestellt: im Zweifel alarmieren (0.5.0)
OPT_CONFIRM: Final = "confirm"
# Stiller Alarm (0.9.0, früher "Nur melden"): Spricht der Sensor an, gibt es eine Meldung (Art "Stiller Alarm", standardmässig kritisch), aber nie einen Alarm.
# Für Sensoren, die oft ohne Einbruch ansprechen (Haustier, Sonnenlicht, Batterie zur Neige). Nie voreingestellt.
OPT_REPORT_ONLY: Final = "report_only"
REPORT_THROTTLE: Final = 60  # höchstens eine Meldung pro Sensor und Minute
# Eigene Eingangsverzögerung eines Sensors in Sekunden (1.1.0): ein Wert, kein Schalter, darum nicht in SENSOR_OPTIONS.
# Fehlt er, gilt die Eingangsverzögerung der Anlage für den Modus.
OPT_ENTRY_DELAY: Final = "entry_delay"
# "Scharf in <Modus>: nur <Modus> zählt" (1.4.0 als "Immer aktiv ignorieren", Standard aus; seit 1.7.0 Standard an): ein Schalter,
# aber keine Voreinstellung der Sensorart, darum nicht in SENSOR_OPTIONS. Wirkt nur in Modi, in deren Zone ein immer aktiver Sensor
# steht. An: dort gelten allein Regel und Aktionen des Modus. Aus: "Immer aktiv" gilt zusätzlich (sofort Alarm, beide Abläufe).
OPT_ALWAYS_OFF: Final = "always_off"
SENSOR_OPTIONS: Final = (OPT_ALWAYS, OPT_OPEN_OK, OPT_BYPASS, OPT_ARM_ON_CLOSE, OPT_OFFLINE_ALARM, OPT_CONFIRM, OPT_REPORT_ONLY)
CONF_CONFIRM_WINDOW: Final = "confirm_window"
# Einstellungen je Modus (0.10.0): Schlüssel "<name>_<modus>" (entry_delay_away …), "always" für Alarme durch immer aktive Sensoren
# bei deaktivierter Anlage (nur Alarmdauer). Fehlt der Wert, gilt der alte gemeinsame Schlüssel ohne Modus, dann die Grundeinstellung.
SCOPE_ALWAYS: Final = "always"
PER_MODE_FIELDS: Final = ("entry_delay", "confirm_window")
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
DATA_SETTINGS_LOCK: Final = f"{DOMAIN}_settings_lock"

# Benachrichtigungen (global). Empfänger als Dienste "notify.<name>", getrennt für Alarm und Wartung. Seit 0.9.0 je Meldungsart:
# an/aus, kritisch ja/nein, Lautstärke (iOS). Die Art gehört zu einer Gruppe, deren Empfänger sie bekommt.
NOTIFY_TYPES: Final = {
    "triggered": "alarm", "pending": "alarm", "armed": "alarm", "disarmed": "alarm", "arm_failed": "alarm",
    "sensor_offline": "alarm", "sensor_report": "alarm",
    "battery_low": "maintenance", "sensor_unavailable": "maintenance",
}
# Standard je Art: (an, kritisch). Im Zweifel melden: Alarm und Ausfall eines Sensors im scharfen Zustand sind kritisch.
NOTIFY_TYPE_DEFAULTS: Final = {
    "triggered": (True, True), "pending": (False, False), "armed": (False, False), "disarmed": (False, False),
    "arm_failed": (True, False), "sensor_offline": (True, True), "sensor_report": (True, True),
    "battery_low": (True, False), "sensor_unavailable": (True, False),
}
# Meldungsarten, die nur im scharfen Zustand vorkommen und je Modus eigene Werte haben können (0.29.0): Stiller Alarm, Eingangsverzögerung,
# Scharf geschaltet, Sensorausfall im scharfen Zustand. notify["modes"][modus][art] = {enabled, critical, volume}, nur abweichende Werte.
NOTIFY_MODE_KINDS: Final = ("sensor_report", "pending", "armed", "sensor_offline")
DEFAULT_NOTIFY: Final = {
    # Schalter "Einstellungen pro Modus" (0.34.0): nur wenn er an ist, gelten die eigenen Werte je Modus
    "per_mode": False,
    "modes": {},
    "alarm_targets": [],
    "maintenance_targets": [],
    # "targets" je Art (1.5.0): eigene Empfänger statt der Gruppe oben (Alarm oder Wartung); leer = die Gruppe gilt
    "types": {key: {"enabled": on, "critical": critical, "volume": 0.8, "persistent": False, "targets": []} for key, (on, critical) in NOTIFY_TYPE_DEFAULTS.items()},
    # Aktion "Deaktivieren" in der Push-Meldung: standardmässig aus (Sicherheitsregel, wer das Handy hat, kann entschärfen)
    "disarm_action": False,
    # Weitere Knöpfe der Alarmmeldung (0.16.0): "Öffnen" (Panel) standardmässig an, "Sirene stumm" aus
    "open_action": True,
    "silence_action": False,
    # "Alarm quittieren" (1.2.0): beendet den Alarm, die Anlage bleibt scharf. Standardmässig an: es schaltet nichts ab
    # (anders als "Deaktivieren"), ein neuer Auslöser alarmiert wieder
    "acknowledge_action": True,
    # Wartung (0.5.0): Batterie schwach unter dieser Schwelle (%), nicht erreichbar ab so vielen Minuten
    "battery_threshold": 20,
    "offline_minutes": 60,
}
NOTIFY_EVENTS: Final = tuple(NOTIFY_TYPES)
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
PUSH_ACTION_SILENCE: Final = "ALARMAGEDDON_SILENCE_"  # + entry_id
PUSH_ACTION_ACK: Final = "ALARMAGEDDON_ACK_"  # + entry_id (Alarm quittieren, 1.1.0)

# Aktionen als Ablauf (0.4.0): pro Anlage und Auslöser eine Liste von Schritten (CONF_WORKFLOWS[auslöser])
CONF_WORKFLOWS: Final = "workflows"
# Element "Alarm endet" (0.27.0): optionale eigene Meldung beim Deaktivieren/Quittieren, je Auslöser: CONF_WORKFLOW_END[auslöser] = {"notify": {...}}
# Ob Geräte zurückgesetzt werden, entscheidet allein die Einstellung "Rückgängig" im jeweiligen Schritt.
CONF_WORKFLOW_END: Final = "workflow_end"
WORKFLOW_ALWAYS: Final = "always"  # Alarm durch einen "immer aktiven" Sensor bei deaktivierter Anlage
WORKFLOW_TRIGGERS: Final = ("home", "away", "night", WORKFLOW_ALWAYS)
STEP_TYPES: Final = ("notify", "action", "wait", "sound")
WORKFLOW_STORE_KEY: Final = f"{DOMAIN}.workflow"
BACKUPS_STORE_KEY: Final = f"{DOMAIN}.backups"
MAX_BACKUPS: Final = 10  # Sicherungen in der Integration; die älteste fällt weg
TEST_SECONDS: Final = 60  # ein Test endet spätestens nach so vielen Sekunden von selbst
MAX_STEPS: Final = 40
# Mitgelieferte Töne: Name und Länge in Sekunden (scripts/make_sounds.py)
SOUNDS: Final = {"siren": 4.0, "beep": 3.0, "klaxon": 3.0, "warning": 2.0, "chime": 2.0}
SOUNDS_URL_PATH: Final = "/alarmageddon_sounds"
DATA_SOUNDS: Final = f"{DOMAIN}_sounds_registered"
# Symbol der Integration für Meldungen (Android zeigt es als Symbol der Meldung, iOS kennt das nicht); ohne Anmeldung abrufbar
ICON_URL_PATH: Final = "/alarmageddon_icon.png"
DATA_ICON: Final = f"{DOMAIN}_icon_registered"
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

