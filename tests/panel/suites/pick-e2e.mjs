// 0.14.0: Sensoren für die Konfiguration über "+" auswählen und wieder entfernen. Je Sprache, Desktop und Handy.
import { check, done, launch, open, outDir } from "../lib.mjs";

const T = { de: { saved: "Gespeichert" }, en: { saved: "Saved" } };
const ent = (id) => `[data-sen="detail"][data-ent="${id}"]`;

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const t = T[lang];
    const s = await open(browser, { mobile, lang, tab: "config", query: "&sensors=few" });
    await s.tap('[data-sub="sensors"]');
    const zoned = await s.sim("const x=window.__systems[0]; return [...new Set([...Object.values(x.zones).flat(), ...Object.keys(x.sensor_options)])]");
    check(`${tag}: nur Sensoren aus Zonen in der Liste`, await s.waitFor(`return r.querySelectorAll('[data-sen="detail"]').length === ${zoned.length}`), String(zoned.length));
    check(`${tag}: Bewegung Garage (nicht gewählt) fehlt`, await s.ev(`return !r.querySelector('${ent("binary_sensor.bewegung_garage")}')`));
    check(`${tag}: Knopf Hinzufügen`, await s.ev("return !!r.querySelector('.ag-tools [data-sen=\"add\"]')"));

    await s.tap('.ag-tools [data-sen="add"]');
    check(`${tag}: Fenster mit allen erkannten, noch nicht gewählten`, await s.waitFor("const d=r.getElementById('ag-pick'); return d.open && !!d.querySelector('[data-sen=\"pick-toggle\"][data-ent=\"binary_sensor.bewegung_garage\"]') && !!d.querySelector('[data-sen=\"pick-toggle\"][data-ent=\"binary_sensor.wasser_keller\"]')"));
    check(`${tag}: schon gewählte nicht angeboten`, await s.ev(`return !r.querySelector('#ag-pick [data-ent="${zoned[0]}"]')`));
    check(`${tag}: Hinzufügen gesperrt ohne Auswahl`, await s.ev("return r.querySelector('#ag-pick [data-sen=\"pick-add\"]').disabled"));
    await s.tap('#ag-pick [data-sen="pick-q"]');
    await s.page.keyboard.type("wasser");
    check(`${tag}: Suche filtert, Fokus bleibt`, await s.waitFor("const l=r.querySelectorAll('#ag-pick [data-sen=\"pick-toggle\"]'); return l.length === 1 && l[0].dataset.ent === 'binary_sensor.wasser_keller' && r.activeElement === r.querySelector('#ag-pick [data-sen=\"pick-q\"]')"));
    await s.tap('#ag-pick [data-sen="pick-toggle"][data-ent="binary_sensor.wasser_keller"]');
    await s.tap('#ag-pick [data-sen="pick-clear"]');
    check(`${tag}: X leert, Auswahl bleibt`, await s.waitFor("const d=r.getElementById('ag-pick'); return d.querySelector('[data-sen=\"pick-q\"]').value === '' && d.querySelectorAll('[data-sen=\"pick-toggle\"]').length > 1 && d.querySelector('[data-ent=\"binary_sensor.wasser_keller\"]').getAttribute('aria-checked') === 'true'"));
    await s.tap('#ag-pick [data-sen="pick-toggle"][data-ent="binary_sensor.bewegung_garage"]');
    check(`${tag}: Zähler im Knopf`, await s.ev("const b=r.querySelector('#ag-pick [data-sen=\"pick-add\"]'); return !b.disabled && b.textContent.includes('2')"));
    await s.page.screenshot({ path: `${outDir}pick-${lang}-${mobile ? "mobile" : "desktop"}.png` });
    await s.tap('#ag-pick [data-sen="pick-add"]');
    check(`${tag}: beide in der Liste`, await s.waitFor(`return !r.getElementById('ag-pick').open && r.querySelectorAll('[data-sen="detail"]').length === ${zoned.length + 2} && !!r.querySelector('${ent("binary_sensor.wasser_keller")}')`));
    check(`${tag}: Entwurf mit Änderungen`, await s.ev("return !r.querySelector('[data-sen=\"save\"]').disabled"));

    // Entfernen: Fenster Bad (in Zonen) verschwindet samt Zonen
    await s.tap('[data-sen="remove"][data-ent="binary_sensor.fenster_bad"]');
    check(`${tag}: entfernt`, await s.waitFor(`return !r.querySelector('${ent("binary_sensor.fenster_bad")}') && r.querySelectorAll('[data-sen="detail"]').length === ${zoned.length + 1}`));
    await s.tap('[data-sen="save"]');
    check(`${tag}: gespeichert`, await s.waitFor(`return r.querySelector('.ag-foot').innerText.includes('${t.saved}')`));
    const msg = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/save_zones').at(-1)");
    const all = Object.values(msg?.zones || {}).flat();
    check(`${tag}: gewählte Sensoren gesendet`, msg?.sensors?.includes("binary_sensor.wasser_keller") && msg.sensors.includes("binary_sensor.bewegung_garage") && !msg.sensors.includes("binary_sensor.fenster_bad"), JSON.stringify(msg?.sensors));
    check(`${tag}: entfernter Sensor aus den Zonen`, !all.includes("binary_sensor.fenster_bad") && all.includes("binary_sensor.haustuer"), JSON.stringify(msg?.zones));
    check(`${tag}: Liste bleibt nach dem Speichern`, await s.waitFor(`return !!r.querySelector('${ent("binary_sensor.bewegung_garage")}') && !r.querySelector('${ent("binary_sensor.fenster_bad")}')`));
    // Entfernter Sensor wieder wählbar
    await s.tap('.ag-tools [data-sen="add"]');
    check(`${tag}: entfernter Sensor wieder im Fenster`, await s.waitFor("return !!r.querySelector('#ag-pick [data-ent=\"binary_sensor.fenster_bad\"]')"));
    await s.tap('#ag-pick [data-sen="pick-close"]');
    check(`${tag}: kein Überlauf`, await s.ev("return document.documentElement.scrollWidth <= window.innerWidth"));
    check(`${tag}: keine Fehler im Browser`, s.errors.length === 0, s.errors.join(" | "));
    await s.ctx.close();
  }
}
await browser.close();
done();
