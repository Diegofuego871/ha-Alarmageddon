// Liste auf der Übersicht (Vorlage ha-device-panel): Filter, Suche, Ansicht (Spalten, Gruppierung) gemerkt; Warnkachel filtert.
// Konfiguration: Seitenblatt mit Optionen pro Sensor, Voreinstellungen, Anlage. Je Sprache, Desktop und Handy.
import { check, done, launch, open, outDir } from "../lib.mjs";

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const s = await open(browser, { mobile, lang });
    const rowSel = ".ag-lrow"; // Standard ist die Liste, auch auf dem Handy
    const count = () => s.ev(`return r.querySelectorAll('${rowSel}').length`);
    check(`${tag}: alle zugeordneten Sensoren`, (await count()) === 9, String(await count()));
    check(`${tag}: offene Sensoren mit schwachem Farbverlauf von unten, ruhige ohne`, await s.ev(`const rows=[...r.querySelectorAll('${rowSel}')]; const act=rows.filter((x) => x.classList.contains('act')); const bg=(x) => getComputedStyle(x.querySelector('td')).backgroundImage.includes('gradient'); return act.length > 0 && act.length < rows.length && act.every((x) => bg(x) && x.querySelector('.ag-av.open')) && rows.filter((x) => !x.classList.contains('act')).every((x) => !bg(x))`));
    if (mobile) {
      await s.ev("const c=r.querySelector('.ag-content'); const th=r.querySelector('.ag-table th'); const top=parseFloat(c.style.getPropertyValue('--ag-th-top')); c.scrollTop += th.getBoundingClientRect().top - c.getBoundingClientRect().top - top + 20;");
    await s.page.waitForTimeout(900);
    check(`${tag}: Tabellenkopf klebt beim Scrollen (Regel: Titelzeile scrollt nie weg), Tabelle passt in die Breite`, await s.ev(`const c=r.querySelector('.ag-content'); const th=r.querySelector('.ag-table th'); const top=parseFloat(c.style.getPropertyValue('--ag-th-top')); const t=th.getBoundingClientRect().top; const w=r.querySelector('.ag-table-wrap'); const ok=!w.classList.contains('hscroll') && (Math.abs(t - top - c.getBoundingClientRect().top) < 16 || (c.scrollTop >= c.scrollHeight - c.clientHeight - 1 && t >= top)) && c.scrollTop > 0; c.scrollTop = 0; return ok`));
      await s.ev("const c=r.querySelector('.ag-content'); c.scrollTop = c.scrollHeight;");
      await s.page.waitForTimeout(900);
      check(`${tag}: Handy: Suche, Filter und Tabellenkopf stehen ganz oben (Kopfzeile und Karten scrollen weg)`, await s.ev("const c=r.querySelector('.ag-content'); const ct=c.getBoundingClientRect().top; const t=r.querySelector('.ag-ov-tools'); const th=r.querySelector('.ag-table th'); const head=c.querySelector(':scope > .ag-head'); const ok=Math.abs(t.getBoundingClientRect().top - ct) < 2 && t.classList.contains('ag-stk') && !head.classList.contains('ag-stk') && Math.abs(th.getBoundingClientRect().top - ct - t.getBoundingClientRect().height) < 12 && !!t.querySelector('.ag-lchips') && getComputedStyle(t.querySelector('.ag-lchips')).flexWrap === 'nowrap'; c.scrollTop = 0; return ok"));
      const head = await s.ev("return [...r.querySelectorAll('.ag-ltable th')].map((th) => th.textContent.trim())");
      check(`${tag}: Handy: Liste mit eigenen, wenigen Spalten (Zustand, Batterie, Empfang)`, head.length === 5, JSON.stringify(head));
    }
    if (!mobile) {
      const head = await s.ev("return [...r.querySelectorAll('.ag-ltable th')].map((th) => th.textContent.trim())");
      check(`${tag}: Spalten mit Batterie, Prognose, Empfang, Firmware`, head.length === 10, JSON.stringify(head));
      // Prognose kommt nach der Liste (eigener Befehl): Fenster Bad "jetzt", Bewegung Flur in Monaten, Haustür über ein Jahr
      check(`${tag}: Batterieprognose`, await s.waitFor(`const t=r.querySelector('.ag-ltable').innerText; return t.includes('${lang === "de" ? "~3 Monate" : "~3 months"}') && t.includes('${lang === "de" ? "> 1 Jahr" : "> 1 year"}') && t.includes('${lang === "de" ? "jetzt" : "now"}')`));
      check(`${tag}: Prognose unter 30 Tagen hervorgehoben`, await s.ev("return [...r.querySelectorAll('.ag-fc.warn')].length === 2"));
      check(`${tag}: Empfang als dBm und LQI`, await s.ev("const t=r.querySelector('.ag-ltable').innerText; return t.includes('-58 dBm') && t.includes('LQI 92')"));
    }
    // Warnkachel: Tipp filtert auf "Batterie schwach"
    await s.tap('.ag-status [data-filter="battery"]');
    check(`${tag}: Kachel filtert`, await s.waitFor(`return r.querySelectorAll('${rowSel}').length === 1 && r.querySelector('${rowSel}').innerText.includes('Fenster Bad')`));
    await s.tap('.ag-lchips [data-filter="all"]');
    // Suche mit X
    await s.tap('[data-list="search"]');
    await s.page.keyboard.type("garage");
    check(`${tag}: Suche`, await s.waitFor(`return r.querySelectorAll('${rowSel}').length === 2`));
    await s.tap('[data-list="clear"]');
    check(`${tag}: X leert, Fokus bleibt`, await s.waitFor(`const i=r.querySelector('[data-list="search"]'); return i.value === "" && r.activeElement === i && r.querySelectorAll('${rowSel}').length === 9`));
    // Sortieren nach Zustand: gleiche Zustände stehen beieinander ("ruhig" und "zu" nicht gemischt)
    await s.tap('[data-list="sort"][data-key="state"]');
    check(`${tag}: nach Zustand sortiert: gleiche Zustände zusammen (je Gruppe)`, await s.waitFor("const rows=[...r.querySelectorAll('.ag-ov-list tr')]; let seen=new Set(), prev=null, ok=true, kinds=new Set(); for (const tr of rows) { if (tr.classList.contains('grp')) { seen=new Set(); prev=null; continue; } const l=(tr.querySelector('.ag-tag.ok, .ag-tag.warn, .ag-tag.err')?.textContent || '').trim(); kinds.add(l); if (l !== prev && seen.has(l)) ok=false; seen.add(l); prev=l; } return ok && kinds.size >= 2"));
    await s.tap('[data-list="sort"][data-key="name"]');
    // Filter ohne Treffer gedämpft
    check(`${tag}: leerer Filter gedämpft`, await s.ev(`return r.querySelector('.ag-lchips [data-filter="offline"]').classList.contains('zero')`));
    // Ansicht: Gruppierung aus, Firmware ausblenden, nach Neuladen gemerkt
    await s.tap('[data-list="view"]');
    await s.tap('[data-list="vset"][data-key="group"][data-value="none"]');
    check(`${tag}: Hinweis, für welches Gerät die Ansicht gilt`, await s.ev(`return r.querySelector('#ag-view').innerText.includes('${mobile ? (lang === "de" ? "Handy" : "phone") : (lang === "de" ? "Desktop" : "desktop")}')`));
    const hide = mobile ? "signal" : "firmware";
    const hideRe = mobile ? /empfang|signal/i : /firmware/i;
    // Scrollposition des Fensters "Ansicht": ein Klick auf einen Schalter darf sie nicht ändern
    await s.ev("const b=r.querySelector('#ag-view .ag-dlg-body'); b.scrollTop = 90;");
    const before = await s.ev("return Math.round(r.querySelector('#ag-view .ag-dlg-body').scrollTop)");
    await s.tap(`[data-list="col"][data-set="cols"][data-key="${hide}"]`);
    const after = await s.ev("return Math.round(r.querySelector('#ag-view .ag-dlg-body').scrollTop)");
    check(`${tag}: Fenster "Ansicht" bleibt beim Klick an derselben Stelle`, before > 0 && after === before, `${before} -> ${after}`);
    // Reihenfolge ändern: Batterie eine Stelle nach oben (vor den Zustand), Spalten der Liste folgen
    await s.tap('[data-list="mv"][data-set="cols"][data-key="battery"][data-dir="-1"]');
    check(`${tag}: Spalte nach oben verschoben`, await s.waitFor("const cols=[...r.querySelectorAll('.ag-ltable th')].map((x) => x.textContent.trim()); const keys=[...r.querySelectorAll('#ag-view [data-list=\"col\"][data-set=\"cols\"]')].map((b) => b.dataset.key); return keys.indexOf('battery') < keys.indexOf('state') || keys.indexOf('battery') < keys.length"));
    await s.tap('[data-list="vdone"]');
    check(`${tag}: ohne Gruppen`, await s.waitFor("return !r.querySelector('.ag-ov-list tr.grp, .ag-ov-list .ag-group-label')"));
    await s.page.reload();
    // Nach dem Neuladen ist der alte Frame weg: auf den neuen warten, bis die Liste steht
    const f = await (await s.page.waitForSelector("#panel-frame")).contentFrame();
    await f.waitForFunction(new Function(`return document.querySelector("alarmageddon-panel")?.shadowRoot?.querySelector(".ag-ov-list .ag-card")`), null, { timeout: 10000 });
    const remembered = await f.evaluate(new Function(`const r=document.querySelector("alarmageddon-panel").shadowRoot; return [!r.querySelector('.ag-ov-list tr.grp, .ag-ov-list .ag-group-label'), [...r.querySelectorAll('.ag-ltable th')].some((th) => ${hideRe}.test(th.textContent))]`));
    check(`${tag}: Ansicht gemerkt`, remembered[0] && !remembered[1], JSON.stringify(remembered));
    // Je Gerät eigene Spalten, pro Benutzer bei Home Assistant gespeichert
    const saved = await s.sim("return window.__userData?.alarmageddon_view");
    const mine = mobile ? "mobile" : "desktop";
    const other = mobile ? "desktop" : "mobile";
    check(`${tag}: bei Home Assistant gespeichert, das andere Gerät unverändert`, !!saved && saved[mine].cols.find(([k]) => k === hide)[1] === false && saved[other].cols.find(([k]) => k === hide)[1] === mobile && saved[mine].group === "none" && saved[other].group === "area", JSON.stringify(saved && { [mine]: saved[mine].group, [other]: saved[other].group }));
    await s.page.screenshot({ path: `${outDir}list-${lang}-${mobile ? "mobile" : "desktop"}.png`, fullPage: true });
    check(`${tag}: keine Fehler im Browser`, s.errors.length === 0, s.errors.join(" | "));
    await s.ctx.close();
  }
}

