# Konzept

Entwurf v0.1 (2026-11-08). Bedienbare Mockups:
`docs/mockups/konzept-v1/konzept.html`, Bilder im selben Ordner.

## Ziel

Eine Alarmanlage als `alarm_control_panel`-Entität, vollständig grafisch
eingerichtet in einem automatisch angelegten Seitenpanel.

## Bausteine

1. **Sensorgruppen:** zwei feste Zonen "Anwesend" (`armed_home`) und
   "Abwesend" (`armed_away`), optional "Nacht" (`armed_night`). Sensoren per Drag and Drop oder Antippen; ein
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

## Lehren aus Alarmo

Analyse in `docs/reference/alarmo-analyse.md`. Ziel: alles, was Alarmo kann,
verständlicher und robuster, dazu Stopp beim Deaktivieren, Zeitachse mit
beliebigen Aktionen, Testknopf, Wartung und Protokoll.

## Risiken

- Keine zertifizierte Anlage; Ausfall von HA, WLAN oder Koordinator heisst
  kein Alarm. Sirene mit eigenem Akku empfehlen.
- Deaktivieren per Push-Aktion: standardmässig aus, optional mit Code oder
  iOS-Authentifizierung.
- Kritische Meldungen brauchen die Companion-App mit erteilten Rechten;
  Testmeldung beim Einrichten.

## Entschieden (Nutzer, 2026-11-08)

- Modus "Nacht" optional, pro Alarmanlage zuschaltbar, standardmässig aus.
- Mehrere Alarmanlagen pro HA: ein Config Entry pro Anlage, je ein Gerät mit
  eigener `alarm_control_panel`-Entität.
- Apple HomeKit ist zentral: jede Anlage muss über die HomeKit-Bridge
  steuerbar sein. Zu prüfen in Phase 1 im HA-Quellcode und mit Tests: welche
  Zustände und Funktionen die Bridge abbildet (Anwesend, Abwesend, Nacht,
  Aus, ausgelöst), wie sie mit Verzögerungen (`arming`, `pending`) umgeht und
  wie ein Alarmcode in HomeKit hinterlegt wird.
- Veröffentlichung über HACS, mit allen Regeln (siehe CLAUDE.md, "HACS").
- Jede Funktechnik: nur über HA-Entitäten, technikunabhängig. Der Nutzer
  nutzt WLAN und Thread (Matter); Zigbee, Z-Wave, Bluetooth usw. müssen
  ebenso gehen. Technikspezifische Angaben nur als Zusatz.
- Ebenen der Einstellungen: global › Alarmanlage › Bereich › Gerät.
- Responsives Design: Desktop-Monitor in der Breite gut nutzen, auf dem
  Handy (Companion App) ebenso gut bedienbar.
- Sprache: Integration Englisch, Deutsch wenn HA auf Deutsch läuft. README
  und Release Notes zweisprachig, Mockups Deutsch (Nutzer, 2026-11-08).

## Offene Fragen

- Keine. Neue Fragen hier sammeln.

## Umsetzungsplan

| Phase | Inhalt |
| --- | --- |
| 1 · Kern | Config Flow (mehrere Anlagen), Gerät und `alarm_control_panel` pro Anlage, Zustandsautomat mit Ein- und Ausgangsverzögerung, optional Nacht, Zonen als Entitäten, Prüfung HomeKit-Bridge, HACS-Gerüst (Actions, hacs.json, Brand), Tests |
| 2 · Panel | Automatisches Panel, Drag-and-Drop-Zonen, WebSocket-API, Übersicht |
| 3 · Szenarien | Szenario-Engine mit Verzögerungen, Gegenaktionen, Wiederherstellung nach Neustart, Editor |
| 4 · Wartung | Überwachung, Kacheln nach Bereich, Prognose, Meldungen und Ruhezeiten |
| 5 · Härtung | Sensorausfall im scharfen Zustand, Sabotage, Bypass, Testmeldung, HACS |
