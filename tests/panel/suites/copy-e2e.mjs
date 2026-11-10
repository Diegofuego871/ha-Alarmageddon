// 1.4.0: "Aktionen übernehmen von …" in der Fusszeile von Konfiguration › Aktionen (nur mit "Einstellungen pro Modus"). Je Sprache, Desktop und Handy.
import { check, done, launch, open } from "../lib.mjs";

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const s = await open(browser, { mobile, lang, tab: "config" });
    await s.tap('[data-sub="actions"]');
    await s.waitFor("return r.querySelectorAll('.ag-wf-step').length === 5");
    const sel = '.ag-foot select[data-wf="copy-from"]';
    const steps = () => s.ev("return r.host.actions.draft.wf");

    check(`${tag}: mit "Einstellungen pro Modus" steht die Auswahl in der Fusszeile (ohne den eigenen Reiter)`, await s.ev(`const o=[...r.querySelectorAll('${sel} option')].map((x) => x.value).filter(Boolean); return o.length >= 2 && !o.includes(r.host.actions.trigger)`));
    check(`${tag}: Auswahl ist sichtbar und breit genug`, await s.ev(`const b=r.querySelector('${sel}').getBoundingClientRect(); return b.width > 120 && b.height >= 36`));

    // Abwesend -> Anwesend: der Reiter "Anwesend" hat andere Aktionen
    await s.ev("const a=r.host.actions; a.trigger = 'home'; a.render(); return 1");
    const home = await s.ev("return JSON.stringify(r.host.actions.draft.wf.home || [])");
    const away = await s.ev("return JSON.stringify(r.host.actions.draft.wf.away || [])");
    await (await s.el(sel)).selectOption("away");
    const own = home !== "[]";
    if (own) {
      check(`${tag}: Rückfrage vor dem Ersetzen (Reiter hat eigene Aktionen)`, await s.waitFor("return r.getElementById('ag-confirm').open"));
      await s.tap('#ag-confirm [data-c="yes"]');
    }
    check(`${tag}: Aktionen von "Abwesend" übernommen (Kopie, nicht dieselbe Liste)`, await s.waitFor(`const w=r.host.actions.draft.wf; return JSON.stringify(w.home) === ${JSON.stringify(away)} && w.home !== w.away && r.querySelectorAll('.ag-wf-step').length === 5`));
    check(`${tag}: Auswahl springt zurück, Änderung zählt (Speichern frei)`, await s.ev(`return r.querySelector('${sel}').value === '' && !r.querySelector('.ag-foot [data-wf="save"]').disabled`));
    // Kopie ist unabhängig: Änderung am Reiter "Anwesend" ändert "Abwesend" nicht
    await s.tap('.ag-wf-step[data-index="2"] [data-wf="delete"]');
    check(`${tag}: Kopie unabhängig vom Original`, await s.ev(`const w=r.host.actions.draft.wf; return w.home.length === 4 && w.away.length === 5`));
    // Abbrechen verwirft alles
    await s.tap('.ag-foot [data-wf="cancel"]');
    check(`${tag}: Abbrechen stellt den gespeicherten Stand her`, await s.waitFor(`return JSON.stringify(r.host.actions.draft?.wf?.home || []) === ${JSON.stringify(home)} || !r.host.actions.draft`));

    // Ohne "Einstellungen pro Modus" gibt es die Auswahl nicht
    await s.tap('[data-wf="permode"]');
    check(`${tag}: Schalter aus: keine Auswahl`, await s.waitFor(`return !r.querySelector('${sel}')`));
    await s.ctx.close();
  }
}
await browser.close();
done();
