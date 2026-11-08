# Änderungsprotokoll

[English](https://github.com/Diegofuego871/ha-Alarmageddon/blob/main/CHANGELOG.md)

Alle nennenswerten Änderungen an dieser Integration stehen in dieser Datei.

Das Format folgt [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
die Versionsnummern folgen [Semantic Versioning](https://semver.org/lang/de/).

## [0.4.0] - 2026-11-08

Alarmaktionen als grafischer Ablauf pro Alarm, eigene Alarmtöne für Medienplayer und Benachrichtigungen mit kritischen Push-Meldungen.

Enthält die Änderungen aus 0.3.0.

### Hinzugefügt

- **Konfiguration › Aktionen:** ein Ablauf pro Alarmanlage und Alarm ("Anwesend", "Abwesend", "Nacht" und "immer aktiv" für Rauch, Wasser, Gas). Bausteine: Push-Meldung, Einschalten, Ausschalten, Rollläden öffnen und schliessen, Alarmton auf Medienplayern, Warten, Skript und jede Aktion von Home Assistant mit eigenen Daten. Schritte lassen sich an jeder Stelle einfügen, bearbeiten, verschieben und löschen; Änderungen sind ein Entwurf mit "Abbrechen" und "Speichern". Ein Ablauf mit eigenem Push-Schritt ersetzt die automatische Alarmmeldung, sie kommt nicht doppelt.
- **Alarmtöne:** fünf eigene Töne (Sirene, Alarm-Piepen, Hupe, Warnung, Gong) für Medienplayer wie Sonos, mit Vorhören im Panel, Lautstärke und Wiederholungen. Die Töne liefert Home Assistant selbst aus; der Medienplayer muss die lokale Adresse von Home Assistant erreichen.
- **Zurück in den Zustand davor:** Vor dem ersten Schritt merkt sich Alarmageddon den Zustand aller Geräte im Ablauf (ein/aus, Helligkeit, Position, Lautstärke, Quelle; bei Sonos zusätzlich den Sonos-Schnappschuss mit Gruppen). Deaktivieren oder das Ende der Alarmdauer stoppt alle Schritte und stellt markierte Geräte zurück. Bei Alarmtönen ist das standardmässig an. Das gilt auch nach einem Neustart von Home Assistant mitten im Alarm.
- **Test:** führt den Ablauf ohne Alarm aus und endet spätestens nach 60 Sekunden von selbst oder mit "Test stoppen". Ein echter Alarm lässt sich nicht im Ablauf stoppen, nur durch Deaktivieren.
- **Konfiguration › Benachrichtigungen (für alle Alarmanlagen):** Empfänger getrennt für Alarme und Wartungsmeldungen (jeder `notify`-Dienst, zum Beispiel die Companion App), kritische Alarmmeldung mit Lautstärke (iOS: kritisch, Android: Alarmkanal), Ereignisse (Alarm, Eingangsverzögerung, scharf, deaktiviert, Scharfschalten nicht möglich, Sensor im scharfen Zustand nicht erreichbar) und Testmeldungen.
- **Alarmmeldung:** mit Uhrzeit und auslösendem Sensor, Knopf "Öffnen"; "Alarm beendet" ersetzt nach dem Deaktivieren die Alarmmeldung auf dem Handy. Ein Sensor, der im scharfen Zustand nicht mehr erreichbar ist, wird kritisch gemeldet.
- **Knopf "Deaktivieren" in der Alarmmeldung:** standardmässig aus. iOS fragt nach Face ID oder dem Code des Geräts, Android nicht; das Panel weist darauf hin.

## [0.3.0] - 2026-11-08

Nicht veröffentlicht; enthalten in 0.4.0.

Neue Startseite mit einer Liste der Sensoren wie in Device Panel, ein Bereich Konfiguration mit Optionen pro Sensor und "Bereit zum Scharfschalten".

### Hinzugefügt

- **Optionen pro Sensor:** "Immer aktiv" (Rauch, Wasser, Gas lösen auch unscharf aus), "Darf beim Scharfschalten offen sein" (zum Beispiel ein Bewegungsmelder auf dem Weg zur Tür), "Scharf, sobald geschlossen" (das Schliessen der Haustür beendet die Ausgangsverzögerung nach wenigen Sekunden), "Ausfall gilt als Alarm" (nicht erreichbar im scharfen Zustand löst aus). Ohne eigenen Wert gilt die Voreinstellung der Sensorart.
- **Voreinstellungen je Sensorart:** Tür, Fenster, Bewegung, Rauch/Wasser/Gas, Glasbruch/Erschütterung/Sabotage und weitere, für alle Anlagen. Vorschlag: Türen "Scharf, sobald geschlossen", Bewegung "Darf beim Scharfschalten offen sein", Rauch/Wasser/Gas "Immer aktiv", Glasbruch/Erschütterung/Sabotage "Ausfall gilt als Alarm".
- **Bereit zum Scharfschalten:** eine Entität pro Modus (zum Beispiel "Bereit für Abwesend") mit den verhindernden Sensoren als Attribut; die Übersicht zeigt "Bereit für" je Modus.
- **Startseite:** oben die Steuerung aller Anlagen und eine Kachel mit dem Status ("Alles in Ordnung" oder Warnungen wie schwache Batterie und nicht erreichbare Sensoren; ein Tipp filtert die Liste). Darunter eine Liste aller zugeordneten Sensoren mit Suche, Filtern (Probleme, offen, Batterie schwach, nicht erreichbar, Anlage, Bereich) und Ansichtseinstellung (Spalten, Gruppierung, Sortierung, pro Browser gemerkt). Spalten: Bereich, Zonen, Zustand, Batterie, Empfang (dBm oder LQI), Firmware, Hersteller/Modell, Integration, letzte Änderung.
- **Konfiguration › Sensoren:** das Raster der Zonen wie bisher, mit einem Seitenblatt pro Sensor (Zonen, Eingangsverzögerung, Optionen mit Herkunft "Voreinstellung" oder "Eigener Wert" und Zurücksetzen), auf dem Handy als Blatt von unten. Knopf "Voreinstellungen" für die Voreinstellungen je Sensorart.
- **Konfiguration › Anlage:** Modus "Nacht", Ausgangsverzögerung pro Modus, Eingangsverzögerung, Alarmdauer und Verhalten bei offenen Sensoren direkt im Panel.
- **Sensorausfall im scharfen Zustand** steht in den letzten Ereignissen.

### Geändert

- **Reiter des Panels:** "Übersicht" und "Konfiguration" (vorher "Übersicht" und "Sensorgruppen").

## [0.2.0] - 2026-11-08

Seitenpanel mit einer Übersicht aller Alarmanlagen und grafischen Sensorgruppen.

Enthält die Änderungen aus 0.1.0.

### Hinzugefügt

- **Seitenpanel "Alarmageddon":** wird mit der ersten Alarmanlage automatisch angelegt und mit der letzten entfernt. Nur für Administratoren. Funktioniert auf dem Desktop-Monitor und in der Companion App auf dem Handy.
- **Übersicht:** eine Karte pro Alarmanlage mit Zustand, Umschalten des Modus (Aus, Anwesend, Abwesend, Nacht), offenen Sensoren, nicht erreichbaren Sensoren und schwachen Batterien (unter 20 %). Ein Countdown zeigt die restliche Ausgangs- oder Eingangsverzögerung. Während eines Alarms steht zuoberst ein rotes Band mit "Deaktivieren". Das Panel fragt den Code nur, wenn er nötig ist (ein Standardcode in Home Assistant geht ohne Eingabe).
- **Letzte Ereignisse:** wer welche Alarmanlage scharf geschaltet oder deaktiviert hat und welcher Sensor ausgelöst hat, gespeichert pro Alarmanlage (die letzten 50).
- **Sensorgruppen:** eine Tabelle mit einer Spalte pro Zone und einem Schalter für die Eingangsverzögerung. Über mehrere Felder ziehen setzt alle auf einmal, "Alle" setzt eine ganze Spalte, mit Suche und Filtern (Türen & Fenster, Bewegung, Weitere). Sensoren nach Bereich gruppiert, mit Integration und Batterie. Auf dem Handy: eine Karte pro Sensor mit Zonen-Knöpfen. Änderungen sind ein Entwurf mit "Abbrechen" und "Speichern"; wer mit offenen Änderungen wechselt, wird gefragt.
- **Sensoren jeder Integration:** Das Panel bietet alle binären Sensoren mit passender Geräteklasse an (Tür, Fenster, Bewegung, Rauch, Wasser, Glasbruch und weitere). Die Batterie kommt vom Batteriesensor desselben Geräts.
- **Glasbruch:** binäre Sensoren mit der neuen Geräteklasse "Glasbruch" (Home Assistant 2026.10) werden ebenfalls angeboten.

## [0.1.0] - 2026-11-08

Nicht veröffentlicht; enthalten in 0.2.0.

Erste Vorabversion: der Kern der Alarmanlage mit Unterstützung für Apple HomeKit. Die grafische Einrichtung im Seitenpanel folgt in einer späteren Version.

### Hinzugefügt

- **Alarmanlage als Entität:** ein `alarm_control_panel` mit den Modi "Anwesend" und "Abwesend", optional "Nacht" (standardmässig aus), Ausgangsverzögerung pro Modus, Eingangsverzögerung für gewählte Sensoren (zum Beispiel die Haustür) und Alarmdauer (0 = bis zum Deaktivieren).
- **Mehrere Alarmanlagen:** ein Eintrag pro Alarmanlage, jede mit eigenem Gerät. Die Namen müssen eindeutig sein.
- **Apple HomeKit:** funktioniert mit der HomeKit-Bridge von Home Assistant. Apple Home bietet "Zuhause", "Abwesend", "Aus" und mit eingeschaltetem Modus "Nacht" auch "Nacht" an. Mit der echten HomeKit-Bridge getestet.
- **Zonen:** eine Entität pro Zone, "ein", sobald ein Sensor der Zone offen ist.
- **Offener Sensor beim Scharfschalten:** Scharfschalten verhindern oder die offenen Sensoren bis zum Deaktivieren umgehen.
- **Code:** optional, 4 bis 8 Ziffern, nur als Hash gespeichert, auf Wunsch auch zum Scharfschalten nötig. Nach fünf falschen Codes eine Minute gesperrt. Der Standardcode aus den Entitätseinstellungen von Home Assistant wird unterstützt.
- **Neustart:** Zustand, Verzögerungen und Alarm laufen nach einem Neustart oder beim Ändern der Optionen weiter. Eine Eingangsverzögerung, die während des Neustarts abgelaufen ist, wird zum Alarm. Ein Sensor, der aus "nicht verfügbar" als offen zurückkommt, löst nicht aus.
- **Sprachen:** Englisch und Deutsch.

[0.4.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.4.0
[0.2.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.2.0
