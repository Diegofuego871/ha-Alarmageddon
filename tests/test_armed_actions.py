"""
Aktionen beim Scharfschalten und der Aktivierungston (1.14.0).

Unter "Anlage scharf geschaltet" legt der Nutzer Schritte ab, die laufen, sobald die Anlage scharf ist, je Modus: zum Beispiel
ein Aktivierungston. Der Aktivierungston ist eine eigene Schrittart neben dem Alarmton: kurz, mit Dauer, nie endlos.
"""

from __future__ import annotations

from typing import Any

import pytest
from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import HomeAssistant, ServiceCall
from pytest_homeassistant_custom_component.common import async_mock_service

from custom_components.alarmageddon.const import MAX_STEPS

from .conftest import WINDOW, setup_alarm
from .test_alarm import advance, call, open_sensor, settle, state

PLAYER = "media_player.wohnzimmer"
SIREN, LIGHT = "switch.sirene", "switch.licht"


def act(target: str, **more: Any) -> dict[str, Any]:
    return {"type": "action", "action": "switch.turn_on", "target": [target], "wait": False, **more}


def chime(seconds: int = 3, **more: Any) -> dict[str, Any]:
    return {"type": "chime", "players": [PLAYER], "sound": "tone_pip", "duration": seconds, **more}


async def _setup(hass: HomeAssistant, armed: dict[str, list], **options: Any):
    await hass.config.async_update(internal_url="http://192.168.1.2:8123")
    hass.states.async_set(PLAYER, "idle")
    played = async_mock_service(hass, "media_player", "play_media")
    stopped = async_mock_service(hass, "media_player", "media_stop")
    async_mock_service(hass, "media_player", "volume_set")
    on = async_mock_service(hass, "switch", "turn_on")
    entry = await setup_alarm(hass, **{"workflows": {"home": [act(SIREN)], "away": [act(SIREN)]}, "workflows_armed": armed, "exit_delay_away": 0, **options})
    return entry, played, stopped, on


def targets(calls: list[ServiceCall]) -> list[str]:
    return [t for c in calls for t in c.data["entity_id"]]


async def test_arming_runs_the_actions_of_that_mode(hass: HomeAssistant, freezer) -> None:
    """Scharfschalten startet die Schritte dieses Modus: der Aktivierungston spielt seine Dauer und stoppt, der Lauf endet von selbst."""
    entry, played, stopped, on = await _setup(hass, {"home": [chime(3), act(LIGHT)], "away": [act(LIGHT)]})
    await call(hass, "alarm_arm_home")
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    assert len(played) == 1 and played[0].data["media_content_id"].endswith("/tone_pip.wav") and played[0].data["entity_id"] == [PLAYER]
    assert targets(on) == [LIGHT]  # der Ton hält den nächsten Schritt nicht auf (Standard: läuft weiter)
    runner = entry.runtime_data.workflow
    assert runner.running and runner.running.get("phase") == "armed"
    await advance(hass, freezer, 4)
    await settle(hass)
    assert len(stopped) >= 1 and runner.running is None
    assert state(hass) == AlarmControlPanelState.ARMED_HOME and SIREN not in targets(on)


async def test_each_mode_has_its_own_actions_and_exit_delay_counts(hass: HomeAssistant, freezer) -> None:
    """Je Modus eigene Schritte; mit Ausgangsverzögerung starten sie erst, wenn die Anlage scharf ist; ein Wechsel des Modus zählt neu."""
    _entry, played, _stopped, on = await _setup(hass, {"home": [act("switch.home")], "away": [act("switch.away")]}, exit_delay_away=30)
    await call(hass, "alarm_arm_away")
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.ARMING and targets(on) == []
    await advance(hass, freezer, 31)
    await settle(hass)
    assert targets(on) == ["switch.away"] and not played
    await call(hass, "alarm_arm_home")
    await settle(hass)
    assert targets(on) == ["switch.away", "switch.home"]
    await call(hass, "alarm_disarm")
    await settle(hass)
    assert targets(on) == ["switch.away", "switch.home"]  # Deaktivieren löst nichts aus


async def test_not_after_acknowledging_and_not_on_restart(hass: HomeAssistant) -> None:
    """Nach einem quittierten Alarm ist die Anlage wieder scharf, wurde aber nicht scharf geschaltet: die Schritte laufen nicht noch einmal."""
    entry, _played, _stopped, on = await _setup(hass, {"home": [act(LIGHT)]})
    await call(hass, "alarm_arm_home")
    await settle(hass)
    assert targets(on) == [LIGHT]
    await open_sensor(hass, WINDOW)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    assert entry.runtime_data.controller.acknowledge("Test")
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.ARMED_HOME and targets(on).count(LIGHT) == 1
    # Neustart: der Runner sieht den scharfen Zustand zum ersten Mal, ohne dass scharf geschaltet wurde
    runner = entry.runtime_data.workflow
    runner._last_state = None
    runner._on_change()
    await settle(hass)
    assert targets(on).count(LIGHT) == 1


