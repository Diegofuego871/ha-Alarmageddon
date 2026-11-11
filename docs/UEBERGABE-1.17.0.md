# Übergabe 1.17.0 (2026-11-11): Töne am Stück statt abgehackt

Auftrag des Nutzers an die externe Prüfstelle. Basis ist **1.16.0** (Übergabe `alarmageddon-1.16.0.zip`); `main` stand bei der
Arbeit noch auf `134f1d0` (Version 1.13.3). Zuerst lesen, dann `docs/HANDOVER.md` (Abschnitt 1.17.0) und `CLAUDE.md`.

## 0. Inhalt der Übergabe und Anwenden

Das ZIP `alarmageddon-1.17.0.zip` ersetzt die von 1.14.0 bis 1.16.0. Es enthält dieses Protokoll, `RELEASE-NOTES-1.17.0.md`
(Englisch und Deutsch, für 1.17.0 bis 1.14.0), zwei Patches und unter `files/` jede gegenüber `134f1d0` geänderte oder neue
Datei vollständig.

- **`main` steht auf `134f1d0` (1.13.3):** `git apply --index 1.17.0-auf-1.13.3.patch` (enthält 1.14.0 bis 1.17.0), oder `files/`
  über das Repository kopieren (nichts ist zu löschen).
- **1.16.0 ist schon auf `main`:** `git apply --index 1.17.0-auf-1.16.0.patch`.

Danach die Prüfungen aus `CLAUDE.md`, Commit, Push, Tag und Titel `v1.17.0` (und die Tags davor, falls getrennt).

**Auffällig am Stand auf GitHub:** Der Commit `134f1d0` trägt die Version 1.13.3, aber nur den Tag `v1.13.0`. Für HACS zählt
der Tag: bitte prüfen, ob `v1.13.3` (und ein Release dazu) fehlt.

## 1. Meldung des Nutzers (2026-11-11) und Umsetzung

> Die Töne sollen beim Wiederholen sauber klingen, nicht abgehackt, als wäre die Mediendatei zu kurz. Ein Ton soll ohne Ton
> aufhören und ohne Ton wieder anfangen. Das betrifft alle Töne, auch die neuen.

| Befund | Umsetzung |
| --- | --- |
| Der Ablauf startete die kurze Datei (1 bis 4 s) alle paar Sekunden neu; jeder Neustart schneidet auf dem Lautsprecher den Ton ab | Eine Datei für die ganze Dauer (`sound_loop.py`), ein Start je Ton |
| Töne setzten hart ein und brachen hart ab | 30 ms ein-, 60 ms ausgeblendet |
| Durchgehende Töne waren je Wiederholung am Rand geblendet (Einbruch an der Naht) | Sirene, Zweiton, Jaulton als nahtlose Schleife neu berechnet |

## 2. Dateien (gegenüber 1.16.0)

- Neu: `custom_components/alarmageddon/sound_loop.py`, `tests/test_sound_loop.py`, `docs/UEBERGABE-1.17.0.md`.
- Geändert: `workflow.py`, `panel.py` (Anmeldung der Adresse), `manifest.json` (1.17.0), `sounds/siren.wav`, `hilo.wav`,
  `yelp.wav`, `scripts/make_sounds.py`, `scripts/mutation_check.py`, `tests/test_actions.py`, `tests/test_tones.py`,
  `README.md`, `README.de.md`, `CHANGELOG.md`, `CHANGELOG.de.md`, `docs/HANDOVER.md`.
- Das Panel ist unverändert (PANEL_VERSION bleibt 97); die Bildschirmfotos der README bleiben gültig.

## 3. Prüfungen und Grenzen

Die Zahlen des letzten Laufs stehen in der Antwort an den Nutzer. Geprüft ist die Form der Dateien (Länge, Blenden,
Nahtstellen, Rhythmus) und die Adresse (ohne Anmeldung, nur bekannte Töne, begrenzte Länge).

**Nicht geprüft, wichtig:** echte Lautsprecher. Die Töne kommen jetzt über eine neue Adresse, die die Datei bei der Abfrage
zusammensetzt. Das ist derselbe Weg wie bei der Sprachausgabe von Home Assistant, aber auf den Geräten des Nutzers nicht
erprobt. **Vor dem Verlass darauf jeden Tonschritt einmal mit "Testen" auf den echten Lautsprechern abspielen.** Bleibt ein
Lautsprecher stumm, ist das der erste Verdacht; die alte Adresse der Tondateien gibt es weiterhin.

## 4. Hinweise für die nächste Session

- **Speicher:** Ein Stück von 3 Minuten sind rund 8 MB je Abfrage; bis zu vier Fassungen bleiben im Zwischenspeicher.
- **Verzögerung beim Start** eines Lautsprechers bleibt (einmal je Ton statt bei jeder Wiederholung).
- **Stoppen** schneidet weiterhin hart ab (Deaktivieren soll sofort wirken).
