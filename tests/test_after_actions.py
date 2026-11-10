"""
Aktionen nach dem Quittieren und die neue Regel für das Warten (1.10.0).

Nach dem Ende eines Alarms (quittiert oder deaktiviert) laufen die Schritte, die der Nutzer hinter "Alarm endet" gelegt hat:
erst nachdem der Ablauf gestoppt und die Geräte zurückgestellt sind, je Modus, unter derselben Aufsicht wie die Alarmaktionen.
Ein neuer Alarm hat immer Vorrang.

Warten: Schritte, die etwas ausführen (Gerät, Ton), laufen standardmässig weiter, der nächste startet sofort. Nur mit "wait"
wartet der Ablauf auf ihr Ende. Ältere Abläufe ohne diese Angabe verhalten sich wie bisher.
"""

from __future__ import annotations

import asyncio
from typing import Any

import pytest
from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import HomeAssistant, ServiceCall
from pytest_homeassistant_custom_component.common import async_mock_service

from custom_components.alarmageddon import workflow as wf
from custom_components.alarmageddon.const import MAX_STEPS

from .conftest import ALARM, FRONT_DOOR, WINDOW, setup_alarm
from .test_alarm import advance, call, open_sensor, settle, state
from .test_sensor_options import SMOKE, _classes

SIREN, BLINDS, LIGHT = "switch.sirene", "switch.storen", "switch.licht"
MAIN = [{"type": "action", "action": "switch.turn_on", "target": [SIREN], "wait": False}]


def act(target: str, **more: Any) -> dict[str, Any]:
    return {"type": "action", "action": "switch.turn_on", "target": [target], **more}


async def _setup(hass: HomeAssistant, after: dict[str, list], **options: Any):
    _classes(hass)
    on = async_mock_service(hass, "switch", "turn_on")
    off = async_mock_service(hass, "switch", "turn_off")
    entry = await setup_alarm(hass, exit_delay_away=0, **{"workflows": {"home": MAIN, "away": MAIN}, "workflows_after": after, **options})
    return entry, on, off


def targets(calls: list[ServiceCall]) -> list[str]:
    return [t for c in calls for t in c.data["entity_id"]]


async def close(hass: HomeAssistant, entity: str) -> None:
    hass.states.async_set(entity, "off")
    await settle(hass)


async def _spin(rounds: int = 40) -> None:
    for _ in range(rounds):
        await asyncio.sleep(0)


# ----- Aktionen nach dem Quittieren -----


@pytest.mark.parametrize("how", ["deaktivieren", "quittieren"])
async def test_after_actions_run_once_when_the_alarm_ends(hass: HomeAssistant, how: str) -> None:
    """Deaktivieren und Quittieren beenden den Alarm; danach laufen die Aktionen dahinter genau einmal, und der Lauf endet von selbst."""
    entry, on, _off = await _setup(hass, {"home": [act(BLINDS)]})
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    assert targets(on) == [SIREN] and state(hass) == AlarmControlPanelState.TRIGGERED
    if how == "deaktivieren":
        await call(hass, "alarm_disarm")
    else:
        assert entry.runtime_data.controller.acknowledge("Test")
    await settle(hass)
    assert targets(on) == [SIREN, BLINDS]
    assert state(hass) == (AlarmControlPanelState.DISARMED if how == "deaktivieren" else AlarmControlPanelState.ARMED_HOME)
    await settle(hass)
    assert entry.runtime_data.workflow.running is None and targets(on) == [SIREN, BLINDS]


async def test_no_after_actions_without_an_alarm(hass: HomeAssistant) -> None:
    """Ohne Alarm gibt es kein Ende: Scharfschalten und Deaktivieren, auch in der Eingangsverzögerung, lösen sie nicht aus."""
    _entry, on, _off = await _setup(hass, {"home": [act(BLINDS)]})
    await call(hass, "alarm_arm_home")
    await call(hass, "alarm_disarm")
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, FRONT_DOOR)
    assert state(hass) == AlarmControlPanelState.PENDING
    await call(hass, "alarm_disarm")
    await settle(hass)
    assert targets(on) == []


async def test_after_actions_follow_the_flows_of_the_alarm(hass: HomeAssistant) -> None:
    """Je Modus eigene Aktionen; laufen beim Alarm beide Abläufe (Modus und "Immer aktiv"), laufen danach beide, derselbe nur einmal."""
    zones = {"zone_away": [FRONT_DOOR, WINDOW, "binary_sensor.bewegung_flur", SMOKE]}
    both = {SMOKE: {"always": True, "always_off": False}}
    entry, on, _off = await _setup(hass, {"home": [act(LIGHT)], "away": [act(BLINDS)], "always": [act(LIGHT)]}, sensor_options=both,
                                   workflows={"home": MAIN, "away": MAIN, "always": [act("switch.immer")]}, **zones)
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, WINDOW)  # nur der Ablauf von Abwesend
    await call(hass, "alarm_disarm")
    await settle(hass)
    assert targets(on) == [SIREN, BLINDS]
    await close(hass, WINDOW)
    on.clear()
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, SMOKE)  # beide Abläufe: Abwesend und "Immer aktiv"
    assert sorted(targets(on)) == ["switch.immer", SIREN]
    await call(hass, "alarm_disarm")
    await settle(hass)
    assert targets(on)[2:] == [BLINDS, LIGHT]
    # Derselbe Ablauf für beide (ohne "Einstellungen pro Modus"): einmal
    await close(hass, SMOKE)
    on.clear()
    hass.config_entries.async_update_entry(entry, options={**entry.options, "workflows_after": {"away": [act(LIGHT)], "always": [act(LIGHT)]}})
    await settle(hass)
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, SMOKE)
    await call(hass, "alarm_disarm")
    await settle(hass)
    assert targets(on).count(LIGHT) == 1


