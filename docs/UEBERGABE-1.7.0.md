# Übergabe 1.7.0 (2026-11-10): "Immer aktiv" und Modus, Punkte, Linien im Ablauf, Gruppierung der Karten

Auftrag des Nutzers an die externe Prüfstelle. **Basis ist jetzt `main` @ `57b509f` (1.6.5):** die erste Fassung dieser
Übergabe stand auf 1.6.4; inzwischen kam 1.6.5 ("eigener Wert ist blau") dazu, die Arbeit ist darauf umgesetzt (dieselbe
Farbänderung in `styles.js`, Wortlaut und Kommentar aus 1.6.5 übernommen; 1.7.0 steht im CHANGELOG über 1.6.5). Dieses Dokument ist die Übergabe
an die nächste Session: zuerst lesen, dann `docs/HANDOVER.md` (Abschnitt 1.7.0), `CLAUDE.md`, `docs/LEARNINGS.md`.

## 0. Inhalt der Übergabe und Anwenden

Das ZIP `alarmageddon-1.7.0.zip` enthält:

| Datei | Zweck |
| --- | --- |
| `UEBERGABE-1.7.0.md` | dieses Protokoll (identisch mit `files/docs/UEBERGABE-1.7.0.md`) |
| `RELEASE-NOTES-1.7.0.md` | Release Notes Englisch (für das GitHub-Release) und Deutsch |
| `1.7.0.patch` | alle Änderungen als ein Patch gegen `main` @ `57b509f` (1.6.5) |
| `files/` | jede geänderte oder neue Datei vollständig, in der Ordnerstruktur des Repositorys |

Anwenden: `git checkout main && git pull` (Stand muss `57b509f` sein), dann `git apply --index 1.7.0.patch`; oder den
Inhalt von `files/` über das Repository kopieren (nichts ist zu löschen). Danach die Prüfungen aus `CLAUDE.md`, Commit
`1.7.0: Immer aktiv und Modus, zwei Abläufe, Punkte, Linien im Ablauf, Gruppierung`, Push auf `main`, Tag und Titel `v1.7.0`.

## 1. Die fünf Aufträge und was daraus wurde

### 1.1 Sensor ist "Immer aktiv" und steht zugleich in der Zone eines Modus: welche Aktionen laufen?

Vorher (1.6.4): Bei scharfer Anlage lief immer nur der Ablauf des Modus (`trigger = mode or "always"`), der Ablauf
"Immer aktiv" nur bei deaktivierter Anlage. Der Schalter "Immer aktiv ignorieren" (Standard aus) betraf nur die Regel
(sofort auslösen oder Regel des Modus), nicht die Aktionen. Für den Nutzer war nicht erkennbar, was gilt.

Jetzt gilt eine Regel für Einstellungen und Aktionen. Sie steht so im Blatt des Sensors und in den Tests
(`tests/test_always_flows.py`, Kopf der Datei):

| Situation | Was gilt |
| --- | --- |
| Anlage deaktiviert | "Immer aktiv": sofort Alarm, Aktionen von "Immer aktiv" |
| Scharf in einem Modus, dessen Zone den Sensor **nicht** enthält | "Immer aktiv": sofort Alarm, Aktionen von "Immer aktiv" |
| Scharf in einem Modus, dessen Zone den Sensor enthält, Schalter **an** (Standard) | nur der Modus: seine Regel (zum Beispiel Eingangsverzögerung) und seine Aktionen |
| Scharf in einem Modus, dessen Zone den Sensor enthält, Schalter **aus** | "Immer aktiv" gilt zusätzlich: sofort Alarm, **beide** Abläufe laufen nebeneinander |
| "Immer aktiv" hat keinen eigenen Ablauf, Anlage scharf | der Ablauf des Modus (im Zweifel alarmieren) |
| Ohne "Einstellungen pro Modus" bei den Aktionen (derselbe Ablauf überall) | der Ablauf läuft einmal, nie doppelt |

Entscheide dazu (vom Nutzer nach Rückfrage mit "Weiter" bestätigt):

1. **Ein Schalter für Regel und Aktionen** (Schlüssel bleibt `always_off`). Name im Blatt: "Scharf in <Modus>: nur <Modus>
   zählt" (ohne "Einstellungen pro Modus": "Scharf: nur der Modus zählt"). Die Erklärung darunter wechselt mit der Stellung
   und sagt, was dann gilt.
2. **Der Standard ist neu "an".** Bestehende Anlagen ohne eigenen Wert ändern damit ihr Verhalten: ein Sensor, der "Immer
   aktiv" ist und in der Zone steht, folgt im scharfen Modus der Regel des Modus. Ein gespeichertes `always_off: true`
   bleibt "an", ein gespeichertes `false` bleibt "aus" und bedeutet jetzt zusätzlich "beide Abläufe".
3. **Ein Sensor, der nur "Immer aktiv" ist, startet bei scharfer Anlage den Ablauf "Immer aktiv"** (vorher den des Modus),
   mit Rückfall auf den Ablauf des Modus, wenn "Immer aktiv" keinen hat.

