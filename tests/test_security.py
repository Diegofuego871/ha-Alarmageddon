"""
Sicherheitseigenschaften der Alarmanlage, systematisch (0.40.0, Code-Review).

Jeder Test hier prüft eine Zusage, die für ein Sicherheitsprodukt gelten muss, und zwar möglichst vollständig statt an
einem Beispiel: jeder WebSocket-Befehl, jeder Zustand, jede Art von fremder Kennung. Neue Befehle, Zustände oder
Empfängertypen müssen hier ergänzt werden; mehrere Tests schlagen von selbst fehl, wenn eine Ergänzung fehlt.

Gliederung: Berechtigung, Trennung der Anlagen, Geheimnisse, Code-Sperre, Zustandsautomat, feindliche Eingaben,
Robustheit von Meldungen und Ablauf, statische Pfade, Neuladen.
"""

from __future__ import annotations

from datetime import timedelta
import itertools
import json
import logging
from typing import Any

import pytest
from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant, State
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.exceptions import HomeAssistantError, ServiceValidationError
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.network import NoURLAvailableError
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import MockConfigEntry, async_mock_service, mock_restore_cache_with_extra_data

from custom_components.alarmageddon import websocket_api as ws_module
from custom_components.alarmageddon import workflow as workflow_module
from custom_components.alarmageddon.code import hash_code
from custom_components.alarmageddon.const import CODE_LOCKOUT_SECONDS, CODE_MAX_ATTEMPTS, DOMAIN, MAX_STEPS

from .conftest import ALARM, FRONT_DOOR, MOTION, WINDOW, options, setup_alarm
from .test_actions import PHONE, PLAYER, SIREN, _notify_settings, _phone, _setup_workflow
from .test_alarm import advance, call, open_sensor, settle, state

_ids = itertools.count(1)


async def ws(client, **msg: Any) -> dict[str, Any]:
    """Einen WebSocket-Befehl senden und die Antwort zurückgeben."""
    await client.send_json({"id": next(_ids), **msg})
    return await client.receive_json()


# Jeder Befehl des Panels mit einer gültigen kleinsten Nachricht ("ENTRY" wird durch die Kennung der Anlage ersetzt).
# Vollständigkeit prüft test_every_websocket_command_is_listed: ein neuer Befehl ohne Eintrag lässt die Tests scheitern.
COMMANDS: dict[str, dict[str, Any]] = {
    "data": {},
    "save_zones": {"entry_id": "ENTRY", "zones": {}, "entry_sensors": []},
    "arm": {"entry_id": "ENTRY", "mode": "off"},
    "rename": {"entry_id": "ENTRY", "name": "Neuer Name"},
    "save_presets": {"presets": {}},
    "save_system": {"entry_id": "ENTRY"},
    "save_notify": {"notify": {}},
    "test_notify": {"kind": "armed"},
    "test_end_notify": {"entry_id": "ENTRY", "notify": {}},
    "save_workflows": {"entry_id": "ENTRY", "workflows": {}},
    "test_workflow": {"entry_id": "ENTRY", "trigger": "home"},
    "stop_workflow": {"entry_id": "ENTRY"},
    "battery_forecast": {},
    "log": {},
    "export": {},
    "import": {"data": {}},
    "backups": {},
    "backup_create": {},
    "backup_get": {"backup_id": "x"},
    "backup_delete": {"backup_id": "x"},
    "add_code": {"entry_id": "ENTRY", "name": "Anna", "code": "2468"},
    "remove_code": {"entry_id": "ENTRY", "code_id": "x"},
}


def _message(command: str, entry_id: str) -> dict[str, Any]:
    payload = {k: (entry_id if v == "ENTRY" else v) for k, v in COMMANDS[command].items()}
    return {"type": f"{DOMAIN}/{command}", **payload}


# ----- Berechtigung -----


def test_every_websocket_command_is_listed() -> None:
    """Die Liste oben kennt genau die Befehle des Moduls: ein neuer Befehl braucht einen Eintrag (und damit die Tests unten)."""
    registered = {f._ws_command for f in vars(ws_module).values() if callable(f) and hasattr(f, "_ws_command")}
    assert registered == {f"{DOMAIN}/{name}" for name in COMMANDS}


@pytest.mark.parametrize("command", sorted(COMMANDS))
async def test_every_websocket_command_is_admin_only(hass: HomeAssistant, hass_ws_client, hass_read_only_access_token, command: str) -> None:
    """Kein Befehl des Panels ist für einen Benutzer ohne Administratorrechte erreichbar: weder lesen noch schalten."""
    entry = await setup_alarm(hass)
    client = await hass_ws_client(hass, hass_read_only_access_token)
    result = await ws(client, **_message(command, entry.entry_id))
    assert result["success"] is False and result["error"]["code"] == "unauthorized", result
    assert state(hass) == AlarmControlPanelState.DISARMED
    assert entry.title == "Haus" and not entry.options.get("codes")


@pytest.mark.parametrize("command", sorted(name for name, payload in COMMANDS.items() if "entry_id" in payload))
async def test_every_command_rejects_foreign_and_unloaded_entries(hass: HomeAssistant, hass_ws_client, command: str) -> None:
    """Jeder Befehl mit einer Anlage lehnt unbekannte Kennungen, Einträge anderer Integrationen und nicht geladene Anlagen ab."""
    await setup_alarm(hass)
    other = MockConfigEntry(domain="andere_integration", title="Fremd", data={})
    other.add_to_hass(hass)
    # Geladen, wie eine echte fremde Integration: abgelehnt wird sie allein wegen der Domäne
    other.mock_state(hass, ConfigEntryState.LOADED)
    unloaded = MockConfigEntry(domain=DOMAIN, title="Nicht geladen", data={"name": "Nicht geladen"}, options=options())
    unloaded.add_to_hass(hass)
    assert unloaded.state is ConfigEntryState.NOT_LOADED
    client = await hass_ws_client(hass)
    for entry_id in ("gibt-es-nicht", other.entry_id, unloaded.entry_id):
        result = await ws(client, **_message(command, entry_id))
        assert result["success"] is False and result["error"]["code"] == "not_found", (entry_id, result)
    assert other.title == "Fremd" and unloaded.title == "Nicht geladen"


