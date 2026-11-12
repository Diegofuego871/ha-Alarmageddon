# CLAUDE.md – Alarmageddon

Anweisungen für Claude Code in diesem Repository. Zuerst `docs/HANDOVER.md`
(Stand, nächste Schritte, Zweisprachigkeit), dann vor jeder Arbeit lesen,
zusammen mit `docs/CONCEPT.md`, `docs/LEARNINGS.md` und `docs/DESIGN.md`.

Die Regeln sind aus Diegofuego871/ha-device-panel übernommen (Wunsch des
Nutzers, 2026-11-08) und auf Alarmageddon angepasst. Bei Fragen zum Vorgehen
dort nachsehen: ha-device-panel ist Vorbild in Aufbau, Arbeitsweise und
Design.

## Projekt

Home-Assistant-Integration (HACS, Domain `alarmageddon`): stellt eine
Alarmanlage als `alarm_control_panel`-Entität bereit. Einrichtung grafisch in
einem automatisch angelegten Seitenpanel: Sensorgruppen "Anwesend" und
"Abwesend" per Drag and Drop, frei konfigurierbare Alarmszenarien (Sirene,
Rollläden, Medien, kritische Push-Meldungen mit Aktionen), Wartungsübersicht
der Sensoren nach Bereich (Batterie, letzte Aktivität, Prognose) und
Überwachung nach dem Vorbild von Device Panel. Konzept: `docs/CONCEPT.md`,
Mockups: `docs/mockups/konzept-v1/`.

Feste Vorgaben des Nutzers (2026-11-08):

- **Mehrere Alarmanlagen pro HA:** ein Config Entry pro Alarmanlage, jede mit
  eigenem Gerät und eigener `alarm_control_panel`-Entität. Kein
  `single_config_entry`.
- **Apple HomeKit ist zentral:** Jede Alarmanlage muss sich über die
  HomeKit-Bridge von HA übergeben und dort steuern lassen. Zustände,
  unterstützte Funktionen und Code-Verhalten so wählen, dass HomeKit sie
  abbildet; Verhalten im HA-Quellcode (`homeassistant/components/homekit`)
  prüfen und mit Tests absichern, nicht annehmen.
- **Modi frei wählbar (geändert 2026-11-08, vorher waren "Anwesend" und
  "Abwesend" immer da):** pro Alarmanlage "Anwesend", "Abwesend" und
  "Nacht" einzeln ein- und ausschaltbar, im Panel unter Konfiguration ›
  Anlage, mindestens einer. Standard: Anwesend und Abwesend an, Nacht aus.
  Den Modus, in dem die Anlage gerade scharf ist, kann man nicht abschalten.
- **Veröffentlichung über HACS:** alle Regeln von HACS und hassfest
  einhalten (siehe "HACS").
- **Jede Funktechnik:** Alarmageddon arbeitet nur mit HA-Entitäten
  (`binary_sensor`, `sensor` für Batterie, `siren`, `cover` …) und ist damit
  unabhängig von der Technik. Der Nutzer selbst nutzt WLAN und Thread
  (Matter); Zigbee (ZHA, Zigbee2MQTT), Z-Wave, Bluetooth und andere müssen
  ebenso gehen. Angaben je Technik (Signal, "zuletzt gesehen",
  Koordinator-Ausfall) nur als Zusatz, wo verfügbar, nie als Voraussetzung.
- **Responsiv:** Das Panel nutzt einen Desktop-Monitor in der Breite gut
  aus (mehrspaltig, Kacheln füllen die Fläche, keine schmale Mittelspalte)
  und ist auf dem Handy in der Companion App ebenso gut bedienbar (Tippen
  statt Ziehen, grosse Trefferflächen, Blätter von unten, Safe-Area). Jede
  Ansicht wird auf Desktop und Handy (390 × 844) gebaut und geprüft.

## Sprache (Vorgabe des Nutzers, wörtlich)

> Die Integration soll grundsätzlich English sein, erkennt aber zusätzlich
> Deutsch, wenn HA so läuft.
> Alle README und Release Notes führen wir ab jetzt in diesen beiden Sprachen.
> Mockups sind grundsätzlich deutsch.

