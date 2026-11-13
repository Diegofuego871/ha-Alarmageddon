// 1.33.0: Wiederherstellen: je Anlage der Sicherung wählt man das Ziel (bestehende Anlage, neue Anlage, nicht wiederherstellen); der Name der
// Anlage spielt keine Rolle. Je Sprache, Desktop und Handy, echte Klicks/Taps.
import { writeFileSync } from "node:fs";
import { check, done, launch, open, outDir } from "../lib.mjs";

const T = {
  de: { intro: "Der Name spielt keine Rolle", skip: "Nicht wiederherstellen", newOpt: "Als neue Anlage hinzufügen", same: "dasselbe Ziel", sameNew: "heissen gleich", replaces: "Ersetzt die Einstellungen von", stays: "Bleibt, wie sie ist", taken: "heisst schon so", settings: "Gemeinsame Einstellungen auch wiederherstellen", codes: "Codes sind nie Teil einer Sicherung" },
  en: { intro: "The name does not matter", skip: "Do not restore", newOpt: "Add as a new alarm system", same: "same target", sameNew: "same name", replaces: "Replaces the settings of", stays: "Stays as it is", taken: "already has this name", settings: "Restore the shared settings too", codes: "Codes are never part of a backup" },
};

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const t = T[lang];
    const s = await open(browser, { mobile, lang, tab: "config" });
    await s.tap('[data-sub="system"]');
    await s.waitFor("return !!r.querySelector('[data-sys=\"import-file\"]')");
    const file = `${outDir}restoremap-test.json`;
    writeFileSync(file, JSON.stringify({ format: "alarmageddon", version: 1, settings: { presets: {} }, systems: [{ title: "Hütte", options: { workflows: { away: [{ type: "notify" }] } } }, { title: "Haus", options: {} }] }));
    await (await s.el('[data-sys="import-file"]')).setInputFiles(file);
    const dlg = "r.getElementById('ag-codes')";
    check(`${tag}: Dialog mit einer Zeile je Anlage der Sicherung und dem Satz "${t.intro}"`, await s.waitFor(`const d=${dlg}; return d.open && d.querySelectorAll('.ag-rrow').length === 2 && d.innerText.includes(${JSON.stringify(t.intro)}) && d.innerText.includes(${JSON.stringify(t.codes)})`));
    const sel = (i) => `#ag-codes .ag-rrow[data-ri="${i}"] select`;
    const val = (i) => s.ev(`return r.querySelector('${sel(i)}').value`);
    const go = () => s.ev("return !r.querySelector('#ag-codes [data-sys=\"import-go\"]').disabled");
    check(`${tag}: Vorschlag: "Haus" ersetzt die Anlage "Haus", "Hütte" (kein Treffer) wird neu angelegt`, (await val(1)) === "e_haus" && (await val(0)) === "new");
    check(`${tag}: neue Anlage zeigt ein Namensfeld mit dem Namen aus der Sicherung`, await s.ev("const i=r.querySelector('#ag-codes .ag-rrow[data-ri=\"0\"] input'); return !!i && i.value === 'Hütte'"));
    check(`${tag}: freier Name: "Wiederherstellen" frei`, await s.waitFor("return !r.querySelector('#ag-codes [data-sys=\"import-go\"]').disabled"));
    check(`${tag}: Zeile mit bestehendem Ziel sagt, was ersetzt wird`, await s.ev(`return r.querySelector('#ag-codes .ag-rrow[data-ri="1"] .ag-rhint').innerText.includes(${JSON.stringify(t.replaces)})`));
    if (mobile) check(`${tag}: Handy: Dialog im Bild, Auswahlfelder mindestens 44 px hoch`, await s.ev("const d=r.getElementById('ag-codes'); const w=r.host.getBoundingClientRect(); const q=d.getBoundingClientRect(); return q.left >= 0 && q.right <= w.width + 1 && [...d.querySelectorAll('.ag-rrow select')].every((x) => x.getBoundingClientRect().height >= 44)"));

    // Ziel frei wählbar: "Hütte" auf die Anlage "Garage" (anderer Name)
    await (await s.el(sel(0))).selectOption("e_garage");
    check(`${tag}: "Hütte" auf "Garage" anwenden: Namensfeld weg, Hinweis nennt "Garage", frei`, await s.waitFor(`const r0=r.querySelector('#ag-codes .ag-rrow[data-ri="0"]'); return !r0.querySelector('input') && r0.querySelector('.ag-rhint').innerText.includes('Garage') && !r.querySelector('#ag-codes [data-sys="import-go"]').disabled`));
    // Gleiches Ziel zweimal
    await (await s.el(sel(1))).selectOption("e_garage");
    check(`${tag}: zwei Anlagen auf dasselbe Ziel: Warnung ("${t.same}"), gesperrt`, await s.waitFor(`const d=${dlg}; return d.innerText.includes(${JSON.stringify(t.same)}) && d.querySelector('[data-sys="import-go"]').disabled`));
    // Nicht wiederherstellen
    await (await s.el(sel(1))).selectOption("skip");
    check(`${tag}: "${t.skip}": Hinweis "${t.stays}", Warnung weg, frei`, await s.waitFor(`const d=${dlg}; return d.querySelector('.ag-rrow[data-ri="1"] .ag-rhint').innerText.includes(${JSON.stringify(t.stays)}) && !d.innerText.includes(${JSON.stringify(t.same)}) && !d.querySelector('[data-sys="import-go"]').disabled`));

    // Neue Anlage: vergebener, leerer und doppelter Name
    await (await s.el(sel(0))).selectOption("new");
    const name0 = await s.el('#ag-codes .ag-rrow[data-ri="0"] input');
    await name0.fill("garage");
    check(`${tag}: neuer Name "garage" (Gross-/Kleinschreibung egal) ist vergeben: Warnung, gesperrt`, await s.waitFor(`const d=${dlg}; return d.innerText.includes(${JSON.stringify(t.taken)}) && d.querySelector('[data-sys="import-go"]').disabled`));
    await name0.fill("");
    check(`${tag}: leerer Name: gesperrt`, await s.waitFor(`return r.querySelector('#ag-codes [data-sys="import-go"]').disabled`));
    await name0.fill("Hüttli");
    check(`${tag}: freier neuer Name: frei`, await s.waitFor(`return !r.querySelector('#ag-codes [data-sys="import-go"]').disabled && !r.getElementById('ag-codes').innerText.includes(${JSON.stringify(t.taken)})`));
    await (await s.el(sel(1))).selectOption("new");
    await (await s.el('#ag-codes .ag-rrow[data-ri="1"] input')).fill("hüttli");
    check(`${tag}: zwei neue Anlagen mit gleichem Namen: Warnung ("${t.sameNew}"), gesperrt`, await s.waitFor(`const d=${dlg}; return d.innerText.includes(${JSON.stringify(t.sameNew)}) && d.querySelector('[data-sys="import-go"]').disabled`));
    await (await s.el(sel(1))).selectOption("skip");

    // Gemeinsame Einstellungen: Schalter, ohne Auswahl und ohne Einstellungen gibt es nichts zu tun
    check(`${tag}: Schalter "${t.settings}" ist an`, await s.ev(`const d=${dlg}; const b=d.querySelector('[data-sys="rs"]'); return d.innerText.includes(${JSON.stringify(t.settings)}) && b.getAttribute('aria-checked') === 'true'`));
    await (await s.el(sel(0))).selectOption("skip");
    check(`${tag}: alles übersprungen, Einstellungen an: frei`, await s.waitFor("return !r.querySelector('#ag-codes [data-sys=\"import-go\"]').disabled"));
    await s.tap('#ag-codes [data-sys="rs"]');
    check(`${tag}: alles übersprungen, Einstellungen aus: nichts zu tun, gesperrt`, await s.waitFor("return r.querySelector('#ag-codes [data-sys=\"import-go\"]').disabled && r.querySelector('#ag-codes [data-sys=\"rs\"]').getAttribute('aria-checked') === 'false'"));

    // Wiederherstellen: "Hütte" auf "Garage", "Haus" nicht, Einstellungen aus
    await (await s.el(sel(0))).selectOption("e_garage");
    await s.waitFor("return !r.querySelector('#ag-codes [data-sys=\"import-go\"]').disabled");
    await s.tap('#ag-codes [data-sys="import-go"]');
    check(`${tag}: Wiederherstellen schickt die Wahl an den Server`, await s.waitFor("return !r.getElementById('ag-codes').open") && (await s.sim("const c=(window.__importCalls || []); return c.length === 1 && JSON.stringify(c[0].mapping) === JSON.stringify([{ index: 0, target: 'e_garage' }, { index: 1, target: 'skip' }]) && c[0].restore_settings === false")));
    check(`${tag}: die Einstellungen von "Hütte" liegen jetzt auf "Garage", "Haus" blieb`, await s.sim("const g=window.__systems.find((x) => x.entry_id === 'e_garage'); const h=window.__systems.find((x) => x.entry_id === 'e_haus'); return g.workflows.away?.[0]?.type === 'notify' && g.title === 'Garage' && h.workflows.away.length === 5"));
    check(`${tag}: keine Fehler im Browser`, s.errors.length === 0, s.errors.join(" | "));
    await s.ctx.close();

    // Als neue Anlage: die Sicherung einer gelöschten Anlage kommt zurück
    const s2 = await open(browser, { mobile, lang, tab: "config" });
    await s2.tap('[data-sub="system"]');
    await (await s2.el('[data-sys="import-file"]')).setInputFiles(file);
    await s2.waitFor("return r.getElementById('ag-codes').open && r.querySelectorAll('#ag-codes .ag-rrow').length === 2");
    await (await s2.el('#ag-codes .ag-rrow[data-ri="1"] select')).selectOption("skip");
    await (await s2.el('#ag-codes .ag-rrow[data-ri="0"] input')).fill("Hüttli");
    await s2.waitFor("return !r.querySelector('#ag-codes [data-sys=\"import-go\"]').disabled");
    await s2.tap('#ag-codes [data-sys="import-go"]');
    await s2.waitFor("return !r.getElementById('ag-codes').open");
    check(`${tag}: als neue Anlage "Hüttli" wiederhergestellt, mit den gesicherten Aktionen`, await s2.sim("const n=window.__systems.find((x) => x.title === 'Hüttli'); const c=window.__importCalls[0]; return !!n && n.workflows.away?.[0]?.type === 'notify' && JSON.stringify(c.mapping) === JSON.stringify([{ index: 0, target: 'new', name: 'Hüttli' }, { index: 1, target: 'skip' }]) && c.restore_settings === true"));
    await s2.ctx.close();
  }
}
await browser.close();
done();
