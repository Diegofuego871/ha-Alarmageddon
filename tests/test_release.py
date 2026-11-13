"""Release: Zur Version in manifest.json gibt es Release Notes in beiden CHANGELOG-Dateien."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
REPO = "https://github.com/Diegofuego871/ha-alarmageddon"


def _section_module():
    spec = importlib.util.spec_from_file_location("changelog_section", ROOT / ".github" / "scripts" / "changelog_section.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _version() -> str:
    return json.loads((ROOT / "custom_components" / "alarmageddon" / "manifest.json").read_text(encoding="utf-8"))["version"]


@pytest.mark.parametrize("name", ["CHANGELOG.md", "CHANGELOG.de.md"])
def test_changelog_has_current_version(name: str) -> None:
    """Ohne Abschnitt zur aktuellen Version gibt es keine Release Notes (Englisch und Deutsch)."""
    text = (ROOT / name).read_text(encoding="utf-8")
    version = _version()
    assert _section_module().section(text, version), f"kein Abschnitt für {version} in {name}"
    assert f"[{version}]: {REPO}/releases/tag/v{version}" in text, f"Link-Fussnote fehlt in {name}"


def test_section_stops_at_next_version_and_links() -> None:
    text = "# Changelog\n\n## [1.1.0] - x\n\n- neu\n\n## [1.0.0] - y\n\n- alt\n\n[1.1.0]: a\n[1.0.0]: b\n"
    section = _section_module().section
    assert section(text, "1.1.0") == "- neu"
    assert section(text, "1.0.0") == "- alt"
    assert section(text, "1.0") == ""


def test_hacs_and_manifest() -> None:
    """Pflichtfelder für HACS und hassfest."""
    manifest = json.loads((ROOT / "custom_components" / "alarmageddon" / "manifest.json").read_text(encoding="utf-8"))
    for key in ("domain", "name", "version", "documentation", "issue_tracker", "codeowners", "config_flow", "iot_class", "integration_type"):
        assert key in manifest, key
    assert manifest["documentation"] == REPO
    assert "single_config_entry" not in manifest  # mehrere Anlagen pro HA
    hacs = json.loads((ROOT / "hacs.json").read_text(encoding="utf-8"))
    assert hacs["name"] == "Alarmageddon" and hacs["homeassistant"]
