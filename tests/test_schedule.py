"""Zeitplan und wählbare Modi (0.6.0)."""

from __future__ import annotations

from datetime import datetime, timedelta

from homeassistant.components.alarm_control_panel import AlarmControlPanelEntityFeature, AlarmControlPanelState
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import async_fire_time_changed

from custom_components.alarmageddon.code import hash_code

from .conftest import ALARM, FRONT_DOOR, WINDOW, setup_alarm
from .test_alarm import call, state

_id = iter(range(1, 1000))
MONDAY = (2026, 11, 9)


def _rule(action: str, time: str, days=(0, 1, 2, 3, 4), enabled: bool = True, rid: str = "r1") -> dict:
    return {"id": rid, "enabled": enabled, "action": action, "time": time, "days": list(days)}


async def _at(hass: HomeAssistant, freezer, day: tuple[int, int, int], hour: int, minute: int) -> None:
    """Uhr auf eine lokale Zeit stellen und den Zeitwechsel auslösen."""
    local = datetime(*day, hour, minute, 0, tzinfo=dt_util.get_default_time_zone())
    freezer.move_to(dt_util.as_utc(local))
    async_fire_time_changed(hass, dt_util.utcnow())
    await hass.async_block_till_done()


async def _ws(client, **msg):
    await client.send_json({"id": next(_id), **msg})
    return await client.receive_json()


async def test_schedule_arms_on_weekday(hass: HomeAssistant, freezer) -> None:
    await _at(hass, freezer, MONDAY, 12, 0)
    await setup_alarm(hass, night_enabled=True, schedules=[_rule("night", "22:30"), _rule("off", "06:45", rid="r2")])
    await _at(hass, freezer, MONDAY, 22, 30)
    assert state(hass) == AlarmControlPanelState.ARMED_NIGHT
    assert hass.states.get(ALARM).attributes["changed_by"] == "Schedule"
    await _at(hass, freezer, (2026, 11, 10), 6, 45)
    assert state(hass) == AlarmControlPanelState.DISARMED


async def test_schedule_respects_days_and_enabled(hass: HomeAssistant, freezer) -> None:
    await _at(hass, freezer, MONDAY, 12, 0)
    await setup_alarm(hass, exit_delay_away=0, schedules=[_rule("away", "13:00", days=[5, 6]), _rule("away", "14:00", enabled=False, rid="r2")])
    await _at(hass, freezer, MONDAY, 13, 0)
    await _at(hass, freezer, MONDAY, 14, 0)
    assert state(hass) == AlarmControlPanelState.DISARMED


async def test_schedule_never_disarms_running_alarm(hass: HomeAssistant, freezer) -> None:
    """Ein Einbruch kurz vor der geplanten Zeit darf nicht per Zeitplan enden."""
    await _at(hass, freezer, MONDAY, 6, 0)
    entry = await setup_alarm(hass, exit_delay_away=0, trigger_time=0, schedules=[_rule("off", "06:45")])
    await call(hass, "alarm_arm_away")
    hass.states.async_set(WINDOW, "on")
    await hass.async_block_till_done()
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    await _at(hass, freezer, MONDAY, 6, 45)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    assert entry.runtime_data.events.events[0]["kind"] == "schedule_skipped"


async def test_schedule_never_disarms_entry_delay(hass: HomeAssistant, freezer) -> None:
    await _at(hass, freezer, MONDAY, 6, 0)
    await setup_alarm(hass, exit_delay_away=0, entry_delay=3600, schedules=[_rule("off", "06:45")])
    await call(hass, "alarm_arm_away")
    hass.states.async_set(FRONT_DOOR, "on")
    await hass.async_block_till_done()
    await _at(hass, freezer, MONDAY, 6, 45)
    assert state(hass) == AlarmControlPanelState.PENDING


async def test_schedule_disarms_without_code(hass: HomeAssistant, freezer) -> None:
    await _at(hass, freezer, MONDAY, 6, 0)
    code_hash, salt = hash_code("1234")
    await setup_alarm(hass, exit_delay_away=0, code_hash=code_hash, code_salt=salt, code_arm_required=True,
                      schedules=[_rule("away", "06:10"), _rule("off", "06:45", rid="r2")])
    await _at(hass, freezer, MONDAY, 6, 10)
    assert state(hass) == AlarmControlPanelState.ARMED_AWAY
    await _at(hass, freezer, MONDAY, 6, 45)
    assert state(hass) == AlarmControlPanelState.DISARMED


async def test_schedule_open_sensor_reports_arm_failed(hass: HomeAssistant, freezer) -> None:
    await _at(hass, freezer, MONDAY, 6, 0)
    entry = await setup_alarm(hass, exit_delay_away=0, schedules=[_rule("away", "08:00")])
    hass.states.async_set(WINDOW, "on")
    await _at(hass, freezer, MONDAY, 8, 0)
    assert state(hass) == AlarmControlPanelState.DISARMED
    assert entry.runtime_data.events.events[0]["kind"] == "arm_failed"


