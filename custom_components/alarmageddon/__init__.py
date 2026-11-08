"""Alarmageddon: Alarmanlage für Home Assistant. Ein Config Entry pro Anlage."""

from __future__ import annotations

from dataclasses import dataclass

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.loader import async_get_integration

from .const import DOMAIN, MODES
from .controller import AlarmController

PLATFORMS: list[Platform] = [Platform.ALARM_CONTROL_PANEL, Platform.BINARY_SENSOR]


@dataclass
class RuntimeData:
    controller: AlarmController
    version: str | None


type AlarmageddonConfigEntry = ConfigEntry[RuntimeData]


async def async_setup_entry(hass: HomeAssistant, entry: AlarmageddonConfigEntry) -> bool:
    integration = await async_get_integration(hass, DOMAIN)
    controller = AlarmController(hass, entry)
    entry.runtime_data = RuntimeData(controller, str(integration.version) if integration.version else None)
    _remove_unused_zones(hass, entry, controller)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    # Erst nach dem Wiederherstellen des Zustands (in der Entität) auf Sensoren hören
    controller.async_start()
    entry.async_on_unload(controller.async_stop)
    # Zonen, Modi und Verzögerungen bestimmen, welche Entitäten es gibt und wem zugehört wird: neu laden.
    # Der Zustand (scharf, Verzögerung, Alarm) übersteht das über die Wiederherstellung der Entität.
    entry.async_on_unload(entry.add_update_listener(_async_reload))
    return True


def _remove_unused_zones(hass: HomeAssistant, entry: ConfigEntry, controller: AlarmController) -> None:
    """Wird "Nacht" ausgeschaltet, verschwindet die Zone ganz, statt als "nicht verfügbar" stehen zu bleiben."""
    registry = er.async_get(hass)
    for mode in MODES:
        if mode in controller.modes:
            continue
        if entity_id := registry.async_get_entity_id(Platform.BINARY_SENSOR, DOMAIN, f"{entry.entry_id}_zone_{mode}"):
            registry.async_remove(entity_id)


async def _async_reload(hass: HomeAssistant, entry: AlarmageddonConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: AlarmageddonConfigEntry) -> bool:
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
