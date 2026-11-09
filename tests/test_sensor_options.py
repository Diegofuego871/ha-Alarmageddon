"""Optionen pro Sensor (0.3.0): immer aktiv, darf offen sein, scharf sobald geschlossen, Ausfall gilt als Alarm, Bereit."""

from __future__ import annotations

from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import HomeAssistant

from .conftest import ALARM, FRONT_DOOR, MOTION, WINDOW, setup_alarm
from .test_alarm import advance, call, state

SMOKE = "binary_sensor.rauchmelder"


def _classes(hass: HomeAssistant) -> None:
    """Geräteklassen wie echte Sensoren, damit die Voreinstellungen je Sensorart greifen."""
    hass.states.async_set(FRONT_DOOR, "off", {"device_class": "door"})
    hass.states.async_set(WINDOW, "off", {"device_class": "window"})
    hass.states.async_set(MOTION, "off", {"device_class": "motion"})
    hass.states.async_set(SMOKE, "off", {"device_class": "smoke"})


async def open_sensor(hass: HomeAssistant, entity: str, value: str = "on") -> None:
    """Zustand setzen und die Attribute (Geräteklasse) behalten, wie ein echter Sensor."""
    old = hass.states.get(entity)
    hass.states.async_set(entity, value, old.attributes if old else {})
    await hass.async_block_till_done()


async def test_always_active_triggers_when_disarmed(hass: HomeAssistant, freezer) -> None:
    """Rauchmelder mit "Immer aktiv" muss in keiner Zone sein und löst auch unscharf aus."""
    _classes(hass)
    await setup_alarm(hass, sensor_options={SMOKE: {"always": True}})
    await open_sensor(hass, SMOKE)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    assert hass.states.get(ALARM).attributes["triggered_by"] == SMOKE
    await advance(hass, freezer, 3600)
    assert state(hass) == AlarmControlPanelState.TRIGGERED  # bleibt, bis quittiert
    await call(hass, "alarm_disarm")
    assert state(hass) == AlarmControlPanelState.DISARMED


async def test_always_active_from_preset_in_zone(hass: HomeAssistant) -> None:
    _classes(hass)
    await setup_alarm(hass, zone_away=[FRONT_DOOR, WINDOW, MOTION, SMOKE])
    await open_sensor(hass, SMOKE)
    assert state(hass) == AlarmControlPanelState.TRIGGERED


async def test_smoke_without_option_or_zone_is_ignored(hass: HomeAssistant) -> None:
    _classes(hass)
    await setup_alarm(hass)
    await open_sensor(hass, SMOKE)
    assert state(hass) == AlarmControlPanelState.DISARMED


async def test_open_ok_does_not_block_arming(hass: HomeAssistant) -> None:
    """Bewegungsmelder (Voreinstellung "darf offen sein") verhindert das Scharfschalten nicht."""
    _classes(hass)
    await setup_alarm(hass, exit_delay_away=0)
    await open_sensor(hass, MOTION, "on")
    await call(hass, "alarm_arm_away")
    assert state(hass) == AlarmControlPanelState.ARMED_AWAY
    assert hass.states.get(ALARM).attributes["bypassed_sensors"] == []
    # Erst eine neue Auslösung zählt
    await open_sensor(hass, MOTION, "off")
    await open_sensor(hass, MOTION)
    assert state(hass) == AlarmControlPanelState.TRIGGERED


async def test_own_value_overrides_preset(hass: HomeAssistant) -> None:
    _classes(hass)
    await setup_alarm(hass, exit_delay_away=0, sensor_options={MOTION: {"open_ok": False}})
    await open_sensor(hass, MOTION, "on")
    from homeassistant.exceptions import ServiceValidationError
    import pytest

    with pytest.raises(ServiceValidationError):
        await call(hass, "alarm_arm_away")


async def test_arm_on_close(hass: HomeAssistant, freezer) -> None:
    """Haustür zuziehen während der Ausgangsverzögerung: nach kurzer Wartezeit scharf."""
    _classes(hass)
    await setup_alarm(hass)
    await call(hass, "alarm_arm_away")
    assert state(hass) == AlarmControlPanelState.ARMING
    await open_sensor(hass, FRONT_DOOR)
    await open_sensor(hass, FRONT_DOOR, "off")
    assert state(hass) == AlarmControlPanelState.ARMING
    await advance(hass, freezer, 4)
    assert state(hass) == AlarmControlPanelState.ARMED_AWAY


async def test_arm_on_close_reopened_keeps_delay(hass: HomeAssistant, freezer) -> None:
    """Prellt die Tür (wieder offen), gilt die ursprüngliche Ausgangsverzögerung."""
    _classes(hass)
    await setup_alarm(hass)
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, FRONT_DOOR)
    await open_sensor(hass, FRONT_DOOR, "off")
    await advance(hass, freezer, 1)
    await open_sensor(hass, FRONT_DOOR)
    await advance(hass, freezer, 5)
    assert state(hass) == AlarmControlPanelState.ARMING
    await advance(hass, freezer, 30)
    assert state(hass) == AlarmControlPanelState.ARMED_AWAY


