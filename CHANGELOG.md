# Changelog

[Deutsch](https://github.com/Diegofuego871/ha-Alarmageddon/blob/main/CHANGELOG.de.md)

All notable changes to this integration are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.37.0] - 2026-11-09

Arming and disarming from the overview shows that the alarm system is working.

### Changed

- **Overview, arming and disarming:** the button switches at once; then the loader (three spinning dots, as elsewhere) appears over the slightly blurred background until Home Assistant reports the new state (at most 4 seconds). Nothing can be tapped meanwhile, so it is clear that the alarm system is working and not hanging.

## [0.36.0] - 2026-11-09

Not released; included in 0.37.0.

A tidier log, especially on the phone.

### Changed

- **Log filters** are labelled ("Period", "Alarm system") and a line with the dates the chosen period covers (for example "Monday, 9 November 2026") makes clear what the list shows.
- **Download** moved to the fixed bar at the bottom as an unobtrusive download symbol, next to the count of events and alarms.

### Removed

- **Export JSON.** The CSV download stays.

### Fixed

- **Alarm flow:** more space below the plus buttons too (between the plus and the next action).
- **Phone:** the four tabs of the settings per mode (modes and "Always active") sit in two rows instead of overlapping.
- **Several alarm systems at startup:** when Home Assistant loaded two or more alarm systems at once, one of them failed with "Setup error" ("Overwriting panel alarmageddon") and was missing in the panel. The panel is now registered once, safely.
- **Loading with damaged options:** an alarm system no longer fails to load when an entry of the sensor options is damaged (not a dictionary), in the migration of the old "Open sensor when arming" choice or later. The cause of a failed setup is always logged; if an alarm system shows "Setup error", the full entry in the Home Assistant log helps.

## [0.35.2] - 2026-11-09

### Changed

- **Name of the alarm system** (title or dropdown, pencil, "Open integration in HA") moved to the very top, next to the logo, instead of below the tabs. The name (or the dropdown to switch the alarm system, with the pencil to rename) stays visible in every tab of Configuration, including Notifications. The button "Open integration in HA" is only in the tab Alarm system. On the phone the button shows only the icon.

## [0.35.1] - 2026-11-09

### Changed

- **Actions:** the button "Test" moved to the fixed bar at the bottom, next to "Cancel" and "Save" (icon only on the phone).

### Fixed

- **Actions:** the bar with the switch and the tabs now really stays fixed while scrolling (it scrolled away before); on the phone it is compact, without the explanation.
- **Actions on the phone:** the card "Alarm ends" is no longer squeezed into a narrow column.

## [0.35.0] - 2026-11-09

The name of the alarm system can be changed, with a shortcut to Home Assistant.

### Added

- **Name of the alarm system** large and bold at the top of Configuration (Sensors, Actions, Alarm system), with a pencil to rename it. The name changes everywhere in Home Assistant: config entry, device and the name of all entities. A switch "Create new entity IDs from the new name" also renames the entity IDs that still follow the old name (IDs you named yourself stay); automations that use the old ID must be adjusted. A name already used by another alarm system is refused.
- **Button "Open integration in HA"** next to the name: opens the integration page of this alarm system in Home Assistant.
- **Settings per mode for the actions** (Configuration › Actions): the same switch as for sensors, messages and alarm system. Off (default): one action flow, including "Alarm ends", applies to every alarm, in all modes and for always active sensors. On: tabs of the modes and "Always active", each with its own flow. Alarm systems whose flows already differ start with the switch on. Switching off applies the flow of the first mode to all (undo with "Cancel").
- **Filter pills for the events** in the tab Log (All, Alarms, Armed, Disarmed, Arming failed), with counts.

### Changed

- **Tab bars of the settings per mode** (Sensors, Actions, Notifications › Messages, Alarm system) sit left-aligned below the switch. In Sensors the bar with switch and tabs stays fixed while scrolling.
- **With several alarm systems** the name becomes a dropdown of the same size to switch the alarm system (instead of the small dropdown next to the tabs). Notifications apply to all alarm systems and show no name.

## [0.34.2] - 2026-11-09

Not released; included in 0.35.0.

### Fixed

- **Alarm flow:** the dashed line of a step that runs alongside no longer runs through the plus button; the plus button has a little more space above it.

## [0.34.1] - 2026-11-09

Not released; included in 0.35.0.

The scope of the settings per mode is now obvious.

### Changed

