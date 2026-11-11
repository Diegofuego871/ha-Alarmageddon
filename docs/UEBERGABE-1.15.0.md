# Übergabe 1.15.0 (2026-11-11): Alarmton, Voralarm, Aktivierungston mit eigenen Klängen

Auftrag des Nutzers an die externe Prüfstelle. Basis ist **1.14.0** (Übergabe `alarmageddon-1.14.0.zip`); `main` stand bei der
Arbeit noch auf `134f1d0` (Version 1.13.3). Zuerst lesen, dann `docs/HANDOVER.md` (Abschnitte 1.15.0 und 1.14.0) und
`CLAUDE.md`.

## 0. Inhalt der Übergabe und Anwenden

Das ZIP `alarmageddon-1.15.0.zip` ersetzt das von 1.14.0. Es enthält dieses Protokoll, `RELEASE-NOTES-1.15.0.md` (Englisch und
Deutsch, für 1.15.0 und 1.14.0), zwei Patches und unter `files/` jede gegenüber `134f1d0` geänderte oder neue Datei
vollständig (auch die Tondateien und die Bilder der README).

- **`main` steht auf `134f1d0` (1.13.3):** `git apply --index 1.15.0-auf-1.13.3.patch` (enthält 1.14.0 und 1.15.0), oder
  `files/` über das Repository kopieren (nichts ist zu löschen).
- **1.14.0 ist schon auf `main`:** `git apply --index 1.15.0-auf-1.14.0.patch`.

Danach die Prüfungen aus `CLAUDE.md`, Commit, Push, Tag und Titel `v1.15.0` (und `v1.14.0`, falls getrennt).

**Auffällig am Stand auf GitHub:** Der Commit `134f1d0` trägt die Version 1.13.3, aber nur den Tag `v1.13.0`. Für HACS zählt
der Tag: bitte prüfen, ob `v1.13.3` (und ein Release dazu) fehlt.

## 1. Wünsche des Nutzers (2026-11-11) und Umsetzung

| Wunsch | Umsetzung |
| --- | --- |
| Für den Aktivierungston mindestens fünf Tonarten, auch dezent und freundlich | Sieben eigene Klänge (`CHIMES`): Piepsen, Doppelpiep, sanfter Ton, Glocke, Dreiklang aufsteigend, Bestätigung, Ticken |
| Eine weitere Art "Voralarm", leise, als einzelne Aktion mit fünf eigenen Tonarten, erst danach der Alarm | Schrittart `prealarm` im Ablauf des Alarms: 20 Sekunden, 30 %, der Ablauf wartet auf ihn |
| Gong und Warnung gehören zum Voralarm, weitere dazu bis fünf | `PREALARMS`: Gong, Warnung, langsames Piepsen, pulsierender Ton, ansteigender Ton |
| Der richtige Alarm bekommt auch neue Klänge | `SOUNDS`: Sirene, Alarm-Piepen, Hupe, neu Zweiton hoch-tief und Jaulton |
| Drei Arten mit eigenen Begriffen: Alarmton, Voralarm, Aktivierungston; nur der Alarmton ist der Ton, den die Push-Meldung stumm schaltet; Begriffe stringent, auch in der Push-Meldung | Schritt heisst "Alarmton"; Knopf, Einstellung und Protokoll heissen "Alarmton stumm" statt "Sirene stumm" |

**Entscheide der Prüfstelle:**

- **Ältere Wahl bleibt gültig:** Ein gespeicherter Alarmton mit Gong oder Warnung spielt unverändert. Der Server nimmt je
  Tonschritt jeden bekannten Klang an; das Panel bietet je Art nur die eigenen an.
- **Voralarm wartet standardmässig** (Pille auf der Karte), weil er vor dem Alarmton stehen soll; abschaltbar im Schritt.
- **Aktivierungston nur in ganzen Wiederholungen**, damit eine Melodie nie abgeschnitten wird.
- **"Alarmton stumm"** stoppt wie bisher alle Schritte des Ablaufs (auch einen laufenden Voralarm; der Alarmton setzt dann
  nicht mehr ein). Geändert wurde nur der Name.
- **Die Klänge sind berechnet** (`scripts/make_sounds.py`), nicht aufgenommen. Ihre Form ist geprüft (Länge, Format,
  Lautheit), **gehört hat sie niemand**: bitte im Panel probehören.

## 2. Dateien (gegenüber 1.14.0)

- Neu: zwölf Tondateien unter `custom_components/alarmageddon/sounds/` (`hilo`, `yelp`, `pre_*`, `tone_*`),
  `tests/test_tones.py`, `docs/UEBERGABE-1.15.0.md`.
- Geändert: `const.py` (PANEL_VERSION 96), `schemas.py`, `workflow.py`, `websocket_api.py`, `notify.py`, `manifest.json`
  (1.15.0); Panel `actions.js`, `common.js` (Symbol `note`), `log.js`, `strings.js`, `styles.js`; `scripts/make_sounds.py`,
  `scripts/mutation_check.py`; Tests `test_action_hang.py`, `test_actions.py`, `test_armed_actions.py`, `test_security.py`,
  Panel-Nachbau und Suiten `actions-e2e`, `after-e2e`, `armed-e2e`; `README.md`, `README.de.md`, `CHANGELOG.md`,
  `CHANGELOG.de.md`, `docs/HANDOVER.md`, Bilder unter `docs/img/`.

## 3. Prüfungen

Die Zahlen des letzten Laufs stehen in der Antwort an den Nutzer. Nicht geprüft: echtes Home Assistant und echte Lautsprecher;
der Klang der neuen Töne.

## 4. Hinweise für die nächste Session

- **Push-Knopf auf dem Handy:** Schon zugestellte Meldungen tragen noch den alten Namen; neue heissen "Alarmton stumm".
- **Eingangsverzögerung** ist etwas anderes als der Voralarm: der Voralarm läuft, nachdem der Alarm ausgelöst hat.
- **Lautstärke** des Voralarms wird gesetzt und nicht zurückgestellt; der Alarmton danach setzt seine eigene.
