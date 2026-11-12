// Standbilder der Animation: Zeitpunkte per Web Animations auf feste Werte gesetzt. Aufruf: node docs/mockups/easteregg-v1/src/shots.mjs
import { fileURLToPath } from "node:url";
import { launch } from "../../../../tests/panel/lib.mjs";
const here = fileURLToPath(new URL("./", import.meta.url)), out = fileURLToPath(new URL("../", import.meta.url));
const b = await launch();
const frames = [["0-logo", null], ["1-zoom", 180], ["2-popup", 700], ["3-drehung", 1500], ["4-drehung", 2300]];
for (const v of ["A", "B"]) {
  const p = await (await b.newContext({ viewport: { width: 390, height: 700 }, deviceScaleFactor: 2 })).newPage();
  await p.goto(`file://${here}anim.html?v=${v}`);
  for (const [name, t] of frames) {
    await p.goto(`file://${here}anim.html?v=${v}`);
    await p.evaluate(async (t) => {
      if (t === null) { document.getAnimations().forEach((a) => a.cancel()); return; }
      const z = open_(); z.pause(); z.currentTime = Math.min(t, 700);
      for (const a of document.getAnimations()) if (a !== z && a.effect?.target?.id !== "scrim") a.currentTime = t;
      document.getElementById("scrim").getAnimations().forEach((a) => (a.currentTime = Math.min(t, 500)));
    }, t);
    await p.screenshot({ path: `${out}${v}-${name}.png` });
  }
}
await b.close();
