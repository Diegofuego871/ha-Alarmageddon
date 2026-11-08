// 0.6.0: Modi wählen und Zeitplan in Konfiguration › Anlage. Je Sprache, Desktop und Handy, echte Klicks/Taps.
import { check, done, launch, open, outDir } from "../lib.mjs";

const T = {
  de: { saved: "Gespeichert", active: "in diesem Modus scharf", none: "mindestens einen Modus", invalid: "mindestens einen Tag", skipped: "Zeitplan während des Alarms übersprungen: Deaktivieren", modeOff: "abgeschaltet", home: "Anwesend" },
  en: { saved: "Saved", active: "armed in this mode", none: "at least one mode", invalid: "at least one day", skipped: "Schedule skipped during the alarm: Disarm", modeOff: "switched off", home: "Home" },
};

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const t = T[lang];
    const s = await open(browser, { mobile, lang, tab: "config" });
    await s.tap('[data-sub="system"]');
    check(`${tag}: Modi sichtbar`, await s.waitFor("return r.querySelectorAll('[data-sys=\"mode\"]').length === 3"));
    check(`${tag}: alle drei an (Haus)`, await s.ev("return [...r.querySelectorAll('[data-sys=\"mode\"]')].every((b) => b.getAttribute('aria-pressed') === 'true')"));

    // Abwesend ist gerade scharf: Abschalten lehnt der Server ab
    await s.tap('[data-sys="mode"][data-mode="away"]');
    check(`${tag}: Ausgangsverzögerung ohne Abwesend`, await s.waitFor("return !r.querySelector('[data-key=\"exit_away\"]')"));
    await s.tap('[data-sys="save"]');
    check(`${tag}: aktiver Modus abgelehnt`, await s.waitFor(`return r.querySelector('.ag-foot .ag-err')?.textContent.includes('${t.active}')`));
    await s.tap('[data-sys="cancel"]');

    // Keiner gewählt: gesperrt
    for (const m of ["home", "away", "night"]) await s.tap(`[data-sys="mode"][data-mode="${m}"]`);
    check(`${tag}: ohne Modus gesperrt`, await s.waitFor(`return r.querySelector('[data-sys="save"]').disabled && r.querySelector('.ag-foot .ag-err')?.textContent.includes('${t.none}')`));
    await s.tap('[data-sys="cancel"]');

    // Zeitplan: zwei Zeiten aus dem Nachbau
    check(`${tag}: zwei Zeiten`, await s.ev("return r.querySelectorAll('.ag-schrow').length === 2"));
    check(`${tag}: Tage als Knöpfe`, await s.ev("const row=r.querySelectorAll('.ag-schrow')[1]; return row.querySelectorAll('.ag-day.on').length === 5 && row.querySelectorAll('.ag-day').length === 7"));
    // Anwesend abschalten: die Zeit für "Nacht" bleibt, neue Zeit hinzufügen
    await s.tap('[data-sys="mode"][data-mode="home"]');
    await s.tap('[data-sys="sch-add"]');
    check(`${tag}: Zeit hinzugefügt`, await s.waitFor("return r.querySelectorAll('.ag-schrow').length === 3"));
    const time = await s.el('.ag-sched .ag-schrow:last-child [data-sys="sch-time"]');
    await time.fill("07:15");
    check(`${tag}: Fokus bleibt in der Uhrzeit`, await s.ev("return r.activeElement?.dataset.sys === 'sch-time'"));
    check(`${tag}: Anwesend nicht wählbar`, await s.ev("return ![...r.querySelectorAll('.ag-sched .ag-schrow:last-child option')].some((o) => o.value === 'home')"));
    await (await s.el('.ag-sched .ag-schrow:last-child [data-sys="sch-action"]')).selectOption("off");
    // Samstag dazu, Montag weg
    await s.tap('.ag-sched .ag-schrow:last-child [data-sys="sch-day"][data-day="5"]');
    await s.tap('.ag-sched .ag-schrow:last-child [data-sys="sch-day"][data-day="0"]');
    // Erste Zeit abschalten, zweite löschen
    await s.tap('.ag-schrow [data-sys="sch-on"][data-index="0"]');
    await s.tap('[data-sys="sch-del"][data-index="1"]');
    check(`${tag}: gelöscht`, await s.waitFor("return r.querySelectorAll('.ag-schrow').length === 2"));
    await s.page.screenshot({ path: `${outDir}schedule-${lang}-${mobile ? "mobile" : "desktop"}.png`, fullPage: true });
    check(`${tag}: kein Überlauf`, await s.ev("return document.documentElement.scrollWidth <= window.innerWidth"));
    await s.tap('[data-sys="save"]');
    check(`${tag}: gespeichert`, await s.waitFor(`return r.querySelector('.ag-foot').innerText.includes('${t.saved}')`));
    const sys = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/save_system').at(-1)");
    const sch = sys?.schedules || [];
    check(`${tag}: Modi gesendet`, sys?.home_enabled === false && sys?.away_enabled === true && sys?.night_enabled === true && !("home" in (sys?.exit_delay || {})), JSON.stringify(sys));
    check(`${tag}: Zeitplan gesendet`, sch.length === 2 && sch[0].action === "night" && sch[0].enabled === false
      && sch[1].action === "off" && sch[1].time === "07:15" && JSON.stringify(sch[1].days) === JSON.stringify([1, 2, 3, 4, 5]), JSON.stringify(sch));

    // Ungültig: alle Tage weg
    for (const d of [1, 2, 3, 4, 5]) await s.tap(`.ag-sched .ag-schrow:last-child [data-sys="sch-day"][data-day="${d}"]`);
    check(`${tag}: Zeit ohne Tag gesperrt`, await s.waitFor(`return r.querySelector('[data-sys="save"]').disabled && r.querySelector('.ag-foot .ag-err')?.textContent.includes('${t.invalid}')`));
    await s.tap('[data-sys="cancel"]');

    // Übersicht: Haus ohne "Anwesend"
    await s.tap('[data-tab="overview"]');
    check(`${tag}: Übersicht ohne Anwesend`, await s.waitFor(`return !!r.querySelector('[data-act="mode"][data-entry="e_haus"][data-mode="away"]') && !r.querySelector('[data-act="mode"][data-entry="e_haus"][data-mode="home"]')`));
    const text = await s.ev(`return r.host._eventText({ kind: "schedule_skipped", action: "off", reason: "alarm", state: "triggered", mode: "away" })`);
    check(`${tag}: Ereignis Zeitplan übersprungen`, text === t.skipped, text);
    check(`${tag}: keine Fehler im Browser`, s.errors.length === 0, s.errors.join(" | "));
    await s.ctx.close();
  }
}
await browser.close();
done();
