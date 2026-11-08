# Änderungsprotokoll

[English](https://github.com/Diegofuego871/ha-Alarmageddon/blob/main/CHANGELOG.md)

Alle nennenswerten Änderungen an dieser Integration stehen in dieser Datei.

Das Format folgt [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
die Versionsnummern folgen [Semantic Versioning](https://semver.org/lang/de/).

## [0.1.0] - 2026-11-08

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

[0.1.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.1.0
