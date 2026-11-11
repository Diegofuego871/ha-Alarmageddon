"""
Sicherung und Wiederherstellung (0.5.0): alles, was der Nutzer eingestellt
hat, als JSON-Datei aus dem Panel.

Enthalten: pro Anlage Zonen, Verzögerungen, Verhalten, Optionen pro Sensor,
Abläufe; global Voreinstellungen und Benachrichtigungen. Nicht enthalten:
Codes. Ein Hash eines vier- bis achtstelligen Codes ist mit einer Datei in
der Hand schnell durchprobiert; eine Sicherung soll gefahrlos herumliegen
dürfen. Laufzeitdaten (Zustand, Ereignisse) gehören ebenfalls nicht dazu.

Wiederherstellen ordnet Anlagen über den Namen zu. Die Codes der Zielanlage
bleiben unverändert.
"""

from __future__ import annotations

import uuid
from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigEntryState
from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import BACKUPS_STORE_KEY, CONF_CODE_ARM_REQUIRED, DOMAIN, MAX_BACKUPS
from .schemas import SYSTEM_OPTIONS_SCHEMA
from .settings import async_get_settings, valid_notify, valid_presets

FORMAT = "alarmageddon"
VERSION = 1
ALLOWED = {str(key.schema) for key in SYSTEM_OPTIONS_SCHEMA.schema}


def loaded_entries(hass: HomeAssistant) -> list[ConfigEntry]:
    return [e for e in hass.config_entries.async_entries(DOMAIN) if e.state is ConfigEntryState.LOADED]


async def async_export(hass: HomeAssistant, integration_version: str | None) -> dict[str, Any]:
    settings = await async_get_settings(hass)
    systems = []
    for entry in sorted(loaded_entries(hass), key=lambda e: e.title.lower()):
        # Nur bekannte Schlüssel: so kommt nie ein Code-Hash in die Datei. Geprüft wird beim Einlesen.
        options = {k: v for k, v in entry.options.items() if k in ALLOWED}
        systems.append({"title": entry.title, "options": options})
    return {
        "format": FORMAT,
        "version": VERSION,
        "integration_version": integration_version,
        "created": dt_util.utcnow().isoformat(),
        "settings": {"presets": settings.presets, "notify": settings.notify, "names_with_device": settings.names_with_device},
        "systems": systems,
    }


def validate(data: Any) -> dict[str, Any]:
    """Prüft eine Sicherung; wirft vol.Invalid mit einem Schlüssel als Meldung."""
    if not isinstance(data, dict) or data.get("format") != FORMAT:
        raise vol.Invalid("not_a_backup")
    if not isinstance(data.get("version"), int) or data["version"] > VERSION:
        raise vol.Invalid("newer_version")
    systems = []
    for item in data.get("systems") or []:
        if not isinstance(item, dict) or not isinstance(item.get("title"), str):
            raise vol.Invalid("invalid_backup")
        try:
            options = SYSTEM_OPTIONS_SCHEMA(item.get("options") or {})
        except vol.Invalid as err:
            raise vol.Invalid("invalid_backup") from err
        systems.append({"title": item["title"], "options": options})
    settings = data.get("settings") if isinstance(data.get("settings"), dict) else {}
    return {
        "systems": systems,
        "presets": valid_presets(settings["presets"]) if "presets" in settings else None,
        "notify": valid_notify(settings["notify"]) if "notify" in settings else None,
        # Anzeige der Namen (1.12.0); ältere Sicherungen kennen sie nicht, dann bleibt die Einstellung, wie sie ist
        "names_with_device": settings["names_with_device"] if isinstance(settings.get("names_with_device"), bool) else None,
    }


