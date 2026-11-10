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
    check(`${tag}: nach Bereich gefiltert`, await s.waitFor("const rows=[...r.querySelectorAll('.ag-lrow, .ag-lcard')]; return rows.length > 0 && rows.length < 9"));
    await (await s.el('select[data-list="area"]')).selectOption("");
    // "Letzte Änderung" kommt vom Server (nur echte Wechsel offen <-> zu), nicht aus last_changed von HA, das beim Neustart zurückgesetzt wird
    const times = await s.ev("const rows=[...r.querySelectorAll('.ag-lrow, .ag-lcard')]; const pick=(n) => rows.find((x) => x.innerText.includes(n)); return { door: pick('Haustür')?.innerText, other: pick('Bewegung Flur')?.innerText }");
    check(`${tag}: letzte Änderung aus dem Server (Haustür vor Tagen), ohne Wert nichts erfunden`, /5|fünf|five|Tag|day/i.test(times.door || "") && !/Min\.|min ago|Sek|sec/i.test(times.other || ""), JSON.stringify(times));
    {
      // Handy: Liste/Karten nur in "Ansicht" (spart Platz); Desktop an beiden Orten
      const setLayout = async (v) => {
        if (!mobile) return s.tap(`[data-list-layout="${v}"]`);
        await s.tap('[data-list="view"]');
        await s.tap(`#ag-view [data-list="vset"][data-key="layout"][data-value="${v}"]`);
        await s.tap('[data-list="vdone"]');
      };
      if (mobile) check(`${tag}: Handy: kein Umschalter Liste/Karten in der Werkzeugleiste, aber in "Ansicht"`, await s.ev("return !r.querySelector('.ag-tools [data-seg=\"layout\"]')") && (await s.tap('[data-list="view"]'), await s.ev("return !!r.querySelector('#ag-view [data-list=\"vset\"][data-key=\"layout\"]')")) && (await s.tap('[data-list="vdone"]'), true));
      else check(`${tag}: Desktop: Umschalter auch in "Ansicht"`, (await s.tap('[data-list="view"]'), await s.ev("return !!r.querySelector('#ag-view [data-list=\"vset\"][data-key=\"layout\"]')")) && (await s.tap('[data-list="vdone"]'), true));
      if (!mobile) check(`${tag}: Umschalter Liste/Karten mit Kapsel`, await s.ev("const g=r.querySelector('[data-seg=\"layout\"]'); return !!g && !!g.querySelector('.ag-pill') && g.querySelectorAll('button').length === 2 && g.querySelector('button.on').dataset.listLayout === 'list'"));
      check(`${tag}: Standard ist die Liste`, await s.ev("return !!r.querySelector('.ag-ltable') && !r.querySelector('.ag-mcards')"));
      await setLayout("cards");
      check(`${tag}: Karten, eine je Sensor${mobile ? "" : " (Raster)"}`, await s.waitFor(`const g=r.querySelector('.ag-mcards${mobile ? "" : ".grid"}'); return !!g && g.querySelectorAll('.ag-lcard').length === 10 && !r.querySelector('.ag-ltable')`));
      check(`${tag}: Karten gruppiert nach Bereich`, await s.ev("return r.querySelectorAll('.ag-mcards .ag-group-label').length >= 3"));
      check(`${tag}: Karte mit allen Angaben`, await s.ev("const c=[...r.querySelectorAll('.ag-lcard')].find((x) => x.innerText.includes('Haustür')); const t=c.innerText; return t.includes('Haustür') && !!c.querySelector('.ag-tag') && !!c.querySelector('.ag-bat') && !!c.querySelector('.ag-lz') && !!c.querySelector('.ag-lfacts')"));
      if (!mobile) check(`${tag}: mehrere Spalten nebeneinander`, await s.ev("const cs=[...r.querySelectorAll('.ag-mcards.grid .ag-lcard')].slice(0, 3).map((c) => Math.round(c.getBoundingClientRect().top)); return new Set(cs).size < 3"));
      check(`${tag}: Layout wird gemerkt (je Gerät)`, await s.ev(`return JSON.parse(localStorage.getItem('alarmageddon_view')).${mobile ? 'mobile' : 'desktop'}.layout === 'cards'`));
      check(`${tag}: Filter wirken auch bei Karten`, await (async () => { await s.tap('[data-list="filter"][data-filter="open"]'); return s.waitFor("return r.querySelectorAll('.ag-lcard').length === 1"); })());
      await s.tap('[data-list="filter"][data-filter="open"]');
      await s.page.screenshot({ path: `${outDir}cards-${lang}-desktop.png`, fullPage: true });
      await setLayout("list");
      check(`${tag}: zurück zur Liste`, await s.waitFor("return !!r.querySelector('.ag-ltable') && !r.querySelector('.ag-mcards')"));
    }
    {
      // 1.7.0: Gruppierung wählbar (Bereich, Sensorart, Anlage, keine): auf dem Desktop direkt in der Werkzeugleiste, auf dem Handy in
      // "Ansicht". Sie gilt für Liste und Karten; die Karten haben je Gruppe einen Titel mit Anzahl über die ganze Breite.
      const kind = mobile ? "mobile" : "desktop";
      const viewSet = async (key, value) => {
        await s.tap('[data-list="view"]');
        await s.tap(`#ag-view [data-list="vset"][data-key="${key}"][data-value="${value}"]`);
        await s.tap('[data-list="vdone"]');
      };
      const setGroup = async (v) => {
        if (mobile) await viewSet("group", v);
        else await (await s.el('select[data-list="group"]')).selectOption(v);
        await s.page.waitForTimeout(200);
      };
      const setLayout = async (v) => {
        if (mobile) await viewSet("layout", v);
        else await s.tap(`[data-list-layout="${v}"]`);
        await s.page.waitForTimeout(200);
      };
      const heads = () => s.ev("return [...r.querySelectorAll('.ag-mcards .ag-group-head')].map((h) => { let n = 0; for (let e = h.nextElementSibling; e && !e.classList.contains('ag-group-head'); e = e.nextElementSibling) n += e.classList.contains('ag-lcard') ? 1 : 0; return { title: h.querySelector('b').textContent, shown: Number(h.querySelector('.ag-t2').textContent), cards: n, wide: h.getBoundingClientRect().width / h.parentElement.getBoundingClientRect().width }; })");
      if (mobile) {
        check(`${tag}: Handy: Gruppierung nicht in der Werkzeugleiste, aber in "Ansicht" mit vier Möglichkeiten`, (await s.ev("return !r.querySelector('.ag-tools select[data-list=\"group\"]')")) && (await s.tap('[data-list="view"]'), await s.ev("return [...r.querySelectorAll('#ag-view [data-list=\"vset\"][data-key=\"group\"]')].map((b) => b.dataset.value).join()")) === "area,type,system,none" && (await s.tap('[data-list="vdone"]'), true));
      } else {
        check(`${tag}: Desktop: Auswahl der Gruppierung in der Werkzeugleiste (Bereich, Sensorart, Anlage, keine), Bereich gewählt`, await s.ev("const g=r.querySelector('.ag-tools select[data-list=\"group\"]'); return !!g && [...g.options].map((o) => o.value).join() === 'area,type,system,none' && g.value === 'area'"));
      }
      await setLayout("cards");
      await setGroup("type");
      const types = await s.ev("return [...r.querySelector('select[data-list=\"type\"]').options].slice(1).map((o) => o.textContent)");
      const byType = await heads();
      const titles = byType.map((h) => h.title);
      const total = await s.ev("return r.querySelectorAll('.ag-mcards .ag-lcard').length");
      check(`${tag}: Karten nach Sensorart: Titel in der Reihenfolge des Filters "Alle Arten"`, titles.length >= 2 && JSON.stringify(titles) === JSON.stringify(types.filter((t) => titles.includes(t))), JSON.stringify(titles));
      check(`${tag}: jeder Titel nennt die Anzahl seiner Karten, jeder Sensor steht in genau einer Gruppe`, byType.every((h) => h.shown === h.cards && h.cards > 0) && byType.reduce((n, h) => n + h.cards, 0) === total, JSON.stringify(byType));
      if (!mobile) check(`${tag}: Titel der Gruppe läuft über die ganze Breite des Rasters`, byType.every((h) => h.wide > 0.95), JSON.stringify(byType.map((h) => h.wide)));
      check(`${tag}: Gruppierung wird gemerkt (je Gerät)`, await s.ev(`return JSON.parse(localStorage.getItem('alarmageddon_view')).${kind}.group === 'type'`));
      await s.page.screenshot({ path: `${outDir}cards-grouped-${lang}-${kind}.png`, fullPage: true });
      await setLayout("list");
      const rows = await s.ev("return [...r.querySelectorAll('.ag-ov-list tr.grp')].map((t) => t.textContent.trim())");
      check(`${tag}: dieselbe Gruppierung in der Liste`, rows.length === titles.length && rows.every((t, i) => t.startsWith(titles[i])), JSON.stringify(rows));
      await setLayout("cards");
      await setGroup("none");
      check(`${tag}: "Nicht gruppiert": Karten ohne Titel`, (await heads()).length === 0 && (await s.ev("return r.querySelectorAll('.ag-mcards .ag-lcard').length")) === total);
      await setGroup("area");
      const byArea = (await heads()).map((h) => h.title);
      check(`${tag}: nach Bereich: Titel alphabetisch`, byArea.length >= 3 && JSON.stringify(byArea) === JSON.stringify([...byArea].sort((a, b) => a.localeCompare(b))), JSON.stringify(byArea));
      await setLayout("list");
    }
    check(`${tag}: kein Überlauf`, await s.ev("return document.documentElement.scrollWidth <= window.innerWidth"));
    check(`${tag}: keine Fehler im Browser`, s.errors.length === 0, s.errors.join(" | "));
    await s.ctx.close();
  }
}
await browser.close();
done();
