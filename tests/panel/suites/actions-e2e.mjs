// Konfiguration › Aktionen (Ablauf je Alarm) und › Benachrichtigungen. Je Sprache, Desktop und Handy, echte Klicks/Taps.
import { check, done, launch, open, outDir } from "../lib.mjs";

const T = {
  de: { wait: "Warten", sound: "Alarmton", on: "Einschalten", noChanges: "Keine Änderungen", saved: "Gespeichert", oneChange: "1 Änderung" },
  en: { wait: "Wait", sound: "Alarm sound", on: "Turn on", noChanges: "No changes", saved: "Saved", oneChange: "1 change" },
};

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const t = T[lang];
    const s = await open(browser, { mobile, lang, tab: "config" });
    const types = () => s.ev("return [...r.querySelectorAll('.ag-wf-step .ag-wf-icon')].map((e) => [...e.classList].find((c) => c.startsWith('k-')).slice(2))");

    // ----- Aktionen -----
    await s.tap('[data-sub="actions"]');
    check(`${tag}: Ablauf "Abwesend" mit 5 Schritten`, await s.waitFor("return r.querySelectorAll('.ag-wf-step').length === 5"));
    check(`${tag}: Reihenfolge der Bausteine`, JSON.stringify(await types()) === JSON.stringify(["notify", "open", "wait", "on", "sound"]), JSON.stringify(await types()));
    check(`${tag}: Alarmton zeigt Player, Lautstärke, Wiederholung`, await s.ev("const x=r.querySelectorAll('.ag-wf-step')[4].innerText; return x.includes('Sonos Wohnzimmer') && x.includes('70 %') && x.includes('5×')"));
    check(`${tag}: Kapsel am gewählten Auslöser`, await s.ev("const p=r.querySelector('.ag-wf-head .ag-seg .ag-pill'); const b=r.querySelector('.ag-wf-head [data-trigger=\"away\"]'); return !!p && Math.abs(p.getBoundingClientRect().left - b.getBoundingClientRect().left) < 2"));
    check(`${tag}: kein Überlauf`, await s.ev("return document.documentElement.scrollWidth <= window.innerWidth"));

    // Schritt verschieben: "Warten" nach oben
    await s.tap('.ag-wf-step[data-index="2"] [data-wf="up"]');
    check(`${tag}: nach oben verschoben`, JSON.stringify(await types()) === JSON.stringify(["notify", "wait", "open", "on", "sound"]), JSON.stringify(await types()));
    check(`${tag}: 1 Änderung`, await s.ev(`return r.querySelector('.ag-foot').innerText.includes('${t.oneChange}')`));
    check(`${tag}: Test gesperrt bis gespeichert`, await s.ev("return r.querySelector('[data-wf=\"test\"]').disabled"));
    // Abbrechen verwirft
    await s.tap('[data-wf="cancel"]');
    check(`${tag}: Abbrechen verwirft`, JSON.stringify(await types()) === JSON.stringify(["notify", "open", "wait", "on", "sound"]));

    // Warten bearbeiten: 30 -> 45 s
    await s.tap('.ag-wf-step[data-index="2"] [data-wf="edit"]');
    check(`${tag}: Editor offen`, await s.waitFor("return r.getElementById('ag-step').open && !!r.querySelector('#ag-step [data-key=\"seconds\"]')"));
    const sec = await s.el('#ag-step [data-key="seconds"]');
    await sec.fill("45");
    await s.tap('#ag-step [data-wf="apply"]');
    check(`${tag}: Warten 45 s`, await s.waitFor("return !r.getElementById('ag-step').open && r.querySelectorAll('.ag-wf-step')[2].innerText.includes('45')"));

    // Neuer Schritt am Ende: Einschalten ohne Gerät -> Fehler, dann Steckdose wählen
    await s.tap('.ag-wf-plus:last-of-type [data-wf="add"]');
    check(`${tag}: Auswahl der Bausteine`, await s.waitFor("return r.querySelectorAll('#ag-step [data-wf=\"kind\"]').length === 9"));
    await s.tap('#ag-step [data-wf="kind"][data-kind="on"]');
    check(`${tag}: Editor Einschalten`, await s.waitFor(`return r.querySelector('#ag-step h3')?.textContent === '${t.on}'`));
    await s.tap('#ag-step [data-wf="apply"]');
    check(`${tag}: ohne Gerät abgelehnt`, await s.waitFor("return r.querySelector('#ag-step .ag-dlg-err').textContent.trim().length > 0"));
    // Suche mit X; Fokus bleibt
    await s.tap('#ag-step [data-wf="eq"]');
    await s.page.keyboard.type("steck");
    check(`${tag}: Suche filtert`, await s.waitFor("const rows=r.querySelectorAll('#ag-step [data-wf=\"ent\"]'); return rows.length === 1 && rows[0].dataset.ent === 'switch.steckdose_flur'"));
    check(`${tag}: Fokus im Suchfeld`, await s.ev("return r.activeElement === r.querySelector('#ag-step [data-wf=\"eq\"]')"));
    await s.tap('#ag-step [data-wf="ent"][data-ent="switch.steckdose_flur"]');
    check(`${tag}: Gerät gewählt`, await s.waitFor("return r.querySelector('#ag-step [data-ent=\"switch.steckdose_flur\"]').getAttribute('aria-checked') === 'true'"));
    await s.tap('#ag-step [data-wf="eq-clear"]');
    check(`${tag}: X leert, Gewähltes bleibt`, await s.waitFor("const i=r.querySelector('#ag-step [data-wf=\"eq\"]'); return i.value === '' && r.activeElement === i && r.querySelectorAll('#ag-step [data-wf=\"ent\"]').length > 1 && r.querySelector('#ag-step [data-ent=\"switch.steckdose_flur\"]').getAttribute('aria-checked') === 'true'"));
    await s.tap('#ag-step [data-wf="apply"]');
    check(`${tag}: Schritt angehängt`, await s.waitFor("return r.querySelectorAll('.ag-wf-step').length === 6 && r.querySelectorAll('.ag-wf-step')[5].innerText.includes('Steckdose Flur')"));

    // Alarmton bearbeiten: Ton und zweiter Player
    await s.tap('.ag-wf-step[data-index="4"] [data-wf="edit"]');
    await s.waitFor("return r.getElementById('ag-step').open && !!r.querySelector('#ag-step .ag-sounds')");
    check(`${tag}: fünf Töne mit Vorhören`, await s.ev("return r.querySelectorAll('#ag-step [data-wf=\"sound\"]').length === 5 && r.querySelectorAll('#ag-step [data-wf=\"preview\"]').length === 5"));
    check(`${tag}: Zurückstellen an`, await s.ev("return r.querySelector('#ag-step [data-wf=\"restore\"]').getAttribute('aria-checked') === 'true'"));
    check(`${tag}: nur Medienplayer`, await s.ev("return [...r.querySelectorAll('#ag-step [data-wf=\"ent\"]')].every((b) => b.dataset.ent.startsWith('media_player.'))"));
    await s.tap('#ag-step [data-wf="sound"][data-sound="klaxon"]');
    await s.tap('#ag-step [data-wf="ent"][data-ent="media_player.sonos_kueche"]');
    await s.tap('#ag-step [data-wf="apply"]');
    await s.waitFor("return !r.getElementById('ag-step').open");

    // Löschen des ersten Schritts (Push) und speichern
    await s.tap('.ag-wf-step[data-index="0"] [data-wf="delete"]');
    check(`${tag}: gelöscht`, await s.waitFor("return r.querySelectorAll('.ag-wf-step').length === 5"));
    await s.page.screenshot({ path: `${outDir}actions-${lang}-${mobile ? "mobile" : "desktop"}.png`, fullPage: true });
    await s.tap('[data-wf="save"]');
    check(`${tag}: gespeichert`, await s.waitFor(`return r.querySelector('.ag-foot').innerText.includes('${t.saved}')`));
    const saved = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/save_workflows').at(-1)");
    const away = saved?.workflows?.away || [];
    check(`${tag}: alle Auslöser gesendet`, JSON.stringify(Object.keys(saved?.workflows || {}).sort()) === JSON.stringify(["always", "away", "home", "night"]), JSON.stringify(Object.keys(saved?.workflows || {})));
    check(`${tag}: Schritte im Serverformat`, away.length === 5 && away[1].type === "wait" && away[1].seconds === 45
      && away[3].type === "sound" && away[3].sound === "klaxon" && JSON.stringify(away[3].players) === JSON.stringify(["media_player.sonos_wohnzimmer", "media_player.sonos_kueche"]) && away[3].restore === true
      && away[4].type === "action" && away[4].action === "switch.turn_on" && JSON.stringify(away[4].target) === JSON.stringify(["switch.steckdose_flur"]) && away[4].restore === true, JSON.stringify(away));

    // Test starten und stoppen
    check(`${tag}: Test frei nach Speichern`, await s.waitFor("return !r.querySelector('[data-wf=\"test\"]').disabled"));
    await s.tap('[data-wf="test"]');
    check(`${tag}: Test läuft`, await s.waitFor("return !!r.querySelector('[data-wf=\"test-stop\"]') && !!r.querySelector('.ag-wf-head .ag-tag.warn')"));
    const test = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/test_workflow').at(-1)");
    check(`${tag}: Test für "Abwesend"`, test?.trigger === "away" && test?.entry_id === "e_haus", JSON.stringify(test));
    await s.tap('[data-wf="test-stop"]');
    check(`${tag}: Test gestoppt`, await s.waitFor("return !!r.querySelector('[data-wf=\"test\"]') && !r.querySelector('.ag-wf-head .ag-tag')"));

    // Auslöser wechseln: "Nacht" leer, gemerkt
    await s.tap('.ag-wf-head [data-trigger="night"]');
    check(`${tag}: leerer Ablauf mit Hinweis`, await s.waitFor("return !!r.querySelector('.ag-wf-empty') && r.querySelector('[data-wf=\"test\"]').disabled"));
    check(`${tag}: Auslöser gemerkt`, await s.ev("return localStorage.getItem('alarmageddon.trigger') === 'night'"));
    // Mit Änderung wegklicken verliert nichts: der Ablauf bleibt als Entwurf, ein Punkt am Reiter zeigt es
    await s.tap('.ag-wf-empty [data-wf="add"]');
    await s.tap('#ag-step [data-wf="kind"][data-kind="notify"]');
    await s.tap('#ag-step [data-wf="apply"]');
    await s.waitFor("return r.querySelectorAll('.ag-wf-step').length === 1");
    await s.tap('[data-sub="notify"]');
    check(`${tag}: Wechsel ohne Rückfrage`, await s.waitFor("return !r.getElementById('ag-discard')?.open && !!r.querySelector('.ag-nt')"));
    check(`${tag}: Punkt am Reiter Aktionen`, await s.ev("return r.querySelector('[data-sub=\"actions\"]').classList.contains('has-edit')"));
    await s.tap('[data-sub="actions"]');
    check(`${tag}: Entwurf der Aktionen noch da`, await s.waitFor("return r.querySelectorAll('.ag-wf-step').length === 1"));
    await s.tap('[data-wf="cancel"]');
    await s.tap('[data-sub="notify"]');

    // ----- Benachrichtigungen -----
    check(`${tag}: Benachrichtigungen offen`, await s.waitFor("return !!r.querySelector('.ag-nt [data-nt=\"target\"]')"));
    check(`${tag}: Empfänger getrennt`, await s.ev("return r.querySelectorAll('[data-nt=\"target\"][data-key=\"alarm_targets\"]').length === 3 && r.querySelectorAll('[data-nt=\"target\"][data-key=\"maintenance_targets\"]').length === 3"));
    check(`${tag}: Deaktivieren per Push aus`, await s.ev("return r.querySelector('[data-nt=\"disarm\"]').getAttribute('aria-checked') === 'false'"));
    await s.tap('[data-nt="target"][data-key="maintenance_targets"][data-target="notify.mobile_app_partnerin"]');
    check(`${tag}: Testknöpfe gesperrt bei Änderung`, await s.waitFor("return [...r.querySelectorAll('[data-nt=\"test\"]')].every((b) => b.disabled)"));
    // Lautstärke über den Regler
    await s.ev("const i=r.querySelector('[data-nt=\"volume\"]'); i.value='50'; i.dispatchEvent(new Event('input', { bubbles: true }));");
    check(`${tag}: Lautstärke angezeigt`, await s.waitFor("return r.querySelector('.ag-vol').textContent.trim() === '50 %'"));
    await s.tap('[data-nt="event"][data-key="armed"]');
    await s.tap('[data-nt="critical"]');
    check(`${tag}: Regler weg ohne kritisch`, await s.waitFor("return !r.querySelector('[data-nt=\"volume\"]')"));
    await s.tap('[data-nt="critical"]');
    await s.page.screenshot({ path: `${outDir}notify-${lang}-${mobile ? "mobile" : "desktop"}.png`, fullPage: true });
    await s.tap('[data-nt="save"]');
    check(`${tag}: Meldungen gespeichert`, await s.waitFor(`return r.querySelector('.ag-foot').innerText.includes('${t.saved}')`));
    const nt = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/save_notify').at(-1)?.notify");
    check(`${tag}: Werte gesendet`, nt && JSON.stringify(nt.maintenance_targets) === JSON.stringify(["notify.mobile_app_partnerin"]) && nt.volume === 0.5 && nt.critical === true && nt.events.armed === true && nt.disarm_action === false, JSON.stringify(nt));
    await s.tap('[data-nt="test"][data-group="maintenance"]');
    const tn = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/test_notify').at(-1)");
    check(`${tag}: Testmeldung Wartung`, tn?.group === "maintenance", JSON.stringify(tn));
    check(`${tag}: kein Überlauf (Meldungen)`, await s.ev("return document.documentElement.scrollWidth <= window.innerWidth"));
    check(`${tag}: keine Fehler im Browser`, s.errors.length === 0, s.errors.join(" | "));
    await s.ctx.close();
  }
}
await browser.close();
done();
