// Ansicht "Übersicht": alle Alarmanlagen. Variante A (Karten) und B (Leitstand).
import { ic, tabs, SENSORS, battHtml, TYPE_ICON } from "./base.mjs";

export const SYSTEMS = [
  { name: "Haus", state: "away", since: "seit 08:12", by: "Diego", zonesN: 9, open: [], hints: ["Fenster Bad: Batterie 19 %"], night: true },
  { name: "Garage", state: "off", since: "seit gestern 18:40", by: "Automation", zonesN: 3, open: ["Garagentor"], hints: [], night: false },
  { name: "Gartenhaus", state: "arming", since: "noch 0:42", by: "Apple Home", zonesN: 2, open: [], hints: [], night: false },
];

const STATE = {
  off: { text: "Deaktiviert", color: "var(--success)", soft: "var(--ok-soft)", icon: "shieldOff" },
  home: { text: "Anwesend scharf", color: "var(--primary)", soft: "var(--pri-soft)", icon: "shieldHome" },
  away: { text: "Abwesend scharf", color: "var(--primary)", soft: "var(--pri-soft)", icon: "shieldAway" },
  night: { text: "Nacht scharf", color: "var(--primary)", soft: "var(--pri-soft)", icon: "moon" },
  arming: { text: "Wird scharf · Abwesend", color: "var(--warning)", soft: "var(--warn-soft)", icon: "timer" },
  pending: { text: "Eingangsverzögerung", color: "var(--warning)", soft: "var(--warn-soft)", icon: "timer" },
  triggered: { text: "Alarm", color: "var(--error)", soft: "var(--err-soft)", icon: "alert" },
};

// Auswahl des Modus als Reiterleiste mit Kapsel (Design-Regel)
const modeSeg = (s, big = false) => {
  const cur = s.state === "arming" ? "away" : s.state;
  const items = [["off", "Aus", "shieldOff"], ["home", "Anwesend", "shieldHome"], ["away", "Abwesend", "shieldAway"], ...(s.night ? [["night", "Nacht", "moon"]] : [])];
  return `<div class="seg ${big ? "big" : ""}">${items.map(([k, l, i]) => `<span class="${k === cur ? "on" : ""}">${ic(i, 16)}${l}</span>`).join("")}</div>`;
};

export const CSS_O = `
.sysgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 16px; }
.sys { padding: 18px; display: flex; flex-direction: column; gap: 14px; }
.sys .top { display: flex; gap: 14px; align-items: center; }
.shieldav { width: 52px; height: 52px; border-radius: 15px; display: grid; place-items: center; flex: none; }
.sys h2 { margin: 0; font-size: 21px; font-weight: 500; }
.sys .st { font-size: 14px; font-weight: 500; }
.sys .sub { font-size: 12.5px; color: var(--text2); margin-top: 2px; }
.sys .seg { align-self: stretch; } .sys .seg span { flex: 1; justify-content: center; }
.rows { display: flex; flex-direction: column; border-top: 1px solid var(--divider); }
.rowx { display: flex; align-items: center; gap: 10px; padding: 10px 2px; border-bottom: 1px solid var(--divider); font-size: 13.5px; }
.rowx:last-child { border-bottom: 0; }
.rowx .grow { flex: 1; min-width: 0; }
.addcard { border: 1.5px dashed var(--divider); border-radius: 18px; display: grid; place-items: center; min-height: 220px; color: var(--text2); gap: 8px; }
.log { padding: 6px 18px; }
.log .rowx { font-size: 13px; }
.log time { color: var(--text2); width: 52px; font-variant-numeric: tabular-nums; flex: none; }
.split { display: grid; grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr); gap: 16px; align-items: start; }
.alarmbar { border-radius: 18px; padding: 16px 18px; background: var(--error); color: #fff; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.alarmbar b { font-size: 18px; font-weight: 500; }
.alarmbar .btn { background: #fff; color: var(--error); border-color: #fff; margin-left: auto; height: 42px; font-size: 15px; }
.phone .sysgrid { grid-template-columns: 1fr; gap: 12px; }
.phone .split { grid-template-columns: 1fr; }
.phone .sys { padding: 14px; gap: 12px; }
.phone .sys .seg span { padding: 9px 4px; font-size: 13px; }
.phone .alarmbar .btn { margin-left: 0; width: 100%; justify-content: center; }
`;

