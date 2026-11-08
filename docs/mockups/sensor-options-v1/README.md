# Mockups 0.3.0: Optionen pro Sensor und "Bereit zum Scharfschalten" (2026-11-08)

Entwürfe für Phase 2b im Design des Panels (Übersicht A, Sensorgruppen B),
mit erfundenen Daten. Desktop 1440 px, Handy 390 × 844. **Noch kein Entscheid
des Nutzers.**

## Optionen pro Sensor

Fünf Optionen mit verständlichen Namen (statt der Fachbegriffe von Alarmo):

| Option | Bedeutung |
| --- | --- |
| Eingangsverzögerung | gibt es schon; löst erst nach der Eingangsverzögerung aus |
| Immer aktiv | löst auch aus, wenn die Anlage deaktiviert ist (Rauch, Wasser, Gas) |
| Darf beim Scharfschalten offen sein | zum Beispiel Bewegungsmelder auf dem Weg zur Tür; erst eine neue Auslösung nach dem Scharfschalten zählt |
| Scharf, sobald geschlossen | Schliessen dieser Tür während der Ausgangsverzögerung schaltet sofort scharf |
| Ausfall gilt als Alarm | nicht erreichbar im scharfen Zustand löst aus |

| Bild | Inhalt |
| --- | --- |
| `1a-optionen-A-seitenblatt.png` | **A:** Zeile antippen öffnet rechts ein Seitenblatt mit Zonen und Optionen, jede mit Herkunft ("Voreinstellung für Türen" oder "Eigener Wert · zurück zur Voreinstellung"). Unter dem Namen in der Tabelle eine Kurzzeile der aktiven Optionen, Punkt bei eigenen Werten |
| `1b-optionen-A-handy.png` | A auf dem Handy: dasselbe als Blatt von unten |
| `2a-optionen-B-spalten.png` | **B:** jede Option als eigene Spalte mit Symbol, Legende darüber, gestrichelter Rand bei eigenem Wert |
| `2b-optionen-B-handy.png` | B auf dem Handy: zweite Knopfreihe mit den Optionen in der Karte |
| `3a-optionen-C-aufklappen.png` | **C:** Zeile klappt auf und zeigt die Optionen als Karten unter dem Sensor |
| `4-voreinstellungen.png` | Voreinstellungen je Sensorart (Knopf "Voreinstellungen"): Tür, Fenster, Bewegung, Rauch/Wasser/Gas, Glasbruch/Erschütterung/Sabotage |

**Empfehlung: A.** Die Tabelle bleibt so übersichtlich wie heute, die
Erklärung jeder Option steht direkt daneben, und die Herkunft (Voreinstellung
oder eigener Wert) ist mit einem Tipp zurückgesetzt. Auf dem Handy ist das
Blatt von unten der gewohnte Weg. B zeigt alles auf einen Blick, aber fünf
Symbol-Spalten sind ohne Legende nicht verständlich und passen auf dem Handy
nicht. C schiebt die Tabelle beim Aufklappen stark nach unten.

Vorgeschlagene Voreinstellungen: Tür "Scharf, sobald geschlossen";
Bewegung "Darf beim Scharfschalten offen sein"; Rauch/Wasser/Gas "Immer
aktiv"; Glasbruch/Erschütterung/Sabotage "Ausfall gilt als Alarm"; Fenster
nichts. Die Eingangsverzögerung ist bewusst überall aus (Alarm lieber früher;
Alarmo schaltet sie für alle Türen ein).

## Bereit zum Scharfschalten

| Bild | Inhalt |
| --- | --- |
| `5a-bereit-A-punkte.png` | **A:** grüner oder oranger Punkt an jedem Modus, darunter die offenen Sensoren mit "verhindert Abwesend" |
| `5b-bereit-A-handy.png` | A auf dem Handy |
| `6a-bereit-B-zeile.png` | **B:** eigene Zeile "Bereit für" mit Häkchen oder Warnzeichen je Modus, darunter die offenen Sensoren |
| `6b-bereit-B-handy.png` | B auf dem Handy |

Beide Varianten mit neuen Entitäten pro Modus, zum Beispiel
`binary_sensor.haus_bereit_abwesend` (Attribut `blocking_sensors`), für
Automationen und ein Wandtablet.

**Empfehlung: B.** Klarer Text mit Häkchen und Warnzeichen, verständlich
auch ohne Farben (A unterscheidet nur über die Farbe des Punkts).

## Offene Frage: Ebenen der Einstellungen

Die Regel in `CLAUDE.md` verlangt für Einstellungen, die sich mehr als global
ändern lassen, alle vier Ebenen (global › Alarmanlage › Bereich › Gerät).
Vorschlag für die Optionen pro Sensor: nur zwei Ebenen, **Voreinstellung je
Sensorart** (für alle Anlagen gleich) › **Sensor** (pro Anlage). Grund: Die
Optionen beschreiben, wie sich ein bestimmter Sensor verhält (wie die
Akku-Kapazität in ha-device-panel, die auch nur am Gerät einstellbar ist).
Eine Ebene "Bereich" oder "Alarmanlage" bringt hier kaum Nutzen.

Neu rendern:

```bash
cd docs/mockups/sensor-options-v1/src
node render.mjs
```
