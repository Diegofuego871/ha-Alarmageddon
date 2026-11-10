"""Meldungsarten (0.9.0): je Art an/aus, kritisch, Lautstärke; Migration der alten Form; Sensor "Nur melden"."""

from __future__ import annotations

from typing import Any

from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import async_mock_service

from custom_components.alarmageddon.const import DATA_SETTINGS, NOTIFY_TYPES
from custom_components.alarmageddon.settings import valid_notify

from .conftest import ALARM, FRONT_DOOR, MOTION, WINDOW, setup_alarm
from .test_alarm import advance, call, state
from .test_sensor_options import _classes, open_sensor

_id = iter(range(1, 1000))


async def _ws(client, **msg):
    await client.send_json({"id": next(_id), **msg})
    return await client.receive_json()


async def _types(hass: HomeAssistant, hass_ws_client, **types: dict[str, Any]) -> None:
    client = await hass_ws_client(hass)
    result = await _ws(client, type="alarmageddon/save_notify", notify={"alarm_targets": ["notify.handy"], "maintenance_targets": ["notify.tablet"], "types": types})
    assert result["success"], result


def test_defaults_cover_every_type() -> None:
    cfg = valid_notify(None)
    assert set(cfg["types"]) == set(NOTIFY_TYPES)
    # Im Zweifel melden: Alarm, Sensorausfall im scharfen Zustand und "Stiller Alarm" sind kritisch
    assert [k for k, v in cfg["types"].items() if v["critical"]] == ["triggered", "sensor_offline", "sensor_report"]
    assert all(0 <= v["volume"] <= 1 for v in cfg["types"].values())


def test_old_format_is_migrated() -> None:
    """Bis 0.8.0: "events" an/aus, dazu ein gemeinsames "critical" und "volume"."""
    cfg = valid_notify({"alarm_targets": ["notify.a", "notify.a", "light.x"], "critical": False, "volume": 0.3,
                        "events": {"triggered": False, "armed": True, "bogus": True}})
    assert cfg["alarm_targets"] == ["notify.a"]
    assert cfg["types"]["triggered"] == {"enabled": False, "critical": False, "volume": 0.3, "persistent": False}
    assert cfg["types"]["armed"]["enabled"] is True and cfg["types"]["sensor_offline"]["critical"] is False
    assert "events" not in cfg and "critical" not in cfg and "volume" not in cfg


def test_new_format_wins_over_old() -> None:
    cfg = valid_notify({"events": {"triggered": False}, "types": {"triggered": {"enabled": True, "volume": 2}}})
    assert cfg["types"]["triggered"]["enabled"] is True and cfg["types"]["triggered"]["volume"] == 1.0


async def test_each_type_has_own_critical_and_volume(hass: HomeAssistant, hass_ws_client) -> None:
    pushes = async_mock_service(hass, "notify", "handy")
    await setup_alarm(hass, exit_delay_away=0)
    await _types(hass, hass_ws_client, armed={"enabled": True, "critical": True, "volume": 0.2, "persistent": False}, triggered={"critical": False})
    await call(hass, "alarm_arm_away")
    await hass.async_block_till_done()
    armed = pushes[0].data
    assert armed["title"].endswith("armed") or "armed" in armed["title"]
    assert armed["data"]["push"]["sound"]["volume"] == 0.2 and armed["data"]["push"]["interruption-level"] == "critical"
    await open_sensor(hass, WINDOW)
    await hass.async_block_till_done()
    alarm = pushes[1].data
    # Alarm ausdrücklich nicht kritisch: normale Meldung, weiter mit Aktionen
    assert alarm["title"] == "🚨 Alarm: Haus" and "push" not in alarm["data"] and alarm["data"]["actions"]


async def test_type_switched_off_sends_nothing(hass: HomeAssistant, hass_ws_client) -> None:
    pushes = async_mock_service(hass, "notify", "handy")
    await setup_alarm(hass)
    await _types(hass, hass_ws_client, armed={"enabled": False})
    await call(hass, "alarm_arm_home")
    await hass.async_block_till_done()
    assert pushes == []


async def test_alarm_message_cannot_be_switched_off(hass: HomeAssistant, hass_ws_client) -> None:
    """Sicherheitsregel: die Alarmmeldung geht immer raus, auch mit einem alten "aus" in den Einstellungen (0.20.0)."""
    pushes = async_mock_service(hass, "notify", "handy")
    await setup_alarm(hass)
    await _types(hass, hass_ws_client, triggered={"enabled": False})
    await call(hass, "alarm_trigger")
    await hass.async_block_till_done()
    assert len(pushes) == 1