async def test_after_actions_come_after_the_devices_are_restored(hass: HomeAssistant) -> None:
    """Reihenfolge am Ende: zuerst stoppt der Ablauf und die Geräte kehren zurück ("Rückgängig"), dann laufen die Aktionen danach."""
    hass.states.async_set(SIREN, "off")
    order: list[str] = []

    async def record(service_call: ServiceCall) -> None:
        order.append(f"{service_call.service}:{service_call.data['entity_id'] if isinstance(service_call.data['entity_id'], str) else service_call.data['entity_id'][0]}")

    for service in ("turn_on", "turn_off"):
        hass.services.async_register("switch", service, record)
    await setup_alarm(hass, workflows={"home": [act(SIREN, restore=True, wait=False)]}, workflows_after={"home": [act(BLINDS)]})
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await call(hass, "alarm_disarm")
    await settle(hass)
    assert order == [f"turn_on:{SIREN}", f"turn_off:{SIREN}", f"turn_on:{BLINDS}"]


async def test_a_new_alarm_cancels_the_after_actions(hass: HomeAssistant, freezer) -> None:
    """Ein neuer Alarm hat Vorrang: die Aktionen nach dem alten Alarm brechen ab, der Ablauf des neuen startet sofort."""
    entry, on, _off = await _setup(hass, {"home": [{"type": "wait", "seconds": 300}, act(BLINDS)]})
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await call(hass, "alarm_disarm")
    await settle(hass)
    runner = entry.runtime_data.workflow
    assert runner.running and runner.running.get("after")
    await close(hass, WINDOW)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await settle(hass)
    assert targets(on) == [SIREN, SIREN]
    assert runner.running and not runner.running.get("after") and state(hass) == AlarmControlPanelState.TRIGGERED
    await advance(hass, freezer, 301)
    assert BLINDS not in targets(on)


async def test_after_actions_keep_their_waiting_times_and_restore_nothing(hass: HomeAssistant, freezer, hass_ws_client) -> None:
    """ "Warten" gilt auch danach; während sie laufen, zeigt das Panel keinen laufenden Alarm, und zurückgestellt wird am Ende nichts. """
    entry, on, off = await _setup(hass, {"home": [act(LIGHT), {"type": "wait", "seconds": 60}, act(BLINDS)]})
    client = await hass_ws_client(hass)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await call(hass, "alarm_disarm")
    await settle(hass)
    assert targets(on) == [SIREN, LIGHT]
    await client.send_json({"id": 1, "type": "alarmageddon/data"})
    system = (await client.receive_json())["result"]["systems"][0]
    assert system["workflow_running"] is None and system["workflows_after"]["home"][0]["target"] == [LIGHT]
    await advance(hass, freezer, 59)
    assert BLINDS not in targets(on)
    await advance(hass, freezer, 2)
    await settle(hass)
    assert targets(on) == [SIREN, LIGHT, BLINDS]
    assert entry.runtime_data.workflow.running is None and not off


async def test_a_hanging_step_after_the_alarm_is_left_behind(hass: HomeAssistant, monkeypatch) -> None:
    """Die Aufsicht gilt auch danach: ein Schritt, auf den gewartet wird und der nie antwortet, hält den nächsten nicht auf."""
    for name in ("SERVICE_TIMEOUT", "SNAPSHOT_TIMEOUT", "WATCHDOG_GRACE"):
        monkeypatch.setattr(wf, name, 0.2)

    async def hang(_call: ServiceCall) -> None:
        await asyncio.Event().wait()

    hass.services.async_register("haengt", "jetzt", hang)
    entry, on, _off = await _setup(hass, {"home": [{"type": "action", "action": "haengt.jetzt", "wait": True}, act(BLINDS)]})
    await hass.services.async_call("alarm_control_panel", "alarm_arm_home", {"entity_id": ALARM}, blocking=True)
    hass.states.async_set(WINDOW, "on")
    await _spin()
    await hass.services.async_call("alarm_control_panel", "alarm_disarm", {"entity_id": ALARM}, blocking=True)
    await _spin()
    assert BLINDS not in targets(on)
    await asyncio.sleep(0.5)
    await _spin()
    assert targets(on) == [SIREN, BLINDS]
    await asyncio.sleep(0.1)
    await _spin()
    assert entry.runtime_data.workflow.running is None


