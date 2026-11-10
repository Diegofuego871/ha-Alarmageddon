"""Immer aktiv (1.4.0): gilt in jedem Zustand der Anlage, mit den Optionen aus dem Reiter "Immer aktiv"; Schalter "Immer aktiv ignorieren"."""

from __future__ import annotations

import pytest
from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import HomeAssistant

from custom_components.alarmageddon.schemas import SENSOR_VALUES

from .conftest import FRONT_DOOR, setup_alarm
from .test_alarm import call, state
from .test_sensor_options import SMOKE, _classes, open_sensor

ALWAYS = {SMOKE: {"always": True}}
# Der Rauchmelder steht zusätzlich in der Zone "Abwesend" (mit Eingangsverzögerung 20 s): so unterscheidet sich die Regel des Modus
IN_AWAY = {"zone_away": [FRONT_DOOR, "binary_sensor.fenster_kueche", "binary_sensor.bewegung_flur", SMOKE], "entry_sensors": [SMOKE]}


async def _setup(hass: HomeAssistant, **overrides):
    _classes(hass)
    return await setup_alarm(hass, exit_delay_away=0, **overrides)


@pytest.mark.parametrize("arm", [None, "alarm_arm_home", "alarm_arm_away"], ids=["deaktiviert", "scharf Anwesend", "scharf Abwesend"])
async def test_always_active_triggers_in_every_state(hass: HomeAssistant, arm) -> None:
    await _setup(hass, sensor_options=ALWAYS)
    if arm:
        await call(hass, arm)
    await open_sensor(hass, SMOKE)
    assert state(hass) == AlarmControlPanelState.TRIGGERED


@pytest.mark.parametrize("arm", [None, "alarm_arm_away"], ids=["deaktiviert", "scharf"])
async def test_silent_alarm_of_the_always_tab_applies_in_every_state(hass: HomeAssistant, arm) -> None:
    entry = await _setup(hass, per_mode_sensors=True, sensor_options=ALWAYS, sensor_modes={"always": {SMOKE: {"report_only": True}}})
    before = state(hass)
    if arm:
        await call(hass, arm)
        before = state(hass)
    await open_sensor(hass, SMOKE)
    assert state(hass) == before  # nur Meldung, kein Alarm
    assert any(e.get("kind") == "sensor_report" for e in entry.runtime_data.events.events)


async def test_both_rules_run_the_stronger_effect_wins(hass: HomeAssistant, freezer) -> None:
    """Immer aktiv meldet nur, die Zone alarmiert (mit Eingangsverzögerung): beide Regeln laufen, der Alarm kommt über die Zone."""
    entry = await _setup(hass, per_mode_sensors=True, sensor_options=ALWAYS, sensor_modes={"always": {SMOKE: {"report_only": True}}}, **IN_AWAY)
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, SMOKE)
    assert state(hass) == AlarmControlPanelState.PENDING  # Regel der Zone mit Eingangsverzögerung
    assert any(e.get("kind") == "sensor_report" for e in entry.runtime_data.events.events)  # und die Meldung von "Immer aktiv"


async def test_always_active_beats_the_entry_delay_of_the_zone(hass: HomeAssistant) -> None:
    await _setup(hass, sensor_options=ALWAYS, **IN_AWAY)
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, SMOKE)
    assert state(hass) == AlarmControlPanelState.TRIGGERED  # sofort, ohne Eingangsverzögerung


async def test_ignore_switch_leaves_only_the_rule_of_the_mode(hass: HomeAssistant) -> None:
    """Schalter "Immer aktiv ignorieren" (Standard aus): im Modus, in dessen Zone der Sensor steht, gilt nur dessen Regel."""
    await _setup(hass, sensor_options={SMOKE: {"always": True, "always_off": True}}, **IN_AWAY)
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, SMOKE)
    assert state(hass) == AlarmControlPanelState.PENDING  # Eingangsverzögerung der Zone statt sofort
    await call(hass, "alarm_disarm")
    await open_sensor(hass, SMOKE, "off")
    # Deaktiviert: der Schalter wirkt nur im scharfen Modus, "Immer aktiv" gilt
    await open_sensor(hass, SMOKE)
    assert state(hass) == AlarmControlPanelState.TRIGGERED


