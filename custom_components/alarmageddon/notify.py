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

from homeassistant.components import persistent_notification
from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.util import dt as dt_util

from .const import ICON_URL_PATH, NOTIFY_MODE_KINDS, NOTIFY_TYPES, PUSH_ACTION_DISARM, PUSH_ACTION_OPEN, PUSH_ACTION_SILENCE
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
        "action_silence": "Silence siren",
        "by_silence": "push notification",
        "action_open": "Open",
        "mode_home": "Home",
        "mode_away": "Away",
        "mode_night": "Night",
        "by_push": "push notification",
        "report_title": "Silent alarm: {name}",
        "report": "{sensor} responded while armed. No alarm was triggered because this sensor is set to \"Silent alarm\".",
        "type_triggered": "Alarm", "type_pending": "Entry delay", "type_armed": "Armed", "type_disarmed": "Disarmed",
        "type_arm_failed": "Arming not possible", "type_sensor_offline": "Sensor unreachable while armed",
        "type_sensor_report": "Silent alarm", "type_battery_low": "Low battery",
        "type_sensor_unavailable": "Sensor unreachable",
        "by_schedule": "Schedule",
        "maint_title_one": "Maintenance: {name}",
        "maint_title": "Maintenance: {count} sensors",
        "maint_battery": "{sensor}: battery {value} %",
        "maint_offline": "{sensor}: unreachable since {time}",
        "time_format": "%m/%d %H:%M",
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
        "action_silence": "Sirene stumm",
        "by_silence": "Push-Meldung",
        "action_open": "Öffnen",
        "mode_home": "Anwesend",
        "mode_away": "Abwesend",
        "mode_night": "Nacht",
        "by_push": "Push-Meldung",
        "report_title": "Stiller Alarm: {name}",
        "report": "{sensor} hat im scharfen Zustand angesprochen. Es wurde kein Alarm ausgelöst, weil dieser Sensor auf \"Stiller Alarm\" steht.",
        "type_triggered": "Alarm", "type_pending": "Eingangsverzögerung", "type_armed": "Scharf geschaltet", "type_disarmed": "Deaktiviert",
        "type_arm_failed": "Scharfschalten nicht möglich", "type_sensor_offline": "Sensor im scharfen Zustand nicht erreichbar",
        "type_sensor_report": "Stiller Alarm", "type_battery_low": "Batterie schwach",
        "type_sensor_unavailable": "Sensor nicht erreichbar",
        "by_schedule": "Zeitplan",
        "maint_title_one": "Wartung: {name}",
        "maint_title": "Wartung: {count} Sensoren",
        "maint_battery": "{sensor}: Batterie {value} %",
        "maint_offline": "{sensor}: nicht erreichbar seit {time}",
        "time_format": "%d.%m. %H:%M",
    },
}


def language(hass: HomeAssistant) -> str:
    lang = (hass.config.language or "").lower()
    return "de" if lang == "de" or lang.startswith("de-") else "en"


def text(hass: HomeAssistant, key: str, **values: Any) -> str:
    return TEXTS[language(hass)][key].format(**values)


@callback
def async_send(hass: HomeAssistant, targets: list[str], payload: dict[str, Any]) -> list[str]:
    """An jeden Empfänger einzeln und nicht blockierend; gibt die erreichbaren Dienste zurück."""
    sent = []
    for target in targets:
        domain, _, service = target.partition(".")
        if not hass.services.has_service(domain, service):
            _LOGGER.warning("Notification service %s not found", target)
            continue
        # Nicht blockierend: eine langsame oder fehlerhafte App darf den Alarm nie aufhalten
        hass.async_create_task(_async_call(hass, domain, service, payload))
        sent.append(target)
    return sent


