"""Einstellungen je Modus (0.10.0): Eingangsverzögerung, Alarmdauer, offener Sensor, Bestätigungsfenster."""

from __future__ import annotations

from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.exceptions import ServiceValidationError
import pytest

from .conftest import ALARM, FRONT_DOOR, MOTION, WINDOW, setup_alarm
from .test_alarm import advance, call, state
from .test_config_flow import _sections
from .test_sensor_options import _classes, open_sensor

_id = iter(range(1, 1000))
MOTION2 = "binary_sensor.bewegung_wohnzimmer"


async def _ws(client, **msg):
    await client.send_json({"id": next(_id), **msg})
    return await client.receive_json()


async def test_entry_delay_differs_per_mode(hass: HomeAssistant, freezer) -> None:
    await setup_alarm(hass, entry_delay=60, entry_delay_home=5, entry_delay_away=40, exit_delay_away=0)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, FRONT_DOOR)
    assert state(hass) == AlarmControlPanelState.PENDING
    await advance(hass, freezer, 6)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    await call(hass, "alarm_disarm")
    await open_sensor(hass, FRONT_DOOR, "off")
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, FRONT_DOOR)
    await advance(hass, freezer, 6)
    assert state(hass) == AlarmControlPanelState.PENDING  # Abwesend: 40 s, nicht 5 s
    await advance(hass, freezer, 40)
    assert state(hass) == AlarmControlPanelState.TRIGGERED


async def test_disarm_during_mode_specific_delay(hass: HomeAssistant, freezer) -> None:
    """Pflichtfall: Deaktivieren während der Verzögerung gilt mit der Verzögerung des Modus."""
    await setup_alarm(hass, entry_delay_away=90, exit_delay_away=0)
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, FRONT_DOOR)
    await advance(hass, freezer, 30)
    await call(hass, "alarm_disarm")
    await advance(hass, freezer, 120)
    assert state(hass) == AlarmControlPanelState.DISARMED


async def test_alarm_duration_per_mode(hass: HomeAssistant, freezer) -> None:
    await setup_alarm(hass, trigger_time=300, trigger_time_home=30, trigger_time_away=0, exit_delay_away=0)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    await advance(hass, freezer, 31)
    assert state(hass) == AlarmControlPanelState.ARMED_HOME  # Anwesend: 30 s
    await call(hass, "alarm_disarm")
    await open_sensor(hass, WINDOW, "off")
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, WINDOW)
    await advance(hass, freezer, 1000)
    assert state(hass) == AlarmControlPanelState.TRIGGERED  # Abwesend: 0 = bis zum Deaktivieren


async def test_always_active_has_own_alarm_duration(hass: HomeAssistant, freezer) -> None:
    _classes(hass)
    await setup_alarm(hass, trigger_time=300, trigger_time_always=20, sensor_options={"binary_sensor.rauchmelder": {"always": True}})
    await open_sensor(hass, "binary_sensor.rauchmelder")
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    await advance(hass, freezer, 21)
    assert state(hass) == AlarmControlPanelState.DISARMED


async def test_open_sensor_behaviour_per_mode(hass: HomeAssistant) -> None:
    await setup_alarm(hass, open_sensors="block", open_sensors_home="bypass", exit_delay_away=0)
    await open_sensor(hass, WINDOW)
    await call(hass, "alarm_arm_home")  # Anwesend: umgehen
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    assert hass.states.get(ALARM).attributes["bypassed_sensors"] == [WINDOW]
    await call(hass, "alarm_disarm")
    with pytest.raises(ServiceValidationError):  # Abwesend: verhindern
        await call(hass, "alarm_arm_away")


async def test_confirm_window_per_mode(hass: HomeAssistant, freezer) -> None:
    _classes(hass)
    hass.states.async_set(MOTION2, "off", {"device_class": "motion"})
    await setup_alarm(hass, exit_delay_away=0, zone_away=[FRONT_DOOR, WINDOW, MOTION, MOTION2], confirm_window=300, confirm_window_away=10,
                      sensor_options={MOTION: {"confirm": True}, MOTION2: {"confirm": True}})
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, MOTION)
    await advance(hass, freezer, 20)
    await open_sensor(hass, MOTION2)
    assert state(hass) == AlarmControlPanelState.ARMED_AWAY  # Abwesend: Fenster nur 10 s


async def test_old_common_values_still_apply(hass: HomeAssistant, freezer) -> None:
    """Ohne Werte je Modus (Anlagen vor 0.10.0) gelten die gemeinsamen Werte für jeden Modus."""
    await setup_alarm(hass, entry_delay=15, trigger_time=40, exit_delay_away=0)
    for mode in ("alarm_arm_home", "alarm_arm_away"):
        await call(hass, mode)
        await open_sensor(hass, FRONT_DOOR)
        await advance(hass, freezer, 16)
        assert state(hass) == AlarmControlPanelState.TRIGGERED
        await advance(hass, freezer, 41)
        await call(hass, "alarm_disarm")
        await open_sensor(hass, FRONT_DOOR, "off")


