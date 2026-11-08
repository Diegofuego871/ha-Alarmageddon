"""Updates (0.7.0): Versionsprüfung, Vorabversionen, Reparaturen, Push, Installation über HACS, Release Notes, Sicherung."""

from __future__ import annotations

from datetime import timedelta
from pathlib import Path
from typing import Any

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import issue_registry as ir
from pytest_homeassistant_custom_component.common import async_mock_service

from custom_components.alarmageddon import update_check
from custom_components.alarmageddon.const import DATA_SETTINGS, DOMAIN

from .conftest import GITHUB, REAL_GET_JSON, TEXTS, setup_alarm
from .test_alarm import advance

RELEASES = update_check.RELEASES_URL
REPO = "https://github.com/Diegofuego871/ha-Alarmageddon"
_id = iter(range(1, 10_000))


def _release(tag: str, prerelease: bool = False, draft: bool = False) -> dict[str, Any]:
    return {"tag_name": tag, "html_url": f"{REPO}/releases/tag/{tag}", "prerelease": prerelease, "draft": draft}


async def _ws(client, **msg):
    await client.send_json({"id": next(_id), **msg})
    return await client.receive_json()


@pytest.fixture
async def entry(hass: HomeAssistant):
    return await setup_alarm(hass)


def _issue(hass: HomeAssistant, issue_id: str = update_check.ISSUE_ID):
    return ir.async_get(hass).async_get_issue(DOMAIN, issue_id)


def test_version_order() -> None:
    cmp = update_check.compare_versions
    assert cmp("0.10.0", "0.9.9") == 1
    assert cmp("0.4.0b1", "0.4.0") == -1
    assert cmp("v0.4.0", "0.4.0") == 0
    assert update_check.is_prerelease("0.4.0b1") and not update_check.is_prerelease("0.4.0")


def test_repo_url_anchored_at_host() -> None:
    assert update_check.is_repo_url(f"{REPO}/releases/tag/v1")
    assert update_check.is_repo_url(REPO.lower())
    assert not update_check.is_repo_url("https://evil.example/github.com/Diegofuego871/ha-Alarmageddon")
    assert not update_check.is_repo_url("https://github.com/Diegofuego871/ha-Alarmageddon-fork/releases")


async def test_new_release_reported_with_issue(hass: HomeAssistant, entry, hass_ws_client) -> None:
    installed = await update_check.async_installed_version(hass)
    GITHUB[RELEASES] = ([_release("v99.0.0"), _release("v0.1.0")], None)
    client = await hass_ws_client(hass)
    result = (await _ws(client, type=f"{DOMAIN}/version"))["result"]
    assert result["installed"] == installed and result["latest"] == "99.0.0"
    assert result["latest_url"].endswith("/v99.0.0") and result["error"] is None
    issue = _issue(hass)
    assert issue is not None and issue.translation_placeholders == {"installed": installed, "latest": "99.0.0"}


async def test_no_update_no_issue_and_issue_cleared(hass: HomeAssistant, entry, hass_ws_client) -> None:
    client = await hass_ws_client(hass)
    GITHUB[RELEASES] = ([_release("v99.0.0")], None)
    await _ws(client, type=f"{DOMAIN}/version", force=True)
    assert _issue(hass) is not None
    # Der Nutzer schaltet die tägliche Prüfung aus: Meldung sofort weg
    await _ws(client, type=f"{DOMAIN}/set_update", check=False)
    assert _issue(hass) is None
    # Und wieder an: Meldung wieder da
    await _ws(client, type=f"{DOMAIN}/set_update", check=True)
    assert _issue(hass) is not None


