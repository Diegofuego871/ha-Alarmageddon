# Übergabe 1.11.0 (2026-11-11): Alarm im Rot der scharfen Anlage, Kachel, Protokoll, Namen, README

Auftrag des Nutzers an die externe Prüfstelle, auf Basis von `main` @ `be5891a` (v1.10.2). Zuerst lesen, dann
`docs/HANDOVER.md` (Abschnitt 1.11.0) und `CLAUDE.md`.

## 0. Inhalt der Übergabe und Anwenden

Das ZIP `alarmageddon-1.11.0.zip` enthält dieses Protokoll, `RELEASE-NOTES-1.11.0.md` (Englisch und Deutsch), den Patch
`1.11.0.patch` gegen `main` @ `be5891a` und unter `files/` jede geänderte oder neue Datei vollständig (auch die Bilder der
README).

Anwenden: `git checkout main && git pull` (Stand `be5891a`), dann `git apply --index 1.11.0.patch`; oder `files/` über das
Repository kopieren (nichts ist zu löschen). Danach die Prüfungen aus `CLAUDE.md`, Commit, Push, Tag und Titel `v1.11.0`.

## 1. Wünsche des Nutzers (2026-11-11) und Umsetzung

| Wunsch | Umsetzung |
| --- | --- |
| Der Rotton der Alarmansicht passt nicht zum neuen Farbkonzept (Handy geprüft, bitte beides ansehen) | Alarmband mit Verlauf und rotem Rand wie die scharfe Kachel, eigene Mischung im dunklen Design; die Kachel bleibt im Alarm rot (`ag-alarmed`); geprüft auf Handy und Desktop, hell und dunkel |
| Unter "Alarm" steht "seit 07:16 · Diego": sieht aus, als hätte Diego ausgelöst | Erste Zeile: "seit …" und der Auslöser. Zweite Zeile: "<Modus> scharf seit … · <Name>". Neue Attribute `armed_at`, `armed_by` |
| Im Protokoll gehen die Striche wieder durch die Symbole | Linienstücke je Zeile über und unter dem Symbol, enden davor; keine durchgehende Linie mehr |
| Das Fenster jede Sekunde aktualisieren | `LogUi._poll`: 1 Sekunde bei laufendem Alarm, sonst 5 |
| Zeitraum wählen auf dem Handy: beide Daten in einer Zeile unter der Auswahl | `.ag-ldates`: eigene Zeile, gleich breit |
| Prüfen, ob die Namen (1.10.2) richtig gemacht sind | Siehe Abschnitt 2 |
| README mit neuen Bildern und den Stärken am Anfang | Einleitung und "Warum Alarmageddon" neu, Abschnitte "Sensoransicht" und "Bei einem Alarm" mit Bild, alle Bilder neu erzeugt |

## 2. Befund zu 1.10.2 (Namen)

Richtig gemacht: eine Regel für Server und Panel (`devices.display_name`), alle Meldungen und Listen gehen darüber, der Fall
des Nutzers (selbst benannte Entität am umbenannten Gerät) ist gelöst und getestet.

Mangel: die Regel nahm den eigenen Namen der Entität auch dann allein, wenn er von der Integration stammt. Ein nicht
umbenannter Bewegungsmelder hiess so nur noch "Bewegung", jeder gleich: in Liste, Protokoll und Alarmmeldung war nicht mehr
zu erkennen, welcher gemeint ist. Der Test `test_original_name_when_not_renamed` schrieb genau dieses Verhalten fest.

Korrektur in 1.11.0: allein steht der Name nur, wenn der Nutzer ihn der Entität selbst gegeben hat; sonst bleibt der
Anzeigename von Home Assistant (Gerät davor). Zwei neue Tests, ein neuer Eintrag der Mutationsprobe.

## 3. Dateien

- Neu: `tests/test_armed_since.py`, `tests/panel/suites/alarmview-e2e.mjs`, `docs/img/sensor-de.png`, `sensor-en.png`,
  `alarm-de.png`, `alarm-en.png`, `docs/UEBERGABE-1.11.0.md`.
- Geändert: `devices.py`, `controller.py`, `alarm_control_panel.py`, `const.py` (PANEL_VERSION 90), `manifest.json`
  (1.11.0); Panel `alarmageddon-panel.js`, `log.js`, `styles.js`; `tests/test_display_name.py`,
  `tests/panel/readme-shots.mjs`, `scripts/mutation_check.py`; `README.md`, `README.de.md`, `CHANGELOG.md`,
  `CHANGELOG.de.md`, `docs/HANDOVER.md`, alle PNG unter `docs/img/`.

## 4. Prüfungen

Die Zahlen des letzten Laufs stehen in der Antwort an den Nutzer. Nicht geprüft: echtes Home Assistant mit echten Geräten;
insbesondere die Namen der Sensoren des Nutzers (welche Entitäten er selbst benannt hat) und die Farben in seinem Theme.

## 5. Hinweise für die nächste Session

- **Namen:** Nach dem Update heissen Sensoren, die der Nutzer nicht selbst benannt hat, wieder wie vor 1.10.2 (Gerät und
  Entität). Wer einen kürzeren Namen will, benennt die Entität in Home Assistant um.
- **`armed_at` nach dem Update:** Eine Anlage, die beim Update schon scharf ist, kennt die Zeit nicht; die Kachel zeigt dann
  im Alarm "<Modus> scharf · <Name>" ohne Zeit, bis zum nächsten Scharfschalten.
- **1 Sekunde:** Das Protokoll fragt den Server bei laufendem Alarm jede Sekunde; die Antwort ist meist "unverändert"
  (`rev`), gezeichnet wird mit der Uhr des Browsers.
