# Änderungsprotokoll

[English](https://github.com/Diegofuego871/ha-Alarmageddon/blob/main/CHANGELOG.md)

Alle nennenswerten Änderungen an dieser Integration stehen in dieser Datei.

Das Format folgt [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
die Versionsnummern folgen [Semantic Versioning](https://semver.org/lang/de/).

## [0.39.0] - 2026-11-09

Sicherungen können einen Namen haben.

### Hinzugefügt

- **Name für eine Sicherung:** "Sichern" fragt nach einem Namen (freiwillig, zum Beispiel "vor dem Umbau"). Die Liste zeigt den Namen mit dem Datum darunter; ohne Namen steht das Datum.

## [0.38.0] - 2026-11-09

Sicherungen in der Integration, mit Liste.

### Hinzugefügt

- **Sichern** (Konfiguration › Anlage › Sicherung): Ein Knopf legt die aktuelle Konfiguration (alle Anlagen, Voreinstellungen, Benachrichtigungen; nie Codes) in der Integration ab. Darunter listet eine Tabelle die Sicherungen mit Datum und Anlagen: **wiederherstellen** (mit derselben Rückfrage wie beim Import), eine einzelne Sicherung als Datei **herunterladen** oder **löschen**. Es bleiben höchstens 10 Sicherungen; kommt eine elfte dazu, fällt die älteste weg. "Exportieren" und "Importieren" mit einer Datei bleiben.

## [0.37.0] - 2026-11-09

Nicht veröffentlicht; enthalten in 0.38.0.

Scharf- und Deaktivieren in der Übersicht zeigt, dass die Anlage arbeitet.

### Geändert

- **Sensoren auf dem Handy:** Dieselbe Tabelle mit den Kästchen wie am Computer, kompakt (Symbole in der Kopfzeile, Name, vier Kästchen, Pfeil), statt einer Karte je Sensor. Die Eingangsverzögerung und "Sensor entfernen" stehen im Blatt, das der Pfeil öffnet.
- **Knopf "Integration in HA öffnen"** steht wieder in jedem Reiter der Konfiguration (neben dem Namen oben), nicht nur bei Anlage.
- **Übersicht, Scharf- und Deaktivieren:** Der Knopf wechselt sofort; danach erscheint die Ladeanzeige (drei drehende Punkte, wie sonst) über dem leicht verschwommenen Hintergrund, bis Home Assistant den neuen Zustand meldet (höchstens 4 Sekunden). Währenddessen lässt sich nichts antippen, so ist klar, dass die Anlage arbeitet und nicht hängt.

## [0.36.0] - 2026-11-09

Nicht veröffentlicht; enthalten in 0.38.0.

Ein aufgeräumteres Protokoll, besonders auf dem Handy.

### Geändert

- **Filter im Protokoll** sind beschriftet ("Zeitraum", "Alarmanlage"), und eine Zeile mit den Daten, die der gewählte Zeitraum umfasst (zum Beispiel "Montag, 9. November 2026"), macht klar, was die Liste zeigt.
- **Download** steht als unauffälliges Download-Symbol in der festen Leiste unten, neben der Anzahl der Ereignisse und Alarme.

### Entfernt

- **JSON-Export.** Der CSV-Download bleibt.

### Behoben

- **Sensoren auf dem Handy:** Die Erklärung zum Schalter "Einstellungen pro Modus" steht da (die Leiste mit Schalter und Reitern scrollt auf dem Handy mit der Seite, am Computer bleibt sie fest). Damit zeigen alle vier Stellen mit diesem Schalter (Sensoren, Aktionen, Meldungen, Anlage) eine Erklärung, die sich mit dem Schalter ändert.
- **Aktionen auf dem Handy:** Die Erklärung zum Schalter "Einstellungen pro Modus" steht wieder da (die Leiste scrollt mit der Seite, statt fest zu stehen).
- **Tabellenköpfe kleben auch auf dem Handy** (Übersicht und Sensoren): Die oberste Zeile einer Tabelle mit Beschriftung, Filtern und Sortieren scrollt nie weg; auf dem Handy scrollen dafür die Filter weg, und die Tabellen sind so kompakt, dass sie ohne seitliches Scrollen passen. Die Standardspalten der Übersicht auf dem Handy sind jetzt Zustand, Batterie und Empfang (Firmware lässt sich unter "Ansicht" ergänzen).
- **Sensor-Blatt auf dem Handy:** Nur noch ein X statt zwei, und das Blatt läuft nicht mehr 22 px über den rechten Rand (die Leiste mit "Fertig" war zu breit, was den Inhalt nach links verschob).
- **Alarmablauf:** Auch unter den Plus-Knöpfen mehr Abstand (zwischen Plus und nächster Aktion).
- **Handy:** Die vier Reiter der Einstellungen pro Modus (Modi und "Immer aktiv") stehen in zwei Reihen statt sich zu überlappen.
- **Mehrere Alarmanlagen beim Start:** Lud Home Assistant zwei oder mehr Alarmanlagen zugleich, scheiterte eine mit "Einrichtungsfehler" ("Overwriting panel alarmageddon") und fehlte im Panel. Das Panel wird jetzt sicher nur einmal registriert.
- **Laden mit beschädigten Optionen:** Eine Alarmanlage lädt auch dann, wenn ein Eintrag der Sensor-Optionen beschädigt ist (kein Wörterbuch), bei der Übernahme der alten Wahl "Offener Sensor beim Scharfschalten" oder später. Die Ursache eines Einrichtungsfehlers steht immer im Protokoll von Home Assistant; zeigt eine Anlage "Einrichtungsfehler", hilft der vollständige Eintrag dort.

## [0.35.2] - 2026-11-09

### Geändert

- **Name der Alarmanlage** (Titel oder Dropdown, Stift, "Integration in HA öffnen") steht ganz oben neben dem Logo statt unter den Reitern. Der Name (oder das Dropdown zum Wechseln der Anlage, mit dem Stift zum Umbenennen) bleibt in jedem Reiter der Konfiguration sichtbar, auch bei Benachrichtigungen. Der Knopf "Integration in HA öffnen" steht nur im Reiter Anlage. Auf dem Handy zeigt der Knopf nur das Symbol.

## [0.35.1] - 2026-11-09

### Geändert

- **Aktionen:** Der Knopf "Testen" steht in der festen Leiste unten, neben "Abbrechen" und "Speichern" (auf dem Handy nur das Symbol).

### Behoben

- **Aktionen:** Die Leiste mit Schalter und Reitern bleibt beim Scrollen jetzt wirklich fest (sie scrollte bisher weg); auf dem Handy ist sie kompakt, ohne Erklärtext.
- **Aktionen auf dem Handy:** Die Karte "Alarm endet" wird nicht mehr in eine schmale Spalte gequetscht.

## [0.35.0] - 2026-11-09

Die Alarmanlage lässt sich umbenennen, mit Kurzbefehl nach Home Assistant.

### Hinzugefügt

- **Name der Alarmanlage** gross und fett oben in der Konfiguration (Sensoren, Aktionen, Anlage), mit einem Stift zum Umbenennen. Der Name ändert sich durchgängig in Home Assistant: Eintrag, Gerät und Name aller Entitäten. Ein Schalter "Entitäts-IDs aus dem neuen Namen neu erzeugen" benennt auch die Entitäts-IDs um, die noch dem alten Namen folgen (selbst benannte IDs bleiben); Automationen, die die alte ID nutzen, müssen angepasst werden. Ein Name, den eine andere Alarmanlage schon hat, wird abgelehnt.
- **Knopf "Integration in HA öffnen"** neben dem Namen: öffnet die Integrationsseite dieser Alarmanlage in Home Assistant.
- **Einstellungen pro Modus bei den Aktionen** (Konfiguration › Aktionen): derselbe Schalter wie bei Sensoren, Meldungen und Anlage. Aus (Standard): Ein Ablauf, samt "Alarm endet", gilt für jeden Alarm, in allen Modi und bei immer aktiven Sensoren. Ein: Reiter der Modi und "Immer aktiv", jeder mit eigenem Ablauf. Anlagen, deren Abläufe sich schon unterscheiden, starten mit eingeschaltetem Schalter. Beim Ausschalten gilt der Ablauf des ersten Modus für alle (zurücknehmen mit "Abbrechen").
- **Filter-Pillen bei den Ereignissen** im Reiter Protokoll (Alle, Alarme, Scharf, Deaktiviert, Scharfschalten fehlgeschlagen), mit Anzahl.

### Geändert

- **Reiterleisten der Einstellungen pro Modus** (Sensoren, Aktionen, Benachrichtigungen › Meldungen, Anlage) stehen links bündig unter dem Schalter. Bei den Sensoren bleibt die Leiste mit Schalter und Reitern beim Scrollen fest.
- **Bei mehreren Alarmanlagen** wird der Name zu einem gleich grossen Dropdown zum Wechseln der Anlage (statt des kleinen Dropdowns neben den Reitern). Benachrichtigungen gelten für alle Anlagen und zeigen keinen Namen.

## [0.34.2] - 2026-11-09

Nicht veröffentlicht; enthalten in 0.35.0.

### Behoben

- **Alarmablauf:** Die gestrichelte Linie eines Schritts, der nebenher läuft, geht nicht mehr durch den Plus-Knopf; der Plus-Knopf hat etwas mehr Abstand nach oben.

## [0.34.1] - 2026-11-09

Nicht veröffentlicht; enthalten in 0.35.0.

Der Geltungsbereich der Einstellungen pro Modus ist jetzt klar ersichtlich.

### Geändert

- **Einstellungen pro Modus:** Schalter, Reiter und alle Einstellungen darunter stehen in einer umrandeten Gruppe (Sensoren, Benachrichtigungen › Meldungen, Anlage › Zeiten und Verhalten), mit der Zeile "Alles darunter gilt nur für <Modus>".
- **Sensor-Blatt:** Ein grosses Banner "Diese Einstellungen gelten nur für <Modus>" (im Reiter "Immer aktiv": "…solange die Anlage deaktiviert ist") ersetzt die kleine Überschrift.

## [0.34.0] - 2026-11-09

Ein Reiter "Immer aktiv" bei den Einstellungen pro Modus, und Einstellungen pro Modus bei den Meldungen.

### Hinzugefügt

- **Reiter "Immer aktiv"** bei den Einstellungen pro Modus der Sensoren (Konfiguration › Sensoren, Schalter an): Er hat alle Sensor-Optionen für sich und gilt, solange die Anlage deaktiviert ist. Die Spalte "Immer aktiv" gehört zu diesem Reiter; die Option "Immer aktiv" selbst hängt nie an einem Modus, ein Rauchmelder lässt sich also nicht in einem Modus abschalten.
- **Einstellungen pro Modus bei den Meldungen** (Konfiguration › Benachrichtigungen › Meldungen): ein Schalter "Einstellungen pro Modus"; nur wenn er an ist, erscheinen die Reiter der Modi (es gibt keinen Reiter "Alle Modi", der erste Modus ist gewählt), und jeder Modus bekommt eigenes An/Aus, Kritisch, Lautstärke und "In Home Assistant stehen lassen" für die Meldungen im scharfen Zustand: Stiller Alarm, **Sensor nicht erreichbar, während scharf**, Eingangsverzögerung und Scharf geschaltet. Bei ausgeschaltetem Schalter gilt alles für alle Modi; die eigenen Werte bleiben gespeichert. Teil des Entwurfs und der Sicherung.

- **Einstellungen pro Modus bei der Alarmanlage** (Konfiguration › Anlage › Zeiten und Verhalten): ein Schalter "Einstellungen pro Modus", standardmässig aus. Aus: ein Satz Ausgangsverzögerung, Eingangsverzögerung und Bestätigungsfenster für alle Modi. Ein: Die Reiter der Modi erscheinen, und jeder Modus hat eigene Werte. Anlagen, deren Modi sich schon unterscheiden, starten mit eingeschaltetem Schalter. Beim Ausschalten gelten die Werte des ersten Modus für alle Modi. Teil der Sicherung.

### Geändert

- **"Sensor nicht erreichbar, während scharf"** steht jetzt bei den übrigen Meldungen (vorher unter Wartung), damit es je Modus abweichen kann. "Sensor nicht erreichbar" (längere Zeit) bleibt unter Wartung.

## [0.33.0] - 2026-11-09

Einstellungen pro Modus vereinfacht: dieselbe Tabelle, mit den Einstellungen des gewählten Modus.

### Geändert

- **Einstellungen pro Modus funktionieren anders** (Konfiguration › Sensoren): Die Reiter der Modi erscheinen nur, wenn der Schalter "Einstellungen pro Modus" an ist; es gibt keinen Reiter "Alle Modi" mehr, und der erste Modus ist gewählt. Mit eingeschaltetem Schalter hat die Tabelle die **gleichen Spalten wie vorher** (Zonen aller Modi, "Immer aktiv", Eingangsverzögerung), so siehst du immer, in welchen Modi ein Sensor aktiv ist. Die Spalte des gewählten Modus und "Immer aktiv" (gilt dann für diesen Modus) sind hervorgehoben. Alle anderen Sensor-Optionen (darf offen sein, umgehen, scharf sobald geschlossen, Ausfall gilt als Alarm, braucht zweiten Sensor, stiller Alarm) stellst du im Blatt des Sensors ein, für den gewählten Modus. Mit ausgeschaltetem Schalter ist alles wie vor 0.32.0. Am Handy zeigen die Zonen-Knöpfe der Karten den gewählten Modus mit einem Rahmen. Mehr Abstand um den Schalter.
- **Der Herkunftstext** einer Option in einem Modus heisst "Grundwert (wie vor dem Einschalten)" und "Eigener Wert für {Modus}" mit "zurück zum Grundwert".

## [0.32.0] - 2026-11-09

Sensor-Einstellungen pro Modus, und "Umgehen" ist jetzt eine Einstellung pro Sensor.

### Hinzugefügt

- **Einstellungen pro Modus** in Konfiguration › Sensoren: Ein Schalter "Einstellungen pro Modus" über der Tabelle. Aus (Standard): Die Einstellungen eines Sensors gelten für alle Modi, wie bisher. Ein: Die Reiter "Alle Modi", "Anwesend", "Abwesend" und "Nacht" sind wählbar, und jeder Modus kann für **alle** Sensor-Optionen eigene Werte haben (immer aktiv, darf offen sein, umgehen, scharf sobald geschlossen, Ausfall gilt als Alarm, braucht zweiten Sensor, stiller Alarm). Der Reiter eines Modus zeigt die Tabelle mit allen Optionen als Kästchen (ein Punkt markiert einen eigenen Wert dieses Modus), das Blatt eines Sensors zeigt die Werte des gewählten Modus mit Herkunft ("Eigener Wert für Abwesend" / "Wie bei Alle Modi") und "zurück zu Alle Modi". Ohne eigenen Wert gilt der Wert für alle Modi, dann die Voreinstellung der Sensorart. Beim Ausschalten bleiben die Werte erhalten (sie gelten nur nicht). Teil des Entwurfs und der Sicherung.
- **Neue Sensor-Option "Beim Scharfschalten umgehen":** Ist der Sensor beim Scharfschalten offen und darf nicht offen sein, wird er bis zum Deaktivieren übergangen, statt das Scharfschalten zu verhindern. Sie gehört auch zu den Voreinstellungen je Sensorart.

### Entfernt

- **Die Einstellung "Offener Sensor beim Scharfschalten"** (verhindern oder umgehen) der Alarmanlage, im Panel und im Optionsdialog von Home Assistant. Das entscheidet jetzt jeder Sensor und, wenn du willst, jeder Modus. Bestehende Alarmanlagen behalten ihr Verhalten: Ein früheres "Umgehen" wird einmal auf die Option "Umgehen" der Sensoren übertragen (je Modus, wenn die Modi sich unterschieden); die alten Werte verschwinden.

## [0.31.0] - 2026-11-09

Meldungen können in Home Assistant stehen bleiben, "Nur melden" heisst neu "Stiller Alarm", und die Scrollposition springt nicht mehr.

Nicht veröffentlicht; enthalten in 0.32.0.

### Hinzugefügt

- **Als Benachrichtigung in Home Assistant stehen lassen** (Konfiguration › Benachrichtigungen): Jede Art, Alarm und Wartung, kann zusätzlich in der Glocke von Home Assistant erscheinen. Sie bleibt, bis jemand sie wegklickt, unabhängig von den Empfängern; dieselbe Art ersetzt ihren eigenen Eintrag (die Alarmmeldung wird durch "Alarm beendet" ersetzt). Die Einstellung kann auch je Modus abweichen, wo es Meldungen je Modus gibt. Teil der Sicherung.

### Geändert

- **Die Sensor-Option "Nur melden" heisst "Stiller Alarm"** überall (Option, Hinweise, Liste).

### Behoben

- **Sensoren hinzufügen scrollt nicht mehr nach oben:** Im Fenster "Sensoren hinzufügen" bleibt die Liste stehen, wenn du einen Sensor antippst, und Fenster behalten ihre Scrollposition, wenn sie neu gezeichnet werden.
- **Tabellenkopf und Blatt oben nicht mehr abgeschnitten:** Die festen Teile oben (Reiter, Unterreiter, Werkzeugleiste) verdecken die ersten Zeilen nicht mehr; ihr Abstand gehört zu den Teilen selbst und ist darum beim Scrollen gleich.

## [0.30.0] - 2026-11-09

Darstellungsfehler in der Sensortabelle und im Ablauf der Aktionen behoben.

### Behoben

- **Sensortabelle:** Auf einem breiten Bildschirm behält die Tabelle ihre Breite, und die Kästchen bleiben an ihrem Platz, wenn die Optionen eines Sensors aufgehen (das Blatt steht daneben). Papierkorb und Pfeil stehen auf einer Zeile, der Pfeil ganz rechts.
- **Feste Teile oben** (Reiter, Unterreiter, Werkzeugleiste, Spaltenkopf) schieben sich beim Scrollen nicht mehr übereinander; sie werden neu gemessen, wenn sich ihre Höhe ändert (zum Beispiel wenn das Logo geladen ist).
- **Ablauf der Aktionen:** Die Symbole "Alarm beginnt" und "Alarm endet" sind undurchsichtig, die Linie scheint nicht mehr durch.

## [0.29.0] - 2026-11-09

Eigene Meldungswerte je Modus für alles, was passiert, während die Anlage scharf ist.

Enthält die Änderungen aus 0.28.0.

### Hinzugefügt

- **Meldungen je Modus** (Konfiguration › Benachrichtigungen › Meldungen): Unterreiter "Alle Modi", "Anwesend", "Abwesend", "Nacht". Die Arten, die nur im scharfen Zustand vorkommen (**Stiller Alarm**, **Eingangsverzögerung**, **Scharf geschaltet**, **Sensor nicht erreichbar, während scharf**), können je Modus eigene Werte haben (an/aus, Kritisch, Lautstärke, eigene Testmeldung). Ohne eigenen Wert gilt der Wert von "Alle Modi"; jede Art zeigt ihre Herkunft ("Eigener Wert für diesen Modus" / "Wie bei Alle Modi") mit "Zurücksetzen", und "Alle Modi" weist auf die Modi mit eigenen Werten hin. Teil des Entwurfs und der Sicherung, vom Server geprüft.

## [0.28.0] - 2026-11-09

Die Update-Funktion ist entfernt, "Alarm endet" hat eine eigene Meldung, und die Sensortabelle zeigt "Immer aktiv".

Nicht veröffentlicht; enthalten in 0.29.0.

### Entfernt

- **Die ganze Update-Funktion** (Konfiguration › Updates, die tägliche Prüfung, die Entität von HACS, die Meldung "Update verfügbar" unter Reparaturen und bei den Meldungsarten, "Updates automatisch installieren", die Release Notes im Panel und die Einstellungen in der Sicherung). Aktualisiert wird über HACS wie bei jeder Integration. Alte Einstellungen und die alte Meldung unter Reparaturen verschwinden von selbst.

### Hinzugefügt

- **Element "Alarm endet"** am Ende jedes Ablaufs (Konfiguration › Aktionen, je Modus) mit einer optionalen **eigenen Meldung**, wenn jemand deaktiviert: dieselben Optionen wie die Alarmmeldung (Titel und Text mit Platzhaltern, Vorschau, Kritisch, Lautstärke, Klickziel; ohne Knöpfe), in einem Fenster wie bei den Schritten, mit Testknopf. Die Meldung ersetzt die Standardmeldung "Alarm beendet" (gleicher tag, ersetzt also die Alarmmeldung auf dem Handy). Teil der Sicherung. Ob Geräte nach dem Alarm zurückkehren, entscheidet allein "Rückgängig beim Deaktivieren/Quittieren" im jeweiligen Schritt.
- **"Immer aktiv" als Kästchen** in der Sensortabelle unter Konfiguration › Sensoren (und als Knopf auf den Karten am Handy): zeigt den wirksamen Wert; ein Klick setzt einen eigenen Wert für diesen Sensor.
- **Filter nach Sensorart** (Aufklappmenü) in der Sensorliste der Übersicht.
- **Übersicht bleibt im Blick:** Bei hohem Fenster bleiben die Karten der Alarmanlagen, die Filter und der Spaltenkopf beim Scrollen stehen.

### Geändert

- **Sensortabelle (Konfiguration):** Pfeil und Löschsymbol stehen nebeneinander, der Pfeil ganz rechts; die Spalten Integration und Batterie entfallen, damit es übersichtlich bleibt.
- **Ablauf der Aktionen:** Die Linie läuft nicht mehr durch die Karten und endet bei "Alarm endet", das ein farbiges Symbol hat.
- **Lautstärkeregler** höchstens halb so breit; **Rollbalken in Fenstern** mit mehr Abstand zum Rand.
- **Fenster:** Der Spaltenkopf der Tabellen wird nicht mehr von der Werkzeugleiste verdeckt.
- **"Sensor meldet (kein Alarm)" heisst neu "Stiller Alarm"**, und das Kapitel "Alarmmeldungen" heisst "Meldungen" (Konfiguration › Benachrichtigungen).

## [0.27.0] - 2026-11-09

Ein Element "Alarm endet" am Ende jedes Ablaufs bestimmt, was Deaktivieren tut.

Enthält die Änderungen aus 0.24.0, 0.25.0 und 0.26.0.

### Behoben

- **Die Ansicht springt nicht mehr nach oben**, wenn der Bildschirm neu gezeichnet wird (Sensoren markieren, Sensoren hinzufügen, Fenster schliessen): Die Scrollposition bleibt innerhalb derselben Ansicht erhalten, und ein schliessendes Fenster kehrt zur Position beim Öffnen zurück.

### Hinzugefügt

- **Element "Alarm endet"** am Ende jedes Ablaufs (Konfiguration › Aktionen, je Modus): die Wahl "Beim Deaktivieren/Quittieren": **Stoppen, markierte Schritte rückgängig** (wie bisher, Standard), **Stoppen, alle Schritte rückgängig** (alle Geräte, die die Schritte verändert haben, kehren in den Zustand vor dem Alarm zurück, unabhängig von der Einstellung je Schritt) oder **Nur stoppen, nichts rückgängig** (alle Schritte stoppen und Alarmtöne verstummen, geschaltete Geräte bleiben). Die Wahl gehört zum Entwurf, zur Sicherung und zu den Daten der Anlage; der Standard wird nicht gespeichert.

## [0.26.0] - 2026-11-09

Strukturierte Fenster mit Schliessen-Knopf und festen Knöpfen, feste Kopfzeile mit sortierbarer Liste, freie Spaltenwahl je Gerät, Filter "Belegung" und Voreinstellungen für alle Sensoren übernehmbar.

Nicht veröffentlicht; enthalten in 0.27.0.

### Hinzugefügt

- **Fenster (Popups) wie in Device Panel:** Jedes Fenster hat oben rechts einen runden Schliessen-Knopf (x), und die Knöpfe unten (Abbrechen, Übernehmen, Speichern …) bleiben im Blick, während der Inhalt scrollt. "Abbrechen", das x und Escape fragen "Änderungen verwerfen?", wenn etwas eingegeben oder geändert wurde (Aktionsschritt, Sensorauswahl, Voreinstellungen, neuer Code).
- **Feste Kopfzeile:** Titelleiste mit Reitern, Unterreiter, Werkzeugleiste und der Spaltenkopf der Sensortabellen bleiben beim Scrollen stehen; es scrollt nur die Liste.
- **Nach Spalte sortieren:** Ein Klick auf einen Spaltenkopf der Sensorliste sortiert danach (ein zweiter Klick kehrt um, ein Pfeil zeigt die Richtung); jede Spalte lässt sich sortieren (Zustand, Batterie, Prognose, Empfang, Firmware, Modell, Integration, letzte Änderung, Bereich, Zonen). Leere Werte stehen immer am Ende. Die Kopfzeile ist prägnanter. Die Wahl steht auch im Fenster "Ansicht" als Aufklappmenü.
- **Filter "Belegung":** Bewegungs-, Belegungs- und Anwesenheitssensoren haben einen eigenen Filter; "Offen" zählt sie nicht mehr mit.
- **Sensorzeile überall antippen** in Konfiguration › Sensoren (auf dem Handy auch die Karte) öffnet die Optionen; Kästchen, Schalter und Knöpfe in der Zeile behalten ihre Aufgabe.
- **"Auf alle Sensoren anwenden"** bei den Voreinstellungen je Sensorart: löscht die eigenen Werte aller Sensoren, damit jeder Sensor den Voreinstellungen folgt (mit Warnung und Anzahl der betroffenen Sensoren).
- **Logo** der Integration neben den Reitern.
- **"Rückgängig beim Deaktivieren/Quittieren"** (vorher "Beim Deaktivieren in den vorherigen Zustand zurück") mit klarem Hinweis bei jeder Aktion, wo es sinnvoll ist (Gerät schalten, Alarmton, Eigene Aktion mit Geräten). Nicht bei "Szene oder Skript", deren Wirkung sich nicht allgemein rückgängig machen lässt.

### Geändert

- **Alarmton:** Der neue Schritt ist standardmässig "Nicht abwarten", der nächste Schritt startet also sofort; bestehende Schritte bleiben wie gespeichert.
- **Aufklappmenüs sehen überall gleich aus** (eigener Pfeil mit Abstand zum Rand); die Wahl der Alarmanlage in der Konfiguration ist auffällig.
- **Breite Bildschirme:** Der Inhalt ist höchstens 1680 px breit, links und rechts bleibt Weissraum.
- **Dialog der Push-Meldung** in Kapiteln mit Strich vor dem Titel (Meldung, Zustellung, Klickziel, Aktionen); das Design gilt in allen Aktionsdialogen.

## [0.25.0] - 2026-11-09

Die Sensorliste auf der Übersicht funktioniert wie die Liste in Device Panel (eigene Spalten für Handy und Computer), und der Alarm dauert, bis er quittiert wird.

Nicht veröffentlicht; enthalten in 0.27.0.

### Hinzugefügt

- **Sensorliste wie in Device Panel:** Die Liste ist die Standardansicht, am Computer und auf dem Handy. Spalten werden für den **Computer** und das **Handy** getrennt gewählt und angeordnet (Ansicht › "Für diesen Computer" / "Für das Handy"), mit eigener Sortierung, Richtung und Gruppierung, und pro Benutzer in Home Assistant gespeichert (zusätzlich im Browser als Rückfall). Spalten: Zustand, Batterie, Prognose, Empfang, Firmware, Modell, Integration, letzte Änderung, Bereich, Zonen. Das Handy bekommt standardmässig einen kompakten Satz (Zustand, Batterie, Empfang, Firmware).
- **Kartenansicht ist optional** auf beiden Geräten (Umschalter "Liste / Karten"); die Karten zeigen die für das Gerät gewählten Felder.

### Geändert

- **Der Alarm dauert, bis er quittiert wird:** Der Zustand "Alarm" bleibt, bis jemand deaktiviert, in jedem Modus und auch bei immer aktiven Sensoren. Die Einstellung "Alarmdauer" ist aus dem Panel, dem Optionsdialog und den Alarmanlagen entfernt. Wie lange eine Sirene oder ein Alarmton läuft, steht im Schritt der Aktionen (Alarmton: "Dauer"). Deaktivieren stoppt weiterhin alle Schritte und stellt die Geräte zurück. Alte Werte in den Optionen oder in einer Sicherung werden ignoriert.
- **Die Vorschau der Pushmeldung** steht jetzt direkt unter den Platzhaltern, vor den Optionen zur Zustellung.
- **Verständlichere Beschriftung der Knöpfe der Pushmeldung** (Konfiguration › Aktionen, Schritt "Push-Meldung"): Die Gruppe heisst "Aktionen der Pushmeldung", jeder Eintrag sagt, dass er als Knopf unter der Meldung erscheint und was er tut. Der Hinweis zum Alarmton erwähnt die Alarmdauer nicht mehr.
- **Die Ebene "Immer aktiv" entfällt** in Konfiguration › Anlage › "Einstellungen je Modus": Sie enthielt nur die Alarmdauer. Die Aktionen für "immer aktiv" bleiben in Konfiguration › Aktionen.

## [0.24.0] - 2026-11-09

Nicht veröffentlicht; enthalten in 0.27.0.

### Geändert

- **Alle Reiter- und Auswahlleisten folgen dem Design von Device Panel** (Design-Regel "Auswahlknöpfe"): gleich breite Felder mit 2 px Abstand, 3 px Innenabstand und 14 px Rundung, die Leiste in 7 % Textfarbe über der Kartenfarbe, das gewählte Feld als Kapsel in der Farbe des Seitengrunds mit dünnem Innenrand, der gewählte Reiter in der Akzentfarbe (Schrift 500). Die Kapsel gleitet in 0,46 s mit leichtem Nachschwingen zum neuen Reiter und ist unterwegs etwas durchscheinend.
- **Neuzeichnen unterbricht das Gleiten nicht:** Das Panel merkt sich die letzte Lage jeder Kapsel und fährt von dort weiter, auch wenn die Leiste mitten in der Fahrt neu gezeichnet wird (kein Sprung zurück). Ohne gewählten Reiter gibt es keine Kapsel. Bei "Bewegung reduzieren" im System steht die Kapsel sofort am Ziel. Jede Leiste hat einen eigenen Schlüssel, zwei Leisten teilen sich nie eine Lage.
- **Handy:** Tippfläche mindestens 44 px, die Leisten füllen die Breite, ab fünf Reitern vier Spalten in Zeilen (bei schmalen Handys drei). Kleine Leisten (zum Beispiel der Umschalter Liste / Karten) bleiben so breit wie ihr Inhalt.
- **"Offener Sensor beim Scharfschalten" ist ein Aufklappmenü** (Konfiguration › Anlage › Verhalten) statt zwei Reitern: Reiter wirkten dort zu nah an der Navigation und verwirrten.

### Behoben

- **"Letzte Änderung" in der Sensorliste** springt nicht mehr auf den Zeitpunkt des letzten Neustarts von Home Assistant. Nur ein Wechsel zwischen offen und zu zählt; "nicht verfügbar" und zurück (Neustart, Funkabbruch) nicht. Alarmageddon merkt sich die Zeit selbst und liest für Sensoren ohne gemerkte Zeit einmal den Verlauf (Recorder, letzte 90 Tage); ohne echten Wechsel in dieser Zeit zeigt die Liste "–".


## [0.23.0] - 2026-11-08

Enthält die Änderungen aus 0.22.0.

### Hinzugefügt

- **Kartenlayout für die Sensorliste** (Übersicht): ein Umschalter "Liste / Karten" neben "Ansicht". Die Karten zeigen je Sensor eine kleine Karte mit allen Angaben der gewählten Spalten (Zustand, Batterie, Prognose, Empfang, Firmware, Modell, Integration, letzte Änderung, Zonen), als Raster und wie die Liste gruppiert. Auf dem Handy gelten immer die Karten, sie folgen der Breite.
- **Klickziel der Alarmmeldung** (Konfiguration › Aktionen, Schritt "Push-Meldung"): Standardmässig öffnet ein Tipp das Protokoll mit dem laufenden Alarm (was seit dem Auslösen wann passiert ist, die Ansicht aktualisiert sich alle 5 Sekunden). Alternativ die Übersicht oder ein eigener Pfad in Home Assistant (zum Beispiel `/lovelace/alarm`). Der Knopf "Öffnen" nutzt dasselbe Ziel.
- **"Wartet auf das Ende" / "Läuft nebenher" an jedem Schritt** des Ablaufs: Ein Schalter an der Karte stellt es mit einem Tipp um, und nach einem Schritt, der nebenher läuft, ist die Verbindung zum nächsten gestrichelt, so sieht man den Ablauf auf einen Blick.
- **Durchsuchbare Auswahl** bei "Art" und "Aktion" einer eigenen Aktion: Tippen filtert die Liste.
- **Sensoren hinzufügen** (Konfiguration › Sensoren › "Sensoren hinzufügen"): dieselben Filterpillen wie die Sensorliste (Alle, Türen & Fenster, Bewegung, Weitere) und ein höheres Suchfeld.
- Das Protokoll aktualisiert sich alle 5 Sekunden, solange es offen ist (vorher nur bei laufendem Alarm).

### Geändert

- **Filterpillen haben Abstand** (auch zwischen den Zeilen, wenn sie umbrechen).
- **Das Kapitel "Alarmmeldung" in Konfiguration › Benachrichtigungen entfällt** (die Einstellungen stehen im Push-Schritt, ein weiterer Hinweis braucht es nicht).

### Behoben

- **Die Alarmanlage wurde nach dem Hinzufügen von Sensoren vergessen** ("Noch keine Alarmanlage", und das Panel hing): Home Assistant lädt die Alarmanlage beim Speichern neu, und das Seitenpanel wurde dabei entfernt und neu angelegt. Das Panel bleibt jetzt stehen; die Oberfläche behält die letzten Daten und zeigt die Ladeanzeige (dieselbe wie Device Panel: gedimmter Inhalt, drei drehende Punkte), bis das Neuladen fertig ist. Das Seitenpanel verschwindet erst, wenn die letzte Alarmanlage entfernt wird.

## [0.22.0] - 2026-11-08

Nicht veröffentlicht; enthalten in 0.23.0.

### Hinzugefügt

- **Zeitraum im Protokoll** (Reiter Protokoll): "Alles", "Letzte 3 Stunden", "Letzte 24 Stunden", "Heute", "Gestern", "Letzte 7 Tage", "Letzte 30 Tage", "Tag wählen …" (mit dem Datumsfeld zu einem Tag springen) und "Zeitraum wählen …" (von, bis). Bei mehreren Alarmanlagen lässt sich auch nach Alarmanlage filtern. Die Liste zeigt, wie viele Ereignisse und Alarme passen. Der Zeitraum wird pro Browser gemerkt.
- **Export des Protokolls** als CSV (Semikolon und BOM, öffnet sich in Excel richtig) oder JSON. Der Export enthält genau das, was der gewählte Zeitraum und die gewählte Alarmanlage zeigen: die Ereignisse und die Zeitachsen der Alarme (CSV: eine Zeile je Eintrag mit Zeit, Alarmanlage, Art, Beschreibung, Sensor, Person und dem Alarm, zu dem er gehört). Die Liste auf dem Bildschirm zeigt die neuesten 300 Ereignisse; der Export enthält alle.

### Geändert

- **Das Protokoll behält mehr:** bis zu 1000 Ereignisse und 30 Alarme je Alarmanlage (vorher 50 und 20), damit Zeiträume wie "Letzte 30 Tage" etwas bringen.

## [0.21.0] - 2026-11-08

Nicht veröffentlicht; enthalten in 0.23.0.

### Hinzugefügt

- **Symbol der Integration in den Meldungen:** Jede Meldung von Alarmageddon (Alarm, Sensoren, Wartung, Update) trägt das Symbol der Integration. Android zeigt es als Symbol der Meldung. iOS zeigt immer das Symbol der Home-Assistant-App; das lässt sich von einer Integration nicht ersetzen. Das Symbol liefert Home Assistant ohne Anmeldung aus (`/alarmageddon_icon.png`).

## [0.20.0] - 2026-11-08

Nicht veröffentlicht; enthalten in 0.23.0.

### Geändert

- **Alarmmeldung nur im Push-Schritt** (Konfiguration › Aktionen, "Push-Meldung"): Kritisch, Lautstärke und die Knöpfe "Öffnen", "Sirene stumm" und "Deaktivieren" stellst du dort ein, zusammen mit Titel und Text, für jeden Modus und Push-Schritt getrennt. In Konfiguration › Benachrichtigungen gibt es die Art "Alarm" und das Kapitel "Knöpfe in der Meldung" nicht mehr; ein Hinweis mit Knopf führt zu den Aktionen.
- **Bestehende Alarmanlagen verhalten sich wie bisher:** Ein Push-Schritt ohne eigene Werte nutzt die früheren globalen Werte (Kritisch, Lautstärke, Knöpfe), bis du sie im Schritt änderst.
- **Ein Knopf wirkt nur, wenn die Meldung ihn anbietet.** Das wird aus der Konfiguration abgeleitet und wirkt darum auch nach einem Neustart von Home Assistant bei einer Meldung, die noch auf dem Handy steht.
- **Die Alarmmeldung lässt sich nicht mehr abschalten:** Sie geht immer raus (ein früheres "aus" bei der Art "Alarm" zählt nicht mehr). Ohne Push-Schritt in den Aktionen geht eine Standardmeldung raus (kritisch, Knopf "Öffnen").

## [0.19.0] - 2026-11-08

Nicht veröffentlicht; enthalten in 0.23.0.

### Hinzugefügt

- **Eigener Titel und Text der Alarmmeldung** (Konfiguration › Aktionen, Schritt "Push-Meldung", mit dem Stift öffnen): Der Standardtext steht in den Feldern und lässt sich beliebig ändern. Die Platzhalter `{name}` (Alarmanlage), `{sensor}` (auslösender Sensor), `{time}` (Uhrzeit) und `{mode}` (Modus) fügt man mit einem Tipp ein, beim Alarm werden sie gefüllt; eine Vorschau zeigt die Meldung mit echten Namen. "Standardtext wiederherstellen" bringt den Standard zurück. Ein unveränderter Text wird nicht gespeichert und folgt so weiter der Sprache von Home Assistant. Knöpfe, Kritisch und Lautstärke kommen wie bisher aus Konfiguration › Benachrichtigungen.

## [0.18.0] - 2026-11-08

Nicht veröffentlicht; enthalten in 0.23.0.

### Geändert

- **Alarmton: Dauer statt Wiederholungen** (Konfiguration › Aktionen): "Wie lange es klingeln darf" in Sekunden (mit Schnellwahl 10 s, 30 s, 1 min, 5 min) oder "Bis die Alarmanlage deaktiviert wird": Der Ton wiederholt sich dann ohne Ende, bis jemand deaktiviert, die Sirene stumm schaltet oder die Alarmdauer endet. Ist die Zeit um, werden die Medienplayer gestoppt, damit der Ton nicht ausklingt. Bestehende Schritte mit Wiederholungen funktionieren weiter (angezeigt als passende Sekundenzahl, gespeichert wie bisher, bis du sie bearbeitest).
- **"Sirene stumm" wirkt immer:** Der Knopf in der Meldung stoppt jetzt auch dann die Medienplayer, wenn alle Schritte der Aktionen schon durch sind, ein Ton aber noch klingen könnte, und er wirkt bei einem Ton ohne Ende.

## [0.17.0] - 2026-11-08

Nicht veröffentlicht; enthalten in 0.23.0.

### Hinzugefügt

- **"Nicht abwarten"** (Konfiguration › Aktionen, je Schritt der Art Gerät schalten, Alarmton, Szene oder Skript, Eigene Aktion): Der nächste Schritt startet sofort und nicht erst, wenn dieser zu Ende ist. Für einen sehr langen Alarmton oder ein träges Gerät, damit die folgenden Schritte nicht aufgehalten werden. Deaktivieren stoppt auch Schritte, die nebenher laufen. Ein fehlerhafter Schritt hält die anderen nie auf, mit oder ohne die Option (wie bisher). Schritte, die nebenher laufen, werden nach einem Neustart von Home Assistant mitten im Alarm nicht fortgesetzt; die Schritte danach schon.

### Behoben

- **Leiste mit Speichern unten:** Bei Seiten mit wenig Inhalt (zum Beispiel ein Alarm ohne Schritte) sitzt die Leiste mit "Abbrechen" und "Speichern" jetzt am unteren Fensterrand statt mitten im Bild; der Abstand darüber bleibt.


## [0.16.0] - 2026-11-08

Nicht veröffentlicht; enthalten in 0.23.0.

### Hinzugefügt

- **Knöpfe der Alarmmeldung mit eigenen Schaltern** (Konfiguration › Benachrichtigungen, Kapitel "Knöpfe in der Meldung"): "Öffnen" (standardmässig an), "Deaktivieren" (standardmässig aus, wie bisher) und neu "Sirene stumm" (standardmässig aus). "Sirene stumm" stoppt alle Schritte der Alarmaktionen und stellt die Geräte zurück; die Alarmanlage bleibt im Alarm, bis jemand deaktiviert. Es wirkt nur bei einem echten Alarm mit laufenden Aktionen, die letzten Ereignisse und die Zeitachse des Alarms zeigen es.

### Behoben

- **Eigene Aktion im Aktionen-Editor** zeigte die technischen Namen von Home Assistant (`cover.set_cover_position`, Feld `speed`). Arten, Aktionen, Beschreibungen, Feldnamen und Auswahlwerte erscheinen jetzt in deiner Sprache, geholt bei Home Assistant wie in dessen eigener Oberfläche; wo Home Assistant keine Übersetzung hat, wird der Name lesbar gemacht ("Set cover position").
- **Abstände:** Das letzte Element einer Seite klebt nicht mehr an der Leiste mit "Abbrechen" und "Speichern"; Hinweise, Warnungen und die Zeilen mit "Testmeldung" haben mehr Platz.


## [0.15.0] - 2026-11-08

Nicht veröffentlicht; enthalten in 0.23.0.

### Geändert

- **Nicht erreichbare Sensoren an einer Stelle** (Konfiguration › Benachrichtigungen, Kapitel "Wartungsmeldungen"): Die beiden Einträge "Sensor im scharfen Zustand nicht erreichbar" und "Sensor nicht erreichbar" sind jetzt eine Karte "Sensor nicht erreichbar" mit zwei Fällen, je mit eigenem Schalter, Kritisch, Lautstärke und Testmeldung: "Während die Anlage scharf ist" (wird sofort gemeldet, geht an die Empfänger für Alarme) und "Längere Zeit ausgefallen" (nach der eingestellten Zeit, auch bei deaktivierter Anlage, geht an die Empfänger für Wartung). Einstellungen und Empfänger bleiben unverändert.
- **Bessere Erklärungen:** "Sensor meldet (kein Alarm)" sagt jetzt, dass statt eines Alarms nur diese Meldung rausgeht, höchstens eine pro Sensor und Minute, und wo die Option "Nur melden" gesetzt wird (pro Sensor).

## [0.14.0] - 2026-11-08

Nicht veröffentlicht; enthalten in 0.23.0.

### Geändert

- **Sensorliste ist eine Auswahl** (Konfiguration › Sensoren): Die Liste zeigt nicht mehr jeden Sensor, den Home Assistant kennt; so blieben Sensoren sichtbar, die mit einer Alarmanlage nichts zu tun haben. "Sensoren hinzufügen" öffnet ein Fenster mit allen Sensoren, die Alarmageddon erkennt (Suche, nach Bereich gruppiert); du wählst die, die zu dieser Alarmanlage gehören, und nimmst sie auf. Jede Alarmanlage hat ihre eigene Liste.
- **Aus der Liste entfernen:** je Sensor mit dem Papierkorb-Knopf (oder im Seitenblatt des Sensors). Zonen, Eingangsverzögerung und eigene Optionen dieses Sensors werden gelöscht; er lässt sich jederzeit wieder aufnehmen.
- **Bestehende Alarmanlagen:** Sensoren, die schon in einer Zone stehen oder eigene Optionen haben, bleiben in der Liste; alle anderen müssen einmal hinzugefügt werden. Für Alarm, Zonen und Übersicht ändert sich nichts.
- Die Liste ist Teil der Sicherung.

## [0.13.0] - 2026-11-08

Nicht veröffentlicht; enthalten in 0.23.0.

### Hinzugefügt

- **Aktionen und Meldungen in der Zeitachse des Alarms:** Jeder gestartete Schritt der Alarmaktionen (Meldung, Aktion mit Geräten, Alarmton, Warten) und jede Meldung, die während des Alarms rausgeht, erscheint im Reiter Protokoll in der Reihenfolge mit den Sensoren. Schritte eines Testlaufs sind mit "Test" markiert.

## [0.12.0] - 2026-11-08

Protokoll als eigener Reiter mit grafischer Zeitachse für jeden Alarm.

Enthält die Änderungen aus 0.7.0, 0.8.0, 0.9.0, 0.10.0 und 0.11.0.

### Hinzugefügt

- **Alarm-Aufzeichnung:** Jeder Alarm wird vom ersten Auslöser (Eingangsverzögerung oder Alarm) bis zum Quittieren durch Deaktivieren aufgezeichnet. Die Aufzeichnung enthält die Zustandswechsel und jede Änderung der Sensoren der Alarmanlage (angesprochen, wieder ruhig, nicht erreichbar, auch Sensoren, die nur melden) mit der Uhrzeit. Sie läuft nach einem Neustart von Home Assistant mitten im Alarm weiter. Auch Eingangsverzögerungen, die mit dem Deaktivieren enden, werden aufgezeichnet. Höchstens 20 Alarme je Alarmanlage und 300 Einträge je Alarm; bei einem flatternden Sensor bleiben die ersten Einträge (die Ursache) und das Ende. Die Aufzeichnungen sind Laufzeitdaten und nicht Teil der Sicherung.
- **Reiter Protokoll** auf der Startseite: Jeder Alarm als Karte mit Zeitachse (eine Bahn je Sensor mit einem Balken für die Zeit, in der er angesprochen hat, Linien für Eingangsverzögerung, Alarm und quittiert, Zeitachse) und darunter die Reihenfolge mit Uhrzeit und Abstand zum Anfang. Ein laufender Alarm aktualisiert sich alle 5 Sekunden; der neueste Alarm ist offen, ältere sind zugeklappt.

### Geändert

- **Letzte Ereignisse** sind von der Übersicht in den Reiter Protokoll gewandert ("Alle Ereignisse", bis zu 100 über alle Alarmanlagen).

## [0.11.0] - 2026-11-08

Nicht veröffentlicht; enthalten in 0.12.0.

### Geändert

- **Aktionen-Editor neu gebaut** (Konfiguration › Aktionen): Die Bausteine sind "Push-Meldung", "Gerät schalten", "Alarmton abspielen", "Warten", "Szene oder Skript" und "Eigene Aktion". Nirgends mehr JSON.
  - **Gerät schalten** liest bei Home Assistant, was das Gerät kann: Man wählt Geräte (Suche, Gewählte als Pille mit x) und sieht dann nur passende Aktionen (ein/aus/umschalten, Rollläden öffnen/schliessen, Schlösser ver-/entriegeln) und beim Einschalten die Einstellungen, die das Gerät wirklich unterstützt (Helligkeit, Farbtemperatur, Position des Rollladens, Ventilatorstufe, Temperatur und Modus eines Thermostats), je mit Regler oder Dropdown. Nicht eingeschaltete Einstellungen bleiben, wie sie sind.
  - **Eigene Aktion** listet jede Aktion von Home Assistant mit ihren Feldern (Text, Zahl mit Regler, Auswahl, Entitäten-Dropdown, Schalter). Pflichtfelder sind markiert und werden geprüft. Werte von Feldern, die der Editor nicht zeigen kann, bleiben erhalten.
  - **Alarmton abspielen:** Medienplayer über ein Suchfeld mit Pillen, der Ton als Dropdown, daneben Abspielen und Pause (klar als Vorschau auf diesem Handy oder Computer gekennzeichnet, nicht auf der echten Anlage), Lautstärke und Wiederholungen mit Regler und Feld.
  - Bestehende Schritte erscheinen in den neuen Bausteinen, ohne dass sich die gespeicherten Daten ändern.
- Suchfelder im Editor behalten beim Tippen den Fokus; die Liste ist nur offen, solange das Feld benutzt wird.

### Hinzugefügt

- **Testknopf je Schritt:** führt nur diesen Schritt auf den echten Geräten aus, nach einer Rückfrage. Der Test des ganzen Ablaufs bleibt wie bisher.
- **Umordnen per Ziehen:** Jeder Schritt hat einen Griff; nach oben oder unten ziehen (Finger oder Maus), die Pfeiltasten gehen auch. Das Verschieben gehört wie jede Änderung zum Entwurf.

## [0.10.0] - 2026-11-08

Nicht veröffentlicht; enthalten in 0.12.0.

### Geändert

- **Einstellungen je Modus** (Konfiguration › Anlage): "Anwesend", "Abwesend", "Nacht" oder "Immer aktiv" wählen und die Werte dieses Modus einstellen: Ausgangsverzögerung, Eingangsverzögerung, Alarmdauer, Verhalten bei offenen Sensoren und das Bestätigungsfenster der Zwei-Sensor-Bestätigung. "Immer aktiv" ist der Alarm eines immer aktiven Sensors (Rauch, Wasser), während die Anlage deaktiviert ist, und hat nur die Alarmdauer. Jeder Modus behält seine eigenen Werte, auch wenn er abgeschaltet ist.
- **Bestehende Anlagen verhalten sich wie bisher:** Solange ein Modus keinen eigenen Wert hat, gilt für ihn der gemeinsame Wert früherer Versionen.
- **Der Optionsdialog von Home Assistant** setzt gemeinsame Werte: Ein dort geänderter Wert gilt danach für alle Modi; unveränderte Werte lassen die Werte je Modus in Ruhe.
- Die Sicherung enthält die Werte je Modus.

## [0.9.0] - 2026-11-08

Nicht veröffentlicht; enthalten in 0.12.0.


Meldungen neu aufgebaut: jede Meldungsart hat eigene Einstellungen, und ein Sensor kann melden statt auszulösen.

Enthält die Änderungen aus 0.7.0 und 0.8.0.

### Hinzugefügt

- **Einstellungen je Meldungsart** (Konfiguration › Meldungen): Jede Art (Alarm, Sensor meldet, Sensor im scharfen Zustand nicht erreichbar, Eingangsverzögerung, Scharfschalten nicht möglich, scharf, deaktiviert, Batterie schwach, Sensor nicht erreichbar, Update verfügbar) lässt sich ein- und ausschalten, kritisch oder nicht einstellen und hat ihre eigene Lautstärke (iOS). Jede Art hat einen eigenen Knopf "Testmeldung senden", der mit ihren gespeicherten Einstellungen hinausgeht: So hörst du, wie sie klingt.
- **Empfänger als Dropdown:** Einen Benachrichtigungsdienst im Dropdown wählen; gewählte erscheinen als Pille mit x. Getrennt für Alarme und Wartung. Eine Warnung erscheint, wenn eine Gruppe keinen Empfänger hat.
- **Nur melden** (neue Option pro Sensor): Spricht dieser Sensor im scharfen Zustand an, kommt eine Meldung (Art "Sensor meldet (kein Alarm)", standardmässig kritisch) statt eines Alarms. Für Sensoren, die oft ohne Einbruch ansprechen (Haustier, Sonnenlicht) oder deren Batterie zur Neige geht. Höchstens eine Meldung pro Sensor und Minute; die letzten Ereignisse zeigen sie. Nie voreingestellt; geht auf Wunsch auch bei "immer aktiven" Sensoren.

### Geändert

- **Meldungen in Kapiteln:** Empfänger, Alarmmeldungen, Wartungsmeldungen, Knöpfe in der Meldung.
- **Alte Einstellungen werden übernommen:** das einzelne "kritisch" und die "Lautstärke" früherer Versionen werden zu den Einstellungen von Alarm und "Sensor im scharfen Zustand nicht erreichbar"; ausgeschaltete Arten bleiben aus. Sicherungen früherer Versionen werden ebenso gelesen.
- Wartungsmeldungen und die Update-Meldung sind nur kritisch, wenn du das für ihre Art einschaltest (Standard: nein).

## [0.8.0] - 2026-11-08

Nicht veröffentlicht; enthalten in 0.12.0.


Neues Aussehen der Einstellungen wie in Device Panel, und beim Reiterwechsel geht nichts verloren.

Enthält die Änderungen aus 0.7.0.

### Geändert

- **Einstellungen in Kapiteln:** jedes Kapitel hat einen Titel mit Strich davor (Konfiguration › Anlage: Modi, Zeiten, Verhalten, Zeitplan, Codes pro Person, Sicherung; Updates: Version, Einstellungen).
- **Reiter gleiten:** Beim Wechsel zwischen den Reitern der Konfiguration gleitet die Seite von der Seite herein.
- **Beim Reiterwechsel geht nichts verloren:** Jeder Reiter behält seine ungespeicherten Änderungen, auch wenn du zur Übersicht und zurück gehst. Ein gelber Punkt am Reiter zeigt, wo noch etwas offen ist; "Abbrechen" und "Speichern" bleiben in jedem Reiter. Eine Rückfrage kommt nur dort, wo ein Entwurf wirklich ersetzt würde (andere Alarmanlage) und beim Neuladen oder Schliessen der Seite.

## [0.7.0] - 2026-11-08

Nicht veröffentlicht; enthalten in 0.12.0.


Updates aus dem Panel, wie in Device Panel.

### Hinzugefügt

- **Konfiguration › Updates:** zeigt die installierte und die neueste Version (GitHub und HACS), die Release Notes aller Versionen dazwischen (in deiner Sprache, aus dem CHANGELOG) und "Aktualisieren", das die neue Version über HACS installiert. Home Assistant startet nie von selbst neu: "Jetzt neu starten" erscheint, sobald die neue Version auf der Platte liegt, mit Rückfrage. Ein Punkt am Reiter zeigt, dass etwas wartet.
- **Tägliche Prüfung:** fragt einmal am Tag bei GitHub nach (die erste Prüfung zu einer zufälligen Zeit nach dem Start) und meldet eine neue Version unter Reparaturen. Lässt sich ausschalten.
- **Meldung "Update verfügbar"** an die Wartungs-Empfänger, einmal pro Version, unter Benachrichtigungen ein- und ausschaltbar.
- **Updates automatisch installieren:** standardmässig aus. Lädt die neue Version nach der täglichen Prüfung über HACS herunter; der Neustart bleibt bei dir. Benutzt wird nur die HACS-Entität dieses Repositorys.
- **Vorabversionen:** auf Wunsch angeboten (Standard: ja, solange eine Vorabversion installiert ist). HACS installiert sie nur mit seinem eigenen Schalter "Pre-release"; das Panel erklärt das und verlinkt auf das HACS-Gerät.
- Die Einstellungen der Updates gehören zur Sicherung.

## [0.6.0] - 2026-11-08

Zeitplan zum Scharfschalten und Deaktivieren, und die Modi einer Alarmanlage werden jetzt im Panel gewählt.

Enthält die Änderungen aus 0.3.0, 0.4.0 und 0.5.0.

### Hinzugefügt

- **Zeitplan:** pro Alarmanlage beliebig viele Zeiten unter Konfiguration › Anlage: "Anwesend", "Abwesend" oder "Nacht" scharf schalten oder deaktivieren, zu einer festen Uhrzeit an gewählten Wochentagen, jede Zeit einzeln ein- und ausschaltbar. Ein laufender Alarm oder eine Eingangsverzögerung wird per Zeitplan nie deaktiviert oder überschrieben (steht in den letzten Ereignissen). Offene Sensoren verhindern das Scharfschalten wie gewohnt, die Meldung "Scharfschalten nicht möglich" folgt. Ein Code ist nicht nötig. "Geändert von" zeigt "Zeitplan". Zeiten, die verstreichen, während Home Assistant aus ist, werden nicht nachgeholt.

### Geändert

- **Modi frei wählbar:** "Anwesend", "Abwesend" und "Nacht" lassen sich pro Alarmanlage unter Konfiguration › Anlage einzeln ein- und ausschalten (vorher nur "Nacht", und nur beim Einrichten oder in den Optionen). Mindestens ein Modus; Apple Home und die Übersicht bieten nur die eingeschalteten an. Ein abgeschalteter Modus behält Zone und Aktionen. Den Modus, in dem die Anlage gerade scharf ist, kann man nicht abschalten.

## [0.5.0] - 2026-11-08

Nicht veröffentlicht; enthalten in 0.6.0.

Wartungsmeldungen und Batterieprognose, Zwei-Sensor-Bestätigung gegen Fehlalarm, Codes pro Person und eine Sicherung aller Einstellungen.


### Hinzugefügt

- **Wartungsmeldungen:** schwache Batterien und dauerhaft nicht erreichbare Sensoren gehen an die Wartungs-Empfänger, für alle Alarmanlagen. Jedes Problem wird einmal gemeldet, mehrere gesammelt in einer Meldung; erneut erst, wenn die Batterie gewechselt wurde oder der Sensor wieder antwortet. Schwelle (Standard 20 %) und Zeit bis "nicht erreichbar" (Standard 60 Minuten) unter Konfiguration › Benachrichtigungen. Geprüft wird alle 15 Minuten.
- **Batterieprognose:** Die Sensorliste zeigt, wann eine Batterie schwach wird, berechnet aus dem Verlauf seit dem letzten Batteriewechsel (Recorder, letzte 90 Tage). Ohne genug Verlauf erscheint keine Prognose.
- **Zwei-Sensor-Bestätigung:** neue Option pro Sensor "Braucht einen zweiten Sensor". Im scharfen Zustand löst ein solcher Sensor nur aus, wenn ein weiterer Sensor mit dieser Option innerhalb des Bestätigungsfensters anspricht (Standard 60 Sekunden, Konfiguration › Anlage). Gegen Fehlalarm durch Haustiere oder Sonnenlicht. Standardmässig aus; Sensoren ohne diese Option lösen weiterhin allein aus, und während der Eingangsverzögerung gilt sie nicht. Eine nicht bestätigte Auslösung steht in den letzten Ereignissen.
- **Codes pro Person:** beliebig viele persönliche Codes pro Alarmanlage unter Konfiguration › Anlage, auf Wunsch mit einem Benutzer von Home Assistant verknüpft. "Geändert von", die letzten Ereignisse und die Meldungen zeigen die Person. Zwei Personen können nicht denselben Code haben. Codes werden nur als Hash gespeichert und nie angezeigt; der Hauptcode aus den Optionen gilt weiter.
- **Sicherung:** alle Einstellungen als Datei exportieren (Zonen, Verzögerungen, Optionen pro Sensor, Aktionen, Voreinstellungen, Benachrichtigungen) und wiederherstellen, mit Vorschau, welche Alarmanlagen gefunden werden (Zuordnung über den Namen). Codes sind nie Teil einer Sicherung.

### Geändert

- **Schwelle "Batterie schwach"** kommt aus den Benachrichtigungen und gilt gleich für Liste, Statuskachel und Wartungsmeldung.

### Behoben

- **Letzte Ereignisse:** "Scharfschalten nicht möglich" erschien als "deaktiviert".
- **Handy:** Die Auswahl "Offener Sensor beim Scharfschalten" wurde abgeschnitten.

## [0.4.0] - 2026-11-08

Nicht veröffentlicht; enthalten in 0.6.0.

Alarmaktionen als grafischer Ablauf pro Alarm, eigene Alarmtöne für Medienplayer und Benachrichtigungen mit kritischen Push-Meldungen.


### Hinzugefügt

- **Konfiguration › Aktionen:** ein Ablauf pro Alarmanlage und Alarm ("Anwesend", "Abwesend", "Nacht" und "immer aktiv" für Rauch, Wasser, Gas). Bausteine: Push-Meldung, Einschalten, Ausschalten, Rollläden öffnen und schliessen, Alarmton auf Medienplayern, Warten, Skript und jede Aktion von Home Assistant mit eigenen Daten. Schritte lassen sich an jeder Stelle einfügen, bearbeiten, verschieben und löschen; Änderungen sind ein Entwurf mit "Abbrechen" und "Speichern". Ein Ablauf mit eigenem Push-Schritt ersetzt die automatische Alarmmeldung, sie kommt nicht doppelt.
- **Alarmtöne:** fünf eigene Töne (Sirene, Alarm-Piepen, Hupe, Warnung, Gong) für Medienplayer wie Sonos, mit Vorhören im Panel, Lautstärke und Wiederholungen. Die Töne liefert Home Assistant selbst aus; der Medienplayer muss die lokale Adresse von Home Assistant erreichen.
- **Zurück in den Zustand davor:** Vor dem ersten Schritt merkt sich Alarmageddon den Zustand aller Geräte im Ablauf (ein/aus, Helligkeit, Position, Lautstärke, Quelle; bei Sonos zusätzlich den Sonos-Schnappschuss mit Gruppen). Deaktivieren oder das Ende der Alarmdauer stoppt alle Schritte und stellt markierte Geräte zurück. Bei Alarmtönen ist das standardmässig an. Das gilt auch nach einem Neustart von Home Assistant mitten im Alarm.
- **Test:** führt den Ablauf ohne Alarm aus und endet spätestens nach 60 Sekunden von selbst oder mit "Test stoppen". Ein echter Alarm lässt sich nicht im Ablauf stoppen, nur durch Deaktivieren.
- **Konfiguration › Benachrichtigungen (für alle Alarmanlagen):** Empfänger getrennt für Alarme und Wartungsmeldungen (jeder `notify`-Dienst, zum Beispiel die Companion App), kritische Alarmmeldung mit Lautstärke (iOS: kritisch, Android: Alarmkanal), Ereignisse (Alarm, Eingangsverzögerung, scharf, deaktiviert, Scharfschalten nicht möglich, Sensor im scharfen Zustand nicht erreichbar) und Testmeldungen.
- **Alarmmeldung:** mit Uhrzeit und auslösendem Sensor, Knopf "Öffnen"; "Alarm beendet" ersetzt nach dem Deaktivieren die Alarmmeldung auf dem Handy. Ein Sensor, der im scharfen Zustand nicht mehr erreichbar ist, wird kritisch gemeldet.
- **Knopf "Deaktivieren" in der Alarmmeldung:** standardmässig aus. iOS fragt nach Face ID oder dem Code des Geräts, Android nicht; das Panel weist darauf hin.

## [0.3.0] - 2026-11-08

Nicht veröffentlicht; enthalten in 0.6.0.

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

[0.39.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.39.0
[0.38.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.38.0
[0.35.2]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.35.2
[0.35.1]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.35.1
[0.35.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.35.0
[0.34.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.34.0
[0.33.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.33.0
[0.32.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.32.0
[0.30.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.30.0
[0.29.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.29.0
[0.27.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.27.0
[0.23.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.23.0
[0.12.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.12.0
[0.6.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.6.0
[0.2.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.2.0