async def test_disarming_silences_the_arming_tone_and_an_alarm_takes_over(hass: HomeAssistant, freezer) -> None:
    """Deaktivieren stoppt einen noch laufenden Aktivierungston sofort; ein Alarm bricht die Schritte ab und startet seine eigenen."""
    entry, played, stopped, on = await _setup(hass, {"home": [chime(60), {"type": "wait", "seconds": 120}, act(LIGHT)]})
    runner = entry.runtime_data.workflow
    await call(hass, "alarm_arm_home")
    await settle(hass)
    assert len(played) == 1 and runner.running.get("phase") == "armed"
    await call(hass, "alarm_disarm")
    await settle(hass)
    assert len(stopped) >= 1 and runner.running is None
    count = len(played)
    await advance(hass, freezer, 130)
    assert len(played) == count and LIGHT not in targets(on)  # kein weiterer Ton, der wartende Schritt lief nie
    # Alarm während die Schritte noch laufen
    await call(hass, "alarm_arm_home")
    await settle(hass)
    await open_sensor(hass, WINDOW)
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.TRIGGERED and targets(on) == [SIREN]
    assert runner.running and not runner.running.get("after")
    await advance(hass, freezer, 130)
    assert LIGHT not in targets(on)


@pytest.mark.parametrize(
    ("key", "steps"),
    [
        ("workflows_armed", [{"type": "notify"}]),
        ("workflows_armed", [{"type": "acknowledge"}]),
        ("workflows_armed", [{"type": "sound", "players": [PLAYER], "sound": "siren", "duration": 10}]),
        ("workflows_armed", [{"type": "chime", "players": [PLAYER], "duration": 0}]),
        ("workflows_armed", [{"type": "chime", "players": [], "duration": 3}]),
        ("workflows_armed", [{"type": "wait", "seconds": 1}] * (MAX_STEPS + 1)),
    ],
    ids=["Alarmmeldung", "Quittieren", "Alarmton (Sirene)", "Ton ohne Ende", "Ton ohne Lautsprecher", "zu viele"],
)
async def test_invalid_arming_actions_are_rejected(hass: HomeAssistant, hass_ws_client, key: str, steps: list) -> None:
    """Beim Scharfschalten sind Gerät, Aktivierungston (mit Dauer) und Warten möglich; die Sirene gehört zum Alarm."""
    entry = await setup_alarm(hass)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "alarmageddon/save_workflows", "entry_id": entry.entry_id, "workflows": {}, key: {"home": steps}})
    result = await client.receive_json()
    assert result["success"] is False and result["error"]["code"] == "invalid_format"
    assert "workflows_armed" not in entry.options


async def test_arming_actions_are_saved_shown_and_part_of_the_backup(hass: HomeAssistant, hass_ws_client) -> None:
    """Speichern über das Panel (nur für Modi, nicht für "Immer aktiv"), in den Daten des Panels und in der Sicherung; der Ton auch nach dem Quittieren."""
    entry = await setup_alarm(hass)
    client = await hass_ws_client(hass)
    armed = {"home": [chime(5, volume=0.4), act(LIGHT, restore=True)]}
    await client.send_json_auto_id({"type": "alarmageddon/save_workflows", "entry_id": entry.entry_id, "workflows": {}, "workflows_armed": armed, "workflows_after": {"home": [chime(2)]}})
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    saved = entry.options["workflows_armed"]["home"]
    assert saved[0] == {"type": "chime", "players": [PLAYER], "sound": "tone_pip", "duration": 5, "volume": 0.4} and saved[1]["restore"] is False
    assert entry.options["workflows_after"]["home"][0]["type"] == "chime"
    await client.send_json_auto_id({"type": "alarmageddon/data"})
    assert (await client.receive_json())["result"]["systems"][0]["workflows_armed"] == entry.options["workflows_armed"]
    await client.send_json_auto_id({"type": "alarmageddon/save_workflows", "entry_id": entry.entry_id, "workflows": {}, "workflows_armed": {"always": [act(LIGHT)]}})
    assert (await client.receive_json())["error"]["code"] == "invalid_format"  # "Immer aktiv" wird nie scharf geschaltet
    await client.send_json_auto_id({"type": "alarmageddon/export"})
    backup = (await client.receive_json())["result"]
    assert backup["systems"][0]["options"]["workflows_armed"] == entry.options["workflows_armed"]
    await client.send_json_auto_id({"type": "alarmageddon/save_workflows", "entry_id": entry.entry_id, "workflows": {}, "workflows_armed": {"home": []}})
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    assert entry.options["workflows_armed"] == {}
    await client.send_json_auto_id({"type": "alarmageddon/import", "data": backup})
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    assert entry.options["workflows_armed"]["home"] == saved
