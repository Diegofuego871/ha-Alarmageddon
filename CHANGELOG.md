# Changelog

[Deutsch](https://github.com/Diegofuego871/ha-Alarmageddon/blob/main/CHANGELOG.de.md)

All notable changes to this integration are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.25.0] - 2026-11-09

The sensor list on the overview works like the list in Device Panel (own columns on phone and computer), and the alarm lasts until it is acknowledged.

Includes the changes from 0.24.0.

### Added

- **Sensor list as in Device Panel:** the list is the default view, on the computer and on the phone. Columns are chosen and ordered separately for the **computer** and the **phone** (View › "For this computer" / "For the phone"), with their own sorting, direction and grouping, and are stored per user in Home Assistant (and in the browser as a fallback). Columns: state, battery, forecast, signal, firmware, model, integration, last change, area, zones. The phone gets a compact set by default (state, battery, signal, firmware).
- **Card layout is optional** on both devices (switch "List / Cards"); cards show the fields chosen for the device.

### Changed

- **The alarm lasts until it is acknowledged:** the state "Alarm" stays until someone disarms, in every mode and also for always-active sensors. The setting "Alarm duration" is removed from the panel, the options dialog and the alarm systems. How long a siren or an alarm sound plays is set in the step of the actions (alarm sound: "Duration"). Disarming still stops all steps and returns the devices. Old values in the options or in a backup are ignored.
- **The scope "Always active" is removed** from Configuration › Alarm system › "Settings per mode": it only held the alarm duration. The actions for "always active" stay in Configuration › Actions.

## [0.24.0] - 2026-11-09

Not released; included in 0.25.0.

### Changed

- **All tab and selection bars follow the Device Panel design** (the design rule "selection buttons"): equal-width fields with 2 px gap, 3 px padding and 14 px radius, the bar in 7 % text colour over the card colour, the selected field as a capsule in the page background colour with a thin inner border, the selected tab in the accent colour (weight 500). The capsule slides to the new tab in 0.46 s with a slight overshoot and is a little transparent while it moves.
- **Redrawing does not interrupt the slide:** the panel remembers the last position of each capsule and continues from there, also when the bar is redrawn in the middle of the move (no jump back). Without a selected tab there is no capsule. With "Reduce motion" in the system the capsule stands at the target at once. Every bar has its own key, so two bars never share a position.
- **Phone:** tap area at least 44 px, bars fill the width, from five tabs on four columns in rows (three on narrow phones). Small bars (for example the switch List / Cards) stay as wide as their content.
- **"Open sensor when arming" is a dropdown** (Configuration › Alarm system › Behaviour) instead of two tabs: tabs there looked too much like the navigation and were confusing.

### Fixed

- **"Last change" in the sensor list** no longer jumps to the time of the last restart of Home Assistant. Only a change between open and closed counts; "unavailable" and back (restart, radio dropout) does not. Alarmageddon remembers the time itself and, for sensors without a remembered time, reads the history once (recorder, last 90 days); without a real change in that time the list shows "–".


## [0.23.0] - 2026-11-08

Includes the changes from 0.22.0.

### Added

- **Card layout for the sensor list** (Overview): a switch "List / Cards" next to "View". Cards show one small card per sensor with all information of the chosen columns (state, battery, forecast, signal, firmware, model, integration, last change, zones), as a grid and grouped like the list. On the phone the cards are always used and follow the width.
- **Tap target of the alarm message** (Configuration › Actions, step "Push notification"): by default a tap opens the log with the running alarm (what happened when since it went off, the view refreshes every 5 seconds). Alternatively the overview or an own path in Home Assistant (for example `/lovelace/alarm`). The "Open" button uses the same target.
- **"Waits for the end" / "Runs alongside" on every step** of the action flow: a switch on the card changes it with one tap, and after a step that runs alongside the connection to the next step is dashed, so the flow is visible at a glance.
- **Searchable choices** for "Type" and "Action" of an own action: typing filters the list.
- **Sensors to add** (Configuration › Sensors › "Add sensors"): the same filter pills as the sensor list (All, Doors & windows, Motion, More), and a taller search field.
- The log refreshes every 5 seconds while it is open (before only during a running alarm).

