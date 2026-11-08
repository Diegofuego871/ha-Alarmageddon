"""Zustandsautomat: Scharfschalten, Verzögerungen, Auslösen, Deaktivieren, Code."""

from __future__ import annotations

from datetime import timedelta

import pytest
from homeassistant.components.alarm_control_panel import AlarmControlPanelEntityFeature, AlarmControlPanelState
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import async_fire_time_changed

from custom_components.alarmageddon.code import hash_code
from custom_components.alarmageddon.const import DOMAIN

from .conftest import ALARM, FRONT_DOOR, MOTION, WINDOW, setup_alarm


def state(hass: HomeAssistant, entity: str = ALARM) -> str:
    return hass.states.get(entity).state


async def call(hass: HomeAssistant, service: str, entity: str = ALARM, **data) -> None:
    await hass.services.async_call("alarm_control_panel", service, {"entity_id": entity, **data}, blocking=True)
    await hass.async_block_till_done()


async def advance(hass: HomeAssistant, freezer, seconds: float) -> None:
    freezer.tick(timedelta(seconds=seconds))
    async_fire_time_changed(hass, dt_util.utcnow())
    await hass.async_block_till_done()


async def open_sensor(hass: HomeAssistant, entity: str) -> None:
    hass.states.async_set(entity, "on")
    await hass.async_block_till_done()


async def test_device_and_entities(hass: HomeAssistant) -> None:
    entry = await setup_alarm(hass)
    device = dr.async_get(hass).async_get_device(identifiers={(DOMAIN, entry.entry_id)})
    assert device is not None and device.name == "Haus"
    entities = {e.entity_id for e in er.async_entries_for_config_entry(er.async_get(hass), entry.entry_id)}
    assert entities == {ALARM, "binary_sensor.haus_zone_home", "binary_sensor.haus_zone_away"}
    assert all(e.device_id == device.id for e in er.async_entries_for_config_entry(er.async_get(hass), entry.entry_id))
    assert state(hass) == AlarmControlPanelState.DISARMED


async def test_several_alarm_systems(hass: HomeAssistant) -> None:
    """Mehrere Anlagen pro HA, je ein Gerät und eine Alarm-Entität (Vorgabe des Nutzers)."""
    await setup_alarm(hass, "Haus")
    await setup_alarm(hass, "Garage")
    assert hass.states.get("alarm_control_panel.haus") is not None
    assert hass.states.get("alarm_control_panel.garage") is not None
    assert len([d for d in dr.async_get(hass).devices.values() if d.manufacturer == "Alarmageddon"]) == 2


async def test_arm_away_with_exit_delay(hass: HomeAssistant, freezer) -> None:
    await setup_alarm(hass)
    await call(hass, "alarm_arm_away")
    assert state(hass) == AlarmControlPanelState.ARMING
    # Während der Ausgangsverzögerung löst nichts aus
    await open_sensor(hass, MOTION)
    assert state(hass) == AlarmControlPanelState.ARMING
    hass.states.async_set(MOTION, "off")
    await advance(hass, freezer, 31)
    assert state(hass) == AlarmControlPanelState.ARMED_AWAY
    assert hass.states.get(ALARM).attributes["arm_mode"] == "away"


async def test_arm_home_without_delay_and_instant_trigger(hass: HomeAssistant) -> None:
    await setup_alarm(hass)
    await call(hass, "alarm_arm_home")
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    # Bewegungsmelder ist nicht in der Zone "Anwesend"
    await open_sensor(hass, MOTION)
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    await open_sensor(hass, WINDOW)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    assert hass.states.get(ALARM).attributes["triggered_by"] == WINDOW


async def test_entry_delay_then_alarm(hass: HomeAssistant, freezer) -> None:
    await setup_alarm(hass)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, FRONT_DOOR)
    assert state(hass) == AlarmControlPanelState.PENDING
    await advance(hass, freezer, 19)
    assert state(hass) == AlarmControlPanelState.PENDING
    await advance(hass, freezer, 2)
    assert state(hass) == AlarmControlPanelState.TRIGGERED


async def test_instant_sensor_during_entry_delay(hass: HomeAssistant) -> None:
    await setup_alarm(hass)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, FRONT_DOOR)
    await open_sensor(hass, WINDOW)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    assert hass.states.get(ALARM).attributes["triggered_by"] == WINDOW