async def test_partial_save_keeps_other_types(hass: HomeAssistant, hass_ws_client) -> None:
    await setup_alarm(hass)
    await _types(hass, hass_ws_client, armed={"enabled": True})
    await _types(hass, hass_ws_client, pending={"enabled": True})
    types = hass.data[DATA_SETTINGS].notify["types"]
    assert types["armed"]["enabled"] is True and types["pending"]["enabled"] is True


async def test_save_validation(hass: HomeAssistant, hass_ws_client) -> None:
    await setup_alarm(hass)
    client = await hass_ws_client(hass)
    bad_kind = await _ws(client, type="alarmageddon/save_notify", notify={"types": {"nonsense": {"enabled": True}}})
    assert not bad_kind["success"]
    bad_volume = await _ws(client, type="alarmageddon/save_notify", notify={"types": {"armed": {"volume": 7}}})
    assert not bad_volume["success"]
    old = await _ws(client, type="alarmageddon/save_notify", notify={"critical": True})
    assert not old["success"]


async def test_test_message_uses_type_settings(hass: HomeAssistant, hass_ws_client) -> None:
    pushes = async_mock_service(hass, "notify", "handy")
    tablet = async_mock_service(hass, "notify", "tablet")
    await setup_alarm(hass)
    await _types(hass, hass_ws_client, sensor_report={"critical": True, "volume": 0.4}, battery_low={"critical": True, "volume": 0.9})
    client = await hass_ws_client(hass)
    assert (await _ws(client, type="alarmageddon/test_notify", kind="sensor_report"))["result"]["targets"] == ["notify.handy"]
    assert (await _ws(client, type="alarmageddon/test_notify", kind="battery_low"))["result"]["targets"] == ["notify.tablet"]
    await hass.async_block_till_done()
    assert pushes[0].data["data"]["push"]["sound"]["volume"] == 0.4
    assert tablet[0].data["data"]["push"]["sound"]["volume"] == 0.9
    assert not (await _ws(client, type="alarmageddon/test_notify", kind="nonsense"))["success"]


# ----- Sensor "Nur melden" -----


async def test_report_only_does_not_trigger_but_reports_critical(hass: HomeAssistant) -> None:
    pushes = async_mock_service(hass, "notify", "handy")
    _classes(hass)
    entry = await setup_alarm(hass, exit_delay_away=0, sensor_options={MOTION: {"report_only": True}})
    settings = hass.data[DATA_SETTINGS]
    await settings.async_set_notify({**settings.notify, "alarm_targets": ["notify.handy"]})
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, MOTION)
    await hass.async_block_till_done()
    assert state(hass) == AlarmControlPanelState.ARMED_AWAY
    assert len(pushes) == 1 and pushes[0].data["data"]["push"]["interruption-level"] == "critical"
    assert "Bewegung" in pushes[0].data["title"] or "binary_sensor" in pushes[0].data["title"] or "bewegung" in pushes[0].data["title"].lower()
    assert entry.runtime_data.events.events[0]["kind"] == "sensor_report"
    assert entry.runtime_data.events.events[0]["sensor"] == MOTION


async def test_report_only_is_throttled(hass: HomeAssistant, freezer) -> None:
    pushes = async_mock_service(hass, "notify", "handy")
    _classes(hass)
    await setup_alarm(hass, exit_delay_away=0, sensor_options={MOTION: {"report_only": True}})
    settings = hass.data[DATA_SETTINGS]
    await settings.async_set_notify({**settings.notify, "alarm_targets": ["notify.handy"]})
    await call(hass, "alarm_arm_away")
    for _ in range(3):
        await open_sensor(hass, MOTION)
        await open_sensor(hass, MOTION, "off")
    await hass.async_block_till_done()
    assert len(pushes) == 1
    await advance(hass, freezer, 61)
    await open_sensor(hass, MOTION)
    await hass.async_block_till_done()
    assert len(pushes) == 2


async def test_report_only_beats_confirmation(hass: HomeAssistant) -> None:
    _classes(hass)
    await setup_alarm(hass, exit_delay_away=0, sensor_options={MOTION: {"report_only": True, "confirm": True}})
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, MOTION)
    assert state(hass) == AlarmControlPanelState.ARMED_AWAY


