"""Anlagen anlegen (aus dem Panel und beim Wiederherstellen): Name prüfen und die Einrichtung von Home Assistant durchlaufen."""

from __future__ import annotations

from homeassistant.config_entries import SOURCE_USER, ConfigEntry
from homeassistant.const import CONF_NAME
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType

from .const import DOMAIN


def new_system_name(hass: HomeAssistant, raw: str, also_taken: set[str] | None = None) -> tuple[str, str | None]:
    """
    Name einer neuen Anlage ohne doppelte Leerzeichen und der Fehler dazu: leer ("name_required") oder schon vergeben ("name_taken";
    Gross-/Kleinschreibung zählt nicht). `also_taken` sind Namen (klein geschrieben), die in derselben Runde schon vergeben wurden.
    """
    name = " ".join(raw.split())
    if not name:
        return name, "name_required"
    if name.casefold() in (also_taken or set()) or any(e.title.casefold() == name.casefold() for e in hass.config_entries.async_entries(DOMAIN)):
        return name, "name_taken"
    return name, None


async def async_create_system(hass: HomeAssistant, name: str) -> ConfigEntry | None:
    """Legt eine Anlage über dieselbe Einrichtung wie in Home Assistant an (Standardwerte: kein Code, Nacht aus, noch keine Sensoren)."""
    flow = hass.config_entries.flow
    result = await flow.async_init(DOMAIN, context={"source": SOURCE_USER})
    if result["type"] is FlowResultType.FORM:
        result = await flow.async_configure(result["flow_id"], {CONF_NAME: name})
    if result["type"] is not FlowResultType.CREATE_ENTRY:
        return None
    await hass.async_block_till_done()
    return result["result"]