# ----- Trennung der Anlagen -----


async def test_systems_are_isolated(hass: HomeAssistant, hass_ws_client) -> None:
    """Zwei Anlagen: Sensor, Code und Push-Knopf der einen wirken nie auf die andere."""
    garage_door = "binary_sensor.garagentor"
    hass.states.async_set(garage_door, "off")
    code_hash, salt = hash_code("1357")
    haus = await setup_alarm(hass, "Haus", code_hash=code_hash, code_salt=salt)
    garage = MockConfigEntry(domain=DOMAIN, title="Garage", data={"name": "Garage"}, options=options(zone_home=[garage_door], zone_away=[garage_door], entry_sensors=[]))
    garage.add_to_hass(hass)
    assert await hass.config_entries.async_setup(garage.entry_id)
    await hass.async_block_till_done()
    garage_alarm = "alarm_control_panel.garage"
    recipient = await _phone(hass)
    await _notify_settings(hass, hass_ws_client, alarm_targets=[PHONE], disarm_action=True)

    await call(hass, "alarm_arm_home", code="1357")
    await call(hass, "alarm_arm_home", entity=garage_alarm)
    # Sensor der Garage löst nur die Garage aus
    await open_sensor(hass, garage_door)
    assert state(hass, garage_alarm) == AlarmControlPanelState.TRIGGERED
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    # Push-Knopf des Hauses wirkt nicht auf die Garage (und das Haus ist nicht im Alarm: auch dort nichts)
    hass.bus.async_fire("mobile_app_notification_action", {"action": f"ALARMAGEDDON_DISARM_{haus.entry_id}"}, context=recipient)
    await hass.async_block_till_done()
    assert state(hass, garage_alarm) == AlarmControlPanelState.TRIGGERED
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    # Der Knopf der Garage beendet nur deren Alarm
    hass.bus.async_fire("mobile_app_notification_action", {"action": f"ALARMAGEDDON_DISARM_{garage.entry_id}"}, context=recipient)
    await hass.async_block_till_done()
    assert state(hass, garage_alarm) == AlarmControlPanelState.DISARMED
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    # Das Haus verlangt weiter seinen Code; die Garage hat keinen
    with pytest.raises(ServiceValidationError):
        await call(hass, "alarm_disarm")
    assert state(hass) == AlarmControlPanelState.ARMED_HOME


async def test_silence_button_only_from_a_configured_recipient(hass: HomeAssistant, hass_ws_client) -> None:
    """Auch "Sirene stumm" nimmt die Anlage nur von einem konfigurierten Empfänger an (wie "Deaktivieren")."""
    recipient = await _phone(hass)
    stranger = await _phone(hass, device="Tablet", user="Gast")
    entry, services = await _setup_workflow(hass, [{"type": "action", "action": "switch.turn_on", "target": [SIREN], "restore": True}, {"type": "wait", "seconds": 300}])
    await _notify_settings(hass, hass_ws_client, alarm_targets=[PHONE], silence_action=True)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    action = f"ALARMAGEDDON_SILENCE_{entry.entry_id}"
    for context in (None, stranger):
        hass.bus.async_fire("mobile_app_notification_action", {"action": action}, context=context)
        await hass.async_block_till_done()
        assert entry.runtime_data.workflow.running is not None and not services["switch.turn_off"]
    hass.bus.async_fire("mobile_app_notification_action", {"action": action}, context=recipient)
    await hass.async_block_till_done()
    assert entry.runtime_data.workflow.running is None and len(services["switch.turn_off"]) == 1
    assert state(hass) == AlarmControlPanelState.TRIGGERED


# ----- Geheimnisse -----


async def test_codes_and_hashes_never_leave_the_server(hass: HomeAssistant, hass_ws_client, hass_storage, caplog) -> None:
    """
    Weder ein Code im Klartext noch Hash oder Salz erscheinen in einer Antwort an das Panel, in Zustand und Attributen,
    in den Ablagen der Integration (Ereignisse, Aufzeichnung, Sicherungen, Einstellungen) oder in ihren Logzeilen.
    """
    caplog.set_level(logging.DEBUG)
    main, personal, wrong = "84615297", "73920518", "55550000"
    code_hash, salt = hash_code(main)
    entry = await setup_alarm(hass, code_hash=code_hash, code_salt=salt, code_arm_required=True, exit_delay_away=0)
    client = await hass_ws_client(hass)
    assert (await ws(client, type=f"{DOMAIN}/add_code", entry_id=entry.entry_id, name="Anna", code=personal))["success"]
    await hass.async_block_till_done()
    assert (await ws(client, type=f"{DOMAIN}/arm", entry_id=entry.entry_id, mode="away", code=wrong))["error"]["code"] == "invalid_code"
    assert (await ws(client, type=f"{DOMAIN}/arm", entry_id=entry.entry_id, mode="away", code=personal))["success"]
    await open_sensor(hass, WINDOW)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    assert (await ws(client, type=f"{DOMAIN}/arm", entry_id=entry.entry_id, mode="off", code=main))["success"]
    await settle(hass)

    personal_entry = entry.options["codes"][0]
    secrets = [main, personal, wrong, code_hash, salt, personal_entry["hash"], personal_entry["salt"]]
    answers = {}
    for command in ("data", "log", "export", "backups"):
        answers[command] = (await ws(client, type=f"{DOMAIN}/{command}"))["result"]
    created = (await ws(client, type=f"{DOMAIN}/backup_create", name="vor dem Umbau"))["result"]
    answers["backup"] = (await ws(client, type=f"{DOMAIN}/backup_get", backup_id=created["created"]["id"]))["result"]
    alarm = hass.states.get(ALARM)
    answers["state"] = {"state": alarm.state, "attributes": dict(alarm.attributes)}
    await entry.runtime_data.events.async_stop()
    await entry.runtime_data.recorder.async_stop()
    # Ablagen der Integration; die Optionen des Config Entry (dort liegt der Hash, nie der Code) sind nicht darunter
    answers["storage"] = {key: value for key, value in hass_storage.items() if key.startswith(DOMAIN)}
    assert answers["storage"], "die Ablagen der Integration müssen geprüft werden"
    for name, answer in answers.items():
        text = json.dumps(answer, default=str)
        for secret in secrets:
            assert secret not in text, f"Geheimnis in {name}"
    # Der Klartext steht auch nicht in den Optionen (nur Hash und Salz)
    assert main not in json.dumps(dict(entry.options), default=str) and personal not in json.dumps(dict(entry.options), default=str)
    own_log = "\n".join(r.getMessage() for r in caplog.records if r.name.startswith("custom_components.alarmageddon"))
    for secret in secrets:
        assert secret not in own_log


