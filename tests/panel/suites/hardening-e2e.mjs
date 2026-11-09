// 0.5.0: Zwei-Sensor-Bestätigung, Codes pro Person, Sicherung, Wartungsmeldungen, Ereignistexte. Je Sprache, Desktop und Handy.
import { writeFileSync } from "node:fs";
import { check, done, launch, open, outDir } from "../lib.mjs";

const T = {
  de: { saved: "Gespeichert", confirm: "Braucht einen zweiten Sensor", mismatch: "stimmen nicht", taken: "schon vergeben", restored: "wiederhergestellt", maint: "Wartungsmeldungen", unconfirmed: "Nicht bestätigt, kein Alarm: Bewegung Flur", armFailed: "Abwesend nicht möglich, offen: Fenster Bad" },
  en: { saved: "Saved", confirm: "Needs a second sensor", mismatch: "do not match", taken: "already used", restored: "restored", maint: "Maintenance messages", unconfirmed: "Not confirmed, no alarm: Bewegung Flur", armFailed: "Away not possible, open: Fenster Bad" },
};

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const t = T[lang];

    // ----- Ereignistexte (Übersicht) -----
    {
      const s = await open(browser, { mobile, lang });
      const texts = await s.ev(`const h=r.host; return [h._eventText({ kind: "unconfirmed", sensor: "binary_sensor.bewegung_flur", state: "armed_away", mode: "away" }),
        h._eventText({ kind: "arm_failed", sensors: ["binary_sensor.fenster_bad"], state: "disarmed", mode: "away" })]`);
      check(`${tag}: Ereignis "nicht bestätigt"`, texts[0] === t.unconfirmed, texts[0]);
      check(`${tag}: Ereignis "Scharfschalten nicht möglich"`, texts[1] === t.armFailed, texts[1]);
      await s.ctx.close();
    }

    const s = await open(browser, { mobile, lang, tab: "config" });

    // ----- Zwei-Sensor-Bestätigung im Seitenblatt -----
    await s.tap('[data-sen="detail"][data-ent="binary_sensor.bewegung_flur"]');
    const sheet = mobile ? "#ag-sheet" : ".ag-side";
    check(`${tag}: Option im Seitenblatt`, await s.waitFor(`return r.querySelector('${sheet}')?.innerText.includes('${t.confirm}')`));
    await s.tap(`${sheet} [data-sen="opt"][data-key="confirm"]`);
    check(`${tag}: Option "Stiller Alarm" im Seitenblatt`, await s.ev(`return !!r.querySelector('${sheet} [data-sen="opt"][data-key="report_only"]')`));
    await s.tap(`${sheet} [data-sen="opt"][data-key="report_only"]`);
    if (mobile) await s.tap('#ag-sheet [data-sen="close-detail"]');
    await s.tap('[data-sen="save"]');
    check(`${tag}: Option gespeichert`, await s.waitFor(`return r.querySelector('.ag-foot').innerText.includes('${t.saved}')`));
    const zones = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/save_zones').at(-1)");
    check(`${tag}: confirm und report_only gesendet`, zones?.sensor_options?.["binary_sensor.bewegung_flur"]?.confirm === true && zones?.sensor_options?.["binary_sensor.bewegung_flur"]?.report_only === true, JSON.stringify(zones?.sensor_options));

    // ----- Anlage: Bestätigungsfenster -----
    await s.tap('[data-sub="system"]');
    check(`${tag}: Anlage offen`, await s.waitFor("return !!r.querySelector('[data-field=\"confirm_window\"]')"));
    const win = await s.el('[data-field="confirm_window"]');
    await win.fill("3");
    check(`${tag}: zu kleines Fenster abgelehnt`, await s.waitFor("return r.querySelector('[data-sys=\"save\"]').disabled && r.querySelector('.ag-foot .ag-err')?.textContent.includes('600')"));
    await win.fill("90");
    await s.tap('[data-sys="save"]');
    check(`${tag}: Fenster gespeichert`, await s.waitFor(`return r.querySelector('.ag-foot').innerText.includes('${t.saved}')`));
    const sys = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/save_system').at(-1)");
    check(`${tag}: confirm_window gesendet (Abwesend)`, sys?.mode_settings?.away?.confirm_window === 90 && sys.mode_settings.home.confirm_window === 60, JSON.stringify(sys));

    // ----- Codes pro Person -----
    check(`${tag}: Anna mit Benutzer`, await s.ev("const row=[...r.querySelectorAll('.ag-coderow')].find((x) => x.innerText.includes('Anna')); return !!row && row.querySelectorAll('small')[0].textContent === 'Anna'"));
    check(`${tag}: kein Code sichtbar`, await s.ev("return !r.querySelector('.ag-codes').innerText.includes('2468') && !r.querySelector('.ag-codes').innerText.includes('1234')"));
    await s.tap('[data-sys="code-add"]');
    check(`${tag}: Dialog Code`, await s.waitFor("return r.getElementById('ag-codes').open"));
    check(`${tag}: verknüpfter Benutzer nicht wählbar`, await s.ev("return ![...r.querySelectorAll('#ag-codes option')].some((o) => o.value === 'u_anna')"));
    await (await s.el('#ag-codes [data-key="user_id"]')).selectOption("u_gast");
    check(`${tag}: Name vorgeschlagen`, await s.waitFor("return r.querySelector('#ag-codes [data-key=\"name\"]').value === 'Gast'"));
    await (await s.el('#ag-codes [data-key="code"]')).fill("1357");
    await (await s.el('#ag-codes [data-key="code2"]')).fill("1358");
    await s.tap('#ag-codes [data-sys="code-save"]');
    check(`${tag}: Codes ungleich`, await s.waitFor(`return r.querySelector('#ag-codes .ag-dlg-err').textContent.includes('${t.mismatch}')`));
    await (await s.el('#ag-codes [data-key="code"]')).fill("1234");
    await (await s.el('#ag-codes [data-key="code2"]')).fill("1234");
    await s.tap('#ag-codes [data-sys="code-save"]');
    check(`${tag}: gleicher Code abgelehnt`, await s.waitFor(`return r.querySelector('#ag-codes .ag-dlg-err').textContent.includes('${t.taken}')`));
    await (await s.el('#ag-codes [data-key="code"]')).fill("1357");
    await (await s.el('#ag-codes [data-key="code2"]')).fill("1357");
    await s.tap('#ag-codes [data-sys="code-save"]');
    check(`${tag}: Code hinzugefügt`, await s.waitFor("return !r.getElementById('ag-codes').open && [...r.querySelectorAll('.ag-coderow')].some((x) => x.innerText.includes('Gast'))"));
    const added = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/add_code').at(-1)");
    check(`${tag}: add_code gesendet`, added?.name === "Gast" && added?.user_id === "u_gast" && added?.code === "1357", JSON.stringify(added));
    await s.page.screenshot({ path: `${outDir}system-${lang}-${mobile ? "mobile" : "desktop"}.png`, fullPage: true });
    // Entfernen mit Rückfrage
    await s.tap('[data-sys="code-del"][data-id="c_anna"]');
    check(`${tag}: Rückfrage Entfernen`, await s.waitFor("return r.getElementById('ag-codes').open && !!r.querySelector('#ag-codes [data-sys=\"code-remove\"]')"));
    await s.tap('#ag-codes [data-sys="code-remove"]');
    check(`${tag}: Code entfernt`, await s.waitFor("return !r.getElementById('ag-codes').open && ![...r.querySelectorAll('.ag-coderow')].some((x) => x.innerText.includes('Anna'))"));

    // ----- Sicherung -----
    const [download] = await Promise.all([s.page.waitForEvent("download", { timeout: 5000 }).catch(() => null), s.tap('[data-sys="export"]')]);
    check(`${tag}: Export lädt Datei`, !!download && /^alarmageddon-\d{4}-\d{2}-\d{2}\.json$/.test(download.suggestedFilename()), download?.suggestedFilename());
    const file = `${outDir}backup-test.json`;
    writeFileSync(file, JSON.stringify({ format: "alarmageddon", version: 1, settings: {}, systems: [{ title: "Haus", options: { workflows: { away: [{ type: "notify" }] } } }, { title: "Ferienhaus", options: {} }] }));
    await (await s.el('[data-sys="import-file"]')).setInputFiles(file);
    check(`${tag}: Rückfrage mit gefundenen Anlagen`, await s.waitFor("const d=r.getElementById('ag-codes'); return d.open && d.innerText.includes('Haus') && d.innerText.includes('Ferienhaus')"));
    await s.tap('#ag-codes [data-sys="import-go"]');
    check(`${tag}: wiederhergestellt`, await s.waitFor("return !r.getElementById('ag-codes').open") && await s.sim("return window.__imported === true"));
    writeFileSync(file, JSON.stringify({ hello: "world" }));
    await (await s.el('[data-sys="import-file"]')).setInputFiles(file);
    // Die Datei wird asynchron gelesen: auf den dritten Aufruf warten, nicht sofort zählen
    const thirdCall = await s.page.waitForFunction(() => window.__calls.filter((c) => c.type === "alarmageddon/import").length === 3, null, { timeout: 5000 }).then(() => true, () => false);
    check(`${tag}: fremde Datei abgelehnt`, thirdCall && await s.waitFor("return !r.getElementById('ag-codes').open"));

    // ----- Wartungsmeldungen -----
    await s.tap('[data-sub="notify"]');
    check(`${tag}: Wartung in Benachrichtigungen`, await s.waitFor(`return r.querySelector('.ag-nt')?.innerText.includes('${t.maint}')`));
    check(`${tag}: nicht erreichbare Sensoren in einer Karte mit zwei Fällen`, await s.ev("const chaps=[...r.querySelectorAll('.ag-chap')]; const maint=chaps[2]; const alarm=chaps[1]; const g=maint.querySelector('.ag-mt.group'); return !!g && g.querySelectorAll('.ag-mt.sub').length === 2 && !!g.querySelector('[data-nt=\"enabled\"][data-kind=\"sensor_offline\"]') && !!g.querySelector('[data-nt=\"enabled\"][data-kind=\"sensor_unavailable\"]') && !alarm.querySelector('[data-nt=\"enabled\"][data-kind=\"sensor_offline\"]')"));
    await s.page.screenshot({ path: `${outDir}notify-offline-${lang}-${mobile ? "mobile" : "desktop"}.png`, fullPage: true });
    const thr = await s.el('[data-nt="num"][data-key="battery_threshold"]');
    await thr.fill("80");
    check(`${tag}: Schwelle zu hoch abgelehnt`, await s.waitFor("return r.querySelector('[data-nt=\"save\"]').disabled && !!r.querySelector('.ag-foot .ag-err')"));
    await thr.fill("25");
    await (await s.el('[data-nt="num"][data-key="offline_minutes"]')).fill("120");
    await s.tap('[data-nt="enabled"][data-kind="sensor_unavailable"]');
    check(`${tag}: Art aus blendet ihre Einstellungen aus`, await s.waitFor("return !r.querySelector('[data-nt=\"num\"][data-key=\"offline_minutes\"]')"));
    await s.tap('[data-nt="save"]');
    check(`${tag}: Wartung gespeichert`, await s.waitFor(`return r.querySelector('.ag-foot').innerText.includes('${t.saved}')`));
    const nt = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/save_notify').at(-1)?.notify");
    check(`${tag}: Wartungswerte gesendet`, nt?.battery_threshold === 25 && nt?.offline_minutes === 120 && nt?.types?.sensor_unavailable?.enabled === false && nt?.types?.battery_low?.enabled === true, JSON.stringify(nt));
    check(`${tag}: kein Überlauf`, await s.ev("return document.documentElement.scrollWidth <= window.innerWidth"));
    check(`${tag}: keine Fehler im Browser`, s.errors.length === 0, s.errors.join(" | "));
    await s.ctx.close();
  }
}
await browser.close();
done();