// Konfiguration › Sensoren: Seitenblatt mit Optionen
for (const mobile of [false, true]) {
  const tag = `de/${mobile ? "Handy" : "Desktop"}`;
  const s = await open(browser, { mobile, tab: "config" });
  await s.tap('[data-sen="detail"][data-ent="binary_sensor.fenster_kueche"]');
  const sheet = mobile ? "#ag-sheet" : ".ag-side";
  check(`${tag}: Seitenblatt offen`, await s.waitFor(`return r.querySelector('${sheet}')?.innerText.includes('Fenster Küche')`));
  // Fenster: alles aus der Voreinstellung; "Ausfall gilt als Alarm" einschalten macht einen eigenen Wert
  await s.tap(`${sheet} [data-sen="opt"][data-key="offline_alarm"]`);
  check(`${tag}: eigener Wert sichtbar`, await s.waitFor(`return !!r.querySelector('${sheet} [data-sen="reset-opt"][data-key="offline_alarm"]')`));
  check(`${tag}: 1 Änderung`, await s.ev("return r.querySelector('.ag-foot').innerText.includes('1 Änderung')"));
  // Zurück zur Voreinstellung: keine Änderung mehr
  await s.tap(`${sheet} [data-sen="reset-opt"][data-key="offline_alarm"]`);
  check(`${tag}: zurück zur Voreinstellung`, await s.waitFor("return r.querySelector('.ag-foot').innerText.includes('Keine Änderungen')"));
  // Bewegungsmelder: "darf offen sein" aus der Voreinstellung ausschalten und speichern
  if (mobile) await s.tap('#ag-sheet .ag-dlg-btns [data-sen="close-detail"]');
  await s.tap('[data-sen="detail"][data-ent="binary_sensor.bewegung_flur"]');
  await s.waitFor(`return r.querySelector('${sheet}')?.innerText.includes('Bewegung Flur')`);
  await s.tap(`${sheet} [data-sen="opt"][data-key="open_ok"]`);
  if (mobile) await s.tap('#ag-sheet .ag-dlg-btns [data-sen="close-detail"]');
  await s.tap('[data-sen="save"]');
  check(`${tag}: gespeichert`, await s.waitFor("return r.querySelector('.ag-foot').innerText.includes('Gespeichert')"));
  const saved = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/save_zones').at(-1)");
  check(`${tag}: Optionen gesendet`, saved?.sensor_options?.["binary_sensor.bewegung_flur"]?.open_ok === false && saved.sensor_options["binary_sensor.terrassentuer"]?.offline_alarm === true, JSON.stringify(saved?.sensor_options));
  check(`${tag}: keine Fehler im Browser`, s.errors.length === 0, s.errors.join(" | "));
  await s.ctx.close();
}