# ----- Code-Sperre -----


async def test_correct_code_is_refused_while_locked_and_accepted_afterwards(hass: HomeAssistant, freezer) -> None:
    """Nach zu vielen falschen Codes hilft auch der richtige nicht (sonst liesse sich weiter durchprobieren); nach der Sperre geht er."""
    code_hash, salt = hash_code("1234")
    await setup_alarm(hass, code_hash=code_hash, code_salt=salt)
    await call(hass, "alarm_arm_home")
    for _ in range(CODE_MAX_ATTEMPTS):
        with pytest.raises(ServiceValidationError) as err:
            await call(hass, "alarm_disarm", code="0000")
        assert err.value.translation_key == "invalid_code"
    for code in ("1234", "0000", None):
        with pytest.raises(ServiceValidationError) as err:
            await call(hass, "alarm_disarm", **({"code": code} if code else {}))
        assert err.value.translation_key == "code_locked"
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    await advance(hass, freezer, CODE_LOCKOUT_SECONDS - 5)
    with pytest.raises(ServiceValidationError) as err:
        await call(hass, "alarm_disarm", code="1234")
    assert err.value.translation_key == "code_locked"
    await advance(hass, freezer, 6)
    await call(hass, "alarm_disarm", code="1234")
    assert state(hass) == AlarmControlPanelState.DISARMED


async def test_wrong_codes_count_together_and_a_success_resets_the_counter(hass: HomeAssistant) -> None:
    """Falsche Codes beim Scharfschalten und Deaktivieren zählen zusammen; ein richtiger Code setzt den Zähler zurück."""
    code_hash, salt = hash_code("1234")
    entry = await setup_alarm(hass, code_hash=code_hash, code_salt=salt, code_arm_required=True)
    ctl = entry.runtime_data.controller
    for _ in range(CODE_MAX_ATTEMPTS - 1):
        with pytest.raises(ServiceValidationError):
            await call(hass, "alarm_arm_home", code="0000")
    await call(hass, "alarm_arm_home", code="1234")  # Erfolg: Zähler zurück
    assert ctl._failed_codes == 0
    for index in range(CODE_MAX_ATTEMPTS - 1):
        with pytest.raises(ServiceValidationError) as err:
            await call(hass, "alarm_disarm" if index % 2 else "alarm_arm_away", code="0000")
        assert err.value.translation_key == "invalid_code"
    with pytest.raises(ServiceValidationError):
        await call(hass, "alarm_disarm", code="0000")  # der fünfte in Folge sperrt
    with pytest.raises(ServiceValidationError) as err:
        await call(hass, "alarm_disarm", code="1234")
    assert err.value.translation_key == "code_locked"
    assert state(hass) == AlarmControlPanelState.ARMED_HOME


# ----- Zustandsautomat -----


async def _into(hass: HomeAssistant, target: str) -> None:
    """Anlage (Abwesend, Ausgangsverzögerung 30 s, Haustür mit Eingangsverzögerung 20 s) in den genannten Zustand bringen."""
    if target == "arming":
        await call(hass, "alarm_arm_away", code="1234")
    elif target == "armed":
        await call(hass, "alarm_arm_home", code="1234")
    elif target == "pending":
        await call(hass, "alarm_arm_home", code="1234")
        await open_sensor(hass, FRONT_DOOR)
    elif target == "triggered":
        await call(hass, "alarm_arm_home", code="1234")
        await open_sensor(hass, WINDOW)


EXPECTED = {"arming": AlarmControlPanelState.ARMING, "armed": AlarmControlPanelState.ARMED_HOME, "pending": AlarmControlPanelState.PENDING,
            "triggered": AlarmControlPanelState.TRIGGERED}


@pytest.mark.parametrize("start", ["pending", "triggered"])
@pytest.mark.parametrize("service", ["alarm_arm_home", "alarm_arm_away", "alarm_arm_night"])
@pytest.mark.parametrize("code_to_arm", [True, False])
async def test_no_arming_out_of_entry_delay_or_alarm(hass: HomeAssistant, freezer, start: str, service: str, code_to_arm: bool) -> None:
    """
    Aus Eingangsverzögerung und Alarm führt nur Deaktivieren heraus: Scharfschalten (jeder Modus) wird abgelehnt, der Alarm
    kommt. Mit und ohne "Code zum Scharfschalten": ohne ihn greift nur die Prüfung vor der Code-Prüfung, mit ihm auch die danach.
    """
    code_hash, salt = hash_code("1234")
    await setup_alarm(hass, code_hash=code_hash, code_salt=salt, code_arm_required=code_to_arm, night_enabled=True)
    await _into(hass, start)
    assert state(hass) == EXPECTED[start]
    with pytest.raises(ServiceValidationError) as err:
        await call(hass, service, code="1234")
    assert err.value.translation_key == "disarm_first"
    assert state(hass) == EXPECTED[start]
    await advance(hass, freezer, 21)
    assert state(hass) == AlarmControlPanelState.TRIGGERED


