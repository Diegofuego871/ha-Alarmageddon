// Mockup 1.9.0: Sensoransicht (Klick auf einen Sensor der Übersicht). Eigenständig (Farben und Masse wie das Panel), erfundene Daten.
// Desktop: Fenster in der Breite der Voreinstellungen (880 px). Handy: ganzer Bildschirm mit X oben.
// Oben fest: Kopf, Kacheln (Verlauf, Batterie, Empfang), Zeitraum, Kennzahlen, Grafik. Darunter scrollt nur die Liste der Ereignisse.
const I = {
  door: "M19,19V5C19,3.89 18.1,3 17,3H7A2,2 0 0,0 5,5V19H3V21H21V19H19M15,13H13V11H15V13Z",
  motion: "M13.5,5.5C14.59,5.5 15.5,4.58 15.5,3.5C15.5,2.38 14.59,1.5 13.5,1.5C12.39,1.5 11.5,2.38 11.5,3.5C11.5,4.58 12.39,5.5 13.5,5.5M9.89,19.38L10.89,15L13,17V23H15V15.5L12.89,13.5L13.5,10.5C14.79,12 16.79,13 19,13V11C17.09,11 15.5,10 14.69,8.58L13.69,7C13.3,6.38 12.69,6 12,6C11.69,6 11.5,6.08 11.19,6.08L6,8.28V13H8V9.58L9.79,8.88L8.19,17L3.29,16L2.89,18L9.89,19.38Z",
  smoke: "M12,2C12,2 4,10 4,15A8,8 0 0,0 20,15C20,10 12,2 12,2Z",
  external: "M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z",
  close: "M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z",
  history: "M13,3A9,9 0 0,0 4,12H1L4.89,15.89L4.96,16.03L9,12H6A7,7 0 0,1 13,5A7,7 0 0,1 20,12A7,7 0 0,1 13,19C11.07,19 9.32,18.21 8.06,16.94L6.64,18.36C8.27,20 10.5,21 13,21A9,9 0 0,0 22,12A9,9 0 0,0 13,3M12,8V13L16.28,15.54L17,14.33L13.5,12.25V8H12Z",
  battery: "M16,20H8V6H16M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.67C6,21.4 6.6,22 7.33,22H16.67A1.33,1.33 0 0,0 18,20.67V5.33C18,4.6 17.4,4 16.67,4Z",
  signal: "M3,21H6V15H3M8,21H11V11H8M13,21H16V7H13M18,21H21V3H18V21Z",
  shield: "M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,22.26 21,16.55 21,11V5L12,1Z",
  alert: "M13,14H11V9H13M13,18H11V16H13M1,21H23L12,2L1,21Z",
  offline: "M2.28,3L1,4.27L2.47,5.74C2.04,6 1.61,6.29 1.2,6.6L3,9C3.53,8.6 4.08,8.25 4.66,7.93L6.89,10.16C6.15,10.5 5.44,10.91 4.8,11.4L6.6,13.8C7.38,13.22 8.26,12.77 9.2,12.47L11.75,15C10.5,15.07 9.34,15.5 8.4,16.2L12,21L14.46,17.73L17.74,21L19,19.72M12,3C9.85,3 7.8,3.38 5.9,4.07L8.29,6.47C9.5,6.16 10.72,6 12,6C15.38,6 18.5,7.11 21,9L22.8,6.6C19.79,4.34 16.06,3 12,3M12,9C11.62,9 11.25,9 10.88,9.05L14.07,12.25C15.29,12.53 16.43,13.07 17.4,13.8L19.2,11.4C17.2,9.89 14.7,9 12,9Z",
  swap: "M12,18A6,6 0 0,1 6,12C6,11 6.25,10.03 6.7,9.2L5.24,7.74C4.46,8.97 4,10.43 4,12A8,8 0 0,0 12,20V23L16,19L12,15M12,4V1L8,5L12,9V6A6,6 0 0,1 18,12C18,13 17.75,13.97 17.3,14.8L18.76,16.26C19.54,15.03 20,13.57 20,12A8,8 0 0,0 12,4Z",
  chevL: "M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z",
  chevR: "M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z",
};
const ic = (n, s = 18) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${I[n]}"/></svg>`;

