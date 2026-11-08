// 0.7.0: Konfiguration › Updates (Versionszeile wie Device Panel): Prüfung, Aktualisieren über HACS, Neustart, Release Notes,
// Einstellungen. Je Sprache, Desktop und Handy, echte Klicks/Taps.
import { check, done, launch, open, outDir } from "../lib.mjs";

const T = {
  de: { available: "Version 0.7.0 verfügbar", current: "Aktuell", saved: "Gespeichert", restart: "0.7.0 installiert – Neustart nötig", notes: "Release Notes", beta: "Beta", noHacs: "von Hand", pre: "HACS installiert Vorabversionen nur" },
  en: { available: "Version 0.7.0 available", current: "Up to date", saved: "Saved", restart: "0.7.0 installed – restart required", notes: "Release notes", beta: "Beta", noHacs: "manually", pre: "HACS installs pre-releases only" },
};

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const t = T[lang];
    const s = await open(browser, { mobile, lang, tab: "config", query: "&latest=0.7.0" });
    // Punkt am Reiter: ein Update wartet
    check(`${tag}: Punkt am Reiter Konfiguration`, await s.waitFor("return r.querySelector('[data-tab=\"config\"]').classList.contains('has-dot')"));
    await s.tap('[data-sub="updates"]');
    check(`${tag}: Version verfügbar`, await s.waitFor(`return r.querySelector('.ag-ver-slot')?.innerText.includes('${t.available}')`));
    check(`${tag}: Punkt am Unterreiter`, await s.ev("return r.querySelector('[data-sub=\"updates\"]').classList.contains('has-dot')"));
    check(`${tag}: kein Überlauf`, await s.ev("return document.documentElement.scrollWidth <= window.innerWidth"));
    check(`${tag}: Aktualisieren und Release Notes`, await s.ev("return !!r.querySelector('[data-upd=\"install\"]') && !!r.querySelector('[data-upd=\"notes\"]')"));

    // Release Notes: Dialog mit zwei Versionen, Markdown umgesetzt, kein fremdes HTML
    await s.tap('[data-upd="notes"]');
    check(`${tag}: Release Notes offen`, await s.waitFor("const d=r.getElementById('ag-notes'); return d.open && d.querySelectorAll('.ag-rn-entry').length === 2"));
    check(`${tag}: Markdown als Liste und Code`, await s.ev("const d=r.getElementById('ag-notes'); return d.querySelectorAll('.ag-rn li').length === 3 && d.querySelector('.ag-rn code')?.textContent === 'Code' && d.querySelector('.ag-rn b')?.textContent === 'Neu:'"));
    const req = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/release_notes').at(-1)");
    check(`${tag}: Notes in der Sprache, von bis`, req?.language === lang && req?.installed === "0.6.0" && req?.latest === "0.7.0", JSON.stringify(req));
    await s.page.screenshot({ path: `${outDir}updates-notes-${lang}-${mobile ? "mobile" : "desktop"}.png` });
    await s.tap('[data-upd="notes-close"]');
    check(`${tag}: Notes zu`, await s.waitFor("return !r.getElementById('ag-notes').open"));

    // Aktualisieren über HACS (Dienst update.install der Update-Entität)
    await s.tap('[data-upd="install"]');
    check(`${tag}: Fortschritt`, await s.waitFor("return !!r.querySelector('.ag-ver-prog')"));
    check(`${tag}: Neustart nötig`, await s.waitFor(`return r.querySelector('.ag-ver-slot')?.innerText.includes('${t.restart}')`, 8000));
    const svc = await s.sim("return window.__services");
    check(`${tag}: update.install an die HACS-Entität`, svc.some((c) => c.domain === "update" && c.service === "install" && c.data.entity_id === "update.alarmageddon"), JSON.stringify(svc));
    check(`${tag}: nie ein Neustart von selbst`, !svc.some((c) => c.service === "restart"));
    await s.page.screenshot({ path: `${outDir}updates-restart-${lang}-${mobile ? "mobile" : "desktop"}.png`, fullPage: true });

    // Neustart nur mit Rückfrage; "Abbrechen" startet nicht
    await s.page.evaluate(() => { window.confirm = () => false; });
    await s.frame.evaluate(() => { window.confirm = () => false; });
    await s.tap('[data-upd="restart"]');
    check(`${tag}: Neustart abgelehnt`, !(await s.sim("return window.__services.some((c) => c.service === 'restart')")));
    await s.frame.evaluate(() => { window.confirm = () => true; });
    await s.tap('[data-upd="restart"]');
    check(`${tag}: Neustart auf Wunsch`, await s.waitFor("return !r.querySelector('[data-upd=\"restart\"]')") && await s.sim("return window.__services.some((c) => c.domain === 'homeassistant' && c.service === 'restart')"));

    // Einstellungen: Entwurf, Auto-Update hängt an der täglichen Prüfung
    check(`${tag}: drei Schalter`, await s.ev("return r.querySelectorAll('[data-upd=\"set\"]').length === 3"));
    check(`${tag}: Auto aus`, await s.ev("return r.querySelector('[data-upd=\"set\"][data-key=\"auto_update\"]').getAttribute('aria-checked') === 'false'"));
    await s.tap('[data-upd="set"][data-key="auto_update"]');
    check(`${tag}: Auto an, eine Änderung`, await s.waitFor("return r.querySelector('.ag-foot').innerText.match(/1 (Änderung|change)/)"));
    await s.tap('[data-upd="set"][data-key="check"]');
    check(`${tag}: Auto gesperrt ohne tägliche Prüfung`, await s.ev("const b=r.querySelector('[data-upd=\"set\"][data-key=\"auto_update\"]'); return b.disabled && b.getAttribute('aria-checked') === 'false'"));
    await s.tap('[data-upd="set"][data-key="check"]');
    await s.tap('[data-upd="save"]');
    check(`${tag}: gespeichert`, await s.waitFor(`return r.querySelector('.ag-foot').innerText.includes('${t.saved}')`));
    const set = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/set_update').at(-1)");
    check(`${tag}: Einstellungen gesendet`, set?.check === true && set?.auto_update === true && set?.prerelease === false, JSON.stringify(set));

    check(`${tag}: keine Fehler im Browser`, s.errors.length === 0, s.errors.join(" | "));
    await s.ctx.close();
  }
}

