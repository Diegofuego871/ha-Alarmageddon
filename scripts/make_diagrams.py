"""
Schaubilder der README erzeugen (SVG, Englisch und Deutsch): docs/img/flow-<sprache>.svg (Zustände eines Alarms) und
docs/img/safety-<sprache>.svg (was die Alarmaktionen absichert).

Aufruf im Wurzelverzeichnis: `python scripts/make_diagrams.py`. Die Bilder haben einen durchsichtigen Hintergrund und
wechseln die Farbe von Text und Linien mit hellem und dunklem Design (prefers-color-scheme).
"""

from __future__ import annotations

import pathlib
from xml.sax.saxutils import escape

OUT = pathlib.Path(__file__).resolve().parents[1] / "docs" / "img"
FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
STYLE = f"""
  text {{ font-family: {FONT}; }}
  .box {{ font-size: 14px; font-weight: 600; fill: #ffffff; }}
  .label {{ font-size: 12px; fill: #4b5563; }}
  .head {{ font-size: 13px; font-weight: 600; fill: #1f2937; }}
  .line {{ stroke: #6b7280; stroke-width: 1.6; fill: none; }}
  .tip {{ fill: #6b7280; }}
  .card {{ fill: rgba(107,114,128,.10); stroke: rgba(107,114,128,.35); stroke-width: 1; }}
  @media (prefers-color-scheme: dark) {{
    .label {{ fill: #c5cad3; }} .head {{ fill: #f3f4f6; }} .line {{ stroke: #9ca3af; }} .tip {{ fill: #9ca3af; }}
  }}
"""
GREEN, AMBER, BLUE, RED, GREY = "#2e9e5b", "#d98a00", "#0b8fd9", "#d93025", "#6b7280"

TEXT = {
    "en": {
        "flow_title": "How an alarm runs",
        "disarmed": "Disarmed", "exit": "Exit delay", "armed": "Armed", "entry": "Entry delay", "alarm": "Alarm",
        "arm": "arm", "time": "time is up", "entry_sensor": "entry sensor opens", "other": "any other sensor: at once",
        "disarm": "disarm (with the code, if one is set): from every state back to Disarmed",
        "always": "always active (smoke, water): alarm from every state",
        "safety_title": "What secures the alarm actions",
        "stages": [
            ("Alarm triggers", RED, ["Log, recording and", "message run one by one:", "one failure never", "stops the others"]),
            ("Actions start", AMBER, ["within 8 seconds,", "even if the", "preparation hangs", "or fails"]),
            ("Each step", BLUE, ["device silent: next step", "after 10 seconds;", "a push is never", "waited for"]),
            ("Watchdog", BLUE, ["no step delays the", "next one beyond its", "limit; a broken flow", "goes on"]),
            ("Siren off", GREEN, ["after the time you", "set, counted from", "the first start, also", "across a restart"]),
            ("Disarm", GREY, ["stops everything;", "devices return to", "their state before", "the alarm"]),
        ],
    },
    "de": {
        "flow_title": "So läuft ein Alarm ab",
        "disarmed": "Deaktiviert", "exit": "Ausgangsverzögerung", "armed": "Scharf", "entry": "Eingangsverzögerung", "alarm": "Alarm",
        "arm": "scharf schalten", "time": "Zeit um", "entry_sensor": "Eingangssensor öffnet", "other": "jeder andere Sensor: sofort",
        "disarm": "Deaktivieren (mit Code, falls gesetzt): aus jedem Zustand zurück zu Deaktiviert",
        "always": "immer aktiv (Rauch, Wasser): Alarm aus jedem Zustand",
        "safety_title": "Was die Alarmaktionen absichert",
        "stages": [
            ("Alarm löst aus", RED, ["Protokoll, Aufzeichnung", "und Meldung laufen", "einzeln: ein Fehler", "stoppt die anderen nie"]),
            ("Aktionen starten", AMBER, ["innert 8 Sekunden,", "auch wenn die", "Vorbereitung hängt", "oder scheitert"]),
            ("Jeder Schritt", BLUE, ["Gerät antwortet nicht:", "nächster Schritt nach", "10 Sekunden; auf Push", "wird nie gewartet"]),
            ("Wächter", BLUE, ["kein Schritt verzögert", "den nächsten über seine", "Grenze; ein Abbruch", "wird fortgesetzt"]),
            ("Sirene aus", GREEN, ["nach der Zeit, die du", "einstellst, gezählt ab", "dem ersten Start, auch", "über einen Neustart"]),
            ("Deaktivieren", GREY, ["stoppt alles; Geräte", "kehren in den Zustand", "vor dem Alarm", "zurück"]),
        ],
    },
}


