// 1.22.0: Ein Schritt lässt sich in eine andere Liste ziehen, auch in eine leere (auf das Plus oder die Fläche der Liste). Er springt
// dorthin und wird für die Liste umgerechnet. Nur in Listen, die diese Art von Schritt aufnehmen (die Sirene nicht in die Verzögerung).
// Tastatur-Ersatz: Pfeiltaste über den Rand der Liste hinaus.
import { check, done, launch, open } from "../lib.mjs";

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const s = await open(browser, { mobile, lang, tab: "config" });
    await s.page.setViewportSize(mobile ? { width: 390, height: 3200 } : { width: 1440, height: 2600 }); // alle Listen zugleich im Bild
    await s.tap('[data-sub="actions"]');
    await s.waitFor("return !!r.querySelector('.ag-wf-armed') && !!r.querySelector('.ag-wf-main') && !!r.querySelector('.ag-wf-arming')");
    await s.page.waitForTimeout(700);
    const kinds = (zone) => s.ev(`return [...r.querySelectorAll('.ag-wf-${zone} .ag-wf-step .ag-wf-icon')].map((e) => [...e.classList].find((c) => c.startsWith('k-')).slice(2)).join()`);
    const draft = (zone) => s.ev(`const a=r.host.actions; return JSON.parse(JSON.stringify(a.steps('${zone}')))`);
    const box = async (sel) => (await s.el(sel)).boundingBox();
    // Ziehen vom Griff zur Mitte einer Fläche; "probe" liest mitten im Ziehen, ob die Liste aufleuchtet
    const drag = async (grabSel, toSel, probe) => {
      const g = await box(grabSel);
      const t = await box(toSel);
      await s.page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
      await s.page.mouse.down();
      await s.page.mouse.move(g.x + g.width / 2, g.y + g.height / 2 - 20, { steps: 4 });
      await s.page.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 10 });
      const lit = await s.ev("return [...r.querySelectorAll('.ag-wf-line.ag-drop')].map((e) => [...e.classList].find((c) => /^ag-wf-(arming|armed|entry|main|after)$/.test(c)).slice(6))");
      await s.page.mouse.up();
      return lit;
    };

    const before = await kinds("main");
    check(`${tag}: Ausgangslage: der Alarmablauf hat Schritte, die Liste "Scharfschalten beginnt" ist leer`, before === "notify,device,wait,device,sound" && (await kinds("arming")) === "", before);

    // ----- In eine leere Liste ziehen: ein Gerät vom Alarmablauf in "Eingangsverzögerung läuft" -----
    const lit = await drag('.ag-wf-main .ag-wf-step[data-index="1"] [data-wf="grab"]', ".ag-wf-entry .ag-wf-plus");
    check(`${tag}: beim Ziehen leuchtet die Zielliste auf`, JSON.stringify(lit) === JSON.stringify(["entry"]), JSON.stringify(lit));
    check(`${tag}: das Gerät ist in die leere Liste gesprungen, im Alarmablauf fehlt es`, await s.waitFor(`return [...r.querySelectorAll('.ag-wf-entry .ag-wf-step .ag-wf-icon')].length === 1`) && (await kinds("main")) === "notify,wait,device,sound", `${await kinds("entry")} | ${await kinds("main")}`);
    const moved = (await draft("entry"))[0];
    check(`${tag}: der Schritt blieb ein Gerät (Aktion unverändert)`, moved?.type === "action", JSON.stringify(moved));
    check(`${tag}: danach leuchtet nichts mehr`, await s.ev("return !r.querySelector('.ag-drop')"));
    check(`${tag}: 1 Änderung, Speichern möglich`, await s.ev("return !r.querySelector('[data-wf=\"save\"]').disabled"));

    // ----- Die Sirene geht nicht in eine Verzögerung -----
    const litNo = await drag('.ag-wf-main .ag-wf-step[data-index="3"] [data-wf="grab"]', ".ag-wf-arming .ag-wf-plus");
    check(`${tag}: die Sirene (Alarmton) leuchtet keine Verzögerung an und bleibt im Alarmablauf (nur umsortiert)`, litNo.length === 0 && (await kinds("main")).split(",").sort().join() === "device,notify,sound,wait" && (await kinds("arming")) === "", JSON.stringify([litNo, await kinds("main")]));

    // ----- Aktivierungston aus "Anlage scharf geschaltet" in "Scharfschalten beginnt": folgt danach der Verzögerung -----
    await s.ev("const a=r.host.actions; a.ensureDraft(); a._setSteps([{ type: 'chime', players: ['media_player.sonos_wohnzimmer'], sound: 'tone_pip', duration: 3, wait: false }], 'armed'); a.render(); return 1");
    await s.waitFor("return r.querySelectorAll('.ag-wf-armed .ag-wf-step').length === 1");
    await drag('.ag-wf-armed .ag-wf-step[data-index="0"] [data-wf="grab"]', ".ag-wf-arming .ag-wf-plus");
    await s.waitFor("return r.querySelectorAll('.ag-wf-arming .ag-wf-step').length === 1");
    const chime = (await draft("arming"))[0];
    check(`${tag}: der Aktivierungston folgt nun der Ausgangsverzögerung (Schalter an), "Anlage scharf" ist leer`, chime?.type === "chime" && chime.delay === true && chime.wait === false && (await kinds("armed")) === "", JSON.stringify(chime));
    // Zurück: ausserhalb der Verzögerung gibt es das nicht mehr
    await drag('.ag-wf-arming .ag-wf-step[data-index="0"] [data-wf="grab"]', ".ag-wf-armed .ag-wf-plus");
    await s.waitFor("return r.querySelectorAll('.ag-wf-armed .ag-wf-step').length === 1");
    check(`${tag}: zurück nach "Anlage scharf geschaltet": ohne "folgt der Verzögerung"`, !(await draft("armed"))[0]?.delay, JSON.stringify(await draft("armed")));

    // ----- Innerhalb einer Liste verschieben geht weiter -----
    await drag('.ag-wf-main .ag-wf-step[data-index="2"] [data-wf="grab"]', '.ag-wf-main .ag-wf-step[data-index="0"]');
    check(`${tag}: Umsortieren in der eigenen Liste funktioniert weiter`, (await kinds("main")).split(",").length === 4 && (await kinds("main")) !== "notify,wait,device,sound", await kinds("main"));

    // ----- Tastatur: Pfeil nach unten am Ende der Liste "Eingangsverzögerung läuft" führt in die nächste Liste (Alarmablauf) -----
    const mainBefore = (await kinds("main")).split(",").length;
    await s.ev("r.querySelector('.ag-wf-entry .ag-wf-step[data-index=\"0\"] [data-wf=\"grab\"]').focus(); return 1");
    await s.page.keyboard.press("ArrowDown");
    check(`${tag}: Pfeil nach unten über den Rand: der Schritt steht am Anfang des Alarmablaufs, Fokus folgt`, await s.waitFor(`return r.querySelectorAll('.ag-wf-entry .ag-wf-step').length === 0 && r.querySelectorAll('.ag-wf-main .ag-wf-step').length === ${mainBefore + 1} && r.activeElement?.dataset?.wf === 'grab' && r.activeElement.closest('.ag-wf-main')`));
    await s.page.keyboard.press("ArrowUp");
    check(`${tag}: Pfeil nach oben am Anfang: zurück in die Verzögerung`, await s.waitFor("return r.querySelectorAll('.ag-wf-entry .ag-wf-step').length === 1"));

    // ----- Speichern: die Listen kommen so am Server an -----
    await s.tap('[data-wf="save"]');
    await s.waitFor("return window.__calls?.some?.((x) => x.type === 'alarmageddon/save_workflows')").catch?.(() => 0);
    const calls = await s.sim("return window.__calls.filter((x) => x.type === 'alarmageddon/save_workflows').length");
    check(`${tag}: Speichern sendet`, calls >= 1, String(calls));
    check(`${tag}: keine Fehler im Browser`, s.errors.length === 0, s.errors.join(" | "));
    await s.ctx.close();
  }
}
await browser.close();
done();
