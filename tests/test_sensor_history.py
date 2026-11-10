"""
Sensoransicht (1.9.0): Stundenwerte je Sensor, Abschnitte aus dem Verlauf, Zustand der Anlage, Batteriewechsel.

Die Tests mit echtem Recorder (Ereignisse, Batterie, Empfang über den Befehl des Panels) stehen in
test_sensor_history_recorder.py, weil der Recorder vor hass stehen muss.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

from custom_components.alarmageddon.sensor_history import (
    BACKFILLED,
    STATS_STORE_KEY,
    SensorStats,
    armed_intervals,
    async_get_stats,
    battery_changes,
    mode_at,
    periods,
)

from .conftest import FRONT_DOOR, MOTION, WINDOW, setup_alarm
from .test_alarm import advance, call, open_sensor, settle, state

T0 = datetime(2026, 11, 10, 8, 50, tzinfo=UTC)


def at(minutes: float) -> datetime:
    return T0 + timedelta(minutes=minutes)


def test_stats_count_openings_and_split_the_open_time_over_the_hours(hass: HomeAssistant) -> None:
    """Eine Öffnung zählt in der Stunde, in der sie beginnt; die Zeit "offen" wird auf die Stunden verteilt."""
    stats = SensorStats(hass)
    stats.note(WINDOW, "off", "on", at(0))  # 08:50
    stats.note(WINDOW, "on", "off", at(25))  # 09:15: 10 min in Stunde 8, 15 min in Stunde 9
    stats.note(WINDOW, "off", "on", at(40))  # 09:30
    stats.note(WINDOW, "on", "off", at(41))
    rows = stats.buckets(WINDOW, at(-60), at(120))
    assert rows == [[at(-50).isoformat(), 1, 600], [at(10).isoformat(), 1, 900 + 60]]


def test_stats_ignore_duplicates_and_do_not_count_the_return_from_unavailable(hass: HomeAssistant) -> None:
    """
    Zwei Anlagen mit demselben Sensor melden denselben Wechsel: er zählt einmal. "Nicht verfügbar" -> "offen" (nach jedem
    Neustart) ist keine Auslösung, die Zeit offen läuft aber ab dann.
    """
    stats = SensorStats(hass)
    for _ in range(2):
        stats.note(MOTION, "off", "on", at(0))
    stats.note(MOTION, "on", "unavailable", at(2))
    stats.note(MOTION, "unavailable", "on", at(5))
    stats.note(MOTION, "on", "off", at(6))
    stats.note(MOTION, "off", "unavailable", at(7))  # kein Wechsel von oder nach "offen": ohne Wirkung
    assert stats.buckets(MOTION, at(-60), at(60)) == [[at(-50).isoformat(), 1, 120 + 60]]


def test_an_open_sensor_counts_up_to_now_and_unknown_time_before_start_is_skipped(hass: HomeAssistant) -> None:
    """Ein noch offener Sensor zählt in der Abfrage bis jetzt mit; war er schon vor dem Start offen, ist die Dauer davor unbekannt."""
    stats = SensorStats(hass)
    stats.note(WINDOW, "on", "off", at(3))  # offen seit vor dem Start: keine Sekunden
    assert stats.buckets(WINDOW, at(-60), at(10)) == []
    stats.note(WINDOW, "off", "on", at(5))
    assert stats.buckets(WINDOW, at(-60), at(8)) == [[at(-50).isoformat(), 1, 180]]
    assert stats.data[WINDOW][at(-50).isoformat()] == [1, 0]  # gespeichert wird erst beim Schliessen


async def test_stats_drop_hours_older_than_30_days_and_survive_a_restart(hass: HomeAssistant, hass_storage, freezer) -> None:
    """Stundenwerte werden verzögert gespeichert, nach 30 Tagen verworfen und beim Start wieder geladen."""
    freezer.move_to(T0)
    stats = SensorStats(hass)
    old, recent = at(-31 * 1440).replace(minute=0).isoformat(), at(-29 * 1440).replace(minute=0).isoformat()
    stats.data = {WINDOW: {old: [3, 500], recent: [1, 240]}, FRONT_DOOR: {old: [1, 60]}}
    stats.purge()
    assert stats.data == {WINDOW: {recent: [1, 240]}}  # älter als 30 Tage: weg, ein Sensor ohne Werte ganz
    stats.note(WINDOW, "off", "on", at(0))
    stats.note(WINDOW, "on", "off", at(1))
    await advance(hass, freezer, 31)
    stored = hass_storage[STATS_STORE_KEY]["data"]
    assert stored[WINDOW][recent] == [1, 240] and stored[WINDOW][at(0).replace(minute=0).isoformat()] == [1, 60] and stored[BACKFILLED] == []
    again = SensorStats(hass)
    await again.async_load()
    assert again.data == stats.data


async def test_one_statistics_object_for_all_systems_and_fed_by_the_controller(hass: HomeAssistant, freezer) -> None:
    """Alle Anlagen teilen sich die Stundenwerte; jeder Wechsel eines überwachten Sensors kommt an, auch bei deaktivierter Anlage."""
    haus = await setup_alarm(hass, "Haus")
    garage = await setup_alarm(hass, "Garage")
    stats = await async_get_stats(hass)
    assert haus.runtime_data.controller.stats is stats and garage.runtime_data.controller.stats is stats
    await open_sensor(hass, WINDOW)
    await advance(hass, freezer, 90)
    await open_sensor(hass, WINDOW, "off") if False else hass.states.async_set(WINDOW, "off")
    await settle(hass)
    rows = stats.buckets(WINDOW, dt_util.utcnow() - timedelta(hours=1), dt_util.utcnow())
    assert sum(r[1] for r in rows) == 1 and sum(r[2] for r in rows) == 90
    assert state(hass) == AlarmControlPanelState.DISARMED


def test_periods_from_states() -> None:
    """Abschnitte "offen" und "nicht erreichbar"; der Zustand am Anfang des Zeitraums wird auf dessen Beginn gekürzt."""
    items = [(at(-30), "on"), (at(5), "off"), (at(10), "on"), (at(12), "unavailable"), (at(20), "on"), (at(21), "off"), (at(30), "on")]
    found = periods(items, at(0))
    assert [(p["kind"], p["start"], p["end"], p["counted"]) for p in found] == [
        ("on", at(0), at(5), False),  # lief schon vor dem Zeitraum
        ("on", at(10), at(12), True),
        ("gone", at(12), at(20), False),
        ("on", at(20), at(21), False),  # Rückkehr aus "nicht erreichbar": kein echter Wechsel zu -> offen
        ("on", at(30), None, True),  # läuft noch
    ]
    assert periods([], at(0)) == []


def test_armed_intervals_from_the_event_log() -> None:
    """Scharf ist auch Eingangsverzögerung und Alarm (im Modus des Ereignisses); die Ausgangsverzögerung zählt noch nicht."""
    def ev(minute: float, state_: str, mode: str | None = None, **more) -> dict:
        return {"t": at(minute).isoformat(), "state": state_, "mode": mode, **more}

    events = [  # neueste zuerst, wie das Ereignisprotokoll
        ev(70, "armed_night", "night"),
        ev(60, "disarmed"),
        ev(55, "triggered", "away"),
        ev(54, "pending", "away"),
        ev(52, "armed_away", "away", kind="sensor_report"),  # Ereignis ohne Zustandswechsel: zählt nicht
        ev(20, "armed_away", "away"),
        ev(19, "arming", "away"),
        ev(-500, "disarmed"),
    ]
    found = armed_intervals(events, at(0), at(100))
    assert found == [{"from": at(20), "to": at(60), "mode": "away"}, {"from": at(70), "to": None, "mode": "night"}]
    assert mode_at(found, at(19)) is None and mode_at(found, at(54)) == "away" and mode_at(found, at(65)) is None and mode_at(found, at(99)) == "night"
    # Ein Abschnitt, der vor dem Zeitraum begann, wird auf dessen Beginn gekürzt; einer, der davor endete, entfällt
    assert armed_intervals(events, at(30), at(100))[0]["from"] == at(30)
    assert armed_intervals(events[1:], at(61), at(100)) == []


def test_battery_changes_are_jumps_upwards() -> None:
    points = [(at(0), 31.0), (at(60), 30.0), (at(120), 100.0), (at(180), 99.0), (at(240), 99.5)]
    assert battery_changes(points) == [at(120)]
    assert battery_changes([]) == [] and battery_changes(points[:2]) == []


def test_backfill_only_fills_hours_before_the_own_values(hass: HomeAssistant, freezer) -> None:
    """Nachtragen aus dem Verlauf: einmal je Sensor, und nur für Stunden vor dem ersten eigenen Wert (nichts zählt doppelt)."""
    freezer.move_to(at(600))
    stats = SensorStats(hass)
    stats.note(WINDOW, "off", "on", at(130))  # eigener Wert in Stunde 11
    stats.note(WINDOW, "on", "off", at(131))
    history = [{"kind": "on", "start": at(0), "end": at(2), "counted": True}, {"kind": "gone", "start": at(20), "end": at(30), "counted": False},
               {"kind": "on", "start": at(130), "end": at(131), "counted": True}]
    stats.backfill(WINDOW, history, at(600))
    assert stats.buckets(WINDOW, at(-60), at(600)) == [[at(-50).isoformat(), 1, 120], [at(130).replace(minute=0).isoformat(), 1, 60]]
    stats.backfill(WINDOW, history, at(600))  # ein zweites Mal: ohne Wirkung
    assert sum(r[1] for r in stats.buckets(WINDOW, at(-60), at(600))) == 2 and WINDOW in stats.backfilled


async def test_arming_still_works_with_statistics(hass: HomeAssistant) -> None:
    """Die Stundenwerte hängen an derselben Stelle wie der Automat: ein Alarm löst unverändert aus."""
    await setup_alarm(hass)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
