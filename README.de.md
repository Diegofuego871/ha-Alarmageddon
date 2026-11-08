# Alarmageddon

[English](README.md)

Alarmanlage für Home Assistant mit geführter grafischer Einrichtung und eingebauter Wartung der Sensoren.

> **Status:** Konzeptphase. Es gibt noch keine installierbare Integration.

## Funktionen (geplant)

- **Alarm-Entität:** ein `alarm_control_panel` mit den Modi "Anwesend" und "Abwesend", optional "Nacht", Ausgangs- und Eingangsverzögerung.
- **Mehrere Alarmanlagen:** beliebig viele (zum Beispiel Haus und Garage). Jede ist ein eigenes Gerät mit eigener Entität.
- **Apple HomeKit:** Jede Alarmanlage lässt sich über die HomeKit-Bridge von Home Assistant an Apple Home übergeben.
- **Sensorgruppen per Drag and Drop:** Ein Seitenpanel wird automatisch angelegt. Fenster-, Tür- und Bewegungssensoren werden in die Zonen "Anwesend" und "Abwesend" gezogen.
- **Alarmszenarien:** eine Zeitachse von Aktionen pro Zone und Modus, zum Beispiel Sirene, Rollläden, Medienplayer wie Sonos, Licht und kritische Push-Meldungen mit Aktionen.
- **Stopp beim Deaktivieren:** Deaktivieren bricht ausstehende Schritte ab und stoppt alles, was ein Szenario gestartet hat.
- **Wartungsübersicht:** Sensoren in Kacheln nach Bereich mit Batteriestand, letzter Aktivität und voraussichtlicher Batterielaufzeit.
- **Überwachung:** Meldungen bei niedriger Batterie, ausgefallenen Sensoren und Sensorausfall im scharfen Zustand.

## Sprachen

Die Integration ist auf Englisch und wechselt auf Deutsch, wenn Home Assistant auf Deutsch läuft.

## Konzept

Siehe [docs/CONCEPT.md](docs/CONCEPT.md) (Deutsch) und die Mockups in [docs/mockups/konzept-v1](docs/mockups/konzept-v1).

## Einschränkungen

Alarmageddon ist keine zertifizierte Alarmanlage. Fallen Home Assistant, das Netzwerk oder der Funk-Koordinator aus, gibt es keinen Alarm. Für kritische Anwendungen eine Sirene mit eigenem Akku verwenden.

## Lizenz

Siehe [LICENSE](LICENSE).
