// 0.12.0: Protokoll als eigener Reiter: aufgezeichnete Alarme mit Zeitachse (Bahnen und Reihenfolge) und alle Ereignisse.
import { check, done, launch, open, outDir } from "../lib.mjs";

const T = {
  de: { tab: "Protokoll", first: "Fenster Bad hat angesprochen", ack: "Quittiert von Diego", running: "Läuft", alarms: "Alarme", events: "Alle Ereignisse", calm: "wieder ruhig" },
  en: { tab: "Log", first: "Fenster Bad responded", ack: "Acknowledged by Diego", running: "Running", alarms: "Alarms", events: "All events", calm: "calm again" },
};

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const t = T[lang];
    const s = await open(browser, { mobile, lang });
    check(`${tag}: Reiter Protokoll`, await s.ev(`return r.querySelector('[data-tab="log"]').innerText.includes('${t.tab}')`));
    check(`${tag}: Ereignisse nicht mehr in der Übersicht`, await s.ev("return !r.querySelector('.ag-log')"));
    await s.tap('[data-tab="log"]');
    check(`${tag}: ein Alarm, aufgeklappt`, await s.waitFor("return r.querySelectorAll('.ag-inc').length === 1 && r.querySelector('.ag-inc-head').getAttribute('aria-expanded') === 'true'"));
    check(`${tag}: Kapitel Alarme und Ereignisse`, await s.ev(`const c=[...r.querySelectorAll('.ag-chap-t')].map((e) => e.textContent); return c.length === 2 && c[0] === '${t.alarms}' && c[1] === '${t.events}'`));
    check(`${tag}: quittiert von Diego`, await s.ev(`return r.querySelector('.ag-inc-head .ag-tag.ok').textContent.trim() === '${t.ack}'`));
    check(`${tag}: zwei Bahnen (Fenster, Bewegung)`, await s.ev("const n=[...r.querySelectorAll('.ag-lg-row:not(.ag-lg-axisrow) .ag-lg-name')].map((e) => e.innerText.trim()); return n.length === 2 && n[0] === 'Fenster Bad' && n[1] === 'Bewegung Flur'"));
    check(`${tag}: Balken je Bahn, Fenster fast die ganze Dauer`, await s.ev("const rows=[...r.querySelectorAll('.ag-lg-row:not(.ag-lg-axisrow)')]; const w=(row) => parseFloat(row.querySelector('.ag-lg-bar').style.width); return rows.every((x) => x.querySelectorAll('.ag-lg-bar').length === 1) && w(rows[0]) > 90 && w(rows[1]) < 20"));
    check(`${tag}: Bewegung beginnt nach dem Fenster`, await s.ev("const rows=[...r.querySelectorAll('.ag-lg-row:not(.ag-lg-axisrow)')]; return parseFloat(rows[0].querySelector('.ag-lg-bar').style.left) === 0 && parseFloat(rows[1].querySelector('.ag-lg-bar').style.left) > 30"));
    check(`${tag}: Marken für Alarm und Quittieren`, await s.ev("return r.querySelectorAll('.ag-lg-mark').length / r.querySelectorAll('.ag-lg-row:not(.ag-lg-axisrow)').length === 2"));
    check(`${tag}: Zeitachse mit drei Uhrzeiten`, await s.ev("return r.querySelectorAll('.ag-lg-axis span').length === 3 && /\\d{2}:\\d{2}:\\d{2}/.test(r.querySelector('.ag-lg-axis span').textContent)"));
    check(`${tag}: Reihenfolge mit sechs Einträgen`, await s.ev(`const li=[...r.querySelectorAll('.ag-seq-item')]; return li.length === 6 && li[0].innerText.includes('${t.first}') && li[2].innerText.includes('Bewegung Flur') && li[5].innerText.includes('Diego') && li[3].innerText.includes('${t.calm}')`));
    check(`${tag}: Abstand zum Anfang`, await s.ev("const li=[...r.querySelectorAll('.ag-seq-item time small')]; return li.length === 6 && /\\+/.test(li[2].textContent) && !/\\+/.test(li[0].textContent)"));
    check(`${tag}: Ereignisliste gefüllt`, await s.ev("return r.querySelectorAll('.ag-log .ag-row').length > 1"));
    check(`${tag}: kein Überlauf`, await s.ev("return document.documentElement.scrollWidth <= window.innerWidth"));
    await s.page.screenshot({ path: `${outDir}log-${lang}-${mobile ? "mobile" : "desktop"}.png`, fullPage: true });
    // ----- Zeitraum und Export -----
    const rows = () => s.ev("return r.querySelectorAll('.ag-log .ag-row').length");
    const pick = async (v) => { await (await s.el('[data-log="range"]')).selectOption(v); await s.page.waitForTimeout(150); };
    const dayStr = (ms) => { const d = new Date(Date.now() - ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    check(`${tag}: Zeitraum "Alles": alle Ereignisse, Anlagenwahl bei zwei Anlagen`, await rows() === 5 && await s.ev("return !!r.querySelector('[data-log=\"system\"]') && r.querySelector('.ag-log-count').textContent.includes('5')"));
    await pick("3h");
    check(`${tag}: letzte 3 Stunden: nur das jüngste Ereignis und der Alarm`, await s.waitFor("return r.querySelectorAll('.ag-log .ag-row').length === 1 && r.querySelectorAll('.ag-inc').length === 1"));
    await pick("7d");
    check(`${tag}: letzte 7 Tage: ohne das Ereignis von vor 40 Tagen`, await rows() === 4 && await s.ev("return r.querySelector('.ag-log-count').textContent.includes('4')"));
    await pick("30d");
    check(`${tag}: letzte 30 Tage`, await rows() === 4);
    await pick("today");
    check(`${tag}: heute und gestern ohne Fehler`, await s.ev("return !!r.querySelector('.ag-log-count').textContent"));
    await pick("yesterday");
    await pick("24h");
    check(`${tag}: letzte 24 Stunden: drei Ereignisse (3 h, 3,3 h, 20 min)`, await rows() === 3);
    await pick("day");
    check(`${tag}: Tag wählen zeigt ein Datumsfeld`, await s.ev("return !!r.querySelector('input[type=\"date\"][data-log=\"from\"]')"));
    await s.ev(`const i=r.querySelector('[data-log="from"]'); i.value='${dayStr(5 * 86400e3)}'; i.dispatchEvent(new Event('change', { bubbles: true }));`);
    check(`${tag}: ein Tag: genau das Ereignis von vor 5 Tagen, kein Alarm`, await s.waitFor("return r.querySelectorAll('.ag-log .ag-row').length === 1 && r.querySelectorAll('.ag-inc').length === 0"));
    await pick("span");
    check(`${tag}: Zeitraum wählen zeigt zwei Datumsfelder`, await s.ev("return r.querySelectorAll('input[type=\"date\"]').length === 2"));
    await s.ev(`const a=r.querySelector('[data-log="from"]'); a.value='${dayStr(6 * 86400e3)}'; a.dispatchEvent(new Event('change', { bubbles: true })); const b=r.querySelector('[data-log="to"]'); b.value='${dayStr(0)}'; b.dispatchEvent(new Event('change', { bubbles: true }));`);
    check(`${tag}: Zeitraum von bis: vier Ereignisse`, await s.waitFor("return r.querySelectorAll('.ag-log .ag-row').length === 4"));
    check(`${tag}: Zeitraum wird pro Browser gemerkt`, await s.ev("return localStorage.getItem('alarmageddon.logRange') === 'span'"));
    await s.ev("const sel=r.querySelector('[data-log=\"system\"]'); sel.value=[...sel.options].find((o) => o.value !== 'all' && o.text === 'Garage').value; sel.dispatchEvent(new Event('change', { bubbles: true }));");
    check(`${tag}: Anlage Garage: nur ihr Ereignis`, await s.waitFor("const t=r.querySelector('.ag-log').innerText; return r.querySelectorAll('.ag-log .ag-row').length === 1 && t.includes('Garage')"));
    await s.ev("const sel=r.querySelector('[data-log=\"system\"]'); sel.value='all'; sel.dispatchEvent(new Event('change', { bubbles: true }));");
    // Export: richtet sich nach dem Filter (7 Tage: 4 Ereignisse und der Alarm mit 6 Einträgen)
    await pick("7d");
    const [csv] = await Promise.all([s.page.waitForEvent("download", { timeout: 5000 }), s.tap('[data-log="export-csv"]')]);
    const text = (await import("node:fs")).readFileSync(await csv.path(), "utf8");
    const lines = text.replace(/^\ufeff/, "").trim().split("\r\n");
    check(`${tag}: CSV-Name mit Zeitraum`, /^alarmageddon-log-7d-\d{4}-\d{2}-\d{2}\.csv$/.test(csv.suggestedFilename()), csv.suggestedFilename());
    check(`${tag}: CSV: Kopfzeile, 4 Ereignisse und 6 Alarm-Einträge, Semikolon`, lines.length === 1 + 4 + 6 && lines[0].split(";").length === 7 && text.startsWith("\ufeff") && text.includes("Wandtablet"), String(lines.length));
    check(`${tag}: CSV ohne das Ereignis von vor 40 Tagen, mit Sensornamen im Alarm`, lines.filter((x) => x.includes('"Alarm"')).length === 6 && lines.some((x) => x.includes("Fenster Bad hat angesprochen") || x.includes("Fenster Bad responded")));
    await pick("3h");
    const [json] = await Promise.all([s.page.waitForEvent("download", { timeout: 5000 }), s.tap('[data-log="export-json"]')]);
    const data = JSON.parse((await import("node:fs")).readFileSync(await json.path(), "utf8"));
    check(`${tag}: JSON mit Filter, 3 Stunden: ein Ereignis, ein Alarm`, data.format === "alarmageddon-log" && data.filter.range === "3h"
      && data.systems.reduce((n, x) => n + x.events.length, 0) === 1 && data.systems.reduce((n, x) => n + x.recordings.length, 0) === 1, JSON.stringify(data.filter));
    await pick("all");

    // Das Protokoll lädt alle 5 Sekunden nach, solange der Reiter offen ist
    const calls = () => s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/log').length");
    const before = await calls();
    await s.page.waitForTimeout(5600);
    check(`${tag}: Protokoll lädt alle 5 Sekunden nach`, (await calls()) > before, `${before} -> ${await calls()}`);

    // Zuklappen
    await s.tap('.ag-inc-head');
    check(`${tag}: zugeklappt`, await s.waitFor("return !r.querySelector('.ag-inc-body') && r.querySelector('.ag-inc-head').getAttribute('aria-expanded') === 'false'"));
    check(`${tag}: Reiter gemerkt`, await s.ev("return localStorage.getItem('alarmageddon.tab') === 'log'"));
    check(`${tag}: keine Fehler im Browser`, s.errors.length === 0, s.errors.join(" | "));
    await s.ctx.close();

    // Tipp auf die Alarmmeldung: /alarmageddon?view=log öffnet das Protokoll mit dem laufenden Alarm
    const d = await open(browser, { mobile, lang, query: "&view=log&alarm=open" });
    check(`${tag}: Deep Link öffnet das Protokoll mit dem neuesten Alarm aufgeklappt`, await d.waitFor("return !!r.querySelector('.ag-inc') && r.querySelector('[data-tab=\"log\"]').classList.contains('on') && r.querySelector('.ag-inc-head').getAttribute('aria-expanded') === 'true'"));
    check(`${tag}: Parameter danach entfernt`, !new URL(d.page.url()).searchParams.get("view"));
    await d.ctx.close();

    // Laufender Alarm: neuester oben und aufgeklappt, der ältere zu
    const r = await open(browser, { mobile, lang, query: "&alarm=open" });
    await r.tap('[data-tab="log"]');
    check(`${tag}: zwei Alarme, der laufende offen`, await r.waitFor("const h=r.querySelectorAll('.ag-inc-head'); return h.length === 2 && h[0].getAttribute('aria-expanded') === 'true' && h[1].getAttribute('aria-expanded') === 'false'"));
    check(`${tag}: laufender Alarm markiert`, await r.ev(`return r.querySelector('.ag-inc-head .ag-tag.err').textContent.trim() === '${t.running}'`));
    check(`${tag}: laufende Bahn reicht bis jetzt`, await r.ev("const b=r.querySelector('.ag-lg-bar'); return parseFloat(b.style.left) === 0 && parseFloat(b.style.width) > 95"));
    check(`${tag}: Meldung und Aktionsschritt in der Reihenfolge`, await r.ev("const li=[...r.querySelectorAll('.ag-inc')[0].querySelectorAll('.ag-seq-item')]; return li.length === 5 && li[3].innerText.includes('Alarm') && li[4].innerText.includes('Sirene Flur') && li[4].innerText.includes('siren.turn_on')"));
    await r.tap('.ag-inc:nth-of-type(2) .ag-inc-head');
    check(`${tag}: zweiter aufklappbar, erster bleibt`, await r.waitFor("return r.querySelectorAll('.ag-inc-body').length === 2"));
    check(`${tag}: keine Fehler (laufend)`, r.errors.length === 0, r.errors.join(" | "));
    await r.ctx.close();
  }
}
await browser.close();
done();
