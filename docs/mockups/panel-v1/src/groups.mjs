// Ansicht "Sensorgruppen": Variante A (Spalten mit Ziehen), B (Tabelle), C (Bereiche).
import { ic, tabs, SENSORS, ZONES, battHtml, TYPE_ICON } from "./base.mjs";

const byArea = (list) => {
  const out = {};
  for (const s of list) (out[s.area] ??= []).push(s);
  return out;
};
const sysHead = (mobile) => `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
  <span class="chip on">${ic("shield", 16)} Haus ${ic("chevDown", 16)}</span>
  ${mobile ? "" : `<span class="t2" style="font-size:13px">Änderungen gelten erst mit "Speichern"</span>`}
  <span style="flex:1"></span>${mobile ? "" : `<span class="btn">Abbrechen</span><span class="btn primary">${ic("check", 18)} Speichern</span>`}</div>`;
const footMobile = `<div class="mfoot"><span class="t2" style="font-size:13px">2 Änderungen</span><span style="flex:1"></span><span class="btn">Abbrechen</span><span class="btn primary">Speichern</span></div>`;

export const CSS_G = `
.mfoot { position: sticky; bottom: 0; display: flex; gap: 8px; align-items: center; padding: 10px 12px; background: var(--card); border-top: 1px solid var(--divider); margin: 0 -12px -24px; }
.entry { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; color: #b45309; background: var(--warn-soft); padding: 2px 7px; border-radius: 999px; }
/* Variante A: Spalten */
.ga { display: grid; grid-template-columns: minmax(340px, 1.1fr) minmax(0, 3fr); gap: 16px; align-items: start; }
.pool { padding: 14px; display: flex; flex-direction: column; gap: 10px; position: sticky; top: 0; }
.pool .chips { display: flex; gap: 6px; flex-wrap: wrap; }
.ag { font-size: 12px; color: var(--text2); margin: 6px 2px 0; font-weight: 500; }
.srow { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 12px; border: 1px solid var(--divider); background: var(--card); font-size: 13.5px; }
.srow .grip { color: var(--text3); }
.srow .grow { flex: 1; min-width: 0; }
.srow small { display: block; color: var(--text2); font-size: 11.5px; }
.srow.ghost { opacity: .35; }
.srow.lift { box-shadow: var(--shadow); transform: rotate(-1.5deg); border-color: var(--primary); }
.zcols { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.zcol { padding: 14px; display: flex; flex-direction: column; gap: 8px; min-height: 420px; }
.zcol h3 { margin: 0; font-size: 16px; font-weight: 500; display: flex; align-items: center; gap: 8px; }
.zcol .hint { font-size: 12px; color: var(--text2); margin: -4px 0 4px; }
.drop { border: 1.5px dashed var(--primary); background: var(--pri-soft); border-radius: 12px; height: 46px; display: grid; place-items: center; color: var(--primary); font-size: 13px; }
.zcol .srow .x { color: var(--text3); }
.zsum { font-size: 12px; color: var(--text2); margin-top: auto; padding-top: 6px; border-top: 1px solid var(--divider); }
/* Handy A: Reiter je Zone, Antippen statt Ziehen */
.mlist { display: flex; flex-direction: column; gap: 6px; }
.mrow { display: flex; align-items: center; gap: 12px; padding: 10px 12px; min-height: 52px; border-radius: 14px; background: var(--card); border: 1px solid var(--divider); }
.mrow .grow { flex: 1; min-width: 0; font-size: 14px; }
.mrow small { display: block; color: var(--text2); font-size: 12px; }
.cbox { width: 26px; height: 26px; border-radius: 8px; border: 2px solid var(--text3); display: grid; place-items: center; flex: none; color: #fff; }
.cbox.on { background: var(--primary); border-color: var(--primary); }
/* Variante B: Tabelle */
.gt { overflow-x: auto; }
.gt table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13.5px; }
.gt th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: .03em; color: var(--text2); font-weight: 500; padding: 12px 14px; border-bottom: 1px solid var(--divider); white-space: nowrap; }
.gt th.z, .gt td.z { text-align: center; width: 110px; }
.gt th small { display: block; text-transform: none; letter-spacing: 0; font-weight: 400; color: var(--primary); margin-top: 3px; }
.gt td { padding: 8px 14px; border-bottom: 1px solid var(--divider); vertical-align: middle; }
.gt tr.grp td { background: var(--subtle); font-weight: 500; font-size: 13px; padding: 8px 14px; }
.gt td.z .cbox { margin: auto; }
.gt td.z .toggle { display: block; }
.gt tr.sel td.z.hl { background: var(--pri-soft); }
.gt .nm { display: flex; align-items: center; gap: 10px; }
.mcard { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.zchips { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.zchip { height: 40px; border-radius: 12px; border: 1px solid var(--divider); display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-size: 13px; color: var(--text2); }
.zchip.on { background: var(--primary); border-color: var(--primary); color: #fff; }
/* Variante C: Bereiche */
.zbar { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.zb { padding: 12px 14px; display: flex; align-items: center; gap: 12px; }
.zb.over { outline: 2px dashed var(--primary); outline-offset: 2px; background: var(--pri-soft); }
.zb b { font-weight: 500; font-size: 15px; display: block; }
.atiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
.atile { padding: 14px; display: flex; flex-direction: column; gap: 8px; }
.atile.lift { box-shadow: var(--shadow); transform: rotate(-1deg); border-color: var(--primary); }
.atile h3 { margin: 0; font-size: 16px; font-weight: 500; display: flex; align-items: center; gap: 8px; }
.zmini { display: inline-flex; gap: 4px; }
.zmini span { width: 30px; height: 26px; border-radius: 8px; display: grid; place-items: center; border: 1px solid var(--divider); color: var(--text3); }
.zmini span.on { background: var(--primary); border-color: var(--primary); color: #fff; }
.arow { display: flex; align-items: center; gap: 10px; font-size: 13.5px; padding: 4px 0; }
.arow .grow { flex: 1; min-width: 0; }
.phone .ga { grid-template-columns: 1fr; }
.phone .zbar { grid-template-columns: repeat(3, 1fr); gap: 6px; }
.phone .zb { padding: 10px 6px; flex-direction: column; gap: 4px; text-align: center; }
.phone .zb b { font-size: 13px; } .phone .zb .t2 { display: none; }
.phone .atiles { grid-template-columns: 1fr; }
.phone .zmini span { width: 36px; height: 32px; }
`;

