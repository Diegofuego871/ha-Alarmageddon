// 1.24.0: Beim Ziehen eines Schritts scrollt die Seite von selbst mit, wenn der Zeiger am oberen oder unteren Rand steht (auch zu
// einer weit entfernten Liste), und eine andere Liste nimmt den Schritt auch an, wenn man ihn nur auf eine ihrer Aktionen zieht.
// Eine Liste, die diese Art von Schritt nicht aufnimmt, leuchtet rot.
import { check, done, launch, open } from "../lib.mjs";

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const s = await open(browser, { mobile, lang, tab: "config" });
    await s.tap('[data-sub="actions"]');
    await s.waitFor("return !!r.querySelector('.ag-wf-armed') && !!r.querySelector('.ag-wf-arming')");
    await s.page.waitForTimeout(700);
    const scroller = () => s.ev("return r.host._content.scrollTop");
    // Wartet, bis die Seite still steht (sanftes Scrollen)
    const settle = async () => { let last = -1, same = 0; while (same < 3) { const v = await scroller(); same = v === last ? same + 1 : 0; last = v; await s.page.waitForTimeout(100); } };
    const box = async (sel) => (await s.el(sel)).boundingBox();
    const kinds = (zone) => s.ev(`return [...r.querySelectorAll('.ag-wf-${zone} .ag-wf-step .ag-wf-icon')].map((e) => [...e.classList].find((c) => c.startsWith('k-')).slice(2)).join()`);
    // Eine lange Liste: 14 Wartezeiten, am Ende ein Gerät; in "Anlage scharf geschaltet" zwei Aktivierungstöne
    await s.ev(`const a=r.host.actions; a.ensureDraft();
      a._setSteps([...Array.from({ length: 14 }, () => ({ type: 'wait', seconds: 5 })), { type: 'action', action: 'light.turn_on', target: ['light.flur'], wait: false }], 'main');
      a._setSteps([{ type: 'chime', players: ['media_player.a'], sound: 'tone_pip', duration: 3, wait: false }, { type: 'chime', players: ['media_player.b'], sound: 'tone_pip', duration: 3, wait: false }], 'armed');
      a.render(); return 1`);
    await s.waitFor("return r.querySelectorAll('.ag-wf-main .ag-wf-step').length === 15");
    await s.page.waitForTimeout(300);
    // Grenzen des Bereichs, in dem gescrollt wird: unter den festen Leisten oben, über der Leiste unten
    const edge = async () => {
      const cfg = await box(".ag-cfg");
      const foot = await box(".ag-foot");
      return { top: cfg.y + cfg.height, bottom: foot.y };
    };

    // ----- 1. Nach oben mitscrollen: das Gerät ganz unten anfassen, an den oberen Rand fahren und dort halten -----
    // Das letzte Gerät des langen Ablaufs ins Bild holen (unter dem Alarmablauf folgen noch "Alarm endet" und "Beim Deaktivieren")
    await s.ev("const c=r.host._content; const e=r.querySelectorAll('.ag-wf-main .ag-wf-step')[14]; c.scrollTop += e.getBoundingClientRect().top - (r.querySelector('.ag-cfg').getBoundingClientRect().bottom + 260); return 1");
    await s.page.waitForTimeout(250);
    const before = await scroller();
    const grab = await box('.ag-wf-main .ag-wf-step[data-index="14"] [data-wf="grab"]');
    const e1 = await edge();
    await s.page.mouse.move(grab.x + grab.width / 2, grab.y + grab.height / 2);
    await s.page.mouse.down();
    await s.page.mouse.move(grab.x + grab.width / 2, grab.y + grab.height / 2 - 30, { steps: 4 });
    await s.page.mouse.move(grab.x + grab.width / 2, e1.top + 20, { steps: 10 });
    await s.page.waitForTimeout(900);
    const during = await scroller();
    check(`${tag}: am oberen Rand scrollt die Seite von selbst nach oben`, during < before - 150, `${before} -> ${during}`);
    // weiter halten, bis die Liste "Scharfschalten beginnt" im Bild ist, dann auf deren Plus ziehen und loslassen
    await s.waitFor("const a=r.querySelector('.ag-wf-arming .ag-wf-plus').getBoundingClientRect(); const cfg=r.querySelector('.ag-cfg').getBoundingClientRect(); return a.top > cfg.bottom + 4", 20000);
    const plus = await box(".ag-wf-arming .ag-wf-plus");
    await s.page.mouse.move(plus.x + plus.width / 2, plus.y + plus.height / 2, { steps: 6 });
    const lit = await s.ev("return [...r.querySelectorAll('.ag-wf-line.ag-drop')].map((e) => e.dataset.zone)");
    await s.page.mouse.up();
    check(`${tag}: das Gerät lässt sich so bis in die weit entfernte Liste ziehen`, JSON.stringify(lit) === JSON.stringify(["arming"]) && (await s.waitFor("return r.querySelectorAll('.ag-wf-arming .ag-wf-step').length === 1")) && (await kinds("main")).split(",").length === 14, JSON.stringify([lit, await kinds("arming")]));
    check(`${tag}: nach dem Loslassen scrollt nichts weiter`, await (async () => { await s.page.waitForTimeout(1200); const a = await scroller(); await s.page.waitForTimeout(500); return a === (await scroller()); })());

    // ----- 2. Nach unten mitscrollen -----
    await s.ev("r.querySelector('.ag-wf-armed .ag-wf-step[data-index=\"0\"]').scrollIntoView({ block: 'start' }); return 1");
    await s.page.waitForTimeout(400);
    const top0 = await scroller();
    const g2 = await box('.ag-wf-armed .ag-wf-step[data-index="0"] [data-wf="grab"]');
    const e2 = await edge();
    await s.page.mouse.move(g2.x + g2.width / 2, g2.y + g2.height / 2);
    await s.page.mouse.down();
    await s.page.mouse.move(g2.x + g2.width / 2, g2.y + g2.height / 2 + 30, { steps: 4 });
    await s.page.mouse.move(g2.x + g2.width / 2, e2.bottom - 20, { steps: 10 });
    await s.page.waitForTimeout(900);
    check(`${tag}: am unteren Rand scrollt die Seite von selbst nach unten`, (await scroller()) > top0 + 150, `${top0} -> ${await scroller()}`);
    await s.page.mouse.up();
    await s.ev("r.host._content.scrollTop = 0; return 1");
    await s.page.waitForTimeout(250);

    // Ziehen mit Mitscrollen: Karte anfassen, zum Rand fahren und dort halten, bis das Ziel im Bild ist, dann darauf fahren
    const dragTo = async (grabSel, targetSel) => {
      // Die Karte 140 px unter die festen Leisten holen (nicht scrollIntoView: das hängt vom Ende der Seite ab)
      await s.ev(`const c=r.host._content; const e=r.querySelector(${JSON.stringify(grabSel.replace(/ \[data-wf="grab"\]$/, ""))}); c.scrollTop += e.getBoundingClientRect().top - (r.querySelector('.ag-cfg').getBoundingClientRect().bottom + 140); return 1`);
      await s.page.waitForTimeout(150);
      await settle();
      const g = await box(grabSel);
      const e = await edge();
      const t0 = await box(targetSel);
      const up = t0.y < g.y;
      await s.page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
      await s.page.mouse.down();
      await s.page.mouse.move(g.x + g.width / 2, g.y + g.height / 2 + (up ? -20 : 20), { steps: 4 });
      const visible = `const t=r.querySelector(${JSON.stringify(targetSel)}).getBoundingClientRect(); const cfg=r.querySelector('.ag-cfg').getBoundingClientRect(); const foot=r.querySelector('.ag-foot').getBoundingClientRect(); return t.top > cfg.bottom + 110 && t.bottom < foot.top - 110`;
      if (!(await s.ev(visible))) {
        await s.page.mouse.move(g.x + g.width / 2, up ? e.top + 15 : e.bottom - 15, { steps: 8 });
        await s.waitFor(visible, 20000);
      }
      const t = await box(targetSel);
      await s.page.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 6 });
      return { lit: await s.ev("return [...r.querySelectorAll('.ag-wf-line.ag-drop')].map((e) => e.dataset.zone)"), red: await s.ev("return [...r.querySelectorAll('.ag-wf-line.ag-drop-no')].map((e) => e.dataset.zone)") };
    };

    // ----- 3. Nur auf eine Aktion der anderen Liste ziehen genügt: der Schritt aus "Scharfschalten beginnt" auf einen in "Anlage scharf geschaltet" -----
    const armedBefore = (await kinds("armed")).split(",").length;
    const r3 = await dragTo('.ag-wf-arming .ag-wf-step[data-index="0"] [data-wf="grab"]', '.ag-wf-armed .ag-wf-step[data-index="1"]');
    await s.page.mouse.up();
    check(`${tag}: auf eine Aktion der anderen Liste gezogen: die Liste leuchtet, der Schritt landet dort`, JSON.stringify(r3.lit) === JSON.stringify(["armed"]) && (await s.waitFor(`return r.querySelectorAll('.ag-wf-armed .ag-wf-step').length === ${armedBefore + 1} && r.querySelectorAll('.ag-wf-arming .ag-wf-step').length === 0`)), JSON.stringify([r3, await kinds("armed")]));

    await s.page.waitForTimeout(1200); // das sanfte Scrollen zur abgelegten Karte ist zu Ende
    // ----- 4. Eine Liste, die den Schritt nicht aufnimmt, leuchtet rot und nimmt ihn nicht: die Sirene über "Eingangsverzögerung läuft" -----
    await s.ev("const a=r.host.actions; a.ensureDraft(); a._setSteps([{ type: 'sound', players: ['media_player.a'], sound: 'siren', duration: 0, repeat: 1, restore: true }, ...Array.from({ length: 7 }, () => ({ type: 'wait', seconds: 5 }))], 'main'); a.render(); return 1");
    await s.waitFor("return r.querySelectorAll('.ag-wf-main .ag-wf-step').length === 8");
    await s.page.waitForTimeout(600); // das Neuzeichnen stellt die Scrollstellung wieder her: erst danach messen
    const r4 = await dragTo('.ag-wf-main .ag-wf-step[data-index="0"] [data-wf="grab"]', ".ag-wf-entry .ag-wf-plus");
    await s.page.mouse.up();
    check(`${tag}: die Sirene über "Eingangsverzögerung läuft": die Liste leuchtet rot, nichts wird verschoben`, JSON.stringify(r4.red) === JSON.stringify(["entry"]) && r4.lit.length === 0 && (await kinds("entry")) === "" && (await s.ev("return !r.querySelector('.ag-drop-no') && r.querySelectorAll('.ag-wf-main .ag-wf-step').length === 8")), JSON.stringify(r4));
    check(`${tag}: keine Fehler im Browser`, s.errors.length === 0, s.errors.join(" | "));
    await s.ctx.close();
  }
}
await browser.close();
done();
