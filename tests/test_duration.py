"""
Wie lange Sirene und Alarmton laufen, bestimmt allein der Nutzer (0.40.0, Code-Review).

Das ist rechtlich wichtig: eine Sirene muss nach einer vom Betreiber gewählten Zeit abschalten. Im Code steht darum keine
feste Dauer. Der Nutzer legt sie im Ablauf fest: "Sirene ein, Warten N Sekunden, Sirene aus" oder ein Alarmton mit "Dauer"
(0 bis 3600 Sekunden je Schritt, mehrere Schritte lassen sich reihen). Diese Tests sichern:

- die eingestellte Zeit gilt genau, für jeden zulässigen Wert,
- der Wächter (Zeitgrenzen für hängende Geräte) verkürzt oder verlängert sie nie,
- sie zählt ab dem ersten Start des Schritts, auch über ein Neuladen oder einen Neustart von Home Assistant hinweg,
- das Ausschalten kommt auch dann zur eingestellten Zeit, wenn daneben ein Ton "bis zum Deaktivieren" läuft.
"""

from __future__ import annotations

import asyncio
from datetime import timedelta
from typing import Any

import pytest
from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import HomeAssistant, State
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import MockConfigEntry, async_mock_service, mock_restore_cache_with_extra_data

from custom_components.alarmageddon import workflow as wf
from custom_components.alarmageddon.const import DOMAIN, MAX_DELAY, WORKFLOW_STORE_KEY
from custom_components.alarmageddon.schemas import STEP_SCHEMAS

from .conftest import ALARM, FRONT_DOOR, MOTION, WINDOW, options, setup_alarm
from .test_alarm import advance, call, open_sensor, settle, state

SIREN = "switch.sirene"
PLAYER = "media_player.wohnzimmer"
ON = {"type": "action", "action": "switch.turn_on", "target": [SIREN]}
OFF = {"type": "action", "action": "switch.turn_off", "target": [SIREN]}


def _wait(seconds: int) -> dict[str, Any]:
    return {"type": "wait", "seconds": seconds}


def _services(hass: HomeAssistant) -> dict[str, list]:
    hass.states.async_set(SIREN, "off")
    hass.states.async_set(PLAYER, "idle")
    return {name: async_mock_service(hass, *name.split(".")) for name in (
        "switch.turn_on", "switch.turn_off", "media_player.play_media", "media_player.media_stop", "media_player.volume_set")}


def _watchdog(entry) -> list[dict]:
    record = entry.runtime_data.recorder.current
    return [e for e in (record or {}).get("entries", []) if e.get("kind") == "step_failed"]


def test_the_duration_is_free_and_not_fixed_in_the_code() -> None:
    """Jede Dauer von 0 bis 3600 Sekunden ist zulässig (Warten und Ton); es gibt keinen festen oder erzwungenen Wert."""
    for seconds in (0, 1, 30, 180, 600, MAX_DELAY):
        assert STEP_SCHEMAS["wait"]({"type": "wait", "seconds": seconds})["seconds"] == seconds
        assert STEP_SCHEMAS["sound"]({"type": "sound", "players": [PLAYER], "sound": "siren", "duration": seconds})["duration"] == seconds
    # Der Wächter lässt jeder eingestellten Zeit ihren vollen Raum
    for seconds in (1, 180, MAX_DELAY):
        assert wf.step_budget(_wait(seconds)) > seconds
        assert wf.step_budget({"type": "sound", "sound": "siren", "duration": seconds}) > seconds


@pytest.mark.parametrize("seconds", [2, 30, 180, 900, MAX_DELAY])
async def test_siren_runs_exactly_as_long_as_the_user_set(hass: HomeAssistant, freezer, seconds: int) -> None:
    """ "Sirene ein, Warten N, Sirene aus": die Sirene schaltet nach genau N Sekunden aus, nicht früher, nicht später. """
    s = _services(hass)
    entry = await setup_alarm(hass, workflows={"home": [ON, _wait(seconds), OFF]})
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    assert len(s["switch.turn_on"]) == 1 and not s["switch.turn_off"]
    await advance(hass, freezer, seconds - 1)
    assert not s["switch.turn_off"], "nicht vor der eingestellten Zeit"
    await advance(hass, freezer, 1)
    assert len(s["switch.turn_off"]) == 1, "zur eingestellten Zeit"
    # Der Alarm selbst bleibt bis zum Deaktivieren; der Wächter musste nicht eingreifen
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    assert not _watchdog(entry)
    await advance(hass, freezer, 3600)
    assert len(s["switch.turn_off"]) == 1 and len(s["switch.turn_on"]) == 1


