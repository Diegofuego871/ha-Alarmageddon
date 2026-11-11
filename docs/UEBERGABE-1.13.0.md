# Übergabe 1.13.0 bis 1.13.3 (2026-11-11): Protokoll mit zwei Reitern, ein Jahr Aufbewahrung, Alarm löschen; Symbole in allen Reitern; Ladeanzeige

Auftrag des Nutzers an die externe Prüfstelle, auf Basis von `main` @ `1e4185e` (v1.12.0). Zuerst lesen, dann
`docs/HANDOVER.md` (Abschnitt 1.13.0) und `CLAUDE.md`.

## 0. Inhalt der Übergabe und Anwenden

Das ZIP `alarmageddon-1.13.3.zip` ersetzt die ZIPs von 1.13.0 bis 1.13.2. Es enthält dieses Protokoll,
`RELEASE-NOTES-1.13.3.md` (Englisch und Deutsch, für 1.13.3 bis 1.13.0), zwei Patches und unter `files/` jede gegenüber
v1.12.0 geänderte oder neue Datei vollständig.

- **`main` steht auf v1.12.0 (`1e4185e`):** `git apply --index 1.13.3-auf-1.12.0.patch` (enthält 1.13.0 bis 1.13.3), oder
  `files/` über das Repository kopieren (nichts ist zu löschen).
- **1.13.2 ist schon auf `main`:** `git apply --index 1.13.3-auf-1.13.2.patch`.
- **Das erste ZIP von 1.13.3 (ohne die neuen Bilder der README) ist schon eingespielt:** `git apply --index
  1.13.3-readme-nachtrag.patch`. Es bringt nur die Bilder unter `docs/img/`, je eine Zeile in CHANGELOG, `CLAUDE.md` und
  `docs/HANDOVER.md` und dieses Protokoll; kein Code, keine neue Version.

Danach die Prüfungen aus `CLAUDE.md`, Commit, Push, Tag und Titel `v1.13.3` (und die Tags davor, falls getrennt).

## 1. Wünsche des Nutzers (2026-11-11) und Umsetzung

| Wunsch | Umsetzung |
| --- | --- |
| Wie viele Alarme werden behalten? Ein Jahr wäre gut | Bisher 30 Alarme und 1000 Ereignisse je Anlage, nach Anzahl. Neu ein Jahr für beide (`KEEP_DAYS`), die Anzahl nur noch als Obergrenze (200 und 5000) |
| Die Liste wird sonst endlos, die Ereignisse rutschen nach unten: zwei Reiter, Alarme links gewählt, alle Ereignisse rechts; Zeitraum und Filter gelten für beides | `log.js`: Reiter im festen Teil, eine Liste sichtbar; "Weitere anzeigen" je Liste |
| Einen einzelnen Alarm löschen, mit Rückfrage; Papierkorb unten im geöffneten Alarm | Knopf "Alarm löschen", `host._confirm`, Befehl `delete_recording`; nicht beim laufenden Alarm |
| Symbole in den Auswahlen der Übersicht (Art des Melders, Bereiche mit den Symbolen aus Home Assistant), nur wenn es gut aussieht | Nicht gebaut; vom Nutzer danach verworfen (Abschnitt 4) |
| Nachtrag 1.13.1: Hauptreiter am Computer mit Symbol wie auf dem Handy | `_render`: Symbole immer; am Computer links vom Text |
| Nachtrag 1.13.2: überall, wo eine Grafik lädt, die Ladeanzeige des Panels in der Mitte der Grafik statt einer Textzeile | Sensoransicht und erstes Laden des Protokolls: `.ag-ld` aus `loader.js`, etwas kleiner; alte Daten bleiben gedimmt stehen |
| Nachtrag 1.13.3: Symbole auch in der zweiten Zeile der Reiter, durchgängig auf Handy und Desktop; die Reiter des Protokolls an derselben Stelle wie die der Konfiguration | `.ag-cfg` mit `.ag-subs` in beiden Bereichen direkt unter den Hauptreitern; Symbole links vom Text |
| README jeweils gleich mitliefern, mit neuen Bildschirmfotos, falls nötig | Alle Bilder unter `docs/img/` neu erzeugt (Stand 1.13.3); Regel in `CLAUDE.md` (Checkliste, Punkt 4) und `docs/HANDOVER.md` |

## 2. Dateien

- Neu: `tests/test_retention.py`, `tests/panel/suites/logtabs-e2e.mjs`, `docs/UEBERGABE-1.13.0.md`.
- Geändert: `const.py` (`KEEP_DAYS`, Obergrenzen, PANEL_VERSION 92), `events.py`, `recording.py`, `websocket_api.py`,
  `manifest.json` (1.13.0); Panel `log.js`, `sensorview.js`, `strings.js`, `styles.js`; `tests/test_security.py`,
  `tests/panel/sim/ha-sim.html`, `tests/panel/suites/log-e2e.mjs`, `scripts/mutation_check.py`; `README.md`,
  `README.de.md`, `CHANGELOG.md`, `CHANGELOG.de.md`, `docs/HANDOVER.md`, `docs/img/log-de.png`, `docs/img/log-en.png`.

## 3. Prüfungen

Die Zahlen des letzten Laufs stehen in der Antwort an den Nutzer. Nicht geprüft: echtes Home Assistant; insbesondere das
Protokoll mit den Daten eines ganzen Jahres (im Test 450 Ereignisse) und die Reiter in der Companion App.

## 4. Verworfen: Symbole in den Auswahlen "Arten" und "Bereiche"

**Entscheid des Nutzers (2026-11-11): die Idee wird verworfen, nichts bauen.** Der Befund bleibt zur Erinnerung stehen:

- Die Auswahlen sind gewöhnliche `<select>`-Felder. Auf dem Handy öffnet das System sein eigenes Menü; darin sind nur Texte
  möglich, keine Symbole. Symbole brauchen ein eigenes Menü, das das Menü des Systems für diese Felder ersetzt.
- **Arten:** die Symbole gibt es schon (`TYPES` in `common.js`).
- **Bereiche:** Home Assistant speichert je Bereich nur den Namen des Symbols ("mdi:sofa"). Das Panel läuft in einem iframe
  (`panel.py`, `component_name="iframe"`); das Symbolelement von Home Assistant gibt es dort nicht. Möglich wäre, die Form
  aus der Seite von Home Assistant drumherum zu lesen; das stützt sich auf deren inneren Aufbau und kann mit einem Update
  von Home Assistant still ausfallen (dann ohne Symbol). Bereiche ohne gesetztes Symbol bräuchten ein neutrales.
- Nach `docs/DESIGN.md` zuerst Mockups mit Varianten und Empfehlung, dann der Entscheid des Nutzers, dann umsetzen.

## 5. Hinweise für die nächste Session

- **Bestehende Daten:** Nach dem Update bleibt alles, was jünger als ein Jahr ist; die bisherigen Grenzen haben Älteres
  schon verworfen.
- **Grösse der Antwort:** Das Protokoll schickt weiterhin alle Ereignisse und Alarme, wenn sich etwas geändert hat (`rev`),
  bei einem Jahr also mehr als bisher. Reicht das einmal nicht, den Zeitraum an den Server geben und dort filtern.
- **Löschen** betrifft nur die Aufzeichnung des Alarms, nicht die Zeilen im Ereignisprotokoll.
