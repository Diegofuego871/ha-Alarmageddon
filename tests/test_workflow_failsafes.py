"""
Ausfallsicherungen im Ablauf der Alarmaktionen (Code-Review 1.33.1).

Der Ablauf hat Zweige, die nur dann laufen, wenn etwas schiefgeht oder sich zwei Läufe berühren: ein Fehler beim Beenden eines
Tests, ein Lauf neben dem Alarm, der einen echten Alarm nie anfassen darf, ein Start, der scheitert. Genau diese Zweige schützen
die Zusage "im Zweifel alarmieren" und liefen bisher in keinem Test. Jeder Test hier sichert eine Zusage; die Mutationsprobe
(scripts/mutation_check.py) baut die Schutzmassnahme aus und verlangt, dass er scheitert.
"""

from __future__ import annotations

import asyncio
import gc
import logging

import pytest
from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import async_mock_service

from custom_components.alarmageddon import workflow as wf

from .conftest import WINDOW, setup_alarm
from .test_alarm import call, open_sensor, settle, state

SIREN = "switch.sirene"
PLAYER = "media_player.flur"
STEP_SIREN = {"type": "action", "action": "switch.turn_on", "target": [SIREN], "wait": False}
LONG_WAIT = {"type": "wait", "seconds": 300}
TONE = {"type": "dechime", "players": [PLAYER], "sound": "off_fall", "duration": 3}


async def _alarm(hass: HomeAssistant, **options):
    """Anlage mit einer Sirene im Alarm und einem Lautsprecher; liefert Eintrag und die Aufrufe von media_stop."""
    hass.states.async_set(PLAYER, "idle")
    async_mock_service(hass, "media_player", "play_media")
    async_mock_service(hass, "media_player", "volume_set")
    stopped = async_mock_service(hass, "media_player", "media_stop")
    on = async_mock_service(hass, "switch", "turn_on")
    await hass.config.async_update(internal_url="http://192.168.1.2:8123")
    entry = await setup_alarm(hass, **{"workflows": {"home": [STEP_SIREN, LONG_WAIT]}, **options})
    return entry, on, stopped


async def test_a_failing_end_of_the_test_never_stops_the_real_alarm(hass: HomeAssistant, monkeypatch, caplog) -> None:
    """Ein Fehler beim Beenden des Tests darf den echten Alarm nie aufhalten (Sicherheitsregel: im Zweifel alarmieren)."""
    entry, on, _stopped = await _alarm(hass)
    runner = entry.runtime_data.workflow
    assert await runner.async_run("home", test=True)
    await settle(hass)
    assert len(on) == 1 and runner.running["test"]

    async def broken() -> None:
        raise RuntimeError("boom")

    monkeypatch.setattr(runner, "_end_test", broken)
    caplog.set_level(logging.ERROR)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    assert len(on) == 2, "die Sirene des echten Alarms schaltet trotz des Fehlers"
    assert runner.running and not runner.running["test"]
    assert "ending the test of the alarm actions failed" in caplog.text


async def test_the_end_of_an_alarm_survives_failing_actions_after_the_alarm(hass: HomeAssistant, monkeypatch, caplog) -> None:
    """Das Ende des Alarms ist schon erledigt, wenn die Aktionen danach starten: scheitert ihr Start, steht es im Log, mehr nicht."""
    entry, _on, _stopped = await _alarm(hass)
    runner = entry.runtime_data.workflow

    async def broken(*_args, **_kwargs) -> bool:
        raise RuntimeError("boom")

    monkeypatch.setattr(runner, "async_run_after", broken)
    caplog.set_level(logging.ERROR)
    await runner._end(["home"])  # darf nichts werfen
    assert "the actions after the alarm could not be started" in caplog.text


async def test_stopping_a_side_run_never_touches_a_real_alarm(hass: HomeAssistant) -> None:
    """
    Ein Stopp, der für einen Lauf neben dem Alarm gedacht ist (Aktivierungston, Deaktivierungston), darf einen echten Alarm nie
    beenden: sonst schwiege seine Sirene. Ohne laufenden Lauf tut er nichts.
    """
    entry, on, stopped = await _alarm(hass, workflows={"home": [STEP_SIREN, {**TONE, "type": "sound", "sound": "siren", "duration": 0}, LONG_WAIT]})
    runner = entry.runtime_data.workflow
    await runner._stop_side_run()  # kein Lauf: nichts passiert
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    run = runner.running
    assert run and not run.get("after") and len(on) == 1
    await runner._stop_side_run()
    await settle(hass)
    assert runner.running is run, "der echte Alarm läuft weiter"
    assert not stopped, "kein Lautsprecher des Alarms wird gestoppt"