@pytest.mark.parametrize("detach", [False, True], ids=["abwarten", "nebenher"])
@pytest.mark.parametrize("seconds", [10, 180])
async def test_sound_plays_exactly_as_long_as_the_user_set(hass: HomeAssistant, freezer, seconds: int, detach: bool) -> None:
    """Ein Alarmton mit Dauer spielt genau so lange und stoppt dann, ob abgewartet oder nebenher."""
    await hass.config.async_update(internal_url="http://192.168.1.2:8123")
    s = _services(hass)
    sound = {"type": "sound", "players": [PLAYER], "sound": "siren", "duration": seconds, **({"detach": True} if detach else {})}
    entry = await setup_alarm(hass, workflows={"home": [sound, ON]})
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    assert s["media_player.play_media"] and not s["media_player.media_stop"]
    assert len(s["switch.turn_on"]) == (1 if detach else 0)  # nebenher: der nächste Schritt läuft sofort
    await advance(hass, freezer, seconds - 1)
    assert not s["media_player.media_stop"], "nicht vor der eingestellten Zeit"
    await advance(hass, freezer, 2)
    assert len(s["media_player.media_stop"]) == 1, "zur eingestellten Zeit"
    assert len(s["switch.turn_on"]) == 1
    played = len(s["media_player.play_media"])
    await advance(hass, freezer, 600)
    assert len(s["media_player.play_media"]) == played, "danach kein Ton mehr"
    assert not _watchdog(entry)


async def test_siren_switches_off_on_time_next_to_a_sound_until_disarmed(hass: HomeAssistant, freezer) -> None:
    """
    Läuft ein Ton "bis zum Deaktivieren" (auch als "abwarten" gespeichert, wie in älteren Abläufen), schaltet die Sirene
    dahinter trotzdem zur eingestellten Zeit aus; der Ton endet beim Deaktivieren.
    """
    await hass.config.async_update(internal_url="http://192.168.1.2:8123")
    s = _services(hass)
    endless = {"type": "sound", "players": [PLAYER], "sound": "siren", "duration": 0}
    await setup_alarm(hass, workflows={"home": [endless, ON, _wait(180), OFF]})
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    assert len(s["switch.turn_on"]) == 1
    await advance(hass, freezer, 179)
    assert not s["switch.turn_off"]
    await advance(hass, freezer, 2)
    assert len(s["switch.turn_off"]) == 1
    assert not s["media_player.media_stop"]  # der Ton läuft weiter, so hat es der Nutzer gewählt
    await call(hass, "alarm_disarm")
    await settle(hass)
    assert s["media_player.media_stop"]


async def test_the_set_duration_counts_from_the_first_start_across_a_reload(hass: HomeAssistant, freezer) -> None:
    """
    Werden mitten im Alarm Einstellungen gespeichert (die Anlage lädt neu), beginnt die Wartezeit nicht von vorn: die Sirene
    schaltet zur ursprünglich eingestellten Zeit aus (hier 180 s nach dem Einschalten, nicht 100 + 180).
    """
    s = _services(hass)
    entry = await setup_alarm(hass, workflows={"home": [ON, _wait(180), OFF]})
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await advance(hass, freezer, 100)
    hass.config_entries.async_update_entry(entry, options={**entry.options, "entry_delay": 25})
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    await advance(hass, freezer, 79)
    assert not s["switch.turn_off"]
    await advance(hass, freezer, 2)
    assert len(s["switch.turn_off"]) == 1
    assert len(s["switch.turn_on"]) == 1, "die Sirene wird nach dem Neuladen nicht ein zweites Mal eingeschaltet"


async def test_a_sound_duration_counts_from_the_first_start_across_a_reload(hass: HomeAssistant, freezer) -> None:
    """Dasselbe für einen abgewarteten Alarmton mit Dauer: nach dem Neuladen spielt nur der Rest."""
    await hass.config.async_update(internal_url="http://192.168.1.2:8123")
    s = _services(hass)
    sound = {"type": "sound", "players": [PLAYER], "sound": "siren", "duration": 120}
    entry = await setup_alarm(hass, workflows={"home": [sound, OFF]})
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await advance(hass, freezer, 100)
    hass.config_entries.async_update_entry(entry, options={**entry.options, "entry_delay": 25})
    await settle(hass)
    stops = len(s["media_player.media_stop"])  # das Neuladen stoppt den Ton kurz
    await advance(hass, freezer, 19)
    assert not s["switch.turn_off"]
    await advance(hass, freezer, 3)
    assert len(s["switch.turn_off"]) == 1 and len(s["media_player.media_stop"]) == stops + 1


