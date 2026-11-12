// 1.20.0: Easter Egg. Dreimal rasch aufs Logo: es zoomt in die Mitte, zeigt Version und drehendes Schild. Ohne Link, ohne Code.
// "Bewegung reduzieren" gilt bewusst nicht (Vorgabe des Nutzers): die Animationen laufen trotzdem.
import { check, done, launch, open } from "../lib.mjs";

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    for (const reduce of [false, true]) {
      const tag = `${lang}/${mobile ? "Handy" : "Desktop"}${reduce ? "/Bewegung reduzieren" : ""}`;
      const s = await open(browser, { mobile, lang, tab: "overview" });
      if (reduce) await s.page.emulateMedia({ reducedMotion: "reduce" });
      const egg = () => s.ev("const e=r.querySelector('.ag-egg'); return e ? { v: e.querySelector('.ag-egg-v')?.textContent || '', links: e.querySelectorAll('a').length, text: e.textContent } : null");
      await s.ev("r.querySelector('.ag-logo').click(); r.querySelector('.ag-logo').click(); return 1");
      check(`${tag}: zwei Klicks öffnen nichts`, (await egg()) === null);
      await s.page.waitForTimeout(800); // das Zeitfenster der Klicks läuft ab
      await s.ev("for (let i=0;i<3;i++) r.querySelector('.ag-logo').click(); return 1");
      check(`${tag}: drei rasche Klicks öffnen das Fenster`, await s.waitFor("return !!r.querySelector('.ag-egg')"));
      const info = await egg();
      check(`${tag}: Version steht da, kein Link`, /1\.20\.0/.test(info.v) && info.links === 0 && !/github/i.test(info.text), JSON.stringify(info));
      await s.page.waitForTimeout(900);
      const motion = await s.ev("const q=(c)=>getComputedStyle(r.querySelector(c)).animationName; const b=r.querySelector('.ag-egg-pop').getBoundingClientRect(); return { logo:q('.ag-egg-logo'), beam:q('.ag-egg-beam'), glow:q('.ag-egg-glow'), cx: Math.round(b.left+b.width/2), cy: Math.round(b.top+b.height/2), vw: innerWidth, vh: innerHeight, inside: b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight }");
      check(`${tag}: Schild dreht, Lichtkegel kreist, A pulsiert (auch mit "Bewegung reduzieren")`, motion.logo === "ag-egg-y" && motion.beam === "ag-egg-z" && motion.glow === "ag-egg-pulse", JSON.stringify(motion));
      check(`${tag}: in der Mitte und ganz im Bild`, Math.abs(motion.cx - motion.vw / 2) <= 2 && Math.abs(motion.cy - motion.vh / 2) <= 2 && motion.inside, JSON.stringify(motion));
      const size = await s.ev("const b=r.querySelector('.ag-egg-pop').getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height), vw: innerWidth, vh: innerHeight, radius: getComputedStyle(r.querySelector('.ag-egg-pop')).borderRadius }");
      check(`${tag}: ${mobile ? "auf dem Handy bildfüllend" : "am Computer als Karte"}`, mobile ? size.w === size.vw && size.h === size.vh && size.radius === "0px" : size.w < size.vw / 2 && size.h < size.vh, JSON.stringify(size));
      const a1 = await s.ev("return getComputedStyle(r.querySelector('.ag-egg-logo')).transform");
      await s.page.waitForTimeout(400);
      const a2 = await s.ev("return getComputedStyle(r.querySelector('.ag-egg-logo')).transform");
      check(`${tag}: das Schild dreht sich wirklich`, a1 !== a2, `${a1} | ${a2}`);
      await s.ev("r.querySelector('.ag-logo').click(); r.querySelector('.ag-logo').click(); r.querySelector('.ag-logo').click(); return 1");
      check(`${tag}: weitere Dreifachklicks öffnen kein zweites Fenster`, (await s.ev("return r.querySelectorAll('.ag-egg').length")) === 1);
      await s.page.keyboard.press("Escape");
      check(`${tag}: Escape schliesst`, await s.waitFor("return !r.querySelector('.ag-egg')", 2500));
      await s.ev("for (let i=0;i<3;i++) r.querySelector('.ag-logo').click(); return 1");
      await s.waitFor("return !!r.querySelector('.ag-egg')");
      await s.page.waitForTimeout(800);
      await s.ev("r.querySelector('.ag-egg').click(); return 1");
      check(`${tag}: ein Tipp irgendwohin schliesst`, await s.waitFor("return !r.querySelector('.ag-egg')", 2500));
      check(`${tag}: keine Fehler im Browser`, s.errors.length === 0, s.errors.join(" | "));
      await s.ctx.close();
    }
  }
}
await browser.close();
done();
