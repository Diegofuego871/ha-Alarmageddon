"""
Hängende Geräte im Alarmablauf (Sicherheitsregel): Der Ablauf der Alarmaktionen ist das Wichtigste der Integration.
Antwortet ein Gerät nicht, läuft er nach höchstens WORKFLOW-Zeitgrenze mit dem nächsten Schritt weiter; Deaktivieren
stoppt trotzdem alles, auch wenn der hängende Aufruf Abbrüche ignoriert.
"""

from __future__ import annotations

import ast
import asyncio
import pathlib

import pytest
from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import async_mock_service

from custom_components.alarmageddon import workflow as wf

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


# ----- Nichts hält die Sirene auf: Meldungen, Protokoll, Aufzeichnung, Ablage, endloser Ton (0.40.0, Code-Review) -----


async def _targets(hass: HomeAssistant, hass_ws_client, targets: list[str]) -> None:
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "alarmageddon/save_notify", "notify": {"alarm_targets": targets}})
    assert (await client.receive_json())["success"]


@pytest.mark.parametrize("steps", [[{"type": "notify"}, STEP_SIREN], [STEP_SIREN]], ids=["Push-Schritt vor der Sirene", "Standardmeldung ohne Push-Schritt"])
async def test_a_hanging_push_never_delays_the_siren(hass: HomeAssistant, hass_ws_client, steps: list[dict]) -> None:
    """
    Eine Push-Meldung, deren Dienst nie antwortet, hält die Sirene nicht auf: weder als Schritt vor der Sirene noch als
    Standardmeldung beim Auslösen. Die Sirene schaltet sofort, ohne jede Zeitgrenze abzuwarten.
    """
    switch = async_mock_service(hass, "switch", "turn_on")
    started = asyncio.Event()

    async def hang(_call: ServiceCall) -> None:
        started.set()
        await asyncio.Event().wait()

    hass.services.async_register("notify", "haengt", hang)
    entry = await setup_alarm(hass, workflows={"home": steps})
    await _targets(hass, hass_ws_client, ["notify.haengt"])
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    assert started.is_set()  # die Meldung ist unterwegs und hängt
    assert len(switch) == 1  # die Sirene ist trotzdem schon an
    assert hass.states.get(ALARM).state == AlarmControlPanelState.TRIGGERED
    assert entry.runtime_data.workflow.running is not None


FAILING_PARTS = {
    "Ereignisprotokoll": ("custom_components.alarmageddon.events.EventLog._add", "state"),
    "Aufzeichnung (Beginn)": ("custom_components.alarmageddon.recording.AlarmRecorder._begin", "state"),
    # _add ruft jeder Zuhörer der Aufzeichnung erst beim Ereignis auf (die Zuhörer selbst sind beim Start schon gebunden)
    "Aufzeichnung (Schritt, Meldung)": ("custom_components.alarmageddon.recording.AlarmRecorder._add", "record"),
    "Meldung beim Auslösen": ("custom_components.alarmageddon.notify.Notifier.send_alarm", "state"),
    "Benachrichtigung in Home Assistant": ("custom_components.alarmageddon.notify.async_persist", "persist"),
}


@pytest.mark.parametrize("part", sorted(FAILING_PARTS))
async def test_a_failing_part_never_stops_the_alarm_actions(hass: HomeAssistant, hass_ws_client, monkeypatch, part: str) -> None:
    """
    Scheitert ein Teil, der beim Auslösen mitläuft (Protokoll, Aufzeichnung, Meldung, Benachrichtigung in Home Assistant),
    schalten die Alarmaktionen trotzdem, und alles andere läuft weiter: jeder Zuhörer wird einzeln aufgerufen.
    """
    target, kind = FAILING_PARTS[part]
    switch = async_mock_service(hass, "switch", "turn_on")
    pushes = async_mock_service(hass, "notify", "handy")
    entry = await setup_alarm(hass, workflows={"home": [STEP_SIREN]})
    await _targets(hass, hass_ws_client, ["notify.handy"])
    await call(hass, "alarm_arm_home")

    def boom(*_args, **_kwargs) -> None:
        raise RuntimeError(f"{part} kaputt")

    monkeypatch.setattr(target, boom)
    await open_sensor(hass, WINDOW)
    assert hass.states.get(ALARM).state == AlarmControlPanelState.TRIGGERED
    assert len(switch) == 1, "die Sirene muss schalten"
    if kind != "state" or "Meldung" not in part:
        assert len(pushes) == 1, "die Alarmmeldung muss hinausgehen"
    # Deaktivieren geht weiterhin
    await call(hass, "alarm_disarm")
    await settle(hass)
    assert hass.states.get(ALARM).state == AlarmControlPanelState.DISARMED
    assert entry.runtime_data.workflow.running is None


