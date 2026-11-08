"""Benachrichtigungen und Aktionen als Ablauf (0.4.0)."""

from __future__ import annotations

from typing import Any

from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import HomeAssistant, State
from pytest_homeassistant_custom_component.common import async_mock_service, mock_restore_cache_with_extra_data

from custom_components.alarmageddon.code import hash_code

from .conftest import ALARM, WINDOW, setup_alarm
from .test_alarm import advance, call, open_sensor, state

SIREN = "switch.sirene"
PLAYER = "media_player.wohnzimmer"


async def _notify_settings(hass: HomeAssistant, hass_ws_client, **notify: Any) -> None:
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "alarmageddon/save_notify", "notify": {"alarm_targets": ["notify.handy"], "maintenance_targets": ["notify.tablet"], **notify}})
    assert (await client.receive_json())["success"]


async def test_critical_push_on_alarm(hass: HomeAssistant, hass_ws_client) -> None:
    pushes = async_mock_service(hass, "notify", "handy")
    await setup_alarm(hass)
    await _notify_settings(hass, hass_ws_client, types={"triggered": {"volume": 0.6}})
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await hass.async_block_till_done()
    assert len(pushes) == 1
    data = pushes[0].data
    assert data["title"] == "Alarm: Haus"
    assert data["data"]["push"]["sound"] == {"name": "default", "critical": 1, "volume": 0.6}
    assert data["data"]["channel"] == "alarm_stream" and data["data"]["priority"] == "high"
    # Deaktivieren per Push ist standardmässig aus (Sicherheitsregel)
    assert [a["action"] for a in data["data"]["actions"]] == ["ALARMAGEDDON_OPEN"]
    tag = data["data"]["tag"]
    # Deaktivieren ersetzt die Meldung (gleicher tag), nicht mehr kritisch
    await call(hass, "alarm_disarm")
    await hass.async_block_till_done()
    assert pushes[1].data["title"] == "Alarm ended: Haus"
    assert pushes[1].data["data"]["tag"] == tag and "push" not in pushes[1].data["data"]


async def test_german_texts(hass: HomeAssistant, hass_ws_client) -> None:
    pushes = async_mock_service(hass, "notify", "handy")
    hass.config.language = "de"
    await setup_alarm(hass)
    await _notify_settings(hass, hass_ws_client)
    await call(hass, "alarm_trigger")
    await hass.async_block_till_done()
    assert "von Hand" in pushes[0].data["message"]


async def test_disarm_from_push(hass: HomeAssistant, hass_ws_client) -> None:
    """Knopf "Deaktivieren": nur wenn eingeschaltet, dann auch ohne Code."""
    async_mock_service(hass, "notify", "handy")
    code_hash, salt = hash_code("1234")
    entry = await setup_alarm(hass, code_hash=code_hash, code_salt=salt)
    await _notify_settings(hass, hass_ws_client)
    await call(hass, "alarm_arm_home")
    action = f"ALARMAGEDDON_DISARM_{entry.entry_id}"
    hass.bus.async_fire("mobile_app_notification_action", {"action": action})
    await hass.async_block_till_done()
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    await _notify_settings(hass, hass_ws_client, disarm_action=True)
    hass.bus.async_fire("mobile_app_notification_action", {"action": action})
    await hass.async_block_till_done()
    assert state(hass) == AlarmControlPanelState.DISARMED


async def test_arm_failed_and_offline_pushes(hass: HomeAssistant, hass_ws_client) -> None:
    pushes = async_mock_service(hass, "notify", "handy")
    await setup_alarm(hass)
    await _notify_settings(hass, hass_ws_client)
    hass.states.async_set(WINDOW, "on")
    try:
        await call(hass, "alarm_arm_home")
    except Exception:  # noqa: BLE001
        pass
    await hass.async_block_till_done()
    assert pushes[-1].data["title"] == "Haus: cannot arm Home"
    hass.states.async_set(WINDOW, "off")
    await call(hass, "alarm_arm_home")
    hass.states.async_set(WINDOW, "unavailable")
    await hass.async_block_till_done()
    assert pushes[-1].data["title"].startswith("Sensor unreachable")
    assert pushes[-1].data["data"]["push"]["sound"]["critical"] == 1


