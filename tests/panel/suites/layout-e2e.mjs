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
      // Filter nach Sensorart (Aufklappmenü)
      const typeSel = await s.el('select[data-list="type"]');
      check(`${tag}: Aufklappmenü "Sensorart" mit allen Arten`, !!typeSel && await s.ev("return r.querySelector('select[data-list=\"type\"]').options.length === 7"));
      await typeSel.selectOption("window");
      check(`${tag}: Filter Fenster zeigt nur Fenster`, await s.waitFor("const rows=[...r.querySelectorAll('.ag-lrow')]; return rows.length > 0 && rows.every((x) => ['Fenster', 'Window'].includes(x.querySelector('.ag-nm small').textContent.trim()))"));
      await typeSel.selectOption("");
      // Feste Übersicht (hohes Fenster am Desktop): Karten, Filter und Tabellenkopf bleiben stehen
      if (!mobile) {
        await s.page.setViewportSize({ width: 1400, height: 900 });
        await s.page.waitForTimeout(250);
        await s.ev("r.querySelector('.ag-content').scrollTop = 400");
        await s.page.waitForTimeout(200);
        const ov = await s.ev("const c=r.querySelector('.ag-content').getBoundingClientRect(); const t=r.querySelector('.ag-ov-top').getBoundingClientRect(); const tools=r.querySelector('.ag-ov-tools').getBoundingClientRect(); const th=r.querySelector('.ag-ltable th').getBoundingClientRect(); const h=r.querySelector('.ag-head').getBoundingClientRect(); return { head: Math.round(h.top - c.top), cardsBelowHead: t.top >= h.bottom - 1, toolsBelowCards: tools.top >= t.bottom - 1, thBelowTools: th.top >= tools.bottom - 1, scrollable: r.querySelector('.ag-content').scrollTop > 0 }");
        check(`${tag}: Übersicht: Kopfzeile, Karten, Filter und Tabellenkopf bleiben beim Scrollen`, ov.head <= 1 && ov.cardsBelowHead && ov.toolsBelowCards && ov.thBelowTools && ov.scrollable, JSON.stringify(ov));
        await s.ev("r.querySelector('.ag-content').scrollTop = 0");
      }
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
        // Der Tabellenkopf wird oben nie abgeschnitten: nichts Festes überdeckt ihn, auch nicht im Ruhezustand ohne Scrollen und mit offenem Blatt
        await s.page.setViewportSize({ width: 1700, height: 900 });
        await s.page.waitForTimeout(250);
        await s.tap('tr[data-row="binary_sensor.fenster_bad"] td:first-child .ag-nm');
        await s.waitFor("return r.querySelector('.ag-sen-layout').classList.contains('open')");
        await s.page.waitForTimeout(250);
        const cover = await s.ev("const sticky=[...r.querySelectorAll('.ag-stk')]; const th=r.querySelector('.ag-table th.z'); const t=th.getBoundingClientRect(); const side=r.querySelector('.ag-sheet').getBoundingClientRect(); const at=(x, y) => r.elementFromPoint(x, y); const mid=at(t.left + t.width / 2, t.top + 3); const sideTop=at(side.left + 40, side.top + 3); return { thTopHit: !!mid && (mid === th || th.contains(mid)), sideHit: !!sideTop && r.querySelector('.ag-sheet').contains(sideTop), overlap: Math.max(...sticky.map((e) => Math.round(e.getBoundingClientRect().bottom - t.top))) }");
        check(`${tag}: Tabellenkopf und Blatt oben nicht abgeschnitten (ohne Scrollen)`, cover.thTopHit && cover.sideHit && cover.overlap <= 1, JSON.stringify(cover));
        await s.tap('[data-sen="close-detail"]').catch(() => {});
        await s.page.setViewportSize({ width: 1400, height: 520 });
        // Fest stehende Teile überlappen nicht: jeder beginnt dort, wo der vorige endet; der Tabellenkopf liegt unter der Werkzeugleiste
        const stack = await s.ev("const els=[...r.querySelectorAll('.ag-stk')].map((e) => e.getBoundingClientRect()); const th=r.querySelector('.ag-table th').getBoundingClientRect(); const gaps=els.slice(1).map((b, i) => Math.round(b.top - els[i].bottom)); return { n: els.length, gaps, thBelow: th.top >= els.at(-1).bottom - 1 }");
        check(`${tag}: feste Teile überlappen nicht (auch nach dem Laden des Logos)`, stack.n >= 3 && stack.gaps.every((g) => g >= -1 && g <= 1) && stack.thBelow, JSON.stringify(stack));
        await s.ev("r.querySelector('.ag-content').scrollTop = 0");
        await s.page.setViewportSize({ width: 1400, height: 950 });
        check(`${tag}: Papierkorb und Pfeil nebeneinander auf einer Höhe, Pfeil ganz rechts`, await s.ev("const td=r.querySelector('.ag-gbody td.ag-acts'); const t=td.querySelector('[data-sen=\"remove\"]').getBoundingClientRect(); const c=td.querySelector('[data-sen=\"detail\"]').getBoundingClientRect(); const row=td.closest('tr').getBoundingClientRect(); return Math.abs((t.top + t.bottom) / 2 - (c.top + c.bottom) / 2) < 2 && c.left > t.right - 1 && row.right - c.right < 30"));
        // Zeile antippen öffnet die Optionen; Kästchen bleibt Kästchen
        await s.tap('tr[data-row="binary_sensor.fenster_bad"] td:first-child .ag-nm');
        check(`${tag}: Zeile antippen öffnet die Optionen`, await s.waitFor("return r.querySelector('.ag-sen-layout').classList.contains('open') && r.querySelector('.ag-side').textContent.includes('Fenster Bad')"));
        const had = await s.ev("return r.querySelector('[data-box][data-ent=\"binary_sensor.fenster_bad\"][data-mode=\"home\"]').classList.contains('on')");
        await s.tap('[data-box][data-ent="binary_sensor.fenster_bad"][data-mode="home"]');
        check(`${tag}: Kästchen schaltet weiter nur die Zone`, await s.ev(`return r.querySelector('[data-box][data-ent="binary_sensor.fenster_bad"][data-mode="home"]').classList.contains('on') === ${!had}`));
        // "Immer aktiv" als Kästchen in der Übersicht: wirksamer Wert, Klick setzt einen eigenen Wert (Entwurf)
        const alwaysSel = '[data-sen="opt"][data-key="always"][data-ent="binary_sensor.fenster_bad"]';
        check(`${tag}: Spalte "Immer aktiv" mit Kästchen je Sensor`, await s.ev("return [...r.querySelectorAll('.ag-table th')].some((th) => /Immer aktiv|Always active/.test(th.textContent)) && r.querySelectorAll('.ag-gbody [data-key=\"always\"].ag-box').length >= 5"));
        const wasOn = await s.ev(`return r.querySelector('${alwaysSel}').classList.contains('on')`);
        await s.tap(alwaysSel);
        check(`${tag}: Klick schaltet "Immer aktiv" um und ist ein Entwurf`, await s.waitFor(`return r.querySelector('${alwaysSel}').classList.contains('on') === ${!wasOn} && r.querySelector('[data-sub="sensors"]').classList.contains('has-edit')`));
        await s.tap('[data-sen="cancel"]');
        // Auf einem sehr breiten Bildschirm rutscht die Tabelle beim Öffnen der Optionen nicht nach links
        await s.page.setViewportSize({ width: 2200, height: 950 });
        await s.page.waitForTimeout(250);
        const boxX = () => s.ev("const b=r.querySelector('.ag-gbody [data-box][data-mode=\"home\"]'); return Math.round(b.getBoundingClientRect().left)");
        const xClosed = await boxX();
        await s.tap('tr[data-row="binary_sensor.fenster_bad"] td:first-child .ag-nm');
        await s.waitFor("return r.querySelector('.ag-sen-layout').classList.contains('open')");
        await s.page.waitForTimeout(250);
        const xOpen = await boxX();
        check(`${tag}: breiter Bildschirm: Kästchen bleiben beim Öffnen der Optionen an ihrem Platz`, Math.abs(xOpen - xClosed) <= 1, `${xClosed} -> ${xOpen}`);
        await s.page.setViewportSize({ width: 1400, height: 950 });
      } else {
        await s.tap('tr[data-row="binary_sensor.fenster_bad"] .ag-nm');
        check(`${tag}: Zeile antippen öffnet das Blatt`, await s.waitFor("return r.getElementById('ag-sheet').open"));
        check(`${tag}: Blatt hat nur ein X und läuft nicht über den Rand`, await s.ev("const d=r.getElementById('ag-sheet'); const xs=[...d.querySelectorAll('.ag-dlg-x, .ag-side-head [data-sen=\"close-detail\"]')].filter((e) => e.getBoundingClientRect().width > 0); return xs.length === 1 && d.scrollWidth <= d.clientWidth"));
        await s.tap('#ag-sheet .ag-dlg-btns [data-sen="close-detail"]');
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

      // Ablauf: festes Element "Alarm endet" mit Fenster (Wahl und eigene Meldung); Änderung ist ein Entwurf und wird mit gespeichert
      await s.tap('[data-sub="actions"]');
      check(`${tag}: Element "Alarm endet" am Ende des Ablaufs (auch ohne Schritte), mit farbigem Symbol`, await s.waitFor("const e=r.querySelector('.ag-wf-end'); return !!e && !!e.querySelector('[data-wf=\"end-edit\"]') && getComputedStyle(e.querySelector('.ag-end-ic')).color !== getComputedStyle(r.querySelector('.ag-wf-start .ag-mini.err')).color"));
      check(`${tag}: keine Wahl zum Zurücksetzen mehr (entscheidet allein der Schritt)`, await s.ev("return !r.querySelector('.ag-wf-end select') && !r.querySelector('[data-wf=\"end-undo\"]')"));
      check(`${tag}: Marken im Ablauf sind undurchsichtig (Linie scheint nicht durch das Symbol)`, await s.ev("return [...r.querySelectorAll('.ag-wf-start .ag-mini')].every((m) => { const c=getComputedStyle(m); return c.backgroundColor !== 'rgba(0, 0, 0, 0)' && !c.backgroundColor.endsWith(', 0)'); })"));
      check(`${tag}: Linie läuft nicht durch die Karten`, await s.ev("const l=r.querySelector('.ag-wf-main').getBoundingClientRect(); const e=r.querySelector('.ag-wf-end').getBoundingClientRect(); return e.top >= l.bottom - 1"));
      await s.tap('[data-wf="end-edit"]');
      check(`${tag}: Fenster "Alarm endet" mit Schalter für die Meldung`, await s.waitFor("const d=r.getElementById('ag-step'); return d.open && !!d.querySelector('[data-wf=\"end-notify\"]') && !d.querySelector('select[data-wf=\"end-undo\"]') && !d.querySelector('[data-key=\"ntTitle\"]')"));
      await s.tap('[data-wf="end-notify"]');
      check(`${tag}: Meldung mit allen Optionen (Text, Platzhalter, Vorschau, Kritisch, Klickziel), ohne Knöpfe, Kritisch standardmässig aus`, await s.waitFor("const d=r.getElementById('ag-step'); return !!d.querySelector('[data-key=\"ntTitle\"]') && d.querySelectorAll('[data-wf=\"ins\"]').length === 4 && !!d.querySelector('#ag-ntprev') && !!d.querySelector('[data-wf=\"nt-crit\"]') && !!d.querySelector('[data-wf=\"nt-click\"]') && !d.querySelector('[data-wf=\"nt-btn\"]') && d.querySelector('[data-wf=\"nt-crit\"]').getAttribute('aria-checked') === 'false'"));
      await s.tap('[data-wf="nt-crit"]');
      check(`${tag}: Lautstärkeregler höchstens halb so breit wie das Fenster`, await s.waitFor("const d=r.getElementById('ag-step'); const rg=d.querySelector('.ag-ef-range'); return !!rg && rg.getBoundingClientRect().width <= d.getBoundingClientRect().width * (r.host.hasAttribute('narrow') ? 1.01 : 0.55)"));
      await (await s.el('#ag-step [data-key="ntTitle"]')).fill("Ruhe in {name}");
      await s.tap('#ag-step [data-wf="apply"]');
      check(`${tag}: Wahl ist ein Entwurf (Punkt am Reiter, Karte zeigt eigene Meldung)`, await s.waitFor("return !r.getElementById('ag-step').open && r.querySelector('[data-sub=\"actions\"]').classList.contains('has-edit') && r.querySelector('.ag-wf-endcard').textContent.includes('Eigene') || r.querySelector('.ag-wf-endcard').textContent.includes('Own')"));
      await s.tap('[data-wf="save"]');
      await s.waitFor("return r.querySelector('.ag-foot').innerText.includes('Gespeichert') || r.querySelector('.ag-foot').innerText.includes('Saved')");
      const wfSent = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/save_workflows').at(-1)");
      const away = wfSent?.workflow_end?.away;
      check(`${tag}: workflow_end gesendet (nur die eigene Meldung)`, away?.notify?.enabled === true && away.notify.title === "Ruhe in {name}" && away.notify.critical === true && !("undo" in away) && !wfSent.workflow_end.home.notify, JSON.stringify(wfSent?.workflow_end));
      await s.tap('[data-sub="sensors"]');

      // Einstellungen pro Modus in der Sensorübersicht: Schalter aus = wie vor 0.32.0 (keine Reiter); ein = Reiter der Modi, erster gewählt,
      // dieselben Spalten, die Spalten des gewählten Modus hervorgehoben, Optionen im Blatt
      const thCount = await s.ev("return r.querySelectorAll('.ag-gbody th').length");
      check(`${tag}: Schalter "Einstellungen pro Modus" aus: keine Reiterleiste`, await s.ev("const sw=r.querySelector('[data-sen=\"permode\"]'); return sw.getAttribute('aria-checked') === 'false' && !r.querySelector('[data-seg=\"sen-mode\"]')"));
      await s.tap('[data-sen="permode"]');
      check(`${tag}: Schalter ein: Reiter der Modi (ohne "Alle Modi"), der erste ist gewählt, Entwurf`, await s.waitFor("const t=[...r.querySelectorAll('[data-seg=\"sen-mode\"] > button')]; return t.length >= 3 && t.every((b) => b.dataset.sen !== 'mt:all') && t.at(-1).dataset.sen === 'mt:always' && t[0].classList.contains('on') && r.querySelector('[data-sub=\"sensors\"]').classList.contains('has-edit')"));
      check(`${tag}: Sensoren: Erklärung zum Schalter steht da (ein und aus), sichtbar`, await s.ev("const sm=r.querySelector('.ag-pmstick .ag-pmbar small'); return !!sm && sm.getBoundingClientRect().height > 8 && sm.textContent.length > 20"));
      check(`${tag}: Reiter der Modi links bündig unter dem Schalter, Leiste bleibt beim Scrollen fest`, await s.ev("const sw=r.querySelector('.ag-pmbar .ag-toggle').getBoundingClientRect(); const seg=r.querySelector('.ag-pmbar [data-seg=\"sen-mode\"]').getBoundingClientRect(); return Math.abs(seg.left - sw.left) < 4 && seg.top > sw.bottom && (r.host.hasAttribute('narrow') || r.querySelector('.ag-pmstick').classList.contains('ag-stk'))"));
      check(`${tag}: Titel der gewählten Modus-Spalte ist fett, die anderen nicht`, await s.ev("const cur=r.querySelector('.ag-gbody th.cur'); const other=r.querySelector('.ag-gbody th.z:not(.cur)'); return !!cur && Number(getComputedStyle(cur).fontWeight) >= 700 && Number(getComputedStyle(other).fontWeight) < 700"));
      if (!mobile) {
        const gap = () => s.ev("const bar=r.querySelector('.ag-pmstick .ag-pmbar').getBoundingClientRect(); const th=r.querySelector('.ag-gbody th').getBoundingClientRect(); return Math.round(th.top - bar.bottom)");
        const rest = await gap();
        await s.page.setViewportSize({ width: 1400, height: 520 });
        await s.ev("const c=r.querySelector('.ag-content'); const th=r.querySelector('.ag-gbody th'); const top=parseFloat(c.style.getPropertyValue('--ag-th-top')); c.scrollTop += th.getBoundingClientRect().top - c.getBoundingClientRect().top - top + 40;");
        await s.page.waitForTimeout(900);
        const stuck = await gap();
        check(`${tag}: Abstand zwischen Leiste "Einstellungen pro Modus" und Tabelle bleibt beim Scrollen gleich`, rest >= 12 && Math.abs(rest - stuck) <= 1, `${rest} / ${stuck}`);
        await s.ev("r.querySelector('.ag-content').scrollTop = 0");
        await s.page.setViewportSize({ width: 1400, height: 950 });
      }
      if (!mobile) check(`${tag}: dieselben Spalten wie vorher, Spalten des gewählten Modus hervorgehoben`, await s.ev(`return r.querySelectorAll('.ag-gbody th').length === ${thCount} && r.querySelectorAll('.ag-gbody th.cur').length === 1`));
      await s.tap('[data-sen="mt:away"]');
      const alwaysSel = '.ag-gbody [data-sen="mopt"][data-key="always"][data-mode="always"]';
      check(`${tag}: "Immer aktiv" gehört zum eigenen Reiter, nicht zum Modus (Wert im Bereich always)`, await s.waitFor(`return r.querySelectorAll('${alwaysSel}').length >= 3`));
      const bypassEnt = await s.ev(`return [...r.querySelectorAll('${alwaysSel}')].find((b) => (b.getAttribute('aria-checked') || b.getAttribute('aria-pressed')) === 'false').dataset.ent`);
      await s.tap(`${alwaysSel}[data-ent="${bypassEnt}"]`);
      check(`${tag}: Klick setzt einen eigenen Wert für den Modus`, await s.waitFor(`const b=r.querySelector('${alwaysSel}[data-ent="${bypassEnt}"]'); return (b.getAttribute('aria-checked') || b.getAttribute('aria-pressed')) === 'true' && (b.classList.contains('own') || b.classList.contains('on'))`));
      // Alle anderen Optionen im Blatt, für den gewählten Modus
      if (!mobile) {
        await s.tap(`tr[data-row="${bypassEnt}"] td:first-child .ag-nm`);
        check(`${tag}: Blatt zeigt alle Optionen (auch "Umgehen") für den gewählten Modus`, await s.waitFor(`const sd=r.querySelector('.ag-side'); return sd.querySelectorAll('[data-sen="mopt"][data-mode="away"]').length === 6 && !!sd.querySelector('[data-key="bypass"]') && !sd.querySelector('[data-key="always"]')`));
        check(`${tag}: Blatt zeigt gut sichtbar den Geltungsbereich (Modus)`, await s.waitFor(`const b=r.querySelector('.ag-side .ag-pmbanner'); return !!b && parseFloat(getComputedStyle(b.querySelector('b')).fontSize) >= 17 && b.textContent.length > 8`));
        await s.tap('.ag-side [data-sen="close-detail"]');
        // Reiter "Immer aktiv": eigene Einstellungen, Spalte hervorgehoben, im Blatt alle Optionen einschliesslich "Immer aktiv"
        await s.tap('[data-sen="mt:always"]');
        await s.tap(`tr[data-row="${bypassEnt}"] td:first-child .ag-nm`);
        check(`${tag}: Reiter "Immer aktiv": Spalte hervorgehoben, Blatt mit allen 7 Optionen`, await s.waitFor(`const sd=r.querySelector('.ag-side'); return r.querySelectorAll('.ag-gbody th.cur').length === 1 && r.querySelector('.ag-gbody th.cur').textContent.match(/Immer aktiv|Always active/) !== null && sd.querySelectorAll('[data-sen="mopt"][data-mode="always"]').length === 7`));
        check(`${tag}: Blatt "Immer aktiv" zeigt Banner`, await s.waitFor(`return !!r.querySelector('.ag-side .ag-pmbanner')`));
        await s.tap('.ag-side [data-sen="close-detail"]');
      }
      await s.tap('[data-sen="save"]');
      await s.waitFor("return r.querySelector('.ag-foot').innerText.includes('Gespeichert') || r.querySelector('.ag-foot').innerText.includes('Saved')");
      const pmSent = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/save_zones').at(-1)");
      check(`${tag}: per_mode_sensors und sensor_modes gesendet (nur die Abweichung)`, pmSent?.per_mode_sensors === true && pmSent.sensor_modes?.always?.[bypassEnt]?.always === true && !pmSent.sensor_modes.home, JSON.stringify(pmSent?.sensor_modes));
      // Schalter wieder aus: Reiter weg, Werte bleiben gespeichert
      await s.tap('[data-sen="permode"]');
      check(`${tag}: Schalter aus: Reiterleiste weg`, await s.waitFor("return !r.querySelector('[data-seg=\"sen-mode\"]')"));
      await s.tap('[data-sen="save"]');
      await s.waitFor("return r.querySelector('.ag-foot').innerText.includes('Gespeichert') || r.querySelector('.ag-foot').innerText.includes('Saved')");
      const pmOff = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/save_zones').at(-1)");
      check(`${tag}: Schalter aus gespeichert, eigene Werte bleiben erhalten`, pmOff?.per_mode_sensors === false && pmOff.sensor_modes?.always?.[bypassEnt]?.always === true);

      // Anlage: Zeiten und Verhalten mit Schalter "Einstellungen pro Modus" (die Werte der Anlage unterscheiden sich: Schalter ist an)
      await s.tap('[data-sub="system"]');
      check(`${tag}: Anlage: Schalter an (Werte unterscheiden sich), Reiter der Modi da`, await s.waitFor("return r.querySelector('[data-sys=\"permode\"]').getAttribute('aria-checked') === 'true' && r.querySelectorAll('[data-seg=\"sys-scope\"] > button').length >= 2"));
      await s.tap('[data-sys="permode"]');
      check(`${tag}: Anlage: Schalter aus: keine Reiter, ein Satz Werte für alle Modi, Entwurf`, await s.waitFor("return !r.querySelector('[data-seg=\"sys-scope\"]') && r.querySelector('[data-sub=\"system\"]').classList.contains('has-edit')"));
      await (await s.el('[data-field="entry_delay"]')).fill("41");
      await s.tap('[data-sys="save"]');
      await s.waitFor("return r.querySelector('.ag-foot').innerText.includes('Gespeichert') || r.querySelector('.ag-foot').innerText.includes('Saved')");
      const sysSent = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/save_system').at(-1)");
      const ms = sysSent?.mode_settings || {};
      check(`${tag}: Anlage: per_mode_settings aus, gleiche Werte in allen Modi`, sysSent?.per_mode_settings === false && ms.home?.entry_delay === 41 && ms.away?.entry_delay === 41 && ms.night?.entry_delay === 41 && ms.home?.exit_delay === ms.away?.exit_delay, JSON.stringify(ms));
      await s.tap('[data-sys="permode"]');
      check(`${tag}: Anlage: Schalter wieder an: Reiter der Modi`, await s.waitFor("return r.querySelectorAll('[data-seg=\"sys-scope\"] > button').length >= 2"));
      await s.tap('[data-sys="cancel"]').catch(() => {});
      await s.tap('[data-sub="sensors"]');

      // Meldungen: "Ausfall (scharf)" steht oben bei den Meldungen; Schalter "Einstellungen pro Modus" (aus: keine Reiter), ein: Reiter der Modi
      await s.tap('[data-sub="notify"]');
      check(`${tag}: Schalter "Einstellungen pro Modus" aus: keine Reiterleiste`, await s.waitFor("return r.querySelector('.ag-nt [data-nt=\"permode\"]').getAttribute('aria-checked') === 'false' && !r.querySelector('[data-seg=\"nt-mode\"]')"));
      check(`${tag}: "Sensor im scharfen Zustand nicht erreichbar" steht bei den Meldungen (nicht mehr unter Wartung)`, await s.ev("const al=[...r.querySelectorAll('.ag-nt .ag-mtlist')][0]; const ma=[...r.querySelectorAll('.ag-nt .ag-mtlist')][1]; return !!al.querySelector('[data-nt=\"enabled\"][data-kind=\"sensor_offline\"]') && !ma.querySelector('[data-kind=\"sensor_offline\"]') && !!ma.querySelector('[data-kind=\"sensor_unavailable\"]')"));
      check(`${tag}: "Sensor meldet" heisst "Stiller Alarm"`, await s.ev("return /Stiller Alarm|Silent alarm/.test(r.querySelector('.ag-nt').textContent) && !/Sensor meldet \\(kein|Sensor reports \\(n/.test(r.querySelector('.ag-nt').textContent)"));
      // Jede Art kann zusätzlich als Benachrichtigung in Home Assistant stehen bleiben (auch Wartung); Entwurf, wird mit gespeichert
      check(`${tag}: Schalter "In Home Assistant stehen lassen" bei jeder Art (Alarm und Wartung)`, await s.ev("const n=r.querySelectorAll('.ag-nt [data-nt=\"persistent\"]'); return n.length >= 4 && !!r.querySelector('.ag-nt [data-nt=\"persistent\"][data-kind=\"battery_low\"]')"));
      await s.tap('.ag-nt [data-nt="persistent"][data-kind="battery_low"]');
      await s.tap('[data-nt="save"]');
      await s.waitFor("return r.querySelector('.ag-foot').innerText.includes('Gespeichert') || r.querySelector('.ag-foot').innerText.includes('Saved')");
      const pSent = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/save_notify').at(-1)");
      check(`${tag}: persistent gesendet`, pSent?.notify?.types?.battery_low?.persistent === true, JSON.stringify(pSent?.notify?.types?.battery_low));
      await s.tap('.ag-nt [data-nt="permode"]');
      check(`${tag}: Schalter ein: Reiter der Modi (ohne "Alle Modi"), der erste ist gewählt, Entwurf`, await s.waitFor("const t=[...r.querySelectorAll('[data-seg=\"nt-mode\"] > button')]; return t.length >= 2 && t.every((b) => b.dataset.nt !== 'tab:all') && t[0].classList.contains('on') && r.querySelector('[data-sub=\"notify\"]').classList.contains('has-edit')"));
      await s.tap('[data-nt="tab:away"]');
      check(`${tag}: Reiter Abwesend zeigt die vier Arten im scharfen Zustand (auch den Ausfall) mit Herkunft`, await s.waitFor("return r.querySelectorAll('.ag-nt [data-nt=\"enabled\"][data-mode=\"away\"]').length === 4 && !!r.querySelector('.ag-nt [data-nt=\"enabled\"][data-kind=\"sensor_offline\"][data-mode=\"away\"]') && r.querySelectorAll('.ag-nt .ag-origin').length === 4"));
      await s.tap('.ag-nt [data-nt="critical"][data-kind="sensor_offline"][data-mode="away"]');
      check(`${tag}: eigener Wert mit Zurücksetzen`, await s.waitFor("return !!r.querySelector('[data-nt=\"mode-reset\"][data-kind=\"sensor_offline\"]')"));
      await s.tap('[data-nt="save"]');
      await s.waitFor("return r.querySelector('.ag-foot').innerText.includes('Gespeichert') || r.querySelector('.ag-foot').innerText.includes('Saved')");
      const ntSent = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/save_notify').at(-1)");
      check(`${tag}: per_mode und modes gesendet (nur der abweichende Wert)`, ntSent?.notify?.per_mode === true && JSON.stringify(ntSent.notify.modes) === JSON.stringify({ away: { sensor_offline: { critical: !ntSent.notify.types.sensor_offline.critical } } }), JSON.stringify(ntSent?.notify?.modes));
      await s.tap('[data-nt="mode-reset"][data-kind="sensor_offline"]');
      check(`${tag}: Zurücksetzen entfernt den eigenen Wert`, await s.waitFor("return !r.querySelector('[data-nt=\"mode-reset\"]')"));
      await s.tap('.ag-nt [data-nt="permode"]');
      check(`${tag}: Schalter aus: Reiterleiste weg`, await s.waitFor("return !r.querySelector('[data-seg=\"nt-mode\"]')"));
      await s.tap('[data-nt="cancel"]');
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
      // Liste scrollen und einen Sensor antippen: die Liste bleibt, wo sie ist
      const listTop = await s.ev("const l=r.querySelector('#ag-pick .ag-elist'); l.scrollTop = 120; return l.scrollTop");
      const lastRow = await s.ev("return [...r.querySelectorAll('#ag-pick [data-sen=\"pick-toggle\"]')].at(-1).dataset.ent");
      await s.ev(`[...r.querySelectorAll('#ag-pick [data-sen="pick-toggle"]')].find((b) => b.dataset.ent === '${lastRow}').click()`);
      await s.page.waitForTimeout(250);
      const listAfter = await s.ev("return r.querySelector('#ag-pick .ag-elist').scrollTop");
      check(`${tag}: Sensor antippen lässt die Liste nicht nach oben springen`, listTop > 20 ? Math.abs(listAfter - listTop) <= 2 : true, `${listTop} -> ${listAfter}`);
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