async def test_disarm_during_entry_delay_stops_alarm(hass: HomeAssistant, freezer) -> None:
    """Deaktivieren während der Verzögerung: Der Zeitgeber darf danach nichts mehr auslösen."""
    await setup_alarm(hass)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, FRONT_DOOR)
    await call(hass, "alarm_disarm")
    assert state(hass) == AlarmControlPanelState.DISARMED
    await advance(hass, freezer, 60)
    assert state(hass) == AlarmControlPanelState.DISARMED


async def test_disarm_during_exit_delay(hass: HomeAssistant, freezer) -> None:
    await setup_alarm(hass)
    await call(hass, "alarm_arm_away")
    await call(hass, "alarm_disarm")
    await advance(hass, freezer, 60)
    assert state(hass) == AlarmControlPanelState.DISARMED


async def test_alarm_duration_returns_to_armed(hass: HomeAssistant, freezer) -> None:
    await setup_alarm(hass)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await advance(hass, freezer, 121)
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    # Ein neues Öffnen löst wieder aus
    hass.states.async_set(WINDOW, "off")
    await open_sensor(hass, WINDOW)
    assert state(hass) == AlarmControlPanelState.TRIGGERED


async def test_alarm_until_disarmed(hass: HomeAssistant, freezer) -> None:
    await setup_alarm(hass, trigger_time=0)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await advance(hass, freezer, 3600)
    assert state(hass) == AlarmControlPanelState.TRIGGERED


async def test_unavailable_to_on_does_not_trigger(hass: HomeAssistant) -> None:
    """Nach Neustart oder Neuverbindung kommt "nicht verfügbar" -> "offen": kein Fehlalarm."""
    await setup_alarm(hass)
    await call(hass, "alarm_arm_home")
    hass.states.async_set(WINDOW, "unavailable")
    await open_sensor(hass, WINDOW)
    assert state(hass) == AlarmControlPanelState.ARMED_HOME


async def test_open_sensor_blocks_arming(hass: HomeAssistant) -> None:
    await setup_alarm(hass)
    hass.states.async_set(WINDOW, "on", {"friendly_name": "Fenster Küche"})
    with pytest.raises(ServiceValidationError) as err:
        await call(hass, "alarm_arm_home")
    assert err.value.translation_key == "open_sensors"
    assert err.value.translation_placeholders == {"sensors": "Fenster Küche"}
    assert state(hass) == AlarmControlPanelState.DISARMED


async def test_open_sensor_bypassed(hass: HomeAssistant) -> None:
    await setup_alarm(hass, open_sensors="bypass")
    hass.states.async_set(WINDOW, "on")
    await call(hass, "alarm_arm_home")
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    assert hass.states.get(ALARM).attributes["bypassed_sensors"] == [WINDOW]
    # Umgangen bis zum Deaktivieren, auch wenn es zu- und wieder aufgeht
    hass.states.async_set(WINDOW, "off")
    await open_sensor(hass, WINDOW)
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    await open_sensor(hass, FRONT_DOOR)
    assert state(hass) == AlarmControlPanelState.PENDING
    await call(hass, "alarm_disarm")
    assert hass.states.get(ALARM).attributes["bypassed_sensors"] == []


async def test_arming_while_triggered_is_refused(hass: HomeAssistant) -> None:
    await setup_alarm(hass)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    with pytest.raises(ServiceValidationError) as err:
        await call(hass, "alarm_arm_away")
    assert err.value.translation_key == "disarm_first"


async def test_manual_trigger_from_disarmed(hass: HomeAssistant, freezer) -> None:
    await setup_alarm(hass)
    await call(hass, "alarm_trigger")
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    await advance(hass, freezer, 121)
    assert state(hass) == AlarmControlPanelState.DISARMED


async def test_night_mode_optional(hass: HomeAssistant) -> None:
    """Nacht nur, wenn eingeschaltet (Vorgabe des Nutzers); davon hängt auch HomeKit ab."""
    await setup_alarm(hass)
    features = hass.states.get(ALARM).attributes["supported_features"]
    assert not features & AlarmControlPanelEntityFeature.ARM_NIGHT
    # HA lehnt den Dienst selbst ab, weil die Entität die Funktion nicht meldet
    with pytest.raises(ServiceValidationError) as err:
        await call(hass, "alarm_arm_night")
    assert err.value.translation_key == "service_not_supported"
    assert state(hass) == AlarmControlPanelState.DISARMED


