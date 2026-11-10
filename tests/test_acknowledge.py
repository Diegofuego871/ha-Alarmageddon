"""Alarm quittieren (1.1.0): der Alarm endet, die Anlage bleibt scharf; per Push-Knopf und als Schritt im Ablauf."""

from __future__ import annotations

import pytest
from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import async_mock_service

from .conftest import FRONT_DOOR, WINDOW, setup_alarm
from .test_actions import PHONE, SIREN, _notify_settings, _phone, _setup_workflow
from .test_alarm import advance, call, state
from .test_sensor_options import open_sensor

SIREN_ON = {"type": "action", "action": "switch.turn_on", "target": [SIREN], "restore": True}
ACK = {"type": "acknowledge"}


async def _alarm(hass: HomeAssistant, steps: list[dict]):
    entry, services = await _setup_workflow(hass, steps)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await hass.async_block_till_done()
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    return entry, services


async def test_acknowledge_ends_the_alarm_and_stays_armed(hass: HomeAssistant) -> None:
    entry, services = await _alarm(hass, [SIREN_ON, {"type": "wait", "seconds": 300}])
    assert entry.runtime_data.controller.acknowledge("Anna") is True
    await hass.async_block_till_done()
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    assert entry.runtime_data.workflow.running is None
    assert len(services["switch.turn_off"]) == 1  # Gegenaktion wie beim Deaktivieren
    record = entry.runtime_data.recorder.recordings[0]
    assert record["end"] and record["ended_by"] == "Anna" and record["reason"] == "acknowledged"
    assert any(e["kind"] == "acknowledged" and e["by"] == "Anna" for e in record["entries"])
    assert entry.runtime_data.recorder.current is None


@pytest.mark.parametrize("service", ["alarm_disarm", None], ids=["deaktiviert", "scharf"])
async def test_acknowledge_without_alarm_does_nothing(hass: HomeAssistant, service) -> None:
    entry = await setup_alarm(hass)
    if service is None:
        await call(hass, "alarm_arm_home")
    before = state(hass)
    assert entry.runtime_data.controller.acknowledge("Anna") is False
    assert state(hass) == before


async def test_after_acknowledging_the_next_trigger_alarms_again(hass: HomeAssistant) -> None:
    entry, _ = await _alarm(hass, [])
    entry.runtime_data.controller.acknowledge()
    await hass.async_block_till_done()
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    await open_sensor(hass, WINDOW, "off")
    await open_sensor(hass, WINDOW)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    assert len(entry.runtime_data.recorder.recordings) == 2


async def test_acknowledging_a_manual_alarm_while_disarmed_ends_disarmed(hass: HomeAssistant) -> None:
    entry = await setup_alarm(hass)
    await call(hass, "alarm_trigger")
    assert entry.runtime_data.controller.acknowledge() is True
    assert state(hass) == AlarmControlPanelState.DISARMED


async def test_acknowledge_during_entry_delay_is_ignored(hass: HomeAssistant) -> None:
    """Pflichtfall: während der Verzögerung gibt es nichts zu quittieren; deaktivieren bleibt der Weg."""
    entry = await setup_alarm(hass, entry_delay=30)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, FRONT_DOOR)
    assert state(hass) == AlarmControlPanelState.PENDING
    assert entry.runtime_data.controller.acknowledge() is False
    assert state(hass) == AlarmControlPanelState.PENDING


async def test_step_acknowledge_ends_the_alarm_and_skips_the_rest(hass: HomeAssistant, freezer) -> None:
    entry, services = await _alarm(hass, [SIREN_ON, {"type": "wait", "seconds": 5}, ACK, {"type": "action", "action": "switch.turn_on", "target": ["switch.spaeter"]}])
    for _ in range(4):  # schrittweise, wie die Zeit wirklich vergeht (der Ablauf beginnt erst mit dem ersten Zeitschritt)
        await advance(hass, freezer, 3)
    await hass.async_block_till_done()
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    assert entry.runtime_data.workflow.running is None
    assert len(services["switch.turn_off"]) == 1
    assert [c.data["entity_id"] for c in services["switch.turn_on"]] == [[SIREN]]  # der Schritt danach lief nicht
    record = entry.runtime_data.recorder.recordings[0]
    assert record["reason"] == "acknowledged" and record["ended_by"]


