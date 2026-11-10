"""
Welche Alarmaktionen laufen, wenn ein Sensor "Immer aktiv" ist (1.7.0).

Die Regel, wie sie im Blatt des Sensors steht:
- Anlage deaktiviert: die Aktionen von "Immer aktiv".
- Scharf in einem Modus, dessen Zone den Sensor nicht enthält: "Immer aktiv" gilt, es laufen die Aktionen von "Immer aktiv".
- Scharf in einem Modus, dessen Zone den Sensor enthält: standardmässig zählt nur der Modus (seine Einstellungen, seine
  Aktionen). Mit ausgeschaltetem Schalter gilt "Immer aktiv" zusätzlich: der Sensor löst sofort aus, beide Abläufe laufen.
- Hat "Immer aktiv" keinen eigenen Ablauf, läuft bei scharfer Anlage der Ablauf des Modus (im Zweifel alarmieren).

Beide Abläufe laufen nebeneinander und stehen unter derselben Aufsicht (Wächter, eingestellte Dauer, Neustart).
"""

from __future__ import annotations

import asyncio
from typing import Any

import pytest
from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import HomeAssistant, ServiceCall, State
from pytest_homeassistant_custom_component.common import async_mock_service, mock_restore_cache_with_extra_data

from custom_components.alarmageddon import workflow as wf

from .conftest import ALARM, FRONT_DOOR, WINDOW, setup_alarm
from .test_alarm import advance, call, settle, state
from .test_sensor_options import SMOKE, _classes, open_sensor

MODE_SIREN, ALWAYS_SIREN = "switch.sirene_modus", "switch.sirene_immer"
MODE_FLOW = [{"type": "action", "action": "switch.turn_on", "target": [MODE_SIREN]}]
ALWAYS_FLOW = [{"type": "action", "action": "switch.turn_on", "target": [ALWAYS_SIREN]}]
FLOWS = {"home": MODE_FLOW, "away": MODE_FLOW, "always": ALWAYS_FLOW}
ALWAYS = {SMOKE: {"always": True}}
BOTH = {SMOKE: {"always": True, "always_off": False}}  # Schalter aus: "Immer aktiv" gilt zusätzlich
IN_AWAY = {"zone_away": [FRONT_DOOR, WINDOW, "binary_sensor.bewegung_flur", SMOKE]}


async def _setup(hass: HomeAssistant, **overrides: Any):
    _classes(hass)
    calls = async_mock_service(hass, "switch", "turn_on")
    async_mock_service(hass, "switch", "turn_off")
    entry = await setup_alarm(hass, exit_delay_away=0, **{"workflows": FLOWS, **overrides})
    return entry, calls


async def _spin(rounds: int = 40) -> None:
    """Der Ereignisschleife Zeit geben, ohne auf verfolgte Aufgaben zu warten (ein hängender Dienst wäre eine davon)."""
    for _ in range(rounds):
        await asyncio.sleep(0)


def _targets(calls: list[ServiceCall]) -> list[str]:
    return sorted(t for c in calls for t in c.data["entity_id"])


