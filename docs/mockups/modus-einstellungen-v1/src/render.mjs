// Rendert die Mockups nach ../ (Desktop 1600 px, Handy 390 px @2x). Aufruf: node render.mjs
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { off, on, page } from "./mock.mjs";
const require = createRequire(import.meta.url);
const { chromium } = require("../../../../tests/panel/node_modules/playwright-core");
const here = fileURLToPath(new URL(".", import.meta.url));
mkdirSync(`${here}out/`, { recursive: true });
const SCREENS = [
  ["1a-schalter-aus-desktop", () => off(), false],
  ["1b-schalter-aus-handy", () => off(true), true],
  ["2a-schalter-ein-abwesend-desktop", () => on("away"), false],
  ["2b-schalter-ein-nacht-desktop", () => on("night"), false],
  ["2c-schalter-ein-handy", () => on("home", true), true],
];
const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
for (const [name, body, mobile] of SCREENS) {
  const ctx = await b.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true } : { viewport: { width: 1600, height: 900 } });
  const p = await ctx.newPage();
  writeFileSync(`${here}out/${name}.html`, page(body(), mobile));
  await p.goto(`file://${here}out/${name}.html`);
  await p.waitForTimeout(150);
  await p.screenshot({ path: `${here}../${name}.png`, fullPage: true });
  await ctx.close();
  console.log("ok", name);
}
await b.close();
