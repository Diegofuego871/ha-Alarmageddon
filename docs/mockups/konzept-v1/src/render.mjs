// Rendert die Konzept-Mockups als Bilder (Desktop hell, Handy hell, Desktop dunkel).
// Aufruf: node render.mjs   (nutzt das vorinstallierte Playwright; eigener Browser über CHROMIUM_PATH)
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const here = path.dirname(fileURLToPath(import.meta.url));
const page_url = pathToFileURL(path.join(here, "..", "konzept.html")).href;
const out = path.join(here, "..");
const views = [["konzept", "0-einschaetzung"], ["gruppen", "1-sensorgruppen"], ["wartung", "2-wartung"],
  ["szenarien", "3-szenarien"], ["einstellungen", "4-ueberwachung"], ["push", "5-push-stopp"], ["technik", "6-technik-plan"]];
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
async function shot(opts, list, suffix) {
  const ctx = await browser.newContext(opts);
  const p = await ctx.newPage();
  for (const [hash, name] of list) {
    await p.goto(`${page_url}#${hash}`);
    await p.waitForTimeout(400);
    await p.screenshot({ path: path.join(out, `${name}${suffix}.png`), fullPage: true });
  }
  await ctx.close();
}
await shot({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 }, views, "");
await shot({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  [["gruppen", "1-sensorgruppen"], ["wartung", "2-wartung"], ["szenarien", "3-szenarien"]], "-handy");
await shot({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, colorScheme: "dark" },
  [["wartung", "2-wartung"]], "-dunkel");
await browser.close();