- **Settings per mode:** the switch, the tabs and all settings below them sit in one bordered group (Sensors, Notifications › Messages, Alarm system › Times and behaviour), with a line "Everything below applies to <mode> only".
- **Sensor sheet:** a large banner "These settings apply only to <mode>" (or "…while the alarm system is disarmed" in the tab "Always active") replaces the small heading.

## [0.34.0] - 2026-11-09

A tab "Always active" for the settings per mode, and settings per mode for messages.

### Added

- **Tab "Always active"** with the settings per mode of the sensors (Configuration › Sensors, switch on): it has all sensor options for itself and applies while the alarm system is disarmed. The column "Always active" belongs to this tab; the option "Always active" itself never depends on a mode, so a smoke detector cannot be switched off in one mode.
- **Settings per mode for messages** (Configuration › Notifications › Messages): a switch "Settings per mode"; only when it is on, the tabs of the modes appear (there is no tab "All modes", the first mode is chosen) and every mode gets its own on/off, critical, volume and "keep in Home Assistant" for the messages while armed: silent alarm, **sensor unreachable while armed**, entry delay and armed. With the switch off everything applies to all modes; the own values stay saved. Part of the draft and the backup.

- **Settings per mode for the alarm system** (Configuration › Alarm system › Times and behaviour): a switch "Settings per mode", off by default. Off: one set of exit delay, entry delay and confirmation window for all modes. On: the tabs of the modes appear and every mode has its own values. Alarm systems whose modes already differ start with the switch on. Switching off applies the values of the first mode to all modes. Part of the backup.

### Changed

- **"Sensor unreachable while armed"** moved up to the other messages (before it stood under maintenance), so it can differ per mode. "Sensor unreachable" (for a longer time) stays under maintenance.

## [0.33.0] - 2026-11-09

Settings per mode, simplified: the same table, with the settings of the chosen mode.

### Changed

- **Settings per mode work differently** (Configuration › Sensors): the tabs of the modes only appear when the switch "Settings per mode" is on; there is no tab "All modes" any more, and the first mode is chosen. With the switch on, the table has the **same columns as before** (zones of all modes, "Always active", entry delay), so you always see in which modes a sensor is active. The column of the chosen mode and "Always active" (which then applies to this mode) are highlighted. All other sensor options (may be open, bypass, arm as soon as closed, failure counts as alarm, needs a second sensor, silent alarm) are set in the sheet of the sensor, for the chosen mode. With the switch off everything is as before 0.32.0. On the phone the zone buttons of the cards show the chosen mode with a frame. More space around the switch.
- **The origin text** of an option in a mode reads "Basic value (as before switching on)" and "Own value for {mode}" with "back to the basic value".

## [0.32.0] - 2026-11-09

Sensor settings per mode, and "Bypass" is now a setting per sensor.

### Added

- **Settings per mode** in Configuration › Sensors: a switch "Settings per mode" above the table. Off (default): the settings of a sensor apply to all modes, as before. On: the tabs "All modes", "Home", "Away" and "Night" become selectable, and every mode can have its own values for **all** sensor options (always active, may be open, bypass, arm as soon as closed, failure counts as alarm, needs a second sensor, silent alarm). The tab of a mode shows the table with all options as checkboxes (a dot marks an own value of this mode), the sheet of a sensor shows the values of the chosen mode with their origin ("Own value for Away" / "Same as in All modes") and "back to All modes". Without an own value the value for all modes applies, then the default of the sensor type. Switching off keeps the values (they just do not apply). Part of the draft and the backup.
- **New sensor option "Bypass when arming":** if the sensor is open when arming and may not be open, it is skipped until disarmed, instead of preventing arming. It is also part of the defaults per sensor type.

### Removed

- **The setting "Open sensor when arming"** (block or bypass) of the alarm system, in the panel and in the options dialog of Home Assistant. It is now decided per sensor and, if you want, per mode. Existing alarm systems keep their behaviour: a former "Bypass" is moved once to the option "Bypass" of the sensors (per mode, if the modes differed); the old values disappear.

## [0.31.0] - 2026-11-09

Notifications can stay in Home Assistant, "Report only" is now "Silent alarm", and the scroll position no longer jumps.

Not released; included in 0.32.0.

### Added

- **Keep as a notification in Home Assistant** (Configuration › Notifications): every kind of message, alarm and maintenance, can additionally appear in the bell of Home Assistant. It stays until someone dismisses it, independent of the recipients; the same kind replaces its own entry (the alarm message is replaced by "Alarm ended"). The setting can also differ per mode where messages per mode exist. Part of the backup.

