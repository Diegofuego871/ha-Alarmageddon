"""
Aktionen während der Verzögerungen (1.18.0).

Zwei neue Listen je Modus: "Scharfschalten beginnt" (die Ausgangsverzögerung läuft) und "Eingangsverzögerung läuft" (Zeit zum
Deaktivieren, vor dem Alarm). Ein Ton mit "delay" dauert so lange wie die Verzögerung, die gerade läuft. Die Läufe enden mit
der Verzögerung oder beim Deaktivieren; der Alarm hat immer Vorrang (dass er nie aufgehalten wird: tests/test_action_hang.py).
"""

from __future__ import annotations

from typing import Any

import pytest
from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import HomeAssistant, ServiceCall
from pytest_homeassistant_custom_component.common import async_mock_service

from custom_components.alarmageddon.const import MAX_STEPS

from .conftest import FRONT_DOOR, WINDOW, setup_alarm
from .test_alarm import advance, call, open_sensor, settle, state

PLAYER = "media_player.flur"
SIREN, LIGHT, BLIND = "switch.sirene", "switch.licht", "switch.rollladen"


def act(target: str, **more: Any) -> dict[str, Any]:
    return {"type": "action", "action": "switch.turn_on", "target": [target], "wait": False, **more}


def tone(kind: str = "chime", **more: Any) -> dict[str, Any]:
    """Ton, der der Verzögerung folgt; "duration" ist nur der Rückfall für den Test eines Schritts."""
    return {"type": kind, "players": [PLAYER], "sound": "tone_pip" if kind == "chime" else "pre_beep", "duration": 5, "delay": True, **more}


async def _setup(hass: HomeAssistant, **options: Any):
    await hass.config.async_update(internal_url="http://192.168.1.2:8123")
    hass.states.async_set(PLAYER, "idle")
    played = async_mock_service(hass, "media_player", "play_media")
    stopped = async_mock_service(hass, "media_player", "media_stop")
    async_mock_service(hass, "media_player", "volume_set")
    on = async_mock_service(hass, "switch", "turn_on")
    entry = await setup_alarm(hass, **{"workflows": {"home": [act(SIREN)], "away": [act(SIREN)]}, **options})
    return entry, played, stopped, on


def targets(calls: list[ServiceCall]) -> list[str]:
    return [t for c in calls for t in c.data["entity_id"]]


def seconds(play: ServiceCall) -> float:
    """Länge der Tondatei aus der Adresse (…/sound_loop/<Millisekunden>/<Ton>.wav)."""
    return int(play.data["media_content_id"].rsplit("/", 2)[-2]) / 1000


# ----- Ausgangsverzögerung: "Scharfschalten beginnt" -----


async def test_exit_delay_runs_its_actions_at_once_and_the_tone_lasts_as_long_as_the_delay(hass: HomeAssistant, freezer) -> None:
    """Scharfschalten mit 30 s Ausgangsverzögerung: die Schritte starten sofort, der Ton ist eine Datei von 30 s; scharf: er endet, danach die Schritte von "scharf"."""
    entry, played, stopped, on = await _setup(hass, workflows_arming={"away": [tone(), act(LIGHT)]}, workflows_armed={"away": [act(BLIND)]})
    runner = entry.runtime_data.workflow
    await call(hass, "alarm_arm_away")
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.ARMING
    assert len(played) == 1 and played[0].data["entity_id"] == [PLAYER] and seconds(played[0]) == 30
    assert played[0].data["media_content_id"].endswith("/tone_pip.wav")
    assert targets(on) == [LIGHT] and runner.running.get("phase") == "arming"
    await advance(hass, freezer, 31)
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.ARMED_AWAY
    assert len(stopped) >= 1 and len(played) == 1
    assert targets(on) == [LIGHT, BLIND]  # danach "Anlage scharf geschaltet"
    await advance(hass, freezer, 5)
    assert runner.running is None