def plan(hass: HomeAssistant, backup: dict[str, Any]) -> dict[str, Any]:
    """Was beim Wiederherstellen passiert: welche Anlagen gefunden werden und welche nicht."""
    by_title = {e.title.casefold(): e for e in loaded_entries(hass)}
    found = [s["title"] for s in backup["systems"] if s["title"].casefold() in by_title]
    missing = [s["title"] for s in backup["systems"] if s["title"].casefold() not in by_title]
    return {"systems": found, "missing": missing, "settings": any(backup.get(k) is not None for k in ("presets", "notify", "names_with_device"))}


async def async_restore(hass: HomeAssistant, backup: dict[str, Any]) -> dict[str, Any]:
    result = plan(hass, backup)
    by_title = {e.title.casefold(): e for e in loaded_entries(hass)}
    settings = await async_get_settings(hass)
    if backup["notify"] is not None:
        await settings.async_set_notify(backup["notify"])
    if backup.get("names_with_device") is not None:
        await settings.async_set_names_with_device(backup["names_with_device"])
    # Voreinstellungen zuerst und ohne Benachrichtigung: die Anlagen, deren Optionen sich gleich ändern, laden darüber neu
    # und sehen schon die neuen Voreinstellungen; die übrigen werden am Ende benachrichtigt. Jede Anlage lädt genau einmal.
    presets_changed = backup["presets"] is not None and await settings.async_store_presets(backup["presets"])
    reloading: set[str] = set()
    for item in backup["systems"]:
        entry = by_title.get(item["title"].casefold())
        if entry is None:
            continue
        options = {**entry.options, **item["options"]}
        # Code zum Scharfschalten nur, wenn die Zielanlage überhaupt einen Code hat
        ctl = entry.runtime_data.controller
        if options.get(CONF_CODE_ARM_REQUIRED) and not ctl.has_code:
            options[CONF_CODE_ARM_REQUIRED] = False
        if hass.config_entries.async_update_entry(entry, options=options):
            reloading.add(entry.entry_id)
    if presets_changed:
        settings.async_notify_listeners(skip=reloading)
    return result


# ----- Sicherungen in der Integration (0.38.0): bis zu MAX_BACKUPS, neueste zuerst -----


def _store(hass: HomeAssistant) -> Store:
    return Store(hass, 1, BACKUPS_STORE_KEY)


async def _load(hass: HomeAssistant) -> list[dict[str, Any]]:
    data = await _store(hass).async_load()
    items = data.get("backups") if isinstance(data, dict) else None
    return [b for b in (items or []) if isinstance(b, dict) and isinstance(b.get("id"), str) and isinstance(b.get("data"), dict)]


async def async_list_backups(hass: HomeAssistant) -> list[dict[str, Any]]:
    """Ohne den Inhalt: Kennung, Zeitpunkt und die Namen der gesicherten Anlagen."""
    return [
        {"id": b["id"], "name": b.get("name") or "", "created": b.get("created"), "systems": [s.get("title") for s in b["data"].get("systems", []) if isinstance(s, dict)]}
        for b in await _load(hass)
    ]


async def async_create_backup(hass: HomeAssistant, integration_version: str | None, name: str = "") -> dict[str, Any]:
    data = await async_export(hass, integration_version)
    items = await _load(hass)
    name = " ".join(name.split())[:60]
    item = {"id": uuid.uuid4().hex[:12], "name": name, "created": data["created"], "data": data}
    items = [item, *items][:MAX_BACKUPS]
    await _store(hass).async_save({"backups": items})
    return {"id": item["id"], "name": name, "created": item["created"], "systems": [s["title"] for s in data["systems"]]}


async def async_get_backup(hass: HomeAssistant, backup_id: str) -> dict[str, Any] | None:
    return next((b["data"] for b in await _load(hass) if b["id"] == backup_id), None)


async def async_delete_backup(hass: HomeAssistant, backup_id: str) -> bool:
    items = await _load(hass)
    rest = [b for b in items if b["id"] != backup_id]
    if len(rest) == len(items):
        return False
    await _store(hass).async_save({"backups": rest})
    return True