export const CSS = `
:root { --bg: #f4f6f9; --card: #fff; --text: #1f2328; --t2: #6b7280; --t3: #a3a9b3; --div: rgba(15,23,42,.09); --pri: #03a9f4; --pri-d: #0288c7;
  --ok: #2e9e4f; --warn: #f59e0b; --err: #e5484d; --sub: #f3f5f8; --pri-soft: rgba(3,169,244,.14); --warn-soft: rgba(245,158,11,.18); --ok-soft: rgba(46,158,79,.15); --err-soft: rgba(229,72,77,.13); }
* { box-sizing: border-box; } html, body { margin: 0; } body { background: var(--bg); color: var(--text); font: 14px/1.4 Roboto, system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
.ic { flex: none; }
/* Desktop: abgedunkelte Übersicht dahinter, Fenster mittig in der Breite der Voreinstellungen */
.stage { min-height: 900px; padding: 36px 0 44px; background: rgba(15,23,42,.48); display: grid; place-items: start center; position: relative; }
.ghost { position: absolute; inset: 0; padding: 26px 110px; background: var(--bg); z-index: 0; opacity: .5; filter: blur(1px); }
.ghost i { display: block; border-radius: 16px; background: #fff; border: 1px solid var(--div); }
.stage::after { content: ""; position: absolute; inset: 0; background: rgba(15,23,42,.45); z-index: 1; }
.cap { position: absolute; left: 24px; top: 14px; z-index: 3; padding: 4px 12px; border-radius: 999px; background: #1b1d21; color: #fff; font-size: 12px; }
.dlg { position: relative; z-index: 2; width: 880px; height: 812px; background: var(--card); border-radius: 22px; box-shadow: 0 10px 30px rgba(0,0,0,.18); display: flex; flex-direction: column; overflow: hidden; }
/* Handy: ganzer Bildschirm */
.phone { width: 390px; height: 844px; background: var(--card); display: flex; flex-direction: column; overflow: hidden; }
.fix { flex: none; padding: 20px 24px 0; } .phone .fix { padding: 12px 16px 0; }
.head { display: flex; align-items: center; gap: 12px; }
.av { width: 44px; height: 44px; border-radius: 13px; background: var(--sub); color: var(--t2); display: grid; place-items: center; flex: none; } .av.act { background: var(--warn-soft); color: #b45309; }
.ttl { min-width: 0; flex: 1; } .ttl b { display: block; font-size: 19px; font-weight: 600; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .ttl small { color: var(--t2); font-size: 13px; }
.pill { height: 26px; padding: 0 11px; border-radius: 999px; display: inline-flex; align-items: center; font-size: 12.5px; font-weight: 500; background: var(--ok-soft); color: #23793c; white-space: nowrap; }
.pill.act { background: var(--warn-soft); color: #b45309; } .pill.off { background: var(--sub); color: var(--t2); }
.btn { height: 40px; padding: 0 16px; border-radius: 999px; border: 1px solid var(--div); background: var(--card); color: var(--text); display: inline-flex; align-items: center; gap: 8px; font: inherit; font-weight: 500; white-space: nowrap; }
.x { width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--div); background: var(--card); color: var(--t2); display: grid; place-items: center; flex: none; }
.phone .head2 { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 10px; }
.phone .ttl b { font-size: 18px; } .phone .btn { height: 36px; padding: 0 13px; font-size: 13.5px; }
/* Kacheln als Reiter: jede zeigt den aktuellen Wert, die gewählte bestimmt Grafik und Liste */
.tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 16px; } .phone .tiles { gap: 8px; margin-top: 12px; }
.tile { border: 1px solid var(--div); border-radius: 14px; padding: 10px 12px; display: flex; align-items: center; gap: 10px; min-width: 0; background: var(--card); }
.tile.on { border-color: var(--pri); background: var(--pri-soft); box-shadow: inset 0 0 0 1px var(--pri); }
.tile .ti { color: var(--t2); } .tile.on .ti { color: var(--pri-d); }
.tile span { display: block; font-size: 12px; color: var(--t2); line-height: 1.2; } .tile b { display: block; font-size: 14.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.phone .tile { padding: 8px 9px; gap: 7px; } .phone .tile b { font-size: 13.5px; } .phone .tile .ti { display: none; }
.seg { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 2px; padding: 3px; border-radius: 13px; background: rgba(31,35,40,.06); margin-top: 14px; }
.seg span { min-height: 34px; display: flex; align-items: center; justify-content: center; border-radius: 10px; color: #4a5160; font-size: 13.5px; white-space: nowrap; }
.seg span.on { background: var(--card); color: var(--pri-d); font-weight: 500; box-shadow: 0 1px 2px rgba(0,0,0,.08); }
.dlg .seg { display: inline-grid; grid-auto-columns: auto; } .dlg .seg span { padding: 0 18px; }
.row { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
/* Kennzahlen: eine Zeile, auf dem Handy seitlich rollbar */
.kpis { display: flex; gap: 22px; margin-top: 14px; } .kpi b { display: block; font-size: 20px; font-weight: 600; line-height: 1.15; font-variant-numeric: tabular-nums; } .kpi span { font-size: 12.5px; color: var(--t2); white-space: nowrap; }
.phone .kpis { gap: 18px; overflow: hidden; margin-top: 12px; } .phone .kpi b { font-size: 17px; }
.chart { margin-top: 12px; } .chart svg { display: block; width: 100%; height: auto; }
.legend { display: flex; gap: 14px; flex-wrap: wrap; margin: 8px 0 0; font-size: 12px; color: var(--t2); } .legend i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 5px; vertical-align: -1px; }
.hint { margin: 8px 0 0; font-size: 12.5px; color: var(--t2); }
/* Liste der Ereignisse: nur sie scrollt, der Kopf der Tabelle bleibt stehen */
.list { flex: 1; min-height: 0; overflow: hidden; margin-top: 14px; border-top: 1px solid var(--div); position: relative; }
.list::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 34px; background: linear-gradient(to bottom, rgba(255,255,255,0), var(--card)); }
.bar { position: absolute; right: 5px; top: 46px; width: 5px; height: 84px; border-radius: 3px; background: rgba(31,35,40,.22); }
table { width: 100%; border-collapse: collapse; } th { text-align: left; font-size: 11.5px; font-weight: 600; color: var(--t2); padding: 10px 8px; background: var(--sub); letter-spacing: .02em; }
th:first-child, td:first-child { padding-left: 24px; } th:last-child, td:last-child { padding-right: 24px; }
td { padding: 10px 8px; border-bottom: 1px solid var(--div); font-variant-numeric: tabular-nums; } tr.day td { background: var(--card); color: var(--t2); font-size: 12.5px; font-weight: 500; padding-top: 14px; padding-bottom: 6px; border-bottom: 0; }
.ev { display: inline-flex; align-items: center; gap: 8px; } .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--warn); flex: none; } .dot.gone { background: var(--t3); } .dot.none { display: none; } .dot.alarm { background: var(--err); }
.tag { display: inline-flex; align-items: center; gap: 5px; height: 22px; padding: 0 9px; border-radius: 999px; font-size: 12px; background: var(--sub); color: var(--t2); white-space: nowrap; }
.tag.arm { background: var(--pri-soft); color: var(--pri-d); } .tag.alarm { background: var(--err-soft); color: #b3261e; font-weight: 500; }
.t2 { color: var(--t2); }
.phone th:first-child, .phone td:first-child { padding-left: 16px; } .phone th:last-child, .phone td:last-child { padding-right: 16px; } .phone td { padding: 9px 6px; } .phone td small { display: block; color: var(--t2); font-size: 12px; }
.nav { display: flex; gap: 6px; } .nav .x { width: 34px; height: 34px; }
`;

