"""Wartung (0.5.0): Batterie schwach und nicht erreichbar, einmal gemeldet, gesammelt, an die Wartungs-Empfänger."""

from __future__ import annotations

from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry, async_mock_service

from custom_components.alarmageddon.const import DATA_MAINTENANCE, DATA_SETTINGS

from .conftest import FRONT_DOOR, MOTION, WINDOW, setup_alarm
from .test_alarm import advance

BAT_WINDOW = "sensor.fenster_kueche_batterie"
BAT_MOTION = "sensor.bewegung_flur_batterie"


def _device(hass: HomeAssistant, sensor: str, battery: str) -> None:
    """Sensor und Batteriesensor am selben Gerät, wie es jede Integration anlegt."""
    entry = MockConfigEntry(domain="test")
    entry.add_to_hass(hass)
    device = dr.async_get(hass).async_get_or_create(config_entry_id=entry.entry_id, identifiers={("test", sensor)})
    reg = er.async_get(hass)
    domain, object_id = sensor.split(".")
    reg.async_get_or_create(domain, "test", object_id, device_id=device.id, suggested_object_id=object_id)
    reg.async_get_or_create("sensor", "test", f"{object_id}_bat", device_id=device.id, original_device_class="battery", suggested_object_id=battery.split(".")[1])


async def _setup(hass: HomeAssistant, targets=("notify.tablet",)):
    _device(hass, WINDOW, BAT_WINDOW)
    _device(hass, MOTION, BAT_MOTION)
    hass.states.async_set(BAT_WINDOW, "80")
    hass.states.async_set(BAT_MOTION, "75")
    pushes = async_mock_service(hass, "notify", "tablet")
    await setup_alarm(hass)
    settings = hass.data[DATA_SETTINGS]
    await settings.async_set_notify({**settings.notify, "maintenance_targets": list(targets)})
    return pushes, hass.data[DATA_MAINTENANCE]


async def test_low_battery_reported_once(hass: HomeAssistant) -> None:
    pushes, maint = await _setup(hass)
    hass.states.async_set(BAT_WINDOW, "12")
    found = maint.async_check()
    await hass.async_block_till_done()
    assert found == [("battery", WINDOW, 12)]
    assert len(pushes) == 1
    assert "12 %" in pushes[0].data["message"]
    assert pushes[0].data["data"]["tag"] == "alarmageddon_maintenance"
    # Nächste Prüfung: still
    assert maint.async_check() == []
    hass.states.async_set(BAT_WINDOW, "10")
    assert maint.async_check() == []
    await hass.async_block_till_done()
    assert len(pushes) == 1


async def test_battery_replaced_reports_again_later(hass: HomeAssistant) -> None:
    pushes, maint = await _setup(hass)
    hass.states.async_set(BAT_WINDOW, "12")
    maint.async_check()
    # Knapp über der Schwelle schwankt: noch nicht "gewechselt"
    hass.states.async_set(BAT_WINDOW, "22")
    maint.async_check()
    hass.states.async_set(BAT_WINDOW, "18")
    assert maint.async_check() == []
    # Gewechselt (deutlich über der Schwelle), später wieder schwach: neue Meldung
    hass.states.async_set(BAT_WINDOW, "100")
    maint.async_check()
    hass.states.async_set(BAT_WINDOW, "15")
    assert maint.async_check() == [("battery", WINDOW, 15)]


async def test_offline_after_minutes_and_collected(hass: HomeAssistant, freezer) -> None:
    pushes, maint = await _setup(hass)
    hass.states.async_set(BAT_WINDOW, "9")
    hass.states.async_set(FRONT_DOOR, "unavailable")
    # Erst nach der eingestellten Zeit (60 min) als Ausfall
    assert maint.async_check() == [("battery", WINDOW, 9)]
    # Die regelmässige Prüfung läuft beim Vorspulen mit; gezählt wird an den Meldungen
    await advance(hass, freezer, 61 * 60)
    maint.async_check()
    await hass.async_block_till_done()
    # Zwei Meldungen insgesamt: erst Batterie, dann Ausfall
    assert len(pushes) == 2
    assert "unreachable since" in pushes[1].data["message"]
    assert FRONT_DOOR in maint.reported["offline"]
    # Kommt zurück, fällt wieder aus: neue Meldung nach Ablauf
    hass.states.async_set(FRONT_DOOR, "off")
    maint.async_check()
    assert FRONT_DOOR not in maint.reported["offline"]
    hass.states.async_set(FRONT_DOOR, "unavailable")
    await advance(hass, freezer, 61 * 60)
    maint.async_check()
    await hass.async_block_till_done()
    assert len(pushes) == 3


async def test_several_problems_in_one_message(hass: HomeAssistant) -> None:
    pushes, maint = await _setup(hass)
    hass.states.async_set(BAT_WINDOW, "12")
    hass.states.async_set(BAT_MOTION, "8")
    maint.async_check()
    await hass.async_block_till_done()
    assert len(pushes) == 1
    assert pushes[0].data["title"] == "⚠️ Maintenance: 2 sensors"
    assert pushes[0].data["message"].count("\n") == 1


async def test_without_targets_reported_later(hass: HomeAssistant) -> None:
    """Ohne Empfänger wird nichts als gemeldet gemerkt: sobald es Empfänger gibt, kommt die Meldung."""
    pushes, maint = await _setup(hass, targets=())
    hass.states.async_set(BAT_WINDOW, "12")
    assert maint.async_check() == []
    settings = hass.data[DATA_SETTINGS]
    await settings.async_set_notify({**settings.notify, "maintenance_targets": ["notify.tablet"]})
    assert maint.async_check() == [("battery", WINDOW, 12)]


async def test_event_switched_off(hass: HomeAssistant) -> None:
    pushes, maint = await _setup(hass)
    settings = hass.data[DATA_SETTINGS]
    await settings.async_set_notify({**settings.notify, "types": {**settings.notify["types"], "battery_low": {**settings.notify["types"]["battery_low"], "enabled": False}}})
    hass.states.async_set(BAT_WINDOW, "12")
    assert maint.async_check() == []


async def test_threshold_setting(hass: HomeAssistant) -> None:
    pushes, maint = await _setup(hass)
    settings = hass.data[DATA_SETTINGS]
    await settings.async_set_notify({**settings.notify, "battery_threshold": 30})
    hass.states.async_set(BAT_WINDOW, "25")
    assert maint.async_check() == [("battery", WINDOW, 25)]


async def test_reported_survives_restart(hass: HomeAssistant) -> None:
    pushes, maint = await _setup(hass)
    hass.states.async_set(BAT_WINDOW, "12")
    maint.async_check()
    entry = hass.config_entries.async_entries("alarmageddon")[0]
    await hass.config_entries.async_unload(entry.entry_id)
    assert DATA_MAINTENANCE not in hass.data
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert hass.data[DATA_MAINTENANCE].async_check() == []


async def test_periodic_check_runs(hass: HomeAssistant, freezer) -> None:
    pushes, maint = await _setup(hass)
    hass.states.async_set(BAT_MOTION, "5")
    await advance(hass, freezer, 5 * 60 + 1)
    assert len(pushes) == 1


async def test_german_texts(hass: HomeAssistant) -> None:
    hass.config.language = "de-CH"
    pushes, maint = await _setup(hass)
    hass.states.async_set(BAT_WINDOW, "12")
    maint.async_check()
    await hass.async_block_till_done()
    assert pushes[0].data["title"].startswith("⚠️ Wartung: ")
    assert pushes[0].data["message"].endswith(": Batterie 12 %")
