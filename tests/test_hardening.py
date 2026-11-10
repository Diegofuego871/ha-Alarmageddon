"""
Härtung nach dem Code-Review (0.40.0): Wettläufe im Zustandsautomaten, Test gegen echten Alarm, Einstellungen
beim gleichzeitigen Start, "Alarm endet" nach einem Neustart, Aufzeichnung ohne Deaktivieren.
"""

from __future__ import annotations

import asyncio
from datetime import timedelta
import time

import pytest
from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import Context, HomeAssistant, State
from homeassistant.exceptions import ServiceValidationError
from homeassistant.setup import async_setup_component
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import MockConfigEntry, async_mock_service, mock_restore_cache_with_extra_data

from custom_components.alarmageddon import controller as controller_module
from custom_components.alarmageddon.code import hash_code, match_code
from custom_components.alarmageddon.const import DATA_SETTINGS, RECORDINGS_STORE_KEY
from custom_components.alarmageddon.settings import Settings, async_get_settings

from .conftest import ALARM, FRONT_DOOR, MOTION, WINDOW, options, setup_alarm
from .test_actions import END_NOTIFY, PHONE, _notify_settings, _phone, _setup_workflow
from .test_alarm import advance, call, open_sensor, settle, state


async def test_sensor_during_code_check_keeps_the_entry_delay(hass: HomeAssistant, freezer, monkeypatch) -> None:
    """
    Die Code-Prüfung läuft im Executor. Öffnet währenddessen die Haustür (Eingangsverzögerung), darf das Scharfschalten in
    einen anderen Modus die Verzögerung nicht still beenden: es wird abgelehnt, die Verzögerung läuft weiter zum Alarm.
    """
    code_hash, salt = hash_code("1234")
    await setup_alarm(hass, code_hash=code_hash, code_salt=salt, code_arm_required=True, exit_delay_away=0)
    await call(hass, "alarm_arm_home", code="1234")
    assert state(hass) == AlarmControlPanelState.ARMED_HOME

    def slow_match(code: str, candidates: list[tuple[str, str]]) -> int | None:
        # Im Thread der Prüfung: die Haustür geht auf, bevor die Prüfung zurückkehrt
        hass.loop.call_soon_threadsafe(hass.states.async_set, FRONT_DOOR, "on")
        time.sleep(0.3)
        return match_code(code, candidates)

    monkeypatch.setattr(controller_module, "match_code", slow_match)
    with pytest.raises(ServiceValidationError) as err:
        await call(hass, "alarm_arm_away", code="1234")
    assert err.value.translation_key == "disarm_first"
    assert state(hass) == AlarmControlPanelState.PENDING
    await advance(hass, freezer, 21)
    assert state(hass) == AlarmControlPanelState.TRIGGERED


async def test_real_alarm_interrupts_a_running_test(hass: HomeAssistant, hass_ws_client) -> None:
    """
    Läuft ein Test der Aktionen und ein echter Alarm tritt ein, endet der Test und der echte Ablauf startet sofort. Die Geräte
    des Tests werden dabei nicht zurückgestellt (das dürfte die Sirene nicht wieder ausschalten): der echte Alarm übernimmt
    den Schnappschuss des Tests, beim Deaktivieren kehren die Geräte in den Zustand von vor dem Test zurück.
    """
    entry, s = await _setup_workflow(hass)
    pushes = async_mock_service(hass, "notify", "handy")
    await _notify_settings(hass, hass_ws_client)
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "alarmageddon/test_workflow", "entry_id": entry.entry_id, "trigger": "home"})
    assert (await client.receive_json())["success"]
    await settle(hass)
    assert len(s["switch.turn_on"]) == 1 and entry.runtime_data.workflow.running["test"]
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    running = entry.runtime_data.workflow.running
    assert running and not running["test"] and running["trigger"] == "home"
    assert not s["switch.turn_off"]  # kein Zurückstellen zwischendurch: die Sirene bleibt nicht kurz aus
    assert len(s["switch.turn_on"]) == 2  # der echte Ablauf hat die Sirene eingeschaltet
    assert pushes and pushes[0].data["title"].startswith("Alarm")
    await call(hass, "alarm_disarm")
    await settle(hass)
    assert len(s["switch.turn_off"]) == 1  # zurück in den Zustand von vor dem Test (Sirene aus)


