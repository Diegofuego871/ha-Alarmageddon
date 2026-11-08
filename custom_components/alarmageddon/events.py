"""
Ereignisprotokoll einer Anlage: Zustandswechsel mit Auslöser und Person.

Der Server speichert nur Daten (Zustand, Modus, Sensor, Person), keine
Texte: das Panel formuliert sie in der Sprache von HA.
"""

from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import EVENTS_KEEP, EVENTS_STORE_KEY
from .controller import AlarmController


def _store(hass: HomeAssistant, entry_id: str) -> Store:
    return Store(hass, 1, f"{EVENTS_STORE_KEY}.{entry_id}")


class EventLog:
    def __init__(self, hass: HomeAssistant, entry_id: str, controller: AlarmController) -> None:
        self.hass = hass
        self._ctl = controller
        self._store = _store(hass, entry_id)
        self.events: list[dict[str, Any]] = []
        self._last_state: str | None = None
        self._unsub = None

    async def async_load(self) -> None:
        data = await self._store.async_load()
        if isinstance(data, list):
            self.events = [e for e in data if isinstance(e, dict)][:EVENTS_KEEP]

    @callback
    def async_start(self) -> None:
        # Erst nach der Wiederherstellung: der wiederhergestellte Zustand ist kein neues Ereignis
        self._last_state = str(self._ctl.state)
        self._unsub = self._ctl.add_listener(self._on_change)
        self._unsub_events = self._ctl.add_event_listener(self._on_event)

    @callback
    def _on_change(self) -> None:
        state = str(self._ctl.state)
        if state == self._last_state:
            return
        self._last_state = state
        event = {"t": dt_util.utcnow().isoformat(), "state": state, "mode": self._ctl.mode, "by": self._ctl.changed_by}
        if state in ("pending", "triggered") and self._ctl.triggered_by:
            event["sensor"] = self._ctl.triggered_by
        self._add(event)

    @callback
    def _on_event(self, kind: str, data: dict[str, Any]) -> None:
        """Ereignisse ohne Zustandswechsel, zum Beispiel ein Sensor fällt im scharfen Zustand aus."""
        self._add({"t": dt_util.utcnow().isoformat(), "kind": kind, "state": str(self._ctl.state), "mode": self._ctl.mode, **data})

    @callback
    def _add(self, event: dict[str, Any]) -> None:
        self.events.insert(0, event)
        del self.events[EVENTS_KEEP:]
        # Selten (nur bei Zustandswechseln): verzögertes Speichern genügt, es wird nie dauernd verschoben
        self._store.async_delay_save(lambda: self.events, 1)

    async def async_stop(self) -> None:
        for unsub in (self._unsub, getattr(self, "_unsub_events", None)):
            if unsub:
                unsub()
        self._unsub = None
        self._unsub_events = None
        # Sofort schreiben verwirft den geplanten Termin; sonst legte er die Datei nach dem Entfernen neu an (LEARNINGS)
        await self._store.async_save(self.events)


async def async_remove_events(hass: HomeAssistant, entry_id: str) -> None:
    await _store(hass, entry_id).async_remove()