async def test_the_actions_when_arming_never_replace_a_running_test(hass: HomeAssistant) -> None:
    """Läuft ein Test der Alarmaktionen, beginnen die Aktionen beim Scharfschalten nicht: der Test bleibt, bis er endet."""
    entry, on, _stopped = await _alarm(hass, workflows_armed={"home": [{"type": "wait", "seconds": 5}]})
    runner = entry.runtime_data.workflow
    assert await runner.async_run("home", test=True)
    await settle(hass)
    test_run = runner.running
    assert test_run and test_run["test"]
    await call(hass, "alarm_arm_home")
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    assert runner.running is test_run
    assert not await runner.async_run_armed("home")


async def test_arming_again_replaces_the_earlier_actions_when_arming(hass: HomeAssistant) -> None:
    """Rasch hintereinander scharf geschaltet: der neue Lauf ersetzt den alten, es läuft nie ein Rest daneben."""
    entry, _on, _stopped = await _alarm(hass, workflows_armed={"home": [LONG_WAIT]})
    runner = entry.runtime_data.workflow
    await call(hass, "alarm_arm_home")
    await settle(hass)
    first = runner.running
    assert first and first["after"] and first["phase"] == "armed"
    assert await runner.async_run_armed("home")
    assert runner.running is not first and runner.running["phase"] == "armed"


async def test_the_actions_of_a_delay_do_not_start_outside_a_delay_or_during_a_test(hass: HomeAssistant) -> None:
    """Ohne laufende Verzögerung beginnt nichts; ein Test bleibt, auch wenn die Verzögerung beginnt."""
    entry, _on, _stopped = await _alarm(hass, workflows_arming={"away": [LONG_WAIT]}, workflows_entry={"home": [LONG_WAIT]})
    runner = entry.runtime_data.workflow
    assert not await runner.async_run_delay("away")  # deaktiviert: keine Verzögerung
    assert await runner.async_run("home", test=True)
    await settle(hass)
    test_run = runner.running
    await call(hass, "alarm_arm_away")  # Ausgangsverzögerung beginnt
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.ARMING
    assert runner.running is test_run and test_run["test"]


async def test_the_actions_when_disarming_never_replace_a_test_and_replace_an_earlier_side_run(hass: HomeAssistant) -> None:
    """Beim Deaktivieren: ein Test bleibt; die Aktionen nach dem Quittieren, die noch laufen, werden ersetzt."""
    entry, _on, _stopped = await _alarm(
        hass, workflows={"home": [STEP_SIREN, LONG_WAIT]}, workflows_after={"home": [LONG_WAIT]}, workflows_disarmed={"home": [LONG_WAIT]}
    )
    runner = entry.runtime_data.workflow
    # Ein Test läuft: die Aktionen beim Deaktivieren starten nicht
    assert await runner.async_run("home", test=True)
    await settle(hass)
    assert not await runner.async_run_disarmed("home")
    await runner.async_stop()
    # Alarm quittiert: die Aktionen danach laufen noch, wenn deaktiviert wird; sie enden, die Aktionen beim Deaktivieren beginnen
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    assert entry.runtime_data.controller.acknowledge("Test")
    await settle(hass)
    after = runner.running
    assert after and after.get("after") and "phase" not in after
    await call(hass, "alarm_disarm")
    await settle(hass)
    assert runner.running is not after and runner.running and runner.running["phase"] == "disarmed"


async def test_a_failing_start_of_the_disarm_actions_leaves_no_half_run(hass: HomeAssistant, monkeypatch) -> None:
    """Scheitert der Start des Laufs beim Deaktivieren, bleibt kein halber Lauf stehen (er gälte sonst als laufend und hielte den Alarm auf)."""
    entry, _on, _stopped = await _alarm(hass, workflows_disarmed={"home": [LONG_WAIT]})
    runner = entry.runtime_data.workflow

    def broken(_run) -> bool:
        raise RuntimeError("boom")

    monkeypatch.setattr(runner, "_begin", broken)
    with pytest.raises(RuntimeError):
        await runner.async_run_disarmed("home")
    assert runner.running is None