async def test_ignore_switch_does_not_apply_where_the_sensor_is_not_in_the_zone(hass: HomeAssistant) -> None:
    """In "Anwesend" steht der Rauchmelder in keiner Zone: der Schalter darf ihn nicht stumm machen (im Zweifel alarmieren)."""
    await _setup(hass, sensor_options={SMOKE: {"always": True, "always_off": True}}, **IN_AWAY)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, SMOKE)
    assert state(hass) == AlarmControlPanelState.TRIGGERED


async def test_ignore_switch_per_mode(hass: HomeAssistant) -> None:
    """Mit "Einstellungen pro Modus": der Schalter kann je Modus gesetzt werden (hier nur in Abwesend)."""
    await _setup(hass, per_mode_sensors=True, sensor_options=ALWAYS, sensor_modes={"away": {SMOKE: {"always_off": True}}},
                 zone_home=[FRONT_DOOR, "binary_sensor.fenster_kueche", SMOKE], **{k: v for k, v in IN_AWAY.items()})
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, SMOKE)
    assert state(hass) == AlarmControlPanelState.TRIGGERED  # Anwesend: Schalter dort aus
    await call(hass, "alarm_disarm")
    await open_sensor(hass, SMOKE, "off")
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, SMOKE)
    assert state(hass) == AlarmControlPanelState.PENDING  # Abwesend: nur die Regel der Zone


async def test_disarm_during_the_entry_delay_of_an_ignored_always_sensor(hass: HomeAssistant, freezer) -> None:
    """Pflichtfall: Deaktivieren während der Verzögerung stoppt den Alarm."""
    from .test_alarm import advance

    await _setup(hass, sensor_options={SMOKE: {"always": True, "always_off": True}}, **IN_AWAY)
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, SMOKE)
    await call(hass, "alarm_disarm")
    await advance(hass, freezer, 60)
    assert state(hass) == AlarmControlPanelState.DISARMED


@pytest.mark.parametrize("value", [True, False])
def test_schema_accepts_the_switch(value: bool) -> None:
    assert SENSOR_VALUES({"always_off": value})["always_off"] is value


def test_schema_rejects_a_non_boolean_switch() -> None:
    import voluptuous as vol

    with pytest.raises(vol.Invalid):
        SENSOR_VALUES({"always_off": "vielleicht"})


@pytest.mark.parametrize(
    "overrides",
    [
        {"sensors": [SMOKE]},
        {"sensors": [SMOKE], "sensor_options": {SMOKE: {"report_only": False}}},
        {"sensors": [SMOKE], "per_mode_sensors": True, "sensor_modes": {"always": {SMOKE: {"confirm": False}}}},
    ],
    ids=["nur in der Liste", "Liste und eigener Wert ohne Immer aktiv", "Liste und Wert nur im Reiter Immer aktiv"],
)
@pytest.mark.parametrize("arm", [None, "alarm_arm_away"], ids=["deaktiviert", "scharf"])
async def test_smoke_detector_by_type_default_is_always_active_without_zone_or_own_value(hass: HomeAssistant, arm, overrides) -> None:
    """
    Ein Rauchmelder, der nur in der Liste der Konfiguration steht (Voreinstellung der Sensorart "Immer aktiv"), muss auslösen:
    in jedem Zustand, ohne Zone und ohne eigenen Wert für "Immer aktiv" (vorher wurde er gar nicht beachtet).
    """
    await _setup(hass, **overrides)
    if arm:
        await call(hass, arm)
    await open_sensor(hass, SMOKE)
    assert state(hass) == AlarmControlPanelState.TRIGGERED


async def test_sensor_outside_the_list_and_zones_is_not_listened_to(hass: HomeAssistant) -> None:
    """Ein Sensor, der nicht zur Anlage gehört (weder Liste noch Zone noch Wert), löst nichts aus."""
    await _setup(hass)
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, SMOKE)
    assert state(hass) == AlarmControlPanelState.ARMED_AWAY


