"""Panel-Registrierung und WebSocket-Befehle."""

from __future__ import annotations

from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import HomeAssistant
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.alarmageddon.code import hash_code
from custom_components.alarmageddon.const import PANEL_URL_PATH

from .conftest import ALARM, FRONT_DOOR, MOTION, WINDOW, setup_alarm


def _panel_registered(hass: HomeAssistant) -> bool:
    return PANEL_URL_PATH in hass.data.get("frontend_panels", {})


async def test_one_panel_for_several_systems(hass: HomeAssistant) -> None:
    """Ein Panel für alle Anlagen; es verschwindet erst mit der letzten."""
    haus = await setup_alarm(hass, "Haus")
    garage = await setup_alarm(hass, "Garage")
    assert _panel_registered(hass)
    panel = hass.data["frontend_panels"][PANEL_URL_PATH]
    assert panel.component_name == "iframe" and panel.require_admin
    await hass.config_entries.async_unload(haus.entry_id)
    assert _panel_registered(hass)
    await hass.config_entries.async_unload(garage.entry_id)
    # Beim Neuladen bleibt das Panel stehen: sonst vergässe die Oberfläche die Anlage (Sensoren speichern lädt neu)
    assert _panel_registered(hass)
    assert await hass.config_entries.async_setup(garage.entry_id)
    assert _panel_registered(hass)
    # Erst mit der letzten entfernten Anlage verschwindet es
    await hass.config_entries.async_remove(haus.entry_id)
    assert _panel_registered(hass)
    await hass.config_entries.async_remove(garage.entry_id)
    assert not _panel_registered(hass)


async def test_panel_page_served(hass: HomeAssistant, hass_client) -> None:
    await setup_alarm(hass)
    client = await hass_client()
    resp = await client.get("/alarmageddon_panel/panel.html")
    assert resp.status == 200


async def _ws(hass, hass_ws_client, **msg):
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, **msg})
    return await client.receive_json()


async def test_data(hass: HomeAssistant, hass_ws_client) -> None:
    # Batterie über den Batteriesensor desselben Geräts, Bereich über das Gerät
    entry = MockConfigEntry(domain="test")
    entry.add_to_hass(hass)
    area = ar.async_get(hass).async_create("Küche")
    device = dr.async_get(hass).async_get_or_create(config_entry_id=entry.entry_id, identifiers={("test", "fenster")})
    dr.async_get(hass).async_update_device(device.id, area_id=area.id)
    ent_reg = er.async_get(hass)
    ent_reg.async_get_or_create("binary_sensor", "test", "fenster", device_id=device.id, original_device_class="window", suggested_object_id="fenster_kueche")
    ent_reg.async_get_or_create("sensor", "test", "fenster_bat", device_id=device.id, original_device_class="battery", suggested_object_id="fenster_kueche_batterie")
    hass.states.async_set("binary_sensor.licht_schalter", "off")  # keine passende Klasse, nicht gewählt: nicht angeboten
    hass.states.async_set("binary_sensor.bewegung_keller", "off", {"device_class": "motion"})
    entry_alarm = await setup_alarm(hass)

    result = await _ws(hass, hass_ws_client, type="alarmageddon/data")
    assert result["success"]
    system = result["result"]["systems"][0]
    assert system["entry_id"] == entry_alarm.entry_id
    assert system["entity_id"] == ALARM
    assert system["modes"] == ["home", "away"]
    assert system["zones"]["away"] == [FRONT_DOOR, WINDOW, MOTION]
    assert system["entry_sensors"] == [FRONT_DOOR]
    assert "code_hash" not in str(system)
    sensors = result["result"]["sensors"]
    assert sensors[WINDOW]["area"] == "Küche"
    assert sensors[WINDOW]["battery"] == "sensor.fenster_kueche_batterie"
    assert sensors[WINDOW]["device_class"] == "window"
    assert "binary_sensor.bewegung_keller" in sensors
    assert "binary_sensor.licht_schalter" not in sensors
    # Eigene Zonen-Entitäten nie als Kandidaten
    assert not any(e.startswith("binary_sensor.haus_zone") for e in sensors)


