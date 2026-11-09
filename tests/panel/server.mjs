// Statischer Server für den HA-Nachbau: /alarmageddon_panel/* kommt direkt aus custom_components (das getestete Panel),
// alles andere aus sim/. Aufbau wie in ha-device-panel.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const panelDir = join(here, "..", "..", "custom_components", "alarmageddon", "panel");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml", ".wav": "audio/wav" };
const PREFIX = "/alarmageddon_panel/";
const SOUNDS = "/alarmageddon_sounds/";
const soundsDir = join(here, "..", "..", "custom_components", "alarmageddon", "sounds");

function resolve(url) {
  const path = decodeURIComponent(new URL(url, "http://x").pathname);
  if (path.includes("..")) return null;
  if (path.startsWith(PREFIX)) return join(panelDir, path.slice(PREFIX.length));
  if (path === "/alarmageddon_icon.png") return join(here, "..", "..", "custom_components", "alarmageddon", "brand", "icon.png");
  if (path.startsWith(SOUNDS)) return join(soundsDir, path.slice(SOUNDS.length));
  return join(here, "sim", normalize(path === "/" ? "/ha-sim.html" : path));
}

export function startServer(port = 8960) {
  const server = createServer(async (req, res) => {
    if (req.url.startsWith("/favicon.ico")) return res.writeHead(204).end();
    const file = resolve(req.url);
    try {
      if (!file) throw new Error("ungültiger Pfad");
      const body = await readFile(file);
      res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream", "cache-control": "no-store" });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
  });
  return new Promise((ok) => server.listen(port, "127.0.0.1", () => ok(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await startServer(Number(process.env.PORT || 8960));
  console.log("HA-Nachbau unter http://127.0.0.1:8960/ha-sim.html");
}