// ---------- erfundene Daten: "jetzt" ist Dienstag, 10. November 2026, 18:00 ----------
const NOW = 18 * 60;
const WD = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const wd = (d) => ((2 - d) % 7 + 7) % 7;
const dayLabel = (d) => (d === 0 ? "Heute" : d === 1 ? "Gestern" : `${["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"][wd(d)]}, ${d <= 9 ? `${10 - d}. November` : `${41 - d}. Oktober`}`);
const shortDay = (d) => `${WD[wd(d)]} ${d <= 9 ? 10 - d : 41 - d}.`;
const hm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(Math.round(m) % 60).padStart(2, "0")}`;
const rnd = (seed) => () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const ago = (d, m) => d * 1440 + (NOW - m); // Minuten vor "jetzt"
const dur = (s) => (s < 60 ? `${Math.round(s)} s` : s < 3600 ? `${Math.floor(s / 60)} min${s % 60 >= 1 && s < 600 ? ` ${Math.round(s % 60)} s` : ""}` : `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min`);

// Anlage scharf: werktags 08:15 bis 17:38 Abwesend, jede Nacht 23:10 bis 06:35 Nacht, am Samstag 13:30 bis 16:45 Abwesend
function armed(days) {
  const out = [];
  for (let d = 0; d < days; d++) {
    const w = wd(d);
    if (w >= 1 && w <= 5) out.push({ d, from: 8 * 60 + 15, to: 17 * 60 + 38, mode: "Abwesend" });
    if (w === 6) out.push({ d, from: 13 * 60 + 30, to: 16 * 60 + 45, mode: "Abwesend" });
    out.push({ d, from: 0, to: 6 * 60 + 35, mode: "Nacht" }, { d, from: 23 * 60 + 10, to: 1440, mode: "Nacht" });
  }
  return out;
}
const modeAt = (d, m) => armed(d + 1).find((a) => a.d === d && m >= a.from && m < a.to)?.mode || null;

// Haustür: Öffnungen je Tag (Minute des Tages, Dauer in Sekunden)
function doorEvents(days) {
  const r = rnd(7);
  const out = [];
  for (let d = 0; d < days; d++) {
    const weekend = wd(d) === 0 || wd(d) === 6;
    const base = weekend ? [10 * 60 + 5, 11 * 60 + 42, 14 * 60 + 12, 17 * 60 + 5, 19 * 60 + 20] : [7 * 60 + 28, 8 * 60 + 9, 17 * 60 + 44, 18 * 60 + 20, 19 * 60 + 12, 21 * 60 + 33];
    for (const b of base) {
      if (r() < 0.14) continue;
      const m = b + Math.round((r() - 0.5) * 16);
      const s = !weekend && b === 19 * 60 + 12 && r() < 0.5 ? 420 + r() * 600 : 12 + r() * 150; // abends manchmal länger offen (Lüften)
      if (ago(d, m) > 2) out.push({ d, m, s, alarm: d === 3 && b === 14 * 60 + 12 });
    }
    if (wd(d) === 6) out.push({ d, m: 9 * 60 + 31, s: 23 * 60 + 12 }); // Lüften am Samstag
  }
  return out.sort((a, b) => ago(a.d, a.m) - ago(b.d, b.m));
}
// Bewegung Flur: Erkennungen je Stunde nach Tagesmuster
function motionHours(days) {
  const r = rnd(11);
  const out = [];
  for (let d = 0; d < days; d++) {
    const weekend = wd(d) === 0 || wd(d) === 6;
    const row = [];
    for (let h = 0; h < 24; h++) {
      const w = h < 6 ? 0.15 : h < 8 ? 5 : h === 8 ? (weekend ? 4 : 1) : h < 17 ? (weekend ? (h >= 14 && h < 17 && wd(d) === 6 ? 0 : 3.5) : 0) : h < 22 ? 6 : 1.2;
      const n = w === 0 ? 0 : Math.max(0, Math.round(w * (0.5 + r()) + (r() < 0.1 ? 2 : 0)));
      row.push(d === 0 && h >= 18 ? 0 : n);
    }
    out.push(row);
  }
  return out;
}

// ---------- Grafiken (SVG) ----------
const svg = (w, h, body) => `<svg viewBox="0 0 ${w} ${h}" role="img">${body}</svg>`;
const txt = (x, y, s, a = "middle", c = "#6b7280", size = 11) => `<text x="${x}" y="${y}" text-anchor="${a}" font-size="${size}" fill="${c}" font-family="Roboto, system-ui, sans-serif">${s}</text>`;

// Zustandsband für bis zu einem Tag: oben schmal "Anlage scharf", darunter das Band des Sensors, unten die Zeitachse
function band(hours, W, events) {
  const L = 4, R = W - 4, span = hours * 60;
  const x = (minAgo) => R - (minAgo / span) * (R - L);
  let s = `<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#eef0f3"/><rect width="2" height="6" fill="#c9ced6"/></pattern></defs>`;
  s += `<rect x="${L}" y="6" width="${R - L}" height="8" rx="4" fill="#eef0f3"/>`;
  for (const a of armed(3)) {
    const from = Math.min(span, ago(a.d, a.from)), to = Math.max(0, ago(a.d, a.to));
    if (from <= 0 || to >= span) continue;
    s += `<rect x="${x(from)}" y="6" width="${x(to) - x(from)}" height="8" rx="4" fill="#03a9f4" opacity="${a.mode === "Nacht" ? 0.55 : 1}"/>`;
  }
  s += `<rect x="${L}" y="24" width="${R - L}" height="40" rx="9" fill="#eef0f3"/>`;
  for (const e of events) {
    const from = ago(e.d, e.m);
    if (from > span || from < 0) continue;
    const wpx = Math.max(2.5, (e.s / 60 / span) * (R - L));
    s += `<rect x="${x(from)}" y="24" width="${wpx}" height="40" rx="${Math.min(3, wpx / 2)}" fill="${e.alarm ? "#e5484d" : "#f59e0b"}"/>`;
  }
  const step = W < 500 ? (hours <= 3 ? 60 : hours <= 12 ? 180 : 360) : hours <= 3 ? 30 : hours <= 12 ? 120 : 180;
  for (let m = Math.ceil((NOW - span) / step) * step; m <= NOW; m += step) {
    const xx = x(NOW - m);
    s += `<line x1="${xx}" y1="66" x2="${xx}" y2="71" stroke="#c9ced6"/>${txt(xx, 84, hm(((m % 1440) + 1440) % 1440), xx < 24 ? "start" : xx > W - 24 ? "end" : "middle")}`;
  }
  return svg(W, 90, s);
}

