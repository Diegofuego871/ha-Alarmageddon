// 1.10.0: Handy: Unter der Reiterleiste (Sensoren, Aktionen, Meldungen, Anlage) bleibt beim Scrollen derselbe Abstand wie über ihr.
// Vorher stand der Tabellenkopf beim Scrollen ohne Abstand direkt an der Leiste. Am Computer bleibt es wie bisher (Kopf direkt darunter).
import { check, done, launch, open, outDir } from "../lib.mjs";

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [true, false]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const s = await open(browser, { mobile, lang, tab: "config" });
    await s.waitFor("return !!r.querySelector('.ag-stickwrap .ag-table th')");
    await s.page.waitForTimeout(500);
    // Abstände: über der Leiste der Unterreiter (zu den Hauptreitern) und unter ihr (zum nächsten sichtbaren Inhalt)
    const measure = (what) => s.ev(`const box=(el) => el.getBoundingClientRect(); const main=box(r.querySelector('[data-tab="config"]').closest('.ag-seg')); const sub=box(r.querySelector('[data-sub="sensors"]').closest('.ag-seg')); const c=r.host._content;
      const below=${what === "th" ? "box(r.querySelector('.ag-stickwrap .ag-table th')).top" : "(() => { const tops=[...r.querySelectorAll('.ag-wf-step, .ag-wf-start, .ag-wf-add, .ag-card')].map((e) => box(e)).filter((b) => b.bottom > sub.bottom + 1 && b.height > 0).map((b) => Math.max(b.top, sub.bottom)); return Math.min(...tops); })()"};
      const x=sub.left + sub.width / 2; const hit=r.elementFromPoint(x, sub.bottom + 3);
      return { above: Math.round((sub.top - main.bottom) * 10) / 10, below: Math.round((below - sub.bottom) * 10) / 10, scroll: Math.round(c.scrollTop), cover: !!hit && !!hit.closest('.ag-cfg'), bg: getComputedStyle(r.querySelector('.ag-cfg')).backgroundColor }`);
    const scrollTo = async (top) => { await s.ev(`r.host._content.scrollTop = ${top}; return 1`); await s.page.waitForTimeout(250); };

    const rest = await measure("th");
    await scrollTo(700);
    const moved = await measure("th");
    if (mobile) {
      // Sichtbarer Abstand: wie weit unter der Leiste liegt der Streifen in Seitenfarbe, und was folgt direkt darauf (der Tabellenkopf, keine Zeile)
      const strip = await s.ev(`const box=(el) => el.getBoundingClientRect(); const sub=box(r.querySelector('[data-sub="sensors"]').closest('.ag-seg')); const xs=[40, sub.left + sub.width / 2, sub.right - 30];
        let end=0; while (end < 40 && xs.every((x) => r.elementFromPoint(x, sub.bottom + end + 0.25)?.closest('.ag-cfg'))) end += 0.5;
        const next=xs.map((x) => r.elementFromPoint(x, sub.bottom + end + 0.75)?.closest('th, td')?.tagName || '-'); const th=box(r.querySelector('.ag-stickwrap .ag-table th'));
        return { end, next, overlap: Math.round((sub.bottom + end - th.top) * 10) / 10 }`);
      check(`${tag}: Sensoren, gescrollt: unter der Reiterleiste bleibt derselbe Abstand wie über ihr (${moved.above} px)`, moved.scroll > 300 && moved.above >= 6 && Math.abs(strip.end - moved.above) <= 1, JSON.stringify({ rest, moved, strip }));
      check(`${tag}: direkt unter dem Abstand steht der Tabellenkopf; er beginnt unter dem Streifen, damit keine Zeile dazwischen aufblitzt`, strip.next.every((n) => n === "TH") && strip.overlap >= 1.5 && strip.overlap <= 3, JSON.stringify(strip));
      check(`${tag}: der Abstand über der Leiste ändert sich beim Scrollen nicht`, Math.abs(moved.above - rest.above) <= 1, JSON.stringify({ rest, moved }));
      check(`${tag}: in der Lücke scheint keine Zeile durch (Seitenfarbe der Leiste)`, moved.cover && moved.bg !== "rgba(0, 0, 0, 0)", JSON.stringify(moved));
      await s.page.screenshot({ path: `${outDir}stickygap-sensors-${lang}.png` });
      // Aktionen: die Karten verschwinden mit demselben Abstand unter der Leiste, statt an ihr zu kleben
      await scrollTo(0);
      await s.tap('[data-sub="actions"]');
      await s.waitFor("return r.querySelectorAll('.ag-wf-step').length >= 2");
      await s.page.waitForTimeout(400);
      await scrollTo(260);
      // Die Karten laufen unter den Streifen in Seitenfarbe: gemessen wird, was an der Stelle zu sehen ist (nicht wo die Karte beginnt)
      const acts = await s.ev(`const box=(el) => el.getBoundingClientRect(); const main=box(r.querySelector('[data-tab="config"]').closest('.ag-seg')); const sub=box(r.querySelector('[data-sub="actions"]').closest('.ag-seg')); const above=sub.top - main.bottom; const x=sub.left + sub.width / 2;
        const strip=(dy) => !!r.elementFromPoint(x, sub.bottom + dy)?.closest('.ag-cfg'); return { above: Math.round(above * 10) / 10, top: strip(1.5), end: strip(above - 1.5), after: strip(above + 2.5), scroll: Math.round(r.host._content.scrollTop) }`);
      check(`${tag}: Aktionen, gescrollt: unter der Reiterleiste ein Streifen in Seitenfarbe, so hoch wie der Abstand darüber (${acts.above} px)`, acts.scroll > 100 && acts.above >= 6 && acts.top && acts.end && !acts.after, JSON.stringify(acts));
      await s.page.screenshot({ path: `${outDir}stickygap-actions-${lang}.png` });
    } else {
      // Computer: unverändert, der Tabellenkopf steht direkt unter dem letzten festen Teil
      const direct = await s.ev("const th=r.querySelector('.ag-stickwrap .ag-table th').getBoundingClientRect(); const last=[...r.querySelectorAll('.ag-stk')].at(-1); return { gap: Math.round(th.top - last.getBoundingClientRect().bottom), last: last.classList.contains('ag-stk-last'), scroll: Math.round(r.host._content.scrollTop) }");
      check(`${tag}: Computer unverändert: der Tabellenkopf steht direkt unter dem letzten festen Teil`, direct.scroll > 300 && direct.last && Math.abs(direct.gap) <= 1, JSON.stringify(direct));
    }
    check(`${tag}: kein Überlauf, keine Fehler im Browser`, (await s.ev("return document.documentElement.scrollWidth <= window.innerWidth")) && s.errors.length === 0, s.errors.join(" | "));
    await s.ctx.close();
  }
}
await browser.close();
done();
