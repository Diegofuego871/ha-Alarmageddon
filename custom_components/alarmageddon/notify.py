"""
Benachrichtigungen einer Anlage über die Companion App (notify.mobile_app_* und
jeder andere notify-Dienst).

Kritische Meldungen: iOS mit "critical" und Lautstärke (push.sound), Android
über den Kanal "alarm_stream" mit hoher Priorität. Beide Teile stehen in jeder
Meldung; jede App nimmt sich, was sie kennt. Texte in der Sprache von HA
(Deutsch für de und de-*, sonst Englisch), nie fest im Code verstreut.
"""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.util import dt as dt_util

from .const import PUSH_ACTION_DISARM, PUSH_ACTION_OPEN
from .controller import AlarmController

_LOGGER = logging.getLogger(__name__)

TEXTS: dict[str, dict[str, str]] = {
    "en": {
        "triggered_title": "Alarm: {name}",
        "triggered": "{sensor} at {time}.",
        "triggered_manual": "Alarm triggered manually at {time}.",
        "pending_title": "Entry delay: {name}",
        "pending": "{sensor} opened. Alarm in {seconds} s unless disarmed.",
        "armed_title": "{name}: {mode} armed",
        "armed": "Armed by {by}.",
        "armed_noby": "The alarm system is armed.",
        "disarmed_title": "{name} disarmed",
        "disarmed": "Disarmed by {by}.",
        "disarmed_noby": "The alarm system is disarmed.",
        "ended_title": "Alarm ended: {name}",
        "ended": "Disarmed by {by}.",
        "ended_noby": "The alarm is over.",
        "arm_failed_title": "{name}: cannot arm {mode}",
        "arm_failed": "Open: {sensors}.",
        "offline_title": "Sensor unreachable: {name}",
        "offline": "{sensor} no longer responds while the alarm system is armed.",
        "test_title": "Test: {name}",
        "test": "This is a test notification from Alarmageddon.",
        "action_disarm": "Disarm",
        "action_open": "Open",
        "mode_home": "Home",
        "mode_away": "Away",
        "mode_night": "Night",
        "by_push": "push notification",
    },
    "de": {
        "triggered_title": "Alarm: {name}",
        "triggered": "{sensor} um {time}.",
        "triggered_manual": "Alarm von Hand ausgelöst um {time}.",
        "pending_title": "Eingangsverzögerung: {name}",
        "pending": "{sensor} geöffnet. Alarm in {seconds} s, wenn niemand deaktiviert.",
        "armed_title": "{name}: {mode} scharf",
        "armed": "Scharf geschaltet von {by}.",
        "armed_noby": "Die Anlage ist scharf.",
        "disarmed_title": "{name} deaktiviert",
        "disarmed": "Deaktiviert von {by}.",
        "disarmed_noby": "Die Anlage ist deaktiviert.",
        "ended_title": "Alarm beendet: {name}",
        "ended": "Deaktiviert von {by}.",
        "ended_noby": "Der Alarm ist vorbei.",
        "arm_failed_title": "{name}: {mode} nicht möglich",
        "arm_failed": "Offen: {sensors}.",
        "offline_title": "Sensor nicht erreichbar: {name}",
        "offline": "{sensor} antwortet nicht mehr, während die Anlage scharf ist.",
        "test_title": "Test: {name}",
        "test": "Das ist eine Testmeldung von Alarmageddon.",
        "action_disarm": "Deaktivieren",
        "action_open": "Öffnen",
        "mode_home": "Anwesend",
        "mode_away": "Abwesend",
        "mode_night": "Nacht",
        "by_push": "Push-Meldung",
    },
}


def language(hass: HomeAssistant) -> str:
    lang = (hass.config.language or "").lower()
    return "de" if lang == "de" or lang.startswith("de-") else "en"


