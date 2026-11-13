# Übergabe: Stand und nächste Schritte

Einstieg für jede neue Claude-Code-Session. Zuerst diese Datei lesen, dann
`CLAUDE.md`, `docs/CONCEPT.md`, `docs/LEARNINGS.md`, `docs/DESIGN.md`.

- 0.13.0: `controller.record(kind, **data)` (nur für die Aufzeichnung, nicht ins Ereignisprotokoll) wird von `workflow._record` (Schritt gestartet) und `Notifier._send` (Meldung) gerufen; Einträge `step` und `notified` entfallen nie wegen der Grenze.

- 1.6.5: Orange Punkte nur für Ungespeichertes (Regel in CLAUDE.md): `.ag-box.own::after` ist blau (primary). Test in `layout-e2e.mjs`.
- 1.6.4: Blatt auf dem Handy (`dialog.ag-sheetdlg` narrow): `padding-bottom: 0`, die Leiste bringt die Safe-Area selbst mit. Im Nachbau ist die Safe-Area 0, der Test prüft nur das Padding.
- 1.6.3: Sensor-Blatt mit Einstellungen pro Modus: `sensors.js sheetMode(id)` zeigt für einen nur "Immer aktiv"-Sensor ausserhalb der Zone des Reiters den Bereich "always". Test in `always-e2e.mjs`.
- 1.6.2: Sensor-Blatt: Abschnitt "Alarmmodi" mit Pille "Immer aktiv" (`sensors.js sideHtml`, `alwaysChip`), Schalter `always_off` direkt darunter (`offBlock`), Zeile "Immer aktiv" aus der Liste entfernt. Test in `always-e2e.mjs`.
- 1.6.1: Übersicht: der letzte feste Teil (`.ag-ov-tools`) behält den Innenabstand (`ag-stk-last` nicht gesetzt in der Übersicht), damit der Abstand zum Tabellenkopf beim Scrollen bleibt (`_stickySync`). Test in `list-e2e.mjs`.
- 1.6.0 (1.5.0 getaggt auf 918adfb): "Immer aktiv" als Ganzes abschaltbar (`always_enabled`, `controller.always_enabled`/`always_sensors`, Panel: Pille in Anlage › Modi, Reiter/Spalte/Option ausgeblendet); `ws_save_workflows` behält Abläufe fehlender Auslöser. Tests in `test_always_active.py`, `always-e2e.mjs`.
- 1.5.0 (1.4.0 übersprungen, nie getaggt): Empfänger je Meldungsart: `types[kind].targets` und `modes[mode][kind].targets` (leer = Standard), `notify._targets(kind, mode)`, Wartung gruppiert je Empfänger (`maintenance.py`), Panel `notify.js _typeRecipients` (Dropdown, Pillen, Herkunft, Zurücksetzen; letzter Empfänger bleibt). Tests `test_type_targets.py`, `targets-e2e.mjs`, 3 Mutationszeilen.
- 1.4.0 (1.3.0 getaggt auf 5c3be2d): "Immer aktiv" gilt in jedem Zustand mit den Optionen aus dem Reiter "Immer aktiv" (`controller._on_sensor`, `always_ignored`), beide Regeln laufen, Schalter `always_off` (`OPT_ALWAYS_OFF`, keine Voreinstellung, bleibt bei "Auf alle Sensoren anwenden"); "Aktionen übernehmen von …" in der Fusszeile der Aktionen (`actions.js _copyFrom`). Tests `test_always_active.py`, `copy-e2e.mjs`.
- 1.3.0 (1.2.0 übersprungen, nie getaggt): Knopf "Quittieren" im Alarm-Band des Panels (`_ack`, WS `alarmageddon/acknowledge`, nur bei laufendem Alarm), Push-Knopf standardmässig an (`acknowledge_action: True`).
- 1.2.0 (1.1.0 übersprungen, nie getaggt): Alarm quittieren: `controller.acknowledge` (nur im Zustand ausgelöst, bleibt scharf, Ereignis `acknowledged` vor dem Zustandswechsel), Schritt `acknowledge` (`workflow._step`, nicht im Test), Push-Knopf `acknowledge` (`PUSH_ACTION_ACK`, `acknowledge_action` standardmässig aus), Aufzeichnung `reason: acknowledged`, Meldung `ended_ack`. Tests `test_acknowledge.py`, `ack-e2e.mjs`, 3 Mutationszeilen.
- 1.1.0 (1.0.1 übersprungen, nie getaggt): Eingangsverzögerung pro Sensor (`controller.sensor_entry_delay`, `schemas.SENSOR_VALUES`, Option `entry_delay` in `sensor_options`/`sensor_modes`, Blatt `sensors.js _delayRow`, bleibt bei "Auf alle Sensoren anwenden"); eigene Empfänger je Push-Schritt und bei "Alarm endet" (`targets`, `notify._alarm_recipients`, `actions.js _ntRecipients`); Emoji in allen Standardtiteln (Test `test_every_default_title_starts_with_an_emoji`). In 1.2.0 umgesetzt.
- 1.0.1: Kopfzeile (`.ag-headsys`, `_fillHeadSys`) in jedem Reiter; `.ag-sen-layout.open` mit `minmax(420px, 1fr)` und rechtsbündigem Blatt; Sortierschlüssel `state` mit Rang und Text (`_stateLabel`); Pfeil der Auswahlfelder als SVG; Abstand der Leiste `.ag-pmstick` als Innenabstand.

## Code-Review (2026-11-13, auf dem Stand 1.33.0, geliefert als 1.33.1; die Korrekturen stehen im Abschnitt 1.33.1 des CHANGELOG)

Auftrag des Nutzers: alle Zeilen lesen (Python und Panel, nicht nur die Hauptpfade), Logik, Konsistenz, Sicherheit, Ausfallsicherheit,
Leichen, Leistung; was keine Wirkung auf Oberfläche oder Verhalten hat, sofort beheben, alles andere vorher fragen.

- **Behoben (mit Tests und Zeilen in der Mutationsprobe):** wartende Zeitgeber nach einem direkten Zustandswechsel
  (`controller._timer_spent`, `tests/test_stale_timers.py`); Mitschreiben vor der Alarmlogik gekapselt (`_on_sensor`,
  `tests/test_sensor_bookkeeping.py`); Start und Entladen mit `_isolated` (`__init__.py`); beschädigte Codes (`code.verify_code`,
  `controller._candidates`, `ws_add_code`); Löschen prüft nach der Sicherung noch einmal; Platzhalter in einem Durchgang
  (`notify.PLACEHOLDER`, Panel `_ntPreview`); Standardwerte der Schemas als Fabrik; Statistik mit Sperre beim Start
  (`sensor_history.DATA_STATS_LOCK`); Code-Felder werden beim Schliessen eines Fensters geleert; CSV mit Tabulator und
  Zeilenumbruch; tote Konstanten, Methoden, Stilregeln und Texte entfernt; `tests/test_workflow_failsafes.py` sichert die Zweige
  des Ablaufs, die nur bei einem Fehler laufen (Abdeckung `workflow.py` 91 % auf 94 %). Die Mutationsprobe meldet nun auch
  mehrdeutige Muster ("MEHRDEUTIG").
- **Geprüft, keine Leichen mehr:** Python (AST-Skript: nur Hooks von HA ohne Verweis), Panel (ESLint `no-unused-vars` ohne Funde,
  CSS-Klassen, IDs und Attribute, Texte mit Vorbehalt der aus Teilen gebildeten Schlüssel).
- **Beobachtungen ohne Änderung (Stand 2026-11-13):** `ws_add_code` antwortet "code_taken" ohne Sperre (nur Administratoren, die
  Ablage mit Hash und Salz liegt ihnen ohnehin offen); `last_changes` in den Einstellungen wächst mit den Sensoren, die je
  beobachtet wurden (ein Eintrag je Sensor, klein); der Abruf `alarmageddon/data` alle 30 Sekunden ist gross, aber klein genug.
- **Entscheide des Nutzers (2026-11-13), umgesetzt in 1.33.1:** leere Seite sofort nach dem Löschen der letzten Anlage
  (`_deleted` in `_fetch`/`_deleteSystem`); Anlagen-Auswahl in der Kopfzeile über `_setHtml` (`_fillHeadSys`); Empfängerlisten der
  Gruppen nur auf den Namen prüfen, ohne Obergrenze (`settings.NOTIFY_NAME`). Der Endpunkt `/alarmageddon_loop/...` bleibt bewusst
  wie er ist (ohne Anmeldung, rechnet jede verlangte Länge): erst absichern, wenn HA aus dem Internet erreichbar ist.
- **Tests der Aktionen (1.33.1):** `ws_test_workflow` beendet einen laufenden Test (`runner.async_stop`) und startet den neuen; nur ein echter Alarm
  gibt "busy". Panel: `actions.js _alarmBlocks()` sperrt die Play-Knöpfe nur bei einem echten Alarm.
- **Bekannt, nicht geändert:** die Seite Konfiguration › Anlage zeichnet sich bei einem Zustandswechsel nicht neu; der Knopf "Anlage
  löschen" wird erst frei, wenn die Seite neu aufgebaut wird (Reiterwechsel).

## Dashboard-Karten (1.34.0, Lernstand 2026-11-13)

Ausführlich, auch als Vorlage für Device Panel: `docs/INFO-DASHBOARD-KARTEN-DEVICE-PANEL.md`. Kurz:

- Karten kommen als ES-Modul `panel/card.js` mit der Integration; `frontend.add_extra_js_url` (Modul, nicht es5) bindet sie beim Laden
  der Seite ein, `window.customCards` bringt sie in den Auswahldialog. Nach einem Update braucht es einen Neustart von HA und ein
  Neuladen der Oberfläche (App: "Frontend-Cache zurücksetzen"); der Nutzer sah die Karte zuerst nicht, danach ging sie, die Ursache ist nicht bestätigt.
- Karten nutzen nur Entitäten und Dienste von HA, nie die WebSocket-Befehle des Panels (die sind nur für Administratoren). Was Nutzer
  ohne Recht dürfen sollen, braucht einen Dienst: `alarmageddon.acknowledge`, Einstellung `code_ack_required`; Daten der Status-Karte
  liefert `sensor.<anlage>_status`.
- Tests: `tests/test_dashboard_card.py`, `tests/panel/sim/card-sim.html`, `tests/panel/suites/card-e2e.mjs`, 6 Zeilen in der Mutationsprobe.
- **Offen:** das Aussehen im echten dunklen Dashboard (`dark` kommt seit 1.34.1 aus `hass.themes.darkMode`) und das Aussehen der Karten auf dem Handy in der Companion App sind nicht gegen ein echtes Home Assistant geprüft.

## Stand (1.34.1: Karten tragen das Attribut `dark` aus `hass.themes.darkMode`, Hinweis zu fehlenden Karten in der README; 1.34.0: Dashboard-Karten `alarmageddon-card` (Bedienteil) und `alarmageddon-status-card` (Info-Kachel) in `panel/card.js`, von `panel._register_cards` per `frontend.add_extra_js_url` registriert; Dienst `alarmageddon.acknowledge` (Entitätsdienst, jede Person, Code nur mit Option `code_ack_required`, Fehler `not_triggered`), Status-Entität `sensor.<anlage>_status` (`sensor.py`), Einstellung "Quittieren verlangt den Code" in Konfiguration › Anlage; Suite `card-e2e.mjs`, Nachbau `sim/card-sim.html`, `tests/test_dashboard_card.py`; 1.33.1: Code-Review (Abschnitt oben), keine Funktion neu; 1.33.0: Wiederherstellen mit freier Wahl des Ziels je Anlage der Sicherung (WS import mit mapping und restore_settings, systems.py, RestoreError; Panel: Karte je Anlage, Schalter für gemeinsame Einstellungen; Löschwarnung angepasst; Suite restoremap-e2e); 1.32.0: Anlage löschen (Kapitel unten in Konfiguration › Anlage, roter Textknopf, Warn-Dialog; Befehl delete_system: nur deaktiviert, genauer Name, optionale Sicherung vorher; kein Code verlangt, Entscheid des Nutzers 2026-11-13; Suite deletesystem-e2e); 1.31.0: Dialog "Anlage hinzufügen" im Panel (Knopf in der Kopfzeile, Desktop mit Text, Handy rundes Plus; Befehle create_system und preview_system, nur Name, Vorschau der Entitäts-ID vom Server, danach Konfiguration › Sensoren der neuen Anlage; Suite addsystem-e2e); 1.30.0: Knopf "+ Alarmanlage" aus der Kopfzeile entfernt (Desktop; "Integration in HA öffnen" bleibt, leere Seite behält ihren Knopf); 1.29.0: Sensorkarten der Übersicht immer gleich hoch (Name drei Zeilen mit "…", feste Zeilen, fehlende Angaben "–"; Suite cardheight-e2e, Sim-Parameter longnames); 1.28.0: Platzhalter {type}, {area}, {alarm} für Push-Texte (Schritt Push-Meldung und "Alarm endet"), Standardtexte je Alarmart für Rauch/Wasser/Gas/Hitze (notify.py ALARM_KINDS, devices.sensor_info; Panel actions.js ALARM_KINDS, ein Test hält beide gleich), "Alarm endet" merkt sich den auslösenden Sensor; Stufe 3 (Texte je Sensorart als eigene Einstellungsebene) bewusst nicht gebaut; 1.27.0: Aktionen beim Deaktivieren (Kapitel "Beim Deaktivieren", Schritt dechime, fünf Deaktivierungstöne), HomeKit-Ausgangsverzögerung bleibt wie sie ist (Entscheid des Nutzers, 2026-11-12); 1.26.0 (übersprungen): Töne stellen den Lautsprecher danach zurück (Standard an, je Schritt abschaltbar); 1.25.1 (übersprungen): Aktionen der Push-Meldung einheitlich benannt; 1.25.0: Easter Egg mit dickem 3D-Abzeichen (Ebenen, Licht folgt der Drehung); 1.24.0 (übersprungen): Ziehen mit Mitscrollen, Ziel auch auf einer Aktion, rote Zielliste; 1.23.0: Symbole in allen Auswahlknöpfen der Ansicht; 1.22.0 (übersprungen): Schritte per Ziehen zwischen den Listen; 1.21.0 (übersprungen): Ladeanimation ignoriert "Bewegung reduzieren"; Ladeanimation ignoriert "Bewegung reduzieren"; 1.20.0: Easter Egg, Dreifachklick aufs Logo zeigt die Version, ignoriert "Bewegung reduzieren"; 1.19.0: Aktionen während Ausgangs- und Eingangsverzögerung, Panel mit zwei Kapiteln und Schalter "Solange die Verzögerung läuft"; 1.18.1 Testknopf; 1.18.0 Push-Knöpfe)

