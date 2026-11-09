"""
Hängende Geräte im Alarmablauf (Sicherheitsregel): Der Ablauf der Alarmaktionen ist das Wichtigste der Integration.
Antwortet ein Gerät nicht, läuft er nach höchstens WORKFLOW-Zeitgrenze mit dem nächsten Schritt weiter; Deaktivieren
stoppt trotzdem alles, auch wenn der hängende Aufruf Abbrüche ignoriert.
"""

from __future__ import annotations

import asyncio

from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import async_mock_service

from .conftest import ALARM, WINDOW, setup_alarm
from .test_alarm import call

SIREN = "switch.sirene"
STEP_HANG = {"type": "action", "action": "hang.now", "target": ["switch.haengt"]}
STEP_SIREN = {"type": "action", "action": "switch.turn_on", "target": [SIREN]}


async def settle(hass: HomeAssistant) -> None:
    """Ohne async_block_till_done: das wartet auf hängende Dienstaufrufe, und genau die gehören zu diesen Tests."""
    for _ in range(30):
        await asyncio.sleep(0)


async def open_sensor(hass: HomeAssistant, entity: str) -> None:
    hass.states.async_set(entity, "on")
    await settle(hass)


def _entries(entry) -> list[dict]:
    recordings = entry.runtime_data.recorder.recordings
    return recordings[0]["entries"] if recordings else []


async def _alarm(hass: HomeAssistant, steps: list[dict]):
    entry = await setup_alarm(hass, workflows={"home": steps})
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    return entry


async def test_hanging_action_does_not_block_the_next_steps(hass: HomeAssistant, monkeypatch) -> None:
    monkeypatch.setattr("custom_components.alarmageddon.workflow.SERVICE_TIMEOUT", 0.2)
    switch = async_mock_service(hass, "switch", "turn_on")
    cancelled = asyncio.Event()

    async def hang(_call: ServiceCall) -> None:
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            cancelled.set()
            raise

    hass.services.async_register("hang", "now", hang)
    entry = await _alarm(hass, [STEP_HANG, STEP_SIREN])
    assert not switch  # direkt nach dem Auslösen hängt der erste Schritt noch
    await asyncio.sleep(0.5)
    await settle(hass)
    assert len(switch) == 1  # nach der Zeitgrenze läuft der Ablauf weiter
    failed = [e for e in _entries(entry) if e["kind"] == "step_failed"]
    assert failed and failed[0]["reason"] == "timeout" and failed[0]["action"] == "hang.now"
    # Deaktivieren beendet den hängenden Aufruf
    await call(hass, "alarm_disarm")
    await settle(hass)
    assert hass.states.get(ALARM).state == AlarmControlPanelState.DISARMED
    await asyncio.wait_for(cancelled.wait(), 2)


async def test_service_that_ignores_cancellation_cannot_stop_the_alarm(hass: HomeAssistant, monkeypatch) -> None:
    """Ein Aufruf, der Abbrüche schluckt, hält weder die nächsten Schritte noch das Deaktivieren auf."""
    monkeypatch.setattr("custom_components.alarmageddon.workflow.SERVICE_TIMEOUT", 0.2)
    switch = async_mock_service(hass, "switch", "turn_on")
    release = asyncio.Event()

    async def stubborn(_call: ServiceCall) -> None:
        while not release.is_set():
            try:
                await asyncio.wait_for(release.wait(), 0.05)
            except asyncio.CancelledError:
                continue  # ignoriert den Abbruch
            except TimeoutError:
                pass

    hass.services.async_register("hang", "now", stubborn)
    try:
        await _alarm(hass, [STEP_HANG, STEP_SIREN])
        await asyncio.sleep(0.5)
        await settle(hass)
        assert len(switch) == 1
        await asyncio.wait_for(call(hass, "alarm_disarm"), 3)
        await asyncio.wait_for(settle(hass), 3)
        assert hass.states.get(ALARM).state == AlarmControlPanelState.DISARMED
    finally:
        release.set()
        await settle(hass)


async def test_failing_action_is_recorded_and_the_rest_runs(hass: HomeAssistant) -> None:
    switch = async_mock_service(hass, "switch", "turn_on")

    async def boom(_call: ServiceCall) -> None:
        raise RuntimeError("Gerät kaputt")

    hass.services.async_register("hang", "now", boom)
    entry = await _alarm(hass, [STEP_HANG, STEP_SIREN])
    await settle(hass)
    assert len(switch) == 1
    assert any(e["kind"] == "step_failed" and e["reason"] == "error" for e in _entries(entry))


async def test_hanging_sonos_snapshot_does_not_delay_the_alarm(hass: HomeAssistant, monkeypatch) -> None:
    """Der Schnappschuss vor dem ersten Schritt darf den Alarm höchstens SNAPSHOT_TIMEOUT verzögern."""
    monkeypatch.setattr("custom_components.alarmageddon.workflow.SNAPSHOT_TIMEOUT", 0.2)
    switch = async_mock_service(hass, "switch", "turn_on")
    er.async_get(hass).async_get_or_create("media_player", "sonos", "abc", suggested_object_id="buero")
    release = asyncio.Event()

    async def snapshot(_call: ServiceCall) -> None:
        await release.wait()

    hass.services.async_register("sonos", "snapshot", snapshot)
    try:
        await _alarm(hass, [STEP_SIREN, {"type": "sound", "players": ["media_player.buero"], "sound": "siren", "detach": True}])
        assert not switch
        await asyncio.sleep(0.5)
        await settle(hass)
        assert len(switch) == 1
    finally:
        release.set()
        await call(hass, "alarm_disarm")
        await settle(hass)


async def test_disarm_during_the_snapshot_starts_nothing(hass: HomeAssistant, monkeypatch) -> None:
    """Deaktivieren, noch bevor der erste Schritt läuft: danach startet kein Schritt mehr (kein Absturz, kein Alarmton)."""
    monkeypatch.setattr("custom_components.alarmageddon.workflow.SNAPSHOT_TIMEOUT", 5)
    switch = async_mock_service(hass, "switch", "turn_on")
    er.async_get(hass).async_get_or_create("media_player", "sonos", "abc", suggested_object_id="buero")
    release = asyncio.Event()

    async def snapshot(_call: ServiceCall) -> None:
        await release.wait()

    hass.services.async_register("sonos", "snapshot", snapshot)
    try:
        entry = await _alarm(hass, [STEP_SIREN, {"type": "sound", "players": ["media_player.buero"], "sound": "siren", "detach": True}])
        # ohne block_till_done: der hängende Schnappschuss-Aufruf ist ein von HA verfolgter Task
        await hass.services.async_call("alarm_control_panel", "alarm_disarm", {"entity_id": ALARM}, blocking=True)
        await settle(hass)
        assert hass.states.get(ALARM).state == AlarmControlPanelState.DISARMED
        release.set()
        await asyncio.sleep(0.2)
        await settle(hass)
        assert not switch
        assert entry.runtime_data.workflow.running is None
    finally:
        release.set()
