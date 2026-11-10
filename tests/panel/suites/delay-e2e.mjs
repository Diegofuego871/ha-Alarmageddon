// 1.1.0: Eigene Eingangsverzögerung pro Sensor im Seitenblatt. Je Sprache, Desktop und Handy.
import { check, done, launch, open } from "../lib.mjs";

const DOOR = "binary_sensor.haustuer";
const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const s = await open(browser, { mobile, lang, tab: "config" });
    const sheet = mobile ? "#ag-sheet" : ".ag-side";
    const delaySel = `${sheet} [data-sen="delay"]`;
    const saved = lang === "de" ? "Gespeichert" : "Saved";

    await s.tap(`[data-sen="detail"][data-ent="${DOOR}"]`);
    check(`${tag}: Eingangssensor zeigt das Feld`, await s.waitFor(`return !!r.querySelector('${delaySel}')`));
    check(`${tag}: ohne eigenen Wert der Wert der Anlage (30 s) mit Herkunft`, await s.ev(`const i=r.querySelector('${delaySel}'); return i.value === '30' && /30 s/.test(i.closest('.ag-orow').innerText) && !i.closest('.ag-orow').querySelector('button.ag-origin')`));
    // Kein Eingangssensor: kein Feld
    await s.tap(`${sheet} [data-sen="entry"]`);
    check(`${tag}: ohne Eingangsverzögerung kein Feld`, await s.ev(`return !r.querySelector('${delaySel}')`));
    await s.tap(`${sheet} [data-sen="entry"]`);

    const input = await s.el(delaySel);
    await input.fill("5");
    check(`${tag}: Eingabe behält den Fokus (Blatt nicht neu aufgebaut)`, await s.ev(`return r.activeElement === r.querySelector('${delaySel}')`));
    check(`${tag}: Änderung gezählt`, await s.waitFor(`return !r.querySelector('[data-sen="save"]').disabled`));
    await input.dispatchEvent("change");
    check(`${tag}: Herkunft "Eigener Wert" mit Zurücksetzen`, await s.waitFor(`return !!r.querySelector('${sheet} button.ag-origin.own[data-sen="delay-reset"]') && r.querySelector('${delaySel}').value === '5'`));
    await (await s.el(delaySel)).fill("99999");
    check(`${tag}: ungültiger Wert markiert`, await s.ev(`return r.querySelector('${delaySel}').closest('.ag-num').classList.contains('bad')`));
    await (await s.el(delaySel)).dispatchEvent("change");
    check(`${tag}: ungültiger Wert springt auf den letzten gültigen zurück`, await s.waitFor(`return r.querySelector('${delaySel}').value === '5'`));
    if (mobile) await s.tap('#ag-sheet .ag-dlg-btns [data-sen="close-detail"]');
    await s.tap('[data-sen="save"]');
    check(`${tag}: gespeichert`, await s.waitFor(`return r.querySelector('.ag-foot').innerText.includes('${saved}')`));
    const call = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/save_zones').at(-1)");
    check(`${tag}: entry_delay gesendet`, call?.sensor_options?.[DOOR]?.entry_delay === 5, JSON.stringify(call?.sensor_options));

    // Zurücksetzen
    if (mobile) await s.tap(`[data-sen="detail"][data-ent="${DOOR}"]`); // auf dem Desktop bleibt das Blatt nach dem Speichern offen
    await s.waitFor(`return !!r.querySelector('${sheet} [data-sen="delay-reset"]')`);
    await s.tap(`${sheet} [data-sen="delay-reset"]`);
    check(`${tag}: zurück zum Wert der Anlage`, await s.waitFor(`return r.querySelector('${delaySel}').value === '30' && !r.querySelector('${sheet} [data-sen="delay-reset"]')`));
    if (mobile) await s.tap('#ag-sheet .ag-dlg-btns [data-sen="close-detail"]');
    await s.tap('[data-sen="save"]');
    await s.waitFor(`return r.querySelector('.ag-foot').innerText.includes('${saved}')`);
    const after = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/save_zones').at(-1)");
    check(`${tag}: nach dem Zurücksetzen kein eigener Wert gesendet`, after?.sensor_options?.[DOOR]?.entry_delay === undefined, JSON.stringify(after?.sensor_options));

    // Je Modus: Reiter wählen, eigener Wert nur für diesen Modus
    await s.tap('[data-sen="permode"]');
    if (mobile) await s.tap(`[data-sen="detail"][data-ent="${DOOR}"]`);
    await s.waitFor(`return !!r.querySelector('${delaySel}')`);
    const mi = await s.el(delaySel);
    await mi.fill("12");
    await mi.dispatchEvent("change");
    check(`${tag}: Herkunft "Eigener Wert für <Modus>"`, await s.waitFor(`const b=r.querySelector('${sheet} [data-sen="delay-reset"][data-mode]'); return !!b && b.dataset.mode === '${"home"}'`) || await s.ev(`return !!r.querySelector('${sheet} [data-sen="delay-reset"][data-mode]')`));
    if (mobile) await s.tap('#ag-sheet .ag-dlg-btns [data-sen="close-detail"]');
    await s.tap('[data-sen="save"]');
    await s.waitFor(`return r.querySelector('.ag-foot').innerText.includes('${saved}')`);
    const pm = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/save_zones').at(-1)");
    const modes = Object.keys(pm?.sensor_modes || {});
    check(`${tag}: Wert steht nur im Modus-Bereich`, modes.length === 1 && pm.sensor_modes[modes[0]][DOOR]?.entry_delay === 12 && pm.sensor_options?.[DOOR]?.entry_delay === undefined, JSON.stringify(pm));
    await s.ctx.close();
  }
}
await browser.close();
done();
