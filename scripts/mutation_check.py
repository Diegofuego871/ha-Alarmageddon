"""
Mutationsprobe der Sicherheitstests: baut je eine Schutzmassnahme aus dem Code aus und prüft, dass die Tests das merken.

Wozu: Ein Test, der auch ohne die Schutzmassnahme besteht, schützt nichts. Abdeckung in Prozent zeigt das nicht (die Zeile
läuft, aber niemand prüft ihre Wirkung). Jede Zeile der Liste unten steht für eine Zusage der Alarmanlage; "ÜBERSEHEN"
heisst: diese Zusage ist nicht mehr durch einen Test gesichert.

Aufruf im Wurzelverzeichnis: `python scripts/mutation_check.py` (rund eine halbe Minute). Endet mit Fehler, wenn eine
Mutation übersehen wird oder ihr Muster im Code nicht mehr vorkommt (dann wurde die Stelle umgebaut: Muster nachführen,
nicht löschen). Die Dateien werden nach jeder Probe zurückgesetzt, auch bei einem Abbruch.

Pflege: Neue Schutzmassnahme (Prüfung einer Berechtigung, eines Zustands, einer Eingabe) -> neue Zeile mit dem Test, der
sie sichert. Regel aus CLAUDE.md, Abschnitt "Sicherheitstests".
"""

from __future__ import annotations

import pathlib
import subprocess
import sys

BASE = pathlib.Path(__file__).resolve().parents[1] / "custom_components" / "alarmageddon"
ROOT = BASE.parents[1]

