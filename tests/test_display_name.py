"""
Name eines Sensors, überall gleich (Panel, Protokoll, Meldungen). Der Nutzer wählt in der Ansicht (1.12.0): "Gerät - Sensor"
(Standard) oder nur der Name des Sensors.
"""

from __future__ import annotations

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry, async_mock_service

from custom_components.alarmageddon.devices import display_name
from custom_components.alarmageddon.settings import async_get_settings

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


DEVICE = "Aqara FP400 Anwesenheitssensor Wohnzimmer"


async def _only_sensor_names(hass: HomeAssistant) -> None:
    await (await async_get_settings(hass)).async_set_names_with_device(False)


async def test_standard_is_device_and_sensor_with_a_hyphen(hass: HomeAssistant) -> None:
    """Standard: "Gerät - Sensor", ob der Nutzer die Entität selbst benannt hat oder sie den Namen der Integration trägt."""
    await async_get_settings(hass)
    named = _entity(hass, entity_name="Wohnzimmer Belegung", original="Belegung")
    assert hass.states.get(named).name == f"{DEVICE} Wohnzimmer Belegung"  # so setzt es Home Assistant zusammen (ohne Trennung)
    assert display_name(hass, named) == f"{DEVICE} - Wohnzimmer Belegung"


async def test_standard_for_a_sensor_that_was_not_renamed(hass: HomeAssistant) -> None:
    await async_get_settings(hass)
    assert display_name(hass, _entity(hass, entity_name=None, original="Belegung")) == f"{DEVICE} - Belegung"


async def test_switched_off_only_the_sensor_name(hass: HomeAssistant) -> None:
    """Ausgeschaltet: nur der eigene Name der Entität, der selbst vergebene vor dem der Integration."""
    await _only_sensor_names(hass)
    entity = _entity(hass, entity_name="Wohnzimmer Belegung", original="Belegung")
    assert display_name(hass, entity) == "Wohnzimmer Belegung"
    er.async_get(hass).async_update_entity(entity, name=None)
    assert display_name(hass, entity) == "Belegung"


async def test_the_device_name_is_not_repeated(hass: HomeAssistant) -> None:
    """Steht der Name des Geräts schon im Namen des Sensors, wird er nicht noch einmal davorgesetzt (Gross- und Kleinschreibung egal)."""
    await async_get_settings(hass)
    assert display_name(hass, _entity(hass, entity_name="fenster büro Kontakt", original="Kontakt", device="Fenster Büro")) == "fenster büro Kontakt"


async def test_sensors_of_the_same_kind_are_distinguishable_by_default(hass: HomeAssistant) -> None:
    """
    Zwei Bewegungsmelder derselben Integration heissen von sich aus beide "Bewegung". Mit dem Standard sind sie in Liste, Protokoll
    und Alarmmeldung zu unterscheiden; nur der Name des Sensors ist die bewusste Wahl des Nutzers.
    """
    await async_get_settings(hass)
    config = MockConfigEntry(domain="hue")
    config.add_to_hass(hass)
    names = {}
    for key, device in (("gang", "Hue Motion Gang UG"), ("keller", "Hue Motion Keller")):
        device_id = dr.async_get(hass).async_get_or_create(config_entry_id=config.entry_id, identifiers={("hue", key)}, name=device).id
        reg = er.async_get(hass).async_get_or_create("binary_sensor", "hue", f"{key}_motion", device_id=device_id, has_entity_name=True, original_name="Bewegung")
        hass.states.async_set(reg.entity_id, "off", {"friendly_name": f"{device} Bewegung"})
        names[key] = reg.entity_id
    assert [display_name(hass, names[k]) for k in ("gang", "keller")] == ["Hue Motion Gang UG - Bewegung", "Hue Motion Keller - Bewegung"]
    await _only_sensor_names(hass)
    assert [display_name(hass, names[k]) for k in ("gang", "keller")] == ["Bewegung", "Bewegung"]


@pytest.mark.parametrize("with_device", [True, False])
async def test_main_entity_without_own_name_is_called_like_the_device(hass: HomeAssistant, with_device: bool) -> None:
    """Die Hauptentität eines Geräts hat keinen eigenen Namen: sie heisst wie das Gerät (auch wie es der Nutzer umbenannt hat), in beiden Fällen."""
    await (await async_get_settings(hass)).async_set_names_with_device(with_device)
    entity = _entity(hass, entity_name=None, original=None)
    assert display_name(hass, entity) == DEVICE
    device_reg = dr.async_get(hass)
    device_reg.async_update_device(er.async_get(hass).async_get(entity).device_id, name_by_user="Anwesenheit Wohnzimmer")
    assert display_name(hass, entity) == "Anwesenheit Wohnzimmer"


