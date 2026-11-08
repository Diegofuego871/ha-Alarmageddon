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
    DEFAULT_NOTIFY,
    NOTIFY_EVENTS,
    DEFAULT_PRESETS,
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
    """Nur bekannte Schlüssel mit gültigen Werten; fehlende mit der Grundeinstellung."""
    out = copy.deepcopy(DEFAULT_NOTIFY)
    if not isinstance(value, dict):
        return out
    for key in ("alarm_targets", "maintenance_targets"):
        if isinstance(value.get(key), list):
            out[key] = [t for t in value[key] if isinstance(t, str) and t.startswith("notify.")]
    for key in ("critical", "disarm_action"):
        if isinstance(value.get(key), bool):
            out[key] = value[key]
    if isinstance(value.get("volume"), (int, float)):
        out["volume"] = max(0.0, min(1.0, float(value["volume"])))
    if isinstance(value.get("events"), dict):
        for key in NOTIFY_EVENTS:
            if isinstance(value["events"].get(key), bool):
                out["events"][key] = value["events"][key]
    return out


class Settings:
    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self._store = Store(hass, 1, SETTINGS_STORE_KEY)
        self.data: dict[str, Any] = {"presets": copy.deepcopy(DEFAULT_PRESETS), "notify": copy.deepcopy(DEFAULT_NOTIFY)}
        self._listeners: list[Callable[[], None]] = []

    async def async_load(self) -> None:
        stored = await self._store.async_load()
        if isinstance(stored, dict):
            self.data.update(stored)
        self.data["presets"] = valid_presets(self.data.get("presets"))
        self.data["notify"] = valid_notify(self.data.get("notify"))

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