Umsetzung:

- Integration: Englisch ist die Grundsprache und der Rückfall. Deutsch, wenn
  HA auf `de`/`de-*` läuft (Panel: `hass.locale.language`; Server:
  `hass.config.language`). Jede andere Sprache bekommt Englisch.
- README: `README.md` (Englisch) und `README.de.md` (Deutsch), gleicher
  Aufbau, gegenseitig verlinkt, immer beide im selben Commit.
- CHANGELOG: `CHANGELOG.md` (Englisch) und `CHANGELOG.de.md` (Deutsch),
  gleicher Aufbau nach Keep a Changelog (Added/Hinzugefügt, Changed/Geändert,
  Deprecated/Veraltet, Removed/Entfernt, Fixed/Behoben, Security/Sicherheit),
  immer beide im selben Commit.
- Release Notes: Englisch **und** Deutsch (abweichend von ha-device-panel,
  wo sie nur Englisch sind). Grundlage sind die Abschnitte aus beiden
  CHANGELOG-Dateien.
- Mockups: Deutsch, mit erfundenen Daten.
- Panel-Texte in `panel/strings.js`, Englisch und Deutsch mit denselben
  Schlüsseln; HA-Texte in `strings.json` = `translations/en.json` und
  `translations/de.json`. Kein Text fest im Code.
- Kommunikation mit dem Nutzer: Deutsch, Schweizer Rechtschreibung (nie "ß",
  immer "ss"), präzise, ohne Füllwörter. Anführungszeichen: "".
- Code-Kommentare und Docstrings auf Deutsch. Kommentare erklären das Warum,
  nicht das Was.

## Arbeitsweise

- Vor grösseren UI-Änderungen Mockups bauen (HTML, gerendert als Bild,
  mehrere Varianten mit Empfehlung, Desktop und Handy). Der Nutzer
  entscheidet visuell. Ablage: `docs/mockups/<thema>-vN/` mit `README.md`,
  Bildern und Quelle unter `src/`.
- Bei Entscheidungen mit Verhaltensänderung oder Risiko nachfragen, mit
  Auswirkungen und Empfehlung. Kleine, klare Fehler direkt beheben.
- Nichts annehmen, was sich prüfen lässt: Code, HA-Quellcode, Tests.
- Screenshots, Mockups und Testdaten nur mit erfundenen Daten.
- Sicherheitsrelevantes (Tokens, Keys, Alarmcode) nie im Panel anzeigen und
  nie loggen.
- Andere Integrationen nie ohne ausdrücklichen Knopfdruck des Nutzers ändern.
  Szenario-Aktionen, die der Nutzer selbst eingerichtet hat, sind davon
  ausgenommen.

## Sicherheitsregeln (Alarmageddon)

- Eine Alarmanlage muss im Zweifel alarmieren, nicht schweigen. Fehler in
  einem Szenario-Schritt brechen die übrigen Schritte nicht ab.
- Deaktivieren stoppt immer alle laufenden Schritte und führt die
  Gegenaktionen aus, auch nach einem Neustart von HA mitten im Alarm.
- Kein Gerät darf den Ablauf der Alarmaktionen aufhalten: Jeder Aufruf wartet
  höchstens 10 Sekunden (`SERVICE_TIMEOUT` in `workflow.py`), dann geht der
  Ablauf weiter; Deaktivieren beendet hängende Aufrufe, auch solche, die
  Abbrüche ignorieren. Jeder neue Schritt im Ablauf braucht einen Test mit
  hängendem Gerät (`tests/test_action_hang.py`).