Ausführlich: `docs/UEBERGABE-1.17.0.md`.

- **Ursache des abgehackten Klangs:** `_play` startete die kurze Datei alle 1 bis 4 Sekunden neu (`play_media` je Wiederholung). Jeder Neustart hat auf dem Lautsprecher eine Verzögerung und schneidet den laufenden Ton ab.
- **Jetzt:** `sound_loop.py` liefert unter `/alarmageddon_loop/<Millisekunden>/<Ton>.wav` eine WAV in der verlangten Länge: die mitgelieferte Wiederholung nahtlos vervielfacht, 30 ms ein- und 60 ms ausgeblendet. Ohne Anmeldung (wie die Tondateien und die Sprachausgabe von Home Assistant), nur bekannte Töne, höchstens `LOOP_MAX_SECONDS` (180 s, rund 8 MB), kleiner Zwischenspeicher für mehrere Lautsprecher. `_play` und `_play_whole` starten den Lautsprecher einmal je Stück (`loop_url`).
- **Tondateien:** jede Datei unter `sounds/` ist eine Wiederholung, die nahtlos an sich selbst anschliesst (Töne mit Pause enden in Stille; Sirene, Zweiton, Jaulton ohne Rampen und mit ganzer Zahl Schwingungen). **Regel für neue Töne:** so erzeugen, `tests/test_sound_loop.py` prüft Nahtstellen und Blenden. Bei durchgehenden Tönen die Phase ausrechnen, nicht aufsummieren (der Jaulton knackte sonst an der Naht).
- **Vorschau im Panel** spielt weiterhin die einzelne Wiederholung.
- Tests: `tests/test_sound_loop.py` (28); `test_actions.py`, `test_tones.py` angepasst (ein Start statt vieler); Mutationsprobe 3 neue Massnahmen.

## Stand (1.16.0, Lautstärke je Medienplayer; Scheinänderungen und langes Drehen beim Speichern behoben)

Ausführlich: `docs/UEBERGABE-1.16.0.md`.

- **Scheinänderungen (Fehler bis 1.15.0):** Der Server legt Schritte mit ergänzten Vorgaben und in anderer Feldfolge ab. Das Panel verglich Entwurf und Serverstand als Text; nach dem nächsten `_fetch` (nach Speichern, Test, Zeitgeber) galt der Ablauf als geändert. Jetzt: `actions.js` `canon()` vergleicht, was das Panel aus beiden Seiten selbst schreiben würde (`toStep(fromStep(step))`, Felder sortiert), `canonEnd()` für die Meldung am Ende. **Regel:** Entwurf und Serverstand nie als rohen Text vergleichen.
- **Warten auf das Neuladen:** `save_zones`, `save_system`, `save_workflows` antworten mit `"reload": bool` (Rückgabe von `async_update_entry`). Das Panel ruft `_reloadWait` nur bei `reload !== false`, sonst `_fetch()`.
- **Nachbau:** `save_workflows` normiert wie der Server (Vorgaben, Feldfolge) und lädt nur bei einer Änderung neu; damit fällt diese Fehlerklasse im Test auf (`savewait-e2e.mjs`; mit dem alten Vergleich scheitern 16 Prüfungen).
- **Lautstärke je Medienplayer:** Schritte `sound`, `prealarm`, `chime` kennen `volumes: {media_player: 0..1}` (nur für Lautsprecher des Schritts, `schemas.valid_step`); `workflow._set_volumes` setzt je Wert einen Aufruf, sonst gilt `volume`. Panel: Schalter `data-wf="pervol"`, Regler `data-wf="pvol"`; `ownVolumes(f)` schreibt `volumes` nur, wenn sich die Werte unterscheiden.
- Tests: `tests/test_save_reload.py` (9), Panel `savewait-e2e.mjs` (48); Mutationsprobe 2 neue Massnahmen.

## Stand (1.15.0, drei Arten von Tönen: Alarmton, Voralarm, Aktivierungston)

Ausführlich: `docs/UEBERGABE-1.15.0.md`.

- **Begriffe (Vorgabe des Nutzers, stringent halten):** "Alarmton" (Schritt `sound`), "Voralarm" (Schritt `prealarm`), "Aktivierungston" (Schritt `chime`). Der Knopf der Push-Meldung heisst "Alarmton stumm" (`notify.TEXTS["action_silence"]`), nie "Sirene": nur der Alarmton ist der Ton des Alarms. "Sirene" bleibt der Name eines Klangs und eines Geräts.
- **Klänge:** `const.SOUNDS` (Alarmton), `PREALARMS`, `CHIMES`, zusammen `ALL_SOUNDS`; Dateien unter `sounds/`, erzeugt von `scripts/make_sounds.py` (neuer Klang: dort ergänzen, in die passende Liste eintragen, Text `snd…` in `strings.js` und `SOUND_KEY` in `actions.js`). Der Server nimmt je Tonschritt jeden bekannten Klang an (ältere Wahl bleibt gültig); das Panel bietet je Art nur die eigenen an (`TONE_LIST`).
- **Voralarm:** läuft über `_play` als Schleife mit Dauer; ohne `wait` wartet der Ablauf auf ihn (`step_waits`). Nur im Ablauf des Alarms (nicht beim Scharfschalten, nicht nach dem Quittieren). `async_stop` stoppt auch seine Lautsprecher.
- **Aktivierungston:** `_play_whole` spielt nur ganze Wiederholungen (mindestens eine), nach der Uhr.
- Tests: `tests/test_tones.py` (30), Panel `armed-e2e.mjs` erweitert (84); jede neue Schrittart braucht ein Beispiel in `test_action_hang.py`.

## Stand (1.14.0, Aktionen beim Scharfschalten, Aktivierungston; Schrift auf dem Handy)

Ausführlich: `docs/UEBERGABE-1.14.0.md`.

- **Drei Abschnitte im Ablauf:** "Anlage scharf geschaltet" (`workflows_armed`, je Modus, nie für "Immer aktiv"), "Alarm beginnt" (`workflows`), "Alarm endet (quittiert)" (`workflow_end` für die Meldung, `workflows_after` für die Aktionen danach).
- **Server:** `CONF_WORKFLOWS_ARMED`, `ARMED_STEP_TYPES`, `schemas.valid_armed_step`. `WorkflowRunner._on_change` startet `async_run_armed(mode)`, wenn der Zustand scharf wird und der vorige weder leer (Start von HA), noch Eingangsverzögerung, noch Alarm war (quittierter Alarm: Zweig davor). Der Lauf trägt `"after": True` und `"phase": "armed"` (gleiche Mechanik wie nach dem Quittieren: Aufsicht, endet von selbst, stellt nichts zurück, ein Alarm übernimmt). Deaktivieren beendet ihn über `_stop_side_run` (bricht ab und stoppt die Lautsprecher).
- **Aktivierungston:** Schrittart `"chime"` (`players`, `sound` Standard "beep", `volume`, `duration` 1 bis `CHIME_MAX_SECONDS`, `wait`). Spielt über `_play` wie der Alarmton, immer mit Dauer. Ohne `wait` läuft er weiter (keine ältere Regel für diese Art). Hat ein Beispiel in `test_action_hang.py` (Pflicht für jede neue Schrittart).
- **Panel `actions.js`:** dritte Liste `.ag-wf-armed` (`data-zone="armed"`, `_armedHtml`, `ZONE_KEY`/`ZONE_CLASS`); Schrittart `chime` (Symbol `tone`) teilt die Felder des Alarmtons (`isTone`), ohne "bis zum Deaktivieren" und ohne "Rückgängig". Auswahl je Liste: `ARMED_KINDS`, `AFTER_KINDS`, beim Alarm alles ausser `chime`.
- **Feste Punkte:** `.ag-wf-start` mit 36 px Symbol und 16 px fetter Schrift (`.ag-mini.arm`, `.alarm`, `.ok`).
- **Schrift:** `:host { text-size-adjust: 100% }` (die Automatik von iOS vergrösserte Textblöcke uneinheitlich). Handy: Beschreibungen 14.5 px über eine Liste von Klassen am Ende von `styles.js`; eine neue Beschreibungsklasse dort eintragen.
- Tests: `tests/test_armed_actions.py` (11), Panel `armed-e2e.mjs` (64), `after-e2e.mjs` angepasst; Mutationsprobe 4 neue Massnahmen.

## Stand (1.13.0, Protokoll mit zwei Reitern; ein Jahr Aufbewahrung; Alarm löschen)

Ausführlich: `docs/UEBERGABE-1.13.0.md`.

- **Aufbewahrung:** `KEEP_DAYS` = 365 für Ereignisse (`events.EventLog._prune`) und Alarme (`recording.AlarmRecorder._prune`, ein laufender bleibt immer); verworfen wird beim Hinzufügen und beim Laden. `EVENTS_KEEP` (5000) und `RECORDINGS_KEEP` (200) sind nur noch Obergrenzen. Zeiten sind ISO in UTC und werden als Text verglichen.
- **Löschen:** `AlarmRecorder.async_delete(id)` ("ok", "not_found", "running") erhöht `rev` und speichert. Befehl `alarmageddon/delete_recording` mit `entry_id` und `recording` (nicht `id`: das ist im WebSocket die Nummer der Nachricht), nur Administratoren, in `COMMANDS` von `tests/test_security.py`.
- **Panel `log.js`:** `this.pane` ("alarms" oder "events"); die Reiter `.ag-log-seg` stehen in `.ag-log-panes` (seit 1.13.3 als zweite Zeile `.ag-cfg` über `.ag-log-tools`; Felder in `.ag-log-fields`, nur diese zeichnet `renderTools` neu). Beide Listen stehen im Dokument, die nicht gewählte ist `hidden` (aufgeklappte Alarme und Filter bleiben beim Wechsel). `shownAlarms`/`shownEvents` mit Knopf `data-log="more"`. Löschen: `deleteAlarm` über `host._confirm`, Knopf `data-log="delete"` in `.ag-inc-foot` (nicht beim laufenden Alarm).
- **Nachbau:** `window.__moreRecordings`, `window.__deleted`, `window.__failDelete`.
- **Verworfen (Entscheid des Nutzers, 2026-11-11):** Symbole in den Auswahlen "Arten" und "Bereiche" der Übersicht werden nicht gebaut. Befund dazu in `docs/UEBERGABE-1.13.0.md`, Abschnitt 4.
- **README bei jeder Lieferung (Vorgabe des Nutzers, 2026-11-11):** Text und Bilder gehören zu jeder Übergabe; nach sichtbaren Änderungen die Bilder neu erzeugen (`tests/panel/readme-shots.mjs`, `scripts/optimize_images.py`). In 1.13.1 bis 1.13.3 fehlte das zunächst und wurde in 1.13.3 nachgeholt (alle Bilder neu).
- **1.13.3:** Gleicher Aufbau überall: Hauptreiter, darunter an derselben Stelle die zweite Zeile `.ag-cfg` mit `.ag-subs`. Im Protokoll stehen dort die Reiter "Alarme" und "Alle Ereignisse" (`log.html`: `.ag-cfg.ag-head.ag-log-panes` vor `.ag-log-tools`; `_stickySync` erfasst sie über `.ag-cfg`). Symbole auf jeder Ebene und jedem Gerät, links vom Text (Konfiguration: `sensor`, `power`, `bell`, `shield`; Protokoll: `alert`, `history`). Handy: `.ag-subs` mit Breiten nach Inhalt. Regel: ein neuer Reiter bekommt immer ein Symbol.
- **1.13.2:** Ladeanzeige des Panels (`loader.js`, `.ag-ld`) auch in der Sensoransicht (`sensorview.js` `_loader`, in `.ag-sv-chart`; `data-busy` an `.ag-sv` dimmt alte Kennzahlen, Grafik und Liste; erstes Laden in `.ag-sv-wait`) und beim ersten Laden des Protokolls (`.ag-log-wait`). Regel aus `loader.js` gilt überall: nie ein Text "Lädt …". Nachbau: `window.__delay = { "<Befehl>": ms }` verzögert Antworten. Suite `loader-e2e.mjs` (44).
- **1.13.1:** Die Hauptreiter (Übersicht, Protokoll, Konfiguration) tragen ihr Symbol auch am Computer, links vom Text (`_render` gibt die Symbole immer mit; CSS `:host(:not([narrow])) .ag-tabs`).
- Tests: `tests/test_retention.py` (5), Panel `logtabs-e2e.mjs` (68), `log-e2e.mjs` angepasst; Mutationsprobe 3 neue Massnahmen.

