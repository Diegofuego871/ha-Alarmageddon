// 1.10.0: Aktionen nach dem Quittieren (zweite Liste hinter "Alarm endet (quittiert)") und der neue Standard: Schritte laufen weiter,
// "Warten, bis die Aktion beendet ist" ist eine Option. Je Sprache auf Desktop und Handy.
import { check, done, launch, open, outDir } from "../lib.mjs";

const T = {
  de: { end: "Alarm endet (quittiert)", hint: "Optional: Aktionen nach dem Quittieren", more: "Weitere Aktion nach dem Quittieren", restore: "Rückgängig", until: "Bis zum Deaktivieren", waitOpt: "Warten, bis die Aktion beendet ist", waits: "Wartet, bis die Aktion beendet ist", one: "1 Änderung", none: "Keine Änderungen" },
  en: { end: "Alarm ends (acknowledged)", hint: "Optional: actions after acknowledging", more: "Another action after acknowledging", restore: "Undo", until: "Until disarmed", waitOpt: "Wait until the action has finished", waits: "Waits until the action has finished", one: "1 change", none: "No changes" },
};

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const t = T[lang];
    const s = await open(browser, { mobile, lang, tab: "config" });
    await s.tap('[data-sub="actions"]');
    await s.waitFor("return !!r.querySelector('.ag-wf-after')");
    const dlg = (js) => s.ev(`const d=r.getElementById("ag-step"); ${js}`);
    const after = () => s.ev("const a=r.host.actions; return JSON.parse(JSON.stringify(a.draft.after?.[a.trigger] || []))");
    const foot = () => s.ev("return r.querySelector('.ag-foot').innerText");

    // ----- Aufbau -----
    const order = await s.ev("const b=(q) => r.querySelector(q).getBoundingClientRect(); return { main: b('.ag-wf-main').bottom, end: b('.ag-wf-end').top, card: b('.ag-wf-endcard').bottom, after: b('.ag-wf-after').top, title: r.querySelector('.ag-wf-end .ag-wf-start').innerText.trim() }");
    check(`${tag}: Reihenfolge: Ablauf, "${t.end}" mit der Meldung, darunter ein Plus für Aktionen danach`, order.title === t.end && order.main <= order.end + 1 && order.card <= order.after + 1, JSON.stringify(order));
    const plus0 = await s.ev("const p=r.querySelector('.ag-wf-after .ag-wf-plus'); const h=p.querySelector('.ag-wf-plushint'); const hb=h.getBoundingClientRect(), ab=p.querySelector('.ag-wf-add').getBoundingClientRect(); const segs=[...p.querySelectorAll('.ag-wf-seg')]; return { hint: h.textContent, right: hb.right, vw: innerWidth, beside: hb.left >= ab.right && Math.abs((hb.top + hb.bottom) / 2 - (ab.top + ab.bottom) / 2) < 3, lower: getComputedStyle(segs[1]).visibility, upper: getComputedStyle(segs[0]).visibility, n: r.querySelectorAll('.ag-wf-after .ag-wf-plus').length, axis: Math.abs((ab.left + ab.right) / 2 - (() => { const m=r.querySelector('.ag-wf-end .ag-mini').getBoundingClientRect(); return (m.left + m.right) / 2; })()) }");
    check(`${tag}: leer: ein Plus mit Hinweis daneben, auf der Achse des Ablaufs; die Linie endet am Plus`, plus0.n === 1 && plus0.hint.startsWith(t.hint) && plus0.beside && plus0.right <= plus0.vw && plus0.lower === "hidden" && plus0.upper === "visible" && plus0.axis <= 1, JSON.stringify(plus0));

    // ----- Schritt hinzufügen: nur was danach Sinn hat -----
    await s.tap('.ag-wf-after [data-wf="add"]');
    await s.waitFor("return r.getElementById('ag-step').open");
    check(`${tag}: Auswahl ohne Alarmmeldung und Quittieren`, JSON.stringify(await dlg("return [...d.querySelectorAll('[data-wf=\"kind\"]')].map((b) => b.dataset.kind)")) === JSON.stringify(["device", "sound", "chime", "wait", "scene", "custom"]));
    await s.tap('#ag-step [data-wf="kind"][data-kind="device"]');
    await s.waitFor("return !!r.querySelector('#ag-step [data-wf=\"waitend\"]')");
    const ed = await dlg(`return { restore: !!d.querySelector('[data-wf="restore"]'), wait: d.querySelector('[data-wf="waitend"]').getAttribute('aria-checked'), label: d.querySelector('[data-wf="waitend"]').closest('.ag-ef-row').innerText.includes(${JSON.stringify(t.waitOpt)}), text: d.innerText.includes(${JSON.stringify(t.restore)}) }`);
    check(`${tag}: Gerät danach: kein "${t.restore}", "${t.waitOpt}" ist aus`, !ed.restore && !ed.text && ed.wait === "false" && ed.label, JSON.stringify(ed));
    await s.ev("const i=r.querySelector('#ag-step .ag-combo input, #ag-step input[type=\"search\"], #ag-step input'); i.focus(); i.value='Steckdose'; i.dispatchEvent(new Event('input', { bubbles: true })); return 1");
    await s.waitFor("return !!r.querySelector('#ag-step [data-wf=\"pick\"][data-ent=\"switch.steckdose_flur\"]')");
    await s.tap('#ag-step [data-wf="pick"][data-ent="switch.steckdose_flur"]');
    await s.tap('#ag-step [data-wf="apply"]');
    await s.waitFor("return !r.getElementById('ag-step').open && r.querySelectorAll('.ag-wf-after .ag-wf-step').length === 1");
    const first = (await after())[0];
    check(`${tag}: Schritt steht in der Liste danach: läuft weiter ("wait": false), ohne "Rückgängig"`, first?.type === "action" && first.wait === false && first.restore === false && JSON.stringify(first.target) === JSON.stringify(["switch.steckdose_flur"]), JSON.stringify(first));
    check(`${tag}: Karte ohne Pille und ohne Marke "Rückgängig"; der Ablauf beim Alarm ist unverändert`, await s.ev("const c=r.querySelector('.ag-wf-after .ag-wf-step'); return !c.querySelector('.ag-waitpill') && !c.querySelector('.ag-tag') && r.host.actions.dirtyCount() >= 1 && JSON.stringify(r.host.actions.draft.wf) === JSON.stringify(r.host.actions.system.workflows)"));
    check(`${tag}: zwei Plus (davor, danach), nur das letzte mit Hinweis "${t.more}"`, await s.ev(`const ps=[...r.querySelectorAll('.ag-wf-after .ag-wf-plus')]; return ps.length === 2 && !ps[0].querySelector('.ag-wf-plushint') && ps[1].querySelector('.ag-wf-plushint').textContent === ${JSON.stringify(t.more)}`));

    // Ton danach: braucht eine Dauer; mit "Warten …" hält er den nächsten Schritt auf
    await s.ev("r.querySelectorAll('.ag-wf-after [data-wf=\"add\"]')[1].click(); return 1");
    await s.waitFor("return r.getElementById('ag-step').open");
    await s.tap('#ag-step [data-wf="kind"][data-kind="sound"]');
    await s.waitFor("return !!r.querySelector('#ag-step .ag-tone')");
    check(`${tag}: Ton danach: kein "bis zum Deaktivieren", kein "${t.restore}"`, await dlg("return !d.querySelector('[data-wf=\"until\"]') && !d.querySelector('[data-wf=\"restore\"]') && !!d.querySelector('[data-wf=\"waitend\"]')"));
    await s.ev("const i=r.querySelector('#ag-step .ag-combo input, #ag-step input[type=\"search\"], #ag-step input'); i.focus(); i.value='Sonos'; i.dispatchEvent(new Event('input', { bubbles: true })); return 1");
    await s.waitFor("return !!r.querySelector('#ag-step [data-wf=\"pick\"]')");
    await s.ev("r.querySelector('#ag-step [data-wf=\"pick\"]').click(); return 1");
    await s.ev("r.querySelector('#ag-step [data-wf=\"waitend\"]').click(); return 1");
    await s.tap('#ag-step [data-wf="apply"]');
    await s.waitFor("return !r.getElementById('ag-step').open && r.querySelectorAll('.ag-wf-after .ag-wf-step').length === 2");
    const second = (await after())[1];
    check(`${tag}: Ton mit Dauer und "wait": true; die Karte trägt die Pille "${t.waits}"`, second?.type === "sound" && second.duration > 0 && second.wait === true && second.restore === false && (await s.ev("return r.querySelectorAll('.ag-wf-after .ag-wf-step')[1].querySelector('.ag-waitpill')?.textContent.trim()")) === t.waits, JSON.stringify(second));

    // Verschieben mit der Tastatur bleibt in der Liste; Bearbeiten und Löschen treffen die richtige Liste
    await s.ev("const g=r.querySelector('.ag-wf-after [data-wf=\"grab\"][data-index=\"1\"]'); g.focus(); g.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, composed: true })); return 1");
    check(`${tag}: Pfeil nach oben verschiebt innerhalb der Liste danach`, await s.waitFor("const a=r.host.actions; return a.draft.after[a.trigger][0].type === 'sound' && JSON.stringify(a.draft.wf) === JSON.stringify(a.system.workflows)"));
    await s.ev("r.querySelector('.ag-wf-after .ag-wf-step[data-index=\"0\"] [data-wf=\"edit\"]').click(); return 1");
    await s.waitFor("return r.getElementById('ag-step').open && !!r.querySelector('#ag-step .ag-tone')");
    check(`${tag}: Bearbeiten öffnet den Schritt der Liste danach (Ton, ohne "bis zum Deaktivieren")`, await dlg("return !d.querySelector('[data-wf=\"until\"]') && d.querySelector('[data-wf=\"waitend\"]').getAttribute('aria-checked') === 'true'"));
    await s.tap('#ag-step [data-wf="close"]');
    await s.waitFor("return !r.getElementById('ag-step').open");
    await s.page.screenshot({ path: `${outDir}after-${lang}-${mobile ? "mobile" : "desktop"}.png`, fullPage: false });
    await s.ev("r.querySelector('.ag-wf-after .ag-wf-step[data-index=\"0\"] [data-wf=\"delete\"]').click(); return 1");
    check(`${tag}: Löschen entfernt nur den Schritt der Liste danach`, await s.waitFor("const a=r.host.actions; return a.draft.after[a.trigger].length === 1 && a.draft.after[a.trigger][0].type === 'action' && JSON.stringify(a.draft.wf) === JSON.stringify(a.system.workflows)"));

    // ----- Speichern -----
    check(`${tag}: die Fusszeile zählt die Änderung`, (await foot()).includes(t.one), await foot());
    await s.tap('[data-wf="save"]');
    await s.waitFor("return !r.host.actions.saving && r.host.actions.dirtyCount() === 0");
    const sent = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/save_workflows').at(-1)");
    const keys = Object.keys(sent?.workflows_after || {}).sort();
    const cur = await s.ev("return r.host.actions.trigger");
    // Die Anlage des Nachbaus hat je Modus eigene Abläufe ("Einstellungen pro Modus" ist an): die Liste gilt für den gewählten Modus
    check(`${tag}: gespeichert: alle Auslöser gesendet, die Liste steht beim gewählten Modus und läuft weiter`, JSON.stringify(keys) === JSON.stringify(Object.keys(sent.workflows).sort()) && sent.workflows_after[cur].length === 1 && sent.workflows_after[cur][0].wait === false && keys.filter((k) => k !== cur).every((k) => sent.workflows_after[k].length === 0), JSON.stringify(sent?.workflows_after));
    await s.frame.evaluate(() => document.querySelector("alarmageddon-panel")._fetch());
    check(`${tag}: nach dem Neuladen wieder da, keine offenen Änderungen`, await s.waitFor(`return r.querySelectorAll('.ag-wf-after .ag-wf-step').length === 1 && r.host.actions.dirtyCount() === 0`));

    // ----- Neuer Schritt im Ablauf beim Alarm: läuft standardmässig weiter -----
    await s.ev("r.querySelector('.ag-wf-main [data-wf=\"add\"]').click(); return 1");
    await s.waitFor("return r.getElementById('ag-step').open");
    check(`${tag}: Auswahl beim Alarm mit allen acht Schritten (mit Voralarm, ohne Aktivierungston)`, (await dlg("return d.querySelectorAll('[data-wf=\"kind\"]').length")) === 8);
    await s.tap('#ag-step [data-wf="kind"][data-kind="sound"]');
    await s.waitFor("return !!r.querySelector('#ag-step .ag-tone')");
    const snd = await dlg("return { wait: d.querySelector('[data-wf=\"waitend\"]').getAttribute('aria-checked'), restore: d.querySelector('[data-wf=\"restore\"]').getAttribute('aria-checked'), until: !!d.querySelector('[data-wf=\"until\"]') }");
    check(`${tag}: neuer Alarmton: "${t.waitOpt}" aus (läuft weiter), "${t.restore}" an, "bis zum Deaktivieren" möglich`, snd.wait === "false" && snd.restore === "true" && snd.until, JSON.stringify(snd));
    await s.tap('#ag-step [data-wf="close"]');
    if (await s.ev("return r.getElementById('ag-discard').open")) await s.tap('#ag-discard [data-dlg="discard"], #ag-discard .ag-btn.primary');
    await s.page.waitForTimeout(200);
    check(`${tag}: kein Überlauf`, await s.ev("return document.documentElement.scrollWidth <= window.innerWidth"));
    check(`${tag}: keine Fehler im Browser`, s.errors.length === 0, s.errors.join(" | "));
    await s.ctx.close();
  }
}
await browser.close();
done();