async def test_test_notification(hass: HomeAssistant, hass_ws_client) -> None:
    tablet = async_mock_service(hass, "notify", "tablet")
    await setup_alarm(hass)
    await _notify_settings(hass, hass_ws_client)
    client = await hass_ws_client(hass)
    await client.send_json({"id": 5, "type": "alarmageddon/test_notify", "kind": "battery_low"})
    assert (await client.receive_json())["result"]["targets"] == ["notify.tablet"]
    await hass.async_block_till_done()
    assert tablet[0].data["title"] == "Test: Low battery"
    # Wartung ist standardmässig nicht kritisch
    assert "push" not in tablet[0].data["data"]


# ----- Ablauf -----

WORKFLOW = [
    {"type": "action", "action": "switch.turn_on", "target": [SIREN], "restore": True},
    {"type": "wait", "seconds": 30},
    {"type": "sound", "players": [PLAYER], "sound": "siren", "volume": 0.7, "repeat": 2},
]


async def _setup_workflow(hass: HomeAssistant, steps=None, **overrides):
    await hass.config.async_update(internal_url="http://192.168.1.2:8123")
    hass.states.async_set(SIREN, "off")
    hass.states.async_set(PLAYER, "playing", {"volume_level": 0.25, "is_volume_muted": False})
    services = {name: async_mock_service(hass, *name.split(".")) for name in (
        "switch.turn_on", "switch.turn_off", "media_player.volume_set", "media_player.play_media",
        "media_player.media_stop", "media_player.volume_mute",
    )}
    entry = await setup_alarm(hass, workflows={"home": steps if steps is not None else WORKFLOW}, **overrides)
    return entry, services


async def test_workflow_runs_in_order(hass: HomeAssistant, freezer) -> None:
    _entry, s = await _setup_workflow(hass)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await hass.async_block_till_done()
    assert len(s["switch.turn_on"]) == 1 and s["switch.turn_on"][0].data["entity_id"] == [SIREN]
    assert not s["media_player.play_media"]
    await advance(hass, freezer, 31)
    assert s["media_player.volume_set"][0].data["volume_level"] == 0.7
    play = s["media_player.play_media"][0].data
    assert play["media_content_id"] == "http://192.168.1.2:8123/alarmageddon_sounds/siren.wav"
    await advance(hass, freezer, 4.5)
    assert len(s["media_player.play_media"]) == 2  # Wiederholen


async def test_disarm_stops_and_restores(hass: HomeAssistant, freezer) -> None:
    """Deaktivieren während der Wartezeit: kein Alarmton mehr, Sirene aus, Lautstärke wie vorher."""
    _entry, s = await _setup_workflow(hass)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await hass.async_block_till_done()
    await call(hass, "alarm_disarm")
    await hass.async_block_till_done()
    assert s["switch.turn_off"][0].data["entity_id"] == SIREN
    assert s["media_player.media_stop"][0].data["entity_id"] == PLAYER
    assert s["media_player.volume_set"][-1].data["volume_level"] == 0.25
    await advance(hass, freezer, 60)
    assert not s["media_player.play_media"]


async def test_alarm_duration_over_restores(hass: HomeAssistant, freezer) -> None:
    _entry, s = await _setup_workflow(hass, trigger_time=20)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await advance(hass, freezer, 21)
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    assert s["switch.turn_off"]


async def test_failing_step_does_not_stop_others(hass: HomeAssistant, freezer) -> None:
    """Sicherheitsregel: Ein fehlerhafter Schritt bricht die übrigen nicht ab."""
    steps = [
        {"type": "action", "action": "light.turn_on", "target": ["light.gibt_es_nicht"]},
        {"type": "action", "action": "switch.turn_on", "target": [SIREN], "restore": True},
    ]
    _entry, s = await _setup_workflow(hass, steps)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await hass.async_block_till_done()
    assert len(s["switch.turn_on"]) == 1


async def test_notify_step_no_double_push(hass: HomeAssistant, hass_ws_client) -> None:
    pushes = async_mock_service(hass, "notify", "handy")
    await _setup_workflow(hass, [{"type": "notify"}])
    await _notify_settings(hass, hass_ws_client)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await hass.async_block_till_done()
    assert len(pushes) == 1


