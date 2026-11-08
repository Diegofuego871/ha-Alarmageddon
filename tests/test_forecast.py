"""Batterieprognose (0.5.0): Regression ab dem letzten Wechsel, keine erfundenen Zahlen."""

from __future__ import annotations

from homeassistant.core import HomeAssistant
import pytest

from custom_components.alarmageddon.forecast import forecast_days

from .conftest import setup_alarm

DAY = 86400


def test_linear_drop() -> None:
    # 1 % pro Tag, jetzt 50 %: in 30 Tagen bei 20 %
    points = [(d * DAY, 80 - d) for d in range(31)]
    assert forecast_days(points, 20) == pytest.approx(30, abs=0.1)


def test_since_last_replacement() -> None:
    """Vor dem Wechsel fiel sie schnell; zählen darf nur die neue Batterie."""
    old = [(d * DAY, 60 - 5 * d) for d in range(8)]  # bis 25 %
    new = [((8 + d) * DAY, 100 - 0.5 * d) for d in range(21)]  # dann 100 % und 0,5 % pro Tag
    days = forecast_days(old + new, 20)
    assert days == pytest.approx((90 - 20) / 0.5, abs=0.5)


def test_not_enough_data() -> None:
    assert forecast_days([], 20) is None
    assert forecast_days([(0, 90), (DAY, 89)], 20) is None  # zu kurz
    assert forecast_days([(d * DAY, 90) for d in range(10)], 20) is None  # kein Abfall
    assert forecast_days([(d * DAY, 80 + d) for d in range(10)], 20) is None  # steigt


def test_already_below() -> None:
    assert forecast_days([(0, 15)], 20) == 0.0


def test_capped() -> None:
    points = [(d * DAY, 100 - 0.001 * d) for d in range(30)]
    assert forecast_days(points, 20) == 3650


async def test_ws_without_recorder(hass: HomeAssistant, hass_ws_client) -> None:
    await setup_alarm(hass)
    client = await hass_ws_client(hass)
    await client.send_json({"id": 1, "type": "alarmageddon/battery_forecast"})
    result = await client.receive_json()
    assert result["success"] and result["result"] == {"forecast": {}}