## Stand (1.12.0, Namen der Sensoren wählbar: "Gerät - Sensor" oder nur der Sensor)

Ausführlich: `docs/UEBERGABE-1.12.0.md`.

- **Einstellung** `names_with_device` (Standard an) in `Settings` (global, Ablage `alarmageddon.settings`, in der Sicherung unter `settings`). Befehl `alarmageddon/save_display` (nur Administratoren, steht in `COMMANDS` von `tests/test_security.py`); die Daten des Panels tragen `display.names_with_device`.
- **Regel** `devices.display_name` (ersetzt die aus 1.11.0): an = `Gerät` + `NAME_SEPARATOR` (" - ") + eigener Name der Entität (`reg.name`, sonst `original_name`); aus = nur der eigene Name. Gerätename schon im eigenen Namen enthalten: nicht doppelt. Hauptentität ohne eigenen Namen: Name des Geräts. Ohne Registry oder `has_entity_name` aus: Anzeigename von HA, in beiden Fällen. Die Funktion liest die Einstellung synchron aus `hass.data[DATA_SETTINGS]` (ohne geladene Einstellungen: an).
- **Panel:** Schalter im Dialog "Ansicht" (`list.js` `_namesHtml`, `_setNames`, `data-list="names"`): speichert sofort auf dem Server und lädt die Daten neu (die Namen kommen vom Server, `host._name`). Der Hinweis darunter sagt, dass die Wahl überall und auf allen Geräten gilt (der Rest der Ansicht gilt je Gerät).
- **Nachbau:** `window.__deviceNames` gibt einem Sensor Gerät und eigenen Namen, `window.__namesWithDevice` ist die Einstellung, `window.__failDisplay` lässt das Speichern scheitern.
- Tests: `tests/test_display_name.py` (neu geschrieben, 13), Panel `names-e2e.mjs` (44); Mutationsprobe 3 Massnahmen für die Namen.

## Stand (1.11.0, Alarm im Rot der scharfen Anlage; Kachel nennt Auslöser und wer scharf schaltete; Protokoll)

Ausführlich: `docs/UEBERGABE-1.11.0.md`.

- **Namen (Korrektur zu 1.10.2):** `devices.display_name` gibt den eigenen Namen der Entität nur dann allein zurück, wenn der Nutzer ihn selbst vergeben hat (`reg.name`). Mit dem Namen der Integration (`original_name`, "Bewegung") bleibt der Anzeigename von HA (Gerät davor): sonst hiessen alle gleichartigen Sensoren gleich. Hauptentität ohne Namen: Name des Geräts.
- **`armed_at` / `armed_by`:** im Automaten (`controller._go_armed` setzt sie beim Scharfschalten, nicht aus dem Alarm heraus und nicht beim Wiederherstellen, `_restoring`), in `restore_data` und als Attribute der Entität. Deaktivieren löscht sie.
- **Kachel im Alarm** (`_sysCard`): erste Zeile "seit …" und der Auslöser (`triggered_by`), zweite Zeile `.ag-sys-armed` "<Modus> scharf seit … · <Name>"; Klasse `ag-armed ag-alarmed`. Die Signatur für das Neuzeichnen enthält `armed_at`/`armed_by`.
- **Alarmband** `.ag-alarm`: Verlauf und roter Rand wie die scharfe Kachel, im dunklen Design aus Fehlerfarbe und Kartenfarbe gemischt; `margin-bottom` als Abstand zur Kachel.
- **Protokoll:** `.ag-seq-item::before/::after` sind die Linienstücke über und unter dem Symbol (die durchgehende Linie `.ag-seq::before` ist entfernt); `LogUi._poll` lädt bei laufendem Alarm (`_running`) jede Sekunde; Datumsfelder in `.ag-ldates` (Handy: eigene Zeile, gleich breit).
- **README-Bilder:** `tests/panel/readme-shots.mjs` erzeugt zusätzlich `sensor-<sprache>.png` und `alarm-<sprache>.png`; der Ablauf darin nutzt die Form seit 1.10.0 (`wait: false`) und zeigt eine Aktion nach dem Quittieren.
- Tests: `tests/test_armed_since.py` (3), `tests/test_display_name.py` (erweitert), Panel `alarmview-e2e.mjs`; Mutationsprobe 2 neue Massnahmen.

## Stand (1.10.2, ein Name für jeden Sensor)

`devices.display_name(hass, entity_id)`: eigener Name der Entität (Registry-Name, sonst Originalname), ohne den Namen des Geräts; Hauptentität: Name des Geräts (`name_by_user` vor `name`); ohne Registry-Eintrag oder mit `has_entity_name` aus: Anzeigename von HA. Benutzt von `websocket_api._sensor_info` (`name`, neu `device_name`), `controller._name`, `notify._name`, `maintenance._name`. Panel `_name()` nimmt zuerst den Namen des Servers. Tests `tests/test_display_name.py`, `list-e2e.mjs`, Mutationszeile. Nicht berührt: Namen anderer Entitäten (Schalter, Sirenen) in den Aktionen, sie zeigen weiter den Anzeigenamen von HA.

## Stand (1.10.1, Panel-Anmeldung darf die Anlage nicht am Laden hindern)

CI-Fehler bei 1.10.0: `test_state_history_from_recorder_event_log_and_recordings` scheiterte nur in der CI ("Cannot register a resource into frozen router": der Test meldet zuerst den WebSocket-Client an, danach lädt die Anlage und meldet das Panel an). Ursache im Code: `async_register_panel` in `async_setup_entry` ohne Schutz, ein Fehler dort liess die Anlage nicht laden. Jetzt `try/except` mit Fehlerprotokoll (`__init__.py`), Test `tests/test_panel_failure.py`, Mutationszeile. Nachgestellt mit einem Plugin, das `async_register_static_paths` scheitern lässt (ohne Korrektur 4 Tests rot, mit Korrektur grün).

## Stand (1.10.0, Aktionen nach dem Quittieren; Schritte laufen standardmässig weiter)

Ausführlich: `docs/UEBERGABE-1.10.0.md`.

- **Warten ist die Ausnahme.** `workflow.step_waits(step)` entscheidet: Gerät und Ton warten nur mit `"wait": true`; ohne die Angabe (Abläufe bis 1.9.0) gilt die alte Regel (warten, ausser `"detach"`); Dauerton wartet nie. `_runs_alongside` ist die Umkehrung. Das Panel schreibt `wait` bei jedem Schritt mit, den es speichert, und nie mehr `detach` (`actions.js` `waits`, `toStep`). Darum unterscheidet die Angabe neue von alten Schritten: nicht entfernen.
- **Panel:** Option "Warten, bis die Aktion beendet ist" im Fenster des Schritts (`_waitRow`, `data-wf="waitend"`), Pille `.ag-waitpill` auf der Karte (`_waitPill`). Der Schalter an der Karte (`.ag-flow`) und die gestrichelten Verbindungen (`.par`) sind entfernt.
- **Aktionen nach dem Quittieren:** Optionen `workflows_after` (`CONF_WORKFLOWS_AFTER`, je Auslöser, `schemas.valid_after_step`: nur `AFTER_STEP_TYPES`, Ton mit Dauer, `restore` immer aus). `WorkflowRunner._on_change` merkt sich beim Auslösen den Plan (`_plan`) und ruft am Ende `_end(plan)`: erst `async_stop`, dann `async_run_after`. Der Lauf trägt `"after": True`, nutzt `_begin`/`_execute` mit `run["steps"]`, endet von selbst (`_finish_after`, auch nach Schritten, die nebenher liefen), stellt nichts zurück und wird nach einem Neustart nicht fortgesetzt. Ein echter Alarm übernimmt wie bei einem Test (`async_run`, `_check_started`). `workflow_running` der Daten zählt ihn nicht (`_alarm_run`).
- **Panel:** zweite Liste `.ag-wf-after` (`data-zone="after"`) hinter `_endHtml`; `steps(zone)`, `_setSteps`, `edit.zone`; Auswahl gefiltert auf `AFTER_KINDS`. Ziehen und Tastatur bleiben in der Liste.
- **Abstand unter der Reiterleiste (Handy):** `_stickySync` lässt auf dem Handy (und wie bisher in der Übersicht) auch dem letzten festen Teil seinen Innenabstand (`keepGap`, kein `ag-stk-last`): beim Scrollen bleibt unter der Leiste derselbe Abstand wie über ihr. Mit Streifen beginnt der feste Tabellenkopf 2 px unter dem Streifen (`--ag-th-top`), sonst blitzt eine Pixelzeile der Zeilen auf. Am Computer unverändert.
- Tests: `tests/test_after_actions.py` (16), Panel `after-e2e.mjs` (76) und `stickygap-e2e.mjs` (16), angepasst `actions-e2e`, `ack-e2e`, `review-e2e`; Mutationsprobe 6 neue Massnahmen.

## Stand (1.9.0, Sensoransicht)

Ausführlich: `docs/UEBERGABE-1.9.0.md`. Mockups und Entscheide des Nutzers: `docs/mockups/sensor-ansicht-v1/`.

- **Server:** `sensor_history.py`. `SensorStats` (eine Instanz für alle Anlagen, `async_get_stats`, Ablage `alarmageddon.sensor_stats`) merkt je Sensor und Stunde `[Anzahl Auslösungen, Sekunden offen]` für 30 Tage; gefüttert aus `controller._on_sensor` (`self.stats.note`), doppelte Meldungen zweier Anlagen zählen einmal, als Auslösung zählt nur zu -> offen. `backfill` trägt je Sensor einmal die Stunden vor dem ersten eigenen Wert aus dem Recorder nach. Ereignisse: `async_states` + `periods`; Zustand der Anlage: `armed_intervals` aus dem Ereignisprotokoll; Alarm je Ereignis aus den Aufzeichnungen. Batterie und Empfang: `async_numeric` (Statistik von HA, sonst Verlauf), `battery_changes`.
- **Befehl** `alarmageddon/sensor_history` (`entity_id`, `kind` state/battery/signal, `hours`): nur für Sensoren, die eine geladene Anlage überwacht; Zeiträume `STATE_HOURS` bzw. `BATTERY_HOURS`. Steht in `COMMANDS` von `tests/test_security.py`.
- **Panel:** `panel/sensorview.js` (`SensorView`, `host.sensorView`), Fenster `#ag-sensor` (`ag-wide ag-svdlg`; Handy ganzer Bildschirm). Klick auf einen Sensor der Übersicht (`data-act="more"`) öffnet die Ansicht; `_moreInfo` läuft nur noch über "In HA öffnen". Aktionen über `data-sv`. Die Leiste des Zeitraums ist bewusst **nicht** `.ag-seg` (deren wandernde Kapsel passt nicht in ein Fenster, das neu zeichnet). Grafiken sind SVG mit Klassen `sv-*` aus den Variablen des Panels.
- **Nachbau:** `ha-sim.html` beantwortet `sensor_history` mit erfundenen Daten; Tests ersetzen die Antwort über `window.__sensorHistory`.
- Tests: `tests/test_sensor_history.py` (10), `tests/test_sensor_history_recorder.py` (4, echter Recorder), Panel `sensor-e2e.mjs` (122) und `fullscreen-e2e.mjs` (116: Fenster auf dem Handy, Kachel der Anlage hell und dunkel), Mutationsprobe 4 neue Massnahmen.
- **Handy, Fenster über den ganzen Bildschirm:** `:host([narrow]) dialog.ag-dlg` ist `100vw` x `100dvh` ohne Radius; nur `#ag-confirm` und `#ag-discard` bleiben ein Blatt von unten (`height: fit-content`). Die Leiste `.ag-dlg-btns` wird auf dem Handy aus dem scrollenden `.ag-dlg-body` direkt ins Fenster gehängt (`_initDialogs`, Funktion `dock`, nach jedem Neuzeichnen; Beobachter mit `subtree`), darum bewegt sie sich nie. Ausnahme: ist der Inhalt ein `<form>` (Umbenennen, Code), bleibt die Leiste darin, damit "Speichern" abschickt. Ein neues Fenster braucht dafür nichts ausser der üblichen Struktur `.ag-dlg-body` mit `.ag-dlg-btns` als letztem Kind. Blatt des Sensors: nur `.ag-side-body` scrollt.
- **Kachel der Anlage:** `_look` liefert für scharf Rot (vorher Blau), für Alarm `solid: true` (gefülltes Symbol). CSS `.ag-sys.ag-armed` (Rahmen, gewählter Modus rot, Kapsel rot hinterlegt), `.ag-sys.ag-disarmed` ("Aus" grün). `_syncDark` setzt das Attribut `dark` am Panel aus der gezeichneten Hintergrundfarbe (bei jedem Wechsel von `hass.themes`); `:host([dark])` verstärkt die Verläufe. Der Pfeil der Kachel (`data-act="more"` mit der Alarm-Entität) öffnet weiter Home Assistant; nur `binary_sensor.*` öffnet die Sensoransicht.
- Nicht gebaut (Ideen aus dem Mockup): Blättern zum nächsten Sensor, CSV-Export der Liste, Vergleich mit der Vorwoche. Die Ansicht aktualisiert sich nicht von selbst, solange sie offen ist (neu laden durch Wechsel des Zeitraums oder erneutes Öffnen).

