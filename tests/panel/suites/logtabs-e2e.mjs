// 1.13.0: Protokoll mit zwei Reitern ("Alarme" gewählt, "Alle Ereignisse"), "Weitere anzeigen" für lange Listen und das Löschen
// eines einzelnen Alarms nach Rückfrage. Zeitraum und Anlage gelten für beide Reiter. Je Sprache auf Desktop und Handy.
import { check, done, launch, open, outDir } from "../lib.mjs";

const T = {
  de: { alarms: "Alarme", events: "Alle Ereignisse", del: "Alarm löschen", title: "Diesen Alarm löschen?", ok: "Löschen", more: "Weitere 200 anzeigen" },
  en: { alarms: "Alarms", events: "All events", del: "Delete alarm", title: "Delete this alarm?", ok: "Delete", more: "Show 200 more" },
};

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const t = T[lang];
    const s = await open(browser, { mobile, lang, tab: "log", query: "&alarm=open" });
    await s.waitFor("return r.querySelectorAll('.ag-inc').length === 2");
    const tabs = () => s.ev("return [...r.querySelectorAll('.ag-log-seg [data-log=\"pane\"]')].map((b) => ({ label: b.querySelector('span').textContent, n: Number(b.querySelector('.ag-log-n').textContent), on: b.classList.contains('on'), sel: b.getAttribute('aria-selected') }))");
    const panes = () => s.ev("const a=r.querySelector('[data-pane=\"alarms\"].ag-log-pane'), e=r.querySelector('[data-pane=\"events\"].ag-log-pane'); return { alarms: !a.hidden && a.getBoundingClientRect().height > 0, events: !e.hidden && e.getBoundingClientRect().height > 0, cards: a.querySelectorAll('.ag-inc').length, rows: e.querySelectorAll('.ag-log .ag-row').length }");
    const reload = () => s.ev("r.host.log.rev = null; return r.host.log.load().then(() => 1)");
    const deletes = () => s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/delete_recording').map((c) => [c.entry_id, c.recording])");

    // ----- Reiter -----
    const t0 = await tabs();
    const p0 = await panes();
    check(`${tag}: zwei Reiter, "${t.alarms}" gewählt, mit der Anzahl im Zeitraum`, t0.length === 2 && t0[0].label === t.alarms && t0[1].label === t.events && t0[0].on && t0[0].sel === "true" && !t0[1].on && t0[0].n === 2 && t0[1].n === p0.rows && p0.rows >= 3, JSON.stringify([t0, p0]));
    check(`${tag}: zu sehen sind nur die Alarme; die Ereignisse stehen nicht mehr darunter`, p0.alarms && !p0.events && p0.cards === 2, JSON.stringify(p0));
    const place = await s.ev("const seg=r.querySelector('.ag-log-seg').getBoundingClientRect(); const bar=r.querySelector('.ag-log-panes'); const main=r.querySelector('.ag-tabs').getBoundingClientRect(); const sel=r.querySelector('[data-log=\"range\"]').getBoundingClientRect(); return { underMain: seg.top >= main.bottom, abovePeriod: seg.bottom <= sel.top, cfg: bar.classList.contains('ag-cfg') && bar.classList.contains('ag-stk'), sticky: getComputedStyle(bar).position, top: Math.round(seg.top), left: Math.round(seg.left), h: Math.round(seg.height), w: Math.round(seg.width), vw: innerWidth, icons: [...r.querySelectorAll('.ag-log-seg > button')].map((b) => { const i=b.querySelector('svg'), l=b.querySelector('span'); return !!i && i.getBoundingClientRect().right <= l.getBoundingClientRect().left && b.scrollWidth <= b.clientWidth + 1; }) }");
    check(`${tag}: die Reiter des Protokolls stehen als zweite Zeile direkt unter den Hauptreitern, über Zeitraum und Anlage, im festen Teil${mobile ? ", über die ganze Breite" : ""}`, place.underMain && place.abovePeriod && place.cfg && place.sticky === "sticky" && (!mobile || place.w >= place.vw - 40), JSON.stringify(place));
    check(`${tag}: beide Reiter tragen ein Symbol links vom Text`, place.icons.length === 2 && place.icons.every(Boolean), JSON.stringify(place.icons));
    // Derselbe Aufbau wie in der Konfiguration: die zweite Zeile steht dort an derselben Stelle und ist gleich hoch
    await s.tap('[data-tab="config"]');
    await s.waitFor("return !!r.querySelector('.ag-cfg .ag-subs [data-sub]')");
    await s.page.waitForTimeout(300);
    const cfg = await s.ev("const seg=r.querySelector('.ag-cfg .ag-subs'); const b=seg.getBoundingClientRect(); return { top: Math.round(b.top), left: Math.round(b.left), h: Math.round(b.height), icons: [...seg.querySelectorAll(':scope > button')].map((x) => { const i=x.querySelector('svg'), l=x.querySelector('span'); return !!i && i.getBoundingClientRect().right <= l.getBoundingClientRect().left && x.scrollWidth <= x.clientWidth + 1; }), fits: seg.scrollWidth <= seg.clientWidth + 1 && b.right <= innerWidth, size: Math.round(seg.querySelector('svg').getBoundingClientRect().width) }");
    check(`${tag}: Konfiguration: die zweite Zeile steht an genau derselben Stelle und ist gleich hoch`, Math.abs(cfg.top - place.top) <= 1 && cfg.left === place.left && cfg.h === place.h, JSON.stringify({ cfg, place }));
    check(`${tag}: Konfiguration: alle vier Reiter mit Symbol links vom Text, nichts abgeschnitten`, cfg.icons.length === 4 && cfg.icons.every(Boolean) && cfg.fits && cfg.size === (mobile ? 15 : 16), JSON.stringify(cfg));
    await s.page.screenshot({ path: `${outDir}subtabs-config-${lang}-${mobile ? "mobile" : "desktop"}.png` });
    await s.tap('[data-tab="log"]');
    await s.waitFor("return r.querySelectorAll('.ag-inc').length === 2");

    // ----- Löschen eines Alarms -----
    check(`${tag}: der laufende Alarm (aufgeklappt) hat keinen Knopf zum Löschen`, await s.ev("const c=r.querySelectorAll('.ag-inc')[0]; return !!c.querySelector('.ag-inc-body') && !c.querySelector('[data-log=\"delete\"]')"));
    await s.ev("r.querySelectorAll('.ag-inc')[1].querySelector('.ag-inc-head').click(); return 1");
    await s.waitFor("return !!r.querySelectorAll('.ag-inc')[1].querySelector('[data-log=\"delete\"]')");
    const btn = await s.ev("const c=r.querySelectorAll('.ag-inc')[1]; const body=c.querySelector('.ag-inc-body'); const b=c.querySelector('[data-log=\"delete\"]'); const bb=b.getBoundingClientRect(), seq=c.querySelector('.ag-seq').getBoundingClientRect(); return { text: b.textContent.trim(), icon: !!b.querySelector('svg'), last: body.lastElementChild.contains(b), below: bb.top >= seq.bottom, h: bb.height, id: b.dataset.id, entry: b.dataset.entry }");
    check(`${tag}: geöffneter Alarm: unten der Knopf "${t.del}" mit Papierkorb`, btn.text === t.del && btn.icon && btn.last && btn.below && btn.h >= 36 && btn.entry === "e_haus" && !!btn.id, JSON.stringify(btn));
    await s.page.screenshot({ path: `${outDir}logtabs-alarms-${lang}-${mobile ? "mobile" : "desktop"}.png` });
    const ask = async () => { await s.ev("r.querySelector('[data-log=\"delete\"]').click(); return 1"); await s.waitFor("return r.getElementById('ag-confirm').open"); };
    await ask();
    check(`${tag}: zuerst die Rückfrage "${t.title}" mit "${t.ok}" und Abbrechen`, await s.ev(`const d=r.getElementById('ag-confirm'); return d.querySelector('h3').textContent === ${JSON.stringify(t.title)} && d.querySelector('[data-c="yes"]').textContent === ${JSON.stringify(t.ok)} && !!d.querySelector('[data-c="no"]') && d.innerText.includes('Haus')`));
    await s.ev("r.querySelector('#ag-confirm [data-c=\"no\"]').click(); return 1");
    await s.page.waitForTimeout(300);
    check(`${tag}: Abbrechen löscht nichts`, (await deletes()).length === 0 && (await panes()).cards === 2);
    await s.sim("window.__failDelete = true");
    await ask();
    await s.ev("r.querySelector('#ag-confirm [data-c=\"yes\"]').click(); return 1");
    check(`${tag}: lehnt der Server ab, bleibt der Alarm und eine Meldung erscheint`, await s.waitFor("return !!r.querySelector('.ag-toast') && r.querySelectorAll('.ag-inc').length === 2"));
    await s.sim("window.__failDelete = false");
    await ask();
    await s.ev("r.querySelector('#ag-confirm [data-c=\"yes\"]').click(); return 1");
    check(`${tag}: bestätigt: der Alarm ist weg, der Reiter zählt einen weniger`, await s.waitFor("return r.querySelectorAll('.ag-inc').length === 1 && r.querySelector('.ag-log-seg [data-pane=\"alarms\"] .ag-log-n').textContent === '1'"));
    const sent = await deletes();
    check(`${tag}: gelöscht wurde genau dieser Alarm dieser Anlage`, JSON.stringify(sent.at(-1)) === JSON.stringify(["e_haus", btn.id]), JSON.stringify(sent));

    // ----- Reiter "Alle Ereignisse", lange Liste -----
    await s.tap('[data-log="pane"][data-pane="events"]');
    const p1 = await panes();
    check(`${tag}: Reiter "${t.events}": nur die Ereignisse mit ihren Filtern, oben beginnend`, !p1.alarms && p1.events && (await tabs())[1].on && (await s.ev("return !!r.querySelector('.ag-evchips') && r.host._content.scrollTop === 0")), JSON.stringify(p1));
    await s.sim("const now=Date.now(); window.__systems[0].events.unshift(...Array.from({ length: 450 }, (_x, i) => ({ t: new Date(now - (i + 1) * 60000).toISOString(), state: i % 2 ? 'disarmed' : 'armed_home', mode: i % 2 ? null : 'home', by: 'Marco' })))");
    await reload();
    await s.waitFor("return r.querySelectorAll('.ag-log .ag-row').length === 200");
    const m1 = await s.ev("const b=r.querySelector('[data-pane=\"events\"] [data-log=\"more\"]'); return { text: b?.textContent.trim(), n: Number(r.querySelector('.ag-log-seg [data-pane=\"events\"] .ag-log-n').textContent) }");
    check(`${tag}: lange Liste: 200 Zeilen und "${t.more}"; der Reiter zählt alle`, m1.text === t.more && m1.n === 450 + p1.rows, JSON.stringify(m1));
    await s.ev("r.querySelector('[data-pane=\"events\"] [data-log=\"more\"]').click(); return 1");
    check(`${tag}: "Weitere anzeigen" hängt die nächsten 200 an`, await s.waitFor("return r.querySelectorAll('.ag-log .ag-row').length === 400"));
    await s.ev("r.querySelector('[data-pane=\"events\"] [data-log=\"more\"]').click(); return 1");
    check(`${tag}: am Ende steht kein Knopf mehr`, await s.waitFor(`return r.querySelectorAll('.ag-log .ag-row').length === ${450 + p1.rows} && !r.querySelector('[data-pane="events"] [data-log="more"]')`));
    await s.page.screenshot({ path: `${outDir}logtabs-events-${lang}-${mobile ? "mobile" : "desktop"}.png` });

    // ----- Der Zeitraum gilt für beide Reiter -----
    await s.ev("const sel=r.querySelector('[data-log=\"range\"]'); sel.value='3h'; sel.dispatchEvent(new Event('change', { bubbles: true })); return 1");
    await s.waitFor("return Number(r.querySelector('.ag-log-seg [data-pane=\"events\"] .ag-log-n').textContent) < 400");
    const t3 = await tabs();
    const p3 = await panes();
    check(`${tag}: Zeitraum "letzte 3 Stunden" gilt für beide Reiter (Anzahl und Listen)`, t3[1].n >= 170 && t3[1].n <= 190 && t3[0].n === p3.cards && t3[1].on, JSON.stringify([t3, p3]));
    await s.tap('[data-log="pane"][data-pane="alarms"]');
    check(`${tag}: zurück zu den Alarmen: der aufgeklappte Alarm ist noch aufgeklappt`, await s.waitFor("const a=r.querySelector('[data-pane=\"alarms\"].ag-log-pane'); return !a.hidden && a.querySelectorAll('.ag-inc').length === 1 && !!a.querySelector('.ag-inc-body')"));
    check(`${tag}: kein Überlauf, keine Fehler im Browser`, (await s.ev("return document.documentElement.scrollWidth <= window.innerWidth")) && s.errors.filter((e) => !e.includes("running alarm")).length === 0, s.errors.join(" | "));
    await s.ctx.close();
  }
}
await browser.close();
done();
