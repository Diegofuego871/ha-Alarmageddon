// 1.14.0: Aktionen beim Scharfschalten und der Aktivierungston.
// Ganz oben steht der feste Punkt "Anlage scharf geschaltet" mit einer eigenen Liste; der Aktivierungston ist eine eigene Schrittart
// (kurz, mit Dauer, ohne "bis zum Deaktivieren" und ohne "Rückgängig"). Die drei festen Punkte des Ablaufs sind grösser als bisher.
// Dazu: Beschreibungen auf dem Handy in lesbarer Grösse, ohne die Schrift-Automatik des Browsers. Je Sprache auf Desktop und Handy.
import { check, done, launch, open, outDir } from "../lib.mjs";

const T = {
  de: { armed: "Anlage scharf geschaltet", start: "Alarm beginnt", end: "Alarm endet (quittiert)", hint: "Optional: Aktionen gleich nach dem Scharfschalten", more: "Weitere Aktion beim Scharfschalten", chime: "Aktivierungston", restore: "Rückgängig", pre: "Voralarm", alarm: "Alarmton", waits: "Wartet, bis die Aktion beendet ist" },
  en: { armed: "Alarm system armed", start: "Alarm starts", end: "Alarm ends (acknowledged)", hint: "Optional: actions right after arming", more: "Another action when arming", chime: "Arming tone", restore: "Undo", pre: "Pre-alarm", alarm: "Alarm sound", waits: "Waits until the action has finished" },
};

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const t = T[lang];
    const s = await open(browser, { mobile, lang, tab: "config" });
    await s.tap('[data-sub="actions"]');
    await s.waitFor("return !!r.querySelector('.ag-wf-armed') && !!r.querySelector('.ag-wf-main')");
    await s.page.waitForTimeout(450); // der Reiter gleitet herein: erst danach stimmen die waagrechten Lagen
    const dlg = (js) => s.ev(`const d=r.getElementById("ag-step"); ${js}`);
    const armed = () => s.ev("const a=r.host.actions; return JSON.parse(JSON.stringify(a.draft.armed?.[a.trigger] || []))");

    // ----- Drei feste Punkte, grösser als bisher, auf einer Achse -----
    const marks = await s.ev("return [...r.querySelectorAll('.ag-wf-start')].map((m) => { const i=m.querySelector('.ag-mini').getBoundingClientRect(); const cs=getComputedStyle(m); return { text: m.textContent.trim(), top: Math.round(m.getBoundingClientRect().top), box: Math.round(i.width), icon: Math.round(m.querySelector('svg').getBoundingClientRect().width), size: cs.fontSize, weight: cs.fontWeight, mid: Math.round(i.left + i.width / 2), cls: m.querySelector('.ag-mini').className }; })");
    check(`${tag}: drei feste Punkte in dieser Reihenfolge: "${t.armed}", "${t.start}", "${t.end}"`, marks.length === 3 && marks[0].text === t.armed && marks[1].text === t.start && marks[2].text === t.end && marks[0].top < marks[1].top && marks[1].top < marks[2].top, JSON.stringify(marks.map((m) => [m.text, m.top])));
    check(`${tag}: die Punkte sind grösser und kräftiger (Symbol 36 px, Schrift 16 px fett) und stehen auf einer Achse mit den Plus`, marks.every((m) => m.box === 36 && m.icon === 20 && m.size === "16px" && Number(m.weight) >= 600) && new Set(marks.map((m) => m.mid)).size === 1 && (await s.ev(`const x=(e) => { const b=e.getBoundingClientRect(); return Math.round(b.left + b.width / 2); }; return [...r.querySelectorAll('.ag-wf-add')].every((b) => Math.abs(x(b) - ${marks[0].mid}) <= 1)`)), JSON.stringify(marks));
    check(`${tag}: scharf mit Schild in Rot, Alarm kräftig rot, Ende grün`, marks[0].cls.includes("arm") && marks[1].cls.includes("alarm") && marks[2].cls.includes("ok") && (await s.ev("const probe=document.createElement('i'); probe.style.color='var(--ag-error)'; r.appendChild(probe); const err=getComputedStyle(probe).color; probe.remove(); const m=[...r.querySelectorAll('.ag-wf-start .ag-mini')]; return getComputedStyle(m[0]).color === err && getComputedStyle(m[1]).backgroundColor === err")));
    const plus0 = await s.ev("const z=r.querySelector('.ag-wf-armed'); const p=z.querySelector('.ag-wf-plus'); const h=p.querySelector('.ag-wf-plushint'); return { n: z.querySelectorAll('.ag-wf-plus').length, hint: h?.textContent || '', right: h ? h.getBoundingClientRect().right : 0, vw: innerWidth, zone: z.dataset.zone, lower: getComputedStyle(p.querySelectorAll('.ag-wf-seg')[1]).visibility }");
    check(`${tag}: unter "${t.armed}" ein Plus mit Hinweis; die Linie endet dort (der Alarm folgt nicht daraus)`, plus0.n === 1 && plus0.hint.startsWith(t.hint) && plus0.right <= plus0.vw && plus0.zone === "armed" && plus0.lower === "hidden", JSON.stringify(plus0));

    // ----- Aktivierungston hinzufügen -----
    await s.ev("r.querySelector('.ag-wf-armed [data-wf=\"add\"]').click(); return 1");
    await s.waitFor("return r.getElementById('ag-step').open");
    check(`${tag}: Auswahl beim Scharfschalten: Aktivierungston zuerst, keine Sirene, keine Alarmmeldung, kein Quittieren`, JSON.stringify(await dlg("return [...d.querySelectorAll('[data-wf=\"kind\"]')].map((b) => b.dataset.kind)")) === JSON.stringify(["chime", "device", "wait", "scene", "custom"]) && (await dlg(`return d.querySelector('[data-kind="chime"]').innerText.includes(${JSON.stringify(t.chime)})`)));
    await s.tap('#ag-step [data-wf="kind"][data-kind="chime"]');
    await s.waitFor("return !!r.querySelector('#ag-step .ag-tone')");
    const ed = await dlg(`return { tone: d.querySelector('.ag-tone select').value, tones: [...d.querySelectorAll('.ag-tone select option')].map((o) => o.value), note: d.innerText.includes(${JSON.stringify(lang === "de" ? "so oft er ganz in diese Zeit passt" : "as often as it fits completely")}), until: !!d.querySelector('[data-wf="until"]'), restore: !!d.querySelector('[data-wf="restore"]') || d.innerText.includes(${JSON.stringify(t.restore)}), wait: d.querySelector('[data-wf="waitend"]')?.getAttribute('aria-checked'), seconds: [...d.querySelectorAll('input')].map((i) => i.value).includes('3'), preview: !!d.querySelector('[data-wf="pv-play"]') }`);
    check(`${tag}: Aktivierungston: Piepsen, 3 Sekunden, mit Probehören; kein "bis zum Deaktivieren", kein "${t.restore}", läuft weiter`, ed.tone === "tone_pip" && !ed.until && !ed.restore && ed.wait === "false" && ed.seconds && ed.preview && ed.note, JSON.stringify(ed));
    check(`${tag}: sieben eigene Töne zur Wahl (dezent bis freundlich), kein Alarmton darunter`, JSON.stringify(ed.tones) === JSON.stringify(["tone_pip", "tone_double", "tone_soft", "tone_bell", "tone_rise", "tone_confirm", "tone_tick"]) && (await dlg("return [...d.querySelectorAll('.ag-tone select option')].every((o) => o.textContent.trim().length > 3 && !o.textContent.includes('_'))")), JSON.stringify(ed.tones));
    await s.tap('#ag-step [data-wf="apply"]');
    check(`${tag}: ohne Lautsprecher lässt sich der Schritt nicht übernehmen`, await s.waitFor("return r.getElementById('ag-step').open && !!r.querySelector('#ag-step .ag-dlg-err, #ag-step .ag-err')") && (await armed()).length === 0);
    await s.ev("const i=r.querySelector('#ag-step .ag-combo input, #ag-step input[type=\"search\"]'); i.focus(); i.value='Sonos'; i.dispatchEvent(new Event('input', { bubbles: true })); return 1");
    await s.waitFor("return !!r.querySelector('#ag-step [data-wf=\"pick\"]')");
    await s.ev("r.querySelector('#ag-step [data-wf=\"pick\"]').click(); return 1");
    await s.tap('#ag-step [data-wf="apply"]');
    await s.waitFor("return !r.getElementById('ag-step').open && r.querySelectorAll('.ag-wf-armed .ag-wf-step').length === 1");
    const step = (await armed())[0];
    check(`${tag}: gespeichert wird die eigene Schrittart "chime": Piepsen, 3 Sekunden, läuft weiter, kein Feld der Sirene`, step?.type === "chime" && step.sound === "tone_pip" && step.duration === 3 && step.wait === false && step.players.length === 1 && !("restore" in step) && !("repeat" in step), JSON.stringify(step));
    const card = await s.ev("const c=r.querySelector('.ag-wf-armed .ag-wf-step'); return { text: c.innerText, tag: !!c.querySelector('.ag-tag'), pill: !!c.querySelector('.ag-waitpill'), test: !!c.querySelector('[data-wf=\"test-step\"]'), plus: r.querySelectorAll('.ag-wf-armed .ag-wf-plus').length, more: r.querySelector('.ag-wf-armed .ag-wf-plus.last .ag-wf-plushint')?.textContent }");
    check(`${tag}: Karte "${t.chime}" mit Ton, Lautsprecher und Dauer; einzeln testbar; danach ein weiteres Plus`, card.text.includes(t.chime) && card.text.includes("3 s") && card.text.includes("Sonos") && !card.tag && !card.pill && card.test && card.plus === 2 && card.more === t.more, JSON.stringify(card));
    check(`${tag}: der Ablauf beim Alarm ist unverändert; die Änderung zählt`, await s.ev("const a=r.host.actions; return JSON.stringify(a.draft.wf) === JSON.stringify(a.system.workflows) && a.dirtyCount() >= 1"));
    await s.page.screenshot({ path: `${outDir}armed-${lang}-${mobile ? "mobile" : "desktop"}.png` });

    // ----- "Immer aktiv" hat keinen Punkt "scharf geschaltet"; speichern -----
    const cur = await s.ev("return r.host.actions.trigger");
    await s.ev("const a=r.host.actions; a.trigger='always'; a.render(); return 1");
    check(`${tag}: im Reiter "Immer aktiv" gibt es den Punkt nicht (dort wird nie scharf geschaltet)`, await s.waitFor("return !r.querySelector('.ag-wf-armed') && r.querySelectorAll('.ag-wf-start').length === 2"));
    await s.ev(`const a=r.host.actions; a.trigger=${JSON.stringify(cur)}; a.render(); return 1`);
    await s.waitFor("return !!r.querySelector('.ag-wf-armed .ag-wf-step')");
    await s.tap('[data-wf="save"]');
    await s.waitFor("return !r.host.actions.saving && r.host.actions.dirtyCount() === 0");
    const sent = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/save_workflows').at(-1)");
    check(`${tag}: gespeichert je Modus, ohne "Immer aktiv"`, !!sent?.workflows_armed && !("always" in sent.workflows_armed) && sent.workflows_armed[cur].length === 1 && sent.workflows_armed[cur][0].type === "chime" && Object.keys(sent.workflows_armed).length >= 2, JSON.stringify(sent?.workflows_armed));
    await s.frame.evaluate(() => document.querySelector("alarmageddon-panel")._fetch());
    check(`${tag}: nach dem Neuladen wieder da, keine offenen Änderungen`, await s.waitFor("return r.querySelectorAll('.ag-wf-armed .ag-wf-step').length === 1 && r.host.actions.dirtyCount() === 0"));

    // ----- Voralarm: eigener Schritt im Ablauf des Alarms, mit eigenen, leisen Tönen; der Alarmton hat seine eigenen -----
    await s.ev("r.querySelector('.ag-wf-main [data-wf=\"add\"]').click(); return 1");
    await s.waitFor("return r.getElementById('ag-step').open");
    const kinds = await dlg("return [...d.querySelectorAll('[data-wf=\"kind\"]')].map((b) => [b.dataset.kind, b.querySelector('b').textContent])");
    check(`${tag}: beim Alarm zur Wahl: "${t.alarm}" und "${t.pre}", kein Aktivierungston`, kinds.some(([k, l]) => k === "sound" && l === t.alarm) && kinds.some(([k, l]) => k === "prealarm" && l === t.pre) && !kinds.some(([k]) => k === "chime") && kinds.length === 8, JSON.stringify(kinds));
    await s.tap('#ag-step [data-wf="kind"][data-kind="prealarm"]');
    await s.waitFor("return !!r.querySelector('#ag-step .ag-tone')");
    const pe = await dlg(`return { tone: d.querySelector('.ag-tone select').value, tones: [...d.querySelectorAll('.ag-tone select option')].map((o) => o.value), until: !!d.querySelector('[data-wf="until"]'), restore: !!d.querySelector('[data-wf="restore"]'), wait: d.querySelector('[data-wf="waitend"]')?.getAttribute('aria-checked'), seconds: [...d.querySelectorAll('input')].map((i) => i.value).includes('20'), vol: d.innerText.includes('30 %') }`);
    check(`${tag}: Voralarm: fünf eigene Töne (mit Gong und Warnung), 20 Sekunden, leise (30 %), der Ablauf wartet auf ihn`, JSON.stringify(pe.tones) === JSON.stringify(["chime", "warning", "pre_beep", "pre_pulse", "pre_rising"]) && pe.tone === "pre_beep" && pe.seconds && pe.vol && pe.wait === "true" && !pe.until && !pe.restore, JSON.stringify(pe));
    await s.ev("const i=r.querySelector('#ag-step .ag-combo input, #ag-step input[type=\"search\"]'); i.focus(); i.value='Sonos'; i.dispatchEvent(new Event('input', { bubbles: true })); return 1");
    await s.waitFor("return !!r.querySelector('#ag-step [data-wf=\"pick\"]')");
    await s.ev("r.querySelector('#ag-step [data-wf=\"pick\"]').click(); return 1");
    await s.tap('#ag-step [data-wf="apply"]');
    await s.waitFor("return !r.getElementById('ag-step').open && r.host.actions.draft.wf[r.host.actions.trigger][0]?.type === 'prealarm'");
    const ps = await s.ev("const a=r.host.actions; const st=a.draft.wf[a.trigger][0]; const c=r.querySelector('.ag-wf-main .ag-wf-step'); return { st, title: c.querySelector('b').textContent, pill: c.querySelector('.ag-waitpill')?.textContent.trim() || '', tint: getComputedStyle(c.querySelector('.ag-wf-icon')).color, tag: !!c.querySelector('.ag-tag') }");
    check(`${tag}: gespeichert wird die Schrittart "prealarm" (Ton, 20 Sekunden, 30 %, wartet); die Karte "${t.pre}" trägt die Pille`, ps.st.type === "prealarm" && ps.st.sound === "pre_beep" && ps.st.duration === 20 && ps.st.volume === 0.3 && ps.st.wait === true && !("restore" in ps.st) && ps.title === t.pre && ps.pill === t.waits && !ps.tag, JSON.stringify(ps));
    await s.ev("r.querySelectorAll('.ag-wf-main [data-wf=\"add\"]')[1].click(); return 1");
    await s.waitFor("return r.getElementById('ag-step').open");
    await s.tap('#ag-step [data-wf="kind"][data-kind="sound"]');
    await s.waitFor("return !!r.querySelector('#ag-step .ag-tone')");
    check(`${tag}: der Alarmton hat seine eigenen fünf Töne (ohne Gong und Warnung) und behält "bis zum Deaktivieren"`, JSON.stringify(await dlg("return [...d.querySelectorAll('.ag-tone select option')].map((o) => o.value)")) === JSON.stringify(["siren", "beep", "klaxon", "hilo", "yelp"]) && (await dlg("return !!d.querySelector('[data-wf=\"until\"]') && !!d.querySelector('[data-wf=\"restore\"]')")));
    await s.page.screenshot({ path: `${outDir}tones-${lang}-${mobile ? "mobile" : "desktop"}.png` });
    await s.tap('#ag-step [data-wf="close"]');
    if (await s.ev("return r.getElementById('ag-discard').open")) await s.ev("(r.querySelector('#ag-discard [data-dlg=\"discard\"]') || r.querySelector('#ag-discard .ag-btn.primary')).click(); return 1");
    await s.page.waitForTimeout(250);

    // ----- Schrift -----
    const font = await s.ev("const cs=getComputedStyle(r.host); const hint=r.querySelector('.ag-wf-plushint'); const sub=r.querySelector('.ag-wf-step .ag-small') || r.querySelector('.ag-settx small'); return { adjust: cs.webkitTextSizeAdjust || cs.textSizeAdjust, hint: getComputedStyle(hint).fontSize, sub: getComputedStyle(sub).fontSize, set: getComputedStyle(r.querySelector('.ag-settx small')).fontSize }");
    check(`${tag}: die Schriftgrösse folgt nicht der Automatik des Browsers`, font.adjust === "100%", JSON.stringify(font));
    if (mobile) check(`${tag}: Handy: Beschreibungen und Hinweise einheitlich 14.5 px`, font.hint === "14.5px" && font.sub === "14.5px" && font.set === "14.5px", JSON.stringify(font));
    else check(`${tag}: Desktop: Beschreibungen wie bisher`, font.set === "12.5px" && font.hint === "12px", JSON.stringify(font));
    check(`${tag}: kein Überlauf, keine Fehler im Browser`, (await s.ev("return document.documentElement.scrollWidth <= window.innerWidth")) && s.errors.length === 0, s.errors.join(" | "));
    await s.ctx.close();
  }
}
await browser.close();
done();
