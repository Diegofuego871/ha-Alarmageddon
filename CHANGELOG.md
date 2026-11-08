# Changelog

[Deutsch](https://github.com/Diegofuego871/ha-Alarmageddon/blob/main/CHANGELOG.de.md)

All notable changes to this integration are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.9.0] - 2026-11-08

Notifications rebuilt: every kind of message has its own settings, and a sensor can report instead of triggering.

Includes the changes from 0.7.0 and 0.8.0.

### Added

- **Settings per kind of message** (Configuration › Alerts): every kind (alarm, sensor reports, sensor unreachable while armed, entry delay, arming not possible, armed, disarmed, low battery, sensor unreachable, update available) can be switched on or off, be critical or not, and has its own volume (iOS). Each kind has its own "Send test message" button, which goes out with its saved settings, so you hear how it sounds.
- **Recipients as a dropdown:** pick a notification service from a dropdown; the chosen ones appear as tags with an x. Separate for alarms and for maintenance. A warning shows when a group has no recipient.
- **Report only** (new option per sensor): if this sensor responds while armed, a message is sent (kind "Sensor reports (no alarm)", critical by default) instead of triggering the alarm. For sensors that often respond without a break-in (pet, sunlight) or whose battery runs low. At most one message per sensor and minute; the recent events show it. Never set by default; also works for "always active" sensors if you choose so.

### Changed

- **Messages in chapters:** Recipients, Alarm messages, Maintenance messages, Buttons in the message.
- **Old settings carry over:** the single "critical" and "volume" of earlier versions become the settings of the alarm and of "sensor unreachable while armed"; switched-off kinds stay off. Backups from earlier versions are read the same way.
- Maintenance messages and the update message are critical only if you switch that on for their kind (default: no).

## [0.8.0] - 2026-11-08

Not released; included in 0.9.0.


New look of the settings like in Device Panel, and nothing gets lost when you switch tabs.

Includes the changes from 0.7.0.

### Changed

- **Settings in chapters:** every chapter has a title with a bar in front (Configuration › Alarm system: Modes, Times, Behaviour, Schedule, Codes per person, Backup; Updates: Version, Settings).
- **Tabs slide:** switching between the tabs of the configuration slides the page in from the side.
- **Nothing gets lost when switching tabs:** each tab keeps its unsaved changes, also when you go to the overview and back. A yellow dot on the tab shows where something is still open; "Cancel" and "Save" stay in each tab. A question only comes where a draft would really be replaced (another alarm system) and when the page is reloaded or closed.

## [0.7.0] - 2026-11-08

Not released; included in 0.9.0.


Updates from the panel, like in Device Panel.

### Added

- **Configuration › Updates:** shows the installed and the latest version (GitHub and HACS), the release notes of all versions in between (in your language, from the changelog) and "Update", which installs the new version through HACS. Home Assistant is never restarted by itself: "Restart now" appears when the new version is on disk, with a confirmation. A dot on the tab shows that something is waiting.
- **Daily check:** asks GitHub once a day (first check at a random time after the start) and reports a new version under Repairs. Can be switched off.
- **Notification "Update available"** to the maintenance recipients, once per version, switchable under Notifications.
- **Install updates automatically:** off by default. Downloads the new version through HACS after the daily check; the restart stays with you. Only the HACS entity of this repository is ever used.
- **Pre-releases:** offered on request (default: yes as long as a pre-release is installed). HACS installs them only with its own "Pre-release" switch; the panel explains this and links to the HACS device.
- The update settings are part of the backup.

## [0.6.0] - 2026-11-08

Schedule for arming and disarming, and the modes of an alarm system are now chosen in the panel.

Includes the changes from 0.3.0, 0.4.0 and 0.5.0.

### Added

- **Schedule:** per alarm system any number of times in Configuration › Alarm system: arm "Home", "Away" or "Night", or disarm, at a set time on chosen weekdays, each time switchable on and off. A running alarm or entry delay is never disarmed or overridden by the schedule (recorded in the recent events). Open sensors block arming as usual and the notification "arming not possible" follows. No code is needed. "Changed by" shows "Schedule". Times missed while Home Assistant was off are not made up.

### Changed