async def test_a_failing_event_listener_does_not_swallow_the_offline_message(hass: HomeAssistant, hass_ws_client, monkeypatch) -> None:
    """Auch Ereignisse ohne Zustandswechsel (Sensor fällt im scharfen Zustand aus) erreichen die Meldung, wenn das Protokoll scheitert."""
    pushes = async_mock_service(hass, "notify", "handy")
    await setup_alarm(hass)
    await _targets(hass, hass_ws_client, ["notify.handy"])
    await call(hass, "alarm_arm_home")

    def boom(*_args, **_kwargs) -> None:
        raise RuntimeError("Protokoll kaputt")

    monkeypatch.setattr("custom_components.alarmageddon.events.EventLog._add", boom)
    hass.states.async_set(WINDOW, "unavailable")
    await settle(hass)
    assert len(pushes) == 1  # "Sensor nicht erreichbar" ist trotzdem hinausgegangen


async def test_failing_bookkeeping_does_not_stop_the_steps(hass: HomeAssistant, monkeypatch) -> None:
    """Scheitert das Mitschreiben eines Schritts (Zeitachse, gespeicherter Stand), laufen die Schritte trotzdem alle."""
    switch = async_mock_service(hass, "switch", "turn_on")

    def boom(*_args, **_kwargs) -> None:
        raise RuntimeError("Mitschreiben kaputt")

    monkeypatch.setattr("custom_components.alarmageddon.workflow.WorkflowRunner._record", boom)
    await _alarm(hass, [STEP_SIREN, {"type": "wait", "seconds": 0}, STEP_SIREN])
    assert len(switch) == 2


@pytest.mark.parametrize("failure", ["hängt", "wirft"])
async def test_storage_never_delays_or_stops_the_alarm_actions(hass: HomeAssistant, monkeypatch, failure: str) -> None:
    """
    Der Stand des Ablaufs wird vor dem ersten Schritt gespeichert (für die Wiederherstellung nach einem Neustart). Hängt die
    Ablage oder scheitert sie, starten die Schritte trotzdem: höchstens nach SNAPSHOT_TIMEOUT.
    """
    monkeypatch.setattr("custom_components.alarmageddon.workflow.SNAPSHOT_TIMEOUT", 0.2)
    switch = async_mock_service(hass, "switch", "turn_on")
    entry = await setup_alarm(hass, workflows={"home": [STEP_SIREN]})
    release = asyncio.Event()

    async def save(_data) -> None:
        if failure == "wirft":
            raise OSError("Datenträger voll")
        await release.wait()

    monkeypatch.setattr(entry.runtime_data.workflow._store, "async_save", save)
    try:
        await call(hass, "alarm_arm_home")
        await open_sensor(hass, WINDOW)
        await asyncio.sleep(0.5)
        await settle(hass)
        assert len(switch) == 1
        assert hass.states.get(ALARM).state == AlarmControlPanelState.TRIGGERED
    finally:
        release.set()
        await settle(hass)


async def test_sound_until_disarmed_never_blocks_the_following_steps(hass: HomeAssistant) -> None:
    """
    Ein Alarmton "bis zum Deaktivieren" endet nie von selbst. Auch wenn er als "abwarten" gespeichert ist, laufen die
    folgenden Schritte sofort: sonst käme die Sirene dahinter nie dran.
    """
    await hass.config.async_update(internal_url="http://192.168.1.2:8123")
    hass.states.async_set("media_player.wohnzimmer", "idle")
    switch = async_mock_service(hass, "switch", "turn_on")
    played = async_mock_service(hass, "media_player", "play_media")
    async_mock_service(hass, "media_player", "media_stop")
    endless = {"type": "sound", "players": ["media_player.wohnzimmer"], "sound": "siren", "duration": 0, "restore": False}
    entry = await _alarm(hass, [endless, STEP_SIREN])
    assert played and len(switch) == 1
    assert entry.runtime_data.workflow.running is not None
    await call(hass, "alarm_disarm")
    await settle(hass)
    assert entry.runtime_data.workflow.running is None


# ----- Wächter: Aufsicht über Start, Vorbereitung, jeden Schritt und den Ablauf als Ganzes (0.40.0) -----
#
# Die Tests oben prüfen bekannte Ursachen (Gerät hängt, Ablage hängt, Zuhörer scheitert). Der Wächter sichert die Zusage
# selbst, gleich aus welchem Grund: Nach dem Auslösen beginnt der erste Schritt innert der Startgrenze, kein Schritt hält den
# nächsten länger auf als seine eigene Grenze, und ein abgebrochener Ablauf macht mit dem nächsten Schritt weiter.
# Darum hängen hier Dinge, die "nicht hängen können": so bleibt die Zusage auch bei künftigen Fehlern im Code erhalten.


def _fast(monkeypatch) -> None:
    """Kurze Grenzen, damit die Tests in Sekundenbruchteilen laufen; die Zahlen selbst prüft test_every_step_type_has_a_budget."""
    for name in ("SERVICE_TIMEOUT", "SNAPSHOT_TIMEOUT", "WATCHDOG_GRACE"):
        monkeypatch.setattr(wf, name, 0.1)


