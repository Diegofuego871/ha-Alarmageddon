# Änderungsprotokoll

[English](https://github.com/Diegofuego871/ha-Alarmageddon/blob/main/CHANGELOG.md)

Alle nennenswerten Änderungen an dieser Integration stehen in dieser Datei.

Das Format folgt [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
die Versionsnummern folgen [Semantic Versioning](https://semver.org/lang/de/).

## [1.25.1] - 2026-11-12

Einheitliche Benennung der Aktionen der Push-Meldung.

### Geändert

- **Benachrichtigungen › "Scharfschalten nicht möglich": die beiden Knöpfe heissen wie die anderen Aktionen der Push-Meldung.** Aus Knopf "Erneut versuchen" und Knopf "Trotzdem scharf schalten" wird Aktion "Erneut versuchen" und Aktion "Trotzdem scharf schalten", und ihre Beschreibung beginnt mit "Knopf unter der Meldung:", wie bei "Öffnen", "Quittieren" und "Deaktivieren".

## [1.25.0] - 2026-11-12

Das Abzeichen im Easter Egg ist ein massiver 3D-Körper.

### Geändert

- **Easter Egg: das Abzeichen ist dick, wie ein echtes Abzeichen.** Das Schild besteht aus vielen Ebenen in der Tiefe, hat beim Drehen sichtbare Dicke und sieht nicht mehr aus wie Papier. Vorder- und Rückseite haben einen runden Wulst mit Glanzlicht, die Seitenwand ist ein dunklerer Ton derselben Farben, und am Boden liegt ein weicher Schatten. Das Licht kommt von links oben: Die Helligkeit jeder Fläche folgt der Drehung, und ein Glanzstreifen läuft über die Vorderseite. Die Farben bleiben wie bisher.

## [1.24.0] - 2026-11-12

Nicht veröffentlicht; enthalten in 1.25.0.

Schritte ziehen: die Seite scrollt mit.

### Hinzugefügt

- **Die Seite scrollt beim Ziehen mit.** Hält man einen Schritt nahe am oberen oder unteren Rand des sichtbaren Bereichs (unter den festen Reitern, über der Leiste mit "Speichern"), scrollt die Seite von selbst, umso schneller, je näher am Rand. So erreicht man auch eine weit entfernte Liste in einem langen Ablauf. Bisher funktionierte das Scrollen am Rand im Panel nicht.
- **Eine Liste nimmt den Schritt auch an, wenn man ihn nur auf eine ihrer Aktionen zieht** oder knapp daneben (bis 48 px), nicht nur auf das Plus. Eine leere Liste gilt samt ihrem Plus.
- **Eine Liste, die den Schritt nicht aufnimmt, leuchtet rot.** Zum Beispiel die Sirene über "Eingangsverzögerung läuft": nichts wird verschoben, und man sieht, warum.

## [1.23.0] - 2026-11-12

Symbole in allen Auswahlknöpfen der Ansicht.

### Geändert

- **"Ansicht": jeder Auswahlknopf hat ein Symbol.** Im Fenster "Ansicht" der Sensorliste tragen "Liste" und "Karten" dieselben Symbole wie der Umschalter in der Werkzeugleiste, "Bereich", "Sensorart", "Anlage" und "Keine" (Gruppieren) sowie "Aufsteigend" und "Absteigend" je ein eigenes. Am Computer stehen die vier Gruppierknöpfe jetzt wie auf dem Handy in zwei Zeilen, damit nichts abgeschnitten wird.

## [1.22.0] - 2026-11-12

Nicht veröffentlicht; enthalten in 1.23.0.

Schritte per Ziehen zwischen den Listen verschieben.

### Hinzugefügt

- **Einen Schritt in eine andere Liste ziehen.** Auf der Seite "Aktionen" lässt sich ein Schritt am Griff jetzt auch auf eine andere Liste ziehen, auch auf eine leere (auf ihr Plus oder ihre Fläche). Die Liste leuchtet mit gestricheltem Rahmen auf, und beim Loslassen springt der Schritt dorthin. Das geht zwischen "Scharfschalten beginnt", "Anlage scharf geschaltet", "Eingangsverzögerung läuft", "Alarm beginnt" und "Nach dem Quittieren", aber nur in Listen, die diese Art von Schritt aufnehmen: die Sirene (Alarmton) geht nicht in eine Verzögerung, ein Voralarm nicht in "Scharfschalten beginnt", eine Meldung nur in den Alarmablauf.
- **Der Schritt wird für die neue Liste umgerechnet.** Ein Aktivierungston oder Voralarm, den man in eine Verzögerung zieht, folgt dieser Verzögerung (Schalter an, wie ein neuer Schritt dort); wieder herausgezogen hat er seine feste Dauer. Nach dem Quittieren kehrt nichts mehr zurück, wie bisher.
- **Tastatur statt Ziehen.** Pfeil nach oben beim ersten oder Pfeil nach unten beim letzten Schritt einer Liste verschiebt ihn in die nächste Liste, die ihn aufnimmt; der Fokus folgt.
## [1.21.0] - 2026-11-12

Nicht veröffentlicht; enthalten in 1.22.0.

Die Ladeanimation ignoriert "Bewegung reduzieren".

### Geändert

- **Ladeanimation der Grafiken: "Bewegung reduzieren" gilt nicht mehr.** Die drei kreisenden Punkte bewegen sich auch dann, wenn die Systemeinstellung "Bewegung reduzieren" an ist (Wunsch des Nutzers). Vorher pulsierten sie in diesem Fall nur sanft.

## [1.20.0] - 2026-11-12

Eine kleine Überraschung in der Kopfzeile.

### Hinzugefügt

- **Easter Egg: Dreifachklick aufs Logo.** Tippt man das Logo oben links dreimal rasch hintereinander an, zoomt es in die Bildmitte und wird zum Pop-up: Das Schild dreht sich um seine Achse, ein Lichtkegel kreist wie bei einer Sirenenleuchte, und das "A" pulsiert. Darunter steht die installierte Version. Ein Tipp irgendwohin oder Escape schliesst es. Auf dem Handy füllt es den ganzen Bildschirm. Die Animation läuft auch, wenn die Systemeinstellung "Bewegung reduzieren" an ist (Wunsch des Nutzers).

## [1.19.0] - 2026-11-12

Aktionen während der Ausgangs- und der Eingangsverzögerung.

### Hinzugefügt

- **Aktionen, solange die Ausgangsverzögerung läuft.** Die Aktionen-Seite hat vor "Anlage scharf geschaltet" einen neuen festen Punkt "Scharfschalten beginnt". Was du dort ablegst, startet, sobald jemand die Anlage scharf schaltet, zum Beispiel ein Aktivierungston, der alle zum Gehen auffordert. Ist die Anlage scharf, enden die Aktionen, ein laufender Ton verstummt, und die Schritte von "Anlage scharf geschaltet" folgen. Deaktivieren stoppt sie sofort.
- **Aktionen, solange die Eingangsverzögerung läuft.** Ein neuer fester Punkt "Eingangsverzögerung läuft" vor "Alarm beginnt": Schritte, die laufen, solange die Zeit zum Deaktivieren läuft, zum Beispiel ein Voralarm. Sie enden, wenn der Alarm beginnt (die Alarmaktionen übernehmen) oder die Anlage deaktiviert wird.
- **Ein Ton, der der Verzögerung folgt.** Bei Aktivierungston und Voralarm in diesen beiden Listen gibt es den Schalter "Solange die Ausgangsverzögerung läuft" (bzw. "Eingangsverzögerung"), bei neuen Schritten an. Der Ton dauert dann genau so lange wie die Verzögerung, die gerade läuft: der Wert des Modus, oder, hat der Sensor, der sie gestartet hat, eine eigene Eingangsverzögerung, deren Wert. Er folgt der Einstellung der Anlage; die feste Dauer gilt nur, wenn der Schalter aus ist. Die Karte des Schritts zeigt statt der Sekunden eine blaue Pille.
- **Zwei Kapitel.** Die Seite ist in "Beim Scharfschalten" und "Bei einem Alarm" gegliedert, die Punkte in der Reihenfolge der Zeit: Scharfschalten beginnt, scharf, Eingangsverzögerung läuft, Alarm beginnt, Alarm endet. Im Reiter "Immer aktiv" gibt es keines von beiden.
- **Nur wo es die Verzögerung gibt.** "Scharfschalten beginnt" steht nur in einem Modus, dessen Ausgangsverzögerung grösser als 0 ist, und "Eingangsverzögerung läuft" nur dort, wo eine Eingangsverzögerung laufen kann (ein Eingangssensor in der Zone, mit einer Verzögerung über 0). Gespeicherte Schritte bleiben erhalten.
- **Auch bei "Aktionen übernehmen von" und in der Sicherung.**

### Geändert

- **Der Alarm wartet nie auf diese Aktionen.** Ein Gerät, das während einer Verzögerung hängt oder scheitert, hält nichts auf: die Alarmaktionen starten in dem Moment, in dem der Alarm beginnt, das Ende der Aktionen der Verzögerung wird höchstens 3 Sekunden abgewartet. Ein Neuladen oder ein Neustart mitten in einer Verzögerung setzt nur die Töne für die Restzeit fort; ein Gerät wird nicht ein zweites Mal geschaltet.

## [1.18.1] - 2026-11-12

Der Testknopf eines Schritts wird zum Stopp-Knopf.

### Geändert

- **Aktionen: der Test eines Schritts wird beim Schritt gestoppt.** Testest du einen einzelnen Schritt, wird sein Play-Knopf zum Stopp-Knopf, und du beendest den Test genau dort. Der Knopf in der Fusszeile bleibt bei einem solchen Test gesperrt: er gehört zum Test des ganzen Ablaufs und ist während dieses Tests der Stopp-Knopf.

## [1.18.0] - 2026-11-12

"Scharfschalten nicht möglich" mit Knöpfen: erneut versuchen oder trotzdem scharf schalten.

### Hinzugefügt

- **Knöpfe in der Meldung "Scharfschalten nicht möglich".** Verhindert ein offener Sensor das Scharfschalten, trägt die Push-Meldung jetzt zwei Knöpfe. "Erneut versuchen" schaltet denselben Modus noch einmal scharf, zum Beispiel nachdem du das Fenster geschlossen hast; ist es noch offen, kommt die Meldung erneut. "Trotzdem scharf schalten" schaltet scharf, obwohl Sensoren offen sind: sie werden bis zum Deaktivieren übergangen und lösen keinen Alarm aus (angezeigt als übergangen wie mit der Option "Beim Scharfschalten umgehen"); alle anderen Sensoren werden überwacht.
- **Sicher gebaut.** Die Knöpfe gelten eine Stunde und nur, solange die Anlage deaktiviert ist; wurde sie scharf geschaltet (gleich auf welchem Weg), ist eine ältere Meldung verbraucht. Nur das Handy eines Empfängers dieser Meldung kann sie drücken. Scharf geschaltet wird der Modus, der gescheitert ist, mit seiner Ausgangsverzögerung. Ein Code ist nicht nötig, auch wenn die Anlage zum Scharfschalten einen verlangt.
- **Jeder Knopf lässt sich abschalten** unter Konfiguration › Meldungen › "Scharfschalten nicht möglich". Beide sind standardmässig an.

## [1.17.12] - 2026-11-12

Der orange Punkt verschwindet nach dem Speichern, und die Modi sind Schalter.

### Geändert

- **Anlage: je Modus ein Schalter.** Unter Konfiguration › Anlage sind die Modi Anwesend, Abwesend, Nacht und "Immer aktiv" keine Pillen mehr, sondern Zeilen wie die übrigen Einstellungen: Schalter links, Symbol, Name und eine kurze Beschreibung.

### Behoben

- **Anlage: "1 Änderung" und der orange Punkt blieben nach dem Speichern stehen.** Wer die Ausgangs- oder die Eingangsverzögerung änderte, während ein Modus abgeschaltet war (zum Beispiel Nacht), sah gleich nach dem Speichern wieder "1 Änderung", und erneutes Speichern half nicht. Das Panel speichert die Zeiten aller Modi, auch die eines abgeschalteten (er behält seine Werte), der Server meldete die Werte eines solchen Modus aber nicht zurück; das Panel hielt den gespeicherten Stand für geändert. Der Server meldet jetzt die Zeiten aller Modi. Die anderen Reiter speichern und lesen gleich zurück (mit Tests geprüft).

## [1.17.11] - 2026-11-11

Die Grafiken für Empfang und Batterie bleiben nicht mehr leer.

### Behoben

- **Sensoransicht: "In diesem Zeitraum gibt es noch keine Werte", obwohl es einen Wert gab.** Der Verlauf von Home Assistant kennt nur Wechsel. Änderte sich der Empfang (oder der Batteriestand) im gewählten Zeitraum nicht, gab es nur den Stand am Anfang, also einen einzigen Punkt, und statt der Grafik stand der Hinweis da, obwohl direkt darüber aktueller Wert, Mittel und schwächster Wert standen. Die Linie läuft jetzt bis jetzt und endet mit dem aktuellen Wert; ein gleichbleibender Wert ist eine waagrechte Linie. Liefert die Statistik von Home Assistant weniger als zwei Werte, wird zusätzlich der Verlauf gefragt.

## [1.17.10] - 2026-11-11

Fenster öffnen, ohne dass das Suchfeld aufspringt.

### Behoben

- **Aktionen: das Suchfeld geht nicht mehr von selbst auf.** Beim Öffnen eines Schritts setzte der Browser die Schreibmarke ins erste Feld des Fensters. Bei "Gerät schalten", Alarmton, Voralarm und Aktivierungston ist das die Suche nach Geräten oder Medienplayern: die Vorschlagsliste klappte auf, und auf dem Handy kam die Tastatur, obwohl du den Schritt nur ansehen wolltest. Ein Fenster öffnet jetzt ruhig; die Liste erscheint, sobald du ins Suchfeld tippst. Das gilt auch für "Sensoren hinzufügen" und den Schritt "Warten". Fenster, die bewusst im Feld starten (Umbenennen, Code), tun das weiterhin.

## [1.17.9] - 2026-11-11

Das Protokoll öffnet mit zugeklappten Alarmen.

### Geändert

- **Protokoll: auch der neueste Alarm ist zugeklappt.** Bisher war der neueste Alarm beim Öffnen des Protokolls immer aufgeklappt, und die Liste begann mit seiner langen Zeitachse. Jetzt ist jeder beendete Alarm zugeklappt, ein Tipp klappt ihn auf. Zwei Fälle bleiben von selbst offen: ein Alarm, der noch läuft, und der neueste Alarm nach einem Tipp auf die Alarmmeldung.

## [1.17.8] - 2026-11-11

Jeder Schalter links, sein Text gleich daneben, im ganzen Panel.

### Geändert

- **Schalter stehen überall links.** Was 1.17.7 für die Meldungen gemacht hat, gilt jetzt im ganzen Panel: im Sensor-Blatt, im Schritt-Editor der Aktionen ("Lautstärke setzen", "Bis die Alarmanlage deaktiviert wird", "Rückgängig", "Warten, bis die Aktion beendet ist", die Knöpfe der Push-Meldung), bei "Alarm endet", in den Voreinstellungen, im Fenster "Ansicht" und beim Umbenennen steht jeder Schalter links und sein Text gleich daneben und wächst nach rechts. Bisher standen die Schalter am rechten Rand, auf einem breiten Bildschirm weit weg von ihrem Text.
- **Zeitplan:** Der Schalter einer Zeit steht vorn in seiner Zeile. Auf dem Handy ist die Zeile aufgeräumter: Schalter, Uhrzeit und Papierkorb in der ersten Zeile, darunter die Aktion in voller Breite, dann die Wochentage; die Aktion wird nicht mehr abgeschnitten.
- **Schritt-Editor:** Eine Zeile mit Schalter hat mehr Luft zu dem, was über ihr steht, und zu ihrem Regler.

## [1.17.7] - 2026-11-11

Meldungen: jeder Schalter links, sein Text wächst nach rechts.

### Geändert

- **Meldungen: die Schalter stehen links.** In Konfiguration › Meldungen steht jeder Schalter (die Meldungsart selbst, "Kritisch", "Zusätzlich als Benachrichtigung in Home Assistant stehen lassen") links vom Text, und der Text wächst nach rechts, am Computer und auf dem Handy. Bisher standen sie am rechten Rand, auf einem breiten Bildschirm weit vom Text entfernt und auf dem Handy an merkwürdigen Stellen umgebrochen, sodass nicht klar war, welcher Schalter zu welcher Option gehört.

## [1.17.6] - 2026-11-11

"Einstellungen pro Modus" springt nicht mehr zurück.

### Behoben

- **Aktionen: "Einstellungen pro Modus" sprang nach 10 bis 20 Sekunden zurück auf "aus".** Wer den Schalter einschaltete und noch nichts anderes geändert hatte, dessen Entwurf hielt das Panel bei der nächsten regelmässigen Aktualisierung für unverändert und verwarf ihn; der Schalter fiel auf "aus" zurück. Der Schalter bleibt jetzt so, wie du ihn gesetzt hast, bis du speicherst, abbrichst oder die Seite verlässt.

## [1.17.5] - 2026-11-11

Der Modus in den Titeln des Ablaufs.

### Geändert

- **Aktionen: der Modus steht hinter den festen Punkten.** Mit eingeschaltetem "Einstellungen pro Modus" sagen die drei festen Punkte jetzt, welchen Ablauf du gerade siehst: "Anlage scharf geschaltet (Anwesend)", "Alarm beginnt (Anwesend)" und "Alarm endet (quittiert) (Anwesend)", ebenso für Abwesend, Nacht und Immer aktiv. So siehst du es auch nach dem Hinunterscrollen, wenn die Reiter nicht mehr im Bild sind. Bei ausgeschaltetem Schalter bleiben die Titel wie bisher.

## [1.17.4] - 2026-11-11

Besser zu treffen: die Knöpfe der Alarmschritte.

### Geändert

- **Aktionen: grössere Knöpfe mit Umrandung.** Testen, Bearbeiten und Löschen eines Schritts sind jetzt richtige Knöpfe mit Umrandung, mindestens 44 Pixel gross und mit mehr Abstand untereinander (auf dem Handy noch mehr), damit man sie mit dem Finger gut trifft. Löschen ist rot dargestellt.

## [1.17.3] - 2026-11-11

Mehr Abstand zwischen den Lautstärke-Reglern der Medienplayer.

### Geändert

- **Lautstärke je Medienplayer: mehr Luft.** Mit "Je Medienplayer einzeln" haben die Regler jetzt einen deutlichen Abstand zum Schalter darüber, untereinander und zwischen dem Namen des Lautsprechers und seinem Regler. Bisher standen sie eng untereinander.

## [1.17.2] - 2026-11-11

Die Reiter des Protokolls ohne Zahlen.

### Geändert

- **Protokoll: keine Zahlen in den Reitern.** "Alarme" und "Alle Ereignisse" zeigen nicht mehr die Anzahl der Einträge im gewählten Zeitraum; die Listen zeigen sie ohnehin.

## [1.17.1] - 2026-11-11

Badges oben im README; die Änderungen aus 1.17.0 (nicht separat veröffentlicht) sind enthalten.

### Geändert

- **README:** Ganz oben stehen jetzt Badges mit der Version, dem Stand der Tests und der Prüfungen von HACS und hassfest, der Anzahl Downloads und der Lizenz.
- **README:** Der Hinweis "Status: stabil (1.0.0)" ist entfernt.

## [1.17.0] - 2026-11-11

Töne spielen am Stück statt abgehackt.

### Geändert

- **Ein Ton spielt für seine ganze Dauer am Stück.** Bisher startete die Anlage die kurze Tondatei (1 bis 4 Sekunden) auf den Lautsprechern immer wieder neu. Jeder Neustart braucht auf einem Medienplayer einen Moment und schneidet den laufenden Ton ab: es klang abgehackt, als wäre die Datei zu kurz. Jetzt bekommt der Lautsprecher eine einzige Datei in der eingestellten Länge und wird nur einmal gestartet. Das gilt für alle Töne: Alarmton, Voralarm und Aktivierungston.
- **Weicher Anfang, weiches Ende.** Jeder Ton wird am Anfang kurz ein- und am Ende ausgeblendet, statt hart einzusetzen und abzubrechen.
- **Durchgehende Töne ohne Naht.** Sirene, Zweiton und Jaulton sind neu so berechnet, dass eine Wiederholung ohne Sprung und ohne Einbruch an die nächste anschliesst.
- **Sehr lange Töne** (über 3 Minuten und "bis zum Deaktivieren") bestehen aus Stücken von 3 Minuten; der Neustart dazwischen fällt in die ausgeblendete Stelle.

## [1.16.0] - 2026-11-11

Lautstärke je Medienplayer, und zwei Fehler beim Speichern der Aktionen.

### Hinzugefügt

- **Lautstärke je Medienplayer.** Bei Alarmton, Voralarm und Aktivierungston gibt es mit mehr als einem Medienplayer den Schalter "Je Medienplayer einzeln": dann hat jeder Lautsprecher seinen eigenen Regler, zum Beispiel leiser im Schlafzimmer. Ohne den Schalter gilt wie bisher ein Wert für alle. Die Karte des Schritts zeigt dann die Spanne ("30–70 %").

### Behoben

- **Aktionen: "Änderungen" nach dem Speichern oder Testen, obwohl nichts offen war.** Home Assistant legt einen gespeicherten Ablauf etwas anders ab, als das Panel ihn schickt (Vorgaben ergänzt, Felder in anderer Reihenfolge). Sobald das Panel die Daten neu lud, etwa nach dem Speichern oder nach einem Test, hielt es den Ablauf für geändert: unten stand "3 Änderungen", und "Speichern" war wieder aktiv. Das Panel vergleicht jetzt den Inhalt statt der Schreibweise.
- **Die Ladeanzeige drehte nach dem Speichern bis zu 25 Sekunden.** Wer in diesem Zustand noch einmal speicherte, speicherte denselben Stand. Home Assistant lädt die Anlage dann nicht neu, das Panel wartete aber auf diesen Neustart. Der Server sagt dem Panel jetzt, ob die Anlage neu lädt; ohne Neustart gibt es keine Ladeanzeige. Das gilt auch für Sensoren und Anlage.

## [1.15.0] - 2026-11-11

Drei Arten von Tönen mit eigenen Klängen: Alarmton, Voralarm und Aktivierungston.

### Hinzugefügt

- **Voralarm.** Eine neue Schrittart im Ablauf des Alarms: ein leiser Warnton auf Lautsprechern, bevor der Alarmton einsetzt. Standard sind 20 Sekunden bei 30 % Lautstärke; der Ablauf wartet auf sein Ende, danach folgt der nächste Schritt (zum Beispiel der Alarmton). Deaktivieren stoppt ihn sofort, der Alarmton setzt dann nicht mehr ein.
- **Eigene Klänge je Art.** Jede Art bietet ihre eigenen Töne an, alle zum Probehören:
  - **Alarmton:** Sirene, Alarm-Piepen, Hupe und neu Zweiton hoch-tief und Jaulton.
  - **Voralarm:** Gong, Warnung (bisher Alarmtöne) und neu langsames Piepsen, pulsierender Ton, ansteigender Ton.
  - **Aktivierungston:** Piepsen, Doppelpiep, sanfter Ton (dezent), Glocke, Dreiklang aufsteigend (freundlich), Bestätigung (zwei Töne), Ticken (sehr dezent).

### Geändert

- **Einheitliche Begriffe: Alarmton, Voralarm, Aktivierungston.** Der Schritt heisst "Alarmton" (bisher "Alarmton abspielen"), und der Knopf der Push-Meldung heisst "Alarmton stumm" (bisher "Sirene stumm"): nicht jeder hat eine Sirene, und der Knopf meint den Ton des Alarms. Auch die Einstellung dazu und der Eintrag im Protokoll heissen so.
- **Der Aktivierungston spielt nur ganze Wiederholungen.** Ein Ton von 1 Sekunde erklingt in 3 Sekunden dreimal, eine Melodie von 2 Sekunden einmal: sie wird nie mittendrin abgeschnitten. Seine Auswahl zeigt nur noch die eigenen Töne.
- **Früher gewählte Klänge bleiben gültig.** Ein Alarmton mit Gong oder Warnung spielt weiter wie bisher und bleibt im Schritt wählbar, solange er eingestellt ist.

## [1.14.0] - 2026-11-11

Aktionen beim Scharfschalten mit einem Aktivierungston, und besser lesbare Texte auf dem Handy.

### Hinzugefügt

- **Aktionen beim Scharfschalten.** Bei den Alarmaktionen steht ganz oben der neue feste Punkt "Anlage scharf geschaltet" mit einem Plus. Was du dort ablegst, läuft, sobald die Anlage scharf ist (nach der Ausgangsverzögerung), je Modus wie die Alarmaktionen; im Reiter "Immer aktiv" gibt es den Punkt nicht. Die Schritte laufen nicht nach einem quittierten Alarm (die Anlage war durchgehend scharf) und nicht beim Start von Home Assistant. Deaktivieren stoppt sie sofort, ein Alarm hat Vorrang.
- **Aktivierungston.** Eine eigene Schrittart neben dem Alarmton: ein kurzer Ton auf Lautsprechern, standardmässig ein Piepsen von 3 Sekunden; Ton, Lautstärke und Dauer (bis 5 Minuten) stellst du ein, mit Probehören. Er läuft nie "bis zum Deaktivieren" und stellt nichts zurück, damit er von der Sirene zu unterscheiden ist. Verfügbar beim Scharfschalten und nach dem Quittieren; beim Alarm bleibt es beim Alarmton.

### Geändert

- **Die festen Punkte des Ablaufs sind grösser.** "Anlage scharf geschaltet", "Alarm beginnt" und "Alarm endet (quittiert)" tragen ein grösseres Symbol und kräftigere Schrift: scharf mit rotem Schild, der Alarm in vollem Rot, das Ende grün.
- **Handy: Beschreibungen in lesbarer Grösse.** Hinweise und Beschreibungen sind auf dem Handy durchgängig grösser (14.5 statt rund 12 Pixel).

### Behoben

- **Die Schrift wurde beim Aufklappen eines Alarms grösser.** Auf dem iPhone vergrösserte die Automatik des Browsers einzelne Textblöcke, sobald die Seite länger wurde: derselbe Hinweis im Protokoll war einmal klein und einmal gross. Die Automatik ist abgeschaltet, die Grösse ist jetzt immer dieselbe.

## [1.13.3] - 2026-11-11

### Geändert

- **Derselbe Aufbau in Protokoll und Konfiguration.** Zuoberst steht die Hauptwahl (Übersicht, Protokoll, Konfiguration), direkt darunter an derselben Stelle die zweite Zeile mit den Reitern des Bereichs. Im Protokoll stehen dort jetzt "Alarme" und "Alle Ereignisse" (vorher unter Zeitraum und Anlage); Zeitraum und Anlage folgen darunter.
- **Symbole auf jeder Ebene.** Auch die zweite Zeile trägt Symbole, am Computer wie auf dem Handy, links vom Text: Sensoren, Aktionen, Benachrichtigungen, Anlage sowie Alarme und Alle Ereignisse. Auf dem Handy richten sich die Breiten dieser Reiter nach ihrem Inhalt, damit alle vier mit Symbol Platz haben.
- **README:** alle Bildschirmfotos neu erzeugt (Reiter mit Symbolen, Protokoll mit zwei Reitern).

## [1.13.2] - 2026-11-11

### Geändert

- **Ladeanzeige in Sensoransicht und Protokoll.** Wo eine Grafik lädt, steht jetzt dieselbe Ladeanzeige wie im ganzen Panel (drei kreisende Punkte in der Farbe des Panels), mitten in der Fläche der Grafik und etwas kleiner; die Textzeile "Verlauf wird geladen …" entfällt. Beim Wechsel des Zeitraums bleiben Kennzahlen, Grafik und Liste gedimmt stehen, bis die neuen Daten da sind: nichts springt. Das Protokoll zeigt sie beim ersten Laden statt eines leeren Reiters.

## [1.13.1] - 2026-11-11

### Geändert

- **Hauptreiter mit Symbol auch am Computer.** "Übersicht", "Protokoll" und "Konfiguration" tragen am Computer dasselbe Symbol wie auf dem Handy, links vom Text.

## [1.13.0] - 2026-11-11

Das Protokoll mit zwei Reitern, ein Jahr Aufbewahrung und das Löschen einzelner Alarme.

### Hinzugefügt

- **Protokoll mit zwei Reitern.** "Alarme" (gewählt) und "Alle Ereignisse" stehen jetzt nebeneinander statt untereinander, jeder mit der Anzahl im gewählten Zeitraum. Vorher standen die Ereignisse unter den Alarmen und rutschten mit jedem Alarm weiter nach unten. Zeitraum und Anlage gelten für beide Reiter, die Filter der Ereignisse stehen im Reiter "Alle Ereignisse". Die Reiter stehen im festen Teil oben und sind beim Scrollen immer erreichbar.
- **Einen Alarm löschen.** Ein geöffneter Alarm hat unten den Knopf "Alarm löschen" mit Papierkorb. Erst nach einer Rückfrage wird die Aufzeichnung entfernt; die Einträge unter "Alle Ereignisse" bleiben. Ein laufender Alarm lässt sich nicht löschen.
- **"Weitere anzeigen".** Lange Listen zeigen zuerst 30 Alarme oder 200 Ereignisse und holen mit einem Knopf die nächsten. Vorher endete die Liste der Ereignisse mit einem Hinweis auf den Export.

### Geändert

- **Aufbewahrung: ein Jahr.** Alarme und Ereignisse bleiben jetzt ein Jahr und werden danach verworfen. Bisher blieben die letzten 30 Alarme und die letzten 1000 Ereignisse je Anlage, gleich wie alt: in einem lebhaften Haushalt reichten 1000 Ereignisse nur für wenige Monate. Die Anzahl ist nur noch eine Obergrenze, damit die Ablage nicht unbegrenzt wächst (200 Alarme und 5000 Ereignisse je Anlage).

## [1.12.0] - 2026-11-11

Du wählst, wie deine Sensoren heissen: "Gerät - Sensor" oder nur der Name des Sensors.

### Hinzugefügt

- **Namen der Sensoren wählbar.** In der Ansicht der Übersicht gibt es den Schalter "Gerätename vor dem Sensornamen". An (Standard): der Name setzt sich aus Gerät und Sensor zusammen, mit Bindestrich getrennt, zum Beispiel "Hue Motion Keller - Bewegung". So ist jeder Sensor eindeutig, auch wenn mehrere von sich aus gleich heissen. Aus: nur der Name des Sensors ("Bewegung", oder der Name, den du der Entität selbst gegeben hast). Anders als der Rest der Ansicht gilt die Wahl überall, wo ein Sensor genannt wird (Listen, Sensoransicht, Protokoll, Push-Meldungen), und auf allen Geräten; sie steht auch in der Sicherung.

### Geändert

- **Eine Regel statt einer Vermutung.** 1.11.0 nahm den eigenen Namen allein, wenn du ihn der Entität selbst gegeben hattest, und sonst den Anzeigenamen von Home Assistant. Das entscheidet jetzt dein Schalter. Steht der Name des Geräts schon im Namen des Sensors, wird er nicht noch einmal davorgesetzt; die Hauptentität eines Geräts heisst wie das Gerät; Sensoren älterer Integrationen, die ihren vollen Namen selbst tragen, bleiben unverändert.

## [1.11.0] - 2026-11-11

Der Alarm im Rot der scharfen Anlage, eine Kachel, die sagt, wer scharf geschaltet und was ausgelöst hat, und ein aufgeräumtes Protokoll.

### Hinzugefügt

- **Attribute `armed_at` und `armed_by`** der Anlage: seit wann sie scharf ist und wer sie scharf geschaltet hat. Sie bleiben während Eingangsverzögerung und Alarm und nach dem Quittieren stehen (die Anlage war durchgehend scharf) und überstehen einen Neustart; Deaktivieren löscht sie.
- **README:** die Stärken stehen am Anfang (keine Automationen nötig, Push-Meldungen kommen von selbst, alles grafisch einstellbar), neue Abschnitte mit Bild für die Sensoransicht und den Alarm, alle Bildschirmfotos neu erzeugt.

### Geändert

- **Der Alarm im selben Rot wie "scharf".** Das Alarmband war eine flache Fläche in der Fehlerfarbe und stand im dunklen Design blass neben den übrigen Rottönen. Es hat jetzt denselben Verlauf und denselben roten Rand wie die scharfe Kachel. Die Kachel der Anlage bleibt im Alarm rot (am kräftigsten); vorher verlor sie ihr Rot genau dann. Zwischen Band und Kachel steht ein Abstand.
- **Die Kachel sagt im Alarm, was ausgelöst hat und wer scharf geschaltet hat.** Unter "Alarm" stand "seit 07:16 · Diego", als hätte Diego den Alarm ausgelöst. Jetzt steht dort "seit 07:16" mit dem Sensor, der ausgelöst hat, und in einer eigenen Zeile "Abwesend scharf seit 06:50 · Diego". Dasselbe gilt in der Eingangsverzögerung.
- **Protokoll: ein laufender Alarm aktualisiert sich jede Sekunde.** Dauer und Balken laufen gleichmässig hoch statt alle 5 Sekunden zu springen. Ohne laufenden Alarm bleibt es bei 5 Sekunden.
- **Protokoll auf dem Handy: "von" und "bis" nebeneinander.** Bei "Zeitraum wählen" steht die Auswahl in der ersten Zeile, die beiden Datumsfelder stehen gleich breit darunter (vorher das eine schmal neben der Auswahl, das andere breit darunter).

### Behoben

- **Protokoll: die Verbindung der Schritte läuft nie mehr durch ein Symbol.** In der Liste eines Alarms lief eine durchgehende Linie hinter den Symbolen durch und schien durch deren halb durchsichtige Fläche. Jede Zeile zeichnet jetzt ein Stück über und eines unter ihrem Symbol, beide enden kurz davor (wie bei den Alarmaktionen).
- **Sensornamen: nicht umbenannte Sensoren behalten den Namen ihres Geräts.** Seit 1.10.2 hiess ein Sensor, den du nicht selbst benannt hast, nur noch wie seine Entität in der Integration, also zum Beispiel jeder Bewegungsmelder "Bewegung": in der Liste, im Protokoll und in der Alarmmeldung ("Alarm: Bewegung") war nicht mehr zu erkennen, welcher gemeint ist. Der eigene Name steht jetzt nur dann allein, wenn du ihn der Entität selbst gegeben hast ("Wohnzimmer Belegung"); sonst bleibt der Name des Geräts davor ("Hue Motion Keller Bewegung").

## [1.10.2] - 2026-11-11

### Behoben

- **Ein Name für jeden Sensor, überall.** Home Assistant setzt den Anzeigenamen einer Entität aus dem Namen des Geräts und ihrem eigenen Namen zusammen. Wer das Gerät umbenannt hat, bekam in jeder Liste einen langen Namen wie "Aqara FP400 Anwesenheitssensor Wohnzimmer Wohnzimmer Belegung". Das Panel und alle Meldungen (Alarm, Eingangsverzögerung, Stiller Alarm, nicht erreichbar, Batterie, Scharfschalten nicht möglich) verwenden jetzt nur den eigenen Namen der Entität ("Wohnzimmer Belegung"); die Hauptentität eines Geräts, die keinen eigenen Namen hat, heisst wie das Gerät. Entitäten, die ihren vollen Namen selbst tragen, behalten ihn. Der Name des Geräts bleibt wie bisher sichtbar (Sensoransicht, Kachel "Gerät"). Eine Regel für Server und Panel (`devices.display_name`), damit der Name in Liste, Blatt, Protokoll und Push-Meldung gleich ist.

## [1.10.1] - 2026-11-10

### Behoben

- **Die Alarmanlage lädt auch, wenn sich das Panel nicht anmelden lässt.** Scheiterte die Anmeldung des Seitenpanels (zum Beispiel "Cannot register a resource into frozen router", wenn der Webserver schon eingefroren ist), lud die ganze Alarmanlage nicht. Das Panel ist Bequemlichkeit, die Alarmanlage nicht: Der Fehler wird jetzt als Fehler protokolliert, und die Anlage läuft ohne Panel weiter, scharf und alarmierend.

## [1.10.0] - 2026-11-10

Aktionen nach dem Quittieren, und Schritte, die standardmässig weiterlaufen.

### Hinzugefügt

- **Aktionen nach dem Quittieren.** Unter "Alarm endet (quittiert)" und der Meldung dazu steht jetzt ein weiteres Plus: Schritte, die laufen, sobald der Alarm vorbei ist, ob jemand quittiert oder die Anlage deaktiviert hat, zum Beispiel die Storen wieder schliessen oder das Licht ausschalten. Sie starten erst, wenn die Alarmaktionen gestoppt und die Geräte zurückgekehrt sind ("Rückgängig"), jeder Modus hat seine eigene Liste wie die Alarmaktionen, und "Aktionen übernehmen von" nimmt sie mit. Möglich sind Gerät, Ton mit Dauer, Warten, Szene und eigene Aktion; eine Alarmmeldung, Quittieren und "Rückgängig" gibt es hier nicht, weil nichts mehr folgt, das etwas zurücknehmen könnte. Ein neuer Alarm hat immer Vorrang: er bricht sie ab und startet sofort seine eigenen Aktionen.

### Geändert

- **Schritte laufen standardmässig weiter.** Bisher wartete ein Ablauf auf das Ende jedes Schritts, ausser "Nicht abwarten" war eingeschaltet. Das ist jetzt umgekehrt: jeder Schritt, der etwas ausführt (Gerät, Ton, Szene, eigene Aktion), startet den nächsten sofort, die Aktionen laufen so schnell wie möglich nacheinander durch; niemand muss auf das Ende einer Sirene warten. Soll der nächste Schritt erst starten, wenn dieser fertig ist, schaltest du im Schritt "Warten, bis die Aktion beendet ist" ein; er trägt dann eine Pille mit diesem Text. "Warten" wartet weiterhin, und auf einen Ton "bis zum Deaktivieren" lässt sich nicht warten.
- **Bestehende Abläufe verhalten sich wie bisher.** Schritte aus früheren Versionen, die gewartet haben, warten weiter und zeigen jetzt die Pille; Schritte, die nebenher liefen, tun das weiterhin und tragen keine Marke mehr. Ändern kannst du es im Schritt.
- **Alle Verbindungen im Ablauf sehen gleich aus.** Die gestrichelte blaue Linie nach einem Schritt, der nebenher lief, ist weg, ebenso der Schalter an der Karte: ob der Ablauf wartet, sagt die Pille auf dem Schritt.
- **"Alarm endet (quittiert)".** Die Marke am Ende des Ablaufs sagt jetzt, was sie meint; die Texte ihrer Meldung nennen Quittieren und Deaktivieren.
- **Handy: der Abstand unter der Reiterleiste bleibt beim Scrollen.** Unter der Leiste mit Sensoren, Aktionen, Meldungen und Anlage steht beim Scrollen immer derselbe Abstand wie über ihr. Bisher schob sich der Tabellenkopf ohne Abstand an die Leiste, es sah aus, als würden beide zusammenschmelzen.

## [1.9.0] - 2026-11-10

Eine Sensoransicht: einen Sensor der Übersicht antippen und sehen, was er getan hat, wie es seiner Batterie geht und wie gut sein Empfang ist.

### Hinzugefügt

- **Sensoransicht.** Ein Tipp auf einen Sensor der Übersicht (Liste oder Karten) öffnet ein eigenes Fenster statt des Geräts in Home Assistant. Es ist eine reine Übersicht ohne Einstellungen; der Knopf "In HA öffnen" im Kopf führt zum Sensor in Home Assistant. Auf dem Computer ist das Fenster so breit wie das der Voreinstellungen, auf dem Handy füllt es den Bildschirm, mit einem X oben. Kopf, Kacheln, Zeitraum, Kennzahlen und Grafik bleiben stehen, nur die Liste der Ereignisse scrollt.
- **Kacheln als Reiter:** "Verlauf", "Batterie", "Empfang" und "Gerät". Jede zeigt ihren aktuellen Wert; die gewählte bestimmt Grafik, Kennzahlen und Liste. Eine Kachel ohne Daten entfällt (keine "Batterie" bei einem Gerät am Netz).
- **Eine Grafik je Sensorart,** für 3 Stunden, 12 Stunden, 1 Tag, 7 Tage oder 30 Tage. Türen und Fenster: eine Zeitleiste mit den offenen Zeiten, ab 7 Tagen eine Zeile je Tag von 0 bis 24 Uhr. Bewegung: die Anzahl Bewegungen je Stunde als Balken, ab 7 Tagen ein Raster aus Tag und Stunde, das Gewohnheiten und Ausreisser zeigt. Rauch, Wasser und Ähnliches: die Erreichbarkeit mit Ausfällen und Auslösungen. Blau zeigt, wann die Anlage scharf war, Rot ein Ereignis, das einen Alarm ausgelöst hat.
- **Liste der Ereignisse** mit Zeit, Dauer und dem Zustand der Anlage in diesem Moment, nach Tagen gruppiert, auch "Nicht erreichbar". Ein Ereignis, das einen Alarm ausgelöst hat, trägt die Marke "Alarm ausgelöst"; ein Tipp darauf zeigt diesen Alarm im Protokoll.
- **Batterie:** der Stand über 30 Tage, 90 Tage oder ein Jahr mit der Schwelle der Warnung, einer Marke beim Batteriewechsel, dem Verbrauch je Tag und einer Prognose. **Empfang:** der Verlauf mit den Zonen gut, mittel und schwach.
- **Gerät:** Hersteller, Modell, Firmware, Integration und Bereich, dazu in welchen Modi welcher Anlage der Sensor überwacht wird, mit einem Link zu seiner Stelle in der Konfiguration.
- **30 Tage Verlauf für alle.** Home Assistant bewahrt den Verlauf von Zuständen standardmässig 10 Tage auf. Die Integration merkt sich jetzt je Sensor kleine Stundenwerte (Anzahl Auslösungen, Zeit offen) für 30 Tage und verwirft ältere; Grafik und Kennzahlen reichen damit immer 30 Tage zurück. Nach dem Update werden die Stunden davor einmal aus dem Verlauf von Home Assistant nachgetragen. Die Liste der einzelnen Ereignisse reicht so weit wie dieser Verlauf, mit einem Hinweis, wenn er kürzer ist als der gewählte Zeitraum.

### Geändert

- **Handy: jedes Fenster füllt den Bildschirm.** Die Fenster der Einstellungen (Ansicht, Voreinstellungen, Schritt bearbeiten, Sensoren hinzufügen, Blatt des Sensors, Codes und die neue Sensoransicht) öffnen sich nicht mehr als Blatt mit Rand oben. Das X steht immer ganz oben rechts, die Leiste mit den Knöpfen (Abbrechen, Fertig, Speichern) immer ganz unten: sie liegt ausserhalb des scrollenden Inhalts und bewegt sich nicht, auch nicht beim Ziehen über das Ende hinaus. Nur die kurzen Rückfragen ("Verwerfen?") bleiben ein kleines Blatt von unten.
- **Scharf ist rot, auf jedem Gerät und im dunklen Design.** Bisher zeigte das nur der schwache Farbverlauf der Kachel, auf dem Handy und im dunklen Design kaum zu sehen, während Symbol, Zustand und gewählter Modus blau waren. Jetzt sind das Symbol, der Zustand ("Abwesend scharf") und der gewählte Modus rot, die Kachel hat einen roten Rahmen, und der Verlauf ist im dunklen Design kräftiger. Deaktiviert: "Aus" ist grün. Ein Alarm hebt sich von "scharf" mit einem gefüllten roten Symbol ab. Auf dem Handy zeigt die Leiste bei vier Modi (Aus, Anwesend, Abwesend, Nacht) nur noch Text: mit Symbolen liefen die Beschriftungen ineinander.

## [1.8.0] - 2026-11-10

### Hinzugefügt

- **Übersicht, Kachel der Alarmanlage:** Die Kachel bekommt einen schwachen Farbverlauf von unten, wie die Karten der Sensoren: rot, solange die Anlage scharf ist (mit dem Modus dunkler: hell bei Anwesend, mittel bei Nacht, dunkel bei Abwesend), grün, solange sie deaktiviert ist.

## [1.7.0] - 2026-11-10

Eine klare Regel für Sensoren, die "Immer aktiv" sind und zugleich in der Zone eines Modus stehen, beide Abläufe der Alarmaktionen nebeneinander, einheitliche Punkte für Ungespeichertes eine Zeichnung des Ablaufs, die nicht mehr danebengehen kann, und die Sensorkarten der Übersicht so gruppiert, wie du es wählst.

### Hinzugefügt

- **Übersicht, Sensoren gruppiert nach Wahl:** nach Bereich, nach Sensorart (Türen, Fenster, Bewegung, Rauch und Wasser, …), nach Anlage oder gar nicht. Auf dem Computer steht die Auswahl in der Werkzeugleiste neben "Liste / Karten", auf dem Handy in "Ansicht"; sie wird je Gerät gemerkt und gilt für die Liste und für die Karten. In der Kartenansicht hat jede Gruppe einen Titel mit der Anzahl ihrer Sensoren über die ganze Breite, die Karten laufen nicht mehr ineinander.

### Geändert

- **"Immer aktiv" und zugleich ein Modus: ein Schalter, im Standard eindeutig.** Für einen Sensor, der "Immer aktiv" ist und zugleich in der Zone eines Modus steht, hat das Blatt des Sensors den Schalter "Scharf in <Modus>: nur <Modus> zählt" (vorher: "Immer aktiv ignorieren"). **An (neuer Standard):** Solange die Anlage in diesem Modus scharf ist, gelten für den Sensor nur die Einstellungen und die Aktionen dieses Modus. **Aus:** "Immer aktiv" gilt zusätzlich: der Sensor löst sofort aus, und beide Abläufe der Alarmaktionen laufen nebeneinander, der des Modus und der von "Immer aktiv". Bei deaktivierter Anlage und in Modi, deren Zone den Sensor nicht enthält, gilt "Immer aktiv" wie bisher. Vor dieser Version war der Standard für die Regel umgekehrt (der Sensor löste auch in seinem Modus sofort aus), und bei scharfer Anlage liefen immer nur die Aktionen des Modus.
- **Welche Alarmaktionen laufen,** richtet sich jetzt nach dem Sensor: deaktiviert oder scharf in einem Modus, der den Sensor nicht enthält, laufen die Aktionen von "Immer aktiv" (vorher liefen bei scharfer Anlage immer die Aktionen des Modus, auch für einen Rauchmelder ausserhalb der Zone). Hat "Immer aktiv" keine eigenen Aktionen, laufen die des scharfen Modus, damit kein Alarm ohne Aktionen bleibt. Ohne "Einstellungen pro Modus" bei den Aktionen (ein Ablauf für alles) läuft der Ablauf nie doppelt.
- **Blatt des Sensors:** Der Rahmen "Diese Einstellungen gelten …" steht immer da und sagt genau, wann die Einstellungen greifen, zum Beispiel "deaktiviert und scharf in Anwesend" mit dem Hinweis "Scharf in Abwesend gelten stattdessen die Einstellungen und Aktionen des Modus". Die Pillen "Alarmmodi" sind aus dem Blatt entfernt: zu welchen Modi ein Sensor gehört, steht in der Tabelle (die Kästchen und die Spalte "Immer aktiv").
- **Oranger Punkt = ungespeichert, überall gleich:** am Reiter "Konfiguration", am Unterreiter und neu auch am Reiter des Modus, der ungespeicherte Änderungen hat (Sensoren, Aktionen, Benachrichtigungen, Anlage). Die Punkte und die markierten Zeilen verschwinden sofort beim Speichern, nicht erst, wenn die Anlage neu geladen hat. Eigene Werte (Overrides) sind blau markiert, nie orange; der Balken an einer geänderten Sensorzeile ist orange.

### Behoben

- **Zeichnung des Ablaufs der Aktionen:** Die Verbindungslinie war teils blau, teils grau und konnte über einem Symbol liegen. Jede Verbindung zeichnet ihre Linie jetzt selbst im Fluss der Seite (ein Stück über und eines unter dem Plus) statt einer Linie hinter allem: sie endet immer am Plus und an den Karten, hat eine Farbe je Verbindung (gestrichelt blau nach einem Schritt, der nebenher läuft, auch auf dem Stück zu "Alarm endet") und liegt in jeder Breite und in beiden Designs auf einer Achse mit den Symbolen.
- **Zwei Abläufe unter derselben Aufsicht:** Der zweite Ablauf hat seinen eigenen Wächter, seine eigenen eingestellten Zeiten und seine eigene Stelle für einen Neustart oder ein Neuladen; eine Sirene schaltet also in beiden Abläufen nach der eingestellten Zeit aus.
## [1.6.5] - 2026-11-10

### Geändert

- **Punkte:** Orange Punkte bedeuten jetzt immer "ungespeicherte Änderung" (an den Reitern). Der Punkt am Kästchen, der einen "eigenen Wert" markiert (weicht von der Voreinstellung der Sensorart ab), ist jetzt blau wie der Punkt am Sensornamen und nicht mehr orange.

## [1.6.4] - 2026-11-10

### Behoben

- **Sensor-Blatt auf dem Handy:** Unter der Leiste mit "Fertig" schien der Inhalt des Blatts in einem Streifen am unteren Bildschirmrand durch (der Abstand zur Home-Anzeige wurde doppelt gezählt). Die Leiste endet jetzt genau am unteren Rand.

## [1.6.3] - 2026-11-10

### Behoben

- **Sensor-Blatt mit "Einstellungen pro Modus":** Ein Sensor, der nur "Immer aktiv" ist und im gewählten Reiter (zum Beispiel "Anwesend") in keiner Zone steht, zeigte die Einstellungen dieses Modus, die für ihn keine Wirkung haben. Das Blatt zeigt für einen solchen Sensor jetzt den Bereich "Immer aktiv" ("in jedem Zustand der Anlage", blauer Rahmen); steht er in der Zone des Reiters, zeigt es wieder den Modus.

## [1.6.2] - 2026-11-10

### Geändert

- **Blatt mit den Sensor-Optionen:** Der Abschnitt "Zonen" heisst jetzt "Alarmmodi" und zeigt "Immer aktiv" als Pille neben Anwesend, Abwesend und Nacht, damit klar ist, in welchen Zuständen ein Sensor gilt (die eigene Zeile "Immer aktiv" in der Liste entfällt). Der Schalter "Immer aktiv ignorieren" steht direkt darunter, sobald der Sensor "Immer aktiv" ist und in einer Zone steht; in einem Reiter, dessen Modus den Sensor nicht enthält, sagt ein Hinweis, dass es nichts zu überschreiben gibt.

## [1.6.1] - 2026-11-10

### Behoben

- **Übersicht:** Der Abstand zwischen den Filtern und dem Tabellenkopf bleibt beim Scrollen der Liste erhalten; vorher ging er zu, und über dem Kopf schienen Zeilen durch.

## [1.6.0] - 2026-11-10

### Hinzugefügt

- **"Immer aktiv" abschalten:** In Konfiguration › Anlage steht neben den Modi die Pille "Immer aktiv", die sich abschalten lässt (Standard an). Aus heisst: Kein Sensor ist immer aktiv, Rauch- und Wassermelder alarmieren dann nur noch, wenn sie in der Zone eines scharfen Modus stehen, und eine gelbe Warnung weist darauf hin. Reiter, Spalte und Option "Immer aktiv" verschwinden bei den Sensoren und der Reiter bei den Aktionen; alle Werte und Aktionen bleiben erhalten und kommen beim Einschalten zurück. Sensoren, die nur "Immer aktiv" sind, stehen in der Übersicht nicht in der Liste, solange es aus ist. Die Einstellung gehört zur Sicherung.

### Behoben

- **Beim Speichern der Aktionen geht der Ablauf eines abgeschalteten Modus oder von "Immer aktiv" nicht mehr verloren:** Auslöser, die nicht in der gespeicherten Meldung stehen, behalten ihren Ablauf und ihre Einstellungen für "Alarm endet"; ein leerer Ablauf in der Meldung löscht ihn weiterhin.

## [1.5.0] - 2026-11-10

### Hinzugefügt

- **Empfänger je Meldung:** Jede Meldung in Konfiguration › Benachrichtigungen hat ein Dropdown "Empfänger hinzufügen" mit den Empfängern als Pillen. Die oben gewählten Empfänger (Alarme oder Wartung) sind als Standard vorgewählt; wer einen hinzufügt oder entfernt, überschreibt sie für diese Meldung, "Zurück zum Standard" macht das rückgängig. Mit "Einstellungen pro Modus" können die Empfänger auch je Modus abweichen (Wert des Modus, dann der Meldung, dann die Gruppe oben). Der letzte Empfänger lässt sich nicht entfernen, damit keine Meldung ohne Empfänger bleibt. Testmeldungen und die gesammelte Wartungsmeldung folgen den eigenen Empfängern; Batterie- und Nicht-erreichbar-Meldungen mit verschiedenen Empfängern gehen getrennt hinaus. Die Werte gehören zur Sicherung.

## [1.4.0] - 2026-11-10

Nicht veröffentlicht; enthalten in 1.5.0.

### Hinzugefügt

- **Aktionen von einem anderen Modus übernehmen:** In Konfiguration › Aktionen bietet die Fusszeile mit "Einstellungen pro Modus" "Aktionen übernehmen von …". Sie ersetzt alle Aktionen des offenen Reiters (Schritte und "Alarm endet") durch die eines anderen Modus oder von "Immer aktiv", mit Rückfrage, wenn der Reiter eigene Aktionen hat. Gespeichert wird erst mit "Speichern".
- **Schalter "Immer aktiv ignorieren":** Für einen Sensor mit "Immer aktiv", der zugleich in der Zone eines Modus steht, lässt ein Schalter in den Sensor-Optionen (je Modus mit "Einstellungen pro Modus"; Standard aus) nur die Regel dieses Modus gelten, solange die Anlage darin scharf ist. In Modi, deren Zone den Sensor nicht enthält, tut er nichts, ein Rauchmelder bleibt dort also aktiv.

### Geändert

- **"Immer aktiv" ist immer aktiv:** Ein Sensor mit dieser Option löst in jedem Zustand der Anlage aus, scharf wie deaktiviert, und zwar sofort. Seine Optionen (zum Beispiel "Stiller Alarm") kommen jetzt immer aus dem Reiter "Immer aktiv", auch bei scharfer Anlage. Vorher las eine scharfe Anlage sie aus dem Reiter des aktiven Modus. Steht der Sensor zugleich in der Zone des scharfen Modus, laufen beide Regeln und die stärkere Wirkung zählt (ein Alarm schlägt eine stille Meldung).

### Behoben

- **Rauch- und Wassermelder wurden nicht beachtet und nicht angezeigt:** Ein Sensor, dessen Art standardmässig "immer aktiv" ist (Rauch, Wasser, Gas), wurde nur beachtet, wenn er in einer Zone stand oder einen eigenen Wert "Immer aktiv" hatte. Stand er nur in der Liste der Konfiguration, löste er keinen Alarm aus und erschien nicht in der Übersicht. Jetzt wird jeder Sensor der Anlage beachtet und aufgelistet, für den "Immer aktiv" gilt (eigener Wert oder Standard der Art).
- **Fenster "Ansicht":** Das Feld "Sortieren nach" war zusammengedrückt; es hat jetzt dieselbe Höhe und Rundung wie die Auswahlleisten darüber.
- **Grafik im Ablauf:** Nach einem Schritt, der "nebenher läuft", ragte die gestrichelte Linie in die Karte darüber und lag auf der durchgehenden Linie. Sie liegt jetzt genau zwischen Karte und Plus-Knopf, und die durchgehende Linie scheint nicht mehr durch.

## [1.3.0] - 2026-11-10

### Hinzugefügt

- **Knopf "Quittieren" im Panel:** Das rote Alarm-Band in der Übersicht hat neben "Deaktivieren" einen Knopf "Quittieren". Er beendet den Alarm und lässt die Anlage scharf; er steht nur da, solange ein Alarm läuft.

### Geändert

- **Der Knopf "Quittieren" in der Push-Meldung ist standardmässig an** (pro Push-Schritt abschaltbar). Er schaltet nichts ab, braucht also anders als "Deaktivieren" keine Freigabe; er wirkt weiterhin nur, solange der Alarm läuft, und nur vom Handy eines konfigurierten Alarm-Empfängers.

## [1.2.0] - 2026-11-10

Nicht veröffentlicht; enthalten in 1.3.0.

### Hinzugefügt

- **Alarm quittieren:** eine neue Aktion "Alarm beenden (quittieren)" für den Ablauf und ein Knopf "Quittieren" in der Push-Meldung. Quittieren beendet den Alarm: Die laufenden Schritte stoppen, die Geräte gehen in den früheren Zustand zurück ("Alarm endet" läuft wie beim Deaktivieren), das Protokoll hält fest, wer quittiert hat. Die Anlage **bleibt scharf** in ihrem Modus, der nächste Auslöser alarmiert wieder. Die Push-Meldung "Alarm beendet" ersetzt die Alarmmeldung auf dem Handy. Während der Eingangsverzögerung und bei scharfer Anlage ohne Alarm gibt es nichts zu quittieren. Der Knopf wirkt nur, solange der Alarm läuft, und nur vom Handy eines konfigurierten Alarm-Empfängers; der Schritt tut im Test nichts. Deaktivieren beendet den Alarm weiterhin ebenfalls und schaltet die Anlage aus.

## [1.1.0] - 2026-11-10

Nicht veröffentlicht; enthalten in 1.2.0.

### Hinzugefügt

- **Eingangsverzögerung pro Sensor:** Jeder Eingangssensor kann im Blatt mit den Sensor-Optionen eine eigene Eingangsverzögerung haben (0 bis 3600 s). Ohne eigenen Wert gilt die Eingangsverzögerung der Anlage für den aktuellen Modus; das Blatt zeigt die Herkunft des Werts und setzt ihn zurück. Mit "Einstellungen pro Modus" kann der Wert je Modus abweichen. 0 löst sofort aus. Der Wert gehört zur Sicherung. "Auf alle Sensoren anwenden" bei den Voreinstellungen lässt ihn stehen.
- **Eigene Empfänger je Meldung:** Der Schritt "Push-Meldung" und die Push-Meldung von "Alarm endet" können eigene Empfänger haben statt der Alarm-Empfänger aus der Konfiguration. Der Dialog zeigt die Standard-Empfänger; ein Schalter ersetzt sie durch eine eigene Liste. Eine leere Liste bedeutet wieder Standard. Push-Knöpfe werden von jedem Empfänger des Alarms akzeptiert, auch von denen aus den Schritten.
- **Emoji in jedem Standardtitel:** 🚨 Alarm, ⏳ Eingangsverzögerung, 🔒 scharf, 🔓 deaktiviert, ✅ Alarm beendet, ⛔ Scharfschalten nicht möglich, 📡 Sensor nicht erreichbar, 🔕 Stiller Alarm, ⚠️ Wartung, 🧪 Test. Ein Test stellt sicher, dass jeder Standardtitel mit einem Emoji beginnt. Eigene Titel bleiben, wie du sie schreibst.

### Geändert

- **Sensorliste:** Karten und Zeilen von Sensoren, die offen sind oder eine Bewegung erkannt haben, bekommen einen schwachen Farbverlauf von unten und fallen so auf einen Blick auf.
- Version 1.0.1 wurde nicht veröffentlicht; ihre Änderungen sind hier enthalten.

### Behoben

- **Fenster "Ansicht":** Ein Klick auf einen Schalter, eine Spalte oder die Reihenfolge scrollt das Fenster nicht mehr nach oben; es bleibt an derselben Stelle.

## [1.0.1] - 2026-11-10

Nicht veröffentlicht; enthalten in 1.1.0.

Kleine Design-Korrekturen für die Ansicht am Computer.

### Geändert

- **Kopfzeile in jedem Reiter gleich:** Der Name der Alarmanlage (bei mehreren ein Dropdown), der Stift und der Knopf "Integration in HA öffnen" stehen jetzt auch in der Übersicht und im Protokoll oben, nicht nur in der Konfiguration.
- **Blatt der Sensor-Optionen und oben rechts:** Bei einem breiten Fenster endet das Blatt der Sensor-Optionen auf derselben Linie wie die Knöpfe oben rechts (vorher hörte es vor dem Rand auf).
- **Sensoren, Reiter eines Modus:** Der Titel der Spalte des gewählten Modus (zum Beispiel "Abwesend") ist zusätzlich fett.

### Behoben

- **Abstand über der Sensortabelle:** Der Abstand zwischen der Kachel "Einstellungen pro Modus" und der Tabelle ist fest und verschwindet beim Scrollen nicht mehr.
- **Sortieren nach Zustand** in der Sensorliste brachte "ruhig" und "zu" in keine Ordnung; gleiche Zustände stehen jetzt beieinander.
- **Pfeil der Auswahlfelder** (Dropdowns): als Bild gezeichnet, damit er bei manchen Zoomstufen keine Kerbe zeigt.

## [1.0.0] - 2026-11-10

Erste stabile Version. Keine neue Funktion gegenüber 0.40.0: Versionsnummer und Status im README ändern sich, weil die ganze Integration durch einen externen Code-Review geprüft wurde (siehe 0.40.0) und keine Vorabversion mehr ist.

### Geändert

- **Version 1.0.0, keine Vorabversion mehr.** Das README nennt Alarmageddon nicht mehr eine frühe Vorabversion, und die Installation verlangt in HACS nicht mehr "Pre-release". Alles von 0.24.0 bis 0.40.0 ist enthalten; die Abschnitte darunter listen es auf.

## [0.40.0] - 2026-11-09

Nicht veröffentlicht; enthalten in 1.0.0.

Härtung nach einem externen Code-Review: Wettläufe im Zustandsautomaten, ein Test, der einen echten Alarm verschlucken konnte, ein veralteter Knopf "Deaktivieren", Knöpfe der Alarmmeldung nur für die konfigurierten Empfänger, und das Panel rechnet beim Scharfschalten gleich wie die Anlage.

### Hinzugefügt

- **Wächter für die Alarmaktionen.** Der Ablauf der Alarmaktionen steht jetzt als Ganzes unter Aufsicht, gleich aus welchem Grund etwas dauert: Nach dem Auslösen beginnt der erste Schritt nach höchstens 8 Sekunden (hängt oder scheitert der Start, startet der Wächter die Schritte selbst, ohne den Schnappschuss der Geräte); kein Schritt hält den nächsten länger auf als seine eigene Grenze (eine Aktion 12 Sekunden, ein Warten seine Zeit plus 2 Sekunden, ein Ton seine Dauer plus die Zeit, die der Player zum Antworten haben darf); und bricht der Ablauf selbst unerwartet ab, macht er mit dem nächsten Schritt weiter. Jeder Eingriff steht im Log von Home Assistant und in der Zeitachse des Alarms ("Wächter: …"). Ein hängender Schritt wird nicht abgebrochen (ein Skript darf fertig werden), aber nicht mehr abgewartet; Deaktivieren beendet ihn.

### Sicherheit

- **Knöpfe der Alarmmeldung nur für konfigurierte Empfänger:** "Deaktivieren" und "Sirene stumm" werden nur von einem Handy angenommen, dessen Home-Assistant-Benutzer zu einem konfigurierten Alarm-Empfänger gehört: ein direkt gewählter Dienst `notify.mobile_app_<gerät>` oder ein Mitglied einer gewählten notify-Gruppe (Plattform `group`, auch verschachtelt). Vorher konnte jede bei Home Assistant registrierte Companion App das Ereignis hinter den Knöpfen senden, auch das Handy eines Benutzers, der keine Alarmmeldungen bekommt. Home Assistant beglaubigt nur den Benutzer, der das Handy registriert hat, nicht das einzelne Gerät: zwei Handys desselben Benutzers lassen sich nicht unterscheiden. Ein abgewiesener Versuch steht im Log von Home Assistant. Empfänger, die keine Dienste der Companion App sind, können die Knöpfe nicht benutzen (sie konnten sie nie senden).

### Geändert

- **Ein Ton "bis zum Deaktivieren" läuft immer nebenher.** Er endet nie von selbst; als "abwarten" gespeichert, starteten die Schritte danach (zum Beispiel die Sirene) nie. Der Ablauf zeigt ihn als "läuft nebenher", der Schalter ist fest; bestehende Abläufe verhalten sich so, ohne neu zu speichern.
- **"Deaktivieren" und "Sirene stumm" in der Alarmmeldung** wirken nur, solange der Alarm läuft. Eine alte Alarmmeldung, die auf dem Handy liegen blieb (das "Alarm beendet" kam nie an), kann eine später wieder scharf geschaltete Anlage nicht mehr deaktivieren.
- **Echter Alarm während eines Tests der Alarmaktionen:** der Test endet sofort und der echte Ablauf startet, ohne auf etwas zu warten; die Geräte kehren beim Deaktivieren in den Zustand von vor dem Test zurück. Vorher liefen der Ablauf und, mit einem Push-Schritt im Ablauf, auch die Alarmmeldung nicht, solange der Test (bis 60 s) lief.
- **Meldungen, Einstellungen pro Modus:** mit eingeschaltetem Schalter stehen die Arten, die nicht vom Modus abhängen ("Scharfschalten nicht möglich", "Deaktiviert"), unter den Reitern der Modi unter "Für alle Modi"; mit eingeschaltetem Schalter waren sie gar nicht erreichbar. Mit ausgeschaltetem Schalter ändert sich nichts.
- **Sensortabelle, Reiter eines Modus:** die kleine Zeile unter dem Sensornamen zeigt die Optionen, die im gewählten Modus gelten (wie das Blatt), nicht die Werte für alle Modi.

### Behoben

- **Die eingestellte Dauer zählt ab dem ersten Start.** Wie lange eine Sirene oder ein Ton läuft, steht in den Alarmaktionen ("Sirene ein, Warten, Sirene aus" oder ein Ton mit Dauer). Wurden mitten im Alarm Einstellungen gespeichert (die Anlage lädt neu) oder startete Home Assistant neu, begann die Wartezeit oder der Ton von vorn, eine Sirene konnte bis zu doppelt so lange laufen wie eingestellt. Jetzt läuft nur der Rest; ist die Zeit schon um, folgt sofort der nächste Schritt.
- **Nichts hält die Alarmaktionen mehr auf.** Ein hängendes Gerät oder eine hängende Push-Meldung tat das schon bisher nicht (höchstens 10 Sekunden, eine Push-Meldung gar nicht). Jetzt gilt dasselbe für alles andere, was beim Auslösen mitläuft: scheitert das Ereignisprotokoll, die Alarm-Aufzeichnung, die Meldung oder die Benachrichtigung in Home Assistant, starten die Alarmaktionen trotzdem und die übrigen Teile laufen weiter (vorher stoppte ein scheiternder Teil alles danach, auch die Sirene). Hängt oder scheitert die Ablage vor dem ersten Schritt, starten die Schritte trotzdem (nach höchstens 3 Sekunden), und ein Fehler beim Schreiben der Zeitachse stoppt die folgenden Schritte nicht mehr.
- **Scharfschalten während der Code-Prüfung:** die Code-Prüfung läuft in einem Hilfsthread. Ging in diesem Moment ein Eingangssensor auf (Eingangsverzögerung läuft), beendete das Scharfschalten in einen anderen Modus die Verzögerung still, und die Anlage war scharf statt im Alarm. Das Scharfschalten wird jetzt abgelehnt ("zuerst deaktivieren"), die Verzögerung läuft zum Alarm weiter.
- **Mehrere Anlagen, die beim Start zugleich laden,** legten zwei Kopien der globalen Einstellungen (Voreinstellungen je Sensorart, Meldungen) auf derselben Datei an; eine geänderte Voreinstellung konnte dann das Neuladen einer Anlage auslassen. Eine Kopie, wie beim Panel.
- **"Alarm endet" nach einem Neustart von Home Assistant mitten im Alarm** nahm die Meldung von "Immer aktiv" statt die des Modus, in dem der Alarm lief.
- **Übersicht, "Bereit für" und offene Sensoren:** das Panel wendet dieselben Regeln an wie die Anlage: "Umgehen" und die Werte je Modus (Schalter "Einstellungen pro Modus") zählen. Vorher galt ein Sensor, den die Anlage umgehen würde, als Hindernis.
- **Sensorliste auf der Übersicht:** Sensoren, die nur im Reiter "Immer aktiv" (Einstellungen pro Modus) auf "Immer aktiv" stehen, fehlten in der Liste.
- **Alarm-Aufzeichnung:** ein Alarm, der ohne Deaktivieren endete (alte Alarmdauer aus der Zeit vor 0.25.0, wiederhergestellt), wurde nie abgeschlossen, und der nächste Alarm wurde nicht aufgezeichnet. Einträge eines Sensors, der in der Eingangsverzögerung dauernd ausfällt und zurückkommt (samt der Meldungen dazu), zählen jetzt wie Sensoreinträge gegen die Grenze je Alarm; Zustandswechsel, Schritte und die Alarmmeldung bleiben immer erhalten.
- **Panel:** ein fehlgeschlagenes Scharfschalten zeigte den Fehler in seltenen Fällen im falschen Fenster; der Zeitgeber der Datenabfrage wird freigegeben; ein entferntes Panel stoppt seine Zeitgeber; die Symbole der Sensorklassen Hitze, Schloss und Bewegt sich; in der Kurzfassung eines Alarmtons ohne Lautstärke fehlte ein Leerzeichen; der CSV-Export des Protokolls entschärft Zellen, die wie eine Tabellenformel beginnen.
- **Optionsdialog von Home Assistant:** Eingangssensoren werden gegen die wirklich eingeschalteten Modi geprüft (Anwesend und Abwesend lassen sich im Panel abschalten); der eingegebene Code wird nach einem Eingabefehler nicht in das Formular zurückgegeben.
- **Konfiguration:** ein persönlicher Code ohne Salz oder ein beschädigter Code-Eintrag bricht weder die Code-Prüfung noch das Panel.
- **Reiter Protokoll:** das Panel fragt bei offenem Reiter alle 5 Sekunden; der Server antwortet jetzt mit "unverändert", bis ein Ereignis oder ein Eintrag eines Alarms dazukam, statt jedes Mal bis zu 1000 Ereignisse und 30 Alarme je Anlage zu senden.
- **"Letzte Änderung" der Sensoren** wird innert 5 Sekunden geschrieben, auch wenn sich Sensoren dauernd ändern (vorher schob jede Änderung das Schreiben hinaus, es geschah erst beim Beenden von Home Assistant).
- **Voreinstellungen speichern mit "Auf alle Sensoren anwenden" und eine Sicherung einspielen** laden jede Anlage einmal statt zweimal neu; unveränderte Voreinstellungen laden nichts neu.
- **Code:** die Reste der entfernten Update-Funktion (`http_limit.py`), die ungenutzte Kartenansicht der Sensortabelle und 61 ungenutzte Texte des Panels sind weg; die eigenen Werte pro Sensor werden einmal je Stand der Optionen ermittelt statt bei jedem Sensorereignis.
- **README:** neu geschrieben und neu gegliedert: warum man es nutzt, ein Schnellstart, ein Rundgang mit Bildschirmfotos, die Sicherheitsmechanismen mit Schaubild, die Grenzen und die Details in einem Abschnitt "Gut zu wissen", der sich auf Klick öffnet. Die Bilder entstehen aus dem Nachbau (`tests/panel/readme-shots.mjs`).
- **Tests:** eine systematische Sicherheits-Testreihe (jeder Befehl des Panels nur für Administratoren und nur für die eigene Anlage, Codes und Hashes verlassen den Server nie, Code-Sperre, Zustandsautomat, feindliche Sicherungen und Eingaben, Pfade ohne Anmeldung) und eine Mutationsprobe, die jede Schutzmassnahme ausbaut und verlangt, dass ein Test scheitert; beides läuft bei jedem Push.

## [0.39.0] - 2026-11-09

Sicherungen können einen Namen haben.

### Hinzugefügt

- **Name für eine Sicherung:** "Sichern" fragt nach einem Namen (freiwillig, zum Beispiel "vor dem Umbau"). Die Liste zeigt den Namen mit dem Datum darunter; ohne Namen steht das Datum.

### Behoben

- **Übersicht auf dem Handy:** Suche, Filter-Pillen und Tabellenkopf stehen ganz oben am Bildschirmrand, nur die Zeilen scrollen; die Kopfzeile mit Logo und Reitern und die beiden Kacheln scrollen zuerst weg. Suche und "Ansicht" teilen sich eine Zeile, die Filter-Pillen stehen in einer Zeile zum Wischen, die Auswahlfelder in einer Zeile. Der Titel "Sensoren 19 von 19" entfällt dort (die Pille "Alle" zeigt die Anzahl).
- **Übersicht auf dem Handy:** Der Umschalter Liste/Karten steht nur noch unter "Ansicht" (er brauchte zu viel Platz in der Werkzeugleiste); am Computer bleibt er an beiden Orten.
- **Protokoll:** Die Filter-Pillen der Ereignisse gleiten unter den festen Zeitraum und bleiben dort stehen, während die Liste scrolt.
- **Alarmaktionen hängen nie:** Ein Gerät, das nicht innerhalb von 10 Sekunden antwortet (vorher: 15), hält den Ablauf nicht mehr auf; er geht mit dem nächsten Schritt weiter, und die Zeitachse des Alarms zeigt "Keine Antwort innerhalb von 10 s, der Ablauf ging weiter". Der hängende Aufruf wird nicht abgebrochen (ein Skript darf fertig werden), aber nicht mehr abgewartet, und Deaktivieren beendet ihn, auch wenn er den Abbruch ignoriert. Der Sonos-Schnappschuss vor dem ersten Schritt verzögert den Alarm höchstens um 3 Sekunden. Auch eine fehlschlagende Aktion steht auf der Zeitachse. Deaktivieren, während der Ablauf startet, hinterlässt keinen halb gestarteten Ablauf mehr. Meldungen an die Handys warten ebenfalls höchstens 15 Sekunden.
- **Alarmablauf auf dem Handy:** Die gestrichelte Linie und die Linie zu "Alarm endet" liegen jetzt genau unter der Mitte der Plus-Knöpfe (sie lagen 3 px zu weit rechts).

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

[1.25.1]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.25.1
[1.25.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.25.0
[1.23.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.23.0
[1.20.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.20.0
[1.19.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.19.0
[1.18.1]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.18.1
[1.18.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.18.0
[1.17.12]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.17.12
[1.17.11]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.17.11
[1.17.10]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.17.10
[1.17.9]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.17.9
[1.17.8]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.17.8
[1.17.7]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.17.7
[1.17.6]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.17.6
[1.17.5]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.17.5
[1.17.4]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.17.4
[1.17.3]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.17.3
[1.17.2]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.17.2
[1.17.1]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.17.1
[1.17.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.17.0
[1.16.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.16.0
[1.15.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.15.0
[1.14.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.14.0
[1.13.3]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.13.3
[1.13.2]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.13.2
[1.13.1]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.13.1
[1.13.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.13.0
[1.12.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.12.0
[1.11.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.11.0
[1.10.2]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.10.2
[1.10.1]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.10.1
[1.10.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.10.0
[1.9.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.9.0
[1.8.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.8.0
[1.7.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.7.0
[1.6.5]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.6.5
[1.6.4]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.6.4
[1.6.3]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.6.3
[1.6.2]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.6.2
[1.6.1]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.6.1
[1.6.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.6.0
[1.5.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.5.0
[1.3.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.3.0
[1.0.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v1.0.0
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
