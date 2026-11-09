"""
Wartung (0.5.0): schwache Batterien und dauerhaft nicht erreichbare Sensoren
aller Anlagen an die Wartungs-Empfänger melden.

Ruhig statt laut: Jedes Problem wird einmal gemeldet, nicht bei jeder
Prüfung. Gemerkt wird das im Store, damit ein Neustart nicht alles neu
meldet. Eine Batterie gilt erst wieder als gut, wenn sie deutlich über der
Schwelle liegt (gewechselt), ein Sensor, sobald er wieder antwortet. Neue
Probleme einer Prüfung kommen gesammelt in einer Meldung.

Eine Instanz für alle Anlagen: ein Sensor in zwei Anlagen wird nur einmal
gemeldet.
"""

from __future__ import annotations

from datetime import datetime, timedelta
import logging
from typing import Any

from homeassistant.config_entries import ConfigEntryState
from homeassistant.const import STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.helpers.event import async_call_later, async_track_time_interval
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import (
    BATTERY_HYSTERESIS,
    DATA_MAINTENANCE,
    DOMAIN,
    MAINTENANCE_INTERVAL,
    MAINTENANCE_START_DELAY,
    MAINTENANCE_STORE_KEY,
)
from .devices import battery_of
from .notify import async_persist, async_send, build_payload, text

_LOGGER = logging.getLogger(__name__)

GONE = (STATE_UNAVAILABLE, STATE_UNKNOWN)


def _number(value: str | None) -> float | None:
    try:
        return float(value) if value not in (None, *GONE) else None
    except (TypeError, ValueError):
        return None


