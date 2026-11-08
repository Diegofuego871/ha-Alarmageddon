"""Batterieprognose mit echtem Recorder (eigene Datei: der Recorder muss vor hass stehen)."""

from __future__ import annotations

from datetime import timedelta

from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util
import pytest
from pytest_homeassistant_custom_component.components.recorder.common import async_wait_recording_done

from .conftest import WINDOW, setup_alarm
from .test_maintenance import BAT_WINDOW, _device


# Überschreiben die gleichnamigen Fixtures aus conftest: zuerst die Datenbank, dann hass (sonst lehnt der Recorder ab)
@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(recorder_db_url, enable_custom_integrations):
    yield


@pytest.fixture(autouse=True)
def skip_frontend(recorder_db_url, hass):
    hass.config.components.add("frontend")
    yield


async def test_ws_with_recorder(recorder_mock, hass: HomeAssistant, hass_ws_client, freezer) -> None:
    _device(hass, WINDOW, BAT_WINDOW)
    start = dt_util.utcnow() - timedelta(days=10)
    for d in range(11):
        freezer.move_to(start + timedelta(days=d))
        hass.states.async_set(BAT_WINDOW, str(70 - 2 * d))
        await async_wait_recording_done(hass)
    await setup_alarm(hass)
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "alarmageddon/battery_forecast"})
    result = await client.receive_json()
    assert result["success"], result
    # 2 % pro Tag, jetzt 50 %: in 15 Tagen unter 20 %
    assert result["result"]["forecast"][BAT_WINDOW] == pytest.approx(15, abs=0.5)
