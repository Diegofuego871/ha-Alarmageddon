"""
Updates (0.7.0, nach dem Vorbild von ha-device-panel).

Die installierte Version kommt aus dem Manifest der laufenden Integration, die
neueste aus den GitHub-Releases des Repositories (eine Abfrage für stabile und
Vorabversionen). Das ergänzt HACS, das nur alle paar Stunden prüft, und ist der
Rückfall, wenn HACS fehlt. Installiert wird immer über HACS (update.install):
auf Knopfdruck im Panel, und auf Wunsch automatisch nach der täglichen Prüfung.
Der Neustart von Home Assistant bleibt immer Sache des Nutzers: Eine
Alarmanlage startet sich nicht von selbst neu.

Sicherheit: Es wird nur die Update-Entität von HACS für dieses Repository
bedient (erkannt am Link des Releases), nie eine andere Integration.
Automatisch installieren ist standardmässig aus.
"""

from __future__ import annotations

import asyncio
import json
import logging
import random
import re
import time
from datetime import timedelta
from typing import Any

from aiohttp import ClientError, ClientTimeout

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import issue_registry as ir
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.event import async_call_later, async_track_time_interval
from homeassistant.loader import async_get_integration

from .const import DATA_SETTINGS, DOMAIN, GITHUB_REPO, MARKET_PLATFORMS
from .http_limit import read_limited
from .notify import async_send, text

_LOGGER = logging.getLogger(__name__)

RELEASES_URL = f"https://api.github.com/repos/{GITHUB_REPO}/releases?per_page=20"
TAG_RELEASE_URL = f"https://api.github.com/repos/{GITHUB_REPO}/releases/tags"
RAW_URL = f"https://raw.githubusercontent.com/{GITHUB_REPO}"
# GitHub erlaubt ohne Anmeldung 60 Abfragen pro Stunde und IP: höchstens alle 6 Stunden, auf Knopfdruck höchstens
# einmal pro Minute, nach einem Fehler früher ein neuer Versuch.
CACHE_SECONDS = 6 * 3600
FORCE_MIN_SECONDS = 60
ERROR_RETRY_SECONDS = 300
TIMEOUT = ClientTimeout(total=10)
RATE_LIMIT = "rate_limit"
JSON_MAX_BYTES = 2_000_000
NOTES_MAX = 15
NOTES_MAX_BYTES = 1_000_000
INSTALL_TIMEOUT = 300  # HACS braucht für Download und Entpacken etwas; danach gilt der Versuch als gescheitert
DAILY = timedelta(days=1)
# Erste Prüfung nach dem Start zufällig verteilt, damit nicht alle Installationen gleichzeitig bei GitHub anfragen
FIRST_CHECK_DELAY = (5 * 60, 65 * 60)

ISSUE_ID = "update_available"
RESTART_ISSUE_ID = "restart_required"
DATA_UPDATE = f"{DOMAIN}_update"  # {"timers": [...], "cache": {...}, "notes": {...}, "lock": Lock}

# Versionsnummer, wie sie im URL-Pfad stehen darf (kommt vom Panel): Ziffern, Punkte, Vorabstufe
VERSION_ARG = re.compile(r"^v?\d{1,3}(\.\d{1,3}){0,2}([-.]?(a|b|rc|alpha|beta|pre)\.?\d{0,3})?\Z", re.IGNORECASE)
_VERSION_RE = re.compile(r"^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?[-.]?(?:(alpha|beta|pre|rc|a|b)\.?(\d*))?", re.IGNORECASE)
_PRE_RANK = {"a": 0, "alpha": 0, "b": 1, "beta": 1, "pre": 1, "rc": 2}
_SECTION_RE = re.compile(r"^## \[([^\]]+)\](?: - (\S+))?\s*$")
_FOOTNOTE_RE = re.compile(r"^\[[^\]]+\]: \S+")
_NOT_RELEASED_RE = re.compile(r"^(Not released|Nicht veröffentlicht)\b", re.IGNORECASE)
# Link auf dieses Repository auf GitHub, am Host verankert (ein fremder Host mit gleichem Pfad zählt nicht)
_REPO_URL_RE = re.compile(rf"^https://github\.com/{re.escape(GITHUB_REPO)}(?:[/?#]|$)", re.IGNORECASE)


