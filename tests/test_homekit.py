"""
HomeKit-Bridge: Jede Anlage muss sich in Apple Home steuern lassen (Vorgabe des Nutzers).

Nutzt das echte Zubehör `SecuritySystem` der HomeKit-Bridge von HA, nicht
einen Nachbau. Braucht die Pakete der Bridge (requirements_test.txt);
fehlen sie, überspringt sich der Test.
"""

from __future__ import annotations

from unittest.mock import patch

import pytest
from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import HomeAssistant

from custom_components.alarmageddon.code import hash_code

from .conftest import ALARM, FRONT_DOOR, WINDOW, setup_alarm
from .test_alarm import call, open_sensor, state

pytest.importorskip("pyhap")
pytest.importorskip("turbojpeg")

# Werte von HomeKit (Security System, HAP-Spezifikation)
HK_STAY, HK_AWAY, HK_NIGHT, HK_DISARMED, HK_TRIGGERED = 0, 1, 2, 3, 4


@pytest.fixture
async def hk_driver(hass: HomeAssistant):
    from homeassistant.components.homekit.accessories import HomeDriver
    from homeassistant.components.homekit.iidmanager import AccessoryIIDStorage

    iid_storage = AccessoryIIDStorage(hass, "test")
    await iid_storage.async_initialize()

    with (
        patch("pyhap.accessory_driver.AsyncZeroconf"),
        patch("pyhap.accessory_driver.AccessoryEncoder"),
        patch("pyhap.accessory_driver.HAPServer.async_stop"),
        patch("pyhap.accessory_driver.HAPServer.async_start"),
        patch("pyhap.accessory_driver.AccessoryDriver.publish"),
        patch("pyhap.accessory_driver.AccessoryDriver.persist"),
    ):
        yield HomeDriver(
            hass,
            pincode=b"123-45-678",
            entry_id="",
            entry_title="mock entry",
            bridge_name="mock bridge",
            iid_storage=iid_storage,
            address="127.0.0.1",
            loop=hass.loop,
        )


async def _accessory(hass: HomeAssistant, driver, config: dict | None = None):
    from homeassistant.components.homekit.type_security_systems import SecuritySystem

    acc = SecuritySystem(hass, driver, "Haus", ALARM, 2, config or {})
    acc.run()
    await hass.async_block_till_done()
    return acc


def _valid(char) -> set[int]:
    return set(char.properties["ValidValues"].values())


async def _set_from_homekit(hass: HomeAssistant, acc, value: int) -> None:
    acc.char_target_state.client_update_value(value)
    await hass.async_block_till_done()


async def test_modes_offered_in_apple_home(hass: HomeAssistant, hk_driver) -> None:
    await setup_alarm(hass)
    acc = await _accessory(hass, hk_driver)
    # Ohne "Nacht" bietet Apple Home nur Zuhause, Abwesend und Aus an
    assert _valid(acc.char_target_state) == {HK_STAY, HK_AWAY, HK_DISARMED}


async def test_night_offered_when_enabled(hass: HomeAssistant, hk_driver) -> None:
    await setup_alarm(hass, night_enabled=True)
    acc = await _accessory(hass, hk_driver)
    assert _valid(acc.char_target_state) == {HK_STAY, HK_AWAY, HK_NIGHT, HK_DISARMED}


async def test_only_chosen_modes_in_apple_home(hass: HomeAssistant, hk_driver) -> None:
    """Modi frei wählbar (0.6.0): Apple Home bietet nur die eingeschalteten an."""
    await setup_alarm(hass, home_enabled=False, night_enabled=True)
    acc = await _accessory(hass, hk_driver)
    assert _valid(acc.char_target_state) == {HK_AWAY, HK_NIGHT, HK_DISARMED}


async def test_scheduled_arm_shows_in_apple_home(hass: HomeAssistant, hk_driver) -> None:
    """Vom Zeitplan scharf geschaltet: Apple Home zeigt denselben Zustand."""
    entry = await setup_alarm(hass, exit_delay_away=0)
    acc = await _accessory(hass, hk_driver)
    from custom_components.alarmageddon.scheduler import Scheduler

    await Scheduler(hass, entry, entry.runtime_data.controller).async_run("away")
    await hass.async_block_till_done()
    await hass.async_block_till_done()
    assert acc.char_current_state.value == HK_AWAY


async def test_control_from_apple_home(hass: HomeAssistant, hk_driver) -> None:
    await setup_alarm(hass, exit_delay_away=0, night_enabled=True)
    acc = await _accessory(hass, hk_driver)
    for value, expected in (
        (HK_STAY, AlarmControlPanelState.ARMED_HOME),
        (HK_DISARMED, AlarmControlPanelState.DISARMED),
        (HK_AWAY, AlarmControlPanelState.ARMED_AWAY),
        (HK_DISARMED, AlarmControlPanelState.DISARMED),
        (HK_NIGHT, AlarmControlPanelState.ARMED_NIGHT),
    ):
        await _set_from_homekit(hass, acc, value)
        assert state(hass) == expected
        assert acc.char_current_state.value == value


async def test_states_shown_in_apple_home(hass: HomeAssistant, hk_driver) -> None:
    """Eingangsverzögerung kennt HomeKit nicht: Apple Home zeigt weiter "scharf", dann "Alarm"."""
    await setup_alarm(hass)
    acc = await _accessory(hass, hk_driver)
    await call(hass, "alarm_arm_home")
    assert acc.char_current_state.value == HK_STAY
    await open_sensor(hass, FRONT_DOOR)
    assert state(hass) == AlarmControlPanelState.PENDING
    assert acc.char_current_state.value == HK_STAY
    await open_sensor(hass, WINDOW)
    await hass.async_block_till_done()  # Die Bridge übernimmt den Zustand eine Runde später
    assert acc.char_current_state.value == HK_TRIGGERED
    await _set_from_homekit(hass, acc, HK_DISARMED)
    assert acc.char_current_state.value == HK_DISARMED


async def test_exit_delay_shown_as_away_target(hass: HomeAssistant, hk_driver) -> None:
    """Während der Ausgangsverzögerung zeigt Apple Home "Aus" mit Ziel "Abwesend" (Verhalten der Bridge)."""
    await setup_alarm(hass)
    acc = await _accessory(hass, hk_driver)
    await _set_from_homekit(hass, acc, HK_AWAY)
    assert state(hass) == AlarmControlPanelState.ARMING
    assert acc.char_current_state.value == HK_DISARMED
    assert acc.char_target_state.value == HK_AWAY


async def test_code_from_homekit_config(hass: HomeAssistant, hk_driver) -> None:
    """Mit Code: HomeKit schickt den Code aus seiner Konfiguration (entity_config → code)."""
    code_hash, salt = hash_code("1234")
    await setup_alarm(hass, code_hash=code_hash, code_salt=salt)
    acc = await _accessory(hass, hk_driver, {"code": "1234"})
    await _set_from_homekit(hass, acc, HK_STAY)
    await _set_from_homekit(hass, acc, HK_DISARMED)
    assert state(hass) == AlarmControlPanelState.DISARMED


async def test_code_without_homekit_config_refuses_disarm(hass: HomeAssistant, hk_driver) -> None:
    """Ohne Code in HomeKit und ohne Standardcode lässt sich die Anlage aus Apple Home nicht deaktivieren."""
    code_hash, salt = hash_code("1234")
    await setup_alarm(hass, code_hash=code_hash, code_salt=salt)
    acc = await _accessory(hass, hk_driver)
    await _set_from_homekit(hass, acc, HK_STAY)
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    await _set_from_homekit(hass, acc, HK_DISARMED)
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