### Changed

- **Filter pills are spaced** (also between the rows when they wrap).
- **The chapter "Alarm message" in Configuration › Notifications is gone** (the settings are in the push step, no further hint is needed).

### Fixed

- **The alarm system was forgotten after adding sensors** ("No alarm system yet", and the panel hung): Home Assistant reloads the alarm system when you save, and the side panel was removed and added again meanwhile. The panel now stays in place; the screen keeps the last data and shows the loading indicator (the same as Device Panel: dimmed content, three turning dots) until the reload is done. The side panel only disappears when the last alarm system is removed.

## [0.22.0] - 2026-11-08

Not released; included in 0.23.0.

### Added

- **Period in the log** (Log tab): "All", "Last 3 hours", "Last 24 hours", "Today", "Yesterday", "Last 7 days", "Last 30 days", "Choose a day …" (jump to a day with the date field) and "Choose a period …" (from, to). With several alarm systems you can also filter by alarm system. The list shows how many events and alarms match. The period is remembered per browser.
- **Export of the log** as CSV (semicolons and BOM, opens correctly in Excel) or JSON. The export contains exactly what the chosen period and alarm system show: the events and the timelines of the alarms (CSV: one row per entry with time, alarm system, type, description, sensor, person and the alarm it belongs to). The list on screen shows the newest 300 events; the export contains all of them.

### Changed

- **The log keeps more:** up to 1000 events and 30 alarms per alarm system (before 50 and 20), so that periods like "Last 30 days" are useful.

## [0.21.0] - 2026-11-08

Not released; included in 0.23.0.

### Added

- **Icon of the integration in notifications:** every notification of Alarmageddon (alarm, sensors, maintenance, update) carries the icon of the integration. Android shows it as the icon of the notification. iOS always shows the icon of the Home Assistant app; that cannot be replaced by an integration. The icon is served by Home Assistant without login (`/alarmageddon_icon.png`).

## [0.20.0] - 2026-11-08

Not released; included in 0.23.0.

### Changed

- **Alarm message only in the push step** (Configuration › Actions, "Push notification"): critical, volume and the buttons "Open", "Silence siren" and "Disarm" are set there, together with title and text, separately for each mode and push step. In Configuration › Notifications the kind "Alarm" and the chapter "Buttons in the message" are gone; a note with a button leads to the actions.
- **Existing alarm systems keep their behaviour:** a push step without its own values uses the earlier global values (critical, volume, buttons) until you change them in the step.
- **A button only works if the message offers it.** This is derived from the configuration, so it also works after a restart of Home Assistant for a message that is still on the phone.
- **The alarm message cannot be switched off any more:** it always goes out (an earlier "off" for the kind "Alarm" no longer counts). Without a push step in the actions a default message goes out (critical, button "Open").

## [0.19.0] - 2026-11-08

Not released; included in 0.23.0.

### Added

- **Own title and text for the alarm notification** (Configuration › Actions, step "Push notification", open with the pencil): the default text is in the fields and can be changed as you like. Placeholders `{name}` (alarm system), `{sensor}` (triggering sensor), `{time}` and `{mode}` are inserted with one tap and filled in when the alarm goes off; a preview shows the message with real names. "Restore default text" brings the default back. An unchanged text is not saved, so it keeps following the language of Home Assistant. Buttons, critical and volume come from Configuration › Notifications as before.

## [0.18.0] - 2026-11-08

Not released; included in 0.23.0.

### Changed

- **Alarm sound: duration instead of repetitions** (Configuration › Actions): "How long it may sound" in seconds (with quick choices 10 s, 30 s, 1 min, 5 min), or "Until the alarm system is disarmed", where the tone repeats without end until someone disarms, silences the siren or the alarm duration ends. When the time is up, the media players are stopped so the tone does not trail off. Existing steps with repetitions keep working (shown as the matching number of seconds, saved as before until you edit them).
- **"Silence siren" always works:** the push button now also stops the media players when all steps of the actions have already ended but a tone may still be playing, and works for a sound without end.