### Changed

- **The sensor option "Report only" is called "Silent alarm"** everywhere (option, hints, list).

### Fixed

- **Adding sensors no longer scrolls to the top:** in the window "Add sensors" the list stays where it is when you tick a sensor, and windows keep their scroll position when they are redrawn.
- **Table header and sheet are no longer cut off at the top:** the fixed parts at the top (tabs, sub-tabs, toolbar) no longer cover the first lines; their spacing is part of the parts themselves, so it is the same while scrolling.

## [0.30.0] - 2026-11-09

Display fixes in the sensor table and the action flow.

### Fixed

- **Sensor table:** on a wide screen the table keeps its width and the checkboxes stay in place when the options of a sensor open (the sheet stands beside it). The delete symbol and the arrow stand on one line, the arrow at the far right.
- **Fixed parts at the top** (tabs, sub-tabs, toolbar, column header) no longer slide over each other when scrolling; they are measured again when their height changes (for example when the logo has loaded).
- **Action flow:** the symbols "Alarm begins" and "Alarm ends" are opaque, so the line no longer shines through.

## [0.29.0] - 2026-11-09

Own message values per mode for everything that happens while the alarm system is armed.

Includes the changes from 0.28.0.

### Added

- **Messages per mode** (Configuration › Notifications › Messages): sub-tabs "All modes", "Home", "Away", "Night". The kinds that only occur while armed (**Silent alarm**, **Entry delay**, **Armed**, **Sensor unreachable while armed**) can have their own values per mode (on/off, critical, volume, own test message). Without an own value the value of "All modes" applies; every kind shows its origin ("Own value for this mode" / "Same as in All modes") with "Reset", and "All modes" points to the modes with own values. Part of the draft and the backup, validated by the server.

## [0.28.0] - 2026-11-09

The update function is removed, "Alarm ends" has an own message, and the sensor table shows "Always active".

Not released; included in 0.29.0.

### Removed

- **The whole update function** (Configuration › Updates, the daily check, the entity of HACS, the message "Update available" under Repairs and in the notification kinds, "Install updates automatically", the release notes in the panel and the settings in the backup). Updates run through HACS as for every integration. Old settings and the old message under Repairs disappear by themselves.

### Added

- **"Alarm ends" element** at the end of every flow (Configuration › Actions, per mode) with an optional **own message** when someone disarms: the same options as the alarm message (title and text with placeholders, preview, critical, volume, tap target; no buttons), in a window like the steps, with a test button. The message replaces the standard message "Alarm ended" (same tag, so it replaces the alarm message on the phone). Part of the backup. Whether devices return after the alarm is decided only by "Undo on disarm / acknowledge" in each step.
- **"Always active" as a checkbox** in the sensor table of Configuration › Sensors (and as a button on the phone cards): shows the effective value; a click sets an own value for this sensor.
- **Filter by sensor type** (dropdown) in the sensor list on the overview.
- **Overview stays in view:** with a tall window the cards of the alarm systems, the filters and the column header stay in place when scrolling.

### Changed

- **Sensor table (Configuration):** the arrow and the delete symbol stand side by side, the arrow at the far right; integration and battery columns are gone to keep it clear.
- **Action flow:** the line no longer runs through the cards and ends at "Alarm ends", which has a coloured icon.
- **Volume slider** is at most half as wide; **scroll bars in windows** have more distance to the edge.
- **Windows:** the column header of the tables is no longer covered by the toolbar.
- **"Sensor reports (no alarm)" is now called "Silent alarm"**, and the chapter "Alarm messages" is called "Messages" (Configuration › Notifications).

## [0.27.0] - 2026-11-09

An "Alarm ends" element at the end of every action flow decides what disarming does.

Includes the changes from 0.24.0, 0.25.0 and 0.26.0.

### Fixed

- **The view no longer jumps to the top** when the screen is redrawn (marking sensors, adding sensors, closing a window): the scroll position is kept within the same view, and a window that closes returns to the position where it was opened.

### Added

- **"Alarm ends" element** at the end of every flow (Configuration › Actions, per mode): the choice "On disarm / acknowledge": **Stop, undo the marked steps** (as before, default), **Stop, undo all steps** (all devices the steps changed return to their state before the alarm, whatever each step says) or **Only stop, undo nothing** (all steps stop and alarm sounds fall silent, switched devices stay). The choice is part of the draft, the backup and the data of the alarm system; the default is not stored.