def _state(hass: HomeAssistant) -> dict[str, Any]:
    return hass.data.setdefault(DATA_UPDATE, {"timers": [], "cache": None, "notes": {}, "started": False})


def _strip_v(tag: Any) -> str:
    value = str(tag or "").strip()
    return value[1:] if value[:1] in ("v", "V") else value


def _version_key(value: str | None) -> tuple[int, ...]:
    """Sortierschlüssel (Major, Minor, Patch, Stufe, Nummer); Stufe 3 = fertig, darunter rc, beta, alpha."""
    match = _VERSION_RE.match(str(value or "").strip())
    if not match:
        return (0, 0, 0, 3, 0)
    major, minor, patch, tag, num = match.groups()
    rank = _PRE_RANK[tag.lower()] if tag else 3
    return (int(major), int(minor or 0), int(patch or 0), rank, int(num or 0))


def is_prerelease(value: str | None) -> bool:
    return _version_key(value)[3] < 3


def compare_versions(a: str | None, b: str | None) -> int:
    """1, wenn a neuer ist als b; -1, wenn älter; 0 bei Gleichstand."""
    x, y = _version_key(a), _version_key(b)
    return (x > y) - (x < y)


def is_repo_url(url: Any) -> bool:
    return bool(_REPO_URL_RE.match(str(url or "").strip()))


async def async_installed_version(hass: HomeAssistant) -> str | None:
    """Version der laufenden Integration (nicht der Dateien auf der Platte)."""
    integration = await async_get_integration(hass, DOMAIN)
    return str(integration.version) if integration.version else None


async def _async_get_json(hass: HomeAssistant, url: str) -> tuple[Any, str | None]:
    """GET mit Zeitlimit; Fehler als Text statt Ausnahme."""
    try:
        session = async_get_clientsession(hass)
        async with session.get(url, headers={"Accept": "application/vnd.github+json"}, timeout=TIMEOUT) as resp:
            if resp.status >= 400:
                # Abfragelimit: eigener Code, damit das Panel es verständlich zeigt statt "HTTP 403"
                if resp.status in (403, 429) and resp.headers.get("X-RateLimit-Remaining") == "0":
                    return None, RATE_LIMIT
                return None, f"HTTP {resp.status}"
            raw = await read_limited(resp, JSON_MAX_BYTES)
            if raw is None:
                return None, "too large"
            return json.loads(raw), None
    except (asyncio.TimeoutError, ClientError, ValueError) as err:
        return None, str(err) or type(err).__name__


async def _async_get_text(hass: HomeAssistant, url: str) -> tuple[str | None, str | None]:
    try:
        session = async_get_clientsession(hass)
        async with session.get(url, timeout=TIMEOUT) as resp:
            if resp.status >= 400:
                return None, f"HTTP {resp.status}"
            raw = await read_limited(resp, NOTES_MAX_BYTES)
            if raw is None:
                return None, "too large"
            return raw.decode("utf-8", errors="replace"), None
    except (asyncio.TimeoutError, ClientError, ValueError) as err:
        return None, str(err) or type(err).__name__


# ----- Veröffentlichte Versionen -----