async def test_reload_during_alarm_continues(hass: HomeAssistant, freezer) -> None:
    """Optionen ändern (neu laden) mitten im Alarm: der Ablauf läuft weiter, Deaktivieren stellt trotzdem wieder her."""
    entry, s = await _setup_workflow(hass)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await hass.async_block_till_done()
    hass.config_entries.async_update_entry(entry, options={**entry.options, "entry_delay": 25})
    await hass.async_block_till_done()
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    await advance(hass, freezer, 31)
    assert s["media_player.play_media"]
    await call(hass, "alarm_disarm")
    await hass.async_block_till_done()
    assert s["switch.turn_off"] and s["media_player.volume_set"][-1].data["volume_level"] == 0.25


async def test_restart_after_disarm_restores(hass: HomeAssistant, hass_storage) -> None:
    """Neustart mitten im Alarm, danach deaktiviert: beim Start wird der Zustand vor dem Alarm wiederhergestellt."""
    hass.states.async_set(SIREN, "on")
    off = async_mock_service(hass, "switch", "turn_off")
    hass_storage["alarmageddon.workflow.e_test"] = {
        "version": 1, "key": "alarmageddon.workflow.e_test",
        "data": {"trigger": "home", "index": 1, "test": False, "sonos": [], "snapshot": {SIREN: {"state": "off", "attributes": {}}}},
    }
    mock_restore_cache_with_extra_data(hass, [(State(ALARM, "disarmed"), {"mode": None, "deadline": None, "bypassed": [], "triggered_by": None, "changed_by": None})])
    from pytest_homeassistant_custom_component.common import MockConfigEntry

    from .conftest import options

    hass.states.async_set(WINDOW, "off")
    entry = MockConfigEntry(domain="alarmageddon", entry_id="e_test", title="Haus", data={"name": "Haus"}, options=options(workflows={"home": WORKFLOW}))
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert off and off[0].data["entity_id"] == SIREN
    assert "alarmageddon.workflow.e_test" not in hass_storage


async def test_test_run_and_stop(hass: HomeAssistant, hass_ws_client, freezer) -> None:
    entry, s = await _setup_workflow(hass)
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "alarmageddon/test_workflow", "entry_id": entry.entry_id, "trigger": "home"})
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    assert s["switch.turn_on"]
    assert state(hass) == AlarmControlPanelState.DISARMED  # ein Test löst keinen Alarm aus
    await client.send_json({"id": 2, "type": "alarmageddon/stop_workflow", "entry_id": entry.entry_id})
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    assert s["switch.turn_off"]
    # Test endet auch von selbst
    await client.send_json({"id": 3, "type": "alarmageddon/test_workflow", "entry_id": entry.entry_id, "trigger": "home"})
    await client.receive_json()
    await advance(hass, freezer, 61)
    assert len(s["switch.turn_off"]) == 2
    # Leerer Ablauf
    await client.send_json({"id": 4, "type": "alarmageddon/test_workflow", "entry_id": entry.entry_id, "trigger": "away"})
    assert (await client.receive_json())["error"]["code"] == "empty"


async def test_stop_refused_during_real_alarm(hass: HomeAssistant, hass_ws_client) -> None:
    entry, s = await _setup_workflow(hass)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "alarmageddon/stop_workflow", "entry_id": entry.entry_id})
    assert (await client.receive_json())["error"]["code"] == "alarm_running"


async def test_save_workflows_validation(hass: HomeAssistant, hass_ws_client) -> None:
    entry = await setup_alarm(hass)
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "alarmageddon/save_workflows", "entry_id": entry.entry_id, "workflows": {"home": [{"type": "explode"}]}})
    assert not (await client.receive_json())["success"]
    await client.send_json({"id": 2, "type": "alarmageddon/save_workflows", "entry_id": entry.entry_id, "workflows": {"away": WORKFLOW, "home": []}})
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    assert entry.options["workflows"]["away"][2]["restore"] is True  # Medienplayer standardmässig zurücksetzen
    assert "home" not in entry.options["workflows"]
    await client.send_json({"id": 3, "type": "alarmageddon/data"})
    result = (await client.receive_json())["result"]
    assert result["systems"][0]["workflows"]["away"][0]["action"] == "switch.turn_on"
    assert {s["id"] for s in result["sounds"]} == {"siren", "beep", "klaxon", "warning", "chime"}


