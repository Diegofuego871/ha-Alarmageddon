"""Seitenpanel: eingebautes iframe-Panel, einmal pro HA, egal wie viele Anlagen."""

from __future__ import annotations

import asyncio
from pathlib import Path

from homeassistant.components import frontend
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant

from . import sound_loop
from .const import (
    DATA_PANEL,
    DATA_PANEL_LOCK,
    DATA_ICON,
    DATA_SOUNDS,
    ICON_URL_PATH,
    SOUNDS_URL_PATH,
    DATA_STATIC,
    PANEL_DIR,
    PANEL_HTML_FILE,
    PANEL_ICON,
    PANEL_STATIC_URL_PATH,
    PANEL_TITLE,
    PANEL_URL_PATH,
    PANEL_VERSION,
)

PANEL_PAGE_URL = f"{PANEL_STATIC_URL_PATH}/{PANEL_HTML_FILE}?v={PANEL_VERSION}"


async def async_register_panel(hass: HomeAssistant) -> None:
    """
    iframe-Panel statt Custom Panel (LEARNINGS aus ha-device-panel): HA rendert
    Kopfzeile, Menü-Knopf und Safe-Area selbst, das iframe hat eine feste Höhe.
    """
    if hass.data.get(DATA_PANEL):
        return
    # Beim Start lädt HA alle Anlagen zugleich: ohne Sperre registrieren zwei das Panel, und die zweite scheitert
    # mit "Overwriting panel alarmageddon" (die Anlage wäre dann nicht geladen)
    lock = hass.data.setdefault(DATA_PANEL_LOCK, asyncio.Lock())
    async with lock:
        if hass.data.get(DATA_PANEL):
            return
        await _register(hass)


async def _register(hass: HomeAssistant) -> None:
    if not hass.data.get(DATA_STATIC):
        # Statische Pfade lassen sich nicht abmelden: nur einmal pro Lauf von HA
        panel_dir = Path(__file__).parent / PANEL_DIR
        await hass.http.async_register_static_paths([StaticPathConfig(PANEL_STATIC_URL_PATH, str(panel_dir), True)])
        hass.data[DATA_STATIC] = True
    if not hass.data.get(DATA_SOUNDS):
        # Alarmtöne ohne Anmeldung: Medienplayer (Sonos & Co.) holen die Datei selbst und haben kein Token
        sounds_dir = Path(__file__).parent / "sounds"
        await hass.http.async_register_static_paths([StaticPathConfig(SOUNDS_URL_PATH, str(sounds_dir), True)])
        hass.data[DATA_SOUNDS] = True
    sound_loop.async_register(hass)
    if not hass.data.get(DATA_ICON):
        # Das Symbol der Meldungen: Das Handy holt es ohne Token vom Pfad der Integration
        icon = Path(__file__).parent / "brand" / "icon.png"
        await hass.http.async_register_static_paths([StaticPathConfig(ICON_URL_PATH, str(icon), True)])
        hass.data[DATA_ICON] = True
    frontend.async_register_built_in_panel(
        hass,
        component_name="iframe",
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        frontend_url_path=PANEL_URL_PATH,
        config={"url": PANEL_PAGE_URL},
        require_admin=True,
    )
    hass.data[DATA_PANEL] = True


def async_remove_panel(hass: HomeAssistant) -> None:
    if hass.data.pop(DATA_PANEL, None):
        frontend.async_remove_panel(hass, PANEL_URL_PATH)
