"""1.31.0: Anlage im Panel hinzufügen (Befehle create_system und preview_system), mit Vorschau der Entitäts-ID."""

from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant

from custom_components.alarmageddon.const import DOMAIN

from .conftest import setup_alarm

_ids = iter(range(1, 1000))


async def _ws(client, **msg: Any) -> dict[str, Any]:
    await client.send_json({"id": next(_ids), **msg})
    return await client.receive_json()


def _titles(hass: HomeAssistant) -> list[str]:
    return sorted(e.title for e in hass.config_entries.async_entries(DOMAIN))


async def test_create_system_from_the_panel(hass: HomeAssistant, hass_ws_client) -> None:
    await setup_alarm(hass)
    client = await hass_ws_client(hass)
    result = await _ws(client, type=f"{DOMAIN}/create_system", name="  Garage   Nord ")
    assert result["success"], result
    entry = hass.config_entries.async_get_entry(result["result"]["entry_id"])
    assert entry is not None and entry.domain == DOMAIN
    # Name ohne doppelte Leerzeichen, wie beim Umbenennen
    assert entry.title == "Garage Nord" and entry.data["name"] == "Garage Nord"
    await hass.async_block_till_done()
    assert hass.states.get("alarm_control_panel.garage_nord") is not None
    # Standardwerte wie in der Einrichtung von Home Assistant: kein Code, Nacht aus, noch keine Sensoren
    assert not entry.options.get("code_hash") and entry.options["night_enabled"] is False
    assert entry.options["zone_home"] == [] and entry.options["zone_away"] == []
    # Die erste Anlage ist unberührt
    assert hass.states.get("alarm_control_panel.haus") is not None and _titles(hass) == ["Garage Nord", "Haus"]


async def test_create_system_rejects_empty_and_taken_names(hass: HomeAssistant, hass_ws_client) -> None:
    await setup_alarm(hass)
    client = await hass_ws_client(hass)
    for name, code in (("", "name_required"), ("   ", "name_required"), ("Haus", "name_taken"), (" haus ", "name_taken"), ("HAUS", "name_taken")):
        result = await _ws(client, type=f"{DOMAIN}/create_system", name=name)
        assert result["success"] is False and result["error"]["code"] == code, (name, result)
    assert _titles(hass) == ["Haus"]
    # Zu langer Name: vom Schema abgelehnt, wie beim Umbenennen
    result = await _ws(client, type=f"{DOMAIN}/create_system", name="x" * 61)
    assert result["success"] is False and _titles(hass) == ["Haus"]


async def test_preview_names_the_entity_before_anything_is_created(hass: HomeAssistant, hass_ws_client) -> None:
    await setup_alarm(hass)
    client = await hass_ws_client(hass)
    result = await _ws(client, type=f"{DOMAIN}/preview_system", name=" Ferien  Haus ")
    assert result["success"], result
    assert result["result"] == {"name": "Ferien Haus", "error": None, "alarm_entity_id": "alarm_control_panel.ferien_haus"}
    # Nur eine Vorschau: es entsteht nichts
    assert _titles(hass) == ["Haus"] and hass.states.get("alarm_control_panel.ferien_haus") is None
    # Umlaute wie in Home Assistant (die Vorschau rechnet auf dem Server, nicht im Panel)
    result = await _ws(client, type=f"{DOMAIN}/preview_system", name="Küche Süd")
    assert result["result"]["alarm_entity_id"] == "alarm_control_panel.kuche_sud"


async def test_preview_reports_problems_without_failing(hass: HomeAssistant, hass_ws_client) -> None:
    await setup_alarm(hass)
    client = await hass_ws_client(hass)
    for name, error in (("", "name_required"), ("Haus", "name_taken"), ("haus", "name_taken")):
        result = await _ws(client, type=f"{DOMAIN}/preview_system", name=name)
        assert result["success"] and result["result"]["error"] == error and result["result"]["alarm_entity_id"] is None, (name, result)
    # Ein Name, dessen ID schon belegt ist (andere Entität heisst so): die Vorschau zeigt die ID, die Home Assistant wirklich vergibt
    from homeassistant.helpers import entity_registry as er
    er.async_get(hass).async_get_or_create("alarm_control_panel", "fremd", "x", suggested_object_id="garage")
    result = await _ws(client, type=f"{DOMAIN}/preview_system", name="Garage")
    assert result["result"]["error"] is None and result["result"]["alarm_entity_id"] == "alarm_control_panel.garage_2"


async def test_created_system_is_independent(hass: HomeAssistant, hass_ws_client) -> None:
    """Zwei Anlagen: die neue hat eigenes Gerät und eigene Entität, die erste bleibt unverändert."""
    first = await setup_alarm(hass)
    client = await hass_ws_client(hass)
    result = await _ws(client, type=f"{DOMAIN}/create_system", name="Garage")
    assert result["success"]
    await hass.async_block_till_done()
    second = hass.config_entries.async_get_entry(result["result"]["entry_id"])
    assert second.entry_id != first.entry_id
    assert first.options["zone_home"] and not second.options["zone_home"]
    assert hass.states.get("alarm_control_panel.garage").state == "disarmed"
