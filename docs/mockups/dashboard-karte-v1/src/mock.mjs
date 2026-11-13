// Mockups "Dashboard-Karte" (2026-11-13): Bedienteil und Infokarte des Panels als Karte für beliebige Dashboards von Home Assistant.
// Die Karten sind die echten Kacheln des Panels (HA-Nachbau, dunkel), eingesetzt in ein nachgebautes Dashboard. Erfundene Daten.
// Aufruf im Wurzelverzeichnis: node docs/mockups/dashboard-karte-v1/src/mock.mjs
import { fileURLToPath } from "node:url";
import { launch, open, PORT } from "../../../../tests/panel/lib.mjs";
import { startServer } from "../../../../tests/panel/server.mjs";

const out = fileURLToPath(new URL("../", import.meta.url));
const server = await startServer(PORT);
const browser = await launch();

// Dashboard um die Karten: Kopfzeile von HA, Nachbarkarten (einfache Kacheln), dann die Variante
const CSS = `
.mk { min-height: 100%; background: var(--ag-bg); color: var(--ag-text); padding: 0 0 28px; box-sizing: border-box; }
.mk-bar { display: flex; align-items: center; gap: 14px; padding: 14px 20px; background: var(--ag-card); border-bottom: 1px solid var(--ag-divider); font-size: 19px; }
.mk-bar b { font-weight: 500; flex: 1; }
.mk-tabs { display: flex; gap: 18px; font-size: 14px; color: var(--ag-text2); }
.mk-tabs .on { color: var(--ag-primary); border-bottom: 2px solid var(--ag-primary); padding-bottom: 4px; }
.mk-grid { display: grid; gap: 16px; padding: 18px 20px; }
.mk-d .mk-grid { grid-template-columns: repeat(3, 1fr); align-items: start; }
.mk-m .mk-grid { grid-template-columns: 1fr; padding: 14px 12px; gap: 12px; }
.mk-other { background: var(--ag-card); border: 1px solid var(--ag-divider); border-radius: 16px; padding: 16px 18px; display: flex; gap: 14px; align-items: center; min-height: 60px; }
.mk-other i { width: 40px; height: 40px; border-radius: 12px; background: var(--ag-subtle); display: grid; place-items: center; font-style: normal; font-size: 18px; }
.mk-other b { font-weight: 500; display: block; } .mk-other small { color: var(--ag-text2); }
.mk-col { display: grid; gap: 16px; align-content: start; } .mk-m .mk-col { gap: 12px; }
.mk-note { font-size: 12.5px; color: var(--ag-text2); margin: 0 4px; }
.mk-tag { display: inline-block; font-size: 11px; letter-spacing: .04em; text-transform: uppercase; color: var(--ag-primary); background: var(--ag-primary-soft); border-radius: 999px; padding: 2px 9px; margin-bottom: 6px; }
.mk-card { background: var(--ag-card); border: 1px solid var(--ag-divider); border-radius: 16px; overflow: hidden; }
.mk-compact .ag-sys-top { gap: 12px; } .mk-compact .ag-shield { width: 44px !important; height: 44px !important; }
.mk-foot { border-top: 1px solid var(--ag-divider); margin: 2px 0 0; padding-top: 12px; display: flex; align-items: center; gap: 12px; font-size: 14px; }
.mk-foot .ag-mini { flex: none; }
.mk-dlg { width: 760px; margin: 40px auto; background: var(--ag-card); border: 1px solid var(--ag-divider); border-radius: 20px; padding: 22px 24px; display: grid; gap: 14px; }
.mk-dlg h3 { margin: 0; font-weight: 500; font-size: 20px; }
.mk-list { display: grid; gap: 10px; }
.mk-pick { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: center; border: 1px solid var(--ag-divider); border-radius: 14px; padding: 12px 14px; }
.mk-pick.on { border-color: var(--ag-primary); background: var(--ag-primary-soft); }
.mk-field { display: grid; gap: 4px; } .mk-field label { font-size: 12px; color: var(--ag-text2); }
.mk-in { border: 1px solid var(--ag-divider); border-radius: 10px; padding: 9px 12px; background: var(--ag-bg); }
.mk-row { display: flex; align-items: center; gap: 12px; }
`;

