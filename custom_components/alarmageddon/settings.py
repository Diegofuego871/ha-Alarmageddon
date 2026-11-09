"""
Globale Einstellungen, für alle Anlagen gleich: Voreinstellungen je Sensorart
(0.3.0), später auch Benachrichtigungen. Eine Ablage pro HA, nicht pro Anlage.
"""

from __future__ import annotations

from collections.abc import Callable
import copy
from typing import Any

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.storage import Store

from .const import (
    DATA_SETTINGS,
    BATTERY_THRESHOLD_RANGE,
    DEFAULT_NOTIFY,
    OFFLINE_MINUTES_RANGE,
    NOTIFY_TYPES,
    DEFAULT_PRESETS,
    DEVICE_CLASS_TYPE,
    MODES,
    NOTIFY_MODE_KINDS,
    SENSOR_OPTIONS,
    SENSOR_TYPES,
    SETTINGS_STORE_KEY,
    TYPE_OTHER,
)


def sensor_type(hass: HomeAssistant, entity_id: str) -> str:
    """Sensorart aus der Geräteklasse (Registry vor Zustand, wie HA selbst)."""
    reg = er.async_get(hass).async_get(entity_id)
    device_class = (reg.device_class or reg.original_device_class) if reg else None
    if not device_class and (state := hass.states.get(entity_id)):
        device_class = state.attributes.get("device_class")
    return DEVICE_CLASS_TYPE.get(device_class or "", TYPE_OTHER)


def valid_presets(value: Any) -> dict[str, list[str]]:
    """Nur bekannte Sensorarten und Optionen; fehlende Arten mit der Grundeinstellung."""
    out = copy.deepcopy(DEFAULT_PRESETS)
    if isinstance(value, dict):
        for kind in SENSOR_TYPES:
            if isinstance(value.get(kind), list):
                out[kind] = [o for o in SENSOR_OPTIONS if o in value[kind]]
    return out


def valid_notify(value: Any) -> dict[str, Any]:
    """
    Nur bekannte Schlüssel mit gültigen Werten; fehlende mit der Grundeinstellung. Alte Form (bis 0.8.0: "events", dazu ein
    gemeinsames "critical" und "volume") wird je Meldungsart übernommen: an/aus aus "events", kritisch und Lautstärke für die
    Arten, die damals kritisch sein konnten (Alarm, Sensorausfall im scharfen Zustand).
    """
    out = copy.deepcopy(DEFAULT_NOTIFY)
    if not isinstance(value, dict):
        return out
    for key in ("alarm_targets", "maintenance_targets"):
        if isinstance(value.get(key), list):
            out[key] = [t for t in dict.fromkeys(value[key]) if isinstance(t, str) and t.startswith("notify.")]
    for key in ("disarm_action", "open_action", "silence_action"):
        if isinstance(value.get(key), bool):
            out[key] = value[key]
    for key, (low, high) in (("battery_threshold", BATTERY_THRESHOLD_RANGE), ("offline_minutes", OFFLINE_MINUTES_RANGE)):
        if isinstance(value.get(key), (int, float)) and not isinstance(value.get(key), bool):
            out[key] = max(low, min(high, int(value[key])))
    # Alte Form zuerst, die neue überschreibt sie
    old = value.get("events")
    if isinstance(old, dict):
        for kind in NOTIFY_TYPES:
            if isinstance(old.get(kind), bool):
                out["types"][kind]["enabled"] = old[kind]
        if isinstance(value.get("critical"), bool):
            for kind in ("triggered", "sensor_offline"):
                out["types"][kind]["critical"] = value["critical"]
        if isinstance(value.get("volume"), (int, float)) and not isinstance(value.get("volume"), bool):
            for kind in out["types"]:
                out["types"][kind]["volume"] = max(0.0, min(1.0, float(value["volume"])))
    types = value.get("types")
    if isinstance(types, dict):
        for kind in NOTIFY_TYPES:
            item = types.get(kind)
            if not isinstance(item, dict):
                continue
            for key in ("enabled", "critical", "persistent"):
                if isinstance(item.get(key), bool):
                    out["types"][kind][key] = item[key]
            if isinstance(item.get("volume"), (int, float)) and not isinstance(item.get("volume"), bool):
                out["types"][kind]["volume"] = max(0.0, min(1.0, float(item["volume"])))
    # Eigene Werte je Modus (0.29.0): nur bekannte Modi und Arten, nur gültige Werte; leere Einträge fallen weg
    modes = value.get("modes")
    if isinstance(modes, dict):
        for mode in MODES:
            per_kind = modes.get(mode)
            if not isinstance(per_kind, dict):
                continue
            for kind in NOTIFY_MODE_KINDS:
                item = per_kind.get(kind)
                if not isinstance(item, dict):
                    continue
                own: dict[str, Any] = {}
                for key in ("enabled", "critical", "persistent"):
                    if isinstance(item.get(key), bool):
                        own[key] = item[key]
                if isinstance(item.get("volume"), (int, float)) and not isinstance(item.get("volume"), bool):
                    own["volume"] = max(0.0, min(1.0, float(item["volume"])))
                if own:
                    out["modes"].setdefault(mode, {})[kind] = own
    return out