@pytest.mark.parametrize("with_device", [True, False])
async def test_entity_that_carries_its_full_name_keeps_it(hass: HomeAssistant, with_device: bool) -> None:
    """has_entity_name aus (ältere Integrationen): der Name der Entität ist schon der volle Name, es gibt nichts zusammenzusetzen."""
    await (await async_get_settings(hass)).async_set_names_with_device(with_device)
    entity = _entity(hass, entity_name="Fenster Küche", has_entity_name=False)
    assert display_name(hass, entity) == hass.states.get(entity).name == "Fenster Küche"


@pytest.mark.parametrize("entity", ["binary_sensor.gibt_es_nicht", "binary_sensor.ohne_registry"])
def test_without_registry_entry_the_display_name_of_home_assistant(hass: HomeAssistant, entity: str) -> None:
    if entity.endswith("ohne_registry"):
        hass.states.async_set(entity, "off", {"friendly_name": "Sensor ohne Eintrag"})
    assert display_name(hass, entity) == ("Sensor ohne Eintrag" if entity.endswith("ohne_registry") else entity)


async def test_setting_is_saved_by_the_panel_and_changes_panel_and_messages_alike(hass: HomeAssistant, hass_ws_client, hass_storage) -> None:
    """Der Schalter der Ansicht speichert auf dem Server: Liste des Panels und Push-Meldung nennen danach denselben Namen."""
    entity = _entity(hass, entity_name="Wohnzimmer Belegung", original="Belegung")
    pushes = async_mock_service(hass, "notify", "handy")
    await setup_alarm(hass, zone_home=[entity], zone_away=[entity], entry_sensors=[], sensors=[entity])
    await _notify_settings(hass, hass_ws_client)
    client = await hass_ws_client(hass)

    async def data() -> dict:
        await client.send_json_auto_id({"type": "alarmageddon/data"})
        return (await client.receive_json())["result"]

    first = await data()
    assert first["display"] == {"names_with_device": True}
    assert first["sensors"][entity]["name"] == f"{DEVICE} - Wohnzimmer Belegung" and first["sensors"][entity]["device_name"] == DEVICE
    await client.send_json_auto_id({"type": "alarmageddon/save_display", "names_with_device": False})
    assert (await client.receive_json())["result"] == {"display": {"names_with_device": False}}
    await hass.async_block_till_done()
    second = await data()
    assert second["display"] == {"names_with_device": False} and second["sensors"][entity]["name"] == "Wohnzimmer Belegung"
    assert hass_storage["alarmageddon.settings"]["data"]["names_with_device"] is False
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, entity)
    await hass.async_block_till_done()
    assert "Wohnzimmer Belegung" in pushes[-1].data["message"] and "Aqara" not in pushes[-1].data["message"]
    await call(hass, "alarm_disarm")
    hass.states.async_set(entity, "off")
    await client.send_json_auto_id({"type": "alarmageddon/save_display", "names_with_device": True})
    assert (await client.receive_json())["success"]
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, entity)
    await hass.async_block_till_done()
    assert f"{DEVICE} - Wohnzimmer Belegung" in pushes[-1].data["message"]


async def test_setting_is_part_of_the_backup(hass: HomeAssistant, hass_ws_client) -> None:
    """Die Wahl steht in der Sicherung und kommt beim Einspielen zurück; eine ältere Sicherung ohne sie lässt die Einstellung, wie sie ist."""
    await setup_alarm(hass)
    client = await hass_ws_client(hass)
    await _only_sensor_names(hass)
    await client.send_json_auto_id({"type": "alarmageddon/export"})
    backup = (await client.receive_json())["result"]
    assert backup["settings"]["names_with_device"] is False
    settings = await async_get_settings(hass)
    await settings.async_set_names_with_device(True)
    await client.send_json_auto_id({"type": "alarmageddon/import", "data": backup})
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    assert settings.names_with_device is False
    older = {**backup, "settings": {k: v for k, v in backup["settings"].items() if k != "names_with_device"}}
    await settings.async_set_names_with_device(True)
    await client.send_json_auto_id({"type": "alarmageddon/import", "data": older})
    assert (await client.receive_json())["success"]
    assert settings.names_with_device is True