async def test_settings_loaded_together_give_one_instance(hass: HomeAssistant, monkeypatch) -> None:
    """Beim Start laden alle Anlagen die Einstellungen zugleich: es darf nur eine Instanz entstehen (ein Store, alle Listener)."""
    hass.data.pop(DATA_SETTINGS, None)
    original = Settings.async_load

    async def slow_load(self: Settings) -> None:
        await asyncio.sleep(0)  # der Speicher der Tests antwortet sofort; echte Dateien geben die Kontrolle ab
        await original(self)

    monkeypatch.setattr(Settings, "async_load", slow_load)
    results = await asyncio.gather(*(async_get_settings(hass) for _ in range(5)))
    assert all(r is results[0] for r in results)
    assert hass.data[DATA_SETTINGS] is results[0]


async def test_alarm_end_message_after_restart_uses_the_mode(hass: HomeAssistant, hass_ws_client) -> None:
    """Neustart mitten im Alarm: "Alarm endet" nimmt die eigene Meldung des Modus, in dem der Alarm lief (nicht "immer aktiv")."""
    pushes = async_mock_service(hass, "notify", "handy")
    data = {"mode": "home", "deadline": None, "bypassed": [], "triggered_by": WINDOW, "changed_by": None}
    mock_restore_cache_with_extra_data(hass, [(State(ALARM, "triggered"), data)])
    await setup_alarm(hass, workflow_end={"home": {"notify": END_NOTIFY}})
    await _notify_settings(hass, hass_ws_client)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    await call(hass, "alarm_disarm")
    await hass.async_block_till_done()
    assert pushes and pushes[-1].data["title"] == "Ruhe in Haus"


async def test_recording_closes_when_the_alarm_ends_without_disarm(hass: HomeAssistant, hass_storage, freezer) -> None:
    """Endet ein Alarm ohne Deaktivieren (alte Alarmdauer aus der Wiederherstellung), wird die Aufzeichnung abgeschlossen."""
    now = dt_util.utcnow()
    key = f"{RECORDINGS_STORE_KEY}.rec_end"
    record = {"id": now.isoformat(), "start": now.isoformat(), "end": None, "ended_by": None, "mode": "home", "sensor": WINDOW,
              "entries": [{"t": now.isoformat(), "kind": "state", "state": "triggered", "sensor": WINDOW}]}
    hass_storage[key] = {"version": 1, "minor_version": 1, "key": key, "data": [record]}
    deadline = (now + timedelta(seconds=5)).isoformat()
    data = {"mode": "home", "deadline": deadline, "bypassed": [], "triggered_by": WINDOW, "changed_by": None}
    mock_restore_cache_with_extra_data(hass, [(State(ALARM, "triggered"), data)])
    for entity in (FRONT_DOOR, WINDOW, MOTION):
        hass.states.async_set(entity, "off")
    entry = MockConfigEntry(domain="alarmageddon", entry_id="rec_end", title="Haus", data={"name": "Haus"}, options=options())
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    recorder = entry.runtime_data.recorder
    assert recorder.current is not None
    await advance(hass, freezer, 6)
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    assert recorder.current is None
    assert recorder.recordings[0]["end"] and recorder.recordings[0]["reason"] == "ended"


async def test_flapping_offline_entries_are_limited(hass: HomeAssistant, freezer, monkeypatch) -> None:
    """Ein Sensor, der in der Eingangsverzögerung dauernd ausfällt und zurückkommt, füllt die Aufzeichnung nicht ohne Grenze."""
    from custom_components.alarmageddon import recording

    monkeypatch.setattr(recording, "RECORDINGS_ENTRIES_KEEP", 8)
    entry = await setup_alarm(hass, exit_delay_away=0, entry_delay=600)
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, FRONT_DOOR)
    assert state(hass) == AlarmControlPanelState.PENDING
    for _ in range(10):
        hass.states.async_set(MOTION, "unavailable")  # "Sensor ausgefallen" wird je Ausfall gemeldet und aufgezeichnet
        await settle(hass)
        hass.states.async_set(MOTION, "off")
        await settle(hass)
    record = entry.runtime_data.recorder.current
    assert record["truncated"] is True
    assert len(record["entries"]) <= 8 + 1  # die Grenze plus höchstens ein Zustandseintrag


async def _alarm_with_disarm_button(hass: HomeAssistant, hass_ws_client, targets: list[str]):
    """Anlage im Alarm, Knopf "Deaktivieren" eingeschaltet, Alarm-Empfänger wie angegeben."""
    entry = await setup_alarm(hass)
    await _notify_settings(hass, hass_ws_client, alarm_targets=targets, disarm_action=True)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    return f"ALARMAGEDDON_DISARM_{entry.entry_id}"


