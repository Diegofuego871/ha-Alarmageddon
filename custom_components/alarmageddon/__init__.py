"""Alarmageddon: Alarmanlage für Home Assistant. Ein Config Entry pro Anlage, ein Panel für alle."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable
from dataclasses import dataclass
from typing import Any

from homeassistant.config_entries import ConfigEntry, ConfigEntryState
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import issue_registry as ir
from homeassistant.helpers.typing import ConfigType
from homeassistant.loader import async_get_integration

from . import websocket_api
from .const import CONF_PER_MODE_SENSORS, CONF_SENSOR_MODES, CONF_SENSOR_OPTIONS, CONF_SENSORS, CONF_ZONE_PREFIX, DOMAIN, MODES, OPT_BYPASS
from .controller import AlarmController
from .events import EventLog, async_remove_events
from .recording import AlarmRecorder, async_remove_recordings
from .maintenance import async_start_maintenance, async_stop_maintenance
from .notify import Notifier
from .panel import async_register_panel, async_remove_panel
from .scheduler import Scheduler
from .sensor_history import async_get_stats
from .settings import async_get_settings
from .workflow import WorkflowRunner, async_remove_workflow_store

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = [Platform.ALARM_CONTROL_PANEL, Platform.BINARY_SENSOR]

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


@dataclass
class RuntimeData:
    controller: AlarmController
    events: EventLog
    version: str | None
    notifier: Notifier | None = None
    workflow: WorkflowRunner | None = None
    recorder: AlarmRecorder | None = None


type AlarmageddonConfigEntry = ConfigEntry[RuntimeData]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    # Einmal pro HA, nicht pro Anlage: sonst meldet HA doppelte Befehle
    websocket_api.async_register(hass)
    return True


def _migrate_open_sensors(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """
    Bis 0.31.0 gab es für die Anlage die Wahl "Offener Sensor beim Scharfschalten" (verhindern oder umgehen). Seit 0.32.0 ist "Umgehen"
    eine Option je Sensor (auch je Modus). Alte Werte werden einmal übertragen und gelöscht; das Verhalten bleibt dasselbe.
    """
    options = dict(entry.options)
    legacy = [k for k in options if k == "open_sensors" or k.startswith("open_sensors_")]
    if not legacy:
        return
    common = options.pop("open_sensors", "block")
    values = {mode: (options.pop(f"open_sensors_{mode}", None) or common) for mode in MODES}
    sensors = {e for mode in MODES for e in options.get(f"{CONF_ZONE_PREFIX}{mode}", [])} | set(options.get(CONF_SENSORS) or [])
    sensors |= set(options.get(CONF_SENSOR_OPTIONS) or {})
    # Beschädigte Einträge (kein Wörterbuch) ignorieren, statt die ganze Anlage nicht zu laden
    sensor_options = {e: dict(o) for e, o in (options.get(CONF_SENSOR_OPTIONS) or {}).items() if isinstance(o, dict)}
    if len(set(values.values())) == 1:
        if next(iter(values.values())) == "bypass":
            for entity in sensors:
                sensor_options.setdefault(entity, {}).setdefault(OPT_BYPASS, True)
    else:
        # Je Modus verschieden: Einstellungen je Modus einschalten, "Umgehen" nur in den Modi, die es hatten
        per_mode = {m: dict(v) for m, v in (options.get(CONF_SENSOR_MODES) or {}).items()}
        for mode, value in values.items():
            if value == "bypass":
                for entity in sensors:
                    per_mode.setdefault(mode, {}).setdefault(entity, {}).setdefault(OPT_BYPASS, True)
        options[CONF_PER_MODE_SENSORS] = True
        options[CONF_SENSOR_MODES] = per_mode
    options[CONF_SENSOR_OPTIONS] = {e: o for e, o in sensor_options.items() if o}
    hass.config_entries.async_update_entry(entry, options=options)


async def _isolated(entry: ConfigEntry, awaitable: Awaitable[Any], what: str) -> Any:
    """
    Etwas Zusätzliches (Protokoll, Aufzeichnung, Statistik, Aktionen, Wartung) vorbereiten, ohne dass sein Scheitern die Anlage mitnimmt.
    Sicherheitsregel: im Zweifel alarmieren. Ein Lesefehler einer Ablage oder ein Fehler beim Start der Aktionen darf nie
    verhindern, dass die Anlage auf ihre Sensoren hört; es steht im Log, die Anlage läuft ohne dieses Teil weiter.
    """
    try:
        return await awaitable
    except asyncio.CancelledError:
        raise
    except Exception:  # noqa: BLE001 - nur dieses Teil fällt aus
        _LOGGER.exception("%s: %s failed; the alarm system runs without it", entry.title, what)
        return None


async def async_setup_entry(hass: HomeAssistant, entry: AlarmageddonConfigEntry) -> bool:
    # Vor dem Controller und vor dem Update-Listener: die Änderung der Optionen löst so kein zusätzliches Neuladen aus
    _migrate_open_sensors(hass, entry)
    integration = await async_get_integration(hass, DOMAIN)
    settings = await async_get_settings(hass)
    controller = AlarmController(hass, entry, settings)
    controller.stats = await _isolated(entry, async_get_stats(hass), "loading the sensor statistics")
    events = EventLog(hass, entry.entry_id, controller)
    await _isolated(entry, events.async_load(), "loading the event log")
    recorder = AlarmRecorder(hass, entry.entry_id, controller)
    await _isolated(entry, recorder.async_load(), "loading the alarm recordings")
    notifier = Notifier(hass, entry, controller, settings)
    workflow = WorkflowRunner(hass, entry, controller, notifier)
    notifier.workflow_has_notify = workflow.has_notify
    notifier.silence = workflow.async_silence
    entry.runtime_data = RuntimeData(controller, events, str(integration.version) if integration.version else None, notifier, workflow, recorder)
    _remove_unused_zones(hass, entry, controller)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    # Erst nach dem Wiederherstellen des Zustands (in der Entität) auf Sensoren hören und protokollieren. Jedes Teil wird sofort
    # zum Abmelden vorgemerkt: scheitert ein späteres, bleibt nichts hängen, das weiter auf Sensoren hört.
    controller.async_start()
    entry.async_on_unload(controller.async_stop)
    events.async_start()
    recorder.async_start()
    notifier.async_start()
    entry.async_on_unload(notifier.async_stop)
    # Die Aktionen sind Zusatz zur Anlage selbst: scheitert ihr Start (Ablage), hört die Anlage trotzdem auf ihre Sensoren und meldet
    await _isolated(entry, workflow.async_start(), "starting the alarm actions")
    scheduler = Scheduler(hass, entry, controller)
    scheduler.async_start()
    entry.async_on_unload(scheduler.async_stop)
    # Zonen, Modi und Verzögerungen bestimmen, welche Entitäten es gibt und wem zugehört wird: neu laden.
    # Der Zustand (scharf, Verzögerung, Alarm) übersteht das über die Wiederherstellung der Entität.
    entry.async_on_unload(entry.add_update_listener(_async_reload))
    # Neue Voreinstellungen ändern, welche Sensoren immer aktiv sind und wem zugehört wird: neu laden
    entry.async_on_unload(settings.add_listener(lambda: hass.async_create_task(hass.config_entries.async_reload(entry.entry_id)), entry.entry_id))
    # Das Panel ist Bequemlichkeit, die Alarmanlage nicht: scheitert die Anmeldung (zum Beispiel "frozen router", wenn der
    # Webserver schon steht), läuft die Anlage ohne Panel weiter, statt gar nicht zu laden (Sicherheitsregel: im Zweifel alarmieren)
    try:
        await async_register_panel(hass)
    except Exception:  # noqa: BLE001
        _LOGGER.exception("%s: the panel could not be registered; the alarm system runs without it", entry.title)
    await _isolated(entry, async_start_maintenance(hass, settings), "starting the maintenance check")
    # Reste der früheren Update-Prüfung (bis 0.27.0): die Meldung unter "Reparaturen" verschwindet mit der Funktion
    ir.async_delete_issue(hass, DOMAIN, "update_available")
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
    # Ab hier sind die Entitäten weg: scheitert eines der folgenden Teile (Ablage nicht beschreibbar), muss das Entladen trotzdem
    # zu Ende gehen. Sonst bliebe die Anlage ohne Entität zurück und liesse sich nicht neu laden (Zustand "Entladen fehlgeschlagen").
    runtime = entry.runtime_data
    for what, stop in (
        ("saving the event log", runtime.events.async_stop),
        ("saving the alarm recordings", runtime.recorder.async_stop if runtime.recorder else None),
        ("stopping the alarm actions", runtime.workflow.async_unload if runtime.workflow else None),
    ):
        if stop is not None:
            await _isolated(entry, stop(), what)
    others = [
        e for e in hass.config_entries.async_entries(DOMAIN) if e.entry_id != entry.entry_id and e.state is ConfigEntryState.LOADED
    ]
    # Das Panel bleibt auch beim Neuladen einer Anlage stehen (Sensoren speichern lädt sie neu): würde es kurz entfernt, vergässe die
    # Oberfläche die Anlage und hinge. Es verschwindet erst, wenn die letzte Anlage entfernt wird (async_remove_entry).
    if not others:
        await _isolated(entry, async_stop_maintenance(hass), "stopping the maintenance check")
    return True


async def async_remove_entry(hass: HomeAssistant, entry: AlarmageddonConfigEntry) -> None:
    await async_remove_events(hass, entry.entry_id)
    await async_remove_recordings(hass, entry.entry_id)
    await async_remove_workflow_store(hass, entry.entry_id)
    if not any(e.entry_id != entry.entry_id for e in hass.config_entries.async_entries(DOMAIN)):
        async_remove_panel(hass)
