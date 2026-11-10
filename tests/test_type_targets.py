"""Eigene Empfänger je Meldungsart (1.5.0): Standard sind die Empfänger der Gruppe oben, die Art oder der Modus kann sie ersetzen."""

from __future__ import annotations

import pytest
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import async_mock_service

from custom_components.alarmageddon.const import DATA_SETTINGS
from custom_components.alarmageddon.settings import valid_notify

from .conftest import setup_alarm
from .test_actions import _notify_settings
from .test_alarm import call
from .test_maintenance import BAT_WINDOW, _setup


async def _services(hass: HomeAssistant) -> dict[str, list]:
    return {name: async_mock_service(hass, "notify", name) for name in ("handy", "tablet", "partner")}


async def test_default_uses_the_group_recipients(hass: HomeAssistant, hass_ws_client) -> None:
    svc = await _services(hass)
    await setup_alarm(hass, exit_delay_away=0)
    await _notify_settings(hass, hass_ws_client, alarm_targets=["notify.handy"], types={"armed": {"enabled": True}})
    await call(hass, "alarm_arm_home")
    await hass.async_block_till_done()
    assert len(svc["handy"]) == 1 and not svc["partner"]


async def test_type_with_own_recipients_replaces_the_group(hass: HomeAssistant, hass_ws_client) -> None:
    svc = await _services(hass)
    await setup_alarm(hass)
    await _notify_settings(hass, hass_ws_client, alarm_targets=["notify.handy"], types={"armed": {"enabled": True, "targets": ["notify.partner"]}})
    await call(hass, "alarm_arm_home")
    await hass.async_block_till_done()
    assert len(svc["partner"]) == 1 and not svc["handy"]
    # Zurück zum Standard: leere Liste
    await _notify_settings(hass, hass_ws_client, alarm_targets=["notify.handy"], types={"armed": {"targets": []}})
    await call(hass, "alarm_disarm")
    await call(hass, "alarm_arm_home")
    await hass.async_block_till_done()
    assert len(svc["handy"]) == 1


async def test_mode_value_beats_type_and_group(hass: HomeAssistant, hass_ws_client) -> None:
    svc = await _services(hass)
    await setup_alarm(hass, exit_delay_away=0)
    await _notify_settings(
        hass, hass_ws_client, alarm_targets=["notify.handy"], per_mode=True,
        types={"sensor_report": {"enabled": True, "targets": ["notify.partner"]}},
        modes={"home": {"sensor_report": {"targets": ["notify.tablet"]}}},
    )
    notifier = hass.config_entries.async_entries("alarmageddon")[0].runtime_data.notifier
    assert notifier._targets("sensor_report", "home") == ["notify.tablet"]
    assert notifier._targets("sensor_report", "away") == ["notify.partner"]  # Modus ohne eigenen Wert: die Art
    assert notifier._targets("pending", "away") == ["notify.handy"]  # Art ohne eigenen Wert: die Gruppe
    del svc


async def test_per_mode_targets_ignored_when_switched_off(hass: HomeAssistant, hass_ws_client) -> None:
    await setup_alarm(hass)
    await _notify_settings(hass, hass_ws_client, alarm_targets=["notify.handy"], per_mode=False, modes={"home": {"sensor_report": {"targets": ["notify.tablet"]}}})
    notifier = hass.config_entries.async_entries("alarmageddon")[0].runtime_data.notifier
    assert notifier._targets("sensor_report", "home") == ["notify.handy"]


async def test_test_message_goes_to_the_own_recipients(hass: HomeAssistant, hass_ws_client) -> None:
    svc = await _services(hass)
    await setup_alarm(hass)
    await _notify_settings(hass, hass_ws_client, alarm_targets=["notify.handy"], types={"armed": {"targets": ["notify.partner"]}})
    notifier = hass.config_entries.async_entries("alarmageddon")[0].runtime_data.notifier
    assert notifier.send_test("armed") == ["notify.partner"]
    await hass.async_block_till_done()
    assert len(svc["partner"]) == 1 and not svc["handy"]


async def test_maintenance_kind_with_own_recipients(hass: HomeAssistant) -> None:
    """Batterie schwach mit eigenen Empfängern geht dorthin, nicht an die Wartungs-Empfänger der Gruppe."""
    pushes, maint = await _setup(hass)  # Gruppe: notify.tablet
    other = async_mock_service(hass, "notify", "partner")
    settings = hass.data[DATA_SETTINGS]
    types = {**settings.notify["types"], "battery_low": {**settings.notify["types"]["battery_low"], "targets": ["notify.partner"]}}
    await settings.async_set_notify({**settings.notify, "types": types})
    hass.states.async_set(BAT_WINDOW, "12")
    found = maint.async_check()
    assert [k for k, _s, _v in found] == ["battery"]
    assert len(other) == 1 and not pushes
    # Gemeldet wird nur einmal
    assert maint.async_check() == [] and len(other) == 1


async def test_type_targets_in_backup_and_validation() -> None:
    cfg = valid_notify({"types": {"armed": {"targets": ["notify.a", "notify.a", "light.x", "notify.b"]}}, "per_mode": True,
                        "modes": {"home": {"sensor_report": {"targets": ["notify.c", 5]}}}})
    assert cfg["types"]["armed"]["targets"] == ["notify.a", "notify.b"]
    assert cfg["modes"]["home"]["sensor_report"]["targets"] == ["notify.c"]
    assert valid_notify({"types": {"armed": {"targets": "notify.a"}}})["types"]["armed"]["targets"] == []


@pytest.mark.parametrize("bad", [["light.x"], ["notify.Gross"], [f"notify.x{i}" for i in range(21)], "notify.a"])
async def test_websocket_rejects_invalid_targets(hass: HomeAssistant, hass_ws_client, bad) -> None:
    await setup_alarm(hass)
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "alarmageddon/save_notify", "notify": {"types": {"armed": {"targets": bad}}}})
    assert not (await client.receive_json())["success"]