## Stand (1.8.0, Kachel der Anlage mit Farbverlauf)

Kachel der Anlage in der Übersicht (`_sysCard`): scharf roter Verlauf von unten (`ag-armed-<modus>`, `--ag-armed-tint`: Anwesend 13 %, Nacht 22 %, Abwesend 32 %), deaktiviert grüner (`ag-disarmed`, 14 %); sonst keiner (Verzögerung, Alarm). Test in `overview-e2e.mjs`.

## Stand (1.7.0, "Immer aktiv" und Modus: eine Regel, zwei Abläufe; Punkte; Linien im Ablauf)

Ausführlich: `docs/UEBERGABE-1.7.0.md` (Entscheide des Nutzers, Regeln, Dateien, Tests, offene Punkte).

- **Welche Abläufe ein Alarm startet,** bestimmt der Automat beim Auslösen: `controller.alarm_flows` (gesetzt in `_on_sensor` über `_flows_for`, im Zustand gespeichert und wiederhergestellt), daraus `controller.alarm_plan()` (ohne leere und doppelte Abläufe; hat "Immer aktiv" keinen Ablauf, bei scharfer Anlage der des Modus). `workflow._on_change` und `notify` nehmen den Plan, nicht mehr `mode or "always"`.
- **Schalter `always_off`** ("Scharf in <Modus>: nur <Modus> zählt", vorher "Immer aktiv ignorieren"): Standard jetzt **an** (`controller.only_mode`, Panel `eff()`); er gilt für Regel und Aktionen. Aus: "Immer aktiv" gilt zusätzlich, beide Abläufe laufen.
- **Zwei Abläufe:** `run["also"] = {trigger, index, until}` neben dem Hauptablauf; `_spawn(run, start, lane)`, `_execute(trigger, start)` mit `_LANE` (ContextVar: jede Aufgabe kennt ihren Ablauf), `_state(run, lane)` für Schritt und Ende einer Wartezeit je Ablauf, `_on_flow_done(run, trigger, task)`, `_take_tasks` bricht beide ab. Der zweite Ablauf steht unter derselben Aufsicht (Wächter, Dauer, Neuladen). Ein Test der Aktionen (`test=True`) hat nie einen zweiten Ablauf.
- **Sensor-Blatt:** keine Pillen "Alarmmodi" mehr (Zuordnung nur in der Tabelle); `_scopeBanner(id, mode)` steht immer da und nennt, wann die Einstellungen greifen; der Schalter bringt Name und Erklärung fertig mit (`optRow` mit `label`/`text`).
- **Punkte:** orange = ungespeichert (Reiter "Konfiguration", Unterreiter, neu Reiter des Modus über `dirtyTabs()` jeder Seite); `host._markSaved(ui)` nach erfolgreichem Speichern lässt sie sofort verschwinden (`_isSaved` vergleicht den Entwurf mit dem gespeicherten Stand). Eigene Werte blau (`.ag-box.own`, `.ag-owndot`). Achtung beim Erweitern: `_renderDots` setzt `has-edit` nur an den Leisten der Modi (`data-seg` sen-mode, wf-trigger, nt-mode, sys-scope), nie pauschal an `.ag-seg.small` (das löschte die Punkte der Unterreiter).
- **Linien im Ablauf:** keine absolut gelegte Linie mehr. Jede Verbindung (`.ag-wf-plus`) hat zwei Stücke `.ag-wf-seg` im Fluss, alles sitzt auf der Achse `--wf-x`; `.par` färbt beide Stücke (und `.ag-wf-end.par` das Stück zu "Alarm endet").
- **Gruppierung der Übersicht:** `list.js` `GROUPS` (area, type, system, none), Auswahl `select[data-list="group"]` in der Werkzeugleiste (Desktop) und in "Ansicht"; Karten mit Gruppentitel `.ag-group-head`. Eine neue Gruppierung braucht einen Eintrag in `GROUPS`, `GROUP_LABEL`, `_groups()` und im Fenster "Ansicht".
- Tests: `tests/test_always_flows.py` (16), `tests/test_always_active.py` angepasst (neuer Standard), Panel `always-e2e`, `layout-e2e`, `actions-e2e` angepasst; Mutationsprobe 51 Massnahmen.

## Stand (1.0.0, erste stabile Version; Inhalt wie 0.40.0, Härtung nach externem Code-Review)

- 1.0.0 (2026-11-10): Nutzer hat die geprüfte Fassung 0.40.0 als Version 1.0.0 übernommen, keine Vorabversion mehr (Entscheid des Nutzers). Keine Änderung an Code und Panel gegenüber 0.40.0 (`PANEL_VERSION` 66); nur Versionsnummer, README-Status und CHANGELOG.

- Review-Protokoll mit allen Befunden, Änderungen und offenen Empfehlungen: `docs/REVIEW-2026-11-09.md` (zuerst lesen, bevor an Zustandsautomat, Ablauf oder Meldungen gearbeitet wird).
- `controller.async_arm` prüft den Zustand nach dem `await` der Code-Prüfung erneut (`disarm_first`); Test `test_sensor_during_code_check_keeps_the_entry_delay` (Executor-Prüfung öffnet die Haustür über `call_soon_threadsafe`).
- `workflow.async_run`: ein laufender Test wird von einem echten Alarm beendet (`async_stop`, dann echter Lauf); Test `test_real_alarm_interrupts_a_running_test`.
- `notify._on_action`: "Deaktivieren" und "Sirene stumm" nur im Zustand `triggered`; `async_start` setzt `_alarm_trigger` nach einem Neustart im Alarm. Tests `test_stale_disarm_push_does_not_disarm_an_armed_system`, `test_alarm_end_message_after_restart_uses_the_mode`.
- `settings.async_get_settings` mit Sperre (`DATA_SETTINGS_LOCK`, wie `panel.py`); Test patcht `Settings.async_load` mit `asyncio.sleep(0)`, weil der Test-Speicher sofort antwortet.
- `recording.py`: `_finish(reason="ended")` bei `triggered -> armed`; Grenze je Alarm gilt für `_LIMITED` (sensor, sensor_offline, sensor_report, unconfirmed) und für `notified` dieser Arten (`_LIMITED_NOTIFIED`). Hinweis: im Zustand `triggered` meldet der Controller keine Sensorausfälle (nur in `WATCHING`), Flattern ist darum nur in der Eingangsverzögerung möglich.
- Panel: `_optionOf(s, id, key, mode)` und `_blocking()` in `alarmageddon-panel.js` spiegeln `controller.option()`/`blocking_sensors()` (je Modus, `bypass`); `list.js members()` kennt `sensor_modes.always`; `notify.js` zeigt mit Schalter die modusunabhängigen Arten unter "Für alle Modi" (Design des Schalters unverändert: aus = einfach, ein = Reiter); `sensors.js _bits()` folgt dem gewählten Modus; `_cards()` in `sensors.js` entfernt (nur `list.js` hat noch Karten); `disconnectedCallback`; `_fetch` räumt den Timeout-Zeitgeber auf; CSV-Export entschärft Formelzellen.
- Entfernt: `http_limit.py` (Rest der Update-Funktion). Neue Tests: `tests/test_hardening.py` (10), `tests/test_security.py` (151 Fälle), angepasst `test_disarm_from_push` (Deaktivieren nur im Alarm und nur vom Empfänger).
- Push-Aktionen nur von konfigurierten Alarm-Empfängern (Entscheid des Nutzers, 2026-11-09): `notify.recipient_users(hass, targets)` löst `notify.mobile_app_<gerät>` (Config Entries von `mobile_app`: `device_name`, `user_id`) und notify-Gruppen der Plattform `group` (`hass.data["notify_services"]`, `entities`) auf die HA-Benutzer auf; `_on_action` verlangt `event.context.user_id` in dieser Menge, sonst Warnung im Log. HA (2026.2.3, `mobile_app/webhook.py`) beglaubigt nur den Benutzer der Registrierung, keine Gerätekennung. Tests: `_phone`/`PHONE` in `test_actions.py`, `test_push_action_*` in `test_hardening.py`.
- `ws_log` mit `rev` (Zähler `EventLog.rev`, `AlarmRecorder.rev`, dazu `controller.instance` und Titel): Antwort `{"unchanged": true}`, solange nichts dazukam; Panel `log.js` merkt `this.rev`. `Settings._save_soon` plant nur einen Schreibtermin (`_save_pending`). `controller.sensor_overrides` gemerkt je Options-Objekt. `list.js _matches(r, filter)`.
- Jede Anlage lädt genau einmal neu: `Settings.async_store_presets` (ohne Benachrichtigung, meldet "geändert"), dann Optionsänderungen, dann `async_notify_listeners(skip=<neu ladende Anlagen>)`; Listener tragen die `entry_id` (`add_listener(listener, key)`). `async_set_presets` gibt es nicht mehr. 61 ungenutzte Schlüssel aus `strings.js` entfernt (590 je Sprache).
- Sicherheitstests (Regeln in `CLAUDE.md`, Abschnitt "Sicherheitstests"): `tests/test_security.py` (Zusagen vollständig: `COMMANDS` kennt jeden WebSocket-Befehl, Zustandsmatrix, Wiederherstellung, feindliche Eingaben, Pfade ohne Anmeldung), `scripts/mutation_check.py` (baut je eine Schutzmassnahme aus, 14 Stück, läuft in der CI), Panel-Suite `review-e2e.mjs`. Der Nachbau kennt `rev` im Protokoll; die Reste der Update-Funktion sind aus `ha-sim.html` entfernt.
- Nichts hält die Alarmaktionen auf (Review-Protokoll 2.3, Regel in `CLAUDE.md` unter "Sicherheitsregeln"): `controller._call_each` ruft jeden Zuhörer einzeln im `try` (die Alarmaktionen sind der letzte Zuhörer derselben Liste wie Protokoll, Aufzeichnung, Meldung); `workflow._save_run` wartet höchstens `SNAPSHOT_TIMEOUT` auf die Ablage; das Mitschreiben in `_execute` steht im `try`; `workflow._runs_alongside`: ein Ton mit Dauer 0 läuft immer nebenher (Panel `actions.js`: `endless()`, `alongside()`, Chip fest); `Notifier._send` sendet auch, wenn `async_persist` scheitert. Tests: `tests/test_action_hang.py` (32), Mutationsprobe 29 Massnahmen.
- Wächter über dem Ablauf (Review-Protokoll B25, B26): `workflow._watched(coro, budget, label)` (jedes `await` in `async_run` und `_execute`; Prüfung am Quelltext), Grenzen `step_budget(step)` und `start_budget()`, Start über `_start` (Fehler -> `_check_started` sofort) und `_start_guard` (hängt -> nach der Startgrenze), `_begin`/`_spawn` (Schritte genau einmal je Lauf, `_begun`), `_on_flow_done` (Abbruch -> nächster Schritt, `_position`). Echter Alarm im Test: `_end_test` ohne Zurückstellen, `_prepare` erbt den Schnappschuss. `_take_tasks` synchron, `async_stop` löst den Lauf vor dem ersten Warten. Zeitachse: `step_failed` mit `reason: watchdog`, Panel-Texte `logWatchdog*`. Die Aufsicht misst echte Zeit (`asyncio.wait`, `asyncio.sleep`), nicht die Zeitgeber von HA: Tests mit kurzen Grenzen über `monkeypatch` auf `SERVICE_TIMEOUT`, `SNAPSHOT_TIMEOUT`, `WATCHDOG_GRACE`.
- Dauer von Sirene und Ton (Review-Protokoll 2.4, B27): der Nutzer bestimmt sie, im Code steht keine feste Dauer. `workflow._remaining(seconds)` merkt beim ersten Start eines abgewarteten Schritts mit Dauer (Warten, Ton mit Dauer) sein Ende in `run["until"]`; nach Neuladen oder Neustart läuft nur der Rest. Schritte "nebenher" sind nicht fortsetzbar (`resumable=False`). Die Grenzen des Wächters liegen immer über der eingestellten Zeit. Tests: `tests/test_duration.py` (17).
- Totmannschaltung (Ausfall von Home Assistant von aussen erkennen): vom Nutzer am 2026-11-10 zurückgestellt, nicht bauen.
- README (EN/DE) neu geschrieben (2026-11-10): Nutzen zuerst (eine Oberfläche, überwachte Sensoren), Schnellstart, Rundgang mit Bildern, Sicherheitsmechanismen, Grenzen, Details unter "Gut zu wissen" (`<details>`). Bilder in `docs/img/` mit vollen raw-Adressen (HACS zeigt die README an, relative Pfade gehen dort nicht verlässlich): Bildschirmfotos aus dem Nachbau mit `node tests/panel/readme-shots.mjs` und `python scripts/optimize_images.py` (Pillow), Schaubilder mit `python scripts/make_diagrams.py`. Nach Änderungen an der Oberfläche neu erzeugen. Der Nachbau nennt "Diego"; das Skript ersetzt den Namen vor der Aufnahme. Zahlen in der README (Tests, Grenzen) bei Änderungen nachführen.
- Offen am Code: nichts. Offen bleibt nur die Prüfung mit echten Geräten (Push-Knöpfe nach B15, siehe Review-Protokoll 2.4) und die Empfehlungen für weitere Tests (Review-Protokoll 5.5).

