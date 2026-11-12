"""
Töne stellen die Lautsprecher nach dem Ton zurück (1.26.0).

Aktivierungston, Voralarm und der Alarmton in den Listen ausserhalb des Alarmablaufs merken sich vorher, wie der Lautsprecher war
(ein oder aus, Lautstärke, Stummschaltung, bei Sonos die ganze Wiedergabe), spielen in der gewählten Lautstärke und stellen ihn
danach zurück. Standard an, je Schritt abschaltbar. Nichts davon darf den Alarm oder den Ablauf aufhalten.
"""

from __future__ import annotations

import asyncio
from typing import Any

import pytest
from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import async_mock_service

from custom_components.alarmageddon import workflow as wf

from .conftest import ALARM, WINDOW, setup_alarm
from .test_alarm import advance, call, open_sensor, settle, state

PLAYER = "media_player.wohnzimmer"
LIGHT, SIREN = "switch.licht", "switch.sirene"


def chime(**more: Any) -> dict[str, Any]:
    return {"type": "chime", "players": [PLAYER], "sound": "tone_pip", "duration": 3, "volume": 0.9, **more}


def act(target: str, **more: Any) -> dict[str, Any]:
    return {"type": "action", "action": "switch.turn_on", "target": [target], "wait": False, **more}


class Log:
    """Alle Aufrufe an den Lautsprecher in der Reihenfolge, in der sie kommen."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.calls: list[tuple[str, str, Any]] = []
        for domain, service in (("media_player", "play_media"), ("media_player", "media_stop"), ("media_player", "volume_set"),
                                ("media_player", "volume_mute"), ("media_player", "turn_off"), ("sonos", "snapshot"), ("sonos", "restore")):
            hass.services.async_register(domain, service, self._record(domain, service))

    def _record(self, domain: str, service: str):
        async def handler(service_call: ServiceCall) -> None:
            data = service_call.data
            self.calls.append((domain, service, data.get("volume_level", data.get("is_volume_muted", data.get("with_group")))))

        return handler

    def names(self) -> list[str]:
        return [f"{d}.{s}" for d, s, _ in self.calls]

    def volumes(self) -> list[float]:
        return [v for d, s, v in self.calls if s == "volume_set"]


async def _arm(hass: HomeAssistant, freezer, armed_steps: list[dict], player_state: str = "idle", attrs: dict | None = None):
    await hass.config.async_update(internal_url="http://192.168.1.2:8123")
    hass.states.async_set(PLAYER, player_state, attrs or {})
    log = Log(hass)
    on = async_mock_service(hass, "switch", "turn_on")
    entry = await setup_alarm(hass, **{"workflows": {"home": [act(SIREN)], "away": [act(SIREN)]}, "workflows_armed": {"home": armed_steps}, "exit_delay_away": 0})
    await call(hass, "alarm_arm_home")
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.ARMED_HOME
    return entry, log, on


async def test_a_tone_puts_a_speaker_that_was_off_back_to_off_and_to_the_old_volume(hass: HomeAssistant, freezer) -> None:
    """Lautsprecher war aus, leise: der Ton spielt in der gewählten Lautstärke, danach ist er wieder leise und aus."""
    _entry, log, _on = await _arm(hass, freezer, [chime()], "off", {"volume_level": 0.2})
    assert log.volumes() == [0.9] and "media_player.turn_off" not in log.names()  # mitten im Ton: gewählte Lautstärke
    await advance(hass, freezer, 4)
    assert log.volumes() == [0.9, 0.2], "danach die alte Lautstärke"
    names = log.names()
    assert names.index("media_player.media_stop") < names.index("media_player.turn_off"), "erst stoppen, dann ausschalten"
    assert names[-1] == "media_player.turn_off"


async def test_a_speaker_that_was_playing_stays_on(hass: HomeAssistant, freezer) -> None:
    _entry, log, _on = await _arm(hass, freezer, [chime()], "playing", {"volume_level": 0.3, "is_volume_muted": False})
    await advance(hass, freezer, 4)
    assert log.volumes() == [0.9, 0.3] and "media_player.turn_off" not in log.names()
    assert ("media_player", "volume_mute", False) in log.calls


async def test_the_restore_can_be_switched_off_per_step(hass: HomeAssistant, freezer) -> None:
    """Mit restore = False bleibt alles, wie der Ton es hinterlässt: nur der Stopp, keine Lautstärke zurück, kein Ausschalten."""
    _entry, log, _on = await _arm(hass, freezer, [chime(restore=False)], "off", {"volume_level": 0.2})
    await advance(hass, freezer, 4)
    assert log.volumes() == [0.9] and "media_player.turn_off" not in log.names() and "media_player.media_stop" in log.names()


async def test_restore_is_on_without_the_setting_in_older_steps(hass: HomeAssistant, freezer) -> None:
    """Ein gespeicherter Schritt ohne Angabe (vor 1.26.0) stellt zurück: der Standard ist an."""
    step = chime()
    assert "restore" not in step
    _entry, log, _on = await _arm(hass, freezer, [step], "idle", {"volume_level": 0.4})
    await advance(hass, freezer, 4)
    assert log.volumes() == [0.9, 0.4]


async def test_sonos_is_restored_with_its_whole_playback(hass: HomeAssistant, freezer) -> None:
    """Sonos: Snapshot vor dem Ton, danach Restore der ganzen Wiedergabe statt nur der Lautstärke."""
    er.async_get(hass).async_get_or_create("media_player", "sonos", "RINCON_1", suggested_object_id="wohnzimmer")
    _entry, log, _on = await _arm(hass, freezer, [chime()], "playing", {"volume_level": 0.3})
    names = log.names()
    assert names.index("sonos.snapshot") < names.index("media_player.volume_set") < names.index("media_player.play_media")
    await advance(hass, freezer, 4)
    assert ("sonos", "restore", True) in log.calls and log.volumes() == [0.9], "Restore der Wiedergabe, nicht die Lautstärke einzeln"


async def test_disarming_during_the_tone_puts_the_speaker_back(hass: HomeAssistant, freezer) -> None:
    _entry, log, _on = await _arm(hass, freezer, [chime(duration=60)], "off", {"volume_level": 0.2})
    assert log.volumes() == [0.9]
    await call(hass, "alarm_disarm")
    await settle(hass)
    assert state(hass) == AlarmControlPanelState.DISARMED
    assert log.volumes() == [0.9, 0.2] and "media_player.turn_off" in log.names()
    assert log.names().index("media_player.turn_off") > log.names().index("media_player.volume_set", log.names().index("media_player.play_media") + 1)


async def test_a_prealarm_in_the_alarm_flow_puts_the_speaker_back_before_the_siren(hass: HomeAssistant, freezer) -> None:
    """Voralarm vor der Sirene (der Ablauf wartet auf ihn): danach ist der Lautsprecher zurückgestellt, dann kommt die Sirene."""
    await hass.config.async_update(internal_url="http://192.168.1.2:8123")
    hass.states.async_set(PLAYER, "off", {"volume_level": 0.2})
    log = Log(hass)
    on = async_mock_service(hass, "switch", "turn_on")
    prealarm = {"type": "prealarm", "players": [PLAYER], "sound": "pre_beep", "duration": 5, "volume": 0.3, "wait": True}
    await setup_alarm(hass, workflows={"home": [prealarm, act(SIREN)]})
    await call(hass, "alarm_arm_home")
    await open_sensor(hass, WINDOW)
    assert state(hass) == AlarmControlPanelState.TRIGGERED and not on and log.volumes() == [0.3]
    await advance(hass, freezer, 6)
    assert log.volumes()[:2] == [0.3, 0.2] and "media_player.turn_off" in log.names()
    assert len(on) == 1 and on[0].data["entity_id"] == [SIREN]


async def test_the_alarm_sound_outside_the_alarm_flow_restores_after_its_duration(hass: HomeAssistant, freezer) -> None:
    """Ein Alarmton nach dem Quittieren oder beim Scharfschalten endet von selbst und stellt dann zurück (im Alarmablauf erst beim Deaktivieren)."""
    sound = {"type": "sound", "players": [PLAYER], "sound": "siren", "duration": 4, "volume": 0.8}
    _entry, log, _on = await _arm(hass, freezer, [sound], "idle", {"volume_level": 0.25})
    assert log.volumes() == [0.8]
    await advance(hass, freezer, 5)
    assert log.volumes() == [0.8, 0.25]


async def test_a_hanging_speaker_never_holds_up_the_steps_after_the_tone(hass: HomeAssistant, monkeypatch) -> None:
    """Hängt das Merken (Sonos-Snapshot) oder das Zurückstellen, geht es nach den Zeitgrenzen weiter: der Ablauf und die Sirene warten nicht."""
    for name in ("SERVICE_TIMEOUT", "SNAPSHOT_TIMEOUT", "WATCHDOG_GRACE"):
        monkeypatch.setattr(wf, name, 0.1)
    await hass.config.async_update(internal_url="http://192.168.1.2:8123")
    hass.states.async_set(PLAYER, "off", {"volume_level": 0.2})
    er.async_get(hass).async_get_or_create("media_player", "sonos", "RINCON_1", suggested_object_id="wohnzimmer")
    on = async_mock_service(hass, "switch", "turn_on")
    release = asyncio.Event()

    async def hang(_call: ServiceCall) -> None:
        await release.wait()

    for domain, service in (("sonos", "snapshot"), ("sonos", "restore"), ("media_player", "volume_set"), ("media_player", "turn_off")):
        hass.services.async_register(domain, service, hang)
    async_mock_service(hass, "media_player", "play_media")
    async_mock_service(hass, "media_player", "media_stop")
    prealarm = {"type": "prealarm", "players": [PLAYER], "sound": "pre_beep", "duration": 1, "volume": 0.3, "wait": True}
    try:
        await setup_alarm(hass, workflows={"home": [prealarm, act(SIREN)]})
        await call(hass, "alarm_arm_home")
        hass.states.async_set(WINDOW, "on")
        for _ in range(40):
            await asyncio.sleep(0.1)
            if on:
                break
        assert len(on) == 1 and on[0].data["entity_id"] == [SIREN], "die Sirene schaltet, obwohl der Lautsprecher beim Merken und Zurückstellen hängt"
    finally:
        release.set()
        await hass.services.async_call("alarm_control_panel", "alarm_disarm", {"entity_id": ALARM}, blocking=False)
        await settle(hass)


async def test_a_failing_memory_never_stops_the_tone(hass: HomeAssistant, freezer, monkeypatch) -> None:
    """Scheitert das Merken des Zustands, spielt der Ton trotzdem (Zusatz, nie ein Hindernis); zurückgestellt wird dann nichts."""
    def broken(self, _entities):
        raise RuntimeError("kaputt")

    monkeypatch.setattr(wf.WorkflowRunner, "_snapshot", broken)
    _entry, log, _on = await _arm(hass, freezer, [chime()], "off", {"volume_level": 0.2})
    assert "media_player.play_media" in log.names() and log.volumes() == [0.9]
    await advance(hass, freezer, 4)
    assert "media_player.media_stop" in log.names() and log.volumes() == [0.9] and "media_player.turn_off" not in log.names()


def test_every_step_with_a_tone_has_the_restore_option_in_the_schema() -> None:
    from custom_components.alarmageddon.schemas import STEP_SCHEMAS

    for kind in ("sound", "chime", "prealarm"):
        step = STEP_SCHEMAS[kind]({"type": kind, "players": [PLAYER], "sound": "siren" if kind == "sound" else "tone_pip"})
        assert step["restore"] is True, f"{kind}: Standard an"
        assert STEP_SCHEMAS[kind]({"type": kind, "players": [PLAYER], "sound": "siren" if kind == "sound" else "tone_pip", "restore": False})["restore"] is False


@pytest.mark.parametrize("validator", ["valid_after_step", "valid_armed_step", "valid_arming_step", "valid_entry_step"])
def test_tones_keep_the_restore_option_in_every_list_but_devices_do_not(validator: str) -> None:
    from custom_components.alarmageddon import schemas

    check = getattr(schemas, validator)
    tone = {"type": "chime", "players": [PLAYER], "restore": False} if validator != "valid_after_step" else {"type": "sound", "players": [PLAYER], "sound": "siren", "duration": 5, "restore": False}
    assert check(tone)["restore"] is False
    device = {"type": "action", "action": "switch.turn_on", "target": [LIGHT], "restore": True}
    assert check(device)["restore"] is False, "ein Gerät wird dort nie zurückgesetzt"
