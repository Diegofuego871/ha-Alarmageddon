// Grundregel (Vorgabe des Nutzers, 2026-11-11, 1.17.8): Jeder Schalter steht links, sein Text rechts davon und nahe dabei;
// der Text wächst nach rechts. Geprüft wird das ganze Panel: alle Reiter der Konfiguration und alle Fenster mit Schaltern
// (Sensor-Blatt, Voreinstellungen, Schritt-Editor je Schrittart, "Alarm endet", Ansicht, Umbenennen).
// Je Sprache auf Desktop und Handy. Ausgenommen sind nur Schalter in Tabellenzellen (die Spalte ist ihre Beschriftung).
// In einer Zeile aus Eingabefeldern (Zeitplan: Schalter, Uhrzeit, Aktion, Wochentage) steht der Schalter ebenfalls links;
// dort folgt ihm ein Feld statt eines Textes, deshalb gilt "nahe" nur für Zeilen mit Text.
import { check, done, launch, open } from "../lib.mjs";

// Für jeden sichtbaren Schalter: der Text in derselben Zeile beginnt rechts vom Schalter und höchstens NEAR Pixel entfernt
// (dazwischen darf nur das Symbol der Option stehen).
const NEAR = 64;
const AUDIT = `const out={ n: 0, bad: [] };
  for (const t of r.querySelectorAll('.ag-toggle')) {
    const q=t.getBoundingClientRect();
    if (!q.width || !q.height || t.closest('td') || (t.closest('dialog') && !t.closest('dialog').open)) continue;
    const row=t.parentElement;
    const line=[...row.children].filter((c) => c!==t && c.textContent.trim()).map((c) => c.getBoundingClientRect()).filter((b) => b.width && b.bottom > q.top && b.top < q.bottom);
    if (!line.length) continue;
    out.n++;
    const left=Math.min(...line.map((b) => b.left));
    const label=(t.getAttribute('aria-label')||'').slice(0, 36);
    if (q.right > left + 1) out.bad.push([label, 'rechts vom Text', Math.round(q.left), Math.round(left)]);
    else if (!row.querySelector(':scope > input, :scope > select') && left - q.right > ${NEAR}) out.bad.push([label, 'zu weit weg', Math.round(left - q.right)]);
  }
  return out;`;

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const s = await open(browser, { mobile, lang, tab: "config" });
    const audit = async (where, min = 1) => {
      await s.page.waitForTimeout(350); // Fenster und Reiter gleiten herein: erst danach stimmen die Lagen
      const a = await s.ev(AUDIT);
      check(`${tag}: ${where}: alle ${a.n} Schalter stehen links, der Text nahe rechts davon`, a.n >= min && a.bad.length === 0, JSON.stringify({ n: a.n, bad: a.bad.slice(0, 5) }));
    };
    const closeDialogs = () => s.ev("for (const d of r.querySelectorAll('dialog[open]')) d.close(); return 1");

    // ----- Sensoren: Seite, Sensor-Blatt, Voreinstellungen -----
    await s.tap('[data-sub="sensors"]');
    await s.waitFor("return !!r.querySelector('[data-sen=\"permode\"]')");
    await audit("Sensoren");
    await s.tap('[data-sen="detail"]');
    await s.waitFor("return r.querySelectorAll('.ag-orow .ag-toggle').length > 2");
    await audit("Sensor-Blatt", 3);
    await closeDialogs();
    await s.ev("r.querySelector('[data-sen=\"presets\"]').click(); return 1");
    await s.waitFor("return r.getElementById('ag-presets').open");
    await audit("Voreinstellungen");
    await closeDialogs();

    // ----- Aktionen: Seite, jeder Schritt im Editor, "Alarm endet" -----
    await s.tap('[data-sub="actions"]');
    await s.waitFor("return r.querySelectorAll('.ag-wf-step').length > 0");
    await audit("Aktionen");
    const steps = await s.ev("return [...r.querySelectorAll('.ag-wf-main .ag-wf-step')].map((e) => [e.dataset.index, [...e.querySelector('.ag-wf-icon').classList].find((c) => c.startsWith('k-'))])");
    const seen = new Set();
    for (const [index, kind] of steps) {
      if (seen.has(kind)) continue;
      seen.add(kind);
      await s.ev(`r.querySelector('.ag-wf-main .ag-wf-step[data-index="${index}"] [data-wf="edit"]').click(); return 1`);
      await s.waitFor("return r.getElementById('ag-step').open");
      await audit(`Schritt-Editor (${kind})`, 0);
      await closeDialogs();
    }
    await s.ev("r.querySelector('[data-wf=\"end-edit\"]').click(); return 1");
    await s.waitFor("return r.getElementById('ag-step').open");
    await audit('Fenster "Alarm endet"');
    await closeDialogs();
    // Neuer Schritt: Ton (Lautstärke, bis zum Deaktivieren), Meldung (Knöpfe) und Voralarm
    for (const kind of ["sound", "notify", "prealarm", "device"]) {
      await s.ev("r.querySelector('.ag-wf-main [data-wf=\"add\"]').click(); return 1");
      await s.waitFor("return r.getElementById('ag-step').open");
      const has = await s.ev(`const b=r.querySelector('#ag-step [data-wf="kind"][data-kind="${kind}"]'); if (b) b.click(); return !!b`);
      if (has) await audit(`Neuer Schritt (${kind})`, 0);
      await closeDialogs();
    }
    await s.ev("r.querySelector('[data-wf=\"cancel\"]')?.click(); return 1");

    // ----- Meldungen und Anlage -----
    await s.tap('[data-sub="notify"]');
    await s.waitFor("return !!r.querySelector('.ag-nt [data-nt=\"permode\"]')");
    await audit("Meldungen", 8);
    await s.tap('[data-sub="system"]');
    await s.waitFor("return !!r.querySelector('[data-sys=\"permode\"]')");
    await audit("Anlage");
    await s.ctx.close();

    // ----- Übersicht: Fenster "Ansicht" und "Umbenennen" -----
    const o = await open(browser, { mobile, lang, tab: "overview" });
    const auditO = async (where) => {
      await o.page.waitForTimeout(350);
      const a = await o.ev(AUDIT);
      check(`${tag}: ${where}: alle ${a.n} Schalter stehen links, der Text nahe rechts davon`, a.n >= 1 && a.bad.length === 0, JSON.stringify({ n: a.n, bad: a.bad.slice(0, 5) }));
    };
    await o.tap('[data-list="view"]');
    await o.waitFor("return r.getElementById('ag-view').open");
    await auditO('Fenster "Ansicht"');
    await o.ev("for (const d of r.querySelectorAll('dialog[open]')) d.close(); return 1");
    await o.tap('[data-act="rename"]');
    await o.waitFor("return r.getElementById('ag-rename').open");
    await auditO('Fenster "Umbenennen"');
    check(`${tag}: kein Überlauf, keine Fehler im Browser`, (await o.ev("return document.documentElement.scrollWidth <= window.innerWidth")) && o.errors.length === 0 && s.errors.length === 0, [...o.errors, ...s.errors].join(" | "));
    await o.ctx.close();
  }
}
await browser.close();
done();
