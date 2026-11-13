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

    // Nur ein Wert im Schritt weicht ab (Lautstärke), Aktionen und Reihenfolge gleich: wird trotzdem übernommen, auch in den anderen Listen
    await s.ev("const a=r.host.actions; const d=a.ensureDraft(); a.trigger='home'; const base=[{type:'chime',players:['media_player.a','media_player.b'],sound:'tone_pip',duration:3,volumes:{'media_player.a':0.2,'media_player.b':0.4}}]; d.wf.home = JSON.parse(JSON.stringify(d.wf.away||[])); d.armed = {...d.armed, away: base, home: JSON.parse(JSON.stringify(base).replace('0.4','0.9'))}; a.render(); return 1");
    await (await s.el(sel)).selectOption("away");
    await s.waitFor("return r.getElementById('ag-confirm').open");
    await s.tap('#ag-confirm [data-c="yes"]');
    check(`${tag}: nur ein Wert im Schritt weicht ab (Lautstärke): wird übernommen`, await s.waitFor("const d=r.host.actions.draft; return d.armed.home[0].volumes['media_player.b'] === 0.4"));
    await (await s.el(sel)).selectOption("away");
    check(`${tag}: danach gleich: nichts mehr zu übernehmen, keine Rückfrage`, await s.ev("return !r.getElementById('ag-confirm').open"));

    // Jede der sieben Listen für sich: weicht nur dort ein Detail ab (Wert im Schritt, "Alarm endet"), wird übernommen
    for (const key of ["wf", "after", "armed", "arming", "entrySteps", "disarmed", "end"]) {
      await s.ev(`const a=r.host.actions; a.draft=null; const d=a.ensureDraft(); a.trigger='home';
        const same = [{type:'chime',players:['media_player.a'],sound:'tone_pip',duration:3,volume:0.5}];
        for (const k of ['wf','after','armed','arming','entrySteps','disarmed']) { d[k] = {...(d[k]||{}), away: JSON.parse(JSON.stringify(same)), home: JSON.parse(JSON.stringify(same))}; }
        d.end = {...(d.end||{}), away: {}, home: {}};
        if ('${key}' === 'end') d.end.home = {notify: {enabled: true, title: 'x', message: '', critical: null, volume: null, click: 'log', click_path: ''}};
        else d['${key}'].home[0].volume = 0.6;
        a.render(); return 1`);
      await (await s.el(sel)).selectOption("away");
      check(`${tag}: nur "${key}" weicht ab (ein Wert): Rückfrage und Übernahme`, await s.waitFor("return r.getElementById('ag-confirm').open", 3000));
      await s.tap('#ag-confirm [data-c="yes"]');
      check(`${tag}: "${key}" übernommen`, await s.waitFor(`const d=r.host.actions.draft; return '${key}' === 'end' ? !d.end.home.notify : d['${key}'].home[0].volume === 0.5`));
    }

    // Ohne "Einstellungen pro Modus" gibt es die Auswahl nicht
    await s.tap('[data-wf="permode"]');
    check(`${tag}: Schalter aus: keine Auswahl`, await s.waitFor(`return !r.querySelector('${sel}')`));
    await s.ctx.close();
  }
}
await browser.close();
done();
