# Übergabe 1.10.0 (2026-11-10): Aktionen nach dem Quittieren; Schritte laufen standardmässig weiter

Auftrag des Nutzers an die externe Prüfstelle. Basis ist **1.9.0** (Übergabe `alarmageddon-1.9.0.zip`); `main` stand bei
der Arbeit noch auf `a094cd6` (1.8.0). Zuerst lesen, dann `docs/HANDOVER.md` (Abschnitt 1.10.0) und `CLAUDE.md`.

## 0. Inhalt der Übergabe und Anwenden

Das ZIP `alarmageddon-1.10.0.zip` enthält dieses Protokoll, `RELEASE-NOTES-1.10.0.md` (Englisch und Deutsch), zwei Patches
und unter `files/` jede gegenüber 1.8.0 geänderte oder neue Datei vollständig.

- **1.9.0 ist schon auf `main`:** `git apply --index 1.10.0-auf-1.9.0.patch`.
- **`main` steht noch auf 1.8.0 (`a094cd6`):** `git apply --index 1.10.0-auf-1.8.0.patch` (enthält 1.9.0 und 1.10.0), oder
  `files/` über das Repository kopieren. Dann zwei Releases (v1.9.0, v1.10.0) oder eines; das CHANGELOG hat beide Abschnitte.

Danach die Prüfungen aus `CLAUDE.md`, Commit, Push, Tag und Titel `v1.10.0`.

## 1. Wünsche des Nutzers (2026-11-10) und Umsetzung

| Wunsch | Umsetzung |
| --- | --- |
| Hinter "Alarm endet" ein weiteres Plus für Aktionen nach dem Quittieren; die Meldung bleibt | Liste `workflows_after` je Auslöser; Panel `.ag-wf-after` hinter der Karte der Meldung |
| Klar machen, dass an dieser Stelle quittiert wurde | Marke heisst "Alarm endet (quittiert)"; Texte der Meldung nennen Quittieren und Deaktivieren |
| Aktionen sollen standardmässig nicht aufeinander warten | `step_waits`: Gerät und Ton warten nur mit `"wait": true` |
| Abweichend "Warten, bis Aktion beendet" als Option, mit Pille auf der Aktion | Schalter im Fenster des Schritts, Pille "Wartet, bis die Aktion beendet ist" |
| "Warten" wartet natürlich weiterhin | unverändert; auch Meldung und Quittieren gehören zum Ablauf selbst |
| Handy: unter der Reiterleiste soll beim Scrollen derselbe Abstand bleiben wie über ihr | `_stickySync`: `keepGap` auf dem Handy; der Tabellenkopf beginnt 2 px unter dem Streifen |

**Entscheid der Prüfstelle:** Bestehende Abläufe ändern ihr Verhalten nicht von selbst. Ein Schritt ohne die neue Angabe
(gespeichert bis 1.9.0) wartet wie bisher und zeigt jetzt die Pille; der Nutzer schaltet es im Schritt aus. Grund: ein
Alarmablauf, der bisher in einer bestimmten Reihenfolge lief, soll nach einem Update nicht stillschweigend anders laufen.

**Bestätigt (Frage des Nutzers):** Ein Alarm wird quittiert durch den Knopf "Quittieren" im Panel (rotes Band), den Knopf
"Quittieren" der Alarmmeldung (Push, standardmässig an), einen Schritt "Alarm quittieren" im Ablauf oder durch
Deaktivieren (Panel, Entität, HomeKit, Knopf "Deaktivieren" der Meldung). Quittieren lässt die Anlage scharf.

## 2. Dateien (gegenüber 1.9.0)

- Neu: `tests/test_after_actions.py`, `tests/panel/suites/after-e2e.mjs`, `tests/panel/suites/stickygap-e2e.mjs`,
  `docs/UEBERGABE-1.10.0.md`.
- Geändert: `const.py` (`CONF_WORKFLOWS_AFTER`, `AFTER_STEP_TYPES`, PANEL_VERSION 88), `schemas.py`, `workflow.py`,
  `websocket_api.py`, `manifest.json` (1.10.0); Panel `actions.js`, `alarmageddon-panel.js`, `strings.js`, `styles.js`;
  `tests/panel/sim/ha-sim.html`, `tests/panel/suites/actions-e2e.mjs`, `ack-e2e.mjs`, `review-e2e.mjs`,
  `scripts/mutation_check.py`; `CHANGELOG.md`, `CHANGELOG.de.md`, `README.md`, `README.de.md`, `CLAUDE.md`,
  `docs/HANDOVER.md`.

## 3. Prüfungen

Die Zahlen des letzten Laufs stehen in der Antwort an den Nutzer. Geprüft mit Pyflakes, `python -m pytest`,
`python scripts/mutation_check.py` und allen Panel-Suiten (Desktop und Handy, beide Sprachen), dazu eine Sichtprüfung der
Bildschirmfotos. Nicht geprüft: echtes Home Assistant mit echten Geräten.

## 4. Hinweise für die nächste Session

- **Neustart:** Aktionen nach dem Quittieren werden nach einem Neustart von Home Assistant nicht fortgesetzt.
- **Kein Test der ganzen Liste:** Der Knopf "Testen" unten testet den Ablauf beim Alarm; in der Liste danach lässt sich jeder
  Schritt einzeln testen.
- **Unberührte ältere Schritte** behalten beim Speichern ihre alte Form (ohne `wait`); erst ein bearbeiteter Schritt
  bekommt die Angabe. Das ist gewollt: so bleibt ihr Verhalten gleich.
- **Protokoll:** Die Aktionen nach dem Quittieren erscheinen nicht in der Aufzeichnung des Alarms (sie endet mit dem
  Quittieren).
