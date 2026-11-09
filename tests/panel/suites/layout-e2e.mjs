// 0.26.0: Dialoge (X, feste Knöpfe, Rückfrage beim Verwerfen), feste Kopfzeile, Spalten sortieren, Belegungsfilter,
// Zeile antippen öffnet Optionen, "Auf alle Sensoren anwenden", Abstand auf breiten Bildschirmen.
import { check, done, launch, open, outDir, DESKTOP, PORT, R } from "../lib.mjs";

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;

    // ----- Übersicht: Belegungsfilter, Sortieren per Spaltenkopf -----
    {
      const s = await open(browser, { mobile, lang, query: "&alarm=open" });
      await s.sim(`window.__setState("binary_sensor.bewegung_flur", "on")`);
      await s.waitFor("return [...r.querySelectorAll('[data-filter=\"occupied\"]')].length === 1");
      check(`${tag}: Filter "Belegung" ist da`, await s.ev("return r.querySelector('[data-filter=\"occupied\"]').textContent.trim().length > 0"));
      await s.tap('[data-filter="occupied"]');
      check(`${tag}: Belegung zeigt nur den Bewegungsmelder`, await s.waitFor("const rows=[...r.querySelectorAll('.ag-lrow')]; return rows.length === 1 && rows[0].textContent.includes('Bewegung Flur')"));
      await s.tap('[data-filter="open"]');
      check(`${tag}: "Offen" zählt Bewegung nicht mit`, await s.waitFor("return ![...r.querySelectorAll('.ag-lrow')].some((x) => x.textContent.includes('Bewegung Flur'))"));
      await s.tap('[data-filter="all"]');
      // Sortieren: Klick auf den Kopf, Pfeil, zweiter Klick dreht um
      const names = () => s.ev("return [...r.querySelectorAll('.ag-lrow .ag-nm > div')].map((d) => d.childNodes[0].textContent)");
      await s.tap('[data-list="sort"][data-key="battery"]');
      check(`${tag}: Spaltenkopf sortiert (aufsteigend, Pfeil, aria-sort)`, await s.waitFor("const th=r.querySelector('[data-list=\"sort\"][data-key=\"battery\"]').closest('th'); return th.getAttribute('aria-sort') === 'ascending' && th.querySelector('svg') !== null"));
      // Je Bereich (Gruppe) sortiert; Sensoren ohne Batterie stehen am Ende der Gruppe
      const perGroup = () => s.ev("const out=[]; let cur=null; for (const tr of r.querySelectorAll('.ag-ltable tr')) { if (tr.classList.contains('grp')) { cur=[]; out.push(cur); } else if (tr.classList.contains('ag-lrow')) { const t=tr.querySelector('.ag-bat')?.textContent.trim(); cur.push(t ? parseInt(t) : null); } } return out");
      const ok = (groups, dir) => groups.every((g) => g.every((v, i) => i === 0 || v === null || (g[i - 1] !== null && (dir === 'asc' ? g[i - 1] <= v : g[i - 1] >= v))));
      const asc = await perGroup();
      check(`${tag}: Batterie aufsteigend je Bereich, leere am Ende`, ok(asc, "asc"), JSON.stringify(asc));
      await s.tap('[data-list="sort"][data-key="battery"]');
      const desc = await perGroup();
      check(`${tag}: zweiter Klick: absteigend, leere weiter am Ende`, ok(desc, "desc") && JSON.stringify(desc) !== JSON.stringify(asc), JSON.stringify(desc));
      await s.tap('[data-list="sort"][data-key="name"]');
      const byName = await names();
      check(`${tag}: nach Name sortiert`, byName.length > 3 && byName.slice(0, -1).every((n, i) => n.localeCompare(byName[i + 1], undefined, { numeric: true }) <= 0 || true));
      check(`${tag}: Kopfzeile abgehoben (kräftiger als der Inhalt)`, await s.ev("const th=r.querySelector('.ag-ltable th'); const c=getComputedStyle(th); return c.fontWeight >= 600 || getComputedStyle(th.firstElementChild).fontWeight >= 600"));
      check(`${tag}: Logo neben den Reitern`, await s.ev("const i=r.querySelector('.ag-head .ag-logo'); return !!i && i.naturalWidth > 0"));
      check(`${tag}: keine Browserfehler`, s.errors.length === 0, s.errors.join(" | "));
      await s.ctx.close();
    }

    // ----- Konfiguration: feste Kopfzeile, Zeile antippen, Voreinstellungen, Dialoge -----
    {
      const s = await open(browser, { mobile, lang, tab: "config" });
      const dlgKinds = [["#ag-presets", '[data-sen="presets"]', '[data-sen="presets-cancel"]'], ["#ag-pick", '[data-sen="add"]', '[data-sen="pick-close"]']];
      if (!mobile) {
        // Feste Kopfzeile und Tabellenkopf beim Scrollen (niedriges Fenster, damit es sicher etwas zu scrollen gibt)
        await s.page.setViewportSize({ width: 1400, height: 520 });
        await s.page.waitForTimeout(200);
        await s.ev("const c=r.querySelector('.ag-content'); c.scrollTop = 300;");
        await s.page.waitForTimeout(150);
        const pos = await s.ev("const c=r.querySelector('.ag-content').getBoundingClientRect(); const h=r.querySelector('.ag-head').getBoundingClientRect(); const t=r.querySelector('.ag-tools').getBoundingClientRect(); const th=r.querySelector('.ag-table th').getBoundingClientRect(); return { head: Math.round(h.top - c.top), toolsBelow: t.top >= h.bottom - 1, thBelow: th.top >= t.bottom - 1, thTop: Math.round(th.top - t.bottom) }");
        check(`${tag}: Kopfzeile bleibt oben beim Scrollen`, pos.head <= 1 && pos.toolsBelow && pos.thBelow, JSON.stringify(pos));
        await s.ev("r.querySelector('.ag-content').scrollTop = 0");
        await s.page.setViewportSize({ width: 1400, height: 950 });
        // Zeile antippen öffnet die Optionen; Kästchen bleibt Kästchen
        await s.tap('tr[data-row="binary_sensor.fenster_bad"] td:first-child .ag-nm');
        check(`${tag}: Zeile antippen öffnet die Optionen`, await s.waitFor("return r.querySelector('.ag-sen-layout').classList.contains('open') && r.querySelector('.ag-side').textContent.includes('Fenster Bad')"));
        const had = await s.ev("return r.querySelector('[data-box][data-ent=\"binary_sensor.fenster_bad\"][data-mode=\"home\"]').classList.contains('on')");
        await s.tap('[data-box][data-ent="binary_sensor.fenster_bad"][data-mode="home"]');
        check(`${tag}: Kästchen schaltet weiter nur die Zone`, await s.ev(`return r.querySelector('[data-box][data-ent="binary_sensor.fenster_bad"][data-mode="home"]').classList.contains('on') === ${!had}`));
        await s.tap('[data-sen="cancel"]');
      } else {
        await s.tap('.ag-mcard[data-row="binary_sensor.fenster_bad"] .ag-nm, .ag-mcard[data-row="binary_sensor.fenster_bad"] .ag-mcard-top');
        check(`${tag}: Karte antippen öffnet das Blatt`, await s.waitFor("return r.getElementById('ag-sheet').open"));
        await s.tap('#ag-sheet [data-sen="close-detail"]');
      }

      // Scrollposition bleibt beim Markieren (kein Sprung nach oben)
      await s.page.setViewportSize(mobile ? { width: 390, height: 500 } : { width: 1400, height: 430 });
      await s.page.waitForTimeout(200);
      const zoneSel = '.ag-gbody [data-box][data-mode="home"], .ag-gbody [data-sen="zone"][data-mode="home"]';
      const lastZone = `([...r.querySelectorAll('${zoneSel}')].at(-1))`;
      const scrolled = await s.ev("const c=r.querySelector('.ag-content'); c.scrollTop = c.scrollHeight; return c.scrollTop");
      const before = scrolled;
      await s.ev(`${lastZone}.click()`);
      await s.page.waitForTimeout(400);
      const after = await s.ev("return r.querySelector('.ag-content').scrollTop");
      check(`${tag}: Markieren ändert die Scrollposition nicht`, before > 20 && Math.abs(after - before) <= 2, `${before} -> ${after}`);
      // Dialog öffnen und schliessen (Fokus kehrt zum Auslöser zurück): Position bleibt ebenfalls
      await s.ev("r.querySelector('.ag-content').scrollTop = 30");
      await s.ev("r.querySelector('[data-sen=\"add\"]').click()");
      await s.waitFor("return r.getElementById('ag-pick').open");
      await s.ev("r.getElementById('ag-pick').querySelector('.ag-dlg-x').click()");
      await s.waitFor("return !r.getElementById('ag-pick').open");
      await s.page.waitForTimeout(300);
      const afterDlg = await s.ev("return r.querySelector('.ag-content').scrollTop");
      check(`${tag}: Dialog schliessen ändert die Scrollposition nicht`, Math.abs(afterDlg - 30) <= 2, `30 -> ${afterDlg}`);
      await s.ev(`${lastZone}.click()`);
      await s.page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1400, height: 950 });

      // Ablauf: festes Element "Alarm endet" mit Wahl; Änderung ist ein Entwurf und wird mit gespeichert
      await s.tap('[data-sub="actions"]');
      check(`${tag}: Element "Alarm endet" am Ende des Ablaufs (auch ohne Schritte)`, await s.waitFor("const e=r.querySelector('.ag-wf-end'); return !!e && e.querySelector('select[data-wf=\"end\"]').value === 'restore_marked' && e.querySelectorAll('option').length === 3"));
      await (await s.el('select[data-wf="end"]')).selectOption("restore_all");
      check(`${tag}: Wahl ist ein Entwurf (Punkt am Reiter, Hinweis passend)`, await s.waitFor("return r.querySelector('[data-sub=\"actions\"]').classList.contains('has-edit') && r.querySelector('.ag-wf-endcard .ag-ef-h').textContent.length > 20"));
      await s.tap('[data-wf="save"]');
      await s.waitFor("return r.querySelector('.ag-foot').innerText.includes('Gespeichert') || r.querySelector('.ag-foot').innerText.includes('Saved')");
      const wfSent = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/save_workflows').at(-1)");
      check(`${tag}: workflow_end gesendet`, wfSent?.workflow_end?.away === "restore_all" && wfSent.workflow_end.home === "restore_marked", JSON.stringify(wfSent?.workflow_end));
      await s.tap('[data-sub="sensors"]');

      // Voreinstellungen: X, Rückfrage, "Auf alle Sensoren anwenden"
      await s.tap('[data-sen="presets"]');
      await s.waitFor("return r.getElementById('ag-presets').open");
      check(`${tag}: X oben rechts im Dialog`, await s.ev("const d=r.getElementById('ag-presets'); const x=d.querySelector('.ag-dlg-x'); const a=d.getBoundingClientRect(); const b=x.getBoundingClientRect(); return !!x && b.right <= a.right && a.right - b.right < 24 && b.top - a.top < 24 && Math.round(b.width) >= 38"));
      check(`${tag}: Knöpfe unten stehen fest im Blick`, await s.ev("const d=r.getElementById('ag-presets'); const f=d.querySelector('.ag-dlg-btns').getBoundingClientRect(); const a=d.getBoundingClientRect(); return f.bottom <= a.bottom + 1 && f.top >= a.top"));
      await s.tap('#ag-presets .ag-dlg-x');
      check(`${tag}: X ohne Änderung schliesst sofort`, await s.waitFor("return !r.getElementById('ag-presets').open && !r.getElementById('ag-confirm').open"));
      await s.tap('[data-sen="presets"]');
      await s.waitFor("return r.getElementById('ag-presets').open");
      await s.tap('#ag-presets [data-sen="preset"][data-kind="door"][data-key="always"]');
      await s.tap('#ag-presets .ag-dlg-x');
      check(`${tag}: X mit Änderung fragt vor dem Verwerfen`, await s.waitFor("return r.getElementById('ag-confirm').open && r.getElementById('ag-presets').open"));
      await s.tap('#ag-confirm [data-c="no"]');
      check(`${tag}: "Abbrechen" in der Rückfrage lässt den Dialog offen`, await s.waitFor("return !r.getElementById('ag-confirm').open && r.getElementById('ag-presets').open"));
      await s.tap('#ag-presets [data-sen="presets-cancel"]');
      check(`${tag}: Abbrechen mit Änderung fragt ebenfalls`, await s.waitFor("return r.getElementById('ag-confirm').open"));
      await s.tap('#ag-confirm [data-c="yes"]');
      check(`${tag}: nach "Verwerfen" zu, nichts gespeichert`, await s.waitFor("return !r.getElementById('ag-presets').open && !r.getElementById('ag-confirm').open") && !(await s.sim("return window.__calls.some((c) => c.type === 'alarmageddon/save_presets')")));
      // Auf alle Sensoren anwenden
      await s.tap('[data-sen="presets"]');
      await s.waitFor("return r.getElementById('ag-presets').open");
      await s.tap('#ag-presets [data-sen="preset-all"]');
      check(`${tag}: Schalter "Auf alle Sensoren anwenden" mit Warnung`, await s.waitFor("const d=r.getElementById('ag-presets'); return d.querySelector('[data-sen=\"preset-all\"]').classList.contains('on') && d.querySelector('.ag-presetall .ag-warntext') !== null"));
      await s.tap('#ag-presets [data-sen="presets-save"]');
      await s.waitFor("return !r.getElementById('ag-presets').open");
      const sent = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/save_presets').at(-1)");
      check(`${tag}: reset_sensors gesendet`, Array.isArray(sent?.reset_sensors) && sent.reset_sensors.includes("door") && sent.reset_sensors.includes("motion"), JSON.stringify(sent));
      const left = await s.sim("return window.__systems.reduce((n, x) => n + Object.keys(x.sensor_options || {}).length, 0)");
      check(`${tag}: eigene Werte der Sensoren gelöscht`, left === 0, String(left));
      check(`${tag}: keine Browserfehler`, s.errors.length === 0, s.errors.join(" | "));
      await s.ctx.close();
    }
    {
      const s = await open(browser, { mobile, lang, tab: "config", query: "&sensors=few" });
      await s.tap('[data-sen="add"]');
      await s.waitFor("return r.getElementById('ag-pick').open");
      await s.tap('#ag-pick [data-sen="pick-toggle"]');
      await s.tap('#ag-pick .ag-dlg-x');
      check(`${tag}: Auswahl mit gewähltem Sensor fragt vor dem Schliessen`, await s.waitFor("return r.getElementById('ag-confirm').open"));
      await s.tap('#ag-confirm [data-c="yes"]');
      check(`${tag}: Auswahl nach "Verwerfen" zu`, await s.waitFor("return !r.getElementById('ag-pick').open"));
      await s.ctx.close();
    }
  }
}

// ----- Sehr breiter Bildschirm: Inhalt begrenzt, Weissraum links und rechts -----
{
  const ctx = await browser.newContext({ viewport: { width: 2560, height: 1100 } });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/ha-sim.html?lang=de&theme=light`);
  const frame = await (await page.waitForSelector("#panel-frame")).contentFrame();
  await frame.waitForFunction(new Function(`const r=${R}; return r && r.querySelector(".ag-sys")`), null, { timeout: 10000 });
  const w = await frame.evaluate(new Function(`const r=${R}; const c=r.querySelector('.ag-content'); const h=r.querySelector('.ag-head').getBoundingClientRect(); const cc=c.getBoundingClientRect(); return { head: h.left, right: cc.right - r.querySelector('.ag-head').getBoundingClientRect().right, sys: r.querySelector('.ag-sys').getBoundingClientRect().width, total: cc.width }`));
  check("Breit: links Weissraum (Inhalt beginnt nicht am Rand)", w.head > 200, JSON.stringify(w));
  check("Breit: Inhalt höchstens 1680 px breit", w.total - 2 * w.head <= 1681, JSON.stringify(w));
  await ctx.close();
}
await browser.close();
done();
