"""
Erzeugt die mitgelieferten Alarmtöne als WAV (16 Bit, mono, 22 050 Hz).

Selbst erzeugt statt heruntergeladen: keine Lizenzfragen, und WAV spielen
Sonos und die meisten Medienplayer ab. Aufruf: python3 scripts/make_sounds.py
Die Längen stehen in const.SOUNDS, const.CHIMES und const.PREALARMS (eine Wiederholung).
Jede Datei ist eine Wiederholung, die sich nahtlos aneinanderreihen lässt: Töne mit Pausen enden in Stille, durchgehende
Töne (Sirene, Zweiton, Jaulton) schliessen ohne Sprung an ihren Anfang an. Die Wiedergabe reiht sie zu einer einzigen Datei
in der gewünschten Länge (sound_loop.py) und blendet Anfang und Ende.
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


def tone(freq, seconds, volume=0.8, shape="sine", ramp=True):
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
        # kurze Rampen gegen Knacken; ohne Rampen (ramp=False) für Töne, die als Schleife nahtlos aneinander passen
        env = min(1.0, i / 200, (n - i) / 200) if ramp else 1.0
        out.append(v * volume * env)
    return out


def silence(seconds):
    return [0.0] * int(seconds * RATE)


# Sirene: Heulton 600–1200 Hz, 4 s
# Nahtlose Schleife (1.17.0): zwei ganze Heul-Perioden und eine ganze Zahl Schwingungen, darum ohne Rampen. Aneinandergereiht
# (sound_loop.py) entsteht ein durchgehender Ton ohne Einbruch an der Nahtstelle; Anfang und Ende blendet erst die Wiedergabe.
write("siren", tone(lambda t: 900 + 300 * math.sin(2 * math.pi * 0.5 * t), 4.0, 0.8, ramp=False))
# Alarm-Piepen: schnelle Rechteck-Pieptöne, 3 s
write("beep", sum((tone(2700, 0.12, 0.7, "square") + silence(0.08) for _ in range(15)), []))
# Hupe (Klaxon): tiefer Zweiklang, 3 s
write("klaxon", sum((tone(420, 0.35, 0.8, "square") + tone(330, 0.35, 0.8, "square") + silence(0.05) for _ in range(4)), []))
# Zweiton hoch-tief (1.15.0): wie ein Martinshorn, 3 s
write("hilo", tone(lambda t: 960 if (t % 1.0) < 0.5 else 770, 3.0, 0.8, ramp=False))  # nahtlos: 480 und 385 ganze Schwingungen je Hälfte
# Jaulton (1.15.0): schnelle Läufe von tief nach hoch, 3 s
# Nahtlos: jeder Lauf dauert 6615 Abtastwerte (0,3 s) und umfasst genau 300 Schwingungen. Die Phase ist hier ausgerechnet statt
# aufsummiert, sonst läuft sie je Lauf um ein Stück weg und die Schleife knackt an der Nahtstelle.
RUN = int(0.3 * RATE)
write("yelp", [0.8 * math.sin(2 * math.pi * (600 * u + 800 * u * u / (2 * 0.3))) for i in range(10 * RUN) for u in [(i % RUN) / RATE]])
# Warnung: drei steigende Töne, 2 s (seit 1.15.0 ein Ton des Voralarms)
write("warning", tone(660, 0.3) + silence(0.1) + tone(880, 0.3) + silence(0.1) + tone(1100, 0.5) + silence(0.7))
# Gong: zwei weiche Töne, 2 s (seit 1.15.0 ein Ton des Voralarms)
write("chime", [a * math.exp(-i / RATE * 2.5) for i, a in enumerate(tone(880, 0.9, 0.7) + tone(660, 1.1, 0.7))])


# ---------- Aktivierungstöne und Voralarm (1.15.0) ----------
# Eigene Töne neben den Alarmtönen: kurz, dezent oder freundlich (Aktivierungston) bzw. leise warnend (Voralarm). Jede Datei ist eine
# Wiederholung samt Pause; ihre Länge steht in const.CHIMES / const.PREALARMS.


def note(freq, seconds, volume=0.5, decay=6.0, partials=((1.0, 1.0),)):
    """Angeschlagener Ton (wie Glocke oder Marimba): schneller Anstieg, klingt aus; partials = (Vielfaches der Frequenz, Anteil)."""
    n = int(seconds * RATE)
    total = sum(part for _mult, part in partials)
    return [volume * min(1.0, i / 60) * math.exp(-decay * i / RATE) * sum(part * math.sin(2 * math.pi * freq * mult * i / RATE) for mult, part in partials) / total for i in range(n)]


def soft(freq, seconds, volume=0.35):
    """Weicher Ton ohne Kante: schwillt an und ab."""
    n = int(seconds * RATE)
    return [volume * math.sin(math.pi * i / n) ** 2 * math.sin(2 * math.pi * freq * i / RATE) for i in range(n)]


def fit(samples, seconds):
    """Auf die Länge einer Wiederholung bringen (mit Stille auffüllen)."""
    return (samples + [0.0] * max(0, int(seconds * RATE) - len(samples)))[: int(seconds * RATE)]


def mix(*tracks):
    return [sum(t[i] for t in tracks if i < len(t)) for i in range(max(len(t) for t in tracks))]


def at(seconds, samples):
    return silence(seconds) + samples


# Aktivierungstöne
write("tone_pip", fit(tone(1000, 0.12, 0.5), 1.0))  # Piepsen
write("tone_double", fit(tone(1200, 0.08, 0.5) + silence(0.07) + tone(1200, 0.08, 0.5), 1.0))  # Doppelpiep
write("tone_soft", fit(soft(660, 0.7, 0.35), 1.5))  # sanft, dezent
write("tone_bell", fit(note(880, 1.8, 0.55, 3.0, ((1.0, 1.0), (2.01, 0.4), (2.99, 0.2), (4.2, 0.08))), 2.0))  # Glocke
write("tone_rise", fit(mix(note(523.25, 0.6, 0.45, 7.0, ((1.0, 1.0), (4.0, 0.15))), at(0.17, note(659.25, 0.6, 0.45, 7.0, ((1.0, 1.0), (4.0, 0.15)))), at(0.34, note(783.99, 1.2, 0.5, 4.0, ((1.0, 1.0), (4.0, 0.15))))), 2.0))  # Dreiklang aufsteigend, freundlich
write("tone_confirm", fit(mix(note(783.99, 0.3, 0.45, 9.0), at(0.15, note(1046.5, 0.9, 0.5, 5.0))), 1.5))  # Bestätigung, zwei Töne
write("tone_tick", fit(note(2000, 0.05, 0.5, 90.0), 1.0))  # Ticken, sehr dezent
# Voralarm: leise, warnend, als Schleife (dazu gehören auch "warning" und "chime" von oben)
write("pre_beep", fit(tone(800, 0.2, 0.4), 1.0))  # langsames Piepsen
write("pre_pulse", fit(soft(600, 0.8, 0.4), 1.0))  # pulsierend
write("pre_rising", fit(tone(lambda t: 500 + 500 * t / 0.7, 0.7, 0.4), 1.0))  # ansteigend
