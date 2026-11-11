// 1.12.0: Namen der Sensoren. Schalter in der Ansicht: an (Standard) "Gerät - Sensor", aus nur der Name des Sensors.
// Die Wahl wird auf dem Server gespeichert (gilt für alle Geräte und die Meldungen); die Namen kommen danach neu von dort.
import { check, done, launch, open, outDir } from "../lib.mjs";

const T = {
  de: { label: "Gerätename vor dem Sensornamen", on: "Gerät - Sensor", off: "nur der Name des Sensors", all: "auf allen Geräten", section: "Namen" },
  en: { label: "Device name before the sensor name", on: "Device - Sensor", off: "only the name of the sensor", all: "on all devices", section: "Names" },
};
const MOTION = "binary_sensor.bewegung_flur";
const FULL = "Hue Motion Flur - Bewegung";

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const t = T[lang];
    const s = await open(browser, { mobile, lang });
    await s.waitFor(`return !!r.querySelector('[data-act="more"][data-entity="${MOTION}"]')`);
    // Ein Sensor mit Gerät und eigenem Namen, wie ihn der Server liefert
    await s.sim(`window.__deviceNames = { "${MOTION}": { device: "Hue Motion Flur", own: "Bewegung" } }`);
    await s.frame.evaluate(() => document.querySelector("alarmageddon-panel")._fetch());
    const rowName = () => s.ev(`const row=r.querySelector('[data-act="more"][data-entity="${MOTION}"]'); return row ? row.innerText : ''`);
    check(`${tag}: Standard: die Liste zeigt "Gerät - Sensor"`, await s.waitFor(`return (r.querySelector('[data-act="more"][data-entity="${MOTION}"]')?.innerText || '').includes(${JSON.stringify(FULL)})`), await rowName());
    const calls = () => s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/save_display').map((c) => c.names_with_device)");
    const sw = () => s.ev("const d=r.getElementById('ag-view'); const b=d.querySelector('[data-list=\"names\"]'); if (!b) return null; const row=b.closest('.ag-colrow'); return { checked: b.getAttribute('aria-checked'), on: b.classList.contains('on'), label: row.querySelector('b').textContent, hint: row.querySelector('small').textContent, note: d.querySelector('.ag-namesnote')?.textContent || '', section: row.closest('.ag-colist').previousElementSibling?.textContent || '', h: b.getBoundingClientRect().height }");

    // ----- Schalter in der Ansicht -----
    await s.tap('[data-list="view"]');
    await s.waitFor("return r.getElementById('ag-view').open && !!r.querySelector('#ag-view [data-list=\"names\"]')");
    const first = await sw();
    check(`${tag}: Ansicht hat den Abschnitt "${t.section}" mit dem Schalter "${t.label}", standardmässig an`, first.checked === "true" && first.on && first.label === t.label && first.section === t.section && first.hint.includes(t.on), JSON.stringify(first));
    check(`${tag}: Hinweis: gilt überall und auf allen Geräten (anders als der Rest der Ansicht)`, first.note.includes(t.all), first.note);
    const place = await s.ev("const d=r.getElementById('ag-view'); const b=d.querySelector('[data-list=\"names\"]').getBoundingClientRect(); const btns=d.querySelector('.ag-dlg-btns').getBoundingClientRect(); const body=d.querySelector('.ag-dlg-body'); body.scrollTop=body.scrollHeight; const b2=d.querySelector('[data-list=\"names\"]').getBoundingClientRect(); return { visible: b2.bottom <= btns.top + 1 && b2.top >= 0, right: b2.right <= innerWidth, over: d.scrollWidth <= d.clientWidth + 1 }");
    check(`${tag}: der Schalter ist erreichbar (über der festen Leiste), nichts läuft über`, place.visible && place.right && place.over, JSON.stringify(place));
    await s.page.screenshot({ path: `${outDir}names-${lang}-${mobile ? "mobile" : "desktop"}.png` });

    // ----- Ausschalten: nur der Name des Sensors, überall -----
    await s.ev("r.querySelector('#ag-view [data-list=\"names\"]').click(); return 1");
    check(`${tag}: ausgeschaltet: gespeichert auf dem Server, die Liste zeigt nur noch "Bewegung"`, await s.waitFor(`const t=r.querySelector('[data-act="more"][data-entity="${MOTION}"]')?.innerText || ''; return t.includes("Bewegung") && !t.includes("Hue Motion")`) && JSON.stringify(await calls()) === "[false]", `${await rowName()} ${JSON.stringify(await calls())}`);
    const off = await sw();
    check(`${tag}: der Schalter steht auf aus, der Hinweis nennt das Beispiel ohne Gerät`, off.checked === "false" && !off.on && off.hint.includes(t.off), JSON.stringify(off));
    await s.ev("r.querySelector('#ag-view [data-list=\"vdone\"]').click(); return 1");
    await s.waitFor("return !r.getElementById('ag-view').open");
    await s.tap(`[data-act="more"][data-entity="${MOTION}"]`);
    check(`${tag}: auch die Sensoransicht nennt den Sensor so`, await s.waitFor("return r.getElementById('ag-sensor').open && r.querySelector('#ag-sensor .ag-sv-ttl b')?.textContent === 'Bewegung'"), await s.ev("return r.querySelector('#ag-sensor .ag-sv-ttl b')?.textContent"));
    await s.ev("r.querySelector('#ag-sensor > .ag-dlg-x').click(); return 1");
    await s.waitFor("return !r.getElementById('ag-sensor').open");

    // ----- Fehler beim Speichern: der Schalter springt zurück, die Namen bleiben -----
    await s.tap('[data-list="view"]');
    await s.waitFor("return r.getElementById('ag-view').open");
    await s.sim("window.__failDisplay = true");
    await s.ev("r.querySelector('#ag-view [data-list=\"names\"]').click(); return 1");
    check(`${tag}: Speichern scheitert: der Schalter bleibt auf aus, eine Meldung erscheint, die Namen ändern sich nicht`, await s.waitFor("const b=r.querySelector('#ag-view [data-list=\"names\"]'); return b && !b.disabled && b.getAttribute('aria-checked') === 'false' && !!r.querySelector('.ag-toast')") && !(await rowName()).includes("Hue Motion"), JSON.stringify(await sw()));
    await s.sim("window.__failDisplay = false");

    // ----- Wieder einschalten -----
    await s.ev("r.querySelector('#ag-view [data-list=\"names\"]').click(); return 1");
    check(`${tag}: wieder eingeschaltet: "Gerät - Sensor"`, await s.waitFor(`return (r.querySelector('[data-act="more"][data-entity="${MOTION}"]')?.innerText || '').includes(${JSON.stringify(FULL)}) && r.querySelector('#ag-view [data-list="names"]').getAttribute('aria-checked') === 'true'`), await rowName());
    check(`${tag}: Sensoren ohne Gerät und eigenen Namen heissen wie bisher`, await s.ev("return (r.querySelector('[data-act=\"more\"][data-entity=\"binary_sensor.haustuer\"]')?.innerText || '').includes('Haustür')"));
    check(`${tag}: kein Überlauf, keine Fehler im Browser`, (await s.ev("return document.documentElement.scrollWidth <= window.innerWidth")) && s.errors.filter((e) => !e.includes("kaputt")).length === 0, s.errors.join(" | "));
    await s.ctx.close();
  }
}
await browser.close();
done();
