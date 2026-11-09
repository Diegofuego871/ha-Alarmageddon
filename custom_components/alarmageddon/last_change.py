"""
Letzte echte Änderung eines Sensors (0.25.0): nur ein Wechsel zwischen "offen" und "zu" zählt.

Home Assistant setzt `last_changed` bei jedem Neustart und jeder Neuverbindung zurück ("nicht verfügbar" -> "zu"). Die Liste
soll aber zeigen, wann der Sensor zuletzt wirklich auf- oder zugegangen ist. Darum merkt sich Alarmageddon diesen Zeitpunkt selbst
(Speicher der Einstellungen) und holt für Sensoren ohne gemerkten Wert einmal den Verlauf (Recorder, letzte 90 Tage).
"""

from __future__ import annotations

from datetime import datetime, timedelta
from functools import partial
import logging
from typing import Any

from homeassistant.const import STATE_OFF, STATE_ON
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

_LOGGER = logging.getLogger(__name__)

HISTORY_DAYS = 90
_REAL = (STATE_ON, STATE_OFF)


def is_real_change(old: str | None, new: str | None) -> bool:
    """Nur auf <-> zu; alles mit "nicht verfügbar" oder "unbekannt" (Neustart, Funkabbruch) ist keine Änderung."""
    return old in _REAL and new in _REAL and old != new


def last_real_change(items: list[tuple[datetime, str]]) -> datetime | None:
    """
    Aus dem Verlauf (Zeit, Zustand), aufsteigend: der Zeitpunkt des letzten Wechsels zwischen "offen" und "zu". "Nicht verfügbar"
    dazwischen wird übersprungen; der erste Eintrag (Zustand zu Beginn des Zeitraums) ist kein Wechsel.
    """
    prev: str | None = None
    found: datetime | None = None
    for when, state in items:
        if state not in _REAL:
            continue
        if prev is not None and state != prev:
            found = when
        prev = state
    return found


def _item(item: Any) -> tuple[datetime, str] | None:
    if isinstance(item, dict):
        state, when = item.get("state"), item.get("last_changed")
        when = dt_util.parse_datetime(when) if isinstance(when, str) else when
    else:
        state, when = item.state, item.last_changed
    return (when, str(state)) if isinstance(when, datetime) and state is not None else None


async def async_history_changes(hass: HomeAssistant, entities: list[str]) -> dict[str, str]:
    """Letzte echte Änderung je Sensor aus dem Verlauf; ohne Recorder oder ohne Wechsel in 90 Tagen fehlt der Eintrag."""
    if not entities or "recorder" not in hass.config.components:
        return {}
    from homeassistant.components.recorder import get_instance, history  # noqa: PLC0415 - nur mit Recorder

    start = dt_util.utcnow() - timedelta(days=HISTORY_DAYS)
    try:
        states = await get_instance(hass).async_add_executor_job(
            partial(history.get_significant_states, hass, start, None, entities,
                    significant_changes_only=False, minimal_response=True, no_attributes=True)
        )
    except Exception:  # noqa: BLE001 - die Liste darf wegen des Verlaufs nie ausfallen
        _LOGGER.exception("Sensor history could not be read")
        return {}
    out: dict[str, str] = {}
    for entity_id in entities:
        items = sorted(p for item in states.get(entity_id, []) if (p := _item(item)))
        if (found := last_real_change(items)) is not None:
            out[entity_id] = found.isoformat()
    return out