def _watchdog_entries(entry) -> list[dict]:
    return [e for e in _entries(entry) if e["kind"] == "step_failed" and e.get("reason") == "watchdog"]


HANGING_STEPS = {
    "Aktion": {"type": "action", "action": "switch.turn_on", "target": ["switch.anderes"]},
    "Warten": {"type": "wait", "seconds": 0},
    "Meldung": {"type": "notify"},
    "Quittieren": {"type": "acknowledge"},
    "Ton mit fester Dauer": {"type": "sound", "players": ["media_player.wohnzimmer"], "sound": "siren", "duration": 1},
    "Aktivierungston": {"type": "chime", "players": ["media_player.wohnzimmer"], "sound": "tone_pip", "duration": 1, "wait": True},  # abgewartet wie die anderen Fälle
    "Voralarm": {"type": "prealarm", "players": ["media_player.wohnzimmer"], "sound": "pre_beep", "duration": 1},
    "Deaktivierungston": {"type": "dechime", "players": ["media_player.wohnzimmer"], "sound": "off_fall", "duration": 1, "wait": True},
}


@pytest.mark.parametrize("name", sorted(HANGING_STEPS))
async def test_watchdog_moves_on_when_any_kind_of_step_hangs(hass: HomeAssistant, monkeypatch, name: str) -> None:
    """
    Jede Art von Schritt, die aus einem unvorhergesehenen Grund nie endet (hier: der Schritt selbst hängt, an allen
    Zeitgrenzen der Dienstaufrufe vorbei), wird nach ihrer Grenze verlassen; der nächste Schritt läuft, die Zeitachse nennt
    den Eingriff, Deaktivieren beendet den hängenden Schritt.
    """
    _fast(monkeypatch)
    monkeypatch.setattr(wf, "step_budget", lambda _step: 0.2)
    switch = async_mock_service(hass, "switch", "turn_on")
    cancelled = asyncio.Event()
    original = wf.WorkflowRunner._step
    calls: list[str] = []

    async def step(self, item: dict, test: bool) -> None:
        calls.append(item["type"])
        if len(calls) == 1:
            try:
                await asyncio.Event().wait()
            except asyncio.CancelledError:
                cancelled.set()
                raise
        await original(self, item, test)

    monkeypatch.setattr(wf.WorkflowRunner, "_step", step)
    entry = await _alarm(hass, [HANGING_STEPS[name], STEP_SIREN])
    assert not switch  # der erste Schritt hängt
    await asyncio.sleep(0.5)
    await settle(hass)
    assert len(switch) == 1 and switch[0].data["entity_id"] == [SIREN]
    assert _watchdog_entries(entry), "der Eingriff des Wächters steht auf der Zeitachse"
    await call(hass, "alarm_disarm")
    await settle(hass)
    assert hass.states.get(ALARM).state == AlarmControlPanelState.DISARMED
    await asyncio.wait_for(cancelled.wait(), 2)


def test_every_step_type_has_a_budget() -> None:
    """
    Jede Art von Schritt hat eine endliche Grenze für den Wächter. Ein neuer Schritttyp ohne Beispiel hier lässt den Test
    scheitern (dann die Grenze in workflow.step_budget festlegen und einen Fall in HANGING_STEPS ergänzen).
    """
    from custom_components.alarmageddon.schemas import STEP_SCHEMAS

    examples = {
        "notify": {"type": "notify"},
        "acknowledge": {"type": "acknowledge"},
        "wait": {"type": "wait", "seconds": 30},
        "action": {"type": "action", "action": "switch.turn_on"},
        "sound": {"type": "sound", "players": ["media_player.wohnzimmer"], "sound": "siren", "duration": 60},
        "chime": {"type": "chime", "players": ["media_player.wohnzimmer"], "sound": "tone_pip", "duration": 5},
        "prealarm": {"type": "prealarm", "players": ["media_player.wohnzimmer"], "sound": "pre_beep", "duration": 20},
        "dechime": {"type": "dechime", "players": ["media_player.wohnzimmer"], "sound": "off_fall", "duration": 5},
    }
    assert set(examples) == set(STEP_SCHEMAS)
    assert {HANGING_STEPS[name]["type"] for name in HANGING_STEPS} == set(STEP_SCHEMAS)
    for step in examples.values():
        assert 0 < wf.step_budget(step) < 2 * 3600
    assert 0 < wf.step_budget({"type": "notify"}) <= wf.WATCHDOG_GRACE
    assert 30 <= wf.step_budget(examples["wait"]) <= 30 + wf.WATCHDOG_GRACE
    assert wf.SERVICE_TIMEOUT <= wf.step_budget(examples["action"]) <= wf.SERVICE_TIMEOUT + wf.WATCHDOG_GRACE
    assert 60 <= wf.step_budget(examples["sound"]) <= 60 + 8 * wf.SERVICE_TIMEOUT + wf.SNAPSHOT_TIMEOUT + wf.WATCHDOG_GRACE
    # Ältere Form des Tons (Wiederholungen) und ein unbekannter Typ haben ebenfalls eine endliche Grenze
    assert 0 < wf.step_budget({"type": "sound", "sound": "siren", "repeat": 3}) < 3600
    assert 0 < wf.step_budget({"type": "gibt_es_noch_nicht"}) < 3600
    # Die Startgrenze: Vorbereitung (Schnappschuss und Ablage) plus Zuschlag
    assert 0 < wf.start_budget() <= 2 * wf.SNAPSHOT_TIMEOUT + wf.WATCHDOG_GRACE


