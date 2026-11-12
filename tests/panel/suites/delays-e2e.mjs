// 1.19.0: Aktionen während der Verzögerungen. Zwei Kapitel ("Beim Scharfschalten", "Bei einem Alarm") mit den neuen festen Punkten
// "Scharfschalten beginnt" (Ausgangsverzögerung) und "Eingangsverzögerung läuft"; ein Ton folgt standardmässig der Verzögerung
// (Schalter), sonst gilt seine feste Dauer. Die Punkte stehen nur da, wo es die Verzögerung gibt (Vorgabe des Nutzers).
import { check, done, launch, open } from "../lib.mjs";

const T = {
  de: { arming: "Scharfschalten beginnt", armed: "Anlage scharf geschaltet", entry: "Eingangsverzögerung läuft", start: "Alarm beginnt", chapArm: "Beim Scharfschalten", chapAlarm: "Bei einem Alarm", chapDisarm: "Beim Deaktivieren", pillArm: "Solange die Ausgangsverzögerung läuft", pillEntry: "Solange die Eingangsverzögerung läuft", home: "Anwesend", away: "Abwesend" },
  en: { arming: "Arming begins", armed: "Alarm system armed", entry: "Entry delay running", start: "Alarm starts", chapArm: "When arming", chapAlarm: "On an alarm", chapDisarm: "When disarming", pillArm: "As long as the exit delay runs", pillEntry: "As long as the entry delay runs", home: "Home", away: "Away" },
};

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const t = T[lang];
    const s = await open(browser, { mobile, lang, tab: "config" });
    await s.tap('[data-sub="actions"]');
    await s.waitFor("return !!r.querySelector('.ag-wf-armed') && !!r.querySelector('.ag-wf-main')");
    await s.page.waitForTimeout(450);
    const dlg = (js) => s.ev(`const d=r.getElementById("ag-step"); ${js}`);
    const saved = (key) => s.sim(`const c=window.__calls.filter((x) => x.type === 'alarmageddon/save_workflows').pop(); return c ? JSON.parse(JSON.stringify(c.${key} || null)) : null`);

    // ----- Aufbau: zwei Kapitel, fünf feste Punkte in der Reihenfolge der Zeit -----
    const order = await s.ev("return [...r.querySelector('.ag-wf').children].map((c) => c.classList.contains('ag-wf-chap') ? 'chap:' + c.querySelector('h3').textContent.trim() : [...c.classList].find((k) => /^ag-wf-(arming|armed|entry|main|end|after|disarmed)$/.test(k)))");
    check(`${tag}: drei Kapitel mit den Punkten in zeitlicher Reihenfolge`, JSON.stringify(order) === JSON.stringify([`chap:${t.chapArm}`, "ag-wf-arming", "ag-wf-armed", `chap:${t.chapAlarm}`, "ag-wf-entry", "ag-wf-main", "ag-wf-end", "ag-wf-after", `chap:${t.chapDisarm}`, "ag-wf-disarmed"]), JSON.stringify(order));
    const titles = await s.ev("return [...r.querySelectorAll('.ag-wf-start')].map((m) => m.firstElementChild.nextSibling?.textContent?.trim() || m.textContent.trim())");
    check(`${tag}: Titel der neuen Punkte mit Modus, darunter die geltende Zeit`, await s.ev(`const a=r.querySelector('.ag-wf-arming .ag-wf-start'), e=r.querySelector('.ag-wf-entry .ag-wf-start'); return a.textContent.includes('${t.arming} (${t.away})') && /60/.test(a.querySelector('.ag-wf-sub').textContent) && e.textContent.includes('${t.entry} (${t.away})') && /30/.test(e.querySelector('.ag-wf-sub').textContent)`), JSON.stringify(titles));
    check(`${tag}: neue Punkte tragen eine gelbe Uhr`, await s.ev("return ['.ag-wf-arming', '.ag-wf-entry'].every((q) => r.querySelector(q + ' .ag-mini.warn svg'))"));

    // ----- Nur wo es die Verzögerung gibt: Anwesend hat keine Ausgangsverzögerung -----
    await s.tap('[data-trigger="home"]');
    await s.waitFor("return !r.querySelector('.ag-wf-arming')");
    check(`${tag}: Anwesend (Ausgangsverzögerung 0): kein Punkt "${t.arming}", die Eingangsverzögerung (30 s) schon`, await s.ev("return !r.querySelector('.ag-wf-arming') && !!r.querySelector('.ag-wf-entry') && !!r.querySelector('.ag-wf-armed')"));
    await s.tap('[data-trigger="always"]');
    await s.waitFor("return !r.querySelector('.ag-wf-entry') && !r.querySelector('.ag-wf-armed')");
    check(`${tag}: "Immer aktiv": weder Verzögerungen noch Kapiteltitel`, await s.ev("return !r.querySelector('.ag-wf-arming, .ag-wf-entry, .ag-wf-armed, .ag-wf-chap')"));
    await s.tap('[data-trigger="away"]');
    await s.waitFor("return !!r.querySelector('.ag-wf-arming')");

    // ----- Aktivierungston während der Ausgangsverzögerung -----
    await s.ev("r.querySelector('.ag-wf-arming [data-wf=\"add\"]').click(); return 1");
    await s.waitFor("return r.getElementById('ag-step').open");
    check(`${tag}: Auswahl bei "${t.arming}": Aktivierungston, Gerät, Warten, Szene, eigene Aktion; keine Sirene, keine Meldung, kein Voralarm`, JSON.stringify(await dlg("return [...d.querySelectorAll('[data-wf=\"kind\"]')].map((b) => b.dataset.kind)")) === JSON.stringify(["chime", "device", "wait", "scene", "custom"]), JSON.stringify(await dlg("return [...d.querySelectorAll('[data-wf=\"kind\"]')].map((b) => b.dataset.kind)")));
    await s.tap('#ag-step [data-wf="kind"][data-kind="chime"]');
    await s.waitFor("return !!r.querySelector('#ag-step .ag-tone')");
    const ed = await dlg("const sw=d.querySelector('[data-wf=\"delay\"]'); return { on: sw?.getAttribute('aria-checked') === 'true', hint: sw?.closest('.ag-ef-row')?.innerText || '', fixed: d.querySelector('.ag-delayfixed input')?.disabled === true, secs: d.querySelector('.ag-delayfixed input')?.value, chips: d.querySelectorAll('[data-wf=\"playsecs\"]').length, waitOff: d.querySelector('[data-wf=\"waitend\"]')?.disabled === true }");
    check(`${tag}: Schalter "Solange die Ausgangsverzögerung läuft" an, die feste Dauer ausgegraut mit der Zeit der Anlage (60 s), Warten gesperrt`, ed.on && ed.fixed && ed.secs === "60" && ed.chips === 0 && ed.waitOff && ed.hint.includes("60"), JSON.stringify(ed));
    await s.ev("const i=r.querySelector('#ag-step .ag-combo input, #ag-step input[type=\"search\"]'); i.focus(); i.value='Sonos'; i.dispatchEvent(new Event('input', { bubbles: true })); return 1");
    await s.waitFor("return !!r.querySelector('#ag-step [data-wf=\"pick\"]')");
    await s.ev("r.querySelector('#ag-step [data-wf=\"pick\"]').click(); return 1");
    await s.tap('#ag-step [data-wf="apply"]');
    await s.waitFor("return !r.getElementById('ag-step').open && r.querySelectorAll('.ag-wf-arming .ag-wf-step').length === 1");
    const card = await s.ev("const c=r.querySelector('.ag-wf-arming .ag-wf-step'); return { text: c.innerText, pill: c.querySelector('.ag-delaypill')?.innerText.trim(), secs: /\\d+ s\\b/.test(c.querySelector('.ag-small').innerText) }");
    check(`${tag}: Karte zeigt die Pille "${t.pillArm}" statt der Sekunden`, card.pill === t.pillArm && !card.secs, JSON.stringify(card));
    check(`${tag}: Änderung zählt, Punkt am Reiter`, await s.waitFor("return r.host.actions.dirtyCount() === 1 && r.querySelector('[data-sub=\"actions\"]').classList.contains('has-edit')"));

    // ----- Voralarm während der Eingangsverzögerung, mit fester Dauer (Schalter aus) -----
    await s.ev("r.querySelector('.ag-wf-entry [data-wf=\"add\"]').click(); return 1");
    await s.waitFor("return r.getElementById('ag-step').open");
    check(`${tag}: Auswahl bei "${t.entry}": zusätzlich der Voralarm`, JSON.stringify(await dlg("return [...d.querySelectorAll('[data-wf=\"kind\"]')].map((b) => b.dataset.kind)")) === JSON.stringify(["chime", "prealarm", "device", "wait", "scene", "custom"]));
    await s.tap('#ag-step [data-wf="kind"][data-kind="prealarm"]');
    await s.waitFor("return !!r.querySelector('#ag-step .ag-tone')");
    await s.tap('#ag-step [data-wf="delay"]');
    const fixed = await dlg("return { on: d.querySelector('[data-wf=\"delay\"]').getAttribute('aria-checked') === 'true', secs: d.querySelector('input[data-key=\"playSeconds\"]')?.value, chips: d.querySelectorAll('[data-wf=\"playsecs\"]').length }");
    check(`${tag}: Schalter aus: die feste Dauer (20 s) mit Schnellwahl ist wieder da`, !fixed.on && fixed.secs === "20" && fixed.chips === 4, JSON.stringify(fixed));
    await s.ev("const i=r.querySelector('#ag-step .ag-combo input, #ag-step input[type=\"search\"]'); i.focus(); i.value='Sonos'; i.dispatchEvent(new Event('input', { bubbles: true })); return 1");
    await s.waitFor("return !!r.querySelector('#ag-step [data-wf=\"pick\"]')");
    await s.ev("r.querySelector('#ag-step [data-wf=\"pick\"]').click(); return 1");
    await s.tap('#ag-step [data-wf="apply"]');
    await s.waitFor("return !r.getElementById('ag-step').open && r.querySelectorAll('.ag-wf-entry .ag-wf-step').length === 1");
    check(`${tag}: Karte mit fester Dauer zeigt Sekunden, keine Pille`, await s.ev("const c=r.querySelector('.ag-wf-entry .ag-wf-step'); return !c.querySelector('.ag-delaypill') && /20 s/.test(c.innerText)"));
    // Zweiter Voralarm, diesmal der Verzögerung folgend
    await s.ev("r.querySelector('.ag-wf-entry [data-wf=\"add\"][data-at=\"1\"]').click(); return 1");
    await s.waitFor("return r.getElementById('ag-step').open");
    await s.tap('#ag-step [data-wf="kind"][data-kind="prealarm"]');
    await s.waitFor("return !!r.querySelector('#ag-step .ag-tone')");
    await s.ev("const i=r.querySelector('#ag-step .ag-combo input, #ag-step input[type=\"search\"]'); i.focus(); i.value='Sonos'; i.dispatchEvent(new Event('input', { bubbles: true })); return 1");
    await s.waitFor("return !!r.querySelector('#ag-step [data-wf=\"pick\"]')");
    await s.ev("r.querySelector('#ag-step [data-wf=\"pick\"]').click(); return 1");
    await s.tap('#ag-step [data-wf="apply"]');
    await s.waitFor("return r.querySelectorAll('.ag-wf-entry .ag-wf-step').length === 2");
    check(`${tag}: neuer Voralarm bei "${t.entry}" folgt standardmässig der Verzögerung (Pille "${t.pillEntry}")`, await s.ev(`return r.querySelectorAll('.ag-wf-entry .ag-wf-step')[1].querySelector('.ag-delaypill')?.innerText.trim() === '${t.pillEntry}'`));

    // ----- Speichern: der Server bekommt beide Listen nur für Modi, mit "delay" -----
    await s.tap('.ag-foot [data-wf="save"]');
    check(`${tag}: gespeichert: danach ist nichts mehr offen (kein orangener Punkt)`, await s.waitFor("return r.host.actions.dirtyCount() === 0 && !r.querySelector('[data-sub=\"actions\"]').classList.contains('has-edit') && !r.host._wait", 30000));
    const arming = await saved("workflows_arming");
    const entry = await saved("workflows_entry");
    check(`${tag}: Server: workflows_arming.away = Aktivierungston mit delay, läuft weiter; nie für "Immer aktiv"`, arming?.away?.[0]?.type === "chime" && arming.away[0].delay === true && arming.away[0].wait === false && !("always" in arming), JSON.stringify(arming));
    check(`${tag}: Server: workflows_entry.away = Voralarm mit fester Dauer, dann Voralarm mit delay`, entry?.away?.length === 2 && entry.away[0].type === "prealarm" && !entry.away[0].delay && entry.away[0].duration === 20 && entry.away[1].delay === true && !("always" in entry), JSON.stringify(entry));
    await s.ev("return r.host._fetch().then(() => 1)");
    await s.page.waitForTimeout(300);
    check(`${tag}: nach dem Neuladen der Daten immer noch nichts offen, die Schritte stehen da`, await s.ev("return r.host.actions.dirtyCount() === 0 && r.querySelectorAll('.ag-wf-arming .ag-wf-step').length === 1 && r.querySelectorAll('.ag-wf-entry .ag-wf-step').length === 2"));

    // ----- Aktionen übernehmen von: die beiden Listen gehen mit -----
    await s.tap('[data-trigger="night"]');
    await s.waitFor("return r.querySelector('.ag-wf-entry') !== null");
    await s.ev("const sel=r.querySelector('.ag-foot select[data-wf=\"copy-from\"]'); sel.value='away'; sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); return 1");
    if (await s.waitFor("return r.getElementById('ag-confirm').open", 1500)) await s.tap('#ag-confirm [data-c="yes"]');
    check(`${tag}: "Aktionen übernehmen von Abwesend" bringt auch die Schritte der Verzögerungen mit`, await s.waitFor("return r.querySelectorAll('.ag-wf-entry .ag-wf-step').length === 2") && await s.ev("return r.host.actions.draft.entrySteps.night.length === 2"));
    await s.tap('.ag-foot [data-wf="cancel"]');

    // ----- Ohne Verzögerung kein Punkt: die zweite Anlage hat weder Ausgang noch (Abwesend) Eingang -----
    await s.ev(`const sel=r.querySelector('[data-act="system"]'); sel.value="e_garage"; sel.dispatchEvent(new Event("change", { bubbles: true })); return 1`);
    await s.waitFor("return r.querySelector('.ag-wf-armed') !== null && !r.querySelector('.ag-wf-arming')");
    await s.waitFor("return !r.querySelector('.ag-wf-entry')");
    check(`${tag}: Garage (Ausgangsverzögerung 0, keine Eingangsverzögerung möglich): keiner der beiden Punkte`, await s.ev("return !r.querySelector('.ag-wf-arming') && !r.querySelector('.ag-wf-entry') && !!r.querySelector('.ag-wf-armed') && !!r.querySelector('.ag-wf-main')"));
    check(`${tag}: kein Überlauf, keine Fehler im Browser`, (await s.ev("return document.documentElement.scrollWidth <= window.innerWidth")) && s.errors.length === 0, s.errors.join(" | "));
    await s.ctx.close();
  }
}
await browser.close();
done();