// Aufnahme der echten Kacheln in verschiedenen Zuständen; "Alarmanlage Wohnung" ist die Anlage "Haus" des Nachbaus
async function capture(lang) {
  const s = await open(browser, { mobile: false, lang, theme: "dark", size: { width: 1440, height: 900 } });
  await s.sim(`window.__systems[0].title = 'Alarmanlage Wohnung'; window.__systems[0].modes = ['home', 'away']; for (const id of Object.keys(window.hass.states)) if (id.endsWith('_batterie')) window.__setState(id, '80'); window.__setState('binary_sensor.garagentor', 'off'); for (const sys of window.__systems) for (const e of sys.events) if (e.by === 'Diego') e.by = 'Marco';`);
  const state = async (st, attrs) => {
    await s.sim(`window.__setState('alarm_control_panel.haus', ${JSON.stringify(st)}, ${JSON.stringify({ changed_by: "Marco", triggered_by: null, deadline: null, ...attrs })})`);
    await s.frame.evaluate(() => document.querySelector("alarmageddon-panel")._fetch());
    await s.page.waitForTimeout(500);
  };
  const grab = () => s.ev(`
    const fix = (h) => h.replaceAll('Diego', 'Marco');
    const card = r.querySelector('[data-system="e_haus"]').outerHTML;
    const status = r.querySelector('.ag-status')?.outerHTML || '';
    const band = r.querySelector('.ag-alarm')?.outerHTML || '';
    const exit = r.querySelector('[data-system="e_garage"]')?.outerHTML || '';
    return { card: fix(card), status: fix(status), band: fix(band), exit };`);
  const out = {};
  await state("disarmed", { arm_mode: null });
  out.disarmed = await grab();
  await state("armed_away", { arm_mode: "away", armed_at: new Date(Date.now() - 95 * 60e3).toISOString(), armed_by: "Marco" });
  out.armed = await grab();
  await state("pending", { arm_mode: "away", triggered_by: "binary_sensor.haustuer", deadline: new Date(Date.now() + 22e3).toISOString(), armed_at: new Date(Date.now() - 95 * 60e3).toISOString(), armed_by: "Marco" });
  out.pending = await grab();
  await state("triggered", { arm_mode: "away", triggered_by: "binary_sensor.haustuer", armed_at: new Date(Date.now() - 95 * 60e3).toISOString(), armed_by: "Marco" });
  out.alarm = await grab();
  await s.ctx.close();
  return out;
}

const other = (icon, title, sub) => `<div class="mk-other"><i>${icon}</i><div><b>${title}</b><small>${sub}</small></div></div>`;
const OTHERS = [other("💡", "Wohnzimmer", "Licht · 3 an"), other("🌡️", "Temperatur", "Wohnzimmer · 21,4 °C"), other("🔌", "Waschmaschine", "Fertig seit 18:40"), other("🚪", "Haustür", "Zu · Schloss verriegelt")];
const page = (inner, mobile, title = "Zuhause") => `<style>${CSS}</style><div class="mk ${mobile ? "mk-m" : "mk-d"}"><div class="mk-bar"><span>☰</span><b>${title}</b><div class="mk-tabs"><span class="on">Übersicht</span><span>Räume</span>${mobile ? "" : "<span>Energie</span>"}</div></div>${inner}</div>`;
const label = (tag, text) => `<div><span class="mk-tag">${tag}</span><p class="mk-note">${text}</p></div>`;

// Varianten. Jede liefert das Dashboard als HTML (mobile: eine Spalte)
const variants = (c, mobile) => {
  const o = OTHERS;
  const A = (state) => `<div class="mk-grid">${mobile ? `<div class="mk-col">${state.band || ""}${state.card}${state.status}${o[0]}${o[1]}</div>` : `<div class="mk-col">${state.band || ""}${state.card}</div><div class="mk-col">${state.status}${o[0]}${o[1]}</div><div class="mk-col">${o[2]}${o[3]}</div>`}</div>`;
  // B: eine Karte, die Infokarte als Fusszeile
  const foot = (state) => {
    const m = state.status.match(/<div class="ag-label">(.*?)<\/div><h2>(.*?)<\/h2>/s);
    const warn = /ag-status warn/.test(state.status);
    return `<div class="mk-foot"><span class="ag-mini ${warn ? "warn" : "ok"}" style="background:var(--ag-${warn ? "warning" : "success"}-soft)">${warn ? "⚠" : "✓"}</span><span><b style="font-weight:500">${m ? m[2] : ""}</b></span></div>`;
  };
  const B = (state) => `<div class="mk-grid">${mobile ? `<div class="mk-col">${state.band || ""}${state.card.replace(/<\/div>\s*$/, foot(state) + "</div>")}${o[0]}${o[1]}</div>` : `<div class="mk-col">${state.band || ""}${state.card.replace(/<\/div>\s*$/, foot(state) + "</div>")}</div><div class="mk-col">${o[0]}${o[1]}</div><div class="mk-col">${o[2]}${o[3]}</div>`}</div>`;
  // C: nur das Bedienteil, ohne "Bereit für" und Infokarte (kompakt)
  const C = (state) => {
    const slim = state.card.replace(/<div class="ag-rows">.*<\/div>\s*<\/div>\s*$/s, "</div>");
    return `<div class="mk-grid">${mobile ? `<div class="mk-col">${state.band || ""}<div class="mk-compact">${slim}</div>${o[0]}${o[1]}</div>` : `<div class="mk-col">${state.band || ""}<div class="mk-compact">${slim}</div></div><div class="mk-col">${o[0]}${o[1]}</div><div class="mk-col">${o[2]}${o[3]}</div>`}</div>`;
  };
  return { A, B, C };
};

