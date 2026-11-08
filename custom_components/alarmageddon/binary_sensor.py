"""
Eine Entität pro Zone: "ein" sobald ein Sensor der Zone offen ist.

Statt HA-Helfergruppen (Entscheid im Konzept): Die Zonen gehören zur
Integration, der Nutzer kann sie nicht versehentlich löschen oder umbauen.
"""

from __future__ import annotations

from typing import Any

from homeassistant.components.binary_sensor import BinarySensorDeviceClass, BinarySensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import STATE_ON
from homeassistant.core import Event, EventStateChangedData, HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.event import async_track_state_change_event

from .controller import AlarmController
from .entity import AlarmageddonEntity


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    controller: AlarmController = entry.runtime_data.controller
    async_add_entities(ZoneSensor(entry, controller, mode) for mode in controller.modes)


class ZoneSensor(AlarmageddonEntity, BinarySensorEntity):
    _attr_device_class = BinarySensorDeviceClass.SAFETY

    def __init__(self, entry: ConfigEntry, controller: AlarmController, mode: str) -> None:
        super().__init__(entry, f"zone_{mode}")
        self._ctl = controller
        self._mode = mode
        self._attr_translation_key = f"zone_{mode}"

    @property
    def _members(self) -> list[str]:
        return self._ctl.zone(self._mode)

    @property
    def is_on(self) -> bool:
        return bool(self._ctl.open_sensors(self._mode))

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {"sensors": self._members, "open_sensors": self._ctl.open_sensors(self._mode)}

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        if self._members:
            self.async_on_remove(async_track_state_change_event(self.hass, self._members, self._on_member))

    @callback
    def _on_member(self, event: Event[EventStateChangedData]) -> None:
        old, new = event.data["old_state"], event.data["new_state"]
        # Nur schreiben, wenn sich "offen" ändert; Attribute der Sensoren (Batterie, Signal) ändern oft
        if (old is not None and old.state == STATE_ON) != (new is not None and new.state == STATE_ON):
            self.async_write_ha_state()