async def test_the_exit_tone_ends_when_armed_even_without_actions_afterwards(hass: HomeAssistant, freezer) -> None:
    """Ohne Schritte unter "Anlage scharf geschaltet" endet der Lauf der Ausgangsverzögerung trotzdem, sobald die Anlage scharf ist."""
    entry, played, stopped, _on = await _setup(hass, workflows_arming={"away": [tone(), {"type": "wait", "seconds": 300}, act(LIGHT)]})
    runner = entry.runtime_data.workflow
    await call(hass, "alarm_arm_away")
    await settle(hass)
    assert runner.running.get("phase") == "arming" and len(played) == 1
    await advance(hass, freezer, 31)
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.ARMED_AWAY and runner.running is None and len(stopped) >= 1
    await advance(hass, freezer, 400)
    assert LIGHT not in targets(_on)  # der wartende Schritt lief nie: die Verzögerung war vorher um


async def test_disarming_during_the_exit_delay_silences_the_tone_at_once(hass: HomeAssistant, freezer) -> None:
    entry, played, stopped, on = await _setup(hass, workflows_arming={"away": [tone(), {"type": "wait", "seconds": 10}, act(LIGHT)]}, workflows_armed={"away": [act(BLIND)]})
    runner = entry.runtime_data.workflow
    await call(hass, "alarm_arm_away")
    await settle(hass)
    assert len(played) == 1 and not stopped
    await call(hass, "alarm_disarm")
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.DISARMED and len(stopped) >= 1 and runner.running is None
    await advance(hass, freezer, 60)
    assert targets(on) == [] and len(played) == 1  # nichts läuft nach, auch nicht "scharf geschaltet"


async def test_without_an_exit_delay_these_actions_never_run(hass: HomeAssistant, freezer) -> None:
    """Ausgangsverzögerung 0 (hier: Anwesend): es gibt keine Verzögerung, also läuft auch nichts dazu; "scharf geschaltet" läuft wie immer."""
    _entry, played, _stopped, on = await _setup(hass, workflows_arming={"home": [tone(), act(LIGHT)]}, workflows_armed={"home": [act(BLIND)]})
    await call(hass, "alarm_arm_home")
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    await advance(hass, freezer, 60)
    assert targets(on) == [BLIND] and not played


async def test_each_mode_has_its_own_delay_actions(hass: HomeAssistant) -> None:
    _entry, _played, _stopped, on = await _setup(hass, workflows_arming={"away": [act("switch.away")], "night": [act("switch.night")]}, night_enabled=True, exit_delay_night=15)
    await call(hass, "alarm_arm_night")
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.ARMING and targets(on) == ["switch.night"]


# ----- Eingangsverzögerung: "Eingangsverzögerung läuft" -----


async def test_entry_delay_runs_its_actions_and_the_alarm_takes_over(hass: HomeAssistant, freezer) -> None:
    """Eingangssensor öffnet: der Voralarm spielt die 20 s der Eingangsverzögerung; beginnt der Alarm, endet er, die Alarmaktionen laufen."""
    entry, played, stopped, on = await _setup(hass, workflows_entry={"home": [tone("prealarm"), act(LIGHT)]})
    runner = entry.runtime_data.workflow
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, FRONT_DOOR)
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.PENDING
    assert len(played) == 1 and seconds(played[0]) == 20 and played[0].data["media_content_id"].endswith("/pre_beep.wav")
    assert targets(on) == [LIGHT] and runner.running.get("phase") == "pending"
    await advance(hass, freezer, 21)
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    assert len(stopped) >= 1 and targets(on) == [LIGHT, SIREN]
    assert runner.running and not runner.running.get("after")  # ab hier der Lauf des Alarms


