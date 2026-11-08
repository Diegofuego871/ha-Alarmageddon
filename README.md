# Alarmageddon

[Deutsch](https://github.com/Diegofuego871/ha-Alarmageddon/blob/main/README.de.md)

Alarm system for Home Assistant with a guided setup and built-in sensor maintenance.

> **Status:** early pre-release (0.1.0). The alarm core works. The graphical setup in the side panel, alarm scenarios and maintenance follow in later versions.

## Features

- **Alarm entity:** an `alarm_control_panel` with the modes "Home" and "Away", optionally "Night", exit and entry delay.
- **Several alarm systems:** add as many as you need (for example house and garage). Each one is its own device with its own alarm entity.
- **Apple HomeKit:** every alarm system can be passed to Apple Home through the HomeKit Bridge of Home Assistant.
- **Zones:** one entity per zone that is on as soon as a sensor of the zone is open.
- **Safe on restart:** delays and alarms continue after a restart. An entry delay that ran out during the restart becomes an alarm.
- **Code:** optional, 4 to 8 digits, stored only as a hash. Locked for one minute after five wrong codes.
- **Any radio technology:** Alarmageddon only uses Home Assistant entities. Wi-Fi, Thread/Matter, Zigbee, Z-Wave and Bluetooth all work.

Planned: graphical setup with drag and drop in a side panel, alarm scenarios (siren, covers, media players, critical push notifications with actions), maintenance overview and monitoring.

## Installation

1. HACS → three dots → "Custom repositories" → `https://github.com/Diegofuego871/ha-Alarmageddon`, type "Integration".
2. Install "Alarmageddon" and restart Home Assistant.
3. Settings → Devices & services → "Add integration" → "Alarmageddon".

Pre-releases: Alarmageddon is published as a pre-release for now. In HACS, switch on "Pre-release" for the repository (switch on the HACS device of the repository).

## Setup

1. **New alarm system:** name, night mode and an optional code.
2. **Options** (Settings → Devices & services → Alarmageddon → "Configure"):
   - **Zones:** sensors for "Home", "Away" and "Night". A sensor can be in several zones.
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

## Languages

The integration is in English and switches to German when Home Assistant runs in German.

## Limitations

Alarmageddon is not a certified alarm system. If Home Assistant, the network or the radio coordinator fails, there is no alarm. Use a siren with its own battery for critical use.

## Concept

See [docs/CONCEPT.md](https://github.com/Diegofuego871/ha-Alarmageddon/blob/main/docs/CONCEPT.md) (German) and the mockups in [docs/mockups/konzept-v1](https://github.com/Diegofuego871/ha-Alarmageddon/tree/main/docs/mockups/konzept-v1).

## License

See [LICENSE](https://github.com/Diegofuego871/ha-Alarmageddon/blob/main/LICENSE).
