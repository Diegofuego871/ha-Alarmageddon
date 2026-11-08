// Rendert die Brand-Bilder aus icon.svg und logo.svg (transparenter Hintergrund, Schrift Montserrat von Google Fonts).
// Aufruf: node docs/brand/render.mjs
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, "..", "..", "custom_components", "alarmageddon", "brand");
const jobs = [["icon.svg", "icon.png", 256, 256], ["icon.svg", "icon@2x.png", 512, 512], ["logo.svg", "logo.png", 256, 295], ["logo.svg", "logo@2x.png", 512, 590]];
const browser = await chromium.launch();
for (const [src, name, w, h] of jobs) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const svg = readFileSync(path.join(here, src), "utf8").replace(/width="\d+" height="\d+"/, `width="${w}" height="${h}"`);
  await page.setContent(`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700&display=block"><style>html,body{margin:0;background:transparent}</style>${svg}`);
  await page.evaluate(() => document.fonts.load("700 128px Montserrat").then(() => document.fonts.load("500 74px Montserrat")));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, name), omitBackground: true });
  await page.close();
}
await browser.close();
