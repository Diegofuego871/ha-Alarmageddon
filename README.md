# Alarmageddon

[Deutsch](https://github.com/Diegofuego871/ha-Alarmageddon/blob/main/README.de.md)

Alarm system for Home Assistant with a guided setup and built-in sensor maintenance.

> **Status:** early pre-release (0.6.0). Alarm core, side panel, alarm actions, notifications, maintenance, schedule and backup work. Not yet tested by many users: report problems as an issue.

## Features

- **Alarm entity:** an `alarm_control_panel` with the modes "Home", "Away" and "Night", each switchable on and off per alarm system (default: Home and Away), exit and entry delay.
- **Schedule:** arm in a chosen mode or disarm at set times on chosen weekdays.
- **Several alarm systems:** add as many as you need (for example house and garage). Each one is its own device with its own alarm entity.
- **Apple HomeKit:** every alarm system can be passed to Apple Home through the HomeKit Bridge of Home Assistant.
- **Zones:** one entity per zone that is on as soon as a sensor of the zone is open.
- **Safe on restart:** delays and alarms continue after a restart. An entry delay that ran out during the restart becomes an alarm.
- **Code:** optional, 4 to 8 digits, stored only as a hash. Locked for one minute after five wrong codes.
- **Any radio technology:** Alarmageddon only uses Home Assistant entities. Wi-Fi, Thread/Matter, Zigbee, Z-Wave and Bluetooth all work.

- **Side panel, overview:** control of all alarm systems with "Ready for" per mode, a status tile (all good or warnings) and a list of all sensors with search, filters and view settings (columns, grouping, sorting). It shows state, battery, signal, firmware, model and last change.
- **Side panel, configuration:** sensors (zones as a grid with drag across boxes, options per sensor in a side sheet, defaults per sensor type) and alarm system (modes, delays, behaviour for open sensors, schedule, codes, backup). On the phone as cards and sheets from the bottom.
- **Options per sensor:** always active (smoke, water), may be open when arming, arm as soon as closed, failure counts as alarm. Defaults per sensor type, own values per sensor.
- **Ready to arm:** one entity per mode with the blocking sensors.
- **Alarm actions:** a graphical workflow per alarm: push notification, switch devices, covers, alarm sound on media players (Sonos and others), wait, script, any action. Devices return to their previous state after the alarm.
- **Notifications:** critical push notifications with volume, recipients separately for alarms and maintenance, selectable events.
- **Maintenance:** notifications for low battery and unreachable sensors (once per problem), battery forecast in the list.
- **Two-sensor confirmation:** motion sensors can require a second sensor before they trigger, against false alarms.
- **Codes per person:** own code per person, optionally linked to a Home Assistant user; "changed by" shows the person.
- **Backup:** all settings as a file, without codes.

## Installation

1. HACS → three dots → "Custom repositories" → `https://github.com/Diegofuego871/ha-Alarmageddon`, type "Integration".
2. Install "Alarmageddon" and restart Home Assistant.
3. Settings → Devices & services → "Add integration" → "Alarmageddon".

Pre-releases: Alarmageddon is published as a pre-release for now. In HACS, switch on "Pre-release" for the repository (switch on the HACS device of the repository).

## Setup

1. **New alarm system:** name, night mode and an optional code.
2. **Side panel "Alarmageddon"** (appears in the sidebar for administrators): Configuration › Sensors assigns sensors to the zones "Home", "Away" and "Night"; the arrow at the end of a row opens the options of the sensor. Configuration › Alarm system sets the modes, delays, behaviour and the schedule. Changes apply with "Save".
3. **Options** (Settings → Devices & services → Alarmageddon → "Configure"):
   - **Zones:** sensors for "Home", "Away" and "Night" (same as in the side panel). A sensor can be in several zones.
   - **Delays:** exit delay per mode, entry delay, sensors with entry delay (for example the front door), alarm duration.
   - **Behaviour:** night mode, open sensor when arming (block or bypass), code required to arm.
   - **Code:** set a new main code or remove it. Personal codes: see "Codes per person".

Only a real change from closed to open triggers. A sensor that comes back from "unavailable" as open does not trigger.

## Alarm actions

Side panel › Configuration › Actions. Choose the alarm system and the alarm ("Home", "Away", "Night" or "always active" for smoke, water and gas), then add steps with "+":

| Step | Does |
| --- | --- |
| Push notification | Alarm notification to the alarm recipients (see Notifications) |
| Turn on / Turn off | Sirens, switches, lights, fans, helpers |
| Open / close covers | Covers |
| Alarm sound | Plays one of five sounds on media players with volume and repetitions |
| Wait | Pauses the following steps |
| Script | Runs a script |
| Own action | Any Home Assistant action with target and data (JSON) |

- **Back to the previous state:** devices with the arrow symbol return to their state before the alarm when you disarm or the alarm duration ends (on/off, brightness, position, volume, source; Sonos with its own snapshot including groups). On by default for alarm sounds.
- **Disarming stops everything,** also after a restart of Home Assistant in the middle of an alarm. A failing step does not stop the other steps.
- **Test** runs the saved workflow without alarm and stops after 60 seconds at the latest.
- **Media players** fetch the sounds from Home Assistant (`/alarmageddon_sounds/…`). The player must reach the local URL of Home Assistant (Settings → System → Network).

## Notifications

Side panel › Configuration › Notifications, for all alarm systems:

- **Recipients** separately for alarms and maintenance notifications: every `notify` service, for example `notify.mobile_app_<phone>` of the companion app.
- **Critical alarm notification:** sounds in silent mode and do not disturb. iOS uses the volume set here, Android the alarm channel (`alarm_stream`).
- **Events:** alarm, entry delay, armed, disarmed, arming not possible, sensor unreachable while armed.
- **"Disarm" button in the notification:** off by default. iOS asks for Face ID or the passcode, Android does not: anyone holding the unlocked phone can disarm.
- **Maintenance:** low battery (threshold, default 20 %) and sensors unreachable for longer than a set time (default 60 minutes) go to the maintenance recipients. Each problem once, several in one notification; again after the battery was replaced or the sensor responded.

## Maintenance and battery forecast

The sensor list on the overview shows a battery forecast ("~3 months"): the time until the battery falls below the threshold, from the recorder history of the last 90 days since the last battery change. Without enough history (less than three days or no drop) the column stays empty. Requires the recorder (on by default in Home Assistant).

## Codes per person

Side panel › Configuration › Alarm system › "Codes per person": each person gets their own code (4 to 8 digits), optionally linked to a Home Assistant user. Arming or disarming with that code shows the person as "changed by", in the recent events and in the notifications. Actions of a linked user without a code show the same name. The main code from the options keeps working. Codes are stored only as a hash and never shown. Wrong codes count together: after five wrong codes the alarm system is locked for one minute.

## Two-sensor confirmation

Option per sensor "Needs a second sensor" (side sheet of the sensor or defaults per sensor type). While armed such a sensor triggers only if another sensor with this option responds within the confirmation window (Configuration › Alarm system, default 60 seconds). The same sensor twice does not count. Sensors without the option trigger alone as before; during the entry delay the option does not apply, and "failure counts as alarm" still triggers at once. Off by default: an alarm system should rather alarm in doubt.

## Modes

Side panel › Configuration › Alarm system › "Modes": "Home", "Away" and "Night" can each be switched on and off. At least one mode stays on. Apple Home, the overview, the zones, "Ready to arm" and the actions offer only the modes switched on. A mode switched off keeps its zone and actions and gets them back when switched on again. The mode the alarm system is currently armed in cannot be switched off: disarm first.

## Schedule

Side panel › Configuration › Alarm system › "Schedule": "Add time" creates a rule with time, action (arm "Home", "Away" or "Night", or disarm) and weekdays. Each time can be switched off without deleting it. Rules:

- A running alarm or entry delay is never disarmed or overridden by the schedule; the skipped time appears in the recent events.
- Open sensors block arming as usual (or are bypassed, depending on the setting); the notification "arming not possible" follows.
- No code is needed. "Changed by" shows "Schedule".
- A time for a mode that is switched off is skipped.
- Times missed while Home Assistant was off are not made up.
- Disarming by schedule means: at that time the alarm system is off, whoever is at home. Use it only where that is wanted.

## Backup

Side panel › Configuration › Alarm system › "Backup": "Export" saves all settings of all alarm systems as a JSON file (zones, delays, options per sensor, actions, defaults, notifications). "Import" shows first which alarm systems are found (matched by name) and replaces their settings after confirming. Codes are never part of a backup, and the codes of the target alarm system stay as they are. The backup of Home Assistant contains all settings including codes anyway.

## Apple HomeKit

1. Add the alarm entity to the HomeKit Bridge of Home Assistant (include the domain `alarm_control_panel` or the entity).
2. Apple Home shows "Off" and the modes switched on ("Home", "Away", "Night").
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
| `binary_sensor.<name>_zone_night` | On when a sensor of the zone "Night" is open |
| "Ready to arm home/away/night" | On when no open sensor blocks arming in this mode. Attribute: `blocking_sensors` |

Zone and "Ready" entities exist only for the modes switched on.

## Languages

The integration is in English and switches to German when Home Assistant runs in German.

## Limitations

Alarmageddon is not a certified alarm system. If Home Assistant, the network or the radio coordinator fails, there is no alarm. Use a siren with its own battery for critical use.

## Concept

See [docs/CONCEPT.md](https://github.com/Diegofuego871/ha-Alarmageddon/blob/main/docs/CONCEPT.md) (German) and the mockups in [docs/mockups/konzept-v1](https://github.com/Diegofuego871/ha-Alarmageddon/tree/main/docs/mockups/konzept-v1).

## License

See [LICENSE](https://github.com/Diegofuego871/ha-Alarmageddon/blob/main/LICENSE).
