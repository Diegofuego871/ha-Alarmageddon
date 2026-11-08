"""Die Alarmanlage als alarm_control_panel-Entität (auch für die HomeKit-Bridge)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from homeassistant.components.alarm_control_panel import (
    AlarmControlPanelEntity,
    AlarmControlPanelEntityFeature,
    AlarmControlPanelState,
    CodeFormat,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.restore_state import ExtraStoredData, RestoreEntity

from .const import MODE_AWAY, MODE_HOME, MODE_NIGHT
from .controller import AlarmController
from .entity import AlarmageddonEntity


@dataclass
class AlarmRestoreData(ExtraStoredData):
    data: dict[str, Any]

    def as_dict(self) -> dict[str, Any]:
        return self.data


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    async_add_entities([AlarmageddonAlarm(entry, entry.runtime_data.controller)])


class AlarmageddonAlarm(AlarmageddonEntity, AlarmControlPanelEntity, RestoreEntity):
    """Ohne eigenen Namen: Die Entität heisst wie das Gerät, also wie die Anlage."""

    _attr_name = None

    def __init__(self, entry: ConfigEntry, controller: AlarmController) -> None:
        super().__init__(entry, "alarm")
        self._ctl = controller

    # Die Werte hängen von den Optionen ab; die Basisklasse speichert sie sonst einmalig (cached_property).
    @property
    def supported_features(self) -> AlarmControlPanelEntityFeature:
        # Was hier steht, bietet die HomeKit-Bridge in Apple Home an: "Nacht" nur, wenn eingeschaltet.
        # Nur eingeschaltete Modi (seit 0.6.0 alle drei wählbar)
        features = AlarmControlPanelEntityFeature.TRIGGER
        for mode, feature in ((MODE_HOME, AlarmControlPanelEntityFeature.ARM_HOME), (MODE_AWAY, AlarmControlPanelEntityFeature.ARM_AWAY),
                              (MODE_NIGHT, AlarmControlPanelEntityFeature.ARM_NIGHT)):
            if mode in self._ctl.modes:
                features |= feature
        return features

    @property
    def code_format(self) -> CodeFormat | None:
        return CodeFormat.NUMBER if self._ctl.has_code else None

    @property
    def code_arm_required(self) -> bool:
        return self._ctl.code_arm_required

    @property
    def alarm_state(self) -> AlarmControlPanelState | None:
        return self._ctl.state

    @property
    def changed_by(self) -> str | None:
        return self._ctl.changed_by

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        # Für Automationen und später die Szenarien: was ausgelöst hat und was umgangen wird
        return {
            "arm_mode": self._ctl.mode,
            "triggered_by": self._ctl.triggered_by,
            "bypassed_sensors": sorted(self._ctl.bypassed),
            "deadline": self._ctl.deadline.isoformat() if self._ctl.deadline else None,
        }

    @property
    def extra_restore_state_data(self) -> AlarmRestoreData:
        return AlarmRestoreData(self._ctl.restore_data())

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        last = await self.async_get_last_state()
        extra = await self.async_get_last_extra_data()
        self._ctl.async_restore(last.state if last else None, extra.as_dict() if extra else None)
        self.async_on_remove(self._ctl.add_listener(self.async_write_ha_state))

    async def _user_name(self) -> str | None:
        """Name des Benutzers aus dem Aufruf, für "geändert von" (später auch in Push-Meldungen)."""
        if not self._context or not self._context.user_id:
            return None
        # Mit einem persönlichen Code verknüpft: der Name der Person, sonst der Name des Benutzers
        if person := self._ctl.person_for_user(self._context.user_id):
            return person
        user = await self.hass.auth.async_get_user(self._context.user_id)
        return user.name if user else None

    async def async_alarm_disarm(self, code: str | None = None) -> None:
        await self._ctl.async_disarm(code, await self._user_name())

    async def async_alarm_arm_home(self, code: str | None = None) -> None:
        await self._ctl.async_arm(MODE_HOME, code, await self._user_name())

    async def async_alarm_arm_away(self, code: str | None = None) -> None:
        await self._ctl.async_arm(MODE_AWAY, code, await self._user_name())

    async def async_alarm_arm_night(self, code: str | None = None) -> None:
        await self._ctl.async_arm(MODE_NIGHT, code, await self._user_name())

    async def async_alarm_trigger(self, code: str | None = None) -> None:
        self._ctl.async_trigger(await self._user_name())
