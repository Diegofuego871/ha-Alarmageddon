"""Gemeinsames für die Entitäten einer Anlage: ein Gerät pro Alarmanlage."""

from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity import Entity

from .const import DOMAIN, MANUFACTURER


def device_info(entry: ConfigEntry, version: str | None) -> DeviceInfo:
    """
    Jede Anlage ist ein eigenes Gerät (Vorgabe des Nutzers). So lässt sie sich
    einzeln einem Bereich zuordnen und über die HomeKit-Bridge übergeben.
    """
    return DeviceInfo(
        identifiers={(DOMAIN, entry.entry_id)},
        name=entry.title,
        manufacturer=MANUFACTURER,
        model="Alarm system",
        sw_version=version,
    )


class AlarmageddonEntity(Entity):
    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, entry: ConfigEntry, key: str) -> None:
        self._entry = entry
        self._attr_unique_id = f"{entry.entry_id}_{key}"
        self._attr_device_info = device_info(entry, entry.runtime_data.version)
