# Mockups: Dashboard-Karte (2026-11-13)

Entwurf einer Karte, die mit der Integration mitkommt und sich in **jedes Dashboard** von Home Assistant einfügen lässt ("Karte
hinzufügen", ohne Einrichtung). Sie zeigt das **Bedienteil** und die **Infokarte** des Panels, genau so wie dort. Die Karten in den
Bildern sind die echten Kacheln des Panels (HA-Nachbau, dunkel), eingesetzt in ein nachgebautes Dashboard; erfundene Daten.
Desktop 1440 px, Handy 390 px. **Entschieden (2026-11-13) und umgesetzt in 1.34.0.**

## Wie es technisch gedacht ist

- Die Integration liefert eine JavaScript-Datei mit der Karte (`custom:alarmageddon-card`) und trägt sie selbst in HA ein. Sie erscheint im
  Dialog "Karte hinzufügen" mit Vorschau.
- Die Karte liest die Entität der Alarmanlage (`alarm_control_panel`) und steuert über die **Standarddienste** von HA
  (`alarm_arm_home`, `alarm_arm_away`, `alarm_disarm`, `alarm_trigger` nicht). Den Code prüft HA selbst, es gibt keine neuen Rechte und
  keinen eigenen Befehl am Server. Apple Home bleibt unberührt.
- Der Pfeil öffnet das Panel von Alarmageddon (nur Administratoren sehen es; für andere fehlt der Pfeil).
- Weitere Funktionen (Quittieren) brauchen heute einen Befehl, den nur Administratoren dürfen. Für normale Nutzer fehlte "Quittieren",
  oder es kommt ein eigener, ausdrücklich erlaubter Dienst dazu (offen, siehe unten).

## Varianten

| Bild | Variante |
| --- | --- |
| `1a-A-zwei-karten-desktop.png`, `1b-handy-A-zwei-karten-handy.png` | **A: zwei Karten**, "Bedienteil" und "Status", einzeln oder zusammen einfügbar. Wie im Panel. **Empfehlung.** |
| `2a-B-eine-karte-desktop.png`, `2b-handy-B-eine-karte-handy.png` | **B: eine Karte**, die Infokarte als Zeile unten im Bedienteil. Spart Platz, die Warnungen sind nur eine Zeile. |
| `3a-C-kompakt-desktop.png`, `3b-handy-C-kompakt-handy.png` | **C: nur das Bedienteil**, ohne "Bereit für". Die kleinste Karte. |

Zustände (Variante A): `4a/4b` Eingangsverzögerung mit Countdown, `5a/5b` Alarm mit rotem Band ("Quittieren", "Deaktivieren"), die Kachel
im Alarmrot und die Infokarte mit der Warnung.

`6a-auswahl-dialog-desktop.png`: so erscheinen die Karten im Dialog "Karte hinzufügen". `6b-editor-desktop.png`: der Editor der Karte
(Anlage wählen, Titel, Umschalter für "Bereit für", Alarmband, Kompakt, Pfeil).

## Entscheide des Nutzers (2026-11-13)

1. **Variante A:** zwei einzelne Karten, "Bedienteil" und "Status".
2. **Quittieren darf jede Person**, die die Karte benutzt (eigener Dienst `alarmageddon.acknowledge`). Der Administrator bestimmt mit der
   neuen Einstellung "Quittieren verlangt den Code" (Konfiguration › Anlage, Standard aus), ob dafür ein Code nötig ist.
3. **Deaktivieren (und Scharfschalten, wenn dafür ein Code nötig ist) fragt nach dem Code**, sobald einer programmiert ist.
4. Das Panel bleibt nur für Administratoren; die Karten kann man jeder Person geben.
5. Die Daten der Status-Karte kommen aus einer **neuen Status-Entität je Anlage** (`sensor.<anlage>_status`).

Quelle der Bilder: `src/mock.mjs` (`node docs/mockups/dashboard-karte-v1/src/mock.mjs`).
