"""Das Panel ist Bequemlichkeit, die Alarmanlage nicht: scheitert seine Anmeldung, läuft die Anlage trotzdem (und alarmiert)."""

from __future__ import annotations

import pytest
from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import HomeAssistant


from .conftest import WINDOW, setup_alarm
from .test_alarm import call, state
from .test_sensor_options import open_sensor


@pytest.mark.parametrize("error", [RuntimeError("Cannot register a resource into frozen router."), ValueError("kaputt")])
async def test_alarm_system_loads_and_alarms_when_the_panel_cannot_be_registered(hass: HomeAssistant, monkeypatch, caplog, error) -> None:
    async def broken(_hass) -> None:
        raise error

    monkeypatch.setattr("custom_components.alarmageddon.async_register_panel", broken)
    entry = await setup_alarm(hass)
    assert entry.state.value == "loaded"
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    assert "could not be registered" in caplog.text