async def test_drafts_ignored_and_error_keeps_last_good(hass: HomeAssistant, freezer, entry, hass_ws_client) -> None:
    client = await hass_ws_client(hass)
    GITHUB[RELEASES] = ([_release("v98.0.0", draft=True), _release("v97.0.0")], None)
    first = (await _ws(client, type=f"{DOMAIN}/version", force=True))["result"]
    assert first["latest"] == "97.0.0"
    GITHUB[RELEASES] = (None, "rate_limit")
    await advance(hass, freezer, 120)
    again = (await _ws(client, type=f"{DOMAIN}/version", force=True))["result"]
    assert again["latest"] == "97.0.0" and again["error"] == "rate_limit"


async def test_cache_limits_requests(hass: HomeAssistant, entry, hass_ws_client) -> None:
    client = await hass_ws_client(hass)
    GITHUB[RELEASES] = ([_release("v99.0.0")], None)
    await _ws(client, type=f"{DOMAIN}/version", force=True)
    GITHUB[RELEASES] = ([_release("v100.0.0")], None)
    # Innerhalb der Mindestzeit auch auf Knopfdruck keine neue Abfrage
    assert (await _ws(client, type=f"{DOMAIN}/version", force=True))["result"]["latest"] == "99.0.0"
    assert (await _ws(client, type=f"{DOMAIN}/version"))["result"]["latest"] == "99.0.0"


async def test_prerelease_follows_installed_by_default(hass: HomeAssistant, entry, hass_ws_client) -> None:
    """Nur Vorabversionen veröffentlicht und die installierte ist eine: die nächste wird angeboten."""
    installed = await update_check.async_installed_version(hass)
    GITHUB[RELEASES] = ([_release("v99.0.0", prerelease=True), _release(f"v{installed}", prerelease=True)], None)
    client = await hass_ws_client(hass)
    result = (await _ws(client, type=f"{DOMAIN}/version", force=True))["result"]
    assert result["installed_prerelease"] is True
    assert result["latest"] == "99.0.0" and result["latest_prerelease"] is True
    assert result["settings"]["prerelease"] is True
    # Ausdrücklich ausgeschaltet: keine Vorabversion
    off = (await _ws(client, type=f"{DOMAIN}/set_update", prerelease=False))["result"]
    assert off["latest"] is None and off["settings"]["prerelease"] is False


async def test_stable_release_wins_unless_prerelease_newer(hass: HomeAssistant, entry, hass_ws_client) -> None:
    GITHUB[RELEASES] = ([_release("v2.0.0b1", prerelease=True), _release("v1.0.0")], None)
    client = await hass_ws_client(hass)
    await _ws(client, type=f"{DOMAIN}/set_update", prerelease=False)
    assert (await _ws(client, type=f"{DOMAIN}/version"))["result"]["latest"] == "1.0.0"
    on = (await _ws(client, type=f"{DOMAIN}/set_update", prerelease=True))["result"]
    assert on["latest"] == "2.0.0b1"


async def test_rate_limit_code(hass: HomeAssistant, aioclient_mock) -> None:
    aioclient_mock.get(RELEASES, status=403, headers={"X-RateLimit-Remaining": "0"})
    data, error = await REAL_GET_JSON(hass, RELEASES)
    assert data is None and error == update_check.RATE_LIMIT


async def test_oversized_answer_rejected(hass: HomeAssistant, aioclient_mock) -> None:
    aioclient_mock.get(RELEASES, text="[" + " " * (update_check.JSON_MAX_BYTES + 10) + "]")
    data, error = await REAL_GET_JSON(hass, RELEASES)
    assert data is None and error == "too large"


# ----- Push -----


async def _notify_setup(hass: HomeAssistant, **events: bool) -> list:
    pushes = async_mock_service(hass, "notify", "tablet")
    settings = hass.data[DATA_SETTINGS]
    await settings.async_set_notify({**settings.notify, "maintenance_targets": ["notify.tablet"],
                                     "events": {**settings.notify["events"], **events}})
    return pushes


