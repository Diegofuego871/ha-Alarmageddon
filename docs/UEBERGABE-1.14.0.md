# Übergabe 1.14.0 (2026-11-11): Aktionen beim Scharfschalten, Aktivierungston, Schrift auf dem Handy

Auftrag des Nutzers an die externe Prüfstelle, auf Basis von `main` @ `134f1d0` (Version 1.13.3). Zuerst lesen, dann
`docs/HANDOVER.md` (Abschnitt 1.14.0) und `CLAUDE.md`.

## 0. Inhalt der Übergabe und Anwenden

Das ZIP `alarmageddon-1.14.0.zip` enthält dieses Protokoll, `RELEASE-NOTES-1.14.0.md` (Englisch und Deutsch), den Patch
`1.14.0.patch` gegen `main` @ `134f1d0` und unter `files/` jede geänderte oder neue Datei vollständig (auch die Bilder der
README).

Anwenden: `git checkout main && git pull` (Stand `134f1d0`), dann `git apply --index 1.14.0.patch`; oder `files/` über das
Repository kopieren (nichts ist zu löschen). Danach die Prüfungen aus `CLAUDE.md`, Commit, Push, Tag und Titel `v1.14.0`.

**Auffällig am Stand auf GitHub:** Der Commit `134f1d0` trägt die Version 1.13.3 (Manifest, CHANGELOG), aber nur den Tag
`v1.13.0`. Für HACS zählt der Tag: bitte prüfen, ob `v1.13.3` (und ein Release dazu) fehlt.

## 1. Wünsche des Nutzers (2026-11-11) und Umsetzung

| Wunsch | Umsetzung |
| --- | --- |
| Die Schrift wird grösser, sobald man im Protokoll einen Alarm aufklappt; die grössere ist besser lesbar; durchgängig, alle Beschreibungen etwa so gross | Ursache: Schrift-Automatik des Browsers auf dem iPhone, jetzt abgeschaltet (`text-size-adjust: 100%`). Handy: Beschreibungen und Hinweise einheitlich 14.5 px |
| Ganz oben ein neuer, fester Punkt "Anlage scharf geschaltet" mit Plus für beliebige Aktionen gleich nach dem Scharfschalten | `workflows_armed` je Modus; Panel-Liste `.ag-wf-armed` über "Alarm beginnt" |
| Ein Aktivierungston als eigene Art neben dem Alarm (zum Beispiel Piepsen), Dauer einstellbar | Schrittart `chime`: Ton, Lautstärke, Dauer; Standard Piepsen 3 Sekunden |
| Die festen Punkte ("Alarm beginnt", "Alarm endet (quittiert)") grösser und prägnanter, mit klaren Symbolen | 36 px Symbol, 16 px fette Schrift; scharf rotes Schild, Alarm volles Rot, Ende grün |

**Entscheide der Prüfstelle:**

- **Wann die Schritte laufen:** sobald die Anlage scharf ist (nach der Ausgangsverzögerung), auch beim Wechsel des Modus.
  Nicht nach einem quittierten Alarm und nicht beim Start von Home Assistant.
- **Stoppen:** Deaktivieren beendet einen laufenden Aktivierungston sofort; ein Alarm bricht die Schritte ab.
- **Wo der Aktivierungston wählbar ist:** beim Scharfschalten und nach dem Quittieren. Beim Alarm bietet die Auswahl ihn nicht
  an (dort gehört die Sirene hin); der Server nähme ihn an.
- **Keine Sirene beim Scharfschalten:** der Alarmton ist dort nicht wählbar.
- **Schriftgrösse:** 14.5 px statt der vom iPhone vergrösserten rund 16 px, damit Beschreibungen kleiner bleiben als Titel.

## 2. Dateien

- Neu: `tests/test_armed_actions.py`, `tests/panel/suites/armed-e2e.mjs`, `docs/UEBERGABE-1.14.0.md`.
- Geändert: `const.py` (PANEL_VERSION 95), `schemas.py`, `workflow.py`, `websocket_api.py`, `manifest.json` (1.14.0);
  Panel `actions.js`, `common.js` (Symbol `tone`), `log.js`, `strings.js`, `styles.js`; `tests/test_action_hang.py`,
  `tests/panel/sim/ha-sim.html`, `tests/panel/suites/after-e2e.mjs`, `tests/panel/readme-shots.mjs`,
  `scripts/mutation_check.py`; `README.md`, `README.de.md`, `CHANGELOG.md`, `CHANGELOG.de.md`, `docs/HANDOVER.md`, die
  Bilder unter `docs/img/`.

## 3. Prüfungen

Die Zahlen des letzten Laufs stehen in der Antwort an den Nutzer. Nicht geprüft: echtes Home Assistant und ein echtes iPhone;
insbesondere, ob die Schrift dort nach dem Abschalten der Automatik überall gleich gross bleibt, und der Aktivierungston auf
echten Lautsprechern.

## 4. Hinweise für die nächste Session

- **Neustart:** Aktionen beim Scharfschalten werden nach einem Neustart von Home Assistant nicht fortgesetzt.
- **Lautstärke:** Ein neuer Aktivierungston übernimmt die Vorgabe des Formulars (Lautstärke setzen, 70 %); die Lautstärke des
  Lautsprechers wird danach nicht zurückgestellt.
- **Protokoll:** Die Schritte beim Scharfschalten stehen nicht im Protokoll (aufgezeichnet wird nur ein Alarm).
- **Meldung beim Scharfschalten** gibt es weiterhin unter Benachrichtigungen, nicht als Schritt.
