// 1.27.0: Kapitel "Beim Deaktivieren" ganz unten bei den Aktionen: fester Punkt "Anlage deaktiviert" mit eigener Liste (Plus), Deaktivierungston
// mit fünf eigenen, fallenden Klängen. Je Modus, nicht für "Immer aktiv"; wird mit den anderen Listen gespeichert.
import { check, done, launch, open } from "../lib.mjs";

const T = {
  de: { chap: "Beim Deaktivieren", point: "Anlage deaktiviert", kind: "Deaktivierungston", tones: ["Dreiklang absteigend", "Abschluss, zwei Töne", "Tiefe Glocke", "Sanft ausklingend", "Doppelpiep, fallend"], always: "Immer aktiv" },
  en: { chap: "When disarming", point: "Alarm system disarmed", kind: "Disarming tone", tones: ["Triad falling", "Closing, two tones", "Deep bell", "Soft, fading", "Double beep, falling"], always: "Always active" },
};

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const t = T[lang];
    const s = await open(browser, { mobile, lang, tab: "config" });
    await s.tap('[data-sub="actions"]');
    await s.waitFor("return !!r.querySelector('.ag-wf-armed') && !!r.querySelector('.ag-wf-main')");
    await s.page.waitForTimeout(700);
    const dlg = (js) => s.ev(`const d=r.getElementById("ag-step"); ${js}`);
    const saved = () => s.sim("const c=window.__calls.filter((x) => x.type === 'alarmageddon/save_workflows').pop(); return c ? JSON.parse(JSON.stringify(c.workflows_disarmed || null)) : null");

    // ----- Aufbau: eigenes Kapitel ganz unten, fester Punkt, Plus -----
    const chap = await s.ev("const w=r.querySelector('.ag-wf'); const k=[...w.children]; const last=k[k.length - 1]; const ch=k[k.length - 2]; return { chap: ch.classList.contains('ag-wf-chap') ? ch.querySelector('h3').textContent.trim() : null, line: last.classList.contains('ag-wf-disarmed'), title: last.querySelector('.ag-wf-start').textContent.trim(), plus: !!last.querySelector('[data-wf=\"add\"]'), icon: last.querySelector('.ag-mini.ok svg') !== null, afterEnd: k.indexOf(last) > k.findIndex((e) => e.classList.contains('ag-wf-after')) }");
    check(`${tag}: ganz unten das Kapitel "${t.chap}" mit dem Punkt "${t.point}" und einem Plus`, chap.chap === t.chap && chap.line && chap.title.startsWith(t.point) && chap.plus && chap.icon && chap.afterEnd, JSON.stringify(chap));

    // ----- Plus: Auswahl der Schrittarten -----
    await s.ev("const b=r.querySelector('.ag-wf-disarmed [data-wf=\"add\"]'); b.scrollIntoView({ block: 'center' }); b.click(); return 1");
    await s.waitFor("return r.getElementById('ag-step').open");
    const kinds = await dlg("return [...d.querySelectorAll('[data-wf=\"kind\"]')].map((b) => [b.dataset.kind, b.querySelector('b').textContent.trim()])");
    check(`${tag}: Auswahl: Deaktivierungston, Gerät, Warten, Szene, eigene Aktion; keine Sirene, kein Aktivierungston, kein Voralarm, keine Meldung`, JSON.stringify(kinds.map((k) => k[0])) === JSON.stringify(["dechime", "device", "wait", "scene", "custom"]) && kinds[0][1] === t.kind, JSON.stringify(kinds));
    await s.tap('#ag-step [data-wf="kind"][data-kind="dechime"]');
    await s.waitFor("return !!r.querySelector('#ag-step .ag-tone select')");
    const ed = await dlg("const sel=d.querySelector('.ag-tone select'); const sw=d.querySelector('[data-wf=\"restore\"]'); return { tones: [...sel.options].map((o) => [o.value, o.textContent.trim()]), cur: sel.value, restore: sw?.getAttribute('aria-checked'), until: !!d.querySelector('[data-wf=\"until\"]'), secs: d.querySelector('input[data-key=\"playSeconds\"]')?.value, vol: !!d.querySelector('input[type=range]') }");
    check(`${tag}: Deaktivierungston: fünf eigene Klänge (${t.tones.join(", ")}), Vorgabe der erste`, JSON.stringify(ed.tones.map((x) => x[1])) === JSON.stringify(t.tones) && ed.tones.every((x) => x[0].startsWith("off_")) && ed.cur === "off_fall", JSON.stringify(ed));
    check(`${tag}: Dauer 3 s, kein "bis zum Deaktivieren", Lautstärke, Lautsprecher zurückstellen an`, ed.secs === "3" && !ed.until && ed.vol && ed.restore === "true", JSON.stringify(ed));
    await s.ev("const i=r.querySelector('#ag-step .ag-combo input, #ag-step input[type=\"search\"]'); i.focus(); i.value='Sonos'; i.dispatchEvent(new Event('input', { bubbles: true })); return 1");
    await s.waitFor("return !!r.querySelector('#ag-step [data-wf=\"pick\"]')");
    await s.ev("r.querySelector('#ag-step [data-wf=\"pick\"]').click(); return 1");
    await (await s.el('#ag-step .ag-tone select')).selectOption("off_bell");
    await s.tap('#ag-step [data-wf="apply"]');
    await s.waitFor("return !r.getElementById('ag-step').open && r.querySelectorAll('.ag-wf-disarmed .ag-wf-step').length === 1");
    const card = await s.ev("const c=r.querySelector('.ag-wf-disarmed .ag-wf-step'); return { title: c.querySelector('b').textContent.trim(), cls: [...c.querySelector('.ag-wf-icon').classList].find((k) => k.startsWith('k-')), text: c.querySelector('.ag-small').textContent }");
    check(`${tag}: Karte "${t.kind}" mit dem gewählten Klang (${t.tones[2]})`, card.title === t.kind && card.cls === "k-dechime" && card.text.includes(t.tones[2]), JSON.stringify(card));
    check(`${tag}: der Schritt ist eine offene Änderung (Punkt am Reiter)`, await s.waitFor("return r.host.actions.dirtyCount() >= 1 && r.querySelector('[data-sub=\"actions\"]').classList.contains('has-edit')"));
    const step = await s.ev("return JSON.parse(JSON.stringify(r.host.actions.steps('disarmed')[0]))");
    check(`${tag}: gespeichert würde die Schrittart "dechime" mit Klang, Dauer, zurückstellen`, step.type === "dechime" && step.sound === "off_bell" && step.duration === 3 && step.restore === true && step.players.length === 1 && step.wait === false, JSON.stringify(step));

    // ----- Ein Gerät aus dem Alarmablauf in "Beim Deaktivieren" ziehen; die Sirene und der Aktivierungston gehen nicht -----
    const kindsOk = await s.ev("const a=r.host.actions; return { device: a._zoneKinds('disarmed').join(), main: a._zoneKinds('main').join() }");
    check(`${tag}: Liste nimmt nur Deaktivierungston, Gerät, Warten, Szene, eigene Aktion; der Alarmablauf keinen Deaktivierungston`, kindsOk.device === "dechime,device,wait,scene,custom" && !kindsOk.main.includes("dechime"), JSON.stringify(kindsOk));

    // ----- Speichern: Liste je Modus -----
    await s.tap('.ag-foot [data-wf="save"]');
    await s.page.waitForTimeout(600);
    const sent = await saved();
    check(`${tag}: gesendet wird workflows_disarmed je Modus (der Modus mit dem Schritt, die anderen leer, ohne "Immer aktiv")`, !!sent && !sent.always && sent.away?.length === 1 && sent.away[0].type === "dechime" && sent.home?.length === 0, JSON.stringify(sent));

    // ----- Aktionen übernehmen von: die Liste geht mit -----
    await s.ev("r.host.actions.reset(); return 1");
    await s.tap('[data-trigger="away"]').catch(() => 0);
    await s.ev("const a=r.host.actions; a.ensureDraft(); a._setSteps([{ type: 'dechime', players: ['media_player.sonos_kueche'], sound: 'off_confirm', duration: 3 }], 'disarmed'); a.render(); return 1");
    await s.tap('[data-trigger="night"]');
    await s.waitFor("return r.querySelectorAll('.ag-wf-disarmed .ag-wf-step').length === 0");
    await s.ev("const sel=r.querySelector('.ag-foot select[data-wf=\"copy-from\"]'); sel.value='away'; sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); return 1");
    if (await s.waitFor("return r.getElementById('ag-confirm').open", 1500)) await s.tap('#ag-confirm [data-c="yes"]');
    check(`${tag}: "Aktionen übernehmen von Abwesend" bringt auch die Schritte von "${t.chap}" mit`, await s.waitFor("return r.host.actions.draft.disarmed.night?.length === 1 && r.querySelectorAll('.ag-wf-disarmed .ag-wf-step').length === 1"));
    await s.tap('.ag-foot [data-wf="cancel"]');

    // ----- "Immer aktiv" hat das Kapitel nicht -----
    await s.waitFor("return !!r.querySelector('[data-trigger=always]')");
    await s.tap('[data-trigger="always"]');
    await s.waitFor("return !r.querySelector('.ag-wf-disarmed')");
    check(`${tag}: im Reiter "${t.always}" gibt es kein Kapitel "${t.chap}"`, await s.ev(`return !r.querySelector('.ag-wf-disarmed') && ![...r.querySelectorAll('.ag-wf-chap h3')].some((h) => h.textContent.trim() === ${JSON.stringify(t.chap)})`));
    check(`${tag}: keine Fehler im Browser`, s.errors.length === 0, s.errors.join(" | "));
    await s.ctx.close();
  }
}
await browser.close();
done();