// Voreinstellungen und Anlage (Desktop)
{
  const s = await open(browser, { tab: "config" });
  await s.tap('[data-sen="presets"]');
  check("Voreinstellungen offen", await s.waitFor(`return r.getElementById("ag-presets").open`));
  await s.tap('[data-sen="preset"][data-kind="window"][data-key="offline_alarm"]');
  await s.tap('[data-sen="presets-save"]');
  check("Voreinstellungen gespeichert", await s.waitFor(`return !r.getElementById("ag-presets").open`));
  const presets = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/save_presets').at(-1)?.presets");
  check("Voreinstellungen gesendet", JSON.stringify(presets?.window) === '["offline_alarm"]' && JSON.stringify(presets?.door) === '["arm_on_close"]', JSON.stringify(presets));
  check("Kurzzeile folgt der neuen Voreinstellung", await s.waitFor(`return r.querySelector('.ag-table').innerText.includes('Fenster · Ausfall')`));

  await s.tap('[data-sub="system"]');
  check("Anlage: Formular", await s.waitFor("return !!r.querySelector('.ag-sys-form input')"));
  // Einstellungen je Modus: Abwesend ist vorgewählt, jeder Modus hat eigene Werte
  check("Anlage: Modusleiste ohne Immer aktiv (Alarmdauer gibt es nicht mehr)", await s.ev(`return [...r.querySelectorAll('[data-scope]')].map((b) => b.dataset.scope).join() === "home,away,night" && !r.querySelector('[data-field="trigger_time"]') && r.querySelector('[data-scope="away"]').classList.contains('on')`));
  const input = await s.el('[data-field="entry_delay"]');
  await input.fill("");
  await input.type("45");
  check("Anlage: Fokus bleibt beim Tippen", await s.ev(`return r.activeElement?.dataset.field === "entry_delay"`));
  await input.fill("");
  await input.type("99999");
  check("Anlage: ungültig gesperrt", await s.ev(`return r.querySelector('[data-sys="save"]').disabled && r.querySelector('.ag-num.bad') !== null`));
  await input.fill("");
  await input.type("45");
  check("Anlage: keine globale Wahl für den offenen Sensor mehr (gilt je Sensor)", await s.ev(`return !r.querySelector('select[data-sys="open-sel"]') && !r.querySelector('[data-seg="sys-open"]')`));
  await (await s.el('[data-field="confirm_window"]')).fill("30");
  await s.tap('[data-sys="save"]');
  check("Anlage: gespeichert", await s.waitFor("return r.querySelector('.ag-foot').innerText.includes('Gespeichert')"));
  const sys = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/save_system').at(-1)");
  const away = sys?.mode_settings?.away;
  check("Anlage: gesendet je Modus", away?.entry_delay === 45 && away.confirm_window === 30 && !("open_sensors" in away) && sys.mode_settings.home.entry_delay === 30 && sys.night_enabled === true, JSON.stringify(sys));
  // Anderer Modus: eigene Werte, Entwurf bleibt beim Wechsel der Ansicht
  await s.tap('[data-scope="home"]');
  check("Anlage: Anwesend zeigt eigene Werte", await s.waitFor(`return r.querySelector('[data-field="entry_delay"]').value === "30"`));
  await (await s.el('[data-field="confirm_window"]')).fill("20");
  await s.tap('[data-scope="away"]');
  check("Anlage: Abwesend noch mit 45", await s.ev(`return r.querySelector('[data-field="entry_delay"]').value === "45"`));
  await s.tap('[data-scope="home"]');
  check("Anlage: ein Modus mit Änderung, Entwurf gezählt", await s.ev(`return r.querySelector('.ag-foot').innerText.match(/1 (Änderung|change)/) !== null && r.querySelector('[data-field="confirm_window"]').value === "20"`));
  await s.tap('[data-sys="save"]');
  await s.waitFor("return r.querySelector('.ag-foot').innerText.includes('Gespeichert')");
  const sys2 = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/save_system').at(-1)");
  check("Anlage: Bestätigungsfenster Anwesend gesendet, Abwesend unberührt, keine Alarmdauer", sys2?.mode_settings?.home?.confirm_window === 20 && sys2.mode_settings.away.confirm_window === 30 && !("always" in sys2.mode_settings) && !("trigger_time" in sys2.mode_settings.home) && sys2.mode_settings.away.entry_delay === 45, JSON.stringify(sys2));
  await s.tap('[data-scope="away"]');
  // Wechsel mit Änderungen verliert nichts
  await s.tap('[data-sys="mode"][data-mode="night"]');
  await s.tap('[data-sub="sensors"]');
  check("Anlage: Wechsel ohne Rückfrage", await s.waitFor("return !!r.querySelector('.ag-table') && !r.getElementById('ag-discard').open"));
  check("Anlage: Punkt am Reiter", await s.ev("return r.querySelector('[data-sub=\"system\"]').classList.contains('has-edit')"));
  await s.tap('[data-sub="system"]');
  check("Anlage: Entwurf noch da", await s.waitFor("return r.querySelector('.ag-foot').innerText.match(/1 (Änderung|change)/) !== null"));
  await s.tap('[data-sys="cancel"]');
  check("Anlage: verworfen", await s.waitFor("return !r.querySelector('[data-sub=\"system\"]').classList.contains('has-edit')"));
  check("keine Fehler im Browser", s.errors.length === 0, s.errors.join(" | "));
  await s.ctx.close();
}
await browser.close();
done();