async def test_other_sensor_still_triggers_and_door_delay_unaffected(hass: HomeAssistant) -> None:
    """Pflichtfälle: Verzögerung läuft, Deaktivieren währenddessen, ein melden-Sensor stört nichts."""
    _classes(hass)
    await setup_alarm(hass, exit_delay_away=0, entry_delay=60, sensor_options={MOTION: {"report_only": True}})
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, FRONT_DOOR)
    assert state(hass) == AlarmControlPanelState.PENDING
    await open_sensor(hass, MOTION)
    assert state(hass) == AlarmControlPanelState.PENDING  # kein sofortiger Alarm durch den melden-Sensor
    await call(hass, "alarm_disarm")
    assert state(hass) == AlarmControlPanelState.DISARMED
    await open_sensor(hass, FRONT_DOOR, "off")
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, WINDOW)
    assert state(hass) == AlarmControlPanelState.TRIGGERED


async def test_report_only_always_active_sensor(hass: HomeAssistant) -> None:
    """Auch ein "immer aktiver" Sensor kann auf "Nur melden" stehen (ausdrückliche Wahl des Nutzers)."""
    _classes(hass)
    await setup_alarm(hass, sensor_options={"binary_sensor.rauchmelder": {"always": True, "report_only": True}})
    await open_sensor(hass, "binary_sensor.rauchmelder")
    assert state(hass) == AlarmControlPanelState.DISARMED


async def test_report_only_survives_restart_and_failure(hass: HomeAssistant) -> None:
    """Neustart im Alarm bleibt Alarm; ein "Nur melden"-Sensor, der ausfällt, löst nur mit "Ausfall gilt als Alarm" aus."""
    _classes(hass)
    entry = await setup_alarm(hass, exit_delay_away=0, sensor_options={MOTION: {"report_only": True}})
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, MOTION, "unavailable")
    assert state(hass) == AlarmControlPanelState.ARMED_AWAY
    await open_sensor(hass, WINDOW)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    assert hass.states.get(ALARM).attributes["triggered_by"] == WINDOW


# ----- Eigene Werte je Modus (0.29.0) -----

async def test_mode_values_override_kind_settings(hass: HomeAssistant, hass_ws_client) -> None:
    """Stiller Alarm, Eingangsverzögerung, Scharf geschaltet, Sensorausfall: je Modus eigene Werte, sonst der gemeinsame."""
    pushes = async_mock_service(hass, "notify", "handy")
    await setup_alarm(hass, exit_delay_away=0)
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "alarmageddon/save_notify", "notify": {
        "alarm_targets": ["notify.handy"], "per_mode": True,
        "types": {"armed": {"enabled": True, "critical": False}},
        "modes": {"away": {"armed": {"enabled": False}, "pending": {"critical": True, "volume": 0.3}}, "home": {"armed": {"critical": True}}},
    }})
    result = await client.receive_json()
    assert result["success"]
    assert result["result"]["notify"]["modes"] == {"away": {"armed": {"enabled": False}, "pending": {"critical": True, "volume": 0.3}}, "home": {"armed": {"critical": True}}}
    # Abwesend: "Scharf geschaltet" ist dort aus
    await call(hass, "alarm_arm_away")
    await hass.async_block_till_done()
    assert not pushes
    await call(hass, "alarm_disarm")
    await hass.async_block_till_done()
    pushes.clear()
    # Anwesend: eigener Wert "kritisch"
    await call(hass, "alarm_arm_home")
    await hass.async_block_till_done()
    assert len(pushes) == 1 and pushes[0].data["data"]["push"]["interruption-level"] == "critical"


async def test_mode_values_are_validated_and_sparse(hass: HomeAssistant, hass_ws_client) -> None:
    await setup_alarm(hass)
    client = await hass_ws_client(hass)
    for bad in ({"nonsense": {"armed": {"enabled": True}}}, {"home": {"triggered": {"enabled": False}}}, {"home": {"armed": {"volume": 2}}}):
        await client.send_json({"id": 1, "type": "alarmageddon/save_notify", "notify": {"modes": bad}})
        assert not (await client.receive_json())["success"]
    await client.send_json({"id": 2, "type": "alarmageddon/save_notify", "notify": {"modes": {"home": {"armed": {}}}}})
    result = await client.receive_json()
    assert result["success"] and result["result"]["notify"]["modes"] == {}  # leere Einträge fallen weg
    # Sicherung enthält die Werte je Modus
    await client.send_json({"id": 3, "type": "alarmageddon/save_notify", "notify": {"modes": {"night": {"sensor_report": {"critical": True}}}}})
    assert (await client.receive_json())["success"]
    await client.send_json({"id": 4, "type": "alarmageddon/export"})
    exported = (await client.receive_json())["result"]
    assert exported["settings"]["notify"]["modes"] == {"night": {"sensor_report": {"critical": True}}}


