"""Sicherung und Wiederherstellung (0.5.0): alles Eingestellte, nie Codes, Anlagen über den Namen."""

from __future__ import annotations

import json

from homeassistant.core import HomeAssistant

from custom_components.alarmageddon.code import hash_code
from custom_components.alarmageddon.const import DATA_SETTINGS

from .conftest import FRONT_DOOR, MOTION, WINDOW, setup_alarm

_id = iter(range(1, 1000))

WORKFLOW = {"away": [{"type": "notify"}, {"type": "wait", "seconds": 10}, {"type": "action", "action": "siren.turn_on", "target": ["siren.flur"], "data": {}, "restore": True}]}


async def _ws(client, **msg):
    await client.send_json({"id": next(_id), **msg})
    return await client.receive_json()


async def test_export_contains_settings_but_no_codes(hass: HomeAssistant, hass_ws_client) -> None:
    code_hash, salt = hash_code("1234")
    await setup_alarm(hass, code_hash=code_hash, code_salt=salt, workflows=WORKFLOW, sensor_options={MOTION: {"confirm": True}},
                      codes=[{"id": "a", "name": "Anna", "user_id": None, "hash": code_hash, "salt": salt}])
    client = await hass_ws_client(hass)
    result = await _ws(client, type="alarmageddon/export")
    assert result["success"]
    data = result["result"]
    text = json.dumps(data)
    assert code_hash not in text and salt not in text and "Anna" not in text
    system = data["systems"][0]
    assert system["title"] == "Haus"
    assert system["options"]["workflows"] == WORKFLOW
    assert system["options"]["zone_away"] == [FRONT_DOOR, WINDOW, MOTION]
    assert system["options"]["sensor_options"] == {MOTION: {"confirm": True}}
    assert "presets" in data["settings"] and "notify" in data["settings"]
    assert data["format"] == "alarmageddon" and data["version"] == 1


async def test_round_trip(hass: HomeAssistant, hass_ws_client) -> None:
    code_hash, salt = hash_code("1234")
    entry = await setup_alarm(hass, workflows=WORKFLOW, entry_delay=45, code_hash=code_hash, code_salt=salt)
    client = await hass_ws_client(hass)
    exported = (await _ws(client, type="alarmageddon/export"))["result"]
    # Alles umstellen, dann zurückholen
    hass.config_entries.async_update_entry(entry, options={**entry.options, "workflows": {}, "entry_delay": 5, "zone_away": [FRONT_DOOR]})
    settings = hass.data[DATA_SETTINGS]
    await settings.async_set_notify({**settings.notify, "types": {**settings.notify["types"], "triggered": {**settings.notify["types"]["triggered"], "volume": 0.1}}})
    await hass.async_block_till_done()
    exported["settings"]["notify"]["types"]["triggered"]["volume"] = 0.9
    exported["systems"].append({"title": "Ferienhaus", "options": {}})
    plan = await _ws(client, type="alarmageddon/import", data=exported, dry_run=True)
    assert plan["result"] == {"systems": ["Haus"], "missing": ["Ferienhaus"], "settings": True}
    assert entry.options["entry_delay"] == 5  # nur geprüft, nichts geändert
    result = await _ws(client, type="alarmageddon/import", data=exported)
    assert result["success"], result
    await hass.async_block_till_done()
    assert entry.options["workflows"] == WORKFLOW
    assert entry.options["entry_delay"] == 45
    assert entry.options["zone_away"] == [FRONT_DOOR, WINDOW, MOTION]
    assert hass.data[DATA_SETTINGS].notify["types"]["triggered"]["volume"] == 0.9
    # Der Code der Anlage bleibt
    assert entry.options["code_hash"] == code_hash


async def test_invalid_backup_rejected(hass: HomeAssistant, hass_ws_client) -> None:
    entry = await setup_alarm(hass)
    client = await hass_ws_client(hass)
    bad = await _ws(client, type="alarmageddon/import", data={"hello": 1})
    assert bad["error"]["code"] == "not_a_backup"
    newer = await _ws(client, type="alarmageddon/import", data={"format": "alarmageddon", "version": 99})
    assert newer["error"]["code"] == "newer_version"
    wrong = await _ws(client, type="alarmageddon/import", data={"format": "alarmageddon", "version": 1,
                                                                "systems": [{"title": "Haus", "options": {"zone_away": ["light.flur"]}}]})
    assert wrong["error"]["code"] == "invalid_backup"
    step = await _ws(client, type="alarmageddon/import", data={"format": "alarmageddon", "version": 1,
                                                               "systems": [{"title": "Haus", "options": {"workflows": {"away": [{"type": "rm -rf"}]}}}]})
    assert step["error"]["code"] == "invalid_backup"
    assert entry.options["zone_away"] == [FRONT_DOOR, WINDOW, MOTION]