@pytest.mark.parametrize("failure", ["hängt", "wirft"])
async def test_watchdog_starts_the_actions_when_the_preparation_hangs_or_fails(hass: HomeAssistant, monkeypatch, failure: str) -> None:
    """Die Vorbereitung vor dem ersten Schritt (Schnappschuss, Ablage) steht als Ganzes unter Aufsicht: die Schritte starten trotzdem."""
    _fast(monkeypatch)
    switch = async_mock_service(hass, "switch", "turn_on")

    async def prepare(self, *_args, **_kwargs) -> None:
        if failure == "wirft":
            raise RuntimeError("Vorbereitung kaputt")
        await asyncio.Event().wait()

    monkeypatch.setattr(wf.WorkflowRunner, "_prepare", prepare)
    # Nur diese Sicherung zählt hier: die letzte Sicherung (Aufsicht über den Start) ist abgeschaltet
    monkeypatch.setattr(wf.WorkflowRunner, "_check_started", lambda self, trigger: None)
    entry = await _alarm(hass, [STEP_SIREN])
    await asyncio.sleep(0.6)
    await settle(hass)
    assert len(switch) == 1
    assert hass.states.get(ALARM).state == AlarmControlPanelState.TRIGGERED
    await call(hass, "alarm_disarm")
    await settle(hass)
    assert entry.runtime_data.workflow.running is None


@pytest.mark.parametrize("failure", ["hängt", "wirft"])
async def test_watchdog_starts_the_actions_when_the_start_itself_hangs_or_fails(hass: HomeAssistant, monkeypatch, failure: str) -> None:
    """
    Letzte Sicherung: Beginnt der erste Schritt nicht innert der Startgrenze (hier scheitert oder hängt der Start selbst),
    startet der Wächter die Schritte ohne Vorbereitung. Genau einmal, und der Eingriff steht im Log.
    """
    _fast(monkeypatch)
    switch = async_mock_service(hass, "switch", "turn_on")
    release = asyncio.Event()

    async def run(self, *_args, **_kwargs) -> bool:
        if failure == "wirft":
            raise RuntimeError("Start kaputt")
        await release.wait()  # hängt, solange der Test läuft
        return False

    monkeypatch.setattr(wf.WorkflowRunner, "async_run", run)
    entry = await setup_alarm(hass, workflows={"home": [STEP_SIREN, {"type": "wait", "seconds": 0}, STEP_SIREN]})
    await call(hass, "alarm_arm_home")
    try:
        await open_sensor(hass, WINDOW)
        if failure == "hängt":
            assert not switch  # ein hängender Start: der Wächter greift nach der Startgrenze ein
        else:
            assert len(switch) == 2  # ein gescheiterter Start: der Wächter übernimmt sofort
        await asyncio.sleep(0.8)
        await settle(hass)
        assert len(switch) == 2, "beide Sirenen-Schritte genau einmal"
        await asyncio.sleep(0.5)
        await settle(hass)
        assert len(switch) == 2
        assert _watchdog_entries(entry), "der Eingriff des Wächters steht auf der Zeitachse"
        # Ohne async_block_till_done: das wartete auf den hängenden Start
        await hass.services.async_call("alarm_control_panel", "alarm_disarm", {"entity_id": ALARM}, blocking=True)
        await settle(hass)
        assert hass.states.get(ALARM).state == AlarmControlPanelState.DISARMED
        assert entry.runtime_data.workflow.running is None
    finally:
        release.set()
        await settle(hass)


@pytest.mark.parametrize("always", [False, True], ids=["bricht einmal ab", "bricht immer ab"])
async def test_a_flow_that_dies_resumes_with_the_next_step_and_never_loops(hass: HomeAssistant, monkeypatch, always: bool) -> None:
    """
    Bricht der Ablauf selbst unerwartet ab (ein Fehler ausserhalb eines Schritts), macht der Wächter mit dem nächsten Schritt
    weiter. Bricht er immer wieder ab, endet er nach dem letzten Schritt: nie eine Endlosschleife.
    """
    switch = async_mock_service(hass, "switch", "turn_on")
    original = wf.WorkflowRunner._execute
    starts: list[int] = []

    async def execute(self, trigger: str, start: int) -> None:
        starts.append(start)
        if always or len(starts) == 1:
            raise RuntimeError("Ablauf bricht ab")
        await original(self, trigger, start)

    monkeypatch.setattr(wf.WorkflowRunner, "_execute", execute)
    await _alarm(hass, [{"type": "wait", "seconds": 0}, STEP_SIREN, STEP_SIREN])
    await asyncio.sleep(0.2)
    await settle(hass)
    if always:
        assert starts == [0, 1, 2] and not switch  # jeder Schritt einmal versucht, dann Ende
    else:
        assert starts == [0, 1] and len(switch) == 2  # ab dem nächsten Schritt läuft alles
    assert hass.states.get(ALARM).state == AlarmControlPanelState.TRIGGERED
    await call(hass, "alarm_disarm")
    await settle(hass)
    assert hass.states.get(ALARM).state == AlarmControlPanelState.DISARMED