# (Name, Datei, Text im Code, Ersatz, Tests, die es merken müssen)
MUTATIONS = [
    ("Admin-Prüfung von 'export' entfernt", "websocket_api.py",
     '@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/export"})\n@websocket_api.require_admin\n',
     '@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/export"})\n', "tests/test_security.py -k admin_only"),
    ("Prüfung der Domäne der Anlage entfernt", "websocket_api.py",
     "if entry is None or entry.domain != DOMAIN or entry.state is not ConfigEntryState.LOADED:",
     "if entry is None or entry.state is not ConfigEntryState.LOADED:", "tests/test_security.py -k foreign"),
    ("Sperre nach falschen Codes entfernt", "controller.py",
     "        if self._locked_until and now < self._locked_until:\n", "        if False:\n", "tests/test_security.py -k locked"),
    ("Erneute Prüfung nach der Code-Prüfung entfernt", "controller.py",
     "            if self.state in (AlarmControlPanelState.PENDING, AlarmControlPanelState.TRIGGERED):\n                raise _error(\"disarm_first\")\n        # Offen",
     "        # Offen", "tests/test_hardening.py -k code_check"),
    ("Eigene Empfänger einer Meldung werden ignoriert", "notify.py", "async_send(self.hass, targets or self._targets(kind, mode), build_payload(", "async_send(self.hass, self._targets(kind, mode), build_payload(",
     "tests/test_push_targets.py -k 'replaces or several or alarm_end'"),
    ("Knöpfe nur von den globalen Empfängern, nicht von den eigenen des Schritts", "notify.py", "recipient_users(self.hass, self._alarm_recipients())", 'recipient_users(self.hass, self.cfg["alarm_targets"])',
     "tests/test_push_targets.py -k buttons"),
    ("Eigene Eingangsverzögerung des Sensors ignoriert", "controller.py",
     "delay = self.sensor_entry_delay(entity, self.mode) if entity in self.entry_sensors else 0", "delay = self.entry_delay if entity in self.entry_sensors else 0",
     "tests/test_sensor_delay.py -k 'replaces or beats or zero'"),
    ("Ungültige eigene Verzögerung wird übernommen", "controller.py",
     "if isinstance(value, int) and not isinstance(value, bool) and 0 <= value <= MAX_DELAY:", "if value is not None:",
     "tests/test_sensor_delay.py -k invalid"),
    ("Quittieren ohne laufenden Alarm", "controller.py",
     "        if self.state != AlarmControlPanelState.TRIGGERED:\n            return False\n        self._cancel_timer()\n        self.changed_by = changed_by\n        # Zuerst das Ereignis", "        self._cancel_timer()\n        self.changed_by = changed_by\n        # Zuerst das Ereignis",
     "tests/test_acknowledge.py -k 'without_alarm or entry_delay'"),
    ("Schritt \"Alarm quittieren\" wirkt auch im Test", "workflow.py",
     "            if not test:\n                self._ctl.acknowledge(", "            if True:\n                self._ctl.acknowledge(",
     "tests/test_acknowledge.py -k in_a_test"),
    ("Quittierter Alarm wird nicht als quittiert aufgezeichnet", "recording.py",
     'reason="acknowledged" if ack is not None else "ended"', 'reason="ended"',
     "tests/test_acknowledge.py -k ends_the_alarm_and_stays_armed"),
    ("Immer aktiv liest bei scharfer Anlage die Optionen des Modus statt des Reiters \"Immer aktiv\"", "controller.py",
     "if not self.option(entity, OPT_REPORT_ONLY, None):", "if not self.option(entity, OPT_REPORT_ONLY, self.mode):",
     "tests/test_always_active.py -k silent_alarm_of_the_always_tab"),
    ("Schalter \"nur der Modus zählt\" macht auch Sensoren ausserhalb der Zone stumm", "controller.py",
     "        if mode is None or entity_id not in self.zone(mode):\n            return False\n", "        if mode is None:\n            return False\n",
     "tests/test_always_active.py -k not_apply_where"),
    ("Schalter \"nur der Modus zählt\" wirkt nicht", "controller.py",
     "and self.state != AlarmControlPanelState.TRIGGERED and not self.always_ignored(entity):", "and self.state != AlarmControlPanelState.TRIGGERED:",
     "tests/test_always_active.py -k ignore_switch_leaves"),
    ("Immer aktiv ohne Zone und ohne eigenen Wert wird nicht beachtet (Rauchmelder nur in der Liste)", "controller.py",
     'known = {e for m in self.modes for e in self.zone(m)} | set(self.options.get(CONF_SENSORS) or []) | set(self.sensor_overrides)', 'known = {e for m in self.modes for e in self.zone(m)} | set(self.sensor_overrides)',
     "tests/test_always_active.py -k smoke_detector_by_type_default"),
    ("Eigene Empfänger einer Meldungsart werden ignoriert", "notify.py",
     '        own = effective_type(self.cfg, kind, mode).get("targets")', '        own = None',
     "tests/test_type_targets.py -k 'own_recipients or mode_value or test_message'"),
    ("Eigene Empfänger je Art: jeder Dienst erlaubt (nicht nur notify)", "settings.py",
     're.fullmatch(r"notify\\.[a-z0-9_]+", t)', 'True',
     "tests/test_type_targets.py -k backup_and_validation"),
    ("Wartung: Batterie geht an die Gruppe statt an die eigenen Empfänger", "maintenance.py",
     'tuple(cfg["types"][art].get("targets") or cfg["maintenance_targets"])', 'tuple(cfg["maintenance_targets"])',
     "tests/test_type_targets.py -k maintenance"),
    ("Abgeschaltetes \"Immer aktiv\" wirkt weiter", "controller.py",
     "        if not self.always_enabled:\n            return set()\n", "",
     "tests/test_always_active.py -k switched_off_always_active_triggers_nothing"),
    ("Speichern der Aktionen löscht den Ablauf nicht gesendeter Auslöser", "websocket_api.py",
     'options[CONF_WORKFLOWS] = {**kept, **{k: v for k, v in msg["workflows"].items() if v}}', 'options[CONF_WORKFLOWS] = {k: v for k, v in msg["workflows"].items() if v}',
     "tests/test_always_active.py -k keeps_flows"),
    ("Scheitert die Anmeldung des Panels, lädt die Anlage nicht", "__init__.py",
     "    try:\n        await async_register_panel(hass)\n    except Exception:  # noqa: BLE001\n        _LOGGER.exception(\"%s: the panel could not be registered; the alarm system runs without it\", entry.title)\n",
     "    await async_register_panel(hass)\n",
     "tests/test_panel_failure.py"),
    ("Sensorname: Regel ausgebaut (immer der Anzeigename von Home Assistant, ohne Trennung)", "devices.py",
     'if reg is None or not getattr(reg, "has_entity_name", False):', "if True:",
     "tests/test_display_name.py"),
    ("Sensorname: die Einstellung \"nur Name des Sensors\" wirkt nicht", "devices.py",
     "    if not with_device or not device_name or device_name.casefold() in own.casefold():\n", "    if not device_name or device_name.casefold() in own.casefold():\n",
     "tests/test_display_name.py -k switched_off"),
    ("Sensorname: der Name des Geräts steht doppelt", "devices.py",
     " or device_name.casefold() in own.casefold():\n", ":\n", "tests/test_display_name.py -k not_repeated"),
    ("Ereignisse, die älter als ein Jahr sind, bleiben liegen", "events.py",
     '[e for e in self.events if str(e.get("t") or limit) >= limit][:EVENTS_KEEP]', "self.events[:EVENTS_KEEP]", "tests/test_retention.py -k events"),
    ("Alarme, die älter als ein Jahr sind, bleiben liegen", "recording.py",
     '[r for r in self.recordings if r.get("end") is None or str(r.get("start") or limit) >= limit][:RECORDINGS_KEEP]', "self.recordings[:RECORDINGS_KEEP]", "tests/test_retention.py -k alarms"),
    ("Ein laufender Alarm lässt sich aus dem Protokoll löschen", "recording.py",
     '            if record.get("end") is None:\n                return "running"\n', "", "tests/test_retention.py -k running"),
    ("Kachel: wer scharf geschaltet hat, geht beim Quittieren verloren", "controller.py",
     "        if self.state != AlarmControlPanelState.TRIGGERED and not self._restoring:\n", "        if True:\n", "tests/test_armed_since.py -k acknowledg"),
    ("Absenderprüfung der Push-Knöpfe entfernt", "notify.py",
     'if not user_id or user_id not in recipient_users(self.hass, self._alarm_recipients()):', "if False:", "tests/test_security.py tests/test_hardening.py -k recipient"),
    ("Push-Knöpfe auch ausserhalb des Alarms", "notify.py",
     "if key is None or self._ctl.state != AlarmControlPanelState.TRIGGERED or not self._button_allowed(key):", "if key is None or not self._button_allowed(key):",
     "tests/test_actions.py tests/test_security.py -k 'stale or isolated'"),
    ("Empfänger: jeder Dienst erlaubt", "settings.py",
     'out[key] = [t for t in dict.fromkeys(value[key]) if isinstance(t, str) and t.startswith("notify.")]', "out[key] = [t for t in dict.fromkeys(value[key]) if isinstance(t, str)]",
     "tests/test_security.py -k only_notify"),
    ("Codes in der Antwort an das Panel", "websocket_api.py",
     '"codes": [{"id": c.get("id", ""), "name": c.get("name", ""), "user_id": c.get("user_id")} for c in ctl.codes],', '"codes": ctl.codes,', "tests/test_security.py -k never_leave"),
    ("Sicherung übernimmt Codes", "backup.py", "options = {k: v for k, v in entry.options.items() if k in ALLOWED}", "options = dict(entry.options)", "tests/test_security.py tests/test_backup.py -k 'never_leave or no_codes'"),
    ("Test verschluckt echten Alarm", "workflow.py", 'if self._run is not None and not test and (self._run.get("test") or self._run.get("after")):', "if False:", "tests/test_hardening.py -k interrupts"),
    ("Doppeltes Neuladen", "settings.py", "if key is None or key not in skip:", "if True:", "tests/test_security.py -k reloads_exactly"),
    ("Eingangsverzögerung wird verlängert", "controller.py", "                return  # Verzögerung läuft schon, ein weiterer Eingangssensor verlängert sie nicht\n",
     "                self._go_pending(self.entry_delay)\n                return\n", "tests/test_security.py -k extend"),
    ("Scharfschalten aus dem Alarm erlaubt", "controller.py",
     "        if self.state in (AlarmControlPanelState.PENDING, AlarmControlPanelState.TRIGGERED):\n            raise _error(\"disarm_first\")\n        if self.code_arm_required",
     "        if self.code_arm_required", "tests/test_security.py -k no_arming_out"),
    ("Ein scheiternder Zuhörer hält die anderen auf (Sirene bleibt aus)", "controller.py",
     "            try:\n                listener(*args)\n            except Exception:  # noqa: BLE001 - ein Zuhörer hält die anderen nie auf\n                _LOGGER.exception(\"%s: a listener failed, the others still run\", self.entry.title)\n",
     "            listener(*args)\n", "tests/test_action_hang.py -k 'failing_part or offline_message'"),
    ("Mitschreiben hält die Schritte auf", "workflow.py",
     "            except Exception:  # noqa: BLE001 - Sicherheitsregel: die Schritte laufen in jedem Fall\n                _LOGGER.exception(\"%s: bookkeeping for step %s of the alarm actions failed\", self.entry.title, index + 1)\n",
     "            except ZeroDivisionError:\n                pass\n", "tests/test_action_hang.py -k bookkeeping"),
    ("Endloser Ton blockiert die folgenden Schritte", "workflow.py",
     '    if kind == "sound" and step.get("duration") == 0:\n        return False\n', "", "tests/test_action_hang.py -k until_disarmed"),
    ("Ältere Abläufe ohne Angabe laufen plötzlich weiter statt zu warten", "workflow.py", '    return not step.get("detach")\n', "    return False\n", "tests/test_after_actions.py -k which_steps_wait"),
    ("Neue Schritte warten trotz \"wait\": false", "workflow.py", '    if "wait" in step:\n        return bool(step["wait"])\n', "", "tests/test_after_actions.py -k run_on_by_default"),
    ("Aktionen nach dem Quittieren starten nie", "workflow.py", "            await self.async_run_after(plan)\n", "            pass\n", "tests/test_after_actions.py -k run_once"),
    ("Aktionen nach dem Quittieren laufen vor dem Zurückstellen", "workflow.py",
     "        await self.async_stop()\n        try:\n            await self.async_run_after(plan)\n", "        try:\n            await self.async_run_after(plan)\n            await self.async_stop()\n", "tests/test_after_actions.py -k restored"),
    ("Aktionen nach dem alten Alarm blockieren einen neuen Alarm", "workflow.py", '(self._run.get("test") or self._run.get("after")):', '(self._run.get("test")):', "tests/test_after_actions.py -k new_alarm"),
    ("Alarmmeldung, Quittieren oder Dauerton nach dem Quittieren erlaubt", "schemas.py",
     '    if step["type"] not in AFTER_STEP_TYPES:\n        raise vol.Invalid("this step is not possible after the alarm")\n    if step["type"] == "sound" and step.get("duration") in (0, None):\n        raise vol.Invalid("a sound after the alarm needs a duration")\n', "",
     "tests/test_after_actions.py -k invalid_after"),
    ("Hängendes Gerät hält den Ablauf auf", "workflow.py", "            done, _pending = await asyncio.wait({task}, timeout=limit)\n", "            done, _pending = await asyncio.wait({task})\n",
     "tests/test_action_hang.py -k 'hanging_action'"),
    ("Wächter: ein hängender Schritt wird nicht verlassen", "workflow.py",
     "                await self._watched(self._step(step, test), step_budget(step), self._label(step))\n", "                await self._step(step, test)\n",
     "tests/test_action_hang.py -k 'any_kind_of_step_hangs'"),
    ("Wächter: die Vorbereitung läuft ohne Aufsicht", "workflow.py",
     '            await self._watched(self._prepare(run, steps, inherited), start_budget() - WATCHDOG_GRACE, "prepare")\n', "            await self._prepare(run, steps, inherited)\n",
     "tests/test_action_hang.py -k 'preparation_hangs_or_fails'"),
    ("Wächter: keine Aufsicht über den Start", "workflow.py", "            self._watch_start(trigger)\n", "", "tests/test_action_hang.py -k 'start_itself_hangs_or_fails'"),
    ("Wächter: ein gescheiterter Start wird nicht sofort übernommen", "workflow.py",
     '            _LOGGER.exception("%s: starting the alarm actions failed; the watchdog starts them", self.entry.title)\n            self._check_started(trigger)\n',
     '            _LOGGER.exception("%s: starting the alarm actions failed; the watchdog starts them", self.entry.title)\n', "tests/test_action_hang.py -k 'start_itself_hangs_or_fails'"),
    ("Wächter: ein abgebrochener Ablauf macht nicht weiter", "workflow.py", "            self._spawn(run, position + 1, trigger)\n", "            pass\n", "tests/test_action_hang.py -k 'flow_that_dies'"),
    ("Alarm im Test: das Zurückstellen des Tests wird abgewartet", "workflow.py", '                await self._watched(self._end_test(), SNAPSHOT_TIMEOUT, "test")\n', "                await self.async_stop()\n",
     "tests/test_action_hang.py -k 'during_a_test'"),
    ("Alarm im Test: der Schnappschuss des Tests geht verloren", "workflow.py", 'run["snapshot"] = {**self._snapshot(entities), **before}', 'run["snapshot"] = self._snapshot(entities)',
     "tests/test_action_hang.py -k 'during_a_test'"),
    ("Stopp löscht den Stand eines neueren Laufs", "workflow.py", "        run, self._run = self._run, None\n        await self._cancel_task()\n        if run:",
     "        await self._cancel_task()\n        run, self._run = self._run, None\n        if run:", "tests/test_action_hang.py -k 'slow_stop'"),
    ("Wächter verkürzt eine vom Nutzer eingestellte Wartezeit", "workflow.py",
     '        return max(0, int(step.get("seconds", 0) or 0)) + WATCHDOG_GRACE\n', "        return WATCHDOG_GRACE\n", "tests/test_duration.py -k 'never_cuts or not_fixed'"),
    ("Eingestellte Dauer beginnt nach Neuladen oder Neustart von vorn", "workflow.py",
     '        if isinstance(saved, dict) and saved.get("index") == position:\n', "        if False:\n", "tests/test_duration.py -k 'reload or restart'"),
    ("Eingestellte Wartezeit wird nicht eingehalten", "workflow.py",
     "            await self._sleep(self._remaining(seconds) if resumable else seconds)\n", "            await self._sleep(min(1, seconds))\n", "tests/test_duration.py -k 'exactly_as_long'"),
    ("Immer aktiv und Zone: der Standard lässt \"Immer aktiv\" im Modus weiter gelten", "controller.py",
     "        return True if own is None else own\n", "        return False if own is None else own\n", "tests/test_always_active.py tests/test_always_flows.py -k 'by_default or which_actions'"),
    ("Immer aktiv und Zone, Schalter aus: nur ein Ablauf statt beider", "controller.py",
     "        return [mode, WORKFLOW_ALWAYS] if entity_id is not None and entity_id in self.zone(mode) else [WORKFLOW_ALWAYS]\n", "        return [mode]\n", "tests/test_always_flows.py -k 'which_actions'"),
    ("Immer aktiv ohne eigenen Ablauf: bei scharfer Anlage läuft nichts", "controller.py",
     "        if not plan and self.mode and flows.get(self.mode):\n            plan = [self.mode]\n", "", "tests/test_always_flows.py -k 'which_actions'"),
    ("Derselbe Ablauf läuft doppelt", "controller.py", "            if steps and all(steps != (flows.get(other) or []) for other in plan):\n", "            if steps:\n", "tests/test_always_flows.py -k 'which_actions'"),
    ("Zweiter Ablauf wird nicht gestartet", "workflow.py",
     '        also = run.get("also")\n        if isinstance(also, dict) and also.get("trigger"):\n            self._spawn(run, 0, str(also["trigger"]))\n        return True\n', "        return True\n",
     "tests/test_always_flows.py -k 'which_actions or side_by_side'"),
    ("Zweiter Ablauf macht nach dem Neuladen nicht weiter", "workflow.py",
     '                if isinstance(also, dict) and also.get("trigger"):\n                    self._spawn(saved, int(also.get("index", 0) or 0), str(also["trigger"]))\n', "", "tests/test_always_flows.py -k 'reload'"),
    ("Sensoransicht gibt den Verlauf nicht überwachter Sensoren heraus", "websocket_api.py",
     "               if e.state is ConfigEntryState.LOADED and entity_id in e.runtime_data.controller.all_sensors()]\n", "               if e.state is ConfigEntryState.LOADED]\n",
     "tests/test_sensor_history_recorder.py -k only_monitored"),
    ("Stundenwerte zählen denselben Wechsel doppelt (zwei Anlagen mit demselben Sensor)", "sensor_history.py",
     "        if self._last.get(entity_id) == key:\n            return\n", "", "tests/test_sensor_history.py -k duplicates"),
    ("Stundenwerte älter als 30 Tage bleiben liegen", "sensor_history.py",
     "            self.data[entity_id] = {h: v for h, v in self.data[entity_id].items() if h >= limit}\n", "", "tests/test_sensor_history.py -k drop_hours"),
    ("Rückkehr aus \"nicht verfügbar\" zählt als Auslösung", "sensor_history.py", "            if old == STATE_OFF:\n                self._bucket(entity_id, _hour(when))[0] += 1\n",
     "            self._bucket(entity_id, _hour(when))[0] += 1\n", "tests/test_sensor_history.py -k duplicates"),
    ("Jeder Wechsel auf offen löst aus", "controller.py", "went_on = old.state == STATE_OFF and new.state == STATE_ON", "went_on = new.state == STATE_ON", "tests/test_security.py -k real_change"),
]


def main() -> int:
    killed, problems = 0, 0
    for name, file, old, new, tests in MUTATIONS:
        path = BASE / file
        original = path.read_text(encoding="utf-8")
        if old not in original:
            problems += 1
            print(f"FEHLT     {name}: Muster nicht mehr in {file}")
            continue
        path.write_text(original.replace(old, new, 1), encoding="utf-8")
        try:
            run = subprocess.run(f"{sys.executable} -m pytest -q --no-header -p no:cacheprovider -x {tests}", shell=True, capture_output=True, text=True, cwd=ROOT)
        finally:
            path.write_text(original, encoding="utf-8")
        detected = run.returncode != 0
        killed += detected
        problems += not detected
        print(f"{'ERKANNT  ' if detected else 'ÜBERSEHEN'} {name}")
    print(f"{killed} von {len(MUTATIONS)} erkannt")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
