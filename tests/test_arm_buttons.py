"""
Knöpfe der Meldung "Scharfschalten nicht möglich" (1.18.0): "Erneut versuchen" und "Trotzdem scharf schalten".

Verhindert ein offener Sensor das Scharfschalten, trägt die Push-Meldung zwei Knöpfe. "Erneut versuchen" schaltet denselben
Modus noch einmal scharf, "Trotzdem scharf schalten" übergeht die offenen Sensoren bis zum Deaktivieren. Entscheide des Nutzers
(2026-11-12): beide standardmässig an und einzeln abschaltbar, ohne Code (auch wenn die Anlage einen zum Scharfschalten
verlangt), gültig eine Stunde und nur, solange die Anlage deaktiviert ist.

Ein Knopf auf dem Handy schaltet hier die Anlage: jede Bedingung ist eine Schutzmassnahme mit Test und Mutationszeile.
"""

from __future__ import annotations

from typing import Any

import pytest
from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import Context, HomeAssistant

from .conftest import ALARM, FRONT_DOOR, MOTION, WINDOW, setup_alarm
from .test_actions import PHONE, _phone
from .test_alarm import _with_code, advance, call, open_sensor, state

VALID = 3600  # Sekunden, die die Knöpfe einer Meldung gelten


async def _settings(hass: HomeAssistant, hass_ws_client, **notify: Any) -> None:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "alarmageddon/save_notify", "notify": {"alarm_targets": [PHONE], "maintenance_targets": [], **notify}})
    assert (await client.receive_json())["success"]


async def _fail(hass: HomeAssistant, service: str = "alarm_arm_home") -> None:
    """Scharfschalten scheitert an einem offenen Sensor: die Meldung geht hinaus."""
    with pytest.raises(Exception):  # noqa: B017,PT011 - welcher Fehler, prüfen die Tests des Automaten
        await call(hass, service)
    await hass.async_block_till_done()


async def _press(hass: HomeAssistant, entry, key: str, context: Context | None) -> None:
    hass.bus.async_fire("mobile_app_notification_action", {"action": f"ALARMAGEDDON_{key}_{entry.entry_id}"}, context=context)
    await hass.async_block_till_done()
    await hass.async_block_till_done()


async def _blocked(hass: HomeAssistant, hass_ws_client, **notify: Any):
    """Anlage mit einem Handy als Empfänger; das Fenster steht offen, Scharfschalten (Anwesend) ist gescheitert."""
    phone = await _phone(hass)
    entry = await setup_alarm(hass)
    await _settings(hass, hass_ws_client, **notify)
    hass.states.async_set(WINDOW, "on")
    await _fail(hass)
    assert state(hass) == AlarmControlPanelState.DISARMED
    pushes = hass.services.async_services()  # nur damit der Dienst sicher registriert ist
    assert "mobile_app_handy" in pushes["notify"]
    return entry, phone


def _actions(hass: HomeAssistant, calls: list) -> list[dict]:
    return list(calls[-1].data["data"].get("actions") or [])


async def test_the_message_carries_both_buttons_and_retry_arms_once_the_sensor_is_closed(hass: HomeAssistant, hass_ws_client) -> None:
    phone = await _phone(hass)
    from pytest_homeassistant_custom_component.common import async_mock_service

    pushes = async_mock_service(hass, "notify", "mobile_app_handy")
    entry = await setup_alarm(hass)
    await _settings(hass, hass_ws_client)
    hass.states.async_set(WINDOW, "on")
    await _fail(hass)
    actions = _actions(hass, pushes)
    assert [a["action"] for a in actions] == [f"ALARMAGEDDON_RETRY_{entry.entry_id}", f"ALARMAGEDDON_FORCE_{entry.entry_id}"]
    assert [a["title"] for a in actions] == ["Try again", "Arm anyway"]
    count = len(pushes)
    # Noch offen: der neue Versuch scheitert wieder, eine neue Meldung mit denselben Knöpfen kommt
    await _press(hass, entry, "RETRY", phone)
    assert state(hass) == AlarmControlPanelState.DISARMED and len(pushes) == count + 1 and len(_actions(hass, pushes)) == 2
    hass.states.async_set(WINDOW, "off")
    await hass.async_block_till_done()
    await _press(hass, entry, "RETRY", phone)
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    assert hass.states.get(ALARM).attributes["changed_by"] == "push notification"
    assert hass.states.get(ALARM).attributes["bypassed_sensors"] == []


