"""
WebSocket-Befehle des Panels. Nur für Administratoren (das Panel selbst
ist es auch). Jede Anlage wird über ihre Config-Entry-ID angesprochen;
fremde IDs lehnt jeder Befehl ab (LEARNINGS).

Texte liefert der Server keine: Fehler kommen als Schlüssel
(translation_key), das Panel formuliert sie in der Sprache von HA.
"""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.config_entries import ConfigEntry, ConfigEntryState
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError, ServiceValidationError
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.loader import async_get_integrations

from .const import (
    CONF_ENTRY_DELAY,
    CONF_ENTRY_SENSORS,
    CONF_EXIT_DELAY_PREFIX,
    CONF_NIGHT_ENABLED,
    CONF_OPEN_SENSORS,
    CONF_SENSOR_OPTIONS,
    CONF_TRIGGER_TIME,
    CONF_ZONE_PREFIX,
    DOMAIN,
    MAX_DELAY,
    MODES,
    OPEN_SENSOR_MODES,
    SENSOR_CLASSES,
    SENSOR_OPTIONS,
    SENSOR_TYPES,
)
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
    websocket_api.async_register_command(hass, ws_save_presets)
    websocket_api.async_register_command(hass, ws_save_system)


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
    batteries: dict[str, str] = {}
    signals: dict[str, str] = {}
    for entry in ent_reg.entities.values():
        if entry.domain != "sensor" or not entry.device_id or entry.disabled_by:
            continue
        device_class = entry.device_class or entry.original_device_class
        if device_class == "battery":
            batteries.setdefault(entry.device_id, entry.entity_id)
        # Empfang: Signalstärke (dBm) oder Verbindungsqualität (LQI), je nach Integration; nur wenn vorhanden
        elif device_class == "signal_strength" or any(k in entry.entity_id for k in ("_lqi", "linkquality", "_rssi")):
            signals.setdefault(entry.device_id, entry.entity_id)

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
        chosen |= {e for members in zones.values() for e in members} | set(ctl.sensor_overrides)
        systems.append(
            {
                "entry_id": entry.entry_id,
                "title": entry.title,
                "entity_id": _alarm_entity(hass, entry),
                "modes": list(ctl.modes),
                "zones": zones,
                "entry_sensors": sorted(ctl.entry_sensors),
                "exit_delay": {mode: ctl.exit_delay(mode) for mode in ctl.modes},
                "entry_delay": ctl.entry_delay,
                "trigger_time": ctl.trigger_time,
                "open_sensors": entry.options.get(CONF_OPEN_SENSORS, "block"),
                "night_enabled": ctl.night_enabled,
                "sensor_options": ctl.sensor_overrides,
                "has_code": ctl.has_code,
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
    connection.send_result(msg["id"], {"systems": systems, "sensors": sensors, "presets": settings.presets})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/save_zones",
        vol.Required("entry_id"): str,
        vol.Required("zones"): {vol.In(MODES): [str]},
        vol.Required("entry_sensors"): [str],
        # Eigene Werte der Optionen pro Sensor; fehlt ein Sensor, gilt die Voreinstellung seiner Art
        vol.Optional("sensor_options"): {str: {vol.In(SENSOR_OPTIONS): bool}},
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
    if "sensor_options" in msg:
        if any(not e.startswith("binary_sensor.") for e in msg["sensor_options"]):
            connection.send_error(msg["id"], "invalid_entity", "Only binary sensors can have sensor options")
            return
        options[CONF_SENSOR_OPTIONS] = {e: dict(o) for e, o in msg["sensor_options"].items() if o}
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
        vol.Required("type"): f"{DOMAIN}/save_presets",
        vol.Required("presets"): {vol.In(SENSOR_TYPES): [vol.In(SENSOR_OPTIONS)]},
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_save_presets(hass: HomeAssistant, connection, msg: dict[str, Any]) -> None:
    """Voreinstellungen je Sensorart, für alle Anlagen. Die Anlagen laden danach neu."""
    settings = await async_get_settings(hass)
    await settings.async_set_presets(msg["presets"])
    connection.send_result(msg["id"], {"presets": settings.presets})


_SECONDS = vol.All(vol.Coerce(int), vol.Range(min=0, max=MAX_DELAY))


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/save_system",
        vol.Required("entry_id"): str,
        vol.Optional("exit_delay"): {vol.In(MODES): _SECONDS},
        vol.Optional("entry_delay"): _SECONDS,
        vol.Optional("trigger_time"): _SECONDS,
        vol.Optional("night_enabled"): bool,
        vol.Optional("open_sensors"): vol.In(OPEN_SENSOR_MODES),
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
    for key, conf in (("entry_delay", CONF_ENTRY_DELAY), ("trigger_time", CONF_TRIGGER_TIME), ("night_enabled", CONF_NIGHT_ENABLED), ("open_sensors", CONF_OPEN_SENSORS)):
        if key in msg:
            options[conf] = msg[key]
    hass.config_entries.async_update_entry(entry, options=options)
    connection.send_result(msg["id"], {"ok": True})
