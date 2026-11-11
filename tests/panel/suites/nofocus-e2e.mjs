// 1.17.10: Ein Fenster öffnet, ohne dass ein Suchfeld von selbst den Fokus bekommt.
// Der Browser setzt beim Öffnen eines Dialogs den Fokus auf das erste Feld. Im Schritt-Editor ist das die Suche nach Geräten
// oder Medienplayern: die Vorschlagsliste klappte auf, auf dem Handy kam die Tastatur. Geprüft werden alle Fenster, die mit
// einem Suchfeld oder Auswahlfeld beginnen können. Fenster, die bewusst im Feld starten (Umbenennen, Code), bleiben so.
import { check, done, launch, open } from "../lib.mjs";

const STATE = `const d=[...r.querySelectorAll('dialog[open]')].pop(); const a=r.activeElement;
  return { open: !!d, tag: a ? a.tagName + (a.type ? ':' + a.type : '') + (a.dataset?.wf ? ':' + a.dataset.wf : '') : '', text: !!a && a.matches('input:not([type=range]):not([type=checkbox]), textarea'),
    lists: d ? [...d.querySelectorAll('.ag-combo.open .ag-combo-list')].filter((l) => l.getBoundingClientRect().height > 0).length : 0 };`;

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const s = await open(browser, { mobile, lang, tab: "config" });
    const closeAll = () => s.ev("for (const d of r.querySelectorAll('dialog[open]')) d.close(); return 1");
    const calm = async (where) => {
      await s.page.waitForTimeout(350);
      const st = await s.ev(STATE);
      check(`${tag}: ${where}: kein Suchfeld im Fokus, keine Vorschlagsliste offen`, st.open && !st.text && st.lists === 0, JSON.stringify(st));
    };

    // ----- Aktionen: jeden Schritt zum Bearbeiten öffnen -----
    await s.tap('[data-sub="actions"]');
    await s.waitFor("return r.querySelectorAll('.ag-wf-step').length > 0");
    const steps = await s.ev("return [...r.querySelectorAll('.ag-wf-main .ag-wf-step')].map((e) => [e.dataset.index, [...e.querySelector('.ag-wf-icon').classList].find((c) => c.startsWith('k-'))])");
    const seen = new Set();
    for (const [index, kind] of steps) {
      if (seen.has(kind)) continue;
      seen.add(kind);
      await s.tap(`.ag-wf-main .ag-wf-step[data-index="${index}"] [data-wf="edit"]`);
      await s.waitFor("return r.getElementById('ag-step').open");
      await calm(`Schritt bearbeiten (${kind})`);
      await closeAll();
    }
    // Neuer Schritt über die Auswahl der Schrittart
    for (const kind of ["device", "sound", "prealarm", "notify"]) {
      await s.ev("r.querySelector('.ag-wf-main [data-wf=\"add\"]').click(); return 1");
      await s.waitFor("return r.getElementById('ag-step').open");
      const has = await s.ev(`return !!r.querySelector('#ag-step [data-wf="kind"][data-kind="${kind}"]')`);
      if (has) {
        await s.tap(`#ag-step [data-wf="kind"][data-kind="${kind}"]`);
        await calm(`Neuer Schritt (${kind})`);
      }
      await closeAll();
    }
    await s.tap('[data-wf="end-edit"]');
    await s.waitFor("return r.getElementById('ag-step').open");
    await calm('Fenster "Alarm endet"');
    await closeAll();
    // Das Suchfeld funktioniert weiter, sobald man es antippt
    await s.tap(`.ag-wf-main .ag-wf-step[data-index="${steps.find(([, k]) => k === "k-device")?.[0] ?? 0}"] [data-wf="edit"]`);
    await s.waitFor("return r.getElementById('ag-step').open");
    await s.page.waitForTimeout(350);
    await s.tap('#ag-step [data-wf="eq"]');
    check(`${tag}: ein Tipp ins Suchfeld klappt die Vorschläge auf`, await s.waitFor("return !!r.querySelector('#ag-step .ag-combo.open') && r.activeElement?.dataset?.wf === 'eq'"));
    await closeAll();
    await s.ev("r.querySelector('[data-wf=\"cancel\"]')?.click(); return 1");

    // ----- Sensoren hinzufügen und Voreinstellungen -----
    await s.tap('[data-sub="sensors"]');
    await s.waitFor("return !!r.querySelector('[data-sen=\"presets\"]')");
    await s.ev("r.querySelector('[data-sen=\"add\"], [data-sen=\"pick\"], [data-sen=\"open-pick\"]')?.click(); return 1");
    if (await s.waitFor("return r.getElementById('ag-pick').open", 2000)) await calm('Fenster "Sensoren hinzufügen"');
    await closeAll();
    check(`${tag}: keine Fehler im Browser`, s.errors.length === 0, s.errors.join(" | "));
    await s.ctx.close();
  }
}
await browser.close();
done();