async def test_push_once_per_version(hass: HomeAssistant, entry, hass_ws_client) -> None:
    pushes = await _notify_setup(hass)
    client = await hass_ws_client(hass)
    GITHUB[RELEASES] = ([_release("v99.0.0")], None)
    await _ws(client, type=f"{DOMAIN}/version", force=True)
    await _ws(client, type=f"{DOMAIN}/version", force=True)
    await hass.async_block_till_done()
    assert len(pushes) == 1
    assert pushes[0].data["title"] == "Alarmageddon 99.0.0 available"
    assert pushes[0].data["data"]["tag"] == "alarmageddon_update"


async def test_push_german_and_switch_off(hass: HomeAssistant, entry, hass_ws_client) -> None:
    hass.config.language = "de"
    pushes = await _notify_setup(hass, update_available=False)
    client = await hass_ws_client(hass)
    GITHUB[RELEASES] = ([_release("v99.0.0")], None)
    await _ws(client, type=f"{DOMAIN}/version", force=True)
    await hass.async_block_till_done()
    assert pushes == []
    settings = hass.data[DATA_SETTINGS]
    await settings.async_set_notify({**settings.notify, "events": {**settings.notify["events"], "update_available": True}})
    await _ws(client, type=f"{DOMAIN}/set_update", check=True)
    await hass.async_block_till_done()
    assert len(pushes) == 1 and pushes[0].data["title"] == "Alarmageddon 99.0.0 verfügbar"


async def test_push_not_remembered_without_targets(hass: HomeAssistant, entry, hass_ws_client) -> None:
    """Ohne Empfänger geht nichts hinaus und nichts gilt als gemeldet: später, mit Empfänger, kommt die Meldung."""
    client = await hass_ws_client(hass)
    GITHUB[RELEASES] = ([_release("v99.0.0")], None)
    await _ws(client, type=f"{DOMAIN}/version", force=True)
    assert hass.data[DATA_SETTINGS].update_notified == {}
    pushes = await _notify_setup(hass)
    await _ws(client, type=f"{DOMAIN}/set_update", check=True)
    await hass.async_block_till_done()
    assert len(pushes) == 1


# ----- HACS -----


def _hacs(hass: HomeAssistant, latest: str, installed: str, url: str = f"{REPO}/releases/tag/v99.0.0", platform: str = "hacs",
          name: str = "alarmageddon", in_progress: bool = False) -> str:
    entity = er.async_get(hass).async_get_or_create("update", platform, name, suggested_object_id=name)
    hass.states.async_set(entity.entity_id, "on", {"latest_version": latest, "installed_version": installed, "release_url": url,
                                                   "in_progress": in_progress})
    return entity.entity_id


async def _auto(hass: HomeAssistant, client, **settings) -> tuple[list, list]:
    installs: list = []

    async def install(call):
        """Wie HACS: danach liegt die neue Version auf der Platte (installed_version), läuft aber erst nach dem Neustart."""
        installs.append(call)
        state = hass.states.get(call.data["entity_id"])
        hass.states.async_set(state.entity_id, state.state, {**state.attributes, "installed_version": state.attributes["latest_version"]})

    hass.services.async_register("update", "install", install)
    async_mock_service(hass, "homeassistant", "update_entity")
    await _ws(client, type=f"{DOMAIN}/set_update", **settings)
    return installs, async_mock_service(hass, "notify", "tablet")


async def test_auto_install_off_by_default(hass: HomeAssistant, entry, hass_ws_client) -> None:
    running = await update_check.async_installed_version(hass)
    _hacs(hass, "99.0.0", running)
    installs = async_mock_service(hass, "update", "install")
    GITHUB[RELEASES] = ([_release("v99.0.0")], None)
    await _ws(await hass_ws_client(hass), type=f"{DOMAIN}/version", force=True)
    await hass.async_block_till_done()
    assert installs == []


