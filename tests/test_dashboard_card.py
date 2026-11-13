"""
Server-Teil der Dashboard-Karten (1.34.0): Dienst "alarmageddon.acknowledge" für jeden Nutzer, Einstellung "Quittieren verlangt den Code",
Status-Sensor der Anlage. Die Karten selbst laufen im Browser (tests/panel/suites/card-e2e.mjs).
"""

from __future__ import annotations

import pytest
from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import Context, HomeAssistant
from homeassistant.exceptions import ServiceValidationError

from custom_components.alarmageddon.code import hash_code

from .conftest import ALARM, FRONT_DOOR, WINDOW, setup_alarm
from .test_alarm import call, open_sensor, state

STATUS = "sensor.haus_status"


async def _alarm(hass: HomeAssistant, **options):
    entry = await setup_alarm(hass, exit_delay_away=0, **options)
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, WINDOW)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    return entry


async def _ack(hass: HomeAssistant, user_id: str | None = None, **data) -> None:
    await hass.services.async_call("alarmageddon", "acknowledge", {"entity_id": ALARM, **data}, blocking=True, context=Context(user_id=user_id))
    await hass.async_block_till_done()


async def test_any_user_can_acknowledge_without_a_code_by_default(hass: HomeAssistant) -> None:
    entry = await _alarm(hass)
    user = await hass.auth.async_create_user("Mia", group_ids=["system-users"])  # normaler Nutzer, kein Administrator
    await _ack(hass, user.id)
    assert state(hass) == AlarmControlPanelState.ARMED_AWAY
    assert entry.runtime_data.controller.changed_by == "Mia"


async def test_acknowledge_without_alarm_is_refused(hass: HomeAssistant) -> None:
    await setup_alarm(hass)
    with pytest.raises(ServiceValidationError) as err:
        await _ack(hass)
    assert err.value.translation_key == "not_triggered"


async def test_acknowledge_asks_for_the_code_when_the_administrator_switched_it_on(hass: HomeAssistant) -> None:
    code_hash, salt = hash_code("1234")
    await _alarm(hass, code_hash=code_hash, code_salt=salt, code_ack_required=True)
    for data, key in (({}, "invalid_code"), ({"code": "9999"}, "invalid_code")):
        with pytest.raises(ServiceValidationError) as err:
            await _ack(hass, **data)
        assert err.value.translation_key == key
        assert state(hass) == AlarmControlPanelState.TRIGGERED
    await _ack(hass, code="1234")
    assert state(hass) == AlarmControlPanelState.ARMED_AWAY


async def test_acknowledge_locks_after_wrong_codes_like_disarming(hass: HomeAssistant) -> None:
    code_hash, salt = hash_code("1234")
    await _alarm(hass, code_hash=code_hash, code_salt=salt, code_ack_required=True)
    for _ in range(5):
        with pytest.raises(ServiceValidationError):
            await _ack(hass, code="0000")
    with pytest.raises(ServiceValidationError) as err:
        await _ack(hass, code="1234")  # auch der richtige Code gilt während der Sperre nicht
    assert err.value.translation_key == "code_locked"
    assert state(hass) == AlarmControlPanelState.TRIGGERED


async def test_the_setting_needs_a_code_to_take_effect(hass: HomeAssistant) -> None:
    """Ohne Code gibt es nichts zu verlangen: die Einstellung bleibt ohne Wirkung, Quittieren geht ohne."""
    await _alarm(hass, code_ack_required=True)
    await _ack(hass)
    assert state(hass) == AlarmControlPanelState.ARMED_AWAY


async def test_acknowledge_with_the_code_of_a_person_names_the_person(hass: HomeAssistant, hass_ws_client) -> None:
    code_hash, salt = hash_code("1234")
    entry = await setup_alarm(hass, exit_delay_away=0, code_hash=code_hash, code_salt=salt, code_ack_required=True)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "alarmageddon/add_code", "entry_id": entry.entry_id, "name": "Anna", "code": "5678"})
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    await call(hass, "alarm_arm_away", code="1234")
    await open_sensor(hass, WINDOW)
    await _ack(hass, code="5678")
    assert entry.runtime_data.controller.changed_by == "Anna"


