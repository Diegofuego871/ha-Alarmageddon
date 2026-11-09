// Sensorgruppen (Variante B): Tabelle mit Zonen-Spalten, Ziehen über Felder, Eingangsverzögerung, Entwurf und Speichern.
// Handy: Karten mit Zonen-Knöpfen. Je Sprache, echte Klicks, Ziehen und Taps.
import { check, done, launch, open, outDir } from "../lib.mjs";

const T = {
  de: { one: "1 Änderung", three: "3 Änderungen", none: "Keine Änderungen", saved: "Gespeichert", noArea: "Ohne Bereich", discard: "Änderungen verwerfen?" },
  en: { one: "1 change", three: "3 changes", none: "No changes", saved: "Saved", noArea: "No area", discard: "Discard changes?" },
};
const box = (ent, mode) => `[data-box][data-ent="${ent}"][data-mode="${mode}"]`;
const browser = await launch();

for (const lang of ["de", "en"]) {
  const t = T[lang];
  // ----- Desktop -----
  {
    const tag = `${lang}/Desktop`;
    const s = await open(browser, { lang, tab: "config" });
    const foot = () => s.ev("return r.querySelector('.ag-foot').innerText");
    const on = (ent, mode) => s.ev(`return r.querySelector('${box(ent, mode)}').classList.contains('on')`);

    const cols = await s.ev("return [...r.querySelectorAll('.ag-table th')].map((th) => th.childNodes[0]?.textContent.trim() || '')");
    check(`${tag}: Spalten mit Nacht`, cols.length === 7, JSON.stringify(cols));
    const groups = await s.ev("return [...r.querySelectorAll('tr.grp')].map((g) => g.innerText.split(' ·')[0])");
    check(`${tag}: ohne Bereich zuletzt`, groups.at(-1) === t.noArea, JSON.stringify(groups));
    check(`${tag}: anfangs keine Änderungen`, (await foot()).includes(t.none));

    // Ein Feld anklicken
    await s.tap(box("binary_sensor.fenster_bad", "home"));
    check(`${tag}: Klick setzt Zone`, await on("binary_sensor.fenster_bad", "home"));
    check(`${tag}: 1 Änderung`, (await foot()).includes(t.one), await foot());
    check(`${tag}: Zeile markiert`, await s.ev(`return r.querySelector('${box("binary_sensor.fenster_bad", "home")}').closest('tr').classList.contains('changed')`));
    // Noch nichts gesendet vor "Speichern"
    check(`${tag}: nichts gesendet vor Speichern`, (await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/save_zones').length")) === 0);

    // Ziehen über drei Felder der Spalte Nacht setzt alle
    const ents = ["binary_sensor.bewegung_flur", "binary_sensor.haustuer", "binary_sensor.rauchmelder_flur"];
    const pts = [];
    for (const e of ents) {
      const h = await s.el(box(e, "night"));
      const b = await h.boundingBox();
      pts.push([b.x + b.width / 2, b.y + b.height / 2]);
    }
    // Haustür ist schon in Nacht: Startfeld Bewegung Flur (aus) bestimmt den Wert "ein"
    await s.page.mouse.move(...pts[0]);
    await s.page.mouse.down();
    for (const [x, y] of pts.slice(1)) await s.page.mouse.move(x, y, { steps: 6 });
    await s.page.mouse.up();
    const after = await Promise.all(ents.map((e) => on(e, "night")));
    check(`${tag}: Ziehen setzt alle`, after.every(Boolean), JSON.stringify(after));
    check(`${tag}: 3 Änderungen`, (await foot()).includes(t.three), await foot());

    // Eingangsverzögerung nur für Sensoren in einer Zone
    check(`${tag}: Eingang gesperrt ohne Zone`, await s.ev(`return r.querySelector('[data-sen="entry"][data-ent="binary_sensor.wasser_keller"]').disabled`));
    // Haustür aus allen Zonen nehmen: verliert die Eingangsverzögerung
    for (const m of ["home", "away", "night"]) await s.tap(box("binary_sensor.haustuer", m));
    check(`${tag}: Eingang fällt weg`, await s.ev(`const b=r.querySelector('[data-sen="entry"][data-ent="binary_sensor.haustuer"]'); return b.disabled && !b.classList.contains('on')`));

    // Abbrechen verwirft alles
    await s.tap('[data-sen="cancel"]');
    check(`${tag}: Abbrechen`, (await foot()).includes(t.none) && (await on("binary_sensor.haustuer", "home")) && !(await on("binary_sensor.fenster_bad", "home")));

    // "Alle" in der Spalte Anwesend, nur für die gefilterten Sensoren (Bewegung)
    await s.tap('[data-sen="filter"][data-filter="motion"]');
    await s.tap('[data-sen="all"][data-mode="home"]');
    await s.tap('[data-sen="filter"][data-filter="all"]');
    const motionHome = await Promise.all(["binary_sensor.bewegung_flur", "binary_sensor.bewegung_wohnzimmer", "binary_sensor.bewegung_garage"].map((e) => on(e, "home")));
    check(`${tag}: Alle für Filter`, motionHome.every(Boolean) && !(await on("binary_sensor.fenster_bad", "home")), JSON.stringify(motionHome));

    // Suche filtert, X leert und lässt den Fokus im Feld
    await s.tap('[data-sen="search"]');
    await s.page.keyboard.type("küche");
    const rows = await s.ev("return r.querySelectorAll('[data-box][data-mode=\"home\"]').length");
    check(`${tag}: Suche`, rows === 1, String(rows));
    await s.tap('[data-sen="clear"]');
    const afterClear = await s.ev(`const i=r.querySelector('[data-sen="search"]'); return [i.value, r.activeElement === i, r.querySelector('.ag-clear').hidden, r.querySelectorAll('[data-box][data-mode="home"]').length]`);
    check(`${tag}: X leert, Fokus bleibt`, afterClear[0] === "" && afterClear[1] && afterClear[2] && afterClear[3] > 5, JSON.stringify(afterClear));

    // Speichern sendet die Zonen und zeigt "Gespeichert"
    await s.tap('[data-sen="save"]');
    check(`${tag}: Gespeichert`, await s.waitFor(`return r.querySelector('.ag-foot').innerText.includes(${JSON.stringify(t.saved)})`));
    const saved = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/save_zones')");
    const z = saved[0]?.zones || {};
    check(`${tag}: Aufruf save_zones`, saved.length === 1 && saved[0].entry_id === "e_haus" && z.home.includes("binary_sensor.bewegung_garage") && z.home[0] === "binary_sensor.haustuer" && saved[0].entry_sensors.join() === "binary_sensor.haustuer", JSON.stringify(saved));

    // Reiterwechsel verliert nichts: der Entwurf bleibt, ein gelber Punkt zeigt es am Reiter
    await s.tap(box("binary_sensor.fenster_bad", "night"));
    await s.tap('[data-tab="overview"]');
    check(`${tag}: Wechsel ohne Rückfrage`, await s.waitFor(`return !!r.querySelector('.ag-sys') && !r.getElementById("ag-discard").open`));
    check(`${tag}: gelber Punkt am Reiter Konfiguration`, await s.ev(`return r.querySelector('[data-tab="config"]').classList.contains('has-edit')`));
    await s.tap('[data-tab="config"]');
    check(`${tag}: Entwurf noch da`, await s.waitFor(`return !!r.querySelector('.ag-table') && r.querySelector('${box("binary_sensor.fenster_bad", "night")}').classList.contains('on') && r.querySelector('.ag-foot').innerText.match(/1 (Änderung|change)/)`));
    // Anderer Unterreiter: Entwurf bleibt, Punkt am Unterreiter "Sensoren"
    await s.tap('[data-sub="notify"]');
    check(`${tag}: Punkt am Unterreiter`, await s.waitFor(`return r.querySelector('[data-sub="sensors"]').classList.contains('has-edit')`));
    await s.tap('[data-sub="sensors"]');
    check(`${tag}: Entwurf nach Unterreiter noch da`, await s.waitFor(`return r.querySelector('${box("binary_sensor.fenster_bad", "night")}').classList.contains('on')`));
    // Wechsel der Anlage würde den Entwurf ersetzen: hier fragt es nach
    await s.ev(`const sel=r.querySelector('[data-act="system"]'); sel.value="e_garage"; sel.dispatchEvent(new Event("change", { bubbles: true }));`);
    check(`${tag}: Rückfrage beim Wechsel der Anlage`, await s.waitFor(`return r.getElementById("ag-discard").open && r.getElementById("ag-discard").innerText.includes(${JSON.stringify(t.discard)})`));
    check(`${tag}: Fokus auf Weiter bearbeiten`, await s.ev(`return r.activeElement?.dataset.act === "keep"`));
    await s.tap('[data-act="keep"]');
    check(`${tag}: bleibt in Gruppen`, await s.ev(`return !!r.querySelector('.ag-table') && r.querySelector('${box("binary_sensor.fenster_bad", "night")}').classList.contains('on')`));
    await s.ev(`const sel=r.querySelector('[data-act="system"]'); sel.value="e_garage"; sel.dispatchEvent(new Event("change", { bubbles: true }));`);
    await s.waitFor(`return r.getElementById("ag-discard").open`);
    await s.tap('[data-act="discard"]');
    check(`${tag}: Verwerfen wechselt die Anlage`, await s.waitFor(`return r.querySelectorAll('.ag-table th').length === 6`));
    await s.ev(`const sel=r.querySelector('[data-act="system"]'); sel.value="e_haus"; sel.dispatchEvent(new Event("change", { bubbles: true }));`);
    await s.waitFor(`return r.querySelectorAll('.ag-table th').length === 8`);

    // Garage hat keine Nacht: keine Spalte Nacht
    await s.tap('[data-tab="config"]');
    await s.ev(`const sel=r.querySelector('[data-act="system"]'); sel.value="e_garage"; sel.dispatchEvent(new Event("change", { bubbles: true }));`);
    check(`${tag}: Garage ohne Nacht`, await s.waitFor(`return r.querySelectorAll('.ag-table th').length === 6`));
    // Name der Anlage oben: grosses Dropdown (mehrere Anlagen), Stift, Sprung nach HA, Umbenennen
    check(`${tag}: Anlagenname gross als Dropdown mit Stift ganz oben, HA-Knopf`, await s.ev(`const b=r.querySelector('.ag-head .ag-headsys'); const sel=b.querySelector('select[data-act="system"]'); return !!sel && parseFloat(getComputedStyle(sel).fontSize) >= 20 && sel.offsetHeight >= 44 && !!b.querySelector('[data-act="rename"]') && !!b.querySelector('[data-act="open-ha"]')`));
    await s.ev(`window.__navs=[]; r.host._navigate = (p) => window.__navs.push(p);`);
    await s.tap('[data-act="open-ha"]');
    check(`${tag}: Knopf öffnet die Integration dieser Anlage in HA`, await s.ev(`return window.__navs.length === 1 && window.__navs[0] === "/config/integrations/integration/alarmageddon#config_entry=e_garage"`));
    await s.tap('[data-sub="notify"]');
    check(`${tag}: Anlagenname und HA-Knopf bleiben auch bei Benachrichtigungen oben`, await s.waitFor(`return !!r.querySelector('.ag-headsys select[data-act="system"]') && !!r.querySelector('.ag-headsys [data-act="rename"]') && !!r.querySelector('.ag-headsys [data-act="open-ha"]')`));
    await s.tap('[data-sub="sensors"]');
    await s.waitFor(`return !!r.querySelector('.ag-headsys select, .ag-headsys h2')`);
    await s.tap('[data-act="rename"]');
    check(`${tag}: Dialog Umbenennen mit Name und Schalter für neue IDs (aus)`, await s.waitFor(`const d=r.getElementById("ag-rename"); return d.open && d.querySelector("input").value === "Garage" && d.querySelector('[data-act="rename-ids"]').getAttribute("aria-checked") === "false"`));
    await s.ev(`const i=r.getElementById("ag-rename").querySelector("input"); i.value="Haus"; r.getElementById("ag-rename").querySelector("form").requestSubmit();`);
    check(`${tag}: doppelter Name wird abgelehnt`, await s.waitFor(`const d=r.getElementById("ag-rename"); return d.open && d.querySelector(".ag-dlg-err").textContent.length > 5`));
    await s.ev(`const d=r.getElementById("ag-rename"); d.querySelector("input").value="Carport"; d.querySelector('[data-act="rename-ids"]').click(); d.querySelector("form").requestSubmit();`);
    check(`${tag}: Umbenennen schliesst, Titel folgt`, await s.waitFor(`return !r.getElementById("ag-rename").open && [...r.querySelectorAll('select[data-act="system"] option')].some((o) => o.textContent === "Carport")`));
    const ren = await s.sim("return (window.__renames || []).at(-1)");
    check(`${tag}: sendet Anlage, Name und neue IDs`, ren?.entry_id === "e_garage" && ren.name === "Carport" && ren.regenerate_ids === true);
    await s.page.screenshot({ path: `${outDir}groups-${lang}-desktop.png` });
    check(`${tag}: keine Fehler im Browser`, s.errors.length === 0, s.errors.join(" | "));
    await s.ctx.close();
  }
  // ----- Handy -----
  {
    const tag = `${lang}/Handy`;
    const s = await open(browser, { lang, tab: "config", mobile: true });
    check(`${tag}: Tabelle mit Kästchen (kein Kartenraster), eine Zeile je Sensor, ohne seitlichen Überlauf`, await s.ev("return !r.querySelector('.ag-mcard') && r.querySelectorAll('.ag-table tr[data-row]').length === 11 && !r.querySelector('.ag-table [data-sen=\"entry\"]') && r.querySelector('.ag-table').scrollWidth <= r.querySelector('.ag-table-wrap').clientWidth + 1"));
    await s.ev("const c=r.querySelector('.ag-content'); const th=r.querySelector('.ag-table th'); const top=parseFloat(c.style.getPropertyValue('--ag-th-top')); c.scrollTop += th.getBoundingClientRect().top - c.getBoundingClientRect().top - top + 20;");
    await s.page.waitForTimeout(900);
    check(`${tag}: Tabellenkopf klebt beim Scrollen (Regel: Titelzeile scrollt nie weg), Tabelle passt in die Breite`, await s.ev(`const c=r.querySelector('.ag-content'); const th=r.querySelector('.ag-table th'); const top=parseFloat(c.style.getPropertyValue('--ag-th-top')); const t=th.getBoundingClientRect().top; const w=r.querySelector('.ag-table-wrap'); const ok=!w.classList.contains('hscroll') && (Math.abs(t - top - c.getBoundingClientRect().top) < 16 || (c.scrollTop >= c.scrollHeight - c.clientHeight - 1 && t >= top)) && c.scrollTop > 0; c.scrollTop = 0; return ok`));
    const sizes = await s.ev("return [...r.querySelectorAll('.ag-table .ag-box')].slice(0, 3).map((b) => Math.round(b.getBoundingClientRect().height))");
    check(`${tag}: Kästchen gross genug zum Antippen (mindestens 28 px, Zelle 44)`, sizes.every((h) => h >= 28), JSON.stringify(sizes));
    await s.tap('.ag-table [data-box][data-ent="binary_sensor.fenster_bad"][data-mode="home"]');
    check(`${tag}: Antippen setzt Zone`, await s.ev(`return r.querySelector('.ag-table [data-box][data-ent="binary_sensor.fenster_bad"][data-mode="home"]').classList.contains('on')`));
    check(`${tag}: 1 Änderung`, (await s.ev("return r.querySelector('.ag-foot').innerText")).includes(t.one));
    // Eingangsverzögerung im Blatt von unten (Details des Sensors)
    await s.tap('[data-sen="detail"][data-ent="binary_sensor.fenster_bad"]');
    await s.waitFor(`return r.getElementById("ag-sheet").open`);
    await s.tap('#ag-sheet [data-sen="entry"][data-ent="binary_sensor.fenster_bad"]');
    await s.tap('#ag-sheet .ag-dlg-btns [data-sen="close-detail"]');
    check(`${tag}: Blatt geschlossen`, await s.waitFor(`return !r.getElementById("ag-sheet").open`));
    await s.tap('[data-sen="save"]');
    check(`${tag}: Gespeichert`, await s.waitFor(`return r.querySelector('.ag-foot').innerText.includes(${JSON.stringify(t.saved)})`));
    const saved = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/save_zones')[0]");
    check(`${tag}: Aufruf mit Eingang`, saved?.zones.home.includes("binary_sensor.fenster_bad") && saved.entry_sensors.includes("binary_sensor.fenster_bad"), JSON.stringify(saved));
    const overflow = await s.ev(`const c=r.querySelector('.ag-content'); return c.scrollWidth <= c.clientWidth`);
    check(`${tag}: kein seitliches Scrollen`, overflow);
    await s.page.screenshot({ path: `${outDir}groups-${lang}-mobile.png` });
    check(`${tag}: keine Fehler im Browser`, s.errors.length === 0, s.errors.join(" | "));
    await s.ctx.close();
  }
}
await browser.close();
done();