# ----- Bleibt als Benachrichtigung in Home Assistant stehen (0.31.0) -----

async def test_persistent_notification_per_kind(hass: HomeAssistant, hass_ws_client) -> None:
    """Je Art "stehen lassen": zusätzlich eine Benachrichtigung in HA (Kennung wie der tag), auch ohne Empfänger."""
    from homeassistant.components import persistent_notification

    await setup_alarm(hass, exit_delay_away=0)
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "alarmageddon/save_notify", "notify": {
        "types": {"triggered": {"persistent": True}, "armed": {"enabled": True, "persistent": True}}, "per_mode": True,
        "modes": {"home": {"armed": {"persistent": False}}},
    }})
    assert (await client.receive_json())["success"]
    await call(hass, "alarm_arm_home")  # Anwesend: für "Scharf geschaltet" abgeschaltet
    await hass.async_block_till_done()
    assert not persistent_notification._async_get_or_create_notifications(hass)
    await open_sensor(hass, WINDOW)
    await hass.async_block_till_done()
    notes = persistent_notification._async_get_or_create_notifications(hass)
    assert len(notes) == 1 and next(iter(notes.values()))["title"] == "🚨 Alarm: Haus"
    await call(hass, "alarm_disarm")
    await hass.async_block_till_done()
    # Gleiche Kennung: der Inhalt wird durch "Alarm beendet" ersetzt, er bleibt stehen
    notes = persistent_notification._async_get_or_create_notifications(hass)
    assert len(notes) == 1 and next(iter(notes.values()))["title"].startswith("✅ Alarm ended")
    await open_sensor(hass, WINDOW, "off")
    await call(hass, "alarm_arm_away")  # Abwesend: gemeinsamer Wert, also eigene Meldung "Scharf geschaltet"
    await hass.async_block_till_done()
    assert len(persistent_notification._async_get_or_create_notifications(hass)) == 2


async def test_persistent_is_validated(hass: HomeAssistant, hass_ws_client) -> None:
    await setup_alarm(hass)
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "alarmageddon/save_notify", "notify": {"types": {"battery_low": {"persistent": "ja"}}}})
    assert not (await client.receive_json())["success"]
    await client.send_json({"id": 2, "type": "alarmageddon/save_notify", "notify": {"types": {"battery_low": {"persistent": True}}}})
    result = await client.receive_json()
    assert result["success"] and result["result"]["notify"]["types"]["battery_low"]["persistent"] is True
    assert result["result"]["notify"]["types"]["triggered"]["persistent"] is False


async def test_mode_values_are_ignored_while_the_switch_is_off(hass: HomeAssistant, hass_ws_client) -> None:
    """Ohne den Schalter "Einstellungen pro Modus" gelten nur die Werte für alle Modi, die eigenen Werte bleiben gespeichert."""
    pushes = async_mock_service(hass, "notify", "handy")
    await setup_alarm(hass, exit_delay_away=0)
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "alarmageddon/save_notify", "notify": {
        "alarm_targets": ["notify.handy"], "per_mode": False,
        "types": {"armed": {"enabled": True}}, "modes": {"away": {"armed": {"enabled": False}}},
    }})
    result = await client.receive_json()
    assert result["success"] and result["result"]["notify"]["modes"] == {"away": {"armed": {"enabled": False}}}
    await call(hass, "alarm_arm_away")
    await hass.async_block_till_done()
    assert len(pushes) == 1  # Der eigene Wert (aus) gilt nicht


def test_every_default_title_starts_with_an_emoji() -> None:
    """Jede Standardmeldung beginnt mit einem Emoji (Vorgabe des Nutzers): Alarm 🚨, Wartung ⚠️, sonst passend zur Art."""
    from custom_components.alarmageddon.notify import TEXTS

    for lang, texts in TEXTS.items():
        titles = {k: v for k, v in texts.items() if k.endswith("_title") or k.endswith("_title_one")}
        assert len(titles) >= 11, lang
        for key, value in titles.items():
            assert ord(value[0]) > 0x2000 and " " in value, f"{lang}.{key}: {value!r}"
        assert titles["triggered_title"].startswith("🚨") and titles["maint_title"].startswith("⚠️") and titles["maint_title_one"].startswith("⚠️")