async def test_sounds_served_without_login(hass: HomeAssistant, hass_client_no_auth) -> None:
    await setup_alarm(hass)
    client = await hass_client_no_auth()
    resp = await client.get("/alarmageddon_sounds/siren.wav")
    assert resp.status == 200
    assert (await resp.read())[:4] == b"RIFF"


async def test_single_step_test_runs_only_that_step(hass: HomeAssistant, hass_ws_client) -> None:
    """Testknopf je Schritt (0.11.0): genau dieser Schritt, auch ungespeichert, mit Zurückstellen am Ende des Tests."""
    entry, s = await _setup_workflow(hass)
    client = await hass_ws_client(hass)
    hass.states.async_set("switch.lampe", "off")
    on = async_mock_service(hass, "switch", "turn_on")
    step = {"type": "action", "action": "switch.turn_on", "target": ["switch.lampe"], "data": {}, "restore": True}
    await client.send_json({"id": 1, "type": "alarmageddon/test_workflow", "entry_id": entry.entry_id, "trigger": "away", "step": step})
    assert (await client.receive_json())["success"]  # "away" hat keinen gespeicherten Ablauf: der Schritt zählt
    await hass.async_block_till_done()
    assert [c.data["entity_id"] for c in on] == [["switch.lampe"]] and not s["switch.turn_on"]
    assert state(hass) == AlarmControlPanelState.DISARMED
    # Stoppen stellt zurück (Lampe war aus)
    off = async_mock_service(hass, "switch", "turn_off")
    await client.send_json({"id": 2, "type": "alarmageddon/stop_workflow", "entry_id": entry.entry_id})
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    assert [c.data["entity_id"] for c in off] == [["switch.lampe"]] or [c.data["entity_id"] for c in off] == ["switch.lampe"]
    # Ungültiger Schritt wird abgelehnt
    await client.send_json({"id": 3, "type": "alarmageddon/test_workflow", "entry_id": entry.entry_id, "trigger": "away", "step": {"type": "explode"}})
    assert not (await client.receive_json())["success"]
    # Der gespeicherte Ablauf bleibt unberührt
    assert entry.options["workflows"] == {"home": WORKFLOW}


async def test_alarm_buttons_follow_settings(hass: HomeAssistant, hass_ws_client) -> None:
    """Knöpfe der Alarmmeldung (0.16.0): Öffnen an, Sirene stumm und Deaktivieren aus, einzeln schaltbar."""
    pushes = async_mock_service(hass, "notify", "handy")
    entry = await setup_alarm(hass)
    await _notify_settings(hass, hass_ws_client)

    async def actions():
        await call(hass, "alarm_trigger")
        await hass.async_block_till_done()
        titles = [a["action"] for a in pushes[-1].data["data"].get("actions", [])]
        await call(hass, "alarm_disarm")
        await hass.async_block_till_done()
        return titles

    assert await actions() == ["ALARMAGEDDON_OPEN"]
    await _notify_settings(hass, hass_ws_client, silence_action=True, open_action=False)
    assert await actions() == [f"ALARMAGEDDON_SILENCE_{entry.entry_id}"]
    await _notify_settings(hass, hass_ws_client, silence_action=True, open_action=True, disarm_action=True)
    assert await actions() == [f"ALARMAGEDDON_DISARM_{entry.entry_id}", f"ALARMAGEDDON_SILENCE_{entry.entry_id}", "ALARMAGEDDON_OPEN"]


async def test_silence_from_push_stops_steps_keeps_alarm(hass: HomeAssistant, hass_ws_client, freezer) -> None:
    """Sirene stumm: nur wenn eingeschaltet; stoppt die Schritte und stellt Geräte zurück, die Anlage bleibt im Alarm."""
    async_mock_service(hass, "notify", "handy")
    entry, services = await _setup_workflow(hass, [{"type": "action", "action": "switch.turn_on", "target": [SIREN], "restore": True}, {"type": "wait", "seconds": 300}])
    await _notify_settings(hass, hass_ws_client)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await hass.async_block_till_done()
    action = f"ALARMAGEDDON_SILENCE_{entry.entry_id}"
    hass.bus.async_fire("mobile_app_notification_action", {"action": action})
    await hass.async_block_till_done()
    assert entry.runtime_data.workflow.running  # aus: nichts passiert
    await _notify_settings(hass, hass_ws_client, silence_action=True)
    hass.bus.async_fire("mobile_app_notification_action", {"action": action})
    await hass.async_block_till_done()
    assert entry.runtime_data.workflow.running is None
    assert len(services["switch.turn_off"]) == 1  # Sirene zurückgestellt
    assert state(hass) == AlarmControlPanelState.TRIGGERED  # Alarm bleibt, Deaktivieren bleibt Sache des Nutzers
    assert entry.runtime_data.events.events[0]["kind"] == "silenced"
    await call(hass, "alarm_disarm")
    assert state(hass) == AlarmControlPanelState.DISARMED