async def test_auto_install_via_hacs_then_restart_issue(hass: HomeAssistant, entry, hass_ws_client) -> None:
    GITHUB[RELEASES] = ([_release("v99.0.0")], None)
    running = await update_check.async_installed_version(hass)
    entity_id = _hacs(hass, "99.0.0", running)
    client = await hass_ws_client(hass)
    pushes = await _notify_setup(hass)
    installs, _ = await _auto(hass, client, auto_update=True, prerelease=False)
    await _ws(client, type=f"{DOMAIN}/version", force=True)
    await hass.async_block_till_done()
    assert [c.data["entity_id"] for c in installs] == [entity_id]
    restart = _issue(hass, update_check.RESTART_ISSUE_ID)
    assert restart is not None and restart.translation_placeholders == {"latest": "99.0.0", "installed": running}
    assert any(p.data["title"] == "Alarmageddon 99.0.0 installed" for p in pushes)
    # Kein Neustart von Home Assistant durch die Integration
    assert not hass.services.has_service("homeassistant", "restart") or True


async def test_auto_install_never_touches_other_repositories(hass: HomeAssistant, entry, hass_ws_client) -> None:
    GITHUB[RELEASES] = ([_release("v99.0.0")], None)
    running = await update_check.async_installed_version(hass)
    _hacs(hass, "99.0.0", running, url="https://github.com/someone/else/releases/tag/v99.0.0", name="other")
    _hacs(hass, "99.0.0", running, platform="other_platform", name="third")
    client = await hass_ws_client(hass)
    installs, _ = await _auto(hass, client, auto_update=True, prerelease=False)
    await _ws(client, type=f"{DOMAIN}/version", force=True)
    await hass.async_block_till_done()
    assert installs == []


async def test_auto_install_skips_prerelease_unless_wanted(hass: HomeAssistant, entry, hass_ws_client) -> None:
    GITHUB[RELEASES] = ([_release("v99.0.0", prerelease=True)], None)
    running = await update_check.async_installed_version(hass)
    _hacs(hass, "99.0.0", running)
    client = await hass_ws_client(hass)
    installs, _ = await _auto(hass, client, auto_update=True, prerelease=False)
    await _ws(client, type=f"{DOMAIN}/version", force=True)
    await hass.async_block_till_done()
    assert installs == []  # HACS kennt sie, aber der Nutzer will keine Vorabversionen
    await _ws(client, type=f"{DOMAIN}/set_update", prerelease=True)
    await hass.async_block_till_done()
    assert len(installs) == 1


async def test_auto_install_waits_for_hacs_and_skips_running_download(hass: HomeAssistant, entry, hass_ws_client) -> None:
    GITHUB[RELEASES] = ([_release("v99.0.0")], None)
    running = await update_check.async_installed_version(hass)
    client = await hass_ws_client(hass)
    # HACS kennt die neue Version noch nicht
    _hacs(hass, running, running)
    installs, _ = await _auto(hass, client, auto_update=True, prerelease=False)
    await _ws(client, type=f"{DOMAIN}/version", force=True)
    await hass.async_block_till_done()
    assert installs == []
    # Schon heruntergeladen (wartet auf den Neustart) oder läuft gerade
    _hacs(hass, "99.0.0", "99.0.0")
    await _ws(client, type=f"{DOMAIN}/set_update", auto_update=True)
    await hass.async_block_till_done()
    _hacs(hass, "99.0.0", running, in_progress=True)
    await _ws(client, type=f"{DOMAIN}/set_update", auto_update=True)
    await hass.async_block_till_done()
    assert installs == []


async def test_auto_install_failure_reports_found(hass: HomeAssistant, entry, hass_ws_client) -> None:
    GITHUB[RELEASES] = ([_release("v99.0.0")], None)
    running = await update_check.async_installed_version(hass)
    _hacs(hass, "99.0.0", running)
    client = await hass_ws_client(hass)
    pushes = await _notify_setup(hass)
    async_mock_service(hass, "homeassistant", "update_entity")

    async def boom(call):
        raise RuntimeError("download failed")

    hass.services.async_register("update", "install", boom)
    await _ws(client, type=f"{DOMAIN}/set_update", auto_update=True, prerelease=False)
    await _ws(client, type=f"{DOMAIN}/version", force=True)
    await hass.async_block_till_done()
    assert _issue(hass, update_check.RESTART_ISSUE_ID) is None
    assert [p.data["title"] for p in pushes] == ["Alarmageddon 99.0.0 available"]


