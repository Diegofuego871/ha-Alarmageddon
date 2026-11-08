"""
Zeitplan (0.6.0): eine Anlage zu festen Zeiten scharf schalten (Modus
wählbar) oder deaktivieren, an gewählten Wochentagen.

Sicherheitsregeln: Ein Zeitplan deaktiviert nie einen laufenden Alarm oder
eine laufende Eingangsverzögerung (sonst könnte ein Einbruch kurz vor der
geplanten Zeit einfach "ausgeschaltet" werden). Er schaltet auch nicht in
einen Alarm hinein scharf. Übersprungenes steht im Ereignisprotokoll.
Scharfschalten scheitert wie von Hand an offenen Sensoren; die Meldung
"Scharfschalten nicht möglich" kommt dann wie gewohnt. Ein Code wird nicht
verlangt: den Zeitplan richtet ein Administrator ein.

Verpasste Zeiten (Home Assistant war aus) werden nicht nachgeholt.
"""

from __future__ import annotations

from functools import partial
import logging
from typing import Any

from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.event import async_track_time_change
from homeassistant.util import dt as dt_util

from .const import CONF_SCHEDULES, SCHEDULE_OFF
from .controller import AlarmController
from .notify import text

_LOGGER = logging.getLogger(__name__)

BUSY = (AlarmControlPanelState.PENDING, AlarmControlPanelState.TRIGGERED)


class Scheduler:
    def __init__(self, hass: HomeAssistant, entry: ConfigEntry, controller: AlarmController) -> None:
        self.hass = hass
        self.entry = entry
        self._ctl = controller
        self._unsubs: list[CALLBACK_TYPE] = []

    @property
    def rules(self) -> list[dict[str, Any]]:
        return [r for r in self.entry.options.get(CONF_SCHEDULES) or [] if isinstance(r, dict)]

    @callback
    def async_start(self) -> None:
        for rule in self.rules:
            if not rule.get("enabled", True):
                continue
            try:
                hour, minute = (int(x) for x in str(rule["time"]).split(":"))
            except (KeyError, ValueError):
                continue
            self._unsubs.append(async_track_time_change(self.hass, partial(self._fire, rule), hour=hour, minute=minute, second=0))

    @callback
    def async_stop(self) -> None:
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()

    @callback
    def _fire(self, rule: dict[str, Any], now: Any) -> None:
        if dt_util.as_local(now).weekday() not in rule.get("days", []):
            return
        self.hass.async_create_task(self.async_run(rule["action"]))

    async def async_run(self, action: str) -> None:
        ctl = self._ctl
        by = text(self.hass, "by_schedule")
        if ctl.state in BUSY:
            # Nie einen Alarm oder eine Eingangsverzögerung per Zeitplan beenden oder überschreiben
            _LOGGER.warning("%s: schedule '%s' skipped, alarm or entry delay running", self.entry.title, action)
            ctl.emit("schedule_skipped", action=action, reason="alarm")
            return
        if action == SCHEDULE_OFF:
            if ctl.state != AlarmControlPanelState.DISARMED:
                await ctl.async_disarm(None, by, skip_code=True)
            return
        if action not in ctl.modes:
            ctl.emit("schedule_skipped", action=action, reason="mode")
            return
        if ctl.mode == action and ctl.state != AlarmControlPanelState.DISARMED:
            return  # schon scharf oder auf dem Weg dorthin
        try:
            await ctl.async_arm(action, None, by, skip_code=True)
        except HomeAssistantError as err:
            # Offene Sensoren: arm_failed ist schon gemeldet und protokolliert
            _LOGGER.info("%s: schedule could not arm %s: %s", self.entry.title, action, err)
