# Änderungsprotokoll

[English](https://github.com/Diegofuego871/ha-Alarmageddon/blob/main/CHANGELOG.md)

Alle nennenswerten Änderungen an dieser Integration stehen in dieser Datei.

Das Format folgt [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
die Versionsnummern folgen [Semantic Versioning](https://semver.org/lang/de/).

## [0.20.0] - 2026-11-08

Die Einstellungen der Alarmmeldung sind an einer Stelle: im Push-Schritt der Alarmaktionen.

Enthält die Änderungen aus 0.13.0, 0.14.0, 0.15.0, 0.16.0, 0.17.0, 0.18.0 und 0.19.0.

### Geändert

- **Alarmmeldung nur im Push-Schritt** (Konfiguration › Aktionen, "Push-Meldung"): Kritisch, Lautstärke und die Knöpfe "Öffnen", "Sirene stumm" und "Deaktivieren" stellst du dort ein, zusammen mit Titel und Text, für jeden Modus und Push-Schritt getrennt. In Konfiguration › Benachrichtigungen gibt es die Art "Alarm" und das Kapitel "Knöpfe in der Meldung" nicht mehr; ein Hinweis mit Knopf führt zu den Aktionen.
- **Bestehende Alarmanlagen verhalten sich wie bisher:** Ein Push-Schritt ohne eigene Werte nutzt die früheren globalen Werte (Kritisch, Lautstärke, Knöpfe), bis du sie im Schritt änderst.
- **Ein Knopf wirkt nur, wenn die Meldung ihn anbietet.** Das wird aus der Konfiguration abgeleitet und wirkt darum auch nach einem Neustart von Home Assistant bei einer Meldung, die noch auf dem Handy steht.
- **Die Alarmmeldung lässt sich nicht mehr abschalten:** Sie geht immer raus (ein früheres "aus" bei der Art "Alarm" zählt nicht mehr). Ohne Push-Schritt in den Aktionen geht eine Standardmeldung raus (kritisch, Knopf "Öffnen").

## [0.19.0] - 2026-11-08

Nicht veröffentlicht; enthalten in 0.20.0.

### Hinzugefügt

- **Eigener Titel und Text der Alarmmeldung** (Konfiguration › Aktionen, Schritt "Push-Meldung", mit dem Stift öffnen): Der Standardtext steht in den Feldern und lässt sich beliebig ändern. Die Platzhalter `{name}` (Alarmanlage), `{sensor}` (auslösender Sensor), `{time}` (Uhrzeit) und `{mode}` (Modus) fügt man mit einem Tipp ein, beim Alarm werden sie gefüllt; eine Vorschau zeigt die Meldung mit echten Namen. "Standardtext wiederherstellen" bringt den Standard zurück. Ein unveränderter Text wird nicht gespeichert und folgt so weiter der Sprache von Home Assistant. Knöpfe, Kritisch und Lautstärke kommen wie bisher aus Konfiguration › Benachrichtigungen.

## [0.18.0] - 2026-11-08

Nicht veröffentlicht; enthalten in 0.20.0.

### Geändert

- **Alarmton: Dauer statt Wiederholungen** (Konfiguration › Aktionen): "Wie lange es klingeln darf" in Sekunden (mit Schnellwahl 10 s, 30 s, 1 min, 5 min) oder "Bis die Alarmanlage deaktiviert wird": Der Ton wiederholt sich dann ohne Ende, bis jemand deaktiviert, die Sirene stumm schaltet oder die Alarmdauer endet. Ist die Zeit um, werden die Medienplayer gestoppt, damit der Ton nicht ausklingt. Bestehende Schritte mit Wiederholungen funktionieren weiter (angezeigt als passende Sekundenzahl, gespeichert wie bisher, bis du sie bearbeitest).
- **"Sirene stumm" wirkt immer:** Der Knopf in der Meldung stoppt jetzt auch dann die Medienplayer, wenn alle Schritte der Aktionen schon durch sind, ein Ton aber noch klingen könnte, und er wirkt bei einem Ton ohne Ende.

## [0.17.0] - 2026-11-08

Nicht veröffentlicht; enthalten in 0.20.0.

### Hinzugefügt

- **"Nicht abwarten"** (Konfiguration › Aktionen, je Schritt der Art Gerät schalten, Alarmton, Szene oder Skript, Eigene Aktion): Der nächste Schritt startet sofort und nicht erst, wenn dieser zu Ende ist. Für einen sehr langen Alarmton oder ein träges Gerät, damit die folgenden Schritte nicht aufgehalten werden. Deaktivieren stoppt auch Schritte, die nebenher laufen. Ein fehlerhafter Schritt hält die anderen nie auf, mit oder ohne die Option (wie bisher). Schritte, die nebenher laufen, werden nach einem Neustart von Home Assistant mitten im Alarm nicht fortgesetzt; die Schritte danach schon.

### Behoben

- **Leiste mit Speichern unten:** Bei Seiten mit wenig Inhalt (zum Beispiel ein Alarm ohne Schritte) sitzt die Leiste mit "Abbrechen" und "Speichern" jetzt am unteren Fensterrand statt mitten im Bild; der Abstand darüber bleibt.


## [0.16.0] - 2026-11-08

Nicht veröffentlicht; enthalten in 0.20.0.

### Hinzugefügt

- **Knöpfe der Alarmmeldung mit eigenen Schaltern** (Konfiguration › Benachrichtigungen, Kapitel "Knöpfe in der Meldung"): "Öffnen" (standardmässig an), "Deaktivieren" (standardmässig aus, wie bisher) und neu "Sirene stumm" (standardmässig aus). "Sirene stumm" stoppt alle Schritte der Alarmaktionen und stellt die Geräte zurück; die Alarmanlage bleibt im Alarm, bis jemand deaktiviert. Es wirkt nur bei einem echten Alarm mit laufenden Aktionen, die letzten Ereignisse und die Zeitachse des Alarms zeigen es.

### Behoben

- **Eigene Aktion im Aktionen-Editor** zeigte die technischen Namen von Home Assistant (`cover.set_cover_position`, Feld `speed`). Arten, Aktionen, Beschreibungen, Feldnamen und Auswahlwerte erscheinen jetzt in deiner Sprache, geholt bei Home Assistant wie in dessen eigener Oberfläche; wo Home Assistant keine Übersetzung hat, wird der Name lesbar gemacht ("Set cover position").
- **Abstände:** Das letzte Element einer Seite klebt nicht mehr an der Leiste mit "Abbrechen" und "Speichern"; Hinweise, Warnungen und die Zeilen mit "Testmeldung" haben mehr Platz.


## [0.15.0] - 2026-11-08

Nicht veröffentlicht; enthalten in 0.20.0.

### Geändert

- **Nicht erreichbare Sensoren an einer Stelle** (Konfiguration › Benachrichtigungen, Kapitel "Wartungsmeldungen"): Die beiden Einträge "Sensor im scharfen Zustand nicht erreichbar" und "Sensor nicht erreichbar" sind jetzt eine Karte "Sensor nicht erreichbar" mit zwei Fällen, je mit eigenem Schalter, Kritisch, Lautstärke und Testmeldung: "Während die Anlage scharf ist" (wird sofort gemeldet, geht an die Empfänger für Alarme) und "Längere Zeit ausgefallen" (nach der eingestellten Zeit, auch bei deaktivierter Anlage, geht an die Empfänger für Wartung). Einstellungen und Empfänger bleiben unverändert.
- **Bessere Erklärungen:** "Sensor meldet (kein Alarm)" sagt jetzt, dass statt eines Alarms nur diese Meldung rausgeht, höchstens eine pro Sensor und Minute, und wo die Option "Nur melden" gesetzt wird (pro Sensor).

## [0.14.0] - 2026-11-08

Nicht veröffentlicht; enthalten in 0.20.0.

### Geändert

- **Sensorliste ist eine Auswahl** (Konfiguration › Sensoren): Die Liste zeigt nicht mehr jeden Sensor, den Home Assistant kennt; so blieben Sensoren sichtbar, die mit einer Alarmanlage nichts zu tun haben. "Sensoren hinzufügen" öffnet ein Fenster mit allen Sensoren, die Alarmageddon erkennt (Suche, nach Bereich gruppiert); du wählst die, die zu dieser Alarmanlage gehören, und nimmst sie auf. Jede Alarmanlage hat ihre eigene Liste.
- **Aus der Liste entfernen:** je Sensor mit dem Papierkorb-Knopf (oder im Seitenblatt des Sensors). Zonen, Eingangsverzögerung und eigene Optionen dieses Sensors werden gelöscht; er lässt sich jederzeit wieder aufnehmen.
- **Bestehende Alarmanlagen:** Sensoren, die schon in einer Zone stehen oder eigene Optionen haben, bleiben in der Liste; alle anderen müssen einmal hinzugefügt werden. Für Alarm, Zonen und Übersicht ändert sich nichts.
- Die Liste ist Teil der Sicherung.

## [0.13.0] - 2026-11-08

Nicht veröffentlicht; enthalten in 0.20.0.

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

[0.20.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.20.0
[0.12.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.12.0
[0.6.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.6.0
[0.2.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.2.0