Der Rahmen "Diese Einstellungen gelten …" steht im Blatt jetzt **immer** (auch ohne "Einstellungen pro Modus") und nennt
genau, wann die gezeigten Einstellungen greifen, zum Beispiel "deaktiviert und scharf in Anwesend und Nacht" mit dem Hinweis
"Scharf in Abwesend gelten stattdessen die Einstellungen und Aktionen des Modus (siehe dessen Reiter)".

### 1.2 Orange Punkte

Regel: **Orange = ungespeichert, Blau = eigener Wert.**

- Orange Punkte stehen am Reiter "Konfiguration", am Unterreiter und neu am Reiter des Modus mit ungespeicherten Änderungen
  (Sensoren, Aktionen, Benachrichtigungen, Anlage); der Balken an einer geänderten Sensorzeile ist orange (vorher blau).
- Das Kästchen mit eigenem Wert (`.ag-box.own`) hatte einen orangen Punkt; er ist jetzt blau wie `.ag-owndot`.
- Beim Speichern verschwinden Punkte und Zeilenmarkierung sofort (`host._markSaved(ui)`), nicht erst, wenn die Anlage neu
  geladen hat; die nächste Änderung bringt sie zurück.

### 1.3 Linien im Ablauf der Aktionen

Ursache der wiederkehrenden Fehler: eine einzige, absolut gelegte Linie hinter allem (`.ag-wf-line::before`), dazu ein
gestricheltes Stück als Pseudo-Element nur über dem Plus. Lage und Farbe hingen von Abständen, Breite und Design ab.

Jetzt zeichnet jede Verbindung ihre Linie selbst, im Fluss der Seite: `<div class="ag-wf-plus"><span class="ag-wf-seg">`
`</span><button class="ag-wf-add">…</button><span class="ag-wf-seg"></span></div>`. Markensymbol, Plus und Linienstücke
sitzen mittig auf einer Achse (`--wf-x`, 34 px, Handy 30 px). Eine Linie kann darum nicht mehr über einem Symbol liegen,
und jede Verbindung hat genau eine Art: durchgezogen grau oder, nach einem Schritt "läuft nebenher", gestrichelt blau
(beide Stücke und das Stück zu "Alarm endet").

### 1.4 Alarmmodi im Blatt

Die Pillen "Alarmmodi" (Anwesend, Abwesend, Nacht, Immer aktiv) sind aus dem Blatt entfernt. Die Zuordnung steht nur noch
in der Tabelle (Kästchen je Modus und Spalte "Immer aktiv", auf Desktop und Handy).

### 1.5 Kartenansicht der Übersicht gruppieren (Nachtrag)

Wunsch des Nutzers: die Karten nach Bereich oder Sensorart gruppieren, wählbar. Die Gruppierung gab es schon (Bereich,
Anlage, keine), aber nur im Fenster "Ansicht" und in den Karten mit einem kaum sichtbaren Titel.

- Neue Gruppierung **Sensorart** (`group: "type"`): Reihenfolge wie im Filter "Alle Arten" (`TYPES`), Titel mit dem Symbol
  der Art. `list.js`: `GROUPS`, `GROUP_LABEL`, `_groups()` liefert `[Titel, Zeilen, Symbol]`.
- **Auswahl in der Werkzeugleiste** (Desktop): `select[data-list="group"]` neben "Liste / Karten" mit "Gruppiert nach
  Bereich / Sensorart / Anlage" und "Nicht gruppiert". Auf dem Handy wie der Umschalter Liste/Karten nur in "Ansicht"
  (dort jetzt vier Möglichkeiten). Gemerkt je Gerät in `alarmageddon_view`, gilt für Liste und Karten.
- **Titel der Gruppe in den Karten** (`.ag-group-head`): Name, Anzahl, Linie, über die ganze Breite des Rasters.
- Tests: `cards-e2e.mjs` (30 neue Prüfungen: Auswahl, Reihenfolge, Anzahl je Gruppe, Breite, gemerkt, Liste, keine, Bereich).

## 2. Geänderte Dateien

Backend (`custom_components/alarmageddon/`):

- `controller.py`: `alarm_flows`, `own_option`, `only_mode`, `always_ignored` (neuer Standard), `_flows_for`, `alarm_plan`;
  `_on_sensor`, `async_trigger`, Scharfschalten und Deaktivieren setzen bzw. leeren die Abläufe; `restore_data` und
  `async_restore` tragen sie über einen Neustart.
- `workflow.py`: zweiter Ablauf (`run["also"]`, `_also`, `_state`, `_positions`, `_also_task`, ContextVar `_LANE`), `_spawn`
  und `_on_flow_done` je Ablauf, `_execute` und `_remaining` rechnen mit dem Stand ihres Ablaufs, `_take_tasks` bricht beide
  ab, `async_start` setzt beide fort, `_check_started` startet im Notfall beide.
- `notify.py`: Hauptablauf aus `alarm_plan()`; die Standardmeldung entfällt, sobald einer der laufenden Abläufe einen
  Push-Schritt hat; die Knöpfe der Alarmmeldung gelten über alle laufenden Abläufe.
