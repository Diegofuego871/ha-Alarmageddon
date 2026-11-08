"""
Alarm-Aufzeichnung: pro Alarm eine Zeitachse, vom ersten Auslöser bis zum Quittieren.

Ein Alarm beginnt mit "Eingangsverzögerung" oder "Alarm" und endet mit dem
Deaktivieren (Quittieren). Dazwischen werden Zustandswechsel und jede
Änderung der Sensoren der Anlage mit Zeitstempel festgehalten, damit man
später sieht, was in welcher Reihenfolge angesprochen hat (zuerst das
Fenster, dann der Bewegungsmelder). Der Server speichert nur Daten, keine
Texte: das Panel formuliert sie in der Sprache von HA.
"""

from __future__ import annotations

from typing import Any

from homeassistant.components.alarm_control_panel import AlarmControlPanelState
from homeassistant.const import STATE_OFF, STATE_ON
from homeassistant.core import CALLBACK_TYPE, Event, EventStateChangedData, HomeAssistant, callback
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import RECORDINGS_ENTRIES_KEEP, RECORDINGS_KEEP, RECORDINGS_STORE_KEY
from .controller import AlarmController

_ACTIVE = (AlarmControlPanelState.PENDING, AlarmControlPanelState.TRIGGERED)


def _store(hass: HomeAssistant, entry_id: str) -> Store:
    return Store(hass, 1, f"{RECORDINGS_STORE_KEY}.{entry_id}")


class AlarmRecorder:
    def __init__(self, hass: HomeAssistant, entry_id: str, controller: AlarmController) -> None:
        self.hass = hass
        self._ctl = controller
        self._store = _store(hass, entry_id)
        # Neueste zuerst; der erste Eintrag ist offen, solange "end" fehlt
        self.recordings: list[dict[str, Any]] = []
        self._last_state: str | None = None
        self._unsubs: list[CALLBACK_TYPE] = []
        self._unsub_sensors: CALLBACK_TYPE | None = None

    @property
    def current(self) -> dict[str, Any] | None:
        if self.recordings and self.recordings[0].get("end") is None:
            return self.recordings[0]
        return None

    async def async_load(self) -> None:
        data = await self._store.async_load()
        if isinstance(data, list):
            self.recordings = [r for r in data if isinstance(r, dict) and isinstance(r.get("entries"), list)][:RECORDINGS_KEEP]

    @callback
    def async_start(self) -> None:
        """Nach der Wiederherstellung des Zustands: ein Alarm über den Neustart hinweg läuft weiter."""
        state = self._ctl.state
        self._last_state = str(state)
        if self.current:
            if state in _ACTIVE:
                self._add({"kind": "restart"})
                self._watch_sensors()
            else:
                # Während des Neustarts quittiert oder abgelaufen: abschliessen, nichts erfinden
                self._finish(None, reason="restart")
        self._unsubs = [self._ctl.add_listener(self._on_change), self._ctl.add_event_listener(self._on_event), self._ctl.add_record_listener(self._on_record)]

    @callback
    def _on_change(self) -> None:
        state = self._ctl.state
        text = str(state)
        if text == self._last_state:
            return
        self._last_state = text
        if self.current is None:
            if state in _ACTIVE:
                self._begin()
            return
        entry: dict[str, Any] = {"kind": "state", "state": text}
        if state in _ACTIVE and self._ctl.triggered_by:
            entry["sensor"] = self._ctl.triggered_by
        if state == AlarmControlPanelState.DISARMED:
            entry["by"] = self._ctl.changed_by
            self._add(entry)
            self._finish(self._ctl.changed_by)
            return
        self._add(entry)

    @callback
    def _begin(self) -> None:
        now = dt_util.utcnow().isoformat()
        record = {"id": now, "start": now, "end": None, "ended_by": None, "mode": self._ctl.mode, "sensor": self._ctl.triggered_by, "entries": []}
        self.recordings.insert(0, record)
        del self.recordings[RECORDINGS_KEEP:]
        # Der erste Sensor hat schon angesprochen, bevor wir zuhören: mit dem echten Zeitpunkt nachtragen
        sensor = self._ctl.triggered_by
        if sensor and (st := self.hass.states.get(sensor)):
            record["entries"].append({"t": st.last_changed.isoformat(), "kind": "sensor", "sensor": sensor, "to": st.state})
        self._add({"kind": "state", "state": str(self._ctl.state), **({"sensor": sensor} if sensor else {})})
        self._watch_sensors()

    @callback
    def _watch_sensors(self) -> None:
        self._unwatch()
        sensors = sorted(self._ctl.all_sensors())
        if sensors:
            self._unsub_sensors = async_track_state_change_event(self.hass, sensors, self._on_sensor)

    @callback
    def _unwatch(self) -> None:
        if self._unsub_sensors:
            self._unsub_sensors()
            self._unsub_sensors = None

    @callback
    def _on_sensor(self, event: Event[EventStateChangedData]) -> None:
        if self.current is None:
            return
        old, new = event.data["old_state"], event.data["new_state"]
        if new is None or (old is not None and old.state == new.state):
            return
        to = new.state if new.state in (STATE_ON, STATE_OFF) else "gone"
        self._add({"kind": "sensor", "sensor": event.data["entity_id"], "to": to})

    @callback
    def _on_event(self, kind: str, data: dict[str, Any]) -> None:
        """Ereignisse ohne Zustandswechsel (Sensor ausgefallen, nicht bestätigt) gehören in einen laufenden Alarm."""
        if self.current is not None and kind in ("sensor_offline", "sensor_report", "unconfirmed"):
            self._add({"kind": kind, **data})

    @callback
    def _on_record(self, kind: str, data: dict[str, Any]) -> None:
        """Aktionsschritte und gesendete Meldungen des laufenden Alarms."""
        if self.current is not None and kind in ("step", "notified"):
            self._add({"kind": kind, **data})

    @callback
    def _add(self, entry: dict[str, Any]) -> None:
        record = self.current
        if record is None:
            return
        entries = record["entries"]
        if len(entries) >= RECORDINGS_ENTRIES_KEEP:
            # Ein flatternder Sensor darf den Anfang (die Ursache) nicht verdrängen: neue Einträge entfallen, das Ende kommt immer
            if entry.get("kind") == "sensor":
                record["truncated"] = True
                return
        entries.append({"t": dt_util.utcnow().isoformat(), **entry})
        self._save()

    @callback
    def _finish(self, by: str | None, reason: str | None = None) -> None:
        record = self.current
        if record is None:
            return
        record["end"] = dt_util.utcnow().isoformat()
        record["ended_by"] = by
        if reason:
            record["reason"] = reason
        self._unwatch()
        self._save()

    @callback
    def _save(self) -> None:
        # Verzögert: bei einem flatternden Sensor nicht bei jedem Eintrag schreiben
        self._store.async_delay_save(lambda: self.recordings, 2)

    async def async_stop(self) -> None:
        for unsub in self._unsubs:
            unsub()
        self._unsubs = []
        self._unwatch()
        await self._store.async_save(self.recordings)


async def async_remove_recordings(hass: HomeAssistant, entry_id: str) -> None:
    await _store(hass, entry_id).async_remove()
