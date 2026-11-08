"""Alarm-Aufzeichnung (0.12.0): Zeitachse je Alarm vom Auslöser bis zum Quittieren."""

from __future__ import annotations

from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import CoreState, HomeAssistant, State
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import mock_restore_cache_with_extra_data

from .conftest import ALARM, FRONT_DOOR, MOTION, WINDOW, setup_alarm
from .test_alarm import advance, call, state
from .test_sensor_options import open_sensor


def _rec(entry):
    return entry.runtime_data.recorder


def _kinds(record):
    return [(e["kind"], e.get("state") or e.get("to"), e.get("sensor")) for e in record["entries"]]


async def test_records_from_first_sensor_until_disarm(hass: HomeAssistant, freezer) -> None:
    entry = await setup_alarm(hass, exit_delay_away=0, entry_delay_away=0, trigger_time=0)
    await call(hass, "alarm_arm_away")
    assert _rec(entry).current is None  # ohne Alarm keine Aufzeichnung
    await open_sensor(hass, WINDOW)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    await advance(hass, freezer, 5)
    await open_sensor(hass, MOTION)
    await advance(hass, freezer, 5)
    await open_sensor(hass, WINDOW, "off")
    record = _rec(entry).current
    assert record and record["sensor"] == WINDOW and record["mode"] == "away"
    assert _kinds(record) == [
        ("sensor", "on", WINDOW),  # der erste Kontakt mit seinem echten Zeitpunkt
        ("state", "triggered", WINDOW),
        ("sensor", "on", MOTION),
        ("sensor", "off", WINDOW),
    ]
    times = [e["t"] for e in record["entries"]]
    assert times[2] > times[1] and times[3] > times[2]
    await call(hass, "alarm_disarm")
    done = _rec(entry).recordings[0]
    assert done["end"] and _rec(entry).current is None
    assert done["entries"][-1]["kind"] == "state" and done["entries"][-1]["state"] == "disarmed"
    # Nach dem Quittieren wird nichts mehr aufgezeichnet
    n = len(done["entries"])
    await open_sensor(hass, MOTION, "off")
    assert len(_rec(entry).recordings[0]["entries"]) == n


async def test_entry_delay_belongs_to_the_alarm(hass: HomeAssistant, freezer) -> None:
    """Pflichtfall: Deaktivieren während der Verzögerung beendet die Aufzeichnung, ohne Alarm."""
    entry = await setup_alarm(hass, exit_delay_away=0, entry_delay_away=30, entry_sensors=[FRONT_DOOR])
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, FRONT_DOOR)
    assert state(hass) == AlarmControlPanelState.PENDING
    assert _rec(entry).current is not None
    await advance(hass, freezer, 10)
    await call(hass, "alarm_disarm")
    done = _rec(entry).recordings[0]
    assert done["end"] and [e["state"] for e in done["entries"] if e["kind"] == "state"] == ["pending", "disarmed"]


async def test_sensor_going_unavailable_is_recorded(hass: HomeAssistant, freezer) -> None:
    """Pflichtfall: Ein Sensor fällt im scharfen Zustand aus, auch das steht in der Zeitachse."""
    entry = await setup_alarm(hass, exit_delay_away=0, entry_delay_away=0, trigger_time=0)
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, WINDOW)
    await open_sensor(hass, MOTION, "unavailable")
    assert ("sensor", "gone", MOTION) in _kinds(_rec(entry).current)


async def test_entries_are_limited_but_end_is_kept(hass: HomeAssistant, freezer, monkeypatch) -> None:
    monkeypatch.setattr("custom_components.alarmageddon.recording.RECORDINGS_ENTRIES_KEEP", 6)
    entry = await setup_alarm(hass, exit_delay_away=0, entry_delay_away=0, trigger_time=0)
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, WINDOW)
    for _ in range(10):  # flatternder Sensor
        await open_sensor(hass, MOTION, "on")
        await open_sensor(hass, MOTION, "off")
    await call(hass, "alarm_disarm")
    done = _rec(entry).recordings[0]
    assert done["truncated"] is True and done["entries"][0]["sensor"] == WINDOW  # Ursache bleibt
    assert done["entries"][-1]["state"] == "disarmed"  # Ende kommt immer


