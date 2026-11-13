"""Code-Review 1.33.1: Das Mitschreiben der Sensorwechsel (Stundenwerte, "Letzte Änderung") steht vor der Alarmlogik und darf sie nie aufhalten."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import HomeAssistant

from .conftest import FRONT_DOOR, MOTION, setup_alarm
from .test_alarm import call, open_sensor, state


@pytest.mark.parametrize("broken", ["stats", "last_change"])
async def test_a_failing_bookkeeping_never_stops_the_alarm(hass: HomeAssistant, broken: str, caplog) -> None:
    entry = await setup_alarm(hass, exit_delay_away=0, entry_delay=0)
    ctl = entry.runtime_data.controller
    if broken == "stats":
        ctl.stats = MagicMock()
        ctl.stats.note.side_effect = RuntimeError("kaputt")
    else:
        ctl.settings = MagicMock()
        ctl.settings.note_change.side_effect = RuntimeError("kaputt")
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, MOTION)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    assert "recording the sensor change" in caplog.text
    # Auch der zweite Wechsel (zu, dann wieder offen) wird weiter ausgewertet
    await call(hass, "alarm_disarm")
    hass.states.async_set(MOTION, "off")
    await hass.async_block_till_done()
    await call(hass, "alarm_arm_away")
    hass.states.async_set(FRONT_DOOR, "on")
    await hass.async_block_till_done()
    assert state(hass) == AlarmControlPanelState.TRIGGERED
