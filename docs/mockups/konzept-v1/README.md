# Mockups Konzept, Version 1 (2026-11-08)

Erster Entwurf des ganzen Panels, mit erfundenen Daten. Bedienbar in
`konzept.html` (im Browser öffnen). Noch kein Entscheid des Nutzers; die
Ansichten im HA-Design (`docs/DESIGN.md`) folgen pro Thema mit Varianten.

| Bild | Inhalt |
| --- | --- |
| `0-einschaetzung.png` | Einschätzung, Änderungsvorschläge, Risiken, offene Fragen |
| `1-sensorgruppen.png` | Zonen "Anwesend" und "Abwesend" per Drag and Drop |
| `2-wartung.png` | Wartungsübersicht in Kacheln nach Bereich |
| `3-szenarien.png` | Szenario-Editor mit Zeitachse und Gegenaktionen |
| `4-ueberwachung.png` | Einstellungen zur Überwachung (nach Device Panel) |
| `5-push-stopp.png` | Kritische Push-Meldungen und Ablauf beim Deaktivieren |
| `6-technik-plan.png` | Aufbau, Datenmodell, Umsetzungsplan |
| `*-handy.png` | Handy (390 × 844) |
| `2-wartung-dunkel.png` | Dunkles Design |

Neu rendern (nutzt das vorinstallierte Playwright, eigener Browser über
`CHROMIUM_PATH`):

```bash
cd docs/mockups/konzept-v1/src
node render.mjs
```
