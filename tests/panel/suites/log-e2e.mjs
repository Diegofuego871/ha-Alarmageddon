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
    // Zuklappen
    await s.tap('.ag-inc-head');
    check(`${tag}: zugeklappt`, await s.waitFor("return !r.querySelector('.ag-inc-body') && r.querySelector('.ag-inc-head').getAttribute('aria-expanded') === 'false'"));
    check(`${tag}: Reiter gemerkt`, await s.ev("return localStorage.getItem('alarmageddon.tab') === 'log'"));
    check(`${tag}: keine Fehler im Browser`, s.errors.length === 0, s.errors.join(" | "));
    await s.ctx.close();

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
