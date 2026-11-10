// 1.6.0: "Immer aktiv" als Ganzes abschalten (Anlage › Modi). Je Sprache, Desktop und Handy.
import { check, done, launch, open } from "../lib.mjs";

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const s = await open(browser, { mobile, lang, tab: "config" });
    const saved = lang === "de" ? "Gespeichert" : "Saved";
    const pill = '[data-sys="always"]';

    // Anlage › Modi: Pille neben den Modi, Standard an
    await s.tap('[data-sub="system"]');
    check(`${tag}: Pille "Immer aktiv" bei den Modi, standardmässig an`, await s.waitFor(`const b=r.querySelector('${pill}'); return !!b && b.getAttribute('aria-pressed') === 'true' && !r.querySelector('.ag-warntext')`));
    await s.tap(pill);
    check(`${tag}: ausgeschaltet: Warnung, Änderung zählt`, await s.waitFor(`return r.querySelector('${pill}').getAttribute('aria-pressed') === 'false' && !!r.querySelector('.ag-warntext') && !r.querySelector('.ag-foot [data-sys="save"]').disabled`));
    await s.tap('.ag-foot [data-sys="save"]');
    check(`${tag}: gespeichert`, await s.waitFor(`return r.querySelector('.ag-foot').innerText.includes('${saved}')`));
    const sent = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/save_system').at(-1)");
    check(`${tag}: always_enabled gesendet`, sent?.always_enabled === false, JSON.stringify(sent));

    // Sensoren: kein Reiter und keine Spalte "Immer aktiv"
    await s.tap('[data-sub="sensors"]');
    await s.waitFor("return !!r.querySelector('.ag-gbody table')");
    await s.tap('[data-sen="permode"]');
    check(`${tag}: Sensoren: kein Reiter "Immer aktiv"`, await s.waitFor("return !!r.querySelector('[data-seg=\"sen-mode\"]') && !r.querySelector('[data-seg=\"sen-mode\"] [data-sen=\"mt:always\"]')"));
    check(`${tag}: Sensoren: keine Spalte "Immer aktiv"`, await s.ev("return !r.querySelector('.ag-gbody [data-sen=\"opt\"][data-key=\"always\"], .ag-gbody [data-sen=\"mopt\"][data-key=\"always\"]')"));
    await s.tap('[data-sen="permode"]');

    // Aktionen: kein Reiter "Immer aktiv"
    await s.tap('[data-sub="actions"]');
    await s.waitFor("return r.querySelectorAll('.ag-wf-step').length > 0");
    check(`${tag}: Aktionen: kein Reiter "Immer aktiv"`, await s.ev("return !r.querySelector('[data-trigger=\"always\"]')"));

    // Übersicht: Sensoren, die nur "Immer aktiv" sind, stehen nicht in der Liste
    await s.tap('[data-tab="overview"], .ag-tabs [data-tab="overview"]').catch(() => {});
    await s.ctx.close();

    // Wieder an: Reiter und Spalte sind zurück
    const t = await open(browser, { mobile, lang, tab: "config" });
    await t.tap('[data-sub="system"]');
    await t.waitFor(`return !!r.querySelector('${pill}')`);
    check(`${tag}: im Neustart des Nachbaus ist sie wieder an`, await t.ev(`return r.querySelector('${pill}').getAttribute('aria-pressed') === 'true'`));
    await t.ctx.close();
  }
}
await browser.close();
done();
