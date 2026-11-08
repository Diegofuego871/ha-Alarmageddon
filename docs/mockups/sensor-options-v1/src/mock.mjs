// Mockups 0.3.0: Optionen pro Sensor (A Seitenblatt, B Spalten, C aufklappen), Voreinstellungen je Sensorart,
// "Bereit zum Scharfschalten" (A Punkte an den Modi, B eigene Zeile). Rahmen und Farben aus panel-v1 (wie das echte Panel).
import { ic, page } from "../../panel-v1/src/base.mjs";
import { CSS_O } from "../../panel-v1/src/overview.mjs";
import { CSS_G } from "../../panel-v1/src/groups.mjs";

const X = {
  flash: "M7,2V13H10V22L17,10H13L17,2H7Z",
  lockClosed: "M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z",
  doorOpen: "M12,3C10.89,3 10,3.89 10,5H3V19H2V21H22V19H21V5C21,3.89 20.11,3 19,3H12M12,5H19V19H12V5M5,11H7V13H5V11Z",
  offline: "M2.28,3L1,4.27L2.47,5.74C2.04,6 1.61,6.29 1.2,6.6L3,9C3.53,8.6 4.08,8.25 4.66,7.93L6.89,10.16C6.15,10.5 5.44,10.91 4.8,11.4L6.6,13.8C7.38,13.22 8.26,12.77 9.2,12.47L11.75,15C10.5,15.07 9.34,15.5 8.4,16.2L12,21L14.46,17.73L17.74,21L19,19.72M12,3C9.85,3 7.8,3.38 5.9,4.07L8.29,6.47C9.5,6.16 10.72,6 12,6C15.38,6 18.5,7.11 21,9L22.8,6.6C19.79,4.34 16.06,3 12,3M12,9C11.62,9 11.25,9 10.88,9.05L14.07,12.25C15.29,12.53 16.43,13.07 17.4,13.8L19.2,11.4C17.2,9.89 14.7,9 12,9Z",
  undo: "M12.5,8C9.85,8 7.45,9 5.6,10.6L2,7V16H11L7.38,12.38C8.77,11.22 10.54,10.5 12.5,10.5C16.04,10.5 19.05,12.81 20.1,16L22.47,15.22C21.08,11.03 17.15,8 12.5,8Z",
  tune: "M3,17V19H9V17H3M3,5V7H13V5H3M13,21V19H21V17H13V15H11V21H13M7,9V11H3V13H7V15H9V9H7M21,13V11H11V13H21M15,9H17V7H21V5H17V3H15V9Z",
  info: "M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z",
  groups: "M3,4H7V8H3V4M9,5V7H21V5H9M3,10H7V14H3V10M9,11V13H21V11H9M3,16H7V20H3V16M9,17V19H21V17H9Z",
};
const xi = (n, s = 18) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${X[n]}"/></svg>`;

