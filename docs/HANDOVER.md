# Übergabe: Stand und nächste Schritte

Einstieg für jede neue Claude-Code-Session. Zuerst diese Datei lesen, dann
`CLAUDE.md`, `docs/CONCEPT.md`, `docs/LEARNINGS.md`, `docs/DESIGN.md`.

## Stand (0.3.0, Optionen pro Sensor, neues Panel)

- Wunsch des Nutzers (2026-11-08): ohne Mockups weiterarbeiten, bis der Backlog leer ist. Für die offenen Fragen aus `docs/mockups/sensor-options-v1` gelten die Empfehlungen (Optionen im Seitenblatt A, "Bereit" als Zeile B); Ebenen der Sensor-Optionen: Voreinstellung je Sensorart (global, `settings.py`) › eigener Wert pro Sensor und Anlage (`options["sensor_options"]`). Eine Rückfrage an den Nutzer dazu steht noch aus.
- Aufbau des Panels nach Vorgabe des Nutzers: Übersicht (Steuerung der Anlagen + Warnkachel, darunter Liste wie Device Panel in `list.js`, Ansicht in `localStorage`), Konfiguration mit Reitern Sensoren (`sensors.js`, Raster + Seitenblatt + Voreinstellungen) und Anlage (`system.js`). Gemeinsames in `common.js`.
- Controller: `option()`, `always_sensors()`, `blocking_sensors()`, `ready()`, "Scharf, sobald geschlossen" mit `ARM_ON_CLOSE_SETTLE` (3 s) und Rückfall auf die ursprüngliche Verzögerung, Sensorausfall im scharfen Zustand als Ereignis (`add_event_listener`) und optional Alarm.
- Entitäten "Bereit für …" (`binary_sensor`, unique_id `<entry>_ready_<mode>`).
- WebSocket: `data` liefert `presets`, Sensorart, Empfang, Gerätedaten; `save_zones` nimmt `sensor_options`; neu `save_presets`, `save_system`.
- Tests: `tests/test_sensor_options.py`; Panel-Suiten `overview-e2e`, `groups-e2e` (jetzt Konfiguration › Sensoren), `list-e2e` (Liste, Seitenblatt, Voreinstellungen, Anlage).
- Offen für 0.4.0/0.5.0: siehe "Nächste Schritte".

## Stand (0.2.0, Phase 2: Panel)

- Panel: `panel/panel.html` (aus ha-device-panel, holt hass aus dem Elternfenster, überträgt Theme-Variablen), `panel/alarmageddon-panel.js` (Vanilla Web Component), `panel/strings.js` (en/de, `pickLang`, `translate`), `panel/styles.js`. `PANEL_VERSION` in `const.py` (Cache-Buster) bei jeder Änderung unter `panel/` erhöhen.
- Registrierung: `panel.py` (iframe-Panel, statische Pfade einmal pro Lauf, Panel entfernt erst mit der letzten Anlage). WebSocket: `websocket_api.py` (`alarmageddon/data`, `save_zones`, `arm`; nur Administratoren; Fehler als Schlüssel, Texte im Panel). Ereignisse: `events.py` (Store `alarmageddon.events.<entry_id>`, die letzten 50, beim Entfernen gelöscht).
- Übersicht A: Karten, Modus als Reiterleiste mit Kapsel (sofort verschoben, nach Fehler zurück), Code-Dialog erst nach Fehler `invalid_code`/`code_arm_required` ohne Code (Standardcode von HA geht ohne Eingabe), Alarm-Band, Countdown aus Attribut `deadline`, letzte Ereignisse.
- Sensorgruppen B: Tabelle, Ziehen über Felder (Pointer-Ereignisse am Fenster, Wert vom ersten Feld), "Alle" pro Spalte für die gefilterten Zeilen, Eingangsverzögerung nur in aktiver Zone (fällt beim Entfernen aus allen Zonen weg), Entwurf mit Rückfrage. Handy (< 600 px, Attribut `narrow`): Karten mit Zonen-Knöpfen, Reiter mit Symbol und kurzem Text.
- Tests: Python `tests/test_websocket.py`; Panel `tests/panel` (Nachbau `sim/ha-sim.html` mit derselben Logik wie der Server, Suiten `overview-e2e`, `groups-e2e`, je Sprache Desktop und Handy). Lokal: `cd tests/panel && npm ci && CHROMIUM_PATH=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome node run.mjs`.
- 0.1.0 wurde nie veröffentlicht; 0.2.0 enthält sie (CHANGELOG-Vermerk). 0.2.0 ist als Vorabversion veröffentlicht (Tag `v0.2.0`, Commit df6a001).
- Nicht im echten HA geprüft: iframe in der echten Oberfläche (Theme, Zurück-Pfeil nach "Alarmanlage hinzufügen", more-info), Companion App auf echtem Handy.

## Stand (0.1.0, Phase 1: Kern)