@callback
def async_persist(hass: HomeAssistant, cfg: dict[str, Any], kind: str, title: str, message: str, notification_id: str, mode: str | None = None) -> None:
    """
    Zusätzlich als Benachrichtigung in Home Assistant (Glocke in der Seitenleiste), wenn die Art das eingeschaltet hat. Sie bleibt stehen,
    bis jemand sie wegklickt; dieselbe Kennung ersetzt den Inhalt (wie der tag auf dem Handy). Unabhängig von den Empfängern.
    """
    if effective_type(cfg, kind, mode).get("persistent"):
        persistent_notification.async_create(hass, message, title=title, notification_id=notification_id)


def effective_type(cfg: dict[str, Any], kind: str, mode: str | None) -> dict[str, Any]:
    """Einstellung einer Art: der eigene Wert des Modus (nur Arten im scharfen Zustand), sonst der gemeinsame."""
    own = ((cfg.get("modes") or {}).get(mode) or {}).get(kind) if cfg.get("per_mode") and mode and kind in NOTIFY_MODE_KINDS else None
    return {**cfg["types"][kind], **(own or {})}


def build_payload(cfg: dict[str, Any], kind: str, title: str, message: str, *, tag: str | None = None,
                  actions: list | None = None, critical: bool | None = None, volume: float | None = None,
                  url: str | None = None, mode: str | None = None) -> dict[str, Any]:
    """
    Inhalt einer Meldung der Art `kind`. Kritisch und Lautstärke kommen aus den Einstellungen der Art; `critical` überschreibt
    nur das "kritisch" (der Abschluss "Alarm beendet" ersetzt die kritische Meldung durch eine normale mit demselben tag).
    Kritisch: iOS mit "critical" und Lautstärke, Android über den Kanal "alarm_stream" mit hoher Priorität; beides steht in
    jeder kritischen Meldung, jede App nimmt sich, was sie kennt.
    """
    setting = effective_type(cfg, kind, mode)
    is_critical = setting["critical"] if critical is None else critical
    group = "alarmageddon" if NOTIFY_TYPES[kind] == "alarm" else "alarmageddon_maintenance"
    # icon_url: Symbol der Integration (Android); iOS zeigt immer das Symbol der App, das lässt sich nicht ersetzen
    data: dict[str, Any] = {"group": group, "url": url or "/alarmageddon", "clickAction": url or "/alarmageddon", "icon_url": ICON_URL_PATH}
    if tag:
        data["tag"] = tag
    if is_critical:
        data["push"] = {"sound": {"name": "default", "critical": 1, "volume": setting["volume"] if volume is None else volume}, "interruption-level": "critical"}
        data.update({"ttl": 0, "priority": "high", "channel": "alarm_stream"})
    if actions:
        data["actions"] = actions
    return {"title": title, "message": message, "data": data}


async def _async_call(hass: HomeAssistant, domain: str, service: str, payload: dict[str, Any]) -> None:
    try:
        await hass.services.async_call(domain, service, payload, blocking=True)
    except Exception:  # noqa: BLE001 - jede Meldung einzeln, ein Fehler stoppt die anderen nicht
        _LOGGER.exception("Notification via %s.%s failed", domain, service)


