"""Einrichtung und Optionen."""

from __future__ import annotations

from homeassistant import config_entries
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType

from custom_components.alarmageddon.code import verify_code
from custom_components.alarmageddon.const import DOMAIN

from .conftest import FRONT_DOOR, MOTION, WINDOW, setup_alarm


async def _create(hass: HomeAssistant, **data):
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": config_entries.SOURCE_USER})
    assert result["type"] is FlowResultType.FORM
    return await hass.config_entries.flow.async_configure(result["flow_id"], data)


async def test_create_alarm_system(hass: HomeAssistant) -> None:
    result = await _create(hass, name="Haus", night_enabled=True, code="2468")
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "Haus"
    options = result["options"]
    assert options["night_enabled"] is True
    # Code nur als Hash, nie im Klartext
    assert "2468" not in str(result["data"]) + str(options)
    assert verify_code("2468", options["code_hash"], options["code_salt"])
    await hass.async_block_till_done()
    assert hass.states.get("alarm_control_panel.haus") is not None


async def test_several_entries_but_unique_names(hass: HomeAssistant) -> None:
    assert (await _create(hass, name="Haus"))["type"] is FlowResultType.CREATE_ENTRY
    assert (await _create(hass, name="Garage"))["type"] is FlowResultType.CREATE_ENTRY
    result = await _create(hass, name="Haus")
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "already_configured"


async def test_invalid_code(hass: HomeAssistant) -> None:
    result = await _create(hass, name="Haus", code="12a")
    assert result["errors"] == {"code": "invalid_code_format"}


def _sections(**changes):
    data = {
        "zones": {"zone_home": [FRONT_DOOR, WINDOW], "zone_away": [FRONT_DOOR, WINDOW, MOTION], "zone_night": []},
        "delays": {
            "exit_delay_home": 0.0,
            "exit_delay_away": 45.0,
            "exit_delay_night": 0.0,
            "entry_delay": 25.0,
            "entry_sensors": [FRONT_DOOR],
        },
        "behaviour": {"night_enabled": False, "open_sensors": "bypass", "code_arm_required": False},
        "code_section": {"remove_code": False},
    }
    for key, value in changes.items():
        data[key] = {**data[key], **value}
    return data


async def test_options(hass: HomeAssistant) -> None:
    entry = await setup_alarm(hass)
    result = await hass.config_entries.options.async_init(entry.entry_id)
    assert result["type"] is FlowResultType.FORM
    result = await hass.config_entries.options.async_configure(result["flow_id"], _sections())
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert entry.options["zone_away"] == [FRONT_DOOR, WINDOW, MOTION]
    # Ganze Zahlen, wie später das Panel sie schreibt
    assert entry.options["exit_delay_away"] == 45 and isinstance(entry.options["exit_delay_away"], int)
    assert entry.options["open_sensors"] == "bypass"


async def test_options_entry_sensor_must_be_in_zone(hass: HomeAssistant) -> None:
    entry = await setup_alarm(hass)
    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], _sections(delays={"entry_sensors": [MOTION]}, zones={"zone_away": [FRONT_DOOR]})
    )
    assert result["errors"] == {"base": "entry_not_in_zone"}


async def test_options_set_and_remove_code(hass: HomeAssistant) -> None:
    entry = await setup_alarm(hass)
    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], _sections(code_section={"code": "13579"})
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert verify_code("13579", entry.options["code_hash"], entry.options["code_salt"])
    await hass.async_block_till_done()

    # Leeres Feld behält den Code
    result = await hass.config_entries.options.async_init(entry.entry_id)
    await hass.config_entries.options.async_configure(result["flow_id"], _sections())
    await hass.async_block_till_done()
    assert verify_code("13579", entry.options["code_hash"], entry.options["code_salt"])

    result = await hass.config_entries.options.async_init(entry.entry_id)
    await hass.config_entries.options.async_configure(result["flow_id"], _sections(code_section={"remove_code": True}))
    await hass.async_block_till_done()
    assert "code_hash" not in entry.options


async def test_options_arm_code_needs_code(hass: HomeAssistant) -> None:
    entry = await setup_alarm(hass)
    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(
        result["flow_id"], _sections(behaviour={"code_arm_required": True})
    )
    assert result["errors"] == {"base": "code_missing"}
