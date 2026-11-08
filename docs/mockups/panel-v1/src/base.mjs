// Gemeinsame Bausteine der Panel-Mockups: erfundene Daten, Symbole, Farben, Rahmen.
// Gestaltung wie ha-device-panel (docs/DESIGN.md, Präfix im Mockup ohne --ag-).

// --- Symbole (Material Design Icons) ---------------------------------------
const P = {
  shield: "M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1Z",
  shieldHome: "M12,1L3,5V11C3,16.5 6.8,21.7 12,23C17.2,21.7 21,16.5 21,11V5L12,1M12,7L17,11V17H14V13H10V17H7V11L12,7Z",
  shieldAway: "M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,5A3,3 0 0,1 15,8A3,3 0 0,1 12,11A3,3 0 0,1 9,8A3,3 0 0,1 12,5M17.13,17C15.92,18.85 14.11,20.24 12,20.92C9.89,20.24 8.08,18.85 6.87,17C6.53,16.5 6.24,16 6,15.47C6,13.82 8.71,12.47 12,12.47C15.29,12.47 18,13.79 18,15.47C17.76,16 17.47,16.5 17.13,17Z",
  shieldOff: "M1,4.27L2.28,3L21,21.72L19.73,23L17.5,20.77C16.06,22 14.11,22.67 12,23C6.84,21.74 3,16.55 3,11V6.27L1,4.27M12,1L21,5V11C21,13.28 20.36,15.5 19.27,17.38L5.3,3.41L12,1Z",
  moon: "M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95Z",
  window: "M6,11H10V9H14V11H18V4H6V11M18,13H6V20H18V13M6,2H18A2,2 0 0,1 20,4V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2Z",
  door: "M8,3C6.89,3 6,3.89 6,5V21H18V5C18,3.89 17.11,3 16,3H8M8,5H16V19H8V5M13,11V13H15V11H13Z",
  motion: "M13.5,5.5C14.59,5.5 15.5,4.58 15.5,3.5C15.5,2.38 14.59,1.5 13.5,1.5C12.39,1.5 11.5,2.38 11.5,3.5C11.5,4.58 12.39,5.5 13.5,5.5M9.89,19.38L10.89,15L13,17V23H15V15.5L12.89,13.5L13.5,10.5C14.79,12 16.79,13 19,13V11C17.09,11 15.5,10 14.69,8.58L13.69,7C13.29,6.38 12.69,6 12,6C11.69,6 11.5,6.08 11.19,6.08L6,8.28V13H8V9.58L9.79,8.88L8.19,17L3.29,16L2.89,18L9.89,19.38Z",
  smoke: "M12,3.25C12,3.25 6,10 6,14C6,17.32 8.69,20 12,20A6,6 0 0,0 18,14C18,10 12,3.25 12,3.25M14.47,9.97L15.53,11.03L9.53,17.03L8.47,15.97M9.75,10A1.25,1.25 0 0,1 11,11.25A1.25,1.25 0 0,1 9.75,12.5A1.25,1.25 0 0,1 8.5,11.25A1.25,1.25 0 0,1 9.75,10M14.25,14.5A1.25,1.25 0 0,1 15.5,15.75A1.25,1.25 0 0,1 14.25,17A1.25,1.25 0 0,1 13,15.75A1.25,1.25 0 0,1 14.25,14.5Z",
  garage: "M22,9V20H20V11H4V20H2V9L12,5L22,9M19,12H5V14H19V12M19,18H5V20H19V18M19,15H5V17H19V15Z",
  drag: "M7,19V17H9V19H7M11,19V17H13V19H11M15,19V17H17V19H15M7,15V13H9V15H7M11,15V13H13V15H11M15,15V13H17V15H15M7,11V9H9V11H7M11,11V9H13V11H11M15,11V9H17V11H15M7,7V5H9V7H7M11,7V5H13V7H11M15,7V5H17V7H15Z",
  chevRight: "M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z",
  chevDown: "M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z",
  search: "M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z",
  plus: "M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z",
  close: "M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z",
  check: "M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z",
  timer: "M12,20A7,7 0 0,1 5,13A7,7 0 0,1 12,6A7,7 0 0,1 19,13A7,7 0 0,1 12,20M19.03,7.39L20.45,5.97C20,5.46 19.55,5 19.04,4.56L17.62,6C16.07,4.74 14.12,4 12,4A9,9 0 0,0 3,13A9,9 0 0,0 12,22C17,22 21,17.97 21,13C21,10.88 20.26,8.93 19.03,7.39M11,14H13V8H11M15,1H9V3H15V1Z",
  alert: "M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z",
  battery: "M16,20H8V6H16M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.67C6,21.4 6.6,22 7.33,22H16.67A1.33,1.33 0 0,0 18,20.67V5.33C18,4.6 17.4,4 16.67,4Z",
  menu: "M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z",
  dots: "M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z",
  hand: "M10,9A1,1 0 0,1 11,8A1,1 0 0,1 12,9V13.47L13.21,13.6L18.15,15.79C18.68,16.03 19,16.56 19,17.14V21.5C18.97,22.32 18.32,22.97 17.5,23H11C10.62,23 10.26,22.85 10,22.57L5.1,18.37L5.84,17.6C6.03,17.39 6.3,17.28 6.58,17.28H6.8L10,19V9M11,5A4,4 0 0,1 15,9C15,10.5 14.2,11.77 13,12.46V11.24C13.61,10.69 14,9.89 14,9A3,3 0 0,0 11,6A3,3 0 0,0 8,9C8,9.89 8.39,10.69 9,11.24V12.46C7.8,11.77 7,10.5 7,9A4,4 0 0,1 11,5Z",
};
export const ic = (name, size = 18, cls = "") =>
  `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${P[name]}"/></svg>`;