- `const.py`: `PANEL_VERSION` 85, Kommentar zu `OPT_ALWAYS_OFF`. `manifest.json`: 1.7.0.

Panel (`custom_components/alarmageddon/panel/`):

- `sensors.js`: Blatt ohne Pillen, `_scopeBanner`, Schalter mit Name und Erklärung je Stellung, `eff()` und `setOption()`
  kennen den Standard "an", `dirtyTabs()`.
- `actions.js`, `notify.js`, `system.js`: `dirtyTabs()`, Aufruf `_markSaved` nach dem Speichern; `actions.js` zusätzlich die
  Verbindungen mit Linienstücken und `.ag-wf-end.par`.
- `alarmageddon-panel.js`: `_renderDots` (Unterreiter und Reiter der Modi), `_draftSig`, `_markSaved`, `_isSaved`.
- `styles.js`: Achse `--wf-x`, `.ag-wf-seg`, keine absolut gelegten Linien; Farben der Punkte; `.ag-pmnote`.
- `list.js`: Gruppierung nach Sensorart, Auswahl in der Werkzeugleiste, Titel der Gruppen in den Karten.
- `strings.js`: neue Texte `optOnlyMode*`, `scope*`, `listAnd`, `originDefaultOn`, `groupType`, `grouped*`; entfernt `senModes`, `senModesHint`,
  `optAlwaysOff`, `optAlwaysOffHint`, `optAlwaysOffNotHere`.

Tests und Werkzeuge:

- neu `tests/test_always_flows.py` (16 Fälle): die Tabelle aus 1.1, beide Abläufe nebeneinander mit eigener Dauer, Neuladen
  mit Restzeit, hängender Schritt in einem Ablauf, Abbruch des zweiten Ablaufs, Meldungen bei zwei Abläufen, Neustart.
- `tests/test_always_active.py`: drei Tests auf den neuen Standard umgestellt, einer neu.
- Panel-Suiten: `always-e2e.mjs` (Blatt neu geprüft), `layout-e2e.mjs`, `actions-e2e.mjs`, `ack-e2e.mjs` (Linien an der
  neuen Struktur gemessen), `review-e2e.mjs` (neu: Punkte orange und blau, sofort weg beim Speichern), `cards-e2e.mjs` (Gruppierung).
- `scripts/mutation_check.py`: sechs neue Schutzmassnahmen, drei Muster nachgeführt (51 insgesamt).

Dokumentation: `CHANGELOG.md`, `CHANGELOG.de.md` (1.7.0 mit Fussnote), `README.md`, `README.de.md` (Zeile "Immer aktiv"),
`docs/HANDOVER.md` (Abschnitt 1.7.0), diese Datei.

## 3. Prüfungen

| Prüfung | Ergebnis |
| --- | --- |
| `python -m pyflakes custom_components/alarmageddon/*.py tests/*.py scripts/*.py` | ohne Befund |
| `python -m pytest` (Python 3.13, HA 2026.2.3) | 554 bestanden (vorher 537; 17 neue) |
| `python scripts/mutation_check.py` | 51 von 51 erkannt (50 im Gesamtlauf, das nachgeführte Muster danach einzeln geprüft) |
| Panel-Suiten (Playwright, Desktop und Handy, EN und DE) | alle 17 Suiten bestanden |
| Sichtprüfung | Ablauf (Handy, dunkel) und Sensor-Blatt als Bildschirmfoto angesehen |
| Patch auf frischem Checkout von `57b509f` (1.6.5) | wendet sauber an, ergibt denselben Stand, Tests dort ebenfalls grün |

Nicht geprüft: echtes Home Assistant mit echten Geräten.

## 4. Hinweise für die nächste Session

- **Zeitachse des Alarms:** Die Schritte beider Abläufe stehen gemischt in der Aufzeichnung, ohne Angabe, zu welchem Ablauf
  ein Schritt gehört. Bei Bedarf `flow` in den Eintrag `step` aufnehmen (`workflow._record`) und im Panel anzeigen.
- **Test der Aktionen** (Knopf "Test") führt immer nur den offenen Ablauf aus, nie beide.
- **README-Bilder** (`docs/img/`) zeigen das Blatt des Sensors nicht; sie müssen wegen dieser Version nicht neu erzeugt werden.
- **`_renderDots`** setzt `has-edit` an den Leisten der Modi nur über deren `data-seg` (sen-mode, wf-trigger, nt-mode,
  sys-scope). Eine neue Seite mit Reitern je Modus braucht dort ihren Namen und eine Methode `dirtyTabs()`.
- **Tests mit zwei Abläufen:** nach dem Auslösen `settle()` aufrufen, bevor die Uhr vorgestellt wird (die Abläufe brauchen
  einige Durchläufe der Ereignisschleife bis zum Schritt "Warten"); mit hängenden Diensten nie `async_block_till_done()`.
- **Regel für neue Schritte und Abläufe** unverändert: jeder Ablauf steht unter dem Wächter; `tests/test_action_hang.py`,
  `tests/test_duration.py` und die Mutationsprobe sichern das.
