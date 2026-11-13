// 1.32.0: Anlage löschen: roter Textknopf ganz unten in Konfiguration › Anlage (nur bei deaktivierter Anlage), Warn-Dialog mit dem, was
// verschwindet und was bleibt, Name eintippen, Sicherung als Schalter (standardmässig an). Je Sprache, Desktop und Handy.
import { check, done, launch, open } from "../lib.mjs";

const T = {
  de: { title: "Anlage löschen", noUndo: "nicht rückgängig", goes: "Das verschwindet", stays: "Das bleibt", backup: "Vorher eine Sicherung anlegen", backupName: "Vor dem Löschen: Garage", confirm: "Endgültig löschen", notDisarmed: "Zuerst die Anlage deaktivieren" },
  en: { title: "Delete alarm system", noUndo: "cannot be undone", goes: "What goes away", stays: "What stays", backup: "Make a backup first", backupName: "Before deleting: Garage", confirm: "Delete for good", notDisarmed: "Disarm the alarm system first" },
};

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const t = T[lang];
    const s = await open(browser, { mobile, lang, tab: "config" });
    await s.tap('[data-sub="system"]');
    await s.waitFor("return !!r.querySelector('.ag-chap')");
    const toEnd = () => s.ev("const c=r.querySelector('.ag-content'); if (c) c.scrollTop = c.scrollHeight; const b=r.querySelector('[data-sys=\"delete\"]'); b?.scrollIntoView({ block: 'center' });");

    // Die Auswahl der Anlage wird beim Auffrischen nicht neu gezeichnet: ein geöffnetes Dropdown klappte sonst zu
    check(`${tag}: Auswahl der Anlage bleibt beim Auffrischen dasselbe Element`, await s.ev("window.__selNode = r.querySelector('select[data-act=\"system\"]'); return !!window.__selNode") && (await s.frame.evaluate(() => document.querySelector("alarmageddon-panel")._fetch().then(() => true))) && await s.ev("return r.querySelector('select[data-act=\"system\"]') === window.__selNode"));

    // ----- Haus ist scharf: Knopf gesperrt, mit Hinweis -----
    await (await s.el('select[data-act="system"]')).selectOption("e_haus");
    await s.page.waitForTimeout(300);
    await toEnd();
    check(`${tag}: Kapitel "${t.title}" ist das letzte, unter der Sicherung`, await s.ev(`const cs=[...r.querySelectorAll('.ag-chap')]; const last=cs[cs.length-1]; const bk=cs[cs.length-2]; return last.querySelector('.ag-chap-t').innerText.includes(${JSON.stringify(t.title)}) && last.classList.contains('ag-chap-danger') && bk.querySelector('[data-sys="bk-create"]') !== null`));
    check(`${tag}: scharfe Anlage: Knopf gesperrt, Hinweis "${t.notDisarmed}"`, await s.ev(`const b=r.querySelector('[data-sys="delete"]'); return b.disabled && b.closest('.ag-chap').innerText.includes(${JSON.stringify(t.notDisarmed)})`));

    // ----- Garage ist deaktiviert: Knopf frei, rot -----
    await (await s.el('select[data-act="system"]')).selectOption("e_garage");
    await s.page.waitForTimeout(400);
    await toEnd();
    check(`${tag}: deaktivierte Anlage: Knopf frei, ohne Hinweis`, await s.ev(`const b=r.querySelector('[data-sys="delete"]'); return !b.disabled && !b.closest('.ag-chap').innerText.includes(${JSON.stringify(t.notDisarmed)})`));
    check(`${tag}: Knopf ist roter Text auf transparentem Grund (kein gefüllter Knopf)`, await s.ev("const b=r.querySelector('[data-sys=\"delete\"]'); const c=getComputedStyle(b); const normal=getComputedStyle(r.querySelector('[data-sys=\"bk-create\"]')).color; return c.backgroundColor === 'rgba(0, 0, 0, 0)' && c.color !== normal && c.color.startsWith('rgb')"));
    check(`${tag}: Knopf nennt die Anlage ("Garage")`, await s.ev("return r.querySelector('[data-sys=\"delete\"]').innerText.includes('Garage')"));

    // ----- Dialog -----
    await s.tap('[data-sys="delete"]');
    check(`${tag}: Warn-Dialog mit Titel, "${t.noUndo}", Listen "${t.goes}" und "${t.stays}"`, await s.waitFor(`const d=r.getElementById('ag-delete'); const x=d.innerText; return d.open && x.includes('Garage') && x.includes(${JSON.stringify(t.noUndo)}) && x.includes(${JSON.stringify(t.goes)}) && x.includes(${JSON.stringify(t.stays)}) && x.includes('alarm_control_panel.garage')`));
    check(`${tag}: Sicherung vorher ist ein Schalter und standardmässig an`, await s.ev(`const d=r.getElementById('ag-delete'); const tg=d.querySelector('[data-act="delete-backup"]'); return d.innerText.includes(${JSON.stringify(t.backup)}) && tg.getAttribute('aria-checked') === 'true'`));
    check(`${tag}: Namensfeld im Fokus, "${t.confirm}" gesperrt und rot`, await s.ev(`const d=r.getElementById('ag-delete'); const b=d.querySelector('button[type=submit]'); return r.activeElement === d.querySelector('#ag-del-input') && b.disabled && b.innerText.includes(${JSON.stringify(t.confirm)}) && b.classList.contains('danger')`));
    if (mobile) check(`${tag}: Handy: Dialog liegt im Bild, Knöpfe sichtbar`, await s.ev("const d=r.getElementById('ag-delete'); const w=r.host.getBoundingClientRect(); const b=[...d.querySelectorAll('.ag-dlg-btns button')].map((x) => x.getBoundingClientRect()); const q=d.getBoundingClientRect(); return q.left >= 0 && q.right <= w.width + 1 && b.length === 2 && b.every((x) => x.bottom <= window.innerHeight && x.height >= 38)"));
    check(`${tag}: Schalter links, Text rechts (Grundregel)`, await s.ev("const l=r.querySelector('#ag-delete .ag-rename-ids'); const tg=l.querySelector('.ag-toggle').getBoundingClientRect(); const tx=l.querySelector('.ag-otx').getBoundingClientRect(); return tg.right <= tx.left + 1"));

    check(`${tag}: Namensfeld ist nicht zusammengedrückt (mindestens 38 px hoch) und der Dialog scrollt, wenn der Platz nicht reicht`, await s.ev("const d=r.getElementById('ag-delete'); const i=d.querySelector('#ag-del-input'); const b=d.querySelector('.ag-dlg-body'); const sc=getComputedStyle(b).overflowY; return i.getBoundingClientRect().height >= 38 && (b.scrollHeight <= b.clientHeight + 1 || sc === 'auto' || sc === 'scroll')"));
    // Namen tippen: nur der genaue Name gibt den Knopf frei
    const input = await s.el("#ag-del-input");
    const enabled = () => s.ev("return !r.getElementById('ag-delete').querySelector('button[type=submit]').disabled");
    for (const [v, ok] of [["garage", false], ["Gara", false], ["Garage 2", false], ["Garage", true], ["  Garage ", true], ["", false]]) {
      await input.fill(v);
      check(`${tag}: Eingabe "${v}" ${ok ? "gibt den Knopf frei" : "lässt den Knopf gesperrt"}`, (await enabled()) === ok);
    }

    // Fehler vom Server: im Dialog, bleibt offen, Knopf wieder frei
    await input.fill("Garage");
    await s.sim("window.__deleteFail = true");
    await s.tap('#ag-delete button[type="submit"]');
    check(`${tag}: Fehler vom Server steht im Dialog, Dialog bleibt, Knopf wieder frei`, await s.waitFor("const d=r.getElementById('ag-delete'); return d.open && d.querySelector('.ag-dlg-err').textContent.trim() !== '' && !d.querySelector('button[type=submit]').disabled"));
    await s.sim("window.__deleteFail = false");

    // Abbrechen löscht nichts
    await s.tap('#ag-delete [data-act="close-delete"]');
    check(`${tag}: Abbrechen schliesst, nichts gelöscht`, await s.waitFor("return !r.getElementById('ag-delete').open") && (await s.sim("return (window.__deletedSystems || []).length === 0")));

    // Löschen mit Sicherung (Standard)
    await toEnd();
    await s.tap('[data-sys="delete"]');
    await (await s.el("#ag-del-input")).fill("Garage");
    await s.tap('#ag-delete button[type="submit"]');
    check(`${tag}: Löschen schliesst den Dialog, die Anlage ist weg, das Panel zeigt die übrige`, await s.waitFor("const sel=r.querySelector('select[data-act=\"system\"]'); const h=r.querySelector('.ag-systitle'); return !r.getElementById('ag-delete').open && !sel && !!h && h.innerText.includes('Haus')", 8000));
    check(`${tag}: Server bekam Name und Sicherung "${t.backupName}"`, await s.sim(`const d=window.__deletedSystems || []; return d.length === 1 && d[0].title === 'Garage' && d[0].backup_name === ${JSON.stringify(t.backupName)}`));
    // Die letzte Anlage löschen: sofort die leere Seite (kein Warten auf eine Anlage, die nicht zurückkehrt)
    await s.sim(`window.__setState("alarm_control_panel.haus", "disarmed", { arm_mode: null, changed_by: null, deadline: null })`);
    await s.tap('[data-sub="sensors"]');
    await s.tap('[data-sub="system"]');
    await s.waitFor("const b=r.querySelector('[data-sys=\"delete\"]'); return !!b && !b.disabled");
    await toEnd();
    await s.tap('[data-sys="delete"]');
    await (await s.el("#ag-del-input")).fill("Haus");
    await s.tap('#ag-delete button[type="submit"]');
    check(`${tag}: letzte Anlage gelöscht: sofort die leere Seite, keine Ladeanzeige`, await s.waitFor("const root=r.querySelector('.ag-root'); return !!r.querySelector('.ag-empty') && !root.classList.contains('ag-ldwrap') && !r.querySelector('[data-sys=\"delete\"]')", 4000));
    check(`${tag}: keine Fehler im Browser`, s.errors.length === 0, s.errors.join(" | "));
    await s.ctx.close();

    // Löschen ohne Sicherung: Schalter aus, kein backup_name
    const s2 = await open(browser, { mobile, lang, tab: "config" });
    await s2.tap('[data-sub="system"]');
    await (await s2.el('select[data-act="system"]')).selectOption("e_garage");
    await s2.page.waitForTimeout(400);
    await s2.ev("r.querySelector('[data-sys=\"delete\"]').scrollIntoView({ block: 'center' })");
    await s2.tap('[data-sys="delete"]');
    await s2.tap('#ag-delete [data-act="delete-backup"]');
    check(`${tag}: Schalter lässt sich ausschalten`, await s2.ev("return r.querySelector('#ag-delete [data-act=\"delete-backup\"]').getAttribute('aria-checked') === 'false'"));
    await (await s2.el("#ag-del-input")).fill("Garage");
    await s2.tap('#ag-delete button[type="submit"]');
    await s2.waitFor("return !r.getElementById('ag-delete').open", 8000);
    check(`${tag}: ohne Sicherung: Server bekam keinen Sicherungsnamen`, await s2.sim("const d=window.__deletedSystems || []; return d.length === 1 && d[0].backup_name === ''"));
    await s2.ctx.close();
  }
}
await browser.close();
done();
