// 1.9.0: Auf dem Handy füllt jedes Fenster den Bildschirm: X ganz oben rechts, die Leiste mit den Knöpfen ganz unten und nie im
// scrollenden Teil (sie bewegt sich beim Scrollen nicht). Nur die kurzen Rückfragen bleiben ein Blatt von unten. Desktop unverändert.
// Dazu die Kachel der Anlage: scharf ist rot (Symbol, Text, gewählter Modus, Rahmen), im dunklen Design kräftiger; der Pfeil der
// Kachel öffnet weiter die Alarm-Entität in Home Assistant.
import { check, done, launch, open, outDir } from "../lib.mjs";

const DOOR = "binary_sensor.haustuer";
const PROBE = `const d=r.getElementById(ID); if (!d || !d.open) return null; const b=d.getBoundingClientRect(); const xb=d.querySelector(':scope > .ag-dlg-x')?.getBoundingClientRect();
  const bar=d.querySelector('.ag-dlg-btns'); const scroller=[...d.querySelectorAll('.ag-dlg-body, .ag-side-body, .ag-sv-list')].find((e) => ['auto', 'scroll'].includes(getComputedStyle(e).overflowY));
  let moved=null; if (bar && scroller) { const before=bar.getBoundingClientRect().top; scroller.scrollTop=scroller.scrollHeight; moved=Math.abs(bar.getBoundingClientRect().top - before); scroller.scrollTop=0; }
  const bb=bar?.getBoundingClientRect();
  return { full: Math.round(b.width) === innerWidth && Math.round(b.height) === innerHeight && Math.round(b.top) === 0 && Math.round(b.left) === 0, h: Math.round(b.height), bottom: Math.round(innerHeight - b.bottom),
    radius: getComputedStyle(d).borderTopLeftRadius, x: xb ? { top: Math.round(xb.top - b.top), right: Math.round(b.right - xb.right) } : null, dialogScrolls: d.scrollHeight > d.clientHeight + 1,
    bar: bar ? { docked: bar.parentElement === d, form: bar.parentElement.tagName === 'FORM', inScroller: !!scroller && scroller.contains(bar), gap: Math.round(b.bottom - bb.bottom), moved, canScroll: !!scroller && scroller.scrollHeight > scroller.clientHeight + 1 } : null }`;