async def test_real_alarm_during_a_test_starts_at_once_even_if_the_test_devices_hang(hass: HomeAssistant) -> None:
    """
    Echter Alarm während eines Tests: die Schritte starten sofort. Das Zurückstellen der Geräte des Tests wird nicht
    abgewartet (es könnte hängen und dürfte die Sirene danach nicht wieder ausschalten); der echte Alarm übernimmt den
    Schnappschuss des Tests, die Geräte kehren beim Deaktivieren in den Zustand von vor dem Test zurück.
    """
    hass.states.async_set(SIREN, "off")
    on = async_mock_service(hass, "switch", "turn_on")
    release = asyncio.Event()
    off: list[ServiceCall] = []

    async def turn_off(service_call: ServiceCall) -> None:
        off.append(service_call)
        await release.wait()

    hass.services.async_register("switch", "turn_off", turn_off)
    entry = await setup_alarm(hass, workflows={"home": [{**STEP_SIREN, "restore": True}, {"type": "wait", "seconds": 300}]})
    runner = entry.runtime_data.workflow
    assert await runner.async_run("home", test=True)
    await settle(hass)
    assert len(on) == 1 and runner.running["test"]
    hass.states.async_set(SIREN, "on")  # der Test hat die Sirene eingeschaltet
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    assert len(on) == 2, "die Sirene des echten Alarms schaltet sofort"
    assert not off, "die Geräte des Tests werden nicht zwischendurch ausgeschaltet"
    assert runner.running and not runner.running["test"]
    try:
        release.set()
        await call(hass, "alarm_disarm")
        await settle(hass)
        assert len(off) == 1 and off[0].data["entity_id"] == SIREN  # zurück in den Zustand von vor dem Test
    finally:
        release.set()


def _method(tree: ast.Module, cls: str, name: str) -> ast.AST:
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef) and node.name == cls:
            for item in node.body:
                if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)) and item.name == name:
                    return item
    raise AssertionError(f"{cls}.{name} fehlt")


def test_the_flow_only_awaits_under_supervision() -> None:
    """
    Ständige Kontrolle am Quelltext: Im Start des Ablaufs und in der Schleife der Schritte steht jedes `await` unter Aufsicht
    des Wächters (`self._watched(...)`). Wer dort ein Warten ohne Grenze einbaut, bekommt diesen Test rot, bevor es im
    Betrieb eine Sirene aufhält.
    """
    tree = ast.parse(pathlib.Path(wf.__file__).read_text(encoding="utf-8"))
    for name in ("async_run", "_execute"):
        awaits = [node for node in ast.walk(_method(tree, "WorkflowRunner", name)) if isinstance(node, ast.Await)]
        assert awaits, name
        for node in awaits:
            target = node.value
            supervised = (isinstance(target, ast.Call) and isinstance(target.func, ast.Attribute) and target.func.attr == "_watched"
                          and isinstance(target.func.value, ast.Name) and target.func.value.id == "self")
            assert supervised, f"WorkflowRunner.{name}, Zeile {node.lineno}: await ohne Wächter ({ast.unparse(target)[:60]})"


def test_listeners_are_only_called_one_by_one() -> None:
    """
    Ständige Kontrolle am Quelltext: Der Automat ruft seine Zuhörer nur über `_call_each` (jeder einzeln im try). Eine
    Schleife, die Zuhörer direkt aufruft, liesse einen scheiternden Zuhörer die Alarmaktionen verhindern.
    """
    from custom_components.alarmageddon import controller

    tree = ast.parse(pathlib.Path(controller.__file__).read_text(encoding="utf-8"))
    for name in ("_notify", "_emit", "record"):
        method = _method(tree, "AlarmController", name)
        calls = [n for n in ast.walk(method) if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr == "_call_each"]
        loops = [n for n in ast.walk(method) if isinstance(n, (ast.For, ast.While, ast.ListComp, ast.GeneratorExp))]
        assert len(calls) == 1 and not loops, f"AlarmController.{name} muss die Zuhörer über _call_each rufen"
    each = _method(tree, "AlarmController", "_call_each")
    assert any(isinstance(n, ast.Try) for n in ast.walk(each)), "_call_each schützt jeden Zuhörer einzeln"