async def test_arm_anyway_bypasses_the_open_sensors_until_disarmed(hass: HomeAssistant, hass_ws_client) -> None:
    entry, phone = await _blocked(hass, hass_ws_client)
    await _press(hass, entry, "FORCE", phone)
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    assert hass.states.get(ALARM).attributes["bypassed_sensors"] == [WINDOW]
    # Der übergangene Sensor löst nicht aus, die anderen schon
    hass.states.async_set(WINDOW, "off")
    await hass.async_block_till_done()
    await open_sensor(hass, WINDOW)
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    await open_sensor(hass, FRONT_DOOR)
    assert state(hass) == AlarmControlPanelState.PENDING
    await call(hass, "alarm_disarm")
    assert hass.states.get(ALARM).attributes["bypassed_sensors"] == []


async def test_the_buttons_arm_the_mode_that_failed_with_its_exit_delay(hass: HomeAssistant, hass_ws_client, freezer) -> None:
    phone = await _phone(hass)
    entry = await setup_alarm(hass)
    await _settings(hass, hass_ws_client)
    hass.states.async_set(MOTION, "on")  # nur in der Zone "Abwesend"
    await _fail(hass, "alarm_arm_away")
    await _press(hass, entry, "FORCE", phone)
    assert state(hass) == AlarmControlPanelState.ARMING  # Abwesend, mit seiner Ausgangsverzögerung
    await advance(hass, freezer, 31)
    assert state(hass) == AlarmControlPanelState.ARMED_AWAY and hass.states.get(ALARM).attributes["bypassed_sensors"] == [MOTION]


@pytest.mark.parametrize(
    ("settings", "shown"),
    [({}, ["RETRY", "FORCE"]), ({"arm_force_action": False}, ["RETRY"]), ({"arm_retry_action": False}, ["FORCE"]),
     ({"arm_retry_action": False, "arm_force_action": False}, [])],
    ids=["beide (Standard)", "nur Erneut versuchen", "nur Trotzdem", "keiner"],
)
async def test_each_button_can_be_switched_off_and_then_does_nothing(hass: HomeAssistant, hass_ws_client, settings: dict, shown: list[str]) -> None:
    """Ein abgeschalteter Knopf steht nicht in der Meldung und wirkt auch nicht, wenn ihn jemand trotzdem sendet."""
    phone = await _phone(hass)
    from pytest_homeassistant_custom_component.common import async_mock_service

    pushes = async_mock_service(hass, "notify", "mobile_app_handy")
    entry = await setup_alarm(hass)
    await _settings(hass, hass_ws_client, **settings)
    hass.states.async_set(WINDOW, "on")
    await _fail(hass)
    assert [a["action"] for a in _actions(hass, pushes)] == [f"ALARMAGEDDON_{key}_{entry.entry_id}" for key in shown]
    for key in ("RETRY", "FORCE"):
        if key in shown:
            continue
        hass.states.async_set(WINDOW, "off" if key == "RETRY" else "on")
        await hass.async_block_till_done()
        await _press(hass, entry, key, phone)
        assert state(hass) == AlarmControlPanelState.DISARMED, key