async def test_step_acknowledge_in_a_test_changes_nothing(hass: HomeAssistant, hass_ws_client) -> None:
    entry = await setup_alarm(hass)
    await call(hass, "alarm_arm_home")
    await call(hass, "alarm_trigger")
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "alarmageddon/test_workflow", "entry_id": entry.entry_id, "trigger": "home", "step": ACK})
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    assert state(hass) == AlarmControlPanelState.TRIGGERED


async def test_end_message_says_acknowledged_and_replaces_the_alarm(hass: HomeAssistant, hass_ws_client) -> None:
    pushes = async_mock_service(hass, "notify", "handy")
    entry = await setup_alarm(hass)
    await _notify_settings(hass, hass_ws_client)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await hass.async_block_till_done()
    tag = pushes[0].data["data"]["tag"]
    entry.runtime_data.controller.acknowledge("Anna")
    await hass.async_block_till_done()
    assert pushes[-1].data["data"]["tag"] == tag
    assert "Acknowledged by Anna" in pushes[-1].data["message"] and "stays armed" in pushes[-1].data["message"]


async def test_push_button_acknowledge_follows_settings_and_sender(hass: HomeAssistant, hass_ws_client) -> None:
    """Knopf "Quittieren" (standardmässig an, abschaltbar): nur für Empfänger des Alarms, nur während des Alarms."""
    pushes = async_mock_service(hass, "notify", "handy")
    ctx = await _phone(hass)
    stranger = await _phone(hass, device="Fremd", user="Fremder")
    entry, _ = await _setup_workflow(hass, [])
    await _notify_settings(hass, hass_ws_client, alarm_targets=[PHONE], acknowledge_action=False)
    await call(hass, "alarm_arm_home")
    action = f"ALARMAGEDDON_ACK_{entry.entry_id}"
    # Aus: kein Knopf, ein alter Knopf wirkt nicht
    await open_sensor(hass, WINDOW)
    await hass.async_block_till_done()
    assert action not in [a["action"] for a in pushes[-1].data["data"]["actions"]] if pushes else True
    hass.bus.async_fire("mobile_app_notification_action", {"action": action}, context=ctx)
    await hass.async_block_till_done()
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    await call(hass, "alarm_disarm")
    await open_sensor(hass, WINDOW, "off")
    # An: der Knopf steht in der Meldung
    await _notify_settings(hass, hass_ws_client, alarm_targets=[PHONE], acknowledge_action=True)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW, "off")
    await open_sensor(hass, WINDOW)
    await hass.async_block_till_done()
    phone_push = async_mock_service(hass, "notify", "mobile_app_handy")
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    # Fremder Absender: nichts
    hass.bus.async_fire("mobile_app_notification_action", {"action": action}, context=stranger)
    await hass.async_block_till_done()
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    hass.bus.async_fire("mobile_app_notification_action", {"action": action}, context=ctx)
    await hass.async_block_till_done()
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    del phone_push
    # Alter Knopf bei scharfer Anlage: nichts
    hass.bus.async_fire("mobile_app_notification_action", {"action": action}, context=ctx)
    await hass.async_block_till_done()
    assert state(hass) == AlarmControlPanelState.ARMED_HOME


async def test_push_step_can_offer_the_acknowledge_button(hass: HomeAssistant, hass_ws_client) -> None:
    pushes = async_mock_service(hass, "notify", "handy")
    entry = await setup_alarm(hass, workflows={"home": [{"type": "notify", "buttons": {"acknowledge": True}}]})
    await _notify_settings(hass, hass_ws_client, acknowledge_action=False)  # global aus, der Schritt schaltet ihn ein
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await hass.async_block_till_done()
    assert [a["action"] for a in pushes[0].data["data"]["actions"]] == [f"ALARMAGEDDON_ACK_{entry.entry_id}", "ALARMAGEDDON_OPEN"]


async def test_panel_command_acknowledges_only_a_running_alarm(hass: HomeAssistant, hass_ws_client) -> None:
    entry = await setup_alarm(hass)
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "alarmageddon/acknowledge", "entry_id": entry.entry_id})
    result = await client.receive_json()
    assert not result["success"] and result["error"]["code"] == "not_triggered"
    await call(hass, "alarm_arm_home")
    await client.send_json({"id": 2, "type": "alarmageddon/acknowledge", "entry_id": entry.entry_id})
    assert not (await client.receive_json())["success"]  # scharf, aber kein Alarm
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    await open_sensor(hass, WINDOW)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    await client.send_json({"id": 3, "type": "alarmageddon/acknowledge", "entry_id": entry.entry_id})
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    record = entry.runtime_data.recorder.recordings[0]
    assert record["reason"] == "acknowledged" and record["ended_by"]
