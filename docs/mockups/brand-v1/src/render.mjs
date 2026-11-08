// Rendert die Logo-Vorschläge: pro Variante ein Blatt (Icon gross hell/dunkel, kleine Grössen wie in HA, Logo mit Schriftzug)
// und ein Vergleich aller Varianten. Aufruf: node render.mjs (vorinstalliertes Playwright, Schrift Montserrat von Google Fonts).
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const here = fileURLToPath(new URL(".", import.meta.url));
const out = `${here}../`;

const V = [
  { key: "A", file: "a-polizeikatze.svg", name: "Polizei-Katze", text: "Orange Katze mit Polizeimütze und goldenem Stern. Freundlich, sofort als Katze erkennbar, mit Augenzwinkern.", c1: "#FFB45E", c2: "#F0662E", c3: "#16295C" },
  { key: "B", file: "b-schildkatze.svg", name: "Schild-Katze", text: "Schild, dessen Ecken Katzenohren sind, mit wachsamen gelben Augen. Sieht nach Sicherheit aus, die Katze steckt im Detail.", c1: "#4C8DFF", c2: "#1638A8", c3: "#1638A8" },
  { key: "C", file: "c-blaulichtkatze.svg", name: "Blaulicht-Katze", text: "Katzenkopf als Linie mit Blaulicht. Gleicher Linienstil wie die Logos von Device Panel und UniFi Dynamic Clients.", c1: "#FFB45E", c2: "#E5304A", c3: "#2F6BFF" },
  { key: "E", file: "e-schild-mit-ohren.svg", name: "Schild mit Katzenohren", text: "Schild im Linienstil, oben ragen zwei Katzenohren heraus, darin wachsame Augen. Verbindet Sicherheit, Katze und den Stil von Device Panel.", c1: "#FFB45E", c2: "#E5304A", c3: "#E5304A" },
  { key: "D", file: "d-schild-a.svg", name: "Schild mit A (heute)", text: "Der heutige Platzhalter zum Vergleich: Schild mit A im Linienstil.", c1: "#FFB45E", c2: "#E5304A", c3: "#E5304A" },
];
const svg = (v, size) => readFileSync(`${here}${v.file}`, "utf8").replace(/width="\d+" height="\d+"/, `width="${size}" height="${size}"`);
const word = (v, size = 1) => `<div style="font-family:Montserrat,sans-serif;line-height:1"><div style="font-weight:700;font-size:${64 * size}px;letter-spacing:-1px;background:linear-gradient(90deg,${v.c1},${v.c2});-webkit-background-clip:text;color:transparent">Alarm</div><div style="font-weight:500;font-size:${38 * size}px;color:var(--w2);margin-top:${4 * size}px">ageddon</div></div>`;
const CSS = `body{margin:0;padding:28px;font-family:Roboto,system-ui,sans-serif;background:#e8ebf0;color:#1f2328}
h1{margin:0 0 4px;font-size:26px;font-weight:600} p{margin:0 0 18px;color:#4b5563;max-width:820px;font-size:15px}
.row{display:flex;gap:18px;flex-wrap:wrap;align-items:stretch}.box{border-radius:18px;padding:24px;display:flex;flex-direction:column;gap:14px;align-items:center;justify-content:center}
.light{background:#fff;--w2:#4A5569}.dark{background:#1c1c1c;color:#e6e6e6;--w2:#c9ced6}.cap{font-size:12.5px;color:#6b7280}.dark .cap{color:#9ba1a8}
.sizes{display:flex;gap:18px;align-items:flex-end}.sizes div{display:flex;flex-direction:column;align-items:center;gap:6px}
.ha{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:12px;width:280px}.light .ha{background:#f4f6f9}.dark .ha{background:#111}
.ha b{font-weight:500;font-size:15px}.logo{display:flex;align-items:center;gap:18px}`;
const page = (body) => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700&family=Roboto:wght@400;500;600&display=block"><style>${CSS}</style></head><body>${body}</body></html>`;

function sheet(v) {
  const sizes = [64, 48, 32, 24].map((s) => `<div>${svg(v, s)}<span class="cap">${s} px</span></div>`).join("");
  const ha = `<div class="ha">${svg(v, 40)}<div><b>Alarmageddon</b><div class="cap">Integration · 2 Geräte</div></div></div>`;
  const side = (theme) => `<div class="box ${theme}">${svg(v, 220)}<div class="sizes">${sizes}</div>${ha}<div class="logo">${svg(v, 110)}${word(v)}</div></div>`;
  return page(`<h1>Variante ${v.key}: ${v.name}</h1><p>${v.text}</p><div class="row">${side("light")}${side("dark")}</div>`);
}
function compare() {
  const cell = (v, theme) => `<div class="box ${theme}" style="padding:18px;width:250px">${svg(v, 120)}<div class="sizes">${[48, 32, 24].map((s) => `<div>${svg(v, s)}</div>`).join("")}</div><b style="font-weight:500">${v.key}: ${v.name}</b></div>`;
  return page(`<h1>Logo-Vorschläge im Vergleich</h1><p>Gross, dann 48, 32 und 24 px (Integrationsliste, Geräte, Seitenleiste), hell und dunkel.</p>
    <div class="row">${V.map((v) => cell(v, "light")).join("")}</div><div class="row" style="margin-top:18px">${V.map((v) => cell(v, "dark")).join("")}</div>`);
}

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 800 }, deviceScaleFactor: 1.5 });
for (const [name, html] of [["0-vergleich", compare()], ...V.map((v) => [`${{ A: "1", B: "2", C: "3", E: "4", D: "5" }[v.key]}-variante-${v.key}-${v.file.replace(/^.-|\.svg$/g, "")}`, sheet(v)])]) {
  await p.setContent(html);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}${name}.png`, fullPage: true });
  console.log("ok", name);
}
await b.close();