async def test_the_tone_follows_the_delay_of_the_sensor_that_started_it(hass: HomeAssistant) -> None:
    """Hat der Sensor eine eigene Eingangsverzögerung, gilt seine: der Ton endet immer zusammen mit der Verzögerung, die wirklich läuft."""
    _entry, played, _stopped, _on = await _setup(hass, workflows_entry={"home": [tone("prealarm")]}, sensor_options={FRONT_DOOR: {"entry_delay": 45}})
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, FRONT_DOOR)
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.PENDING and len(played) == 1 and seconds(played[0]) == 45


async def test_disarming_during_the_entry_delay_silences_the_tone_and_no_alarm_follows(hass: HomeAssistant, freezer) -> None:
    entry, played, stopped, on = await _setup(hass, workflows_entry={"home": [tone("prealarm"), {"type": "wait", "seconds": 5}, act(LIGHT)]})
    runner = entry.runtime_data.workflow
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, FRONT_DOOR)
    await settle(hass)
    assert len(played) == 1 and not stopped
    await call(hass, "alarm_disarm")
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.DISARMED and len(stopped) >= 1 and runner.running is None
    await advance(hass, freezer, 60)
    assert targets(on) == [] and state(hass) == AlarmControlPanelState.DISARMED


async def test_a_sensor_without_delay_starts_the_alarm_at_once_during_the_entry_delay(hass: HomeAssistant, freezer) -> None:
    """Während der Eingangsverzögerung spricht ein Sensor ohne Verzögerung an: der Alarm beginnt sofort und übernimmt."""
    entry, _played, stopped, on = await _setup(hass, workflows_entry={"home": [tone("prealarm"), {"type": "wait", "seconds": 15}, act(LIGHT)]})
    runner = entry.runtime_data.workflow
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, FRONT_DOOR)
    await settle(hass)
    await open_sensor(hass, WINDOW)
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.TRIGGERED and targets(on) == [SIREN] and len(stopped) >= 1
    assert runner.running and not runner.running.get("after")
    await advance(hass, freezer, 30)
    assert LIGHT not in targets(on)  # der wartende Schritt der Verzögerung lief nie


async def test_an_arming_tone_still_playing_is_replaced_by_the_entry_actions(hass: HomeAssistant, freezer) -> None:
    """Läuft der Aktivierungston von "scharf geschaltet" noch, wenn die Eingangsverzögerung beginnt, löst ihr Lauf ihn ab."""
    chime = {"type": "chime", "players": [PLAYER], "sound": "tone_pip", "duration": 60}
    entry, played, stopped, _on = await _setup(hass, workflows_armed={"home": [chime]}, workflows_entry={"home": [tone("prealarm")]})
    runner = entry.runtime_data.workflow
    await call(hass, "alarm_arm_home")
    await settle(hass)
    assert runner.running.get("phase") == "armed" and len(played) == 1
    await open_sensor(hass, FRONT_DOOR)
    await settle(hass)
    assert runner.running.get("phase") == "pending" and len(stopped) >= 1
    assert len(played) == 2 and seconds(played[1]) == 20


# ----- Neuladen, Test eines Schritts, Aufräumen -----


async def test_a_reload_during_the_exit_delay_resumes_only_the_tone_for_the_rest(hass: HomeAssistant, freezer) -> None:
    """Einstellungen mitten in der Ausgangsverzögerung gespeichert: der Ton läuft für die Restzeit weiter, das Gerät schaltet kein zweites Mal."""
    entry, played, _stopped, on = await _setup(hass, workflows_arming={"away": [act(LIGHT), tone()]})
    await call(hass, "alarm_arm_away")
    await settle(hass)
    assert targets(on) == [LIGHT] and len(played) == 1 and seconds(played[0]) == 30
    await advance(hass, freezer, 12)
    assert await hass.config_entries.async_reload(entry.entry_id)
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.ARMING
    assert len(played) == 2 and seconds(played[1]) == 18
    assert targets(on) == [LIGHT]
    assert entry.runtime_data.workflow.running.get("phase") == "arming"


