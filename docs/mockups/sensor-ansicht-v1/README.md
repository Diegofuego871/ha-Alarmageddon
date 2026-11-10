# Mockups 1.9.0: Sensoransicht (2026-11-10)

Konzept und Entwürfe für ein neues Fenster, das sich beim Klick auf einen Sensor der Übersicht öffnet. Im Design des
Panels, mit erfundenen Daten. Desktop 1440 px, Handy 390 × 844. **Entscheid des Nutzers (2026-11-10):** Bewegung über 7 und
30 Tage als Raster (A); Stundenwerte merken (A); dazu der Sprung zum Alarm im Protokoll und die Kachel "Gerät".
Batterie mit 30 Tagen, 90 Tagen, 1 Jahr und die Liste mit einer Zeile je Ereignis wie gezeichnet. **Umgesetzt in 1.9.0.**

## Worum es geht

Heute öffnet ein Klick auf einen Sensor der Übersicht (Liste oder Karte) das Gerät in Home Assistant. Neu öffnet er die
**Sensoransicht**: eine reine Übersicht ohne Einstellungen. Der Absprung nach Home Assistant sitzt als Knopf
"In HA öffnen" im Kopf (gleiches Symbol wie "Integration in HA öffnen").

## Aufbau

```
┌────────────────────────────────────────────────────────┐
│ [Symbol] Haustür              [zu] [↗ In HA öffnen] [X] │  Kopf
│          Tür · Flur · Zigbee                            │
│ ┌ Verlauf ──────┐ ┌ Batterie ───┐ ┌ Empfang ────┐      │  Kacheln = Reiter, jede zeigt ihren aktuellen Wert
│ │ zu seit 17:37 │ │ 72 %        │ │ −58 dBm     │      │
│ └───────────────┘ └─────────────┘ └─────────────┘      │
│ [3 Std.] [12 Std.] [1 Tag] [7 Tage] [30 Tage]          │  Zeitraum
│ 6× geöffnet · 13 min offen · längste 8 min · zuletzt … │  Kennzahlen
│ ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁  │  Grafik je Sensorart
├────────────────────────────────────────────────────────┤  bis hier fest, darunter scrollt nur die Liste
│ Zeit    Ereignis          Dauer          Anlage         │  Kopf der Tabelle klebt
│ Heute                                                   │
│ 17:37   Geöffnet          22 s offen     Abwesend       │
│ …                                                       │
└────────────────────────────────────────────────────────┘
```

- **Desktop:** Fenster in der Breite der Voreinstellungen (`dialog.ag-wide`, 880 px), nie breiter. Schliessen mit X, Esc
  oder Klick daneben.
- **Handy:** ganzer Bildschirm, X oben rechts. Zustand und "In HA öffnen" stehen in einer zweiten Zeile des Kopfs.
- **Fest und scrollend:** Kopf, Kacheln, Zeitraum, Kennzahlen und Grafik bleiben stehen; nur die Liste der Ereignisse
  scrollt, ihr Tabellenkopf klebt (Regel aus `docs/DESIGN.md`).
- **Kacheln als Reiter:** "Verlauf", "Batterie", "Empfang". Jede zeigt den aktuellen Wert, die gewählte bestimmt Grafik,
  Kennzahlen und Liste. Ein Tipp auf die Batterie zeigt also den Verlauf der Batterie. Kacheln ohne Daten entfallen
  (Gerät am Netz: keine Kachel "Batterie").
- **Keine Einstellungen.** Die Ansicht ändert nichts an der Anlage.

## Grafik und Kennzahlen je Sensorart

