# Alarmageddon

[Deutsch](README.de.md)

Alarm system for Home Assistant with a guided graphical setup and built-in sensor maintenance.

> **Status:** concept phase. There is no installable integration yet.

## Features (planned)

- **Alarm entity:** an `alarm_control_panel` with the modes "Home" and "Away", exit and entry delay.
- **Sensor groups by drag and drop:** a side panel is added automatically. Drag window, door and motion sensors into the zones "Home" and "Away".
- **Alarm scenarios:** a timeline of actions per zone and mode, for example siren, covers, media players such as Sonos, lights and critical push notifications with actions.
- **Stop on disarm:** disarming cancels pending steps and stops everything a scenario started.
- **Maintenance overview:** sensors in tiles by area with battery level, last activity and estimated battery life.
- **Monitoring:** notifications for low battery, offline sensors and sensor failure while armed.

## Languages

The integration is in English and switches to German when Home Assistant runs in German.

## Concept

See [docs/CONCEPT.md](docs/CONCEPT.md) (German) and the mockups in [docs/mockups/konzept-v1](docs/mockups/konzept-v1).

## Limitations

Alarmageddon is not a certified alarm system. If Home Assistant, the network or the radio coordinator fails, there is no alarm. Use a siren with its own battery for critical use.

## License

See [LICENSE](LICENSE).