// Tageszeilen für 7 und 30 Tage: eine Zeile je Tag von 0 bis 24 Uhr; zeigt das Muster (wann geht die Tür üblicherweise auf)
function dayRows(days, W, events, mobile) {
  const rowH = days <= 7 ? 15 : 5, gap = days <= 7 ? 6 : 2.4, L = days <= 7 ? 46 : 40, R = W - 4, top = 4;
  const x = (m) => L + (m / 1440) * (R - L);
  let s = "";
  for (let d = days - 1; d >= 0; d--) {
    const y = top + (days - 1 - d) * (rowH + gap);
    s += `<rect x="${L}" y="${y}" width="${R - L}" height="${rowH}" rx="${rowH / 3}" fill="#eef0f3"/>`;
    for (const a of armed(days).filter((q) => q.d === d)) s += `<rect x="${x(a.from)}" y="${y}" width="${x(Math.min(a.to, d === 0 ? NOW : 1440)) - x(a.from)}" height="${rowH}" fill="#03a9f4" opacity=".2"/>`;
    for (const e of events.filter((q) => q.d === d)) s += `<rect x="${x(e.m)}" y="${y}" width="${Math.max(days <= 7 ? 3 : 2.2, (e.s / 86400) * (R - L))}" height="${rowH}" rx="1" fill="${e.alarm ? "#e5484d" : "#f59e0b"}"/>`;
    if (d === 0) s += `<rect x="${x(NOW)}" y="${y}" width="${R - x(NOW)}" height="${rowH}" fill="#fff" opacity=".7"/>`;
    if (days <= 7 || d % 5 === 0 || d === days - 1) s += txt(L - 8, y + rowH / 2 + 4, shortDay(d), "end", d === 0 ? "#1f2328" : "#6b7280", days <= 7 ? 11.5 : 10.5);
  }
  const base = top + days * (rowH + gap);
  for (const h of mobile ? [0, 6, 12, 18, 24] : [0, 3, 6, 9, 12, 15, 18, 21, 24]) s += txt(x(h * 60), base + 12, `${String(h).padStart(2, "0")}:00`, h === 24 ? "end" : h === 0 ? "start" : "middle");
  return svg(W, base + 18, s);
}

// Balken: Anzahl Erkennungen je Abschnitt
function bars(values, labels, W, H = 118) {
  const L = 28, R = W - 4, top = 8, bottom = H - 22, max = Math.max(4, ...values);
  const nice = Math.ceil(max / 4) * 4;
  let s = "";
  for (const g of [0, nice / 2, nice]) {
    const y = bottom - (g / nice) * (bottom - top);
    s += `<line x1="${L}" y1="${y}" x2="${R}" y2="${y}" stroke="rgba(15,23,42,.08)"/>${txt(L - 6, y + 4, g, "end")}`;
  }
  const bw = (R - L) / values.length;
  values.forEach((v, i) => {
    const h = (v / nice) * (bottom - top);
    s += `<rect x="${L + i * bw + bw * 0.16}" y="${bottom - h}" width="${bw * 0.68}" height="${Math.max(v ? 2 : 0, h)}" rx="${Math.min(4, bw * 0.2)}" fill="#03a9f4"/>`;
    if (labels[i]) s += txt(L + i * bw + bw / 2, H - 6, labels[i]);
  });
  return svg(W, H, s);
}

