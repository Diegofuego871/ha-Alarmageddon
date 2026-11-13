"""1.33.0: Wiederherstellen ordnet Anlagen nicht mehr nur über den Namen zu: je Anlage der Sicherung wählt man das Ziel."""

from __future__ import annotations

from typing import Any

import pytest
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.alarmageddon.const import DATA_SETTINGS, DOMAIN

from .conftest import FRONT_DOOR, MOTION, WINDOW, options, setup_alarm
from .test_backup import WORKFLOW

_id = iter(range(1, 1000))


async def _ws(client, **msg: Any) -> dict[str, Any]:
    await client.send_json({"id": next(_id), **msg})
    return await client.receive_json()


async def _garage(hass: HomeAssistant, title: str = "Garage") -> MockConfigEntry:
    entry = MockConfigEntry(domain=DOMAIN, title=title, data={"name": title}, options=options(zone_home=[], zone_away=[], entry_sensors=[], entry_delay=5))
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def _backup(hass: HomeAssistant, client) -> dict[str, Any]:
    return (await _ws(client, type=f"{DOMAIN}/export"))["result"]


def _titles(hass: HomeAssistant) -> list[str]:
    return sorted(e.title for e in hass.config_entries.async_entries(DOMAIN))


async def test_plan_lists_the_systems_of_the_backup_and_the_possible_targets(hass: HomeAssistant, hass_ws_client) -> None:
    haus = await setup_alarm(hass, workflows=WORKFLOW)
    garage = await _garage(hass)
    client = await hass_ws_client(hass)
    data = await _backup(hass, client)
    data["systems"].append({"title": "Ferienhaus", "options": {}})
    plan = (await _ws(client, type=f"{DOMAIN}/import", data=data, dry_run=True))["result"]
    # Die bisherigen Angaben bleiben, dazu die Wahl je Anlage: gleicher Name ist vorgeschlagen, sonst nichts
    assert plan["systems"] == ["Garage", "Haus"] and plan["missing"] == ["Ferienhaus"]
    assert plan["items"] == [{"index": 0, "title": "Garage", "default": garage.entry_id}, {"index": 1, "title": "Haus", "default": haus.entry_id}, {"index": 2, "title": "Ferienhaus", "default": None}]
    assert plan["targets"] == [{"entry_id": garage.entry_id, "title": "Garage"}, {"entry_id": haus.entry_id, "title": "Haus"}]


async def test_restore_onto_a_system_with_another_name(hass: HomeAssistant, hass_ws_client) -> None:
    """Die Einstellungen haben mit dem Namen nichts zu tun: "Haus" aus der Sicherung lässt sich auf "Garage" anwenden."""
    haus = await setup_alarm(hass, workflows=WORKFLOW, entry_delay=45)
    garage = await _garage(hass)
    client = await hass_ws_client(hass)
    data = await _backup(hass, client)
    data["systems"] = [s for s in data["systems"] if s["title"] == "Haus"]
    result = await _ws(client, type=f"{DOMAIN}/import", data=data, mapping=[{"index": 0, "target": garage.entry_id}])
    assert result["success"], result
    await hass.async_block_till_done()
    assert garage.title == "Garage" and garage.options["workflows"] == WORKFLOW and garage.options["entry_delay"] == 45
    assert garage.options["zone_away"] == [FRONT_DOOR, WINDOW, MOTION]
    # "Haus" bleibt, wie es war
    assert haus.options["entry_delay"] == 45 and _titles(hass) == ["Garage", "Haus"]


async def test_restore_as_a_new_system(hass: HomeAssistant, hass_ws_client) -> None:
    """Auch eine gelöschte Anlage kommt zurück: als neue Anlage mit den gesicherten Einstellungen (ohne Code)."""
    haus = await setup_alarm(hass, workflows=WORKFLOW, entry_delay=45, code_arm_required=True)
    client = await hass_ws_client(hass)
    data = await _backup(hass, client)
    result = await _ws(client, type=f"{DOMAIN}/import", data=data, mapping=[{"index": 0, "target": "new", "name": "Ferienhaus"}])
    assert result["success"], result
    await hass.async_block_till_done()
    assert _titles(hass) == ["Ferienhaus", "Haus"]
    new = next(e for e in hass.config_entries.async_entries(DOMAIN) if e.title == "Ferienhaus")
    assert new.options["workflows"] == WORKFLOW and new.options["zone_away"] == [FRONT_DOOR, WINDOW, MOTION]
    # Ohne Code kein "Code zum Scharfschalten" (wie bisher beim Wiederherstellen)
    assert not new.options.get("code_hash") and not new.options.get("code_arm_required")
    assert hass.states.get("alarm_control_panel.ferienhaus") is not None
    assert haus.title == "Haus" and haus.options["entry_delay"] == 45


