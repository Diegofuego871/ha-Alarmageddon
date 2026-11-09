// Mockup 0.33.0: Einstellungen pro Modus vereinfacht. Eigenständig (Farben und Masse wie das Panel), erfundene Daten.
const I = {
  check: "M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z",
  door: "M19,19V5C19,3.89 18.1,3 17,3H7A2,2 0 0,0 5,5V19H3V21H21V19H19M15,13H13V11H15V13Z",
  window: "M3,3H21V21H3V3M5,5V11H11V5H5M13,5V11H19V5H13M5,13V19H11V13H5M13,13V19H19V13H13Z",
  motion: "M13.5,5.5C14.59,5.5 15.5,4.58 15.5,3.5C15.5,2.38 14.59,1.5 13.5,1.5C12.39,1.5 11.5,2.38 11.5,3.5C11.5,4.58 12.39,5.5 13.5,5.5M9.89,19.38L10.89,15L13,17V23H15V15.5L12.89,13.5L13.5,10.5C14.79,12 16.79,13 19,13V11C17.09,11 15.5,10 14.69,8.58L13.69,7C13.29,6.38 12.69,6 12,6C11.69,6 11.5,6.08 11.19,6.08L6,8.28V13H8V9.58L9.79,8.88L8.19,17L3.29,16L2.89,18L9.89,19.38Z",
  smoke: "M12,2C12,2 4,10 4,15A8,8 0 0,0 20,15C20,10 12,2 12,2Z",
  trash: "M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z",
  chev: "M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z",
  plus: "M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z",
  tune: "M3,17V19H9V17H3M3,5V7H13V5H3M13,21V19H21V17H13V15H11V21H13M7,9V11H3V13H7V15H9V9H7M21,13V11H11V13H21M15,9H17V7H21V5H17V3H15V9Z",
  home: "M12,3L2,12H5V20H19V12H22L12,3Z",
  away: "M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,22.26 21,16.55 21,11V5L12,1M12,7A2,2 0 0,1 14,9A2,2 0 0,1 12,11A2,2 0 0,1 10,9A2,2 0 0,1 12,7M12,13C14,13 16,14 16,15V16H8V15C8,14 10,13 12,13Z",
  night: "M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95Z",
};
const ic = (n, s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${I[n]}"/></svg>`;
const MODES = [["home", "Anwesend"], ["away", "Abwesend"], ["night", "Nacht"]];
const OPTS = ["Immer aktiv", "Darf offen sein", "Umgehen", "Scharf sobald zu", "Ausfall = Alarm", "2. Sensor", "Stiller Alarm"];
// Sensoren: Name, Symbol, Bereich, Zonen (Anwesend, Abwesend, Nacht), Optionen je Modus (Index der gesetzten Optionen)
const S = [
  { n: "Haustür", i: "door", a: "Flur", z: [0, 1, 1], o: { home: [3], away: [3], night: [3] } },
  { n: "Bewegung Flur", i: "motion", a: "Flur", z: [0, 1, 0], o: { home: [1], away: [], night: [1] } },
  { n: "Rauchmelder Flur", i: "smoke", a: "Flur", z: [0, 0, 0], o: { home: [0], away: [0], night: [0] } },
  { n: "Fenster Küche", i: "window", a: "Küche", z: [1, 1, 1], o: { home: [2], away: [], night: [] } },
  { n: "Fenster Wohnzimmer", i: "window", a: "Wohnzimmer", z: [1, 1, 0], o: { home: [], away: [4], night: [] } },
  { n: "Terrassentür", i: "door", a: "Wohnzimmer", z: [1, 1, 1], o: { home: [3], away: [3, 4], night: [3] } },
];
export const CSS = `
:root { --bg: #fafafa; --card: #fff; --text: #1b1d21; --t2: #5d6573; --div: #e3e6ea; --pri: #0a8ec9; --soft: rgba(10,142,201,.14); --warn: #f59e0b; --sub: #f3f4f6; }
* { box-sizing: border-box; } body { margin: 0; background: var(--bg); color: var(--text); font: 14px/1.4 Roboto, system-ui, sans-serif; }
.wrap { padding: 20px 24px 40px; max-width: 1440px; margin: 0 auto; } .m .wrap { padding: 14px 14px 30px; }
.cap { display: inline-block; margin-bottom: 14px; padding: 4px 12px; border-radius: 999px; background: #1b1d21; color: #fff; font-size: 12px; letter-spacing: .04em; }
.tools { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 18px; }
.search { flex: 1 1 260px; max-width: 360px; height: 44px; border: 1px solid var(--div); border-radius: 999px; background: var(--card); padding: 0 18px; display: flex; align-items: center; color: var(--t2); }
.chip { height: 36px; padding: 0 14px; border: 1px solid var(--div); border-radius: 999px; background: var(--card); display: inline-flex; align-items: center; } .chip.on { background: var(--soft); color: var(--pri); border-color: transparent; }
.btn { height: 44px; padding: 0 18px; border-radius: 999px; border: 1px solid var(--div); background: var(--card); display: inline-flex; align-items: center; gap: 8px; } .btn.pri { background: var(--pri); color: #fff; border-color: var(--pri); } .grow { flex: 1; }
.sw { display: flex; align-items: center; gap: 14px; margin: 8px 0 22px; }
.sw b { display: block; font-weight: 500; } .sw small { color: var(--t2); font-size: 12.5px; }
.tg { display: inline-block; width: 46px; height: 26px; border-radius: 99px; background: #c4c9d0; position: relative; flex: none; } .tg::after { content: ""; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; } .tg.on { background: var(--pri); } .tg.on::after { left: 23px; }
.seg { display: inline-grid; margin-top: 0; grid-auto-flow: column; gap: 2px; padding: 3px; border-radius: 14px; background: rgba(27,29,33,.07); margin: 0 0 18px; }
.seg span { min-height: 38px; padding: 0 18px; display: flex; align-items: center; justify-content: center; gap: 8px; border-radius: 11px; color: #4a5160; } .seg span.on { background: var(--bg); color: var(--pri); font-weight: 500; box-shadow: inset 0 0 0 1px rgba(27,29,33,.07); }
.card { background: var(--card); border: 1px solid var(--div); border-radius: 18px; overflow: hidden; }
table { width: 100%; border-collapse: collapse; } th { text-align: center; font-size: 11px; letter-spacing: .04em; text-transform: uppercase; font-weight: 600; color: var(--t2); padding: 12px 6px; background: #eef0f3; border-bottom: 2px solid var(--div); vertical-align: bottom; } th:first-child { text-align: left; padding-left: 18px; }
td { padding: 10px 6px; border-bottom: 1px solid var(--div); text-align: center; } td:first-child { text-align: left; padding-left: 18px; }
tr.grp td { background: var(--sub); font-weight: 500; font-size: 13px; padding: 8px 18px; text-align: left; }
.nm { display: flex; align-items: center; gap: 12px; } .av { width: 34px; height: 34px; border-radius: 10px; background: var(--sub); display: grid; place-items: center; color: var(--t2); } .nm small { display: block; color: var(--t2); font-size: 12px; }
.box { width: 26px; height: 26px; border-radius: 7px; border: 2px solid #b9bfc8; display: inline-grid; place-items: center; color: #fff; } .box.on { background: var(--pri); border-color: var(--pri); }
.ro .box { opacity: .75; } /* Spalten anderer Modi: sichtbar, aber der Modus wird über den Reiter gewählt */
th.cur, td.cur { background: rgba(10,142,201,.09); } th.cur { color: var(--pri); box-shadow: inset 0 3px 0 var(--pri); }
.acts { display: flex; gap: 10px; justify-content: flex-end; align-items: center; padding-right: 14px; } .acts .go { width: 26px; height: 26px; border: 1.5px solid var(--pri); border-radius: 50%; display: grid; place-items: center; color: var(--pri); background: var(--soft); }
.sep { width: 1px; background: var(--div); }
.note { margin: 18px 0 0; color: var(--t2); font-size: 13px; max-width: 900px; }
/* Handy */
.mcard { background: var(--card); border: 1px solid var(--div); border-radius: 18px; padding: 14px; margin: 0 0 12px; } .mtop { display: flex; align-items: center; gap: 10px; } .mtop .grow { min-width: 0; }
.zb { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 12px; } .zb span { min-height: 44px; border-radius: 12px; border: 1px solid var(--div); display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 13px; color: var(--t2); } .zb span.on { background: #cfe7f3; color: #05658f; border-color: transparent; } .zb span.cur { box-shadow: 0 0 0 2px var(--pri); }
.zb.opts { grid-template-columns: repeat(2, 1fr); margin-top: 10px; } .zb.opts span.on { background: var(--pri); color: #fff; }
.lbl { margin: 12px 0 0; font-size: 11px; letter-spacing: .05em; text-transform: uppercase; color: var(--pri); font-weight: 600; }
`;
const box = (on) => `<span class="box ${on ? "on" : ""}">${on ? ic("check", 16) : ""}</span>`;
const switchRow = (on, mobile) => `<div class="sw"><span class="tg ${on ? "on" : ""}"></span><div><b>Einstellungen pro Modus</b><small>${on ? "Jeder Modus hat eigene Einstellungen. Mit den Reitern wählst du, welchen Modus du einstellst." : "Aus: Die Einstellungen eines Sensors gelten für alle Modi."}</small></div></div>`;
const toolbar = (mobile) => mobile
  ? `<div class="search" style="max-width:none;margin-bottom:12px">Sensor suchen</div><div class="tools" style="margin-bottom:14px"><span class="chip on">Alle</span><span class="chip">Türen &amp; Fenster</span><span class="chip">Bewegung</span><span class="chip">Weitere</span></div><div class="tools" style="margin-bottom:26px"><span class="btn pri">${ic("plus")}Sensoren hinzufügen</span><span class="btn">${ic("tune")}Voreinstellungen</span></div>`
  : `<div class="tools"><div class="search">Sensor suchen</div><span class="chip on">Alle</span><span class="chip">Türen &amp; Fenster</span><span class="chip">Bewegung</span><span class="chip">Weitere</span><span class="grow"></span><span class="btn pri">${ic("plus")}Sensoren hinzufügen</span><span class="btn">${ic("tune")}Voreinstellungen</span></div>`;
const tabs = (cur) => `<div class="seg">${MODES.map(([k, l]) => `<span class="${k === cur ? "on" : ""}">${ic(k)}${l}</span>`).join("")}</div>`;
const rowsBy = () => { const out = []; let a = null; for (const s of S) { if (s.a !== a) { a = s.a; out.push({ grp: a, n: S.filter((x) => x.a === a).length }); } out.push(s); } return out; };
const acts = `<div class="acts"><span style="color:#5d6573">${ic("trash")}</span><span class="go">${ic("chev", 16)}</span></div>`;

// Schalter aus: wie vor 0.32.0 (Zonen je Modus, "Immer aktiv", Eingangsverzögerung)
export function off(mobile = false) {
  const head = `<tr><th>Sensor</th>${MODES.map(([, l]) => `<th>${l}</th>`).join("")}<th>Immer aktiv</th><th>Eingangs&shy;verzögerung</th><th></th></tr>`;
  const body = rowsBy().map((r) => r.grp ? `<tr class="grp"><td colspan="7">${r.grp} · ${r.n}</td></tr>` : `<tr><td><div class="nm"><span class="av">${ic(r.i)}</span><div>${r.n}<small>${r.a}</small></div></div></td>${r.z.map((z) => `<td>${box(z)}</td>`).join("")}<td>${box(r.o.home.includes(0))}</td><td><span class="tg ${r.n === "Haustür" ? "on" : ""}" style="transform:scale(.8)"></span></td><td>${acts}</td></tr>`).join("");
  if (!mobile) return `<div class="wrap"><span class="cap">Schalter AUS: alles wie vor 0.32.0</span>${toolbar()}${switchRow(false)}<div class="card"><table>${head}${body}</table></div></div>`;
  const cards = S.map((s) => `<div class="mcard"><div class="mtop"><span class="av">${ic(s.i)}</span><div class="grow">${s.n}<div style="color:#5d6573;font-size:12px">${s.a}</div></div>${acts}</div><div class="zb">${MODES.map(([, l], i) => `<span class="${s.z[i] ? "on" : ""}">${ic(MODES[i][0], 16)}${l}</span>`).join("")}</div></div>`).join("");
  return `<div class="wrap"><span class="cap">Schalter AUS</span>${toolbar(true)}${switchRow(false)}${cards}</div>`;
}

// Schalter ein: kein "Alle Modi", Reiter für die Modi (der erste gewählt), alle Sensoren und alle Zonen-Spalten bleiben sichtbar,
// die Spalte des gewählten Modus ist hervorgehoben; die Optionen darunter gelten für den gewählten Modus
export function on(cur = "away", mobile = false) {
  const idx = MODES.findIndex(([k]) => k === cur);
  // Dieselben Spalten wie bei "Schalter aus": Zonen aller Modi und "Immer aktiv" (für den gewählten Modus); die übrigen Optionen stehen im Blatt
  const head = `<tr><th>Sensor</th>${MODES.map(([k, l]) => `<th class="${k === cur ? "cur" : ""}">${l}</th>`).join("")}<th class="cur">Immer aktiv</th><th>Eingangs&shy;verzögerung</th><th></th></tr>`;
  const body = rowsBy().map((r) => r.grp ? `<tr class="grp"><td colspan="7">${r.grp} · ${r.n}</td></tr>` : `<tr><td><div class="nm"><span class="av">${ic(r.i)}</span><div>${r.n}<small>${r.a}</small></div></div></td>${r.z.map((z, i) => `<td class="${MODES[i][0] === cur ? "cur" : ""}">${box(z)}</td>`).join("")}<td class="cur">${box(r.o[cur].includes(0))}</td><td><span class="tg ${r.n === "Haustür" ? "on" : ""}" style="transform:scale(.8)"></span></td><td>${acts}</td></tr>`).join("");
  if (!mobile) return `<div class="wrap"><span class="cap">Schalter EIN, Reiter «${MODES[idx][1]}»</span>${toolbar()}${switchRow(true)}${tabs(cur)}<div class="card"><table>${head}${body}</table></div><p class="note">Gleiche Spalten wie bei ausgeschaltetem Schalter. Die Spalte des gewählten Modus und "Immer aktiv" (gilt für diesen Modus) sind hervorgehoben, die Zonen aller Modi bleiben sichtbar. Alle weiteren Optionen (darf offen sein, umgehen, scharf sobald zu, Ausfall, zweiter Sensor, stiller Alarm) stehen im Blatt der Zeile, ebenfalls für den gewählten Modus.</p></div>`;
  const cards = S.map((s) => `<div class="mcard"><div class="mtop"><span class="av">${ic(s.i)}</span><div class="grow">${s.n}<div style="color:#5d6573;font-size:12px">${s.a}</div></div>${acts}</div>
    <div class="zb" style="grid-template-columns:repeat(4,1fr)">${MODES.map(([k, l], i) => `<span class="${s.z[i] ? "on" : ""} ${k === cur ? "cur" : ""}">${ic(k, 16)}${l}</span>`).join("")}<span class="${s.o[cur].includes(0) ? "on" : ""} cur">Immer aktiv</span></div></div>`).join("");
  return `<div class="wrap"><span class="cap">Schalter EIN</span>${toolbar(true)}${switchRow(true)}${tabs(cur)}${cards}</div>`;
}
export const page = (body, mobile) => `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${CSS}</style></head><body class="${mobile ? "m" : ""}">${body}</body></html>`;
