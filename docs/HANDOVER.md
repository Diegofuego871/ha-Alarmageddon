# Übergabe: Stand und nächste Schritte

Einstieg für jede neue Claude-Code-Session. Zuerst diese Datei lesen, dann
`CLAUDE.md`, `docs/CONCEPT.md`, `docs/LEARNINGS.md`, `docs/DESIGN.md`.

- 0.13.0: `controller.record(kind, **data)` (nur für die Aufzeichnung, nicht ins Ereignisprotokoll) wird von `workflow._record` (Schritt gestartet) und `Notifier._send` (Meldung) gerufen; Einträge `step` und `notified` entfallen nie wegen der Grenze.

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
- Sicherung: `backup.py` (nur Schlüssel aus `schemas.SYSTEM_OPTIONS_SCHEMA`, nie Codes; Zuordnung über den Namen, Vorschau mit `dry_run`), WebSocket `export`/`import`. Schrittprüfung jetzt in `schemas.py` (auch für das Panel).
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
