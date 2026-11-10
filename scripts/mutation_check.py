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
    ("Eigene Empfänger einer Meldung werden ignoriert", "notify.py", "async_send(self.hass, targets or self._targets(kind), build_payload(", "async_send(self.hass, self._targets(kind), build_payload(",
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
    ("Schalter \"Immer aktiv ignorieren\" macht auch Sensoren ausserhalb der Zone stumm", "controller.py",
     "return self.mode is not None and entity_id in self.zone(self.mode) and self.option(", "return self.mode is not None and self.option(",
     "tests/test_always_active.py -k not_apply_where"),
    ("Schalter \"Immer aktiv ignorieren\" wirkt nicht", "controller.py",
     "and self.state != AlarmControlPanelState.TRIGGERED and not self.always_ignored(entity):", "and self.state != AlarmControlPanelState.TRIGGERED:",
     "tests/test_always_active.py -k ignore_switch_leaves"),
    ("Immer aktiv ohne Zone und ohne eigenen Wert wird nicht beachtet (Rauchmelder nur in der Liste)", "controller.py",
     'known = {e for m in self.modes for e in self.zone(m)} | set(self.options.get(CONF_SENSORS) or []) | set(self.sensor_overrides)', 'known = {e for m in self.modes for e in self.zone(m)} | set(self.sensor_overrides)',
     "tests/test_always_active.py -k smoke_detector_by_type_default"),
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
    ("Test verschluckt echten Alarm", "workflow.py", 'if self._run is not None and not test and self._run.get("test"):', "if False:", "tests/test_hardening.py -k interrupts"),
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
     'return bool(step.get("detach")) or (step.get("type") == "sound" and step.get("duration") == 0)', 'return bool(step.get("detach"))', "tests/test_action_hang.py -k until_disarmed"),
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
    ("Wächter: ein abgebrochener Ablauf macht nicht weiter", "workflow.py", "            self._spawn(run, self._position + 1)\n", "            pass\n", "tests/test_action_hang.py -k 'flow_that_dies'"),
    ("Alarm im Test: das Zurückstellen des Tests wird abgewartet", "workflow.py", '                await self._watched(self._end_test(), SNAPSHOT_TIMEOUT, "test")\n', "                await self.async_stop()\n",
     "tests/test_action_hang.py -k 'during_a_test'"),
    ("Alarm im Test: der Schnappschuss des Tests geht verloren", "workflow.py", 'run["snapshot"] = {**self._snapshot(entities), **before}', 'run["snapshot"] = self._snapshot(entities)',
     "tests/test_action_hang.py -k 'during_a_test'"),
    ("Stopp löscht den Stand eines neueren Laufs", "workflow.py", "        run, self._run = self._run, None\n        await self._cancel_task()\n        if run:",
     "        await self._cancel_task()\n        run, self._run = self._run, None\n        if run:", "tests/test_action_hang.py -k 'slow_stop'"),
    ("Wächter verkürzt eine vom Nutzer eingestellte Wartezeit", "workflow.py",
     '        return max(0, int(step.get("seconds", 0) or 0)) + WATCHDOG_GRACE\n', "        return WATCHDOG_GRACE\n", "tests/test_duration.py -k 'never_cuts or not_fixed'"),
    ("Eingestellte Dauer beginnt nach Neuladen oder Neustart von vorn", "workflow.py",
     '        if isinstance(saved, dict) and saved.get("index") == self._position:\n', "        if False:\n", "tests/test_duration.py -k 'reload or restart'"),
    ("Eingestellte Wartezeit wird nicht eingehalten", "workflow.py",
     "            await self._sleep(self._remaining(seconds) if resumable else seconds)\n", "            await self._sleep(min(1, seconds))\n", "tests/test_duration.py -k 'exactly_as_long'"),
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
