"""
Speichern sagt dem Panel, ob die Anlage neu lädt (1.16.0), und die Lautstärke je Medienplayer.

Home Assistant lädt eine Anlage nur neu, wenn sich ihre Optionen wirklich geändert haben. Das Panel wartete nach jedem Speichern
mit der Ladeanzeige auf eine neue Kennung der Anlage, bis zu 25 Sekunden: wer denselben Stand noch einmal speicherte, sah sie so
lange drehen (Fehlerbericht des Nutzers, 2026-11-11).
"""

from __future__ import annotations

from typing import Any

import pytest
from homeassistant.core import HomeAssistant

from .conftest import FRONT_DOOR, WINDOW, setup_alarm
from .test_actions import PLAYER, _setup_workflow
from .test_alarm import call, open_sensor, settle

OTHER, THIRD = "media_player.kueche", "media_player.buero"
FLOW = {"home": [{"type": "action", "action": "switch.turn_on", "target": ["switch.sirene"], "wait": False}]}


@pytest.mark.parametrize(
    ("command", "payload", "changed"),
    [
        ("save_workflows", {"workflows": FLOW}, {"workflows": {"home": [{"type": "wait", "seconds": 5}]}}),
        ("save_zones", {"zones": {"home": [WINDOW], "away": [WINDOW, FRONT_DOOR]}, "entry_sensors": [FRONT_DOOR]}, {"zones": {"home": [], "away": [WINDOW, FRONT_DOOR]}, "entry_sensors": [FRONT_DOOR]}),
    ],
    ids=["Aktionen", "Zonen"],
)
async def test_saving_says_whether_the_system_reloads(hass: HomeAssistant, hass_ws_client, command: str, payload: dict, changed: dict) -> None:
    """Geändert: "reload" wahr. Derselbe Stand noch einmal: "reload" falsch, das Panel wartet dann nicht auf einen Neustart."""
    entry = await setup_alarm(hass)
    client = await hass_ws_client(hass)

    async def save(body: dict) -> dict:
        await client.send_json_auto_id({"type": f"alarmageddon/{command}", "entry_id": entry.entry_id, **body})
        result = await client.receive_json()
        await hass.async_block_till_done()
        return result["result"]

    await save(payload)
    instance = hass.config_entries.async_get_entry(entry.entry_id).runtime_data.controller.instance
    again = await save(payload)
    assert again == {"ok": True, "reload": False}
    assert hass.config_entries.async_get_entry(entry.entry_id).runtime_data.controller.instance == instance  # nicht neu geladen
    assert (await save(changed))["reload"] is True
    assert hass.config_entries.async_get_entry(entry.entry_id).runtime_data.controller.instance != instance


async def test_volume_for_each_media_player(hass: HomeAssistant) -> None:
    """Jeder Lautsprecher bekommt seinen eigenen Wert; wer keinen hat, den gemeinsamen. Gleiche Werte gehen in einen Aufruf."""
    for player in (OTHER, THIRD):
        hass.states.async_set(player, "idle")
    step: dict[str, Any] = {"type": "sound", "players": [PLAYER, OTHER, THIRD], "sound": "siren", "duration": 5, "volume": 0.7,
                            "volumes": {PLAYER: 0.3, OTHER: 0.7}, "restore": False, "wait": False}
    entry, services = await _setup_workflow(hass, [step])
    assert entry.options["workflows"]["home"][0]["volumes"] == {PLAYER: 0.3, OTHER: 0.7}
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await settle(hass)
    sets = {c.data["volume_level"]: sorted(c.data["entity_id"]) for c in services["media_player.volume_set"]}
    assert sets == {0.3: [PLAYER], 0.7: sorted([OTHER, THIRD])}
    assert sorted(services["media_player.play_media"][0].data["entity_id"]) == sorted([PLAYER, OTHER, THIRD])


async def test_volume_per_player_without_a_common_value(hass: HomeAssistant) -> None:
    """Ohne gemeinsamen Wert bleibt ein Lautsprecher ohne eigenen Wert, wie er ist."""
    hass.states.async_set(OTHER, "idle")
    step = {"type": "prealarm", "players": [PLAYER, OTHER], "sound": "pre_beep", "duration": 5, "volumes": {OTHER: 0.2}}
    _entry, services = await _setup_workflow(hass, [step])
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await settle(hass)
    assert [(c.data["volume_level"], c.data["entity_id"]) for c in services["media_player.volume_set"]] == [(0.2, [OTHER])]


@pytest.mark.parametrize(
    ("volumes", "ok", "kept"),
    [
        ({PLAYER: 0.4, "media_player.nicht_im_schritt": 0.9}, True, {PLAYER: 0.4}),
        ({"media_player.nicht_im_schritt": 0.9}, True, None),
        ({PLAYER: 1.5}, False, None),
        ({"switch.sirene": 0.5}, False, None),
        ({PLAYER: "laut"}, False, None),
    ],
    ids=["fremder Lautsprecher entfällt", "nur fremde: Eintrag entfällt", "über 100 %", "kein Medienplayer", "kein Wert"],
)
async def test_volumes_are_validated(hass: HomeAssistant, hass_ws_client, volumes: dict, ok: bool, kept: dict | None) -> None:
    entry = await setup_alarm(hass)
    client = await hass_ws_client(hass)
    step = {"type": "chime", "players": [PLAYER], "sound": "tone_pip", "duration": 3, "volumes": volumes}
    await client.send_json_auto_id({"type": "alarmageddon/save_workflows", "entry_id": entry.entry_id, "workflows": {}, "workflows_armed": {"home": [step]}})
    result = await client.receive_json()
    await hass.async_block_till_done()
    assert result["success"] is ok
    if ok:
        assert entry.options["workflows_armed"]["home"][0].get("volumes") == kept