## [0.26.0] - 2026-11-09

Structured windows with a close button and fixed buttons, fixed header with a sortable list, free choice of columns per device, an "Occupancy" filter, and defaults that can be applied to all sensors.

Not released; included in 0.27.0.

### Added

- **Windows (popups) as in Device Panel:** every window has a round close button (x) at the top right, and the buttons at the bottom (Cancel, Apply, Save …) stay in view while the content scrolls. "Cancel", the x and Escape ask "Discard changes?" when something was entered or changed (action step, sensor selection, defaults, new code).
- **Fixed header:** title bar with tabs, sub-tabs, toolbar and the column header of the sensor tables stay in place when scrolling; only the list scrolls.
- **Sort by column:** a click on a column header of the sensor list sorts by it (a second click reverses the order, an arrow shows the direction); every column is sortable (state, battery, forecast, signal, firmware, model, integration, last change, area, zones). Empty values always stay at the end. The header row is more prominent. The choice also appears in the "View" window as a dropdown.
- **Filter "Occupancy":** motion, occupancy and presence sensors have their own filter; "Open" no longer counts them.
- **Tap a sensor row anywhere** in Configuration › Sensors (also a card on the phone) to open its options; checkboxes, switches and buttons in the row keep their function.
- **"Apply to all sensors"** in the defaults per sensor type: deletes the own values of all sensors, so every sensor follows the defaults (with a warning and the number of affected sensors).
- **Logo** of the integration next to the tabs.
- **"Undo on disarm / acknowledge"** (before "Return to previous state on disarm") with a clear hint on every action where it makes sense (switch device, alarm sound, own action with devices). Not for "Scene or script", whose effects cannot be undone in general.

### Changed

- **Alarm sound:** the new step is "Do not wait" by default, so the next step starts at once; existing steps stay as saved.
- **Dropdowns look the same everywhere** (own arrow with distance to the edge); the choice of the alarm system in the configuration is prominent.
- **Wide screens:** the content is at most 1680 px wide, with white space left and right.
- **Push notification dialog** in chapters with a bar in front of the title (message, delivery, tap target, actions); the design is used in all action dialogs.

## [0.25.0] - 2026-11-09

The sensor list on the overview works like the list in Device Panel (own columns on phone and computer), and the alarm lasts until it is acknowledged.

Not released; included in 0.27.0.

### Added

- **Sensor list as in Device Panel:** the list is the default view, on the computer and on the phone. Columns are chosen and ordered separately for the **computer** and the **phone** (View › "For this computer" / "For the phone"), with their own sorting, direction and grouping, and are stored per user in Home Assistant (and in the browser as a fallback). Columns: state, battery, forecast, signal, firmware, model, integration, last change, area, zones. The phone gets a compact set by default (state, battery, signal, firmware).
- **Card layout is optional** on both devices (switch "List / Cards"); cards show the fields chosen for the device.

### Changed

- **The alarm lasts until it is acknowledged:** the state "Alarm" stays until someone disarms, in every mode and also for always-active sensors. The setting "Alarm duration" is removed from the panel, the options dialog and the alarm systems. How long a siren or an alarm sound plays is set in the step of the actions (alarm sound: "Duration"). Disarming still stops all steps and returns the devices. Old values in the options or in a backup are ignored.
- **The preview of the push notification** now stands directly under the placeholders, before the delivery options.
- **Clearer wording for the push notification buttons** (Configuration › Actions, step "Push notification"): the group is called "Actions of the push notification", each entry says that it is a button under the message and what it does. The hint of the alarm sound no longer mentions the alarm duration.
- **The scope "Always active" is removed** from Configuration › Alarm system › "Settings per mode": it only held the alarm duration. The actions for "always active" stay in Configuration › Actions.

## [0.24.0] - 2026-11-09

Not released; included in 0.27.0.

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

[0.37.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.37.0
[0.35.2]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.35.2
[0.35.1]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.35.1
[0.35.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.35.0
[0.34.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.34.0
[0.33.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.33.0
[0.32.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.32.0
[0.30.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.30.0
[0.29.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.29.0
[0.27.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.27.0
[0.23.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.23.0
[0.12.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.12.0
[0.6.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.6.0
[0.2.0]: https://github.com/Diegofuego871/ha-Alarmageddon/releases/tag/v0.2.0
