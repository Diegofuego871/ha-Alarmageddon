// Rendert die Mockups nach ../ (Desktop 1440 px, Handy 390 x 844 @2x). Aufruf: node render.mjs
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { battery, door, motion, page, signal, smoke } from "./mock.mjs";
const require = createRequire(import.meta.url);
const { chromium } = require("../../../../tests/panel/node_modules/playwright-core");
const here = fileURLToPath(new URL(".", import.meta.url));
mkdirSync(`${here}out/`, { recursive: true });
const SCREENS = [
  ["1a-tuer-1-tag-desktop", () => door(2, false), false],
  ["1b-tuer-1-tag-handy", () => door(2, true), true],
  ["2a-tuer-7-tage-desktop", () => door(3, false), false],
  ["2b-tuer-7-tage-handy", () => door(3, true), true],
  ["2c-tuer-30-tage-desktop", () => door(4, false), false],
  ["3a-bewegung-1-tag-desktop", () => motion(2, false), false],
  ["3b-bewegung-1-tag-handy", () => motion(2, true), true],
  ["4a-bewegung-7-tage-A-raster-desktop", () => motion(3, false, "A"), false],
  ["4b-bewegung-7-tage-A-raster-handy", () => motion(3, true, "A"), true],
  ["4c-bewegung-7-tage-B-balken-desktop", () => motion(3, false, "B"), false],
  ["5a-rauchmelder-desktop", () => smoke(false), false],
  ["6a-batterie-desktop", () => battery(false), false],
  ["6b-batterie-handy", () => battery(true), true],
  ["7a-empfang-desktop", () => signal(false), false],
  ["7b-empfang-handy", () => signal(true), true],
];
const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
for (const [name, body, mobile] of SCREENS) {
  const ctx = await b.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true } : { viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  writeFileSync(`${here}out/${name}.html`, page(body(), mobile));
  await p.goto(`file://${here}out/${name}.html`);
  await p.waitForTimeout(150);
  await p.screenshot({ path: `${here}../${name}.png`, fullPage: !mobile });
  await ctx.close();
  console.log("ok", name);
}
await b.close();