// Raster Tag x Stunde: je dunkler, desto mehr Bewegung; zeigt Gewohnheiten und Ausreisser
function heat(matrix, W, mobile) {
  const days = matrix.length, L = 46, R = W - 4, top = 4, cw = (R - L) / 24, ch = days <= 7 ? 17 : 5.6, gap = days <= 7 ? 3 : 1.2;
  const max = Math.max(...matrix.flat());
  let s = "";
  for (let d = days - 1; d >= 0; d--) {
    const y = top + (days - 1 - d) * (ch + gap);
    for (let h = 0; h < 24; h++) {
      const v = matrix[d][h];
      s += `<rect x="${L + h * cw + 1}" y="${y}" width="${cw - 2}" height="${ch}" rx="${days <= 7 ? 4 : 1.5}" fill="${v ? "#03a9f4" : "#eef0f3"}" opacity="${v ? 0.18 + 0.82 * (v / max) : 1}"/>`;
    }
    if (days <= 7 || d % 5 === 0 || d === days - 1) s += txt(L - 8, y + ch / 2 + 4, shortDay(d), "end", d === 0 ? "#1f2328" : "#6b7280", days <= 7 ? 11.5 : 10.5);
  }
  const base = top + days * (ch + gap);
  for (const h of mobile ? [0, 6, 12, 18, 24] : [0, 3, 6, 9, 12, 15, 18, 21, 24]) s += txt(L + h * cw, base + 12, `${String(h).padStart(2, "0")}:00`, h === 24 ? "end" : h === 0 ? "start" : "middle");
  return svg(W, base + 18, s);
}

