# Mockups Panel, Version 1 (2026-11-08)

Entwürfe für das Seitenpanel (Phase 2) im Design von ha-device-panel
(`docs/DESIGN.md`), mit erfundenen Daten. Zwei Ansichten mit Varianten,
Desktop (1440 px) und Handy (390 × 844, Companion App). **Noch kein
Entscheid des Nutzers.**

## Übersicht (Startseite des Panels)

| Bild | Inhalt |
| --- | --- |
| `1a-uebersicht-A-karten.png` | **A:** eine Karte pro Alarmanlage im Raster (füllt breite Monitore), Modus als Reiterleiste, Hinweise, letzte Ereignisse |
| `1b-uebersicht-A-alarm.png` | A während eines Alarms: rotes Band mit "Deaktivieren" zuoberst |
| `1c-uebersicht-A-handy.png` | A auf dem Handy: Karten untereinander |
| `1d-uebersicht-A-handy-alarm-dunkel.png` | A auf dem Handy, Alarm, dunkles Design |
| `2a-uebersicht-B-leitstand.png` | **B:** Liste der Anlagen links, rechts die gewählte Anlage gross mit Modus-Kacheln und Sensoren nach Bereich |
| `2b-uebersicht-B-handy.png` | B auf dem Handy: Anlage oben wählen |

**Empfehlung: A.** Alle Anlagen und ihr Zustand sind auf einen Blick
sichtbar, auch auf dem Handy, und ein Alarm steht immer zuoberst. Das
Raster nutzt breite Monitore ohne Leerraum. B zeigt immer nur eine Anlage;
die Sensoren nach Bereich gehören eher in die Wartung (Phase 4).

## Sensorgruppen

| Bild | Inhalt |
| --- | --- |
| `3a-gruppen-A-spalten.png` | **A:** links alle Sensoren nach Bereich (mit Zonen-Symbolen), rechts eine Spalte pro Zone; Sensor in eine Zone ziehen (gerade gezogen: "Bewegung Flur" auf "Nacht") |
| `3b-gruppen-A-spalten-dunkel.png` | A im dunklen Design |
| `3c-gruppen-A-handy.png` | A auf dem Handy: Zone oben wählen, Sensoren antippen statt ziehen |
| `4a-gruppen-B-tabelle.png` | **B:** Tabelle, Zonen als Spalten mit Häkchen, Eingangsverzögerung als Schalter; über mehrere Felder ziehen setzt alle |
| `4b-gruppen-B-handy.png` | B auf dem Handy: eine Karte pro Sensor mit drei Zonen-Knöpfen |
| `5a-gruppen-C-bereiche.png` | **C:** Kacheln nach Bereich; ganzen Bereich auf eine Zone ziehen (gerade gezogen: "Wohnzimmer" auf "Nacht") oder einzeln per Symbol |
| `5b-gruppen-C-handy.png` | C auf dem Handy |

**Empfehlung: A.** Echtes Drag and Drop wie gewünscht, und jede Zone ist
als eigene Liste sichtbar: Man sieht sofort, was "Abwesend" überwacht. Auf
dem Handy wird aus dem Ziehen ein Antippen pro Zone. B ist am schnellsten
für viele Sensoren, wirkt aber wie eine Tabelle, nicht grafisch. Aus C
liesse sich in A übernehmen, einen ganzen Bereich auf einmal in eine Zone
zu ziehen (Bereichstitel in der linken Liste als Griff).

## Gemeinsam in allen Varianten

- Reiter des Panels: Übersicht, Sensorgruppen, Szenarien, Wartung, Einstellungen (Reiterleiste mit Kapsel).
- Änderungen sind ein Entwurf mit "Abbrechen" und "Speichern" (Regel aus ha-device-panel).
- Marke "Eingang" für Sensoren mit Eingangsverzögerung.
- Auf dem Handy: Trefferflächen mindestens 44 px, Speichern unten fest.

Neu rendern (nutzt das vorinstallierte Playwright, eigener Browser über
`CHROMIUM_PATH`):

```bash
cd docs/mockups/panel-v1/src
node render.mjs            # alle
node render.mjs 3          # nur Sensorgruppen A
```
