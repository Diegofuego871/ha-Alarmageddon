"""
WebSocket-Befehle des Panels. Nur für Administratoren (das Panel selbst
ist es auch). Jede Anlage wird über ihre Config-Entry-ID angesprochen;
fremde IDs lehnt jeder Befehl ab (LEARNINGS).

Texte liefert der Server keine: Fehler kommen als Schlüssel
(translation_key), das Panel formuliert sie in der Sprache von HA.
"""

from __future__ import annotations

import re
import secrets
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.config_entries import ConfigEntry, ConfigEntryState
from homeassistant.const import CONF_NAME
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError, ServiceValidationError
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.loader import async_get_integrations
from homeassistant.util import slugify

from . import backup, last_change
from .code import hash_code, match_code
from .const import (
    BATTERY_THRESHOLD_RANGE,
    MAX_BACKUPS,
    OFFLINE_MINUTES_RANGE,
    CODE_PATTERN,
    CONF_CODE_ARM_REQUIRED,
    CONF_CODE_HASH,
    CONF_CODE_SALT,
    CONF_CODES,
    MAX_CODES,
    CONF_CONFIRM_WINDOW,
    CONF_ENTRY_DELAY,
    MAX_CONFIRM_WINDOW,
    CONF_ENTRY_SENSORS,
    CONF_SENSORS,
    CONF_EXIT_DELAY_PREFIX,
    CONF_NIGHT_ENABLED,
    CONF_SCHEDULES,
    MODE_ENABLED_DEFAULT,
    MODE_ENABLED_KEY,
    CONF_PER_MODE_SENSORS,
    CONF_PER_MODE_SETTINGS,
    CONF_SENSOR_MODES,
    CONF_SENSOR_OPTIONS,
    CONF_WORKFLOW_END,
    CONF_WORKFLOWS,
    CONF_ZONE_PREFIX,
    MAX_STEPS,
    NOTIFY_MODE_KINDS,
    NOTIFY_TYPES,
    SOUNDS,
    SOUNDS_URL_PATH,
    WORKFLOW_TRIGGERS,
    DOMAIN,
    MODES,
    OPEN_SENSOR_MODES,
    SENSOR_CLASSES,
    OPT_ENTRY_DELAY,
    SENSOR_OPTIONS,
    SENSOR_TYPES,
)
from .devices import battery_of, device_sensors
from .forecast import async_forecasts
from .schemas import END_NOTIFY_SCHEMA, SCHEDULES, SENSOR_VALUES, SECONDS as _SECONDS, valid_end, valid_step
from .settings import async_get_settings, sensor_type

ALARM_SERVICES = {
    "off": "alarm_disarm",
    "home": "alarm_arm_home",
    "away": "alarm_arm_away",
    "night": "alarm_arm_night",
}


@callback
def async_register(hass: HomeAssistant) -> None:
    websocket_api.async_register_command(hass, ws_data)
    websocket_api.async_register_command(hass, ws_save_zones)
    websocket_api.async_register_command(hass, ws_arm)
    websocket_api.async_register_command(hass, ws_rename)
    websocket_api.async_register_command(hass, ws_save_presets)
    websocket_api.async_register_command(hass, ws_save_system)
    websocket_api.async_register_command(hass, ws_save_notify)
    websocket_api.async_register_command(hass, ws_test_notify)
    websocket_api.async_register_command(hass, ws_test_end_notify)
    websocket_api.async_register_command(hass, ws_save_workflows)
    websocket_api.async_register_command(hass, ws_test_workflow)
    websocket_api.async_register_command(hass, ws_stop_workflow)
    websocket_api.async_register_command(hass, ws_battery_forecast)
    websocket_api.async_register_command(hass, ws_log)
    websocket_api.async_register_command(hass, ws_export)
    websocket_api.async_register_command(hass, ws_import)
    websocket_api.async_register_command(hass, ws_backups)
    websocket_api.async_register_command(hass, ws_backup_create)
    websocket_api.async_register_command(hass, ws_backup_get)
    websocket_api.async_register_command(hass, ws_backup_delete)
    websocket_api.async_register_command(hass, ws_add_code)
    websocket_api.async_register_command(hass, ws_remove_code)


def _entry(hass: HomeAssistant, connection, msg: dict[str, Any]) -> ConfigEntry | None:
    entry = hass.config_entries.async_get_entry(msg["entry_id"])
    if entry is None or entry.domain != DOMAIN or entry.state is not ConfigEntryState.LOADED:
        connection.send_error(msg["id"], "not_found", "Unknown alarm system")
        return None
    return entry


def _alarm_entity(hass: HomeAssistant, entry: ConfigEntry) -> str | None:
    return er.async_get(hass).async_get_entity_id("alarm_control_panel", DOMAIN, f"{entry.entry_id}_alarm")


