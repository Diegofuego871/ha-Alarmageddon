"""Mehrere Codes pro Person (0.5.0): "geändert von" mit dem Namen, Codes nie im Klartext, eindeutige Codes."""

from __future__ import annotations

import json

from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import Context, HomeAssistant
from homeassistant.exceptions import ServiceValidationError
import pytest

from custom_components.alarmageddon.code import hash_code

from .conftest import ALARM, setup_alarm
from .test_alarm import call, state

_id = iter(range(1, 1000))


async def _ws(client, **msg):
    await client.send_json({"id": next(_id), **msg})
    return await client.receive_json()


async def _with_codes(hass: HomeAssistant, hass_ws_client, main: bool = True):
    extra = {}
    if main:
        extra["code_hash"], extra["code_salt"] = hash_code("1234")
    entry = await setup_alarm(hass, exit_delay_away=0, **extra)
    client = await hass_ws_client(hass)
    return entry, client


async def test_personal_code_sets_changed_by(hass: HomeAssistant, hass_ws_client, hass_admin_user) -> None:
    entry, client = await _with_codes(hass, hass_ws_client)
    result = await _ws(client, type="alarmageddon/add_code", entry_id=entry.entry_id, name="Anna", code="5678")
    assert result["success"], result
    await hass.async_block_till_done()
    await call(hass, "alarm_arm_away")
    await call(hass, "alarm_disarm", code="5678")
    assert state(hass) == AlarmControlPanelState.DISARMED
    assert hass.states.get(ALARM).attributes["changed_by"] == "Anna"
    # Der Hauptcode gilt weiter
    await call(hass, "alarm_arm_away")
    await call(hass, "alarm_disarm", code="1234")
    assert state(hass) == AlarmControlPanelState.DISARMED


async def test_code_never_stored_or_returned_in_clear(hass: HomeAssistant, hass_ws_client) -> None:
    entry, client = await _with_codes(hass, hass_ws_client)
    await _ws(client, type="alarmageddon/add_code", entry_id=entry.entry_id, name="Anna", code="5678")
    await hass.async_block_till_done()
    assert "5678" not in json.dumps(dict(entry.options))
    data = await _ws(client, type="alarmageddon/data")
    system = data["result"]["systems"][0]
    assert system["codes"] == [{"id": system["codes"][0]["id"], "name": "Anna", "user_id": None}]
    assert "hash" not in json.dumps(data["result"]) and "salt" not in json.dumps(data["result"])
    assert system["main_code"] is True and system["has_code"] is True


async def test_add_code_validation(hass: HomeAssistant, hass_ws_client) -> None:
    entry, client = await _with_codes(hass, hass_ws_client)
    bad = await _ws(client, type="alarmageddon/add_code", entry_id=entry.entry_id, name="Anna", code="12a4")
    assert bad["error"]["code"] == "invalid_code_format"
    # Gleicher Code wie der Hauptcode: "geändert von" wäre nicht eindeutig
    same = await _ws(client, type="alarmageddon/add_code", entry_id=entry.entry_id, name="Anna", code="1234")
    assert same["error"]["code"] == "code_taken"
    ok = await _ws(client, type="alarmageddon/add_code", entry_id=entry.entry_id, name="Anna", code="5678")
    assert ok["success"]
    await hass.async_block_till_done()
    name = await _ws(client, type="alarmageddon/add_code", entry_id=entry.entry_id, name="anna", code="9999")
    assert name["error"]["code"] == "name_taken"


async def test_wrong_code_counts_for_lockout(hass: HomeAssistant, hass_ws_client) -> None:
    entry, client = await _with_codes(hass, hass_ws_client)
    await _ws(client, type="alarmageddon/add_code", entry_id=entry.entry_id, name="Anna", code="5678")
    await hass.async_block_till_done()
    await call(hass, "alarm_arm_away")
    for _ in range(5):
        with pytest.raises(ServiceValidationError):
            await call(hass, "alarm_disarm", code="0000")
    # Gesperrt: auch der richtige persönliche Code geht eine Minute nicht
    with pytest.raises(ServiceValidationError) as err:
        await call(hass, "alarm_disarm", code="5678")
    assert err.value.translation_key == "code_locked"
    assert state(hass) == AlarmControlPanelState.ARMED_AWAY


async def test_personal_code_without_main_code(hass: HomeAssistant, hass_ws_client) -> None:
    entry, client = await _with_codes(hass, hass_ws_client, main=False)
    await call(hass, "alarm_arm_away")
    await call(hass, "alarm_disarm")  # ohne Code geht es noch
    await _ws(client, type="alarmageddon/add_code", entry_id=entry.entry_id, name="Anna", code="5678")
    await hass.async_block_till_done()
    assert hass.states.get(ALARM).attributes["code_format"] == "number"
    await call(hass, "alarm_arm_away")
    with pytest.raises(ServiceValidationError):
        await call(hass, "alarm_disarm")
    await call(hass, "alarm_disarm", code="5678")
    assert state(hass) == AlarmControlPanelState.DISARMED


async def test_remove_code(hass: HomeAssistant, hass_ws_client) -> None:
    entry, client = await _with_codes(hass, hass_ws_client, main=False)
    added = await _ws(client, type="alarmageddon/add_code", entry_id=entry.entry_id, name="Anna", code="5678")
    await hass.async_block_till_done()
    hass.config_entries.async_update_entry(entry, options={**entry.options, "code_arm_required": True})
    await hass.async_block_till_done()
    removed = await _ws(client, type="alarmageddon/remove_code", entry_id=entry.entry_id, code_id=added["result"]["id"])
    assert removed["success"]
    await hass.async_block_till_done()
    assert entry.options["codes"] == []
    # Ohne jeden Code kann "Code zum Scharfschalten" nicht gelten
    assert entry.options["code_arm_required"] is False
    assert hass.states.get(ALARM).attributes["code_format"] is None


async def test_linked_user_name_without_code(hass: HomeAssistant, hass_ws_client, hass_admin_user) -> None:
    """Mit einem HA-Benutzer verknüpft: Schaltet dieser Benutzer ohne Code scharf, steht der Name der Person da."""
    entry, client = await _with_codes(hass, hass_ws_client, main=False)
    result = await _ws(client, type="alarmageddon/add_code", entry_id=entry.entry_id, name="Anna", code="5678", user_id=hass_admin_user.id)
    assert result["success"], result
    await hass.async_block_till_done()
    await hass.services.async_call("alarm_control_panel", "alarm_arm_away", {"entity_id": ALARM}, blocking=True,
                                   context=Context(user_id=hass_admin_user.id))
    await hass.async_block_till_done()
    assert hass.states.get(ALARM).attributes["changed_by"] == "Anna"
    # Derselbe Benutzer kann nicht zwei Codes haben
    again = await _ws(client, type="alarmageddon/add_code", entry_id=entry.entry_id, name="Bert", code="1357", user_id=hass_admin_user.id)
    assert again["error"]["code"] == "user_taken"


async def test_users_listed_for_linking(hass: HomeAssistant, hass_ws_client, hass_admin_user) -> None:
    entry, client = await _with_codes(hass, hass_ws_client)
    data = await _ws(client, type="alarmageddon/data")
    assert any(u["id"] == hass_admin_user.id for u in data["result"]["users"])