async def test_window_closing_does_not_arm_early(hass: HomeAssistant, freezer) -> None:
    _classes(hass)
    await setup_alarm(hass)
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, WINDOW)
    await open_sensor(hass, WINDOW, "off")
    await advance(hass, freezer, 5)
    assert state(hass) == AlarmControlPanelState.ARMING


async def test_offline_alarm(hass: HomeAssistant) -> None:
    """Sensor fällt im scharfen Zustand aus: mit Option sofort Alarm."""
    _classes(hass)
    await setup_alarm(hass, sensor_options={WINDOW: {"offline_alarm": True}})
    await call(hass, "alarm_arm_home")
    hass.states.async_set(WINDOW, "unavailable")
    await hass.async_block_till_done()
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    assert hass.states.get(ALARM).attributes["triggered_by"] == WINDOW


async def test_offline_without_option_logs_event(hass: HomeAssistant, hass_ws_client) -> None:
    _classes(hass)
    await setup_alarm(hass)
    await call(hass, "alarm_arm_home")
    hass.states.async_set(WINDOW, "unavailable")
    await hass.async_block_till_done()
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "alarmageddon/data"})
    events = (await client.receive_json())["result"]["systems"][0]["events"]
    assert events[0]["kind"] == "sensor_offline" and events[0]["sensor"] == WINDOW


async def test_ready_sensors(hass: HomeAssistant) -> None:
    _classes(hass)
    await setup_alarm(hass)
    assert state(hass, "binary_sensor.haus_ready_to_arm_home") == "on"
    await open_sensor(hass, WINDOW)
    assert state(hass, "binary_sensor.haus_ready_to_arm_home") == "off"
    assert hass.states.get("binary_sensor.haus_ready_to_arm_home").attributes["blocking_sensors"] == [WINDOW]
    # Bewegungsmelder darf offen sein: Abwesend bleibt bereit, solange nur er offen ist
    await open_sensor(hass, WINDOW, "off")
    await open_sensor(hass, MOTION)
    assert state(hass, "binary_sensor.haus_ready_to_arm_away") == "on"


async def test_presets_via_websocket(hass: HomeAssistant, hass_ws_client, hass_storage) -> None:
    """Voreinstellungen gelten für alle Anlagen, werden gespeichert und laden die Anlagen neu."""
    _classes(hass)
    await setup_alarm(hass, exit_delay_away=0)
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "alarmageddon/data"})
    result = (await client.receive_json())["result"]
    assert result["presets"]["motion"] == ["open_ok"]
    assert result["sensors"][MOTION]["type"] == "motion"
    await client.send_json({"id": 2, "type": "alarmageddon/save_presets", "presets": {"motion": [], "door": ["arm_on_close"]}})
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    assert hass_storage["alarmageddon.settings"]["data"]["presets"]["motion"] == []
    # Jetzt verhindert ein offener Bewegungsmelder das Scharfschalten
    await open_sensor(hass, MOTION, "on")
    await client.send_json({"id": 3, "type": "alarmageddon/arm", "entry_id": hass.config_entries.async_entries("alarmageddon")[0].entry_id, "mode": "away"})
    assert (await client.receive_json())["error"]["code"] == "open_sensors"


async def test_save_sensor_options_and_system(hass: HomeAssistant, hass_ws_client) -> None:
    _classes(hass)
    entry = await setup_alarm(hass)
    client = await hass_ws_client(hass)
    await client.send_json({
        "id": 1, "type": "alarmageddon/save_zones", "entry_id": entry.entry_id,
        "zones": {"home": [WINDOW], "away": [WINDOW]}, "entry_sensors": [],
        "sensor_options": {SMOKE: {"always": True}, WINDOW: {}},
    })
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    assert entry.options["sensor_options"] == {SMOKE: {"always": True}}
    await client.send_json({"id": 2, "type": "alarmageddon/save_system", "entry_id": entry.entry_id,
                            "exit_delay": {"away": 90}, "entry_delay": 15, "night_enabled": True, "open_sensors": "bypass"})
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    assert entry.options["exit_delay_away"] == 90 and entry.options["entry_delay"] == 15
    assert entry.options["night_enabled"] is True and entry.options["open_sensors"] == "bypass"
    assert hass.states.get("binary_sensor.haus_ready_to_arm_night") is not None
    await client.send_json({"id": 3, "type": "alarmageddon/save_system", "entry_id": entry.entry_id, "entry_delay": 99999})
    assert not (await client.receive_json())["success"]