async def test_a_slow_stop_never_touches_the_next_alarm(hass: HomeAssistant) -> None:
    """
    Deaktivieren räumt auf (Ton stoppen, Geräte zurückstellen); hängt dabei ein Gerät, dauert das. Löst die Anlage in dieser
    Zeit erneut aus, gehört der neue Lauf nicht mehr zu diesem Aufräumen: seine Schritte laufen, sein Stand bleibt bestehen.
    """
    await hass.config.async_update(internal_url="http://192.168.1.2:8123")
    hass.states.async_set("media_player.wohnzimmer", "idle")
    switch = async_mock_service(hass, "switch", "turn_on")
    async_mock_service(hass, "media_player", "play_media")
    release = asyncio.Event()
    stops: list[ServiceCall] = []

    async def media_stop(service_call: ServiceCall) -> None:
        stops.append(service_call)
        await release.wait()

    hass.services.async_register("media_player", "media_stop", media_stop)
    endless = {"type": "sound", "players": ["media_player.wohnzimmer"], "sound": "siren", "duration": 0, "restore": False}
    entry = await setup_alarm(hass, workflows={"home": [endless, STEP_SIREN]})
    runner = entry.runtime_data.workflow
    arm = {"entity_id": ALARM}
    try:
        await hass.services.async_call("alarm_control_panel", "alarm_arm_home", arm, blocking=True)
        await open_sensor(hass, WINDOW)
        first = runner.running
        assert first is not None and len(switch) == 1
        # Deaktivieren: das Stoppen des Tons hängt, das Aufräumen wartet darauf
        await hass.services.async_call("alarm_control_panel", "alarm_disarm", arm, blocking=True)
        await settle(hass)
        assert stops and runner.running is None
        # Neuer Alarm, während das Aufräumen des alten noch wartet
        hass.states.async_set(WINDOW, "off")
        await settle(hass)
        await hass.services.async_call("alarm_control_panel", "alarm_arm_home", arm, blocking=True)
        await open_sensor(hass, WINDOW)
        second = runner.running
        assert second is not None and second is not first and len(switch) == 2
        # Das alte Aufräumen kommt zu Ende: der neue Lauf steht weiter
        release.set()
        await asyncio.sleep(0.1)
        await settle(hass)
        assert runner.running is second
        assert hass.states.get(ALARM).state == AlarmControlPanelState.TRIGGERED
    finally:
        release.set()
        await hass.services.async_call("alarm_control_panel", "alarm_disarm", arm, blocking=True)
        await settle(hass)


# ----- Aktionen während der Verzögerungen (1.18.0): der Alarm wartet nie auf sie -----

FRONT_DOOR = "binary_sensor.haustuer"
PLAYER = "media_player.flur"
DELAY_TONE = {"type": "prealarm", "players": [PLAYER], "sound": "pre_beep", "duration": 5, "delay": True}


async def _pending(hass: HomeAssistant, entry_steps: list[dict]):
    """Anlage scharf, die Haustür (Eingangssensor) öffnet: die Eingangsverzögerung läuft, ihre Aktionen sind gestartet."""
    await hass.config.async_update(internal_url="http://192.168.1.2:8123")
    hass.states.async_set(PLAYER, "idle")
    entry = await setup_alarm(hass, workflows={"home": [STEP_SIREN]}, workflows_entry={"home": entry_steps})
    await hass.services.async_call("alarm_control_panel", "alarm_arm_home", {"entity_id": ALARM}, blocking=True)
    await open_sensor(hass, FRONT_DOOR)
    assert hass.states.get(ALARM).state == AlarmControlPanelState.PENDING
    return entry


async def test_hanging_devices_of_the_entry_delay_never_hold_up_the_alarm(hass: HomeAssistant, monkeypatch) -> None:
    """
    Während der Eingangsverzögerung hängen ein Gerät und der Lautsprecher des Voralarms (Start und Stopp antworten nie). Beginnt
    der Alarm, laufen seine Aktionen trotzdem: das Ende der Schritte der Verzögerung wird höchstens SNAPSHOT_TIMEOUT abgewartet.
    """
    _fast(monkeypatch)
    on = async_mock_service(hass, "switch", "turn_on")
    release = asyncio.Event()
    hung: list[str] = []

    async def hang(service_call: ServiceCall) -> None:
        hung.append(f"{service_call.domain}.{service_call.service}")
        await release.wait()

    hass.services.async_register("hang", "now", hang)
    for service in ("play_media", "media_stop", "volume_set"):
        hass.services.async_register("media_player", service, hang)
    try:
        entry = await _pending(hass, [{**STEP_HANG, "wait": True}, DELAY_TONE])
        runner = entry.runtime_data.workflow
        assert runner.running.get("phase") == "pending" and "hang.now" in hung
        await asyncio.sleep(0.3)  # das hängende Gerät ist verlassen, der Ton der Verzögerung ist gestartet (und hängt ebenfalls)
        assert "media_player.play_media" in hung
        await open_sensor(hass, WINDOW)  # Sensor ohne Verzögerung: der Alarm beginnt sofort
        assert hass.states.get(ALARM).state == AlarmControlPanelState.TRIGGERED
        await asyncio.sleep(0.5)
        await settle(hass)
        assert len(on) == 1 and on[0].data["entity_id"] == [SIREN], "die Sirene des Alarms schaltet, obwohl die Schritte der Verzögerung hängen"
        assert runner.running and not runner.running.get("after")
    finally:
        release.set()
        await hass.services.async_call("alarm_control_panel", "alarm_disarm", {"entity_id": ALARM}, blocking=True)
        await settle(hass)


