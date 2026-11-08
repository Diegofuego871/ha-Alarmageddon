# Design

Gleiche Gestaltung wie ha-device-panel: ruhig, HA-nah, hell und dunkel über
die Theme-Variablen von Home Assistant. Vollständige Vorlage mit allen
Entscheiden dort: `docs/reference/device-panel-DESIGN.md`. Diese Datei hält
fest, was Alarmageddon davon übernimmt und was eigen ist.

## Farben (CSS-Variablen, Präfix `--ag-`)

```css
:host {
  --ag-card: var(--card-background-color, #fff);
  --ag-text: var(--primary-text-color, #212121);
  --ag-text2: var(--secondary-text-color, #727272);
  --ag-text3: var(--disabled-text-color, #9e9e9e);
  --ag-divider: var(--divider-color, rgba(0,0,0,0.12));
  --ag-primary: var(--primary-color, #03a9f4);
  --ag-success: var(--success-color, #43a047);
  --ag-warning: var(--warning-color, #ff9800);
  --ag-error: var(--error-color, #db4437);
  --ag-subtle: color-mix(in srgb, var(--ag-text) 4%, var(--ag-card));
  --ag-primary-soft: color-mix(in srgb, var(--ag-primary) 14%, transparent);
  --ag-input: var(--primary-background-color, #fff);
  --ag-shadow: 0 10px 30px rgba(0,0,0,0.25);
}
```

Zustände der Alarmanlage: deaktiviert = `--ag-success`, scharf (anwesend,
abwesend) = `--ag-primary`, Verzögerung läuft = `--ag-warning`, ausgelöst =
`--ag-error`. Sensoren: OK = `--ag-success`, Achtung = `--ag-warning`,
offline = `--ag-error`, keine Daten = `--ag-text3`.

## Formen und Abstände (wie ha-device-panel)

- Karten und Dialoge: Radius 16–22 px, Schatten `--ag-shadow`, Innenabstand
  20 px (Handy 12–16 px).
- Knöpfe: Pill-Form, 36 px rund für Symbolknöpfe.
- Kacheln: Titel 12 px `--ag-text2`, Wert 20–24 px, Untertitel 12 px,
  Pfeil-Knopf unten rechts, wenn antippbar.
- Symbole: Material Design Icons als SVG-Pfade im Code (kein `ha-icon` im
  iframe).

## Layout (responsiv, Vorgabe des Nutzers)

- Panel als eingebautes iframe-Panel (siehe LEARNINGS).
- Desktop: volle Breite nutzen. Kacheln im Raster mit `auto-fill`, das sich
  an die Breite anpasst; Editoren zweispaltig (Liste links, Bearbeitung
  rechts). Keine fest schmale Mittelspalte.
- Handy (Companion App): einspaltig, Trefferflächen mindestens 44 px,
  Antippen als Ersatz für Ziehen, Blätter von unten, Safe-Area beachten.
- Breite < 600 px: Dialoge als Blatt von unten, Reiter mit Kurzbeschriftung.

## Interaktion (wie ha-device-panel)

- Toasts für Bestätigungen; in einem offenen Dialog die Bestätigung im
  Dialog selbst.
- Alles mit Tastatur bedienbar, `aria-label` auf Symbolknöpfen.
- Ziehen mit Griff, Zeile hebt sich ab, Pfeiltasten verschieben.
- Einheitlich speichern: Entwurf, "Abbrechen", "Speichern", Rückfrage beim
  Schliessen mit Änderungen.

## Vorgehen bei neuen Ansichten

Erst Mockup (HTML, Deutsch, erfundene Daten, Desktop und Handy, 2–4
Varianten mit Empfehlung), Nutzer wählt, dann umsetzen und mit Screenshots
aus dem HA-Nachbau prüfen.

## Offen

- Icon und Logo: vorerst bleibt das Schild mit A (Entscheid des Nutzers, 2026-11-08). Vorschläge mit Katze in `docs/mockups/brand-v1`. Ein Push-Bild mit 20 % Rand fehlt noch (kommt mit den Push-Meldungen).
- Die Konzept-Mockups (`docs/mockups/konzept-v1`) nutzen noch eine eigene
  Farbwelt; die echten Mockups pro Ansicht folgen dieser Datei.
