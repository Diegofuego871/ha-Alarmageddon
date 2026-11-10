# Übergabe 1.9.0 (2026-11-10): Sensoransicht

Auftrag des Nutzers an die externe Prüfstelle, auf Basis von `main` @ `a094cd6` (1.8.0). Zuerst lesen, dann
`docs/HANDOVER.md` (Abschnitt 1.9.0), `docs/mockups/sensor-ansicht-v1/README.md` (Konzept und Entscheide), `CLAUDE.md`.

## 0. Inhalt der Übergabe und Anwenden

Das ZIP `alarmageddon-1.9.0.zip` enthält dieses Protokoll, `RELEASE-NOTES-1.9.0.md` (Englisch und Deutsch), den Patch
`1.9.0.patch` gegen `main` @ `a094cd6` und unter `files/` jede geänderte oder neue Datei vollständig (auch die Mockups).

Anwenden: `git checkout main && git pull` (Stand `a094cd6`), dann `git apply --index 1.9.0.patch`; oder `files/` über das
Repository kopieren (nichts ist zu löschen). Danach die Prüfungen aus `CLAUDE.md`, Commit `1.9.0: Sensoransicht`, Push,
Tag und Titel `v1.9.0`.

## 1. Was gebaut wurde

Der Nutzer hat die Mockups gesehen und entschieden (2026-11-10): Bewegung über 7 und 30 Tage als Raster; die Integration
merkt sich Stundenwerte für 30 Tage; dazu der Sprung zum Alarm im Protokoll und die Kachel "Gerät". Batterie mit 30 Tagen,
90 Tagen und 1 Jahr, die Liste mit einer Zeile je Ereignis.

| Wunsch | Umsetzung |
| --- | --- |
| Klick auf einen Sensor der Übersicht öffnet ein Fenster statt Home Assistant | `data-act="more"` ruft `sensorView.open`; Liste und Karten |
| Handy: ganzer Bildschirm mit X oben; Desktop: so breit wie die Voreinstellungen | `dialog#ag-sensor.ag-wide.ag-svdlg`; schmal `100vw` x `100dvh` |
| Knopf "In HA öffnen" im Kopf, gleiches Symbol wie oben rechts | `data-sv="ha"` ruft `_moreInfo`, Symbol `external` |
| Grafik oben, je Sensorart anders | Tür/Fenster: Zustandsband, ab 7 Tagen Tageszeilen. Bewegung: Balken, ab 7 Tagen Raster. Übrige: Erreichbarkeit und Auslösungen |
| Darunter die Ereignisse; nur sie scrollen | `.ag-sv-fix` fest, `.ag-sv-list` scrollt, Tabellenkopf klebt |
| Zeitraum 3 Std., 12 Std., 1 Tag, 7 Tage, 30 Tage | `STATE_HOURS`; Batterie `BATTERY_HOURS` (30 Tage, 90 Tage, 1 Jahr) |
| Ältere Werte werden verworfen | `SensorStats.purge`: Stundenwerte älter als 30 Tage |
| Batterie und Empfang mit Verlauf und Kennzahlen | Kacheln "Batterie" und "Empfang" (nur mit Daten) |
| Keine Einstellungen in der Ansicht | nur Anzeige; ein Test prüft, dass es keine Schalter und Eingaben gibt |

### Nachtrag: Fenster auf dem Handy und "scharf ist rot"

