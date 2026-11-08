"""
Einrichtung: Anlegen einer Anlage (Name, Nacht, Code) und Optionen.

Die Optionen sind die Übergangslösung bis zum Panel (Phase 2): Das Panel
schreibt später dieselben Schlüssel. Mehrere Anlagen pro HA sind erlaubt
(Vorgabe des Nutzers), nur gleiche Namen nicht.
"""

from __future__ import annotations

import re
from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import callback
from homeassistant.data_entry_flow import section
from homeassistant.helpers import selector

from .code import hash_code
from .const import (
    CODE_PATTERN,
    CONF_CODE_ARM_REQUIRED,
    CONF_CODE_HASH,
    CONF_CODE_SALT,
    CONF_CODES,
    CONF_ENTRY_DELAY,
    CONF_ENTRY_SENSORS,
    CONF_EXIT_DELAY_PREFIX,
    CONF_NAME,
    CONF_NIGHT_ENABLED,
    CONF_OPEN_SENSORS,
    CONF_TRIGGER_TIME,
    CONF_ZONE_PREFIX,
    DEFAULT_ENTRY_DELAY,
    DEFAULT_EXIT_DELAY,
    DEFAULT_OPEN_SENSORS,
    DEFAULT_TRIGGER_TIME,
    DOMAIN,
    FIELD_CODE,
    FIELD_REMOVE_CODE,
    MAX_DELAY,
    MODES,
    OPEN_SENSOR_MODES,
)

SECTION_ZONES = "zones"
SECTION_DELAYS = "delays"
SECTION_BEHAVIOUR = "behaviour"
SECTION_CODE = "code_section"

_SENSORS = selector.EntitySelector(selector.EntitySelectorConfig(domain="binary_sensor", multiple=True))
_SECONDS = selector.NumberSelector(
    selector.NumberSelectorConfig(min=0, max=MAX_DELAY, step=1, unit_of_measurement="s", mode=selector.NumberSelectorMode.BOX)
)
_CODE = selector.TextSelector(selector.TextSelectorConfig(type=selector.TextSelectorType.PASSWORD))


def default_options() -> dict[str, Any]:
    options: dict[str, Any] = {f"{CONF_ZONE_PREFIX}{mode}": [] for mode in MODES}
    options |= {f"{CONF_EXIT_DELAY_PREFIX}{mode}": DEFAULT_EXIT_DELAY[mode] for mode in MODES}
    options |= {
        CONF_NIGHT_ENABLED: False,
        CONF_ENTRY_SENSORS: [],
        CONF_ENTRY_DELAY: DEFAULT_ENTRY_DELAY,
        CONF_TRIGGER_TIME: DEFAULT_TRIGGER_TIME,
        CONF_OPEN_SENSORS: DEFAULT_OPEN_SENSORS,
        CONF_CODE_ARM_REQUIRED: False,
    }
    return options


def _valid_code(code: str) -> bool:
    return re.fullmatch(CODE_PATTERN, code) is not None