@pytest.mark.parametrize("start", ["arming", "armed", "pending", "triggered"])
@pytest.mark.parametrize("code", ["0000", "", None, "12345", "1234 ", "abcd"])
async def test_a_wrong_code_never_changes_the_state(hass: HomeAssistant, start: str, code: str | None) -> None:
    """In keinem Zustand deaktiviert ein falscher, leerer oder fehlender Code; Zustand, Modus und Auslöser bleiben, wie sie sind."""
    code_hash, salt = hash_code("1234")
    entry = await setup_alarm(hass, code_hash=code_hash, code_salt=salt, code_arm_required=True)
    await _into(hass, start)
    ctl = entry.runtime_data.controller
    before = (ctl.state, ctl.mode, ctl.triggered_by, ctl.deadline)
    with pytest.raises((ServiceValidationError, HomeAssistantError)):
        await call(hass, "alarm_disarm", **({} if code is None else {"code": code}))
    assert (ctl.state, ctl.mode, ctl.triggered_by, ctl.deadline) == before
    assert state(hass) == EXPECTED[start]


def _restore(hass: HomeAssistant, last: str, **extra: Any) -> None:
    data = {"mode": "home", "deadline": None, "bypassed": [], "triggered_by": None, "changed_by": None, **extra}
    mock_restore_cache_with_extra_data(hass, [(State(ALARM, last), data)])


@pytest.mark.parametrize(
    ("last", "extra", "expected"),
    [
        # Eingangsverzögerung mit unlesbarer oder fehlender Frist: im Zweifel Alarm
        ("pending", {"deadline": "kein Datum", "triggered_by": FRONT_DOOR}, AlarmControlPanelState.TRIGGERED),
        ("pending", {"deadline": None, "triggered_by": FRONT_DOOR}, AlarmControlPanelState.TRIGGERED),
        # Ausgangsverzögerung mit unlesbarer Frist: scharf (nicht deaktiviert)
        ("arming", {"deadline": "kein Datum"}, AlarmControlPanelState.ARMED_HOME),
        # Alarm ohne Frist bleibt Alarm, auch ohne Modus (immer aktiver Sensor bei deaktivierter Anlage)
        ("triggered", {"mode": None, "triggered_by": WINDOW}, AlarmControlPanelState.TRIGGERED),
        # Scharf mit einem Modus, den es nicht gibt: der Modus aus dem Zustand gilt
        ("armed_home", {"mode": "gibt_es_nicht"}, AlarmControlPanelState.ARMED_HOME),
        # Alte Alarmdauer (bis 0.24.0), während des Neustarts abgelaufen: zurück in den Modus bzw. deaktiviert (Alarm ohne Modus)
        ("triggered", {"mode": "home", "deadline": "2020-01-01T00:00:00+00:00", "triggered_by": WINDOW}, AlarmControlPanelState.ARMED_HOME),
        ("triggered", {"mode": None, "deadline": "2020-01-01T00:00:00+00:00", "triggered_by": WINDOW}, AlarmControlPanelState.DISARMED),
        # Unbekannter Zustand und Zustand "nicht verfügbar": deaktiviert, ohne Reste
        ("irgendwas", {}, AlarmControlPanelState.DISARMED),
        ("unavailable", {}, AlarmControlPanelState.DISARMED),
    ],
)
async def test_restore_with_broken_data_alarms_or_stays_safe(hass: HomeAssistant, last: str, extra: dict[str, Any], expected: str) -> None:
    """Beschädigte oder unvollständige Wiederherstellungsdaten: die Anlage lädt, eine laufende Eingangsverzögerung wird zum Alarm."""
    _restore(hass, last, **extra)
    entry = await setup_alarm(hass)
    assert entry.state is ConfigEntryState.LOADED
    assert state(hass) == expected
    if expected == AlarmControlPanelState.DISARMED:
        ctl = entry.runtime_data.controller
        assert ctl.mode is None and ctl.bypassed == set()


async def test_restore_drops_bypassed_sensors_that_are_no_longer_watched(hass: HomeAssistant) -> None:
    """Umgangene Sensoren aus der Wiederherstellung gelten nur, wenn die Anlage sie noch kennt (kein dauerhaft blinder Fleck)."""
    _restore(hass, "armed_home", bypassed=[WINDOW, "binary_sensor.entfernt"])
    entry = await setup_alarm(hass)
    assert entry.runtime_data.controller.bypassed == {WINDOW}


async def test_only_a_real_change_to_open_triggers(hass: HomeAssistant) -> None:
    """Nur "zu" nach "offen" löst aus: weder Attributänderungen eines offenen Sensors noch die Rückkehr aus "unbekannt"."""
    await setup_alarm(hass)
    await call(hass, "alarm_arm_home")
    for value in ("unknown", "on"):  # unbekannt -> offen ist kein Öffnen
        hass.states.async_set(WINDOW, value)
        await settle(hass)
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    hass.states.async_set(WINDOW, "on", {"battery": 80})  # nur ein Attribut ändert sich
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    hass.states.async_remove(WINDOW)  # Entität verschwindet und erscheint offen wieder (Integration neu geladen)
    await settle(hass)
    hass.states.async_set(WINDOW, "on")
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    hass.states.async_set(WINDOW, "off")
    await settle(hass)
    await open_sensor(hass, WINDOW)
    assert state(hass) == AlarmControlPanelState.TRIGGERED


async def test_second_entry_sensor_does_not_extend_the_entry_delay(hass: HomeAssistant, freezer) -> None:
    """Ein weiterer Eingangssensor während der Eingangsverzögerung verlängert sie nicht; der Alarm kommt zur ersten Frist."""
    back_door = "binary_sensor.hintertuer"
    hass.states.async_set(back_door, "off")
    entry = await setup_alarm(hass, zone_home=[FRONT_DOOR, WINDOW, back_door], entry_sensors=[FRONT_DOOR, back_door])
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, FRONT_DOOR)
    deadline = entry.runtime_data.controller.deadline
    await advance(hass, freezer, 15)
    await open_sensor(hass, back_door)
    assert state(hass) == AlarmControlPanelState.PENDING and entry.runtime_data.controller.deadline == deadline
    await advance(hass, freezer, 6)
    assert state(hass) == AlarmControlPanelState.TRIGGERED