- Nichts, was beim Auslösen mitläuft, darf die Alarmaktionen aufhalten oder verhindern (seit 0.40.0): Zuhörer des
  Automaten werden einzeln aufgerufen (`controller._call_each`; die Alarmaktionen hängen als letzter Zuhörer an derselben
  Liste wie Protokoll, Aufzeichnung und Meldung), Meldungen gehen ohne Abwarten hinaus, die Ablage vor dem ersten Schritt
  wartet höchstens `SNAPSHOT_TIMEOUT`, Mitschreiben (Zeitachse, gespeicherter Stand) steht im `try`. Schritte, die etwas
  ausführen, laufen standardmässig weiter (seit 1.10.0; `workflow.step_waits`: nur mit `"wait": true` wartet der Ablauf,
  ältere Schritte ohne die Angabe warten wie bisher); ein Schritt, der nie von selbst endet (Ton "bis zum Deaktivieren"),
  wartet nie. Darüber wacht der
  Wächter (`workflow._watched`, `step_budget`, `start_budget`, `_check_started`, `_on_flow_done`): in `async_run` und
  `_execute` steht jedes `await` unter `self._watched(...)` (ein Test prüft das am Quelltext), jeder Schritttyp hat eine
  Grenze in `step_budget`. Jeder neue Zuhörer,
  jeder neue Schritt und alles, was vor dem ersten Schritt läuft, braucht einen Test "scheitert" und "hängt" in
  `tests/test_action_hang.py` und eine Zeile in `scripts/mutation_check.py`.
- Wie lange Sirene und Ton laufen, bestimmt allein der Nutzer (rechtlich wichtig: eine Sirene endet nach der gewählten Zeit).
  Nie eine feste Dauer in den Code schreiben. Die Dauer steht im Ablauf (Schritt "Warten", "Dauer" beim Ton), gilt genau und
  zählt ab dem ersten Start des Schritts, auch über Neuladen und Neustart (`workflow._remaining`). Die Grenzen des Wächters
  begrenzen nur Antwortzeiten und liegen immer über der eingestellten Zeit. Jede Änderung an Schritten mit Dauer braucht einen
  Test in `tests/test_duration.py`.
