"""Eigene Empfänger je Meldung (1.1.0): Schritt "Push-Meldung" und "Alarm endet" können von den Alarm-Empfängern abweichen."""

from __future__ import annotations

import pytest
from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import async_mock_service

from .conftest import ALARM, WINDOW, setup_alarm
from .test_actions import PHONE, _notify_settings, _phone
from .test_alarm import call, open_sensor, state

STEP = {"type": "notify", "targets": ["notify.nur_diese"]}


async def _services(hass: HomeAssistant) -> dict[str, list]:
    return {name: async_mock_service(hass, "notify", name) for name in ("handy", "nur_diese", "zweite")}


async def test_step_with_own_recipients_replaces_the_global_ones(hass: HomeAssistant, hass_ws_client) -> None:
    svc = await _services(hass)
    await setup_alarm(hass, workflows={"home": [STEP]})
    await _notify_settings(hass, hass_ws_client)  # global: notify.handy
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await hass.async_block_till_done()
    assert len(svc["nur_diese"]) == 1 and not svc["handy"]


@pytest.mark.parametrize("step", [{"type": "notify"}, {"type": "notify", "targets": []}])
async def test_step_without_or_with_empty_recipients_uses_the_global_ones(hass: HomeAssistant, hass_ws_client, step: dict) -> None:
    svc = await _services(hass)
    await setup_alarm(hass, workflows={"home": [step]})
    await _notify_settings(hass, hass_ws_client)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await hass.async_block_till_done()
    assert len(svc["handy"]) == 1 and not svc["nur_diese"]


async def test_several_own_recipients_all_get_the_message(hass: HomeAssistant, hass_ws_client) -> None:
    svc = await _services(hass)
    await setup_alarm(hass, workflows={"home": [{"type": "notify", "targets": ["notify.nur_diese", "notify.zweite"]}]})
    await _notify_settings(hass, hass_ws_client)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await hass.async_block_till_done()
    assert len(svc["nur_diese"]) == 1 and len(svc["zweite"]) == 1 and not svc["handy"]


async def test_alarm_end_message_can_have_own_recipients(hass: HomeAssistant, hass_ws_client) -> None:
    svc = await _services(hass)
    await setup_alarm(hass, workflow_end={"home": {"notify": {"enabled": True, "targets": ["notify.zweite"]}}})
    await _notify_settings(hass, hass_ws_client)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await hass.async_block_till_done()
    svc["handy"].clear()
    await call(hass, "alarm_disarm")
    await hass.async_block_till_done()
    assert len(svc["zweite"]) == 1 and not svc["handy"]


async def test_only_notify_services_are_accepted_as_own_recipients(hass: HomeAssistant, hass_ws_client) -> None:
    await setup_alarm(hass)
    entry = hass.config_entries.async_entries("alarmageddon")[0]
    client = await hass_ws_client(hass)
    for targets in (["switch.sirene"], ["notify"], ["notify.Gross"], [""], ["notify.a"] * 21, "notify.handy", [1]):
        await client.send_json({"id": 1, "type": "alarmageddon/save_workflows", "entry_id": entry.entry_id, "workflows": {"home": [{"type": "notify", "targets": targets}]}, "workflow_end": {}})
        assert not (await client.receive_json())["success"], targets
    await client.send_json({"id": 2, "type": "alarmageddon/save_workflows", "entry_id": entry.entry_id, "workflows": {"home": [{"type": "notify", "targets": ["notify.nur_diese"]}]}, "workflow_end": {}})
    assert (await client.receive_json())["success"]
    await client.send_json({"id": 3, "type": "alarmageddon/test_end_notify", "entry_id": entry.entry_id, "notify": {"enabled": True, "targets": ["switch.x"]}})
    assert not (await client.receive_json())["success"]


async def test_buttons_work_from_the_own_recipients_of_a_step(hass: HomeAssistant, hass_ws_client) -> None:
    """Die Knöpfe der Meldung gelten auch für die eigenen Empfänger des Schritts, nicht nur für die globalen."""
    own = await _phone(hass)  # notify.mobile_app_handy: nur im Schritt eingetragen
    stranger = await _phone(hass, device="Tablet", user="Gast")
    entry = await setup_alarm(hass, workflows={"home": [{"type": "notify", "targets": [PHONE], "buttons": {"disarm": True}}]})
    await _notify_settings(hass, hass_ws_client, disarm_action=True)  # globale Empfänger: notify.handy (kein Telefon)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await hass.async_block_till_done()
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    action = f"ALARMAGEDDON_DISARM_{entry.entry_id}"
    hass.bus.async_fire("mobile_app_notification_action", {"action": action}, context=stranger)
    await hass.async_block_till_done()
    assert hass.states.get(ALARM).state == AlarmControlPanelState.TRIGGERED
    hass.bus.async_fire("mobile_app_notification_action", {"action": action}, context=own)
    await hass.async_block_till_done()
    assert hass.states.get(ALARM).state == AlarmControlPanelState.DISARMED