async def test_disabled_mode_has_no_zone_and_cannot_be_armed(hass: HomeAssistant) -> None:
    """Ein abgeschalteter Modus überwacht nichts und lässt sich auch am Automaten vorbei nicht scharf schalten."""
    entry = await setup_alarm(hass)  # Nacht ist aus
    ctl = entry.runtime_data.controller
    assert ctl.zone("night") == [] and "night" not in ctl.modes
    with pytest.raises(ServiceValidationError) as err:
        await ctl.async_arm("night", None)
    assert err.value.translation_key == "mode_not_enabled"
    assert state(hass) == AlarmControlPanelState.DISARMED


# ----- Feindliche und fehlerhafte Eingaben -----


async def test_only_notify_services_are_ever_called_as_recipients(hass: HomeAssistant, hass_ws_client) -> None:
    """Als Empfänger gelten nur notify-Dienste: ein anderer Dienst im Feld wird verworfen und nie aufgerufen."""
    pushes = async_mock_service(hass, "notify", "handy")
    evil = [async_mock_service(hass, "script", "boese"), async_mock_service(hass, "homeassistant", "stop")]
    await setup_alarm(hass)
    client = await hass_ws_client(hass)
    result = await ws(client, type=f"{DOMAIN}/save_notify", notify={"alarm_targets": ["script.boese", "homeassistant.stop", "notify.handy", "notify.handy"],
                                                                  "maintenance_targets": ["script.boese"]})
    assert result["result"]["notify"]["alarm_targets"] == ["notify.handy"]
    assert result["result"]["notify"]["maintenance_targets"] == []
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await hass.async_block_till_done()
    assert len(pushes) == 1 and not any(calls for calls in evil)


STEP = {"type": "wait", "seconds": 1}


@pytest.mark.parametrize(
    "workflows",
    [
        {"home": [{"type": "gibt_es_nicht"}]},
        {"home": [{"type": "action", "action": "kein dienst"}]},
        {"home": [{"type": "action", "action": "switch.turn_on", "target": ["kein ziel"]}]},
        {"home": [{"type": "action", "action": "switch.turn_on", "data": "kein wörterbuch"}]},
        {"home": [{"type": "sound", "players": [], "sound": "siren"}]},
        {"home": [{"type": "sound", "players": [PLAYER], "sound": "../../geheim"}]},
        {"home": [{"type": "wait", "seconds": -1}]},
        {"home": [{"type": "wait", "seconds": 999999}]},
        {"home": [{"type": "notify", "click": "custom", "click_path": "https://boese.example/"}]},
        {"home": [{"type": "notify", "title": "x" * 101}]},
        {"home": [STEP] * (MAX_STEPS + 1)},
        {"anderer_ausloeser": [STEP]},
        {"home": "keine liste"},
    ],
)
async def test_invalid_workflows_are_rejected_as_a_whole(hass: HomeAssistant, hass_ws_client, workflows: Any) -> None:
    """Ein ungültiger Schritt lehnt das ganze Speichern ab; der gespeicherte Ablauf bleibt unverändert."""
    entry = await setup_alarm(hass, workflows={"home": [STEP]})
    client = await hass_ws_client(hass)
    result = await ws(client, type=f"{DOMAIN}/save_workflows", entry_id=entry.entry_id, workflows=workflows)
    assert result["success"] is False and result["error"]["code"] == "invalid_format"
    assert entry.options["workflows"] == {"home": [STEP]}


@pytest.mark.parametrize(
    "bad_options",
    [
        {"zone_home": ["switch.steckdose"]},
        {"zone_home": "keine liste"},
        {"entry_sensors": ["light.flur"]},
        {"entry_delay": -5},
        {"exit_delay_away": 999999},
        {"confirm_window": 1},
        {"sensor_options": {WINDOW: {"gibt_es_nicht": True}}},
        {"sensor_options": {WINDOW: {"always": "ja"}}},
        {"sensor_modes": {"gibt_es_nicht": {WINDOW: {"always": True}}}},
        {"schedules": [{"id": "s1", "action": "away", "time": "25:99", "days": [0]}]},
        {"schedules": [{"id": "s1", "action": "explodieren", "time": "08:00", "days": [0]}]},
        {"workflows": {"home": [{"type": "gibt_es_nicht"}]}},
        {"home_enabled": "ja"},
    ],
)
async def test_import_rejects_hostile_values_and_changes_nothing(hass: HomeAssistant, hass_ws_client, bad_options: dict[str, Any]) -> None:
    """Eine Sicherung mit einem ungültigen Wert wird als Ganzes abgelehnt (Vorschau und Einspielen), nichts ändert sich."""
    entry = await setup_alarm(hass)
    before = dict(entry.options)
    backup = {"format": "alarmageddon", "version": 1, "systems": [{"title": "Haus", "options": bad_options}]}
    client = await hass_ws_client(hass)
    for dry_run in (True, False):
        result = await ws(client, type=f"{DOMAIN}/import", data=backup, dry_run=dry_run)
        assert result["success"] is False and result["error"]["code"] == "invalid_backup", result
    assert dict(entry.options) == before


@pytest.mark.parametrize(
    ("backup", "code"),
    [
        ({}, "not_a_backup"),
        ({"format": "etwas_anderes", "version": 1}, "not_a_backup"),
        ({"format": "alarmageddon", "version": 99, "systems": []}, "newer_version"),
        ({"format": "alarmageddon", "version": "1", "systems": []}, "newer_version"),
        ({"format": "alarmageddon", "version": 1, "systems": ["kein wörterbuch"]}, "invalid_backup"),
        ({"format": "alarmageddon", "version": 1, "systems": [{"title": 5, "options": {}}]}, "invalid_backup"),
    ],
)
async def test_import_rejects_malformed_files(hass: HomeAssistant, hass_ws_client, backup: dict[str, Any], code: str) -> None:
    await setup_alarm(hass)
    client = await hass_ws_client(hass)
    result = await ws(client, type=f"{DOMAIN}/import", data=backup)
    assert result["success"] is False and result["error"]["code"] == code