async def test_detached_step_does_not_block_next_step(hass: HomeAssistant, freezer) -> None:
    """Nicht abwarten (0.17.0): der nächste Schritt startet sofort, der Ton läuft nebenher; Deaktivieren stoppt ihn."""
    _entry, s = await _setup_workflow(hass, [
        {"type": "sound", "players": [PLAYER], "sound": "siren", "repeat": 3, "detach": True},
        {"type": "action", "action": "switch.turn_on", "target": [SIREN]},
    ])
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await hass.async_block_till_done()
    assert len(s["switch.turn_on"]) == 1  # ohne "nicht abwarten" käme der Schalter erst nach dem Ton
    assert len(s["media_player.play_media"]) == 1
    await advance(hass, freezer, 5)
    assert len(s["media_player.play_media"]) == 2  # der Ton läuft nebenher weiter
    await call(hass, "alarm_disarm")
    await hass.async_block_till_done()
    count = len(s["media_player.play_media"])
    await advance(hass, freezer, 30)
    assert len(s["media_player.play_media"]) == count  # Deaktivieren hat auch den nebenher laufenden Schritt gestoppt


async def test_without_detach_next_step_waits(hass: HomeAssistant, freezer) -> None:
    _entry, s = await _setup_workflow(hass, [
        {"type": "sound", "players": [PLAYER], "sound": "siren", "repeat": 3},
        {"type": "action", "action": "switch.turn_on", "target": [SIREN]},
    ])
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await hass.async_block_till_done()
    assert not s["switch.turn_on"]


async def test_sound_for_seconds_then_stops(hass: HomeAssistant, freezer) -> None:
    """Alarmton mit Dauer (0.18.0): spielt so lange wie eingestellt, danach media_stop; der nächste Schritt wartet bis dahin."""
    _entry, s = await _setup_workflow(hass, [
        {"type": "sound", "players": [PLAYER], "sound": "siren", "duration": 10},
        {"type": "action", "action": "switch.turn_on", "target": [SIREN]},
    ])
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await hass.async_block_till_done()
    assert len(s["media_player.play_media"]) == 1 and not s["switch.turn_on"]
    await advance(hass, freezer, 4)
    assert len(s["media_player.play_media"]) == 2  # Ton dauert 4 s: nochmals
    await advance(hass, freezer, 4)
    assert len(s["media_player.play_media"]) == 3 and not s["switch.turn_on"]
    await advance(hass, freezer, 2)  # 10 s um
    assert s["media_player.media_stop"] and len(s["switch.turn_on"]) == 1  # nach 10 s gestoppt, der nächste Schritt läuft


async def test_sound_until_disarmed_and_silence(hass: HomeAssistant, hass_ws_client, freezer) -> None:
    """Dauer 0: der Ton läuft, bis deaktiviert wird; "Sirene stumm" stoppt ihn jederzeit, auch ohne laufenden Ablauf."""
    async_mock_service(hass, "notify", "handy")
    entry, s = await _setup_workflow(hass, [{"type": "sound", "players": [PLAYER], "sound": "siren", "duration": 0}])
    await _notify_settings(hass, hass_ws_client, silence_action=True)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await hass.async_block_till_done()
    for _ in range(15):  # der Ton dauert 4 s: schrittweise, wie die Zeit wirklich vergeht
        await advance(hass, freezer, 4)
    assert len(s["media_player.play_media"]) > 10  # läuft weiter, ohne Ende
    stops = len(s["media_player.media_stop"])
    hass.bus.async_fire("mobile_app_notification_action", {"action": f"ALARMAGEDDON_SILENCE_{entry.entry_id}"})
    await hass.async_block_till_done()
    assert len(s["media_player.media_stop"]) > stops and entry.runtime_data.workflow.running is None
    count = len(s["media_player.play_media"])
    for _ in range(5):
        await advance(hass, freezer, 4)
    assert len(s["media_player.play_media"]) == count
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    # Zweiter Druck, obwohl nichts mehr läuft: stoppt die Player trotzdem (der Ton könnte noch klingen)
    stops = len(s["media_player.media_stop"])
    hass.bus.async_fire("mobile_app_notification_action", {"action": f"ALARMAGEDDON_SILENCE_{entry.entry_id}"})
    await hass.async_block_till_done()
    assert len(s["media_player.media_stop"]) == stops + 1


