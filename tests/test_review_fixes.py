"""
Funde des Code-Reviews (1.33.1): Ausfallsicherheit beim Laden und Entladen, beschädigte Codes, Race beim Löschen, Platzhalter, gemeinsame
Standardwerte und die Statistik beim gleichzeitigen Start.
"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, patch

import pytest
from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry, async_mock_service

from custom_components.alarmageddon import sensor_history
from custom_components.alarmageddon.code import hash_code, match_code, verify_code
from custom_components.alarmageddon.const import DOMAIN
from custom_components.alarmageddon.events import EventLog
from custom_components.alarmageddon.recording import AlarmRecorder
from custom_components.alarmageddon.schemas import valid_step
from custom_components.alarmageddon.workflow import WorkflowRunner

from .conftest import FRONT_DOOR, MOTION, WINDOW, options, setup_alarm
from .test_alarm import call, open_sensor, state
from .test_delete_system import _delete
from .test_sensor_options import open_sensor as keep_attributes
from .test_actions import _notify_settings

_ids = iter(range(1, 1000))


async def _ws(client, **msg):
    await client.send_json({"id": next(_ids), **msg})
    return await client.receive_json()


# ----- Laden: jedes Zusatzteil darf ausfallen, die Anlage hört weiter auf ihre Sensoren -----

BROKEN = {
    "statistics": lambda: patch("custom_components.alarmageddon.async_get_stats", AsyncMock(side_effect=OSError("kaputt"))),
    "event_log": lambda: patch.object(EventLog, "async_load", AsyncMock(side_effect=OSError("kaputt"))),
    "recordings": lambda: patch.object(AlarmRecorder, "async_load", AsyncMock(side_effect=OSError("kaputt"))),
    "actions": lambda: patch.object(WorkflowRunner, "async_start", AsyncMock(side_effect=OSError("kaputt"))),
    "maintenance": lambda: patch("custom_components.alarmageddon.async_start_maintenance", AsyncMock(side_effect=OSError("kaputt"))),
}


@pytest.mark.parametrize("part", sorted(BROKEN))
async def test_a_failing_extra_part_does_not_take_the_alarm_system_down(hass: HomeAssistant, part: str, caplog) -> None:
    with BROKEN[part]():
        entry = await setup_alarm(hass, exit_delay_away=0, entry_delay=0)
        assert entry.state is ConfigEntryState.LOADED
        await call(hass, "alarm_arm_away")
        assert state(hass) == AlarmControlPanelState.ARMED_AWAY
        await open_sensor(hass, MOTION)
        assert state(hass) == AlarmControlPanelState.TRIGGERED
    assert "the alarm system runs without it" in caplog.text


async def test_a_failing_extra_part_still_sends_the_alarm_notification(hass: HomeAssistant, hass_ws_client) -> None:
    """Auch ohne den Start der Aktionen geht die Alarmmeldung hinaus (der Melder hängt nicht an ihnen)."""
    pushes = async_mock_service(hass, "notify", "handy")
    with BROKEN["actions"]():
        await setup_alarm(hass, exit_delay_away=0, entry_delay=0)
        await _notify_settings(hass, hass_ws_client)
        await call(hass, "alarm_arm_away")
        await open_sensor(hass, MOTION)
    assert state(hass) == AlarmControlPanelState.TRIGGERED and len(pushes) == 1


# ----- Entladen: ein Fehler beim Speichern lässt die Anlage nicht ohne Entität zurück -----


@pytest.mark.parametrize("part", ["event_log", "recordings", "actions", "maintenance"])
async def test_unloading_goes_through_when_a_part_cannot_stop(hass: HomeAssistant, part: str, caplog) -> None:
    entry = await setup_alarm(hass)
    targets = {
        "event_log": lambda: patch.object(EventLog, "async_stop", AsyncMock(side_effect=OSError("kaputt"))),
        "recordings": lambda: patch.object(AlarmRecorder, "async_stop", AsyncMock(side_effect=OSError("kaputt"))),
        "actions": lambda: patch.object(WorkflowRunner, "async_unload", AsyncMock(side_effect=OSError("kaputt"))),
        "maintenance": lambda: patch("custom_components.alarmageddon.async_stop_maintenance", AsyncMock(side_effect=OSError("kaputt"))),
    }
    with targets[part]():
        assert await hass.config_entries.async_unload(entry.entry_id)
    assert entry.state is ConfigEntryState.NOT_LOADED
    # Neu laden geht, die Entität ist wieder da
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert state(hass) == AlarmControlPanelState.DISARMED
    assert "failed; the alarm system runs without it" in caplog.text


async def test_a_failed_setup_leaves_no_sensor_listener_behind(hass: HomeAssistant) -> None:
    """Scheitert das Laden spät (hier der Zeitplan), meldet sich auch der Controller wieder ab (kein Hören auf Sensoren ohne Anlage)."""
    for entity in (FRONT_DOOR, WINDOW, MOTION):
        hass.states.async_set(entity, "off")
    entry = MockConfigEntry(domain=DOMAIN, title="Haus", data={"name": "Haus"}, options=options())
    entry.add_to_hass(hass)
    with patch("custom_components.alarmageddon.Scheduler.async_start", side_effect=RuntimeError("kaputt")):
        assert not await hass.config_entries.async_setup(entry.entry_id)
    assert entry.state is ConfigEntryState.SETUP_ERROR
    ctl = entry.runtime_data.controller
    assert ctl._unsub_sensors is None


# ----- Codes: ein beschädigter Eintrag stört die anderen nicht -----


def test_a_damaged_code_entry_never_matches_and_does_not_break_the_rest() -> None:
    good = hash_code("2468")
    candidates = [("kein-hex", "auch-nicht"), (None, None), ("abcd", "zz"), good]
    assert match_code("2468", candidates) == 3
    assert match_code("1111", candidates) is None
    assert verify_code("2468", "abcd", "kein-hex") is False
    assert verify_code("2468", 5, "ab") is False  # type: ignore[arg-type]


async def test_disarming_works_with_a_damaged_main_code_and_a_personal_code(hass: HomeAssistant) -> None:
    code_hash, salt = hash_code("1357")
    entry = await setup_alarm(
        hass, code_hash="kein-hex", code_salt="zz",
        codes=[{"id": "a", "name": "Anna", "user_id": None, "hash": code_hash, "salt": salt}],
    )
    await hass.services.async_call("alarm_control_panel", "alarm_arm_home", {"entity_id": "alarm_control_panel.haus", "code": "1357"}, blocking=True)
    await hass.async_block_till_done()
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    await hass.services.async_call("alarm_control_panel", "alarm_disarm", {"entity_id": "alarm_control_panel.haus", "code": "1357"}, blocking=True)
    await hass.async_block_till_done()
    assert state(hass) == AlarmControlPanelState.DISARMED
    # Hauptcode ohne Salz: übersprungen statt Fehler (KeyError)
    hass.config_entries.async_update_entry(entry, options={**entry.options, "code_hash": "abcd", "code_salt": ""})
    await hass.async_block_till_done()
    ctl = entry.runtime_data.controller
    assert [name for _c, name in ctl._candidates()] == ["Anna"]


# ----- Löschen: die Anlage wird zwischen Prüfung und Löschen nicht scharf -----


async def test_delete_is_refused_when_the_system_was_armed_while_the_backup_was_written(hass: HomeAssistant, hass_ws_client) -> None:
    entry = await setup_alarm(hass, exit_delay_away=0)
    client = await hass_ws_client(hass)
    real = sensor_history  # nur damit der Import benutzt wird (Modul der Statistik)
    assert real is sensor_history

    from custom_components.alarmageddon import backup

    original = backup.async_create_backup

    async def arming_meanwhile(*args, **kwargs):
        result = await original(*args, **kwargs)
        await entry.runtime_data.controller.async_arm("away", None)
        return result

    with patch.object(backup, "async_create_backup", arming_meanwhile):
        result = await _delete(client, entry, backup_name="Vor dem Löschen")
    assert result["success"] is False and result["error"]["code"] == "not_disarmed", result
    assert hass.config_entries.async_get_entry(entry.entry_id) is not None
    assert state(hass) == AlarmControlPanelState.ARMED_AWAY


# ----- Platzhalter: ein eingesetzter Wert wird nicht noch einmal ersetzt -----


async def test_placeholders_are_filled_in_one_pass(hass: HomeAssistant, hass_ws_client) -> None:
    pushes = async_mock_service(hass, "notify", "handy")
    await setup_alarm(
        hass, "Haus {sensor}", exit_delay_away=0, entry_delay=0,
        workflows={"away": [{"type": "notify", "title": "{name}|{mode}", "message": "{sensor}|{unbekannt}|{time}"}]},
    )
    await _notify_settings(hass, hass_ws_client)
    hass.states.async_set(MOTION, "off", {"friendly_name": "Bewegung {time} {name}", "device_class": "motion"})
    alarm = "alarm_control_panel.haus_sensor"
    await call(hass, "alarm_arm_away", alarm)
    await keep_attributes(hass, MOTION)
    assert pushes[-1].data["title"].startswith("Haus {sensor}|")
    message = pushes[-1].data["message"]
    # Der Name des Sensors enthält selbst Platzhalter: sie bleiben, wie sie sind
    assert message.startswith("Bewegung {time} {name}|{unbekannt}|") and "Haus {sensor}" not in message


# ----- Standardwerte -----


def test_validated_steps_never_share_their_default_values() -> None:
    first = valid_step({"type": "action", "action": "light.turn_on"})
    second = valid_step({"type": "action", "action": "light.turn_off"})
    first["data"]["brightness"] = 255
    first["target"].append("light.x")
    assert second["data"] == {} and second["target"] == []
    assert valid_step({"type": "action", "action": "light.toggle"})["data"] == {}


# ----- Statistik beim gleichzeitigen Start -----


async def test_the_statistics_are_loaded_once_for_systems_that_start_together(hass: HomeAssistant) -> None:
    loads = []
    original = sensor_history.SensorStats.async_load

    async def slow_load(self):
        loads.append(1)
        await asyncio.sleep(0.05)
        await original(self)
        self.marker = "loaded"

    with patch.object(sensor_history.SensorStats, "async_load", slow_load):
        first, second = await asyncio.gather(sensor_history.async_get_stats(hass), sensor_history.async_get_stats(hass))
    # Auch die zweite Anlage bekommt erst die geladene Instanz (sonst überschriebe das Laden ihre ersten Zähler)
    assert first is second and len(loads) == 1 and second.marker == "loaded"


async def test_a_failed_statistics_load_leaves_nothing_half_built(hass: HomeAssistant) -> None:
    with patch.object(sensor_history.SensorStats, "async_load", AsyncMock(side_effect=OSError("kaputt"))), pytest.raises(OSError):
        await sensor_history.async_get_stats(hass)
    assert hass.data.get(sensor_history.DATA_STATS) is None
    # Der nächste Versuch lädt neu
    assert isinstance(await sensor_history.async_get_stats(hass), sensor_history.SensorStats)
    assert DOMAIN


def test_group_recipient_lists_only_keep_valid_notify_names() -> None:
    """Empfänger der Gruppen (Alarm, Wartung): nur gültige Namen von notify-Diensten, ohne Obergrenze (nie ein Empfänger weniger)."""
    from custom_components.alarmageddon.settings import valid_notify

    many = [f"notify.mobile_app_p{i}" for i in range(30)]
    cfg = valid_notify({"alarm_targets": ["notify.a", "notify.A", "notify.a b", "notify.", "notify.x.y", "light.x", 5, "notify.a", *many],
                        "maintenance_targets": ["notify.wartung", "notify.mit-strich"]})
    assert cfg["alarm_targets"] == ["notify.a", *many]
    assert cfg["maintenance_targets"] == ["notify.wartung"]
