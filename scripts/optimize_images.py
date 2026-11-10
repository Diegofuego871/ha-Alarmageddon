"""
Bilder der README verkleinern: PNG aus tests/panel/readme-shots.mjs auf eine Palette mit 256 Farben (Bildschirmfotos einer
Oberfläche haben wenige Farben; die Dateien werden so um ein Mehrfaches kleiner, ohne sichtbaren Verlust).

Aufruf im Wurzelverzeichnis: `python scripts/optimize_images.py` (braucht Pillow).
"""

from __future__ import annotations

import pathlib

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1] / "docs" / "img"


def main() -> None:
    for path in sorted(ROOT.glob("*.png")):
        before = path.stat().st_size
        image = Image.open(path).convert("RGB")
        image.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(path, optimize=True)
        print(f"{path.name}: {before // 1024} kB -> {path.stat().st_size // 1024} kB")


if __name__ == "__main__":
    main()
