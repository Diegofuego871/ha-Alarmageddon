// 1.26.0: Jeder Ton (Aktivierungston, Voralarm, Alarmton ausserhalb des Alarmablaufs) hat den Schalter "Lautsprecher danach
// zurückstellen": standardmässig an, je Schritt abschaltbar, gespeichert als restore. Geräte haben ihn dort nicht.
import { check, done, launch, open } from "../lib.mjs";

const TXT = {
  de: { tone: "Lautsprecher danach zurückstellen", old: "Rückgängig beim Deaktivieren/Quittieren" },
  en: { tone: "Put the speaker back afterwards", old: "Undo on disarm / acknowledge" },
};

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const t = TXT[lang];
    const s = await open(browser, { mobile, lang, tab: "config" });
    await s.tap('[data-sub="actions"]');
    await s.waitFor("return !!r.querySelector('.ag-wf-armed') && !!r.querySelector('.ag-wf-entry') && !!r.querySelector('.ag-wf-main')");
    await s.page.waitForTimeout(600);
    const sw = () => s.ev("const d=r.getElementById('ag-step'); const b=d.querySelector('[data-wf=\"restore\"]'); return b ? { on: b.getAttribute('aria-checked') === 'true', text: b.closest('.ag-ef-row').innerText } : null");
    const pickPlayer = async () => {
      await s.ev("const i=r.querySelector('#ag-step .ag-combo input, #ag-step input[type=\"search\"]'); i.focus(); i.value='Sonos'; i.dispatchEvent(new Event('input', { bubbles: true })); return 1");
      await s.waitFor("return !!r.querySelector('#ag-step [data-wf=\"pick\"]')");
      await s.ev("r.querySelector('#ag-step [data-wf=\"pick\"]').click(); return 1");
    };
    const addStep = async (zoneSel, kind, off) => {
      await s.ev(`const b=r.querySelector('${zoneSel} [data-wf="add"]'); b.scrollIntoView({ block: 'center' }); b.click(); return 1`);
      await s.waitFor("return r.getElementById('ag-step').open");
      await s.tap(`#ag-step [data-wf="kind"][data-kind="${kind}"]`);
      await s.waitFor("return !!r.querySelector('#ag-step .ag-tone, #ag-step .ag-combo')");
      const state = await sw();
      if (off && state) await s.tap('#ag-step [data-wf="restore"]');
      const after = await sw();
      await pickPlayer();
      await s.tap('#ag-step [data-wf="apply"]');
      await s.waitFor("return !r.getElementById('ag-step').open");
      return { state, after };
    };
    const saved = (zone) => s.ev(`return JSON.parse(JSON.stringify(r.host.actions.steps('${zone}')))`);

    // Aktivierungston beim Scharfschalten: Schalter an; ausgeschaltet wird er als restore = false gespeichert
    const chime = await addStep(".ag-wf-armed", "chime", true);
    check(`${tag}: Aktivierungston: Schalter "${t.tone}" da und standardmässig an`, chime.state?.on === true && chime.state.text.includes(t.tone), JSON.stringify(chime.state));
    check(`${tag}: Aktivierungston: ausschaltbar`, chime.after?.on === false);
    check(`${tag}: Aktivierungston gespeichert mit restore = false`, (await saved("armed"))[0]?.type === "chime" && (await saved("armed"))[0].restore === false, JSON.stringify(await saved("armed")));

    // Voralarm in der Eingangsverzögerung: standardmässig an
    const pre = await addStep(".ag-wf-entry", "prealarm", false);
    check(`${tag}: Voralarm: Schalter da und an`, pre.state?.on === true && pre.state.text.includes(t.tone), JSON.stringify(pre.state));
    check(`${tag}: Voralarm gespeichert mit restore = true`, (await saved("entry"))[0]?.type === "prealarm" && (await saved("entry"))[0].restore === true, JSON.stringify(await saved("entry")));

    // Alarmton nach dem Quittieren: derselbe Schalter (er endet dort von selbst)
    const sound = await addStep(".ag-wf-after", "sound", false);
    check(`${tag}: Alarmton nach dem Quittieren: Schalter da und an`, sound.state?.on === true && sound.state.text.includes(t.tone), JSON.stringify(sound.state));
    check(`${tag}: Alarmton nach dem Quittieren gespeichert mit restore = true`, (await saved("after"))[0]?.type === "sound" && (await saved("after"))[0].restore === true, JSON.stringify(await saved("after")));

    // Gerät beim Scharfschalten: kein Schalter (dort kehrt kein Gerät zurück)
    await s.ev("const b=r.querySelector('.ag-wf-armed [data-wf=\"add\"][data-at=\"1\"]'); b.scrollIntoView({ block: 'center' }); b.click(); return 1");
    await s.waitFor("return r.getElementById('ag-step').open");
    await s.tap('#ag-step [data-wf="kind"][data-kind="device"]');
    await s.waitFor("return !!r.querySelector('#ag-step .ag-combo')");
    check(`${tag}: Gerät beim Scharfschalten: kein Schalter zum Zurückstellen`, (await sw()) === null);
    await s.ev("for (const d of r.querySelectorAll('dialog[open]')) d.close(); return 1");

    // Alarmton im Alarmablauf: der bekannte Schalter ("Rückgängig beim Deaktivieren"), nicht der neue
    await s.ev("const b=r.querySelector('.ag-wf-main [data-wf=\"add\"]'); b.scrollIntoView({ block: 'center' }); b.click(); return 1");
    await s.waitFor("return r.getElementById('ag-step').open");
    await s.tap('#ag-step [data-wf="kind"][data-kind="sound"]');
    await s.waitFor("return !!r.querySelector('#ag-step .ag-tone')");
    const main = await sw();
    check(`${tag}: Alarmton im Alarmablauf: weiter "${t.old}"`, main?.text.includes(t.old) && !main.text.includes(t.tone), JSON.stringify(main));
    await s.ev("for (const d of r.querySelectorAll('dialog[open]')) d.close(); return 1");
    check(`${tag}: keine Fehler im Browser`, s.errors.length === 0, s.errors.join(" | "));
    await s.ctx.close();
  }
}
await browser.close();
done();
