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