## Stand (0.26.0 und 0.27.0, Fenster, feste Kopfzeile, Sortieren)

- Dialoge: `_initDialogs` in `alarmageddon-panel.js` setzt per MutationObserver ein rundes `.ag-dlg-x` (42 px, wie `.dlg-close` in Device Panel) in jedes `dialog.ag-dlg` ausser `ag-discard`; `_onDlgClick` (Capture) fängt X und die Abbrechen-Knöpfe (`DLG_CANCEL`) ab und fragt über `_dlgDirty(dlg)` (Schritt-Editor: Vergleich mit `edit.snap`, Auswahl, Voreinstellungen, neuer Code) per `_confirm` nach; Escape geht über das `cancel`-Ereignis. Knöpfe unten: `.ag-dlg-btns` ist `position: sticky` im scrollenden `.ag-dlg-body`. Das Blatt am Handy (`ag-sheetdlg`) hat das X im Kopf.
- Fixe Kopfzeile: `_stickySync` misst `.ag-head`, Unterreiter und `.ag-tools` und setzt `top`/`z-index` sowie `--ag-th-top` für `th` (nur Desktop; am Handy bleibt die Tabelle seitlich wischbar). `.ag-content` hat oben kein Padding (Chrome misst `sticky top` ab dem Innenabstand), der Abstand sitzt in `.ag-head`. Maximalbreite 1680 px über `--ag-px`.
- Liste: Spaltenköpfe sind Knöpfe (`data-list="sort"`), `_sortKey` je Spalte, leere Werte am Ende; Filter `occupied` (Bewegung, Belegung, Anwesenheit) getrennt von `open`.
- `save_presets` nimmt `reset_sensors` (Sensorarten): löscht `sensor_options` der betroffenen Sensoren in allen Anlagen, Antwort `reset`. Panel: Schalter "Auf alle Sensoren anwenden" im Dialog.
- Aktionsdialoge in Kapiteln (`_sec`, `.ag-sec-t`); "Rückgängig beim Deaktivieren/Quittieren" (`fldRestore`) mit Hinweis; Alarmton: neuer Schritt mit `detach: true`.
- Scrollposition: `_keepScroll(fn)` in `alarmageddon-panel.js` merkt `scrollTop` von `.ag-content` und stellt ihn nach `_setHtml` und den Gerüstwechseln wieder her (nur innerhalb derselben Ansicht, Schlüssel Reiter|Unterreiter|Anlage); Dialoge merken die Position beim `showModal` und stellen sie beim `close` her (der Browser scrollt sonst zum Auslöser). Ursache auf dem Handy nicht im Browser nachgestellt (Test mit Programmklick besteht auch ohne Korrektur): bei erneutem Auftreten mit echtem Gerät prüfen.
- 0.34.0 (Anlage): `per_mode_settings` (Schalter nur für die Anzeige; die Engine liest die Werte je Modus wie bisher, `system.js`: `draft.perMode`, ohne Schalter schreibt eine Eingabe in alle Modi, beim Ausschalten werden alle Modi auf den ersten Modus gesetzt; ohne gespeicherten Wert an, wenn sich die Werte unterscheiden).
- 0.34.0: Bereich `always` in `sensor_modes` (Reiter "Immer aktiv", gilt bei deaktivierter Anlage; die Option `always` liest `option()` immer aus diesem Bereich, nie aus einem Modus). `notify["per_mode"]` (Schalter) schaltet die Werte je Modus (`effective_type` prüft ihn); `sensor_offline` steht bei den Alarm-Meldungen. Panel `notify.js`: Schalter `data-nt="permode"`, Reiter ohne "Alle Modi".
- 0.34.1: nur Darstellung: `.ag-pmgroup` (umrandete Gruppe) und `.ag-pmscope` bei Sensoren/Meldungen/Anlage, `.ag-pmbanner` im Sensor-Blatt (`sideHtml`).
- 0.34.2: Plus im Ablauf: gestrichelte Linie endet über dem Knopf (`.ag-wf-plus.par::before` mit fester Höhe), Knopf `z-index: 2`, mehr Abstand oben.
- 0.35.0: Anlagenname oben in der Konfiguration (`_sysBar` im Panel; bei mehreren Anlagen Dropdown `data-act="system"`, bei Meldungen nicht gezeigt), Stift öffnet `ag-rename`, WS `alarmageddon/rename` (Eintrag, Gerät mit `name_by_user=None`, optional Entitäts-IDs, die dem alten Namen folgen). "Integration in HA öffnen" → `/config/integrations/integration/alarmageddon#config_entry=<id>` (die Kennung im Hash habe ich nicht gegen HA geprüft).
- 0.35.2: Anlagenname sitzt in jedem Konfig-Reiter im Kopf, HA-Knopf nur im Reiter Anlage (`.ag-headsys` neben dem Logo, gefüllt in `_renderConfig`), `.ag-sysbar` entfällt; `.ag-wf-head` ist `display: contents` (sonst klebt die Leiste der Aktionen nur im eigenen Block); "Testen" in `renderFoot` (`_testBtnHtml`); Aktionen mit Schalter `draft.perMode` (aus = Ablauf des ersten Reiters gilt für alle Auslöser, `_effective` beim Speichern und in `dirtyCount`); Filter-Pillen im Protokoll (`evFilter`); `.ag-pmbar` ist eine Spalte, bei den Sensoren fest (`.ag-pmstick` in `_stickySync`).
- 0.36.0: `.ag-wf-plus` mit 18 px unten, vier Reiter (`.small`, ohne `.ag-subs`) auf dem Handy in 2 Spalten; Panel wird mit Sperre (`DATA_PANEL_LOCK`) registriert: beim Start laden alle Anlagen zugleich, die zweite scheiterte mit "Overwriting panel" (Traceback des Nutzers, Anlage "Home"), Test `test_several_systems_load_together_at_startup`; Sensor-Optionen mit beschädigten Einträgen (None, Text) werden ignoriert (`sensor_overrides`, `option()`, Migration), Test `test_corrupt_options.py`; Protokoll: beschriftete Filter (`.ag-field`), Datumszeile `_rangeText`, CSV-Download als Symbol in `.ag-log-foot`, JSON-Export entfernt.
- 0.39.0: Übersicht auf dem Handy: `_stickySync` hält nur `.ag-ov-tools` fest (`narrowOv`), kompakte Werkzeugleiste (CSS am Ende von `styles.js`); Hängende Geräte im Ablauf: `_bounded` in `workflow.py` (eigener Task, `asyncio.wait` mit `SERVICE_TIMEOUT = 10`, kein Abbruch, `_late` wird beim Stoppen abgebrochen und nicht abgewartet), `SNAPSHOT_TIMEOUT = 3`, Wache gegen Deaktivieren während `async_run`, Zeitachse `step_failed` (`recording.py`, `log.js`). Tests `tests/test_action_hang.py` (ohne `async_block_till_done`, das wartet auf hängende Dienstaufrufe); Test-Hilfe `settle` in `test_alarm.py`.
- 0.39.0: Sicherungen mit freiwilligem Namen (`backup_create` mit `name`, höchstens 60 Zeichen; Dialog `data-form="backup"` in `system.js`).
- 0.38.0: Sicherungen in der Integration (`backup.py`: `async_create_backup`/`list`/`get`/`delete`, Store `alarmageddon.backups`, `MAX_BACKUPS = 10`, älteste fällt weg; WS `backups`, `backup_create`, `backup_get`, `backup_delete` mit `backup_id`, nicht `id`: das ist die Nachrichtenkennung). Panel `system.js`: Tabelle `.ag-bktable`, Wiederherstellen über `askRestore` (derselbe Ablauf wie Import). JSON bleibt als Datei-Export.
- 0.37.0: Tabellenkopf klebt auf dem Handy (`overflow: clip`, Filter scrollen weg, Klasse `hscroll` als Rückfall, kompakte Liste), neue Regel in CLAUDE.md; Sensoren auf dem Handy: `_table` kompakt statt `_cards` (Kartenansicht bleibt im Code, wird nicht mehr genutzt); Blatt (`ag-sheetdlg`): das X der Kopfzeile ist dort ausgeblendet, `.ag-dlg-btns` ohne negativen Randausgleich; `_arm` setzt `_busy(true, true)` (Klasse `ag-ldblur`, verschwommen), wartet in `_waitArmed` bis der Zustand stimmt (max. 4 s); Test im Übersicht-Test mit `__wsDelay`.
- 0.33.0: Einstellungen pro Modus vereinfacht (Mockup `docs/mockups/modus-einstellungen-v1`): Reiter nur bei eingeschaltetem Schalter, kein "Alle Modi" (`mtab` = gewählter Modus, `activeMode()` = `perMode ? mtab : null`), `_table`/`_cards` bleiben dieselben, Hervorhebung `.cur`, "Immer aktiv" je Modus über `mopt`; `_modeTable`/`_modeCards` entfallen. Datenmodell unverändert (Überschreibungen über dem Grundwert).
- 0.32.0: Sensor-Optionen je Modus: Optionen `per_mode_sensors` (Schalter) und `sensor_modes[modus][sensor][option]` (nur Abweichungen); `AlarmController.option(entity, key, mode)` (Modus vor Sensor vor Voreinstellung; ohne Modus oder bei ausgeschaltetem Schalter die Werte für alle Modi), Aufrufer in `_on_sensor`, `_confirmed`, `_on_arming_change` und `async_arm` übergeben `self.mode`/`mode`. Neue Option `bypass` ersetzt die globale Wahl `open_sensors`; `__init__._migrate_open_sensors` überträgt alte Werte einmal beim Laden (vor dem Update-Listener). Panel `sensors.js`: `draft.perMode`/`draft.modeOpts`, `mtab` (Ansicht), `renderModeBar`, `_modeTable`/`_modeCards`, Blatt je Modus mit Herkunft. `save_presets` mit `reset_sensors` löscht auch die Werte je Modus. Tests: `test_sensor_options.py` (Umgehen, je Modus, Migration), layout-e2e.
- 0.31.0: `notify["types"][art]["persistent"]` (auch in `modes`): `notify.async_persist` legt `persistent_notification` mit der Kennung des tag an (Wartung: `alarmageddon_maintenance_<art>`; ein Ausfall des Handys zählt dann trotzdem als gemeldet). Scroll: `togglePick` zeichnet nichts neu, `_setHtml` für Fenster erhält die Scrollposition von Inhalt und Listen. Feste Teile: Abstand als Innenabstand (`.ag-stk:not(.ag-stk-last)`), kein Schatten mehr, `--ag-th-top` = Höhe aller festen Teile. "Nur melden" heisst "Stiller Alarm".
- Offen (Entscheid des Nutzers, noch nicht gebaut): globale Wahl "Offener Sensor beim Scharfschalten" entfällt; je Sensor und je Modus einstellbar mit Unterreitern Global/Anwesend/Abwesend/Nacht und Schalter "pro Modus", auch in der Sensorübersicht.
- 0.29.0: Meldungen je Modus: `notify["modes"][modus][art] = {enabled, critical, volume}` (nur abweichende Werte, `NOTIFY_MODE_KINDS` = sensor_report, pending, armed, sensor_offline). `notify.effective_type(cfg, kind, mode)`, `Notifier._on(kind, mode)`, `build_payload(mode=)`; `save_notify` ersetzt `modes` als Ganzes, `test_notify` nimmt `mode`. Panel `notify.js`: Unterreiter `data-nt="tab:<modus>"` (Ansicht, `modeTab`), `_eff`/`_setOwn` (gleich dem gemeinsamen Wert: kein eigener Wert), Herkunft `.ag-origin`. "Sensor meldet" heisst "Stiller Alarm".
- 0.28.0: Update-Funktion entfernt (`update_check.py`, Panel `updates.js`, WS `version`/`release_notes`/`set_update`, Einstellungen `update`/`update_notified`, Meldungsart `update_available`, Reparaturen-Meldung wird beim Start gelöscht). "Alarm endet" hat nur noch die optionale eigene Meldung (`workflow_end[auslöser] = {"notify": {...}}`, `Notifier.send_alarm_end`, WS `test_end_notify`); die Wahl "markierte/alle/nur stoppen" ist gestrichen, "Rückgängig" gilt allein je Schritt. Sensortabelle: Spalte "Immer aktiv" (`_alwaysBox`), ohne Integration/Batterie. Übersicht: `_stickySync` hält Karten, Filter und Tabellenkopf bei hohem Fenster.
- (0.27.0, ersetzt): Element "Alarm endet" (`actions.js _endHtml`, Option `workflow_end[auslöser]` = restore_marked (Standard, nicht gespeichert) | restore_all | stop_only). `workflow.step_entities(step, end)` und `_run["end"]` steuern Schnappschuss und `_restore` (stop_only stoppt nur Player). `save_workflows` nimmt `workflow_end`, `ws_data` liefert es, Sicherungsschema kennt es. Tests: `test_alarm_end_*`, layout-e2e.
- Tests: `layout-e2e.mjs` (Fenster, X, Rückfrage, feste Kopfzeile, Sortieren, Belegung, Zeilenklick, breit), `test_presets_can_reset_own_sensor_values`.

