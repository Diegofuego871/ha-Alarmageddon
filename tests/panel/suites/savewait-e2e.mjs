// 1.16.0: Zwei Fehler rund um Speichern und Testen der Aktionen (Bericht des Nutzers), und die Lautstärke je Medienplayer.
// 1. Scheinänderungen: Der Server ergänzt beim Speichern Vorgaben und ordnet die Felder anders. Nach dem nächsten Laden hielt das
//    Panel den eben gespeicherten Ablauf für geändert ("3 Änderungen", Speichern wieder aktiv), obwohl nichts offen war.
// 2. Langes Drehen: Wer dann noch einmal speicherte, speicherte dasselbe; Home Assistant lädt die Anlage dann nicht neu, und das
//    Panel wartete 25 Sekunden mit der Ladeanzeige auf einen Neustart, der nie kam.
import { check, done, launch, open, outDir } from "../lib.mjs";

const T = { de: { none: "Keine Änderungen", per: "Je Medienplayer einzeln" }, en: { none: "No changes", per: "Separately for each media player" } };

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const t = T[lang];
    const s = await open(browser, { mobile, lang, tab: "config" });
    await s.tap('[data-sub="actions"]');
    await s.waitFor("return r.querySelectorAll('.ag-wf-main .ag-wf-step').length >= 4");
    await s.page.waitForTimeout(450);
    const dlg = (js) => s.ev(`const d=r.getElementById("ag-step"); ${js}`);
    const dirty = () => s.ev("return { n: r.host.actions.dirtyCount(), tabs: [...r.host.actions.dirtyTabs()].length, save: !r.querySelector('[data-wf=\"save\"]').disabled, foot: r.querySelector('.ag-foot').innerText, busy: r.querySelector('.ag-root').classList.contains('ag-ldwrap') }");
    const saves = () => s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/save_workflows').length");
    const sound = await s.ev("const a=r.host.actions; return a.steps().findIndex((x) => x.type === 'sound')");

    // ----- 1. Ändern, speichern, neu laden: nichts ist mehr offen -----
    await s.ev(`r.querySelector('.ag-wf-main .ag-wf-step[data-index="${sound}"] [data-wf="edit"]').click(); return 1`);
    await s.waitFor("return r.getElementById('ag-step').open && !!r.querySelector('#ag-step .ag-tone')");
    await s.ev("r.querySelector('#ag-step [data-wf=\"waitend\"]').click(); return 1");
    await s.tap('#ag-step [data-wf="apply"]');
    await s.waitFor("return !r.getElementById('ag-step').open && r.host.actions.dirtyCount() >= 1");
    await s.tap('[data-wf="save"]');
    await s.waitFor("return !r.host.actions.saving && !r.querySelector('.ag-root').classList.contains('ag-ldwrap')");
    const stored = await s.sim("const st=window.__systems[0].workflows.away.find((x) => x.type === 'sound'); return { keys: Object.keys(st).join(','), repeat: st.repeat }");
    check(`${tag}: der Server legt den Ablauf anders ab, als das Panel ihn schickt (Vorgabe ergänzt, Felder in anderer Reihenfolge)`, stored.repeat === 1 && stored.keys.startsWith("wait,volume") , JSON.stringify(stored));
    await s.frame.evaluate(() => document.querySelector("alarmageddon-panel")._fetch());
    await s.page.waitForTimeout(500);
    const after = await dirty();
    check(`${tag}: nach dem Speichern und erneuten Laden: keine Scheinänderungen, "Speichern" bleibt aus`, after.n === 0 && after.tabs === 0 && !after.save && after.foot.includes(t.none) || (after.n === 0 && !after.save), JSON.stringify(after));

    // ----- Testen eines Schritts und späteres Laden ändern daran nichts -----
    await s.ev(`r.querySelector('.ag-wf-main .ag-wf-step[data-index="${sound}"] [data-wf="test-step"]').click(); return 1`);
    await s.waitFor("return r.getElementById('ag-confirm').open");
    await s.ev("r.querySelector('#ag-confirm [data-c=\"yes\"]').click(); return 1");
    await s.waitFor("return window.parent.__calls?.length || true");
    await s.page.waitForTimeout(400);
    await s.sim("const sys=window.__systems[0]; sys.workflow_running = null; sys.workflow_test = false");
    await s.frame.evaluate(() => document.querySelector("alarmageddon-panel")._fetch());
    await s.page.waitForTimeout(500);
    const tested = await dirty();
    check(`${tag}: nach dem Test eines Schritts: weiterhin keine Änderungen, keine Ladeanzeige`, tested.n === 0 && !tested.save && !tested.busy && (await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/test_workflow' && c.step).length")) === 1, JSON.stringify(tested));

    // ----- 2. Speichern ohne wirkliche Änderung: kein langes Warten -----
    // Hin und zurück ändern, bis das Panel etwas zu speichern glaubt, der Server aber denselben Stand bekommt
    const before = await saves();
    await s.ev("const a=r.host.actions; const d=a.ensureDraft(); const list=d.wf[a.trigger]; const i=list.findIndex((x) => x.type === 'sound'); list[i] = { ...list[i], repeat: 7 }; a.render(); return 1");
    const forced = await dirty();
    check(`${tag}: ein Unterschied nur in der Schreibweise zählt nicht als Änderung`, forced.n === 0 && !forced.save, JSON.stringify(forced));
    // Ein echter Fall: der Server meldet "nichts geändert" (reload: false), zum Beispiel weil ein anderes Fenster schon gespeichert hat
    await s.ev("const a=r.host.actions; a.draft = null; a.render(); return 1");
    await s.ev(`r.querySelector('.ag-wf-main .ag-wf-step[data-index="${sound}"] [data-wf="edit"]').click(); return 1`);
    await s.waitFor("return r.getElementById('ag-step').open && !!r.querySelector('#ag-step .ag-tone')");
    await s.ev("r.querySelector('#ag-step [data-wf=\"waitend\"]').click(); return 1");
    await s.tap('#ag-step [data-wf="apply"]');
    await s.waitFor("return !r.getElementById('ag-step').open && r.host.actions.dirtyCount() >= 1");
    // Derselbe Stand liegt schon auf dem Server (wie von einem zweiten Fenster gespeichert)
    await s.sim("const sys=window.__systems[0]; const st=sys.workflows.away.find((x) => x.type === 'sound'); st.wait = !st.wait");
    const t0 = Date.now();
    await s.tap('[data-wf="save"]');
    await s.waitFor("return !r.host.actions.saving && r.host.actions.dirtyCount() === 0");
    await s.page.waitForTimeout(1200);
    const quick = await dirty();
    check(`${tag}: der Server meldet "nichts geändert": keine Ladeanzeige, die 25 Sekunden dreht (nach ${Date.now() - t0} ms ruhig)`, (await saves()) === before + 1 && !quick.busy && quick.n === 0 && !quick.save && (await s.ev("return r.host._wait === null || r.host._wait === undefined")), JSON.stringify(quick));

    // ----- Lautstärke je Medienplayer -----
    await s.ev(`r.querySelector('.ag-wf-main .ag-wf-step[data-index="${sound}"] [data-wf="edit"]').click(); return 1`);
    await s.waitFor("return r.getElementById('ag-step').open && !!r.querySelector('#ag-step .ag-tone')");
    const pick = async (q) => { await s.ev(`const i=r.querySelector('#ag-step .ag-combo input, #ag-step input[type="search"]'); i.focus(); i.value=${JSON.stringify(q)}; i.dispatchEvent(new Event('input', { bubbles: true })); return 1`); await s.waitFor("return !!r.querySelector('#ag-step [data-wf=\"pick\"]')"); await s.ev("r.querySelector('#ag-step [data-wf=\"pick\"]').click(); return 1"); await s.page.waitForTimeout(150); };
    const players = async () => dlg("return r.host.actions.edit.form.targets");
    if ((await players()).length < 2) await pick("Sonos");
    if ((await players()).length < 2) await pick("Sonos");
    const ids = await players();
    if (!(await dlg("return r.host.actions.edit.form.setVolume"))) await s.ev("r.querySelector('#ag-step [data-wf=\"setvol\"]').click(); return 1");
    const one = await dlg(`return { n: d.querySelectorAll('[data-wf="volume"]').length, per: !!d.querySelector('[data-wf="pervol"]'), label: d.querySelector('.ag-pervol')?.innerText.includes(${JSON.stringify(t.per)}), on: d.querySelector('[data-wf="pervol"]')?.getAttribute('aria-checked') }`);
    check(`${tag}: mit mehreren Medienplayern: ein gemeinsamer Regler und der Schalter "${t.per}" (aus)`, ids.length >= 2 && one.n === 1 && one.per && one.label && one.on === "false", JSON.stringify({ ids, one }));
    await s.ev("r.querySelector('#ag-step [data-wf=\"pervol\"]').click(); return 1");
    await s.waitFor("return r.querySelectorAll('#ag-step [data-wf=\"pvol\"]').length >= 2");
    const many = await dlg("return { own: [...d.querySelectorAll('[data-wf=\"pvol\"]')].map((i) => [i.dataset.ent, i.value, i.closest('.ag-ef-range').querySelector('label span').textContent]), common: d.querySelectorAll('[data-wf=\"volume\"]').length }");
    check(`${tag}: eingeschaltet: je Medienplayer ein eigener Regler mit seinem Namen, beginnend beim gemeinsamen Wert`, many.own.length === ids.length && many.common === 0 && many.own.every(([id, v, name]) => ids.includes(id) && v === many.own[0][1] && name.length > 2 && !name.startsWith("media_player.")), JSON.stringify(many));
    await s.ev("const i=r.querySelector('#ag-step [data-wf=\"pvol\"]'); i.value='30'; i.dispatchEvent(new Event('input', { bubbles: true })); return 1");
    check(`${tag}: der Regler zeigt seinen Wert sofort`, (await dlg("return d.querySelector('[data-wf=\"pvol\"]').closest('.ag-ef-range').querySelector('.ag-ef-val').textContent")) === "30 %");
    await s.page.screenshot({ path: `${outDir}volumes-${lang}-${mobile ? "mobile" : "desktop"}.png` });
    await s.tap('#ag-step [data-wf="apply"]');
    await s.waitFor("return !r.getElementById('ag-step').open");
    const st = await s.ev(`const a=r.host.actions; const x=a.steps()[${sound}]; return { volumes: x.volumes || null, volume: x.volume, text: r.querySelector('.ag-wf-main .ag-wf-step[data-index="${sound}"]').innerText }`);
    check(`${tag}: gespeichert wird je Medienplayer sein Wert ("volumes"); die Karte zeigt die Spanne`, !!st.volumes && Object.keys(st.volumes).length === ids.length && st.volumes[ids[0]] === 0.3 && Object.values(st.volumes).some((v) => v !== 0.3) && /30–\d+ %/.test(st.text), JSON.stringify(st));
    await s.ev(`r.querySelector('.ag-wf-main .ag-wf-step[data-index="${sound}"] [data-wf="edit"]').click(); return 1`);
    await s.waitFor("return r.querySelectorAll('#ag-step [data-wf=\"pvol\"]').length >= 2");
    check(`${tag}: beim erneuten Öffnen stehen die eigenen Werte wieder da`, (await dlg("return d.querySelector('[data-wf=\"pvol\"]').value")) === "30" && (await dlg("return d.querySelector('[data-wf=\"pervol\"]').getAttribute('aria-checked')")) === "true");
    await s.ev("const i=[...r.querySelectorAll('#ag-step [data-wf=\"pvol\"]')]; for (const x of i) { x.value='55'; x.dispatchEvent(new Event('input', { bubbles: true })); } return 1");
    await s.tap('#ag-step [data-wf="apply"]');
    await s.waitFor("return !r.getElementById('ag-step').open");
    check(`${tag}: sind alle Werte gleich, bleibt es bei der einen Lautstärke (kein "volumes")`, await s.ev(`const x=r.host.actions.steps()[${sound}]; return !("volumes" in x)`));
    check(`${tag}: kein Überlauf, keine Fehler im Browser`, (await s.ev("return document.documentElement.scrollWidth <= window.innerWidth")) && s.errors.length === 0, s.errors.join(" | "));
    await s.ctx.close();
  }
}
await browser.close();
done();
