"""
Aufbewahrung und Löschen im Protokoll (1.13.0).

Ereignisse und Alarme bleiben ein Jahr (vorher die letzten 1000 Ereignisse und 30 Alarme, gleich wie alt); die Anzahl ist nur
noch eine Obergrenze. Ein einzelner aufgezeichneter Alarm lässt sich löschen, der laufende nicht.
"""

from __future__ import annotations

from datetime import timedelta

from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

from custom_components.alarmageddon.const import KEEP_DAYS, RECORDINGS_STORE_KEY

from .conftest import WINDOW, setup_alarm
from .test_alarm import call, open_sensor, settle, state


def _event(days: float) -> dict:
    return {"t": (dt_util.utcnow() - timedelta(days=days)).isoformat(), "state": "disarmed", "mode": None}


def _alarm(days: float, running: bool = False) -> dict:
    start = dt_util.utcnow() - timedelta(days=days)
    return {"id": start.isoformat(), "start": start.isoformat(), "end": None if running else (start + timedelta(minutes=1)).isoformat(),
            "ended_by": None, "mode": "home", "sensor": WINDOW, "entries": []}


async def test_events_are_kept_for_a_year_not_by_count(hass: HomeAssistant, monkeypatch) -> None:
    """Mehr als 1000 Ereignisse bleiben, solange sie jünger als ein Jahr sind; ältere fallen beim nächsten Ereignis und beim Laden weg."""
    assert KEEP_DAYS == 365
    entry = await setup_alarm(hass)
    log = entry.runtime_data.events
    log.events[:] = [_event(d / 10) for d in range(1, 1501)] + [_event(364), _event(366), _event(800)]
    await call(hass, "alarm_arm_home")
    limit = (dt_util.utcnow() - timedelta(days=365)).isoformat()
    assert len(log.events) > 1500 and all(e["t"] >= limit for e in log.events)
    assert log.events[-1]["t"] < (dt_util.utcnow() - timedelta(days=363)).isoformat()  # das 364 Tage alte ist noch da
    # Beim Laden gilt dasselbe
    await log._store.async_save([_event(1), _event(400)])
    await log.async_load()
    assert len(log.events) == 1
    # Die Anzahl ist nur noch eine Obergrenze
    monkeypatch.setattr("custom_components.alarmageddon.events.EVENTS_KEEP", 5)
    log.events[:] = [_event(d) for d in range(1, 21)]
    await call(hass, "alarm_disarm")
    assert len(log.events) == 5


async def test_alarms_are_kept_for_a_year_not_by_count(hass: HomeAssistant) -> None:
    """Mehr als 30 Alarme bleiben, solange sie jünger als ein Jahr sind; ältere fallen beim nächsten Alarm und beim Laden weg."""
    entry = await setup_alarm(hass)
    recorder = entry.runtime_data.recorder
    recorder.recordings[:] = [_alarm(d) for d in range(1, 41)] + [_alarm(364), _alarm(366), _alarm(900)]
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    assert len(recorder.recordings) == 42 and recorder.recordings[0]["end"] is None
    limit = (dt_util.utcnow() - timedelta(days=365)).isoformat()
    assert all(r["start"] >= limit for r in recorder.recordings)
    await call(hass, "alarm_disarm")
    await recorder._store.async_save([_alarm(2), _alarm(500)])
    await recorder.async_load()
    assert len(recorder.recordings) == 1


async def test_a_running_alarm_is_never_dropped(hass: HomeAssistant) -> None:
    """Ein laufender Alarm bleibt, auch wenn er (rechnerisch) älter als ein Jahr wäre: er ist noch nicht quittiert."""
    entry = await setup_alarm(hass)
    recorder = entry.runtime_data.recorder
    recorder.recordings[:] = [_alarm(400, running=True), _alarm(401)]
    recorder._prune()
    assert len(recorder.recordings) == 1 and recorder.recordings[0]["end"] is None


async def test_delete_a_single_alarm(hass: HomeAssistant, hass_ws_client, hass_storage) -> None:
    """Löschen entfernt genau diesen Alarm, auch aus der Ablage; das Protokoll des Panels merkt die Änderung (neuer Stand)."""
    entry = await setup_alarm(hass)
    recorder = entry.runtime_data.recorder
    recorder.recordings[:] = [_alarm(1), _alarm(2), _alarm(3)]
    keep = [recorder.recordings[0]["id"], recorder.recordings[2]["id"]]
    target = recorder.recordings[1]["id"]
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": "alarmageddon/log"})
    rev = (await client.receive_json())["result"]["rev"]
    await client.send_json_auto_id({"type": "alarmageddon/delete_recording", "entry_id": entry.entry_id, "recording": target})
    assert (await client.receive_json())["result"] == {"ok": True}
    assert [r["id"] for r in recorder.recordings] == keep
    await client.send_json_auto_id({"type": "alarmageddon/log", "rev": rev})
    result = (await client.receive_json())["result"]
    assert "unchanged" not in result and [r["id"] for r in result["systems"][0]["recordings"]] == keep
    await recorder._store.async_save(recorder.recordings)
    stored = hass_storage[f"{RECORDINGS_STORE_KEY}.{entry.entry_id}"]["data"] if f"{RECORDINGS_STORE_KEY}.{entry.entry_id}" in hass_storage else next(v["data"] for k, v in hass_storage.items() if k.startswith(RECORDINGS_STORE_KEY))
    assert [r["id"] for r in stored] == keep
    # Noch einmal derselbe und ein unbekannter: nicht gefunden
    for missing in (target, "gibt-es-nicht"):
        await client.send_json_auto_id({"type": "alarmageddon/delete_recording", "entry_id": entry.entry_id, "recording": missing})
        assert (await client.receive_json())["error"]["code"] == "not_found"


async def test_a_running_alarm_cannot_be_deleted(hass: HomeAssistant, hass_ws_client) -> None:
    """Der laufende Alarm wird noch geschrieben: Löschen ist erst nach dem Quittieren möglich."""
    entry = await setup_alarm(hass)
    client = await hass_ws_client(hass)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    running = entry.runtime_data.recorder.recordings[0]
    await client.send_json_auto_id({"type": "alarmageddon/delete_recording", "entry_id": entry.entry_id, "recording": running["id"]})
    assert (await client.receive_json())["error"]["code"] == "alarm_running"
    assert entry.runtime_data.recorder.recordings[0] is running
    await call(hass, "alarm_disarm")
    await settle(hass)
    await client.send_json_auto_id({"type": "alarmageddon/delete_recording", "entry_id": entry.entry_id, "recording": running["id"]})
    assert (await client.receive_json())["success"]
    assert entry.runtime_data.recorder.recordings == []
