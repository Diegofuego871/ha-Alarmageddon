// Bilder der README aus dem HA-Nachbau erzeugen (kein Test): `CHROMIUM_PATH=... node readme-shots.mjs`, danach
// `python3 ../../scripts/optimize_images.py` (verkleinert die PNG). Ausgabe: docs/img/<ansicht>-<sprache>.png.
// Nur erfundene Daten (CLAUDE.md): echte Namen aus dem Nachbau werden vor der Aufnahme ersetzt.
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { launch, R } from "./lib.mjs";
import { startServer } from "./server.mjs";

const PORT = 8961;
const out = fileURLToPath(new URL("../../docs/img/", import.meta.url));
mkdirSync(out, { recursive: true });
const server = await startServer(PORT);
const browser = await launch();

// Ein Ablauf, wie ihn die README beschreibt: Meldung, Sirene ein, drei Minuten warten, Sirene aus
const FLOW = [
  { type: "notify" },
  { type: "action", action: "siren.turn_on", target: ["siren.flur"], data: {}, restore: true },
  { type: "wait", seconds: 180 },
  { type: "action", action: "siren.turn_off", target: ["siren.flur"], data: {} },
];

async function shot(lang, name, { mobile = false, tab = "overview", prepare, height = 760, scrollTo = null } = {}) {
  const ctx = await browser.newContext(mobile
    ? { viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
    : { viewport: { width: 1180, height }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.addInitScript((t) => localStorage.setItem("alarmageddon.tab", t), tab);
  await page.goto(`http://127.0.0.1:${PORT}/ha-sim.html?lang=${lang}&theme=light`);
  const frameEl = await page.waitForSelector("#panel-frame");
  const frame = await frameEl.contentFrame();
  await frame.waitForFunction(new Function(`const r=${R}; return r && r.querySelector(".ag-view")`), null, { timeout: 10000 });
  // Erfundene Namen und der Ablauf der README
  await page.evaluate((flow) => {
    const swap = (v) => (typeof v === "string" ? v.replaceAll("Diego", "Marco") : v);
    for (const s of window.__systems) {
      for (const e of s.events) e.by = swap(e.by);
      s.workflows = { home: flow, away: flow };
    }
  }, FLOW);
  await frame.evaluate(() => document.querySelector("alarmageddon-panel")._fetch());
  await page.waitForTimeout(400);
  if (prepare) await prepare({ page, frame });
  await page.waitForTimeout(600);
  // Auf den Inhalt rollen, um den es im Bild geht (der feste Kopf des Panels bleibt sichtbar)
  if (scrollTo) await frame.evaluate((sel) => {
    const el = document.querySelector("alarmageddon-panel").shadowRoot.querySelector(sel);
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 190);
  }, scrollTo);
  await page.waitForTimeout(300);
  await frame.evaluate(() => {
    const root = document.querySelector("alarmageddon-panel").shadowRoot;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) if (node.nodeValue.includes("Diego")) node.nodeValue = node.nodeValue.replaceAll("Diego", "Marco");
  });
  await frameEl.screenshot({ path: `${out}${name}-${lang}.png` });
  console.log(`${name}-${lang}.png`);
  await ctx.close();
}

const click = (sel) => ({ frame }) => frame.evaluate((s) => document.querySelector("alarmageddon-panel").shadowRoot.querySelector(s)?.click(), sel);
for (const lang of ["en", "de"]) {
  await shot(lang, "overview");
  await shot(lang, "sensors", { tab: "config" });
  await shot(lang, "actions", { tab: "config", prepare: click('[data-sub="actions"]'), height: 1190 });
  await shot(lang, "log", { tab: "log" });
  await shot(lang, "mobile", { mobile: true });
}
await browser.close();
server.close();
