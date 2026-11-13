"""1.32.0: Anlage im Panel löschen (Befehl delete_system): nur deaktiviert, nur mit dem eingetippten Namen, auf Wunsch mit Sicherung."""

from __future__ import annotations

from typing import Any

import pytest
from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.alarmageddon.const import DOMAIN

from .conftest import FRONT_DOOR, WINDOW, options, setup_alarm
from .test_alarm import advance, call, state
from .test_sensor_options import open_sensor

_ids = iter(range(1, 1000))


async def _ws(client, **msg: Any) -> dict[str, Any]:
    await client.send_json({"id": next(_ids), **msg})
    return await client.receive_json()


async def _delete(client, entry, name: str | None = None, **extra: Any) -> dict[str, Any]:
    return await _ws(client, type=f"{DOMAIN}/delete_system", entry_id=entry.entry_id, name=entry.title if name is None else name, **extra)


def _titles(hass: HomeAssistant) -> list[str]:
    return sorted(e.title for e in hass.config_entries.async_entries(DOMAIN))


async def test_delete_disarmed_system(hass: HomeAssistant, hass_ws_client) -> None:
    entry = await setup_alarm(hass)
    other = MockConfigEntry(domain=DOMAIN, title="Garage", data={"name": "Garage"}, options=options(zone_home=[], zone_away=[], entry_sensors=[]))
    other.add_to_hass(hass)
    assert await hass.config_entries.async_setup(other.entry_id)
    await hass.async_block_till_done()
    client = await hass_ws_client(hass)
    result = await _delete(client, entry)
    assert result["success"], result
    await hass.async_block_till_done()
    assert hass.config_entries.async_get_entry(entry.entry_id) is None
    assert hass.states.get("alarm_control_panel.haus") is None
    # Die andere Anlage läuft unverändert weiter
    assert _titles(hass) == ["Garage"] and hass.states.get("alarm_control_panel.garage") is not None
    assert state(hass, "alarm_control_panel.garage") == AlarmControlPanelState.DISARMED


async def test_delete_the_last_system(hass: HomeAssistant, hass_ws_client) -> None:
    entry = await setup_alarm(hass)
    client = await hass_ws_client(hass)
    assert (await _delete(client, entry))["success"]
    await hass.async_block_till_done()
    assert _titles(hass) == [] and hass.states.get("alarm_control_panel.haus") is None


@pytest.mark.parametrize("typed", ["", "haus", "HAUS", "Haus 2", "Hau", "Garage"])
async def test_delete_needs_the_exact_name(hass: HomeAssistant, hass_ws_client, typed: str) -> None:
    entry = await setup_alarm(hass)
    client = await hass_ws_client(hass)
    result = await _delete(client, entry, typed)
    assert result["success"] is False and result["error"]["code"] == "name_mismatch", result
    assert _titles(hass) == ["Haus"] and state(hass) == AlarmControlPanelState.DISARMED


async def test_delete_ignores_extra_spaces_in_the_name(hass: HomeAssistant, hass_ws_client) -> None:
    entry = await setup_alarm(hass, "Ferien Haus")
    client = await hass_ws_client(hass)
    assert (await _delete(client, entry, "  Ferien   Haus "))["success"]


async def _make(hass: HomeAssistant, freezer, wanted: str) -> None:
    """Die Anlage "Haus" in den gewünschten Zustand bringen."""
    if wanted == "armed_home":
        await call(hass, "alarm_arm_home")
    elif wanted == "armed_away":
        await call(hass, "alarm_arm_away")
        await advance(hass, freezer, 31)
    elif wanted == "arming":
        await call(hass, "alarm_arm_away")
    elif wanted == "pending":
        await call(hass, "alarm_arm_away")
        await advance(hass, freezer, 31)
        await open_sensor(hass, FRONT_DOOR)
    elif wanted == "triggered":
        await call(hass, "alarm_arm_home")
        await open_sensor(hass, WINDOW)
    assert state(hass) == wanted