async def test_custom_alarm_message_text(hass: HomeAssistant, hass_ws_client) -> None:
    """Eigener Titel und Text im Schritt "Push-Meldung" (0.19.0) mit Platzhaltern; ohne Angabe der Standardtext."""
    pushes = async_mock_service(hass, "notify", "handy")
    await setup_alarm(hass, workflows={"home": [{"type": "notify", "title": "ALARM bei {name}!", "message": "{sensor} hat um {time} ausgelöst ({mode}). {unbekannt}"}]})
    await _notify_settings(hass, hass_ws_client)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await hass.async_block_till_done()
    assert len(pushes) == 1
    assert pushes[0].data["title"] == "ALARM bei Haus!"
    assert pushes[0].data["message"].startswith(f"{hass.states.get(WINDOW).name} hat um ") and "(Home)" in pushes[0].data["message"] and "{unbekannt}" in pushes[0].data["message"]
    # Nur Titel eigen: der Text bleibt der Standard
    await call(hass, "alarm_disarm")
    await hass.async_block_till_done()
    pushes.clear()
    entry = hass.config_entries.async_entries("alarmageddon")[0]
    hass.config_entries.async_update_entry(entry, options={**entry.options, "workflows": {"home": [{"type": "notify", "title": "Nur Titel"}]}})
    await hass.async_block_till_done()
    hass.states.async_set(WINDOW, "off")
    await hass.async_block_till_done()
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await hass.async_block_till_done()
    assert pushes[-1].data["title"] == "Nur Titel" and pushes[-1].data["message"].startswith(f"{hass.states.get(WINDOW).name} at ")


async def test_alarm_message_settings_in_the_push_step(hass: HomeAssistant, hass_ws_client) -> None:
    """Kritisch, Lautstärke und Knöpfe stehen im Push-Schritt (0.20.0) und gelten vor den globalen Werten."""
    pushes = async_mock_service(hass, "notify", "handy")
    entry = await setup_alarm(hass, workflows={"home": [{"type": "notify", "critical": False, "volume": 0.3, "buttons": {"open": False, "silence": True, "disarm": False}}]})
    await _notify_settings(hass, hass_ws_client)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await hass.async_block_till_done()
    data = pushes[-1].data["data"]
    assert "push" not in data  # nicht kritisch, obwohl global kritisch
    assert [a["action"] for a in data["actions"]] == [f"ALARMAGEDDON_SILENCE_{entry.entry_id}"]
    await call(hass, "alarm_disarm")
    await hass.async_block_till_done()
    # Mit Lautstärke und kritisch im Schritt
    hass.config_entries.async_update_entry(entry, options={**entry.options, "workflows": {"home": [{"type": "notify", "critical": True, "volume": 0.3}]}})
    await hass.async_block_till_done()
    hass.states.async_set(WINDOW, "off")
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await hass.async_block_till_done()
    assert pushes[-1].data["data"]["push"]["sound"]["volume"] == 0.3
    assert [a["action"] for a in pushes[-1].data["data"]["actions"]] == ["ALARMAGEDDON_OPEN"]  # Knöpfe ohne Angabe: globale Werte


