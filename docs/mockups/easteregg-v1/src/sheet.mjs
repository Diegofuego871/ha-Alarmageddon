// Kontaktbogen: je Variante fünf Standbilder nebeneinander. Aufruf: node docs/mockups/easteregg-v1/src/sheet.mjs
import { fileURLToPath } from "node:url";
import { writeFileSync, rmSync } from "node:fs";
import { launch } from "../../../../tests/panel/lib.mjs";
const out = fileURLToPath(new URL("../", import.meta.url));
const b = await launch();
const p = await (await b.newContext({ viewport: { width: 1980, height: 760 } })).newPage();
for (const [v, title] of [["A", "A: Schild dreht sich, Lichtkegel kreist um das A"], ["B", "B: Schild steht, das A ist die Lampe, roter Blitz"]]) {
  const html = `<body style="margin:0;background:#000;color:#fff;font:20px system-ui"><div style="padding:10px 16px">${title} (Zoom, Popup, Drehung)</div><div style="display:flex;gap:10px;padding:0 10px">${["0-logo", "1-zoom", "2-popup", "3-drehung", "4-drehung"].map((n) => `<img src="file://${out}${v}-${n}.png" width="380">`).join("")}</div>`;
  writeFileSync(`${out}_sheet.html`, html);
  await p.goto(`file://${out}_sheet.html`);
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}${v === "A" ? "1" : "2"}-variante-${v}.png` });
}
rmSync(`${out}_sheet.html`, { force: true });
await b.close();
