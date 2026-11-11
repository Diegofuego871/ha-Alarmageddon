// 1.13.2: Ladeanzeige in Sensoransicht und Protokoll. Dieselbe wie im ganzen Panel (drei kreisende Punkte in der Farbe des Panels),
// mitten in der Grafik und etwas kleiner; nie ein Text "Lädt …". Mit alten Daten bleibt alles gedimmt stehen (nichts springt).
import { check, done, launch, open, outDir } from "../lib.mjs";

const TEXT = { de: "Verlauf wird geladen", en: "Loading history" };
const DOOR = "binary_sensor.haustuer";

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const s = await open(browser, { mobile, lang });
    await s.waitFor(`return !!r.querySelector('[data-act="more"][data-entity="${DOOR}"]')`);
    await s.sim('window.__delay = { "alarmageddon/sensor_history": 900, "alarmageddon/log": 900 }');
    // Lage und Aussehen der Ladeanzeige in der Fläche der Grafik
    const look = () => s.ev(`const d=r.getElementById('ag-sensor'); const box=d.querySelector('.ag-sv-chart'); const ld=box?.querySelector(':scope > .ag-ld'); if (!ld) return null; const probe=document.createElement('i'); probe.style.color='var(--ag-primary)'; r.appendChild(probe); const primary=getComputedStyle(probe).color; probe.remove();
      const b=box.getBoundingClientRect(), l=ld.getBoundingClientRect(); return { dx: Math.round(Math.abs((l.left + l.right) / 2 - (b.left + b.right) / 2)), dy: Math.round(Math.abs((l.top + l.bottom) / 2 - (b.top + b.bottom) / 2)), boxH: Math.round(b.height), boxTop: Math.round(b.top), dots: ld.querySelectorAll('s').length, size: Math.round(l.width), same: getComputedStyle(ld.querySelector('s')).backgroundColor === primary, role: ld.getAttribute('role'), text: d.innerText.includes(${JSON.stringify(TEXT[lang])}), svg: !!box.querySelector('svg'), dim: box.querySelector('svg') ? getComputedStyle(box.querySelector('svg')).opacity : null, busy: d.querySelector('.ag-sv').hasAttribute('data-busy') }`);
    const moving = async () => { const a = await s.ev("return r.querySelector('#ag-sensor .ag-ld s').style.left"); await s.page.waitForTimeout(220); return a !== (await s.ev("return r.querySelector('#ag-sensor .ag-ld s')?.style.left")); };

    // ----- Erstes Laden: leere Fläche in der Höhe der Grafik, Ladeanzeige in der Mitte -----
    await s.ev(`r.host.sensorView.open(${JSON.stringify(DOOR)}); return 1`);
    await s.waitFor("return !!r.querySelector('#ag-sensor .ag-sv-chart > .ag-ld')");
    const first = await look();
    check(`${tag}: erstes Laden: die Ladeanzeige des Panels steht mitten in der Fläche der Grafik (kein Text "Lädt …")`, !!first && first.dx <= 2 && first.dy <= 2 && first.boxH >= 160 && !first.svg && !first.text && first.busy, JSON.stringify(first));
    check(`${tag}: dasselbe Design wie überall: drei Punkte in der Farbe des Panels, etwas kleiner (56 statt 72 px), für Vorleser als Status`, first.dots === 3 && first.same && first.size >= 54 && first.size <= 58 && first.role === "status", JSON.stringify(first));
    check(`${tag}: die Punkte kreisen`, await moving());
    check(`${tag}: Kopf, Kacheln und Zeitraum stehen schon da und sind bedienbar`, await s.ev("const d=r.getElementById('ag-sensor'); return d.querySelectorAll('.ag-sv-tile').length >= 3 && !!d.querySelector('.ag-sv-range .on') && getComputedStyle(d.querySelector('.ag-sv-head')).opacity === '1'"));
    await s.page.screenshot({ path: `${outDir}loader-first-${lang}-${mobile ? "mobile" : "desktop"}.png` });
    await s.waitFor("const d=r.getElementById('ag-sensor'); return !d.querySelector('.ag-ld') && !!d.querySelector('.ag-sv-chart svg') && !d.querySelector('.ag-sv').hasAttribute('data-busy')");
    const loadedTop = await s.ev("return Math.round(r.querySelector('#ag-sensor .ag-sv-chart').getBoundingClientRect().top)");

    // ----- Anderer Zeitraum: die alte Grafik bleibt gedimmt stehen, die Ladeanzeige liegt in ihrer Mitte -----
    await s.ev("r.querySelector('#ag-sensor .ag-sv-range [data-hours=\"168\"]').click(); return 1");
    await s.waitFor("return !!r.querySelector('#ag-sensor .ag-sv-chart > .ag-ld')");
    const again = await look();
    check(`${tag}: Zeitraum gewechselt: alte Grafik bleibt gedimmt stehen, Ladeanzeige in ihrer Mitte, nichts springt`, !!again && again.svg && again.dim === "0.28" && again.dx <= 2 && again.dy <= 2 && again.busy && Math.abs(again.boxTop - loadedTop) <= 1 && !again.text, JSON.stringify({ again, loadedTop }));
    check(`${tag}: die Wahl des Zeitraums wechselt sofort; Kennzahlen und Liste sind gedimmt, der Kopf nicht`, await s.ev("const d=r.getElementById('ag-sensor'); const o=(q) => getComputedStyle(d.querySelector(q)).opacity; return d.querySelector('.ag-sv-range .on').dataset.hours === '168' && o('.ag-sv-kpis') === '0.28' && o('.ag-sv-list > *') === '0.28' && o('.ag-sv-head') === '1' && o('.ag-sv-tiles') === '1'"));
    await s.page.screenshot({ path: `${outDir}loader-range-${lang}-${mobile ? "mobile" : "desktop"}.png` });
    check(`${tag}: danach die neue Grafik in voller Stärke, ohne Ladeanzeige`, await s.waitFor("const d=r.getElementById('ag-sensor'); return !d.querySelector('.ag-ld') && d.querySelectorAll('.ag-sv-chart .sv-track').length === 7 && getComputedStyle(d.querySelector('.ag-sv-chart svg')).opacity === '1' && getComputedStyle(d.querySelector('.ag-sv-kpis')).opacity === '1'"));

    // ----- Anderer Reiter: wieder die leere Fläche mit der Ladeanzeige -----
    await s.ev("r.querySelector('#ag-sensor [data-sv=\"tab\"][data-tab=\"battery\"]').click(); return 1");
    await s.waitFor("return !!r.querySelector('#ag-sensor .ag-sv-chart > .ag-ld')");
    const bat = await look();
    check(`${tag}: Kachel Batterie: Ladeanzeige in der leeren Fläche, dann die Linie`, !!bat && !bat.svg && bat.dx <= 2 && bat.dy <= 2 && (await s.waitFor("const d=r.getElementById('ag-sensor'); return !d.querySelector('.ag-ld') && !!d.querySelector('.ag-sv-chart .sv-line')")), JSON.stringify(bat));
    await s.ev("r.querySelector('#ag-sensor > .ag-dlg-x').click(); return 1");
    await s.waitFor("return !r.getElementById('ag-sensor').open");

    // ----- Protokoll: beim ersten Laden dieselbe Ladeanzeige statt eines leeren Reiters -----
    await s.ev("const l=r.host.log; l.systems = null; l.rev = null; return 1");
    await s.tap('[data-tab="log"]');
    const log = await s.ev("const w=r.querySelector('.ag-log-body .ag-log-wait'); const ld=w?.querySelector('.ag-ld'); if (!ld) return null; const b=w.getBoundingClientRect(), l=ld.getBoundingClientRect(); return { dx: Math.round(Math.abs((l.left + l.right) / 2 - (b.left + b.right) / 2)), dy: Math.round(Math.abs((l.top + l.bottom) / 2 - (b.top + b.bottom) / 2)), h: Math.round(b.height), dots: ld.querySelectorAll('s').length, tools: !!r.querySelector('.ag-log-tools [data-log=\"range\"]') }");
    check(`${tag}: Protokoll lädt: Ladeanzeige in der Mitte der Fläche, Zeitraum und Reiter stehen schon da`, !!log && log.dx <= 2 && log.dy <= 2 && log.h >= 200 && log.dots === 3 && log.tools, JSON.stringify(log));
    await s.page.screenshot({ path: `${outDir}loader-log-${lang}-${mobile ? "mobile" : "desktop"}.png` });
    check(`${tag}: danach das Protokoll, ohne Ladeanzeige`, await s.waitFor("return !r.querySelector('.ag-log-body .ag-ld') && r.querySelectorAll('.ag-inc').length >= 1"));
    check(`${tag}: kein Überlauf, keine Fehler im Browser`, (await s.ev("return document.documentElement.scrollWidth <= window.innerWidth")) && s.errors.length === 0, s.errors.join(" | "));
    await s.ctx.close();
  }
}
await browser.close();
done();
