"""
Aktionen beim Deaktivieren und der Deaktivierungston (1.27.0).

Unter "Beim Deaktivieren" legt der Nutzer Schritte ab, die immer laufen, wenn die Anlage deaktiviert wird, je Modus, der gerade
scharf war: zum Beispiel ein Deaktivierungston. Der Deaktivierungston ist das Gegenstück zum Aktivierungston: kurz, mit Dauer, nie
endlos, mit eigenen Klängen. Die Aktionen laufen auch mitten in der Verzögerung und im Alarm; Quittieren zählt nicht.
"""

from __future__ import annotations

from typing import Any

import pytest
from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import HomeAssistant, ServiceCall
from pytest_homeassistant_custom_component.common import async_mock_service

from custom_components.alarmageddon.const import MAX_STEPS

from .conftest import FRONT_DOOR, WINDOW, setup_alarm
from .test_alarm import advance, call, settle, state
from .test_sensor_options import SMOKE, _classes, open_sensor

PLAYER = "media_player.flur"
SIREN, LIGHT, AFTER = "switch.sirene", "switch.licht", "switch.nach_dem_alarm"


def act(target: str, **more: Any) -> dict[str, Any]:
    return {"type": "action", "action": "switch.turn_on", "target": [target], "wait": False, **more}


def off_tone(seconds: int = 3, **more: Any) -> dict[str, Any]:
    return {"type": "dechime", "players": [PLAYER], "sound": "off_fall", "duration": seconds, **more}


async def _setup(hass: HomeAssistant, disarmed: dict[str, list], **options: Any):
    _classes(hass)
    await hass.config.async_update(internal_url="http://192.168.1.2:8123")
    hass.states.async_set(PLAYER, "idle")
    played = async_mock_service(hass, "media_player", "play_media")
    stopped = async_mock_service(hass, "media_player", "media_stop")
    async_mock_service(hass, "media_player", "volume_set")
    on = async_mock_service(hass, "switch", "turn_on")
    entry = await setup_alarm(hass, **{"workflows": {"home": [act(SIREN)], "away": [act(SIREN)]}, "workflows_disarmed": disarmed, **options})
    return entry, played, stopped, on


def targets(calls: list[ServiceCall]) -> list[str]:
    return [t for c in calls for t in c.data["entity_id"]]


async def test_disarming_runs_the_actions_of_the_mode_that_was_armed(hass: HomeAssistant, freezer) -> None:
    """Deaktivieren aus "scharf": der Ton spielt seine Dauer und stoppt, die anderen Schritte laufen, der Lauf endet von selbst."""
    entry, played, stopped, on = await _setup(hass, {"home": [off_tone(3), act(LIGHT)], "away": [act(AFTER)]})
    await call(hass, "alarm_arm_home")
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.ARMED_HOME and not played and not on
    await call(hass, "alarm_disarm")
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.DISARMED
    # Nur ganze Wiederholungen (wie beim Aktivierungston): 3 s mit einem Klang von 2 s = eine Wiederholung
    assert len(played) == 1 and played[0].data["media_content_id"].endswith("/alarmageddon_loop/2000/off_fall.wav")
    assert targets(on) == [LIGHT], "nur die Schritte von Anwesend, nicht die von Abwesend"
    runner = entry.runtime_data.workflow
    assert runner.running and runner.running.get("phase") == "disarmed"
    await advance(hass, freezer, 4)
    await settle(hass)
    assert stopped and runner.running is None


async def test_the_actions_belong_to_the_mode_that_was_armed(hass: HomeAssistant) -> None:
    _entry, _played, _stopped, on = await _setup(hass, {"home": [act(LIGHT)], "away": [act(AFTER)]}, exit_delay_away=0)
    await call(hass, "alarm_arm_away")
    await settle(hass)
    await call(hass, "alarm_disarm")
    await settle(hass)
    assert targets(on) == [AFTER]


async def test_disarming_during_the_exit_delay_runs_them_too(hass: HomeAssistant) -> None:
    """Auch mitten in der Ausgangsverzögerung: "immer, wenn deaktiviert wird"."""
    _entry, _played, _stopped, on = await _setup(hass, {"away": [act(AFTER)]})
    await call(hass, "alarm_arm_away")
    assert state(hass) == AlarmControlPanelState.ARMING
    await call(hass, "alarm_disarm")
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.DISARMED and targets(on) == [AFTER]


