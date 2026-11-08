# Übergabe: Stand und nächste Schritte

Einstieg für jede neue Claude-Code-Session. Zuerst diese Datei lesen, dann
`CLAUDE.md`, `docs/CONCEPT.md`, `docs/LEARNINGS.md`, `docs/DESIGN.md`.

## Stand (0.1.0, Phase 1: Kern)

- `custom_components/alarmageddon/`: `controller.py` (Zustandsautomat, Zeitgeber über `async_track_point_in_utc_time` mit `@callback`-Methoden, Sensorüberwachung, Code mit Sperre, Wiederherstellung), `alarm_control_panel.py` (Entität mit `RestoreEntity`, Zusatzdaten `mode`, `deadline`, `bypassed`, `triggered_by`, `changed_by`), `binary_sensor.py` (eine Entität pro Zone), `config_flow.py` (Anlegen: Name, Nacht, Code; Optionen in vier Abschnitten als Übergang bis zum Panel), `code.py` (PBKDF2, Vergleich in konstanter Zeit).
- Optionen-Schlüssel (das Panel schreibt in Phase 2 dieselben): `zone_home/away/night`, `entry_sensors`, `exit_delay_home/away/night`, `entry_delay`, `trigger_time`, `night_enabled`, `open_sensors` (`block`/`bypass`), `code_arm_required`, `code_hash`, `code_salt`.
- Neuladen bei jeder Optionsänderung; der Zustand übersteht das über `RestoreEntity` (Test `test_options_change_keeps_state`). "Nacht" aus entfernt die Zonen-Entität aus der Registry.
- HomeKit: echtes Zubehör `SecuritySystem` im Test (`tests/test_homekit.py`, Pakete in `requirements_test.txt`). Befunde in LEARNINGS.
- Brand: `docs/brand/icon.svg`, `logo.svg`, `render.mjs` → `custom_components/alarmageddon/brand/`. Erster Vorschlag, noch nicht vom Nutzer bestätigt.
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

1. Phase 2: Panel mit Drag and Drop. Vorher Mockups pro Ansicht im Design
   von ha-device-panel (Varianten mit Empfehlung).

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