function sysCard(s) {
  const st = STATE[s.state];
  const rows = [];
  rows.push(`<div class="rowx">${ic("shield", 18, "t2")}<span class="grow">${s.zonesN} Sensoren überwacht</span>${s.open.length ? `<span class="pill warn">${s.open.length} offen</span>` : `<span class="pill ok">alle zu</span>`}</div>`);
  for (const o of s.open) rows.push(`<div class="rowx"><span class="av open" style="width:28px;height:28px;border-radius:8px">${ic("garage", 16)}</span><span class="grow">${o} ist offen</span><span class="t2" style="font-size:12px">seit 12 Min.</span></div>`);
  for (const h of s.hints) rows.push(`<div class="rowx">${ic("battery", 18)}<span class="grow">${h}</span><span class="cbtn">${ic("chevRight", 16)}</span></div>`);
  return `<div class="card sys"><div class="top"><div class="shieldav" style="background:${st.soft};color:${st.color}">${ic(st.icon, 28)}</div>
    <div style="flex:1;min-width:0"><h2>${s.name}</h2><div class="st" style="color:${st.color}">${st.text}</div><div class="sub">${s.since} · ${s.by}</div></div><span class="cbtn">${ic("chevRight", 16)}</span></div>
    ${modeSeg(s)}<div class="rows">${rows.join("")}</div></div>`;
}

const LOG = [
  ["10:41", "Gartenhaus", "Wird scharf (Abwesend) · Apple Home"],
  ["10:28", "Garage", "Garagentor geöffnet"],
  ["08:12", "Haus", "Abwesend scharf · Diego"],
  ["07:55", "Haus", "Deaktiviert · Wandtablet"],
  ["gestern", "Haus", "Fenster Bad: Batterie unter 20 %"],
];
const logCard = () => `<div><div class="label" style="margin:0 4px 8px">Letzte Ereignisse</div><div class="card log"><div class="rows" style="border-top:0">${LOG.map(([t, s, m]) => `<div class="rowx"><time>${t}</time><span class="grow"><b style="font-weight:500">${s}</b> · ${m}</span></div>`).join("")}</div></div></div>`;

export function overviewA({ mobile = false, alarm = false } = {}) {
  const systems = alarm ? [{ ...SYSTEMS[0], state: "triggered", since: "seit 10:44 · Fenster Küche" }, SYSTEMS[1], SYSTEMS[2]] : SYSTEMS;
  const bar = alarm ? `<div class="alarmbar">${ic("alert", 30)}<div><b>Alarm im Haus</b><div style="opacity:.9;font-size:13px;margin-top:2px">Fenster Küche geöffnet um 10:44 · Sirene läuft · Push an 2 Handys</div></div><span class="btn">${ic("shieldOff", 18)} Deaktivieren</span></div>` : "";
  const head = mobile ? tabs("Übersicht", true) : `<div style="display:flex;align-items:center;gap:12px">${tabs("Übersicht")}<span style="flex:1"></span><span class="btn">${ic("plus", 18)} Alarmanlage</span></div>`;
  return `<div class="content">${head}${bar}
    <div class="sysgrid">${systems.map(sysCard).join("")}</div>
    ${logCard()}</div>`;
}