# ----- Was das Panel speichert, bekommt es genau so zurück (1.17.12) -----
# Das Panel zeigt den gespeicherten Stand sofort an und vergleicht ihn mit den Daten, die nach dem Neuladen vom Server kommen.
# Weicht der Server davon ab (er liess die Zeiten abgeschalteter Modi weg), hält das Panel den Stand für geändert: unten steht
# "1 Änderung", der orange Punkt bleibt, und Speichern ändert nichts daran (Fehlerbericht des Nutzers, 2026-11-12).


def _same(a: Any, b: Any) -> bool:
    """Wie das Panel vergleicht: Inhalt und Reihenfolge der Felder (JSON.stringify)."""
    import json

    return json.dumps(a) == json.dumps(b)


async def _data(client) -> dict:
    await client.send_json_auto_id({"type": "alarmageddon/data"})
    return (await client.receive_json())["result"]["systems"][0]


@pytest.mark.parametrize("night", [False, True], ids=["Nacht abgeschaltet", "Nacht eingeschaltet"])
async def test_system_settings_come_back_exactly_as_the_panel_saved_them(hass: HomeAssistant, hass_ws_client, night: bool) -> None:
    """Reiter "Anlage": Zeiten aller Modi (auch der abgeschalteten: sie behalten ihre Werte), Schalter, Modi, "Immer aktiv", Zeitplan."""
    entry = await setup_alarm(hass)
    client = await hass_ws_client(hass)
    # So sendet das Panel: ohne "Einstellungen pro Modus" dieselben Werte für alle drei Modi, auch für einen abgeschalteten
    times = {"exit_delay": 5, "entry_delay": 25, "confirm_window": 90}
    payload = {
        "mode_settings": {mode: dict(times) for mode in ("home", "away", "night")},
        "per_mode_settings": False, "home_enabled": True, "away_enabled": True, "night_enabled": night, "always_enabled": False,
        "schedules": [{"id": "k3j2h1g0", "enabled": True, "action": "away", "time": "08:00", "days": [0, 1, 2, 3, 4]},
                      {"id": "a1b2c3d4", "enabled": False, "action": "off", "time": "17:30", "days": [5, 6]}],
    }
    await client.send_json_auto_id({"type": "alarmageddon/save_system", "entry_id": entry.entry_id, **payload})
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    system = await _data(client)
    assert _same(system["mode_settings"], payload["mode_settings"]), system["mode_settings"]
    assert system["per_mode_settings"] is False and system["always_enabled"] is False and system["night_enabled"] is night
    assert system["modes"] == ["home", "away", *(["night"] if night else [])]
    assert _same(system["schedules"], payload["schedules"]), system["schedules"]
    # Noch einmal dasselbe gespeichert: nichts lädt neu, die Daten bleiben gleich
    await client.send_json_auto_id({"type": "alarmageddon/save_system", "entry_id": entry.entry_id, **payload})
    assert (await client.receive_json())["result"] == {"ok": True, "reload": False}
    assert _same((await _data(client))["mode_settings"], payload["mode_settings"])


async def test_sensor_settings_come_back_exactly_as_the_panel_saved_them(hass: HomeAssistant, hass_ws_client) -> None:
    """Reiter "Sensoren": Zonen der eingeschalteten Modi, Eingangssensoren, Liste, eigene Werte je Sensor und je Modus, Schalter."""
    entry = await setup_alarm(hass)
    client = await hass_ws_client(hass)
    motion = "binary_sensor.bewegung_flur"
    payload = {
        "zones": {"home": [FRONT_DOOR, WINDOW], "away": [FRONT_DOOR, WINDOW, motion], "night": [WINDOW]},
        "entry_sensors": [FRONT_DOOR], "sensors": sorted([FRONT_DOOR, WINDOW, motion]), "per_mode_sensors": True,
        "sensor_options": {FRONT_DOOR: {"entry_delay": 45}, WINDOW: {"report_only": True}},
        "sensor_modes": {"away": {motion: {"open_ok": True}}, "always": {WINDOW: {"report_only": False}}},
    }
    await client.send_json_auto_id({"type": "alarmageddon/save_zones", "entry_id": entry.entry_id, **payload})
    result = await client.receive_json()
    assert result["success"], result
    await hass.async_block_till_done()
    system = await _data(client)
    for mode in system["modes"]:
        assert system["zones"][mode] == payload["zones"][mode]
    assert system["entry_sensors"] == payload["entry_sensors"] and system["sensors"] == payload["sensors"]
    assert system["per_mode_sensors"] is True
    assert system["sensor_options"] == payload["sensor_options"], system["sensor_options"]
    assert system["sensor_modes"] == payload["sensor_modes"], system["sensor_modes"]
