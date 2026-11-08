# Analyse: Alarmo (nielsfaber/alarmo)

Stand: Commit c6bb13a vom 2026-10-29, rund 5600 Zeilen Python, Panel in
TypeScript/Lit, 1269 Issues (28 offen). Ausgewertet am 2026-11-08: README,
Quellcode (`automations.py`, `sensors.py`, `panel.py`) und die Issues mit
den meisten Reaktionen und Kommentaren.

## Was Alarmo kann

- Eine Integration mit mehreren "Areas" (je eine `alarm_control_panel`-Entität) und optional einer "Master"-Entität, die alle Areas gemeinsam schaltet.
- Fünf Modi: Abwesend, Anwesend, Nacht, Urlaub, Benutzerdefiniert, je mit eigenen Verzögerungen.
- Sensortypen aus der Geräteklasse (Tür, Fenster, Bewegung, Sabotage, Umwelt) mit Voreinstellungen.
- Optionen pro Sensor: Ausgangsverzögerung nutzen, Eingangsverzögerung nutzen, "immer aktiv" (Rauch, Wasser auch unscharf), "offen nach dem Scharfschalten erlaubt", "scharf nach dem Schliessen", automatisch umgehen (pro Modus), "bei nicht verfügbar auslösen".
- Sensorgruppen gegen Fehlalarme: Ein einzelner Sensor löst nicht aus, erst zwei verschiedene innerhalb einer Zeit.
- Mehrere Benutzer mit eigenem Code und Rechten, ein- und ausschaltbar.
- Aktionen: Push-Meldungen mit Platzhaltern und Aktionsknöpfen, Geräte ein/aus (nur switch, light, script, input_boolean).
- Ereignisse für Automationen (`alarmo_failed_to_arm`, `alarmo_command_success`, `alarmo_ready_to_arm_modes_updated`), MQTT für Wandpanels, eigene Karte.

## Schwächen (aus Code und Issues)

| Thema | Befund | Beleg |
| --- | --- | --- |
| Panel bricht bei HA-Updates | Custom Panel, das interne Elemente des HA-Frontends nachlädt. Jedes grössere Frontend-Update kann es zerstören. | Issues "2025.5.0 breaks configuration page" (17 Reaktionen), "Dropmenu dont work – HA 2026.1" (14), "Tabs aren't links anymore" (12), "side panel stuck on Loading" |
| Aktionen ohne Stopp | Aktionen laufen "feuern und vergessen" (`blocking=False`). Wer die Sirene beim Alarm einschaltet, muss selbst eine zweite Aktion "beim Deaktivieren ausschalten" anlegen. | `automations.py`, `async_execute_automation` |
| Aktionen eingeschränkt | Nur ein/aus für vier Domains, keine Verzögerung, keine Abfolge, keine Eskalation. Für alles andere: eigene HA-Automation in YAML. | README "Actions", Issues "Call any service", "Allow Actions to control Fan" |
| Fehler beim Speichern von Aktionen | Wiederholt "Can't save action", "extra keys not allowed". | Issues mit 11 bzw. 9 Reaktionen |
| Master-Entität mehrdeutig | Sind manche Areas scharf und andere nicht, behält der Master einfach den alten Zustand. Doppelte Ereignisse, HA hängt beim Schalten. | README "Alarm Master", Issues "Changing state of master entity, HA stops responding" (45 Kommentare) |
| Neustart | Sensor kommt nach Neustart aus "nicht verfügbar" zurück und löst aus (offen). "Alarmo changed to armed when restarting HA". | offenes Issue, HomeKit-Issue mit 14 Kommentaren |
| Fehlgeschlagenes Scharfschalten | Der Dienstaufruf meldet keinen Fehler, Skripte laufen weiter. | offenes Issue "Refused arm command returns normally" |
| Rechte | Nicht-Administratoren können die Konfiguration ändern. | offenes Issue |
| Keine Wartung | Kein Protokoll der Benutzeraktionen, keine Störungsanzeige, keine Überwachung im unscharfen Zustand. | offene Issues "Audit trail", "Trouble indication", "Sensor Watch", "Check the configuration like Spook" |
| Fachbegriffe | "Armed custom bypass", "Arm after closing", "Allow open after arming": verständlich nur mit Handbuch. Das README ist sehr lang. | README |

## Was wir übernehmen

- **Optionen pro Sensor** mit verständlichen Namen statt Fachbegriffen:
  "Eingang" (Eingangsverzögerung, haben wir), "Immer aktiv" (Rauch, Wasser, auch unscharf),
  "Darf beim Scharfschalten noch offen sein" (Bewegungsmelder auf dem Weg zur Tür),
  "Scharf, sobald geschlossen" (Haustür beendet die Ausgangsverzögerung),
  "Ausfall gilt als Alarm" (nicht verfügbar im scharfen Zustand).
- **Sensortyp aus der Geräteklasse** mit sinnvollen Voreinstellungen, damit die meisten nichts einstellen müssen.
- **Bestätigung durch zwei Sensoren** gegen Fehlalarme (Alarmo: Sensorgruppen), bei uns als Option pro Zone oder Bereich.
- **"Bereit zum Scharfschalten"** pro Modus, sichtbar in der Übersicht und als Entität für Automationen und Apple Home.
- **Ereignisse für Automationen** (Scharfschalten fehlgeschlagen, Befehl ausgeführt) zusätzlich zum Fehler beim Dienstaufruf.
- **Mehrere Codes**, je einem HA-Benutzer zugeordnet, damit "geändert von" stimmt.
- **Glasbruch** (`glass_break`, neue Geräteklasse seit HA 2026.10) als Sensortyp.

## Was wir besser machen

1. **Panel unabhängig vom HA-Frontend:** iframe-Panel ohne interne HA-Elemente (wie ha-device-panel). Ein HA-Update kann es nicht zerstören.
2. **Stopp beim Deaktivieren eingebaut:** jeder Schritt hat seine Gegenaktion, auch nach einem Neustart.
3. **Beliebige HA-Aktionen** mit Zeitachse, Verzögerung und Eskalation, dazu fertige Vorlagen (Sirene, Rollläden, Sonos, Licht, kritische Push-Meldung). Kein YAML nötig.
4. **Testknopf** für jedes Szenario und jede Meldung (bei Alarmo nur Wunsch).
5. **Mehrere Anlagen als eigene Geräte** statt Areas mit mehrdeutigem Master. Eine gemeinsame Steuerung, falls gewünscht, schaltet nur, wenn alle Anlagen den Befehl annehmen, und zeigt einen gemischten Zustand ehrlich an.
6. **Neustartfest und getestet:** kein Fehlalarm durch "nicht verfügbar" → "offen", abgelaufene Eingangsverzögerung wird Alarm (haben wir in 0.1.0).
7. **Fehler werden gemeldet:** abgelehnter Befehl wirft einen Fehler mit verständlichem Text (haben wir in 0.1.0).
8. **Nur Administratoren** ändern die Konfiguration (haben wir).
9. **Wartung und Protokoll:** Batterie, Ausfälle, Prognose, wer wann geschaltet hat.
10. **Verständliche Sprache** und Hilfe im Panel statt langem README.

## Bewusst (noch) nicht

- MQTT für Wandpanels: erst, wenn jemand es braucht.
- Eigene Dashboard-Karte: die Alarm-Karte von HA und Apple Home genügen vorerst.
- Modi "Urlaub" und "Benutzerdefiniert": HomeKit bildet sie nicht eigenständig ab (Urlaub erscheint als "Abwesend").