// Optionen pro Sensor, verständlich benannt (statt Fachbegriffen wie bei Alarmo)
export const OPTS = [
  { key: "entry", icon: () => ic("timer", 18), name: "Eingangsverzögerung", short: "Eingang", hint: "Löst erst nach der Eingangsverzögerung aus, damit du Zeit zum Deaktivieren hast." },
  { key: "always", icon: () => xi("flash"), name: "Immer aktiv", short: "Immer", hint: "Löst auch aus, wenn die Anlage deaktiviert ist. Für Rauch, Wasser und Gas." },
  { key: "openok", icon: () => xi("doorOpen"), name: "Darf beim Scharfschalten offen sein", short: "Offen ok", hint: "Zum Beispiel ein Bewegungsmelder auf dem Weg zur Tür. Erst eine neue Auslösung nach dem Scharfschalten zählt." },
  { key: "armclose", icon: () => xi("lockClosed"), name: "Scharf, sobald geschlossen", short: "Zu = scharf", hint: "Schliesst du diese Tür während der Ausgangsverzögerung, ist die Anlage sofort scharf." },
  { key: "offline", icon: () => xi("offline"), name: "Ausfall gilt als Alarm", short: "Ausfall", hint: "Ist der Sensor im scharfen Zustand nicht mehr erreichbar, löst er aus." },
];
// Voreinstellungen je Sensorart (Vorschlag, angelehnt an Alarmo, Eingangsverzögerung bewusst aus)
export const PRESETS = [
  { type: "Tür", icon: "door", on: ["armclose"] },
  { type: "Fenster", icon: "window", on: [] },
  { type: "Bewegung", icon: "motion", on: ["openok"] },
  { type: "Rauch, Wasser, Gas", icon: "smoke", on: ["always"] },
  { type: "Glasbruch, Erschütterung, Sabotage", icon: "alert", on: ["offline"] },
];
const ROWS = [
  { area: "Flur", name: "Haustür", type: "Tür", icon: "door", zones: ["home", "away", "night"], on: ["entry", "armclose"], custom: ["entry"], bat: "72 %" },
  { area: "Flur", name: "Bewegung Flur", type: "Bewegung", icon: "motion", zones: ["away"], on: ["openok"], custom: [], bat: "83 %" },
  { area: "Flur", name: "Rauchmelder Flur", type: "Rauch", icon: "smoke", zones: [], on: ["always"], custom: [], bat: "88 %" },
  { area: "Küche", name: "Fenster Küche", type: "Fenster", icon: "window", zones: ["home", "away"], on: [], custom: [], bat: "78 %" },
  { area: "Wohnzimmer", name: "Terrassentür", type: "Tür", icon: "door", zones: ["home", "away", "night"], on: ["offline"], custom: ["armclose", "offline"], bat: "55 %" },
  { area: "Wohnzimmer", name: "Bewegung Wohnzimmer", type: "Bewegung", icon: "motion", zones: ["away"], on: ["openok"], custom: [], bat: "Netz" },
];
const ZN = [["home", "Anwesend", "shieldHome"], ["away", "Abwesend", "shieldAway"], ["night", "Nacht", "moon"]];

export const CSS = CSS_O + CSS_G + `
.tabs2 { display: inline-flex; padding: 4px; gap: 2px; border-radius: 14px; background: var(--subtle); }
.tabs2 span { padding: 8px 16px; border-radius: 10px; color: var(--text2); display: inline-flex; gap: 6px; align-items: center; }
.tabs2 span.on { background: var(--card); color: var(--text); box-shadow: var(--shadow-s); font-weight: 500; }
.phone .tabs2 { display: flex; flex: 1 1 100%; } .phone .tabs2 span { flex: 1; flex-direction: column; gap: 2px; font-size: 12px; padding: 6px 4px; }
.gt td.o, .gt th.o { text-align: center; width: 64px; padding-left: 4px; padding-right: 4px; }
.oicon { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; margin: auto; color: var(--text3); border: 1px dashed transparent; }
.oicon.on { background: var(--pri-soft); color: var(--primary); }
.oicon.custom { border-color: var(--primary); }
.gt tr.sel td { background: var(--pri-soft); }
.custombadge { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: var(--primary); margin-left: 6px; vertical-align: middle; }
.layout { display: grid; grid-template-columns: minmax(0, 1fr) 420px; gap: 16px; align-items: start; }
.sheet { padding: 0; overflow: hidden; position: sticky; top: 0; }
.sheet-head { display: flex; gap: 12px; align-items: center; padding: 18px; border-bottom: 1px solid var(--divider); }
.sheet-head h3 { margin: 0; font-size: 19px; font-weight: 500; }
.sheet-body { padding: 14px 18px 18px; display: flex; flex-direction: column; gap: 4px; }
.orow { display: flex; gap: 12px; align-items: flex-start; padding: 12px 0; border-bottom: 1px solid var(--divider); }
.orow:last-child { border-bottom: 0; }
.orow .tx { flex: 1; min-width: 0; }
.orow .tx b { font-weight: 500; display: block; }
.orow .tx small { display: block; color: var(--text2); font-size: 12.5px; margin-top: 2px; line-height: 1.35; }
.origin { font-size: 11.5px; margin-top: 4px; display: inline-flex; gap: 4px; align-items: center; }
.origin.preset { color: var(--text2); } .origin.own { color: var(--primary); font-weight: 500; }
.oav { width: 34px; height: 34px; border-radius: 10px; background: var(--subtle); color: var(--text2); display: grid; place-items: center; flex: none; }
.oav.on { background: var(--pri-soft); color: var(--primary); }
.zline { display: flex; gap: 6px; flex-wrap: wrap; padding: 4px 0 10px; }
.legend { display: flex; gap: 14px; flex-wrap: wrap; font-size: 12.5px; color: var(--text2); }
.legend span { display: inline-flex; gap: 6px; align-items: center; }
.expand td { background: var(--subtle); padding: 14px 18px 16px !important; }
.ogrid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
.ocard { border: 1px solid var(--divider); background: var(--card); border-radius: 14px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.ocard.on { border-color: var(--primary); }
.ocard .top { display: flex; gap: 8px; align-items: center; justify-content: space-between; }
.ocard small { color: var(--text2); font-size: 12px; line-height: 1.35; }
.preset-tbl th.o { white-space: normal; font-size: 11px; line-height: 1.25; }
.mode-dot { font-style: normal; width: 8px; height: 8px; border-radius: 50%; display: inline-block; flex: none; }
.mode-dot.ok { background: var(--success); } .mode-dot.no { background: var(--warning); }
.ready { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 13px; padding: 10px 2px; border-bottom: 1px solid var(--divider); }
.ready .chipok { display: inline-flex; gap: 5px; align-items: center; height: 26px; padding: 0 10px; border-radius: 999px; font-size: 12.5px; font-weight: 500; }
.chipok.ok { background: var(--ok-soft); color: var(--success); } .chipok.no { background: var(--warn-soft); color: #b45309; }
.entbox { padding: 14px 18px; font-size: 13px; }
.entbox code { font-family: "DejaVu Sans Mono", monospace; font-size: 12.5px; }
.backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.45); }
.bsheet { position: fixed; left: 0; right: 0; bottom: 0; background: var(--card); border-radius: 22px 22px 0 0; max-height: 82%; overflow: hidden; box-shadow: var(--shadow); }
.grab { width: 40px; height: 5px; border-radius: 3px; background: var(--text3); margin: 8px auto 0; opacity: .6; }
.mfoot2 { display: flex; gap: 8px; padding: 12px 18px; border-top: 1px solid var(--divider); justify-content: flex-end; }
.phone .layout { grid-template-columns: 1fr; }
`;

