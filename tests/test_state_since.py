"""
Seit wann die Anlage in ihrem Zustand ist (1.34.3). Home Assistant setzt `last_changed` bei jedem Neustart zurück; das Panel zeigte
"Deaktiviert seit 08:26" mit der Zeit des Neustarts. Der Zeitpunkt des Zustandswechsels steht deshalb im gespeicherten Stand der Anlage.
"""

from __future__ import annotations

from datetime import timedelta

from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

from .conftest import ALARM, setup_alarm
from .test_alarm import settle, state


def attrs(hass: HomeAssistant) -> dict:
    return hass.states.get(ALARM).attributes


async def test_state_since_is_set_on_a_change_and_not_on_a_repeated_state(hass: HomeAssistant, freezer) -> None:
    entry = await setup_alarm(hass)
    ctl = entry.runtime_data.controller
    await ctl.async_arm("home", None, "Diego")
    await settle(hass)
    first = attrs(hass)["state_since"]
    assert dt_util.parse_datetime(first) is not None
    freezer.tick(timedelta(minutes=5))
    ctl._set(ctl.state)  # derselbe Zustand noch einmal gemeldet
    await settle(hass)
    assert attrs(hass)["state_since"] == first
    await ctl.async_disarm(None, skip_code=True)
    await settle(hass)
    assert attrs(hass)["state_since"] > first


async def test_state_since_survives_a_restart_and_does_not_take_the_time_of_the_restart(hass: HomeAssistant, freezer) -> None:
    entry = await setup_alarm(hass)
    ctl = entry.runtime_data.controller
    await ctl.async_arm("home", None, "Diego")
    await settle(hass)
    before = attrs(hass)["state_since"]
    data = ctl.restore_data()
    assert data["state_since"] == before
    freezer.tick(timedelta(hours=3))  # Home Assistant ist drei Stunden später wieder da
    ctl.state_since = None
    ctl.async_restore("armed_home", data)
    assert ctl.state_since.isoformat() == before and state(hass) == AlarmControlPanelState.ARMED_HOME
    ctl.async_restore("disarmed", {**data, "mode": None})
    assert ctl.state_since.isoformat() == before  # auch deaktiviert: die gespeicherte Zeit gilt


async def test_state_since_is_now_when_the_state_changed_during_the_restart(hass: HomeAssistant, freezer) -> None:
    """Lief die Eingangsverzögerung während des Neustarts ab, wurde die Anlage erst jetzt zum Alarm."""
    entry = await setup_alarm(hass)
    ctl = entry.runtime_data.controller
    await ctl.async_arm("home", None, "Diego")
    await settle(hass)
    data = {**ctl.restore_data(), "deadline": (dt_util.utcnow() - timedelta(seconds=5)).isoformat(), "state_since": "2020-01-01T00:00:00+00:00"}
    ctl.async_restore("pending", data)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    assert ctl.state_since > dt_util.parse_datetime("2020-01-02T00:00:00+00:00")


async def test_an_older_stored_state_without_the_time_loads_without_error(hass: HomeAssistant) -> None:
    entry = await setup_alarm(hass)
    ctl = entry.runtime_data.controller
    await ctl.async_arm("home", None, "Diego")
    await settle(hass)
    old = {k: v for k, v in ctl.restore_data().items() if k != "state_since"}
    ctl.state_since = None
    ctl.async_restore("armed_home", old)
    assert ctl.state_since is None and attrs(hass).get("state_since") is None and ctl.mode == "home"
