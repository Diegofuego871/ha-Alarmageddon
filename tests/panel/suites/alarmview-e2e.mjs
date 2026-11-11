// 1.11.0: Ansicht während eines Alarms und das Protokoll.
// - Kachel und Alarmband im selben Rot wie "scharf" (Verlauf, roter Rand); die Kachel nennt, was ausgelöst hat, und in einer eigenen
//   Zeile, seit wann und von wem scharf geschaltet wurde (vorher "Alarm · seit 07:16 · Diego", als hätte Diego ausgelöst).
// - Protokoll: die Verbindung der Schritte läuft nie hinter oder über einem Symbol; ein laufender Alarm lädt jede Sekunde nach;
//   auf dem Handy stehen "von" und "bis" gleich breit nebeneinander unter der Auswahl des Zeitraums.
import { check, done, launch, open, outDir } from "../lib.mjs";

const HAUS = "alarm_control_panel.haus";
const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    for (const theme of ["light", "dark"]) {
      if (theme === "dark" && lang === "en") continue; // das dunkle Design einmal je Gerät genügt
      const tag = `${lang}/${mobile ? "Handy" : "Desktop"}/${theme === "dark" ? "dunkel" : "hell"}`;
      const s = await open(browser, { mobile, lang, theme, query: "&alarm=open" }); // mit einem laufenden Alarm im Protokoll
      await s.waitFor("return !!r.querySelector('[data-system=\"e_haus\"] .ag-sys-state')");
      const armedText = await s.ev("return r.querySelector('[data-system=\"e_haus\"] .ag-sys-state').textContent.trim()");
      const trigger = (attrs) => s.sim(`window.__setState("${HAUS}", "triggered", Object.assign({ arm_mode: "away", changed_by: "Diego", armed_by: "Diego", armed_at: new Date(Date.now() - 1800e3).toISOString(), triggered_by: "binary_sensor.haustuer", deadline: null }, ${JSON.stringify(attrs || {})}))`);
      const tile = () => s.ev(`const t=r.querySelector('[data-system="e_haus"]'); const subs=[...t.querySelectorAll('.ag-sys-sub')]; return { alarmed: t.classList.contains('ag-alarmed') && t.classList.contains('ag-armed'), state: t.querySelector('.ag-sys-state').textContent.trim(), first: subs[0]?.innerText.trim() || '', armed: t.querySelector('.ag-sys-armed')?.innerText.trim() || '', icon: !!t.querySelector('.ag-sys-armed svg') }`);

      // ----- Alarm bei scharfer Anlage -----
      await trigger();
      await s.waitFor("return !!r.querySelector('.ag-alarm')");
      const t1 = await tile();
      check(`${tag}: Kachel im Alarm: erste Zeile nennt Zeit und Auslöser, nicht wer scharf geschaltet hat`, t1.alarmed && /\d\d:\d\d/.test(t1.first) && t1.first.includes("Haustür") && !t1.first.includes("Diego"), JSON.stringify(t1));
      check(`${tag}: zweite Zeile: "${armedText}" mit Zeit und Name (mit Symbol des Modus)`, t1.armed.startsWith(armedText) && /\d\d:\d\d/.test(t1.armed) && t1.armed.endsWith("Diego") && t1.icon, JSON.stringify(t1));
      const look = await s.ev(`const probe=document.createElement('i'); probe.style.color='var(--ag-error)'; r.appendChild(probe); const err=getComputedStyle(probe).color; probe.remove(); const band=r.querySelector('.ag-alarm'), t=r.querySelector('[data-system="e_haus"]'); const bb=band.getBoundingClientRect(), tb=t.getBoundingClientRect(); const cs=getComputedStyle(band), ts=getComputedStyle(t);
        return { err, band: cs.backgroundImage.slice(0, 16), flat: cs.backgroundColor, ring: cs.boxShadow.includes('0px 0px 0px 1px'), tile: ts.backgroundImage.slice(0, 16), border: ts.borderTopColor, gap: Math.round(tb.top - bb.bottom), text: cs.color, below: tb.top >= bb.bottom }`);
      check(`${tag}: Alarmband und Kachel im selben Rot: beide mit Verlauf und rotem Rand (keine flache Fläche mehr)`, look.band.startsWith("linear-gradient") && look.ring && look.tile.startsWith("linear-gradient") && look.border === look.err && look.text === "rgb(255, 255, 255)", JSON.stringify(look));
      check(`${tag}: zwischen Alarmband und Kachel bleibt ein Abstand`, look.below && look.gap >= 8, JSON.stringify(look));
      await s.page.screenshot({ path: `${outDir}alarmview-${lang}-${mobile ? "mobile" : "desktop"}-${theme}.png` });

      if (theme === "light") {
        // Älterer Stand ohne Zeit: der Name bleibt; Alarm von Hand aus "deaktiviert": keine zweite Zeile, wer ausgelöst hat steht in der ersten
        await trigger({ armed_at: null, armed_by: null });
        await s.waitFor("return !/\\d\\d:\\d\\d/.test(r.querySelector('[data-system=\"e_haus\"] .ag-sys-armed')?.innerText || '00:00')");
        const t2 = await tile();
        check(`${tag}: ohne gespeicherte Zeit: "${armedText} · Diego"`, t2.armed === `${armedText} · Diego`, JSON.stringify(t2));
        await trigger({ arm_mode: null, triggered_by: null, armed_at: null, armed_by: null });
        await s.waitFor("return !r.querySelector('[data-system=\"e_haus\"] .ag-sys-armed')");
        const t3 = await tile();
        check(`${tag}: Alarm von Hand ohne scharfe Anlage: keine zweite Zeile, der Name steht in der ersten`, t3.armed === "" && t3.first.includes("Diego"), JSON.stringify(t3));

        // ----- Protokoll -----
        await s.tap('[data-tab="log"]');
        await s.waitFor("return r.querySelectorAll('.ag-seq-item').length >= 3");
        const seq = await s.ev(`const list=r.querySelector('.ag-seq'); const items=[...list.querySelectorAll('.ag-seq-item')]; const whole=getComputedStyle(list, '::before').content;
          const rows=items.map((li, i) => { const box=li.getBoundingClientRect(), ic=li.querySelector('.ag-mini').getBoundingClientRect(); const b=getComputedStyle(li, '::before'), a=getComputedStyle(li, '::after'); const px=(v) => parseFloat(v) || 0;
            return { i, up: b.display === 'none' ? null : { end: box.top + px(b.top) + px(b.height), x: box.left + px(b.left) + px(b.width) / 2 }, down: a.display === 'none' ? null : { start: box.bottom - px(a.bottom) - px(a.height), x: box.left + px(a.left) + px(a.width) / 2 }, top: ic.top, bottom: ic.bottom, mid: ic.left + ic.width / 2 }; });
          return { whole, n: rows.length, rows }`);
        const clear = seq.rows.every((x) => (!x.up || (x.up.end <= x.top - 1 && Math.abs(x.up.x - x.mid) <= 1)) && (!x.down || (x.down.start >= x.bottom + 1 && Math.abs(x.down.x - x.mid) <= 1)));
        const ends = seq.rows[0].up === null && seq.rows.at(-1).down === null && seq.rows.slice(1).every((x) => x.up) && seq.rows.slice(0, -1).every((x) => x.down);
        check(`${tag}: Protokoll: keine durchgehende Linie mehr; jedes Linienstück endet vor dem Symbol und liegt auf seiner Achse`, (seq.whole === "none" || seq.whole === "normal") && clear, JSON.stringify(seq.rows.slice(0, 3)));
        check(`${tag}: Protokoll: über dem ersten und unter dem letzten Symbol steht kein Linienstück, dazwischen ist alles verbunden`, ends && seq.n >= 3);
        await s.page.screenshot({ path: `${outDir}alarmview-log-${lang}-${mobile ? "mobile" : "desktop"}.png` });

        // Laufender Alarm: jede Sekunde nachladen (vorher alle 5 Sekunden); ohne laufenden Alarm bleibt es bei 5 Sekunden
        const countLog = () => s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/log').length");
        const running = await s.ev("return r.host.log._running()");
        const before = await countLog();
        await s.page.waitForTimeout(3300);
        const during = (await countLog()) - before;
        check(`${tag}: laufender Alarm im Protokoll: lädt jede Sekunde nach (${during} Abfragen in 3,3 s)`, running && during >= 3 && during <= 5, `running=${running} calls=${during}`);
        await s.ev("r.host.log._running = () => false; return 1");
        await s.page.waitForTimeout(1300);
        const idle0 = await countLog();
        await s.page.waitForTimeout(3300);
        check(`${tag}: ohne laufenden Alarm: weiterhin alle 5 Sekunden`, (await countLog()) - idle0 <= 1, String((await countLog()) - idle0));

        // Zeitraum wählen: "von" und "bis"
        await s.ev("const sel=r.querySelector('[data-log=\"range\"]'); sel.value='span'; sel.dispatchEvent(new Event('change', { bubbles: true })); return 1");
        await s.waitFor("return r.querySelectorAll('.ag-log-tools .ag-date').length === 2");
        const d = await s.ev("const sel=r.querySelector('[data-log=\"range\"]').getBoundingClientRect(); const [a, b]=[...r.querySelectorAll('.ag-log-tools .ag-date')].map((x) => x.getBoundingClientRect()); return { sel: [Math.round(sel.left), Math.round(sel.right), Math.round(sel.bottom)], a: [Math.round(a.left), Math.round(a.right), Math.round(a.top), Math.round(a.width)], b: [Math.round(b.left), Math.round(b.right), Math.round(b.top), Math.round(b.width)], vw: innerWidth }");
        if (mobile) check(`${tag}: Handy: Auswahl in der ersten Zeile über die ganze Breite, "von" und "bis" darunter nebeneinander und gleich breit`, d.a[2] >= d.sel[2] && d.a[2] === d.b[2] && Math.abs(d.a[3] - d.b[3]) <= 2 && d.b[1] <= d.vw - 8 && d.sel[1] - d.sel[0] >= d.vw - 40 && d.a[3] >= 120, JSON.stringify(d));
        else check(`${tag}: Desktop: Auswahl und beide Datumsfelder in einer Zeile`, d.a[2] < d.sel[2] && d.a[2] === d.b[2] && d.a[0] >= d.sel[1], JSON.stringify(d));
        await s.page.screenshot({ path: `${outDir}alarmview-dates-${lang}-${mobile ? "mobile" : "desktop"}.png` });
      }
      check(`${tag}: kein Überlauf, keine Fehler im Browser`, (await s.ev("return document.documentElement.scrollWidth <= window.innerWidth")) && s.errors.length === 0, s.errors.join(" | "));
      await s.ctx.close();
    }
  }
}
await browser.close();
done();