class Settings:
    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self._store = Store(hass, 1, SETTINGS_STORE_KEY)
        self.data: dict[str, Any] = {
            "presets": copy.deepcopy(DEFAULT_PRESETS),
            "notify": copy.deepcopy(DEFAULT_NOTIFY),
            # Letzte echte Änderung (offen <-> zu) je Sensor, ISO-Zeit; intern, nicht in der Sicherung (Laufzeitdaten)
            "last_changes": {},
        }
        self._listeners: list[Callable[[], None]] = []

    async def async_load(self) -> None:
        stored = await self._store.async_load()
        if isinstance(stored, dict):
            self.data.update(stored)
        self.data["presets"] = valid_presets(self.data.get("presets"))
        self.data["notify"] = valid_notify(self.data.get("notify"))
        # Reste der früheren Update-Funktion (bis 0.27.0) beim Laden verwerfen
        self.data.pop("update", None)
        self.data.pop("update_notified", None)
        stored_changes = self.data.get("last_changes")
        self.data["last_changes"] = {k: v for k, v in stored_changes.items() if isinstance(k, str) and isinstance(v, str)} if isinstance(stored_changes, dict) else {}

    @property
    def last_changes(self) -> dict[str, str]:
        return self.data["last_changes"]

    def note_change(self, entity_id: str, when: str) -> None:
        """Echte Änderung eines Sensors merken (aus dem Zustandsautomaten); selten, verzögertes Speichern genügt."""
        self.data["last_changes"][entity_id] = when
        self._store.async_delay_save(lambda: self.data, 5)

    def seed_changes(self, found: dict[str, str]) -> None:
        """Aus dem Verlauf geholte Zeitpunkte nur für Sensoren ohne gemerkten Wert übernehmen."""
        added = {k: v for k, v in found.items() if k not in self.data["last_changes"]}
        if added:
            self.data["last_changes"].update(added)
            self._store.async_delay_save(lambda: self.data, 5)

    @property
    def presets(self) -> dict[str, list[str]]:
        return self.data["presets"]

    @property
    def notify(self) -> dict[str, Any]:
        return self.data["notify"]

    async def async_set_notify(self, notify: dict[str, Any]) -> None:
        # Benachrichtigungen ändern nichts an Zonen oder Entitäten: speichern ohne die Anlagen neu zu laden
        self.data["notify"] = valid_notify(notify)
        await self._store.async_save(self.data)

    async def async_set_presets(self, presets: dict[str, list[str]]) -> None:
        self.data["presets"] = valid_presets(presets)
        await self._async_save()

    async def _async_save(self) -> None:
        # Selten geändert: sofort schreiben, damit nichts beim Neustart verloren geht
        await self._store.async_save(self.data)
        for listener in list(self._listeners):
            listener()

    @callback
    def add_listener(self, listener: Callable[[], None]) -> Callable[[], None]:
        self._listeners.append(listener)
        return lambda: self._listeners.remove(listener)


async def async_get_settings(hass: HomeAssistant) -> Settings:
    if (settings := hass.data.get(DATA_SETTINGS)) is None:
        settings = Settings(hass)
        await settings.async_load()
        hass.data[DATA_SETTINGS] = settings
    return settings