async def test_schedule_for_disabled_mode_skipped(hass: HomeAssistant, freezer) -> None:
    await _at(hass, freezer, MONDAY, 6, 0)
    entry = await setup_alarm(hass, schedules=[_rule("night", "22:00")])
    await _at(hass, freezer, MONDAY, 22, 0)
    assert state(hass) == AlarmControlPanelState.DISARMED
    assert entry.runtime_data.events.events[0] == {**entry.runtime_data.events.events[0], "kind": "schedule_skipped", "reason": "mode"}


async def test_save_schedules_validation(hass: HomeAssistant, hass_ws_client) -> None:
    entry = await setup_alarm(hass)
    client = await hass_ws_client(hass)
    bad_time = await _ws(client, type="alarmageddon/save_system", entry_id=entry.entry_id, schedules=[_rule("away", "25:00")])
    assert not bad_time["success"]
    no_days = await _ws(client, type="alarmageddon/save_system", entry_id=entry.entry_id, schedules=[_rule("away", "08:00", days=[])])
    assert not no_days["success"]
    ok = await _ws(client, type="alarmageddon/save_system", entry_id=entry.entry_id, schedules=[_rule("away", "08:00", days=[4, 0, 0])])
    assert ok["success"]
    await hass.async_block_till_done()
    assert entry.options["schedules"] == [_rule("away", "08:00", days=[0, 4])]
    data = await _ws(client, type="alarmageddon/data")
    assert data["result"]["systems"][0]["schedules"] == entry.options["schedules"]


async def test_choose_modes(hass: HomeAssistant, hass_ws_client) -> None:
    entry = await setup_alarm(hass)
    client = await hass_ws_client(hass)
    result = await _ws(client, type="alarmageddon/save_system", entry_id=entry.entry_id, home_enabled=False, night_enabled=True)
    assert result["success"]
    await hass.async_block_till_done()
    features = hass.states.get(ALARM).attributes["supported_features"]
    assert not features & AlarmControlPanelEntityFeature.ARM_HOME
    assert features & AlarmControlPanelEntityFeature.ARM_AWAY and features & AlarmControlPanelEntityFeature.ARM_NIGHT
    assert hass.states.get("binary_sensor.haus_zone_home") is None
    assert hass.states.get("binary_sensor.haus_zone_night") is not None
    # Zonen bleiben gespeichert, kommen mit dem Modus zurück
    assert entry.options["zone_home"] == [FRONT_DOOR, WINDOW]
    data = await _ws(client, type="alarmageddon/data")
    assert data["result"]["systems"][0]["modes"] == ["away", "night"]


async def test_at_least_one_mode(hass: HomeAssistant, hass_ws_client) -> None:
    entry = await setup_alarm(hass)
    client = await hass_ws_client(hass)
    result = await _ws(client, type="alarmageddon/save_system", entry_id=entry.entry_id, home_enabled=False, away_enabled=False)
    assert result["error"]["code"] == "no_mode"


async def test_active_mode_cannot_be_switched_off(hass: HomeAssistant, hass_ws_client) -> None:
    """Sonst wäre die Anlage nach dem Neuladen still deaktiviert."""
    entry = await setup_alarm(hass)
    client = await hass_ws_client(hass)
    await call(hass, "alarm_arm_home")
    result = await _ws(client, type="alarmageddon/save_system", entry_id=entry.entry_id, home_enabled=False)
    assert result["error"]["code"] == "mode_active"
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    # Ein anderer Modus darf weg
    result = await _ws(client, type="alarmageddon/save_system", entry_id=entry.entry_id, away_enabled=False)
    assert result["success"]
    await hass.async_block_till_done()
    assert state(hass) == AlarmControlPanelState.ARMED_HOME


async def test_backup_contains_schedules_and_modes(hass: HomeAssistant, hass_ws_client) -> None:
    await setup_alarm(hass, home_enabled=False, schedules=[_rule("away", "08:00")])
    client = await hass_ws_client(hass)
    data = (await _ws(client, type="alarmageddon/export"))["result"]
    options = data["systems"][0]["options"]
    assert options["schedules"] == [_rule("away", "08:00")] and options["home_enabled"] is False


async def test_restart_after_scheduled_arm_keeps_state(hass: HomeAssistant, freezer) -> None:
    await _at(hass, freezer, MONDAY, 6, 0)
    entry = await setup_alarm(hass, exit_delay_away=0, schedules=[_rule("away", "08:00")])
    await _at(hass, freezer, MONDAY, 8, 0)
    await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert state(hass) == AlarmControlPanelState.ARMED_AWAY
    # Nach dem Neuladen feuert derselbe Termin am nächsten Tag wieder (kein doppelter Zeitgeber)
    await call(hass, "alarm_disarm")
    freezer.tick(timedelta(days=1))
    await _at(hass, freezer, (2026, 11, 10), 8, 0)
    assert state(hass) == AlarmControlPanelState.ARMED_AWAY
