# Konzept

Entwurf v0.1 (2026-11-08). Bedienbare Mockups:
`docs/mockups/konzept-v1/konzept.html`, Bilder im selben Ordner.

## Ziel

Eine Alarmanlage als `alarm_control_panel`-Entität, vollständig grafisch
eingerichtet in einem automatisch angelegten Seitenpanel.

## Bausteine

1. **Sensorgruppen:** zwei feste Zonen "Anwesend" (`armed_home`) und
   "Abwesend" (`armed_away`). Sensoren per Drag and Drop oder Antippen; ein
   Sensor darf in beiden Zonen liegen. Schnellwahl "alle Fenster" usw.
2. **Wartung:** Kacheln nach Bereich mit Batterie, Verlauf, Prognose der
   Restlaufzeit, letzter Aktivität, "zuletzt gesehen". Geräte mit Hinweis
   zuerst.
3. **Szenarien:** Auslöser (Zone und Zustand) und eine Zeitachse von
   Schritten mit Verzögerung. Jeder Schritt ist eine HA-Aktion mit
   Gegenaktion. Vorlagen für Sirene, Rollläden, Medien, Licht, Push
   kritisch, Schloss.
4. **Überwachung:** Einstellungen nach Device Panel (Batterie, Restlaufzeit,
   offline, Inaktivität, Wiederholung, Ruhezeit) plus Regeln nur im scharfen
   Zustand (Sensorausfall, Sabotage, Koordinator-Ausfall) und beim
   Scharfschalten (offener Sensor, Verzögerungen, Code).
5. **Push & Stopp:** kritische Meldungen mit Aktionen. Manuelles Deaktivieren
   bricht ausstehende Schritte ab und führt die Gegenaktionen aus.

## Entscheide (Vorschlag, vom Nutzer noch zu bestätigen)

- Zonen als eigene `binary_sensor`-Entitäten der Integration statt
  HA-Helfergruppen.
- Config Flow legt nur die Anlage an; alles Grafische läuft im Panel über
  WebSocket-Befehle.
- Szenarien liegen in der Integration, nicht als HA-Automationen.
- Panel als eingebautes iframe-Panel, Vanilla Web Component ohne Build (wie
  ha-device-panel, siehe LEARNINGS).
- Batterie-Prognose erst ab rund 14 Tagen Verlauf, als Schätzung
  gekennzeichnet.

## Risiken

- Keine zertifizierte Anlage; Ausfall von HA, WLAN oder Koordinator heisst
  kein Alarm. Sirene mit eigenem Akku empfehlen.
- Deaktivieren per Push-Aktion: standardmässig aus, optional mit Code oder
  iOS-Authentifizierung.
- Kritische Meldungen brauchen die Companion-App mit erteilten Rechten;
  Testmeldung beim Einrichten.

## Entschieden

- Sprache: Integration Englisch, Deutsch wenn HA auf Deutsch läuft. README
  und Release Notes zweisprachig, Mockups Deutsch (Nutzer, 2026-11-08).

## Offene Fragen

- Nur "Anwesend" und "Abwesend", oder zusätzlich "Nacht"?
- Mehrere Alarmanlagen pro HA (zum Beispiel Haus und Garage)?
- Veröffentlichung über HACS geplant?
- Welche Funktechnik (Zigbee2MQTT, ZHA, Z-Wave)?
- Ebenen der Einstellungen (Vorschlag: global › Alarmanlage › Bereich ›
  Gerät).

## Umsetzungsplan

| Phase | Inhalt |
| --- | --- |
| 1 · Kern | Config Flow, `alarm_control_panel`, Zustandsautomat mit Ein- und Ausgangsverzögerung, Zonen als Entitäten, Tests |
| 2 · Panel | Automatisches Panel, Drag-and-Drop-Zonen, WebSocket-API, Übersicht |
| 3 · Szenarien | Szenario-Engine mit Verzögerungen, Gegenaktionen, Wiederherstellung nach Neustart, Editor |
| 4 · Wartung | Überwachung, Kacheln nach Bereich, Prognose, Meldungen und Ruhezeiten |
| 5 · Härtung | Sensorausfall im scharfen Zustand, Sabotage, Bypass, Testmeldung, HACS |
