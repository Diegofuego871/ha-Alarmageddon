// Liste auf der Übersicht (Vorlage ha-device-panel): Filter, Suche, Ansicht (Spalten, Gruppierung) gemerkt; Warnkachel filtert.
// Konfiguration: Seitenblatt mit Optionen pro Sensor, Voreinstellungen, Anlage. Je Sprache, Desktop und Handy.
import { check, done, launch, open, outDir } from "../lib.mjs";

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const s = await open(browser, { mobile, lang });
    const rowSel = mobile ? ".ag-lcard" : ".ag-lrow";
    const count = () => s.ev(`return r.querySelectorAll('${rowSel}').length`);
    check(`${tag}: alle zugeordneten Sensoren`, (await count()) === 9, String(await count()));
    if (!mobile) {
      const head = await s.ev("return [...r.querySelectorAll('.ag-ltable th')].map((th) => th.textContent.trim())");
      check(`${tag}: Spalten mit Batterie, Empfang, Firmware`, head.length === 9, JSON.stringify(head));
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
    // Filter ohne Treffer gedämpft
    check(`${tag}: leerer Filter gedämpft`, await s.ev(`return r.querySelector('.ag-lchips [data-filter="offline"]').classList.contains('zero')`));
    // Ansicht: Gruppierung aus, Firmware ausblenden, nach Neuladen gemerkt
    await s.tap('[data-list="view"]');
    await s.tap('[data-list="vset"][data-key="group"][data-value="none"]');
    if (!mobile) await s.tap('[data-list="col"][data-col="firmware"]');
    await s.tap('[data-list="vdone"]');
    check(`${tag}: ohne Gruppen`, await s.waitFor("return !r.querySelector('.ag-ov-list tr.grp, .ag-ov-list .ag-group-label')"));
    await s.page.reload();
    // Nach dem Neuladen ist der alte Frame weg: auf den neuen warten, bis die Liste steht
    const f = await (await s.page.waitForSelector("#panel-frame")).contentFrame();
    await f.waitForFunction(new Function(`return document.querySelector("alarmageddon-panel")?.shadowRoot?.querySelector(".ag-ov-list .ag-card")`), null, { timeout: 10000 });
    const remembered = await f.evaluate(new Function(`const r=document.querySelector("alarmageddon-panel").shadowRoot; return [!r.querySelector('.ag-ov-list tr.grp, .ag-ov-list .ag-group-label'), [...r.querySelectorAll('.ag-ltable th')].some((th) => /firmware/i.test(th.textContent))]`));
    check(`${tag}: Ansicht gemerkt`, remembered[0] && (mobile || !remembered[1]), JSON.stringify(remembered));
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
  if (mobile) await s.tap('[data-sen="close-detail"]');
  await s.tap('[data-sen="detail"][data-ent="binary_sensor.bewegung_flur"]');
  await s.waitFor(`return r.querySelector('${sheet}')?.innerText.includes('Bewegung Flur')`);
  await s.tap(`${sheet} [data-sen="opt"][data-key="open_ok"]`);
  if (mobile) await s.tap('#ag-sheet [data-sen="close-detail"]');
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
  const input = await s.el('[data-key="entry_delay"]');
  await input.fill("");
  await input.type("45");
  check("Anlage: Fokus bleibt beim Tippen", await s.ev(`return r.activeElement?.dataset.key === "entry_delay"`));
  await input.fill("");
  await input.type("99999");
  check("Anlage: ungültig gesperrt", await s.ev(`return r.querySelector('[data-sys="save"]').disabled && r.querySelector('.ag-num.bad') !== null`));
  await input.fill("");
  await input.type("45");
  await s.tap('[data-sys="open"][data-value="bypass"]');
  await s.tap('[data-sys="save"]');
  check("Anlage: gespeichert", await s.waitFor("return r.querySelector('.ag-foot').innerText.includes('Gespeichert')"));
  const sys = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/save_system').at(-1)");
  check("Anlage: gesendet", sys?.entry_delay === 45 && sys.open_sensors === "bypass" && sys.night_enabled === true, JSON.stringify(sys));
  // Rückfrage beim Wechsel mit Änderungen
  await s.tap('[data-sys="night"]');
  await s.tap('[data-sub="sensors"]');
  check("Anlage: Rückfrage", await s.waitFor(`return r.getElementById("ag-discard").open`));
  await s.tap('[data-act="discard"]');
  check("Anlage: verworfen", await s.waitFor("return !!r.querySelector('.ag-table')"));
  check("keine Fehler im Browser", s.errors.length === 0, s.errors.join(" | "));
  await s.ctx.close();
}
await browser.close();
done();