const browser = await launch();
for (const lang of ["de", "en"]) {
  // ----- Handy: jedes Fenster über den ganzen Bildschirm -----
  {
    const tag = `${lang}/Handy`;
    const s = await open(browser, { mobile: true, lang });
    const probe = (id) => s.ev(PROBE.replace("ID", JSON.stringify(id)));
    const opened = (id) => s.waitFor(`return r.getElementById("${id}").open`);
    const closeX = async (id) => {
      await s.ev(`r.getElementById("${id}").querySelector(':scope > .ag-dlg-x').click(); return 1`);
      await s.waitFor(`return !r.getElementById("${id}").open`);
    };
    const expectFull = (name, p, { bar = true, form = false } = {}) => {
      check(`${tag}: ${name}: ganzer Bildschirm, ohne Rand und ohne runde Ecken`, !!p && p.full && p.radius === "0px" && !p.dialogScrolls, JSON.stringify(p));
      check(`${tag}: ${name}: X ganz oben rechts`, !!p?.x && p.x.top <= 16 && p.x.right <= 16, JSON.stringify(p?.x));
      if (!bar) return;
      check(`${tag}: ${name}: Leiste mit den Knöpfen ganz unten`, !!p?.bar && p.bar.gap === 0, JSON.stringify(p?.bar));
      if (form) check(`${tag}: ${name}: Leiste bleibt im Formular (Speichern schickt es ab), das Fenster scrollt nicht`, p.bar.form && !p.bar.canScroll, JSON.stringify(p.bar));
      else check(`${tag}: ${name}: Leiste steht ausserhalb des scrollenden Inhalts und bewegt sich beim Scrollen nicht`, p.bar.docked && !p.bar.inScroller && (p.bar.moved === null || p.bar.moved === 0), JSON.stringify(p.bar));
    };

    await s.waitFor(`return !!r.querySelector('[data-act="more"][data-entity="${DOOR}"]')`);
    await s.tap('[data-list="view"]');
    await opened("ag-view");
    const view = await probe("ag-view");
    expectFull('"Ansicht"', view);
    check(`${tag}: "Ansicht": der Inhalt ist länger als der Bildschirm und scrollt unter der festen Leiste`, view.bar.canScroll);
    await s.page.screenshot({ path: `${outDir}fullscreen-view-${lang}.png` });
    await s.tap('[data-list="vdone"]');

    await s.tap(`[data-act="more"][data-entity="${DOOR}"]`);
    await opened("ag-sensor");
    expectFull("Sensoransicht", await probe("ag-sensor"), { bar: false });
    await closeX("ag-sensor");

    await s.tap('[data-act="rename"]');
    await opened("ag-rename");
    expectFull('"Umbenennen"', await probe("ag-rename"), { form: true });
    await closeX("ag-rename");

    await s.tap('[data-tab="config"]');
    await s.waitFor("return !!r.querySelector('[data-sen=\"presets\"]')");
    await s.tap('[data-sen="presets"]');
    await opened("ag-presets");
    expectFull('"Voreinstellungen"', await probe("ag-presets"));
    check(`${tag}: "Voreinstellungen": alle drei Knöpfe der Leiste sind ganz zu sehen (nichts abgeschnitten)`, await s.ev("const d=r.getElementById('ag-presets'); const bar=d.querySelector(':scope > .ag-dlg-btns'); const bb=bar.getBoundingClientRect(); const btns=[...bar.querySelectorAll('button')]; return btns.length === 3 && btns.every((b) => { const q=b.getBoundingClientRect(); return q.left >= bb.left && q.right <= bb.right + 0.5 && b.scrollWidth <= b.clientWidth + 1; })"));
    await s.page.screenshot({ path: `${outDir}fullscreen-presets-${lang}.png` });
    // Mit einer Änderung fragt das X nach: die Rückfrage bleibt ein kurzes Blatt von unten
    await s.ev("r.getElementById('ag-presets').querySelector('.ag-box').click(); return 1");
    await s.ev("r.getElementById('ag-presets').querySelector(':scope > .ag-dlg-x').click(); return 1");
    await opened("ag-confirm");
    const ask = await probe("ag-confirm");
    check(`${tag}: Rückfrage "Verwerfen?" bleibt ein kurzes Blatt von unten`, !!ask && !ask.full && ask.h < 420 && ask.bottom === 0, JSON.stringify(ask));
    await s.ev("r.getElementById('ag-confirm').querySelector('[data-c=\"yes\"]').click(); return 1");
    await s.waitFor("return !r.getElementById('ag-confirm').open && !r.getElementById('ag-presets').open");

    await s.tap('[data-sen="add"]');
    await opened("ag-pick");
    expectFull('"Sensoren hinzufügen"', await probe("ag-pick"));
    await closeX("ag-pick");

    await s.tap(`[data-sen="detail"][data-ent="${DOOR}"]`);
    await opened("ag-sheet");
    const sheet = await probe("ag-sheet");
    expectFull("Blatt des Sensors", sheet);
    check(`${tag}: Blatt des Sensors: nur die Optionen scrollen`, sheet.bar.canScroll && sheet.bar.moved === 0, JSON.stringify(sheet.bar));
    await s.tap('#ag-sheet .ag-dlg-btns [data-sen="close-detail"]');

    await s.tap('[data-sub="actions"]');
    await s.waitFor("return !!r.querySelector('.ag-wf-step [data-wf=\"edit\"]')");
    await s.ev("r.querySelector('.ag-wf-step [data-wf=\"edit\"]').click(); return 1");
    await opened("ag-step");
    expectFull("Schritt bearbeiten", await probe("ag-step"));
    await s.page.screenshot({ path: `${outDir}fullscreen-step-${lang}.png` });
    await closeX("ag-step");
    check(`${tag}: kein Überlauf, keine Fehler im Browser`, (await s.ev("return document.documentElement.scrollWidth <= window.innerWidth")) && s.errors.length === 0, s.errors.join(" | "));
    await s.ctx.close();
  }

  // ----- Desktop: Fenster wie bisher (mittig, Leiste im Inhalt) -----
  {
    const tag = `${lang}/Desktop`;
    const s = await open(browser, { mobile: false, lang });
    await s.tap('[data-list="view"]');
    await s.waitFor('return r.getElementById("ag-view").open');
    const p = await s.ev(PROBE.replace("ID", '"ag-view"'));
    check(`${tag}: Fenster bleibt mittig und schmal, die Leiste bleibt im Inhalt`, !!p && !p.full && p.radius !== "0px" && !p.bar.docked, JSON.stringify(p));
    await s.tap('[data-list="vdone"]');
    await s.ctx.close();
  }

  // ----- Kachel der Anlage: scharf ist rot, hell und dunkel, Desktop und Handy -----
  for (const mobile of [false, true]) {
    const tints = {};
    for (const theme of ["light", "dark"]) {
      const tag = `${lang}/${mobile ? "Handy" : "Desktop"}/${theme === "dark" ? "dunkel" : "hell"}`;
      const s = await open(browser, { mobile, lang, theme });
      await s.waitFor("return !!r.querySelector('.ag-sys.ag-armed')");
      await s.page.waitForTimeout(300);
      const c = await s.ev(`const col=(v) => { const e=document.createElement("span"); e.style.color="var(" + v + ")"; r.appendChild(e); const x=getComputedStyle(e).color; e.remove(); return x; };
        const a=r.querySelector('.ag-sys.ag-armed'), g=r.querySelector('.ag-sys.ag-disarmed'); const cs=getComputedStyle(a);
        return { err: col("--ag-error"), ok: col("--ag-success"), pri: col("--ag-primary"), shield: getComputedStyle(a.querySelector('.ag-shield')).color, state: getComputedStyle(a.querySelector('.ag-sys-state')).color,
          on: getComputedStyle(a.querySelector('.ag-seg > button.on')).color, pill: getComputedStyle(a.querySelector('.ag-seg > .ag-pill')).backgroundColor, plain: getComputedStyle(g.querySelector('.ag-seg > .ag-pill')).backgroundColor,
          off: getComputedStyle(g.querySelector('.ag-seg > button.on')).color, border: cs.borderTopColor, divider: getComputedStyle(g).borderTopColor, tint: cs.getPropertyValue('--ag-armed-tint').trim(), image: cs.backgroundImage, dark: r.host.hasAttribute('dark') }`);
      tints[theme] = c;
      check(`${tag}: scharf: Symbol, Zustand und gewählter Modus sind rot (nicht blau)`, c.shield === c.err && c.state === c.err && c.on === c.err && c.on !== c.pri, JSON.stringify(c));
      check(`${tag}: scharf: der gewählte Modus ist rot hinterlegt, die Kachel rot umrandet`, c.pill !== c.plain && c.border !== c.divider, `${c.pill} / ${c.border}`);
      check(`${tag}: deaktiviert: "Aus" ist grün`, c.off === c.ok);
      check(`${tag}: Design erkannt (${theme})`, c.dark === (theme === "dark"));
      // Alarm hebt sich von "scharf" ab: gefülltes rotes Symbol mit weissem Zeichen
      await s.sim('window.__setState("alarm_control_panel.haus", "triggered", { arm_mode: "away" })');
      check(`${tag}: Alarm: gefülltes rotes Symbol mit weissem Zeichen`, await s.waitFor(`const sh=r.querySelector('[data-system="e_haus"] .ag-shield'); const cs=getComputedStyle(sh); return cs.backgroundColor === ${JSON.stringify(c.err)} && cs.color === "rgb(255, 255, 255)"`));
      // Der Pfeil der Kachel öffnet die Alarm-Entität in Home Assistant, nicht die Sensoransicht
      await s.ev("const h=r.host; h.__more=[]; const o=h._moreInfo.bind(h); h._moreInfo=(id) => { h.__more.push(id); o(id); }; r.querySelector('[data-system=\"e_haus\"] [data-act=\"more\"]').click(); return 1");
      check(`${tag}: Pfeil der Kachel öffnet die Anlage in Home Assistant`, (await s.ev("return r.host.__more.join()")) === "alarm_control_panel.haus" && !(await s.ev("return r.getElementById('ag-sensor').open")));
      if (theme === "dark") await s.page.screenshot({ path: `${outDir}armed-dark-${lang}-${mobile ? "mobile" : "desktop"}.png` });
      await s.ctx.close();
    }
    check(`${lang}/${mobile ? "Handy" : "Desktop"}: im dunklen Design ist der rote Verlauf kräftiger (${tints.light.tint} -> ${tints.dark.tint})`, parseFloat(tints.dark.tint) > parseFloat(tints.light.tint) && tints.dark.image !== tints.light.image);
  }
}
await browser.close();
done();