## Stand (0.25.0, Liste wie Device Panel, Alarm bis zum Quittieren)

- Sensorliste (`panel/list.js`): Ansicht je Gerät (`desktop`/`mobile`, `get kind()` nach Breite), Spalten als geordnete Liste `[key,on]` plus Kartenfelder, Gruppierung, Sortierung und Richtung je Gerät getrennt; Speicherort: `localStorage` und pro Benutzer in HA (`frontend/set_user_data`, Schlüssel `alarmageddon_view`, 400 ms verzögert, `loadRemote()` beim Start; Migration aus dem alten `alarmageddon.view`). Standard ist die Liste (Handy: Zustand, Batterie, Empfang, Firmware), Karten optional (`view.layout`). Dialog "Ansicht" mit zwei Spaltenlisten (`data-list="col"`/`"mv"`).
- Alarmdauer entfernt (Entscheid des Nutzers): der Alarm bleibt bis zum Deaktivieren. `controller._go_triggered` plant kein Ende mehr; `trigger_time_for` und die Einstellung fehlen in Optionsdialog, `ws_data` (`mode_settings`, kein `always`), Panel (Ebene "Immer aktiv" weg). `save_system` und `SYSTEM_OPTIONS_SCHEMA` akzeptieren alte `trigger_time*`-Werte und ignorieren sie (alte Sicherungen bleiben importierbar). Wie lange ein Ton läuft, bestimmt der Schritt `sound` (`duration`).
- Offen: Rückmeldung des Nutzers, welche Option trotz "aus" noch "Kritisch" und Testknopf zeigte (im Screenshot nicht reproduzierbar; der Code zeigt den Inhalt nur bei eingeschalteter Art).

## Stand (0.24.0, Reiterleisten wie Device Panel)

- Übernahme aus ha-device-panel (`_initSeg`, Abschnitt "Reiter als Segmentschalter" in `styles.js`): `_initSeg` in `alarmageddon-panel.js` ersetzt das alte `_placePills` (bleibt als Aufruf von `_segSync`). Die Kapsel ist ein `<i class="ag-pill">` als letztes Kind der Leiste (das Markup enthält keine Kapsel mehr, sonst wäre sie eine Rasterzelle), FLIP mit `_segLast` je Schlüssel `Fenster|data-seg`, `live` (Lage unterwegs), ResizeObserver nur bei echter Breitenänderung, MutationObserver ignoriert Änderungen an der Kapsel. Abweichung vom Vorbild: Eine zweite Zeichnung in derselben Fahrt, bevor `live` mitgeschrieben ist, fasst die Kapsel nicht an (`running`), sonst sprang sie ans Ziel, weil `_renderView` synchron und der MutationObserver nochmals synchronisieren.
- "Letzte Änderung": `last_change.py` (nur on<->off zählt), gemerkt in `settings.data["last_changes"]` (vom Zustandsautomaten bei jedem echten Wechsel), für fehlende Sensoren einmal je Lauf aus dem Recorder (`_last_changes` in `ws_data`, 90 Tage), Panel liest `data.last_changes`, ohne Wert "–". Nicht in der Sicherung (Laufzeitdaten).
- Offener Sensor beim Scharfschalten ist ein `<select data-sys="open-sel">` (Entscheid des Nutzers: Reiter zu nah an der Navigation); Behandlung in `SystemUi.onChange`.
- CSS: `.ag-seg` als `inline-grid` (kompakte Leisten so breit wie der Inhalt, Spalten gleich breit), auf dem Handy `grid` über die Breite, ab fünf Reitern 4 Spalten (unter 390 px 3). Tests: `seg-e2e.mjs`. Lage der Punkte `has-dot`/`has-edit` an die neue Leistenfarbe angepasst.

## Stand (0.23.0, Neuladen, Karten, Klickziel)

- Neuladen nach dem Speichern: `async_unload_entry` entfernt das Panel nicht mehr (nur `async_remove_entry` der letzten Anlage); `controller.instance` (uuid je Lauf) steht in `data`; das Panel wartet in `_reloadWait` auf die neue Kennung, behält die letzten Daten (`_fetch` ergänzt eine fehlende Anlage aus den alten Daten, bei leerer Antwort bis zu 30 Wiederholungen) und zeigt die Ladeanzeige (`loader.js`, 1:1 aus Device Panel `_loaderHtml/_loaderStart`, CSS `.ag-ld`, Klasse `ag-ldwrap` auf `.ag-root`). Der Nachbau simuliert das Neuladen (`window.__reloadMs`).
- Sensorliste: `view.layout` (list|cards), Umschalter als Reiterleiste mit Kapsel (`data-list-layout`), Karten als Raster (`.ag-mcards.grid`). Filterpillen `.ag-lchips` mit Abstand.
- Push-Schritt: `click` (log|overview|custom) und `click_path` (Pfad mit führendem /); `Notifier._click_target` liefert `/alarmageddon?view=log` (Standard), `url`, `clickAction` und die Aktion "Öffnen" nutzen es. Panel `_applyDeepLink` liest `?view=log` aus der Adresse des übergeordneten Fensters (beim Laden, `visibilitychange`), schaltet auf das Protokoll und entfernt den Parameter. Nicht geprüft in echtem HA: ob die Companion App `/alarmageddon?view=log` bei einer laufenden App ohne Neuladen weiterreicht.
- Eigene Aktion: Art und Aktion als durchsuchbares Feld (`_cbox`, `data-wf="cb"`); Workflow-Karte mit Schalter `_flowChip` und gestrichelter Verbindung (`.ag-wf-plus.par`).
- Release Notes im Chat nur noch Englisch (CLAUDE.md).

## Stand (0.22.0, Protokoll mit Zeitraum und Export)

- `log.js`: Zeitraum (`all, 3h, 24h, today, yesterday, 7d, 30d, day, span`, Pref `logRange/logFrom/logTo`) und Anlage filtern `events()` und `incidents()` (Alarm zählt bei Überschneidung); `window()` liefert [von, bis). Export `exportFile('csv'|'json')`: CSV mit Semikolon und BOM, eine Zeile je Ereignis und je Alarm-Eintrag; JSON mit `filter` und Rohdaten. Werkzeugleiste (`.ag-log-tools`) wird nur bei Änderung der Anlagen neu gebaut, damit offene Auswahlfelder beim 5-s-Nachladen nicht zurückspringen. Liste zeigt höchstens 300 Ereignisse, der Export alle.
- Aufbewahrung: `EVENTS_KEEP` 1000, `RECORDINGS_KEEP` 30. Tests: log-e2e (Zeiträume, Tag, Zeitraum, Anlage, CSV und JSON).

## Stand (0.21.0, Symbol in den Meldungen)

- `build_payload` setzt `data.icon_url = /alarmageddon_icon.png` (relativ, die Companion App löst es gegen ihre HA-Adresse auf). `panel.py` meldet `brand/icon.png` einmal als öffentlichen statischen Pfad an (`DATA_ICON`). Android zeigt es als Symbol der Meldung, iOS ignoriert es (Systemvorgabe). Test: `test_notifications_carry_the_integration_icon`. Nicht geprüft: Darstellung auf einem echten Android-Handy.

## Stand (0.20.0, Einstellungen der Alarmmeldung nur im Push-Schritt)

- Push-Schritt: `critical`, `volume`, `buttons {open, silence, disarm}` (alle optional, fehlt eine Angabe gilt der frühere globale Wert: `types.triggered`, `open_action`, `silence_action`, `disarm_action`; diese sind im Panel nicht mehr einstellbar, bleiben aber als Rückfall in `settings.notify`). `Notifier.send_alarm(test, step)`; `_buttons(step)`, `_button_allowed(key)` leitet die Berechtigung der Push-Aktionen aus den Push-Schritten des aktuellen Modus ab (restart-fest). `_on("triggered")` ist immer wahr (Alarmmeldung nicht abschaltbar).
- Panel: Kapitel "Alarmmeldung" in Benachrichtigungen mit Hinweis und Knopf zu den Aktionen (`to-actions`); Art "Alarm" und Kapitel Knöpfe entfernt. Editor: `_ntDelivery` (kritisch, Lautstärke, Knöpfe), Werte `null` = erbt.

## Stand (0.19.0, eigener Text der Push-Meldung)

- Schritt `notify` mit optionalen `title` (100) und `message` (300). `Notifier.send_alarm(test, title, message)` füllt nur `{name} {sensor} {time} {mode}` (`_fill`, kein `str.format`, Unbekanntes bleibt stehen); leer = Standardtext des Servers. Panel: `_notifyFields` mit Standardtext in den Feldern (Standard wird nicht gespeichert: `ntTitle`/`ntMessage` bleiben leer), Platzhalterknöpfe, Vorschau (`_ntPreview`). Die automatische Alarmmeldung (ohne Push-Schritt) bleibt beim Standardtext.

## Stand (0.18.0, Alarmton mit Dauer)

- Sound-Schritt: `duration` (Sekunden, 0 = bis Deaktivieren) ersetzt `repeat`; ohne `duration` gilt die alte Form (`repeat`). `workflow._play` wiederholt den Ton in Abständen der Tonlänge bis zum Ende der Dauer (Zeit über `dt_util.utcnow`, in Tests schrittweise `advance`), dann und bei jedem Abbruch `media_stop` (finally). `async_silence` stoppt ohne laufenden Ablauf die Player der Sound-Schritte des aktuellen Auslösers, solange `triggered`.
- Panel: `until`, `playSeconds` im Formular; alte Schritte werden als `repeat × Tonlänge` angezeigt.

## Stand (0.17.0, Schritt "nicht abwarten")

- Schritt-Schlüssel `detach` (nur `action` und `sound`, optional, in `schemas.STEP_SCHEMAS`). `workflow._execute` startet solche Schritte als Hintergrund-Task (`_side`, Menge `_side_tasks`) und macht sofort weiter; `_cancel_task` bricht sie mit ab (Deaktivieren, Alarmende). Nach einem Neustart laufen sie nicht weiter (nur der Index des Hauptablaufs wird gespeichert). Panel: `fromStep/toStep` ergänzen `detach`, Schalter `fldDetach` im Editor, Hinweis "läuft nebenher" auf der Karte.
- Fehler: ein Schritt hält die anderen schon immer nicht auf (`_execute` und `_side` fangen Fehler ab); die Option ändert daran nichts.

## Stand (0.16.0, Knöpfe der Alarmmeldung)

- Einstellungen `open_action` (an), `silence_action` (aus), `disarm_action` (aus) in `settings.notify`. `notify.py`: Aktionen werden je nach Schalter aufgebaut (`PUSH_ACTION_SILENCE` + entry_id). "Sirene stumm" ruft `workflow.async_silence` (stoppt Schritte, stellt Geräte zurück, nur bei laufendem echtem Ablauf), Zustand bleibt `triggered`; Ereignis `silenced` im Protokoll und in der Zeitachse. Panel: `BUTTONS` in `notify.js`.
- Eigene Aktion: Namen kommen über `frontend/get_translations` (Kategorien services, title, entity_component, selector; `ActionsUi.loadTranslations`, Schlüssel `component.<domain>.services.<dienst>.name` usw.), Rückfall `hass.services`, dann lesbar gemachte Kennung.
- Ideen, nicht gebaut: "Wieder scharf schalten" in der Meldung "Alarm beendet", Knopf im Panel-Alarmband für "Sirene stumm".

## Stand (0.15.0, Meldungen: nicht erreichbare Sensoren in einer Karte)

