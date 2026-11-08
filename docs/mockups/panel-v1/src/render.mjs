// Rendert die Panel-Mockups als PNG nach ../ (Desktop 1440 px, Handy 390 × 844 @2x).
// Aufruf: node render.mjs [Namensanfang …]. Nutzt das vorinstallierte Playwright (CHROMIUM_PATH für eigenen Browser).
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { page } from "./base.mjs";
import { CSS_O, CSS_OB, overviewA, overviewB } from "./overview.mjs";
import { CSS_G, groupsA, groupsB, groupsC } from "./groups.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const here = fileURLToPath(new URL(".", import.meta.url));
const out = `${here}out/`;
mkdirSync(out, { recursive: true });
const only = process.argv.slice(2);
const D = { width: 1440, height: 1000 };
const M = { width: 390, height: 844, mobile: true };

const SCREENS = [
  ["1a-uebersicht-A-karten", () => overviewA(), CSS_O, D, "light"],
  ["1b-uebersicht-A-alarm", () => overviewA({ alarm: true }), CSS_O, D, "light"],
  ["1c-uebersicht-A-handy", () => overviewA({ mobile: true }), CSS_O, M, "light"],
  ["1d-uebersicht-A-handy-alarm-dunkel", () => overviewA({ mobile: true, alarm: true }), CSS_O, M, "dark"],
  ["2a-uebersicht-B-leitstand", () => overviewB(), CSS_O + CSS_OB, D, "light"],
  ["2b-uebersicht-B-handy", () => overviewB({ mobile: true }), CSS_O + CSS_OB, M, "light"],
  ["3a-gruppen-A-spalten", () => groupsA(), CSS_G, D, "light"],
  ["3b-gruppen-A-spalten-dunkel", () => groupsA(), CSS_G, D, "dark"],
  ["3c-gruppen-A-handy", () => groupsA({ mobile: true }), CSS_G, M, "light"],
  ["4a-gruppen-B-tabelle", () => groupsB(), CSS_G, D, "light"],
  ["4b-gruppen-B-handy", () => groupsB({ mobile: true }), CSS_G, M, "light"],
  ["5a-gruppen-C-bereiche", () => groupsC(), CSS_G, D, "light"],
  ["5b-gruppen-C-handy", () => groupsC({ mobile: true }), CSS_G, M, "light"],
];

const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
for (const [name, body, css, vp, theme] of SCREENS) {
  if (only.length && !only.some((o) => name.startsWith(o))) continue;
  const ctx = await b.newContext(vp.mobile
    ? { viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  writeFileSync(`${out}${name}.html`, page(body(), { theme, mobile: !!vp.mobile, css }));
  await p.goto(`file://${out}${name}.html`);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(200);
  // Handy: ganze Seite (scrollt), damit alle Inhalte sichtbar sind; Desktop ebenso
  await p.screenshot({ path: `${here}../${name}.png`, fullPage: true });
  await ctx.close();
  console.log("ok", name);
}
await b.close();