// --- Variante B: Leitstand -------------------------------------------------------
export const CSS_OB = `
.lead { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 16px; align-items: start; }
.syslist { padding: 6px; display: flex; flex-direction: column; gap: 2px; }
.syslist .it { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 14px; }
.syslist .it.on { background: var(--pri-soft); }
.syslist .it b { font-weight: 500; display: block; font-size: 15px; }
.hero { padding: 22px; display: grid; grid-template-columns: auto 1fr; gap: 22px; align-items: center; }
.bigshield { width: 120px; height: 120px; border-radius: 34px; display: grid; place-items: center; }
.hero h2 { margin: 0; font-size: 28px; font-weight: 500; }
.modes { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 16px; }
.mode { border: 1px solid var(--divider); border-radius: 16px; padding: 14px; display: flex; flex-direction: column; gap: 6px; background: var(--card); }
.mode.on { border-color: var(--primary); background: var(--pri-soft); color: var(--primary); }
.mode small { color: var(--text2); font-size: 12px; }
.areas { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 12px; }
.area { padding: 14px; }
.area h3 { margin: 0 0 8px; font-size: 15px; font-weight: 500; display: flex; justify-content: space-between; align-items: center; }
.srow { display: flex; align-items: center; gap: 10px; padding: 6px 0; font-size: 13px; }
.srow .grow { flex: 1; min-width: 0; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--success); flex: none; }
.dot.open { background: var(--warning); } .dot.idle { background: var(--text3); }
.phone .lead { grid-template-columns: 1fr; }
.phone .hero { grid-template-columns: 1fr; justify-items: center; text-align: center; padding: 18px 14px; gap: 12px; }
.phone .bigshield { width: 92px; height: 92px; border-radius: 28px; }
.phone .modes { grid-template-columns: repeat(2, 1fr); }
.phone .areas { grid-template-columns: 1fr; }
`;

export function overviewB({ mobile = false } = {}) {
  const s = SYSTEMS[0];
  const st = STATE[s.state];
  const list = mobile
    ? `<div class="seg" style="align-self:stretch">${SYSTEMS.map((x, i) => `<span class="${i === 0 ? "on" : ""}" style="flex:1;justify-content:center">${x.name}</span>`).join("")}</div>`
    : `<div class="card syslist">${SYSTEMS.map((x, i) => {
        const xs = STATE[x.state];
        return `<div class="it ${i === 0 ? "on" : ""}"><div class="shieldav" style="width:40px;height:40px;border-radius:12px;background:${xs.soft};color:${xs.color}">${ic(xs.icon, 22)}</div><div style="flex:1;min-width:0"><b>${x.name}</b><span style="font-size:12.5px;color:${xs.color}">${xs.text}</span></div></div>`;
      }).join("")}<div class="it t2">${ic("plus", 20)} Alarmanlage hinzufügen</div></div>`;
  const n = (z) => SENSORS.filter((x) => x.zones.includes(z)).length;
  const modes = [["off", "Aus", "shieldOff", "Kein Sensor überwacht"], ["home", "Anwesend", "shieldHome", `${n("home")} Sensoren`], ["away", "Abwesend", "shieldAway", `${n("away")} Sensoren · 60 s Verzögerung`], ["night", "Nacht", "moon", `${n("night")} Sensoren`]];
  const areas = {};
  for (const x of SENSORS.filter((x) => x.zones.length)) (areas[x.area] ??= []).push(x);
  const detail = `<div style="display:flex;flex-direction:column;gap:16px;min-width:0">
    <div class="card hero"><div class="bigshield" style="background:${st.soft};color:${st.color}">${ic(st.icon, mobile ? 52 : 64)}</div>
      <div style="min-width:0;width:100%"><h2>${s.name}</h2><div style="color:${st.color};font-size:16px;font-weight:500;margin-top:2px">${st.text}</div><div class="t2" style="font-size:13px;margin-top:2px">${s.since} · ${s.by}</div>
      <div class="modes">${modes.map(([k, l, i, sub]) => `<div class="mode ${k === s.state ? "on" : ""}">${ic(i, 22)}<b style="font-weight:500">${l}</b><small>${sub}</small></div>`).join("")}</div></div></div>
    <div class="label" style="margin:2px 4px -6px">Überwachte Sensoren nach Bereich</div>
    <div class="areas">${Object.entries(areas).map(([a, xs]) => `<div class="card area"><h3>${a}${xs.some((x) => x.open) ? `<span class="pill warn">offen</span>` : `<span class="pill ok">zu</span>`}</h3>${xs.map((x) => `<div class="srow"><span class="dot ${x.open ? "open" : ""}"></span>${ic(TYPE_ICON[x.type], 16, "t2")}<span class="grow">${x.name}</span>${battHtml(x.bat)}</div>`).join("")}</div>`).join("")}</div></div>`;
  return `<div class="content">${tabs("Übersicht", mobile)}<div class="lead">${list}${detail}</div></div>`;
}