async def test_only_a_recipient_of_the_message_can_press_the_buttons(hass: HomeAssistant, hass_ws_client) -> None:
    """Das Ereignis kann jedes registrierte Companion-Gerät feuern: nur der Benutzer eines Empfängers dieser Meldung schaltet scharf."""
    entry, phone = await _blocked(hass, hass_ws_client)
    stranger = await _phone(hass, device="Tablet", user="Gast")
    for context in (stranger, Context(), None):
        await _press(hass, entry, "FORCE", context)
        assert state(hass) == AlarmControlPanelState.DISARMED
    await _press(hass, entry, "FORCE", phone)
    assert state(hass) == AlarmControlPanelState.ARMED_HOME


async def test_own_recipients_of_this_message_decide_who_may_press(hass: HomeAssistant, hass_ws_client) -> None:
    """Hat die Meldungsart eigene Empfänger, gelten sie: ein Alarm-Empfänger, der diese Meldung nicht bekommt, schaltet nicht scharf."""
    alarm_only = await _phone(hass)  # notify.mobile_app_handy: Alarm-Empfänger
    own = await _phone(hass, device="Tablet", user="Marco")
    entry = await setup_alarm(hass)
    await _settings(hass, hass_ws_client, types={"arm_failed": {"targets": ["notify.mobile_app_tablet"]}})
    hass.states.async_set(WINDOW, "on")
    await _fail(hass)
    await _press(hass, entry, "FORCE", alarm_only)
    assert state(hass) == AlarmControlPanelState.DISARMED
    await _press(hass, entry, "FORCE", own)
    assert state(hass) == AlarmControlPanelState.ARMED_HOME


async def test_the_buttons_expire_after_one_hour(hass: HomeAssistant, hass_ws_client, freezer) -> None:
    """Eine alte Meldung, die auf dem Handy liegen blieb, schaltet die Anlage nicht später überraschend scharf."""
    entry, phone = await _blocked(hass, hass_ws_client)
    await advance(hass, freezer, VALID + 1)
    await _press(hass, entry, "FORCE", phone)
    assert state(hass) == AlarmControlPanelState.DISARMED
    # Ein neuer gescheiterter Versuch gilt wieder, bis kurz vor Ablauf
    await _fail(hass)
    await advance(hass, freezer, VALID - 5)
    await _press(hass, entry, "FORCE", phone)
    assert state(hass) == AlarmControlPanelState.ARMED_HOME


async def test_a_message_is_used_up_once_the_system_was_armed(hass: HomeAssistant, hass_ws_client) -> None:
    """Nach dem Scharfschalten (gleich auf welchem Weg) ist die Meldung verbraucht: sie schaltet nach dem Deaktivieren nicht noch einmal scharf."""
    entry, phone = await _blocked(hass, hass_ws_client)
    hass.states.async_set(WINDOW, "off")
    await hass.async_block_till_done()
    await call(hass, "alarm_arm_home")  # von Hand, nicht über den Knopf
    await call(hass, "alarm_disarm")
    await _press(hass, entry, "RETRY", phone)
    await _press(hass, entry, "FORCE", phone)
    assert state(hass) == AlarmControlPanelState.DISARMED


async def test_the_buttons_only_work_while_disarmed_and_without_a_failed_attempt_never(hass: HomeAssistant, hass_ws_client) -> None:
    phone = await _phone(hass)
    entry = await setup_alarm(hass)
    await _settings(hass, hass_ws_client)
    # Ohne gescheiterten Versuch gibt es nichts zu wiederholen
    await _press(hass, entry, "RETRY", phone)
    await _press(hass, entry, "FORCE", phone)
    assert state(hass) == AlarmControlPanelState.DISARMED
    # Der Knopf einer anderen Anlage wirkt hier nicht
    other = await setup_alarm(hass, title="Garage")
    hass.states.async_set(WINDOW, "on")
    await _fail(hass)
    await _press(hass, other, "FORCE", phone)
    assert state(hass) == AlarmControlPanelState.DISARMED
    assert hass.states.get("alarm_control_panel.garage").state == AlarmControlPanelState.DISARMED


