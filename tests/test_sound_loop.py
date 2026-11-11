"""
Töne am Stück (1.17.0): eine Datei für die ganze Dauer statt Neustart der kurzen Datei alle paar Sekunden.

Rückmeldung des Nutzers (2026-11-11): Die Töne klangen beim Wiederholen abgehackt, als wäre die Datei zu kurz. Ursache war der
Neustart auf dem Lautsprecher bei jeder Wiederholung. Geprüft wird hier die Form der Datei (Länge, Blenden, Nahtstellen) und die
Adresse, über die Lautsprecher sie holen. Wie es klingt, kann kein Test beurteilen.
"""

from __future__ import annotations

from array import array
import io
import wave

import pytest
from homeassistant.core import HomeAssistant

from custom_components.alarmageddon import sound_loop
from custom_components.alarmageddon.const import ALL_SOUNDS, SOUNDS

from .conftest import setup_alarm

RATE = 22050
CONTINUOUS = ("siren", "hilo", "yelp")  # Töne ohne Pause: sie müssen nahtlos an ihren Anfang anschliessen


def _samples(data: bytes) -> tuple[int, array]:
    with wave.open(io.BytesIO(data)) as w:
        assert (w.getnchannels(), w.getsampwidth()) == (1, 2)
        values = array("h")
        values.frombytes(w.readframes(w.getnframes()))
        return w.getframerate(), values


@pytest.mark.parametrize("name", sorted(ALL_SOUNDS))
def test_every_sound_renders_in_the_wanted_length_and_starts_and_ends_in_silence(name: str) -> None:
    """Jeder Ton, auch die neuen: genau so lang wie verlangt, beginnt bei null und endet bei null (kein Knacken, kein Abschneiden)."""
    rate, values = _samples(sound_loop.render(name, 7300))
    assert rate == RATE and len(values) == RATE * 7300 // 1000
    assert values[0] == 0 and abs(values[-1]) <= 1
    edge = RATE * 5 // 1000  # die ersten und letzten 5 ms sind leise (ein- und ausgeblendet)
    loud = max(abs(v) for v in values)
    assert loud > 5000
    assert max(abs(v) for v in values[:edge]) < loud * 0.25 and max(abs(v) for v in values[-edge:]) < loud * 0.15


@pytest.mark.parametrize("name", CONTINUOUS)
def test_continuous_sounds_join_without_a_jump_or_a_dip(name: str) -> None:
    """
    Sirene, Zweiton und Jaulton laufen durch: an der Nahtstelle zweier Wiederholungen gibt es keinen Sprung (Knacken) und keinen
    Einbruch der Lautstärke (bis 1.16.0 war jede Wiederholung am Rand ausgeblendet).
    """
    unit = round(ALL_SOUNDS[name] * RATE)
    _rate, values = _samples(sound_loop.render(name, round(ALL_SOUNDS[name] * 3000)))
    inside = max(abs(values[i + 1] - values[i]) for i in range(unit // 2, unit // 2 + 4000))  # grösster Schritt mitten im Ton
    for seam in (unit, 2 * unit):
        assert abs(values[seam] - values[seam - 1]) <= inside * 1.5, name  # kein Sprung
        window = values[seam - 220 : seam + 220]  # 20 ms um die Naht
        assert max(abs(v) for v in window) > 0.9 * max(abs(v) for v in values[unit // 2 : unit // 2 + 4000]), name  # kein Einbruch


def test_sounds_with_pauses_repeat_in_their_own_rhythm() -> None:
    """Ein Piepsen je Sekunde bleibt ein Piepsen je Sekunde: die Wiederholungen stehen lückenlos hintereinander."""
    _rate, values = _samples(sound_loop.render("pre_beep", 5000))
    block = RATE // 100  # 10 ms
    loud = [max(abs(v) for v in values[i : i + block]) > 2000 for i in range(0, len(values), block)]
    starts = [k for k, on in enumerate(loud) if on and (k == 0 or not loud[k - 1])]
    assert len(starts) == 5 and all(99 <= b - a <= 101 for a, b in zip(starts, starts[1:])), starts


@pytest.mark.parametrize("call", [("gibt_es_nicht", 1000), ("siren", 0), ("siren", sound_loop.LOOP_MAX_SECONDS * 1000 + 1), ("../const", 1000)])
def test_only_known_sounds_and_a_limited_length(call: tuple[str, int]) -> None:
    with pytest.raises(ValueError):
        sound_loop.render(*call)


async def test_speakers_fetch_the_file_without_login(hass: HomeAssistant, hass_client_no_auth) -> None:
    """Lautsprecher melden sich nicht an (wie bei den Tondateien und der Sprachausgabe): die Adresse liefert eine WAV, sonst nichts."""
    await setup_alarm(hass)
    client = await hass_client_no_auth()
    response = await client.get(f"{sound_loop.LOOP_URL_PATH}/2500/tone_rise.wav")
    assert response.status == 200 and response.headers["Content-Type"] == "audio/wav"
    data = await response.read()
    assert int(response.headers["Content-Length"]) == len(data)
    rate, values = _samples(data)
    assert rate == RATE and len(values) == RATE * 2500 // 1000
    assert (await (await client.get(f"{sound_loop.LOOP_URL_PATH}/2500/tone_rise.wav")).read()) == data  # zweiter Lautsprecher: dieselbe Datei
    for path in ("/1000/gibt_es_nicht.wav", "/0/siren.wav", f"/{sound_loop.LOOP_MAX_SECONDS * 1000 + 1}/siren.wav", "/abc/siren.wav", "/-5/siren.wav"):
        assert (await client.get(f"{sound_loop.LOOP_URL_PATH}{path}")).status == 404, path
    for _ in range(sound_loop.CACHE_ENTRIES + 3):  # der Zwischenspeicher bleibt klein
        await client.get(f"{sound_loop.LOOP_URL_PATH}/{1000 + _}/siren.wav")
    assert len(hass.data[sound_loop.DATA_LOOP_CACHE]) == sound_loop.CACHE_ENTRIES


def test_the_longest_piece_stays_small() -> None:
    """Drei Minuten am Stück sind rund 8 MB: so viel hält Home Assistant je Abfrage kurz im Speicher, nicht mehr."""
    assert sound_loop.LOOP_MAX_SECONDS * RATE * 2 < 9_000_000 and all(seconds <= 4 for seconds in SOUNDS.values())