async def test_keeps_only_the_last_alarms(hass: HomeAssistant, freezer, monkeypatch) -> None:
    monkeypatch.setattr("custom_components.alarmageddon.recording.RECORDINGS_KEEP", 3)
    entry = await setup_alarm(hass, exit_delay_away=0, entry_delay_away=0, trigger_time=0)
    for _ in range(5):
        await call(hass, "alarm_arm_away")
        await open_sensor(hass, WINDOW)
        await call(hass, "alarm_disarm")
        await open_sensor(hass, WINDOW, "off")
        await advance(hass, freezer, 1)
    assert len(_rec(entry).recordings) == 3


async def _start_with(hass: HomeAssistant, hass_storage, last: str, record: dict, **extra):
    """Wie beim Hochfahren: Aufzeichnung und Zustand aus dem Speicher, dann "gestartet"."""
    from custom_components.alarmageddon.const import DOMAIN, RECORDINGS_STORE_KEY
    from pytest_homeassistant_custom_component.common import MockConfigEntry

    from .conftest import options

    key = f"{RECORDINGS_STORE_KEY}.rec1"
    hass_storage[key] = {"version": 1, "minor_version": 1, "key": key, "data": [record]}
    data = {"mode": "home", "deadline": None, "bypassed": [], "triggered_by": WINDOW, "changed_by": None, **extra}
    mock_restore_cache_with_extra_data(hass, [(State(ALARM, last), data)])
    for entity in (FRONT_DOOR, WINDOW, MOTION):
        hass.states.async_set(entity, "off")
    hass.set_state(CoreState.not_running)
    entry = MockConfigEntry(domain=DOMAIN, title="Haus", entry_id="rec1", data={"name": "Haus"}, options=options())
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_start()
    await hass.async_block_till_done()
    return entry


def _open_record():
    now = dt_util.utcnow().isoformat()
    return {"id": now, "start": now, "end": None, "ended_by": None, "mode": "home", "sensor": WINDOW,
            "entries": [{"t": now, "kind": "sensor", "sensor": WINDOW, "to": "on"}, {"t": now, "kind": "state", "state": "triggered", "sensor": WINDOW}]}


async def test_alarm_over_restart_continues(hass: HomeAssistant, hass_storage) -> None:
    """Pflichtfall: Neustart während des Alarms: die Aufzeichnung läuft weiter und endet erst mit dem Deaktivieren."""
    entry = await _start_with(hass, hass_storage, "triggered", _open_record())
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    assert _rec(entry).current is not None
    assert _rec(entry).current["entries"][-1]["kind"] == "restart"
    await open_sensor(hass, MOTION)
    assert ("sensor", "on", MOTION) in _kinds(_rec(entry).current)
    await call(hass, "alarm_disarm")
    assert _rec(entry).recordings[0]["end"]


async def test_open_alarm_closed_when_no_longer_active(hass: HomeAssistant, hass_storage) -> None:
    """Während des Neustarts quittiert (Zustand nicht mehr Alarm): offene Aufzeichnung abschliessen, nichts erfinden."""
    entry = await _start_with(hass, hass_storage, "disarmed", _open_record(), mode=None, triggered_by=None)
    assert _rec(entry).current is None
    assert _rec(entry).recordings[0]["end"] and _rec(entry).recordings[0]["reason"] == "restart"


async def test_ws_log(hass: HomeAssistant, hass_ws_client, freezer) -> None:
    entry = await setup_alarm(hass, exit_delay_away=0, entry_delay_away=0, trigger_time=0)
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, WINDOW)
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "alarmageddon/log"})
    res = (await client.receive_json())["result"]["systems"][0]
    assert res["entry_id"] == entry.entry_id and res["recording"] is True
    assert res["recordings"][0]["sensor"] == WINDOW and res["events"]
