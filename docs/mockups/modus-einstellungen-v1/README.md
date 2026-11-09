# Mockups: Einstellungen pro Modus, vereinfacht (2026-11-09)

Entwurf nach der Rückmeldung zu 0.32.0 ("zu verschachtelt und zu verstreut"). Erfundene Daten, Desktop 1600 px, Handy 390 × 844.
**Noch kein Entscheid des Nutzers.**

## Idee

- **Schalter aus:** alles wie vor 0.32.0. Eine Tabelle, Zonen je Modus als Spalten, "Immer aktiv", Eingangsverzögerung; die Optionen im Seitenblatt.
- **Schalter ein:** Die Reiterleiste erscheint (es gibt keinen Reiter "Alle Modi") und der erste Modus ist gewählt.
  - In **jedem** Reiter stehen **alle Sensoren** und **alle drei Zonen-Spalten**, so sieht man sofort, in welchen Modi ein Sensor aktiv ist.
  - Die Spalte des gewählten Modus ist hervorgehoben, daneben stehen **alle Optionen** als Kästchen. Sie gelten nur für diesen Modus.
  - Die Zonen setzt man wie bisher in jeder Spalte, die Optionen nur im gewählten Reiter.
  - Handy: eine Karte je Sensor, darauf die drei Modus-Knöpfe (der gewählte umrandet) und darunter die Optionen des gewählten Modus.
- Beim Einschalten übernimmt jeder Modus die bisherigen Werte; abweichende Werte entstehen erst, wenn man sie in einem Reiter ändert.

| Bild | Inhalt |
| --- | --- |
| `1a-schalter-aus-desktop.png` | Schalter aus (Desktop) |
| `1b-schalter-aus-handy.png` | Schalter aus (Handy) |
| `2a-schalter-ein-abwesend-desktop.png` | Schalter ein, Reiter "Abwesend" |
| `2b-schalter-ein-nacht-desktop.png` | Schalter ein, Reiter "Nacht" (gleiche Tabelle, andere Hervorhebung und Optionen) |
| `2c-schalter-ein-handy.png` | Schalter ein (Handy), Reiter "Anwesend", grössere Abstände unter dem Schalter |

Quelle: `src/mock.mjs`, gerendert mit `node src/render.mjs`.