@pytest.mark.parametrize(
    ("name", "overrides", "arm", "expected"),
    [
        ("deaktiviert: Immer aktiv", {"sensor_options": ALWAYS}, None, [ALWAYS_SIREN]),
        ("scharf, Sensor nicht in der Zone: Immer aktiv", {"sensor_options": ALWAYS}, "alarm_arm_away", [ALWAYS_SIREN]),
        ("scharf, Sensor in der Zone, Standard: nur der Modus", {"sensor_options": ALWAYS, **IN_AWAY}, "alarm_arm_away", [MODE_SIREN]),
        ("scharf, Sensor in der Zone, Schalter aus: beide", {"sensor_options": BOTH, **IN_AWAY}, "alarm_arm_away", [ALWAYS_SIREN, MODE_SIREN]),
        ("scharf in einem anderen Modus als der Zone: Immer aktiv", {"sensor_options": BOTH, **IN_AWAY}, "alarm_arm_home", [ALWAYS_SIREN]),
        ("Immer aktiv ohne eigenen Ablauf, scharf: Ablauf des Modus", {"sensor_options": ALWAYS, "workflows": {"away": MODE_FLOW}}, "alarm_arm_away", [MODE_SIREN]),
        ("ohne Aktionen pro Modus (derselbe Ablauf überall), Schalter aus: einmal", {"sensor_options": BOTH, **IN_AWAY, "workflows": {"away": MODE_FLOW, "always": MODE_FLOW}},
         "alarm_arm_away", [MODE_SIREN]),
    ],
    ids=lambda v: v if isinstance(v, str) and " " in v else None,
)
async def test_which_actions_run_for_an_always_active_sensor(hass: HomeAssistant, name: str, overrides: dict, arm: str | None, expected: list[str]) -> None:
    """Die Tabelle aus dem Kopf dieser Datei: je Fall genau die erwarteten Abläufe, jeder Schritt genau einmal."""
    entry, calls = await _setup(hass, **overrides)
    if arm:
        await call(hass, arm)
    await open_sensor(hass, SMOKE)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    assert _targets(calls) == expected
    await settle(hass)
    assert _targets(calls) == expected  # nichts läuft doppelt
    await call(hass, "alarm_disarm")
    await settle(hass)
    assert entry.runtime_data.workflow.running is None and entry.runtime_data.controller.alarm_flows == []


async def test_an_ordinary_sensor_and_a_manual_alarm_run_the_flow_of_the_mode(hass: HomeAssistant) -> None:
    """Ein Sensor der Zone (nicht immer aktiv) und der Alarm von Hand starten den Ablauf des Modus; von Hand bei deaktivierter Anlage "Immer aktiv"."""
    entry, calls = await _setup(hass, sensor_options=BOTH, **IN_AWAY)
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, WINDOW)
    assert _targets(calls) == [MODE_SIREN]
    await call(hass, "alarm_disarm")
    await open_sensor(hass, WINDOW, "off")
    await settle(hass)
    calls.clear()
    await call(hass, "alarm_trigger")
    await settle(hass)
    assert _targets(calls) == [ALWAYS_SIREN]
    await call(hass, "alarm_disarm")
    await settle(hass)
    calls.clear()
    await call(hass, "alarm_arm_away")
    await call(hass, "alarm_trigger")
    await settle(hass)
    assert _targets(calls) == [MODE_SIREN]


async def test_only_the_mode_counts_also_for_the_rule(hass: HomeAssistant, freezer) -> None:
    """Standard: Im Modus mit dem Sensor gilt dessen Regel (hier Eingangsverzögerung), danach laufen nur die Aktionen des Modus."""
    entry, calls = await _setup(hass, sensor_options=ALWAYS, entry_sensors=[SMOKE], **IN_AWAY)
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, SMOKE)
    assert state(hass) == AlarmControlPanelState.PENDING and not calls
    await advance(hass, freezer, 21)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    assert _targets(calls) == [MODE_SIREN]


async def test_the_switch_can_differ_per_mode(hass: HomeAssistant) -> None:
    """Mit "Einstellungen pro Modus": in Anwesend aus (beide Abläufe), in Abwesend Standard (nur der Modus)."""
    zones = {"zone_home": [FRONT_DOOR, WINDOW, SMOKE], **IN_AWAY}
    entry, calls = await _setup(hass, per_mode_sensors=True, sensor_options=ALWAYS, sensor_modes={"home": {SMOKE: {"always_off": False}}}, **zones)
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, SMOKE)
    assert _targets(calls) == [ALWAYS_SIREN, MODE_SIREN]
    await call(hass, "alarm_disarm")
    await settle(hass)
    await open_sensor(hass, SMOKE, "off")
    calls.clear()
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, SMOKE)
    assert _targets(calls) == [MODE_SIREN]