const tabs2 = (cur, mobile) => `<div class="tabs2">${[["Übersicht", "shieldHome"], ["Sensorgruppen", "groups"]]
  .map(([t, i]) => `<span class="${t === cur ? "on" : ""}">${mobile ? (i === "groups" ? xi("groups", 20) : ic(i, 20)) : ""}${mobile && t === "Sensorgruppen" ? "Gruppen" : t}</span>`).join("")}</div>`;
const head = (cur, mobile, extra = "") => `<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">${tabs2(cur, mobile)}${extra}</div>`;
const tools = (mobile) => `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="chip on">${ic("shield", 16)} Haus ${ic("chevDown", 16)}</span>
  <div class="search" style="${mobile ? "flex:1 1 100%" : "width:300px"}">${ic("search", 18)} Sensor suchen</div>${mobile ? "" : `<span class="chip on">Alle</span><span class="chip">Türen &amp; Fenster</span><span class="chip">Bewegung</span><span class="chip">Weitere</span><span style="flex:1"></span><span class="btn">${xi("tune")} Voreinstellungen</span>`}</div>`;
const box = (on) => `<span class="cbox ${on ? "on" : ""}" style="margin:auto">${on ? ic("check", 18) : ""}</span>`;
const foot = (n) => `<div class="mfoot" style="margin:0 -24px -32px;padding:12px 24px"><span class="t2" style="font-size:13px">${n} Änderungen</span><span style="flex:1"></span><span class="btn">Abbrechen</span><span class="btn primary">${ic("check", 18)} Speichern</span></div>`;

