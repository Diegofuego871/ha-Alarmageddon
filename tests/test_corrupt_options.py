"""Beschädigte oder alte Optionen dürfen eine Anlage nie am Laden hindern (sonst fehlt sie im Panel und schweigt)."""

import pytest
from homeassistant.config_entries import ConfigEntryState
from .conftest import setup_alarm

VARIANTS = [
    dict(open_sensors="bypass", open_sensors_home="block", open_sensors_away="bypass"),
    dict(open_sensors_night="bypass"),
    dict(open_sensors="bypass", sensor_options=None, sensors=None),
    dict(open_sensors="bypass", sensor_options={"binary_sensor.fenster_kueche": None}),
    dict(sensor_options={"binary_sensor.fenster_kueche": None}),
    dict(sensor_options={"binary_sensor.fenster_kueche": "x"}, sensor_modes={"away": {"binary_sensor.fenster_kueche": None}}, per_mode_sensors=True),
    dict(open_sensors="bypass", sensor_modes={"away": None}),
    dict(open_sensors_home="bypass", open_sensors_away="block", sensor_modes={"away": {"x": {"a": True}}}, per_mode_sensors=None),
]

@pytest.mark.parametrize("v", range(len(VARIANTS)))
async def test_odd_options_still_load(hass, v):
    entry = await setup_alarm(hass, **VARIANTS[v])
    assert entry.state is ConfigEntryState.LOADED, entry.reason
