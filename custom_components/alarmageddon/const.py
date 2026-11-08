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
