"""
Töne in der gewünschten Länge, als eine einzige Datei (1.17.0).

Bis 1.16.0 startete der Ablauf die kurze Tondatei (1 bis 4 Sekunden) auf den Lautsprechern immer wieder neu. Jeder Neustart
braucht auf einem Medienplayer einen Moment und schneidet den laufenden Ton ab: es klang abgehackt, als wäre die Datei zu kurz
(Rückmeldung des Nutzers, 2026-11-11). Jetzt bekommt der Lautsprecher für die ganze Dauer eine Datei: die Wiederholungen
nahtlos aneinandergereiht, am Anfang kurz ein- und am Ende ausgeblendet. Er wird nur einmal gestartet.

Die Datei entsteht bei der Abfrage aus der mitgelieferten Wiederholung (Bytes vervielfachen, kein Rechnen von Klang) und kommt
über eine eigene Adresse, ohne Anmeldung wie die Tondateien selbst und wie die Sprachausgabe von Home Assistant: Lautsprecher
melden sich nicht an. Angenommen werden nur bekannte Töne und eine begrenzte Länge.
"""

from __future__ import annotations

from array import array
from functools import lru_cache
import io
from pathlib import Path
import sys
import wave

from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant

from .const import ALL_SOUNDS, DOMAIN

LOOP_URL_PATH = "/alarmageddon_loop"
# Längste Datei am Stück: 3 Minuten sind rund 8 MB. Längere Töne setzt der Ablauf aus solchen Stücken zusammen (jedes endet
# ausgeblendet, der Neustart fällt in die Stille).
LOOP_MAX_SECONDS = 180
FADE_IN_MS = 30
FADE_OUT_MS = 60
DATA_LOOP_VIEW = f"{DOMAIN}_loop_view"
DATA_LOOP_CACHE = f"{DOMAIN}_loop_cache"
CACHE_ENTRIES = 4
SOUND_DIR = Path(__file__).parent / "sounds"


@lru_cache(maxsize=len(ALL_SOUNDS))
def _unit(name: str) -> tuple[int, bytes]:
    """Eine Wiederholung des Tons: Abtastrate und Rohdaten (16 Bit, mono)."""
    with wave.open(str(SOUND_DIR / f"{name}.wav")) as source:
        if source.getnchannels() != 1 or source.getsampwidth() != 2:
            raise ValueError(f"unexpected format of {name}.wav")
        return source.getframerate(), source.readframes(source.getnframes())


def render(name: str, milliseconds: int) -> bytes:
    """WAV mit dem Ton in dieser Länge: Wiederholungen nahtlos aneinander, Anfang und Ende geblendet. Blockierend (Datei lesen)."""
    if name not in ALL_SOUNDS or not 0 < milliseconds <= LOOP_MAX_SECONDS * 1000:
        raise ValueError("unknown sound or length")
    rate, unit = _unit(name)
    wanted = max(1, rate * milliseconds // 1000)
    samples = array("h")
    samples.frombytes((unit * (-(-wanted * 2 // len(unit))))[: wanted * 2])
    if sys.byteorder == "big":
        samples.byteswap()
    fade_in = min(len(samples) // 2, rate * FADE_IN_MS // 1000)
    fade_out = min(len(samples) // 2, rate * FADE_OUT_MS // 1000)
    for i in range(fade_in):
        samples[i] = samples[i] * i // fade_in
    for i in range(fade_out):
        samples[-1 - i] = samples[-1 - i] * i // fade_out
    if sys.byteorder == "big":
        samples.byteswap()
    out = io.BytesIO()
    with wave.open(out, "wb") as target:
        target.setnchannels(1)
        target.setsampwidth(2)
        target.setframerate(rate)
        target.writeframes(samples.tobytes())
    return out.getvalue()


def loop_url(base: str, name: str, seconds: float) -> str:
    return f"{base}{LOOP_URL_PATH}/{max(1, round(seconds * 1000))}/{name}.wav"


class SoundLoopView(HomeAssistantView):
    """Liefert einen Ton in der verlangten Länge. Mehrere Lautsprecher holen dieselbe Datei: die letzten bleiben kurz im Speicher."""

    url = LOOP_URL_PATH + "/{milliseconds}/{name}.wav"
    name = "alarmageddon:sound_loop"
    requires_auth = False

    async def get(self, request: web.Request, milliseconds: str, name: str) -> web.Response:
        hass: HomeAssistant = request.app["hass"]
        if name not in ALL_SOUNDS or not milliseconds.isdigit() or not 0 < int(milliseconds) <= LOOP_MAX_SECONDS * 1000:
            return web.Response(status=404)
        key = (name, int(milliseconds))
        cache: dict[tuple[str, int], bytes] = hass.data.setdefault(DATA_LOOP_CACHE, {})
        data = cache.get(key)
        if data is None:
            data = await hass.async_add_executor_job(render, name, int(milliseconds))
            cache[key] = data
            while len(cache) > CACHE_ENTRIES:
                cache.pop(next(iter(cache)))
        return web.Response(body=data, content_type="audio/wav", headers={"Cache-Control": "no-store"})


def async_register(hass: HomeAssistant) -> None:
    if not hass.data.get(DATA_LOOP_VIEW):
        hass.http.register_view(SoundLoopView())
        hass.data[DATA_LOOP_VIEW] = True