@pytest.mark.parametrize(("elapsed", "left"), [(60, 120), (179, 1), (400, 0)], ids=["nach 60 s", "kurz vor Ende", "Zeit schon um"])
async def test_the_set_duration_counts_across_a_restart_of_home_assistant(hass: HomeAssistant, hass_storage, freezer, elapsed: int, left: int) -> None:
    """
    Neustart von Home Assistant mitten in der Wartezeit: danach läuft nur der Rest. War die Zeit während des Neustarts schon
    um, schaltet die Sirene sofort aus (nie eine volle Wartezeit obendrauf).
    """
    s = _services(hass)
    started = dt_util.utcnow() - timedelta(seconds=elapsed)
    key = f"{WORKFLOW_STORE_KEY}.dauer"
    run = {"trigger": "home", "index": 1, "test": False, "snapshot": {}, "sonos": [], "steps": None,
           "until": {"index": 1, "at": (started + timedelta(seconds=180)).isoformat()}}
    hass_storage[key] = {"version": 1, "minor_version": 1, "key": key, "data": run}
    data = {"mode": "home", "deadline": None, "bypassed": [], "triggered_by": WINDOW, "changed_by": None}
    mock_restore_cache_with_extra_data(hass, [(State(ALARM, "triggered"), data)])
    for entity in (FRONT_DOOR, WINDOW, MOTION):
        hass.states.async_set(entity, "off")
    entry = MockConfigEntry(domain=DOMAIN, entry_id="dauer", title="Haus", data={"name": "Haus"}, options=options(workflows={"home": [ON, _wait(180), OFF]}))
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    assert not s["switch.turn_on"], "der Schritt vor der Wartezeit läuft nicht noch einmal"
    if left:
        await advance(hass, freezer, left - 1)
        assert not s["switch.turn_off"]
        await advance(hass, freezer, 2)
    else:
        await advance(hass, freezer, 1)  # keine neue Wartezeit: die Sirene ist innert einer Sekunde aus
    assert len(s["switch.turn_off"]) == 1


async def test_the_watchdog_never_cuts_a_set_wait_short(hass: HomeAssistant, monkeypatch) -> None:
    """
    In echter Zeit (ohne angehaltene Uhr): Der Wächter greift erst nach der eingestellten Wartezeit plus Zuschlag ein. Eine
    Wartezeit von 2 Sekunden dauert 2 Sekunden, auch wenn alle Zeitgrenzen für hängende Geräte viel kürzer sind.
    """
    for name in ("SERVICE_TIMEOUT", "SNAPSHOT_TIMEOUT", "WATCHDOG_GRACE"):
        monkeypatch.setattr(wf, name, 0.2)
    s = _services(hass)
    entry = await setup_alarm(hass, workflows={"home": [ON, _wait(2), OFF]})
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    assert len(s["switch.turn_on"]) == 1
    await asyncio.sleep(1.5)
    await settle(hass)
    assert not s["switch.turn_off"], "der Wächter hat die Wartezeit nicht verkürzt"
    await asyncio.sleep(1.0)
    await settle(hass)
    assert len(s["switch.turn_off"]) == 1
    assert not _watchdog(entry)


async def test_a_tone_follows_the_running_delay_and_ends_with_it(hass: HomeAssistant, freezer) -> None:
    """
    Ton "so lange wie die Verzögerung" (1.18.0): seine Dauer steht nicht im Schritt, sie ist die Restzeit der Verzögerung, die
    gerade läuft. Startet er 10 Sekunden nach dem Scharfschalten, spielt er die übrigen 20 Sekunden; er endet mit der Verzögerung.
    """
    await hass.config.async_update(internal_url="http://192.168.1.2:8123")
    hass.states.async_set(PLAYER, "idle")
    calls = {name: async_mock_service(hass, "media_player", name) for name in ("play_media", "media_stop", "volume_set")}
    tone = {"type": "chime", "players": [PLAYER], "sound": "tone_pip", "duration": 3, "delay": True}
    await setup_alarm(hass, workflows_arming={"away": [_wait(10), tone]}, exit_delay_away=30)
    await call(hass, "alarm_arm_away")
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.ARMING and not calls["play_media"]
    await advance(hass, freezer, 10)
    await settle(hass)
    assert len(calls["play_media"]) == 1
    assert calls["play_media"][0].data["media_content_id"].endswith("/20000/tone_pip.wav")  # die Restzeit, nicht die 3 s des Schritts
    await advance(hass, freezer, 19)
    assert state(hass) == AlarmControlPanelState.ARMING and not calls["media_stop"]
    await advance(hass, freezer, 2)
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.ARMED_AWAY and len(calls["media_stop"]) >= 1 and len(calls["play_media"]) == 1