async def test_push_action_only_from_a_configured_recipient(hass: HomeAssistant, hass_ws_client) -> None:
    """
    Das Ereignis der Knöpfe kann jedes registrierte Companion-Gerät feuern (Webhook "fire_event"). Es wirkt nur, wenn der
    Benutzer des Geräts zu einem konfigurierten Alarm-Empfänger gehört; ohne Absender oder von einem anderen Gerät nicht.
    """
    recipient = await _phone(hass)  # notify.mobile_app_handy: Alarm-Empfänger
    stranger = await _phone(hass, device="Tablet", user="Gast")  # registriert, aber kein Empfänger
    action = await _alarm_with_disarm_button(hass, hass_ws_client, [PHONE])
    for context in (None, Context(), Context(user_id="unbekannt"), stranger):
        hass.bus.async_fire("mobile_app_notification_action", {"action": action}, context=context)
        await hass.async_block_till_done()
        assert state(hass) == AlarmControlPanelState.TRIGGERED
    hass.bus.async_fire("mobile_app_notification_action", {"action": action}, context=recipient)
    await hass.async_block_till_done()
    assert state(hass) == AlarmControlPanelState.DISARMED


async def test_push_action_from_a_member_of_a_notify_group(hass: HomeAssistant, hass_ws_client) -> None:
    """Empfänger ist eine notify-Gruppe (echte Plattform "group" von Home Assistant): ihre Mitglieder dürfen antworten, andere nicht."""
    member = await _phone(hass)
    stranger = await _phone(hass, device="Tablet", user="Gast")
    assert await async_setup_component(hass, "notify", {"notify": [{"platform": "group", "name": "familie", "services": [{"action": "mobile_app_handy"}]}]})
    await hass.async_block_till_done()
    assert hass.services.has_service("notify", "familie")
    action = await _alarm_with_disarm_button(hass, hass_ws_client, ["notify.familie"])
    hass.bus.async_fire("mobile_app_notification_action", {"action": action}, context=stranger)
    await hass.async_block_till_done()
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    hass.bus.async_fire("mobile_app_notification_action", {"action": action}, context=member)
    await hass.async_block_till_done()
    assert state(hass) == AlarmControlPanelState.DISARMED


async def test_log_answers_unchanged_until_something_new(hass: HomeAssistant, hass_ws_client) -> None:
    """Das Panel fragt das Protokoll alle 5 s ab: mit dem Stand der letzten Antwort kommt nur dann wieder alles, wenn etwas dazukam."""
    await setup_alarm(hass, exit_delay_away=0)
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "alarmageddon/log"})
    first = (await client.receive_json())["result"]
    assert first["systems"] and first["rev"]
    await client.send_json({"id": 2, "type": "alarmageddon/log", "rev": first["rev"]})
    assert (await client.receive_json())["result"] == {"unchanged": True, "rev": first["rev"]}
    await call(hass, "alarm_arm_away")
    await client.send_json({"id": 3, "type": "alarmageddon/log", "rev": first["rev"]})
    third = (await client.receive_json())["result"]
    assert third["rev"] != first["rev"] and third["systems"][0]["events"][0]["state"] == "armed_away"
    # Ein Alarm ändert die Aufzeichnung: auch das zählt als neuer Stand
    await open_sensor(hass, WINDOW)
    await client.send_json({"id": 4, "type": "alarmageddon/log", "rev": third["rev"]})
    fourth = (await client.receive_json())["result"]
    assert fourth["systems"][0]["recording"] is True and fourth["rev"] != third["rev"]


async def test_last_changes_are_written_despite_constant_changes(hass: HomeAssistant, hass_storage, freezer) -> None:
    """Dauernd wechselnde Sensoren dürfen das Schreiben nicht immer weiter hinausschieben (Store.async_delay_save verschiebt sonst)."""
    settings = await async_get_settings(hass)
    for index in range(4):
        settings.note_change(f"binary_sensor.wechsel_{index}", "2026-11-09T10:00:00+00:00")
        await advance(hass, freezer, 3)
    stored = hass_storage["alarmageddon.settings"]["data"]["last_changes"]
    assert "binary_sensor.wechsel_0" in stored
    # Sofortiges Schreiben (Meldungen speichern) verwirft den Termin; danach wird wieder verzögert geschrieben
    await settings.async_set_notify(settings.notify)
    settings.note_change("binary_sensor.danach", "2026-11-09T10:01:00+00:00")
    await advance(hass, freezer, 6)
    assert "binary_sensor.danach" in hass_storage["alarmageddon.settings"]["data"]["last_changes"]