- `custom_components/alarmageddon/`: `controller.py` (Zustandsautomat, Zeitgeber über `async_track_point_in_utc_time` mit `@callback`-Methoden, Sensorüberwachung, Code mit Sperre, Wiederherstellung), `alarm_control_panel.py` (Entität mit `RestoreEntity`, Zusatzdaten `mode`, `deadline`, `bypassed`, `triggered_by`, `changed_by`), `binary_sensor.py` (eine Entität pro Zone), `config_flow.py` (Anlegen: Name, Nacht, Code; Optionen in vier Abschnitten als Übergang bis zum Panel), `code.py` (PBKDF2, Vergleich in konstanter Zeit).
- Optionen-Schlüssel (das Panel schreibt in Phase 2 dieselben): `zone_home/away/night`, `entry_sensors`, `exit_delay_home/away/night`, `entry_delay`, `trigger_time`, `night_enabled`, `open_sensors` (`block`/`bypass`), `code_arm_required`, `code_hash`, `code_salt`.
- Neuladen bei jeder Optionsänderung; der Zustand übersteht das über `RestoreEntity` (Test `test_options_change_keeps_state`). "Nacht" aus entfernt die Zonen-Entität aus der Registry.
- HomeKit: echtes Zubehör `SecuritySystem` im Test (`tests/test_homekit.py`, Pakete in `requirements_test.txt`). Befunde in LEARNINGS.
- Brand: `docs/brand/icon.svg`, `logo.svg`, `render.mjs` → `custom_components/alarmageddon/brand/`. Bleibt vorerst so (Entscheid des Nutzers); Vorschläge in `docs/mockups/brand-v1`.
- Nicht im echten HA geprüft (nur pytest mit echtem HA-Kern). Offen für die Prüfung im echten HA: Optionsdialog mit Abschnitten in der Oberfläche, HomeKit mit echtem iPhone.
- Tests: `pip install -r requirements_test.txt`, dann `python -m pytest`.

## Stand (2026-11-08, Konzeptphase)

- Konzept mit bedienbaren Mockups: `docs/mockups/konzept-v1/konzept.html`
  (Bilder im selben Ordner), Zusammenfassung in `docs/CONCEPT.md`.
- Regeln aus ha-device-panel übernommen: `CLAUDE.md`, `docs/LEARNINGS.md`,
  `docs/DESIGN.md`, Skill `.claude/skills/apple-design`,
  `.github/scripts/changelog_section.py` (mit Deutsch-Option).
- GitHub Actions, `pytest.ini`, `hacs.json` und Tests der Übersetzungen kamen mit 0.1.0.

## Nächste Schritte

1. 0.4.0: Konfiguration › Benachrichtigungen (Empfänger Alarm/Wartung,
   kritisch mit Lautstärke) und Konfiguration › Aktionen (Ablauf je Modus:
   Schalten, Warten, Alarmton auf Medienplayer mit mitgelieferten Tönen,
   Schnappschuss und Wiederherstellung samt Lautstärke, Push, HA-Aktion).
2. 0.5.0: Wartung (Prognose, Meldungen), Sensorausfall melden,
   Zwei-Sensor-Bestätigung, mehrere Codes pro Person.

## Zweisprachigkeit EN/DE (verbindlich)

Alles, was der Nutzer sieht, gibt es auf Englisch und Deutsch. Englisch ist
Grundsprache und Rückfall. Kein Text ist fest im Code.

| Bereich | Ort | Regel |
| --- | --- | --- |
| Panel | `panel/strings.js` | `STRINGS.en` und `STRINGS.de` mit identischen Schlüsseln; Sprache aus `hass.locale.language` (`de`/`de-*` → Deutsch, sonst Englisch) |
| HA-Oberfläche (Config Flow, Optionen, Entitäten, Dienste, Reparaturen) | `strings.json`, `translations/en.json`, `translations/de.json` | `strings.json` identisch mit `en.json`; `de.json` mit denselben Schlüsseln |
| Serverseitige Texte (Push, Reparaturen mit Platzhaltern) | Python | `hass.config.language`, `de`/`de-*` → Deutsch, sonst Englisch |
| README | `README.md` (EN), `README.de.md` (DE) | gleicher Aufbau, gegenseitig verlinkt, immer beide im selben Commit |
| CHANGELOG | `CHANGELOG.md` (EN), `CHANGELOG.de.md` (DE) | gleicher Aufbau (Keep a Changelog), gegenseitig verlinkt, immer beide im selben Commit |
| Release Notes | Text für den Nutzer | Englisch und Deutsch, aus beiden CHANGELOG-Dateien |
| Mockups | `docs/mockups/` | Deutsch |

Tests (ab Phase 1, wie in ha-device-panel): gleiche Schlüssel in allen
Textdateien, kein "ß", Sprachwahl `pickLang`, gleicher Aufbau von README und
CHANGELOG in beiden Sprachen. Panel-Suiten laufen je Sprache auf Desktop und
Handy.
