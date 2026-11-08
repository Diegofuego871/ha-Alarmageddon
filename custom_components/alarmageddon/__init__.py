"""Alarmageddon: Alarmanlage für Home Assistant. Ein Config Entry pro Anlage, ein Panel für alle."""

from __future__ import annotations

from dataclasses import dataclass

from homeassistant.config_entries import ConfigEntry, ConfigEntryState
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.typing import ConfigType
from homeassistant.loader import async_get_integration

from . import websocket_api
from .const import DOMAIN, MODES
from .controller import AlarmController
from .events import EventLog, async_remove_events
from .maintenance import async_start_maintenance, async_stop_maintenance
from .notify import Notifier
from .panel import async_register_panel, async_remove_panel
from .scheduler import Scheduler
from .settings import async_get_settings
from .update_check import async_start_daily, async_stop_daily
from .workflow import WorkflowRunner, async_remove_workflow_store

PLATFORMS: list[Platform] = [Platform.ALARM_CONTROL_PANEL, Platform.BINARY_SENSOR]

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


@dataclass
class RuntimeData:
    controller: AlarmController
    events: EventLog
    version: str | None
    notifier: Notifier | None = None
    workflow: WorkflowRunner | None = None


type AlarmageddonConfigEntry = ConfigEntry[RuntimeData]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    # Einmal pro HA, nicht pro Anlage: sonst meldet HA doppelte Befehle
    websocket_api.async_register(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: AlarmageddonConfigEntry) -> bool:
    integration = await async_get_integration(hass, DOMAIN)
    settings = await async_get_settings(hass)
    controller = AlarmController(hass, entry, settings)
    events = EventLog(hass, entry.entry_id, controller)
    await events.async_load()
    notifier = Notifier(hass, entry, controller, settings)
    workflow = WorkflowRunner(hass, entry, controller, notifier)
    notifier.workflow_has_notify = workflow.has_notify
    entry.runtime_data = RuntimeData(controller, events, str(integration.version) if integration.version else None, notifier, workflow)
    _remove_unused_zones(hass, entry, controller)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    # Erst nach dem Wiederherstellen des Zustands (in der Entität) auf Sensoren hören und protokollieren
    controller.async_start()
    events.async_start()
    notifier.async_start()
    await workflow.async_start()
    scheduler = Scheduler(hass, entry, controller)
    scheduler.async_start()
    entry.async_on_unload(scheduler.async_stop)
    entry.async_on_unload(controller.async_stop)
    entry.async_on_unload(notifier.async_stop)
    # Zonen, Modi und Verzögerungen bestimmen, welche Entitäten es gibt und wem zugehört wird: neu laden.
    # Der Zustand (scharf, Verzögerung, Alarm) übersteht das über die Wiederherstellung der Entität.
    entry.async_on_unload(entry.add_update_listener(_async_reload))
    # Neue Voreinstellungen ändern, welche Sensoren immer aktiv sind und wem zugehört wird: neu laden
    entry.async_on_unload(settings.add_listener(lambda: hass.async_create_task(hass.config_entries.async_reload(entry.entry_id))))
    await async_register_panel(hass)
    await async_start_maintenance(hass, settings)
    async_start_daily(hass)
    return True


def _remove_unused_zones(hass: HomeAssistant, entry: ConfigEntry, controller: AlarmController) -> None:
    """Wird "Nacht" ausgeschaltet, verschwindet die Zone ganz, statt als "nicht verfügbar" stehen zu bleiben."""
    registry = er.async_get(hass)
    for mode in MODES:
        if mode in controller.modes:
            continue
        for key in (f"zone_{mode}", f"ready_{mode}"):
            if entity_id := registry.async_get_entity_id(Platform.BINARY_SENSOR, DOMAIN, f"{entry.entry_id}_{key}"):
                registry.async_remove(entity_id)


async def _async_reload(hass: HomeAssistant, entry: AlarmageddonConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: AlarmageddonConfigEntry) -> bool:
    if not await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        return False
    await entry.runtime_data.events.async_stop()
    if entry.runtime_data.workflow:
        await entry.runtime_data.workflow.async_unload()
    others = [
        e for e in hass.config_entries.async_entries(DOMAIN) if e.entry_id != entry.entry_id and e.state is ConfigEntryState.LOADED
    ]
    # Das Panel bleibt, solange noch eine Anlage geladen ist (auch während eines Neuladens wird es kurz entfernt)
    if not others:
        async_remove_panel(hass)
        await async_stop_maintenance(hass)
        async_stop_daily(hass)
    return True


async def async_remove_entry(hass: HomeAssistant, entry: AlarmageddonConfigEntry) -> None:
    await async_remove_events(hass, entry.entry_id)
    await async_remove_workflow_store(hass, entry.entry_id)