const srow = (s, { grip = true, x = false, cls = "" } = {}) =>
  `<div class="srow ${cls}">${grip ? ic("drag", 18, "grip") : ""}<span class="av ${s.open ? "open" : ""}" style="width:30px;height:30px;border-radius:9px">${ic(TYPE_ICON[s.type], 16)}</span><span class="grow">${s.name}${s.entry ? ` <span class="entry">${ic("timer", 12)}Eingang</span>` : ""}<small>${s.area} · ${s.conn}</small></span>${battHtml(s.bat)}${x ? ic("close", 16, "x") : ""}</div>`;

// Variante A: Spalten je Zone, Sensoren von links in die Zonen ziehen
export function groupsA({ mobile = false } = {}) {
  if (mobile) {
    const zone = "away";
    const areas = byArea(SENSORS);
    return `<div class="content">${tabs("Sensorgruppen", true)}${sysHead(true)}
      <div class="seg" style="align-self:stretch">${ZONES.map((z) => `<span class="${z.key === zone ? "on" : ""}" style="flex:1;justify-content:center">${ic(z.icon, 16)}${z.name}</span>`).join("")}</div>
      <div class="t2" style="font-size:13px;margin:0 2px">Antippen, um Sensoren der Zone "Abwesend" zuzuordnen. 9 von 11 gewählt.</div>
      <div class="search">${ic("search", 18)} Sensor suchen</div>
      <div class="mlist">${Object.entries(areas).map(([a, xs]) => `<div class="ag">${a}</div>${xs.map((s) => {
        const on = s.zones.includes(zone);
        return `<div class="mrow"><span class="av ${s.open ? "open" : ""}">${ic(TYPE_ICON[s.type], 18)}</span><span class="grow">${s.name}${s.entry ? ` <span class="entry">${ic("timer", 12)}Eingang</span>` : ""}<small>${s.conn} · ${s.bat == null ? "Netz" : s.bat + " %"}</small></span><span class="cbox ${on ? "on" : ""}">${on ? ic("check", 18) : ""}</span></div>`;
      }).join("")}`).join("")}</div>${footMobile}</div>`;
  }
  const areas = byArea(SENSORS);
  const zm = (s) => `<span class="zmini">${ZONES.map((z) => `<span class="${s.zones.includes(z.key) ? "on" : ""}" style="width:22px;height:20px;border-radius:6px">${ic(z.icon, 12)}</span>`).join("")}</span>`;
  const prow = (s) => `<div class="srow ${s.id === "s2" ? "ghost" : ""}">${ic("drag", 18, "grip")}<span class="av ${s.open ? "open" : ""}" style="width:30px;height:30px;border-radius:9px">${ic(TYPE_ICON[s.type], 16)}</span><span class="grow">${s.name}<small>${s.conn} · ${s.bat == null ? "Netz" : s.bat + " %"}</small></span>${zm(s)}</div>`;
  const col = (z) => {
    const members = SENSORS.filter((s) => s.zones.includes(z.key));
    const dragging = z.key === "night";
    return `<div class="card zcol"><h3>${ic(z.icon, 20)}${z.name}<span class="pill none" style="margin-left:auto">${members.length}</span></h3><div class="hint">${z.hint}</div>
      ${dragging ? `<div class="drop">Hier loslassen: Bewegung Flur</div>` : ""}
      ${members.map((s) => srow(s, { grip: false, x: true })).join("")}
      <div class="zsum">${members.filter((s) => s.entry).length} mit Eingangsverzögerung · ${z.key === "away" ? "Ausgangsverzögerung 60 s" : "keine Ausgangsverzögerung"}</div></div>`;
  };
  return `<div class="content">${tabs("Sensorgruppen")}${sysHead(false)}
    <div class="ga">
      <div class="card pool"><b style="font-weight:500;font-size:15px">Sensoren</b>
        <div class="search">${ic("search", 18)} Sensor suchen</div>
        <div class="chips"><span class="chip on">Alle</span><span class="chip">Türen</span><span class="chip">Fenster</span><span class="chip">Bewegung</span><span class="chip">Rauch</span></div>
        ${Object.entries(areas).map(([a, xs]) => `<div class="ag">${a}</div>${xs.map(prow).join("")}`).join("")}
        <div class="t2" style="font-size:12px;margin-top:4px">In eine Zone ziehen. Ein Sensor kann in mehreren Zonen sein. Pfeiltasten auf dem Griff gehen auch.</div>
      </div>
      <div style="position:relative"><div class="zcols">${ZONES.map(col).join("")}</div>
        <div style="position:absolute;right:-6px;top:58px;width:290px">${srow(SENSORS[1], { cls: "lift" })}</div></div>
    </div></div>`;
}

