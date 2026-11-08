"""
Batterieprognose (0.5.0): Wann fällt die Batterie unter die Schwelle?

Aus dem Verlauf (Recorder) der letzten 90 Tage, ab dem letzten
Batteriewechsel (Sprung nach oben), lineare Regression. Ohne genug Daten
(weniger als 3 Tage, kein Abfall) keine Prognose: lieber nichts als eine
erfundene Zahl.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from functools import partial
import logging
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

_LOGGER = logging.getLogger(__name__)

HISTORY_DAYS = 90
MIN_SPAN_DAYS = 3
REPLACED_JUMP = 10  # Prozentpunkte nach oben gelten als Batteriewechsel
MAX_DAYS = 3650


def forecast_days(points: list[tuple[float, float]], threshold: float) -> float | None:
    """
    Tage bis zur Schwelle ab dem letzten Messpunkt. points: (Zeit in
    Sekunden, Prozent), aufsteigend. 0 heisst: schon darunter.
    """
    if not points:
        return None
    start = 0
    for i in range(1, len(points)):
        if points[i][1] - points[i - 1][1] >= REPLACED_JUMP:
            start = i
    pts = points[start:]
    current = pts[-1][1]
    if current <= threshold:
        return 0.0
    if len(pts) < 3 or pts[-1][0] - pts[0][0] < MIN_SPAN_DAYS * 86400:
        return None
    n = len(pts)
    mean_t = sum(t for t, _ in pts) / n
    mean_v = sum(v for _, v in pts) / n
    var = sum((t - mean_t) ** 2 for t, _ in pts)
    if var == 0:
        return None
    slope = sum((t - mean_t) * (v - mean_v) for t, v in pts) / var  # Prozent pro Sekunde
    if slope >= 0:
        return None
    days = (current - threshold) / -slope / 86400
    return round(min(days, MAX_DAYS), 1)


def _value(item: Any) -> tuple[float, float] | None:
    """State oder kompaktes dict aus dem Recorder -> (Zeit, Prozent)."""
    if isinstance(item, dict):
        raw, when = item.get("state"), item.get("last_changed")
        when = dt_util.parse_datetime(when) if isinstance(when, str) else when
    else:
        raw, when = item.state, item.last_changed
    try:
        value = float(raw)
    except (TypeError, ValueError):
        return None
    if not isinstance(when, datetime) or not 0 <= value <= 100:
        return None
    return when.timestamp(), value


async def async_forecasts(hass: HomeAssistant, batteries: list[str], threshold: float) -> dict[str, float | None]:
    """Prognose je Batteriesensor; ohne Recorder ein leeres Ergebnis."""
    if not batteries or "recorder" not in hass.config.components:
        return {}
    from homeassistant.components.recorder import get_instance, history  # noqa: PLC0415 - nur mit Recorder

    start = dt_util.utcnow() - timedelta(days=HISTORY_DAYS)
    try:
        states = await get_instance(hass).async_add_executor_job(
            partial(history.get_significant_states, hass, start, None, batteries,
                    significant_changes_only=False, minimal_response=True, no_attributes=True)
        )
    except Exception:  # noqa: BLE001 - eine Prognose darf das Panel nie stören
        _LOGGER.exception("Battery history could not be read")
        return {}
    out: dict[str, float | None] = {}
    for entity_id in batteries:
        points = sorted(p for item in states.get(entity_id, []) if (p := _value(item)))
        out[entity_id] = forecast_days(points, threshold)
    return out
