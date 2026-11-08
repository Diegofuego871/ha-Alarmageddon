// Gemeinsame Hilfen der Panel-Suiten: Browser, Nachbau öffnen, Prüfungen mit PASS/FAIL (wie ha-device-panel).
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

export const PORT = Number(process.env.PANEL_PORT || 8960);
export const outDir = fileURLToPath(new URL("./output/", import.meta.url));
mkdirSync(outDir, { recursive: true });
// Eigener Chromium über CHROMIUM_PATH, sonst der von "npx playwright-core install chromium"
export const launch = () => chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

export const DESKTOP = { viewport: { width: 1400, height: 950 } };
export const MOBILE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
export const R = 'document.querySelector("alarmageddon-panel").shadowRoot';

let failures = 0;
export function check(name, ok, detail = "") {
  if (ok) console.log(`PASS ${name}`);
  else {
    failures += 1;
    console.log(`FAIL ${name}${detail ? `: ${detail}` : ""}`);
  }
}
export const done = () => process.exit(failures ? 1 : 0);

// Seite im Nachbau öffnen; tab: gespeicherter Reiter; query: zusätzliche Parameter
export async function open(browser, { mobile = false, lang = "de", theme = "light", tab = "overview", query = "" } = {}) {
  const ctx = await browser.newContext(mobile ? MOBILE : DESKTOP);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.addInitScript((t) => {
    try {
      localStorage.setItem("alarmageddon.tab", t);
    } catch {}
  }, tab);
  await page.goto(`http://127.0.0.1:${PORT}/ha-sim.html?lang=${lang}&theme=${theme}${query}`);
  const frame = await (await page.waitForSelector("#panel-frame")).contentFrame();
  await frame.waitForFunction(new Function(`const r=${R}; return r && r.querySelector(".ag-view") && (r.querySelector(".ag-sys, .ag-gbody .ag-card, .ag-empty"))`), null, { timeout: 10000 });
  const ev = (code, arg) => frame.evaluate(new Function("arg", `const r=${R};` + code), arg);
  const sim = (code, arg) => page.evaluate(new Function("arg", code), arg);
  const el = (sel) => frame.evaluateHandle(new Function(`return ${R}.querySelector(${JSON.stringify(sel)})`)).then((h) => h.asElement());
  const waitFor = (code, timeout = 5000) => frame.waitForFunction(new Function(`const r=${R};` + code), null, { timeout }).then(() => true, () => false);
  const tap = async (sel) => {
    const h = await el(sel);
    if (!h) throw new Error(`nicht gefunden: ${sel}`);
    if (mobile) await h.tap();
    else await h.click();
  };
  return { ctx, page, frame, ev, sim, el, tap, waitFor, errors };
}
