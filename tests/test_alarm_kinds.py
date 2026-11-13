"""1.28.0: Platzhalter {type}, {area}, {alarm} und Standardtexte je Alarmart (Rauch, Wasser, Gas, Hitze)."""

from __future__ import annotations

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import async_mock_service

from custom_components.alarmageddon.notify import ALARM_KINDS, PLACEHOLDER, SPECIAL_KINDS, TEXTS, alarm_kind

from .conftest import WINDOW, setup_alarm
from .test_actions import _notify_settings
from .test_alarm import call
from .test_sensor_options import open_sensor

SENSORS = {
    "smoke": "binary_sensor.rauch_bad",
    "moisture": "binary_sensor.wasser_keller",
    "gas": "binary_sensor.gas_kueche",
    "carbon_monoxide": "binary_sensor.co_flur",
    "heat": "binary_sensor.hitze_garage",
}


def test_every_kind_has_texts_in_both_languages() -> None:
    kinds = set(ALARM_KINDS.values()) | {"alarm"}
    for lang in ("en", "de"):
        for kind in kinds:
            assert f"alarm_{kind}" in TEXTS[lang]
        for kind in SPECIAL_KINDS:
            assert f"triggered_title_{kind}" in TEXTS[lang] and f"triggered_{kind}" in TEXTS[lang]
        for device_class in ALARM_KINDS:
            assert f"sensor_type_{device_class}" in TEXTS[lang]
    assert set(TEXTS["en"]) == set(TEXTS["de"])


def test_alarm_kind_mapping() -> None:
    assert [alarm_kind(c) for c in ("smoke", "heat", "moisture", "gas", "carbon_monoxide", "door", "motion", "")] == [
        "fire", "heat", "water", "gas", "gas", "intrusion", "intrusion", "alarm"]
    assert alarm_kind("battery") == "alarm"


async def _arm_and_trigger(hass: HomeAssistant, entity: str) -> None:
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, entity)
    await hass.async_block_till_done()


@pytest.mark.parametrize(("device_class", "title", "message"), [
    ("smoke", "🔥 Feueralarm: Haus", "meldet Rauch um"),
    ("moisture", "💧 Wasseralarm: Haus", "meldet Wasser um"),
    ("gas", "⚠️ Gasalarm: Haus", "meldet Gas um"),
    ("carbon_monoxide", "⚠️ Gasalarm: Haus", "meldet Gas um"),
    ("heat", "🌡️ Hitzealarm: Haus", "meldet Hitze um"),
])
async def test_special_default_texts_german(hass: HomeAssistant, hass_ws_client, device_class: str, title: str, message: str) -> None:
    hass.config.language = "de"
    entity = SENSORS[device_class]
    hass.states.async_set(entity, "off", {"device_class": device_class})
    pushes = async_mock_service(hass, "notify", "handy")
    await setup_alarm(hass, zone_home=[entity], workflows={"home": [{"type": "notify"}]})
    await _notify_settings(hass, hass_ws_client)
    await _arm_and_trigger(hass, entity)
    assert pushes[-1].data["title"] == title
    assert message in pushes[-1].data["message"]


async def test_special_default_texts_english_and_unknown_language(hass: HomeAssistant, hass_ws_client) -> None:
    hass.config.language = "fr"
    entity = SENSORS["smoke"]
    hass.states.async_set(entity, "off", {"device_class": "smoke"})
    pushes = async_mock_service(hass, "notify", "handy")
    await setup_alarm(hass, zone_home=[entity], workflows={"home": [{"type": "notify"}]})
    await _notify_settings(hass, hass_ws_client)
    await _arm_and_trigger(hass, entity)
    assert pushes[-1].data["title"] == "🔥 Fire alarm: Haus"
    assert "detected smoke at" in pushes[-1].data["message"]


async def test_door_window_motion_keep_the_old_default(hass: HomeAssistant, hass_ws_client) -> None:
    hass.config.language = "de"
    hass.states.async_set(WINDOW, "off", {"device_class": "window"})
    pushes = async_mock_service(hass, "notify", "handy")
    await setup_alarm(hass, workflows={"home": [{"type": "notify"}]})
    await _notify_settings(hass, hass_ws_client)
    await _arm_and_trigger(hass, WINDOW)
    assert pushes[-1].data["title"] == TEXTS["de"]["triggered_title"].format(name="Haus")
    assert pushes[-1].data["message"].startswith(TEXTS["de"]["triggered"].split("{sensor}")[0] + hass.states.get(WINDOW).name)


async def test_custom_text_overrides_special_default(hass: HomeAssistant, hass_ws_client) -> None:
    entity = SENSORS["smoke"]
    hass.states.async_set(entity, "off", {"device_class": "smoke"})
    pushes = async_mock_service(hass, "notify", "handy")
    await setup_alarm(hass, zone_home=[entity], workflows={"home": [{"type": "notify", "title": "Eigen {name}", "message": "Eigener Text"}]})
    await _notify_settings(hass, hass_ws_client)
    await _arm_and_trigger(hass, entity)
    assert pushes[-1].data["title"] == "Eigen Haus" and pushes[-1].data["message"] == "Eigener Text"