- **Modes freely selectable:** "Home", "Away" and "Night" can each be switched on and off per alarm system in Configuration › Alarm system (before only "Night", and only when setting up or in the options). At least one mode; Apple Home and the overview offer only the modes switched on. A mode switched off keeps its zone and actions. The mode the alarm system is armed in cannot be switched off.

## [0.5.0] - 2026-11-08

Not released; included in 0.6.0.

Maintenance notifications and battery forecast, two-sensor confirmation against false alarms, codes per person and a backup of all settings.


### Added

- **Maintenance notifications:** low battery and sensors that stay unreachable go to the maintenance recipients, for all alarm systems. Each problem is reported once, several at a time in one notification; again only after the battery was replaced or the sensor responded again. Threshold (default 20 %) and time until "unreachable" (default 60 minutes) in Configuration › Notifications. Checked every 15 minutes.
- **Battery forecast:** the sensor list shows when a battery will be low, calculated from the history since the last battery change (recorder, last 90 days). Without enough history no forecast is shown.
- **Two-sensor confirmation:** new option per sensor "Needs a second sensor". While armed such a sensor triggers only if another sensor with this option responds within the confirmation window (default 60 seconds, Configuration › Alarm system). Against false alarms from pets or sunlight. Off by default; sensors without this option still trigger alone, and during the entry delay it does not apply. An unconfirmed trigger appears in the recent events.
- **Codes per person:** any number of personal codes per alarm system in Configuration › Alarm system, optionally linked to a Home Assistant user. "Changed by", the recent events and the notifications show the person. Two persons cannot have the same code. Codes are stored only as a hash and never shown; the main code from the options keeps working.
- **Backup:** export all settings as a file (zones, delays, options per sensor, actions, defaults, notifications) and restore them, with a preview of which alarm systems are found (matched by name). Codes are never part of a backup.

### Changed

- **Low battery threshold** comes from the notifications setting and applies equally to the list, the status tile and the maintenance notification.

### Fixed

- **Recent events:** "arming not possible" was shown as "disarmed".
- **Phone:** the choice "Open sensor when arming" was cut off.

## [0.4.0] - 2026-11-08

Not released; included in 0.6.0.

Alarm actions as a graphical workflow per alarm, own alarm sounds for media players and notifications with critical push messages.


### Added

- **Configuration › Actions:** one workflow per alarm system and alarm ("Home", "Away", "Night" and "always active" for smoke, water, gas). Building blocks: push notification, turn on, turn off, open and close covers, alarm sound on media players, wait, script and any Home Assistant action with own data. Steps can be added at any position, edited, moved and deleted; changes are a draft with "Cancel" and "Save". A workflow with its own push step replaces the automatic alarm notification, so it is not sent twice.
- **Alarm sounds:** five sounds of our own (siren, alarm beep, klaxon, warning, chime) for media players such as Sonos, with preview in the panel, volume and repetitions. The sounds are served by Home Assistant itself; the media player must reach the local URL of Home Assistant.
- **Back to the previous state:** before the first step Alarmageddon saves the state of all devices in the workflow (on/off, brightness, position, volume, source; for Sonos additionally the Sonos snapshot including groups). Disarming or the end of the alarm duration stops all steps and returns marked devices to that state. For alarm sounds this is on by default. This also works after a restart of Home Assistant in the middle of an alarm.
- **Test:** runs the workflow without alarm and stops by itself after 60 seconds at the latest, or with "Stop test". A real alarm cannot be stopped from the workflow, only by disarming.
- **Configuration › Notifications (for all alarm systems):** recipients separately for alarms and maintenance notifications (every `notify` service, for example the companion app), critical alarm notification with volume (iOS: critical, Android: alarm channel), events (alarm, entry delay, armed, disarmed, arming not possible, sensor unreachable while armed) and test notifications.
- **Alarm notification:** with time and triggering sensor, button "Open"; "Alarm ended" replaces the alarm notification on the phone after disarming. A sensor that becomes unreachable while armed is reported as critical.
- **"Disarm" button in the alarm notification:** off by default. iOS asks for Face ID or the passcode, Android does not; the panel warns about this.

## [0.3.0] - 2026-11-08

Not released; included in 0.6.0.

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

[0.9.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.9.0
[0.6.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.6.0
[0.2.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.2.0
