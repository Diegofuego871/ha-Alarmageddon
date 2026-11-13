// Kurzfilme der README (kein Test): ein Alarm läuft live ab, Handy und Desktop, Englisch und Deutsch.
// Aufruf im Wurzelverzeichnis: `node tests/panel/readme-video.mjs`; braucht ffmpeg. Ausgabe: docs/img/alarm-live-<handy|desktop>-<sprache>.gif
// Nur erfundene Daten (CLAUDE.md): der Nachbau liefert sie, "Diego" wird hier durch "Marco" ersetzt.
import { mkdirSync, rmSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { launch, R } from "./lib.mjs";
import { startServer } from "./server.mjs";

const PORT = 8962;
const out = fileURLToPath(new URL("../../docs/img/", import.meta.url));
const tmp = fileURLToPath(new URL("./output/video/", import.meta.url));
mkdirSync(out, { recursive: true });
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
const server = await startServer(PORT);
const browser = await launch();
const wait = (page, ms) => page.waitForTimeout(ms);

async function scene(lang, mobile) {
  const size = mobile ? { width: 390, height: 780 } : { width: 1180, height: 780 };
  const ctx = await browser.newContext({ viewport: size, ...(mobile ? { isMobile: true, hasTouch: true } : {}), deviceScaleFactor: 1, recordVideo: { dir: tmp, size } });
  const page = await ctx.newPage();
  const started = Date.now();
  await page.addInitScript(() => localStorage.setItem("alarmageddon.tab", "overview"));
  await page.goto(`http://127.0.0.1:${PORT}/ha-sim.html?lang=${lang}&theme=light`);
  const frameEl = await page.waitForSelector("#panel-frame");
  const frame = await frameEl.contentFrame();
  await frame.waitForFunction(new Function(`const r=${R}; return r && r.querySelector(".ag-view")`), null, { timeout: 10000 });
  const box = await frameEl.boundingBox();
  const root = "document.querySelector('alarmageddon-panel').shadowRoot";
  const run = (code) => frame.evaluate(new Function(`const r=${root}; const p=r.host; ${code}`));
  const alarm = (state, attrs = {}) => page.evaluate(([s, a]) => window.__setState("alarm_control_panel.haus", s, a), [state, attrs]);
  const iso = (offset = 0) => new Date(Date.now() + offset).toISOString();

  // Der Nachbau nennt "Diego": jeder Text, der es enthält, zeigt stattdessen "Marco" (auch später gezeichnete)
  await frame.evaluate(() => {
    const root = document.querySelector("alarmageddon-panel").shadowRoot;
    const fix = () => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) if (node.nodeValue.includes("Diego")) node.nodeValue = node.nodeValue.replaceAll("Diego", "Marco");
    };
    new MutationObserver(fix).observe(root, { childList: true, subtree: true, characterData: true });
    fix();
  });
  // Ausgangslage: Haus scharf (Abwesend), erfundener Name
  await page.evaluate(() => { for (const s of window.__systems) for (const e of s.events) if (e.by === "Diego") e.by = "Marco"; });
  await alarm("armed_away", { arm_mode: "away", changed_by: "Marco", armed_by: "Marco", armed_at: iso(-95 * 60e3), triggered_by: null, deadline: null });
  await frame.evaluate(() => document.querySelector("alarmageddon-panel")._fetch());
  await wait(page, 900);
  const t0 = (Date.now() - started) / 1000; // ab hier gilt der Film

  // Laufender Alarm im Protokoll, Schritt für Schritt
  const rec = { id: "live", start: iso(), end: null, ended_by: null, mode: "away", sensor: "binary_sensor.haustuer", entries: [] };
  const add = (entry) => { rec.entries.push({ t: iso(), ...entry }); return page.evaluate((r) => { window.__moreRecordings = [r]; window.__systems[0].events.unshift({ t: new Date().toISOString(), state: "x", mode: "away", by: "" }); }, rec); };
  // Protokoll neu laden und den laufenden Alarm unter die feste Kopfzeile rollen, damit seine Zeitachse und Schritte im Bild stehen
  const reloadLog = async () => {
    await run("return p.log.load()");
    await wait(page, 350);
    await run("const el = r.querySelector('.ag-inc'); const bar = r.querySelector('.ag-lg-tabs, .ag-seg'); if (el) p._content.scrollTop += el.getBoundingClientRect().top - 215;");
  };

  await wait(page, 1500);
  // Die Haustür geht auf: Eingangsverzögerung läuft
  await page.evaluate(() => window.__setState("binary_sensor.haustuer", "on"));
  await alarm("pending", { arm_mode: "away", triggered_by: "binary_sensor.haustuer", deadline: iso(9000) });
  await wait(page, 3500);
  // Niemand deaktiviert: Alarm
  await alarm("triggered", { arm_mode: "away", triggered_by: "binary_sensor.haustuer", deadline: null });
  await wait(page, 2200);
  // Protokoll: die Zeitachse füllt sich
  await run("r.querySelector('[data-tab=\"log\"]').click()");
  await add({ kind: "sensor", sensor: "binary_sensor.haustuer", to: "on" });
  await wait(page, 900);
  await run("p.log.touched = true; p.log.pane = 'alarms'; p.log.open = new Set(['live']);");
  await reloadLog();
  await wait(page, 900);
  await add({ kind: "state", state: "pending", sensor: "binary_sensor.haustuer" });
  await reloadLog();
  await wait(page, 1100);
  await add({ kind: "state", state: "triggered", sensor: "binary_sensor.haustuer" });
  await reloadLog();
  await wait(page, 900);
  await add({ kind: "notified", type: "triggered" });
  await add({ kind: "step", step: "action", action: "siren.turn_on", targets: ["siren.flur"], test: false });
  await reloadLog();
  await wait(page, 1200);
  await add({ kind: "step", step: "sound", targets: ["media_player.sonos_kueche"], sound: "siren" });
  await reloadLog();
  await wait(page, 2200);
  // Zurück zur Übersicht und quittieren
  await run("r.querySelector('[data-tab=\"overview\"]').click()");
  await wait(page, 1600);
  await run("r.querySelector('[data-act=\"ack\"]')?.click()");
  await alarm("armed_away", { arm_mode: "away", triggered_by: null, deadline: null });
  await page.evaluate(() => window.__setState("binary_sensor.haustuer", "off"));
  await wait(page, 2200);
  const t1 = (Date.now() - started) / 1000;

  const video = page.video();
  await ctx.close();
  const webm = await video.path();
  const name = `alarm-live-${mobile ? "handy" : "desktop"}-${lang}`;
  const width = mobile ? 300 : 760;
  const crop = `crop=${Math.round(box.width)}:${Math.round(box.height)}:${Math.round(box.x)}:${Math.round(box.y)}`;
  const vf = `${crop},fps=${mobile ? 10 : 6},scale=${width}:-1:flags=lanczos`;
  execFileSync("ffmpeg", ["-y", "-v", "error", "-ss", String(t0), "-t", String(t1 - t0), "-i", webm, "-vf", `${vf},split[a][b];[a]palettegen=max_colors=${mobile ? 96 : 64}[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`, "-loop", "0", `${out}${name}.gif`]);
  console.log(`${name}.gif`);
}

for (const lang of ["en", "de"]) for (const mobile of [true, false]) await scene(lang, mobile);
await browser.close();
server.close();
console.log(readdirSync(out).filter((f) => f.endsWith(".gif")).join("\n"));
