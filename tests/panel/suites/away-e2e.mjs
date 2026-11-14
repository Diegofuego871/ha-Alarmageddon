// 1.34.5: Nach über 30 Minuten Abwesenheit startet das Panel wieder auf der Übersicht statt dort, wo der Benutzer zuletzt war.
// Beim Start (iframe neu geladen) und wenn das Panel offen blieb (Handy im Hintergrund). Ungespeicherte Änderungen gehen vor.
import { check, done, launch, open } from "../lib.mjs";

const browser = await launch();
const where = (s) => s.ev("return [r.host._tab, r.host._sub, r.host.actions.trigger]");
for (const lang of ["de", "en"]) {
  for (const mobile of [true, false]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const away = (min) => ({ sub: "system", trigger: "home", seen: `ago:${min}` });
    {
      const s = await open(browser, { mobile, lang, tab: "config", prefs: away(10) });
      check(`${tag}: nach 10 Minuten: Konfiguration, Anlage, Anwesend wie zuletzt`, JSON.stringify(await where(s)) === JSON.stringify(["config", "system", "home"]), JSON.stringify(await where(s)));
      await s.ctx.close();
    }
    {
      const s = await open(browser, { mobile, lang, tab: "config", prefs: away(31) });
      check(`${tag}: nach 31 Minuten: Übersicht, Sensoren, Standard`, JSON.stringify(await where(s)) === JSON.stringify(["overview", "sensors", "away"]), JSON.stringify(await where(s)));
      check(`${tag}: die Übersicht ist zu sehen`, await s.ev("return !!r.querySelector('.ag-sys') && !r.querySelector('.ag-cfg')"));
      await s.ctx.close();
    }
    {
      const s = await open(browser, { mobile, lang, tab: "config", prefs: { sub: "system" } });
      check(`${tag}: ohne gemerkte Zeit (erster Start, ältere Version): bleibt, wo der Benutzer war`, JSON.stringify(await where(s)) === JSON.stringify(["config", "system", "away"]), JSON.stringify(await where(s)));
      await s.ctx.close();
    }
    {
      // Panel blieb offen: Handy im Hintergrund, nach 31 Minuten wieder da
      const s = await open(browser, { mobile, lang, tab: "config", prefs: { sub: "system", seen: `ago:1` } });
      await s.sim("localStorage.setItem('alarmageddon.seen', String(Date.now() - 31 * 60000)); return 1");
      await s.ev("const d=r.host.ownerDocument; Object.defineProperty(d, 'visibilityState', { configurable: true, get: () => 'visible' }); d.dispatchEvent(new Event('visibilitychange')); return 1");
      check(`${tag}: Panel offen geblieben, nach 31 Minuten wieder sichtbar: Übersicht`, await s.waitFor("return r.host._tab === 'overview' && r.host._sub === 'sensors' && !!r.querySelector('.ag-sys')"), JSON.stringify(await where(s)));
      await s.ctx.close();
    }
    {
      // Offene Änderungen gehen vor: wer mitten in einer Bearbeitung war, bleibt dort
      const s = await open(browser, { mobile, lang, tab: "config", prefs: { sub: "system", seen: `ago:1` } });
      await s.ev("r.host.systemUi.dirtyCount = () => 1; return 1");
      await s.sim("localStorage.setItem('alarmageddon.seen', String(Date.now() - 31 * 60000)); return 1");
      await s.ev("const d=r.host.ownerDocument; Object.defineProperty(d, 'visibilityState', { configurable: true, get: () => 'visible' }); d.dispatchEvent(new Event('visibilitychange')); return 1");
      await s.page.waitForTimeout(400);
      check(`${tag}: mit ungespeicherter Änderung bleibt das Panel dort`, (await where(s)).slice(0, 2).join() === "config,system", JSON.stringify(await where(s)));
      await s.ctx.close();
    }
    {
      // Die Zeit wird laufend gemerkt (Panel sichtbar) und beim Verlassen
      const s = await open(browser, { mobile, lang, tab: "overview" });
      check(`${tag}: Zeit der letzten Sichtbarkeit ist gemerkt`, await s.sim("return Math.abs(Date.now() - Number(localStorage.getItem('alarmageddon.seen'))) < 20000"));
      await s.ctx.close();
    }
  }
}
await browser.close();
done();
