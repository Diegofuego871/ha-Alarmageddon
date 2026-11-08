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
    DEFAULT_UPDATE,
    DEVICE_CLASS_TYPE,
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
            for key in ("enabled", "critical"):
                if isinstance(item.get(key), bool):
                    out["types"][kind][key] = item[key]
            if isinstance(item.get("volume"), (int, float)) and not isinstance(item.get("volume"), bool):
                out["types"][kind]["volume"] = max(0.0, min(1.0, float(item["volume"])))
    return out


def valid_update(value: Any) -> dict[str, Any]:
    """check und auto_update als Wahrheitswert; prerelease zusätzlich None (noch nie gewählt: folgt der installierten Version)."""
    out = copy.deepcopy(DEFAULT_UPDATE)
    if isinstance(value, dict):
        for key in ("check", "auto_update"):
            if isinstance(value.get(key), bool):
                out[key] = value[key]
        if isinstance(value.get("prerelease"), bool):
            out["prerelease"] = value["prerelease"]
    return out


class Settings:
    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self._store = Store(hass, 1, SETTINGS_STORE_KEY)
        self.data: dict[str, Any] = {
            "presets": copy.deepcopy(DEFAULT_PRESETS),
            "notify": copy.deepcopy(DEFAULT_NOTIFY),
            "update": copy.deepcopy(DEFAULT_UPDATE),
            # Versionen, zu denen schon gemeldet wurde ({"found": "0.7.0", "done": ...}); intern, nicht in der Sicherung
            "update_notified": {},
        }
        self._listeners: list[Callable[[], None]] = []

    async def async_load(self) -> None:
        stored = await self._store.async_load()
        if isinstance(stored, dict):
            self.data.update(stored)
        self.data["presets"] = valid_presets(self.data.get("presets"))
        self.data["notify"] = valid_notify(self.data.get("notify"))
        self.data["update"] = valid_update(self.data.get("update"))
        notified = self.data.get("update_notified")
        self.data["update_notified"] = (
            {k: str(v) for k, v in notified.items() if k in ("found", "done") and v} if isinstance(notified, dict) else {}
        )

    @property
    def presets(self) -> dict[str, list[str]]:
        return self.data["presets"]

    @property
    def notify(self) -> dict[str, Any]:
        return self.data["notify"]

    @property
    def update(self) -> dict[str, Any]:
        return self.data["update"]

    @property
    def update_notified(self) -> dict[str, str]:
        return self.data["update_notified"]

    async def async_set_update(self, values: dict[str, Any]) -> None:
        # Eigene Einstellungen der Updates; ändern nichts an den Anlagen: ohne Neuladen speichern
        self.data["update"] = valid_update({**self.data["update"], **values})
        await self._store.async_save(self.data)

    async def async_remember_notified(self, kind: str, version: str) -> None:
        self.data["update_notified"][kind] = version
        await self._store.async_save(self.data)

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
