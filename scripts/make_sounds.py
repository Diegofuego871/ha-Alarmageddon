"""
Erzeugt die mitgelieferten Alarmtöne als WAV (16 Bit, mono, 22 050 Hz).

Selbst erzeugt statt heruntergeladen: keine Lizenzfragen, und WAV spielen
Sonos und die meisten Medienplayer ab. Aufruf: python3 scripts/make_sounds.py
Die Längen stehen in const.SOUNDS (für "Wiederholen").
"""

from __future__ import annotations

import math
from pathlib import Path
import struct
import wave

RATE = 22050
OUT = Path(__file__).resolve().parents[1] / "custom_components" / "alarmageddon" / "sounds"


def write(name: str, samples: list[float]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT / f"{name}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1.0, min(1.0, s)) * 30000)) for s in samples))
    print(name, f"{len(samples) / RATE:.2f} s")


def tone(freq, seconds, volume=0.8, shape="sine"):
    out = []
    phase = 0.0
    n = int(seconds * RATE)
    for i in range(n):
        f = freq(i / RATE) if callable(freq) else freq
        phase += 2 * math.pi * f / RATE
        v = math.sin(phase)
        if shape == "square":
            v = 1.0 if v >= 0 else -1.0
            v *= 0.6
        # kurze Rampen gegen Knacken
        env = min(1.0, i / 200, (n - i) / 200)
        out.append(v * volume * env)
    return out


def silence(seconds):
    return [0.0] * int(seconds * RATE)


# Sirene: Heulton 600–1200 Hz, 4 s
write("siren", tone(lambda t: 900 + 300 * math.sin(2 * math.pi * 0.5 * t), 4.0, 0.8))
# Alarm-Piepen: schnelle Rechteck-Pieptöne, 3 s
write("beep", sum((tone(2700, 0.12, 0.7, "square") + silence(0.08) for _ in range(15)), []))
# Hupe (Klaxon): tiefer Zweiklang, 3 s
write("klaxon", sum((tone(420, 0.35, 0.8, "square") + tone(330, 0.35, 0.8, "square") + silence(0.05) for _ in range(4)), []))
# Warnung: drei steigende Töne, 2 s (für Eingangsverzögerung)
write("warning", tone(660, 0.3) + silence(0.1) + tone(880, 0.3) + silence(0.1) + tone(1100, 0.5) + silence(0.7))
# Gong: zwei weiche Töne, 2 s (zum Beispiel "Anlage scharf")
write("chime", [a * math.exp(-i / RATE * 2.5) for i, a in enumerate(tone(880, 0.9, 0.7) + tone(660, 1.1, 0.7))])
