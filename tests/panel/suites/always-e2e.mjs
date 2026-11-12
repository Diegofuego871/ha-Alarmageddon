// 1.6.0: "Immer aktiv" als Ganzes abschalten (Anlage › Modi). Je Sprache, Desktop und Handy.
import { check, done, launch, open } from "../lib.mjs";

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const s = await open(browser, { mobile, lang, tab: "config" });
    const saved = lang === "de" ? "Gespeichert" : "Saved";
    const pill = '[data-sys="always"]';

    // Sensor-Blatt (1.7.0): keine Pillen der Alarmmodi mehr (die Zuordnung steht in der Tabelle). Der Rahmen sagt immer genau, wann die
    // Einstellungen gelten; für einen Sensor, der "Immer aktiv" ist und in einer Zone steht, gibt es den Schalter "Scharf: nur der Modus zählt"
    const smoke = "binary_sensor.rauchmelder_flur";
    const sheet = mobile ? "#ag-sheet" : ".ag-side";
    const T = lang === "de"
      ? { every: "in jedem Zustand der Anlage", dis: "deaktiviert und scharf in", only: "nur der Modus zählt", both: "beide Abläufe", armed: "scharf in", home: "Anwesend", away: "Abwesend" }
      : { every: "in every state of the alarm system", dis: "disarmed and armed in", only: "only the mode counts", both: "both flows run", armed: "armed in", home: "Home", away: "Away" };
    const openSheet = async () => {
      await s.tap(`[data-sen="detail"][data-ent="${smoke}"]`);
      await s.waitFor(`return !!r.querySelector('${sheet} .ag-pmbanner')`);
    };
    const closeSheet = async () => {
      if (mobile) await s.tap('#ag-sheet .ag-dlg-btns [data-sen="close-detail"]');
    };
    const shown = async () => {
      if (mobile || !(await s.ev(`return !!r.querySelector('${sheet} .ag-pmbanner')`))) await openSheet();
    };
    const banner = () => s.ev(`return r.querySelector('${sheet} .ag-pmbanner').innerText`);
    const sw = `${sheet} [data-key="always_off"][role="switch"]`; // der Schalter selbst (daneben steht bei eigenem Wert der Knopf "zurück")
    await openSheet();
    check(`${tag}: Blatt ohne Pillen der Alarmmodi`, await s.ev(`return !r.querySelector('${sheet} .ag-zline') && !r.querySelector('${sheet} .ag-chip')`));
    check(`${tag}: nur "Immer aktiv": der Rahmen nennt "in jedem Zustand der Anlage", kein Schalter`, (await banner()).includes(T.every) && (await s.ev(`return !r.querySelector('${sw}')`)), await banner());
    if (mobile) check(`${tag}: Handy: unter der Leiste "Fertig" liegt kein Abstand, in dem der Inhalt durchscheint`, await s.ev("const d=r.getElementById('ag-sheet'); const b=d.querySelector(':scope > .ag-dlg-btns'); return getComputedStyle(d).paddingBottom === '0px' && !!b && Math.abs(b.getBoundingClientRect().bottom - d.getBoundingClientRect().bottom) < 2"));
    await closeSheet();
    // Der Sensor kommt zusätzlich in die Zone "Abwesend" (Kästchen der Tabelle)
    await s.tap(`.ag-gbody [data-box][data-mode="away"][data-ent="${smoke}"]`);
    await shown();
    check(`${tag}: in einer Zone: Schalter "nur der Modus zählt", standardmässig an`, await s.waitFor(`const b=r.querySelector('${sw}'); return !!b && b.getAttribute('aria-checked') === 'true' && b.closest('.ag-orow').innerText.includes(${JSON.stringify(T.only)})`));
    check(`${tag}: der Rahmen nimmt den Modus aus: "deaktiviert und scharf in …", mit Hinweis auf Abwesend`, (await banner()).includes(T.dis) && (await banner()).includes(T.away) && !(await banner()).includes(T.every), await banner());
    await s.tap(sw);
    check(`${tag}: Schalter aus: eigener Wert im Entwurf, Erklärung nennt beide Abläufe`, await s.waitFor(`const b=r.querySelector('${sw}'); return r.host.sensors.draft.opts["${smoke}"]?.always_off === false && b.getAttribute('aria-checked') === 'false' && b.closest('.ag-orow').innerText.includes(${JSON.stringify(T.both)})`));
    check(`${tag}: Schalter aus: der Rahmen nennt wieder "in jedem Zustand der Anlage"`, (await banner()).includes(T.every), await banner());
    await closeSheet();
    await s.tap('.ag-foot [data-sen="cancel"]');

    // Mit "Einstellungen pro Modus": ein Sensor, der nur "Immer aktiv" ist und im gewählten Reiter (Anwesend) in keiner Zone steht,
    // zeigt im Blatt den Bereich "Immer aktiv"; steht er in der Zone, zeigt es den Modus und den Schalter mit dem Namen des Modus
    await s.tap('[data-sen="permode"]');
    await s.waitFor("return !!r.querySelector('[data-seg=\"sen-mode\"]')");
    await shown();
    check(`${tag}: pro Modus, nicht in der Zone des Reiters: Bereich "Immer aktiv" ("in jedem Zustand der Anlage")`, (await banner()).includes(T.every), await banner());
    await closeSheet();
    await s.tap(`.ag-gbody [data-box][data-mode="home"][data-ent="${smoke}"]`);
    await shown();
    check(`${tag}: pro Modus, in der Zone: der Rahmen nennt "scharf in Anwesend", der Schalter trägt den Namen des Modus`, await s.waitFor(`const b=r.querySelector('${sheet} .ag-pmbanner'); const o=r.querySelector('${sw}'); return !!b && b.innerText.includes(${JSON.stringify(`${T.armed} ${T.home}`)}) && !!o && o.getAttribute('aria-checked') === 'true' && o.closest('.ag-orow').innerText.includes(${JSON.stringify(T.home)})`));
    await closeSheet();
    await s.tap('.ag-foot [data-sen="cancel"]');

    // Anlage › Modi: Pille neben den Modi, Standard an
    await s.tap('[data-sub="system"]');
    check(`${tag}: Schalter "Immer aktiv" bei den Modi, standardmässig an`, await s.waitFor(`const b=r.querySelector('${pill}'); return !!b && b.getAttribute('aria-checked') === 'true' && !r.querySelector('.ag-warntext')`));
    await s.tap(pill);
    check(`${tag}: ausgeschaltet: Warnung, Änderung zählt`, await s.waitFor(`return r.querySelector('${pill}').getAttribute('aria-checked') === 'false' && !!r.querySelector('.ag-warntext') && !r.querySelector('.ag-foot [data-sys="save"]').disabled`));
    await s.tap('.ag-foot [data-sys="save"]');
    check(`${tag}: gespeichert`, await s.waitFor(`return r.querySelector('.ag-foot').innerText.includes('${saved}')`));
    const sent = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/save_system').at(-1)");
    check(`${tag}: always_enabled gesendet`, sent?.always_enabled === false, JSON.stringify(sent));

    // Sensoren: kein Reiter und keine Spalte "Immer aktiv"
    await s.tap('[data-sub="sensors"]');
    await s.waitFor("return !!r.querySelector('.ag-gbody table')");
    await s.tap('[data-sen="permode"]');
    check(`${tag}: Sensoren: kein Reiter "Immer aktiv"`, await s.waitFor("return !!r.querySelector('[data-seg=\"sen-mode\"]') && !r.querySelector('[data-seg=\"sen-mode\"] [data-sen=\"mt:always\"]')"));
    check(`${tag}: Sensoren: keine Spalte "Immer aktiv"`, await s.ev("return !r.querySelector('.ag-gbody [data-sen=\"opt\"][data-key=\"always\"], .ag-gbody [data-sen=\"mopt\"][data-key=\"always\"]')"));
    await s.tap('[data-sen="permode"]');

    // Aktionen: kein Reiter "Immer aktiv"
    await s.tap('[data-sub="actions"]');
    await s.waitFor("return r.querySelectorAll('.ag-wf-step').length > 0");
    check(`${tag}: Aktionen: kein Reiter "Immer aktiv"`, await s.ev("return !r.querySelector('[data-trigger=\"always\"]')"));

    // Übersicht: Sensoren, die nur "Immer aktiv" sind, stehen nicht in der Liste
    await s.tap('[data-tab="overview"], .ag-tabs [data-tab="overview"]').catch(() => {});
    await s.ctx.close();

    // Wieder an: Reiter und Spalte sind zurück
    const t = await open(browser, { mobile, lang, tab: "config" });
    await t.tap('[data-sub="system"]');
    await t.waitFor(`return !!r.querySelector('${pill}')`);
    check(`${tag}: im Neustart des Nachbaus ist sie wieder an`, await t.ev(`return r.querySelector('${pill}').getAttribute('aria-checked') === 'true'`));
    await t.ctx.close();
  }
}
await browser.close();
done();