async def test_disarming_during_the_entry_delay_runs_them_too(hass: HomeAssistant) -> None:
    _entry, _played, _stopped, on = await _setup(hass, {"home": [act(AFTER)]})
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, FRONT_DOOR)
    assert state(hass) == AlarmControlPanelState.PENDING and not on
    await call(hass, "alarm_disarm")
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.DISARMED and targets(on) == [AFTER]


async def test_disarming_during_an_alarm_runs_the_actions_after_the_alarm_and_then_these(hass: HomeAssistant, freezer) -> None:
    """Aus dem Alarm: erst endet er (Töne stoppen, Geräte zurück), dann die Aktionen nach dem Quittieren, danach "Beim Deaktivieren"."""
    entry, played, stopped, on = await _setup(
        hass, {"home": [off_tone(3)]}, workflows_after={"home": [act(AFTER)]})
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    assert state(hass) == AlarmControlPanelState.TRIGGERED and targets(on) == [SIREN]
    on.clear()
    await call(hass, "alarm_disarm")
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.DISARMED
    assert targets(on) == [AFTER], "die Aktionen nach dem Quittieren laufen zuerst"
    assert len(played) == 1 and played[0].data["media_content_id"].endswith("/off_fall.wav"), "danach der Deaktivierungston"
    await advance(hass, freezer, 4)
    await settle(hass)
    assert entry.runtime_data.workflow.running is None


async def test_acknowledging_is_not_disarming(hass: HomeAssistant) -> None:
    """Quittieren lässt die Anlage scharf: "Beim Deaktivieren" läuft nicht."""
    _entry, played, _stopped, on = await _setup(hass, {"home": [off_tone(3), act(LIGHT)]})
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    on.clear()
    entry_ctl = _entry.runtime_data.controller
    entry_ctl.acknowledge()
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    assert not played and LIGHT not in targets(on)


async def test_an_alarm_from_an_always_active_sensor_while_disarmed_has_no_mode(hass: HomeAssistant) -> None:
    """Ohne scharfe Anlage gibt es keinen Modus: nach einem Alarm durch einen "immer aktiven" Sensor laufen die Schritte eines früheren Modus nicht."""
    _entry, played, _stopped, on = await _setup(
        hass, {"home": [off_tone(3), act(LIGHT)]}, sensor_options={SMOKE: {"always": True}},
        workflows={"home": [act(SIREN)], "always": [act(SIREN)]})
    await call(hass, "alarm_arm_home")
    await settle(hass)
    await call(hass, "alarm_disarm")
    await settle(hass)
    assert targets(on) == [LIGHT]  # der erste Deaktivierungston gehört zu Anwesend
    played.clear()
    on.clear()
    await open_sensor(hass, SMOKE)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    on.clear()
    await call(hass, "alarm_disarm")
    await settle(hass)
    assert LIGHT not in targets(on) and not played, "ohne Modus keine Aktionen beim Deaktivieren"


async def test_arming_again_ends_the_disarm_actions_at_once(hass: HomeAssistant) -> None:
    _entry, played, stopped, _on = await _setup(hass, {"home": [off_tone(60)]}, exit_delay_away=0)
    await call(hass, "alarm_arm_home")
    await settle(hass)
    await call(hass, "alarm_disarm")
    await settle(hass)
    assert len(played) == 1
    stopped.clear()
    await call(hass, "alarm_arm_away")
    await settle(hass)
    assert stopped, "der laufende Deaktivierungston wird still, wenn wieder scharf geschaltet wird"
    assert _entry.runtime_data.workflow.running is None


async def test_a_new_alarm_takes_over_from_the_disarm_actions(hass: HomeAssistant) -> None:
    """Ein "immer aktiver" Sensor löst während des Deaktivierungstons aus: der Alarm hat Vorrang, seine Sirene schaltet."""
    entry, played, _stopped, on = await _setup(
        hass, {"home": [off_tone(60)]}, sensor_options={SMOKE: {"always": True}},
        workflows={"home": [act(SIREN)], "always": [act(SIREN)]})
    await call(hass, "alarm_arm_home")
    await settle(hass)
    await call(hass, "alarm_disarm")
    await settle(hass)
    assert len(played) == 1 and entry.runtime_data.workflow.running.get("phase") == "disarmed"
    await open_sensor(hass, SMOKE)
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.TRIGGERED and SIREN in targets(on)


# ----- Speichern, Prüfen, Sicherung -----