// Variante B: Tabelle, Zonen als Spalten, Ziehen über mehrere Felder setzt alle
export function groupsB({ mobile = false } = {}) {
  const areas = byArea(SENSORS);
  if (mobile) {
    return `<div class="content">${tabs("Sensorgruppen", true)}${sysHead(true)}<div class="search">${ic("search", 18)} Sensor suchen</div>
      ${Object.entries(areas).slice(0, 3).map(([a, xs]) => `<div class="ag">${a}</div>${xs.map((s) => `<div class="card mcard"><div style="display:flex;gap:10px;align-items:center"><span class="av ${s.open ? "open" : ""}">${ic(TYPE_ICON[s.type], 18)}</span><div style="flex:1;min-width:0">${s.name}<div class="t2" style="font-size:12px">${s.conn} · ${s.bat == null ? "Netz" : s.bat + " %"}</div></div>${s.entry ? `<span class="entry">${ic("timer", 12)}Eingang</span>` : ""}</div>
        <div class="zchips">${ZONES.map((z) => `<span class="zchip ${s.zones.includes(z.key) ? "on" : ""}">${ic(z.icon, 16)}${z.name}</span>`).join("")}</div></div>`).join("")}`).join("")}${footMobile}</div>`;
  }
  const rows = Object.entries(areas).map(([a, xs]) => `<tr class="grp"><td colspan="7">${a} · ${xs.length}</td></tr>${xs.map((s) => {
    const sel = s.area === "Wohnzimmer";
    return `<tr class="${sel ? "sel" : ""}"><td><div class="nm"><span class="av ${s.open ? "open" : ""}" style="width:30px;height:30px;border-radius:9px">${ic(TYPE_ICON[s.type], 16)}</span>${s.name}</div></td>
      ${ZONES.map((z) => `<td class="z ${sel && z.key === "night" ? "hl" : ""}"><span class="cbox ${s.zones.includes(z.key) ? "on" : ""}">${s.zones.includes(z.key) ? ic("check", 18) : ""}</span></td>`).join("")}
      <td class="z"><span class="toggle ${s.entry ? "on" : ""}" style="margin:auto"></span></td><td>${s.conn}</td><td>${battHtml(s.bat)}</td></tr>`;
  }).join("")}`).join("");
  return `<div class="content">${tabs("Sensorgruppen")}${sysHead(false)}
    <div style="display:flex;gap:10px;align-items:center"><div class="search" style="width:360px">${ic("search", 18)} Sensor suchen</div><span class="chip on">Alle</span><span class="chip">Türen</span><span class="chip">Fenster</span><span class="chip">Bewegung</span>
      <span class="t2" style="margin-left:auto;font-size:12.5px">${ic("hand", 16, "t2")}</span><span class="t2" style="font-size:12.5px">Über mehrere Felder ziehen setzt alle auf einmal</span></div>
    <div class="card gt"><table><tr><th>Sensor</th>${ZONES.map((z) => `<th class="z">${z.name}<small>Alle</small></th>`).join("")}<th class="z">Eingangs&shy;verzögerung</th><th>Funk</th><th>Batterie</th></tr>${rows}</table></div></div>`;
}

