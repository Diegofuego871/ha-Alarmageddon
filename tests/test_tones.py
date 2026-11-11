"""
Drei Arten von Tönen, jede mit eigenen Klängen (1.15.0): Alarmton, Voralarm, Aktivierungston.

- Der Alarmton ist der Ton des Alarms; nur ihn meint der Knopf "Alarmton stumm" der Push-Meldung.
- Der Voralarm ist ein eigener Schritt im Ablauf des Alarms: ein leiser Warnton mit Dauer, danach folgt der nächste Schritt.
- Der Aktivierungston spielt nur ganze Wiederholungen, damit eine Melodie nie abgeschnitten wird.
"""

from __future__ import annotations

from pathlib import Path
import struct
import wave

import pytest
from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import HomeAssistant

from custom_components.alarmageddon import workflow as wf
from custom_components.alarmageddon.const import ALL_SOUNDS, CHIMES, PREALARMS, SOUNDS
from custom_components.alarmageddon.notify import TEXTS

from .conftest import WINDOW, setup_alarm
from .test_actions import PLAYER, SIREN, _setup_workflow
from .test_alarm import advance, call, open_sensor, settle, state

SOUND_DIR = Path(__file__).resolve().parents[1] / "custom_components" / "alarmageddon" / "sounds"


def _samples(name: str) -> list[float]:
    with wave.open(str(SOUND_DIR / f"{name}.wav")) as w:
        frames = w.readframes(w.getnframes())
    return [v / 32768 for (v,) in struct.iter_unpack("<h", frames)]


def _peak(name: str) -> float:
    return max(abs(v) for v in _samples(name))


def _loudness(name: str) -> float:
    """Mittlere Leistung über die ganze Wiederholung (Effektivwert): ein kurzer Piep in einer Sekunde Stille ist leise."""
    values = _samples(name)
    return (sum(v * v for v in values) / len(values)) ** 0.5


async def _tick(hass: HomeAssistant, freezer, seconds: int) -> None:
    """Sekunde für Sekunde vorstellen: jede Wiederholung eines Tons wartet auf ihren eigenen Zeitgeber."""
    for _ in range(seconds):
        await advance(hass, freezer, 1)


def test_three_kinds_with_at_least_five_sounds_each() -> None:
    """Jede Art hat mindestens fünf eigene Klänge; keiner steht in zwei Arten. Gong und Warnung gehören zum Voralarm."""
    assert len(SOUNDS) >= 5 and len(PREALARMS) >= 5 and len(CHIMES) >= 5
    assert not set(SOUNDS) & set(PREALARMS) and not set(SOUNDS) & set(CHIMES) and not set(PREALARMS) & set(CHIMES)
    assert {"chime", "warning"} <= set(PREALARMS) and "siren" in SOUNDS
    assert ALL_SOUNDS == {**SOUNDS, **PREALARMS, **CHIMES}


@pytest.mark.parametrize("name", sorted(ALL_SOUNDS))
def test_every_sound_is_shipped_as_a_wav_of_the_stated_length(name: str) -> None:
    """Zu jedem Klang liegt eine WAV bei (16 Bit, mono, 22 050 Hz), so lang wie angegeben, und sie ist nicht stumm."""
    with wave.open(str(SOUND_DIR / f"{name}.wav")) as w:
        assert (w.getframerate(), w.getnchannels(), w.getsampwidth()) == (22050, 1, 2)
        assert abs(w.getnframes() / w.getframerate() - ALL_SOUNDS[name]) < 0.02
    assert _peak(name) > 0.2
    assert {p.stem for p in SOUND_DIR.glob("*.wav")} == set(ALL_SOUNDS)  # keine Datei ohne Eintrag


def test_own_prealarm_and_arming_tones_are_quieter_than_the_alarm() -> None:
    """Die neuen Töne von Voralarm und Aktivierung sind leiser als jeder Alarmton (dazu kommt die Lautstärke des Schritts)."""
    alarm = min(_loudness(name) for name in SOUNDS)
    assert alarm > 0.25
    for name in [n for n in PREALARMS if n.startswith("pre_")] + list(CHIMES):
        assert _loudness(name) < alarm and _peak(name) <= 0.6, name


def test_the_push_button_names_the_alarm_sound() -> None:
    """Der Knopf der Push-Meldung heisst wie der Ton, den er stoppt: "Alarmton stumm" (nicht mehr "Sirene")."""
    assert TEXTS["de"]["action_silence"] == "Alarmton stumm" and TEXTS["en"]["action_silence"] == "Silence alarm sound"
    assert all("iren" not in texts["action_silence"] for texts in TEXTS.values())


async def test_the_panel_gets_one_list_per_kind(hass: HomeAssistant, hass_ws_client) -> None:
    await setup_alarm(hass)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "alarmageddon/data"})
    data = (await client.receive_json())["result"]
    assert [s["id"] for s in data["sounds"]] == list(SOUNDS) and [s["id"] for s in data["prealarms"]] == list(PREALARMS) and [s["id"] for s in data["chimes"]] == list(CHIMES)
    assert all(s["url"].endswith(f"/{s['id']}.wav") and s["seconds"] > 0 for kind in ("sounds", "prealarms", "chimes") for s in data[kind])


