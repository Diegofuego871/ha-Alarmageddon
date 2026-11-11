"""Name eines Sensors überall gleich: der eigene Name der Entität, ohne den Namen des Geräts davor (Panel, Meldungen, Fehlertexte)."""

from __future__ import annotations

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry, async_mock_service

from custom_components.alarmageddon.devices import display_name

from .conftest import setup_alarm
from .test_actions import _notify_settings
from .test_alarm import call
from .test_sensor_options import open_sensor

PRESENCE = "binary_sensor.wohnzimmer_aqara_fp400_anwesenheit"


def _entity(hass: HomeAssistant, *, entity_name: str | None, original: str | None = None, has_entity_name: bool = True, device: str | None = "Aqara FP400 Anwesenheitssensor Wohnzimmer") -> str:
    """Entität mit Gerät wie bei einer echten Integration. Der Anzeigename von HA setzt Gerät und Entität zusammen."""
    config = MockConfigEntry(domain="test")
    config.add_to_hass(hass)
    device_id = dr.async_get(hass).async_get_or_create(config_entry_id=config.entry_id, identifiers={("test", "fp400")}, name=device).id if device else None
    reg = er.async_get(hass).async_get_or_create(
        "binary_sensor", "test", "fp400_presence", device_id=device_id, has_entity_name=has_entity_name,
        original_name=original, suggested_object_id="wohnzimmer_aqara_fp400_anwesenheit",
    )
    if entity_name is not None:
        er.async_get(hass).async_update_entity(reg.entity_id, name=entity_name)
    full = f"{device} {entity_name or original}" if has_entity_name and device and (entity_name or original) else (entity_name or original or device or reg.entity_id)
    hass.states.async_set(reg.entity_id, "off", {"friendly_name": full})
    return reg.entity_id


def test_entity_name_without_the_device_name(hass: HomeAssistant) -> None:
    """Der Fall des Nutzers: Entität "Wohnzimmer Belegung" am umbenannten Gerät: nur "Wohnzimmer Belegung"."""
    entity = _entity(hass, entity_name="Wohnzimmer Belegung", original="Belegung")
    assert hass.states.get(entity).name == "Aqara FP400 Anwesenheitssensor Wohnzimmer Wohnzimmer Belegung"  # so setzt es Home Assistant zusammen
    assert display_name(hass, entity) == "Wohnzimmer Belegung"


def test_original_name_when_not_renamed(hass: HomeAssistant) -> None:
    assert display_name(hass, _entity(hass, entity_name=None, original="Belegung")) == "Belegung"


def test_main_entity_without_own_name_is_called_like_the_device(hass: HomeAssistant) -> None:
    entity = _entity(hass, entity_name=None, original=None)
    assert display_name(hass, entity) == "Aqara FP400 Anwesenheitssensor Wohnzimmer"


def test_device_renamed_by_the_user_is_used_for_the_main_entity(hass: HomeAssistant) -> None:
    entity = _entity(hass, entity_name=None, original=None)
    device_reg = dr.async_get(hass)
    device = device_reg.async_get(er.async_get(hass).async_get(entity).device_id)
    device_reg.async_update_device(device.id, name_by_user="Anwesenheit Wohnzimmer")
    assert display_name(hass, entity) == "Anwesenheit Wohnzimmer"


def test_entity_that_carries_its_full_name_keeps_it(hass: HomeAssistant) -> None:
    """has_entity_name aus: der Name der Entität ist schon der volle Name (alte Integrationen)."""
    entity = _entity(hass, entity_name="Fenster Küche", has_entity_name=False)
    assert display_name(hass, entity) == hass.states.get(entity).name == "Fenster Küche"


@pytest.mark.parametrize("entity", ["binary_sensor.gibt_es_nicht", "binary_sensor.ohne_registry"])
def test_without_registry_entry_the_display_name_of_home_assistant(hass: HomeAssistant, entity: str) -> None:
    if entity.endswith("ohne_registry"):
        hass.states.async_set(entity, "off", {"friendly_name": "Sensor ohne Eintrag"})
    assert display_name(hass, entity) == ("Sensor ohne Eintrag" if entity.endswith("ohne_registry") else entity)


async def test_panel_data_and_messages_use_the_same_name(hass: HomeAssistant, hass_ws_client) -> None:
    entity = _entity(hass, entity_name="Wohnzimmer Belegung", original="Belegung")
    pushes = async_mock_service(hass, "notify", "handy")
    entry = await setup_alarm(hass, zone_home=[entity], zone_away=[entity], entry_sensors=[], sensors=[entity])
    await _notify_settings(hass, hass_ws_client)
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "alarmageddon/data"})
    info = (await client.receive_json())["result"]["sensors"][entity]
    assert info["name"] == "Wohnzimmer Belegung" and info["device_name"] == "Aqara FP400 Anwesenheitssensor Wohnzimmer"
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, entity)
    await hass.async_block_till_done()
    assert "Wohnzimmer Belegung" in pushes[-1].data["message"] and "Anwesenheitssensor" not in pushes[-1].data["message"]
    del entry
