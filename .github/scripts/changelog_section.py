"""Gibt den Abschnitt einer Version aus dem CHANGELOG aus (Release Notes).

Aufruf:
    python3 .github/scripts/changelog_section.py 0.1.0      # Englisch, CHANGELOG.md
    python3 .github/scripts/changelog_section.py 0.1.0 de   # Deutsch, CHANGELOG.de.md

Übernommen aus ha-device-panel. Die Release Notes sind in Alarmageddon
zweisprachig (siehe CLAUDE.md, "Git und Releases"), darum die Option "de".
Endet mit Fehler, wenn die Version fehlt oder ihr Abschnitt leer ist.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FILES = {"en": ROOT / "CHANGELOG.md", "de": ROOT / "CHANGELOG.de.md"}


def section(text: str, version: str) -> str:
    lines: list[str] = []
    inside = False
    for line in text.splitlines():
        if line.startswith("## ["):
            if inside:
                break
            inside = line.startswith(f"## [{version}]")
            continue
        # Link-Fussnoten am Ende gehören zu keinem Abschnitt.
        if inside and line.startswith("[") and "]: " in line:
            break
        if inside:
            lines.append(line)
    return "\n".join(lines).strip()


def main() -> int:
    if len(sys.argv) not in (2, 3) or (len(sys.argv) == 3 and sys.argv[2] not in FILES):
        print("Aufruf: changelog_section.py <version> [de]", file=sys.stderr)
        return 2
    path = FILES[sys.argv[2] if len(sys.argv) == 3 else "en"]
    notes = section(path.read_text(encoding="utf-8"), sys.argv[1])
    if not notes:
        print(f"Kein Abschnitt für {sys.argv[1]} in {path.name}", file=sys.stderr)
        return 1
    print(notes)
    return 0


if __name__ == "__main__":
    sys.exit(main())