async def test_import_ignores_code_fields(hass: HomeAssistant, hass_ws_client) -> None:
    """Eine manipulierte Sicherung kann keinen Code setzen und Code-Pflicht nicht ohne Code einschalten."""
    entry = await setup_alarm(hass)
    client = await hass_ws_client(hass)
    code_hash, salt = hash_code("0000")
    data = {"format": "alarmageddon", "version": 1, "systems": [{"title": "haus", "options": {
        "code_hash": code_hash, "code_salt": salt, "codes": [{"id": "x", "name": "X", "hash": code_hash, "salt": salt}], "code_arm_required": True}}]}
    result = await _ws(client, type="alarmageddon/import", data=data)
    assert result["success"]
    await hass.async_block_till_done()
    assert "code_hash" not in entry.options and not entry.options.get("codes")
    assert entry.options["code_arm_required"] is False


async def test_old_notify_backup_and_report_only_survive_import(hass: HomeAssistant, hass_ws_client) -> None:
    """Eine Sicherung aus 0.8.0 (Form "events", "critical", "volume") wird je Meldungsart übernommen; "Nur melden" bleibt erhalten."""
    entry = await setup_alarm(hass, sensor_options={MOTION: {"report_only": True}})
    client = await hass_ws_client(hass)
    exported = (await _ws(client, type="alarmageddon/export"))["result"]
    assert exported["systems"][0]["options"]["sensor_options"] == {MOTION: {"report_only": True}}
    assert set(exported["settings"]["notify"]["types"]) >= {"triggered", "sensor_report"}
    exported["settings"]["notify"] = {"alarm_targets": ["notify.handy"], "critical": False, "volume": 0.4, "events": {"armed": True}}
    hass.config_entries.async_update_entry(entry, options={**entry.options, "sensor_options": {}})
    await hass.async_block_till_done()
    result = await _ws(client, type="alarmageddon/import", data=exported)
    assert result["success"]
    await hass.async_block_till_done()
    notify = hass.data[DATA_SETTINGS].notify
    assert notify["alarm_targets"] == ["notify.handy"] and notify["types"]["armed"]["enabled"] is True
    assert notify["types"]["triggered"]["critical"] is False and notify["types"]["triggered"]["volume"] == 0.4
    assert entry.options["sensor_options"] == {MOTION: {"report_only": True}}


async def test_stored_backups_create_list_get_delete_and_limit(hass: HomeAssistant, hass_ws_client) -> None:
    """Sicherungen in der Integration: ablegen, auflisten, holen, löschen; höchstens 10, die älteste fällt weg."""
    from custom_components.alarmageddon.const import MAX_BACKUPS

    entry = await setup_alarm(hass, "Haus", exit_delay_away=45)
    client = await hass_ws_client(hass)
    first = await _ws(client, type="alarmageddon/backup_create")
    assert first["success"] and first["result"]["max"] == MAX_BACKUPS == 10
    first_id = first["result"]["created"]["id"]
    assert first["result"]["created"]["systems"] == ["Haus"]
    listing = (await _ws(client, type="alarmageddon/backups"))["result"]["backups"]
    assert [b["id"] for b in listing] == [first_id] and listing[0]["created"]
    got = await _ws(client, type="alarmageddon/backup_get", backup_id=first_id)
    assert got["success"] and got["result"]["format"] == "alarmageddon" and got["result"]["systems"][0]["options"]["exit_delay_away"] == 45
    assert "code_hash" not in json.dumps(got["result"])
    # Wiederherstellen aus der Sicherung über den normalen Weg
    hass.config_entries.async_update_entry(entry, options={**entry.options, "exit_delay_away": 5})
    await hass.async_block_till_done()
    assert (await _ws(client, type="alarmageddon/import", data=got["result"]))["success"]
    await hass.async_block_till_done()
    assert entry.options["exit_delay_away"] == 45
    # Mehr als 10: die älteste fällt weg
    for _ in range(11):
        await _ws(client, type="alarmageddon/backup_create")
    listing = (await _ws(client, type="alarmageddon/backups"))["result"]["backups"]
    assert len(listing) == 10 and first_id not in [b["id"] for b in listing]
    assert (await _ws(client, type="alarmageddon/backup_get", backup_id=first_id))["error"]["code"] == "not_found"
    # Löschen
    victim = listing[3]["id"]
    after = await _ws(client, type="alarmageddon/backup_delete", backup_id=victim)
    assert after["success"] and victim not in [b["id"] for b in after["result"]["backups"]] and len(after["result"]["backups"]) == 9
    assert (await _ws(client, type="alarmageddon/backup_delete", backup_id=victim))["error"]["code"] == "not_found"
