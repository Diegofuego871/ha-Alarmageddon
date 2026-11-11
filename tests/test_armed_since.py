"""
Seit wann und von wem die Anlage scharf ist (1.11.0). Während eines Alarms zeigt die Kachel "Alarm seit …" und daneben, wer wann
scharf geschaltet hat; vorher stand nur "seit 07:16 · Diego" unter "Alarm", als hätte Diego den Alarm ausgelöst.
"""

from __future__ import annotations

from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

from .conftest import ALARM, WINDOW, setup_alarm
from .test_alarm import advance, call, open_sensor, settle, state


def attrs(hass: HomeAssistant) -> dict:
    return hass.states.get(ALARM).attributes


async def test_armed_since_and_by_whom_survive_alarm_and_acknowledging(hass: HomeAssistant, freezer) -> None:
    """Scharfschalten setzt Zeit und Namen; Alarm und Quittieren ändern sie nicht (die Anlage war durchgehend scharf), Deaktivieren löscht sie."""
    entry = await setup_alarm(hass)
    ctl = entry.runtime_data.controller
    assert attrs(hass)["armed_at"] is None and attrs(hass)["armed_by"] is None
    await ctl.async_arm("home", None, "Diego")
    await settle(hass)
    armed_at = attrs(hass)["armed_at"]
    assert dt_util.parse_datetime(armed_at) is not None and attrs(hass)["armed_by"] == "Diego"
    await advance(hass, freezer, 600)
    await open_sensor(hass, WINDOW)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    assert attrs(hass)["armed_at"] == armed_at and attrs(hass)["armed_by"] == "Diego"
    await advance(hass, freezer, 60)
    assert ctl.acknowledge("Anna")
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    # Quittiert hat Anna, scharf geschaltet hat weiterhin Diego, zur selben Zeit wie vorher
    assert attrs(hass)["changed_by"] == "Anna" and attrs(hass)["armed_by"] == "Diego" and attrs(hass)["armed_at"] == armed_at
    await call(hass, "alarm_disarm")
    assert attrs(hass)["armed_at"] is None and attrs(hass)["armed_by"] is None


async def test_arming_again_sets_a_new_time_and_exit_delay_counts_from_its_end(hass: HomeAssistant, freezer) -> None:
    """Mit Ausgangsverzögerung gilt der Moment, ab dem die Anlage scharf ist; ein Wechsel des Modus setzt Zeit und Namen neu."""
    entry = await setup_alarm(hass, exit_delay_away=30)
    ctl = entry.runtime_data.controller
    await ctl.async_arm("away", None, "Diego")
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.ARMING and attrs(hass)["armed_at"] is None
    await advance(hass, freezer, 31)
    first = attrs(hass)["armed_at"]
    assert state(hass) == AlarmControlPanelState.ARMED_AWAY and first and attrs(hass)["armed_by"] == "Diego"
    await advance(hass, freezer, 300)
    await ctl.async_arm("home", None, "Anna")
    await settle(hass)
    assert attrs(hass)["armed_by"] == "Anna" and attrs(hass)["armed_at"] > first


async def test_armed_since_survives_a_restart(hass: HomeAssistant) -> None:
    """Die Angabe steht im gespeicherten Stand; ein älterer Stand ohne sie lädt ohne Fehler (dann fehlt sie bis zum nächsten Scharfschalten)."""
    entry = await setup_alarm(hass)
    ctl = entry.runtime_data.controller
    await ctl.async_arm("home", None, "Diego")
    await settle(hass)
    data = ctl.restore_data()
    assert data["armed_by"] == "Diego" and data["armed_at"] == attrs(hass)["armed_at"]
    ctl.armed_at = ctl.armed_by = None
    ctl.async_restore("armed_home", data)
    assert ctl.armed_by == "Diego" and ctl.armed_at.isoformat() == data["armed_at"]
    old = {k: v for k, v in data.items() if k not in ("armed_at", "armed_by")}
    ctl.async_restore("armed_home", old)
    assert ctl.armed_at is None and ctl.armed_by is None and ctl.mode == "home"
    ctl.async_restore("disarmed", {**data, "mode": None})
    assert ctl.armed_at is None and ctl.armed_by is None
