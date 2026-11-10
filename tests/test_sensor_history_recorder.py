"""Sensoransicht mit echtem Recorder: der Befehl des Panels liefert Ereignisse, Stundenwerte, Zustand der Anlage, Batterie und Empfang."""

from __future__ import annotations

from datetime import timedelta

from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr, entity_registry as er
from homeassistant.util import dt as dt_util
import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.components.recorder.common import async_wait_recording_done

from .conftest import MOTION, WINDOW, setup_alarm
from .test_alarm import call
from .test_maintenance import BAT_WINDOW, _device

SIGNAL_WINDOW = "sensor.fenster_kueche_rssi"


# Überschreiben die gleichnamigen Fixtures aus conftest: zuerst die Datenbank, dann hass (sonst lehnt der Recorder ab)
@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(recorder_db_url, enable_custom_integrations):
    yield


@pytest.fixture(autouse=True)
def skip_frontend(recorder_db_url, hass):
    hass.config.components.add("frontend")
    yield


async def _ask(client, mid: int, **msg) -> dict:
    await client.send_json({"id": mid, "type": "alarmageddon/sensor_history", **msg})
    return await client.receive_json()


async def test_state_history_from_recorder_event_log_and_recordings(recorder_mock, hass: HomeAssistant, hass_ws_client, freezer) -> None:
    """
    Verlauf eines Fensters über einen Tag: zwei Öffnungen (eine bei scharfer Anlage, sie löst den Alarm aus) und ein Ausfall.
    Die Antwort nennt je Ereignis Dauer, Zustand der Anlage und den Alarm, dazu Stundenwerte und Kennzahlen.
    """
    client = await hass_ws_client(hass)  # vor dem Verstellen der Uhr anmelden: sonst gilt das Token noch nicht oder nicht mehr
    start = dt_util.utcnow().replace(minute=0, second=0, microsecond=0) - timedelta(hours=6)
    freezer.move_to(start)
    hass.states.async_set(WINDOW, "off")
    entry = await setup_alarm(hass)
    await async_wait_recording_done(hass)

    async def step(minutes: float, value: str | None = None, service: str | None = None) -> None:
        freezer.move_to(start + timedelta(minutes=minutes))
        if value is not None:
            hass.states.async_set(WINDOW, value)
        if service is not None:
            await call(hass, service)
        await hass.async_block_till_done()
        await async_wait_recording_done(hass)

    await step(10, "on")  # 2 Minuten offen bei deaktivierter Anlage
    await step(12, "off")
    await step(60, service="alarm_arm_home")
    await step(90, "on")  # bei scharfer Anlage: Alarm
    await step(95, service="alarm_disarm")
    await step(100, "off")
    await step(150, "unavailable")  # 20 Minuten nicht erreichbar
    await step(170, "off")
    freezer.move_to(start + timedelta(hours=6))
    result = (await _ask(client, 1, entity_id=WINDOW, hours=24))["result"]
    events = result["events"]
    assert [(e["kind"], e["seconds"], e["mode"], bool(e["alarm"])) for e in events] == [
        ("gone", 1200, None, False), ("on", 600, "home", True), ("on", 120, None, False)]
    assert events[1]["alarm"] == entry.runtime_data.recorder.recordings[0]["id"]
    assert [(a["mode"], a["to"] is not None) for a in result["armed"]] == [("home", True)]
    summary = result["summary"]
    assert (summary["count"], summary["seconds"], summary["longest"], summary["alarms"]) == (2, 720, 600, 1)
    assert (summary["gone_count"], summary["gone_seconds"]) == (1, 1200) and 98 < summary["available"] < 99
    assert sum(b[1] for b in result["buckets"]) == 2 and sum(b[2] for b in result["buckets"]) == 720
    assert result["entry_id"] == entry.entry_id and result["truncated"] is False
    # Kürzerer Zeitraum: nur was darin liegt (3 Stunden: der Ausfall bei 150 Minuten liegt davor)
    short = (await _ask(client, 2, entity_id=WINDOW, hours=3))["result"]
    assert short["events"] == [] and short["summary"]["count"] == 0