// Linie mit Fläche (Batterie, Empfang): optional Schwelle, Prognose (gestrichelt) und Zonen
function line(points, W, { min, max, unit, threshold = null, forecast = null, zones = [], marks = [], xl = [], H = 150 }) {
  const L = 38, R = W - 6, top = 10, bottom = H - 22;
  const total = points.length - 1 + (forecast ? forecast.length : 0);
  const x = (i) => L + (i / total) * (R - L), y = (v) => bottom - ((v - min) / (max - min)) * (bottom - top);
  let s = "";
  for (const z of zones) s += `<rect x="${L}" y="${y(z.to)}" width="${R - L}" height="${y(z.from) - y(z.to)}" fill="${z.color}" opacity=".10"/>${txt(R - 6, y(z.to) + 13, z.label, "end", z.color, 10.5)}`;
  for (const g of [min, (min + max) / 2, max]) s += `<line x1="${L}" y1="${y(g)}" x2="${R}" y2="${y(g)}" stroke="rgba(15,23,42,.08)"/>${txt(L - 6, y(g) + 4, `${Math.round(g)}${unit === "%" ? " %" : ""}`, "end")}`;
  if (threshold !== null) s += `<line x1="${L}" y1="${y(threshold)}" x2="${R}" y2="${y(threshold)}" stroke="#e5484d" stroke-dasharray="4 4"/>${txt((L + R) / 2, y(threshold) + 13, `Warnung unter ${threshold} %`, "middle", "#b3261e", 10.5)}`;
  const path = points.map((v, i) => (v === null ? "" : `${i === 0 || points[i - 1] === null ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)).join(" ");
  const lastI = points.length - 1;
  if (!points.includes(null)) s += `<path d="${path} L${x(lastI)},${bottom} L${x(0)},${bottom} Z" fill="#03a9f4" opacity=".10"/>`;
  s += `<path d="${path}" fill="none" stroke="#03a9f4" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
  if (forecast) {
    s += `<path d="M${x(lastI)},${y(points[lastI])} ${forecast.map((v, i) => `L${x(lastI + 1 + i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")}" fill="none" stroke="#03a9f4" stroke-width="2" stroke-dasharray="5 5" opacity=".7"/>`;
    s += `<line x1="${x(lastI)}" y1="${top}" x2="${x(lastI)}" y2="${bottom}" stroke="#c9ced6" stroke-dasharray="2 3"/>${txt(x(lastI) - 6, top + 10, "heute", "end")}${txt(x(lastI) + 6, top + 10, "Prognose", "start")}`;
  }
  s += `<circle cx="${x(lastI)}" cy="${y(points[lastI])}" r="4.5" fill="#fff" stroke="#03a9f4" stroke-width="2.4"/>`;
  for (const m of marks) s += `<line x1="${x(m.i)}" y1="${top + 14}" x2="${x(m.i)}" y2="${bottom}" stroke="#2e9e4f" stroke-dasharray="3 3"/>${txt(x(m.i) + 5, top + 24, m.label, "start", "#23793c", 10.5)}`;
  for (const [i, label] of xl) s += txt(x(i), H - 6, label, i === 0 ? "start" : i >= total ? "end" : "middle");
  return svg(W, H, s);
}

// ---------- Bausteine der Ansicht ----------
const SENSORS = {
  door: { icon: "door", name: "Haustür", sub: "Tür · Flur · Zigbee", state: ["zu", ""], tiles: [["Verlauf", "zu seit 17:43"], ["Batterie", "72 %"], ["Empfang", "−58 dBm"]] },
  motion: { icon: "motion", name: "Bewegung Flur", sub: "Bewegung · Flur · Zigbee", state: ["ruhig", ""], tiles: [["Verlauf", "ruhig seit 17:52"], ["Batterie", "66 %"], ["Empfang", "−63 dBm"]] },
  smoke: { icon: "smoke", name: "Rauchmelder Küche", sub: "Rauch · Küche · Matter", state: ["kein Rauch", ""], tiles: [["Verlauf", "kein Rauch"], ["Batterie", "82 %"], ["Empfang", "−71 dBm"]] },
};
const TILE_ICON = ["history", "battery", "signal"];
function header(sensor, mobile, nav = false) {
  const s = SENSORS[sensor];
  const open = `<span class="btn">${ic("external", 18)}In HA öffnen</span>`;
  const title = `<span class="av">${ic(s.icon, 22)}</span><div class="ttl"><b>${s.name}</b><small>${s.sub}</small></div>`;
  if (mobile) return `<div class="head">${title}<span class="x">${ic("close", 20)}</span></div><div class="head2"><span class="pill ${s.state[1]}">${s.state[0]}</span>${open}</div>`;
  return `<div class="head">${title}<span class="pill ${s.state[1]}">${s.state[0]}</span>${nav ? `<span class="nav"><span class="x">${ic("chevL", 20)}</span><span class="x">${ic("chevR", 20)}</span></span>` : ""}${open}<span class="x">${ic("close", 20)}</span></div>`;
}
const tiles = (sensor, on) => `<div class="tiles">${SENSORS[sensor].tiles.map(([a, b], i) => `<div class="tile ${i === on ? "on" : ""}"><span class="ti">${ic(TILE_ICON[i], 22)}</span><div style="min-width:0"><span>${a}</span><b>${b}</b></div></div>`).join("")}</div>`;
const seg = (items, on) => `<div class="seg">${items.map((t, i) => `<span class="${i === on ? "on" : ""}">${t}</span>`).join("")}</div>`;
const RANGES = ["3 Std.", "12 Std.", "1 Tag", "7 Tage", "30 Tage"];
const kpis = (items) => `<div class="kpis">${items.map(([v, l]) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`).join("")}</div>`;
const legend = (items) => `<div class="legend">${items.map(([c, l, o = 1]) => `<span><i style="background:${c};opacity:${o}"></i>${l}</span>`).join("")}</div>`;
const tagOf = (mode) => (mode ? `<span class="tag arm">${ic("shield", 12)}${mode}</span>` : `<span class="tag">Deaktiviert</span>`);

function table(rows, mobile, cols) {
  let last = -1, body = "";
  for (const r of rows) {
    if (r.d !== last) body += `<tr class="day"><td colspan="4">${dayLabel(r.d)}</td></tr>`;
    last = r.d;
    body += mobile
      ? `<tr><td>${r.time}</td><td><span class="ev"><span class="dot ${r.cls || ""}"></span><span>${r.what}<small>${r.len || ""}</small></span></span></td><td style="text-align:right">${r.tag}</td></tr>`
      : `<tr><td>${r.time}</td><td><span class="ev"><span class="dot ${r.cls || ""}"></span>${r.what}</span></td><td>${r.len || "–"}</td><td>${r.tag}</td></tr>`;
  }
  const lastCol = cols[2] ?? "Anlage";
  const head = mobile ? `<tr><th>Zeit</th><th>${cols[0]}</th><th style="text-align:right">${lastCol}</th></tr>` : `<tr><th style="width:110px">Zeit</th><th>${cols[0]}</th><th style="width:150px">${cols[1]}</th><th style="width:190px">${lastCol}</th></tr>`;
  return `<div class="list"><table><thead>${head}</thead><tbody>${body}</tbody></table>${rows.length > (mobile ? 5 : 7) ? '<span class="bar"></span>' : ""}</div>`;
}

function frame(inner, mobile, caption) {
  if (mobile) return `<div class="phone">${inner}</div>`;
  const ghost = `<div class="ghost"><i style="height:54px;width:420px;margin-bottom:22px"></i><div style="display:flex;gap:18px;margin-bottom:26px"><i style="height:190px;flex:1"></i><i style="height:190px;flex:1"></i><i style="height:190px;flex:1"></i></div><i style="height:48px;margin-bottom:16px"></i><i style="height:420px"></i></div>`;
  return `<div class="stage">${ghost}<span class="cap">${caption}</span><div class="dlg">${inner}</div></div>`;
}

// ---------- Ansichten ----------
export function door(range, mobile) {
  const W = mobile ? 358 : 832, hours = [3, 12, 24, 168, 720][range], days = Math.ceil(hours / 24);
  const all = doorEvents(30), ev = all.filter((e) => ago(e.d, e.m) <= hours * 60);
  const total = ev.reduce((n, e) => n + e.s, 0), longest = Math.max(...ev.map((e) => e.s));
  const chart = hours <= 24 ? band(hours, W, all) : dayRows(days, W, all, mobile);
  const rows = ev.map((e) => ({ d: e.d, time: hm(e.m), what: e.alarm ? `Geöffnet <span class="tag alarm" style="margin-left:6px">${ic("alert", 12)}Alarm ausgelöst</span>` : "Geöffnet", len: `${dur(e.s)} offen`, cls: e.alarm ? "alarm" : "", tag: tagOf(modeAt(e.d, e.m)) }));
  SENSORS.door.tiles[0][1] = `zu seit ${hm(all[0].m + all[0].s / 60)}`;
  const fix = `${header("door", mobile)}${tiles("door", 0)}${seg(RANGES, range)}
    ${kpis([[`${ev.length}×`, "geöffnet"], [dur(total), "insgesamt offen"], [dur(longest), "längste Öffnung"], ...(mobile ? [] : [[hm(ev[0].m), "zuletzt geöffnet"]])])}
    <div class="chart">${chart}</div>${legend([["#f59e0b", "offen"], ["#03a9f4", hours <= 24 ? "Anlage scharf" : "Anlage scharf", hours <= 24 ? 1 : 0.35], ["#e5484d", "Alarm"]])}`;
  return frame(`<div class="fix">${fix}</div>${table(rows, mobile, ["Ereignis", "Dauer"])}`, mobile, `Tür · ${RANGES[range]}`);
}

export function motion(range, mobile, variant = "A") {
  const W = mobile ? 358 : 832, hours = [3, 12, 24, 168, 720][range], days = Math.ceil(hours / 24);
  const m = motionHours(30);
  const flat = [];
  for (let h = 0; h < hours; h++) { const t = NOW / 60 - 1 - h, d = t < 0 ? Math.ceil(-t / 24) : 0; flat.unshift(m[Math.min(29, d)][((t % 24) + 24) % 24]); }
  const count = flat.reduce((a, b) => a + b, 0);
  let chart, extra = "";
  if (hours <= 24) {
    const step = hours <= 3 ? 1 : 1;
    const vals = hours === 3 ? [2, 0, 1, 3, 4, 2, 0, 0, 1, 5, 3, 2, 4, 1, 0, 2, 3, 1] : flat;
    const lab = vals.map((_, i) => (hours === 3 ? (i % 6 === 0 ? hm(NOW - 180 + i * 10) : "") : (i % (hours === 12 ? 2 : mobile ? 6 : 3) === 0 ? hm((((NOW / 60 - hours + i) % 24) + 24) % 24 * 60) : "")));
    chart = bars(vals, lab, W);
    extra = legend([["#03a9f4", hours === 3 ? "Bewegungen je 10 Minuten" : "Bewegungen je Stunde"]]);
    void step;
  } else if (variant === "B") {
    const perDay = m.slice(0, days).map((row) => row.reduce((a, b) => a + b, 0)).reverse();
    chart = bars(perDay, perDay.map((_, i) => (days <= 7 || i % 5 === 0 ? shortDay(days - 1 - i) : "")), W, 150);
    extra = legend([["#03a9f4", "Bewegungen je Tag"]]);
  } else {
    chart = heat(m.slice(0, days), W, mobile);
    extra = `<div class="legend"><span>weniger</span><span>${[0.2, 0.45, 0.7, 1].map((o) => `<i style="background:#03a9f4;opacity:${o};margin-right:3px"></i>`).join("")}</span><span>mehr Bewegung je Stunde</span></div>`;
  }
  const busiest = flat.indexOf(Math.max(...flat));
  const bh = (((NOW / 60 - hours + busiest) % 24) + 24) % 24;
  const r = rnd(5);
  const times = [[0, 1072], [0, 1067], [0, 1063], [0, 1060], [0, 492], [0, 487], [0, 471], [0, 455], [0, 441], [0, 428], [0, 412], [0, 194], [1, 1368], [1, 1341], [1, 1302], [1, 1275]];
  const rows = times.map(([d, mm]) => ({ d, time: hm(mm), what: "Bewegung erkannt", len: dur(8 + r() * 110), tag: tagOf(modeAt(d, mm)) }));
  SENSORS.motion.tiles[0][1] = mobile ? "seit 17:52" : "ruhig seit 17:52";
  const fix = `${header("motion", mobile)}${tiles("motion", 0)}${seg(RANGES, range)}
    ${kpis([[`${hours === 3 ? 34 : count}`, "Bewegungen"], [`${String(bh).padStart(2, "0")}–${String((bh + 1) % 24).padStart(2, "0")} Uhr`, "aktivste Stunde"], ["17:52", "zuletzt"], ...(mobile ? [] : [hours <= 24 ? ["21 min", "Bewegung insgesamt"] : [`${Math.round(count / (hours / 24))}`, "je Tag im Mittel"]])])}
    <div class="chart">${chart}</div>${extra}`;
  return frame(`<div class="fix">${fix}</div>${table(rows, mobile, ["Ereignis", "Dauer"])}`, mobile, `Bewegung · ${RANGES[range]}${hours > 24 ? ` · Variante ${variant}` : ""}`);
}

export function smoke(mobile) {
  const W = mobile ? 358 : 832;
  const rows = [
    { d: 5, time: "02:50", what: "Wieder erreichbar", len: "", cls: "gone", tag: tagOf("Nacht") },
    { d: 5, time: "02:10", what: "Nicht erreichbar", len: "40 min", cls: "gone", tag: tagOf("Nacht") },
    { d: 6, time: "10:02", what: "Rauch erkannt (Testknopf)", len: "6 s", tag: tagOf(null) },
  ];
  const s = `<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#eef0f3"/><rect width="2" height="6" fill="#a3a9b3"/></pattern></defs>` +
    Array.from({ length: 7 }, (_, i) => { const d = 6 - i, y = 4 + i * 21, L = 46, R = W - 4, x = (m) => L + (m / 1440) * (R - L);
      return `<rect x="${L}" y="${y}" width="${(d === 0 ? x(NOW) : R) - L}" height="15" rx="5" fill="#2e9e4f" opacity=".22"/>${d === 5 ? `<rect x="${x(130)}" y="${y}" width="${Math.max(6, x(170) - x(130))}" height="15" fill="url(#hatch)"/>` : ""}${d === 6 ? `<rect x="${x(602)}" y="${y}" width="3" height="15" fill="#f59e0b"/>` : ""}${txt(L - 8, y + 11.5, shortDay(d), "end", d === 0 ? "#1f2328" : "#6b7280", 11.5)}`; }).join("") +
    [0, 6, 12, 18, 24].map((h) => txt(46 + (h / 24) * (W - 50), 4 + 7 * 21 + 12, `${String(h).padStart(2, "0")}:00`, h === 24 ? "end" : h === 0 ? "start" : "middle")).join("");
  const fix = `${header("smoke", mobile)}${tiles("smoke", 0)}${seg(RANGES, 3)}
    ${kpis([["0", "Alarme"], ["99,6 %", "erreichbar"], ["1", "Ausfall (40 min)"], ...(mobile ? [] : [["vor 6 Tagen", "zuletzt getestet"]])])}
    <div class="chart">${svg(W, 4 + 7 * 21 + 18, s)}</div>${legend([["#2e9e4f", "erreichbar, kein Rauch", 0.35], ["#a3a9b3", "nicht erreichbar"], ["#f59e0b", "Rauch erkannt"]])}`;
  return frame(`<div class="fix">${fix}</div>${table(rows, mobile, ["Ereignis", "Dauer"])}`, mobile, "Rauchmelder · 7 Tage");
}

export function battery(mobile) {
  const W = mobile ? 358 : 832;
  const pts = Array.from({ length: 91 }, (_, i) => (i < 12 ? 31 - i * 0.9 : 100 - (i - 12) * 0.355 + Math.sin(i / 3) * 0.5));
  const fc = Array.from({ length: 40 }, (_, i) => pts[90] - (i + 1) * 1.3);
  const chart = line(pts, W, { min: 0, max: 100, unit: "%", threshold: 20, forecast: fc, marks: [{ i: 12, label: "Batterie gewechselt" }], xl: [[0, "12. Aug."], [45, "26. Sept."], [90, "10. Nov."], [130, "Aug. 2027"]] });
  const ok = `<span class="tag" style="background:var(--ok-soft);color:#23793c">${ic("swap", 12)}Batterie gewechselt</span>`;
  const rows = [
    { d: 0, time: "06:00", what: "72 %", len: "−1 %", cls: "none", tag: "" },
    { d: 3, time: "06:00", what: "73 %", len: "−1 %", cls: "none", tag: "" },
    { d: 6, time: "06:00", what: "74 %", len: "−1 %", cls: "none", tag: "" },
    { d: 9, time: "06:00", what: "75 %", len: "−1 %", cls: "none", tag: "" },
    { d: 12, time: "06:00", what: "76 %", len: "−1 %", cls: "none", tag: "" },
    { d: 15, time: "06:00", what: "77 %", len: "−1 %", cls: "none", tag: "" },
  ];
  void ok;
  const fix = `${header("door", mobile)}${tiles("door", 1)}${seg(["30 Tage", "90 Tage", "1 Jahr"], 1)}
    ${kpis([["72 %", "aktuell"], ["−0,36 %", "je Tag"], ["~9 Monate", "bis zur Warnung"], ...(mobile ? [] : [["vor 78 Tagen", "Batterie gewechselt"]])])}
    <div class="chart">${chart}</div>`;
  return frame(`<div class="fix">${fix}</div>${table(rows, mobile, ["Stand", "Änderung", ""])}`, mobile, "Batterie · 90 Tage");
}

export function signal(mobile) {
  const W = mobile ? 358 : 832;
  const r = rnd(3);
  const pts = Array.from({ length: 85 }, (_, i) => (i > 22 && i < 26 ? null : -58 - Math.sin(i / 6) * 5 - r() * 6 - (i > 60 && i < 68 ? 14 : 0)));
  const chart = line(pts, W, { min: -95, max: -40, unit: "", zones: [{ from: -65, to: -40, color: "#2e9e4f", label: "gut" }, { from: -80, to: -65, color: "#f59e0b", label: "mittel" }, { from: -95, to: -80, color: "#e5484d", label: "schwach" }],
    xl: [[0, "Mi 4."], [12, "Do 5."], [24, "Fr 6."], [36, "Sa 7."], [48, "So 8."], [60, "Mo 9."], [72, "Di 10."]] });
  const rows = [
    { d: 1, time: "14:10", what: "Empfang schwächer (−79 dBm)", len: "3 h 40 min", tag: tagOf("Abwesend") },
    { d: 5, time: "02:50", what: "Wieder erreichbar", len: "", cls: "gone", tag: tagOf("Nacht") },
    { d: 5, time: "02:10", what: "Nicht erreichbar", len: "40 min", cls: "gone", tag: tagOf("Nacht") },
  ];
  const fix = `${header("door", mobile)}${tiles("door", 2)}${seg(RANGES, 3)}
    ${kpis([["−58 dBm", "aktuell (gut)"], ["−62 dBm", "im Mittel"], ["−79 dBm", "schwächster Wert"], ...(mobile ? [] : [["1", "Ausfall (40 min)"]])])}
    <div class="chart">${chart}</div>`;
  return frame(`<div class="fix">${fix}</div>${table(rows, mobile, ["Ereignis", "Dauer"])}`, mobile, "Empfang · 7 Tage");
}

export const page = (body, mobile) => `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${CSS}</style></head><body class="${mobile ? "m" : ""}">${body}</body></html>`;
