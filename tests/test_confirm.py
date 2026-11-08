"""Zwei-Sensor-Bestätigung (0.5.0): Ein Sensor mit "braucht Bestätigung" löst erst mit einem zweiten aus."""

from __future__ import annotations

from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import HomeAssistant

from .conftest import ALARM, FRONT_DOOR, MOTION, WINDOW, setup_alarm
from .test_alarm import advance, call, state
from .test_sensor_options import _classes, open_sensor

MOTION2 = "binary_sensor.bewegung_wohnzimmer"


async def _armed(hass: HomeAssistant, **overrides) -> None:
    _classes(hass)
    hass.states.async_set(MOTION2, "off", {"device_class": "motion"})
    opts = {"sensor_options": {MOTION: {"confirm": True}, MOTION2: {"confirm": True}}, "exit_delay_away": 0,
            "zone_away": [FRONT_DOOR, WINDOW, MOTION, MOTION2]}
    opts.update(overrides)
    entry = await setup_alarm(hass, **opts)
    await call(hass, "alarm_arm_away")
    assert state(hass) == AlarmControlPanelState.ARMED_AWAY
    return entry


async def test_single_sensor_does_not_trigger(hass: HomeAssistant) -> None:
    entry = await _armed(hass)
    await open_sensor(hass, MOTION)
    assert state(hass) == AlarmControlPanelState.ARMED_AWAY
    # Steht im Protokoll, damit der Nutzer sieht, dass etwas war
    assert entry.runtime_data.events.events[0]["kind"] == "unconfirmed"
    assert entry.runtime_data.events.events[0]["sensor"] == MOTION


async def test_second_sensor_in_window_triggers(hass: HomeAssistant, freezer) -> None:
    await _armed(hass)
    await open_sensor(hass, MOTION)
    await advance(hass, freezer, 30)
    await open_sensor(hass, MOTION2)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    assert hass.states.get(ALARM).attributes["triggered_by"] == MOTION2


async def test_second_sensor_after_window_does_not_trigger(hass: HomeAssistant, freezer) -> None:
    await _armed(hass, confirm_window=20)
    await open_sensor(hass, MOTION)
    await advance(hass, freezer, 25)
    await open_sensor(hass, MOTION2)
    assert state(hass) == AlarmControlPanelState.ARMED_AWAY


async def test_same_sensor_twice_does_not_confirm(hass: HomeAssistant) -> None:
    """Ein Haustier vor demselben Melder ist keine Bestätigung."""
    await _armed(hass)
    await open_sensor(hass, MOTION)
    await open_sensor(hass, MOTION, "off")
    await open_sensor(hass, MOTION)
    assert state(hass) == AlarmControlPanelState.ARMED_AWAY


async def test_sensor_without_option_triggers_alone(hass: HomeAssistant) -> None:
    await _armed(hass)
    await open_sensor(hass, WINDOW)
    assert state(hass) == AlarmControlPanelState.TRIGGERED


async def test_door_with_entry_delay_then_motion_triggers(hass: HomeAssistant) -> None:
    """Haustür startet die Eingangsverzögerung; ein Bewegungsmelder danach braucht keine Bestätigung."""
    await _armed(hass)
    await open_sensor(hass, FRONT_DOOR)
    assert state(hass) == AlarmControlPanelState.PENDING
    await open_sensor(hass, MOTION)
    assert state(hass) == AlarmControlPanelState.TRIGGERED


async def test_disarm_clears_pending_confirmation(hass: HomeAssistant) -> None:
    await _armed(hass)
    await open_sensor(hass, MOTION)
    await call(hass, "alarm_disarm")
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, MOTION, "off")
    await open_sensor(hass, MOTION2)
    assert state(hass) == AlarmControlPanelState.ARMED_AWAY


async def test_disarm_during_entry_delay(hass: HomeAssistant) -> None:
    await _armed(hass)
    await open_sensor(hass, FRONT_DOOR)
    await call(hass, "alarm_disarm")
    assert state(hass) == AlarmControlPanelState.DISARMED
    await open_sensor(hass, MOTION)
    assert state(hass) == AlarmControlPanelState.DISARMED


async def test_failure_still_counts_as_alarm(hass: HomeAssistant) -> None:
    """Bestätigung gilt nur für Auslösungen; ein ausgefallener Melder mit "Ausfall gilt als Alarm" löst sofort aus."""
    await _armed(hass, sensor_options={MOTION: {"confirm": True, "offline_alarm": True}})
    await open_sensor(hass, MOTION, "unavailable")
    assert state(hass) == AlarmControlPanelState.TRIGGERED


async def test_restart_during_alarm_keeps_alarm(hass: HomeAssistant) -> None:
    entry = await _armed(hass)
    await open_sensor(hass, MOTION)
    await open_sensor(hass, MOTION2)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert state(hass) == AlarmControlPanelState.TRIGGERED
