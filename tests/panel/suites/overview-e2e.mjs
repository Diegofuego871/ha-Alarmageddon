// Übersicht (Variante A): Karten je Anlage, Modus umschalten, Code, offene Sensoren, Alarm-Band, Ereignisse.
// Je Sprache auf Desktop und Handy, mit echten Klicks bzw. Taps.
import { check, done, launch, open, outDir } from "../lib.mjs";

const T = {
  de: { armedAway: "Abwesend scharf", disarmed: "Deaktiviert", away: "Abwesend", off: "Aus", readyFor: "Bereit für", battery: "1 Batterie schwach",
    garageOpen: "Garagentor ist offen", events: "Letzte Ereignisse", openErr: "Scharfschalten nicht möglich, offen: Garagentor.", wrongCode: "Falscher Code.", alarm: "Alarm: Haus", disarm: "Deaktivieren", armedHome: "Anwesend scharf" },
  en: { armedAway: "Armed away", disarmed: "Disarmed", away: "Away", off: "Off", readyFor: "Ready for", battery: "1 low battery",
    garageOpen: "Garagentor is open", events: "Recent events", openErr: "Cannot arm, open: Garagentor.", wrongCode: "Wrong code.", alarm: "Alarm: Haus", disarm: "Disarm", armedHome: "Armed home" },
};

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const t = T[lang];
    const s = await open(browser, { mobile, lang });
    const text = () => s.ev("return r.querySelector('.ag-view').innerText");
    const card = (id) => s.ev(`return r.querySelector('[data-system="${id}"]').innerText`, id);

    const haus = await card("e_haus");
    check(`${tag}: Haus zeigt Zustand`, haus.includes(t.armedAway), haus);
    const tile = await s.ev("return r.querySelector('.ag-status').innerText");
    check(`${tag}: Warnkachel Batterie`, tile.includes(t.battery), tile);
    const garage = await card("e_garage");
    check(`${tag}: Garage zeigt offenen Sensor`, garage.includes(t.disarmed) && garage.includes(t.readyFor) && garage.includes(t.garageOpen), garage);
    check(`${tag}: Garage nicht bereit`, await s.ev(`return r.querySelectorAll('[data-system="e_garage"] .ag-rchip.no').length === 2`));
    check(`${tag}: Ereignisse nur im Protokoll`, !(await text()).toLowerCase().includes(t.events.toLowerCase()));
    const nightOnlyHaus = await s.ev(`return [r.querySelectorAll('[data-system="e_haus"] [data-mode]').length, r.querySelectorAll('[data-system="e_garage"] [data-mode]').length]`);
    check(`${tag}: Nacht nur bei Haus`, nightOnlyHaus[0] === 4 && nightOnlyHaus[1] === 3, JSON.stringify(nightOnlyHaus));

    // Kapsel unter dem gewählten Modus (Design-Regel)
    const pill = await s.ev(`const seg=r.querySelector('[data-system="e_haus"] .ag-seg'); const p=seg.querySelector('.ag-pill').getBoundingClientRect(); const b=seg.querySelector('button.on').getBoundingClientRect(); return Math.abs(p.left-b.left) < 2 && Math.abs(p.width-b.width) < 2`);
    check(`${tag}: Kapsel unter gewähltem Modus`, pill);

    // Scharfschalten mit offenem Sensor: verständlicher Fehler, Zustand bleibt
    await s.tap('[data-system="e_garage"] [data-mode="away"]');
    const toast = await s.waitFor(`return r.querySelector('.ag-toast')?.textContent === ${JSON.stringify(t.openErr)}`);
    check(`${tag}: Fehler bei offenem Sensor`, toast, await s.ev("return r.querySelector('.ag-toast')?.textContent"));
    check(`${tag}: Kapsel zurück auf Aus`, await s.waitFor(`return r.querySelector('[data-system="e_garage"] button.on')?.dataset.mode === "off"`));

    // Tor zu: jetzt klappt es ohne Code
    await s.sim(`window.__setState("binary_sensor.garagentor", "off")`);
    check(`${tag}: Garage jetzt bereit`, await s.waitFor(`return r.querySelectorAll('[data-system="e_garage"] .ag-rchip.ok').length === 2`));
    // Schalten: Kapsel sofort, danach Ladeanzeige über verschwommenem Bild, nichts antippbar, am Ende wieder frei
    await s.sim("window.__wsDelay = 700");
    await s.tap('[data-system="e_garage"] [data-mode="home"]');
    check(`${tag}: Kapsel wechselt sofort, Ladeanzeige über verschwommenem Bild`, await s.waitFor(`const root=r.querySelector('.ag-root'); return root.classList.contains('ag-ldwrap') && root.classList.contains('ag-ldblur') && !!root.querySelector(':scope > .ag-ld') && r.querySelector('[data-system="e_garage"] button.on')?.dataset.mode === "home" && getComputedStyle(r.querySelector('.ag-content')).pointerEvents === 'none' && getComputedStyle(r.querySelector('.ag-content')).filter.includes('blur')`, 600));
    check(`${tag}: danach wieder frei`, await s.waitFor(`const root=r.querySelector('.ag-root'); return !root.classList.contains('ag-ldwrap') && !root.classList.contains('ag-ldblur') && !root.querySelector(':scope > .ag-ld')`, 4000));
    await s.sim("window.__wsDelay = 0");
    check(`${tag}: Garage scharf`, await s.waitFor(`return r.querySelector('[data-system="e_garage"]').innerText.includes(${JSON.stringify(t.armedHome)})`));

    // Haus deaktivieren: braucht Code, Dialog erst nach dem Versuch ohne Code
    await s.tap('[data-system="e_haus"] [data-mode="off"]');
    check(`${tag}: Code-Dialog`, await s.waitFor(`return r.getElementById("ag-code").open`));
    await s.page.keyboard.type("9999");
    await s.page.keyboard.press("Enter");
    check(`${tag}: Falscher Code im Dialog`, await s.waitFor(`return r.querySelector(".ag-dlg-err").textContent === ${JSON.stringify(t.wrongCode)}`));
    await s.ev(`r.getElementById("ag-code-input").value = ""`);
    await s.page.keyboard.type("1234");
    await s.page.keyboard.press("Enter");
    check(`${tag}: Richtiger Code schliesst Dialog`, await s.waitFor(`return !r.getElementById("ag-code").open`));
    check(`${tag}: Haus deaktiviert`, await s.waitFor(`return r.querySelector('[data-system="e_haus"]').innerText.includes(${JSON.stringify(t.disarmed)})`));
    const calls = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/arm')");
    check(`${tag}: Aufrufe`, JSON.stringify(calls.map((c) => [c.entry_id, c.mode, c.code || null])) === JSON.stringify([["e_garage", "away", null], ["e_garage", "home", null], ["e_haus", "off", null], ["e_haus", "off", "9999"], ["e_haus", "off", "1234"]]), JSON.stringify(calls));

    // Alarm: rotes Band zuoberst mit Deaktivieren
    await s.sim(`window.__setState("alarm_control_panel.haus", "triggered", { arm_mode: "home", triggered_by: "binary_sensor.fenster_kueche" })`);
    check(`${tag}: Alarm-Band`, await s.waitFor(`const a=r.querySelector('.ag-alarm'); return a && a.innerText.includes(${JSON.stringify(t.alarm)}) && a.innerText.includes("Fenster Küche") && a.innerText.includes(${JSON.stringify(t.disarm)})`));
    check(`${tag}: Alarm-Band vor den Karten`, await s.ev(`return r.querySelector('.ag-ov-top').firstElementChild.classList.contains('ag-alarm')`));
    check(`${tag}: Alarm-Band mit Knopf "Quittieren" neben Deaktivieren`, await s.ev(`const b=r.querySelector('.ag-alarm [data-act="ack"]'); return !!b && !!r.querySelector('.ag-alarm [data-act="mode"][data-mode="off"]') && b.getBoundingClientRect().width > 40`));
    await s.tap('.ag-alarm [data-act="ack"]');
    check(`${tag}: Quittieren beendet den Alarm, die Anlage bleibt scharf (Band weg)`, await s.waitFor(`return !r.querySelector('.ag-alarm') && r.querySelector('[data-system="e_haus"]').innerText.length > 0`));
    check(`${tag}: Befehl gesendet`, await s.sim("return window.__calls.some((c) => c.type === 'alarmageddon/acknowledge' && c.entry_id === 'e_haus')"));
    check(`${tag}: Knopf nur bei Alarm (ohne Alarm kein Band)`, await s.ev(`return !r.querySelector('[data-act="ack"]')`));
    await s.sim(`window.__setState("alarm_control_panel.haus", "triggered", { arm_mode: "home", triggered_by: "binary_sensor.fenster_kueche" })`);
    await s.waitFor("return !!r.querySelector('.ag-alarm')");
    check(`${tag}: Alarm in der Warnkachel`, await s.waitFor(`return r.querySelector('.ag-status').innerText.includes("Haus")`));

    if (mobile) {
      // Reiter mit Symbol und kurzem Text über die ganze Breite (Entscheid des Nutzers)
      const tabs = await s.ev(`const t=r.querySelector('.ag-tabs').getBoundingClientRect(); const c=r.querySelector('.ag-content').getBoundingClientRect(); return [t.width, c.width, r.querySelectorAll('.ag-tabs svg').length]`);
      check(`${tag}: Reiter volle Breite mit Symbol`, tabs[0] > tabs[1] - 40 && tabs[2] === 3, JSON.stringify(tabs));
      const overflow = await s.ev(`const c=r.querySelector('.ag-content'); return c.scrollWidth <= c.clientWidth`);
      check(`${tag}: kein seitliches Scrollen`, overflow);
    }
    await s.page.screenshot({ path: `${outDir}overview-${lang}-${mobile ? "mobile" : "desktop"}.png` });
    check(`${tag}: keine Fehler im Browser`, s.errors.length === 0, s.errors.join(" | "));
    await s.ctx.close();
  }
}

// Ohne Anlage: Hinweis mit Knopf
const s = await open(browser, { query: "&empty=1" });
check("leer: Hinweis", (await s.ev("return r.querySelector('.ag-empty')?.innerText || ''")).includes("Noch keine Alarmanlage"));
await s.ctx.close();
await browser.close();
done();
