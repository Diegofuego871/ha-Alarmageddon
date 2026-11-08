# Changelog

[Deutsch](https://github.com/Diegofuego871/ha-Alarmageddon/blob/main/CHANGELOG.de.md)

All notable changes to this integration are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.4.0] - 2026-11-08

Alarm actions as a graphical workflow per alarm, own alarm sounds for media players and notifications with critical push messages.

Includes the changes from 0.3.0.

### Added

- **Configuration › Actions:** one workflow per alarm system and alarm ("Home", "Away", "Night" and "always active" for smoke, water, gas). Building blocks: push notification, turn on, turn off, open and close covers, alarm sound on media players, wait, script and any Home Assistant action with own data. Steps can be added at any position, edited, moved and deleted; changes are a draft with "Cancel" and "Save". A workflow with its own push step replaces the automatic alarm notification, so it is not sent twice.
- **Alarm sounds:** five sounds of our own (siren, alarm beep, klaxon, warning, chime) for media players such as Sonos, with preview in the panel, volume and repetitions. The sounds are served by Home Assistant itself; the media player must reach the local URL of Home Assistant.
- **Back to the previous state:** before the first step Alarmageddon saves the state of all devices in the workflow (on/off, brightness, position, volume, source; for Sonos additionally the Sonos snapshot including groups). Disarming or the end of the alarm duration stops all steps and returns marked devices to that state. For alarm sounds this is on by default. This also works after a restart of Home Assistant in the middle of an alarm.
- **Test:** runs the workflow without alarm and stops by itself after 60 seconds at the latest, or with "Stop test". A real alarm cannot be stopped from the workflow, only by disarming.
- **Configuration › Notifications (for all alarm systems):** recipients separately for alarms and maintenance notifications (every `notify` service, for example the companion app), critical alarm notification with volume (iOS: critical, Android: alarm channel), events (alarm, entry delay, armed, disarmed, arming not possible, sensor unreachable while armed) and test notifications.
- **Alarm notification:** with time and triggering sensor, button "Open"; "Alarm ended" replaces the alarm notification on the phone after disarming. A sensor that becomes unreachable while armed is reported as critical.
- **"Disarm" button in the alarm notification:** off by default. iOS asks for Face ID or the passcode, Android does not; the panel warns about this.

## [0.3.0] - 2026-11-08

Not released; included in 0.4.0.

New start page with a sensor list like Device Panel, a configuration area with options per sensor and "ready to arm".

### Added

- **Options per sensor:** "always active" (smoke, water, gas trigger even when disarmed), "may be open when arming" (for example a motion sensor on the way to the door), "arm as soon as closed" (closing the front door ends the exit delay after a few seconds), "failure counts as alarm" (unreachable while armed triggers). Without an own value the default of the sensor type applies.
- **Defaults per sensor type:** door, window, motion, smoke/water/gas, glass break/vibration/tamper and other, for all alarm systems. Proposal: doors "arm as soon as closed", motion "may be open when arming", smoke/water/gas "always active", glass break/vibration/tamper "failure counts as alarm".
- **Ready to arm:** one entity per mode (for example "Ready to arm away") with the blocking sensors as attribute; the overview shows "Ready for" per mode.
- **Start page:** at the top the control of all alarm systems and a status tile ("All good" or warnings such as low battery and unreachable sensors; a tap filters the list). Below a list of all assigned sensors with search, filters (problems, open, low battery, unreachable, alarm system, area) and a view setting (columns, grouping, sorting, remembered per browser). Columns: area, zones, state, battery, signal (dBm or LQI), firmware, manufacturer/model, integration, last change.
- **Configuration › Sensors:** the grid of zones as before, with a side sheet per sensor (zones, entry delay, options with origin "default" or "own value" and reset), on the phone as a sheet from the bottom. Button "Defaults" for the defaults per sensor type.
- **Configuration › Alarm system:** night mode, exit delay per mode, entry delay, alarm duration and the behaviour for open sensors, directly in the panel.
- **Sensor failure while armed** is recorded in the recent events.

### Changed

- **Panel tabs:** "Overview" and "Configuration" (before "Overview" and "Sensor groups").

## [0.2.0] - 2026-11-08

Side panel with an overview of all alarm systems and graphical sensor groups.

Includes the changes from 0.1.0.

### Added

- **Side panel "Alarmageddon":** added automatically with the first alarm system, removed with the last one. Only for administrators. Works on a desktop monitor and in the companion app on the phone.
- **Overview:** one card per alarm system with state, mode switch (Off, Home, Away, Night), open sensors, unreachable sensors and low batteries (below 20 %). A countdown shows the remaining exit or entry delay. During an alarm a red band with "Disarm" stands at the top. The panel asks for the code only when needed (a default code in Home Assistant works without input).
- **Recent events:** who armed or disarmed which alarm system and which sensor triggered, stored per alarm system (last 50).
- **Sensor groups:** a table with one column per zone and a switch for the entry delay. Drag across several boxes to set them all at once, "All" sets a whole column, with search and filters (doors & windows, motion, other). Sensors are grouped by area, with integration and battery. On the phone: one card per sensor with zone buttons. Changes are a draft with "Cancel" and "Save"; leaving with unsaved changes asks first.
- **Sensors of any integration:** the panel offers all binary sensors of a fitting device class (door, window, motion, smoke, water, glass break and more). The battery comes from the battery sensor of the same device.
- **Glass break:** binary sensors with the new device class "glass break" (Home Assistant 2026.10) are offered as well.

## [0.1.0] - 2026-11-08

Not released; included in 0.2.0.

First pre-release: the alarm core with Apple HomeKit support. The graphical setup in the side panel follows in a later version.

### Added

- **Alarm system as entity:** an `alarm_control_panel` with the modes "Home" and "Away", optionally "Night" (off by default), exit delay per mode, entry delay for chosen sensors (for example the front door) and alarm duration (0 = until disarmed).
- **Several alarm systems:** one entry per alarm system, each with its own device. Names must be unique.
- **Apple HomeKit:** works with the HomeKit Bridge of Home Assistant. Apple Home offers "Home", "Away", "Off" and, with night mode on, "Night". Tested with the real HomeKit Bridge.
- **Zones:** one entity per zone, on as soon as a sensor of the zone is open.
- **Open sensor when arming:** block arming or bypass the open sensors until disarmed.
- **Code:** optional, 4 to 8 digits, stored only as a hash, optionally also required to arm. Locked for one minute after five wrong codes. The default code from the entity settings of Home Assistant is supported.
- **Restart:** state, delays and alarm continue after a restart or when the options change. An entry delay that ran out during the restart becomes an alarm. A sensor that comes back from "unavailable" as open does not trigger.
- **Languages:** English and German.

[0.4.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.4.0
[0.2.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.2.0