async def test_testing_a_step_plays_its_own_duration(hass: HomeAssistant) -> None:
    """Ohne laufende Verzögerung (Test eines Schritts) gilt die Dauer des Schritts; die Angabe "delay" hängt an keiner Verzögerung."""
    entry, played, _stopped, _on = await _setup(hass)
    runner = entry.runtime_data.workflow
    assert await runner.async_run("home", test=True, steps=[tone("prealarm", duration=7)])
    await settle(hass)
    assert len(played) == 1 and seconds(played[0]) == 7
    await runner.async_stop()


async def test_stopping_a_delay_run_never_touches_an_alarm_that_started_meanwhile(hass: HomeAssistant) -> None:
    """
    Das Beenden eines Laufs neben dem Alarm stoppt danach seine Lautsprecher und löscht seinen Stand. Hat währenddessen der
    Alarm begonnen, gehören Lautsprecher und Ablage ihm: kein Stopp (das brächte seine Sirene zum Schweigen), kein Löschen.
    """
    entry, _played, stopped, _on = await _setup(hass, workflows_entry={"home": [tone("prealarm")]})
    runner = entry.runtime_data.workflow
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, FRONT_DOOR)
    await settle(hass)
    assert runner.running.get("phase") == "pending"
    alarm = {"trigger": "home", "index": 0, "test": False, "snapshot": {}, "sonos": [], "steps": None}
    removed: list[bool] = []

    async def end_and_alarm_starts() -> None:
        runner._run = alarm  # der Alarm hat begonnen, während die Schritte der Verzögerung enden

    async def remove() -> None:
        removed.append(True)

    runner._end_test = end_and_alarm_starts
    runner._store.async_remove = remove
    before = len(stopped)
    await runner._stop_side_run()
    await settle(hass)
    assert runner.running is alarm and len(stopped) == before and not removed
    runner._run = None


# ----- Speichern, Prüfen, Sicherung -----


@pytest.mark.parametrize(
    ("key", "steps"),
    [
        ("workflows_arming", [{"type": "notify"}]),
        ("workflows_arming", [{"type": "acknowledge"}]),
        ("workflows_arming", [{"type": "sound", "players": [PLAYER], "sound": "siren", "duration": 10}]),
        ("workflows_arming", [{"type": "prealarm", "players": [PLAYER], "duration": 10}]),
        ("workflows_arming", [{"type": "wait", "seconds": 1}] * (MAX_STEPS + 1)),
        ("workflows_entry", [{"type": "notify"}]),
        ("workflows_entry", [{"type": "acknowledge"}]),
        ("workflows_entry", [{"type": "sound", "players": [PLAYER], "sound": "siren", "duration": 0}]),
        ("workflows_entry", [{"type": "prealarm", "players": [], "delay": True}]),
    ],
    ids=["Ausgang: Alarmmeldung", "Ausgang: Quittieren", "Ausgang: Sirene", "Ausgang: Voralarm", "Ausgang: zu viele",
         "Eingang: Alarmmeldung", "Eingang: Quittieren", "Eingang: Sirene", "Eingang: Ton ohne Lautsprecher"],
)
async def test_invalid_delay_actions_are_rejected(hass: HomeAssistant, hass_ws_client, key: str, steps: list) -> None:
    """Während einer Verzögerung: Gerät, Aktivierungston, Warten (Eingang auch Voralarm). Sirene, Alarmmeldung und Quittieren gehören zum Alarm."""
    entry = await setup_alarm(hass)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "alarmageddon/save_workflows", "entry_id": entry.entry_id, "workflows": {}, key: {"home": steps}})
    result = await client.receive_json()
    assert result["success"] is False and result["error"]["code"] == "invalid_format"
    assert key not in entry.options


