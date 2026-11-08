# Alarmageddon

[English](https://github.com/Diegofuego871/ha-Alarmageddon/blob/main/README.md)

Alarmanlage für Home Assistant mit geführter Einrichtung und eingebauter Wartung der Sensoren.

> **Status:** frühe Vorabversion (0.4.0). Kern der Alarmanlage, Seitenpanel, Alarmaktionen und Benachrichtigungen funktionieren. Wartungsmeldungen und Batterieprognose folgen in einer späteren Version.

## Funktionen

- **Alarm-Entität:** ein `alarm_control_panel` mit den Modi "Anwesend" und "Abwesend", optional "Nacht", Ausgangs- und Eingangsverzögerung.
- **Mehrere Alarmanlagen:** beliebig viele (zum Beispiel Haus und Garage). Jede ist ein eigenes Gerät mit eigener Alarm-Entität.
- **Apple HomeKit:** Jede Alarmanlage lässt sich über die HomeKit-Bridge von Home Assistant an Apple Home übergeben.
- **Zonen:** eine Entität pro Zone, die "ein" ist, sobald ein Sensor der Zone offen ist.
- **Sicher beim Neustart:** Verzögerungen und Alarme laufen nach einem Neustart weiter. Eine Eingangsverzögerung, die während des Neustarts abgelaufen ist, wird zum Alarm.
- **Code:** optional, 4 bis 8 Ziffern, nur als Hash gespeichert. Nach fünf falschen Codes eine Minute gesperrt.
- **Jede Funktechnik:** Alarmageddon nutzt nur Entitäten von Home Assistant. WLAN, Thread/Matter, Zigbee, Z-Wave und Bluetooth funktionieren gleichermassen.

- **Seitenpanel, Übersicht:** Steuerung aller Alarmanlagen mit "Bereit für" je Modus, eine Kachel mit dem Status (alles in Ordnung oder Warnungen) und eine Liste aller Sensoren mit Suche, Filtern und Ansichtseinstellung (Spalten, Gruppierung, Sortierung). Sie zeigt Zustand, Batterie, Empfang, Firmware, Modell und letzte Änderung.
- **Seitenpanel, Konfiguration:** Sensoren (Zonen als Raster mit Ziehen über Felder, Optionen pro Sensor im Seitenblatt, Voreinstellungen je Sensorart) und Anlage (Verzögerungen, Modus "Nacht", Verhalten bei offenen Sensoren). Auf dem Handy als Karten und Blätter von unten.
- **Optionen pro Sensor:** immer aktiv (Rauch, Wasser), darf beim Scharfschalten offen sein, scharf sobald geschlossen, Ausfall gilt als Alarm. Voreinstellungen je Sensorart, eigene Werte pro Sensor.
- **Bereit zum Scharfschalten:** eine Entität pro Modus mit den verhindernden Sensoren.
- **Alarmaktionen:** ein grafischer Ablauf pro Alarm: Push-Meldung, Geräte schalten, Rollläden, Alarmton auf Medienplayern (Sonos und andere), Warten, Skript, jede Aktion. Geräte kehren nach dem Alarm in den Zustand davor zurück.
- **Benachrichtigungen:** kritische Push-Meldungen mit Lautstärke, Empfänger getrennt für Alarme und Wartung, wählbare Ereignisse.

Geplant: Wartungsmeldungen (Batterie schwach, nicht erreichbar) und Batterieprognose.

## Installation

1. HACS → drei Punkte → "Benutzerdefinierte Repositories" → `https://github.com/Diegofuego871/ha-Alarmageddon`, Typ "Integration".
2. "Alarmageddon" installieren und Home Assistant neu starten.
3. Einstellungen → Geräte & Dienste → "Integration hinzufügen" → "Alarmageddon".

Vorabversionen: Alarmageddon erscheint vorerst als Vorabversion. In HACS beim Repository den Schalter "Pre-release" einschalten (Schalter am HACS-Gerät des Repositorys).

## Einrichtung

1. **Neue Alarmanlage:** Name, Modus "Nacht" und optional ein Code.
2. **Seitenpanel "Alarmageddon"** (erscheint für Administratoren in der Seitenleiste): Konfiguration › Sensoren ordnet Sensoren den Zonen "Anwesend", "Abwesend" und "Nacht" zu; der Pfeil am Ende einer Zeile öffnet die Optionen des Sensors. Konfiguration › Anlage setzt Verzögerungen und Verhalten. Änderungen gelten mit "Speichern".
3. **Optionen** (Einstellungen → Geräte & Dienste → Alarmageddon → "Konfigurieren"):
   - **Zonen:** Sensoren für "Anwesend", "Abwesend" und "Nacht" (dasselbe wie im Seitenpanel). Ein Sensor kann in mehreren Zonen sein.
   - **Verzögerungen:** Ausgangsverzögerung pro Modus, Eingangsverzögerung, Sensoren mit Eingangsverzögerung (zum Beispiel die Haustür), Alarmdauer.
   - **Verhalten:** Modus "Nacht", offener Sensor beim Scharfschalten (verhindern oder umgehen), Code zum Scharfschalten.
   - **Code:** neuen Code setzen oder entfernen.

Nur ein echter Wechsel von "zu" auf "offen" löst aus. Ein Sensor, der aus "nicht verfügbar" als offen zurückkommt, löst nicht aus.

## Alarmaktionen

Seitenpanel › Konfiguration › Aktionen. Alarmanlage und Alarm wählen ("Anwesend", "Abwesend", "Nacht" oder "immer aktiv" für Rauch, Wasser und Gas), dann Schritte mit "+" hinzufügen:

| Schritt | Macht |
| --- | --- |
| Push-Meldung | Alarmmeldung an die Empfänger für Alarme (siehe Benachrichtigungen) |
| Einschalten / Ausschalten | Sirenen, Schalter, Lichter, Ventilatoren, Helfer |
| Rollläden öffnen / schliessen | Rollläden |
| Alarmton | Spielt einen von fünf Tönen auf Medienplayern mit Lautstärke und Wiederholungen |
| Warten | Hält die folgenden Schritte an |
| Skript | Startet ein Skript |
| Eigene Aktion | Jede Aktion von Home Assistant mit Ziel und Daten (JSON) |

- **Zurück in den Zustand davor:** Geräte mit dem Pfeil-Symbol kehren beim Deaktivieren oder am Ende der Alarmdauer in den Zustand vor dem Alarm zurück (ein/aus, Helligkeit, Position, Lautstärke, Quelle; Sonos mit eigenem Schnappschuss samt Gruppen). Bei Alarmtönen standardmässig an.
- **Deaktivieren stoppt alles,** auch nach einem Neustart von Home Assistant mitten im Alarm. Ein fehlerhafter Schritt hält die übrigen nicht auf.
- **Test** führt den gespeicherten Ablauf ohne Alarm aus und endet spätestens nach 60 Sekunden.
- **Medienplayer** holen die Töne bei Home Assistant (`/alarmageddon_sounds/…`). Der Player muss die lokale Adresse von Home Assistant erreichen (Einstellungen → System → Netzwerk).

## Benachrichtigungen

Seitenpanel › Konfiguration › Benachrichtigungen, für alle Alarmanlagen:

- **Empfänger** getrennt für Alarme und Wartungsmeldungen: jeder `notify`-Dienst, zum Beispiel `notify.mobile_app_<handy>` der Companion App.
- **Kritische Alarmmeldung:** ertönt auch im Lautlos- und Nicht-stören-Modus. iOS nutzt die hier eingestellte Lautstärke, Android den Alarmkanal (`alarm_stream`).
- **Ereignisse:** Alarm, Eingangsverzögerung, scharf, deaktiviert, Scharfschalten nicht möglich, Sensor im scharfen Zustand nicht erreichbar.
- **Knopf "Deaktivieren" in der Meldung:** standardmässig aus. iOS fragt nach Face ID oder dem Code des Geräts, Android nicht: Wer das entsperrte Handy hält, kann deaktivieren.

## Apple HomeKit

1. Die Alarm-Entität in die HomeKit-Bridge von Home Assistant aufnehmen (Domain `alarm_control_panel` oder die Entität einschliessen).
2. Apple Home zeigt "Zuhause", "Abwesend", "Aus" und mit eingeschaltetem Modus "Nacht" auch "Nacht".
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
| `binary_sensor.<name>_zone_night` | Nur mit Modus "Nacht" |
| "Bereit für Anwesend/Abwesend/Nacht" | Ein, wenn kein offener Sensor das Scharfschalten in diesem Modus verhindert. Attribut: `blocking_sensors` |

## Sprachen

Die Integration ist auf Englisch und wechselt auf Deutsch, wenn Home Assistant auf Deutsch läuft.

## Einschränkungen

Alarmageddon ist keine zertifizierte Alarmanlage. Fallen Home Assistant, das Netzwerk oder der Funk-Koordinator aus, gibt es keinen Alarm. Für kritische Anwendungen eine Sirene mit eigenem Akku verwenden.

## Konzept

Siehe [docs/CONCEPT.md](https://github.com/Diegofuego871/ha-Alarmageddon/blob/main/docs/CONCEPT.md) (Deutsch) und die Mockups in [docs/mockups/konzept-v1](https://github.com/Diegofuego871/ha-Alarmageddon/tree/main/docs/mockups/konzept-v1).

## Lizenz

Siehe [LICENSE](https://github.com/Diegofuego871/ha-Alarmageddon/blob/main/LICENSE).