@pytest.mark.parametrize("wanted", ["armed_home", "armed_away", "arming", "pending", "triggered"])
async def test_delete_refused_unless_disarmed(hass: HomeAssistant, hass_ws_client, freezer, wanted: str) -> None:
    """Eine scharfe Anlage, eine in der Verzögerung und eine im Alarm verschwindet nie still: erst deaktivieren."""
    entry = await setup_alarm(hass)
    client = await hass_ws_client(hass)
    await _make(hass, freezer, wanted)
    result = await _delete(client, entry)
    assert result["success"] is False and result["error"]["code"] == "not_disarmed", result
    assert _titles(hass) == ["Haus"] and state(hass) == wanted
    # Deaktiviert, dann geht es
    await call(hass, "alarm_disarm")
    assert (await _delete(client, entry))["success"]


async def test_delete_with_backup(hass: HomeAssistant, hass_ws_client) -> None:
    entry = await setup_alarm(hass)
    client = await hass_ws_client(hass)
    assert (await _ws(client, type=f"{DOMAIN}/backups"))["result"]["backups"] == []
    assert (await _delete(client, entry, backup_name="Vor dem Löschen: Haus"))["success"]
    await hass.async_block_till_done()
    backups = (await _ws(client, type=f"{DOMAIN}/backups"))["result"]["backups"]
    assert [b["name"] for b in backups] == ["Vor dem Löschen: Haus"]
    assert _titles(hass) == []
    # Die Sicherung enthält die Anlage samt Einstellungen (Zonen), damit sich eine neu angelegte gleichen Namens wiederherstellen lässt
    full = (await _ws(client, type=f"{DOMAIN}/backup_get", backup_id=backups[0]["id"]))["result"]
    assert [s["title"] for s in full["systems"]] == ["Haus"]


async def test_delete_without_backup_creates_none(hass: HomeAssistant, hass_ws_client) -> None:
    entry = await setup_alarm(hass)
    client = await hass_ws_client(hass)
    assert (await _delete(client, entry))["success"]
    assert (await _ws(client, type=f"{DOMAIN}/backups"))["result"]["backups"] == []


async def test_failed_delete_makes_no_backup(hass: HomeAssistant, hass_ws_client) -> None:
    """Ein abgelehntes Löschen (falscher Name, nicht deaktiviert) hinterlässt keine Sicherung."""
    entry = await setup_alarm(hass)
    client = await hass_ws_client(hass)
    result = await _delete(client, entry, "falsch", backup_name="x")
    assert result["success"] is False
    await call(hass, "alarm_arm_home")
    result = await _delete(client, entry, backup_name="x")
    assert result["success"] is False
    assert (await _ws(client, type=f"{DOMAIN}/backups"))["result"]["backups"] == []


async def test_recreated_system_gets_its_settings_back(hass: HomeAssistant, hass_ws_client) -> None:
    """Gelöscht, mit gleichem Namen neu angelegt, Sicherung wiederhergestellt: Zonen und Verzögerungen sind wieder da."""
    entry = await setup_alarm(hass)
    client = await hass_ws_client(hass)
    assert (await _delete(client, entry, backup_name="Sicherung"))["success"]
    await hass.async_block_till_done()
    created = await _ws(client, type=f"{DOMAIN}/create_system", name="Haus")
    assert created["success"]
    await hass.async_block_till_done()
    fresh = hass.config_entries.async_get_entry(created["result"]["entry_id"])
    assert fresh.options["zone_home"] == []
    backups = (await _ws(client, type=f"{DOMAIN}/backups"))["result"]["backups"]
    full = (await _ws(client, type=f"{DOMAIN}/backup_get", backup_id=backups[0]["id"]))["result"]
    restored = await _ws(client, type=f"{DOMAIN}/import", data=full)
    assert restored["success"], restored
    await hass.async_block_till_done()
    assert fresh.options["zone_home"] == [FRONT_DOOR, WINDOW] and fresh.options["entry_sensors"] == [FRONT_DOOR]