async def test_delay_actions_are_saved_shown_and_part_of_the_backup(hass: HomeAssistant, hass_ws_client) -> None:
    """Speichern über das Panel (nur für Modi), in den Daten des Panels und in der Sicherung; "delay" bleibt nur in diesen Listen."""
    entry = await setup_alarm(hass, sensor_options={FRONT_DOOR: {"entry_delay": 45}})
    client = await hass_ws_client(hass)
    arming = {"away": [tone(volume=0.4), act(LIGHT, restore=True)]}
    entry_steps = {"home": [tone("prealarm"), {"type": "chime", "players": [PLAYER], "duration": 3, "delay": False}]}
    elsewhere = {"type": "chime", "players": [PLAYER], "sound": "tone_pip", "duration": 3, "delay": True}
    await client.send_json_auto_id({
        "type": "alarmageddon/save_workflows", "entry_id": entry.entry_id, "workflows": {"home": [{**elsewhere, "type": "prealarm", "sound": "pre_beep"}]},
        "workflows_arming": arming, "workflows_entry": entry_steps, "workflows_armed": {"home": [elsewhere]}, "workflows_after": {"home": [elsewhere]},
    })
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    saved = entry.options["workflows_arming"]["away"]
    assert saved[0] == {"type": "chime", "players": [PLAYER], "sound": "tone_pip", "duration": 5, "delay": True, "volume": 0.4} and saved[1]["restore"] is False
    assert entry.options["workflows_entry"]["home"][0]["delay"] is True and "delay" not in entry.options["workflows_entry"]["home"][1]
    # Ausserhalb der Verzögerungen gibt es die Angabe nicht: dort gilt immer die Dauer des Schritts
    for key in ("workflows", "workflows_armed", "workflows_after"):
        assert "delay" not in entry.options[key]["home"][0], key
    await client.send_json_auto_id({"type": "alarmageddon/data"})
    system = (await client.receive_json())["result"]["systems"][0]
    assert system["workflows_arming"] == entry.options["workflows_arming"] and system["workflows_entry"] == entry.options["workflows_entry"]
    # Längste Eingangsverzögerung je Modus: der eigene Wert der Haustür (45 s) zählt mit
    assert system["entry_delay_max"] == {"home": 45, "away": 45}
    for key in ("workflows_arming", "workflows_entry"):
        await client.send_json_auto_id({"type": "alarmageddon/save_workflows", "entry_id": entry.entry_id, "workflows": {}, key: {"always": [act(LIGHT)]}})
        assert (await client.receive_json())["error"]["code"] == "invalid_format"  # "Immer aktiv" kennt keine Verzögerung
    await client.send_json_auto_id({"type": "alarmageddon/export"})
    backup = (await client.receive_json())["result"]
    assert backup["systems"][0]["options"]["workflows_arming"] == entry.options["workflows_arming"]
    assert backup["systems"][0]["options"]["workflows_entry"] == entry.options["workflows_entry"]
    await client.send_json_auto_id({"type": "alarmageddon/save_workflows", "entry_id": entry.entry_id, "workflows": {}, "workflows_arming": {"away": []}, "workflows_entry": {"home": []}})
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    assert entry.options["workflows_arming"] == {} and entry.options["workflows_entry"] == {}
    await client.send_json_auto_id({"type": "alarmageddon/import", "data": backup})
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    assert entry.options["workflows_arming"]["away"] == saved and entry.options["workflows_entry"]["home"][0]["delay"] is True


async def test_no_entry_delay_possible_is_reported_as_zero(hass: HomeAssistant, hass_ws_client) -> None:
    """Ohne Eingangssensor in der Zone (oder mit Verzögerung 0) läuft dort nie eine Eingangsverzögerung: das Panel zeigt den Punkt dann nicht."""
    await setup_alarm(hass, entry_delay=0, zone_away=[WINDOW])
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "alarmageddon/data"})
    system = (await client.receive_json())["result"]["systems"][0]
    assert system["entry_delay_max"] == {"home": 0, "away": 0}