@pytest.mark.parametrize(
    "step",
    [
        {"type": "notify"},
        {"type": "acknowledge"},
        {"type": "sound", "players": [PLAYER], "sound": "siren", "duration": 5},
        {"type": "chime", "players": [PLAYER], "sound": "tone_pip", "duration": 3},
        {"type": "prealarm", "players": [PLAYER], "sound": "pre_beep", "duration": 5},
        {"type": "dechime", "players": [], "duration": 3},
        {"type": "dechime", "players": [PLAYER], "duration": 0},
        {"type": "dechime", "players": [PLAYER], "sound": "gibt_es_nicht"},
    ],
)
async def test_only_what_belongs_to_disarming_is_accepted(hass: HomeAssistant, hass_ws_client, step: dict) -> None:
    entry = await setup_alarm(hass)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "alarmageddon/save_workflows", "entry_id": entry.entry_id, "workflows": {}, "workflows_disarmed": {"home": [step]}})
    assert (await client.receive_json())["error"]["code"] == "invalid_format"
    assert "workflows_disarmed" not in entry.options


async def test_the_disarm_actions_are_saved_shown_and_part_of_the_backup(hass: HomeAssistant, hass_ws_client) -> None:
    entry = await setup_alarm(hass)
    client = await hass_ws_client(hass)
    steps = [off_tone(5, volume=0.4), act(LIGHT, restore=True), {"type": "wait", "seconds": 2}]
    await client.send_json_auto_id({"type": "alarmageddon/save_workflows", "entry_id": entry.entry_id, "workflows": {}, "workflows_disarmed": {"home": steps}})
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    saved = entry.options["workflows_disarmed"]["home"]
    assert saved[0] == {"type": "dechime", "players": [PLAYER], "sound": "off_fall", "duration": 5, "volume": 0.4, "restore": True}
    assert saved[1]["restore"] is False, "ein Gerät wird dort nie zurückgesetzt"
    await client.send_json_auto_id({"type": "alarmageddon/data"})
    system = (await client.receive_json())["result"]["systems"][0]
    assert system["workflows_disarmed"] == entry.options["workflows_disarmed"]
    await client.send_json_auto_id({"type": "alarmageddon/export"})
    backup = (await client.receive_json())["result"]
    assert backup["systems"][0]["options"]["workflows_disarmed"] == entry.options["workflows_disarmed"]
    # Leer löscht; der Modus, der in der Meldung fehlt, behält seinen Ablauf
    await client.send_json_auto_id({"type": "alarmageddon/save_workflows", "entry_id": entry.entry_id, "workflows": {}, "workflows_disarmed": {"away": []}})
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    assert entry.options["workflows_disarmed"] == {"home": saved}
    await client.send_json_auto_id({"type": "alarmageddon/save_workflows", "entry_id": entry.entry_id, "workflows": {}, "workflows_disarmed": {"home": []}})
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    assert entry.options["workflows_disarmed"] == {}


async def test_too_many_steps_are_refused(hass: HomeAssistant, hass_ws_client) -> None:
    entry = await setup_alarm(hass)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "alarmageddon/save_workflows", "entry_id": entry.entry_id, "workflows": {}, "workflows_disarmed": {"home": [{"type": "wait", "seconds": 1}] * (MAX_STEPS + 1)}})
    assert (await client.receive_json())["error"]["code"] == "invalid_format"


async def test_the_disarm_tone_puts_the_speaker_back_like_the_other_tones(hass: HomeAssistant, freezer) -> None:
    """Auch der Deaktivierungston merkt sich den Lautsprecher und stellt ihn danach zurück (Standard an, je Schritt abschaltbar)."""
    hass.states.async_set(PLAYER, "off", {"volume_level": 0.2})
    _entry, played, _stopped, _on = await _setup(hass, {"home": [off_tone(3, volume=0.9)]}, exit_delay_away=0)
    hass.states.async_set(PLAYER, "off", {"volume_level": 0.2})
    turned_off = async_mock_service(hass, "media_player", "turn_off")
    volumes = async_mock_service(hass, "media_player", "volume_set")
    await call(hass, "alarm_arm_home")
    await settle(hass)
    await call(hass, "alarm_disarm")
    await settle(hass)
    assert [c.data["volume_level"] for c in volumes] == [0.9]
    await advance(hass, freezer, 4)
    await settle(hass)
    assert [c.data["volume_level"] for c in volumes] == [0.9, 0.2] and turned_off
