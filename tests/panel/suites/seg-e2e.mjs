// 0.24.0: Reiterleisten wie in Device Panel: gleitende Kapsel (FLIP), gleiche Werte, Handy mit Raster ab fünf Reitern.
import { check, done, launch, open, outDir } from "../lib.mjs";

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const s = await open(browser, { mobile, lang, tab: "config" });
    await s.page.waitForTimeout(700);
    const style = (sel) => s.ev(`const e=r.querySelector(${JSON.stringify(sel)}); const c=getComputedStyle(e); return { gap: c.columnGap, pad: c.paddingTop, radius: c.borderRadius, bg: c.backgroundColor, display: c.display }`);
    const bar = await style(".ag-tabs");
    check(`${tag}: Leiste: Abstand 2 px, Innenabstand 3 px, Rundung 14 px`, bar.gap === "2px" && bar.pad === "3px" && bar.radius === "14px", JSON.stringify(bar));
    check(`${tag}: Kapsel ist das letzte Kind der Leiste (<i>), kein <span> am Anfang`, await s.ev("const b=r.querySelector('.ag-tabs'); return b.lastElementChild.tagName === 'I' && b.lastElementChild.classList.contains('ag-pill') && b.firstElementChild.tagName === 'BUTTON'"));
    const pill = await s.ev("const p=r.querySelector('.ag-tabs .ag-pill'); const c=getComputedStyle(p); return { dur: c.transitionDuration, ease: c.transitionTimingFunction, radius: c.borderRadius, shadow: c.boxShadow }");
    check(`${tag}: Kapsel: 0,46 s mit Nachschwingen, Rundung 11 px, Innenrand`, pill.dur.startsWith("0.46s") && pill.ease.includes("1.35") && pill.radius === "11px" && pill.shadow.includes("inset"), JSON.stringify(pill));
    check(`${tag}: Kapsel steht auf dem gewählten Reiter`, await s.ev("const on=r.querySelector('.ag-tabs > button.on'); const p=r.querySelector('.ag-tabs .ag-pill'); const a=on.getBoundingClientRect(); const b=p.getBoundingClientRect(); return Math.abs(a.left-b.left) < 1.5 && Math.abs(a.width-b.width) < 1.5 && Math.abs(a.height-b.height) < 1.5"));
    check(`${tag}: gewählter Reiter in Akzentfarbe, Schrift 500`, await s.ev("const on=r.querySelector('.ag-tabs > button.on'); const c=getComputedStyle(on); return c.fontWeight === '500' && c.color !== getComputedStyle(r.querySelector('.ag-tabs > button:not(.on)')).color"));
    check(`${tag}: Tippfläche ${mobile ? "mindestens 44" : "mindestens 36"} px`, await s.ev(`return r.querySelector('.ag-tabs > button').getBoundingClientRect().height >= ${mobile ? 44 : 36}`));
    // Wechsel: die Kapsel gleitet (Klasse go, Zwischenlage), danach steht sie am Ziel
    await s.tap('[data-tab="log"]');
    await s.page.waitForTimeout(90);
    const mid = await s.ev("const p=r.querySelector('.ag-tabs .ag-pill'); const on=r.querySelector('.ag-tabs > button.on'); return { go: p.classList.contains('go'), off: Math.round(Math.abs(p.getBoundingClientRect().left - on.getBoundingClientRect().left)) }");
    check(`${tag}: Kapsel gleitet beim Wechsel (unterwegs, durchscheinend)`, mid.go && mid.off > 2, JSON.stringify(mid));
    await s.page.waitForTimeout(800);
    check(`${tag}: danach am Ziel, "go" wieder weg`, await s.ev("const p=r.querySelector('.ag-tabs .ag-pill'); const on=r.querySelector('.ag-tabs > button.on'); return !p.classList.contains('go') && Math.abs(p.getBoundingClientRect().left - on.getBoundingClientRect().left) < 1.5 && on.dataset.tab === 'log'"));
    // Neuzeichnen mitten in der Fahrt: kein Sprung zurück (Lage nähert sich dem Ziel monoton)
    await s.tap('[data-tab="config"]');
    await s.page.waitForTimeout(120);
    const x1 = await s.ev("return r.querySelector('.ag-tabs .ag-pill').getBoundingClientRect().left");
    await s.ev("r.querySelector('.ag-tabs').classList.add('ag-redraw'); r.querySelector('.ag-tabs').classList.remove('ag-redraw')");
    await s.page.waitForTimeout(60);
    const x2 = await s.ev("return r.querySelector('.ag-tabs .ag-pill').getBoundingClientRect().left");
    check(`${tag}: Neuzeichnen unterwegs: kein Sprung zurück`, x2 >= x1 - 2, `${x1} -> ${x2}`);
    await s.page.waitForTimeout(700);
    // Zwei Leisten im selben Fenster haben eigene Schlüssel
    check(`${tag}: jede Leiste hat einen eigenen Schlüssel`, await s.ev("const keys=[...r.querySelectorAll('.ag-seg')].map((b) => (b.closest('dialog')?.id || 'page') + '|' + (b.dataset.seg || '')); return keys.length >= 2 && new Set(keys).size === keys.length && keys.every((k) => !k.endsWith('|'))"));
    // Handy: vier Unterreiter in einer Zeile
    await s.tap('[data-sub="actions"]');
    await s.page.waitForTimeout(500);
    if (mobile) {
      check(`${tag}: Handy: vier Unterreiter in einer Zeile`, await s.ev("const g=getComputedStyle(r.querySelector('.ag-subs')); return g.gridTemplateColumns.split(' ').length === 4 && r.querySelectorAll('.ag-subs > button').length === 4"));
      check(`${tag}: Kapsel steht auf dem gewählten Unterreiter`, await (async () => { await s.tap('[data-sub="system"]'); await s.page.waitForTimeout(900); return s.ev("const on=r.querySelector('.ag-subs > button.on'); const p=r.querySelector('.ag-subs .ag-pill'); const a=on.getBoundingClientRect(); const b=p.getBoundingClientRect(); return Math.abs(a.left-b.left) < 1.5 && Math.abs(a.top-b.top) < 1.5"); })());
    } else {
      check(`${tag}: Desktop: eine Zeile`, await s.ev("const g=getComputedStyle(r.querySelector('.ag-subs')); return g.gridAutoFlow.startsWith('column')"));
    }
    await s.page.screenshot({ path: `${outDir}seg-${lang}-${mobile ? "mobile" : "desktop"}.png` });
    check(`${tag}: kein Überlauf`, await s.ev("return document.documentElement.scrollWidth <= window.innerWidth"));
    check(`${tag}: keine Fehler im Browser`, s.errors.length === 0, s.errors.join(" | "));
    await s.ctx.close();
  }
}
// "Bewegung reduzieren": keine Animation, die Kapsel steht sofort am Ziel
{
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 }, reducedMotion: "reduce" });
  await ctx.close();
  const s = await open(browser, { mobile: false, lang: "de", tab: "config" });
  await s.page.emulateMedia({ reducedMotion: "reduce" });
  await s.page.waitForTimeout(300);
  await s.tap('[data-tab="log"]');
  await s.page.waitForTimeout(60);
  check(`Bewegung reduzieren: Kapsel sofort am Ziel, keine Fahrt`, await s.ev("const p=r.querySelector('.ag-tabs .ag-pill'); const on=r.querySelector('.ag-tabs > button.on'); return !p.classList.contains('go') && Math.abs(p.getBoundingClientRect().left - on.getBoundingClientRect().left) < 1.5"));
  await s.ctx.close();
}
await browser.close();
done();