async def async_releases(hass: HomeAssistant, force: bool = False) -> dict[str, Any]:
    """
    Neueste stabile Version und neueste Vorabversion, zwischengespeichert.
    tags: alle veröffentlichten Versionen der Liste, pre_tags: davon die mit Haken "Pre-release".
    """
    state = _state(hass)
    cached = state["cache"]
    if cached:
        age = time.time() - cached["checked_at"]
        limit = FORCE_MIN_SECONDS if force else (ERROR_RETRY_SECONDS if cached.get("error") else CACHE_SECONDS)
        if age < limit:
            return cached
    result: dict[str, Any] = {"checked_at": time.time(), "latest": None, "release_url": None, "prerelease": None,
                              "prerelease_url": None, "tags": [], "pre_tags": [], "error": None}
    data, error = await _async_get_json(hass, RELEASES_URL)
    if error:
        result["error"] = error
    else:
        best: dict[bool, tuple[str, str | None] | None] = {False: None, True: None}
        for rel in data if isinstance(data, list) else []:
            if not isinstance(rel, dict) or rel.get("draft"):
                continue
            tag = _strip_v(rel.get("tag_name"))
            if not tag:
                continue
            pre = bool(rel.get("prerelease"))
            result["tags"].append(tag)
            if pre:
                result["pre_tags"].append(tag)
            if best[pre] is None or compare_versions(tag, best[pre][0]) > 0:
                best[pre] = (tag, rel.get("html_url"))
        if best[False]:
            result["latest"], result["release_url"] = best[False]
        if best[True]:
            result["prerelease"], result["prerelease_url"] = best[True]
    # Bei einem Fehler den letzten guten Stand behalten, nur den Fehler zeigen
    if result["error"] and cached and (cached.get("latest") or cached.get("prerelease")):
        result = {**cached, "error": result["error"], "checked_at": result["checked_at"]}
    state["cache"] = result
    return result


def prerelease_wanted(hass: HomeAssistant, installed: str | None, releases: dict[str, Any]) -> bool:
    """
    Vorabversionen anbieten? Gewählt im Panel; nie gewählt: wer eine Vorabversion
    installiert hat, bekommt auch die nächsten angeboten (sonst fände er bis zum
    ersten stabilen Release nie ein Update).
    """
    settings = hass.data[DATA_SETTINGS]
    chosen = settings.update["prerelease"]
    if isinstance(chosen, bool):
        return chosen
    return bool(installed and (is_prerelease(installed) or installed in releases.get("pre_tags", [])))


def installed_is_prerelease(installed: str | None, releases: dict[str, Any]) -> bool | None:
    """Die Nummer allein sagt es nicht, es zählt der Haken am GitHub-Release. None = unbekannt (dann zeigt das Panel nichts)."""
    if not installed:
        return None
    if is_prerelease(installed) or installed in releases.get("pre_tags", []):
        return True
    return False if installed in releases.get("tags", []) else None


def offered(hass: HomeAssistant, installed: str | None, releases: dict[str, Any]) -> tuple[str | None, str | None]:
    """(Version, Link) der neuesten angebotenen Version, ohne Rücksicht darauf, ob sie neuer ist als die installierte."""
    latest, url = releases.get("latest"), releases.get("release_url")
    pre = releases.get("prerelease")
    if pre and prerelease_wanted(hass, installed, releases) and (not latest or compare_versions(pre, latest) > 0):
        return pre, releases.get("prerelease_url")
    return latest, url


async def async_version_info(hass: HomeAssistant, force: bool = False) -> dict[str, Any]:
    """Alles, was das Panel für die Versionszeile braucht."""
    installed = await async_installed_version(hass)
    releases = await async_releases(hass, force)
    settings = hass.data[DATA_SETTINGS]
    wanted = prerelease_wanted(hass, installed, releases)
    latest, url = offered(hass, installed, releases)
    info = {
        "installed": installed,
        "installed_prerelease": installed_is_prerelease(installed, releases),
        "latest": latest,
        "latest_url": url,
        "latest_prerelease": bool(latest and (is_prerelease(latest) or latest in releases.get("pre_tags", []))),
        "checked_at": releases["checked_at"],
        "error": releases["error"],
        "settings": {**settings.update, "prerelease": wanted},
    }
    await async_refresh_issue(hass, info)
    return info