| Sensorart | bis 1 Tag | 7 und 30 Tage | Kennzahlen |
| --- | --- | --- | --- |
| Tür, Fenster | **Zustandsband:** eine Zeitleiste, offen ist orange. Darüber schmal, wann die Anlage scharf war. | **Tageszeilen:** eine Zeile je Tag von 0 bis 24 Uhr. Zeigt Gewohnheiten (jeden Morgen um halb acht) und Ausreisser. | wie oft geöffnet, insgesamt offen, längste Öffnung, zuletzt geöffnet |
| Bewegung, Belegung | **Balken:** Anzahl Bewegungen je Abschnitt (je 10 Minuten bei 3 Stunden, sonst je Stunde). | **A: Raster** Tag × Stunde, je dunkler, desto mehr Bewegung. **B: Balken** je Tag. | Anzahl Bewegungen, aktivste Stunde, zuletzt, je Tag im Mittel |
| Rauch, Wasser, Gas | Tageszeilen der Erreichbarkeit mit Markierungen für Auslösung und Ausfall. | gleich | Alarme, erreichbar in Prozent, Ausfälle, zuletzt getestet |
| Batterie (Kachel) | Linie mit Fläche, Schwelle der Warnung, Markierung "Batterie gewechselt", Prognose gestrichelt | 30 Tage, 90 Tage, 1 Jahr | aktuell, Verbrauch je Tag, Zeit bis zur Warnung, letzter Wechsel |
| Empfang (Kachel) | Linie mit den Zonen gut, mittel, schwach; Lücken bei Ausfall | wie Verlauf | aktuell, im Mittel, schwächster Wert, Ausfälle |

In allen Verlaufsgrafiken: **rot** markiert ein Ereignis, das einen Alarm ausgelöst hat; **blau** zeigt, wann die Anlage
scharf war. So sieht man auf einen Blick, ob eine Tür bei scharfer Anlage aufging.

## Liste der Ereignisse

Eine Zeile je Ereignis mit Dauer statt je Wechsel (eine Öffnung ist eine Zeile "Geöffnet · 22 s offen", nicht zwei Zeilen
"offen" und "zu"). Gruppiert nach Tag ("Heute", "Gestern", Datum). Die letzte Spalte zeigt, in welchem Zustand die Anlage
war ("Deaktiviert", "Abwesend", "Nacht"), und markiert "Alarm ausgelöst". Auch "Nicht erreichbar" mit Dauer steht in der
Liste. Auf dem Handy zwei Zeilen je Eintrag statt vier Spalten.

## Bilder

| Bild | Inhalt |
| --- | --- |
| `1a-tuer-1-tag-desktop.png`, `1b-…-handy.png` | Tür, 1 Tag: Zustandsband mit Leiste "Anlage scharf" |
| `2a-tuer-7-tage-desktop.png`, `2b-…-handy.png` | Tür, 7 Tage: Tageszeilen, mit einem Alarm am Samstag (rot) |
| `2c-tuer-30-tage-desktop.png` | Tür, 30 Tage: Tageszeilen, schmaler |
| `3a-bewegung-1-tag-desktop.png`, `3b-…-handy.png` | Bewegung, 1 Tag: Balken je Stunde |
| `4a-bewegung-7-tage-A-raster-desktop.png`, `4b-…-handy.png` | Bewegung, 7 Tage, **Variante A:** Raster Tag × Stunde |
| `4c-bewegung-7-tage-B-balken-desktop.png` | Bewegung, 7 Tage, **Variante B:** Balken je Tag |
| `5a-rauchmelder-desktop.png` | Rauchmelder: Erreichbarkeit, ein Ausfall, ein Test |
| `6a-batterie-desktop.png`, `6b-…-handy.png` | Kachel Batterie: 90 Tage mit Batteriewechsel und Prognose |
| `7a-empfang-desktop.png`, `7b-…-handy.png` | Kachel Empfang: 7 Tage mit Zonen und einer Lücke |

Neu rendern: `CHROMIUM_PATH=… node src/render.mjs` (braucht `tests/panel/node_modules`).

## Entscheide, die der Nutzer treffen muss

1. **Bewegung über 7 und 30 Tage: A (Raster) oder B (Balken je Tag)?** **Empfehlung: A.** Das Raster zeigt, wann im Tag
   Bewegung ist, und damit Gewohnheiten und Ausreisser (Bewegung um 03:00). Die Anzahl je Tag steht als Kennzahl darüber.
   B beantwortet nur "wie viel", nicht "wann".