class Notifier:
    """Hört auf die Zustände und Ereignisse einer Anlage und meldet nach den globalen Einstellungen."""

    def __init__(self, hass: HomeAssistant, entry: Any, controller: AlarmController, settings: Any) -> None:
        self.hass = hass
        self.entry = entry
        self._ctl = controller
        self._settings = settings
        self._last_state: str | None = None
        self._unsubs: list[Any] = []
        # Ablauf der Anlage: hat er für diesen Auslöser einen eigenen Push-Schritt, meldet der Alarm nicht doppelt
        self.workflow_has_notify = lambda _trigger: False

    @property
    def cfg(self) -> dict[str, Any]:
        return self._settings.notify

    def _t(self, key: str, **values: Any) -> str:
        text = TEXTS[language(self.hass)][key]
        return text.format(**values)

    def _name(self, entity_id: str | None) -> str:
        state = self.hass.states.get(entity_id) if entity_id else None
        return state.name if state else (entity_id or "")

    def _mode(self, mode: str | None) -> str:
        return self._t(f"mode_{mode}") if mode in ("home", "away", "night") else ""

    @callback
    def async_start(self) -> None:
        self._last_state = str(self._ctl.state)
        self._unsubs.append(self._ctl.add_listener(self._on_change))
        self._unsubs.append(self._ctl.add_event_listener(self._on_event))
        self._unsubs.append(self.hass.bus.async_listen("mobile_app_notification_action", self._on_action))

    @callback
    def async_stop(self) -> None:
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()

    # ----- Auslöser -----

    @callback
    def _on_change(self) -> None:
        state = str(self._ctl.state)
        previous = self._last_state
        if state == previous:
            return
        self._last_state = state
        events = self.cfg["events"]
        name = self.entry.title
        if state == AlarmControlPanelState.TRIGGERED:
            trigger = self._ctl.mode or "always"
            if events["triggered"] and not self.workflow_has_notify(trigger):
                self.send_alarm()
        elif state == AlarmControlPanelState.PENDING and events["pending"]:
            self._send(self.cfg["alarm_targets"], self._t("pending_title", name=name),
                       self._t("pending", sensor=self._name(self._ctl.triggered_by), seconds=self._ctl.entry_delay), critical=False)
        elif state in (AlarmControlPanelState.ARMED_HOME, AlarmControlPanelState.ARMED_AWAY, AlarmControlPanelState.ARMED_NIGHT):
            if events["armed"] and previous not in (AlarmControlPanelState.TRIGGERED,):
                by = self._ctl.changed_by
                self._send(self.cfg["alarm_targets"], self._t("armed_title", name=name, mode=self._mode(self._ctl.mode)),
                           self._t("armed", by=by) if by else self._t("armed_noby"), critical=False)
        elif state == AlarmControlPanelState.DISARMED:
            by = self._ctl.changed_by
            if previous == AlarmControlPanelState.TRIGGERED and events["triggered"]:
                # Gleicher tag: ersetzt die kritische Meldung auf dem Handy durch "Alarm beendet"
                self._send(self.cfg["alarm_targets"], self._t("ended_title", name=name),
                           self._t("ended", by=by) if by else self._t("ended_noby"), critical=False, tag=self._tag())
            elif events["disarmed"]:
                self._send(self.cfg["alarm_targets"], self._t("disarmed_title", name=name),
                           self._t("disarmed", by=by) if by else self._t("disarmed_noby"), critical=False)

    @callback
    def _on_event(self, kind: str, data: dict[str, Any]) -> None:
        events = self.cfg["events"]
        name = self.entry.title
        if kind == "arm_failed" and events["arm_failed"]:
            sensors = ", ".join(self._name(e) for e in data.get("sensors", []))
            self._send(self.cfg["alarm_targets"], self._t("arm_failed_title", name=name, mode=self._mode(data.get("mode"))),
                       self._t("arm_failed", sensors=sensors), critical=False)
        elif kind == "sensor_offline" and events["sensor_offline"]:
            # Im scharfen Zustand ist ein ausgefallener Melder ein blinder Fleck: kritisch an die Alarm-Empfänger
            self._send(self.cfg["alarm_targets"], self._t("offline_title", name=self._name(data.get("sensor"))),
                       self._t("offline", sensor=self._name(data.get("sensor"))), critical=True)

    @callback
    def _on_action(self, event: Event) -> None:
        """Knopf "Deaktivieren" in der Meldung. Nur wenn ausdrücklich eingeschaltet (Sicherheitsregel)."""
        if event.data.get("action") != f"{PUSH_ACTION_DISARM}{self.entry.entry_id}" or not self.cfg["disarm_action"]:
            return
        self.hass.async_create_task(self._ctl.async_disarm(None, self._t("by_push"), skip_code=True))

    # ----- Senden -----

    def _tag(self) -> str:
        return f"alarmageddon_{self.entry.entry_id}"

    @callback
    def send_alarm(self, test: bool = False) -> None:
        """Kritische Alarmmeldung mit Aktionen (auch als Schritt im Ablauf)."""
        name = self.entry.title
        sensor = self._ctl.triggered_by
        time = dt_util.as_local(dt_util.utcnow()).strftime("%H:%M")
        title = self._t("triggered_title", name=name)
        message = self._t("triggered", sensor=self._name(sensor), time=time) if sensor else self._t("triggered_manual", time=time)
        if test:
            title = self._t("test_title", name=title)
        actions = [{"action": PUSH_ACTION_OPEN, "title": self._t("action_open"), "uri": "/alarmageddon"}]
        if self.cfg["disarm_action"]:
            # iOS verlangt dafür Face ID/Code (authenticationRequired); Android kennt das nicht
            actions.insert(0, {"action": f"{PUSH_ACTION_DISARM}{self.entry.entry_id}", "title": self._t("action_disarm"),
                               "authenticationRequired": True, "destructive": True})
        self._send(self.cfg["alarm_targets"], title, message, critical=self.cfg["critical"], tag=self._tag(), actions=actions)

    @callback
    def send_test(self, group: str) -> list[str]:
        targets = self.cfg["maintenance_targets" if group == "maintenance" else "alarm_targets"]
        self._send(targets, self._t("test_title", name=self.entry.title), self._t("test"), critical=group == "alarm" and self.cfg["critical"])
        return targets

    def payload(self, title: str, message: str, critical: bool, tag: str | None = None, actions: list | None = None) -> dict[str, Any]:
        data: dict[str, Any] = {"group": "alarmageddon", "url": "/alarmageddon", "clickAction": "/alarmageddon"}
        if tag:
            data["tag"] = tag
        if critical:
            data["push"] = {"sound": {"name": "default", "critical": 1, "volume": self.cfg["volume"]}, "interruption-level": "critical"}
            data.update({"ttl": 0, "priority": "high", "channel": "alarm_stream"})
        if actions:
            data["actions"] = actions
        return {"title": title, "message": message, "data": data}

    @callback
    def _send(self, targets: list[str], title: str, message: str, critical: bool, tag: str | None = None, actions: list | None = None) -> None:
        payload = self.payload(title, message, critical, tag, actions)
        for target in targets:
            domain, _, service = target.partition(".")
            if not self.hass.services.has_service(domain, service):
                _LOGGER.warning("Notification service %s not found", target)
                continue
            # Nicht blockierend: eine langsame oder fehlerhafte App darf den Alarm nie aufhalten
            self.hass.async_create_task(self._call(domain, service, payload))

    async def _call(self, domain: str, service: str, payload: dict[str, Any]) -> None:
        try:
            await self.hass.services.async_call(domain, service, payload, blocking=True)
        except Exception:  # noqa: BLE001 - jede Meldung einzeln, ein Fehler stoppt die anderen nicht
            _LOGGER.exception("Notification via %s.%s failed", domain, service)
