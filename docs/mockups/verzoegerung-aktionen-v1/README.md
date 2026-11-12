# Mockups 1.18.0: Aktionen während der Verzögerungen (2026-11-12)

Entwürfe für Aktionen, die schon **während der Ausgangsverzögerung** und **während der Eingangsverzögerung** laufen, und für
eine Dauer, die der laufenden Verzögerung folgt. Im Design des Panels (das echte Panel im Nachbau, die neuen Teile sind
eingesetzt), mit erfundenen Daten. Desktop 1440 px, Handy 390 px. **Noch nicht entschieden, noch nicht umgesetzt.**

## Worum es geht

Stand 1.17.11:

- Die Aktionen unter "Anlage scharf geschaltet" starten erst, **wenn die Ausgangsverzögerung abgelaufen ist**. Ein
  Aktivierungston meldet also "jetzt scharf", nicht "die Zeit zum Verlassen läuft".
- Die Alarmaktionen starten bei "Alarm beginnt", also **nach der Eingangsverzögerung**. Während der Eingangsverzögerung
  läuft kein Ablauf, nur die Push-Meldung "Eingangsverzögerung".

Entscheide des Nutzers (2026-11-12, vor den Mockups):

1. Eigener fester Punkt für die Ausgangsverzögerung (kein Schalter je Schritt).
2. Neuer fester Punkt "Eingangsverzögerung läuft" vor "Alarm beginnt".
3. Die Dauer "wie die Verzögerung" folgt der **laufenden** Zeit: Wert des Modus, bei einem Sensor mit eigener
   Eingangsverzögerung dessen Wert. Der Ton endet immer zusammen mit der Verzögerung.

## Der Ablauf mit fünf festen Punkten

```
Scharfschalten beginnt        die Ausgangsverzögerung läuft        NEU
Anlage scharf geschaltet      wie heute
Eingangsverzögerung läuft     Zeit zum Deaktivieren                NEU
Alarm beginnt                 wie heute
Alarm endet (quittiert)       wie heute
```

| Bild | Variante |
| --- | --- |
| `1a-ablauf-A-zeitachse.png`, `1b-ablauf-A-handy.png` | **A: eine Zeitachse.** Alle fünf Punkte untereinander, wie heute. |
| `2a-ablauf-B-kapitel.png`, `2b-ablauf-B-handy.png` | **B: zwei Kapitel** "Beim Scharfschalten" und "Bei einem Alarm", darin dieselben Punkte. **Empfehlung:** die Seite wird länger, die Kapitel geben Halt. |

Die neuen Punkte tragen eine Uhr in Gelb (Verzögerung läuft), darunter steht die geltende Zeit des Modus.

## Die Dauer, die der Verzögerung folgt

Im Fenster des Schritts (Aktivierungston, Voralarm), Abschnitt "Wie lange es klingeln darf":

| Bild | Variante |
| --- | --- |
| `3a-dauer-A-schalter.png`, `3b-dauer-A-handy.png` | **A: Schalter** "Solange die Ausgangsverzögerung läuft" (links, Text rechts), an bei neuen Schritten. Die feste Dauer darunter ist dann ausgegraut. **Empfehlung:** gleiche Form wie "Bis die Alarmanlage deaktiviert wird". |
| `4a-dauer-B-auswahl.png`, `4b-dauer-B-handy.png` | **B: Auswahl** "Ausgangsverzögerung" als erster Knopf neben 10 s, 30 s, 1 min, 5 min. |

Auf der Karte des Schritts steht statt der Sekunden die Pille "Solange die Ausgangsverzögerung läuft" (blau).
Bei "Eingangsverzögerung läuft" heisst alles sinngemäss "Eingangsverzögerung".

## Vorgeschlagenes Verhalten (zur Bestätigung)

- **Scharfschalten beginnt:** Die Schritte starten, sobald jemand scharf schaltet. Ist die Anlage scharf (Zeit abgelaufen
  oder "Scharf, sobald geschlossen"), enden sie, laufende Töne verstummen, danach starten die Schritte von "Anlage scharf
  geschaltet". Deaktivieren stoppt sie sofort.
- **Ausgangsverzögerung 0:** Schritte mit "Solange die Verzögerung läuft" werden übersprungen, die übrigen laufen.
- **Eingangsverzögerung läuft:** Die Schritte starten, sobald ein Eingangssensor die Verzögerung auslöst. Deaktivieren
  stoppt sie sofort. Beginnt der Alarm, enden sie, und die Alarmaktionen übernehmen.
- **Der Alarm hat immer Vorrang:** Nichts in den neuen Punkten darf den Beginn der Alarmaktionen aufhalten oder
  verhindern, auch kein hängendes Gerät (Tests "scheitert" und "hängt", Mutationsprobe).
- **Erlaubte Schritte** in den neuen Punkten: Gerät schalten, Aktivierungston oder Voralarm, Warten, Szene, eigene Aktion.
  Keine Push-Meldung (dafür gibt es die Meldung "Eingangsverzögerung") und kein "Rückgängig".
- **Bestehende Schritte** unter "Anlage scharf geschaltet" bleiben dort und laufen wie bisher nach der Verzögerung.
- **"Immer aktiv":** dort gibt es keine der beiden Verzögerungen, also auch die neuen Punkte nicht.
- Je Modus wie die übrigen Abläufe, "Aktionen übernehmen von" nimmt sie mit, die Sicherung enthält sie.

## Quelle

`src/mock.mjs` (öffnet das Panel im Nachbau aus `tests/panel` und setzt die neuen Teile ein):
`node docs/mockups/verzoegerung-aktionen-v1/src/mock.mjs`