@pytest.mark.parametrize(
    "steps",
    [
        [{"type": "notify"}],
        [{"type": "acknowledge"}],
        [{"type": "sound", "players": ["media_player.wohnzimmer"], "sound": "chime", "duration": 0}],
        [{"type": "gibt_es_nicht"}],
        [{"type": "wait", "seconds": 1}] * (MAX_STEPS + 1),
    ],
    ids=["Alarmmeldung", "Quittieren", "Ton ohne Ende", "unbekannt", "zu viele"],
)
async def test_invalid_after_actions_are_rejected(hass: HomeAssistant, hass_ws_client, steps: list) -> None:
    """Danach sind nur Gerät, Ton mit Dauer und Warten möglich; alles andere lehnt das Speichern als Ganzes ab."""
    entry = await setup_alarm(hass)
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "alarmageddon/save_workflows", "entry_id": entry.entry_id, "workflows": {}, "workflows_after": {"home": steps}})
    result = await client.receive_json()
    assert result["success"] is False and result["error"]["code"] == "invalid_format"
    assert "workflows_after" not in entry.options


async def test_after_actions_are_saved_exported_and_restored(hass: HomeAssistant, hass_ws_client) -> None:
    """Speichern über das Panel (ohne "Rückgängig"), in der Sicherung enthalten, beim Einspielen wieder da; ein leerer Ablauf löscht."""
    entry = await setup_alarm(hass)
    client = await hass_ws_client(hass)
    after = {"home": [act(BLINDS, restore=True, wait=True), {"type": "wait", "seconds": 5}]}
    await client.send_json({"id": 1, "type": "alarmageddon/save_workflows", "entry_id": entry.entry_id, "workflows": {}, "workflows_after": after})
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    saved = entry.options["workflows_after"]["home"]
    assert saved[0]["restore"] is False and saved[0]["wait"] is True and saved[1] == {"type": "wait", "seconds": 5}
    await client.send_json({"id": 2, "type": "alarmageddon/export"})
    backup = (await client.receive_json())["result"]
    assert backup["systems"][0]["options"]["workflows_after"] == entry.options["workflows_after"]
    await client.send_json({"id": 3, "type": "alarmageddon/save_workflows", "entry_id": entry.entry_id, "workflows": {}, "workflows_after": {"home": []}})
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    assert entry.options["workflows_after"] == {}
    await client.send_json({"id": 4, "type": "alarmageddon/import", "data": backup})
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    assert entry.options["workflows_after"]["home"] == saved


# ----- Warten: Schritte laufen standardmässig weiter -----


def test_which_steps_wait() -> None:
    """Neue Schritte warten nur mit "wait"; ältere Abläufe (ohne "wait") warten wie bisher, ausser mit "detach"; ein Dauerton wartet nie."""
    step = {"type": "action", "action": "switch.turn_on"}
    sound = {"type": "sound", "players": ["media_player.x"], "sound": "siren", "duration": 30}
    assert wf.step_waits({**step, "wait": False}) is False
    assert wf.step_waits({**step, "wait": True}) is True
    assert wf.step_waits(step) is True  # älterer Ablauf
    assert wf.step_waits({**step, "detach": True}) is False  # älterer Ablauf mit "nicht abwarten"
    assert wf.step_waits({**step, "wait": True, "detach": True}) is True  # die neue Angabe gilt
    assert wf.step_waits({**sound, "wait": False}) is False and wf.step_waits({**sound, "wait": True}) is True
    assert wf.step_waits({**sound, "duration": 0, "wait": True}) is False  # endet nie von selbst
    for kind in ("wait", "notify", "acknowledge"):
        assert wf.step_waits({"type": kind}) is True


async def test_steps_run_on_by_default_and_wait_only_when_asked(hass: HomeAssistant, freezer) -> None:
    """
    Standard: alle Schritte starten so schnell wie möglich nacheinander (ein Ton von 300 Sekunden hält die Sirene nicht auf).
    Mit "wait" am Ton startet der nächste Schritt erst nach dessen Ende.
    """
    await hass.config.async_update(internal_url="http://192.168.1.2:8123")
    hass.states.async_set("media_player.wohnzimmer", "idle")
    for service in ("play_media", "media_stop", "volume_set"):
        async_mock_service(hass, "media_player", service)
    on = async_mock_service(hass, "switch", "turn_on")
    sound = {"type": "sound", "players": ["media_player.wohnzimmer"], "sound": "siren", "duration": 300}
    entry = await setup_alarm(hass, workflows={"home": [{**sound, "wait": False}, act(SIREN, wait=False)], "away": [{**sound, "wait": True}, act(SIREN, wait=False)]}, exit_delay_away=0)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await settle(hass)
    assert targets(on) == [SIREN]  # sofort, der Ton läuft nebenher
    await call(hass, "alarm_disarm")
    await settle(hass)
    await close(hass, WINDOW)
    on.clear()
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, WINDOW)
    await settle(hass)
    assert targets(on) == []  # wartet auf das Ende des Tons
    await advance(hass, freezer, 299)
    assert targets(on) == []
    await advance(hass, freezer, 3)
    await settle(hass)
    assert targets(on) == [SIREN]
    assert entry.runtime_data.workflow.running is not None