- Nur Darstellung (`notify.js`): `sensor_offline` und `sensor_unavailable` bleiben getrennte Arten mit eigenen Einstellungen und Empfängern (Alarm bzw. Wartung), erscheinen aber als eine Karte "Sensor nicht erreichbar" im Kapitel Wartung (`ntGroupOffline`, Unterpunkte `ntT2_`/`ntH2_`). Test: hardening-e2e.

## Stand (0.14.0, Sensorauswahl)

- Option `sensors` (`CONF_SENSORS`) je Anlage: vom Nutzer gewählte Sensoren der Konfigurationsliste. Angezeigt wird `sensors ∪ Zonen ∪ Schlüssel von sensor_options` (`SensorsUi.baseSensors`), darum keine Umstellung bestehender Anlagen. `save_zones` nimmt `sensors`; `data` liefert `sensors` je Anlage und die Kandidaten (alle binary_sensor passender Klasse). In Sicherung (`SYSTEM_OPTIONS_SCHEMA`).
- Panel: Knopf "Sensoren hinzufügen" und Fenster `ag-pick` (Suche, nach Bereich, Mehrfachwahl), Papierkorb je Zeile und im Seitenblatt (löscht auch Zonen und Optionen im Entwurf). Übersicht und Alarmlogik ungeändert.
- Tests: test_websocket (Auswahl, Sicherung), Panel-Suite pick-e2e (76); der Nachbau liefert `sensors` (alle) oder mit `?sensors=few` keine.

## Stand (0.12.0, Protokoll und Alarm-Aufzeichnung)

- `recording.py` (`AlarmRecorder`, je Anlage, Speicher `alarmageddon.recordings.<entry_id>`, 20 Alarme, 300 Einträge): beginnt bei `pending`/`triggered`, endet beim Deaktivieren. Hört nur während eines Alarms auf `all_sensors()`; der auslösende Sensor wird mit seinem echten `last_changed` nachgetragen. Neustart im Alarm: Eintrag `restart`, Aufzeichnung läuft weiter; Zustand nicht mehr aktiv: abschliessen mit `reason: restart`. Flatternde Sensoren: Sensor-Einträge entfallen ab der Grenze (`truncated`), Zustandseinträge nie. Nicht in der Sicherung (Laufzeitdaten).
- WebSocket `alarmageddon/log` (Ereignisse und Aufzeichnungen je Anlage, getrennt von `data`).
- Panel: `panel/log.js` (`LogUi`), Reiter `log` auf der Startseite (Reihenfolge Übersicht, Protokoll, Konfiguration). Zeitachse als Bahnen (CSS, kein SVG) plus Reihenfolge; laufender Alarm lädt alle 5 s nach (`_poll`), sonst beim Öffnen und bei Zustandswechseln. Die Ereignisse der Übersicht sind ins Protokoll gewandert.
- Tests: `tests/test_recording.py` (8, inkl. Pflichtfälle: Deaktivieren in der Verzögerung, Sensorausfall, Neustart im Alarm), Panel-Suite `log-e2e.mjs`.
- Offen in echtem HA: Verhalten bei sehr langen Alarmen im Panel (nur Darstellung), Schritte der Aktionen und Meldungen stehen noch nicht in der Zeitachse (möglicher Ausbau).

## Stand (0.11.0, Aktionen-Editor)

- `panel/actions.js` komplett neu: Bausteine `notify`, `device`, `sound`, `wait`, `scene`, `custom` (Formular, `fromStep/toStep` zum Serverformat von `workflow.py`, gespeichert wird nichts Neues). Gerätefähigkeiten aus `hass.states` (`deviceOptions`: Helligkeit, Farbtemperatur, Position, Stufe, Temperatur, Modus), Felder eigener Aktionen aus `hass.services` (`flatFields/selectorType`, Selektoren text, number, select, entity, boolean; anderes bleibt in `extra` erhalten).
- Schritt-Test: `test_workflow` mit `step` (workflow.py `async_run(..., steps)`), Rückfrage über `host._confirm` (Dialog `ag-confirm`). Ziehen am Griff: Pointer-Ereignisse am Fenster (`onPointerDown/Move/End`), Pfeiltasten am Griff; Klasse `.ag-handle` (nicht `.ag-grab`, das ist der Balken des Blatts in sensors.js).
- Vorschau des Tons: `pv-play/pv-pause` spielen im Browser, mit Hinweis `pvNote`.
- Tests: `tests/test_actions.py` (Schritt-Test), actions-e2e (264 Prüfungen: Ziehen mit Maus, Pfeiltasten, Test mit Rückfrage, Licht, eigene Aktion, Szene, Alarmton). Der Nachbau liefert `hass.services` und `light.flur` mit Farbtemperatur.
- Offen in echtem HA: Dienste mit exotischen Selektoren (zeigen den Hinweis "nicht einstellbar"), Ziehen auf einem echten Handy (Companion App).

## Stand (0.10.0, Einstellungen je Modus)

- Werte je Modus in den Optionen als `<feld>_<modus>` (`entry_delay_away`, `trigger_time_always`, `open_sensors_home`, `confirm_window_night`; `exit_delay_<modus>` gab es schon). Rückfall: gemeinsamer Schlüssel ohne Modus, dann Grundeinstellung (`controller.mode_value`). Kein Umschreiben bestehender Daten nötig. Bereich `always` (Alarm durch immer aktiven Sensor bei deaktivierter Anlage) kennt nur `trigger_time`.
- WebSocket: `data` liefert `mode_settings` je Modus plus `always`; `save_system` nimmt `mode_settings` (Kurzform `entry_delay` usw. ohne Modus setzt alle Modi). Optionsdialog: ein geänderter gemeinsamer Wert (Eingangsverzögerung, Alarmdauer, offener Sensor) wird auf alle Modi übertragen. Sicherung: `schemas.SYSTEM_OPTIONS_SCHEMA` kennt die Schlüssel je Modus.
- Panel: Modusleiste (`data-scope`, Ansicht, nicht Teil des Entwurfs) in `system.js`; `d.per[modus]`.
- Nicht je Modus (bewusst): Eingangssensoren (`entry_sensors`, eine Liste je Anlage), Code zum Scharfschalten.
- Tests: `tests/test_mode_settings.py` (12) inkl. Pflichtfällen; Panel-Suite list-e2e angepasst.

## Stand (0.9.0, Meldungen)

- 0.7.0 und 0.8.0 haben keinen Tag bekommen: im CHANGELOG "Nicht veröffentlicht", in 0.9.0 enthalten.
- Meldungen je Art: `NOTIFY_TYPES` (Art → Gruppe alarm/maintenance), `NOTIFY_TYPE_DEFAULTS` (an, kritisch), `settings.notify["types"][art] = {enabled, critical, volume}`. `notify.build_payload(cfg, art, …)` baut jede Meldung (auch Wartung und Update); `valid_notify` übernimmt die alte Form (`events`, `critical`, `volume`) je Art, auch aus alten Sicherungen. WebSocket `save_notify` führt `types` je Art zusammen, `test_notify` nimmt `kind`.
- Sensor-Option `report_only` ("Nur melden"): `controller._report` (höchstens eine Meldung pro Sensor und Minute, Ereignis `sensor_report`), geht vor Bestätigung, gilt auch für "immer aktiv". Nie voreingestellt.
- Panel: `notify.js` neu (Kapitel, Empfänger als Dropdown mit Pillen, Arten mit Schaltern, Regler und Test je Art).
- Tests: `tests/test_notify_types.py`; Panel-Suiten actions-e2e/hardening-e2e angepasst.

## Stand (0.8.0, Design und Entwürfe)

- 0.7.0 hat keinen Tag bekommen: im CHANGELOG "Nicht veröffentlicht", in 0.8.0 enthalten.
- Kapitel: `chapter(title, body, hint)` in `panel/common.js`, CSS `.ag-chap` (Strich vor dem Titel); Anlage und Updates sind umgestellt, Meldungen folgen mit 0.9.0.
- Seiten gleiten: `.ag-pane` mit `from-right`/`from-left` (`_slide` in `alarmageddon-panel.js`, Richtung nach Reihenfolge `SUBS`).
- Entwürfe: Reiterwechsel (Unterreiter und Übersicht) verwirft nichts mehr; `_renderDots()` setzt `has-edit` (gelb) an Reiter mit offenen Änderungen, `has-dot` (blau) für Updates. Rückfrage (`_guard`) nur beim Wechsel der Anlage; `beforeunload` warnt beim Neuladen.

## Stand (0.7.0, Updates)

- 0.6.0 ist veröffentlicht (Tag `v0.6.0`, Vorabversion). 0.7.0 ist die Update-Funktion nach dem Vorbild von ha-device-panel (`update_check.py`, `http_limit.py` aus dort, Panel `updates.js`).
- Server: eine Abfrage der GitHub-Releases (stabil und Vorabversion), 6 Stunden Zwischenspeicher, auf Knopfdruck frühestens nach 1 Minute, Fehler → letzter guter Stand. Tägliche Prüfung mit zufälligem ersten Lauf (5 bis 65 Minuten nach dem Start), Reparatur-Meldung `update_available`, Push "Update verfügbar" (einmal pro Version, Ereignis `update_available` unter Benachrichtigungen, an die Wartungs-Empfänger), Auto-Update über `update.install` der HACS-Entität (erkannt am `release_url`), danach Reparatur `restart_required`. Nie ein Neustart von Home Assistant durch die Integration.
- Einstellungen `settings.update` (`check`, `prerelease` mit None = folgt der installierten Version, `auto_update`), in der Sicherung; `update_notified` intern, nicht in der Sicherung.
- WebSocket: `version`, `release_notes`, `set_update`. Release Notes aus `CHANGELOG(.de).md` am Tag (mit und ohne "v"), Rückfall Text des GitHub-Releases.
- Tests: `tests/test_update_check.py`; in `tests/conftest.py` patcht die autouse-Fixture `github_offline` das Netz (nie echte Abfragen); Panel-Suite `updates-e2e`.
- Nicht im echten HA geprüft: Installation über echtes HACS (`update.install`), Verhalten der HACS-Entität bei Vorabversionen, Neustart aus dem Panel.
- Neue Wünsche des Nutzers (offen, in dieser Reihenfolge geplant): Design wie Device Panel (Kapitel mit Titelstrich, gleitende Reiter, Änderungen gehen beim Reiterwechsel nie verloren), Meldungen neu (je Art kritisch/Lautstärke, Empfänger als Dropdown mit Pillen), Sensor-Option "nur melden statt auslösen", Einstellungen je Modus, Aktionen-Editor ohne JSON mit Geräte-Fähigkeiten, Testknopf je Aktion, Greifer, Protokoll-Reiter mit Alarm-Aufzeichnung als Zeitachse.

## Stand (0.6.0, Zeitplan und Modi)

- 0.3.0, 0.4.0 und 0.5.0 haben keinen Tag bekommen: im CHANGELOG "Nicht veröffentlicht", in 0.6.0 enthalten. 0.6.0 ist als Vorabversion veröffentlicht (Tag `v0.6.0`, Commit e45a617); davor `v0.2.0`.
- Modi frei wählbar (Wunsch des Nutzers, ändert die frühere Vorgabe "Anwesend und Abwesend immer da", CLAUDE.md nachgeführt): Optionen `home_enabled`, `away_enabled`, `night_enabled` (`MODE_ENABLED_KEY`/`MODE_ENABLED_DEFAULT`), `controller.modes` daraus, `supported_features` nur für eingeschaltete Modi. `save_system` lehnt "kein Modus" (`no_mode`) und das Abschalten des aktiven Modus (`mode_active`) ab. Panel: Chips "Modi" in `system.js`.
- Zeitplan: `scheduler.py` (`async_track_time_change` pro aktiver Regel, Wochentag lokal, nie während `pending`/`triggered`, ohne Code, `changed_by` "Zeitplan"/"Schedule", Ereignis `schedule_skipped`). Regeln in `options["schedules"]`, Prüfung `schemas.SCHEDULES`, in der Sicherung enthalten. Panel: Karte "Zeitplan" in `system.js` (Teil des Entwurfs).
- Tests: `tests/test_schedule.py`, HomeKit (`test_only_chosen_modes_in_apple_home`, `test_scheduled_arm_shows_in_apple_home`), Panel-Suite `schedule-e2e`.
- Der Optionsdialog von HA kennt weiterhin nur "Nacht"; Anwesend/Abwesend nur im Panel.

## Stand (0.5.0, Wartung und Härtung)