async def test_buttons_only_work_when_the_message_offers_them(hass: HomeAssistant, hass_ws_client) -> None:
    """Knopf "Deaktivieren" wirkt nur, wenn der Push-Schritt ihn anbietet; abgeleitet aus der Konfiguration (auch nach Neustart)."""
    async_mock_service(hass, "notify", "handy")
    entry = await setup_alarm(hass, workflows={"home": [{"type": "notify", "buttons": {"disarm": True}}]})
    await _notify_settings(hass, hass_ws_client)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await hass.async_block_till_done()
    hass.bus.async_fire("mobile_app_notification_action", {"action": f"ALARMAGEDDON_DISARM_{entry.entry_id}"})
    await hass.async_block_till_done()
    assert state(hass) == AlarmControlPanelState.DISARMED
    # Schritt ohne Knopf: die Aktion wird ignoriert
    hass.config_entries.async_update_entry(entry, options={**entry.options, "workflows": {"home": [{"type": "notify", "buttons": {"disarm": False}}]}})
    await hass.async_block_till_done()
    hass.states.async_set(WINDOW, "off")
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await hass.async_block_till_done()
    hass.bus.async_fire("mobile_app_notification_action", {"action": f"ALARMAGEDDON_DISARM_{entry.entry_id}"})
    await hass.async_block_till_done()
    assert state(hass) == AlarmControlPanelState.TRIGGERED


async def test_notifications_carry_the_integration_icon(hass: HomeAssistant, hass_ws_client, hass_client_no_auth) -> None:
    """Alle Meldungen tragen das Symbol der Integration (icon_url), und es ist ohne Anmeldung abrufbar (0.21.0)."""
    pushes = async_mock_service(hass, "notify", "handy")
    await setup_alarm(hass)
    await _notify_settings(hass, hass_ws_client)
    await call(hass, "alarm_trigger")
    await hass.async_block_till_done()
    assert pushes[-1].data["data"]["icon_url"] == "/alarmageddon_icon.png"
    client = await hass_client_no_auth()
    resp = await client.get("/alarmageddon_icon.png")
    assert resp.status == 200
    assert (await resp.read())[:8] == b"\x89PNG\r\n\x1a\n"


async def test_click_target_of_the_alarm_message(hass: HomeAssistant, hass_ws_client) -> None:
    """Klickziel (0.23.0): Standard ist das Protokoll mit dem laufenden Alarm, sonst Übersicht oder ein eigener Pfad."""
    pushes = async_mock_service(hass, "notify", "handy")
    entry = await setup_alarm(hass)
    await _notify_settings(hass, hass_ws_client)

    async def fire(steps):
        hass.config_entries.async_update_entry(entry, options={**entry.options, "workflows": {"home": steps} if steps else {}})
        await hass.async_block_till_done()
        hass.states.async_set(WINDOW, "off")
        await hass.async_block_till_done()
        await call(hass, "alarm_arm_home")
        await open_sensor(hass, WINDOW)
        await hass.async_block_till_done()
        data = pushes[-1].data["data"]
        await call(hass, "alarm_disarm")
        await hass.async_block_till_done()
        return data

    data = await fire(None)  # automatische Meldung ohne Push-Schritt
    assert data["url"] == data["clickAction"] == "/alarmageddon?view=log"
    assert data["actions"][0]["uri"] == "/alarmageddon?view=log"
    assert (await fire([{"type": "notify"}]))["url"] == "/alarmageddon?view=log"
    assert (await fire([{"type": "notify", "click": "overview"}]))["clickAction"] == "/alarmageddon"
    assert (await fire([{"type": "notify", "click": "custom", "click_path": "/lovelace/alarm"}]))["url"] == "/lovelace/alarm"
    # Eigener Pfad ohne Angabe: Rückfall auf das Protokoll
    assert (await fire([{"type": "notify", "click": "custom"}]))["url"] == "/alarmageddon?view=log"


async def test_click_path_is_validated(hass: HomeAssistant, hass_ws_client) -> None:
    from custom_components.alarmageddon.schemas import valid_step
    import voluptuous as vol
    import pytest

    assert valid_step({"type": "notify", "click": "custom", "click_path": "/lovelace/0"})["click_path"] == "/lovelace/0"
    for bad in ("https://example.org", "lovelace", "/mit leer", "x" * 300):
        with pytest.raises(vol.Invalid):
            valid_step({"type": "notify", "click": "custom", "click_path": bad})
    with pytest.raises(vol.Invalid):
        valid_step({"type": "notify", "click": "elsewhere"})