async def test_websocket_saves_the_setting_only_with_a_code_and_removing_the_code_resets_it(hass: HomeAssistant, hass_ws_client) -> None:
    entry = await setup_alarm(hass)
    client = await hass_ws_client(hass)

    async def ws(**msg):
        await client.send_json_auto_id(msg)
        return await client.receive_json()

    refused = await ws(type="alarmageddon/save_system", entry_id=entry.entry_id, code_ack_required=True)
    assert not refused["success"] and refused["error"]["code"] == "code_missing"
    added = await ws(type="alarmageddon/add_code", entry_id=entry.entry_id, name="Anna", code="5678")
    assert added["success"]
    await hass.async_block_till_done()
    saved = await ws(type="alarmageddon/save_system", entry_id=entry.entry_id, code_ack_required=True)
    assert saved["success"]
    await hass.async_block_till_done()
    data = await ws(type="alarmageddon/data")
    assert data["result"]["systems"][0]["code_ack_required"] is True
    code_id = data["result"]["systems"][0]["codes"][0]["id"]
    assert (await ws(type="alarmageddon/remove_code", entry_id=entry.entry_id, code_id=code_id))["success"]
    await hass.async_block_till_done()
    data = await ws(type="alarmageddon/data")
    assert data["result"]["systems"][0]["code_ack_required"] is False
    assert not hass.config_entries.async_get_entry(entry.entry_id).options.get("code_ack_required")


async def test_status_sensor_counts_alarm_offline_sensors_and_weak_batteries(hass: HomeAssistant) -> None:
    await setup_alarm(hass, exit_delay_away=0)
    assert hass.states.get(STATUS).state == "0"
    assert hass.states.get(STATUS).attributes["offline"] == []
    hass.states.async_set(FRONT_DOOR, "unavailable")
    await hass.async_block_till_done()
    st = hass.states.get(STATUS)
    assert st.state == "1" and st.attributes["offline"] == [FRONT_DOOR] and st.attributes["alarm"] is False
    hass.states.async_set(FRONT_DOOR, "off")
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, WINDOW)
    st = hass.states.get(STATUS)
    assert st.state == "1" and st.attributes["alarm"] is True
    await call(hass, "alarm_disarm")
    assert hass.states.get(STATUS).state == "0"


async def test_status_sensor_lists_weak_batteries_with_the_threshold_of_the_maintenance(hass: HomeAssistant) -> None:
    from .test_maintenance import BAT_WINDOW, _device

    _device(hass, WINDOW, BAT_WINDOW)
    hass.states.async_set(BAT_WINDOW, "80")
    await setup_alarm(hass)
    assert hass.states.get(STATUS).state == "0"
    hass.states.async_set(BAT_WINDOW, "12")
    await hass.async_block_till_done()
    st = hass.states.get(STATUS)
    assert st.state == "1" and st.attributes["low_battery"] == [{"entity_id": WINDOW, "battery": 12}] and st.attributes["battery_threshold"] == 20
    hass.states.async_set(BAT_WINDOW, "unavailable")  # ohne Wert keine Warnung
    await hass.async_block_till_done()
    assert hass.states.get(STATUS).state == "0"


async def test_acknowledge_is_refused_when_the_alarm_ended_during_the_code_check(hass: HomeAssistant, monkeypatch) -> None:
    """Die Code-Prüfung läuft im Hintergrund: ist der Alarm währenddessen vorbei, wird nichts mehr quittiert."""
    code_hash, salt = hash_code("1234")
    entry = await _alarm(hass, code_hash=code_hash, code_salt=salt, code_ack_required=True)
    ctl = entry.runtime_data.controller
    original = ctl._async_check_code

    async def check_then_end(code):
        result = await original(code)
        await ctl.async_disarm(None, skip_code=True)
        return result

    monkeypatch.setattr(ctl, "_async_check_code", check_then_end)
    with pytest.raises(ServiceValidationError) as err:
        await _ack(hass, code="1234")
    assert err.value.translation_key == "not_triggered"
    assert state(hass) == AlarmControlPanelState.DISARMED


async def test_the_card_module_is_registered_for_the_frontend_and_served(hass: HomeAssistant, hass_client_no_auth) -> None:
    from custom_components.alarmageddon.panel import CARD_URL

    hass.data["frontend_extra_module_url"] = set()  # die Ablage, die das Frontend von HA anlegt
    await setup_alarm(hass)
    assert CARD_URL in hass.data["frontend_extra_module_url"] and CARD_URL.startswith("/alarmageddon_panel/card.js?v=")


async def test_a_failing_card_registration_never_stops_the_alarm_system_or_the_panel(hass: HomeAssistant, monkeypatch, caplog) -> None:
    def broken(_hass, _url):
        raise RuntimeError("boom")

    monkeypatch.setattr("custom_components.alarmageddon.panel.frontend.add_extra_js_url", broken)
    await setup_alarm(hass)
    assert state(hass) == AlarmControlPanelState.DISARMED
    assert hass.data.get("alarmageddon_panel_registered") is True
    assert "The dashboard cards could not be registered" in caplog.text
