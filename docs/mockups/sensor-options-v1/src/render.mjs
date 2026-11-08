// Rendert die Mockups 0.3.0 nach ../ (Desktop 1440 px, Handy 390 × 844 @2x). Aufruf: node render.mjs [Namensanfang …]
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CSS, optionsA, optionsB, optionsC, presets, readyView, page } from "./mock.mjs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const here = fileURLToPath(new URL(".", import.meta.url));
const tmp = `${here}out/`;
mkdirSync(tmp, { recursive: true });
const only = process.argv.slice(2);
const D = { width: 1440, height: 1000 };
const M = { width: 390, height: 844, mobile: true };
const SCREENS = [
  ["1a-optionen-A-seitenblatt", () => optionsA(), D],
  ["1b-optionen-A-handy", () => optionsA({ mobile: true }), M],
  ["2a-optionen-B-spalten", () => optionsB(), D],
  ["2b-optionen-B-handy", () => optionsB({ mobile: true }), M],
  ["3a-optionen-C-aufklappen", () => optionsC(), D],
  ["4-voreinstellungen", () => presets(), D],
  ["5a-bereit-A-punkte", () => readyView("A"), D],
  ["5b-bereit-A-handy", () => readyView("A", { mobile: true }), M],
  ["6a-bereit-B-zeile", () => readyView("B"), D],
  ["6b-bereit-B-handy", () => readyView("B", { mobile: true }), M],
];
const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
for (const [name, body, vp] of SCREENS) {
  if (only.length && !only.some((o) => name.startsWith(o))) continue;
  const ctx = await b.newContext(vp.mobile ? { viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: vp.width, height: vp.height } });
  const p = await ctx.newPage();
  writeFileSync(`${tmp}${name}.html`, page(body(), { mobile: !!vp.mobile, css: CSS }));
  await p.goto(`file://${tmp}${name}.html`);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(200);
  // Handy mit Blatt von unten: nur den Bildschirm, sonst ganze Seite
  await p.screenshot({ path: `${here}../${name}.png`, fullPage: !(vp.mobile && name.includes("optionen-A")) });
  await ctx.close();
  console.log("ok", name);
}
await b.close();