# ----- Meldung unter "Reparaturen", Push, automatische Installation -----


def _hacs_update_entity(hass: HomeAssistant) -> str | None:
    """Update-Entität von HACS für dieses Repository: erkannt am Link des Releases, nie am Titel oder an einer festen ID."""
    registry = er.async_get(hass)
    for entry in registry.entities.values():
        if entry.platform not in MARKET_PLATFORMS or entry.domain != "update" or entry.disabled_by is not None:
            continue
        state = hass.states.get(entry.entity_id)
        if state is not None and is_repo_url(state.attributes.get("release_url")):
            return entry.entity_id
    return None


async def _async_notify(hass: HomeAssistant, kind: str, latest: str, installed: str | None) -> bool:
    """
    Push an die Wartungs-Empfänger, einmal pro Version und Art: "found" = neue Version gefunden, "done" = automatisch
    installiert (Neustart steht aus). Gemerkt wird erst nach dem Versand, damit ein fehlgeschlagener Push beim nächsten
    Durchgang wieder versucht wird. Ein- und ausschaltbar als Ereignis "Update verfügbar" unter Benachrichtigungen.
    """
    settings = hass.data[DATA_SETTINGS]
    cfg = settings.notify
    if not cfg["events"].get("update_available") or settings.update_notified.get(kind) == latest:
        return False
    values = {"latest": latest, "installed": installed or "?"}
    payload = {
        "title": text(hass, f"update_{kind}_title", **values),
        "message": text(hass, f"update_{kind}_text", **values),
        "data": {"group": "alarmageddon_maintenance", "tag": "alarmageddon_update", "url": "/alarmageddon", "clickAction": "/alarmageddon"},
    }
    if not async_send(hass, cfg["maintenance_targets"], payload):
        return False
    await settings.async_remember_notified(kind, latest)
    return True


async def async_refresh_issue(hass: HomeAssistant, info: dict[str, Any]) -> None:
    """
    Meldung unter "Reparaturen" anlegen oder entfernen. Ohne gültige Antwort von
    GitHub bleibt der bisherige Zustand stehen. Push und automatische
    Installation folgen jeder Prüfung (täglich oder durch das Panel), solange
    die tägliche Prüfung eingeschaltet ist.
    """
    settings = hass.data[DATA_SETTINGS]
    if not settings.update["check"]:
        ir.async_delete_issue(hass, DOMAIN, ISSUE_ID)
        return
    installed, latest = info["installed"], info["latest"]
    if not installed or not latest:
        return
    if compare_versions(latest, installed) > 0:
        if settings.update["auto_update"]:
            # Im Hintergrund: die Prüfung wartet nicht auf den Download
            hass.async_create_task(async_auto_install(hass), f"{DOMAIN}_auto_install")
        else:
            await _async_notify(hass, "found", latest, installed)
        ir.async_create_issue(
            hass, DOMAIN, ISSUE_ID, is_fixable=False, is_persistent=False, severity=ir.IssueSeverity.WARNING,
            translation_key=ISSUE_ID, translation_placeholders={"installed": installed, "latest": latest},
            learn_more_url=info.get("latest_url") or f"https://github.com/{GITHUB_REPO}/releases",
        )
    else:
        ir.async_delete_issue(hass, DOMAIN, ISSUE_ID)


