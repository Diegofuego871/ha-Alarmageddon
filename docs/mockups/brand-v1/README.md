# Mockups Logo und Icon, Version 1 (2026-11-08)

Vorschläge für Icon und Logo (Wunsch des Nutzers: zum Beispiel eine
Polizei-Katze). Jedes Blatt zeigt das Icon gross, in den Grössen, in denen HA
es zeigt (64, 48, 32, 24 px), als Zeile in der Integrationsliste und als Logo
mit Schriftzug, je hell und dunkel. **Noch kein Entscheid des Nutzers.**

| Bild | Inhalt |
| --- | --- |
| `0-vergleich.png` | Alle Varianten nebeneinander, hell und dunkel |
| `1-variante-A-polizeikatze.png` | **A:** orange Katze mit Polizeimütze und goldenem Stern |
| `2-variante-B-schildkatze.png` | **B:** blaues Schild, dessen Ecken Katzenohren sind, mit gelben Augen |
| `3-variante-C-blaulichtkatze.png` | **C:** Katzenkopf als Linie mit Blaulicht (Linienstil wie Device Panel) |
| `4-variante-E-schild-mit-ohren.png` | **E:** Schild als Linie, oben ragen Katzenohren heraus, wachsame Augen |
| `5-variante-D-schild-a.png` | **D:** heutiger Platzhalter (Schild mit A) zum Vergleich |

**Empfehlung: A.** Am meisten Charakter, in der Liste der Integrationen
sofort wiederzuerkennen und auch bei 24 px durch die Farben (Orange, Mütze in
Dunkelblau) eindeutig. Wer es ruhiger und näher an Device Panel möchte: E.

Nach dem Entscheid: Feinschliff des Icons, daraus `brand/icon.png`,
`icon@2x.png`, `logo.png`, `logo@2x.png` (Test der Masse) und ein eigenes
Bild für Push-Meldungen mit rund 20 % Rand (LEARNINGS).

Neu rendern:

```bash
cd docs/mockups/brand-v1/src
node render.mjs
```