# ----- "Immer aktiv" insgesamt abschalten (1.6.0) -----


@pytest.mark.parametrize("arm", [None, "alarm_arm_home", "alarm_arm_away"], ids=["deaktiviert", "scharf Anwesend", "scharf Abwesend"])
async def test_switched_off_always_active_triggers_nothing(hass: HomeAssistant, arm) -> None:
    """Aus: ein Sensor, der nur "Immer aktiv" ist (in keiner Zone), löst in keinem Zustand aus."""
    entry = await _setup(hass, always_enabled=False, sensors=[SMOKE])
    ctl = entry.runtime_data.controller
    assert ctl.always_enabled is False and ctl.always_sensors() == set() and SMOKE not in ctl.all_sensors()
    if arm:
        await call(hass, arm)
    before = state(hass)
    await open_sensor(hass, SMOKE)
    assert state(hass) == before


async def test_switched_off_always_active_keeps_values_and_zone_rules(hass: HomeAssistant) -> None:
    """Die Werte bleiben gespeichert; ein Sensor in der Zone des scharfen Modus alarmiert weiter mit der Regel des Modus."""
    entry = await _setup(hass, always_enabled=False, sensor_options=ALWAYS, **IN_AWAY)
    assert entry.options["sensor_options"] == ALWAYS
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, SMOKE)
    assert state(hass) == AlarmControlPanelState.PENDING  # Zone mit Eingangsverzögerung, nicht sofort


async def test_always_active_is_on_by_default(hass: HomeAssistant) -> None:
    entry = await _setup(hass, sensors=[SMOKE])
    assert entry.runtime_data.controller.always_enabled is True


async def test_save_system_switches_always_active_and_reports_it(hass: HomeAssistant, hass_ws_client) -> None:
    entry = await _setup(hass, sensors=[SMOKE])
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "alarmageddon/save_system", "entry_id": entry.entry_id, "always_enabled": False})
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    assert entry.options["always_enabled"] is False
    await client.send_json({"id": 2, "type": "alarmageddon/data"})
    data = (await client.receive_json())["result"]
    assert [s["always_enabled"] for s in data["systems"]] == [False]
    await open_sensor(hass, SMOKE)
    assert state(hass) == AlarmControlPanelState.DISARMED
    await client.send_json({"id": 3, "type": "alarmageddon/save_system", "entry_id": entry.entry_id, "always_enabled": True})
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    await open_sensor(hass, SMOKE, "off")
    await open_sensor(hass, SMOKE)
    assert state(hass) == AlarmControlPanelState.TRIGGERED


async def test_always_enabled_in_backup(hass: HomeAssistant, hass_ws_client) -> None:
    entry = await _setup(hass, always_enabled=False)
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "alarmageddon/export"})
    exported = (await client.receive_json())["result"]
    assert exported["systems"][0]["options"]["always_enabled"] is False
    hass.config_entries.async_update_entry(entry, options={**entry.options, "always_enabled": True})
    await hass.async_block_till_done()
    await client.send_json({"id": 2, "type": "alarmageddon/import", "data": exported})
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    assert entry.options["always_enabled"] is False


async def test_save_workflows_keeps_flows_of_triggers_not_in_the_message(hass: HomeAssistant, hass_ws_client) -> None:
    """Abgeschaltetes "Immer aktiv" oder ein abgeschalteter Modus: ihr Ablauf bleibt beim Speichern der übrigen erhalten."""
    step = {"type": "wait", "seconds": 5}
    entry = await _setup(hass, always_enabled=False, workflows={"always": [step], "night": [step], "home": [step]},
                         workflow_end={"always": {"notify": {"enabled": True, "title": "x"}}})
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "alarmageddon/save_workflows", "entry_id": entry.entry_id, "workflows": {"home": [], "away": [step]}, "workflow_end": {"home": {}}})
    assert (await client.receive_json())["success"]
    await hass.async_block_till_done()
    assert entry.options["workflows"] == {"always": [step], "night": [step], "away": [step]}  # "home" bewusst geleert
    assert entry.options["workflow_end"]["always"]["notify"]["title"] == "x"