- 0.3.0 und 0.4.0 haben keinen Tag bekommen: im CHANGELOG "Nicht veröffentlicht", in 0.5.0 enthalten. Letzter veröffentlichter Tag: `v0.2.0` (Vorabversion).
- Wartung: `maintenance.py` (eine Instanz für alle Anlagen in `hass.data`, Prüfung alle 15 Minuten, erste nach 5 Minuten; gemeldet wird einmal pro Problem, gemerkt im Store `alarmageddon.maintenance`; Batterie erst wieder nach Schwelle + 5 Punkte). Einstellungen in `notify` (`battery_threshold`, `offline_minutes`, Ereignisse `battery_low`, `sensor_unavailable`). Senden über `notify.async_send`.
- Prognose: `forecast.py` (Regression ab letztem Sprung nach oben, mindestens 3 Tage), WebSocket `battery_forecast`, Spalte "Prognose" in `list.js`, höchstens einmal pro Stunde abgerufen. `recorder` in `after_dependencies`.
- Zwei-Sensor-Bestätigung: Sensoroption `confirm` (nie voreingestellt), Fenster `confirm_window` pro Anlage, `controller._confirmed`, Ereignis `unconfirmed` im Protokoll. Tests `test_confirm.py` inkl. der Pflichtfälle (Deaktivieren in Verzögerung, Neustart im Alarm, Ausfall im scharfen Zustand).
- Codes pro Person: `options["codes"]` (Hash, Salz, Name, Benutzer), `code.match_code` prüft alle, `controller._async_check_code` gibt den Namen zurück; WebSocket `add_code`/`remove_code`; Panel `system.js` (Dialog `ag-codes`). Der Hauptcode bleibt im Optionsdialog.
- Sicherung: `backup.py` (nur Schlüssel aus `schemas.SYSTEM_OPTIONS_SCHEMA`, nie Codes; Ziel je Anlage frei wählbar seit 1.33.0: bestehende Anlage, neu oder überspringen, ohne Wahl der gleiche Name; Vorschau mit `dry_run`), WebSocket `export`/`import`. Schrittprüfung jetzt in `schemas.py` (auch für das Panel).
- Panel-Suite `hardening-e2e` (Bestätigung, Fenster, Codes, Sicherung, Wartung, Ereignistexte).
- Nicht im echten HA geprüft: Download/Upload der Sicherung in der Companion App, Prognose mit echtem Verlauf.

## Stand (0.4.0, Aktionen und Benachrichtigungen)

- 0.3.0 hat keinen Tag bekommen: im CHANGELOG "Nicht veröffentlicht", in 0.4.0 enthalten. Letzter veröffentlichter Tag: `v0.2.0` (Vorabversion).
- Server: `notify.py` (`Notifier`, Texte en/de, kritische Meldung iOS/Android, Push-Aktion "Deaktivieren" nur mit `disarm_action`), `workflow.py` (`WorkflowRunner`: Schritte `notify`, `wait`, `action`, `sound`; Schnappschuss vor dem ersten Schritt im Store `alarmageddon.workflow.<entry_id>`, Sonos zusätzlich `sonos.snapshot`; Wiederherstellen beim Verlassen von "triggered", auch nach Neustart; Test endet nach `TEST_SECONDS`). Warten über `async_call_later` mit Future (nicht `asyncio.sleep`, siehe LEARNINGS), Lauf als Hintergrund-Task.
- Einstellungen: Benachrichtigungen global in `settings.py` (`notify`, `valid_notify`), Abläufe pro Anlage in `options["workflows"]` (Prüfung mit `STEP_SCHEMAS` in `websocket_api.py`).
- Töne: `sounds/*.wav` aus `scripts/make_sounds.py`, öffentlich unter `/alarmageddon_sounds` (Medienplayer haben kein Login); URL über `get_url` (lokal bevorzugt).
- Panel: `actions.js` (Zeitachse, Auswahl der Bausteine, Editor im Dialog `ag-step`), `notify.js`; Unterreiter Sensoren, Aktionen, Benachrichtigungen, Anlage (Handy: kurze Texte).
- Tests: `tests/test_actions.py` (16), Panel-Suite `actions-e2e` (Ablauf bearbeiten, verschieben, löschen, speichern, testen; Benachrichtigungen; je Sprache, Desktop und Handy).
- Sicherung: Abläufe liegen in den Optionen des Config Entry, Benachrichtigungen und Voreinstellungen im Store; beides ist in der Sicherung von HA enthalten. Ein eigener Export/Import im Panel fehlt noch (Backlog).
- Nicht im echten HA geprüft: Sonos-Wiedergabe der Töne, kritische Meldung auf echtem iPhone/Android, Push-Aktion.

## Stand (0.3.0, Optionen pro Sensor, neues Panel)

- Wunsch des Nutzers (2026-11-08): ohne Mockups weiterarbeiten, bis der Backlog leer ist. Für die offenen Fragen aus `docs/mockups/sensor-options-v1` gelten die Empfehlungen (Optionen im Seitenblatt A, "Bereit" als Zeile B); Ebenen der Sensor-Optionen: Voreinstellung je Sensorart (global, `settings.py`) › eigener Wert pro Sensor und Anlage (`options["sensor_options"]`). Vom Nutzer bestätigt (2026-11-08): zwei Ebenen reichen.
- Aufbau des Panels nach Vorgabe des Nutzers: Übersicht (Steuerung der Anlagen + Warnkachel, darunter Liste wie Device Panel in `list.js`, Ansicht in `localStorage`), Konfiguration mit Reitern Sensoren (`sensors.js`, Raster + Seitenblatt + Voreinstellungen) und Anlage (`system.js`). Gemeinsames in `common.js`.
- Controller: `option()`, `always_sensors()`, `blocking_sensors()`, `ready()`, "Scharf, sobald geschlossen" mit `ARM_ON_CLOSE_SETTLE` (3 s) und Rückfall auf die ursprüngliche Verzögerung, Sensorausfall im scharfen Zustand als Ereignis (`add_event_listener`) und optional Alarm.
- Entitäten "Bereit für …" (`binary_sensor`, unique_id `<entry>_ready_<mode>`).
- WebSocket: `data` liefert `presets`, Sensorart, Empfang, Gerätedaten; `save_zones` nimmt `sensor_options`; neu `save_presets`, `save_system`.
- Tests: `tests/test_sensor_options.py`; Panel-Suiten `overview-e2e`, `groups-e2e` (jetzt Konfiguration › Sensoren), `list-e2e` (Liste, Seitenblatt, Voreinstellungen, Anlage).
- Offen für 0.4.0/0.5.0: siehe "Nächste Schritte".

## Stand (0.2.0, Phase 2: Panel)

- Panel: `panel/panel.html` (aus ha-device-panel, holt hass aus dem Elternfenster, überträgt Theme-Variablen), `panel/alarmageddon-panel.js` (Vanilla Web Component), `panel/strings.js` (en/de, `pickLang`, `translate`), `panel/styles.js`. `PANEL_VERSION` in `const.py` (Cache-Buster) bei jeder Änderung unter `panel/` erhöhen.
- Registrierung: `panel.py` (iframe-Panel, statische Pfade einmal pro Lauf, Panel entfernt erst mit der letzten Anlage). WebSocket: `websocket_api.py` (`alarmageddon/data`, `save_zones`, `arm`; nur Administratoren; Fehler als Schlüssel, Texte im Panel). Ereignisse: `events.py` (Store `alarmageddon.events.<entry_id>`, die letzten 50, beim Entfernen gelöscht).
- Übersicht A: Karten, Modus als Reiterleiste mit Kapsel (sofort verschoben, nach Fehler zurück), Code-Dialog erst nach Fehler `invalid_code`/`code_arm_required` ohne Code (Standardcode von HA geht ohne Eingabe), Alarm-Band, Countdown aus Attribut `deadline`, letzte Ereignisse.
- Sensorgruppen B: Tabelle, Ziehen über Felder (Pointer-Ereignisse am Fenster, Wert vom ersten Feld), "Alle" pro Spalte für die gefilterten Zeilen, Eingangsverzögerung nur in aktiver Zone (fällt beim Entfernen aus allen Zonen weg), Entwurf mit Rückfrage. Handy (< 600 px, Attribut `narrow`): Karten mit Zonen-Knöpfen, Reiter mit Symbol und kurzem Text.
- Tests: Python `tests/test_websocket.py`; Panel `tests/panel` (Nachbau `sim/ha-sim.html` mit derselben Logik wie der Server, Suiten `overview-e2e`, `groups-e2e`, je Sprache Desktop und Handy). Lokal: `cd tests/panel && npm ci && CHROMIUM_PATH=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome node run.mjs`.
- 0.1.0 wurde nie veröffentlicht; 0.2.0 enthält sie (CHANGELOG-Vermerk). 0.2.0 ist als Vorabversion veröffentlicht (Tag `v0.2.0`, Commit df6a001).
- Nicht im echten HA geprüft: iframe in der echten Oberfläche (Theme, Zurück-Pfeil nach "Alarmanlage hinzufügen", more-info), Companion App auf echtem Handy.

## Stand (0.1.0, Phase 1: Kern)

- `custom_components/alarmageddon/`: `controller.py` (Zustandsautomat, Zeitgeber über `async_track_point_in_utc_time` mit `@callback`-Methoden, Sensorüberwachung, Code mit Sperre, Wiederherstellung), `alarm_control_panel.py` (Entität mit `RestoreEntity`, Zusatzdaten `mode`, `deadline`, `bypassed`, `triggered_by`, `changed_by`), `binary_sensor.py` (eine Entität pro Zone), `config_flow.py` (Anlegen: Name, Nacht, Code; Optionen in vier Abschnitten als Übergang bis zum Panel), `code.py` (PBKDF2, Vergleich in konstanter Zeit).
- Optionen-Schlüssel (das Panel schreibt in Phase 2 dieselben): `zone_home/away/night`, `entry_sensors`, `exit_delay_home/away/night`, `entry_delay`, `trigger_time`, `night_enabled`, `open_sensors` (`block`/`bypass`), `code_arm_required`, `code_hash`, `code_salt`.
- Neuladen bei jeder Optionsänderung; der Zustand übersteht das über `RestoreEntity` (Test `test_options_change_keeps_state`). "Nacht" aus entfernt die Zonen-Entität aus der Registry.
- HomeKit: echtes Zubehör `SecuritySystem` im Test (`tests/test_homekit.py`, Pakete in `requirements_test.txt`). Befunde in LEARNINGS.
- Brand: `docs/brand/icon.svg`, `logo.svg`, `render.mjs` → `custom_components/alarmageddon/brand/`. Bleibt vorerst so (Entscheid des Nutzers); Vorschläge in `docs/mockups/brand-v1`.
- Nicht im echten HA geprüft (nur pytest mit echtem HA-Kern). Offen für die Prüfung im echten HA: Optionsdialog mit Abschnitten in der Oberfläche, HomeKit mit echtem iPhone.
- Tests: `pip install -r requirements_test.txt`, dann `python -m pytest`.

## Stand (2026-11-08, Konzeptphase)

- Konzept mit bedienbaren Mockups: `docs/mockups/konzept-v1/konzept.html`
  (Bilder im selben Ordner), Zusammenfassung in `docs/CONCEPT.md`.
- Regeln aus ha-device-panel übernommen: `CLAUDE.md`, `docs/LEARNINGS.md`,
  `docs/DESIGN.md`, Skill `.claude/skills/apple-design`,
  `.github/scripts/changelog_section.py` (mit Deutsch-Option).
- GitHub Actions, `pytest.ini`, `hacs.json` und Tests der Übersetzungen kamen mit 0.1.0.

## Nächste Schritte

Backlog leer (Stand 0.6.0). Offen:

1. Prüfung im echten HA und mit echten Geräten (Sonos, iPhone, Android,
   HomeKit), siehe "Nicht im echten HA geprüft" in den Abschnitten oben.
2. Optional: PR an home-assistant/brands, Logo (Entscheid: vorerst so).

## Zweisprachigkeit EN/DE (verbindlich)

Alles, was der Nutzer sieht, gibt es auf Englisch und Deutsch. Englisch ist
Grundsprache und Rückfall. Kein Text ist fest im Code.

| Bereich | Ort | Regel |
| --- | --- | --- |
| Panel | `panel/strings.js` | `STRINGS.en` und `STRINGS.de` mit identischen Schlüsseln; Sprache aus `hass.locale.language` (`de`/`de-*` → Deutsch, sonst Englisch) |
| HA-Oberfläche (Config Flow, Optionen, Entitäten, Dienste, Reparaturen) | `strings.json`, `translations/en.json`, `translations/de.json` | `strings.json` identisch mit `en.json`; `de.json` mit denselben Schlüsseln |
| Serverseitige Texte (Push, Reparaturen mit Platzhaltern) | Python | `hass.config.language`, `de`/`de-*` → Deutsch, sonst Englisch |
| README | `README.md` (EN), `README.de.md` (DE) | gleicher Aufbau, gegenseitig verlinkt, immer beide im selben Commit |
| CHANGELOG | `CHANGELOG.md` (EN), `CHANGELOG.de.md` (DE) | gleicher Aufbau (Keep a Changelog), gegenseitig verlinkt, immer beide im selben Commit |
| Release Notes | Text für den Nutzer | Englisch und Deutsch, aus beiden CHANGELOG-Dateien |
| Mockups | `docs/mockups/` | Deutsch |

Tests (ab Phase 1, wie in ha-device-panel): gleiche Schlüssel in allen
Textdateien, kein "ß", Sprachwahl `pickLang`, gleicher Aufbau von README und
CHANGELOG in beiden Sprachen. Panel-Suiten laufen je Sprache auf Desktop und
Handy.
