// 1.1.0/1.2.0: Alarm quittieren: Schritt im Ablauf und Knopf in der Push-Meldung. Je Sprache, Desktop und Handy.
import { check, done, launch, open } from "../lib.mjs";

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const s = await open(browser, { mobile, lang, tab: "config" });
    await s.tap('[data-sub="actions"]');
    await s.waitFor("return r.querySelectorAll('.ag-wf-step').length === 5");

    await s.tap('[data-wf="add"][data-at="5"]');
    check(`${tag}: Baustein "Alarm beenden" in der Auswahl`, await s.waitFor("return !!r.querySelector('#ag-step [data-wf=\"kind\"][data-kind=\"acknowledge\"]')"));
    await s.tap('#ag-step [data-wf="kind"][data-kind="acknowledge"]');
    check(`${tag}: Editor erklärt, dass die Anlage scharf bleibt`, await s.waitFor("const d=r.getElementById('ag-step'); return d.open && d.querySelector('.ag-t2') && !d.querySelector('input, select')"));
    await s.tap('#ag-step [data-wf="apply"]');
    check(`${tag}: Schritt angehängt (grünes Symbol)`, await s.waitFor("return !r.getElementById('ag-step').open && r.querySelectorAll('.ag-wf-step').length === 6 && !!r.querySelectorAll('.ag-wf-step')[5].querySelector('.ag-wf-icon.k-acknowledge')"));
    check(`${tag}: im Entwurf als Schritt "acknowledge"`, await s.ev("return JSON.stringify(r.host.actions.draft.wf.away[5]) === JSON.stringify({ type: 'acknowledge' })"));

    // Verbindung nach einem Schritt: zwischen Karte und Plus, nie in die Karte hinein; alle Verbindungen sehen gleich aus (1.10.0, nichts ist mehr gestrichelt)
    await s.ev(`const a=r.host.actions; const d=a.ensureDraft(); d.wf[a.trigger]=[{type:"notify"},{type:"action",action:"switch.turn_on",target:["switch.steckdose_flur"],wait:false}]; a.render(); return 1`);
    check(`${tag}: die Verbindung liegt zwischen Karte und Plus, nicht in der Karte, und ist durchgezogen`, await s.waitFor(`const p=r.querySelectorAll('.ag-wf-main .ag-wf-plus')[2]; if (!p || r.querySelector('.ag-wf-plus.par')) return false; const segs=[...p.querySelectorAll('.ag-wf-seg')]; if (segs.length !== 2) return false; const card=p.previousElementSibling.getBoundingClientRect(); const add=p.querySelector('.ag-wf-add').getBoundingClientRect(); const a=segs[0].getBoundingClientRect(), b=segs[1].getBoundingClientRect(); return a.top >= card.bottom - 0.5 && a.bottom <= add.top + 0.5 && b.top >= add.bottom - 0.5 && segs.every((x) => !getComputedStyle(x).backgroundImage.includes('gradient'))`));
    // Knopf "Quittieren" im Push-Schritt: Standard an, abschaltbar, im Schritt gespeichert
    await s.tap('.ag-wf-step[data-index="0"] [data-wf="edit"]');
    await s.waitFor("return r.getElementById('ag-step').open");
    check(`${tag}: Knopf "Quittieren" im Push-Schritt, standardmässig an`, await s.ev("const b=r.querySelector('#ag-step [data-wf=\"nt-btn\"][data-key=\"acknowledge\"]'); return !!b && b.getAttribute('aria-checked') === 'true'"));
    await s.tap('#ag-step [data-wf="nt-btn"][data-key="acknowledge"]');
    await s.tap('#ag-step [data-wf="apply"]');
    check(`${tag}: Knopf im Schritt gespeichert`, await s.waitFor("const st=r.host.actions.draft.wf.away[0]; return !r.getElementById('ag-step').open && st.buttons?.acknowledge === false"));
    await s.ctx.close();
  }
}
await browser.close();
done();
