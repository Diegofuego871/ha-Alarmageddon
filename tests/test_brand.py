"""Brand-Bilder: Grössen wie in ha-device-panel, mit Alphakanal."""

from __future__ import annotations

from pathlib import Path
import struct

import pytest

BRAND = Path(__file__).resolve().parents[1] / "custom_components" / "alarmageddon" / "brand"


def _png_header(path: Path) -> tuple[int, int, int]:
    """Breite, Höhe und Farbtyp aus dem IHDR-Block (6 = RGBA)."""
    data = path.read_bytes()[:26]
    assert data[:8] == b"\x89PNG\r\n\x1a\n", f"{path.name} ist kein PNG"
    width, height = struct.unpack(">II", data[16:24])
    return width, height, data[25]


@pytest.mark.parametrize(
    ("name", "size"),
    [("icon.png", (256, 256)), ("icon@2x.png", (512, 512)), ("logo.png", (256, 295)), ("logo@2x.png", (512, 590))],
)
def test_brand_images(name: str, size: tuple[int, int]) -> None:
    width, height, color_type = _png_header(BRAND / name)
    assert (width, height) == size
    assert color_type == 6