2. **Woher kommen 30 Tage Verlauf?** Home Assistant bewahrt den Verlauf von Zuständen standardmässig nur 10 Tage auf
   (Recorder, `purge_keep_days`). Zahlenwerte wie Batterie und Empfang gibt es dagegen als Langzeitstatistik über Monate.
   - **A (Empfehlung):** Ereignisse aus dem Verlauf von Home Assistant, so weit er reicht. Dazu merkt sich die Integration
     je Sensor kleine Stundenwerte (Anzahl, Sekunden offen) für 30 Tage; ältere werden verworfen. Grafik und Kennzahlen
     gehen damit immer 30 Tage zurück, die Liste so weit wie der Verlauf von Home Assistant (mit Hinweis, wenn er kürzer ist).
   - **B:** Die Integration speichert jedes Ereignis selbst für 30 Tage. Volle Liste, aber bei Bewegungsmeldern schnell
     Zehntausende Einträge je Sensor in einer Datei, die bei jeder Änderung neu geschrieben wird. Nicht empfohlen.
   - **C:** nur der Verlauf von Home Assistant. Kein eigener Speicher, aber "30 Tage" zeigt bei den meisten nur 10.
3. **Zeiträume der Batterie:** 30 Tage, 90 Tage, 1 Jahr statt 3 Stunden bis 30 Tage. Eine Batterie ändert sich in drei
   Stunden nicht. **Empfehlung: ja.**
4. **Liste: eine Zeile je Ereignis mit Dauer** (wie gezeichnet) statt je Wechsel. **Empfehlung: ja.**

## Weitere Ideen (nicht gezeichnet)

- **Blättern:** Pfeile im Kopf (Handy: wischen) zum vorherigen und nächsten Sensor, in der Reihenfolge der Liste.
- **Zum Alarm springen:** Ein Ereignis "Alarm ausgelöst" führt per Tipp zur Zeitachse dieses Alarms im Protokoll.
- **Vierte Kachel "Gerät":** Hersteller, Modell, Firmware, Integration, dazu nur zur Ansicht, in welchen Modi der Sensor
  überwacht wird und welche Optionen gelten, mit einem Link "In der Konfiguration zeigen".
- **Erreichbarkeit als Kennzahl bei jedem Sensor** (Prozent im Zeitraum, Anzahl Ausfälle): passt zum Versprechen
  "Sensoren werden überwacht".
- **Batteriewechsel erkennen** (Sprung nach oben) und daraus "hält im Mittel 14 Monate" ableiten.
- **CSV-Export** der Liste, wie im Protokoll.
- **Vergleich mit der Vorwoche** als dünne Linie hinter den Balken ("heute ungewöhnlich ruhig").

## Hinweise für die Umsetzung

- Klick auf Zeile oder Karte der Übersicht (`data-act="more"`) öffnet neu die Sensoransicht; das Öffnen in Home Assistant
  wandert auf den Knopf im Kopf.
- Fenster: `dialog.ag-dlg.ag-wide` auf dem Desktop; auf dem Handy eine neue Variante über den ganzen Bildschirm (die
  übrigen Fenster bleiben Blätter von unten).
- Daten über das WebSocket des Panels vom Server (nur Administratoren), nicht direkt aus dem Verlauf im Browser: so bleiben
  Auswertung (Öffnungen, Dauer, Zustand der Anlage zum Zeitpunkt) und Grenzen an einer Stelle und sind testbar.
- Grafiken als SVG ohne Bibliothek, wie die Zeitachse im Protokoll. Farben nur aus den Variablen des Panels.
- Tests: Server (Auswertung je Sensorart, Grenzen der Zeiträume, verworfene alte Werte), Panel-Suite (Desktop und Handy,
  beide Sprachen: nur die Liste scrollt, Kopf der Tabelle klebt, Kacheln nur mit Daten, kein Überlauf).