async def test_events_logged(hass: HomeAssistant, hass_ws_client) -> None:
    await setup_alarm(hass)
    await hass.services.async_call("alarm_control_panel", "alarm_arm_home", {"entity_id": ALARM}, blocking=True)
    hass.states.async_set(WINDOW, "on")
    await hass.async_block_till_done()
    result = await _ws(hass, hass_ws_client, type="alarmageddon/data")
    events = result["result"]["systems"][0]["events"]
    assert [e["state"] for e in events] == ["triggered", "armed_home"]
    assert events[0]["sensor"] == WINDOW and events[0]["mode"] == "home"


async def test_save_zones(hass: HomeAssistant, hass_ws_client) -> None:
    entry = await setup_alarm(hass)
    result = await _ws(
        hass,
        hass_ws_client,
        type="alarmageddon/save_zones",
        entry_id=entry.entry_id,
        zones={"home": [WINDOW], "away": [WINDOW, MOTION, MOTION], "night": []},
        entry_sensors=[],
    )
    assert result["success"]
    await hass.async_block_till_done()
    assert entry.options["zone_home"] == [WINDOW]
    assert entry.options["zone_away"] == [WINDOW, MOTION]  # doppelte entfernt
    assert entry.options["entry_sensors"] == []
    assert hass.states.get("binary_sensor.haus_zone_home").attributes["sensors"] == [WINDOW]


async def test_save_zones_validation(hass: HomeAssistant, hass_ws_client) -> None:
    entry = await setup_alarm(hass)
    result = await _ws(
        hass, hass_ws_client, type="alarmageddon/save_zones", entry_id=entry.entry_id,
        zones={"home": [], "away": [WINDOW]}, entry_sensors=[MOTION],
    )
    assert result["error"]["code"] == "entry_not_in_zone"
    result = await _ws(
        hass, hass_ws_client, type="alarmageddon/save_zones", entry_id=entry.entry_id,
        zones={"home": ["light.kueche"], "away": []}, entry_sensors=[],
    )
    assert result["error"]["code"] == "invalid_entity"
    result = await _ws(hass, hass_ws_client, type="alarmageddon/save_zones", entry_id="fremd", zones={}, entry_sensors=[])
    assert result["error"]["code"] == "not_found"


async def test_arm_and_disarm(hass: HomeAssistant, hass_ws_client, hass_admin_user) -> None:
    code_hash, salt = hash_code("1234")
    entry = await setup_alarm(hass, code_hash=code_hash, code_salt=salt)
    result = await _ws(hass, hass_ws_client, type="alarmageddon/arm", entry_id=entry.entry_id, mode="home")
    assert result["success"]
    assert hass.states.get(ALARM).state == AlarmControlPanelState.ARMED_HOME
    # "Geändert von" kommt aus dem Benutzer der Verbindung
    assert hass.states.get(ALARM).attributes["changed_by"] == hass_admin_user.name
    result = await _ws(hass, hass_ws_client, type="alarmageddon/arm", entry_id=entry.entry_id, mode="off", code="0000")
    assert result["error"]["code"] == "invalid_code"
    result = await _ws(hass, hass_ws_client, type="alarmageddon/arm", entry_id=entry.entry_id, mode="off", code="1234")
    assert result["success"]
    assert hass.states.get(ALARM).state == AlarmControlPanelState.DISARMED


async def test_arm_open_sensor_error(hass: HomeAssistant, hass_ws_client) -> None:
    entry = await setup_alarm(hass)
    hass.states.async_set(WINDOW, "on")
    result = await _ws(hass, hass_ws_client, type="alarmageddon/arm", entry_id=entry.entry_id, mode="home")
    assert result["error"]["code"] == "open_sensors"


async def test_only_admins(hass: HomeAssistant, hass_ws_client, hass_admin_user) -> None:
    entry = await setup_alarm(hass)
    hass_admin_user.groups = []
    for msg in (
        {"type": "alarmageddon/data"},
        {"type": "alarmageddon/arm", "entry_id": entry.entry_id, "mode": "home"},
        {"type": "alarmageddon/save_zones", "entry_id": entry.entry_id, "zones": {}, "entry_sensors": []},
    ):
        result = await _ws(hass, hass_ws_client, **msg)
        assert result["error"]["code"] == "unauthorized", msg
    assert hass.states.get(ALARM).state == AlarmControlPanelState.DISARMED


