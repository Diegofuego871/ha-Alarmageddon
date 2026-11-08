"""Neustart und Neuladen: Zustand und Zeitgeber überleben, im Zweifel Alarm."""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import CoreState, HomeAssistant, State
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import mock_restore_cache_with_extra_data

from .conftest import ALARM, WINDOW, setup_alarm
from .test_alarm import advance, call, open_sensor, state


def _restore(hass: HomeAssistant, last: str, **extra: Any) -> None:
    data = {"mode": None, "deadline": None, "bypassed": [], "triggered_by": None, "changed_by": None, **extra}
    mock_restore_cache_with_extra_data(hass, [(State(ALARM, last), data)])


async def _start(hass: HomeAssistant, **overrides: Any) -> None:
    # Wie beim Hochfahren (LEARNINGS): erst einrichten, dann "gestartet"
    hass.set_state(CoreState.not_running)
    await setup_alarm(hass, **overrides)
    await hass.async_start()
    await hass.async_block_till_done()


async def test_armed_survives_restart(hass: HomeAssistant) -> None:
    _restore(hass, "armed_away", mode="away", bypassed=[WINDOW])
    await _start(hass, open_sensors="bypass")
    assert state(hass) == AlarmControlPanelState.ARMED_AWAY
    assert hass.states.get(ALARM).attributes["bypassed_sensors"] == [WINDOW]


async def test_disarmed_stays_disarmed(hass: HomeAssistant) -> None:
    _restore(hass, "disarmed")
    await _start(hass)
    assert state(hass) == AlarmControlPanelState.DISARMED


async def test_exit_delay_continues_with_remaining_time(hass: HomeAssistant, freezer) -> None:
    _restore(hass, "arming", mode="away", deadline=(dt_util.utcnow() + timedelta(seconds=10)).isoformat())
    await _start(hass)
    assert state(hass) == AlarmControlPanelState.ARMING
    await advance(hass, freezer, 11)
    assert state(hass) == AlarmControlPanelState.ARMED_AWAY


async def test_exit_delay_over_during_restart(hass: HomeAssistant) -> None:
    _restore(hass, "arming", mode="away", deadline=(dt_util.utcnow() - timedelta(seconds=5)).isoformat())
    await _start(hass)
    assert state(hass) == AlarmControlPanelState.ARMED_AWAY


async def test_entry_delay_over_during_restart_triggers(hass: HomeAssistant) -> None:
    """Im Zweifel alarmieren: Die Eingangsverzögerung ist während des Neustarts abgelaufen."""
    _restore(hass, "pending", mode="home", deadline=(dt_util.utcnow() - timedelta(seconds=5)).isoformat())
    await _start(hass)
    assert state(hass) == AlarmControlPanelState.TRIGGERED


async def test_entry_delay_continues(hass: HomeAssistant, freezer) -> None:
    _restore(hass, "pending", mode="home", deadline=(dt_util.utcnow() + timedelta(seconds=8)).isoformat())
    await _start(hass)
    assert state(hass) == AlarmControlPanelState.PENDING
    await advance(hass, freezer, 9)
    assert state(hass) == AlarmControlPanelState.TRIGGERED


async def test_alarm_continues_after_restart(hass: HomeAssistant, freezer) -> None:
    _restore(hass, "triggered", mode="home", deadline=(dt_util.utcnow() + timedelta(seconds=30)).isoformat())
    await _start(hass)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    await advance(hass, freezer, 31)
    assert state(hass) == AlarmControlPanelState.ARMED_HOME


async def test_alarm_until_disarmed_after_restart(hass: HomeAssistant, freezer) -> None:
    _restore(hass, "triggered", mode="home", deadline=None)
    await _start(hass, trigger_time=0)
    await advance(hass, freezer, 600)
    assert state(hass) == AlarmControlPanelState.TRIGGERED


async def test_open_sensor_at_start_does_not_trigger(hass: HomeAssistant) -> None:
    """Sensoren kommen beim Start als "nicht verfügbar" und dann "offen": kein Fehlalarm."""
    _restore(hass, "armed_home", mode="home")
    hass.states.async_set(WINDOW, "unavailable")
    await _start(hass)
    await open_sensor(hass, WINDOW)
    assert state(hass) == AlarmControlPanelState.ARMED_HOME


async def test_options_change_keeps_state(hass: HomeAssistant, freezer) -> None:
    """Optionen ändern lädt neu; eine laufende Eingangsverzögerung läuft weiter."""
    entry = await setup_alarm(hass)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, "binary_sensor.haustuer")
    assert state(hass) == AlarmControlPanelState.PENDING
    hass.config_entries.async_update_entry(entry, options={**entry.options, "trigger_time": 60})
    await hass.async_block_till_done()
    assert state(hass) == AlarmControlPanelState.PENDING
    await advance(hass, freezer, 21)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    await advance(hass, freezer, 61)
    assert state(hass) == AlarmControlPanelState.ARMED_HOME


async def test_night_disabled_removes_zone(hass: HomeAssistant) -> None:
    entry = await setup_alarm(hass, night_enabled=True)
    assert hass.states.get("binary_sensor.haus_zone_night") is not None
    hass.config_entries.async_update_entry(entry, options={**entry.options, "night_enabled": False})
    await hass.async_block_till_done()
    assert hass.states.get("binary_sensor.haus_zone_night") is None