async def test_both_flows_run_side_by_side_and_keep_their_own_time(hass: HomeAssistant, freezer) -> None:
    """
    Beide Abläufe laufen nebeneinander: ein Warten im einen hält den anderen nicht auf, und jeder hält seine eigene eingestellte
    Dauer ein (Sirene des Modus 60 s, Sirene von "Immer aktiv" 180 s).
    """
    _classes(hass)
    on = async_mock_service(hass, "switch", "turn_on")
    off = async_mock_service(hass, "switch", "turn_off")
    flow = lambda siren, seconds: [{"type": "action", "action": "switch.turn_on", "target": [siren]}, {"type": "wait", "seconds": seconds},  # noqa: E731
                                   {"type": "action", "action": "switch.turn_off", "target": [siren]}]
    await setup_alarm(hass, exit_delay_away=0, sensor_options=BOTH, workflows={"away": flow(MODE_SIREN, 60), "always": flow(ALWAYS_SIREN, 180)}, **IN_AWAY)
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, SMOKE)
    await settle(hass)  # beide Abläufe stehen an ihrem Schritt "Warten"
    assert _targets(on) == [ALWAYS_SIREN, MODE_SIREN] and not off
    await advance(hass, freezer, 61)
    assert _targets(off) == [MODE_SIREN]
    await advance(hass, freezer, 118)
    assert _targets(off) == [MODE_SIREN]
    await advance(hass, freezer, 2)
    assert _targets(off) == [ALWAYS_SIREN, MODE_SIREN]


async def test_both_flows_continue_after_a_reload_with_their_remaining_time(hass: HomeAssistant, freezer) -> None:
    """Neuladen mitten im Alarm: beide Abläufe machen an ihrem Schritt weiter, keine Sirene schaltet doppelt ein, die Zeiten zählen weiter."""
    _classes(hass)
    on = async_mock_service(hass, "switch", "turn_on")
    off = async_mock_service(hass, "switch", "turn_off")
    flow = lambda siren, seconds: [{"type": "action", "action": "switch.turn_on", "target": [siren]}, {"type": "wait", "seconds": seconds},  # noqa: E731
                                   {"type": "action", "action": "switch.turn_off", "target": [siren]}]
    entry = await setup_alarm(hass, exit_delay_away=0, sensor_options=BOTH, workflows={"away": flow(MODE_SIREN, 60), "always": flow(ALWAYS_SIREN, 180)}, **IN_AWAY)
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, SMOKE)
    await settle(hass)  # beide Abläufe stehen an ihrem Schritt "Warten"
    await advance(hass, freezer, 30)
    hass.config_entries.async_update_entry(entry, options={**entry.options, "entry_delay": 25})
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    assert entry.runtime_data.controller.alarm_flows == ["away", "always"]
    await advance(hass, freezer, 31)
    assert _targets(off) == [MODE_SIREN]
    await advance(hass, freezer, 120)
    assert _targets(off) == [ALWAYS_SIREN, MODE_SIREN]
    assert _targets(on) == [ALWAYS_SIREN, MODE_SIREN], "nach dem Neuladen schaltet keine Sirene ein zweites Mal ein"


async def test_a_hanging_step_in_one_flow_never_holds_up_the_other(hass: HomeAssistant, monkeypatch) -> None:
    """Hängt ein Gerät im Ablauf des Modus, läuft der Ablauf von "Immer aktiv" sofort, und der Wächter setzt auch den ersten fort."""
    for name in ("SERVICE_TIMEOUT", "SNAPSHOT_TIMEOUT", "WATCHDOG_GRACE"):
        monkeypatch.setattr(wf, name, 0.2)
    _classes(hass)
    on = async_mock_service(hass, "switch", "turn_on")

    async def hang(_call: ServiceCall) -> None:
        await asyncio.Event().wait()

    hass.services.async_register("haengt", "jetzt", hang)
    mode_flow = [{"type": "action", "action": "haengt.jetzt"}, *MODE_FLOW]
    await setup_alarm(hass, exit_delay_away=0, sensor_options=BOTH, workflows={"away": mode_flow, "always": ALWAYS_FLOW}, **IN_AWAY)
    await call(hass, "alarm_arm_away")
    hass.states.async_set(SMOKE, "on")  # ohne async_block_till_done: das wartete auf den hängenden Aufruf
    await _spin()
    assert _targets(on) == [ALWAYS_SIREN]  # der zweite Ablauf wartet nicht auf den hängenden ersten
    await asyncio.sleep(0.6)
    await _spin()
    assert _targets(on) == [ALWAYS_SIREN, MODE_SIREN]
    await hass.services.async_call("alarm_control_panel", "alarm_disarm", {"entity_id": ALARM}, blocking=True)
    await _spin()
    assert state(hass) == AlarmControlPanelState.DISARMED


