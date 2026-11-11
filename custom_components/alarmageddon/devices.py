"""Zusatzsensoren eines Geräts (Batterie, Empfang), unabhängig von der Integration und der Funktechnik."""

from __future__ import annotations

from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er

from .const import DATA_SETTINGS


def device_sensors(hass: HomeAssistant) -> tuple[dict[str, str], dict[str, str]]:
    """
    (Batterie je Gerät, Empfang je Gerät) als device_id -> entity_id. Empfang
    ist Signalstärke (dBm) oder Verbindungsqualität (LQI), je nach
    Integration; nur wenn vorhanden.
    """
    batteries: dict[str, str] = {}
    signals: dict[str, str] = {}
    for entry in er.async_get(hass).entities.values():
        if entry.domain != "sensor" or not entry.device_id or entry.disabled_by:
            continue
        device_class = entry.device_class or entry.original_device_class
        if device_class == "battery":
            batteries.setdefault(entry.device_id, entry.entity_id)
        elif device_class == "signal_strength" or any(k in entry.entity_id for k in ("_lqi", "linkquality", "_rssi")):
            signals.setdefault(entry.device_id, entry.entity_id)
    return batteries, signals


def battery_of(hass: HomeAssistant, entity_ids: set[str]) -> dict[str, str]:
    """Sensor -> Batteriesensor desselben Geräts, nur wo es einen gibt."""
    registry = er.async_get(hass)
    batteries, _ = device_sensors(hass)
    out: dict[str, str] = {}
    for entity_id in entity_ids:
        reg = registry.async_get(entity_id)
        if reg and reg.device_id and reg.device_id in batteries:
            out[entity_id] = batteries[reg.device_id]
    return out


NAME_SEPARATOR = " - "


def display_name(hass: HomeAssistant, entity_id: str) -> str:
    """
    Name eines Sensors, überall gleich (Panel, Protokoll, Meldungen, Fehlertexte).

    Der Nutzer wählt in der Ansicht (1.12.0, Einstellung `names_with_device`, für alle Geräte und auch für die Meldungen):
    - **an (Standard):** "Gerät - Sensor", der Name des Geräts und der eigene Name der Entität, mit Bindestrich getrennt. So ist
      jeder Sensor eindeutig, auch wenn mehrere von sich aus gleich heissen ("Bewegung").
    - **aus:** nur der eigene Name der Entität.

    Der eigene Name ist der, den der Nutzer der Entität gegeben hat, sonst der Name der Integration. Steht der Name des Geräts
    schon im eigenen Namen, wird er nicht noch einmal davorgesetzt. Die Hauptentität eines Geräts (ohne eigenen Namen) heisst wie
    das Gerät. Ohne Eintrag in der Registry und bei Entitäten, die ihren vollen Namen selbst tragen (has_entity_name aus, ältere
    Integrationen), gilt in beiden Fällen der Anzeigename von Home Assistant: dort gibt es nichts zusammenzusetzen.
    """
    state = hass.states.get(entity_id)
    fallback = state.name if state else entity_id
    reg = er.async_get(hass).async_get(entity_id)
    if reg is None or not getattr(reg, "has_entity_name", False):
        return fallback
    device = dr.async_get(hass).async_get(reg.device_id) if reg.device_id else None
    device_name = str(device.name_by_user or device.name or "") if device else ""
    own = str(reg.name or reg.original_name or "")
    if not own:
        return device_name or fallback
    settings = hass.data.get(DATA_SETTINGS)
    with_device = settings.names_with_device if settings is not None else True
    if not with_device or not device_name or device_name.casefold() in own.casefold():
        return own
    return f"{device_name}{NAME_SEPARATOR}{own}"