async def test_prealarm_plays_quietly_then_the_alarm_sound_follows(hass: HomeAssistant, freezer) -> None:
    """Voralarm 20 Sekunden als Schleife, erst danach der nächste Schritt (hier die Sirene): ohne Angabe wartet der Ablauf auf ihn."""
    steps = [{"type": "prealarm", "players": [PLAYER], "sound": "pre_beep", "volume": 0.2, "duration": 20},
             {"type": "action", "action": "switch.turn_on", "target": [SIREN], "wait": False}]
    entry, services = await _setup_workflow(hass, steps)
    assert wf.step_waits(steps[0]) is True and wf.step_waits({**steps[0], "wait": False}) is False
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await settle(hass)
    played = services["media_player.play_media"]
    assert played and played[0].data["media_content_id"].endswith("/pre_beep.wav")
    assert services["media_player.volume_set"][0].data["volume_level"] == 0.2
    assert not services["switch.turn_on"]
    await _tick(hass, freezer, 19)
    # Eine Datei für die ganzen 20 Sekunden: der Lautsprecher wird einmal gestartet, nicht jede Sekunde neu
    assert not services["switch.turn_on"] and len(played) == 1 and played[0].data["media_content_id"].endswith("/alarmageddon_loop/20000/pre_beep.wav")
    await _tick(hass, freezer, 3)
    await settle(hass)
    assert len(services["switch.turn_on"]) == 1 and services["media_player.media_stop"]
    assert state(hass) == AlarmControlPanelState.TRIGGERED and entry.runtime_data.workflow.running


async def test_disarming_during_the_prealarm_stops_it_and_the_alarm_sound_never_starts(hass: HomeAssistant, freezer) -> None:
    steps = [{"type": "prealarm", "players": [PLAYER], "duration": 30}, {"type": "action", "action": "switch.turn_on", "target": [SIREN], "wait": False}]
    _entry, services = await _setup_workflow(hass, steps)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await settle(hass)
    count = len(services["media_player.play_media"])
    await call(hass, "alarm_disarm")
    await settle(hass)
    assert services["media_player.media_stop"]
    await advance(hass, freezer, 40)
    assert len(services["media_player.play_media"]) == count and not services["switch.turn_on"]


@pytest.mark.parametrize(("sound", "seconds", "length"), [("tone_pip", 3, 3000), ("tone_rise", 3, 2000), ("tone_rise", 4, 4000), ("tone_bell", 1, 2000), ("tone_soft", 4, 3000)])
async def test_arming_tone_plays_whole_repetitions_only(hass: HomeAssistant, freezer, sound: str, seconds: int, length: int) -> None:
    """
    Ein Ton von 1 Sekunde erklingt in 3 Sekunden dreimal; eine Melodie von 2 Sekunden einmal, und nie abgeschnitten (mindestens einmal).
    Seit 1.17.0 als eine Datei in dieser Länge: der Lautsprecher wird einmal gestartet.
    """
    entry, services = await _setup_workflow(hass, [], workflows_armed={"home": [{"type": "chime", "players": [PLAYER], "sound": sound, "duration": seconds}]})
    await call(hass, "alarm_arm_home")
    await settle(hass)
    played = services["media_player.play_media"]
    assert len(played) == 1 and played[0].data["media_content_id"].endswith(f"/alarmageddon_loop/{length}/{sound}.wav")
    assert not services["media_player.media_stop"]
    await _tick(hass, freezer, seconds + 3)
    await settle(hass)
    assert len(played) == 1 and services["media_player.media_stop"] and entry.runtime_data.workflow.running is None


async def test_each_list_takes_only_what_belongs_there_and_older_choices_stay_valid(hass: HomeAssistant, hass_ws_client) -> None:
    """Der Voralarm gehört in den Ablauf des Alarms, nicht zum Scharfschalten oder danach. Früher gewählte Klänge bleiben gültig."""
    entry = await setup_alarm(hass)
    client = await hass_ws_client(hass)

    async def save(**flows) -> dict:
        await client.send_json_auto_id({"type": "alarmageddon/save_workflows", "entry_id": entry.entry_id, "workflows": {}, **flows})
        return await client.receive_json()

    pre = {"type": "prealarm", "players": [PLAYER], "sound": "warning", "duration": 10}
    assert (await save(workflows={"home": [pre]}))["success"]
    assert (await save(workflows_armed={"home": [pre]}))["error"]["code"] == "invalid_format"
    assert (await save(workflows_after={"home": [pre]}))["error"]["code"] == "invalid_format"
    # Bis 1.14.0 waren Gong und Warnung Alarmtöne, und der Aktivierungston bot die Alarmtöne an
    old_alarm = {"type": "sound", "players": [PLAYER], "sound": "chime", "duration": 30}
    old_chime = {"type": "chime", "players": [PLAYER], "sound": "beep", "duration": 3}
    assert (await save(workflows={"home": [old_alarm]}, workflows_armed={"home": [old_chime]}))["success"]
    for bad in ({**pre, "sound": "gibt_es_nicht"}, {**pre, "duration": 0}, {**pre, "players": []}):
        assert (await save(workflows={"home": [bad]}))["error"]["code"] == "invalid_format"