async def test_import_cannot_add_remove_or_replace_codes(hass: HomeAssistant, hass_ws_client) -> None:
    """Eine Sicherung kann keine Codes einschleusen, löschen oder ersetzen, und "Code zum Scharfschalten" nicht ohne Code setzen."""
    code_hash, salt = hash_code("1234")
    haus = await setup_alarm(hass, "Haus", code_hash=code_hash, code_salt=salt)
    garage = await setup_alarm(hass, "Garage")
    evil_hash, evil_salt = hash_code("0000")
    evil = {"code_hash": evil_hash, "code_salt": evil_salt, "codes": [{"id": "x", "name": "Fremd", "hash": evil_hash, "salt": evil_salt}], "code_arm_required": True}
    backup = {"format": "alarmageddon", "version": 1, "systems": [{"title": "Haus", "options": dict(evil)}, {"title": "Garage", "options": dict(evil)}]}
    client = await hass_ws_client(hass)
    assert (await ws(client, type=f"{DOMAIN}/import", data=backup))["success"]
    await hass.async_block_till_done()
    assert haus.options["code_hash"] == code_hash and haus.options["code_salt"] == salt and not haus.options.get("codes")
    assert "code_hash" not in garage.options and not garage.options.get("codes")
    assert garage.options.get("code_arm_required") is False  # ohne Code kein "Code zum Scharfschalten"
    with pytest.raises(ServiceValidationError):
        await call(hass, "alarm_arm_home", code="0000")  # der eingeschleuste Code gilt nicht
    await call(hass, "alarm_arm_home", code="1234")
    assert state(hass) == AlarmControlPanelState.ARMED_HOME


@pytest.mark.parametrize(
    ("message", "code"),
    [
        ({"zones": {"home": ["switch.steckdose"]}, "entry_sensors": []}, "invalid_entity"),
        ({"zones": {"home": [WINDOW]}, "entry_sensors": [], "sensors": ["light.flur"]}, "invalid_entity"),
        ({"zones": {"home": [WINDOW]}, "entry_sensors": [], "sensor_options": {"switch.steckdose": {"always": True}}}, "invalid_entity"),
        ({"zones": {"home": [WINDOW]}, "entry_sensors": [], "sensor_modes": {"away": {"switch.steckdose": {"always": True}}}}, "invalid_entity"),
        ({"zones": {"home": [WINDOW]}, "entry_sensors": [MOTION]}, "entry_not_in_zone"),
        ({"zones": {"gibt_es_nicht": [WINDOW]}, "entry_sensors": []}, "invalid_format"),
        ({"zones": {"home": [WINDOW]}, "entry_sensors": [], "sensor_options": {WINDOW: {"gibt_es_nicht": True}}}, "invalid_format"),
    ],
)
async def test_save_zones_rejects_everything_that_is_not_a_binary_sensor(hass: HomeAssistant, hass_ws_client, message: dict[str, Any], code: str) -> None:
    entry = await setup_alarm(hass)
    before = dict(entry.options)
    client = await hass_ws_client(hass)
    result = await ws(client, type=f"{DOMAIN}/save_zones", entry_id=entry.entry_id, **message)
    assert result["success"] is False and result["error"]["code"] == code
    assert dict(entry.options) == before


@pytest.mark.parametrize(("name", "code"), [("   ", "name_required"), ("garage", "name_taken"), ("x" * 61, "invalid_format")])
async def test_rename_validates_the_name(hass: HomeAssistant, hass_ws_client, name: str, code: str) -> None:
    haus = await setup_alarm(hass, "Haus")
    await setup_alarm(hass, "Garage")
    client = await hass_ws_client(hass)
    result = await ws(client, type=f"{DOMAIN}/rename", entry_id=haus.entry_id, name=name)
    assert result["success"] is False and result["error"]["code"] == code
    assert haus.title == "Haus"


async def test_config_and_options_flow_reject_bad_input(hass: HomeAssistant) -> None:
    """Leerer Name beim Anlegen; im Optionsdialog ein Code im falschen Format und "neuer Code" zusammen mit "Code entfernen"."""
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": "user"})
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {"name": "   ", "code": "1234"})
    assert result["type"] is FlowResultType.FORM and result["errors"] == {"name": "name_required"}
    # Der eingegebene Code geht nie als Vorschlagswert zurück an die Oberfläche
    assert "1234" not in json.dumps([str(key.description) for key in result["data_schema"].schema], default=str)

    entry = await setup_alarm(hass)
    sections = {
        "zones": {"zone_home": [FRONT_DOOR, WINDOW], "zone_away": [FRONT_DOOR, WINDOW, MOTION], "zone_night": []},
        "delays": {"exit_delay_home": 0, "exit_delay_away": 30, "exit_delay_night": 0, "entry_delay": 20, "entry_sensors": [FRONT_DOOR]},
        "behaviour": {"night_enabled": False, "code_arm_required": False},
    }
    for code_section, error in (({"code": "12", "remove_code": False}, "invalid_code_format"), ({"code": "abcd", "remove_code": False}, "invalid_code_format"),
                                ({"code": "1234", "remove_code": True}, "code_and_remove")):
        result = await hass.config_entries.options.async_init(entry.entry_id)
        result = await hass.config_entries.options.async_configure(result["flow_id"], {**sections, "code_section": code_section})
        assert result["type"] is FlowResultType.FORM and result["errors"] == {"base": error}
    assert "code_hash" not in entry.options


# ----- Robustheit von Meldungen, Zeitplan und Ablauf -----


async def test_a_failing_or_missing_recipient_does_not_block_the_others(hass: HomeAssistant, hass_ws_client) -> None:
    """Ein Empfänger, dessen Dienst fehlt oder scheitert, hält die Alarmmeldung an die übrigen nicht auf; der Alarm bleibt."""
    pushes = async_mock_service(hass, "notify", "handy")

    async def broken(_call) -> None:
        raise HomeAssistantError("App antwortet nicht")

    hass.services.async_register("notify", "kaputt", broken)
    await setup_alarm(hass)
    await _notify_settings(hass, hass_ws_client, alarm_targets=["notify.kaputt", "notify.gibt_es_nicht", "notify.handy"])
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    await hass.async_block_till_done()
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    assert len(pushes) == 1 and pushes[0].data["data"]["push"]["sound"]["critical"] == 1