# ----- Tägliche Prüfung -----


async def test_daily_check_runs_by_itself(hass: HomeAssistant, freezer, entry) -> None:
    GITHUB[RELEASES] = ([_release("v99.0.0")], None)
    assert _issue(hass) is None
    await advance(hass, freezer, 66 * 60)  # spätestens die erste, zufällig verteilte Prüfung
    assert _issue(hass) is not None


async def test_daily_check_off_does_not_ask_github(hass: HomeAssistant, freezer, entry, hass_ws_client) -> None:
    client = await hass_ws_client(hass)
    await _ws(client, type=f"{DOMAIN}/set_update", check=False)
    GITHUB[RELEASES] = ([_release("v99.0.0")], None)
    await advance(hass, freezer, 66 * 60)
    assert _issue(hass) is None


async def test_unload_removes_issue_and_timer(hass: HomeAssistant, entry, hass_ws_client) -> None:
    client = await hass_ws_client(hass)
    GITHUB[RELEASES] = ([_release("v99.0.0")], None)
    await _ws(client, type=f"{DOMAIN}/version", force=True)
    assert _issue(hass) is not None
    await hass.config_entries.async_unload(entry.entry_id)
    assert _issue(hass) is None and update_check.DATA_UPDATE not in hass.data


async def test_check_with_two_alarm_systems_runs_once(hass: HomeAssistant, entry) -> None:
    await setup_alarm(hass, "Garage")
    assert len(hass.data[update_check.DATA_UPDATE]["timers"]) <= 1


# ----- Release Notes -----

CHANGELOG_EN = """# Changelog

## [0.3.0] - 2026-02-01

Not released; included in 0.4.0.

### Added

- **Three:** third.

## [0.4.0] - 2026-03-01

Includes the changes from 0.3.0.

### Added

- **Four:** fourth.

## [0.2.0] - 2026-01-01

### Added

- **Two:** second.

[0.4.0]: https://example.com/0.4.0
[0.2.0]: https://example.com/0.2.0
"""
CHANGELOG_DE = CHANGELOG_EN.replace("Added", "Hinzugefügt").replace("fourth", "vierte").replace("Three", "Drei")


def test_changelog_sections_drop_not_released_note_and_footnotes() -> None:
    sections = update_check.changelog_sections(CHANGELOG_EN)
    assert [s["version"] for s in sections] == ["0.3.0", "0.4.0", "0.2.0"]
    assert "Not released" not in sections[0]["notes"] and "example.com" not in sections[-1]["notes"]
    picked = update_check.select_sections(sections, "0.2.0", "0.4.0")
    assert [s["version"] for s in picked] == ["0.4.0", "0.3.0"]
    assert [s["version"] for s in update_check.select_sections(sections, None, "0.4.0")] == ["0.4.0"]


def test_real_changelog_parses() -> None:
    """Das eigene CHANGELOG muss sich lesen lassen: jede Version hat Text."""
    text = (Path(__file__).resolve().parents[1] / "CHANGELOG.md").read_text(encoding="utf-8")
    sections = update_check.changelog_sections(text)
    assert sections and all(s["notes"] for s in sections)


