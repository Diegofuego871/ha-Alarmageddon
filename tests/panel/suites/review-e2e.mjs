// 0.40.0 (Code-Review): das Panel rechnet "Bereit für" wie die Anlage (Umgehen, Werte je Modus), die Sensorliste kennt
// "Immer aktiv" aus den Einstellungen je Modus, Meldungen zeigen mit dem Schalter "pro Modus" auch die Arten ohne Modus,
// Verbindungsfehler lassen die Daten stehen, der CSV-Export entschärft Formelzellen, das Protokoll fragt mit dem Stand
// der letzten Antwort. Je Sprache auf Desktop und Handy.
import { readFileSync } from "node:fs";
import { check, done, launch, open, outDir } from "../lib.mjs";

const T = {
  de: { open: "Garagentor ist offen", allModes: "Für alle Modi", conn: "Keine Verbindung zu Home Assistant", failed: "Das hat nicht geklappt", water: "Wassermelder Keller" },
  en: { open: "Garagentor is open", allModes: "For all modes", conn: "No connection to Home Assistant", failed: "That did not work", water: "Wassermelder Keller" },
};
const GARAGE = "binary_sensor.garagentor";
const WATER = "binary_sensor.wasser_keller";

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const t = T[lang];

    // ----- Übersicht: "Bereit für" wie die Anlage -----
    {
      const s = await open(browser, { mobile, lang });
      const refetch = async () => {
        await s.frame.evaluate(() => document.querySelector("alarmageddon-panel")._fetch());
        await s.page.waitForTimeout(150);
      };
      const ready = () => s.ev(`return [...r.querySelectorAll('[data-system="e_garage"] .ag-rchip')].map((c) => c.classList.contains("ok"))`);
      const card = () => s.ev(`return r.querySelector('[data-system="e_garage"]').innerText`);
      check(`${tag}: offenes Garagentor verhindert beide Modi`, JSON.stringify(await ready()) === "[false,false]" && (await card()).includes(t.open), JSON.stringify(await ready()));
      // Umgehen: die Anlage würde scharf schalten und den Sensor übergehen, also ist sie bereit
      await s.sim(`window.__systems[1].sensor_options = { "${GARAGE}": { bypass: true } }`);
      await refetch();
      check(`${tag}: mit "Umgehen" ist die Anlage bereit, das Tor gilt nicht als Hindernis`, JSON.stringify(await ready()) === "[true,true]" && !(await card()).includes(t.open), await card());
      // Werte je Modus: "darf offen sein" nur in "Abwesend"
      await s.sim(`const g = window.__systems[1]; g.sensor_options = {}; g.per_mode_sensors = true; g.sensor_modes = { away: { "${GARAGE}": { open_ok: true } } }`);
      await refetch();
      check(`${tag}: Wert je Modus zählt nur in seinem Modus (Anwesend nein, Abwesend ja)`, JSON.stringify(await ready()) === "[false,true]" && (await card()).includes(t.open), JSON.stringify(await ready()));
      // Schalter aus: die Werte je Modus gelten nicht
      await s.sim(`window.__systems[1].per_mode_sensors = false`);
      await refetch();
      check(`${tag}: ohne Schalter gelten die Werte je Modus nicht`, JSON.stringify(await ready()) === "[false,false]", JSON.stringify(await ready()));
      // Fehlermeldung beim Scharfschalten nennt das Hindernis des gewählten Modus
      // ----- Sensorliste: "Immer aktiv" aus dem Reiter "Immer aktiv" -----
      const row = () => s.ev(`return !!r.querySelector('.ag-ov-list [data-entity="${WATER}"]')`);
      check(`${tag}: Wassermelder ohne Zone und ohne eigenen Wert steht in der Liste (Voreinstellung der Art: immer aktiv)`, await row());
      await s.sim(`for (const sys of window.__systems) sys.sensor_options = { "${WATER}": { always: false } }`);
      await refetch();
      check(`${tag}: mit eigenem Wert "Immer aktiv" aus steht er nicht in der Liste`, !(await row()));
      await s.sim(`for (const h of window.__systems) { h.per_mode_sensors = false; h.sensor_modes = {} } const h0 = window.__systems[0]; h0.per_mode_sensors = true; h0.sensor_modes = { always: { "${WATER}": { always: true } } }`);
      await refetch();
      check(`${tag}: "Immer aktiv" aus dem Reiter "Immer aktiv" bringt ihn zurück in die Liste`, await row());
      await s.sim(`window.__systems[0].per_mode_sensors = false`);
      await refetch();
      check(`${tag}: ohne Schalter zählt der Bereich nicht (der eigene Wert "aus" gilt wieder)`, !(await row()));
      await s.sim(`for (const sys of window.__systems) sys.sensor_options = {}`);
      await refetch();
      check(`${tag}: "Immer aktiv" ausgeschaltet: der Wassermelder steht nicht mehr in der Liste`, await (async () => {
        await s.sim(`for (const sys of window.__systems) sys.always_enabled = false`);
        await refetch();
        const off = !(await row());
        await s.sim(`for (const sys of window.__systems) sys.always_enabled = true`);
        await refetch();
        return off && (await row());
      })());
      await refetch();

      // ----- Verbindungsfehler: Daten bleiben, Hinweis statt "[object Object]" -----
      const cards = () => s.ev("return r.querySelectorAll('.ag-sys[data-system]').length");
      const toast = () => s.ev("return r.querySelector('.ag-toast')?.textContent || ''");
      const before = await cards();
      for (const [name, failure] of [["Zahl 3", "3"], ["Objekt ohne Text", "{ code: 3 }"], ["Text", "new Error('connection lost')"]]) {
        await s.sim(`window.__wsFail = ${failure}`);
        await s.ev("r.querySelector('.ag-toast')?.remove(); document.querySelector('alarmageddon-panel')._connError = false");
        await refetch();
        const text = await toast();
        check(`${tag}: Verbindungsfehler (${name}): Hinweis, Anlagen bleiben stehen`, text.includes(t.conn) && !text.includes("[object") && (await cards()) === before, text);
      }
      await s.sim(`window.__wsFail = Object.assign(new Error("kaputt"), { code: "boom" })`);
      await s.ev("r.querySelector('.ag-toast')?.remove()");
      await refetch();
      check(`${tag}: anderer Fehler: Meldung mit dem Text des Fehlers, Anlagen bleiben stehen`, (await toast()).includes(t.failed) && (await toast()).includes("kaputt") && (await cards()) === before, await toast());
      await s.page.screenshot({ path: `${outDir}review-overview-${lang}-${mobile ? "mobile" : "desktop"}.png` });
      check(`${tag}: Übersicht ohne Fehler im Browser`, s.errors.length === 0, s.errors.join(" | "));
      await s.ctx.close();
    }

    // ----- Meldungen: Schalter "pro Modus" lässt keine Art verschwinden -----
    {
      const s = await open(browser, { mobile, lang, tab: "config" });
      await s.tap('[data-sub="notify"]');
      check(`${tag}: Meldungen offen`, await s.waitFor("return !!r.querySelector('.ag-nt [data-nt=\"permode\"]')"));
      await s.page.waitForTimeout(500);
      const kinds = () => s.ev(`return [...r.querySelectorAll('.ag-nt [data-nt="enabled"]')].map((b) => b.dataset.kind + (b.dataset.mode ? ":" + b.dataset.mode : ""))`);
      const all = ["sensor_report", "sensor_offline", "pending", "arm_failed", "armed", "disarmed", "battery_low", "sensor_unavailable"];
      const off = await kinds();
      check(`${tag}: Schalter aus: eine Liste mit allen Arten, ohne Modus`, all.every((k) => off.includes(k)) && off.every((k) => !k.includes(":")) && off.length === all.length, off.join(","));
      await s.tap('[data-nt="permode"]');
      await s.page.waitForTimeout(400);
      const on = await kinds();
      const mode = on.find((k) => k.startsWith("pending:"))?.split(":")[1];
      check(`${tag}: Schalter ein: die vier Arten des scharfen Zustands je Modus`, Boolean(mode) && ["sensor_report", "sensor_offline", "pending", "armed"].every((k) => on.includes(`${k}:${mode}`)), on.join(","));
      check(`${tag}: Schalter ein: "Scharfschalten nicht möglich" und "Deaktiviert" bleiben einstellbar (ohne Modus)`, on.includes("arm_failed") && on.includes("disarmed"), on.join(","));
      check(`${tag}: Schalter ein: keine Art fehlt, keine doppelt`, on.length === all.length && new Set(on).size === on.length, on.join(","));
      check(`${tag}: die Arten ohne Modus stehen unter "Für alle Modi"`, await s.ev(`return r.querySelector('.ag-nt').innerText.includes(${JSON.stringify(t.allModes)})`));
      // Eine der beiden einschalten und speichern: der Wert kommt beim Server an
      await s.tap('[data-nt="enabled"][data-kind="disarmed"]');
      await s.page.waitForTimeout(200);
      await s.tap('[data-nt="save"]');
      await s.page.waitForTimeout(500);
      const saved = await s.sim(`const c = window.__calls.filter((x) => x.type === "alarmageddon/save_notify").pop(); return c ? { per: c.notify.per_mode, on: c.notify.types.disarmed.enabled } : null`);
      check(`${tag}: gespeichert mit Schalter und eingeschaltetem "Deaktiviert"`, saved && saved.per === true && saved.on === true, JSON.stringify(saved));
      await s.tap('[data-nt="permode"]');
      await s.page.waitForTimeout(400);
      const back = await kinds();
      check(`${tag}: Schalter wieder aus: wieder die eine Liste`, back.length === all.length && back.every((k) => !k.includes(":")), back.join(","));
      await s.page.screenshot({ path: `${outDir}review-notify-${lang}-${mobile ? "mobile" : "desktop"}.png` });
      check(`${tag}: kein Überlauf`, await s.ev("return document.documentElement.scrollWidth <= window.innerWidth"));
      check(`${tag}: Meldungen ohne Fehler im Browser`, s.errors.length === 0, s.errors.join(" | "));
      await s.ctx.close();
    }

    // ----- Aktionen: ein Ton "bis zum Deaktivieren" läuft immer nebenher -----
    {
      const s = await open(browser, { mobile, lang, tab: "config" });
      // Ablauf "Abwesend": endloser Ton, als "abwarten" gespeichert (ältere Fassung), danach die Sirene
      await s.sim(`window.__systems[0].workflows = { away: [
        { type: "sound", players: ["media_player.sonos_wohnzimmer"], sound: "siren", volume: 0.7, duration: 0, restore: true },
        { type: "action", action: "siren.turn_on", target: ["siren.flur"], data: {}, restore: true } ] }`);
      await s.frame.evaluate(() => document.querySelector("alarmageddon-panel")._fetch());
      await s.tap('[data-sub="actions"]');
      check(`${tag}: Aktionen offen`, await s.waitFor("return r.querySelectorAll('.ag-wf-step').length === 2"));
      await s.page.waitForTimeout(500);
      const chip = (i) => s.ev(`const b=r.querySelector('.ag-wf-step[data-index="${i}"] [data-wf="flow"]'); return { par: b.classList.contains("par"), disabled: b.disabled, checked: b.getAttribute("aria-checked") }`);
      const sound = await chip(0);
      check(`${tag}: endloser Ton zeigt "läuft nebenher" und lässt sich nicht auf "abwarten" stellen`, sound.par && sound.disabled && sound.checked === "true", JSON.stringify(sound));
      check(`${tag}: die Verbindung zum nächsten Schritt ist gestrichelt (startet sofort)`, await s.ev("return r.querySelectorAll('.ag-wf-plus')[1].classList.contains('par')"));
      const siren = await chip(1);
      check(`${tag}: der Schritt danach bleibt umschaltbar`, !siren.disabled && !siren.par, JSON.stringify(siren));
      // Speichern (nach einer Änderung am zweiten Schritt): der Ton geht als "nicht abwarten" an den Server
      await s.tap('.ag-wf-step[data-index="1"] [data-wf="flow"]');
      await s.page.waitForTimeout(200);
      await s.ev(`r.querySelector('.ag-wf-step[data-index="0"] [data-wf="edit"]').click()`);
      await s.page.waitForTimeout(300);
      const row = await s.ev(`const t=r.querySelector('#ag-step [data-wf="detach"]'); return { on: t.classList.contains("on"), disabled: t.disabled }`);
      check(`${tag}: im Editor ist "Nicht abwarten" an und fest`, row.on && row.disabled, JSON.stringify(row));
      await s.ev(`r.querySelector('#ag-step [data-wf="apply"]').click()`);
      await s.page.waitForTimeout(300);
      await s.tap('[data-wf="save"]');
      await s.page.waitForTimeout(500);
      const saved = await s.sim(`const c = window.__calls.filter((x) => x.type === "alarmageddon/save_workflows").pop(); return c ? c.workflows.away.map((x) => [x.type, x.duration ?? null, x.detach === true]) : null`);
      check(`${tag}: gespeichert: Ton mit Dauer 0 und "nicht abwarten"`, saved && saved[0][0] === "sound" && saved[0][1] === 0 && saved[0][2] === true, JSON.stringify(saved));
      check(`${tag}: Aktionen ohne Fehler im Browser`, s.errors.length === 0, s.errors.join(" | "));
      await s.ctx.close();
    }

    // ----- Protokoll: Stand der letzten Antwort, CSV ohne Formelzellen -----
    {
      const s = await open(browser, { mobile, lang, tab: "log" });
      await s.waitFor("return r.querySelectorAll('.ag-log .ag-row').length > 0");
      const reload = async () => {
        await s.frame.evaluate(() => document.querySelector("alarmageddon-panel").log.load());
        await s.page.waitForTimeout(200);
      };
      const rows = () => s.ev("return r.querySelectorAll('.ag-log .ag-row').length");
      const alarms = () => s.ev("return r.querySelectorAll('.ag-inc').length");
      const calls = () => s.sim(`return window.__calls.filter((c) => c.type === "alarmageddon/log").map((c) => c.rev || null)`);
      const n = await rows();
      await reload();
      const sent = await calls();
      check(`${tag}: erste Abfrage ohne Stand, die nächste mit dem Stand der Antwort`, sent[0] === null && typeof sent[sent.length - 1] === "string" && sent[sent.length - 1].length > 0, JSON.stringify(sent));
      check(`${tag}: Antwort "unverändert": Ereignisse und Alarme bleiben stehen`, (await rows()) === n && n > 0 && (await alarms()) > 0, `${await rows()} / ${n}`);
      // Neues Ereignis (mit einer Person, deren Name wie eine Formel beginnt): der Stand ändert sich, die Liste wächst
      await s.sim(`window.__systems[0].events.unshift({ t: new Date().toISOString(), state: "disarmed", mode: null, by: '=HYPERLINK("http://boese.example";"Klick")' })`);
      await reload();
      check(`${tag}: neues Ereignis erscheint (neuer Stand, ganze Antwort)`, (await rows()) === n + 1, `${await rows()} / ${n + 1}`);
      const [csv] = await Promise.all([s.page.waitForEvent("download", { timeout: 5000 }), s.tap('[data-log="export-csv"]')]);
      const text = readFileSync(await csv.path(), "utf8");
      check(`${tag}: CSV: die Formelzelle beginnt mit einem Hochkomma`, text.includes(`"'=HYPERLINK(`), text.slice(0, 300));
      check(`${tag}: CSV: keine Zelle beginnt mit = + - oder @`, !/(^|;)"[=+\-@]/m.test(text.replace(/^\ufeff/, "")));
      check(`${tag}: Protokoll ohne Fehler im Browser`, s.errors.length === 0, s.errors.join(" | "));
      await s.ctx.close();
    }
  }
}
await browser.close();
done();