| Wunsch | Umsetzung |
| --- | --- |
| Auf dem Handy jedes Fenster über den ganzen Bildschirm, kein Rand oben | `:host([narrow]) dialog.ag-dlg`: `100vw` x `100dvh`, ohne Radius; Rückfragen (`#ag-confirm`, `#ag-discard`) bleiben klein |
| X immer ganz oben rechts | `.ag-dlg-x` wie bisher, jetzt am Bildschirmrand |
| Leiste mit Abbrechen, Fertig, Speichern ganz unten, nie scrollend, auch nicht beim Ziehen | Die Leiste hängt auf dem Handy ausserhalb des scrollenden Inhalts direkt im Fenster (`dock` in `_initDialogs`); Formulare behalten sie im Formular |
| Gilt auch für die Sensoransicht | `#ag-sensor` nutzt dieselbe Regel |
| Kachel der Anlage auf dem Handy und im dunklen Design klar als scharf erkennbar, rot statt blau | Symbol, Zustand, gewählter Modus und Rahmen rot; Verlauf im dunklen Design kräftiger (`dark`-Attribut); "Aus" grün; Alarm mit gefülltem Symbol |

Dabei behoben: Der Pfeil an der Kachel der Anlage hätte nach der ersten Fassung der Sensoransicht diese statt Home Assistant
geöffnet; jetzt öffnet nur ein Sensor (`binary_sensor.*`) die Sensoransicht.

## 2. Dateien

- Neu: `custom_components/alarmageddon/sensor_history.py`, `panel/sensorview.js`, `tests/test_sensor_history.py`,
  `tests/test_sensor_history_recorder.py`, `tests/panel/suites/sensor-e2e.mjs`, `tests/panel/suites/fullscreen-e2e.mjs`, `docs/mockups/sensor-ansicht-v1/` (README,
  15 Bilder, Quelle), `docs/UEBERGABE-1.9.0.md`.
- Geändert: `__init__.py` und `controller.py` (Stundenwerte anbinden), `websocket_api.py` (Befehl `sensor_history`),
  `const.py` (PANEL_VERSION 87), `manifest.json` (1.9.0), Panel `alarmageddon-panel.js`, `common.js` (Symbol `history`),
  `strings.js` (97 Texte je Sprache), `styles.js`; `tests/test_security.py` (Befehl in `COMMANDS`),
  `tests/panel/sim/ha-sim.html`, `scripts/mutation_check.py`; `CHANGELOG.md`, `CHANGELOG.de.md`, `README.md`,
  `README.de.md`, `docs/HANDOVER.md`.

## 3. Prüfungen

Die Zahlen des letzten Laufs stehen in der Antwort an den Nutzer. Geprüft wurde mit Pyflakes, `python -m pytest`
(echter Recorder für die Ereignisse, Batterie und Empfang), `python scripts/mutation_check.py`, allen Panel-Suiten
(Desktop und Handy, beide Sprachen) und einer Sichtprüfung der Bildschirmfotos aus dem Nachbau. Nicht geprüft: echtes
Home Assistant mit echten Geräten; insbesondere die Langzeitstatistik von Batterie und Empfang über Monate (im Test nur
über eine nachgestellte Antwort) und das Fenster in der Companion App.

## 4. Hinweise für die nächste Session

- **Sicht im echten Betrieb:** Direkt nach dem Update reicht die Grafik so weit zurück, wie Home Assistant Verlauf hat
  (einmaliges Nachtragen); danach wächst sie auf 30 Tage. Ohne Recorder bleibt die Liste leer, die Stundenwerte laufen
  trotzdem ab dem Update.
- **Zeit offen vor einem Neustart:** War ein Sensor beim Start von Home Assistant schon offen, zählt die Zeit bis zum
  Schliessen nicht mit (der Beginn ist nicht bekannt).
- **Mehrere Anlagen:** Die Spalte "Anlage" zeigt die erste Anlage, die den Sensor überwacht (`entry_id` im Befehl wählt
  eine andere; das Panel schickt es noch nicht).
- **Nicht gebaut:** Blättern zum nächsten Sensor, CSV-Export, Vergleich mit der Vorwoche; die offene Ansicht lädt nicht
  von selbst nach.
- **Regeln:** Eine neue Sensorart mit eigener Darstellung braucht einen Zweig in `SensorView.flavor()` und in
  `_stateHtml`; ein neuer Zeitraum einen Eintrag in `STATE_HOURS`/`BATTERY_HOURS`, `RANGES` und `RANGE_LABEL`.
