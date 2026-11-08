"""Texte: Englisch und Deutsch vollständig, Schweizer Schreibweise (kein Eszett), README und CHANGELOG zweisprachig."""

from __future__ import annotations

import json
from pathlib import Path
import re
import shutil
import subprocess

import pytest

INTEGRATION = Path(__file__).resolve().parents[1] / "custom_components" / "alarmageddon"
ROOT = INTEGRATION.parents[1]


def _keys(data: dict, prefix: str = "") -> set[str]:
    out: set[str] = set()
    for key, value in data.items():
        if isinstance(value, dict):
            out |= _keys(value, f"{prefix}{key}.")
        else:
            out.add(f"{prefix}{key}")
    return out


def _load(name: str) -> dict:
    return json.loads((INTEGRATION / name).read_text(encoding="utf-8"))


def test_strings_json_equals_english() -> None:
    assert _load("strings.json") == _load("translations/en.json")


def test_german_and_english_have_same_keys() -> None:
    en = _keys(_load("translations/en.json"))
    de = _keys(_load("translations/de.json"))
    assert en - de == set(), f"fehlt auf Deutsch: {sorted(en - de)}"
    assert de - en == set(), f"fehlt auf Englisch: {sorted(de - en)}"


def test_placeholders_match() -> None:
    en, de = _load("translations/en.json"), _load("translations/de.json")

    def flat(data: dict, prefix: str = "") -> dict[str, str]:
        out: dict[str, str] = {}
        for key, value in data.items():
            if isinstance(value, dict):
                out |= flat(value, f"{prefix}{key}.")
            else:
                out[f"{prefix}{key}"] = value
        return out

    fe, fd = flat(en), flat(de)
    for key, text in fe.items():
        assert set(re.findall(r"\{(\w+)\}", text)) == set(re.findall(r"\{(\w+)\}", fd[key])), key


def test_every_option_and_error_is_translated() -> None:
    """Jede Fehlermeldung aus Code und Flow steht in den Texten."""
    strings = _load("strings.json")
    code = "".join(p.read_text(encoding="utf-8") for p in INTEGRATION.glob("*.py"))
    for key in re.findall(r'_error\("(\w+)"', code):
        assert key in strings["exceptions"], key
    for key in re.findall(r'errors\[[^\]]+\] = "(\w+)"', code):
        assert key in strings["config"]["error"] or key in strings["options"]["error"], key


def test_no_sharp_s() -> None:
    files = [*INTEGRATION.glob("*.py"), *INTEGRATION.glob("translations/*.json"), INTEGRATION / "strings.json", *INTEGRATION.glob("panel/*")]
    files += [ROOT / name for name in ("README.md", "README.de.md", "CHANGELOG.md", "CHANGELOG.de.md")]
    offenders = [str(f.relative_to(ROOT)) for f in files if "ß" in f.read_text(encoding="utf-8")]
    assert not offenders, f"Eszett statt ss in: {offenders}"


def _structure(path: Path) -> list[str]:
    """
    Aufbau einer Markdown-Datei ohne den Wortlaut: Überschriften-Ebenen,
    Listenpunkte, Zitate, Codeblöcke. Versionsüberschriften und
    Link-Fussnoten im CHANGELOG müssen wörtlich gleich sein.
    """
    out: list[str] = []
    in_code = False
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("```"):
            in_code = not in_code
            out.append("code")
        elif in_code:
            continue
        elif line.startswith("## ["):
            out.append(line)
        elif match := re.match(r"(#+) ", line):
            out.append(match.group(1))
        elif re.match(r"(-|\d+\.) ", line):
            out.append("item")
        elif line.startswith(">"):
            out.append("quote")
        elif re.match(r"\[[^\]]+\]: ", line):
            out.append(line)
    return out


@pytest.mark.parametrize(("en", "de"), [("README.md", "README.de.md"), ("CHANGELOG.md", "CHANGELOG.de.md")])
def test_docs_bilingual(en: str, de: str) -> None:
    """README und CHANGELOG gibt es in beiden Sprachen, gleich aufgebaut und gegenseitig verlinkt."""
    assert _structure(ROOT / en) == _structure(ROOT / de)
    assert re.search(rf"\]\((\S*/)?{re.escape(de)}\)", (ROOT / en).read_text(encoding="utf-8"))
    assert re.search(rf"\]\((\S*/)?{re.escape(en)}\)", (ROOT / de).read_text(encoding="utf-8"))


@pytest.mark.skipif(shutil.which("node") is None, reason="Node.js fehlt")
def test_panel_strings_complete() -> None:
    """Panel-Texte: Englisch und Deutsch mit denselben Schlüsseln und denselben Platzhaltern."""
    script = (
        "import(process.argv[1]).then(({ STRINGS }) => {"
        " const ph = (s) => [...s.matchAll(/\\{(\\w+)\\}/g)].map((m) => m[1]).sort().join();"
        " const de = STRINGS.de, en = STRINGS.en;"
        " const onlyDe = Object.keys(de).filter((k) => !(k in en)), onlyEn = Object.keys(en).filter((k) => !(k in de));"
        " const ph_diff = Object.keys(en).filter((k) => k in de && ph(en[k]) !== ph(de[k]));"
        " console.log(JSON.stringify({ onlyDe, onlyEn, ph_diff }));"
        "})"
    )
    result = subprocess.run(
        ["node", "-e", script, (INTEGRATION / "panel" / "strings.js").as_uri()], capture_output=True, text=True, check=True
    )
    assert json.loads(result.stdout) == {"onlyDe": [], "onlyEn": [], "ph_diff": []}


@pytest.mark.skipif(shutil.which("node") is None, reason="Node.js fehlt")
def test_panel_language_selection() -> None:
    """Deutsch für de und de-*, sonst Englisch (Vorgabe des Nutzers)."""
    cases = {"de": "de", "de-CH": "de", "DE-at": "de", "en": "en", "en-GB": "en", "fr": "en", "dev": "en", "": "en"}
    script = (
        "import(process.argv[1]).then(({ pickLang }) => {"
        " const cases = JSON.parse(process.argv[2]); const out = {};"
        " for (const lang of Object.keys(cases)) out[lang] = [pickLang({ locale: { language: lang } }), pickLang({ language: lang })];"
        " out.none = [pickLang(null), pickLang({})];"
        " console.log(JSON.stringify(out));"
        "})"
    )
    result = subprocess.run(
        ["node", "-e", script, (INTEGRATION / "panel" / "strings.js").as_uri(), json.dumps(cases)],
        capture_output=True, text=True, check=True,
    )
    expected = {lang: [want, want] for lang, want in cases.items()} | {"none": ["en", "en"]}
    assert json.loads(result.stdout) == expected


def test_panel_uses_only_known_strings() -> None:
    """Jeder Schlüssel, den das Panel mit _t(...) nutzt, steht in strings.js."""
    js = "".join(p.read_text(encoding="utf-8") for p in (INTEGRATION / "panel").glob("*.js") if p.name != "strings.js")
    strings = (INTEGRATION / "panel" / "strings.js").read_text(encoding="utf-8")
    used = set(re.findall(r'_t\("(\w+)"', js)) | set(re.findall(r'"((?:mode|state|dc|filter|opt|type|col|sort|group|sys|warn)[A-Z]\w*)"', js))
    missing = sorted(k for k in used if f"    {k}:" not in strings)
    assert not missing, missing