async def test_entry_delay_and_disarmed_notifications(hass: HomeAssistant, hass_ws_client) -> None:
    """Eingeschaltet melden sich Eingangsverzögerung (mit Sensor und Sekunden) und Deaktivieren (mit Person)."""
    pushes = async_mock_service(hass, "notify", "handy")
    await setup_alarm(hass)
    await _notify_settings(hass, hass_ws_client, types={"pending": {"enabled": True}, "disarmed": {"enabled": True}})
    hass.states.async_set(FRONT_DOOR, "off", {"friendly_name": "Haustür"})
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, FRONT_DOOR)
    await hass.async_block_till_done()
    assert len(pushes) == 1 and "20" in pushes[0].data["message"]
    await call(hass, "alarm_disarm")
    await hass.async_block_till_done()
    assert len(pushes) == 2 and pushes[1].data["title"]


async def test_schedule_ignores_malformed_rules_and_does_not_rearm(hass: HomeAssistant, freezer) -> None:
    """Eine beschädigte Regel hindert die Anlage nicht am Laden; eine Regel für den schon scharfen Modus ändert nichts."""
    freezer.move_to("2026-11-09 07:59:50+00:00")  # Montag
    rules = [{"id": "kaputt", "enabled": True, "action": "home", "time": "viertel vor acht", "days": [0]},
             {"id": "ohne_zeit", "enabled": True, "action": "home", "days": [0]},
             {"id": "gut", "enabled": True, "action": "home", "time": dt_util.as_local(dt_util.utcnow() + timedelta(seconds=10)).strftime("%H:%M"), "days": [0, 1, 2, 3, 4, 5, 6]}]
    entry = await setup_alarm(hass, schedules=rules)
    assert entry.state is ConfigEntryState.LOADED
    await call(hass, "alarm_arm_home")
    by = entry.runtime_data.controller.changed_by
    await advance(hass, freezer, 15)  # die gute Regel feuert: schon scharf in diesem Modus, also keine Änderung
    assert state(hass) == AlarmControlPanelState.ARMED_HOME and entry.runtime_data.controller.changed_by == by
    # Dieselbe Regel schaltet eine deaktivierte Anlage am nächsten Tag scharf (Beweis, dass sie wirklich feuert)
    await call(hass, "alarm_disarm")
    await advance(hass, freezer, 86400)
    assert state(hass) == AlarmControlPanelState.ARMED_HOME and entry.runtime_data.controller.changed_by != by


async def test_sound_step_without_url_is_skipped_and_the_flow_goes_on(hass: HomeAssistant, monkeypatch) -> None:
    """Hat Home Assistant keine Adresse für den Ton, entfällt nur dieser Schritt; die Sirene danach schaltet trotzdem."""

    def no_url(*_args: Any, **_kwargs: Any) -> str:
        raise NoURLAvailableError

    monkeypatch.setattr(workflow_module, "get_url", no_url)
    hass.states.async_set(SIREN, "off")
    hass.states.async_set(PLAYER, "idle")
    played = async_mock_service(hass, "media_player", "play_media")
    on = async_mock_service(hass, "switch", "turn_on")
    async_mock_service(hass, "switch", "turn_off")
    await setup_alarm(hass, workflows={"home": [{"type": "sound", "players": [PLAYER], "sound": "siren", "duration": 5, "restore": False},
                                                 {"type": "action", "action": "switch.turn_on", "target": [SIREN], "restore": False}]})
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    assert not played and len(on) == 1


async def test_a_running_flow_is_not_started_twice_and_a_test_is_refused(hass: HomeAssistant, hass_ws_client) -> None:
    """Während ein echter Ablauf läuft, startet weder ein zweiter noch ein Test; "Test stoppen" lässt den echten Ablauf laufen."""
    entry, services = await _setup_workflow(hass)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    runner = entry.runtime_data.workflow
    assert runner.running and not runner.running["test"]
    assert await runner.async_run("home") is False
    assert await runner.async_run("home", test=True) is False
    client = await hass_ws_client(hass)
    assert (await ws(client, type=f"{DOMAIN}/test_workflow", entry_id=entry.entry_id, trigger="home"))["error"]["code"] == "busy"
    assert (await ws(client, type=f"{DOMAIN}/stop_workflow", entry_id=entry.entry_id))["error"]["code"] == "alarm_running"
    assert runner.running and len(services["switch.turn_on"]) == 1 and not services["switch.turn_off"]


async def test_a_failing_step_that_is_not_awaited_does_not_stop_the_flow(hass: HomeAssistant) -> None:
    """Auch ein Schritt "nicht abwarten", dessen Dienst scheitert, hält die folgenden Schritte nicht auf."""

    async def broken(_call) -> None:
        raise HomeAssistantError("Gerät antwortet mit Fehler")

    hass.services.async_register("light", "turn_on", broken)
    hass.states.async_set(SIREN, "off")
    on = async_mock_service(hass, "switch", "turn_on")
    async_mock_service(hass, "switch", "turn_off")
    await setup_alarm(hass, workflows={"home": [{"type": "action", "action": "light.turn_on", "target": ["light.flur"], "detach": True},
                                                 {"type": "action", "action": "light.turn_on", "target": ["light.flur"]},
                                                 {"type": "action", "action": "switch.turn_on", "target": [SIREN]}]})
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    assert state(hass) == AlarmControlPanelState.TRIGGERED and len(on) == 1


async def test_sonos_players_return_through_their_own_snapshot(hass: HomeAssistant) -> None:
    """Sonos: vor dem Alarm ein Schnappschuss mit Gruppe, beim Deaktivieren die Wiederherstellung daraus (nicht nur die Lautstärke)."""
    await hass.config.async_update(internal_url="http://192.168.1.2:8123")
    er.async_get(hass).async_get_or_create("media_player", "sonos", "sonos-1", suggested_object_id="wohnzimmer")
    hass.states.async_set(PLAYER, "playing", {"volume_level": 0.25})
    calls = {name: async_mock_service(hass, *name.split(".")) for name in (
        "sonos.snapshot", "sonos.restore", "media_player.play_media", "media_player.media_stop", "media_player.volume_set")}
    await setup_alarm(hass, workflows={"home": [{"type": "sound", "players": [PLAYER], "sound": "siren", "volume": 0.9, "duration": 0, "detach": True}]})
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    assert calls["sonos.snapshot"][0].data == {"entity_id": [PLAYER], "with_group": True}
    assert calls["media_player.play_media"] and calls["media_player.volume_set"][0].data["volume_level"] == 0.9
    await call(hass, "alarm_disarm")
    await settle(hass)
    assert calls["sonos.restore"][0].data == {"entity_id": PLAYER, "with_group": True}
    assert len(calls["media_player.volume_set"]) == 1  # die Lautstärke stellt Sonos selbst zurück, kein zweiter Aufruf