async def test_the_watchdog_note_never_fails(hass: HomeAssistant, monkeypatch, caplog) -> None:
    """Der Wächter hält seinen Eingriff auf der Zeitachse fest, aber nie mit einem Fehler: er selbst darf nie scheitern."""
    entry, _on, _stopped = await _alarm(hass)
    runner = entry.runtime_data.workflow

    def broken(*_args, **_kwargs) -> None:
        raise RuntimeError("boom")

    monkeypatch.setattr(runner._ctl, "record", broken)
    caplog.set_level(logging.ERROR)
    runner._note("prepare")  # darf nichts werfen
    assert "the watchdog could not record its intervention" in caplog.text


async def test_the_second_flow_lookup_never_fails_the_alarm(hass: HomeAssistant, monkeypatch, caplog) -> None:
    """Scheitert die Suche nach dem zweiten Ablauf (Modus und "Immer aktiv"), läuft der Hauptablauf trotzdem."""
    entry, _on, _stopped = await _alarm(hass)
    runner = entry.runtime_data.workflow

    def broken() -> list[str]:
        raise RuntimeError("boom")

    monkeypatch.setattr(runner._ctl, "alarm_plan", broken)
    caplog.set_level(logging.ERROR)
    assert runner._also("home") is None
    assert "the second flow of the alarm actions cannot be determined" in caplog.text


async def test_a_tone_that_follows_the_delay_is_dropped_when_the_delay_is_over(hass: HomeAssistant, monkeypatch) -> None:
    """Ein Ton "so lange wie die Verzögerung" entfällt, wenn von der Verzögerung weniger als eine Sekunde bleibt."""
    entry, _on, _stopped = await _alarm(hass)
    runner = entry.runtime_data.workflow
    step = {"type": "chime", "players": [PLAYER], "sound": "tone_pip", "duration": 3, "delay": True}
    runner._run = {"phase": "arming"}
    monkeypatch.setattr(runner._ctl, "delay_left", lambda: 0.4)
    assert runner._timed(step) is None
    monkeypatch.setattr(runner._ctl, "delay_left", lambda: 12.2)
    assert runner._timed(step)["duration"] == 13
    runner._run = None


async def test_a_late_task_with_an_error_is_marked_as_retrieved(hass: HomeAssistant) -> None:
    """Eine Aufgabe, auf die der Wächter nicht mehr wartet, scheitert später still: ihr Fehler gilt als abgeholt (kein Lärm von asyncio)."""
    loop = asyncio.get_running_loop()
    messages: list[str] = []
    previous = loop.get_exception_handler()
    loop.set_exception_handler(lambda _loop, context: messages.append(str(context.get("message"))))
    try:

        async def boom() -> None:
            raise RuntimeError("boom")

        failed = asyncio.ensure_future(boom())
        await asyncio.wait({failed})
        wf._retrieve(failed)
        del failed
        cancelled = asyncio.ensure_future(asyncio.sleep(10))
        cancelled.cancel()
        await asyncio.wait({cancelled})
        wf._retrieve(cancelled)  # eine abgebrochene Aufgabe hat keine Ausnahme: auch das wirft nichts
        del cancelled
        gc.collect()
        assert not messages, messages
    finally:
        loop.set_exception_handler(previous)


async def test_a_new_test_replaces_a_running_test_but_never_a_real_alarm(hass: HomeAssistant, hass_ws_client) -> None:
    """Ein Test, der noch auf sein Zeitfenster wartet, sperrt keinen weiteren: ein neuer Test beendet ihn. Ein echter Alarm bleibt unberührt."""
    entry, on, _stopped = await _alarm(hass)
    runner = entry.runtime_data.workflow
    client = await hass_ws_client(hass)

    async def start(**extra) -> dict:
        await client.send_json_auto_id({"type": "alarmageddon/test_workflow", "entry_id": entry.entry_id, "trigger": "home", **extra})
        return await client.receive_json()

    assert (await start())["success"]
    first = runner.running
    assert first and first["test"]
    assert (await start(step={"type": "wait", "seconds": 300}))["success"]
    assert runner.running is not first and runner.running["test"], "der neue Test hat den alten ersetzt"
    # Echter Alarm: nie ersetzt
    await runner.async_stop()
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    alarm = runner.running
    assert alarm and not alarm["test"]
    answer = await start()
    assert not answer["success"] and answer["error"]["code"] == "busy"
    assert runner.running is alarm