class Notifier:
    """Hört auf die Zustände und Ereignisse einer Anlage und meldet nach den globalen Einstellungen."""

    def __init__(self, hass: HomeAssistant, entry: Any, controller: AlarmController, settings: Any) -> None:
        self.hass = hass
        self.entry = entry
        self._ctl = controller
        self._settings = settings
        self._last_state: str | None = None
        # Auslöser (Modus) des laufenden Alarms: beim Deaktivieren ist der Modus der Anlage schon weg
        self._alarm_trigger: str | None = None
        self._unsubs: list[Any] = []
        # Ablauf der Anlage: hat er für diesen Auslöser einen eigenen Push-Schritt, meldet der Alarm nicht doppelt
        self.workflow_has_notify = lambda _trigger: False
        # Knopf "Sirene stumm": Ablauf stoppen (vom Ablauf der Anlage gesetzt)
        self.silence = None

    @property
    def cfg(self) -> dict[str, Any]:
        return self._settings.notify

    def _t(self, key: str, **values: Any) -> str:
        return text(self.hass, key, **values)

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

    def _on(self, kind: str, mode: str | None = None) -> bool:
        # Die Alarmmeldung lässt sich nicht abschalten (Sicherheitsregel: im Zweifel alarmieren); ihre Einstellungen stehen im Push-Schritt
        if kind == "triggered":
            return True
        return bool(effective_type(self.cfg, kind, mode)["enabled"])

    @callback
    def _on_change(self) -> None:
        state = str(self._ctl.state)
        previous = self._last_state
        if state == previous:
            return
        self._last_state = state
        name = self.entry.title
        if state == AlarmControlPanelState.TRIGGERED:
            trigger = self._ctl.mode or "always"
            self._alarm_trigger = trigger
            if self._on("triggered") and not self.workflow_has_notify(trigger):
                self.send_alarm()
        elif state == AlarmControlPanelState.PENDING and self._on("pending", self._ctl.mode):
            self._send("pending", self._t("pending_title", name=name),
                       self._t("pending", sensor=self._name(self._ctl.triggered_by), seconds=self._ctl.entry_delay))
        elif state in (AlarmControlPanelState.ARMED_HOME, AlarmControlPanelState.ARMED_AWAY, AlarmControlPanelState.ARMED_NIGHT):
            if self._on("armed", self._ctl.mode) and previous not in (AlarmControlPanelState.TRIGGERED,):
                by = self._ctl.changed_by
                self._send("armed", self._t("armed_title", name=name, mode=self._mode(self._ctl.mode)),
                           self._t("armed", by=by) if by else self._t("armed_noby"))
        elif state == AlarmControlPanelState.DISARMED:
            by = self._ctl.changed_by
            if previous == AlarmControlPanelState.TRIGGERED and self._on("triggered"):
                self.send_alarm_end(by)
            elif self._on("disarmed"):
                self._send("disarmed", self._t("disarmed_title", name=name),
                           self._t("disarmed", by=by) if by else self._t("disarmed_noby"))

    @callback
    def _on_event(self, kind: str, data: dict[str, Any]) -> None:
        name = self.entry.title
        if kind == "arm_failed" and self._on("arm_failed"):
            sensors = ", ".join(self._name(e) for e in data.get("sensors", []))
            self._send("arm_failed", self._t("arm_failed_title", name=name, mode=self._mode(data.get("mode"))),
                       self._t("arm_failed", sensors=sensors))
        elif kind == "sensor_offline" and self._on("sensor_offline", self._ctl.mode):
            # Im scharfen Zustand ist ein ausgefallener Melder ein blinder Fleck (Standard: kritisch an die Alarm-Empfänger)
            self._send("sensor_offline", self._t("offline_title", name=self._name(data.get("sensor"))),
                       self._t("offline", sensor=self._name(data.get("sensor"))))
        elif kind == "sensor_report" and self._on("sensor_report", self._ctl.mode):
            # Sensor auf "Stiller Alarm": keine Alarmauslösung, aber eine Meldung (Standard: kritisch), eigener tag je Sensor
            sensor = data.get("sensor")
            self._send("sensor_report", self._t("report_title", name=self._name(sensor)),
                       self._t("report", sensor=self._name(sensor)), tag=f"{self._tag()}_report_{sensor}")

    @callback
    def _on_action(self, event: Event) -> None:
        """
        Knöpfe der Meldung. "Deaktivieren" und "Sirene stumm" nur, wenn ausdrücklich eingeschaltet (Sicherheitsregel).
        "Sirene stumm" lässt die Anlage im Alarm und stoppt nur die Schritte (Geräte kehren zurück).
        """
        action = event.data.get("action")
        if action == f"{PUSH_ACTION_DISARM}{self.entry.entry_id}" and self._button_allowed("disarm"):
            self.hass.async_create_task(self._ctl.async_disarm(None, self._t("by_push"), skip_code=True))
        elif action == f"{PUSH_ACTION_SILENCE}{self.entry.entry_id}" and self._button_allowed("silence") and self.silence:
            self.hass.async_create_task(self._silence())

    def _alarm_steps(self) -> list[dict[str, Any]]:
        """Push-Schritte des Ablaufs für den laufenden Alarm (leer: es geht die Standardmeldung raus)."""
        steps = (self.entry.options.get("workflows") or {}).get(self._ctl.mode or "always", [])
        return [s for s in steps if s.get("type") == "notify"]

    def _buttons(self, step: dict[str, Any] | None) -> dict[str, bool]:
        """Welche Knöpfe eine Alarmmeldung hat: Wert aus dem Push-Schritt, sonst der frühere globale Wert."""
        own = (step or {}).get("buttons") or {}
        return {key: bool(own.get(key, self.cfg[f"{key}_action"])) for key in ("open", "silence", "disarm")}

    def _button_allowed(self, key: str) -> bool:
        """
        Ein Knopf wirkt nur, wenn die Alarmmeldung ihn anbietet. Aus der Konfiguration abgeleitet (nicht aus dem Gedächtnis),
        damit er auch nach einem Neustart von Home Assistant noch wirkt: Meldungen auf dem Handy bleiben ja stehen.
        """
        steps = self._alarm_steps() or [None]
        return any(self._buttons(step)[key] for step in steps)

    async def _silence(self) -> None:
        if self._ctl.state == AlarmControlPanelState.TRIGGERED and await self.silence():
            self._ctl.emit("silenced", by=self._t("by_silence"))

    # ----- Senden -----

    def _tag(self) -> str:
        return f"alarmageddon_{self.entry.entry_id}"

    @staticmethod
    def _click_target(step: dict[str, Any] | None) -> str:
        """Wohin ein Tipp auf die Alarmmeldung führt: Standard das Protokoll mit dem laufenden Alarm (Zeitachse seit dem Auslösen)."""
        step = step or {}
        mode = step.get("click", "log")
        if mode == "custom" and step.get("click_path"):
            return step["click_path"]
        if mode == "overview":
            return "/alarmageddon"
        return "/alarmageddon?view=log"

    def _fill(self, template: str, sensor: str | None, time: str, mode: str | None = None) -> str:
        """Platzhalter eines eigenen Texts füllen; nur diese vier, alles andere bleibt wie geschrieben (kein str.format)."""
        values = {"{name}": self.entry.title, "{sensor}": self._name(sensor) if sensor else "", "{time}": time, "{mode}": self._mode(mode or self._ctl.mode)}
        for key, value in values.items():
            template = template.replace(key, value)
        return template.strip()

    @callback
    def send_alarm(self, test: bool = False, step: dict[str, Any] | None = None) -> None:
        """Alarmmeldung mit Aktionen (auch als Schritt im Ablauf); kritisch und Lautstärke nach den Einstellungen der Art "Alarm"."""
        name = self.entry.title
        sensor = self._ctl.triggered_by
        time = dt_util.as_local(dt_util.utcnow()).strftime("%H:%M")
        default_message = self._t("triggered", sensor=self._name(sensor), time=time) if sensor else self._t("triggered_manual", time=time)
        step = step or {}
        title, message = step.get("title"), step.get("message")
        # Eigener Text aus dem Schritt der Alarmaktionen ersetzt den Standardtext
        if custom_title := (title or "").strip():
            title = self._fill(custom_title, sensor, time) or self._t("triggered_title", name=name)
        else:
            title = self._t("triggered_title", name=name)
        if custom_message := (message or "").strip():
            message = self._fill(custom_message, sensor, time) or default_message
        else:
            message = default_message
        if test:
            title = self._t("test_title", name=title)
        buttons = self._buttons(step)
        target = self._click_target(step)
        actions = []
        if buttons["open"]:
            actions.append({"action": PUSH_ACTION_OPEN, "title": self._t("action_open"), "uri": target})
        if buttons["silence"]:
            actions.insert(0, {"action": f"{PUSH_ACTION_SILENCE}{self.entry.entry_id}", "title": self._t("action_silence")})
        if buttons["disarm"]:
            # iOS verlangt dafür Face ID/Code (authenticationRequired); Android kennt das nicht
            actions.insert(0, {"action": f"{PUSH_ACTION_DISARM}{self.entry.entry_id}", "title": self._t("action_disarm"),
                               "authenticationRequired": True, "destructive": True})
        self._send("triggered", title, message, tag=self._tag(), actions=actions, critical=step.get("critical"), volume=step.get("volume"), url=target)

    def _end_notify(self) -> dict[str, Any] | None:
        """Eigene Meldung aus dem Element "Alarm endet" (Konfiguration › Aktionen), wenn eingeschaltet."""
        value = (self.entry.options.get("workflow_end") or {}).get(self._alarm_trigger or self._ctl.mode or "always")
        own = value.get("notify") if isinstance(value, dict) else None
        return own if own and own.get("enabled") else None

    @callback
    def send_alarm_end(self, by: str | None, test: bool = False, own: dict[str, Any] | None = None) -> None:
        """
        "Alarm beendet": gleicher tag wie die Alarmmeldung, ersetzt also die kritische Meldung auf dem Handy. Ohne eigene Einstellung
        ein Standardtext und nie kritisch; mit eigener Meldung (Titel, Text, Kritisch, Lautstärke, Klickziel) gelten deren Werte.
        """
        name = self.entry.title
        own = own or self._end_notify()
        time = dt_util.as_local(dt_util.utcnow()).strftime("%H:%M")
        title = self._t("ended_title", name=name)
        message = self._t("ended", by=by) if by else self._t("ended_noby")
        critical, volume, target = False, None, "/alarmageddon?view=log"
        if own:
            sensor = self._ctl.triggered_by
            mode = self._alarm_trigger if self._alarm_trigger in ("home", "away", "night") else None
            title = self._fill((own.get("title") or "").strip(), sensor, time, mode) or title
            message = self._fill((own.get("message") or "").strip(), sensor, time, mode) or message
            critical = bool(own.get("critical"))
            volume = own.get("volume")
            target = self._click_target(own)
        if test:
            title = self._t("test_title", name=title)
        self._send("triggered", title, message, tag=self._tag(), critical=critical, volume=volume, url=target)

    @callback
    def send_test(self, kind: str, mode: str | None = None) -> list[str]:
        """Testmeldung einer Art an ihre Empfänger, mit ihrem Kritisch und ihrer Lautstärke (so hört man, wie sie klingt)."""
        title = self._t("test_title", name=self._t(f"type_{kind}"))
        self._send(kind, title, self._t("test"), mode=mode)
        return self._targets(kind)

    def _targets(self, kind: str) -> list[str]:
        return self.cfg["alarm_targets" if NOTIFY_TYPES[kind] == "alarm" else "maintenance_targets"]

    @callback
    def _send(self, kind: str, title: str, message: str, *, tag: str | None = None, actions: list | None = None,
              critical: bool | None = None, volume: float | None = None, url: str | None = None, mode: str | None = None) -> None:
        self._ctl.record("notified", type=kind)
        # Eigene Werte je Modus gelten nur für Arten im scharfen Zustand; ohne Angabe der Modus der Anlage
        mode = mode or (self._ctl.mode if kind in NOTIFY_MODE_KINDS else None)
        async_persist(self.hass, self.cfg, kind, title, message, tag or f"alarmageddon_{self.entry.entry_id}_{kind}", mode)
        async_send(self.hass, self._targets(kind), build_payload(self.cfg, kind, title, message, tag=tag, actions=actions, critical=critical, volume=volume, url=url, mode=mode))
