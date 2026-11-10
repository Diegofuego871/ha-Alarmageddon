"""Eingangsverzögerung pro Sensor (1.1.0): eigener Wert, sonst der Wert der Anlage für den Modus."""

from __future__ import annotations

import pytest
import voluptuous as vol
from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import HomeAssistant

from custom_components.alarmageddon.const import CONF_PER_MODE_SENSORS, CONF_SENSOR_MODES, CONF_SENSOR_OPTIONS
from custom_components.alarmageddon.schemas import SENSOR_VALUES

from .conftest import FRONT_DOOR, WINDOW, setup_alarm
from .test_alarm import advance, call, open_sensor, state

DOOR_OWN = {CONF_SENSOR_OPTIONS: {FRONT_DOOR: {"entry_delay": 5}}}




async def test_sensor_delay_replaces_the_system_delay(hass: HomeAssistant, freezer) -> None:
    await setup_alarm(hass, entry_delay=60, **DOOR_OWN)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, FRONT_DOOR)
    assert state(hass) == AlarmControlPanelState.PENDING
    await advance(hass, freezer, 4)
    assert state(hass) == AlarmControlPanelState.PENDING
    await advance(hass, freezer, 2)
    assert state(hass) == AlarmControlPanelState.TRIGGERED


async def test_sensor_without_own_delay_uses_the_system_delay(hass: HomeAssistant, freezer) -> None:
    await setup_alarm(hass, entry_delay=30, entry_sensors=[FRONT_DOOR, WINDOW], **DOOR_OWN)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await advance(hass, freezer, 10)
    assert state(hass) == AlarmControlPanelState.PENDING
    await advance(hass, freezer, 21)
    assert state(hass) == AlarmControlPanelState.TRIGGERED


async def test_sensor_delay_zero_triggers_at_once(hass: HomeAssistant) -> None:
    await setup_alarm(hass, entry_delay=60, **{CONF_SENSOR_OPTIONS: {FRONT_DOOR: {"entry_delay": 0}}})
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, FRONT_DOOR)
    assert state(hass) == AlarmControlPanelState.TRIGGERED


async def test_sensor_delay_is_only_for_entry_sensors(hass: HomeAssistant) -> None:
    """Ein Sensor, der kein Eingangssensor ist, löst sofort aus, auch mit eigener Verzögerung."""
    await setup_alarm(hass, entry_delay=60, **{CONF_SENSOR_OPTIONS: {WINDOW: {"entry_delay": 30}}})
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    assert state(hass) == AlarmControlPanelState.TRIGGERED


async def test_per_mode_sensor_delay_beats_the_sensor_value(hass: HomeAssistant, freezer) -> None:
    entry = await setup_alarm(
        hass, entry_delay=60, **DOOR_OWN, **{CONF_PER_MODE_SENSORS: True, CONF_SENSOR_MODES: {"home": {FRONT_DOOR: {"entry_delay": 40}}}}
    )
    ctl = entry.runtime_data.controller
    assert ctl.sensor_entry_delay(FRONT_DOOR, "home") == 40
    assert ctl.sensor_entry_delay(FRONT_DOOR, "away") == 5  # kein Wert für Abwesend: der des Sensors
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, FRONT_DOOR)
    await advance(hass, freezer, 10)
    assert state(hass) == AlarmControlPanelState.PENDING


async def test_per_mode_values_are_ignored_while_switched_off(hass: HomeAssistant) -> None:
    entry = await setup_alarm(hass, entry_delay=60, **{CONF_SENSOR_MODES: {"home": {FRONT_DOOR: {"entry_delay": 40}}}})
    assert entry.runtime_data.controller.sensor_entry_delay(FRONT_DOOR, "home") == 60


@pytest.mark.parametrize("bad", [-1, 3601, "abc", True, None, 2.5])
async def test_invalid_stored_value_falls_back_to_the_system_delay(hass: HomeAssistant, bad) -> None:
    """Beschädigte Ablage: nie eine falsche Frist, immer der Wert der Anlage."""
    entry = await setup_alarm(hass, entry_delay=45, **{CONF_SENSOR_OPTIONS: {FRONT_DOOR: {"entry_delay": bad}}})
    assert entry.runtime_data.controller.sensor_entry_delay(FRONT_DOOR, "home") == 45


async def test_second_sensor_with_shorter_delay_does_not_extend_or_shorten(hass: HomeAssistant, freezer) -> None:
    await setup_alarm(hass, entry_delay=60, entry_sensors=[FRONT_DOOR, WINDOW], **DOOR_OWN)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await advance(hass, freezer, 10)
    await open_sensor(hass, FRONT_DOOR)  # eigene 5 s: die laufende Verzögerung bleibt
    assert state(hass) == AlarmControlPanelState.PENDING
    await advance(hass, freezer, 51)
    assert state(hass) == AlarmControlPanelState.TRIGGERED


async def test_disarm_during_sensor_delay(hass: HomeAssistant, freezer) -> None:
    """Pflichtfall: Deaktivieren während der eigenen Verzögerung."""
    await setup_alarm(hass, entry_delay=60, **{CONF_SENSOR_OPTIONS: {FRONT_DOOR: {"entry_delay": 30}}})
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, FRONT_DOOR)
    await call(hass, "alarm_disarm")
    await advance(hass, freezer, 120)
    assert state(hass) == AlarmControlPanelState.DISARMED


@pytest.mark.parametrize("value", [0, 3600])
def test_schema_accepts_the_range(value: int) -> None:
    assert SENSOR_VALUES({"entry_delay": value})["entry_delay"] == value


@pytest.mark.parametrize("value", [-1, 3601, "x"])
def test_schema_rejects_values_out_of_range(value) -> None:
    with pytest.raises(vol.Invalid):
        SENSOR_VALUES({"entry_delay": value})
