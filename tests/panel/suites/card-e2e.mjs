// 1.34.0: Dashboard-Karten "Bedienteil" und "Status" (panel/card.js) im Nachbau eines Dashboards (sim/card-sim.html). Je Sprache, Desktop und
// Handy. Die Karten lesen nur Entitäten und rufen Dienste von HA auf; den Code prüft HA (der Nachbau liefert "Wrong code." bzw. "Falscher Code.").
import { check, done, launch, PORT } from "../lib.mjs";

const T = {
  de: { disarmed: "Deaktiviert", armedAway: "Abwesend scharf", off: "Aus", home: "Anwesend", away: "Abwesend", night: "Nacht", ready: "Bereit für", wrong: "Falscher Code.", ack: "Quittieren", ok: "Alles in Ordnung", offline: "1 nicht erreichbar", battery: "1 Batterie schwach", missing: "nicht gefunden", pick: "Alarmageddon: Bedienteil", alarm: "Alarm", delay: "Eingangsverzögerung" },
  en: { disarmed: "Disarmed", armedAway: "Armed away", off: "Off", home: "Home", away: "Away", night: "Night", ready: "Ready for", wrong: "Wrong code.", ack: "Acknowledge", ok: "All good", offline: "1 unreachable", battery: "1 low battery", missing: "not found", pick: "Alarmageddon: Control", alarm: "Alarm", delay: "Entry delay" },
};

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const t = T[lang];
    const size = mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1200, height: 800 } };
    const open = async (query = "") => {
      const ctx = await browser.newContext(size);
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      await page.goto(`http://127.0.0.1:${PORT}/card-sim.html?lang=${lang}&theme=dark${query}`);
      await page.waitForFunction(() => window.__ready, null, { timeout: 8000 });
      const ev = (code) => page.evaluate(new Function(`const root=(i)=>document.querySelectorAll('#dash > *')[i].shadowRoot; ${code}`));
      const tap = async (sel, i = 0) => {
        const h = await page.evaluateHandle(new Function(`return document.querySelectorAll('#dash > *')[${i}].shadowRoot.querySelector(${JSON.stringify(sel)})`));
        if (mobile) await h.asElement().tap(); else await h.asElement().click();
      };
      const waitFor = (code, timeout = 4000) => page.waitForFunction(new Function(`const root=(i)=>document.querySelectorAll('#dash > *')[i].shadowRoot; ${code}`), null, { timeout }).then(() => true, () => false);
      return { ctx, page, errors, ev, tap, waitFor };
    };

    // ----- "seit": die Zeit der Anlage, nicht die von HA (last_changed springt bei jedem Neustart von HA) -----
    {
      const s = await open();
      const shown = await s.page.evaluate(() => {
        const old = new Date("2026-01-01T03:07:00");
        window.__setState("alarm_control_panel.wohnung", "disarmed", { state_since: old.toISOString() });
        return old.toLocaleDateString(document.documentElement.lang || "en", { day: "numeric", month: "short" });
      });
      check(`${tag}: "seit" zeigt state_since der Anlage und nicht last_changed (Neustart von HA)`, await s.waitFor(`const x=root(0).querySelector('.ag-sys-sub').textContent; return x.includes(${JSON.stringify(shown.split(" ")[0].replace(".", ""))}) && !x.includes('${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}')`));
      await s.ctx.close();
    }

    // ----- Dunkles Thema: beide Karten tragen das Attribut "dark", sonst bleibt das Alarmband hell gestaltet -----
    {
      const s = await open();
      check(`${tag}: dunkles Thema: beide Karten tragen "dark"`, await s.ev("return [0, 1].every((i) => document.querySelectorAll('#dash > *')[i].hasAttribute('dark'))"));
      await s.ctx.close();
    }

    // ----- Anmeldung der Karten und Aussehen (deaktiviert, bereit) -----
    {
      const s = await open();
      check(`${tag}: beide Karten sind für den Karten-Dialog angemeldet`, await s.ev("return window.customCards.length === 2 && window.customCards.every((c) => c.preview && c.name && c.description) && window.customCards[0].name.startsWith('Alarmageddon')"));
      check(`${tag}: Bedienteil: Titel, "${t.disarmed}", Modi ohne Nacht, "${t.ready}" mit zwei Häkchen`, await s.ev(`const r=root(0); const x=r.innerHTML; return r.querySelector('h2').textContent === 'Alarmanlage Wohnung' && r.querySelector('.ag-sys-state').textContent === '${t.disarmed}' && [...r.querySelectorAll('.ag-seg > button')].map((b) => b.textContent.trim()).join() === '${t.off},${t.home},${t.away}' && r.querySelector('.ag-ready').textContent.includes('${t.ready}') && r.querySelectorAll('.ag-rchip.ok').length === 2`));
      check(`${tag}: die gewählte Fläche steht unter "${t.off}"`, await s.ev("const r=root(0); const on=r.querySelector('.ag-seg > button.on'); const p=r.querySelector('.ag-pill'); return !!p && on.textContent.trim() !== '' && Math.abs(new DOMMatrix(getComputedStyle(p).transform).m41 - on.offsetLeft) < 2 && p.offsetWidth === on.offsetWidth"));
      check(`${tag}: Status: "${t.ok}", grünes Häkchen`, await s.ev(`const r=root(1); return r.querySelector('.ag-status.ok h2').textContent === '${t.ok}'`));
      check(`${tag}: Administrator: Pfeil zum Panel da; Tippen öffnet /alarmageddon`, await s.ev("return !!root(0).querySelector('[data-act=\"panel\"]')") && (await (async () => { await s.tap('[data-act="panel"]'); return s.ev("return location.pathname === '/alarmageddon'"); })()));
      check(`${tag}: Karte ohne Überlauf nach rechts`, await s.ev("return document.documentElement.scrollWidth <= window.innerWidth + 1"));
      check(`${tag}: keine Fehler im Browser`, s.errors.length === 0, s.errors.join(" | "));
      await s.ctx.close();
    }
    // Nicht-Administrator: kein Pfeil; mit Nacht: vier Modi
    {
      const s = await open("&admin=0&night=1");
      check(`${tag}: kein Administrator: kein Pfeil zum Panel`, await s.ev("return !root(0).querySelector('[data-act=\"panel\"]')"));
      check(`${tag}: Nachtmodus in der Anlage: vier Knöpfe`, await s.ev("return root(0).querySelectorAll('.ag-seg > button').length === 4"));
      await s.ctx.close();
    }
    // ----- Scharf schalten ohne Code, Quittieren -----
    {
      const s = await open();
      await s.tap('.ag-seg [data-mode="away"]');
      check(`${tag}: Abwesend antippen ruft alarm_arm_away auf, ohne Code`, await s.waitFor("return window.__calls.length === 1") && await s.ev("const c=window.__calls[0]; return c.domain === 'alarm_control_panel' && c.service === 'alarm_arm_away' && c.data.entity_id === 'alarm_control_panel.wohnung' && !('code' in c.data)"));
      check(`${tag}: danach "${t.armedAway}", rote Kachel, "Bereit für" weg`, await s.waitFor(`const r=root(0); return r.querySelector('.ag-sys-state').textContent === '${t.armedAway}' && r.querySelector('.ag-sys').classList.contains('ag-armed') && !r.querySelector('.ag-ready')`));
      // Eingangsverzögerung mit Countdown, dann Alarm mit Band
      await s.page.evaluate(() => window.__setState("alarm_control_panel.wohnung", "pending", { arm_mode: "away", triggered_by: "binary_sensor.haustuer", deadline: new Date(Date.now() + 25000).toISOString(), armed_at: new Date(Date.now() - 3600e3).toISOString(), armed_by: "Marco" }));
      check(`${tag}: Eingangsverzögerung: Countdown und Auslöser`, await s.waitFor("const r=root(0); return /\\d:\\d\\d/.test(r.querySelector('[data-countdown]')?.textContent || '') && r.querySelector('.ag-sys-sub').textContent.includes('Haustür')"));
      await s.page.evaluate(() => window.__setState("alarm_control_panel.wohnung", "triggered", { arm_mode: "away", triggered_by: "binary_sensor.haustuer", deadline: null }));
      check(`${tag}: Alarm: rotes Band mit "${t.ack}" und Deaktivieren, Status zeigt den Alarm`, await s.waitFor(`const r=root(0); return !!r.querySelector('.ag-alarm') && r.querySelector('[data-act="ack"]').textContent.includes('${t.ack}') && !!r.querySelector('.ag-alarm [data-mode="off"]')`) && await s.page.evaluate(() => { window.__states["sensor.wohnung_status"].attributes.alarm = true; window.__setState("sensor.wohnung_status", "1", {}); return true; }) && await s.waitFor("return !!root(1).querySelector('.ag-status.warn .ag-mini.err')"));
      await s.tap('[data-act="ack"]');
      check(`${tag}: Quittieren ruft alarmageddon.acknowledge auf (ohne Code, jeder darf)`, await s.waitFor("return window.__calls.some((c) => c.domain === 'alarmageddon' && c.service === 'acknowledge')") && await s.ev("const c=window.__calls.at(-1); return c.data.entity_id === 'alarm_control_panel.wohnung' && !('code' in c.data)"));
      check(`${tag}: danach wieder scharf, das Band ist weg`, await s.waitFor("return !root(0).querySelector('.ag-alarm') && root(0).querySelector('.ag-sys').classList.contains('ag-armed')"));
      await s.ctx.close();
    }
    // ----- Code: Deaktivieren und Quittieren, Fehler, Fenster leeren -----
    {
      const s = await open("&code=1&ack=1");
      await s.page.evaluate(() => window.__setState("alarm_control_panel.wohnung", "armed_away", { arm_mode: "away" }));
      await s.waitFor("return root(0).querySelector('.ag-sys-state').textContent !== ''");
      await s.tap('.ag-seg [data-mode="off"]');
      check(`${tag}: Deaktivieren mit Code: Fenster, noch kein Aufruf`, await s.waitFor("return !!root(0).querySelector('dialog.ag-dlg')?.open") && await s.ev("return window.__calls.length === 0"));
      await s.page.keyboard.type("0000");
      await s.page.keyboard.press("Enter");
      check(`${tag}: falscher Code: "${t.wrong}" im Fenster, bleibt offen, Zustand unverändert`, await s.waitFor(`const d=root(0).querySelector('dialog.ag-dlg'); return d.open && d.querySelector('.ag-dlg-err').textContent === '${t.wrong}'`) && await s.ev("return root(0).querySelector('.ag-sys').classList.contains('ag-armed')"));
      await s.ev("root(0).querySelector('dialog.ag-dlg input').value = ''; return 1");
      await s.page.keyboard.type("1234");
      await s.page.keyboard.press("Enter");
      check(`${tag}: richtiger Code: alarm_disarm mit Code, Fenster zu, deaktiviert`, await s.waitFor(`const r=root(0); return !r.querySelector('dialog.ag-dlg')?.open && r.querySelector('.ag-sys-state').textContent === '${t.disarmed}'`) && await s.ev("const c=window.__calls.at(-1); return c.service === 'alarm_disarm' && c.data.code === '1234'"));
      check(`${tag}: der Code bleibt nach dem Schliessen nirgends stehen`, await s.ev("const d=root(0).querySelector('dialog.ag-dlg'); return !d || [...d.querySelectorAll('input')].every((i) => i.value === '')"));
      // Quittieren verlangt den Code (Einstellung der Anlage)
      await s.page.evaluate(() => window.__setState("alarm_control_panel.wohnung", "triggered", { arm_mode: "away", triggered_by: "binary_sensor.haustuer" }));
      await s.waitFor("return !!root(0).querySelector('[data-act=\"ack\"]')");
      await s.tap('[data-act="ack"]');
      check(`${tag}: Quittieren mit eingeschalteter Einstellung: Code-Fenster statt Aufruf`, await s.waitFor("return !!root(0).querySelector('dialog.ag-dlg')?.open") && await s.ev("return !window.__calls.some((c) => c.service === 'acknowledge')"));
      await s.page.keyboard.type("1234");
      await s.page.keyboard.press("Enter");
      check(`${tag}: richtiger Code quittiert`, await s.waitFor("return window.__calls.some((c) => c.service === 'acknowledge' && c.data.code === '1234') && !root(0).querySelector('.ag-alarm')"));
      await s.ctx.close();
    }
    // ----- Offene Sensoren, Status mit Warnungen, fehlende Entität, Fehler eines Dienstes -----
    {
      const s = await open("&status=warn&missing=1");
      await s.page.evaluate(() => { window.__states["binary_sensor.wohnung_ready_to_arm_away"].attributes.blocking_sensors = ["binary_sensor.garagentor"]; window.__setState("binary_sensor.wohnung_ready_to_arm_away", "off", {}); });
      check(`${tag}: ein offener Sensor sperrt "${t.away}": Warnzeichen und "Garagentor"`, await s.waitFor("const r=root(0); return r.querySelectorAll('.ag-rchip.no').length === 1 && r.querySelector('.ag-ready').parentElement.textContent.includes('Garagentor')"));
      check(`${tag}: Status: zwei Warnungen mit den Namen der Sensoren`, await s.ev(`const r=root(1); const x=r.textContent; return !!r.querySelector('.ag-status.warn') && x.includes('${t.offline}') && x.includes('Fenster Bad') && x.includes('${t.battery}') && x.includes('Haustür')`));
      check(`${tag}: unbekannte Entität: Hinweis "${t.missing}" statt eines Fehlers`, await s.ev(`return root(2).textContent.includes('${t.missing}')`));
      await s.page.evaluate(() => { window.__fail = new Error("Kaputt"); });
      await s.tap('.ag-seg [data-mode="home"]');
      check(`${tag}: scheitert der Dienst: Hinweis, die Kapsel steht wieder nach dem echten Zustand`, await s.waitFor("const r=root(0); return !!r.querySelector('.ag-toast') && r.querySelector('.ag-seg > button.on')?.dataset.mode === 'off'"));
      check(`${tag}: keine Fehler im Browser`, s.errors.length === 0, s.errors.join(" | "));
      await s.ctx.close();
    }
  }
}
await browser.close();
done();