// Detailansicht eines Sensors: Optionen mit Herkunft (Voreinstellung der Sensorart oder eigener Wert)
function detail(r) {
  return `<div class="sheet-head"><span class="av" style="width:46px;height:46px;border-radius:14px;background:var(--pri-soft);color:var(--primary)">${ic(r.icon, 24)}</span>
      <div style="flex:1;min-width:0"><h3>${r.name}</h3><div class="t2" style="font-size:13px">${r.type} · ${r.area} · Matter · ${r.bat}</div></div>${ic("close", 22, "t2")}</div>
    <div class="sheet-body"><div class="label">Zonen</div><div class="zline">${ZN.map(([k, n, i]) => `<span class="chip ${r.zones.includes(k) ? "on" : ""}">${ic(i, 16)}${n}</span>`).join("")}</div>
    <div class="label">Verhalten</div>
    ${OPTS.map((o) => {
      const on = r.on.includes(o.key);
      const own = r.custom.includes(o.key);
      const origin = own ? `<span class="origin own">${xi("undo", 13)} Eigener Wert · zurück zur Voreinstellung</span>` : `<span class="origin preset">Voreinstellung für ${r.type === "Tür" ? "Türen" : r.type}</span>`;
      return `<div class="orow"><span class="oav ${on ? "on" : ""}">${o.icon()}</span><div class="tx"><b>${o.name}</b><small>${o.hint}</small>${origin}</div><span class="toggle ${on ? "on" : ""}" style="margin-top:6px"></span></div>`;
    }).join("")}</div>`;
}

function table({ cols = false, sel = null, expand = null } = {}) {
  let area = null;
  const body = [];
  // Spalten: Sensor, drei Zonen, Eingang, (Optionen), Batterie, (Pfeil)
  const ncol = 1 + 3 + 1 + (cols ? OPTS.length - 1 : 0) + 1 + (cols ? 0 : 1);
  for (const r of ROWS) {
    if (r.area !== area) {
      area = r.area;
      body.push(`<tr class="grp"><td colspan="${ncol}">${area}</td></tr>`);
    }
    const nm = `<div class="nm"><span class="av" style="width:30px;height:30px;border-radius:9px">${ic(r.icon, 16)}</span><div>${r.name}${r.custom.length && !cols ? `<span class="custombadge" title="eigene Werte"></span>` : ""}<div class="t2" style="font-size:12px">${r.type}${!cols && r.on.length ? " · " + r.on.map((k) => OPTS.find((o) => o.key === k).short).join(", ") : ""}</div></div></div>`;
    const zones = ZN.map(([k]) => `<td class="z">${box(r.zones.includes(k))}</td>`).join("");
    const entry = `<td class="z"><span class="toggle ${r.on.includes("entry") ? "on" : ""}" style="margin:auto;display:block"></span></td>`;
    const optCells = cols ? OPTS.slice(1).map((o) => `<td class="o"><span class="oicon ${r.on.includes(o.key) ? "on" : ""} ${r.custom.includes(o.key) ? "custom" : ""}">${o.icon()}</span></td>`).join("") : "";
    const more = cols ? "" : `<td style="width:40px"><span class="cbtn" style="${expand === r.name ? "transform:rotate(90deg)" : ""}">${ic("chevRight", 16)}</span></td>`;
    body.push(`<tr class="${sel === r.name ? "sel" : ""}"><td>${nm}</td>${zones}${entry}${optCells}<td>${r.bat}</td>${more}</tr>`);
    if (expand === r.name) {
      body.push(`<tr class="expand"><td colspan="${ncol}"><div class="ogrid">${OPTS.map((o) => {
        const on = r.on.includes(o.key);
        return `<div class="ocard ${on ? "on" : ""}"><div class="top"><span class="oav ${on ? "on" : ""}">${o.icon()}</span><span class="toggle ${on ? "on" : ""}"></span></div><b style="font-weight:500">${o.name}</b><small>${o.hint}</small><span class="origin ${r.custom.includes(o.key) ? "own" : "preset"}">${r.custom.includes(o.key) ? `${xi("undo", 13)} Eigener Wert` : "Voreinstellung"}</span></div>`;
      }).join("")}</div></td></tr>`);
    }
  }
  const optHead = cols ? OPTS.slice(1).map((o) => `<th class="o" title="${o.name}"><span class="oicon" style="color:var(--text2)">${o.icon()}</span></th>`).join("") : "";
  return `<div class="card gt"><table><tr><th>Sensor</th>${ZN.map(([, n]) => `<th class="z">${n}<small>Alle</small></th>`).join("")}<th class="z">Eingangs&shy;verzögerung</th>${optHead}<th>Batterie</th>${cols ? "" : "<th></th>"}</tr>${body.join("")}</table></div>`;
}