async def test_only_monitored_sensors_and_fitting_periods(recorder_mock, hass: HomeAssistant, hass_ws_client) -> None:
    """Der Befehl gibt nur den Verlauf überwachter Sensoren heraus und nur Zeiträume, die zur Art passen."""
    hass.states.async_set("binary_sensor.fremd", "off")
    await setup_alarm(hass)
    client = await hass_ws_client(hass)
    assert (await _ask(client, 1, entity_id="binary_sensor.fremd"))["error"]["code"] == "not_found"
    assert (await _ask(client, 2, entity_id="sensor.temperatur"))["error"]["code"] == "invalid_format"
    assert (await _ask(client, 3, entity_id=WINDOW, hours=5))["error"]["code"] == "invalid_format"
    assert (await _ask(client, 4, entity_id=WINDOW, kind="state", hours=8760))["error"]["code"] == "invalid_format"
    assert (await _ask(client, 5, entity_id=WINDOW, kind="battery", hours=24))["error"]["code"] == "invalid_format"
    assert (await _ask(client, 6, entity_id=MOTION, kind="battery", hours=720))["error"]["code"] == "not_found"  # kein Batteriesensor am Gerät
    assert (await _ask(client, 7, entity_id=WINDOW, hours=720))["success"]


async def test_battery_and_signal_history(recorder_mock, hass: HomeAssistant, hass_ws_client, freezer) -> None:
    """Batterie: Verlauf mit erkanntem Wechsel, Verbrauch je Tag und Schwelle. Empfang: Verlauf mit Mittel und schwächstem Wert."""
    _device(hass, WINDOW, BAT_WINDOW)
    device_id = er.async_get(hass).async_get(WINDOW).device_id
    er.async_get(hass).async_get_or_create("sensor", "test", "fenster_rssi", device_id=device_id, original_device_class="signal_strength", suggested_object_id="fenster_kueche_rssi")
    assert dr.async_get(hass).async_get(device_id) is not None
    start = dt_util.utcnow() - timedelta(days=20)
    for day in range(21):
        freezer.move_to(start + timedelta(days=day))
        level = 30 - day if day < 5 else 100 - (day - 5) * 2  # nach 5 Tagen gewechselt, danach 2 Prozentpunkte je Tag
        hass.states.async_set(BAT_WINDOW, str(level), {"unit_of_measurement": "%"})
        hass.states.async_set(SIGNAL_WINDOW, str(-60 - (day % 4) * 5), {"unit_of_measurement": "dBm"})
        await async_wait_recording_done(hass)
    await setup_alarm(hass)
    client = await hass_ws_client(hass)
    battery = (await _ask(client, 1, entity_id=WINDOW, kind="battery", hours=720))["result"]
    assert battery["entity_id"] == BAT_WINDOW and battery["unit"] == "%" and battery["threshold"] == 20
    assert len(battery["points"]) == 21 and battery["points"][-1][1] == 70
    assert len(battery["changes"]) == 1 and battery["summary"]["last_change"] == battery["changes"][0]
    assert battery["summary"]["current"] == 70 and battery["summary"]["per_day"] == -2.0
    assert 24 <= battery["summary"]["days_left"] <= 26  # von 70 auf 20 bei 2 Prozentpunkten je Tag
    signal = (await _ask(client, 2, entity_id=WINDOW, kind="signal", hours=720))["result"]
    assert signal["entity_id"] == SIGNAL_WINDOW and signal["unit"] == "dBm"
    assert signal["summary"]["min"] == -75 and signal["summary"]["max"] == -60 and signal["summary"]["current"] == -60
    assert "threshold" not in signal


async def test_statistics_are_preferred_and_thinned_out(recorder_mock, hass: HomeAssistant, hass_ws_client, monkeypatch) -> None:
    """Gibt es eine Langzeitstatistik, kommt die Linie von dort; lange Reihen werden auf eine feste Zahl Punkte gemittelt."""
    from custom_components.alarmageddon import sensor_history

    _device(hass, WINDOW, BAT_WINDOW)
    hass.states.async_set(BAT_WINDOW, "64", {"unit_of_measurement": "%"})
    now = dt_util.utcnow()
    asked: list[str] = []

    async def statistics(_hass, entity_id, start, period):
        asked.append(period)
        return [(start + timedelta(days=i / 2), 100 - i * 0.05) for i in range(720)]

    monkeypatch.setattr(sensor_history, "_statistics", statistics)
    await setup_alarm(hass)
    client = await hass_ws_client(hass)
    year = (await _ask(client, 1, entity_id=WINDOW, kind="battery", hours=8760))["result"]
    assert asked == ["day"] and len(year["points"]) <= sensor_history.POINTS_MAX
    assert year["points"][0][1] > year["points"][-1][1] and year["summary"]["current"] == 64
    assert dt_util.parse_datetime(year["start"]) <= now - timedelta(days=364)
    MockConfigEntry  # noqa: B018 - Import wird von den Hilfen oben gebraucht
