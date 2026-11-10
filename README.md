<p align="center"><img src="https://raw.githubusercontent.com/Diegofuego871/ha-Alarmageddon/main/docs/brand/logo.svg" alt="Alarmageddon" width="110"></p>

# Alarmageddon

[Deutsch](https://github.com/Diegofuego871/ha-Alarmageddon/blob/main/README.de.md)

An alarm system for Home Assistant that you set up in one place, and that keeps an eye on its own sensors.

> **Status:** stable (1.0.0). Everything described here is covered by automated tests, and the whole code was reviewed by an external code review. It has not yet been tried with every kind of device: please report problems as an issue.

<p align="center"><img src="https://raw.githubusercontent.com/Diegofuego871/ha-Alarmageddon/main/docs/img/overview-en.png" alt="Overview with two alarm systems, the status tile and the sensor list" width="100%"></p>

## Why Alarmageddon

- **One interface for everything.** Sensors, zones, delays, alarm actions, notifications, schedule, codes and backup are set in one side panel. No YAML, no helpers, no automations to wire together.
- **Your sensors are watched, not only used.** Battery level with a forecast, unreachable sensors, signal, firmware and the last change of every sensor in one list. A sensor that fails while armed is reported, or counts as an alarm if you want.
- **Built to alarm when in doubt.** Delays and alarms survive a restart, nothing can hold up the siren, and a watchdog supervises the alarm actions. See [Safety mechanisms](#safety-mechanisms).
- **Fits into Home Assistant.** Every alarm system is a standard `alarm_control_panel` entity for dashboards, automations and Apple Home. Any sensor Home Assistant knows works: Zigbee, Z-Wave, Thread/Matter, Wi-Fi or Bluetooth.
- **Stays at home.** No cloud and no account: everything runs inside your Home Assistant.

## Quick start

1. **Install:** HACS → three dots → "Custom repositories" → `https://github.com/Diegofuego871/ha-Alarmageddon`, type "Integration". Install "Alarmageddon" and restart Home Assistant.
2. **Add an alarm system:** Settings → Devices & services → "Add integration" → "Alarmageddon". Give it a name and, if you like, a code.
3. **Choose the sensors:** open "Alarmageddon" in the sidebar (administrators only), then Configuration › Sensors › "Add sensors", and tick the zones "Home", "Away" and "Night".
4. **Decide what happens on an alarm:** Configuration › Actions, for example "push notification, siren on, wait 3 minutes, siren off".
5. **Choose who is notified:** Configuration › Notifications. "Send test message" and the play button of a step let you try everything without an alarm.

## A tour

### Overview

All alarm systems at a glance: arm and disarm, "Ready for" per mode with the sensors that still block arming, a status tile for warnings, and the list of all sensors with search, filters, sorting and a choice of columns. The same on the phone:

<p align="center"><img src="https://raw.githubusercontent.com/Diegofuego871/ha-Alarmageddon/main/docs/img/mobile-en.png" alt="Overview on the phone" width="270"></p>

### Sensors and zones

One table for sensors and zones: tick where a sensor belongs, or drag across several boxes. Every sensor type has sensible defaults (a smoke detector is always active, a motion sensor may still report motion when arming), each sensor can have its own values, and the switch "Settings per mode" adds a tab per mode for those who want more.

<p align="center"><img src="https://raw.githubusercontent.com/Diegofuego871/ha-Alarmageddon/main/docs/img/sensors-en.png" alt="Sensors and zones" width="100%"></p>

### Alarm actions

What happens on an alarm is a flow you build from steps, per mode if you like. Devices marked with the arrow return to their previous state when you disarm, and every step can be tested on the real devices with its play button.

<p align="center"><img src="https://raw.githubusercontent.com/Diegofuego871/ha-Alarmageddon/main/docs/img/actions-en.png" alt="Alarm actions as a flow: push notification, siren on, wait, siren off" width="100%"></p>

| Step | Does |
| --- | --- |
| Push notification | Critical alarm notification to the alarm recipients, with your own title and text, optional buttons and, if you like, its own recipients (every title starts with an emoji) |
| Switch device | Lights, sockets, sirens, covers, locks and more: on, off, open, close, with brightness or position |
| Play alarm sound | One of five sounds on media players (Sonos and others), with volume, for a duration or until disarmed |
| Wait | Pauses the following steps, for example between "siren on" and "siren off" |
| End alarm (acknowledge) | Ends the alarm after the steps before it (for example after 3 minutes), returns the devices and keeps the alarm system armed; the steps after it do not run |
| Scene, script or own action | Anything else Home Assistant can do |

### Notifications

Recipients are chosen separately for alarms and for maintenance messages. Every kind of message (entry delay, armed, disarmed, arming not possible, silent alarm, sensor unreachable, low battery) can be switched on or off, be critical (sounds in silent mode) and have its own volume, per mode if you like.

### Log and alarm timeline

Every alarm is recorded from the first trigger until someone acknowledges it: which sensor responded when, which steps ran, which notifications went out. All other events (armed, disarmed, schedule, sensor failures) are listed below, with a filter by period and a CSV export.

<p align="center"><img src="https://raw.githubusercontent.com/Diegofuego871/ha-Alarmageddon/main/docs/img/log-en.png" alt="Log with the timeline of an alarm" width="100%"></p>

### More

- **Schedule:** arm or disarm at set times on chosen weekdays. A running alarm is never disarmed by the schedule.
- **Codes per person:** everyone gets their own code; the log shows who armed and disarmed.
- **Modes:** "Home", "Away" and "Night", each switchable on and off, each with its own zone, delays and actions.
- **Two-sensor confirmation:** a motion sensor can require a second sensor before it triggers, against false alarms.
- **Backup:** all settings as a file or stored in the integration, never with codes.
- **Several alarm systems:** house and garage, each as its own device.

## Safety mechanisms

An alarm system has to work when something else does not. These mechanisms are built in and checked by tests on every change.

<p align="center"><img src="https://raw.githubusercontent.com/Diegofuego871/ha-Alarmageddon/main/docs/img/safety-en.svg" alt="What secures the alarm actions" width="100%"></p>

| Mechanism | What it guarantees |
| --- | --- |
| When in doubt, alarm | An entry delay that ran out while Home Assistant restarted becomes an alarm. During an entry delay or an alarm, arming is refused: only disarming leads out |
| Safe on restart | State, delays and a running alarm continue after a restart; the alarm actions go on at the step they had reached |
| Codes | 4 to 8 digits, stored only as a salted hash, never shown, never in a backup or a log. Five wrong codes lock the alarm system for one minute, also for the right code |
| Administrators only | The side panel and every one of its commands need administrator rights |
| Buttons in the alarm notification | "Disarm", "Silence siren" and "Acknowledge" are off by default. They only work while the alarm is running and only from the phone of a configured alarm recipient |
| Nothing holds up the siren | A device that does not answer is skipped after 10 seconds, a push notification is never waited for, and a failing step, log, recording or notification never stops the rest |
| Watchdog | The alarm actions are supervised as a whole: the first step starts within 8 seconds, no step delays the next one beyond its limit, and a flow that breaks off goes on with the next step. Interventions appear in the timeline of the alarm |
| You decide how long the siren sounds | There is no fixed duration in the code. You set it in the flow ("wait" between on and off, or a duration for a sound, up to an hour per step). It is kept exactly and counts from the first start, also across a restart |
| Sensors that fail | A sensor that becomes unreachable while armed is reported at once, or triggers the alarm with the option "failure counts as alarm". Low batteries are reported before they are empty |
| Tested | More than 450 automated tests against a real Home Assistant, about 1,700 checks of the interface on computer and phone, and a mutation check that removes each of 29 safeguards and requires a test to fail |

### Limits

Alarmageddon is not a certified alarm system. Please keep in mind:

- If Home Assistant, the power, the network or the radio coordinator fails, there is no alarm. A siren with its own battery helps for critical use.
- How long a siren may sound is regulated differently from place to place. Check what applies to you and set the duration in the alarm actions; a siren with its own time limit is the safest choice.
- A sound "until disarmed" and a siren without an "off" step run until someone disarms. That is your choice in the flow.

## Apple HomeKit

1. Add the alarm entity to the HomeKit Bridge of Home Assistant (include the domain `alarm_control_panel` or the entity).
2. Apple Home shows "Off" and the modes that are switched on.
3. With a code: HomeKit does not ask for it. Set it in the HomeKit Bridge configuration (`entity_config` → `code`) or as default code in the entity settings.

## Entities

| Entity | Content |
| --- | --- |
| `alarm_control_panel.<name>` | The alarm system. Attributes: `arm_mode`, `triggered_by`, `bypassed_sensors`, `deadline`, `changed_by` |
| `binary_sensor.<name>_zone_<mode>` | On when a sensor of the zone of this mode is open |
| "Ready to arm" per mode | On when no open sensor blocks arming in this mode. Attribute: `blocking_sensors` |

Zone and "Ready" entities exist only for the modes that are switched on.

## Good to know

Details for those who want to know exactly. Click to open.

<details>
<summary><b>How an alarm runs</b></summary>

<p align="center"><img src="https://raw.githubusercontent.com/Diegofuego871/ha-Alarmageddon/main/docs/img/flow-en.svg" alt="States of an alarm system" width="100%"></p>

- Only a real change from closed to open triggers. A sensor that comes back from "unavailable" as open does not.
- A sensor with entry delay (for example the front door) starts the entry delay; every other sensor triggers at once. An entry sensor can have its own delay (sensor options), otherwise the delay of the system applies. A second entry sensor does not extend the delay.
- Sensors set to "always active" (smoke, water, gas) trigger in every state, also when disarmed.
- The alarm lasts until someone disarms. How long siren, light and sound run is set in the alarm actions.
- Open sensors block arming, unless they may be open or are bypassed until the next disarming.

</details>

<details>
<summary><b>Numbers and limits</b></summary>

| What | Value |
| --- | --- |
| Exit delay | Default 60 s for "Away", none for "Home" and "Night"; up to 3600 s per mode |
| Entry delay | Default 30 s, per mode and per sensor if you like |
| Confirmation window for the second sensor | Default 60 s |
| Wrong codes | Five, then locked for 60 s |
| Code storage | PBKDF2-SHA256 with 120,000 rounds and a salt per code |
| Device does not answer | Next step after 10 s |
| First step after the alarm triggers | 8 s at most (watchdog) |
| Wait and sound duration | 0 to 3600 s per step, up to 40 steps per flow |
| Test of the alarm actions | Ends after 60 s at the latest |
| Low battery, sensor unreachable | Below 20 %, after 60 minutes (both adjustable) |
| Kept per alarm system | 1000 events, 30 alarms with 300 entries each; 10 backups in total |

</details>

<details>
<summary><b>Options per sensor</b></summary>

- **Always active:** triggers in every state, also when disarmed (smoke, water, gas).
- **May be open when arming:** an open sensor does not block arming and triggers after it was closed and opened again.
- **Bypass when arming:** an open sensor is ignored until the next disarming.
- **Arm as soon as closed:** closing this sensor during the exit delay (the front door behind you) arms at once instead of waiting for the delay to end.
- **Failure counts as alarm:** an unreachable sensor triggers the alarm while armed.
- **Needs a second sensor:** triggers only if another sensor with this option responds within the confirmation window.
- **Silent alarm:** sends a message instead of triggering the alarm, at most once per minute.

</details>

<details>
<summary><b>Alarm actions and notifications in detail</b></summary>

- **Do not wait for this step:** a step can run alongside, so the next one starts right away. A sound "until disarmed" always runs alongside.
- **Back to the previous state:** on or off, brightness, position, volume and source; Sonos with its own snapshot including groups.
- **Test:** runs the saved flow without an alarm and stops after 60 seconds at the latest. A real alarm during a test starts the real flow at once.
- **Media players** fetch the sounds from Home Assistant, so they must reach its local URL (Settings → System → Network).
- **Buttons of the alarm notification:** "Open" (on by default), "Silence siren" (stops the steps, the alarm stays), "Acknowledge" (ends the alarm, the alarm system stays armed and alarms again at the next trigger) and "Disarm" (iOS asks for Face ID or the passcode, Android does not).
- **Critical notifications:** the volume applies to iOS; Android plays them on the alarm channel, set its volume on the phone.
- **Maintenance messages:** each problem once, several in one notification, again after the battery was replaced or the sensor responded.
- **Battery forecast:** from the recorder history of the last 90 days; empty without enough history.

</details>

<details>
<summary><b>Schedule, backup and HomeKit in detail</b></summary>

- **Schedule:** open sensors block arming as usual; no code is needed; times missed while Home Assistant was off are not made up. Disarming by schedule means the alarm system is off at that time, whoever is at home.
- **Backup:** up to 10 backups in the integration, plus export and import as a file. Import shows first what it would change. Codes are never included; the backup of Home Assistant itself contains everything.
- **HomeKit, exit delay:** Apple Home shows "Off" with the target "Away" during the exit delay. Use no exit delay for "Home" and "Night" (default).
- **HomeKit, entry delay:** Apple Home keeps showing "armed" and switches to "Alarm" when the alarm starts.

</details>

<details>
<summary><b>For developers</b></summary>

```bash
pip install -r requirements_test.txt
python -m pytest                      # tests against a real Home Assistant
python scripts/mutation_check.py      # removes each safeguard, a test must fail
cd tests/panel && npm ci && node run.mjs   # interface tests (Playwright)
```

- The images of this page come from the simulator: `node tests/panel/readme-shots.mjs`, then `python scripts/optimize_images.py`; the diagrams from `python scripts/make_diagrams.py`.
- Concept and decisions: [docs/CONCEPT.md](https://github.com/Diegofuego871/ha-Alarmageddon/blob/main/docs/CONCEPT.md) (German). Changes: [CHANGELOG.md](https://github.com/Diegofuego871/ha-Alarmageddon/blob/main/CHANGELOG.md).

</details>

## Languages

The integration is in English and switches to German when Home Assistant runs in German.

## License

See [LICENSE](https://github.com/Diegofuego871/ha-Alarmageddon/blob/main/LICENSE).