@pytest.mark.parametrize("part", ["Schritt scheitert", "Schritte nicht lesbar", "Start scheitert"])
async def test_failing_actions_of_the_entry_delay_never_stop_the_alarm(hass: HomeAssistant, monkeypatch, part: str) -> None:
    """Scheitert während der Eingangsverzögerung ein Schritt, das Lesen der Schritte oder der Start ihres Laufs: der Alarm kommt trotzdem."""
    on = async_mock_service(hass, "switch", "turn_on")

    async def broken(_service_call: ServiceCall) -> None:
        raise RuntimeError("Gerät defekt")

    for service in ("play_media", "media_stop"):
        hass.services.async_register("media_player", service, broken)
    hass.services.async_register("hang", "now", broken)
    await hass.config.async_update(internal_url="http://192.168.1.2:8123")
    hass.states.async_set(PLAYER, "idle")
    entry = await setup_alarm(hass, workflows={"home": [STEP_SIREN]}, workflows_entry={"home": [STEP_HANG, DELAY_TONE]})
    runner = entry.runtime_data.workflow

    def fail(*_args, **_kwargs):
        raise RuntimeError("kaputt")

    if part == "Schritte nicht lesbar":
        monkeypatch.setattr(runner, "steps_delay", fail)
    elif part == "Start scheitert":
        monkeypatch.setattr(runner, "_begin", lambda run: fail() if run.get("phase") == "pending" else wf.WorkflowRunner._begin(runner, run))
    await hass.services.async_call("alarm_control_panel", "alarm_arm_home", {"entity_id": ALARM}, blocking=True)
    await open_sensor(hass, FRONT_DOOR)
    assert hass.states.get(ALARM).state == AlarmControlPanelState.PENDING
    await open_sensor(hass, WINDOW)
    await asyncio.sleep(0.2)
    await settle(hass)
    assert hass.states.get(ALARM).state == AlarmControlPanelState.TRIGGERED
    assert [c.data["entity_id"] for c in on] == [[SIREN]]
    await hass.services.async_call("alarm_control_panel", "alarm_disarm", {"entity_id": ALARM}, blocking=True)
    await settle(hass)


async def test_hanging_devices_of_the_exit_delay_never_hold_up_arming_or_the_alarm(hass: HomeAssistant, monkeypatch) -> None:
    """
    Während der Ausgangsverzögerung hängt der Lautsprecher des Aktivierungstons. Die Anlage wird trotzdem pünktlich scharf (der
    Automat wartet auf keinen Schritt), und ein Alarm danach startet seine Aktionen.
    """
    _fast(monkeypatch)
    on = async_mock_service(hass, "switch", "turn_on")
    release = asyncio.Event()

    async def hang(_service_call: ServiceCall) -> None:
        await release.wait()

    for service in ("play_media", "media_stop", "volume_set"):
        hass.services.async_register("media_player", service, hang)
    await hass.config.async_update(internal_url="http://192.168.1.2:8123")
    hass.states.async_set(PLAYER, "idle")
    tone = {"type": "chime", "players": [PLAYER], "sound": "tone_pip", "duration": 3, "delay": True}
    entry = await setup_alarm(hass, workflows={"away": [STEP_SIREN]}, workflows_arming={"away": [tone]}, exit_delay_away=30)
    runner = entry.runtime_data.workflow
    controller = entry.runtime_data.controller
    try:
        await hass.services.async_call("alarm_control_panel", "alarm_arm_away", {"entity_id": ALARM}, blocking=True)
        await settle(hass)
        assert hass.states.get(ALARM).state == AlarmControlPanelState.ARMING and runner.running.get("phase") == "arming"
        controller._go_armed()  # die Ausgangsverzögerung ist um
        await settle(hass)
        assert hass.states.get(ALARM).state == AlarmControlPanelState.ARMED_AWAY
        await open_sensor(hass, WINDOW)
        await asyncio.sleep(0.5)
        await settle(hass)
        assert hass.states.get(ALARM).state == AlarmControlPanelState.TRIGGERED
        assert [c.data["entity_id"] for c in on] == [[SIREN]]
        assert runner.running and not runner.running.get("after")
    finally:
        release.set()
        await hass.services.async_call("alarm_control_panel", "alarm_disarm", {"entity_id": ALARM}, blocking=True)
        await settle(hass)


