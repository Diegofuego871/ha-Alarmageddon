# Alarmageddon

[Deutsch](https://github.com/Diegofuego871/ha-Alarmageddon/blob/main/README.de.md)

Alarm system for Home Assistant with a guided setup and built-in sensor maintenance.

> **Status:** early pre-release (0.3.0). Alarm core, side panel with overview, sensor list and configuration work. Alarm actions, notifications and maintenance follow in later versions.

## Features

- **Alarm entity:** an `alarm_control_panel` with the modes "Home" and "Away", optionally "Night", exit and entry delay.
- **Several alarm systems:** add as many as you need (for example house and garage). Each one is its own device with its own alarm entity.
- **Apple HomeKit:** every alarm system can be passed to Apple Home through the HomeKit Bridge of Home Assistant.
- **Zones:** one entity per zone that is on as soon as a sensor of the zone is open.
- **Safe on restart:** delays and alarms continue after a restart. An entry delay that ran out during the restart becomes an alarm.
- **Code:** optional, 4 to 8 digits, stored only as a hash. Locked for one minute after five wrong codes.
- **Any radio technology:** Alarmageddon only uses Home Assistant entities. Wi-Fi, Thread/Matter, Zigbee, Z-Wave and Bluetooth all work.

- **Side panel, overview:** control of all alarm systems with "Ready for" per mode, a status tile (all good or warnings) and a list of all sensors with search, filters and view settings (columns, grouping, sorting). It shows state, battery, signal, firmware, model and last change.
- **Side panel, configuration:** sensors (zones as a grid with drag across boxes, options per sensor in a side sheet, defaults per sensor type) and alarm system (delays, night mode, behaviour for open sensors). On the phone as cards and sheets from the bottom.
- **Options per sensor:** always active (smoke, water), may be open when arming, arm as soon as closed, failure counts as alarm. Defaults per sensor type, own values per sensor.
- **Ready to arm:** one entity per mode with the blocking sensors.

Planned: alarm actions (siren, covers, media players, critical push notifications with actions), maintenance overview and monitoring.

## Installation

1. HACS → three dots → "Custom repositories" → `https://github.com/Diegofuego871/ha-Alarmageddon`, type "Integration".
2. Install "Alarmageddon" and restart Home Assistant.
3. Settings → Devices & services → "Add integration" → "Alarmageddon".

Pre-releases: Alarmageddon is published as a pre-release for now. In HACS, switch on "Pre-release" for the repository (switch on the HACS device of the repository).

## Setup

1. **New alarm system:** name, night mode and an optional code.
2. **Side panel "Alarmageddon"** (appears in the sidebar for administrators): Configuration › Sensors assigns sensors to the zones "Home", "Away" and "Night"; the arrow at the end of a row opens the options of the sensor. Configuration › Alarm system sets delays and behaviour. Changes apply with "Save".
3. **Options** (Settings → Devices & services → Alarmageddon → "Configure"):
   - **Zones:** sensors for "Home", "Away" and "Night" (same as in the side panel). A sensor can be in several zones.
   - **Delays:** exit delay per mode, entry delay, sensors with entry delay (for example the front door), alarm duration.
   - **Behaviour:** night mode, open sensor when arming (block or bypass), code required to arm.
   - **Code:** set a new code or remove it.

Only a real change from closed to open triggers. A sensor that comes back from "unavailable" as open does not trigger.

## Apple HomeKit

1. Add the alarm entity to the HomeKit Bridge of Home Assistant (include the domain `alarm_control_panel` or the entity).
2. Apple Home shows "Home", "Away", "Off" and, with night mode on, "Night".
3. **With a code:** HomeKit does not ask for the code. Either set the code in the HomeKit Bridge configuration (`entity_config` → `code`) or enter it as default code in the entity settings of the alarm entity in Home Assistant.

Known behaviour of the HomeKit Bridge:

- During the exit delay Apple Home shows "Off" with the target "Away", also when arming "Home". Use no exit delay for "Home" and "Night" (default).
- During the entry delay Apple Home keeps showing "armed" and switches to "Alarm" when the alarm starts.

## Entities

| Entity | Content |
| --- | --- |
| `alarm_control_panel.<name>` | The alarm system. Attributes: `arm_mode`, `triggered_by`, `bypassed_sensors`, `deadline`, `changed_by` |
| `binary_sensor.<name>_zone_home` | On when a sensor of the zone "Home" is open |
| `binary_sensor.<name>_zone_away` | On when a sensor of the zone "Away" is open |
| `binary_sensor.<name>_zone_night` | Only with night mode |
| "Ready to arm home/away/night" | On when no open sensor blocks arming in this mode. Attribute: `blocking_sensors` |

## Languages

The integration is in English and switches to German when Home Assistant runs in German.

## Limitations

Alarmageddon is not a certified alarm system. If Home Assistant, the network or the radio coordinator fails, there is no alarm. Use a siren with its own battery for critical use.

## Concept

See [docs/CONCEPT.md](https://github.com/Diegofuego871/ha-Alarmageddon/blob/main/docs/CONCEPT.md) (German) and the mockups in [docs/mockups/konzept-v1](https://github.com/Diegofuego871/ha-Alarmageddon/tree/main/docs/mockups/konzept-v1).

## License

See [LICENSE](https://github.com/Diegofuego871/ha-Alarmageddon/blob/main/LICENSE).