// --- Erfundene Daten ---------------------------------------------------------
// Sensoren: Typ, Bereich, Funk (Nutzer: WLAN und Thread, alles muss gehen), Batterie, Zonen.
export const SENSORS = [
  { id: "s1", name: "Haustür", type: "door", area: "Flur", conn: "Thread", bat: 72, zones: ["home", "away", "night"], entry: true },
  { id: "s2", name: "Bewegung Flur", type: "motion", area: "Flur", conn: "Thread", bat: 83, zones: ["away"] },
  { id: "s3", name: "Fenster Küche", type: "window", area: "Küche", conn: "Thread", bat: 78, zones: ["home", "away", "night"] },
  { id: "s4", name: "Fenster Wohnzimmer links", type: "window", area: "Wohnzimmer", conn: "WLAN", bat: 64, zones: ["home", "away", "night"] },
  { id: "s5", name: "Fenster Wohnzimmer rechts", type: "window", area: "Wohnzimmer", conn: "WLAN", bat: 61, zones: ["home", "away", "night"] },
  { id: "s6", name: "Terrassentür", type: "door", area: "Wohnzimmer", conn: "Thread", bat: 55, zones: ["home", "away", "night"], entry: true },
  { id: "s7", name: "Bewegung Wohnzimmer", type: "motion", area: "Wohnzimmer", conn: "WLAN", bat: null, zones: ["away"] },
  { id: "s8", name: "Fenster Bad", type: "window", area: "Bad", conn: "Zigbee", bat: 19, zones: ["away"] },
  { id: "s9", name: "Fenster Schlafzimmer", type: "window", area: "Schlafzimmer", conn: "Thread", bat: 90, zones: ["away"] },
  { id: "s10", name: "Bewegung Keller", type: "motion", area: "Keller", conn: "Zigbee", bat: 14, zones: [] },
  { id: "s11", name: "Rauchmelder Flur", type: "smoke", area: "Flur", conn: "Thread", bat: 88, zones: [] },
];
export const TYPE_ICON = { door: "door", window: "window", motion: "motion", smoke: "smoke", garage: "garage" };
export const ZONES = [
  { key: "home", name: "Anwesend", icon: "shieldHome", hint: "Hülle schützen, während jemand zuhause ist" },
  { key: "away", name: "Abwesend", icon: "shieldAway", hint: "Volle Überwachung, Haus leer" },
  { key: "night", name: "Nacht", icon: "moon", hint: "Optional, zum Beispiel ohne Obergeschoss" },
];