// ----- Optionen A: Zeile antippen öffnet Seitenblatt (Handy: Blatt von unten) -----
export function optionsA({ mobile = false } = {}) {
  const r = ROWS[4];
  if (mobile) {
    return `<div class="content">${head("Sensorgruppen", true)}${tools(true)}<div class="ag" style="margin-top:4px">Wohnzimmer</div>
      <div class="card mcard"><div style="display:flex;gap:10px;align-items:center"><span class="av">${ic("door", 18)}</span><div style="flex:1">Terrassentür<div class="t2" style="font-size:12px">Tür · Matter · 55 %</div></div><span class="cbtn">${ic("chevRight", 16)}</span></div></div></div>
      <div class="backdrop"></div><div class="bsheet"><div class="grab"></div>${detail(r)}<div class="mfoot2"><span class="btn">Abbrechen</span><span class="btn primary">Übernehmen</span></div></div>`;
  }
  return `<div class="content">${head("Sensorgruppen", false)}${tools(false)}<div class="layout">${table({ sel: r.name })}<div class="card sheet">${detail(r)}</div></div>${foot(2)}</div>`;
}

// ----- Optionen B: alle Optionen als Spalten mit Symbolen -----
export function optionsB({ mobile = false } = {}) {
  if (mobile) {
    const r = ROWS[0];
    return `<div class="content">${head("Sensorgruppen", true)}${tools(true)}<div class="ag">Flur</div>
      <div class="card mcard"><div style="display:flex;gap:10px;align-items:center"><span class="av">${ic("door", 18)}</span><div style="flex:1">Haustür<div class="t2" style="font-size:12px">Tür · Matter · 72 %</div></div></div>
      <div class="zchips">${ZN.map(([k, n, i]) => `<span class="zchip ${r.zones.includes(k) ? "on" : ""}">${ic(i, 16)}${n}</span>`).join("")}</div>
      <div class="zchips" style="grid-template-columns:repeat(5,1fr)">${OPTS.map((o) => `<span class="zchip ${r.on.includes(o.key) ? "on" : ""}" style="flex-direction:column;height:58px;font-size:11px;gap:3px">${o.icon()}${o.short}</span>`).join("")}</div></div></div>`;
  }
  const legend = `<div class="legend">${OPTS.slice(1).map((o) => `<span>${o.icon()}${o.name}</span>`).join("")}<span><span class="oicon custom" style="width:18px;height:18px;margin:0"></span>eigener Wert (sonst Voreinstellung)</span></div>`;
  return `<div class="content">${head("Sensorgruppen", false)}${tools(false)}${legend}${table({ cols: true })}${foot(2)}</div>`;
}

// ----- Optionen C: Zeile aufklappen -----
export function optionsC() {
  return `<div class="content">${head("Sensorgruppen", false)}${tools(false)}${table({ expand: "Terrassentür" })}${foot(2)}</div>`;
}

// ----- Voreinstellungen je Sensorart (Fenster aus dem Knopf "Voreinstellungen") -----
export function presets() {
  const rows = PRESETS.map((p) => `<tr><td><div class="nm"><span class="av" style="width:30px;height:30px;border-radius:9px">${ic(p.icon, 16)}</span>${p.type}</div></td>${OPTS.map((o) => `<td class="o">${box(p.on.includes(o.key))}</td>`).join("")}</tr>`).join("");
  return `<div class="content">${head("Sensorgruppen", false)}${tools(false)}<div style="filter:brightness(.55);pointer-events:none">${table({})}</div>
    <div class="card" style="position:absolute;left:50%;top:110px;transform:translateX(-50%);width:860px;box-shadow:var(--shadow)">
      <div class="sheet-head"><span class="av" style="width:46px;height:46px;border-radius:14px;background:var(--pri-soft);color:var(--primary)">${xi("tune", 24)}</span><div style="flex:1"><h3>Voreinstellungen je Sensorart</h3><div class="t2" style="font-size:13px">Gelten für alle Sensoren dieser Art, solange ein Sensor keinen eigenen Wert hat.</div></div>${ic("close", 22, "t2")}</div>
      <div class="gt preset-tbl" style="padding:4px 8px"><table><tr><th>Sensorart</th>${OPTS.map((o) => `<th class="o" style="width:120px">${o.name}</th>`).join("")}</tr>${rows}</table></div>
      <div class="mfoot2"><span class="t2" style="font-size:13px;margin-right:auto">3 Sensoren haben eigene Werte</span><span class="btn">Standard wiederherstellen</span><span class="btn primary">Speichern</span></div></div></div>`;
}

