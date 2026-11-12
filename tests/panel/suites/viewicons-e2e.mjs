// 1.23.0: Jeder Auswahlknopf im Fenster "Ansicht" hat ein Symbol vor dem Text. Liste und Karten tragen dieselben Symbole wie der
// Umschalter in der Werkzeugleiste des Panels (Vorgabe des Nutzers: durchgängig).
import { check, done, launch, open } from "../lib.mjs";

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const s = await open(browser, { mobile, lang });
    await s.waitFor("return !!r.querySelector('[data-list=\"view\"]')");
    const toolbar = mobile ? null : await s.ev("const g=r.querySelector('[data-seg=\"layout\"]'); return [...g.querySelectorAll('button')].map((b) => b.querySelector('path').getAttribute('d'))");
    await s.tap('[data-list="view"]');
    await s.waitFor("return r.getElementById('ag-view').open");
    const segs = await s.ev("return [...r.querySelectorAll('#ag-view [data-seg^=\"view-\"]')].map((g) => ({ name: g.dataset.seg, buttons: [...g.querySelectorAll('button')].map((b) => ({ icon: !!b.querySelector(':scope > svg:first-child'), label: b.querySelector('span')?.textContent.trim() || '', d: b.querySelector('path')?.getAttribute('d') || '', size: Math.round(b.querySelector('svg')?.getBoundingClientRect().width || 0) })) }))");
    check(`${tag}: vier Auswahlleisten (Darstellung, Gruppieren, Richtung)`, segs.map((x) => x.name).join() === "view-layout,view-group,view-dir", JSON.stringify(segs.map((x) => x.name)));
    check(`${tag}: jeder Knopf hat ein Symbol vor dem Text und einen Text`, segs.every((g) => g.buttons.every((b) => b.icon && b.label && b.size === 20)), JSON.stringify(segs));
    const all = segs.flatMap((g) => g.buttons.map((b) => b.d));
    check(`${tag}: alle Symbole sind verschieden`, new Set(all).size === all.length, String(all.length));
    if (toolbar) check(`${tag}: Liste und Karten wie in der Werkzeugleiste`, segs[0].buttons.map((b) => b.d).join("|") === toolbar.join("|"), JSON.stringify(toolbar));
    const wide = await s.ev("const d=r.getElementById('ag-view'); return d.scrollWidth <= d.clientWidth + 1 && [...d.querySelectorAll('.ag-seg button')].every((b) => b.scrollWidth <= b.clientWidth + 1)");
    check(`${tag}: nichts läuft über`, wide);
    check(`${tag}: keine Fehler im Browser`, s.errors.length === 0, s.errors.join(" | "));
    await s.ctx.close();
  }
}
await browser.close();
done();