// Ohne HACS: kein Aktualisieren, Hinweis auf Handinstallation; Vorabversion: Beta und Hinweis auf den HACS-Schalter
{
  const s = await open(browser, { tab: "config", query: "&hacs=0&latest=0.7.0" });
  await s.tap('[data-sub="updates"]');
  check("ohne HACS: Hinweis, kein Aktualisieren", await s.waitFor("return r.querySelector('.ag-ver-slot')?.innerText.includes('0.7.0') && !r.querySelector('[data-upd=\"install\"]')"));
  check("ohne HACS: von Hand", await s.ev(`return r.querySelector('.ag-ver-slot').innerText.includes('${T.de.noHacs}')`));
  await s.ctx.close();
}
{
  const s = await open(browser, { tab: "config", query: "&latest=0.7.0&pre=1" });
  await s.tap('[data-sub="updates"]');
  check("Vorabversion: Beta-Marke", await s.waitFor(`return r.querySelector('.ag-ver.beta .ag-ver-tag')?.textContent.trim() === '${T.de.beta}'`));
  check("Vorabversion: gesperrt, Hinweis auf HACS", await s.ev(`const b=r.querySelector('[data-upd="install"]'); return !!b && b.disabled && r.querySelector('.ag-ver-hint').innerText.includes('${T.de.pre}')`));
  check("Vorabversion: Link zum HACS-Gerät", await s.ev("return !!r.querySelector('[data-upd=\"hacs-device\"]')"));
  await s.ctx.close();
}
{
  const s = await open(browser, { tab: "config", query: "&latest=0.6.0" });
  await s.tap('[data-sub="updates"]');
  check("aktuell: Zeile 'Aktuell' mit Prüfen", await s.waitFor(`return r.querySelector('.ag-ver.ok')?.innerText.includes('${T.de.current}') && !!r.querySelector('[data-upd="check"]')`));
  check("aktuell: kein Punkt", await s.ev("return !r.querySelector('[data-tab=\"config\"]').classList.contains('has-dot')"));
  await s.sim("window.__versionError = 'rate_limit'");
  await s.tap('[data-upd="check"]');
  check("Fehler der Prüfung sichtbar", await s.waitFor("return r.querySelector('.ag-ver.err') !== null"));
  await s.ctx.close();
}
await browser.close();
done();