async def test_night_mode_enabled(hass: HomeAssistant) -> None:
    await setup_alarm(hass, night_enabled=True)
    assert hass.states.get(ALARM).attributes["supported_features"] & AlarmControlPanelEntityFeature.ARM_NIGHT
    assert hass.states.get("binary_sensor.haus_zone_night") is not None
    await call(hass, "alarm_arm_night")
    assert state(hass) == AlarmControlPanelState.ARMED_NIGHT


async def _with_code(hass: HomeAssistant, **overrides):
    code_hash, salt = hash_code("1234")
    return await setup_alarm(hass, code_hash=code_hash, code_salt=salt, **overrides)


async def test_code_needed_to_disarm(hass: HomeAssistant) -> None:
    await _with_code(hass)
    assert hass.states.get(ALARM).attributes["code_format"] == "number"
    assert hass.states.get(ALARM).attributes["code_arm_required"] is False
    await call(hass, "alarm_arm_home")
    with pytest.raises(ServiceValidationError) as err:
        await call(hass, "alarm_disarm", code="9999")
    assert err.value.translation_key == "invalid_code"
    with pytest.raises(ServiceValidationError):
        await call(hass, "alarm_disarm")
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    await call(hass, "alarm_disarm", code="1234")
    assert state(hass) == AlarmControlPanelState.DISARMED


async def test_code_to_arm(hass: HomeAssistant) -> None:
    await _with_code(hass, code_arm_required=True)
    with pytest.raises(ServiceValidationError):
        await call(hass, "alarm_arm_home")
    with pytest.raises(ServiceValidationError):
        await call(hass, "alarm_arm_home", code="0000")
    await call(hass, "alarm_arm_home", code="1234")
    assert state(hass) == AlarmControlPanelState.ARMED_HOME


async def test_code_lockout(hass: HomeAssistant, freezer) -> None:
    """Nach fünf falschen Codes ist die Eingabe eine Minute gesperrt, auch für den richtigen Code."""
    await _with_code(hass)
    await call(hass, "alarm_arm_home")
    for _ in range(5):
        with pytest.raises(ServiceValidationError):
            await call(hass, "alarm_disarm", code="0000")
    with pytest.raises(ServiceValidationError) as err:
        await call(hass, "alarm_disarm", code="1234")
    assert err.value.translation_key == "code_locked"
    await advance(hass, freezer, 61)
    await call(hass, "alarm_disarm", code="1234")
    assert state(hass) == AlarmControlPanelState.DISARMED


async def test_default_code_from_entity_settings(hass: HomeAssistant) -> None:
    """Standardcode in den Entitätseinstellungen von HA: so geht HomeKit ohne Code in der HomeKit-Konfiguration."""
    await _with_code(hass)
    er.async_get(hass).async_update_entity_options(ALARM, "alarm_control_panel", {"default_code": "1234"})
    await hass.async_block_till_done()
    await call(hass, "alarm_arm_home")
    await call(hass, "alarm_disarm")
    assert state(hass) == AlarmControlPanelState.DISARMED


async def test_changed_by_user(hass: HomeAssistant, hass_admin_user) -> None:
    from homeassistant.core import Context

    await setup_alarm(hass)
    await hass.services.async_call(
        "alarm_control_panel",
        "alarm_arm_home",
        {"entity_id": ALARM},
        blocking=True,
        context=Context(user_id=hass_admin_user.id),
    )
    assert hass.states.get(ALARM).attributes["changed_by"] == hass_admin_user.name


async def test_zone_sensor(hass: HomeAssistant) -> None:
    await setup_alarm(hass)
    assert state(hass, "binary_sensor.haus_zone_away") == "off"
    await open_sensor(hass, MOTION)
    assert state(hass, "binary_sensor.haus_zone_away") == "on"
    assert state(hass, "binary_sensor.haus_zone_home") == "off"
    assert hass.states.get("binary_sensor.haus_zone_away").attributes["open_sensors"] == [MOTION]