async def _sensor_info(hass: HomeAssistant, extra: set[str]) -> dict[str, dict[str, Any]]:
    """
    Kandidaten für Zonen: binary_sensor mit passender Geräteklasse, dazu alle
    schon gewählten (auch wenn ihre Klasse nicht passt). Batterie über den
    Batteriesensor desselben Geräts, damit jede Integration funktioniert.
    """
    ent_reg = er.async_get(hass)
    dev_reg = dr.async_get(hass)
    area_reg = ar.async_get(hass)
    batteries, signals = device_sensors(hass)

    out: dict[str, dict[str, Any]] = {}
    for state in hass.states.async_all("binary_sensor"):
        reg = ent_reg.async_get(state.entity_id)
        if reg and reg.platform == DOMAIN:
            continue
        device_class = (reg.device_class or reg.original_device_class) if reg else None
        device_class = device_class or state.attributes.get("device_class")
        if device_class not in SENSOR_CLASSES and state.entity_id not in extra:
            continue
        device = dev_reg.async_get(reg.device_id) if reg and reg.device_id else None
        area_id = (reg.area_id if reg else None) or (device.area_id if device else None)
        area = area_reg.async_get_area(area_id) if area_id else None
        out[state.entity_id] = {
            "name": state.name,
            "device_class": device_class,
            "type": sensor_type(hass, state.entity_id),
            "area": area.name if area else None,
            "platform": reg.platform if reg else None,
            "battery": batteries.get(reg.device_id) if reg and reg.device_id else None,
            "signal": signals.get(reg.device_id) if reg and reg.device_id else None,
            "manufacturer": device.manufacturer if device else None,
            "model": device.model if device else None,
            "sw_version": device.sw_version if device else None,
            "device_id": device.id if device else None,
        }
    # Gewählte Sensoren, die es (gerade) nicht gibt, trotzdem zeigen: der Nutzer soll sie entfernen können
    for entity_id in extra - out.keys():
        out[entity_id] = {"name": entity_id, "device_class": None, "type": "other", "area": None, "platform": None, "battery": None,
                          "signal": None, "manufacturer": None, "model": None, "sw_version": None, "device_id": None, "missing": True}
    return out