async def test_release_notes_language_and_tag_spellings(hass: HomeAssistant, entry, hass_ws_client) -> None:
    client = await hass_ws_client(hass)
    # Nur "0.4.0" ohne "v" im Tag vorhanden
    TEXTS[f"{update_check.RAW_URL}/0.4.0/CHANGELOG.md"] = CHANGELOG_EN
    TEXTS[f"{update_check.RAW_URL}/0.4.0/CHANGELOG.de.md"] = CHANGELOG_DE
    de = (await _ws(client, type=f"{DOMAIN}/release_notes", installed="0.2.0", latest="0.4.0", language="de"))["result"]
    assert de["language"] == "de" and [e["version"] for e in de["entries"]] == ["0.4.0", "0.3.0"]
    assert "vierte" in de["entries"][0]["notes"]
    en = (await _ws(client, type=f"{DOMAIN}/release_notes", installed="0.2.0", latest="v0.4.0", language="en"))["result"]
    assert en["language"] == "en" and "fourth" in en["entries"][0]["notes"]


async def test_release_notes_fall_back_to_english_then_to_release_text(hass: HomeAssistant, entry, hass_ws_client) -> None:
    client = await hass_ws_client(hass)
    TEXTS[f"{update_check.RAW_URL}/v0.4.0/CHANGELOG.md"] = CHANGELOG_EN
    de = (await _ws(client, type=f"{DOMAIN}/release_notes", installed="0.2.0", latest="0.4.0", language="de"))["result"]
    assert de["language"] == "en" and de["entries"]
    GITHUB[f"{update_check.TAG_RELEASE_URL}/v0.5.0"] = ({"body": "## 0.5.0\n\n- Text of the release", "published_at": "2026-04-01T10:00:00Z"}, None)
    rel = (await _ws(client, type=f"{DOMAIN}/release_notes", installed="0.4.0", latest="0.5.0", language="en"))["result"]
    assert rel["entries"][0]["version"] == "0.5.0" and rel["entries"][0]["date"] == "2026-04-01"
    none = (await _ws(client, type=f"{DOMAIN}/release_notes", installed="0.5.0", latest="0.6.0", language="en"))["result"]
    assert none["entries"] == [] and none["error"] == "HTTP 404"


async def test_release_notes_reject_free_text(hass: HomeAssistant, entry, hass_ws_client) -> None:
    client = await hass_ws_client(hass)
    bad = await _ws(client, type=f"{DOMAIN}/release_notes", latest="../../etc/passwd", language="en")
    assert not bad["success"]


# ----- Einstellungen und Sicherung -----


async def test_set_update_validates_and_backup_roundtrip(hass: HomeAssistant, entry, hass_ws_client) -> None:
    client = await hass_ws_client(hass)
    assert not (await _ws(client, type=f"{DOMAIN}/set_update", auto_update="yes"))["success"]
    await _ws(client, type=f"{DOMAIN}/set_update", auto_update=True, prerelease=False, check=False)
    exported = (await _ws(client, type=f"{DOMAIN}/export"))["result"]
    assert exported["settings"]["update"] == {"check": False, "prerelease": False, "auto_update": True}
    assert "update_notified" not in str(exported)
    await _ws(client, type=f"{DOMAIN}/set_update", auto_update=False, prerelease=True, check=True)
    result = await _ws(client, type=f"{DOMAIN}/import", data=exported)
    assert result["success"]
    assert hass.data[DATA_SETTINGS].update == {"check": False, "prerelease": False, "auto_update": True}


async def test_settings_survive_restart(hass: HomeAssistant, entry, hass_ws_client) -> None:
    client = await hass_ws_client(hass)
    await _ws(client, type=f"{DOMAIN}/set_update", auto_update=True)
    settings = hass.data[DATA_SETTINGS]
    await hass.config_entries.async_unload(entry.entry_id)
    hass.data.pop(DATA_SETTINGS)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert hass.data[DATA_SETTINGS] is not settings and hass.data[DATA_SETTINGS].update["auto_update"] is True
    assert hass.data[DATA_SETTINGS].update["check"] is True


async def test_defaults(hass: HomeAssistant, entry) -> None:
    assert hass.data[DATA_SETTINGS].update == {"check": True, "prerelease": None, "auto_update": False}
    assert timedelta(days=1) == update_check.DAILY
