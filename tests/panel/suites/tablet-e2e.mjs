// 1.26.0: Sensor-Optionen auf dem Tablet (iPad im Querformat, Panel unter 1300 px breit): sie öffnen als Fenster mit eigenem Scrollen
// wie auf dem Handy und liegen nicht mehr über der Tabelle. Breit (ab 1300 px) bleibt das Blatt neben der Tabelle, ist aber nie höher
// als der sichtbare Bereich und scrollt darin. Die Kachel "Einstellungen pro Modus" ist nicht mehr über die ganze Breite gezogen.
import { check, done, launch, open } from "../lib.mjs";

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const [name, size] of [["iPad 940", { width: 940, height: 760 }], ["iPad 1100", { width: 1100, height: 820 }], ["breit 1600", { width: 1600, height: 900 }]]) {
    const tag = `${lang}/${name}`;
    const wide = size.width >= 1300;
    const s = await open(browser, { lang, tab: "config", size });
    await s.tap('[data-sub="sensors"]');
    await s.waitFor("return !!r.querySelector('.ag-sen-layout') && !!r.querySelector('.ag-pmbar')");
    await s.page.waitForTimeout(600);
    check(`${tag}: Panel erkennt ${wide ? "breit" : "Tablet (medium)"}`, (await s.ev("return r.host.hasAttribute('medium')")) === !wide);

    // Kachel "Einstellungen pro Modus": nur so breit wie nötig
    const bar = await s.ev("const b=r.querySelector('.ag-pmbar').getBoundingClientRect(), l=r.querySelector('.ag-sen-layout').getBoundingClientRect(); return { b: Math.round(b.width), l: Math.round(l.width) }");
    check(`${tag}: Kachel "Einstellungen pro Modus" nicht über die ganze Breite (${bar.b} von ${bar.l} px)`, wide ? bar.b < bar.l * 0.6 : bar.b <= bar.l, JSON.stringify(bar));

    // Optionen eines Sensors öffnen
    await s.ev("r.querySelector('.ag-gbody [data-sen=\"detail\"]').click(); return 1");
    await s.waitFor("return !!r.querySelector('.ag-sheet, dialog#ag-sheet[open]')");
    await s.page.waitForTimeout(500);
    const sheet = await s.ev(`const dlg=r.getElementById('ag-sheet'); const side=r.querySelector('.ag-sen-layout .ag-sheet'); const el=dlg.open ? dlg : side; const body=el.querySelector('.ag-side-body'); const c=r.host._content.getBoundingClientRect(); const b=el.getBoundingClientRect(); const t=r.querySelector('.ag-sen-layout .ag-gbody').getBoundingClientRect();
      return { dialog: dlg.open, side: !!side, top: Math.round(b.top), bottom: Math.round(b.bottom), ch: Math.round(c.bottom), overflow: getComputedStyle(body).overflowY, tableRight: Math.round(t.right), sheetLeft: Math.round(b.left), scrolls: body.scrollHeight > body.clientHeight + 1 }`);
    if (wide) {
      check(`${tag}: das Blatt steht neben der Tabelle, nicht darüber`, sheet.side && !sheet.dialog && sheet.sheetLeft >= sheet.tableRight, JSON.stringify(sheet));
      check(`${tag}: das Blatt ist nicht höher als der sichtbare Bereich, die Optionen scrollen darin`, sheet.bottom <= sheet.ch && sheet.overflow === "auto", JSON.stringify(sheet));
    } else {
      check(`${tag}: die Optionen öffnen als Fenster, kein Blatt über der Tabelle`, sheet.dialog && !sheet.side, JSON.stringify(sheet));
      check(`${tag}: das Fenster liegt im Bild, die Optionen scrollen darin`, sheet.top >= 0 && sheet.bottom <= size.height && sheet.overflow === "auto", JSON.stringify(sheet));
      await s.tap('#ag-sheet .ag-dlg-btns [data-sen="close-detail"]');
      check(`${tag}: "Fertig" schliesst das Fenster`, await s.waitFor("return !r.getElementById('ag-sheet').open"));
    }
    check(`${tag}: keine Fehler im Browser`, s.errors.length === 0, s.errors.join(" | "));
    await s.ctx.close();
  }
}
await browser.close();
done();
