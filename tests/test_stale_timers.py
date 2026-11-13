"""
Zeitgeber der Verzögerungen (Code-Review 1.33.1): Wechselt die Anlage direkt in den Alarm (zweiter Sensor, "Immer aktiv", Panik), muss der
Zeitgeber der Verzögerung mit abgebrochen werden. Sonst schlüge er später noch einmal zu: nach dem Deaktivieren wieder Alarm, am Ende der
Ausgangsverzögerung "scharf" mitten im Alarm (Sicherheitsregel: ein Alarm endet nie von selbst).
"""

from __future__ import annotations

from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import HomeAssistant

from .conftest import FRONT_DOOR, MOTION, setup_alarm
from .test_alarm import advance, call, open_sensor, settle, state

SMOKE = "binary_sensor.rauchmelder_test"


async def test_stale_timer_second_sensor_during_the_entry_delay_then_disarm(hass: HomeAssistant, freezer) -> None:
    await setup_alarm(hass, exit_delay_away=0, entry_delay=30)
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, FRONT_DOOR)  # Eingangssensor: Verzögerung läuft
    assert state(hass) == AlarmControlPanelState.PENDING
    await open_sensor(hass, MOTION)  # Bewegung: sofort Alarm
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    await call(hass, "alarm_disarm")
    assert state(hass) == AlarmControlPanelState.DISARMED
    await advance(hass, freezer, 60)  # weit über die alte Eingangsverzögerung hinaus
    assert state(hass) == AlarmControlPanelState.DISARMED


async def test_stale_timer_smoke_during_the_exit_delay_is_not_cleared_by_its_end(hass: HomeAssistant, freezer) -> None:
    hass.states.async_set(SMOKE, "off", {"device_class": "smoke"})
    await setup_alarm(hass, exit_delay_away=60, sensor_options={SMOKE: {"always": True}})
    await call(hass, "alarm_arm_away")
    assert state(hass) == AlarmControlPanelState.ARMING
    await open_sensor(hass, SMOKE)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    await advance(hass, freezer, 61)
    assert state(hass) == AlarmControlPanelState.TRIGGERED


async def test_stale_timer_manual_alarm_during_the_exit_delay_stays(hass: HomeAssistant, freezer) -> None:
    await setup_alarm(hass, exit_delay_away=60)
    await call(hass, "alarm_arm_away")
    await call(hass, "alarm_trigger")
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    await advance(hass, freezer, 61)
    assert state(hass) == AlarmControlPanelState.TRIGGERED


async def test_stale_timer_manual_alarm_during_the_entry_delay_then_disarm(hass: HomeAssistant, freezer) -> None:
    await setup_alarm(hass, exit_delay_away=0, entry_delay=30)
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, FRONT_DOOR)
    assert state(hass) == AlarmControlPanelState.PENDING
    await call(hass, "alarm_trigger")
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    await call(hass, "alarm_disarm")
    await advance(hass, freezer, 60)
    assert state(hass) == AlarmControlPanelState.DISARMED


async def test_stale_timer_acknowledged_alarm_in_the_exit_delay_arms_with_a_time(hass: HomeAssistant, freezer) -> None:
    """Quittiert man einen Alarm, der in der Ausgangsverzögerung kam, ist die Anlage scharf und "scharf seit" ist gesetzt (war nie gesetzt)."""
    hass.states.async_set(SMOKE, "off", {"device_class": "smoke"})
    entry = await setup_alarm(hass, exit_delay_away=60, sensor_options={SMOKE: {"always": True}})
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, SMOKE)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    ctl = entry.runtime_data.controller
    assert ctl.armed_at is None
    assert ctl.acknowledge("Test") is True
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.ARMED_AWAY and ctl.armed_at is not None
    await advance(hass, freezer, 120)
    assert state(hass) == AlarmControlPanelState.ARMED_AWAY
