# Mockups Easter Egg "Dreifachklick aufs Logo" (2026-11-12)

Dreimal aufs Logo oben links tippen: das Logo zoomt aus seiner Lage in die Mitte und wird zum Pop-up mit animiertem Logo,
Version und Link zum Repository. Die Systemeinstellung "Bewegung reduzieren" wird bewusst ignoriert (Vorgabe des Nutzers).
Bilder sind Standbilder; die echte Bewegung zeigt `src/anim.html` (im Browser öffnen, Variante mit `?v=A` oder `?v=B`,
dreimal aufs Logo klicken). Erfundene Daten.

| Bild | Inhalt |
| --- | --- |
| `1-variante-A.png` | **A:** Schild dreht sich um die senkrechte Achse, ein Lichtkegel kreist wie bei einer Sirenenleuchte, das A pulsiert |
| `2-variante-B.png` | **B:** Schild steht (schwebt leicht), das A ist die Lampe, zwei Lichtkegel kreisen, roter Blitz im Hintergrund |

Von links: Ausgangslage, Zoom (nach 180 ms), Pop-up (700 ms), zwei Zeitpunkte der Drehung.

Neu rendern: `node docs/mockups/easteregg-v1/src/shots.mjs && node docs/mockups/easteregg-v1/src/sheet.mjs`
