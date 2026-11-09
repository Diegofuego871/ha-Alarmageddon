// 0.23.0: Sensorliste der Übersicht mit Umschalter Liste/Karten, Abstand der Filterpillen und Bereichsfilter.
import { check, done, launch, open, outDir } from "../lib.mjs";

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const s = await open(browser, { mobile, lang });
    await s.page.waitForTimeout(400);
    // Pillen: auch zwischen den Zeilen Abstand (nicht nur nebeneinander)
    check(`${tag}: Filterpillen mit Abstand nebeneinander und untereinander`, await s.ev("const l=r.querySelector('.ag-lchips'); const cs=getComputedStyle(l); const c=[...l.children]; const gap=(a,b) => b.getBoundingClientRect().left - a.getBoundingClientRect().right; return cs.display === 'flex' && parseFloat(cs.rowGap) >= 8 && parseFloat(cs.columnGap) >= 8 && gap(c[0], c[1]) >= 8"));
    check(`${tag}: Bereichsfilter vorhanden`, await s.ev("const a=r.querySelector('select[data-list=\"area\"]'); return !!a && a.options.length > 2"));
    await (await s.el('select[data-list="area"]')).selectOption("Flur");
    check(`${tag}: nach Bereich gefiltert`, await s.waitFor("const rows=[...r.querySelectorAll('.ag-lrow, .ag-lcard')]; return rows.length > 0 && rows.length < 9 && rows.every((x) => x.innerText.includes('Flur'))"));
    await (await s.el('select[data-list="area"]')).selectOption("");
    // "Letzte Änderung" kommt vom Server (nur echte Wechsel offen <-> zu), nicht aus last_changed von HA, das beim Neustart zurückgesetzt wird
    const times = await s.ev("const rows=[...r.querySelectorAll('.ag-lrow, .ag-lcard')]; const pick=(n) => rows.find((x) => x.innerText.includes(n)); return { door: pick('Haustür')?.innerText, other: pick('Bewegung Flur')?.innerText }");
    check(`${tag}: letzte Änderung aus dem Server (Haustür vor Tagen), ohne Wert nichts erfunden`, /5|fünf|five|Tag|day/i.test(times.door || "") && !/Min\.|min ago|Sek|sec/i.test(times.other || ""), JSON.stringify(times));
    if (mobile) {
      check(`${tag}: Handy zeigt Karten, kein Umschalter`, await s.ev("return r.querySelectorAll('.ag-lcard').length === 9 && !r.querySelector('[data-seg=\"layout\"]')"));
    } else {
      check(`${tag}: Umschalter Liste/Karten mit Kapsel`, await s.ev("const g=r.querySelector('[data-seg=\"layout\"]'); return !!g && !!g.querySelector('.ag-pill') && g.querySelectorAll('button').length === 2 && g.querySelector('button.on').dataset.listLayout === 'list'"));
      check(`${tag}: Standard ist die Liste`, await s.ev("return !!r.querySelector('.ag-ltable') && !r.querySelector('.ag-mcards')"));
      await s.tap('[data-list-layout="cards"]');
      check(`${tag}: Karten als Raster, eine je Sensor`, await s.waitFor("const g=r.querySelector('.ag-mcards.grid'); return !!g && g.querySelectorAll('.ag-lcard').length === 9 && !r.querySelector('.ag-ltable')"));
      check(`${tag}: Karten gruppiert nach Bereich`, await s.ev("return r.querySelectorAll('.ag-mcards.grid .ag-group-label').length >= 3"));
      check(`${tag}: Karte mit allen Angaben`, await s.ev("const c=[...r.querySelectorAll('.ag-lcard')].find((x) => x.innerText.includes('Haustür')); const t=c.innerText; return t.includes('Haustür') && !!c.querySelector('.ag-tag') && !!c.querySelector('.ag-bat') && !!c.querySelector('.ag-lz') && !!c.querySelector('.ag-lfacts')"));
      check(`${tag}: mehrere Spalten nebeneinander`, await s.ev("const cs=[...r.querySelectorAll('.ag-mcards.grid .ag-lcard')].slice(0, 3).map((c) => Math.round(c.getBoundingClientRect().top)); return new Set(cs).size < 3"));
      check(`${tag}: Layout wird gemerkt`, await s.ev("return JSON.parse(localStorage.getItem('alarmageddon.view')).layout === 'cards'"));
      check(`${tag}: Filter wirken auch bei Karten`, await (async () => { await s.tap('[data-list="filter"][data-filter="open"]'); return s.waitFor("return r.querySelectorAll('.ag-lcard').length === 1"); })());
      await s.tap('[data-list="filter"][data-filter="open"]');
      await s.page.screenshot({ path: `${outDir}cards-${lang}-desktop.png`, fullPage: true });
      await s.tap('[data-list-layout="list"]');
      check(`${tag}: zurück zur Liste`, await s.waitFor("return !!r.querySelector('.ag-ltable') && !r.querySelector('.ag-mcards')"));
    }
    check(`${tag}: kein Überlauf`, await s.ev("return document.documentElement.scrollWidth <= window.innerWidth"));
    check(`${tag}: keine Fehler im Browser`, s.errors.length === 0, s.errors.join(" | "));
    await s.ctx.close();
  }
}
await browser.close();
done();
