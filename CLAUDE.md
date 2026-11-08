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
- **Modus "Nacht" optional:** pro Alarmanlage zuschaltbar (`armed_night`),
  standardmässig aus. "Anwesend" und "Abwesend" sind immer da.
- **Veröffentlichung über HACS:** alle Regeln von HACS und hassfest
  einhalten (siehe "HACS").

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
- Deaktivieren per Push-Aktion ist standardmässig aus.
- Jede Änderung am Zustandsautomaten oder an der Szenario-Engine braucht
  Tests für: Deaktivieren während Verzögerung, Neustart während Alarm,
  Sensor fällt im scharfen Zustand aus.

## Regel: Ebenen einer Einstellung

- Eine Einstellung, die sich mehr als global ändern lässt, bekommt alle
  Ebenen zugleich, mit Anzeige der Herkunft, Zurücksetzen, Übersicht der
  eigenen Werte, Sicherung und Wiederherstellung und Tests. Nie nur eine
  oder zwei Ebenen bauen und die anderen später nachreichen.
- Die Ebenen für Alarmageddon sind noch nicht entschieden. Vorschlag:
  global › Alarmanlage › Bereich › Gerät (Wirksam: Gerät > Bereich >
  Alarmanlage > global). Vor der ersten solchen Einstellung mit dem Nutzer
  festlegen.

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
- GitHub: Beschreibung und Topics (`home-assistant`, `hacs`, `integration`,
  `home-assistant-custom`), Issues aktiviert.
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
  "Speichern"; Schliessen mit Änderungen fragt nach.
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
  - Vorabversion: standardmässig **ja**, bis der Nutzer ausdrücklich sagt,
    dass eine Version offiziell wird. Versionsnummern ohne a/b/rc-Suffix;
    der Unterschied liegt nur am Haken "Pre-release". Grund: HACS zeigt
    Vorabversionen nur Nutzern, die sie einschalten.
  - Release Notes auf Englisch und Deutsch, je als Markdown-Codeblock,
    beginnend mit `## X.Y.Z (JJJJ-MM-TT)`. Grundlage:
    `python3 .github/scripts/changelog_section.py X.Y.Z` (Englisch) und
    `python3 .github/scripts/changelog_section.py X.Y.Z de` (Deutsch).
  - **Offizielles Release nach Vorabversionen:** Die Notes fassen alles seit
    dem letzten *offiziellen* Release zusammen, mit dem Satz "Includes the
    changes from X and Y" / "Enthält die Änderungen aus X und Y".
  - **Übersprungene Versionen:** Die Notes fassen alles seit dem letzten
    Release zusammen (Abschnitte zusammengeführt), mit demselben Satz.
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
4. README EN und DE nachführen.
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
- `python -m pytest` (Python 3.13, `pytest-homeassistant-custom-component`)
- Panel-Tests mit HA-Nachbau und Playwright, je Sprache, Desktop und Handy
  (390 × 844), echte Klicks/Taps.

## Commit-Nachrichten

Kurze Betreffzeile mit Version ("0.2.0: …"), Liste der Änderungen, am Ende
die vom System vorgegebenen Co-Author-/Session-Zeilen.
