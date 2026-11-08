# Alarmageddon

[English](https://github.com/Diegofuego871/ha-Alarmageddon/blob/main/README.md)

Alarmanlage für Home Assistant mit geführter Einrichtung und eingebauter Wartung der Sensoren.

> **Status:** frühe Vorabversion (0.12.0). Kern der Alarmanlage, Seitenpanel, Alarmaktionen, Benachrichtigungen, Wartung, Zeitplan und Sicherung funktionieren. Noch von wenigen Nutzern geprüft: Probleme bitte als Issue melden.

## Funktionen

- **Alarm-Entität:** ein `alarm_control_panel` mit den Modi "Anwesend", "Abwesend" und "Nacht", pro Alarmanlage einzeln ein- und ausschaltbar (Standard: Anwesend und Abwesend), Ausgangs- und Eingangsverzögerung.
- **Zeitplan:** zu festen Zeiten an gewählten Wochentagen in einem gewählten Modus scharf schalten oder deaktivieren.
- **Mehrere Alarmanlagen:** beliebig viele (zum Beispiel Haus und Garage). Jede ist ein eigenes Gerät mit eigener Alarm-Entität.
- **Apple HomeKit:** Jede Alarmanlage lässt sich über die HomeKit-Bridge von Home Assistant an Apple Home übergeben.
- **Zonen:** eine Entität pro Zone, die "ein" ist, sobald ein Sensor der Zone offen ist.
- **Sicher beim Neustart:** Verzögerungen und Alarme laufen nach einem Neustart weiter. Eine Eingangsverzögerung, die während des Neustarts abgelaufen ist, wird zum Alarm.
- **Code:** optional, 4 bis 8 Ziffern, nur als Hash gespeichert. Nach fünf falschen Codes eine Minute gesperrt.
- **Jede Funktechnik:** Alarmageddon nutzt nur Entitäten von Home Assistant. WLAN, Thread/Matter, Zigbee, Z-Wave und Bluetooth funktionieren gleichermassen.

- **Seitenpanel, Übersicht:** Steuerung aller Alarmanlagen mit "Bereit für" je Modus, eine Kachel mit dem Status (alles in Ordnung oder Warnungen) und eine Liste aller Sensoren mit Suche, Filtern und Ansichtseinstellung (Spalten, Gruppierung, Sortierung). Sie zeigt Zustand, Batterie, Empfang, Firmware, Modell und letzte Änderung.
- **Seitenpanel, Konfiguration:** Sensoren (Zonen als Raster mit Ziehen über Felder, Optionen pro Sensor im Seitenblatt, Voreinstellungen je Sensorart) und Anlage (Modi, Verzögerungen, Verhalten bei offenen Sensoren, Zeitplan, Codes, Sicherung). Auf dem Handy als Karten und Blätter von unten.
- **Optionen pro Sensor:** immer aktiv (Rauch, Wasser), darf beim Scharfschalten offen sein, scharf sobald geschlossen, Ausfall gilt als Alarm, braucht einen zweiten Sensor, nur melden. Voreinstellungen je Sensorart, eigene Werte pro Sensor.
- **Bereit zum Scharfschalten:** eine Entität pro Modus mit den verhindernden Sensoren.
- **Protokoll und Alarm-Aufzeichnung:** jeder Alarm als grafische Zeitachse (welcher Sensor wann angesprochen hat, bis zum Quittieren) und alle Ereignisse in einem eigenen Reiter.
- **Alarmaktionen:** ein grafischer Ablauf pro Alarm: Push-Meldung, Geräte schalten, Rollläden, Alarmton auf Medienplayern (Sonos und andere), Warten, Skript, jede Aktion. Geräte kehren nach dem Alarm in den Zustand davor zurück.
- **Benachrichtigungen:** kritische Push-Meldungen mit Lautstärke, Empfänger getrennt für Alarme und Wartung, wählbare Ereignisse.
- **Wartung:** Meldungen bei schwacher Batterie und nicht erreichbaren Sensoren (einmal pro Problem), Batterieprognose in der Liste.
- **Zwei-Sensor-Bestätigung:** Bewegungsmelder können vor dem Auslösen einen zweiten Sensor verlangen, gegen Fehlalarm.
- **Codes pro Person:** eigener Code pro Person, auf Wunsch mit einem Benutzer von Home Assistant verknüpft; "geändert von" zeigt die Person.
- **Sicherung:** alle Einstellungen als Datei, ohne Codes.

## Installation

1. HACS → drei Punkte → "Benutzerdefinierte Repositories" → `https://github.com/Diegofuego871/ha-Alarmageddon`, Typ "Integration".
2. "Alarmageddon" installieren und Home Assistant neu starten.
3. Einstellungen → Geräte & Dienste → "Integration hinzufügen" → "Alarmageddon".

Vorabversionen: Alarmageddon erscheint vorerst als Vorabversion. In HACS beim Repository den Schalter "Pre-release" einschalten (Schalter am HACS-Gerät des Repositorys).

## Einrichtung

1. **Neue Alarmanlage:** Name, Modus "Nacht" und optional ein Code.
2. **Seitenpanel "Alarmageddon"** (erscheint für Administratoren in der Seitenleiste): Konfiguration › Sensoren ordnet Sensoren den Zonen "Anwesend", "Abwesend" und "Nacht" zu; der Pfeil am Ende einer Zeile öffnet die Optionen des Sensors. Konfiguration › Anlage setzt Modi, Verzögerungen, Verhalten und den Zeitplan. Änderungen gelten mit "Speichern".
3. **Optionen** (Einstellungen → Geräte & Dienste → Alarmageddon → "Konfigurieren"):
   - **Zonen:** Sensoren für "Anwesend", "Abwesend" und "Nacht" (dasselbe wie im Seitenpanel). Ein Sensor kann in mehreren Zonen sein.
   - **Verzögerungen:** Ausgangsverzögerung pro Modus, Eingangsverzögerung, Sensoren mit Eingangsverzögerung (zum Beispiel die Haustür), Alarmdauer.
   - **Verhalten:** Modus "Nacht", offener Sensor beim Scharfschalten (verhindern oder umgehen), Code zum Scharfschalten.
   - **Code:** neuen Hauptcode setzen oder entfernen. Persönliche Codes: siehe "Codes pro Person".

Nur ein echter Wechsel von "zu" auf "offen" löst aus. Ein Sensor, der aus "nicht verfügbar" als offen zurückkommt, löst nicht aus.

## Alarmaktionen

Seitenpanel › Konfiguration › Aktionen. Alarmanlage und Alarm wählen ("Anwesend", "Abwesend", "Nacht" oder "immer aktiv" für Rauch, Wasser und Gas), dann Schritte mit "+" hinzufügen:

| Schritt | Macht |
| --- | --- |
| Push-Meldung | Alarmmeldung an die Empfänger für Alarme (siehe Benachrichtigungen) |
| Gerät schalten | Lichter, Steckdosen, Rollläden, Schlösser, Ventilatoren, Sirenen und mehr. Man wählt die Geräte und sieht nur, was sie können (ein, aus, umschalten, öffnen, schliessen, verriegeln) und beim Einschalten die Einstellungen, die sie unterstützen (Helligkeit, Farbtemperatur, Position, Stufe, Temperatur) |
| Alarmton abspielen | Einer von fünf Tönen auf Medienplayern: Ton als Dropdown mit Vorschau auf diesem Handy oder Computer (nicht auf der echten Anlage), Lautstärke, Wiederholungen |
| Warten | Hält die folgenden Schritte an |
| Szene oder Skript | Startet eine Szene oder ein Skript |
| Eigene Aktion | Jede Aktion von Home Assistant mit ihren Feldern (kein JSON) |

- **Test pro Schritt:** Der Abspielknopf an einem Schritt führt nur diesen Schritt auf den echten Geräten aus, nach einer Rückfrage. Schritte verschiebt man am Griff links (mit Finger oder Maus ziehen, oder Pfeiltasten am Griff).
- **Zurück in den Zustand davor:** Geräte mit dem Pfeil-Symbol kehren beim Deaktivieren oder am Ende der Alarmdauer in den Zustand vor dem Alarm zurück (ein/aus, Helligkeit, Position, Lautstärke, Quelle; Sonos mit eigenem Schnappschuss samt Gruppen). Bei Alarmtönen standardmässig an.
- **Deaktivieren stoppt alles,** auch nach einem Neustart von Home Assistant mitten im Alarm. Ein fehlerhafter Schritt hält die übrigen nicht auf.
- **Test** führt den gespeicherten Ablauf ohne Alarm aus und endet spätestens nach 60 Sekunden.
- **Medienplayer** holen die Töne bei Home Assistant (`/alarmageddon_sounds/…`). Der Player muss die lokale Adresse von Home Assistant erreichen (Einstellungen → System → Netzwerk).

## Benachrichtigungen

Seitenpanel › Konfiguration › Benachrichtigungen, für alle Alarmanlagen:

- **Empfänger** getrennt für Alarme und Wartungsmeldungen: jeden `notify`-Dienst (zum Beispiel `notify.mobile_app_<handy>` der Companion App) im Dropdown wählen; die gewählten erscheinen als Pille mit x.
- **Einstellungen je Meldungsart:** Alarm, Sensor meldet (kein Alarm), Sensor im scharfen Zustand nicht erreichbar, Eingangsverzögerung, Scharfschalten nicht möglich, scharf, deaktiviert, Batterie schwach, Sensor nicht erreichbar, Update verfügbar. Jede Art lässt sich ein- und ausschalten, **kritisch** (ertönt auch im Lautlos- und Nicht-stören-Modus) oder nicht einstellen und hat ihre eigene **Lautstärke**. Die Lautstärke gilt für iOS; Android spielt kritische Meldungen im Alarmkanal (`alarm_stream`), dessen Lautstärke stellst du am Handy ein. Jede Art hat einen Knopf "Testmeldung senden" (mit den gespeicherten Einstellungen).
- **Nur melden** (Option pro Sensor): Ein Sensor, der oft ohne Einbruch ansprechen oder dessen Batterie zur Neige geht, schickt im scharfen Zustand die Meldung "Sensor meldet", statt den Alarm auszulösen. Höchstens eine Meldung pro Sensor und Minute.
- **Knopf "Deaktivieren" in der Meldung:** standardmässig aus. iOS fragt nach Face ID oder dem Code des Geräts, Android nicht: Wer das entsperrte Handy hält, kann deaktivieren.
- **Wartung:** schwache Batterie (Schwelle, Standard 20 %) und Sensoren, die länger als eine eingestellte Zeit nicht erreichbar sind (Standard 60 Minuten), gehen an die Wartungs-Empfänger. Jedes Problem einmal, mehrere in einer Meldung; erneut nach Batteriewechsel oder wenn der Sensor wieder antwortet.

## Protokoll und Alarm-Aufzeichnung

Seitenpanel › Protokoll. Jeder Alarm wird vom ersten Auslöser (Eingangsverzögerung oder Alarm) bis zum Quittieren durch Deaktivieren aufgezeichnet:

- **Zeitachse je Alarm:** eine Bahn je Sensor mit einem Balken für die Zeit, in der er angesprochen hat, Linien für die Zustandswechsel (Eingangsverzögerung, Alarm, quittiert) und die Zeitachse. Darunter die Reihenfolge mit Uhrzeit und Abstand zum Anfang ("Fensterkontakt 18:03:07, Bewegungsmelder +1 min 20 s"). Der laufende Alarm wächst live; ältere sind zugeklappt.
- **Was aufgezeichnet wird:** Zustandswechsel und jede Änderung der Sensoren der Alarmanlage (angesprochen, wieder ruhig, nicht erreichbar), auch von Sensoren, die nur melden. Die Aufzeichnung läuft nach einem Neustart von Home Assistant mitten im Alarm weiter. Höchstens 20 Alarme je Alarmanlage und 300 Einträge je Alarm; bei einem flatternden Sensor bleiben die ersten Einträge und das Ende.
- **Alle Ereignisse** (Scharfschalten, Deaktivieren, Sensorausfälle, Zeitplan) stehen darunter, nicht mehr auf der Übersicht.
- Die Aufzeichnungen sind Laufzeitdaten und nicht Teil der Sicherung.

## Wartung und Batterieprognose

Die Sensorliste auf der Übersicht zeigt eine Batterieprognose ("~3 Monate"): die Zeit, bis die Batterie unter die Schwelle fällt, aus dem Verlauf des Recorders der letzten 90 Tage seit dem letzten Batteriewechsel. Ohne genug Verlauf (weniger als drei Tage oder kein Abfall) bleibt die Spalte leer. Braucht den Recorder (in Home Assistant standardmässig an).

## Codes pro Person

Seitenpanel › Konfiguration › Anlage › "Codes pro Person": Jede Person bekommt einen eigenen Code (4 bis 8 Ziffern), auf Wunsch mit einem Benutzer von Home Assistant verknüpft. Wer mit diesem Code scharf schaltet oder deaktiviert, steht als "geändert von", in den letzten Ereignissen und in den Meldungen. Aktionen eines verknüpften Benutzers ohne Code zeigen denselben Namen. Der Hauptcode aus den Optionen gilt weiter. Codes werden nur als Hash gespeichert und nie angezeigt. Falsche Codes zählen gemeinsam: Nach fünf falschen Codes ist die Anlage eine Minute gesperrt.

## Zwei-Sensor-Bestätigung

Option pro Sensor "Braucht einen zweiten Sensor" (Seitenblatt des Sensors oder Voreinstellungen je Sensorart). Im scharfen Zustand löst ein solcher Sensor nur aus, wenn ein weiterer Sensor mit dieser Option innerhalb des Bestätigungsfensters anspricht (Konfiguration › Anlage, Standard 60 Sekunden). Derselbe Sensor zweimal zählt nicht. Sensoren ohne die Option lösen wie bisher allein aus; während der Eingangsverzögerung gilt die Option nicht, und "Ausfall gilt als Alarm" löst weiterhin sofort aus. Standardmässig aus: Eine Alarmanlage soll im Zweifel alarmieren.

## Updates

Seitenpanel › Konfiguration › Updates (wie in Device Panel):

- Zeigt die installierte und die neueste Version (bei GitHub erfragt, höchstens alle 6 Stunden, "Nach Updates suchen" höchstens einmal pro Minute), die Release Notes aller Versionen dazwischen (aus dem CHANGELOG, in deiner Sprache) und "Aktualisieren".
- **Installiert wird immer über HACS** (die Update-Entität dieses Repositorys, erkannt am Link des Releases; eine andere Integration wird nie angefasst). Ohne HACS verweist das Panel auf die Installation von Hand.
- **Home Assistant startet nie von selbst neu.** Sobald die neue Version auf der Platte liegt, erscheint "Jetzt neu starten" (mit Rückfrage). Bis dahin läuft die alte Version weiter.
- **Tägliche Prüfung** (standardmässig an): meldet eine neue Version unter Einstellungen › Reparaturen und, als Ereignis "Update verfügbar" unter Benachrichtigungen, an die Wartungs-Empfänger (einmal pro Version).
- **Updates automatisch installieren** (standardmässig aus): lädt die neue Version nach der täglichen Prüfung über HACS herunter. Der Neustart bleibt bei dir.
- **Vorabversionen:** auf Wunsch angeboten. HACS installiert sie nur, wenn sein eigener Schalter "Pre-release" bei dieser Integration an ist (Entität im HACS-Gerät aktivieren und einschalten); das Panel erklärt das.
- Die Einstellungen gehören zur Sicherung.

## Einstellungen je Modus

Seitenpanel › Konfiguration › Anlage › "Einstellungen je Modus": "Anwesend", "Abwesend", "Nacht" oder "Immer aktiv" wählen und die Werte dieses Modus einstellen:

| Wert | Bedeutung |
| --- | --- |
| Ausgangsverzögerung | Zeit zum Verlassen, bevor die Anlage scharf ist (nicht bei "Immer aktiv") |
| Eingangsverzögerung | Zeit zum Deaktivieren, nachdem ein Eingangssensor aufging (nicht bei "Immer aktiv") |
| Alarmdauer | Wie lange der Alarm dauert; 0 = bis zum Deaktivieren |
| Offener Sensor beim Scharfschalten | Scharfschalten verhindern oder die offenen Sensoren umgehen (nicht bei "Immer aktiv") |
| Bestätigungsfenster | Zeit für den zweiten Sensor bei "Braucht einen zweiten Sensor" (nicht bei "Immer aktiv") |

"Immer aktiv" ist der Alarm eines immer aktiven Sensors (Rauch, Wasser), während die Anlage deaktiviert ist; es gilt nur die Alarmdauer. Anlagen aus früheren Versionen verhalten sich wie bisher: Bis ein Modus einen eigenen Wert hat, gilt der gemeinsame. Der Optionsdialog von Home Assistant setzt gemeinsame Werte und wendet einen geänderten Wert auf alle Modi an.

## Modi

Seitenpanel › Konfiguration › Anlage › "Modi": "Anwesend", "Abwesend" und "Nacht" lassen sich einzeln ein- und ausschalten. Mindestens ein Modus bleibt an. Apple Home, die Übersicht, die Zonen, "Bereit für" und die Aktionen bieten nur die eingeschalteten Modi an. Ein abgeschalteter Modus behält Zone und Aktionen und bekommt sie beim Einschalten zurück. Den Modus, in dem die Anlage gerade scharf ist, kann man nicht abschalten: zuerst deaktivieren.

## Zeitplan

Seitenpanel › Konfiguration › Anlage › "Zeitplan": "Zeit hinzufügen" legt eine Regel mit Uhrzeit, Aktion ("Anwesend", "Abwesend" oder "Nacht" scharf oder deaktivieren) und Wochentagen an. Jede Zeit lässt sich abschalten, ohne sie zu löschen. Regeln:

- Ein laufender Alarm oder eine Eingangsverzögerung wird per Zeitplan nie deaktiviert oder überschrieben; die übersprungene Zeit steht in den letzten Ereignissen.
- Offene Sensoren verhindern das Scharfschalten wie gewohnt (oder werden je nach Einstellung umgangen); die Meldung "Scharfschalten nicht möglich" folgt.
- Ein Code ist nicht nötig. "Geändert von" zeigt "Zeitplan".
- Eine Zeit für einen abgeschalteten Modus wird übersprungen.
- Zeiten, die verstreichen, während Home Assistant aus ist, werden nicht nachgeholt.
- Deaktivieren per Zeitplan heisst: zu dieser Zeit ist die Anlage aus, egal wer zu Hause ist. Nur dort verwenden, wo das gewollt ist.

## Sicherung

Seitenpanel › Konfiguration › Anlage › "Sicherung": "Exportieren" speichert alle Einstellungen aller Alarmanlagen als JSON-Datei (Zonen, Verzögerungen, Optionen pro Sensor, Aktionen, Voreinstellungen, Benachrichtigungen). "Importieren" zeigt zuerst, welche Alarmanlagen gefunden werden (Zuordnung über den Namen), und ersetzt deren Einstellungen nach Bestätigung. Codes sind nie Teil einer Sicherung, und die Codes der Zielanlage bleiben, wie sie sind. Die Sicherung von Home Assistant enthält ohnehin alle Einstellungen samt Codes.

## Apple HomeKit

1. Die Alarm-Entität in die HomeKit-Bridge von Home Assistant aufnehmen (Domain `alarm_control_panel` oder die Entität einschliessen).
2. Apple Home zeigt "Aus" und die eingeschalteten Modi ("Zuhause", "Abwesend", "Nacht").
3. **Mit Code:** HomeKit fragt den Code nicht ab. Entweder den Code in der Konfiguration der HomeKit-Bridge hinterlegen (`entity_config` → `code`) oder ihn als Standardcode in den Entitätseinstellungen der Alarm-Entität in Home Assistant eintragen.

Bekanntes Verhalten der HomeKit-Bridge:

- Während der Ausgangsverzögerung zeigt Apple Home "Aus" mit Ziel "Abwesend", auch beim Scharfschalten auf "Zuhause". Für "Anwesend" und "Nacht" darum keine Ausgangsverzögerung verwenden (Standard).
- Während der Eingangsverzögerung zeigt Apple Home weiter "scharf" und wechselt auf "Alarm", sobald der Alarm beginnt.

## Entitäten

| Entität | Inhalt |
| --- | --- |
| `alarm_control_panel.<name>` | Die Alarmanlage. Attribute: `arm_mode`, `triggered_by`, `bypassed_sensors`, `deadline`, `changed_by` |
| `binary_sensor.<name>_zone_home` | Ein, wenn ein Sensor der Zone "Anwesend" offen ist |
| `binary_sensor.<name>_zone_away` | Ein, wenn ein Sensor der Zone "Abwesend" offen ist |
| `binary_sensor.<name>_zone_night` | Ein, wenn ein Sensor der Zone "Nacht" offen ist |
| "Bereit für Anwesend/Abwesend/Nacht" | Ein, wenn kein offener Sensor das Scharfschalten in diesem Modus verhindert. Attribut: `blocking_sensors` |

Zonen- und "Bereit"-Entitäten gibt es nur für eingeschaltete Modi.

## Sprachen

Die Integration ist auf Englisch und wechselt auf Deutsch, wenn Home Assistant auf Deutsch läuft.

## Einschränkungen

Alarmageddon ist keine zertifizierte Alarmanlage. Fallen Home Assistant, das Netzwerk oder der Funk-Koordinator aus, gibt es keinen Alarm. Für kritische Anwendungen eine Sirene mit eigenem Akku verwenden.

## Konzept

Siehe [docs/CONCEPT.md](https://github.com/Diegofuego871/ha-Alarmageddon/blob/main/docs/CONCEPT.md) (Deutsch) und die Mockups in [docs/mockups/konzept-v1](https://github.com/Diegofuego871/ha-Alarmageddon/tree/main/docs/mockups/konzept-v1).

## Lizenz

Siehe [LICENSE](https://github.com/Diegofuego871/ha-Alarmageddon/blob/main/LICENSE).