async def test_events_removed_with_entry(hass: HomeAssistant, hass_storage) -> None:
    entry = await setup_alarm(hass)
    await hass.services.async_call("alarm_control_panel", "alarm_arm_home", {"entity_id": ALARM}, blocking=True)
    await hass.config_entries.async_unload(entry.entry_id)
    key = f"alarmageddon.events.{entry.entry_id}"
    assert hass_storage[key]["data"][0]["state"] == "armed_home"
    await hass.config_entries.async_remove(entry.entry_id)
    await hass.async_block_till_done()
    assert key not in hass_storage


async def test_chosen_sensors_saved_and_listed(hass: HomeAssistant, hass_ws_client) -> None:
    """Auswahl der Sensoren (0.14.0): wird gespeichert, kommt in "data" zurück und ist Teil der Sicherung."""
    hass.states.async_set("binary_sensor.wasser_keller", "off", {"device_class": "moisture"})
    entry = await setup_alarm(hass)
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "alarmageddon/save_zones", "entry_id": entry.entry_id, "zones": {"home": [], "away": []}, "entry_sensors": [],
                            "sensors": ["binary_sensor.wasser_keller", "binary_sensor.wasser_keller"]})
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    await client.send_json({"id": 2, "type": "alarmageddon/data"})
    data = (await client.receive_json())["result"]
    assert data["systems"][0]["sensors"] == ["binary_sensor.wasser_keller"]
    assert "binary_sensor.wasser_keller" in data["sensors"]
    await client.send_json({"id": 3, "type": "alarmageddon/save_zones", "entry_id": entry.entry_id, "zones": {"home": [], "away": []}, "entry_sensors": [], "sensors": ["light.flur"]})
    assert (await client.receive_json())["error"]["code"] == "invalid_entity"
    await client.send_json({"id": 4, "type": "alarmageddon/export"})
    exported = (await client.receive_json())["result"]
    assert exported["systems"][0]["options"]["sensors"] == ["binary_sensor.wasser_keller"]


async def test_last_change_only_counts_open_close(hass: HomeAssistant, hass_ws_client, freezer) -> None:
    """"Letzte Änderung" (0.25.0): nur ein Wechsel offen <-> zu zählt, nicht "nicht verfügbar" nach einem Neustart."""
    from datetime import timedelta

    from custom_components.alarmageddon.last_change import is_real_change, last_real_change
    from homeassistant.util import dt as dt_util

    assert is_real_change("off", "on") and is_real_change("on", "off")
    assert not is_real_change("unavailable", "off") and not is_real_change("off", "unavailable") and not is_real_change("off", "off")

    t0 = dt_util.utcnow()
    at = lambda m: t0 + timedelta(minutes=m)  # noqa: E731
    # Verlauf: zu, offen (Wechsel), nicht verfügbar, zu (Wechsel, 2 Min danach), nicht verfügbar, zu (kein Wechsel)
    items = [(at(0), "off"), (at(10), "on"), (at(20), "unavailable"), (at(22), "off"), (at(30), "unavailable"), (at(31), "off")]
    assert last_real_change(items) == at(22)
    assert last_real_change([(at(0), "off"), (at(5), "unavailable"), (at(6), "off")]) is None  # Neustart allein ist keine Änderung

    entry = await setup_alarm(hass)
    hass.states.async_set(WINDOW, "off", {"device_class": "window"})
    await hass.async_block_till_done()
    freezer.tick(timedelta(minutes=5))
    hass.states.async_set(WINDOW, "on", {"device_class": "window"})
    await hass.async_block_till_done()
    # Neustart: nicht verfügbar, dann zu: die gemerkte Zeit bleibt
    freezer.tick(timedelta(minutes=5))
    hass.states.async_set(WINDOW, "unavailable")
    await hass.async_block_till_done()
    hass.states.async_set(WINDOW, "off", {"device_class": "window"})
    await hass.async_block_till_done()
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "alarmageddon/data"})
    data = (await client.receive_json())["result"]
    assert entry.entry_id and WINDOW in data["last_changes"]
    stamp = dt_util.parse_datetime(data["last_changes"][WINDOW])
    assert stamp is not None and abs((stamp - (t0 + timedelta(minutes=5))).total_seconds()) < 2  # der echte Wechsel off -> on; "unavailable -> off" danach zählt nicht