def _svg(width: int, height: int, title: str, body: str) -> str:
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" role="img" aria-label="{escape(title)}">\n'
            f"<title>{escape(title)}</title>\n<style>{STYLE}</style>\n"
            '<defs><marker id="tip" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
            '<path class="tip" d="M0 0 L10 5 L0 10 z"/></marker></defs>\n' + body + "</svg>\n")


def _box(x: float, y: float, w: float, h: float, color: str, text: str) -> str:
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="{color}"/>'
            f'<text class="box" x="{x + w / 2}" y="{y + h / 2 + 5}" text-anchor="middle">{escape(text)}</text>\n')


def flow(t: dict) -> str:
    w, h, y = 172, 50, 104
    xs = [12 + i * 191 for i in range(5)]
    boxes = [(t["disarmed"], GREEN), (t["exit"], AMBER), (t["armed"], BLUE), (t["entry"], AMBER), (t["alarm"], RED)]
    out = "".join(_box(x, y, w, h, color, name) for x, (name, color) in zip(xs, boxes))
    mid = y + h / 2
    for i, label in enumerate((t["arm"], t["time"], t["entry_sensor"], t["time"])):
        x1, x2 = xs[i] + w + 3, xs[i + 1] - 3
        out += f'<path class="line" d="M{x1} {mid} L{x2} {mid}" marker-end="url(#tip)"/>'
        out += f'<text class="label" x="{(x1 + x2) / 2}" y="{y + h + 20}" text-anchor="middle">{escape(label)}</text>\n'
    # Scharf -> Alarm direkt (Bogen oben)
    a, b = xs[2] + w / 2, xs[4] + w / 2
    out += f'<path class="line" d="M{a} {y - 3} C{a} {y - 50}, {b} {y - 50}, {b} {y - 4}" marker-end="url(#tip)"/>'
    out += f'<text class="label" x="{(a + b) / 2}" y="{y - 46}" text-anchor="middle">{escape(t["other"])}</text>\n'
    # immer aktiv
    out += f'<text class="label" x="{xs[4] + w}" y="22" text-anchor="end">{escape(t["always"])}</text>\n'
    # Deaktivieren: von Alarm unten zurück zu Deaktiviert
    c, d, low = xs[4] + w / 2, xs[0] + w / 2, y + h + 62
    out += f'<path class="line" d="M{c} {y + h + 3} L{c} {low} L{d} {low} L{d} {y + h + 4}" marker-end="url(#tip)"/>'
    out += f'<text class="label" x="{(c + d) / 2}" y="{low + 20}" text-anchor="middle">{escape(t["disarm"])}</text>\n'
    return _svg(960, 250, t["flow_title"], out)


def safety(t: dict) -> str:
    w, gap, y = 150, 9, 14
    out = ""
    for i, (name, color, lines) in enumerate(t["stages"]):
        x = 8 + i * (w + gap)
        out += f'<rect class="card" x="{x}" y="{y + 30}" width="{w}" height="118" rx="12"/>'
        out += _box(x, y, w, 44, color, name)
        for n, line in enumerate(lines):
            out += f'<text class="label" x="{x + w / 2}" y="{y + 72 + n * 18}" text-anchor="middle">{escape(line)}</text>\n'
        if i:
            out += f'<path class="line" d="M{x - gap + 1} {y + 22} L{x - 1} {y + 22}" marker-end="url(#tip)"/>\n'
    return _svg(8 + 6 * (w + gap), 176, t["safety_title"], out)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for lang, t in TEXT.items():
        (OUT / f"flow-{lang}.svg").write_text(flow(t), encoding="utf-8")
        (OUT / f"safety-{lang}.svg").write_text(safety(t), encoding="utf-8")
        print(f"flow-{lang}.svg, safety-{lang}.svg")


if __name__ == "__main__":
    main()