class AlarmageddonConfigFlow(ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            name = user_input[CONF_NAME].strip()
            code = (user_input.get(FIELD_CODE) or "").strip()
            self._async_abort_entries_match({CONF_NAME: name})
            if not name:
                errors[CONF_NAME] = "name_required"
            elif code and not _valid_code(code):
                errors[FIELD_CODE] = "invalid_code_format"
            else:
                options = default_options()
                options[CONF_NIGHT_ENABLED] = bool(user_input.get(CONF_NIGHT_ENABLED, False))
                if code:
                    options[CONF_CODE_HASH], options[CONF_CODE_SALT] = await self.hass.async_add_executor_job(
                        hash_code, code
                    )
                return self.async_create_entry(title=name, data={CONF_NAME: name}, options=options)

        schema = vol.Schema(
            {
                vol.Required(CONF_NAME): selector.TextSelector(),
                vol.Optional(CONF_NIGHT_ENABLED, default=False): selector.BooleanSelector(),
                vol.Optional(FIELD_CODE): _CODE,
            }
        )
        return self.async_show_form(
            step_id="user", data_schema=self.add_suggested_values_to_schema(schema, user_input or {}), errors=errors
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return AlarmageddonOptionsFlow()


class AlarmageddonOptionsFlow(OptionsFlow):
    """Zonen, Verzögerungen, Verhalten und Code einer Anlage."""

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        current = {**default_options(), **self.config_entry.options}
        errors: dict[str, str] = {}
        if user_input is not None:
            zones = user_input.get(SECTION_ZONES, {})
            delays = user_input.get(SECTION_DELAYS, {})
            behaviour = user_input.get(SECTION_BEHAVIOUR, {})
            code_input = user_input.get(SECTION_CODE, {})
            options = dict(current)
            for mode in MODES:
                options[f"{CONF_ZONE_PREFIX}{mode}"] = list(zones.get(f"{CONF_ZONE_PREFIX}{mode}", []))
                # NumberSelector liefert Kommazahlen (LEARNINGS): als int speichern wie später das Panel
                options[f"{CONF_EXIT_DELAY_PREFIX}{mode}"] = int(delays.get(f"{CONF_EXIT_DELAY_PREFIX}{mode}", 0))
            options[CONF_ENTRY_SENSORS] = list(delays.get(CONF_ENTRY_SENSORS, []))
            options[CONF_ENTRY_DELAY] = int(delays.get(CONF_ENTRY_DELAY, 0))
            options[CONF_TRIGGER_TIME] = int(delays.get(CONF_TRIGGER_TIME, 0))
            options[CONF_NIGHT_ENABLED] = bool(behaviour.get(CONF_NIGHT_ENABLED, False))
            options[CONF_OPEN_SENSORS] = behaviour.get(CONF_OPEN_SENSORS, DEFAULT_OPEN_SENSORS)
            options[CONF_CODE_ARM_REQUIRED] = bool(behaviour.get(CONF_CODE_ARM_REQUIRED, False))

            active = [m for m in MODES if m != "night" or options[CONF_NIGHT_ENABLED]]
            in_zones = {e for m in active for e in options[f"{CONF_ZONE_PREFIX}{m}"]}
            new_code = (code_input.get(FIELD_CODE) or "").strip()
            if set(options[CONF_ENTRY_SENSORS]) - in_zones:
                errors["base"] = "entry_not_in_zone"
            elif new_code and not _valid_code(new_code):
                errors["base"] = "invalid_code_format"
            elif new_code and code_input.get(FIELD_REMOVE_CODE):
                errors["base"] = "code_and_remove"
            else:
                if code_input.get(FIELD_REMOVE_CODE):
                    options.pop(CONF_CODE_HASH, None)
                    options.pop(CONF_CODE_SALT, None)
                elif new_code:
                    options[CONF_CODE_HASH], options[CONF_CODE_SALT] = await self.hass.async_add_executor_job(
                        hash_code, new_code
                    )
                if options[CONF_CODE_ARM_REQUIRED] and not options.get(CONF_CODE_HASH) and not options.get(CONF_CODES):
                    errors["base"] = "code_missing"
                else:
                    return self.async_create_entry(data=options)
            current = options

        return self.async_show_form(step_id="init", data_schema=self._schema(current), errors=errors)

    @staticmethod
    def _schema(o: dict[str, Any]) -> vol.Schema:
        zones = vol.Schema(
            {vol.Optional(f"{CONF_ZONE_PREFIX}{m}", default=o[f"{CONF_ZONE_PREFIX}{m}"]): _SENSORS for m in MODES}
        )
        delays = vol.Schema(
            {
                **{vol.Required(f"{CONF_EXIT_DELAY_PREFIX}{m}", default=o[f"{CONF_EXIT_DELAY_PREFIX}{m}"]): _SECONDS for m in MODES},
                vol.Required(CONF_ENTRY_DELAY, default=o[CONF_ENTRY_DELAY]): _SECONDS,
                vol.Optional(CONF_ENTRY_SENSORS, default=o[CONF_ENTRY_SENSORS]): _SENSORS,
                vol.Required(CONF_TRIGGER_TIME, default=o[CONF_TRIGGER_TIME]): _SECONDS,
            }
        )
        behaviour = vol.Schema(
            {
                vol.Required(CONF_NIGHT_ENABLED, default=o[CONF_NIGHT_ENABLED]): selector.BooleanSelector(),
                vol.Required(CONF_OPEN_SENSORS, default=o[CONF_OPEN_SENSORS]): selector.SelectSelector(
                    selector.SelectSelectorConfig(
                        options=list(OPEN_SENSOR_MODES), translation_key=CONF_OPEN_SENSORS, mode=selector.SelectSelectorMode.LIST
                    )
                ),
                vol.Required(CONF_CODE_ARM_REQUIRED, default=o[CONF_CODE_ARM_REQUIRED]): selector.BooleanSelector(),
            }
        )
        code = vol.Schema(
            {
                vol.Optional(FIELD_CODE): _CODE,
                vol.Optional(FIELD_REMOVE_CODE, default=False): selector.BooleanSelector(),
            }
        )
        return vol.Schema(
            {
                vol.Required(SECTION_ZONES): section(zones, {"collapsed": False}),
                vol.Required(SECTION_DELAYS): section(delays, {"collapsed": True}),
                vol.Required(SECTION_BEHAVIOUR): section(behaviour, {"collapsed": True}),
                vol.Required(SECTION_CODE): section(code, {"collapsed": True}),
            }
        )