// --- Seitenrahmen --------------------------------------------------------------
const CSS = `
:root {
  --bg: #f4f6f9; --card: #ffffff; --text: #1f2328; --text2: #6b7280; --text3: #a3a9b3;
  --divider: rgba(15,23,42,.09); --primary: #03a9f4; --success: #2e9e4f; --error: #e5484d; --warning: #f59e0b;
  --hover: #f6f8fb; --subtle: #f1f3f7; --input: #ffffff;
  --err-soft: rgba(229,72,77,.10); --warn-soft: rgba(245,158,11,.14); --ok-soft: rgba(46,158,79,.12); --pri-soft: rgba(3,169,244,.12);
  --shadow: 0 10px 30px rgba(15,23,42,.16); --shadow-s: 0 1px 2px rgba(15,23,42,.06), 0 1px 8px rgba(15,23,42,.04);
  --side: #ffffff; --head: #ffffff;
}
:root[data-theme="dark"] {
  --bg: #111111; --card: #1c1c1c; --text: #e6e6e6; --text2: #9ba1a8; --text3: #666b72;
  --divider: rgba(255,255,255,.08); --error: #ef5350; --success: #4caf50; --hover: #232323; --subtle: #242424; --input: #161616;
  --err-soft: rgba(239,83,80,.14); --warn-soft: rgba(245,158,11,.16); --ok-soft: rgba(76,175,80,.15); --pri-soft: rgba(3,169,244,.16);
  --shadow: 0 10px 30px rgba(0,0,0,.5); --shadow-s: 0 1px 2px rgba(0,0,0,.4); --side: #1c1c1c; --head: #1c1c1c;
}
* { box-sizing: border-box; }
html, body { margin: 0; }
body { font-family: Roboto, system-ui, sans-serif; background: var(--bg); color: var(--text); font-size: 14px; -webkit-font-smoothing: antialiased; }
.ic { display: block; flex: none; }
.t2 { color: var(--text2); } .t3 { color: var(--text3); }
.label { font-size: 12px; letter-spacing: .04em; text-transform: uppercase; color: var(--text2); font-weight: 500; }

/* HA-Rahmen: Seitenleiste und Kopf rendert HA selbst (iframe-Panel) */
.ha { display: grid; grid-template-columns: 56px 1fr; min-height: 100vh; }
.ha .side { background: var(--side); border-right: 1px solid var(--divider); display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 14px 0; }
.ha .side i { width: 24px; height: 24px; border-radius: 6px; background: var(--subtle); display: block; }
.ha .side i.cur { background: var(--primary); }
.ha .main { min-width: 0; display: flex; flex-direction: column; }
.hahead { height: 56px; display: flex; align-items: center; gap: 14px; padding: 0 16px; background: var(--head); border-bottom: 1px solid var(--divider); font-size: 20px; }
.content { padding: 20px 24px 32px; display: flex; flex-direction: column; gap: 18px; min-width: 0; }

/* Reiterleiste mit Kapsel (Design-Regel Auswahlknöpfe) */
.tabs { display: inline-flex; padding: 4px; gap: 2px; border-radius: 14px; background: var(--subtle); align-self: flex-start; max-width: 100%; overflow-x: auto; }
.tabs span { padding: 8px 16px; border-radius: 10px; font-size: 14px; color: var(--text2); white-space: nowrap; }
.tabs span.on { background: var(--card); color: var(--text); box-shadow: var(--shadow-s); font-weight: 500; }
.seg { display: inline-flex; padding: 3px; gap: 2px; border-radius: 12px; background: var(--subtle); }
.seg span { padding: 7px 14px; border-radius: 9px; font-size: 13.5px; color: var(--text2); white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; }
.seg span.on { background: var(--card); color: var(--text); box-shadow: var(--shadow-s); font-weight: 500; }

.card { background: var(--card); border-radius: 18px; box-shadow: var(--shadow-s); border: 1px solid var(--divider); }
.btn { display: inline-flex; align-items: center; gap: 8px; height: 38px; padding: 0 16px; border-radius: 999px; border: 1px solid var(--divider); background: var(--card); color: var(--text); font: 500 14px Roboto, sans-serif; white-space: nowrap; }
.btn.primary { background: var(--primary); border-color: var(--primary); color: #fff; }
.btn.err { background: var(--error); border-color: var(--error); color: #fff; }
.pill { display: inline-flex; align-items: center; gap: 6px; height: 22px; padding: 0 9px; border-radius: 999px; font-size: 12px; font-weight: 500; white-space: nowrap; }
.pill.ok { color: var(--success); background: var(--ok-soft); }
.pill.warn { color: #b45309; background: var(--warn-soft); }
.pill.err { color: #fff; background: var(--error); }
.pill.pri { color: var(--primary); background: var(--pri-soft); }
.pill.none { color: var(--text2); background: var(--subtle); }
.cbtn { width: 24px; height: 24px; border-radius: 50%; border: 1.5px solid var(--primary); background: var(--pri-soft); color: var(--primary); display: grid; place-items: center; flex: none; }
.chip { display: inline-flex; align-items: center; gap: 7px; height: 32px; padding: 0 12px; border-radius: 999px; background: var(--card); border: 1px solid var(--divider); font-size: 13px; white-space: nowrap; }
.chip.on { background: var(--pri-soft); border-color: transparent; color: var(--primary); }
.search { display: flex; align-items: center; gap: 10px; height: 40px; padding: 0 14px; border-radius: 14px; background: var(--input); border: 1px solid var(--divider); color: var(--text2); min-width: 0; }
.toggle { width: 36px; height: 20px; border-radius: 999px; background: rgba(127,127,127,.3); position: relative; flex: none; }
.toggle::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.3); }
.toggle.on { background: var(--primary); } .toggle.on::after { left: 18px; }
.av { width: 36px; height: 36px; border-radius: 11px; background: var(--subtle); color: var(--text2); display: grid; place-items: center; flex: none; }
.av.open { background: var(--warn-soft); color: #b45309; }
.batt { font-size: 12px; color: var(--text2); font-variant-numeric: tabular-nums; }
.batt.low { color: var(--error); font-weight: 500; }

/* Handy: HA zeigt dort nur den Kopf mit Menü-Knopf */
.phone .ha { grid-template-columns: 1fr; }
.phone .ha .side { display: none; }
.phone .content { padding: 12px 12px 24px; gap: 12px; }
.phone .hahead { padding: 0 8px; gap: 8px; font-size: 18px; }
`;

export function page(body, { theme = "light", mobile = false, css = "", title = "Alarmageddon" } = {}) {
  return `<!doctype html><html lang="de" data-theme="${theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=block">
<style>${CSS}${css}</style></head><body class="${mobile ? "phone" : ""}">
<div class="ha"><div class="side"><i></i><i></i><i></i><i class="cur"></i><i></i><i></i></div>
<div class="main"><div class="hahead">${mobile ? ic("menu", 24) : ""}<span>${title}</span></div>${body}</div></div></body></html>`;
}

export const TABS = ["Übersicht", "Sensorgruppen", "Szenarien", "Wartung", "Einstellungen"];
export const tabs = (cur, short = false) =>
  `<div class="tabs">${TABS.map((t) => `<span class="${t === cur ? "on" : ""}">${short && t === "Sensorgruppen" ? "Gruppen" : short && t === "Einstellungen" ? "Einst." : t}</span>`).join("")}</div>`;

export const battHtml = (b) => (b == null ? `<span class="batt">Netz</span>` : `<span class="batt ${b < 20 ? "low" : ""}">${b} %</span>`);