def test_a_tone_that_follows_the_delay_never_blocks_the_steps_after_it() -> None:
    """Ein Ton "so lange wie die Verzögerung" endet erst mit ihr: der Ablauf wartet nie auf ihn, auch nicht mit "wait" (sonst liefe nichts danach)."""
    for kind in ("chime", "prealarm"):
        assert wf.step_waits({"type": kind, "players": [PLAYER], "duration": 5, "delay": True}) is False
        assert wf.step_waits({"type": kind, "players": [PLAYER], "duration": 5, "delay": True, "wait": True}) is False
    assert wf.step_waits({"type": "prealarm", "players": [PLAYER], "duration": 5}) is True  # ohne die Angabe wie bisher


async def test_hanging_devices_of_the_disarm_actions_never_hold_up_arming_or_the_alarm(hass: HomeAssistant, monkeypatch) -> None:
    """
    Beim Deaktivieren hängt der Lautsprecher des Deaktivierungstons (1.27.0). Das Deaktivieren selbst ist sofort durch (der Automat
    wartet auf keinen Schritt), und ein "immer aktiver" Sensor löst danach trotzdem seinen Alarm aus: seine Aktionen starten.
    """
    from .test_sensor_options import SMOKE, _classes

    _fast(monkeypatch)
    _classes(hass)
    on = async_mock_service(hass, "switch", "turn_on")
    release = asyncio.Event()

    async def hang(_service_call: ServiceCall) -> None:
        await release.wait()

    for service in ("play_media", "media_stop", "volume_set", "turn_off"):
        hass.services.async_register("media_player", service, hang)
    await hass.config.async_update(internal_url="http://192.168.1.2:8123")
    hass.states.async_set(PLAYER, "off", {"volume_level": 0.2})
    tone = {"type": "dechime", "players": [PLAYER], "sound": "off_fall", "duration": 3}
    entry = await setup_alarm(hass, workflows={"home": [STEP_SIREN], "always": [STEP_SIREN]}, workflows_disarmed={"home": [tone, {**STEP_SIREN, "target": ["switch.licht"]}]},
                              sensor_options={SMOKE: {"always": True}})
    try:
        await hass.services.async_call("alarm_control_panel", "alarm_arm_home", {"entity_id": ALARM}, blocking=True)
        await settle(hass)
        await hass.services.async_call("alarm_control_panel", "alarm_disarm", {"entity_id": ALARM}, blocking=True)
        await settle(hass)
        assert hass.states.get(ALARM).state == AlarmControlPanelState.DISARMED
        await asyncio.sleep(0.3)  # der Lautsprecher hängt, die Grenzen greifen: der Ablauf geht weiter
        await settle(hass)
        assert any(c.data["entity_id"] == ["switch.licht"] for c in on), "der nächste Schritt läuft, obwohl der Lautsprecher hängt"
        await open_sensor(hass, SMOKE)
        await settle(hass)
        assert hass.states.get(ALARM).state == AlarmControlPanelState.TRIGGERED
        await asyncio.sleep(0.5)  # der Alarm beendet den hängenden Lauf nach den Grenzen und startet seine Aktionen
        await settle(hass)
        assert any(c.data["entity_id"] == [SIREN] for c in on), "die Sirene des Alarms schaltet trotz hängendem Lautsprecher"
        assert entry.runtime_data.workflow.running and not entry.runtime_data.workflow.running.get("after")
    finally:
        release.set()
        await hass.services.async_call("alarm_control_panel", "alarm_disarm", {"entity_id": ALARM}, blocking=True)
        await settle(hass)


async def test_a_failing_start_of_the_disarm_actions_never_stops_disarming(hass: HomeAssistant, monkeypatch) -> None:
    """Scheitert der Start der Aktionen beim Deaktivieren, steht es im Log; die Anlage ist deaktiviert und ein späterer Alarm läuft."""
    async def broken(self, _mode):
        raise RuntimeError("kaputt")

    monkeypatch.setattr(wf.WorkflowRunner, "async_run_disarmed", broken)
    on = async_mock_service(hass, "switch", "turn_on")
    await setup_alarm(hass, workflows={"home": [STEP_SIREN]}, workflows_disarmed={"home": [STEP_SIREN]})
    await call(hass, "alarm_arm_home")
    await settle(hass)
    await call(hass, "alarm_disarm")
    await settle(hass)
    assert hass.states.get(ALARM).state == AlarmControlPanelState.DISARMED and not on
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    assert hass.states.get(ALARM).state == AlarmControlPanelState.TRIGGERED and [c.data["entity_id"] for c in on] == [[SIREN]]
    await call(hass, "alarm_disarm")
    await settle(hass)


def test_the_disarm_tone_never_blocks_the_steps_after_it() -> None:
    """Der Deaktivierungston läuft wie der Aktivierungston standardmässig weiter; nur mit "wait" wartet der Ablauf, und nie ohne Ende."""
    step = {"type": "dechime", "players": [PLAYER], "duration": 5}
    assert wf.step_waits(step) is False
    assert wf.step_waits({**step, "wait": True}) is True
    assert wf.step_budget(step) > 5
