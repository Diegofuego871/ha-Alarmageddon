"""
Status der Anlage als Entität (1.34.0): wie viele Dinge Aufmerksamkeit brauchen (Alarm, nicht erreichbare Sensoren, schwache Batterien).

Die Infokarte für Dashboards liest sie. Das Panel braucht Administratorrechte, die Karte nicht: sie darf nur lesen, was jeder Nutzer in
Home Assistant sehen kann, also Entitäten. Gerechnet wird wie in der Infokarte des Panels: ein Sensor gilt als nicht erreichbar, sobald
er "nicht verfügbar" oder "unbekannt" meldet, eine Batterie als schwach unter der Schwelle der Wartung.
"""

from __future__ import annotations

from typing import Any

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import Event, EventStateChangedData, HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.components.alarm_control_panel import AlarmControlPanelState

from .const import DEFAULT_NOTIFY
from .controller import AlarmController
from .devices import battery_of
from .entity import AlarmageddonEntity

GONE = (STATE_UNAVAILABLE, STATE_UNKNOWN)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    async_add_entities([StatusSensor(entry, entry.runtime_data.controller)])


class StatusSensor(AlarmageddonEntity, SensorEntity):
    _attr_translation_key = "status"
    _attr_icon = "mdi:shield-check"

    def __init__(self, entry: ConfigEntry, controller: AlarmController) -> None:
        super().__init__(entry, "status")
        self._ctl = controller
        self._last: tuple[Any, ...] | None = None

    def _threshold(self) -> float:
        settings = self._ctl.settings
        return float(((settings.notify if settings is not None else None) or DEFAULT_NOTIFY)["battery_threshold"])

    def _problems(self) -> tuple[bool, list[str], list[dict[str, Any]]]:
        """(Alarm läuft, nicht erreichbare Sensoren, schwache Batterien) dieser Anlage."""
        sensors = self._ctl.all_sensors()
        offline = sorted(s for s in sensors if (state := self.hass.states.get(s)) is not None and state.state in GONE)
        low: list[dict[str, Any]] = []
        threshold = self._threshold()
        for sensor, battery in sorted(battery_of(self.hass, sensors).items()):
            state = self.hass.states.get(battery)
            try:
                value = float(state.state) if state is not None and state.state not in GONE else None
            except ValueError:
                value = None
            if value is not None and value < threshold:
                low.append({"entity_id": sensor, "battery": round(value)})
        return self._ctl.state == AlarmControlPanelState.TRIGGERED, offline, low

    @property
    def native_value(self) -> int:
        alarm, offline, low = self._problems()
        return int(alarm) + len(offline) + len(low)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        alarm, offline, low = self._problems()
        return {"alarm": alarm, "offline": offline, "low_battery": low, "battery_threshold": self._threshold()}

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        self.async_on_remove(self._ctl.add_listener(self._refresh))
        sensors = self._ctl.all_sensors()
        watched = sorted(sensors | set(battery_of(self.hass, sensors).values()))
        if watched:
            self.async_on_remove(async_track_state_change_event(self.hass, watched, self._on_change))

    @callback
    def _on_change(self, _event: Event[EventStateChangedData]) -> None:
        self._refresh()

    @callback
    def _refresh(self) -> None:
        # Nur schreiben, wenn sich etwas ändert: Sensoren melden ständig neue Attribute
        alarm, offline, low = self._problems()
        key = (alarm, tuple(offline), tuple((x["entity_id"], x["battery"]) for x in low))
        if key != self._last:
            self._last = key
            self.async_write_ha_state()
