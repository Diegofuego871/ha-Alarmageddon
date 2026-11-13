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
// (Schritte laufen seit 1.10.0 standardmässig weiter: "wait": false; ohne die Angabe zeigte die Karte die Pille "Wartet …")
const FLOW = [
  { type: "notify" },
  { type: "prealarm", players: ["media_player.sonos_kueche"], sound: "pre_beep", volume: 0.3, duration: 20, wait: true },
  { type: "action", action: "siren.turn_on", target: ["siren.flur"], data: {}, restore: true, wait: false },
  { type: "wait", seconds: 180 },
  { type: "action", action: "siren.turn_off", target: ["siren.flur"], data: {}, wait: false },
];
// Aktionen beim Scharfschalten (1.14.0): ein kurzer Aktivierungston
const ARMED = [{ type: "chime", players: ["media_player.sonos_kueche"], sound: "tone_rise", duration: 3, volume: null, wait: false }];
// Aktionen beim Deaktivieren (1.27.0): ein kurzer Deaktivierungston
const DISARMED = [{ type: "dechime", players: ["media_player.sonos_kueche"], sound: "off_fall", duration: 3, volume: null, wait: false }];
// Aktionen nach dem Quittieren: das Licht im Flur wieder aus
const AFTER = [{ type: "action", action: "light.turn_off", target: ["light.flur"], data: {}, restore: false, wait: false }];

async function shot(lang, name, { mobile = false, tab = "overview", prepare, height = 760, scrollTo = null, query = "" } = {}) {
  const ctx = await browser.newContext(mobile
    ? { viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
    : { viewport: { width: 1180, height }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.addInitScript((t) => localStorage.setItem("alarmageddon.tab", t), tab);
  await page.goto(`http://127.0.0.1:${PORT}/ha-sim.html?lang=${lang}&theme=light${query}`);
  const frameEl = await page.waitForSelector("#panel-frame");
  const frame = await frameEl.contentFrame();
  await frame.waitForFunction(new Function(`const r=${R}; return r && r.querySelector(".ag-view")`), null, { timeout: 10000 });
  // Erfundene Namen und der Ablauf der README
  await page.evaluate(([flow, after, armed, disarmed]) => {
    const swap = (v) => (typeof v === "string" ? v.replaceAll("Diego", "Marco") : v);
    for (const s of window.__systems) {
      for (const e of s.events) e.by = swap(e.by);
      s.workflows = { home: flow, away: flow };
      s.workflows_after = { home: after, away: after };
      s.workflows_armed = { home: armed, away: armed };
      s.workflows_disarmed = { home: disarmed, away: disarmed };
    }
  }, [FLOW, AFTER, ARMED, DISARMED]);
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
  await shot(lang, "actions", { tab: "config", prepare: click('[data-sub="actions"]'), height: 1800 });
  // Das Kapitel "Beim Deaktivieren" liegt ganz unten: eigenes Bild, bis ans Ende der Seite gerollt
  await shot(lang, "actions-disarm", { tab: "config", height: 800, prepare: async ({ page, frame }) => {
    await click('[data-sub="actions"]')({ frame });
    await page.waitForTimeout(800);
    // Die Überschrift des letzten Kapitels knapp unter die feste Leiste rollen (sonst verdeckt sie die Leiste)
    await frame.evaluate(() => {
      const r = document.querySelector("alarmageddon-panel").shadowRoot;
      const chap = [...r.querySelectorAll(".ag-wf-chap")].pop();
      const bar = r.querySelector(".ag-cfg");
      r.host._content.scrollTop += chap.getBoundingClientRect().top - (bar.getBoundingClientRect().bottom + 12);
    });
  } });
  // Beendete Alarme sind zugeklappt (1.17.9): fürs Bild den neuesten aufklappen
  await shot(lang, "log", { tab: "log", prepare: click(".ag-inc-head") });
  await shot(lang, "mobile", { mobile: true });
  // Sensoransicht einer Tür über 7 Tage (1.9.0)
  await shot(lang, "sensor", { height: 900, prepare: async ({ page, frame }) => {
    await frame.evaluate(() => document.querySelector("alarmageddon-panel").sensorView.open("binary_sensor.haustuer"));
    await page.waitForTimeout(500);
    await frame.evaluate(() => document.querySelector("alarmageddon-panel").shadowRoot.querySelector('#ag-sensor .ag-sv-range [data-hours="168"]')?.click());
    await page.waitForTimeout(500);
  } });
  // Alarm auf dem Handy: rotes Band, Kachel mit Auslöser und "scharf seit … von …" (1.11.0)
  await shot(lang, "alarm", { mobile: true, prepare: async ({ page }) => {
    await page.evaluate(() => window.__setState("alarm_control_panel.haus", "triggered", { arm_mode: "away", changed_by: "Marco", armed_by: "Marco", armed_at: new Date(Date.now() - 95 * 60e3).toISOString(), triggered_by: "binary_sensor.haustuer", deadline: null }));
  } });
}
await browser.close();
server.close();