## [0.17.0] - 2026-11-08

Not released; included in 0.23.0.

### Added

- **"Do not wait for this step"** (Configuration › Actions, per step of type switch device, alarm sound, scene or script, own action): the next step starts right away instead of after this one has ended. For a very long alarm sound or a slow device, so the following steps are not held up. Disarming stops steps that run alongside as well. A failing step never stops the others, with or without the option (as before). Steps that run alongside are not resumed after a restart of Home Assistant in the middle of an alarm; the steps after them are.

### Fixed

- **Save bar at the bottom:** on pages with little content (for example an alarm without steps) the bar with "Cancel" and "Save" now sits at the bottom of the window instead of in the middle; the spacing above it is kept.


## [0.16.0] - 2026-11-08

Not released; included in 0.23.0.

### Added

- **Buttons in the alarm message with their own switches** (Configuration › Notifications, chapter "Buttons in the message"): "Open" (on by default), "Disarm" (off by default, as before) and new "Silence siren" (off by default). "Silence siren" stops all steps of the alarm actions and returns the devices to their previous state; the alarm system stays in alarm until someone disarms it. It only works during a real alarm with running actions, and the recent events and the alarm timeline show it.

### Fixed

- **Own action in the action editor** showed the technical names of Home Assistant (`cover.set_cover_position`, field `speed`). Types, actions, descriptions, field names and choices are now shown in your language, fetched from Home Assistant like its own interface; where Home Assistant has no translation, the name is made readable ("Set cover position").
- **Spacing:** the last element of a page no longer sits directly on the bar with "Cancel" and "Save"; hints, warnings and the "Test message" rows have more room.


## [0.15.0] - 2026-11-08

Not released; included in 0.23.0.

### Changed

- **Unreachable sensors in one place** (Configuration › Notifications, chapter "Maintenance messages"): the two entries "Sensor unreachable while armed" and "Sensor unreachable" are now one card "Sensor unreachable" with two cases, each with its own switch, critical, volume and test message: "While the alarm system is armed" (reported at once, goes to the alarm recipients) and "Out for a long time" (after the set time, also while disarmed, goes to the maintenance recipients). Settings and recipients are unchanged.
- **Better explanations:** "Sensor reports (no alarm)" now says that only this message goes out instead of an alarm, at most one per sensor and minute, and where the option "Report only" is set (per sensor).

## [0.14.0] - 2026-11-08

Not released; included in 0.23.0.

### Changed

- **Sensor list is a choice** (Configuration › Sensors): the list no longer shows every sensor Home Assistant knows, which kept sensors in view that have nothing to do with an alarm system. "Add sensors" opens a window with all sensors Alarmageddon recognises (search, grouped by area); you tick the ones that belong to this alarm system and add them. Each alarm system has its own list.
- **Remove from list:** per sensor with the bin button (or in the sensor sheet). Zones, entry delay and own options of that sensor are cleared; it can be added again at any time.
- **Existing alarm systems:** sensors that are already in a zone or have own options stay in the list; all other sensors have to be added once. Nothing changes for alarm, zones or the overview.
- The list is part of the backup.

## [0.13.0] - 2026-11-08

Not released; included in 0.23.0.

### Added

- **Actions and notifications in the alarm timeline:** every started step of the alarm actions (notification, action with devices, alarm sound, wait) and every notification that goes out during the alarm appears in the Log tab in order with the sensors. Steps of a test run are marked "test".

## [0.12.0] - 2026-11-08

Log as its own tab with a graphical timeline for every alarm.

Includes the changes from 0.7.0, 0.8.0, 0.9.0, 0.10.0 and 0.11.0.

### Added