async def test_restart_during_alarm_keeps_mode_duration(hass: HomeAssistant, freezer) -> None:
    """Pflichtfall: Neustart im Alarm; die Alarmdauer des Modus läuft weiter."""
    entry = await setup_alarm(hass, trigger_time_home=60, trigger_time_away=0, exit_delay_away=0)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    await advance(hass, freezer, 61)
    assert state(hass) == AlarmControlPanelState.ARMED_HOME


async def test_ws_data_and_save_per_mode(hass: HomeAssistant, hass_ws_client) -> None:
    entry = await setup_alarm(hass, night_enabled=True, entry_delay=30, trigger_time=180)
    client = await hass_ws_client(hass)
    data = (await _ws(client, type="alarmageddon/data"))["result"]["systems"][0]["mode_settings"]
    assert set(data) == {"home", "away", "night", "always"}
    assert data["away"] == {"exit_delay": 30, "entry_delay": 30, "trigger_time": 180, "open_sensors": "block", "confirm_window": 60}
    assert data["always"] == {"trigger_time": 180}
    result = await _ws(client, type="alarmageddon/save_system", entry_id=entry.entry_id, mode_settings={
        "home": {"entry_delay": 5, "open_sensors": "bypass"},
        "away": {"exit_delay": 90, "entry_delay": 45, "trigger_time": 0, "confirm_window": 20},
        "night": {"trigger_time": 600},
        "always": {"trigger_time": 30, "entry_delay": 99},  # nur die Alarmdauer gilt für "always"
    })
    assert result["success"], result
    await hass.async_block_till_done()
    data = (await _ws(client, type="alarmageddon/data"))["result"]["systems"][0]["mode_settings"]
    assert data["home"]["entry_delay"] == 5 and data["home"]["open_sensors"] == "bypass" and data["home"]["trigger_time"] == 180
    assert data["away"] == {"exit_delay": 90, "entry_delay": 45, "trigger_time": 0, "open_sensors": "block", "confirm_window": 20}
    assert data["night"]["trigger_time"] == 600
    assert data["always"] == {"trigger_time": 30}
    assert "entry_delay_always" not in entry.options and entry.options["exit_delay_away"] == 90


async def test_ws_validation_and_short_form(hass: HomeAssistant, hass_ws_client) -> None:
    entry = await setup_alarm(hass)
    client = await hass_ws_client(hass)
    assert not (await _ws(client, type="alarmageddon/save_system", entry_id=entry.entry_id, mode_settings={"away": {"entry_delay": 99999}}))["success"]
    assert not (await _ws(client, type="alarmageddon/save_system", entry_id=entry.entry_id, mode_settings={"away": {"confirm_window": 1}}))["success"]
    assert not (await _ws(client, type="alarmageddon/save_system", entry_id=entry.entry_id, mode_settings={"nonsense": {"entry_delay": 5}}))["success"]
    # Kurzform ohne Modus: gilt für alle Modi
    assert (await _ws(client, type="alarmageddon/save_system", entry_id=entry.entry_id, entry_delay=12, trigger_time=77))["success"]
    await hass.async_block_till_done()
    assert all(entry.options[f"entry_delay_{m}"] == 12 and entry.options[f"trigger_time_{m}"] == 77 for m in ("home", "away", "night"))
    assert entry.options["trigger_time_always"] == 77


async def test_options_dialog_changes_all_modes_only_when_changed(hass: HomeAssistant) -> None:
    entry = await setup_alarm(hass, entry_delay=25, entry_delay_away=44, trigger_time=90)
    # Unverändert gespeichert: der Wert je Modus bleibt
    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(result["flow_id"], _sections(delays={"exit_delay_away": 60.0}))
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert entry.options["entry_delay_away"] == 44
    # Geänderter gemeinsamer Wert: gilt danach für alle Modi
    result = await hass.config_entries.options.async_init(entry.entry_id)
    result = await hass.config_entries.options.async_configure(result["flow_id"], _sections(delays={"entry_delay": 33.0}))
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert all(entry.options[f"entry_delay_{m}"] == 33 for m in ("home", "away", "night"))


async def test_backup_contains_mode_settings(hass: HomeAssistant, hass_ws_client) -> None:
    entry = await setup_alarm(hass, entry_delay_away=44, trigger_time_always=25, open_sensors_home="bypass", confirm_window_night=15)
    client = await hass_ws_client(hass)
    exported = (await _ws(client, type="alarmageddon/export"))["result"]
    options = exported["systems"][0]["options"]
    assert options["entry_delay_away"] == 44 and options["trigger_time_always"] == 25
    assert options["open_sensors_home"] == "bypass" and options["confirm_window_night"] == 15
    hass.config_entries.async_update_entry(entry, options={k: v for k, v in entry.options.items() if k != "entry_delay_away"})
    await hass.async_block_till_done()
    assert (await _ws(client, type="alarmageddon/import", data=exported))["success"]
    await hass.async_block_till_done()
    assert entry.options["entry_delay_away"] == 44 and entry.options["trigger_time_always"] == 25
    bad = dict(exported)
    bad["systems"] = [{"title": "Haus", "options": {"entry_delay_away": -5}}]
    assert (await _ws(client, type="alarmageddon/import", data=bad))["error"]["code"] == "invalid_backup"