async def test_a_second_flow_that_dies_resumes_with_its_next_step(hass: HomeAssistant, monkeypatch) -> None:
    """Die Aufsicht gilt für jeden Ablauf: bricht der zweite ab, macht er mit seinem nächsten Schritt weiter; der erste läuft ungestört."""
    original = wf.WorkflowRunner._execute
    starts: list[tuple[str, int]] = []

    async def execute(self, trigger: str, start: int) -> None:
        starts.append((trigger, start))
        if trigger == "always" and start == 0:
            raise RuntimeError("zweiter Ablauf bricht ab")
        await original(self, trigger, start)

    monkeypatch.setattr(wf.WorkflowRunner, "_execute", execute)
    always_flow = [{"type": "wait", "seconds": 0}, *ALWAYS_FLOW]
    entry, calls = await _setup(hass, sensor_options=BOTH, workflows={"away": MODE_FLOW, "always": always_flow}, **IN_AWAY)
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, SMOKE)
    await asyncio.sleep(0.1)
    await settle(hass)
    assert starts == [("away", 0), ("always", 0), ("always", 1)]
    assert _targets(calls) == [ALWAYS_SIREN, MODE_SIREN]


async def test_messages_with_two_flows(hass: HomeAssistant, hass_ws_client) -> None:
    """
    Alarmmeldung bei zwei Abläufen: ohne Push-Schritt genau eine Standardmeldung; hat einer der Abläufe einen Push-Schritt,
    entfällt die Standardmeldung, und jeder Push-Schritt sendet seine eigene.
    """
    pushes = async_mock_service(hass, "notify", "handy")
    entry, calls = await _setup(hass, sensor_options=BOTH, **IN_AWAY)
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "alarmageddon/save_notify", "notify": {"alarm_targets": ["notify.handy"]}})
    assert (await client.receive_json())["success"]
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, SMOKE)
    await hass.async_block_till_done()
    assert len(pushes) == 1
    await call(hass, "alarm_disarm")
    await settle(hass)
    await open_sensor(hass, SMOKE, "off")
    pushes.clear()
    hass.config_entries.async_update_entry(entry, options={**entry.options, "workflows": {"away": MODE_FLOW, "always": [{"type": "notify", "title": "Rauch in {name}"}, *ALWAYS_FLOW]}})
    await settle(hass)
    await call(hass, "alarm_arm_away")
    await open_sensor(hass, SMOKE)
    await hass.async_block_till_done()
    assert [p.data["title"] for p in pushes] == ["Rauch in Haus"]


async def test_the_flows_of_a_running_alarm_survive_a_restart(hass: HomeAssistant) -> None:
    """Neustart von Home Assistant im Alarm: die Abläufe des Alarms stehen in den gespeicherten Daten des Zustands."""
    data = {"mode": "away", "deadline": None, "bypassed": [], "triggered_by": SMOKE, "changed_by": None, "alarm_flows": ["away", "always", "gibt_es_nicht"]}
    mock_restore_cache_with_extra_data(hass, [(State(ALARM, "triggered"), data)])
    entry, _calls = await _setup(hass, sensor_options=BOTH, **IN_AWAY)
    ctl = entry.runtime_data.controller
    assert state(hass) == AlarmControlPanelState.TRIGGERED
    assert ctl.alarm_flows == ["away", "always"] and ctl.alarm_plan() == ["away", "always"]
    assert ctl.restore_data()["alarm_flows"] == ["away", "always"]
