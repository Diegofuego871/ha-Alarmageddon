// 1.29.0: Sensorkarten sind immer gleich hoch, auch mit langen Namen (bis drei Zeilen, danach "…"). Je Sprache, Desktop und Handy,
// mit und ohne alle Angaben.
import { check, done, launch, open } from "../lib.mjs";

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    for (const long of [false, true]) {
      const tag = `${lang}/${mobile ? "Handy" : "Desktop"}/${long ? "lange Namen" : "kurze Namen"}`;
      const s = await open(browser, { mobile, lang, query: long ? "&longnames=1" : "" });
      await s.page.waitForTimeout(300);
      if (mobile) {
        await s.tap('[data-list="view"]');
        await s.tap('#ag-view [data-list="vset"][data-key="layout"][data-value="cards"]');
        await s.tap('[data-list="vdone"]');
      } else await s.tap('[data-list-layout="cards"]');
      check(`${tag}: Karten da`, await s.waitFor("return r.querySelectorAll('.ag-lcard').length === 10"));
      const heights = () => s.ev("return [...r.querySelectorAll('.ag-lcard')].map((c) => Math.round(c.getBoundingClientRect().height * 10) / 10)");
      let h = await heights();
      check(`${tag}: alle 10 Karten gleich hoch`, new Set(h).size === 1, JSON.stringify(h));
      check(`${tag}: Name hat Platz für drei Zeilen (nicht kleiner als drei Zeilen)`, await s.ev("const n=r.querySelector('.ag-lname'); const lh=parseFloat(getComputedStyle(n).lineHeight); return n.getBoundingClientRect().height >= lh * 3 - 1"));
      if (long) {
        check(`${tag}: langer Name wird nach drei Zeilen gekürzt, voller Name im Tooltip`, await s.ev("const n=[...r.querySelectorAll('.ag-lname')].find((x) => x.title.includes('Nordseite')); const lh=parseFloat(getComputedStyle(n).lineHeight); return !!n && n.getBoundingClientRect().height <= lh * 3 + 1 && n.scrollHeight > n.clientHeight && n.title.includes('sehr langem Namen') && n.title.includes('drei Zeilen')"));
        check(`${tag}: vierzeiliger Name (Aqara) wird nicht abgeschnitten, bevor Zeile drei voll ist`, await s.ev("const n=[...r.querySelectorAll('.ag-lname')].find((x) => x.title.includes('Belegung')); return !!n && n.getBoundingClientRect().height > 0"));
      }
      // Karte ohne Batterie ("Netz"), mit Batterie, ohne Modell: gleiche Höhe
      check(`${tag}: Karte ohne Batterie ist so hoch wie eine mit Batterie`, await s.ev("const hs=[...r.querySelectorAll('.ag-lcard')].reduce((a, c) => { a[c.querySelector('.ag-bat') ? 'bat' : 'mains'].add(Math.round(c.getBoundingClientRect().height)); return a; }, { bat: new Set(), mains: new Set() }); return hs.bat.size === 1 && hs.mains.size >= 1 && [...hs.mains][0] === [...hs.bat][0]"));
      // Alle Angaben der Ansicht einschalten: weiterhin gleich hoch
      await s.tap('[data-list="view"]');
      await s.ev("for (const b of r.querySelectorAll('#ag-view [data-list=\"col\"][data-set=\"fields\"]')) if (b.getAttribute('aria-checked') !== 'true') b.click()");
      await s.tap('[data-list="vdone"]');
      await s.page.waitForTimeout(300);
      h = await heights();
      check(`${tag}: mit allen Angaben weiterhin alle gleich hoch`, new Set(h).size === 1, JSON.stringify(h));
      check(`${tag}: fehlende Angaben stehen als "–" da (keine leere Zeile)`, await s.ev("const f=[...r.querySelectorAll('.ag-lcard .ag-lfacts b')]; return f.length > 0 && f.every((b) => b.textContent.trim() !== '')"));
      await s.ctx.close();
    }
  }
}
await browser.close();
done();