// Variante C: Kacheln nach Bereich, ganzer Bereich lässt sich auf eine Zone ziehen
export function groupsC({ mobile = false } = {}) {
  const areas = byArea(SENSORS);
  const zbar = `<div class="zbar">${ZONES.map((z) => {
    const n = SENSORS.filter((s) => s.zones.includes(z.key)).length;
    return `<div class="card zb ${z.key === "night" && !mobile ? "over" : ""}">${ic(z.icon, 24)}<div><b>${z.name}</b><span class="t2" style="font-size:12px">${n} Sensoren</span></div>${mobile ? `<span style="font-size:12px" class="t2">${n}</span>` : ""}</div>`;
  }).join("")}</div>`;
  const tile = ([a, xs], lift) => `<div class="card atile ${lift ? "lift" : ""}"><h3>${ic("drag", 18, "t3")}${a}<span class="t2" style="font-size:12px;font-weight:400">${xs.length}</span>
      <span class="zmini" style="margin-left:auto">${ZONES.map((z) => `<span class="${xs.every((s) => s.zones.includes(z.key)) ? "on" : ""}" title="${z.name}">${ic(z.icon, 15)}</span>`).join("")}</span></h3>
    ${xs.map((s) => `<div class="arow"><span class="av ${s.open ? "open" : ""}" style="width:28px;height:28px;border-radius:8px">${ic(TYPE_ICON[s.type], 15)}</span><span class="grow">${s.name}${s.entry ? ` <span class="entry">${ic("timer", 12)}Eingang</span>` : ""}</span>
      <span class="zmini">${ZONES.map((z) => `<span class="${s.zones.includes(z.key) ? "on" : ""}">${ic(z.icon, 14)}</span>`).join("")}</span></div>`).join("")}</div>`;
  const entries = Object.entries(areas);
  return `<div class="content">${tabs("Sensorgruppen", mobile)}${sysHead(mobile)}
    ${mobile ? "" : `<div class="t2" style="font-size:13px;margin:0 2px -6px">Ganzen Bereich auf eine Zone ziehen oder einzelne Sensoren mit den Symbolen zuordnen.</div>`}
    ${zbar}<div class="atiles">${entries.map((e, i) => tile(e, !mobile && e[0] === "Wohnzimmer")).join("")}</div>${mobile ? footMobile : ""}</div>`;
}
