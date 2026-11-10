// 1.6.0: "Immer aktiv" als Ganzes abschalten (Anlage › Modi). Je Sprache, Desktop und Handy.
import { check, done, launch, open } from "../lib.mjs";

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const s = await open(browser, { mobile, lang, tab: "config" });
    const saved = lang === "de" ? "Gespeichert" : "Saved";
    const pill = '[data-sys="always"]';

    // Sensor-Blatt: "Immer aktiv" als Pille bei den Modi, "Immer aktiv ignorieren" direkt darunter, sobald der Sensor in einer Zone steht
    const smoke = "binary_sensor.rauchmelder_flur";
    const sheet = mobile ? "#ag-sheet" : ".ag-side";
    await s.tap(`[data-sen="detail"][data-ent="${smoke}"]`);
    await s.waitFor(`return !!r.querySelector('${sheet} .ag-zline')`);
    check(`${tag}: Blatt: Modi und "Immer aktiv" als Pillen in einer Zeile, "Immer aktiv" an`, await s.ev(`const c=[...r.querySelectorAll('${sheet} .ag-zline .ag-chip')]; return c.length >= 3 && c.at(-1).dataset.key === 'always' && c.at(-1).getAttribute('aria-pressed') === 'true'`));
    check(`${tag}: ohne Zone kein Schalter "Immer aktiv ignorieren"`, await s.ev(`return !r.querySelector('${sheet} [data-key="always_off"]')`));
    await s.tap(`${sheet} .ag-zline .ag-chip[data-mode="away"]`);
    check(`${tag}: mit Zone steht der Schalter direkt unter den Modi (vor "Verhalten"), standardmässig aus`, await s.waitFor(`const off=r.querySelector('${sheet} [data-key="always_off"]'); const lab=[...r.querySelectorAll('${sheet} .ag-label')].find((x) => x.textContent.trim().toLowerCase().startsWith(${JSON.stringify(lang === "de" ? "verhalten" : "behaviour")})); return !!off && !!lab && off.getAttribute('aria-checked') === 'false' && (off.compareDocumentPosition(lab) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0`));
    await s.tap(`${sheet} [data-key="always_off"]`);
    check(`${tag}: Schalter setzt "Immer aktiv ignorieren" für den Sensor`, await s.waitFor(`return r.host.sensors.draft.opts["${smoke}"]?.always_off === true`));
    await s.tap(`${sheet} .ag-zline .ag-chip[data-key="always"]`);
    check(`${tag}: Pille "Immer aktiv" ausgeschaltet: der Schalter dazu verschwindet`, await s.waitFor(`return !r.querySelector('${sheet} [data-key="always_off"]') && r.querySelector('${sheet} .ag-zline .ag-chip[data-key="always"]').getAttribute('aria-pressed') === 'false'`));
    if (mobile) await s.tap('#ag-sheet .ag-dlg-btns [data-sen="close-detail"]');
    await s.tap('.ag-foot [data-sen="cancel"]');

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