- **Alarm recording:** every alarm is recorded from the first trigger (entry delay or alarm) until it is acknowledged by disarming. The recording holds the state changes and every change of the sensors of the alarm system (responded, calm again, unreachable, also sensors that only report) with the time. It continues after a restart of Home Assistant in the middle of an alarm. Entry delays that end with disarming are recorded too. At most 20 alarms per alarm system and 300 entries per alarm; with a flapping sensor the first entries (the cause) and the end are kept. The recordings are runtime data and not part of the backup.
- **Log tab** on the start page: every alarm as a card with a timeline (one lane per sensor with a bar for the time it responded, lines for entry delay, alarm and acknowledged, time axis) and the order below it with time of day and time since the start. A running alarm updates every 5 seconds; the newest alarm is open, older ones collapsed.

### Changed

- **Recent events** moved from the overview to the Log tab ("All events", up to 100 across all alarm systems).

## [0.11.0] - 2026-11-08

Not released; included in 0.12.0.

### Changed

- **Action editor rebuilt** (Configuration › Actions): the building blocks are "Push notification", "Switch device", "Play alarm sound", "Wait", "Scene or script" and "Own action". No JSON anywhere.
  - **Switch device** reads what the device can do from Home Assistant: you choose devices (search, chosen ones as tags with an x) and then only see fitting actions (turn on/off/toggle, covers open/close, locks lock/unlock) and, when turning on, the settings the device really supports (brightness, colour temperature, cover position, fan speed, temperature and mode of a thermostat), each with a slider or dropdown. Settings left off stay as they are.
  - **Own action** lists every action of Home Assistant with its fields (text, number with slider, selection, entity dropdown, switch). Required fields are marked and checked. Values of fields the editor cannot show are kept.
  - **Play alarm sound:** media players via search field with tags, the tone as a dropdown, play and pause buttons next to it (clearly marked as a preview on this phone or computer, not on the real system), volume and repetitions as a slider and field.
  - Existing steps are shown in the new blocks without changes to the saved data.
- Search fields in the editor keep the focus while typing; the list opens only while the field is in use.

### Added

- **Test button per step:** runs only this step on the real devices, after a confirmation. The test of the whole workflow stays as before.
- **Reorder by dragging:** every step has a handle; drag it up or down (finger or mouse), arrow keys work too. Dragging is part of the draft like every other change.

## [0.10.0] - 2026-11-08

Not released; included in 0.12.0.

### Changed

- **Settings per mode** (Configuration › Alarm system): choose "Home", "Away", "Night" or "Always active" and set the values of that mode: exit delay, entry delay, alarm duration, behaviour for open sensors and the confirmation window for two-sensor confirmation. "Always active" is the alarm of an always-active sensor (smoke, water) while the alarm system is disarmed and has only the alarm duration. Every mode keeps its own values, also when it is switched off.
- **Existing alarm systems keep their behaviour:** as long as a mode has no value of its own, the common value of earlier versions applies to it.
- **The options dialog of Home Assistant** sets common values: a value you change there applies to all modes afterwards; unchanged values leave the per-mode values alone.
- The backup contains the values per mode.

## [0.9.0] - 2026-11-08

Not released; included in 0.12.0.


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

Not released; included in 0.12.0.


New look of the settings like in Device Panel, and nothing gets lost when you switch tabs.

Includes the changes from 0.7.0.

### Changed

- **Settings in chapters:** every chapter has a title with a bar in front (Configuration › Alarm system: Modes, Times, Behaviour, Schedule, Codes per person, Backup; Updates: Version, Settings).
- **Tabs slide:** switching between the tabs of the configuration slides the page in from the side.
- **Nothing gets lost when switching tabs:** each tab keeps its unsaved changes, also when you go to the overview and back. A yellow dot on the tab shows where something is still open; "Cancel" and "Save" stay in each tab. A question only comes where a draft would really be replaced (another alarm system) and when the page is reloaded or closed.

## [0.7.0] - 2026-11-08

Not released; included in 0.12.0.


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

[0.25.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.25.0
[0.23.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.23.0
[0.12.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.12.0
[0.6.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.6.0
[0.2.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.2.0