// ----- Bereit zum Scharfschalten -----
const SYS = [
  { name: "Haus", st: "Deaktiviert", color: "var(--success)", soft: "var(--ok-soft)", icon: "shieldOff", ready: { home: true, away: false, night: true }, open: ["Bewegung Wohnzimmer"], night: true },
  { name: "Garage", st: "Deaktiviert", color: "var(--success)", soft: "var(--ok-soft)", icon: "shieldOff", ready: { home: false, away: false }, open: ["Garagentor"], night: false },
];
function readyCard(s, variant) {
  const modes = [["off", "Aus", "shieldOff"], ["home", "Anwesend", "shieldHome"], ["away", "Abwesend", "shieldAway"], ...(s.night ? [["night", "Nacht", "moon"]] : [])];
  const seg = `<div class="seg" style="align-self:stretch">${modes.map(([k, l, i]) => `<span class="${k === "off" ? "on" : ""}" style="flex:1;justify-content:center">${ic(i, 16)}${l}${variant === "A" && k !== "off" ? `<i class="mode-dot ${s.ready[k] ? "ok" : "no"}"></i>` : ""}</span>`).join("")}</div>`;
  const ready = variant === "B" ? `<div class="ready"><span class="t2" style="margin-right:4px">Bereit für</span>${modes.slice(1).map(([k, l]) => `<span class="chipok ${s.ready[k] ? "ok" : "no"}">${s.ready[k] ? ic("check", 14) : ic("alert", 14)}${l}</span>`).join("")}</div>` : "";
  const why = s.open.map((o) => `<div class="rowx"><span class="av open" style="width:28px;height:28px;border-radius:8px">${ic(o === "Garagentor" ? "garage" : "motion", 16)}</span><span class="grow">${o} ist offen${variant === "A" ? ` <span class="t2" style="font-size:12px">· verhindert ${o === "Garagentor" ? "Anwesend, Abwesend" : "Abwesend"}</span>` : ""}</span></div>`).join("");
  return `<div class="card sys"><div class="top"><div class="shieldav" style="background:${s.soft};color:${s.color}">${ic(s.icon, 28)}</div><div style="flex:1"><h2>${s.name}</h2><div class="st" style="color:${s.color}">${s.st}</div><div class="sub">seit 07:55 · Wandtablet</div></div><span class="cbtn">${ic("chevRight", 16)}</span></div>
    ${seg}<div class="rows">${ready}${why}</div></div>`;
}
export function readyView(variant, { mobile = false } = {}) {
  const ent = mobile ? "" : `<div class="card entbox"><div class="label" style="margin-bottom:8px">Neue Entitäten (für Automationen, Wandtablet, Apple Home)</div>
    <div style="display:grid;grid-template-columns:auto 1fr;gap:6px 18px"><code>binary_sensor.haus_bereit_anwesend</code><span>ein: Anwesend lässt sich jetzt scharf schalten</span>
    <code>binary_sensor.haus_bereit_abwesend</code><span>aus: Bewegung Wohnzimmer ist offen (Attribut <code>blocking_sensors</code>)</span>
    <code>binary_sensor.haus_bereit_nacht</code><span>nur mit Modus "Nacht"</span></div></div>`;
  const legend = variant === "A" && !mobile ? `<div class="legend"><span><i class="mode-dot ok"></i>bereit zum Scharfschalten</span><span><i class="mode-dot no"></i>nicht bereit, ein Sensor ist offen</span></div>` : "";
  return `<div class="content">${head("Übersicht", mobile, mobile ? "" : `<span style="flex:1"></span><span class="btn">${ic("plus", 18)} Alarmanlage</span>`)}${legend}<div class="sysgrid">${SYS.map((s) => readyCard(s, variant)).join("")}</div>${ent}</div>`;
}

export { page };