class Maintenance:
    def __init__(self, hass: HomeAssistant, settings: Any) -> None:
        self.hass = hass
        self._settings = settings
        self._store = Store(hass, 1, MAINTENANCE_STORE_KEY)
        # Bereits gemeldet: {"battery": {sensor: Zeit}, "offline": {sensor: Zeit}}
        self.reported: dict[str, dict[str, str]] = {"battery": {}, "offline": {}}
        self._unsubs: list[CALLBACK_TYPE] = []

    async def async_start(self) -> None:
        stored = await self._store.async_load()
        if isinstance(stored, dict):
            for key in ("battery", "offline"):
                if isinstance(stored.get(key), dict):
                    self.reported[key] = {str(k): str(v) for k, v in stored[key].items()}
        self._unsubs.append(async_track_time_interval(self.hass, self._tick, timedelta(seconds=MAINTENANCE_INTERVAL)))
        self._unsubs.append(async_call_later(self.hass, MAINTENANCE_START_DELAY, self._tick))

    async def async_stop(self) -> None:
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()
        await self._store.async_save(self.reported)

    def sensors(self) -> set[str]:
        out: set[str] = set()
        for entry in self.hass.config_entries.async_entries(DOMAIN):
            if entry.state is ConfigEntryState.LOADED:
                out |= entry.runtime_data.controller.all_sensors()
        return out

    @callback
    def _tick(self, _now: Any = None) -> None:
        self.async_check()

    @callback
    def async_check(self) -> list[tuple[str, str, Any]]:
        """Prüft alle Sensoren; gibt die neu gemeldeten Probleme zurück (für Tests)."""
        cfg = self._settings.notify
        types = cfg["types"]
        threshold = cfg["battery_threshold"]
        offline_after = timedelta(minutes=cfg["offline_minutes"])
        now = dt_util.utcnow()
        sensors = self.sensors()
        found: list[tuple[str, str, Any]] = []
        changed = False

        for sensor, battery in battery_of(self.hass, sensors).items():
            state = self.hass.states.get(battery)
            value = _number(state.state if state else None)
            if value is None:
                continue
            if value < threshold:
                if sensor not in self.reported["battery"] and types["battery_low"]["enabled"]:
                    found.append(("battery", sensor, round(value)))
            elif value >= threshold + BATTERY_HYSTERESIS and self.reported["battery"].pop(sensor, None):
                changed = True

        for sensor in sensors:
            state = self.hass.states.get(sensor)
            if state is None:
                continue  # Entität fehlt ganz (zum Beispiel beim Start): kein Ausfall, den der Nutzer sehen könnte
            if state.state in GONE:
                if now - state.last_changed >= offline_after and sensor not in self.reported["offline"] and types["sensor_unavailable"]["enabled"]:
                    found.append(("offline", sensor, state.last_changed))
            elif self.reported["offline"].pop(sensor, None):
                changed = True

        # Nicht mehr überwachte Sensoren vergessen
        for key in ("battery", "offline"):
            for sensor in set(self.reported[key]) - sensors:
                del self.reported[key][sensor]
                changed = True

        if found:
            # Nur als gemeldet merken, was wirklich hinausging: ohne Empfänger kommt es später noch
            if self._send(found, cfg["maintenance_targets"]):
                for kind, sensor, _value in found:
                    self.reported["battery" if kind == "battery" else "offline"][sensor] = now.isoformat()
                changed = True
            else:
                found = []
        if changed:
            self._store.async_delay_save(lambda: self.reported, 1)
        return found

    def _name(self, entity_id: str) -> str:
        state = self.hass.states.get(entity_id)
        return state.name if state else entity_id

    def _time(self, when: datetime) -> str:
        return dt_util.as_local(when).strftime(text(self.hass, "time_format"))

    def _send(self, found: list[tuple[str, str, Any]], targets: list[str]) -> bool:
        cfg = self._settings.notify
        # Ohne Empfänger geht nichts aufs Handy, aber eine Art mit "stehen lassen" meldet sich trotzdem in Home Assistant
        if not targets and not any(cfg["types"]["battery_low" if k == "battery" else "sensor_unavailable"].get("persistent") for k, _s, _v in found):
            return False
        lines = [
            text(self.hass, "maint_battery", sensor=self._name(sensor), value=value) if kind == "battery"
            else text(self.hass, "maint_offline", sensor=self._name(sensor), time=self._time(value))
            for kind, sensor, value in found
        ]
        title = text(self.hass, "maint_title_one", name=self._name(found[0][1])) if len(found) == 1 else text(self.hass, "maint_title", count=len(found))
        # Gemischt (Batterie und Ausfall in einer Meldung): kritisch, wenn eine der beiden Arten kritisch ist; Lautstärke der lauteren
        kinds = {"battery_low" if kind == "battery" else "sensor_unavailable" for kind, _s, _v in found}
        loudest = max(kinds, key=lambda k: (cfg["types"][k]["critical"], cfg["types"][k]["volume"]))
        # Eigene Gruppe und eigener tag: Wartung steht auf dem Handy getrennt von Alarmmeldungen
        payload = build_payload(cfg, loudest, title, "\n".join(lines), tag="alarmageddon_maintenance",
                                critical=any(cfg["types"][k]["critical"] for k in kinds))
        persisted = [k for k in kinds if cfg["types"][k].get("persistent")]
        for kind in persisted:
            async_persist(self.hass, cfg, kind, title, "\n".join(lines), f"alarmageddon_maintenance_{kind}")
        # Gilt als gemeldet, wenn es aufs Handy ging oder in Home Assistant steht (sonst käme es alle 15 Minuten wieder)
        return bool(async_send(self.hass, targets, payload)) or bool(persisted)


async def async_start_maintenance(hass: HomeAssistant, settings: Any) -> None:
    if DATA_MAINTENANCE not in hass.data:
        maintenance = Maintenance(hass, settings)
        hass.data[DATA_MAINTENANCE] = maintenance
        await maintenance.async_start()


async def async_stop_maintenance(hass: HomeAssistant) -> None:
    if (maintenance := hass.data.pop(DATA_MAINTENANCE, None)) is not None:
        await maintenance.async_stop()