async def test_alarm_end_test_message_is_marked_as_test(hass: HomeAssistant, hass_ws_client) -> None:
    """Die Testmeldung "Alarm endet" trägt "Test" im Titel und ändert nichts am Zustand der Anlage."""
    pushes = async_mock_service(hass, "notify", "handy")
    entry = await setup_alarm(hass)
    await _notify_settings(hass, hass_ws_client)
    await call(hass, "alarm_arm_home")
    client = await hass_ws_client(hass)
    assert (await ws(client, type=f"{DOMAIN}/test_end_notify", entry_id=entry.entry_id, notify={"title": "Ruhe in {name}", "message": "vorbei"}))["success"]
    await hass.async_block_till_done()
    assert len(pushes) == 1 and pushes[0].data["title"].startswith("🧪 Test") and "Ruhe in Haus" in pushes[0].data["title"]
    assert state(hass) == AlarmControlPanelState.ARMED_HOME


# ----- Statische Pfade -----


@pytest.mark.parametrize(
    "path",
    [
        "/alarmageddon_panel/%2e%2e/code.py",
        "/alarmageddon_panel/..%2fcode.py",
        "/alarmageddon_panel/%2e%2e%2fmanifest.json",
        "/alarmageddon_panel/%2e%2e/%2e%2e/%2e%2e/secrets.yaml",
        "/alarmageddon_sounds/%2e%2e/controller.py",
        "/alarmageddon_sounds/..%2f..%2fconfiguration.yaml",
        "/alarmageddon_panel/",
        "/alarmageddon_sounds/",
        "/alarmageddon_icon.png/%2e%2e/code.py",
    ],
)
async def test_static_paths_serve_only_their_own_files(hass: HomeAssistant, hass_client_no_auth, path: str) -> None:
    """Die Pfade ohne Anmeldung (Panel, Töne, Symbol) geben nur ihre eigenen Dateien heraus: kein Ausbruch, kein Verzeichnis."""
    await setup_alarm(hass)
    client = await hass_client_no_auth()
    response = await client.get(path)
    body = await response.text(errors="replace")
    assert response.status in (400, 403, 404), (path, response.status)
    assert "pbkdf2" not in body and "def " not in body and "codeowners" not in body


async def test_static_paths_serve_the_panel_without_secrets(hass: HomeAssistant, hass_client_no_auth) -> None:
    """Was ohne Anmeldung abrufbar ist (Seite und Module des Panels), enthält weder Daten der Anlage noch Zugangsdaten."""
    code_hash, salt = hash_code("1234")
    entry = await setup_alarm(hass, code_hash=code_hash, code_salt=salt)
    client = await hass_client_no_auth()
    for name in ("panel.html", "alarmageddon-panel.js", "strings.js", "common.js"):
        response = await client.get(f"/alarmageddon_panel/{name}")
        assert response.status == 200
        body = await response.text()
        for secret in (code_hash, salt, entry.entry_id, "access_token", "Bearer "):
            assert secret not in body, (name, secret)


# ----- Neuladen -----


async def test_each_system_reloads_exactly_once(hass: HomeAssistant, hass_ws_client, monkeypatch) -> None:
    """
    Voreinstellungen speichern (mit Zurücksetzen eigener Werte) und eine Sicherung einspielen: jede betroffene Anlage lädt
    genau einmal neu und läuft danach mit dem neuen Stand; unveränderte Voreinstellungen laden nichts neu.
    """
    haus = await setup_alarm(hass, "Haus", sensor_options={WINDOW: {"confirm": True}})
    garage = await setup_alarm(hass, "Garage")
    reloads: list[str] = []
    original = hass.config_entries.async_reload

    async def counting(entry_id: str) -> bool:
        reloads.append(entry_id)
        return await original(entry_id)

    monkeypatch.setattr(hass.config_entries, "async_reload", counting)
    client = await hass_ws_client(hass)
    presets = {"other": ["open_ok"]}  # die Sensoren der Tests haben keine Geräteklasse: Sensorart "other"
    result = await ws(client, type=f"{DOMAIN}/save_presets", presets=presets, reset_sensors=["other"])
    assert result["result"]["reset"] == 1
    await hass.async_block_till_done()
    assert sorted(reloads) == sorted([haus.entry_id, garage.entry_id])
    for entry in (haus, garage):
        ctl = entry.runtime_data.controller
        assert entry.state is ConfigEntryState.LOADED
        assert ctl.option(WINDOW, "open_ok") is True and ctl.option(WINDOW, "confirm") is False
    # Dieselben Voreinstellungen noch einmal: nichts lädt neu
    reloads.clear()
    assert (await ws(client, type=f"{DOMAIN}/save_presets", presets=presets))["success"]
    await hass.async_block_till_done()
    assert reloads == []
    # Sicherung mit anderen Optionen für das Haus und anderen Voreinstellungen: beide Anlagen laden je einmal
    backup = (await ws(client, type=f"{DOMAIN}/export"))["result"]
    backup["settings"]["presets"]["other"] = []
    backup["systems"] = [{"title": "Haus", "options": {"entry_delay": 45}}]
    assert (await ws(client, type=f"{DOMAIN}/import", data=backup))["success"]
    await hass.async_block_till_done()
    assert sorted(reloads) == sorted([haus.entry_id, garage.entry_id])
    assert haus.options["entry_delay"] == 45
    assert garage.runtime_data.controller.option(WINDOW, "open_ok") is False
    assert haus.runtime_data.controller.option(WINDOW, "open_ok") is False
