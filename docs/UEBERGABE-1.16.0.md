# Übergabe 1.16.0 (2026-11-11): Lautstärke je Medienplayer; Fehler beim Speichern und Testen der Aktionen

Auftrag des Nutzers an die externe Prüfstelle. Basis ist **1.15.0** (Übergabe `alarmageddon-1.15.0.zip`); `main` stand bei der
Arbeit noch auf `134f1d0` (Version 1.13.3). Zuerst lesen, dann `docs/HANDOVER.md` (Abschnitt 1.16.0) und `CLAUDE.md`.

## 0. Inhalt der Übergabe und Anwenden

Das ZIP `alarmageddon-1.16.0.zip` ersetzt die von 1.14.0 und 1.15.0. Es enthält dieses Protokoll, `RELEASE-NOTES-1.16.0.md`
(Englisch und Deutsch, für 1.16.0 bis 1.14.0), zwei Patches und unter `files/` jede gegenüber `134f1d0` geänderte oder neue
Datei vollständig (auch Tondateien und Bilder der README).

- **`main` steht auf `134f1d0` (1.13.3):** `git apply --index 1.16.0-auf-1.13.3.patch` (enthält 1.14.0 bis 1.16.0), oder `files/`
  über das Repository kopieren (nichts ist zu löschen).
- **1.15.0 ist schon auf `main`:** `git apply --index 1.16.0-auf-1.15.0.patch`.

Danach die Prüfungen aus `CLAUDE.md`, Commit, Push, Tag und Titel `v1.16.0` (und die Tags davor, falls getrennt).

**Auffällig am Stand auf GitHub:** Der Commit `134f1d0` trägt die Version 1.13.3, aber nur den Tag `v1.13.0`. Für HACS zählt
der Tag: bitte prüfen, ob `v1.13.3` (und ein Release dazu) fehlt.

## 1. Meldungen des Nutzers (2026-11-11) und Umsetzung

| Meldung | Befund und Umsetzung |
| --- | --- |
| Die Lautstärke soll sich je Mediengerät einstellen lassen | Schalter "Je Medienplayer einzeln" mit einem Regler je Lautsprecher; Schritte kennen `volumes` |
| Nach einem Test erscheint plötzlich der Speicherknopf | Scheinänderung: das Panel verglich Entwurf und Serverstand als Text; der Server schreibt denselben Ablauf anders. Jetzt Vergleich des Inhalts (`canon`) |
| Dann dreht es beim Speichern sehr lange | Derselbe Stand wurde noch einmal gespeichert; Home Assistant lädt dann nicht neu, das Panel wartete 25 Sekunden darauf. Der Server meldet jetzt `reload`, das Panel wartet nur dann |

**Nachstellung:** Der Nachbau legt Abläufe jetzt wie der Server ab. Mit dem alten Vergleich scheitern in der neuen Suite 16
Prüfungen mit genau dem gemeldeten Bild ("Änderung" nach Speichern und nach Test, "Speichern" aktiv); mit der Korrektur laufen
alle durch. Auf dem echten Gerät des Nutzers ist es nicht nachgestellt.

## 2. Dateien (gegenüber 1.15.0)

- Neu: `tests/test_save_reload.py`, `tests/panel/suites/savewait-e2e.mjs`, `docs/UEBERGABE-1.16.0.md`.
- Geändert: `const.py` (PANEL_VERSION 97), `schemas.py`, `workflow.py`, `websocket_api.py`, `manifest.json` (1.16.0); Panel
  `actions.js`, `sensors.js`, `system.js`, `strings.js`; `tests/panel/sim/ha-sim.html`, `scripts/mutation_check.py`;
  `README.md`, `README.de.md`, `CHANGELOG.md`, `CHANGELOG.de.md`, `docs/HANDOVER.md`.
- README: Text nachgeführt; die Bildschirmfotos sind unverändert gültig (die gezeigten Ansichten haben sich nicht geändert).

## 3. Prüfungen

Die Zahlen des letzten Laufs stehen in der Antwort an den Nutzer. Nicht geprüft: echtes Home Assistant und echte Lautsprecher.

## 4. Hinweise für die nächste Session

- **Sensoren und Anlage** verglichen ihre Entwürfe schon bisher nach Inhalt; dort ist kein Fall von Scheinänderungen bekannt.
  Das lange Drehen ohne Neustart ist auch dort behoben (`reload`).
- **Lautstärke je Medienplayer** wird wie die gemeinsame gesetzt und nur beim Alarmton mit "Rückgängig" zurückgestellt.