async def async_auto_install(hass: HomeAssistant) -> bool:
    """
    Über HACS installieren (update.install), sobald eine Prüfung eine neuere Version findet. Nur mit "auto_update" und
    eingeschalteter täglicher Prüfung; eine Vorabversion nur, wenn Vorabversionen angeboten werden. Danach bleibt der Neustart
    dem Nutzer überlassen: Meldung unter "Reparaturen" und Push.
    """
    settings = hass.data[DATA_SETTINGS]
    if not (settings.update["auto_update"] and settings.update["check"]):
        return False
    state = _state(hass)
    lock: asyncio.Lock = state.setdefault("lock", asyncio.Lock())
    if lock.locked():
        return False
    async with lock:
        entity_id = _hacs_update_entity(hass)
        if entity_id is None:
            return False
        try:
            # HACS prüft sonst nur alle paar Stunden: über den öffentlichen Dienst neu laden lassen
            await hass.services.async_call("homeassistant", "update_entity", {"entity_id": entity_id}, blocking=True)
        except Exception:  # noqa: BLE001 - nicht kritisch, dann gilt der bisherige Stand von HACS
            pass
        current = hass.states.get(entity_id)
        if current is None:
            return False
        attrs = current.attributes
        latest, on_disk = attrs.get("latest_version"), attrs.get("installed_version")
        running = await async_installed_version(hass)
        if not latest or not running or compare_versions(latest, running) <= 0:
            return False  # GitHub kennt eine neuere Version, HACS noch nicht: beim nächsten Durchgang wieder
        if on_disk and compare_versions(on_disk, running) > 0 and compare_versions(on_disk, latest) >= 0:
            return False  # schon heruntergeladen, wartet auf den Neustart
        if attrs.get("in_progress"):
            return False
        releases = await async_releases(hass)
        if (is_prerelease(latest) or _strip_v(latest) in releases.get("pre_tags", [])) and not prerelease_wanted(hass, running, releases):
            return False
        try:
            async with asyncio.timeout(INSTALL_TIMEOUT):
                await hass.services.async_call("update", "install", {"entity_id": entity_id}, blocking=True)
        except Exception as err:  # noqa: BLE001 - jede Ursache gehört ins Protokoll; beim nächsten Durchgang neuer Versuch
            _LOGGER.warning("Automatic update to %s failed: %s", latest, err or type(err).__name__)
            await _async_notify(hass, "found", _strip_v(latest), running)
            return False
        _LOGGER.info("Automatic update to %s installed, restart required", latest)
        ir.async_create_issue(
            hass, DOMAIN, RESTART_ISSUE_ID, is_fixable=False, is_persistent=False, severity=ir.IssueSeverity.WARNING,
            translation_key=RESTART_ISSUE_ID, translation_placeholders={"latest": _strip_v(latest), "installed": running},
        )
        await _async_notify(hass, "done", _strip_v(latest), running)
        return True


# ----- Tägliche Prüfung -----


async def _run(hass: HomeAssistant) -> None:
    settings = hass.data.get(DATA_SETTINGS)
    if settings is None or not settings.update["check"]:
        return
    await async_version_info(hass)


@callback
def async_start_daily(hass: HomeAssistant) -> None:
    """Einmal pro Instanz: erste Prüfung zufällig nach dem Start, danach alle 24 Stunden."""
    state = _state(hass)
    if state["started"]:
        return
    state["started"] = True

    async def _tick(_now: Any = None) -> None:
        await _run(hass)

    async def _first(_now: Any) -> None:
        # Erst den Takt setzen, dann prüfen: so bleibt nach einem Abbruch der Prüfung der Takt bestehen
        state["timers"].append(async_track_time_interval(hass, _tick, DAILY))
        await _run(hass)

    state["timers"].append(async_call_later(hass, random.randint(*FIRST_CHECK_DELAY), _first))


@callback
def async_stop_daily(hass: HomeAssistant) -> None:
    """Beim Entladen der letzten Anlage: Zeitgeber und Meldungen entfernen."""
    state = hass.data.pop(DATA_UPDATE, None)
    for unsub in (state or {}).get("timers", []):
        unsub()
    ir.async_delete_issue(hass, DOMAIN, ISSUE_ID)


# ----- Release Notes -----