async def test_the_buttons_arm_without_a_code_even_if_arming_needs_one(hass: HomeAssistant, hass_ws_client) -> None:
    """Entscheid des Nutzers: der Knopf kommt vom Handy eines Empfängers (von Home Assistant beglaubigt), ein Code ist nicht nötig."""
    phone = await _phone(hass)
    await _with_code(hass, code_arm_required=True)
    entry = hass.config_entries.async_entries("alarmageddon")[0]
    await _settings(hass, hass_ws_client)
    hass.states.async_set(WINDOW, "on")
    with pytest.raises(Exception):  # noqa: B017,PT011
        await call(hass, "alarm_arm_home", code="1234")
    await hass.async_block_till_done()
    await _press(hass, entry, "FORCE", phone)
    assert state(hass) == AlarmControlPanelState.ARMED_HOME


async def test_the_buttons_survive_a_reload_of_the_system(hass: HomeAssistant, hass_ws_client) -> None:
    """Einstellungen gespeichert, während die Meldung auf dem Handy liegt: die Knöpfe wirken weiter (innerhalb der Stunde)."""
    entry, phone = await _blocked(hass, hass_ws_client)
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    await _press(hass, entry, "FORCE", phone)
    assert state(hass) == AlarmControlPanelState.ARMED_HOME


async def test_a_mode_switched_off_meanwhile_is_not_armed(hass: HomeAssistant, hass_ws_client) -> None:
    phone = await _phone(hass)
    entry = await setup_alarm(hass, night_enabled=True)
    await _settings(hass, hass_ws_client)
    hass.states.async_set(WINDOW, "on")
    await _fail(hass, "alarm_arm_night")
    hass.config_entries.async_update_entry(entry, options={**entry.options, "night_enabled": False})
    await hass.async_block_till_done()
    await _press(hass, entry, "FORCE", phone)
    assert state(hass) == AlarmControlPanelState.DISARMED


async def test_the_settings_of_the_buttons_are_saved_and_validated(hass: HomeAssistant, hass_ws_client) -> None:
    await setup_alarm(hass)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "alarmageddon/data"})
    notify = (await client.receive_json())["result"]["notify"]
    assert notify["arm_retry_action"] is True and notify["arm_force_action"] is True
    await client.send_json_auto_id({"type": "alarmageddon/save_notify", "notify": {**notify, "arm_retry_action": False}})
    saved = (await client.receive_json())["result"]["notify"]
    assert saved["arm_retry_action"] is False and saved["arm_force_action"] is True
    await client.send_json_auto_id({"type": "alarmageddon/save_notify", "notify": {**notify, "arm_force_action": "nein"}})
    assert (await client.receive_json())["success"] is False  # nur wahr oder falsch
    # In der Sicherung (die Einstellungen der Meldungen sind global)
    await client.send_json_auto_id({"type": "alarmageddon/export"})
    assert (await client.receive_json())["result"]["settings"]["notify"]["arm_retry_action"] is False


async def test_a_button_never_changes_the_mode_of_a_system_that_is_not_disarmed(hass: HomeAssistant, hass_ws_client) -> None:
    """Zweite Sicherung: selbst wenn noch ein gescheiterter Versuch gemerkt wäre, wirkt ein Knopf nur bei deaktivierter Anlage."""
    from homeassistant.util import dt as dt_util

    from custom_components.alarmageddon.const import DATA_ARM_FAILED

    entry, phone = await _blocked(hass, hass_ws_client)
    hass.states.async_set(WINDOW, "off")
    await hass.async_block_till_done()
    await call(hass, "alarm_arm_home")
    hass.data[DATA_ARM_FAILED][entry.entry_id] = {"mode": "away", "at": dt_util.utcnow()}
    await _press(hass, entry, "FORCE", phone)
    await _press(hass, entry, "RETRY", phone)
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
