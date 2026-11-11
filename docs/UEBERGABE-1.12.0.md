# Übergabe 1.12.0 (2026-11-11): Namen der Sensoren wählbar

Auftrag des Nutzers an die externe Prüfstelle. Basis ist **1.11.0** (Übergabe `alarmageddon-1.11.0.zip`); `main` stand bei der
Arbeit noch auf `be5891a` (v1.10.2). Zuerst lesen, dann `docs/HANDOVER.md` (Abschnitte 1.12.0 und 1.11.0) und `CLAUDE.md`.

## 0. Inhalt der Übergabe und Anwenden

Das ZIP `alarmageddon-1.12.0.zip` enthält dieses Protokoll, `RELEASE-NOTES-1.12.0.md` (Englisch und Deutsch, für 1.12.0 und
1.11.0), zwei Patches und unter `files/` jede gegenüber v1.10.2 geänderte oder neue Datei vollständig.

- **1.11.0 ist schon auf `main`:** `git apply --index 1.12.0-auf-1.11.0.patch`.
- **`main` steht noch auf v1.10.2 (`be5891a`):** `git apply --index 1.12.0-auf-1.10.2.patch` (enthält 1.11.0 und 1.12.0), oder
  `files/` über das Repository kopieren. Dann zwei Releases (v1.11.0, v1.12.0) oder eines; das CHANGELOG hat beide Abschnitte.

Danach die Prüfungen aus `CLAUDE.md`, Commit, Push, Tag und Titel `v1.12.0`.

## 1. Wunsch des Nutzers (2026-11-11) und Umsetzung

> In der Ansichtseinstellung eine Option, standardmässig an, die den Anzeigenamen aus Gerätename und Sensorname zusammensetzt.
> Deaktiviert: nur noch der Sensorname. Mit einem Bindestrich trennen.

| Wunsch | Umsetzung |
| --- | --- |
| Option in der Ansicht, standardmässig an | Schalter "Gerätename vor dem Sensornamen" im Dialog "Ansicht" der Übersicht |
| An: Gerätename und Sensorname, mit Bindestrich | `devices.display_name`: "Gerät - Sensor" (`NAME_SEPARATOR`) |
| Aus: nur der Sensorname | eigener Name der Entität (vom Nutzer vergeben, sonst der der Integration) |

**Entscheid der Prüfstelle:** Die Wahl wird auf dem Server gespeichert und gilt für alle Geräte und auch für die
Push-Meldungen, obwohl der Rest der Ansicht je Gerät gilt. Grund: seit 1.10.2 soll ein Sensor überall gleich heissen; eine
Wahl nur im Browser hätte Liste und Alarmmeldung auseinanderlaufen lassen. Der Dialog sagt das unter dem Schalter.

**Folge für 1.11.0:** Die dortige Regel (eigener Name allein nur, wenn selbst vergeben) ist ersetzt; der Schalter entscheidet.

## 2. Dateien (gegenüber 1.11.0)

- Neu: `tests/panel/suites/names-e2e.mjs`, `docs/UEBERGABE-1.12.0.md`.
- Geändert: `settings.py`, `devices.py`, `websocket_api.py`, `backup.py`, `const.py` (PANEL_VERSION 91), `manifest.json`
  (1.12.0); Panel `list.js`, `strings.js`, `styles.js`; `tests/test_display_name.py`, `tests/test_security.py`,
  `tests/panel/sim/ha-sim.html`, `scripts/mutation_check.py`; `README.md`, `README.de.md`, `CHANGELOG.md`,
  `CHANGELOG.de.md`, `docs/HANDOVER.md`.

## 3. Prüfungen

Die Zahlen des letzten Laufs stehen in der Antwort an den Nutzer. Nicht geprüft: echtes Home Assistant mit den Geräten des
Nutzers; insbesondere, wie die eigenen Namen seiner Entitäten lauten (übersetzte Namen der Integrationen).

## 4. Hinweise für die nächste Session

- **Nach dem Update** heissen Sensoren neuerer Integrationen "Gerät - Sensor" (vorher 1.10.2: nur der Sensor; davor: der
  Anzeigename von HA ohne Bindestrich). Wer das nicht will, schaltet in der Ansicht aus.
- **Ältere Integrationen** (`has_entity_name` aus) haben keinen getrennten Gerätenamen im Anzeigenamen: dort ändert der
  Schalter nichts.
- **Kein Neuladen der Anlagen:** Die Einstellung wirkt sofort; Texte, die schon im Protokoll stehen, bleiben, wie sie
  geschrieben wurden (das Protokoll speichert die Entität und löst den Namen beim Anzeigen auf, Aufzeichnungen ebenso).