// Auswahldialog "Karte hinzufügen" und Editor der Karte (nur Desktop)
const picker = (c) => `<style>${CSS}</style><div class="mk mk-d"><div class="mk-dlg"><h3>Karte hinzufügen</h3><div class="mk-in">🔍 alarm</div>
  <div class="mk-list">
    <div class="mk-pick on"><div><b style="font-weight:500">Alarmageddon: Bedienteil</b><p class="mk-note">Zustand, Modi wählen, Bereit für, roter Alarm mit Quittieren</p></div><div>${c.disarmed.card}</div></div>
    <div class="mk-pick"><div><b style="font-weight:500">Alarmageddon: Status</b><p class="mk-note">Alles in Ordnung oder was Aufmerksamkeit braucht</p></div><div>${c.disarmed.status}</div></div>
  </div></div></div>`;
const editor = (c) => `<style>${CSS}</style><div class="mk mk-d"><div class="mk-dlg"><h3>Karte konfigurieren: Alarmageddon Bedienteil</h3>
  <div class="mk-field"><label>Alarmanlage</label><div class="mk-in">Alarmanlage Wohnung ▾</div></div>
  <div class="mk-field"><label>Titel (leer = Name der Anlage)</label><div class="mk-in">&nbsp;</div></div>
  <div class="mk-row"><span class="ag-toggle on" style="flex:none"></span><span>"Bereit für" und offene Sensoren zeigen</span></div>
  <div class="mk-row"><span class="ag-toggle on" style="flex:none"></span><span>Alarmband mit "Quittieren" und "Deaktivieren" zeigen</span></div>
  <div class="mk-row"><span class="ag-toggle" style="flex:none"></span><span>Kompakt (ohne Symbol und Zeile "seit …")</span></div>
  <div class="mk-row"><span class="ag-toggle on" style="flex:none"></span><span>Pfeil öffnet das Panel von Alarmageddon</span></div>
  <div style="max-width:420px">${c.disarmed.card}</div></div></div>`;

async function shoot(lang, name, build, mobile) {
  const s = await open(browser, { mobile, lang, theme: "dark", size: mobile ? { width: 390, height: 844 } : { width: 1440, height: 860 } });
  await s.ev(`const root = r.querySelector('.ag-root'); root.innerHTML = ${JSON.stringify(build)}; r.host._content = r.querySelector('.mk'); return 1`);
  await s.page.waitForTimeout(400);
  await (await s.page.$('#panel-frame')).screenshot({ path: `${out}${name}.png` });
  console.log(name);
  await s.ctx.close();
}

const c = await capture("de");
for (const mobile of [false, true]) {
  const v = variants(c, mobile);
  const suffix = mobile ? "b-handy" : "a";
  await shoot("de", `1${suffix}-A-zwei-karten-${mobile ? "handy" : "desktop"}`, page(v.A(c.disarmed), mobile), mobile);
  await shoot("de", `2${suffix}-B-eine-karte-${mobile ? "handy" : "desktop"}`, page(v.B(c.disarmed), mobile), mobile);
  await shoot("de", `3${suffix}-C-kompakt-${mobile ? "handy" : "desktop"}`, page(v.C(c.disarmed), mobile), mobile);
  await shoot("de", `4${suffix}-zustand-eingangsverzoegerung-${mobile ? "handy" : "desktop"}`, page(v.A(c.pending), mobile), mobile);
  await shoot("de", `5${suffix}-zustand-alarm-${mobile ? "handy" : "desktop"}`, page(v.A({ ...c.alarm, band: c.alarm.band }), mobile), mobile);
}
await shoot("de", "6a-auswahl-dialog-desktop", picker(c), false);
await shoot("de", "6b-editor-desktop", editor(c), false);
await browser.close();
server.close();