async def _last_changes(hass: HomeAssistant, settings, entities: list[str]) -> dict[str, str]:
    """Letzte echte Änderung (offen <-> zu) je Sensor: gemerkt, sonst einmal aus dem Verlauf geholt (nicht bei jedem Abruf)."""
    tried: set[str] = hass.data.setdefault(f"{DOMAIN}_changes_tried", set())
    missing = [e for e in entities if e not in settings.last_changes and e not in tried]
    if missing:
        tried.update(missing)
        settings.seed_changes(await last_change.async_history_changes(hass, missing))
    return {e: settings.last_changes[e] for e in entities if e in settings.last_changes}


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/data"})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_data(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    """Alle Anlagen mit Zonen und Ereignissen, dazu die Sensoren. Live-Zustände liest das Panel aus hass.states."""
    systems = []
    chosen: set[str] = set()
    for entry in hass.config_entries.async_entries(DOMAIN):
        if entry.state is not ConfigEntryState.LOADED:
            continue
        ctl = entry.runtime_data.controller
        zones = {mode: ctl.zone(mode) for mode in ctl.modes}
        chosen |= {e for members in zones.values() for e in members} | set(ctl.sensor_overrides) | set(entry.options.get(CONF_SENSORS) or [])
        systems.append(
            {
                "entry_id": entry.entry_id,
                "title": entry.title,
                "entity_id": _alarm_entity(hass, entry),
                "instance": ctl.instance,
                "modes": list(ctl.modes),
                "zones": zones,
                "entry_sensors": sorted(ctl.entry_sensors),
                "sensors": list(entry.options.get(CONF_SENSORS) or []),
                # Einstellungen je Modus (0.10.0); "always": Alarm durch einen immer aktiven Sensor bei deaktivierter Anlage
                "mode_settings": {
                    **{mode: {"exit_delay": ctl.exit_delay(mode), "entry_delay": ctl.entry_delay_for(mode),
                              "confirm_window": ctl.confirm_window_for(mode)} for mode in ctl.modes},
                },
                "night_enabled": ctl.night_enabled,
                "schedules": entry.options.get(CONF_SCHEDULES) or [],
                "sensor_options": ctl.sensor_overrides,
                "per_mode_sensors": bool(entry.options.get(CONF_PER_MODE_SENSORS)),
                # Schalter "Einstellungen pro Modus" der Anlage; ohne gespeicherten Wert null (das Panel schaltet ein, wenn sich die Modi unterscheiden)
                "per_mode_settings": entry.options.get(CONF_PER_MODE_SETTINGS),
                "sensor_modes": entry.options.get(CONF_SENSOR_MODES) or {},
                "workflows": entry.options.get(CONF_WORKFLOWS) or {},
                "workflow_end": entry.options.get(CONF_WORKFLOW_END) or {},
                "workflow_running": (entry.runtime_data.workflow.running or {}).get("trigger") if entry.runtime_data.workflow else None,
                "workflow_test": bool((entry.runtime_data.workflow.running or {}).get("test")) if entry.runtime_data.workflow else False,
                "has_code": ctl.has_code,
                # Codes nie zum Panel: nur Name und verknüpfter Benutzer
                "codes": [{"id": c.get("id", ""), "name": c.get("name", ""), "user_id": c.get("user_id")} for c in ctl.codes],
                "main_code": bool(entry.options.get(CONF_CODE_HASH)),
                "code_arm_required": ctl.code_arm_required,
                "events": entry.runtime_data.events.events[:20],
            }
        )
    systems.sort(key=lambda s: s["title"].lower())
    sensors = await _sensor_info(hass, chosen)
    platforms = {s["platform"] for s in sensors.values() if s["platform"]}
    integrations = await async_get_integrations(hass, platforms)
    names = {p: (i.name if not isinstance(i, Exception) else p) for p, i in integrations.items()}
    for info in sensors.values():
        info["integration"] = names.get(info["platform"], info["platform"])
    settings = await async_get_settings(hass)
    notify_services = sorted(f"notify.{name}" for name in hass.services.async_services().get("notify", {}) if name not in ("notify", "send_message", "persistent_notification"))
    connection.send_result(msg["id"], {
        "systems": systems,
        "sensors": sensors,
        "presets": settings.presets,
        "last_changes": await _last_changes(hass, settings, sorted(chosen)),
        "notify": settings.notify,
        "notify_services": notify_services,
        "users": sorted(
            ({"id": u.id, "name": u.name} for u in await hass.auth.async_get_users() if not u.system_generated and u.is_active and u.name),
            key=lambda u: u["name"].lower(),
        ),
        "sounds": [{"id": key, "seconds": seconds, "url": f"{SOUNDS_URL_PATH}/{key}.wav"} for key, seconds in SOUNDS.items()],
    })


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/save_zones",
        vol.Required("entry_id"): str,
        vol.Required("zones"): {vol.In(MODES): [str]},
        vol.Required("entry_sensors"): [str],
        # Sensoren, die in der Liste der Konfiguration stehen sollen (Auswahl über "+")
        vol.Optional("sensors"): [str],
        # Eigene Werte der Optionen pro Sensor; fehlt ein Sensor, gilt die Voreinstellung seiner Art
        vol.Optional("sensor_options"): {str: SENSOR_VALUES},
        # Einstellungen je Modus: Schalter und eigene Werte je Modus (nur Abweichungen von den Werten für alle Modi)
        vol.Optional("per_mode_sensors"): bool,
        vol.Optional("sensor_modes"): {vol.In([*MODES, "always"]): {str: SENSOR_VALUES}},
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_save_zones(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    """Zonen und Eingangssensoren speichern. Dieselben Schlüssel wie der Optionsdialog."""
    if (entry := _entry(hass, connection, msg)) is None:
        return
    ctl = entry.runtime_data.controller
    zones = {mode: list(dict.fromkeys(msg["zones"].get(mode, []))) for mode in MODES}
    every = {e for members in zones.values() for e in members} | set(msg["entry_sensors"])
    if any(not e.startswith("binary_sensor.") for e in every):
        connection.send_error(msg["id"], "invalid_entity", "Only binary sensors can be in a zone")
        return
    active = {e for mode in ctl.modes for e in zones[mode]}
    if set(msg["entry_sensors"]) - active:
        connection.send_error(msg["id"], "entry_not_in_zone", "Every entry sensor must be in an active zone")
        return
    options = dict(entry.options)
    for mode in MODES:
        options[f"{CONF_ZONE_PREFIX}{mode}"] = zones[mode]
    options[CONF_ENTRY_SENSORS] = sorted(set(msg["entry_sensors"]))
    if "sensors" in msg:
        if any(not e.startswith("binary_sensor.") for e in msg["sensors"]):
            connection.send_error(msg["id"], "invalid_entity", "Only binary sensors can be listed")
            return
        options[CONF_SENSORS] = sorted(set(msg["sensors"]))
    if "sensor_options" in msg:
        if any(not e.startswith("binary_sensor.") for e in msg["sensor_options"]):
            connection.send_error(msg["id"], "invalid_entity", "Only binary sensors can have sensor options")
            return
        options[CONF_SENSOR_OPTIONS] = {e: dict(o) for e, o in msg["sensor_options"].items() if o}
    if "per_mode_sensors" in msg:
        options[CONF_PER_MODE_SENSORS] = msg["per_mode_sensors"]
    if "sensor_modes" in msg:
        if any(not e.startswith("binary_sensor.") for per in msg["sensor_modes"].values() for e in per):
            connection.send_error(msg["id"], "invalid_entity", "Only binary sensors can have sensor options")
            return
        options[CONF_SENSOR_MODES] = {m: {e: dict(o) for e, o in per.items() if o} for m, per in msg["sensor_modes"].items() if any(per.values())}
    # Neuladen übernimmt der Update-Listener; der Zustand der Anlage übersteht es (RestoreEntity)
    hass.config_entries.async_update_entry(entry, options=options)
    connection.send_result(msg["id"], {"ok": True})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/arm",
        vol.Required("entry_id"): str,
        vol.Required("mode"): vol.In(list(ALARM_SERVICES)),
        vol.Optional("code"): str,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_arm(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    """Über den normalen Dienst, damit Code-Prüfung, Standardcode und "geändert von" gleich laufen wie überall."""
    if (entry := _entry(hass, connection, msg)) is None:
        return
    entity_id = _alarm_entity(hass, entry)
    if entity_id is None:
        connection.send_error(msg["id"], "not_found", "Alarm entity not found")
        return
    data: dict[str, Any] = {"entity_id": entity_id}
    if msg.get("code"):
        data["code"] = msg["code"]
    try:
        await hass.services.async_call(
            "alarm_control_panel", ALARM_SERVICES[msg["mode"]], data, blocking=True, context=connection.context(msg)
        )
    except ServiceValidationError as err:
        # Schlüssel wie invalid_code, open_sensors, code_locked, code_arm_required, service_not_supported
        connection.send_error(msg["id"], err.translation_key or "invalid", str(err))
        return
    except HomeAssistantError as err:
        connection.send_error(msg["id"], "failed", str(err))
        return
    connection.send_result(msg["id"], {"ok": True})



@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/rename",
        vol.Required("entry_id"): str,
        vol.Required("name"): vol.All(str, vol.Length(max=60)),
        vol.Optional("regenerate_ids", default=False): bool,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_rename(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    """
    Benennt die Anlage um: Eintrag, Gerät und damit der Name der Entitäten. Auf Wunsch
    folgen auch die Entitäts-IDs (nur die, die noch dem alten Namen folgen).
    """
    if (entry := _entry(hass, connection, msg)) is None:
        return
    name = " ".join(msg["name"].split())
    if not name:
        connection.send_error(msg["id"], "name_required", "Name is empty")
        return
    if any(e.entry_id != entry.entry_id and e.title.casefold() == name.casefold() for e in hass.config_entries.async_entries(DOMAIN)):
        connection.send_error(msg["id"], "name_taken", "Name already used")
        return
    registry = er.async_get(hass)
    # Die IDs folgen dem Namen von damals, nicht unbedingt dem jetzigen Titel: beide Vorsilben gelten
    prefixes = {slugify(entry.title)}
    if alarm_id := _alarm_entity(hass, entry):
        prefixes.add(alarm_id.partition(".")[2])
    renamed = 0
    if msg["regenerate_ids"] and (new_slug := slugify(name)):
        for ent in er.async_entries_for_config_entry(registry, entry.entry_id):
            domain, _, obj = ent.entity_id.partition(".")
            # Längste passende Vorsilbe zuerst; selbst benannte IDs bleiben unberührt
            old = next((p for p in sorted(prefixes, key=len, reverse=True) if obj == p or obj.startswith(p + "_")), None)
            if old is None:
                continue
            new_id = registry.async_generate_entity_id(domain, new_slug + obj[len(old):], current_entity_id=ent.entity_id)
            if new_id != ent.entity_id:
                registry.async_update_entity(ent.entity_id, new_entity_id=new_id)
                renamed += 1
    # Gerät sofort umbenennen (ein eigener Name am Gerät würde sonst den neuen Namen verdecken)
    devices = dr.async_get(hass)
    if device := devices.async_get_device(identifiers={(DOMAIN, entry.entry_id)}):
        devices.async_update_device(device.id, name=name, name_by_user=None)
    # Löst das Neuladen aus; der Zustand übersteht es über die Wiederherstellung der Entität
    hass.config_entries.async_update_entry(entry, title=name, data={**entry.data, CONF_NAME: name})
    connection.send_result(msg["id"], {"ok": True, "renamed_ids": renamed})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/save_presets",
        vol.Required("presets"): {vol.In(SENSOR_TYPES): [vol.In(SENSOR_OPTIONS)]},
        # Sensorarten, deren Sensoren die Voreinstellung übernehmen: eigene Werte je Sensor werden gelöscht
        vol.Optional("reset_sensors"): [vol.In(SENSOR_TYPES)],
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_save_presets(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    """Voreinstellungen je Sensorart, für alle Anlagen. Die Anlagen laden danach neu."""
    settings = await async_get_settings(hass)
    # Erst die Voreinstellungen (ohne Benachrichtigung), dann die Optionen: jede Anlage lädt genau einmal neu und sieht beides
    presets_changed = await settings.async_store_presets(msg["presets"])
    reset = 0
    reloading: set[str] = set()
    kinds = set(msg.get("reset_sensors") or [])
    if kinds:
        for entry in hass.config_entries.async_entries(DOMAIN):
            own = dict(entry.options.get(CONF_SENSOR_OPTIONS) or {})
            per_mode = {m: dict(v) for m, v in (entry.options.get(CONF_SENSOR_MODES) or {}).items() if isinstance(v, dict)}
            drop = [e for e in {*own, *(e for v in per_mode.values() for e in v)} if sensor_type(hass, e) in kinds]
            if drop:
                reset += len(drop)
                # Auch die eigenen Werte je Modus fallen weg: der Sensor folgt danach wieder der Voreinstellung
                # Die eigene Eingangsverzögerung gehört nicht zu den Voreinstellungen und bleibt stehen
                def keep(o: dict[str, Any]) -> dict[str, Any]:
                    return {k: v for k, v in o.items() if k == OPT_ENTRY_DELAY} if isinstance(o, dict) else {}

                new_modes = {m: {e: (keep(o) if e in drop else o) for e, o in v.items() if e not in drop or keep(o)} for m, v in per_mode.items()}
                kept_own = {e: (keep(o) if e in drop else o) for e, o in own.items() if e not in drop or keep(o)}
                # Die Optionsänderung lädt die Anlage neu (Update-Listener); nur dann gilt sie als "lädt schon"
                if hass.config_entries.async_update_entry(entry, options={
                    **entry.options,
                    CONF_SENSOR_OPTIONS: kept_own,
                    CONF_SENSOR_MODES: {m: v for m, v in new_modes.items() if v},
                }):
                    reloading.add(entry.entry_id)
    if presets_changed:
        settings.async_notify_listeners(skip=reloading)
    connection.send_result(msg["id"], {"presets": settings.presets, "reset": reset})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/save_system",
        vol.Required("entry_id"): str,
        # Je Modus: fehlende Werte bleiben, wie sie sind. "trigger_time" (alte Alarmdauer) wird angenommen und ignoriert
        vol.Optional("mode_settings"): {vol.In([*MODES, "always"]): {
            vol.Optional("exit_delay"): _SECONDS,
            vol.Optional("entry_delay"): _SECONDS,
            vol.Optional("trigger_time"): _SECONDS,
            vol.Optional("open_sensors"): vol.In(OPEN_SENSOR_MODES),  # alt (bis 0.31.0), wird ignoriert
            vol.Optional("confirm_window"): vol.All(vol.Coerce(int), vol.Range(min=5, max=MAX_CONFIRM_WINDOW)),
        }},
        # Kurzform: gilt für alle Modi (und als gemeinsamer Wert für Modi, die es noch nicht gibt)
        vol.Optional("exit_delay"): {vol.In(MODES): _SECONDS},
        vol.Optional("entry_delay"): _SECONDS,
        vol.Optional("trigger_time"): _SECONDS,
        vol.Optional("per_mode_settings"): bool,
        vol.Optional("night_enabled"): bool,
        vol.Optional("home_enabled"): bool,
        vol.Optional("away_enabled"): bool,
        vol.Optional("schedules"): SCHEDULES,
        vol.Optional("open_sensors"): vol.In(OPEN_SENSOR_MODES),
        vol.Optional("confirm_window"): vol.All(vol.Coerce(int), vol.Range(min=5, max=MAX_CONFIRM_WINDOW)),
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_save_system(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    """Verzögerungen und Verhalten einer Anlage (dieselben Schlüssel wie der Optionsdialog). Code bleibt im Optionsdialog."""
    if (entry := _entry(hass, connection, msg)) is None:
        return
    options = dict(entry.options)
    for mode, seconds in msg.get("exit_delay", {}).items():
        options[f"{CONF_EXIT_DELAY_PREFIX}{mode}"] = seconds
    if "schedules" in msg:
        options[CONF_SCHEDULES] = msg["schedules"]
    for key, conf in (("entry_delay", CONF_ENTRY_DELAY), ("confirm_window", CONF_CONFIRM_WINDOW)):
        if key in msg:
            # Kurzform: für alle Modi (der gemeinsame Wert bleibt der Rückfall)
            options[conf] = msg[key]
            for scope in MODES:
                options[f"{conf}_{scope}"] = msg[key]
    if "per_mode_settings" in msg:
        options[CONF_PER_MODE_SETTINGS] = msg["per_mode_settings"]
    if "night_enabled" in msg:
        options[CONF_NIGHT_ENABLED] = msg["night_enabled"]
    for scope, values in msg.get("mode_settings", {}).items():
        for field, value in values.items():
            if field == "exit_delay":
                if scope in MODES:
                    options[f"{CONF_EXIT_DELAY_PREFIX}{scope}"] = value
            elif scope in MODES and field not in ("trigger_time", "open_sensors"):
                options[f"{field}_{scope}"] = value
    # Modi: mindestens einer, und nie den Modus abschalten, in dem die Anlage gerade scharf ist oder wird
    # (nach dem Neuladen fände der Zustand keinen Modus mehr und die Anlage wäre still deaktiviert)
    for mode, key in MODE_ENABLED_KEY.items():
        if f"{mode}_enabled" in msg:
            options[key] = msg[f"{mode}_enabled"]
    ctl = entry.runtime_data.controller
    enabled = [m for m, key in MODE_ENABLED_KEY.items() if options.get(key, MODE_ENABLED_DEFAULT[m])]
    if not enabled:
        connection.send_error(msg["id"], "no_mode", "At least one mode is needed")
        return
    if ctl.mode and ctl.mode not in enabled and ctl.state != AlarmControlPanelState.DISARMED:
        connection.send_error(msg["id"], "mode_active", "Disarm before switching off the active mode")
        return
    hass.config_entries.async_update_entry(entry, options=options)
    connection.send_result(msg["id"], {"ok": True})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/save_notify",
        vol.Required("notify"): {
            vol.Optional("alarm_targets"): [str],
            vol.Optional("maintenance_targets"): [str],
            # Je Meldungsart: an/aus, kritisch, Lautstärke (iOS); fehlende Werte bleiben, wie sie sind
            vol.Optional("types"): {vol.In(list(NOTIFY_TYPES)): {
                vol.Optional("enabled"): bool,
                vol.Optional("critical"): bool,
                vol.Optional("persistent"): bool,
                vol.Optional("volume"): vol.All(vol.Coerce(float), vol.Range(min=0, max=1)),
            }},
            # Eigene Werte je Modus für Arten, die nur im scharfen Zustand vorkommen; ersetzt alle bisherigen eigenen Werte
            vol.Optional("per_mode"): bool,
            vol.Optional("modes"): {vol.In(MODES): {vol.In(NOTIFY_MODE_KINDS): {
                vol.Optional("enabled"): bool,
                vol.Optional("critical"): bool,
                vol.Optional("persistent"): bool,
                vol.Optional("volume"): vol.All(vol.Coerce(float), vol.Range(min=0, max=1)),
            }}},
            vol.Optional("disarm_action"): bool,
            vol.Optional("open_action"): bool,
            vol.Optional("silence_action"): bool,
            vol.Optional("battery_threshold"): vol.All(vol.Coerce(int), vol.Range(min=BATTERY_THRESHOLD_RANGE[0], max=BATTERY_THRESHOLD_RANGE[1])),
            vol.Optional("offline_minutes"): vol.All(vol.Coerce(int), vol.Range(min=OFFLINE_MINUTES_RANGE[0], max=OFFLINE_MINUTES_RANGE[1])),
        },
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_save_notify(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    """Benachrichtigungen, für alle Anlagen gleich."""
    settings = await async_get_settings(hass)
    merged = {**settings.notify, **msg["notify"]}
    # Arten einzeln zusammenführen: eine Meldung mit nur einer Art lässt die anderen unberührt
    merged["types"] = {kind: {**current, **msg["notify"].get("types", {}).get(kind, {})} for kind, current in settings.notify["types"].items()}
    await settings.async_set_notify(merged)
    connection.send_result(msg["id"], {"notify": settings.notify})


@websocket_api.websocket_command(
    {vol.Required("type"): f"{DOMAIN}/test_notify", vol.Required("kind"): vol.In(list(NOTIFY_TYPES)), vol.Optional("mode"): vol.In(MODES)}
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_test_notify(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    """Testmeldung einer Art an ihre Empfänger, mit ihrem Kritisch und ihrer Lautstärke."""
    entries = [e for e in hass.config_entries.async_entries(DOMAIN) if e.state is ConfigEntryState.LOADED]
    if not entries:
        connection.send_error(msg["id"], "not_found", "No alarm system")
        return
    targets = entries[0].runtime_data.notifier.send_test(msg["kind"], msg.get("mode"))
    connection.send_result(msg["id"], {"targets": targets})




def _clean_end(value: dict[str, Any]) -> dict[str, Any]:
    """Nur speichern, was eingeschaltet ist: die eigene Meldung beim Alarmende."""
    out: dict[str, Any] = {}
    if (value.get("notify") or {}).get("enabled"):
        out["notify"] = value["notify"]
    return out


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/test_end_notify",
        vol.Required("entry_id"): str,
        vol.Required("notify"): vol.All(dict, END_NOTIFY_SCHEMA),
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_test_end_notify(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    """Testmeldung "Alarm beendet" mit den (auch ungespeicherten) Einstellungen aus dem Element "Alarm endet"."""
    if (entry := _entry(hass, connection, msg)) is None:
        return
    entry.runtime_data.notifier.send_alarm_end(None, test=True, own={**msg["notify"], "enabled": True})
    connection.send_result(msg["id"], {"ok": True})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/save_workflows",
        vol.Required("entry_id"): str,
        vol.Required("workflows"): {vol.In(WORKFLOW_TRIGGERS): vol.All([valid_step], vol.Length(max=MAX_STEPS))},
        # Element "Alarm endet": was Deaktivieren mit den Geräten macht, je Auslöser (fehlt: Standard)
        vol.Optional("workflow_end"): {vol.In(WORKFLOW_TRIGGERS): valid_end},
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_save_workflows(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    """Abläufe einer Anlage. Laden neu (wie alle Optionen); ein laufender Alarm geht weiter."""
    if (entry := _entry(hass, connection, msg)) is None:
        return
    options = dict(entry.options)
    options[CONF_WORKFLOWS] = {k: v for k, v in msg["workflows"].items() if v}
    if "workflow_end" in msg:
        options[CONF_WORKFLOW_END] = {k: end for k, v in msg["workflow_end"].items() if (end := _clean_end(v))}
    hass.config_entries.async_update_entry(entry, options=options)
    connection.send_result(msg["id"], {"ok": True})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/test_workflow",
        vol.Required("entry_id"): str,
        vol.Required("trigger"): vol.In(WORKFLOW_TRIGGERS),
        # Nur diesen einen Schritt testen (auch ungespeichert); ohne: den gespeicherten Ablauf
        vol.Optional("step"): vol.All(dict, valid_step),
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_test_workflow(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    """Gespeicherten Ablauf testen, ohne Alarm. Endet von selbst nach TEST_SECONDS oder mit stop_workflow."""
    if (entry := _entry(hass, connection, msg)) is None:
        return
    runner = entry.runtime_data.workflow
    if runner.running:
        connection.send_error(msg["id"], "busy", "Alarm actions are already running")
        return
    if not await runner.async_run(msg["trigger"], test=True, steps=[msg["step"]] if "step" in msg else None):
        connection.send_error(msg["id"], "empty", "No steps for this alarm")
        return
    connection.send_result(msg["id"], {"ok": True})


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/stop_workflow", vol.Required("entry_id"): str})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_stop_workflow(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    """Test beenden. Ein echter Alarm stoppt nur mit Deaktivieren."""
    if (entry := _entry(hass, connection, msg)) is None:
        return
    runner = entry.runtime_data.workflow
    if runner.running and not runner.running.get("test"):
        connection.send_error(msg["id"], "alarm_running", "Disarm to stop a real alarm")
        return
    await runner.async_stop()
    connection.send_result(msg["id"], {"ok": True})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/add_code",
        vol.Required("entry_id"): str,
        vol.Required("name"): vol.All(str, vol.Strip, vol.Length(min=1, max=40)),
        vol.Required("code"): str,
        vol.Optional("user_id"): vol.Any(None, str),
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_add_code(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    """
    Persönlicher Code. Der Code kommt nur hier herein und wird sofort als
    Hash gespeichert; nie geloggt, nie zurückgegeben. Gleiche Codes für zwei
    Personen sind verboten, sonst wäre "geändert von" nicht eindeutig.
    """
    if (entry := _entry(hass, connection, msg)) is None:
        return
    ctl = entry.runtime_data.controller
    code = msg["code"].strip()
    if not re.fullmatch(CODE_PATTERN, code):
        connection.send_error(msg["id"], "invalid_code_format", "4 to 8 digits")
        return
    if len(ctl.codes) >= MAX_CODES:
        connection.send_error(msg["id"], "too_many", "Too many codes")
        return
    if any(str(c.get("name", "")).casefold() == msg["name"].casefold() for c in ctl.codes):
        connection.send_error(msg["id"], "name_taken", "Name already used")
        return
    user_id = msg.get("user_id") or None
    if user_id and (await hass.auth.async_get_user(user_id) is None or any(c.get("user_id") == user_id for c in ctl.codes)):
        connection.send_error(msg["id"], "user_taken", "User unknown or already linked")
        return
    existing = [(c["hash"], c["salt"]) for c in ctl.codes]
    if entry.options.get(CONF_CODE_HASH):
        existing.append((entry.options[CONF_CODE_HASH], entry.options[CONF_CODE_SALT]))
    if await hass.async_add_executor_job(match_code, code, existing) is not None:
        connection.send_error(msg["id"], "code_taken", "Code already used")
        return
    code_hash, salt = await hass.async_add_executor_job(hash_code, code)
    new = {"id": secrets.token_hex(6), "name": msg["name"], "user_id": user_id, "hash": code_hash, "salt": salt}
    options = dict(entry.options)
    options[CONF_CODES] = [*(entry.options.get(CONF_CODES) or []), new]
    hass.config_entries.async_update_entry(entry, options=options)
    connection.send_result(msg["id"], {"id": new["id"]})


@websocket_api.websocket_command(
    {vol.Required("type"): f"{DOMAIN}/remove_code", vol.Required("entry_id"): str, vol.Required("code_id"): str}
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_remove_code(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    """Persönlichen Code entfernen. Ist danach kein Code mehr da, entfällt auch "Code zum Scharfschalten"."""
    if (entry := _entry(hass, connection, msg)) is None:
        return
    codes = entry.options.get(CONF_CODES) or []
    rest = [c for c in codes if c.get("id") != msg["code_id"]]
    if len(rest) == len(codes):
        connection.send_error(msg["id"], "not_found", "Unknown code")
        return
    options = dict(entry.options)
    options[CONF_CODES] = rest
    if not rest and not options.get(CONF_CODE_HASH):
        # Ohne Code kann "Code zum Scharfschalten" nicht gelten
        options[CONF_CODE_ARM_REQUIRED] = False
    hass.config_entries.async_update_entry(entry, options=options)
    connection.send_result(msg["id"], {"ok": True})


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/battery_forecast"})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_battery_forecast(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    """
    Tage bis "Batterie schwach" je Batteriesensor der gewählten Sensoren.
    Eigener Befehl, weil der Verlauf dauern kann: die Liste erscheint sofort,
    die Prognose kommt nach.
    """
    sensors: set[str] = set()
    for entry in hass.config_entries.async_entries(DOMAIN):
        if entry.state is ConfigEntryState.LOADED:
            sensors |= entry.runtime_data.controller.all_sensors()
    batteries = sorted(set(battery_of(hass, sensors).values()))
    settings = await async_get_settings(hass)
    result = await async_forecasts(hass, batteries, settings.notify["battery_threshold"])
    connection.send_result(msg["id"], {"forecast": result})


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/export"})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_export(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    """Sicherung aller Einstellungen ohne Codes; das Panel speichert sie als Datei."""
    entries = backup.loaded_entries(hass)
    version = entries[0].runtime_data.version if entries else None
    connection.send_result(msg["id"], await backup.async_export(hass, version))


@websocket_api.websocket_command(
    {vol.Required("type"): f"{DOMAIN}/import", vol.Required("data"): dict, vol.Optional("dry_run", default=False): bool}
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_import(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    """Sicherung einlesen. Mit dry_run nur prüfen und zeigen, welche Anlagen gefunden werden."""
    try:
        data = backup.validate(msg["data"])
    except vol.Invalid as err:
        connection.send_error(msg["id"], str(err.msg), "Invalid backup")
        return
    result = backup.plan(hass, data) if msg["dry_run"] else await backup.async_restore(hass, data)
    connection.send_result(msg["id"], result)


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/backups"})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_backups(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    """Die in der Integration abgelegten Sicherungen (ohne Inhalt), neueste zuerst."""
    connection.send_result(msg["id"], {"backups": await backup.async_list_backups(hass), "max": MAX_BACKUPS})


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/backup_create", vol.Optional("name", default=""): vol.All(str, vol.Length(max=60))})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_backup_create(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    """Legt die aktuelle Konfiguration (ohne Codes) in der Integration ab; es bleiben höchstens MAX_BACKUPS."""
    entries = backup.loaded_entries(hass)
    version = entries[0].runtime_data.version if entries else None
    created = await backup.async_create_backup(hass, version, msg["name"])
    connection.send_result(msg["id"], {"created": created, "backups": await backup.async_list_backups(hass), "max": MAX_BACKUPS})


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/backup_get", vol.Required("backup_id"): str})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_backup_get(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    """Inhalt einer Sicherung: zum Herunterladen und (über "import") zum Wiederherstellen."""
    data = await backup.async_get_backup(hass, msg["backup_id"])
    if data is None:
        connection.send_error(msg["id"], "not_found", "Unknown backup")
        return
    connection.send_result(msg["id"], data)


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/backup_delete", vol.Required("backup_id"): str})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_backup_delete(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    if not await backup.async_delete_backup(hass, msg["backup_id"]):
        connection.send_error(msg["id"], "not_found", "Unknown backup")
        return
    connection.send_result(msg["id"], {"backups": await backup.async_list_backups(hass), "max": MAX_BACKUPS})


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/log", vol.Optional("rev"): str})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_log(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    """
    Protokoll: alle Ereignisse und die aufgezeichneten Alarme (Zeitachse) je Anlage, getrennt von "data".

    Das Panel fragt bei offenem Reiter alle 5 Sekunden. Mit `rev` (der Stand aus der letzten Antwort) kommt nur
    `{"unchanged": true}` zurück, solange nichts dazukam: sonst gingen jedes Mal bis zu 1000 Ereignisse und 30 Alarme
    je Anlage über die Leitung.
    """
    loaded = [e for e in hass.config_entries.async_entries(DOMAIN) if e.state is ConfigEntryState.LOADED]
    # Stand aller Anlagen: Kennung des Laufs (ändert sich beim Neuladen) und die Zähler von Ereignissen und Aufzeichnungen
    rev = "|".join(
        f"{e.entry_id}:{e.runtime_data.controller.instance}:{e.runtime_data.events.rev}:{e.runtime_data.recorder.rev if e.runtime_data.recorder else 0}:{e.title}"
        for e in sorted(loaded, key=lambda e: e.entry_id)
    )
    if msg.get("rev") == rev:
        connection.send_result(msg["id"], {"unchanged": True, "rev": rev})
        return
    systems = []
    for entry in loaded:
        rt = entry.runtime_data
        systems.append({
            "entry_id": entry.entry_id,
            "title": entry.title,
            "events": rt.events.events,
            "recordings": rt.recorder.recordings if rt.recorder else [],
            "recording": bool(rt.recorder and rt.recorder.current),
        })
    systems.sort(key=lambda s: s["title"].lower())
    connection.send_result(msg["id"], {"systems": systems, "rev": rev})