async def test_skip_leaves_a_system_untouched(hass: HomeAssistant, hass_ws_client) -> None:
    haus = await setup_alarm(hass, entry_delay=45)
    garage = await _garage(hass)
    client = await hass_ws_client(hass)
    data = await _backup(hass, client)
    hass.config_entries.async_update_entry(haus, options={**haus.options, "entry_delay": 7})
    await hass.async_block_till_done()
    result = await _ws(client, type=f"{DOMAIN}/import", data=data, mapping=[{"index": 0, "target": "skip"}, {"index": 1, "target": "skip"}])
    assert result["success"], result
    await hass.async_block_till_done()
    assert haus.options["entry_delay"] == 7 and garage.options["entry_delay"] == 5 and _titles(hass) == ["Garage", "Haus"]


async def test_restore_settings_can_be_left_out(hass: HomeAssistant, hass_ws_client) -> None:
    await setup_alarm(hass)
    client = await hass_ws_client(hass)
    data = await _backup(hass, client)
    settings = hass.data[DATA_SETTINGS]
    await settings.async_set_notify({**settings.notify, "battery_threshold": 33})
    data["settings"]["notify"]["battery_threshold"] = 11
    result = await _ws(client, type=f"{DOMAIN}/import", data=data, mapping=[{"index": 0, "target": "skip"}], restore_settings=False)
    assert result["success"]
    assert settings.notify["battery_threshold"] == 33
    result = await _ws(client, type=f"{DOMAIN}/import", data=data, mapping=[{"index": 0, "target": "skip"}])
    assert settings.notify["battery_threshold"] == 11


@pytest.mark.parametrize("case", [
    "duplicate_target", "unknown_target", "foreign_entry", "unloaded_entry", "index_out_of_range", "duplicate_index", "new_name_taken",
    "new_name_taken_case", "new_name_empty", "two_new_same_name",
])
async def test_invalid_mapping_changes_nothing(hass: HomeAssistant, hass_ws_client, case: str) -> None:
    """Ein falsches Ziel wird vor jeder Änderung abgelehnt: keine Anlage entsteht, keine Einstellung ändert sich."""
    haus = await setup_alarm(hass, entry_delay=45)
    garage = await _garage(hass)
    foreign = MockConfigEntry(domain="andere_integration", title="Fremd", data={})
    foreign.add_to_hass(hass)
    unloaded = MockConfigEntry(domain=DOMAIN, title="Nicht geladen", data={"name": "Nicht geladen"}, options=options())
    unloaded.add_to_hass(hass)
    client = await hass_ws_client(hass)
    data = await _backup(hass, client)
    settings = hass.data[DATA_SETTINGS]
    await settings.async_set_notify({**settings.notify, "battery_threshold": 33})
    data["settings"]["notify"]["battery_threshold"] = 11
    mappings = {
        "duplicate_target": [{"index": 0, "target": haus.entry_id}, {"index": 1, "target": haus.entry_id}],
        "unknown_target": [{"index": 0, "target": "gibt-es-nicht"}],
        "foreign_entry": [{"index": 0, "target": foreign.entry_id}],
        "unloaded_entry": [{"index": 0, "target": unloaded.entry_id}],
        "index_out_of_range": [{"index": 5, "target": haus.entry_id}],
        "duplicate_index": [{"index": 0, "target": haus.entry_id}, {"index": 0, "target": garage.entry_id}],
        "new_name_taken": [{"index": 0, "target": "new", "name": "Haus"}],
        "new_name_taken_case": [{"index": 0, "target": "new", "name": " garage "}],
        "new_name_empty": [{"index": 0, "target": "new", "name": "   "}],
        "two_new_same_name": [{"index": 0, "target": "new", "name": "Neu"}, {"index": 1, "target": "new", "name": "neu"}],
    }
    before = {e.entry_id: dict(e.options) for e in hass.config_entries.async_entries(DOMAIN)}
    result = await _ws(client, type=f"{DOMAIN}/import", data=data, mapping=mappings[case])
    assert result["success"] is False, result
    assert result["error"]["code"] in ("invalid_mapping", "name_taken", "name_required"), result
    await hass.async_block_till_done()
    assert _titles(hass) == ["Garage", "Haus", "Nicht geladen"]
    assert {e.entry_id: dict(e.options) for e in hass.config_entries.async_entries(DOMAIN)} == before
    assert settings.notify["battery_threshold"] == 33


async def test_without_a_mapping_systems_are_still_matched_by_name(hass: HomeAssistant, hass_ws_client) -> None:
    """Dateien und Aufrufe ohne Wahl (ältere Panels) verhalten sich wie bisher."""
    haus = await setup_alarm(hass, entry_delay=45)
    client = await hass_ws_client(hass)
    data = await _backup(hass, client)
    hass.config_entries.async_update_entry(haus, options={**haus.options, "entry_delay": 7})
    await hass.async_block_till_done()
    assert (await _ws(client, type=f"{DOMAIN}/import", data=data))["success"]
    await hass.async_block_till_done()
    assert haus.options["entry_delay"] == 45 and _titles(hass) == ["Haus"]
