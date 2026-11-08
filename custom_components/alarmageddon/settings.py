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


class Settings:
    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self._store = Store(hass, 1, SETTINGS_STORE_KEY)
        self.data: dict[str, Any] = {"presets": copy.deepcopy(DEFAULT_PRESETS)}
        self._listeners: list[Callable[[], None]] = []

    async def async_load(self) -> None:
        stored = await self._store.async_load()
        if isinstance(stored, dict):
            self.data.update(stored)
        self.data["presets"] = valid_presets(self.data.get("presets"))

    @property
    def presets(self) -> dict[str, list[str]]:
        return self.data["presets"]

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