async def test_placeholders_type_area_alarm(hass: HomeAssistant, hass_ws_client) -> None:
    hass.config.language = "de"
    area = ar.async_get(hass).async_create("Badezimmer")
    reg = er.async_get(hass)
    entity = reg.async_get_or_create("binary_sensor", "test", "rauch1", suggested_object_id="rauch_bad", original_device_class="smoke").entity_id
    reg.async_update_entity(entity, area_id=area.id)
    hass.states.async_set(entity, "off", {"device_class": "smoke"})
    pushes = async_mock_service(hass, "notify", "handy")
    await setup_alarm(hass, zone_home=[entity], workflows={"home": [{"type": "notify", "title": "{alarm}!", "message": "{type} im {area}: {sensor} {unbekannt}"}]})
    await _notify_settings(hass, hass_ws_client)
    await _arm_and_trigger(hass, entity)
    assert pushes[-1].data["title"] == "Feueralarm!"
    assert pushes[-1].data["message"].startswith("Rauchmelder im Badezimmer: ") and pushes[-1].data["message"].endswith("{unbekannt}")


async def test_area_falls_back_to_device_area(hass: HomeAssistant, hass_ws_client) -> None:
    from homeassistant.helpers import device_registry as dr
    from pytest_homeassistant_custom_component.common import MockConfigEntry
    from custom_components.alarmageddon.devices import sensor_info

    area = ar.async_get(hass).async_create("Keller")
    cfg = MockConfigEntry(domain="test")
    cfg.add_to_hass(hass)
    device = dr.async_get(hass).async_get_or_create(config_entry_id=cfg.entry_id, identifiers={("test", "d1")})
    dr.async_get(hass).async_update_device(device.id, area_id=area.id)
    entity = er.async_get(hass).async_get_or_create("binary_sensor", "test", "w1", suggested_object_id="wasser_keller", device_id=device.id).entity_id
    hass.states.async_set(entity, "off", {"device_class": "moisture"})
    assert sensor_info(hass, entity) == ("moisture", "Keller")
    assert sensor_info(hass, None) == ("", "")
    assert sensor_info(hass, "binary_sensor.gibt_es_nicht") == ("", "")


async def test_manual_trigger_has_neutral_placeholders(hass: HomeAssistant, hass_ws_client) -> None:
    hass.config.language = "de"
    pushes = async_mock_service(hass, "notify", "handy")
    await setup_alarm(hass, workflows={"home": [{"type": "notify", "title": "{alarm}|{type}|{area}", "message": "x"}]})
    await _notify_settings(hass, hass_ws_client)
    await call(hass, "alarm_arm_home")
    await call(hass, "alarm_trigger")
    await hass.async_block_till_done()
    assert pushes[-1].data["title"] == "Alarm||"


async def test_alarm_end_message_uses_the_new_placeholders(hass: HomeAssistant, hass_ws_client) -> None:
    hass.config.language = "de"
    entity = SENSORS["moisture"]
    hass.states.async_set(entity, "off", {"device_class": "moisture"})
    pushes = async_mock_service(hass, "notify", "handy")
    end = {"enabled": True, "title": "{alarm} vorbei", "message": "{type}: {sensor}"}
    await setup_alarm(hass, zone_home=[entity], workflow_end={"home": {"notify": end}})
    await _notify_settings(hass, hass_ws_client)
    await _arm_and_trigger(hass, entity)
    pushes.clear()
    await call(hass, "alarm_disarm")
    await hass.async_block_till_done()
    assert pushes and pushes[-1].data["title"] == "Wasseralarm vorbei" and pushes[-1].data["message"].startswith("Wassersensor: ")


def test_panel_and_server_agree() -> None:
    """Die Vorschau im Panel rechnet wie der Server: gleiche Zuordnung der Alarmart, gleiche Wörter für Art und Alarmart."""
    import pathlib
    import re

    panel = pathlib.Path(__file__).parents[1] / "custom_components" / "alarmageddon" / "panel"
    actions = (panel / "actions.js").read_text(encoding="utf-8")
    block = actions[actions.index("export const ALARM_KINDS"):]
    block = block[:block.index("};")]
    assert dict(re.findall(r"(\w+): \"(\w+)\"", block)) == ALARM_KINDS
    tokens = re.search(r"NOTIFY_TOKENS = \[(.*?)\]", actions).group(1)
    names = ["name", "sensor", "type", "area", "time", "mode", "alarm"]
    assert re.findall(r"\{(\w+)\}", tokens) == names
    # Server und Vorschau ersetzen genau diese sieben, in einem Durchgang (ein eingesetzter Wert wird nie noch einmal ersetzt)
    assert re.search(r"\(\?:([a-z|]+)\)", PLACEHOLDER.pattern).group(1).split("|") == names
    assert re.search(r"text\.replace\(/\\\{\(\?:([a-z|]+)\)\\\}/g", actions).group(1).split("|") == names
    strings = (panel / "strings.js").read_text(encoding="utf-8")
    en, de = strings.split("\n  de: {", 1)
    for lang, part in (("en", en), ("de", de)):
        for key, value in re.findall(r'\n    ntType_(\w+): "([^"]*)"', part):
            assert TEXTS[lang][f"sensor_type_{key}"] == value, (lang, key)
        for key, value in re.findall(r'\n    ntAlarm_(\w+): "([^"]*)"', part):
            assert TEXTS[lang][f"alarm_{key}"] == value, (lang, key)
        assert len(re.findall(r"\n    ntType_", part)) == sum(1 for k in TEXTS[lang] if k.startswith("sensor_type_"))
        assert len(re.findall(r"\n    ntAlarm_", part)) == sum(1 for k in TEXTS[lang] if k.startswith("alarm_"))
