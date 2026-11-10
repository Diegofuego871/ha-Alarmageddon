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

    // Knopf "Quittieren" im Push-Schritt: Standard aus, einschaltbar, im Schritt gespeichert
    await s.tap('.ag-wf-step[data-index="0"] [data-wf="edit"]');
    await s.waitFor("return r.getElementById('ag-step').open");
    check(`${tag}: Knopf "Quittieren" im Push-Schritt, aus`, await s.ev("const b=r.querySelector('#ag-step [data-wf=\"nt-btn\"][data-key=\"acknowledge\"]'); return !!b && b.getAttribute('aria-checked') === 'false'"));
    await s.tap('#ag-step [data-wf="nt-btn"][data-key="acknowledge"]');
    await s.tap('#ag-step [data-wf="apply"]');
    check(`${tag}: Knopf im Schritt gespeichert`, await s.waitFor("const st=r.host.actions.draft.wf.away[0]; return !r.getElementById('ag-step').open && st.buttons?.acknowledge === true"));
    await s.ctx.close();
  }
}
await browser.close();
done();