def changelog_sections(markdown: str) -> list[dict[str, Any]]:
    """
    Abschnitte einer CHANGELOG-Datei (Keep a Changelog): Version, Datum und Text, neueste zuerst. Der Vermerk
    "Nicht veröffentlicht; enthalten in …" fällt weg, die Link-Fussnoten am Ende gehören zu keinem Abschnitt.
    """
    out: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    for line in markdown.splitlines():
        match = _SECTION_RE.match(line)
        if match:
            current = {"version": _strip_v(match.group(1)), "date": match.group(2), "lines": []}
            out.append(current)
        elif current is not None:
            if _FOOTNOTE_RE.match(line):
                current = None
            else:
                current["lines"].append(line)
    sections = []
    for section in out:
        lines = [x for x in section.pop("lines") if not _NOT_RELEASED_RE.match(x.strip())]
        body = "\n".join(lines).strip()
        if body and section["version"][:1].isdigit():
            sections.append({**section, "notes": re.sub(r"\n{3,}", "\n\n", body)})
    return sections


def select_sections(sections: list[dict[str, Any]], installed: str | None, latest: str) -> list[dict[str, Any]]:
    """Versionen nach der installierten bis zur neuesten, neueste zuerst; ohne installierte nur die neueste."""
    if not installed:
        picked = [x for x in sections if compare_versions(x["version"], latest) == 0]
    else:
        picked = [x for x in sections if compare_versions(x["version"], installed) > 0 and compare_versions(x["version"], latest) <= 0]
    picked.sort(key=lambda x: _version_key(x["version"]), reverse=True)
    return picked[:NOTES_MAX]


async def async_release_notes(hass: HomeAssistant, installed: str | None, latest: str, language: str, force: bool = False) -> dict[str, Any]:
    """
    Release Notes der Versionen nach der installierten bis zur neuesten: Deutsch aus CHANGELOG.de.md, sonst (und als
    Rückfall) Englisch aus CHANGELOG.md, zuletzt der Text des GitHub-Releases. Der Tag heisst mit oder ohne "v": beides
    versuchen (Releases legt der Nutzer selbst an).
    """
    wanted = "de" if language == "de" else "en"
    latest = latest.lstrip("vV")
    installed = installed.lstrip("vV") if installed else installed
    key = (installed or "", latest, wanted)
    cache: dict[Any, dict[str, Any]] = _state(hass)["notes"]
    if (hit := cache.get(key)) is not None:
        age = time.time() - hit["checked_at"]
        if age < (ERROR_RETRY_SECONDS if hit["error"] else CACHE_SECONDS) and not (force and age >= FORCE_MIN_SECONDS):
            return hit
    result: dict[str, Any] = {"checked_at": time.time(), "entries": [], "language": wanted, "error": None}
    tags = [f"v{latest}", latest]
    error: str | None = None
    for name in ["CHANGELOG.de.md", "CHANGELOG.md"] if wanted == "de" else ["CHANGELOG.md"]:
        for tag in tags:
            body, error = await _async_get_text(hass, f"{RAW_URL}/{tag}/{name}")
            if body is None:
                continue
            entries = select_sections(changelog_sections(body), installed, latest)
            if entries:
                result["entries"] = [{k: x[k] for k in ("version", "date", "notes")} for x in entries]
                result["language"] = "de" if name.endswith(".de.md") else "en"
                break
        if result["entries"]:
            break
    if not result["entries"]:
        for tag in tags:
            data, error = await _async_get_json(hass, f"{TAG_RELEASE_URL}/{tag}")
            if isinstance(data, dict) and isinstance(data.get("body"), str) and data["body"].strip():
                published = str(data.get("published_at") or "")[:10] or None
                result["entries"] = [{"version": latest, "date": published, "notes": data["body"].strip()[:NOTES_MAX_BYTES]}]
                result["language"] = "en"
                error = None
                break
    result["error"] = None if result["entries"] else (error or "HTTP 404")
    if len(cache) > 20:
        cache.clear()
    cache[key] = result
    return result