- Deaktivieren per Push-Aktion ist standardmässig aus.
- Scharfschalten per Push-Knopf (seit 1.18.0, Meldung "Scharfschalten nicht möglich": "Erneut versuchen", "Trotzdem scharf
  schalten") ist standardmässig an (Entscheid des Nutzers, 2026-11-12). Die Knöpfe wirken nur bei deaktivierter Anlage, eine
  Stunde lang (`ARM_BUTTONS_VALID`), nur vom Handy eines Empfängers dieser Meldung, für den Modus des gescheiterten Versuchs
  (nie aus dem Ereignis des Handys) und ohne Code. Jede dieser Bedingungen hat einen Test in `tests/test_arm_buttons.py`
  und eine Zeile in `scripts/mutation_check.py`.
- Jede Änderung am Zustandsautomaten oder an der Szenario-Engine braucht
  Tests für: Deaktivieren während Verzögerung, Neustart während Alarm,
  Sensor fällt im scharfen Zustand aus.

## Sicherheitstests (seit 0.40.0, Code-Review)

Alarmageddon ist ein Sicherheitsprodukt: Tests sichern Zusagen, nicht Zeilen. Verbindlich:

- `tests/test_security.py` prüft Zusagen vollständig statt am Beispiel. Jeder neue WebSocket-Befehl bekommt einen Eintrag
  in `COMMANDS` (sonst scheitert `test_every_websocket_command_is_listed`); damit gelten für ihn automatisch
  "nur Administratoren" und "fremde oder nicht geladene Anlage abgelehnt".
- Jede neue Schutzmassnahme (Prüfung einer Berechtigung, eines Zustands, einer Eingabe, eines Absenders) bekommt einen
  Test **und** eine Zeile in `scripts/mutation_check.py`. Die Mutationsprobe baut die Massnahme aus und verlangt, dass
  ein Test scheitert; "ÜBERSEHEN" oder "FEHLT" ist ein Fehler, auch in der CI.
- Neue Zustände, Modi oder Empfängertypen ergänzen die parametrisierten Tests (Zustandsmatrix, Wiederherstellung,
  `recipient_users`), nicht nur einen Einzelfall.
- Geheimnisse (Code, Hash, Salz) dürfen in keiner Antwort, Ablage oder Logzeile der Integration stehen:
  `test_codes_and_hashes_never_leave_the_server` um jede neue Antwort und Ablage erweitern.
- Fehlertests zuerst rot sehen (LEARNINGS); Panel-Änderungen bekommen eine Prüfung in einer Suite unter `tests/panel`
  (`review-e2e.mjs` für Logik, die Server und Panel gleich rechnen müssen).

## Regel: Ebenen einer Einstellung

- Eine Einstellung, die sich mehr als global ändern lässt, bekommt alle
  Ebenen zugleich, mit Anzeige der Herkunft, Zurücksetzen, Übersicht der
  eigenen Werte, Sicherung und Wiederherstellung und Tests. Nie nur einen
  Teil der Ebenen bauen und den Rest später nachreichen.
- Ebenen für Alarmageddon (Entscheid des Nutzers, 2026-11-08, ersetzt den
  früheren Entscheid für vier Ebenen): zwei Ebenen, Voreinstellung je
  Sensorart (global, für alle Anlagen) › eigener Wert pro Sensor (Wirksam:
  Sensor > Sensorart). Keine eigenen Ebenen für Alarmanlage und Bereich.

## HACS

- Öffentliches Repository, genau eine Integration unter
  `custom_components/alarmageddon/`.
- `hacs.json` im Root mit `name`, `render_readme`, ehrlicher Mindestversion
  `homeassistant`.
- `manifest.json` mit `domain`, `name`, `version`, `documentation`,
  `issue_tracker`, `codeowners`, `config_flow`, `iot_class`,
  `integration_type`, `requirements`, `dependencies`/`after_dependencies`
  für jede importierte Integration.
- Brand-Bilder lokal unter `custom_components/alarmageddon/brand/`
  (`icon.png` 256 × 256, `icon@2x.png`, `logo.png`, `logo@2x.png`, Test
  der Masse), optional PR an home-assistant/brands.
- GitHub: Beschreibung, Topics und Issues sind gesetzt (geprüft 2026-11-08:
  `hacs`, `hacs-integration`, `home-assistant`, `homeassistant`,
  `integration`, `marketplace`; Lizenz MIT). Die HACS-Action prüft das mit.
- Actions `validate.yml` (HACS-Action und hassfest) und `tests.yml` müssen
  grün sein; Actions mit fester Commit-Version.
- Releases als GitHub-Release mit Tag (siehe "Git und Releases").

## Design-Regeln

Übernommen aus ha-device-panel (`docs/reference/device-panel-DESIGN.md`),
Klassen und Präfix (`--ag-`) für Alarmageddon neu. Details in
`docs/DESIGN.md`.

- **Auswahlknöpfe:** Jede Auswahl in Reiter- oder Segmentform ist eine
  Reiterleiste mit gleitender Kapsel am gewählten Knopf. Nie eine eigene
  Segmentleiste ohne Kapsel. Grösse darf abweichen, Stil nie. Eine Leiste
  ohne gewählten Knopf zeigt keine Kapsel.
- **Suchfelder:** `<input type="search">` mit Lupe links und eigenem X zum
  Leeren rechts (nur sichtbar mit Inhalt, Fokus bleibt im Feld). Ein
  gemeinsamer Handler, keine eigene Gestaltung je Feld.
- **Pfeile:** Jeder Pfeil, der eine Zeile, Kachel oder einen Abschnitt öffnet
  oder weiterspringt, ist derselbe runde Pfeil-Knopf (24 px, Pfeil 16 px).
  Ausnahmen: Dropdowns und Auswahlfelder behalten ihren kleinen Pfeil.
- **Ladeanzeige bei Grafiken:** Reiter wechselt sofort, danach lädt es. Die
  alte Grafik bleibt gedimmt, darüber drei sich drehende Punkte in der Farbe
  der Grafik. Überholte Antworten verwerfen, geholte Zeiträume kurz
  zwischenspeichern. Nie "Lädt …" als Text oder einen Balken.
- **Einheitlich speichern:** Änderungen sind ein Entwurf mit "Abbrechen" und
  "Speichern". Beim Wechsel zwischen Reitern geht nie etwas verloren: jeder
  Reiter behält seinen Entwurf, ein gelber Punkt am Reiter zeigt offene
  Änderungen. Rückfrage nur dort, wo ein Entwurf wirklich ersetzt oder
  verworfen würde (andere Anlage, Neuladen der Seite).
- **Tabellenkopf klebt immer (Vorgabe des Nutzers, 2026-11-09):** Die oberste
  Zeile jeder Tabelle (Beschriftung, Filtern, Sortieren) scrollt nie weg, auf
  Desktop und auf dem Handy; nur die Zeilen darunter scrollen. Auf dem Handy
  scrollen dafür die Filter weg, und die Tabelle ist so kompakt, dass sie ohne
  seitliches Scrollen passt (ein Rollbereich mit `overflow` verhindert das
  Festkleben). Jede neue Tabelle bekommt einen Test, der auf Desktop und Handy
  scrollt und die Lage des Kopfes prüft.
- **Orange Punkte (Vorgabe des Nutzers, 2026-11-10):** Ein orange Punkt bedeutet immer "ungespeicherte Änderung" (zum Beispiel am Reiter). Jede andere Markierung, etwa "eigener Wert", ist blau. Verschwindet ein orange Punkt nach dem Speichern nicht, ist es ein Fehler.
- **Schalter links, Text rechts (Grundregel, Vorgabe des Nutzers, 2026-11-11):** Jeder Schalter steht links, sein Text
  rechts davon und nahe dabei; der Text wächst nach rechts. Nie ein Schalter am rechten Rand, weit weg von seinem Text,
  auf Desktop und auf dem Handy. Zwischen Schalter und Text darf nur das Symbol der Option stehen. Die Regel gilt
  zentral im CSS für alle Zeilenarten (`order: -1` in `styles.js`); eine neue Zeilenart wird dort ergänzt. Ausnahme:
  Schalter in Tabellenzellen (die Spalte ist ihre Beschriftung). `tests/panel/suites/switches-e2e.mjs` prüft das ganze
  Panel samt allen Fenstern; jede neue Ansicht mit Schaltern kommt dort dazu.
- **Kapitel:** Einstellungen stehen in Kapiteln; jedes hat einen Titel mit
  einem Strich davor (`chapter()` in `panel/common.js`), darunter die Karte.
  Reiter der Konfiguration gleiten beim Wechsel seitlich herein.
- **Drag and Drop** mit Pointer-Ereignissen am Fenster und Tastatur-Ersatz
  (siehe LEARNINGS); auf Touch zusätzlich Antippen statt Ziehen.

## Git und Releases

- Nur auf `main` pushen, keine weiteren Branches. Gilt auch, wenn die
  Session einen anderen Branch vorgibt. Liegt Arbeit auf einem anderen
  Branch, nach `main` bringen und den Branch löschen. Lehnt GitHub den Push
  auf `main` ab, über einen PR mergen und den Branch danach löschen. Remote-
  Branches löschen kann die Session nicht (403): dann den Nutzer bitten.
- Tags und Releases legt der Nutzer selbst an, immer mit Ziel `main`
  (Sessions können keine Tags pushen). Ob ein Tag existiert, prüft Claude auf
  GitHub unmittelbar vor jedem Push: Tags und Releases, mit und ohne
  "v"-Präfix.
- Korrekturen an einer Version, deren Tag noch nicht existiert, bleiben in
  derselben Version (CHANGELOG-Abschnitt ergänzen). Neue Funktionen
  bekommen eine neue Nummer, auch wenn die vorige noch keinen Tag hat; die
  vorige wird dann übersprungen.
- Nach jedem Push, der die Integration ändert (Code, Manifest, CHANGELOG),
  liefert Claude die Release-Angaben für den aktuellen Stand von `main`:
  - Version (wie in `manifest.json`), Tag und Titel `vX.Y.Z`
  - Ziel: `main` mit Commit-Hash
  - Vorabversion: Version 1.0.0 ist offiziell (Entscheid des Nutzers,
    2026-11-10, kein "Pre-release"-Haken). Für spätere Versionen vor dem
    Release nachfragen, ob Vorabversion oder offiziell. Bisherige Regel,
    standardmässig **ja**, bis der Nutzer ausdrücklich sagt,
    dass eine Version offiziell wird. Versionsnummern ohne a/b/rc-Suffix;
    der Unterschied liegt nur am Haken "Pre-release". Grund: HACS zeigt
    Vorabversionen nur Nutzern, die sie einschalten.
  - Release Notes im Chat **nur auf Englisch** (Entscheid des Nutzers,
    2026-11-08; CHANGELOG und README bleiben zweisprachig), als
    Markdown-Codeblock, beginnend mit `## X.Y.Z (JJJJ-MM-TT)`. Grundlage:
    `python3 .github/scripts/changelog_section.py X.Y.Z` (Englisch) und
    `python3 .github/scripts/changelog_section.py X.Y.Z de` (Deutsch).
  - **Offizielles Release nach Vorabversionen:** Die Notes fassen alles seit
    dem letzten *offiziellen* Release zusammen, mit dem Satz "Includes the
    changes from X and Y" / "Enthält die Änderungen aus X und Y".
  - **Übersprungene Versionen:** Die Notes fassen alles seit dem letzten
    Release zusammen (Abschnitte zusammengeführt), mit demselben Satz.
- **Vorgabe des Nutzers (2026-11-08):** Immer wenn ein Release fertig ist und
  Claude auf den Nutzer wartet, gibt Claude die kompletten Release Notes
  (nur Englisch) seit dem letzten vom Nutzer veröffentlichten Tag
  aus, nicht nur die der letzten Version. Vorher auf GitHub prüfen, welches
  der letzte veröffentlichte Tag ist. Aktuell sind alle Releases
  Vorabversionen ("Vorabversion: ja").
- Im CHANGELOG (beide Sprachen) bleiben übersprungene Versionen mit eigenem
  Abschnitt stehen, mit dem Vermerk "Not released" / "Nicht veröffentlicht"
  und ohne Link-Fussnote.
- Veröffentlichte Tags nie ändern: Ist ein Release falsch, neue Version.

## Bei jeder funktionalen Änderung

1. Version in `manifest.json` erhöhen (SemVer: Patch für Fehler, Minor für
   Funktionen oder Verhaltensänderungen).
2. `PANEL_VERSION` in `const.py` erhöhen, sobald sich Dateien unter
   `panel/` ändern (Cache-Buster).
3. CHANGELOG-Eintrag in `CHANGELOG.md` und `CHANGELOG.de.md` inkl.
   Link-Fussnote.
4. README EN und DE nachführen, bei jeder Lieferung (Vorgabe des Nutzers, 2026-11-11). Hat sich die Oberfläche sichtbar
   geändert, auch die Bilder neu erzeugen: `node tests/panel/readme-shots.mjs`, danach `python scripts/optimize_images.py`.
5. Sicherung und Wiederherstellung prüfen: Alles, was der Nutzer eingestellt
   hat (Zonen, Szenarien, Überwachung, Einstellungen pro Gerät), gehört in
   die Sicherung, mit Prüfung des Werts und Test. Laufzeitdaten nicht.
6. Prüfungen (siehe unten) und Tests laufen lassen.
7. `.pyc`/`__pycache__` nie committen.
8. Nach dem Push die Release-Angaben ausgeben (siehe "Git und Releases").
9. `docs/HANDOVER.md` nachführen (Stand, offene Punkte).

## Prüfungen vor jedem Commit

Gelten, sobald der jeweilige Teil existiert:

- Python: `python -m pyflakes custom_components/alarmageddon/*.py`
- JSON gültig, `strings.json` identisch mit `translations/en.json`,
  `translations/de.json` mit denselben Schlüsseln
- `node --input-type=module --check < Datei` für alle Panel-Dateien
  (`node --check` allein findet in Modulen keine Syntaxfehler)
- kein "ß" in Code, Texten, README, CHANGELOG
- README und CHANGELOG EN/DE gleich aufgebaut (Test)
- `python -m pytest` (Python 3.13, `pip install -r requirements_test.txt`)
- `python scripts/mutation_check.py` (Mutationsprobe der Sicherheitstests, siehe "Sicherheitstests")
- Panel-Tests mit HA-Nachbau und Playwright, je Sprache, Desktop und Handy
  (390 × 844), echte Klicks/Taps.

## Commit-Nachrichten

Kurze Betreffzeile mit Version ("0.2.0: …"), Liste der Änderungen, am Ende
die vom System vorgegebenen Co-Author-/Session-Zeilen.
