// Konfiguration › Aktionen (Ablauf je Alarm) und › Benachrichtigungen. Je Sprache, Desktop und Handy, echte Klicks/Taps.
import { check, done, launch, open, outDir } from "../lib.mjs";

const T = {
  de: { alarmKind: "Einbruchalarm", typeWord: "Tür", wait: "Warten", sound: "Alarmton", on: "Einschalten", noChanges: "Keine Änderungen", saved: "Gespeichert", oneChange: "1 Änderung", coverDomain: "Abdeckung", coverService: "Abdeckung auf Position fahren", waits: "Wartet, bis die Aktion beendet ist", waitOpt: "Warten, bis die Aktion beendet ist", coverDesc: "Fährt die Abdeckung auf die gewählte Position." },
  en: { alarmKind: "Intrusion alarm", typeWord: "Door", wait: "Wait", sound: "Alarm sound", on: "Turn on", noChanges: "No changes", saved: "Saved", oneChange: "1 change", coverDomain: "Cover", coverService: "Move cover to position", waits: "Waits until the action has finished", waitOpt: "Wait until the action has finished", coverDesc: "Moves the cover to the chosen position." },
};

const browser = await launch();
for (const lang of ["de", "en"]) {
  for (const mobile of [false, true]) {
    const tag = `${lang}/${mobile ? "Handy" : "Desktop"}`;
    const t = T[lang];
    const s = await open(browser, { mobile, lang, tab: "config" });
    const types = () => s.ev("return [...r.querySelectorAll('.ag-wf-step .ag-wf-icon')].map((e) => [...e.classList].find((c) => c.startsWith('k-')).slice(2))");

    // ----- Aktionen -----
    await s.tap('[data-sub="actions"]');
    check(`${tag}: Ablauf "Abwesend" mit 5 Schritten`, await s.waitFor("return r.querySelectorAll('.ag-wf-step').length === 5"));
    check(`${tag}: Reihenfolge der Bausteine`, JSON.stringify(await types()) === JSON.stringify(["notify", "device", "wait", "device", "sound"]), JSON.stringify(await types()));
    check(`${tag}: Alarmton zeigt Player, Lautstärke, Dauer`, await s.ev("const x=r.querySelectorAll('.ag-wf-step')[4].innerText; return x.includes('Sonos Wohnzimmer') && x.includes('70 %') && x.includes('20 s')"));
    check(`${tag}: Greifer und Testknopf je Schritt`, await s.ev("return r.querySelectorAll('.ag-wf-step [data-wf=\"grab\"]').length === 5 && r.querySelectorAll('.ag-wf-step [data-wf=\"test-step\"]').length === 5"));
    const bt = await s.ev("const rs=[...r.querySelectorAll('.ag-wf-step')].map((st) => [...st.querySelectorAll('.ag-wf-btns .ag-iconbtn')].map((b) => { const q=b.getBoundingClientRect(), c=getComputedStyle(b); return { w: Math.round(q.width), h: Math.round(q.height), left: q.left, right: q.right, border: parseFloat(c.borderTopWidth) }; })); return rs.map((b) => ({ n: b.length, minSize: Math.min(...b.map((x) => Math.min(x.w, x.h))), gap: Math.round(Math.min(...b.slice(1).map((x, k) => x.left - b[k].right))), border: Math.min(...b.map((x) => x.border)) }))");
    check(`${tag}: Knöpfe je Schritt: umrandet, mindestens 44 px gross und mit Abstand (${bt.length} Schritte)`, bt.length > 0 && bt.every((x) => x.n === 3 && x.minSize >= 44 && x.gap >= (mobile ? 12 : 8) && x.border >= 1), JSON.stringify(bt[0]));
    check(`${tag}: Kapsel am gewählten Auslöser`, await s.ev("const p=r.querySelector('.ag-wf-head .ag-seg .ag-pill'); const b=r.querySelector('.ag-wf-head [data-trigger=\"away\"]'); return !!p && Math.abs(p.getBoundingClientRect().left - b.getBoundingClientRect().left) < 2"));
    check(`${tag}: "Testen" steht unten bei Abbrechen und Speichern, nicht oben`, await s.ev("return !!r.querySelector('.ag-foot [data-wf=\"test\"], .ag-foot [data-wf=\"test-stop\"]') && !r.querySelector('.ag-wf-head [data-wf=\"test\"]') && r.querySelector('.ag-foot').getBoundingClientRect().width > 0"));
    if (!mobile) {
      await s.ev("r.querySelector('.ag-content').scrollTop = 300");
      await s.page.waitForTimeout(300);
      check(`${tag}: Schalter und Reiter der Aktionen bleiben beim Scrollen fest (unter Kopfzeile)`, await s.ev("const t=r.querySelector('.ag-wf-head .ag-tools'); const above=[...r.querySelectorAll('.ag-stk')].filter((e) => e !== t); const lim=Math.max(...above.map((e) => e.getBoundingClientRect().bottom)); return t.classList.contains('ag-stk') && Math.abs(t.getBoundingClientRect().top - lim) < 20"));
    }
    check(`${tag}: Beschreibung zum Schalter "Einstellungen pro Modus" ist sichtbar`, await s.ev("const sm=r.querySelector('.ag-wf-head .ag-pmbar small'); return !!sm && sm.getBoundingClientRect().height > 8 && sm.textContent.length > 20"));
    await s.ev("r.querySelector('.ag-content').scrollTop = 0");
    check(`${tag}: Schalter "Einstellungen pro Modus" (an, weil die Abläufe sich unterscheiden), Reiter unter dem Schalter`, await s.ev("const sw=r.querySelector('.ag-wf-head [data-wf=\"permode\"]'); const seg=r.querySelector('.ag-wf-head [data-seg=\"wf-trigger\"]'); return !!sw && sw.getAttribute('aria-checked') === 'true' && !!seg && seg.getBoundingClientRect().top > sw.getBoundingClientRect().bottom"));
    check(`${tag}: kein Überlauf`, await s.ev("return document.documentElement.scrollWidth <= window.innerWidth"));

    // Ziehen am Griff: "Warten" (Index 2) über den Rollladen-Schritt (Index 1)
    await s.page.waitForTimeout(600); // die Seite gleitet beim Reiterwechsel herein: erst nach der Bewegung messen
    await s.ev("r.querySelector('.ag-wf-step[data-index=\\\"1\\\"]').scrollIntoView({ block: 'start' })");
    await s.page.waitForTimeout(200);
    const box = async (sel) => (await s.el(sel)).boundingBox();
    const from = await box('.ag-wf-step[data-index="2"] [data-wf="grab"]');
    const target = await box('.ag-wf-step[data-index="1"]');
    await s.page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await s.page.mouse.down();
    await s.page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 - 20, { steps: 4 });
    await s.page.mouse.move(from.x + from.width / 2, target.y + 6, { steps: 8 });
    await s.page.mouse.up();
    check(`${tag}: per Ziehen verschoben`, await s.waitFor("return [...r.querySelectorAll('.ag-wf-step .ag-wf-icon')].map((e) => [...e.classList].find((c) => c.startsWith('k-')).slice(2)).join() === 'notify,wait,device,device,sound'"), JSON.stringify(await types()));
    check(`${tag}: 1 Änderung`, await s.ev(`return r.querySelector('.ag-foot').innerText.includes('${t.oneChange}')`));
    check(`${tag}: Test der ganzen Kette gesperrt bis gespeichert`, await s.ev("return r.querySelector('[data-wf=\"test\"]').disabled"));
    // Tastatur-Ersatz: Pfeil nach unten am Griff
    await s.ev("r.querySelector('.ag-wf-step[data-index=\"0\"] [data-wf=\"grab\"]').focus()");
    await s.page.keyboard.press("ArrowDown");
    check(`${tag}: per Pfeiltaste verschoben, Fokus folgt`, await s.waitFor("return [...r.querySelectorAll('.ag-wf-step .ag-wf-icon')].map((e) => [...e.classList].find((c) => c.startsWith('k-')).slice(2)).join() === 'wait,notify,device,device,sound' && r.activeElement?.dataset.index === '1'"));
    await s.tap('[data-wf="cancel"]');
    check(`${tag}: Abbrechen verwirft`, JSON.stringify(await types()) === JSON.stringify(["notify", "device", "wait", "device", "sound"]));

    // Test eines einzelnen Schritts: Rückfrage, Abbrechen sendet nichts
    await s.tap('.ag-wf-step[data-index="2"] [data-wf="test-step"]');
    check(`${tag}: Rückfrage vor dem Schritt-Test`, await s.waitFor("return r.getElementById('ag-confirm').open"));
    await s.tap('#ag-confirm [data-c="no"]');
    check(`${tag}: Abbrechen sendet nichts`, await s.waitFor("return !r.getElementById('ag-confirm').open") && await s.sim("return !window.__calls.some((c) => c.type === 'alarmageddon/test_workflow')"));
    await s.tap('.ag-wf-step[data-index="2"] [data-wf="test-step"]');
    await s.waitFor("return r.getElementById('ag-confirm').open");
    await s.tap('#ag-confirm [data-c="yes"]');
    check(`${tag}: nur dieser Schritt gesendet`, await s.waitFor("return !!r.querySelector('.ag-wf-step [data-wf=\"test-step-stop\"]')") && await s.sim("const c=window.__calls.filter((x) => x.type === 'alarmageddon/test_workflow').at(-1); return c?.step?.type === 'wait' && c.trigger === 'away'"));
    // 1.18.1: beim Schritt-Test wird dessen Play-Knopf zum Stopp-Knopf (nur bei diesem Schritt); unten gibt es keinen Stopp, "Test" ist gesperrt
    check(`${tag}: Stopp-Knopf nur am getesteten Schritt, die anderen Schritte gesperrt, unten kein Stopp`, await s.ev("const st=[...r.querySelectorAll('.ag-wf-main .ag-wf-step')]; return st[2].querySelector('[data-wf=\"test-step-stop\"]') && st.filter((c, k) => k !== 2).every((c) => c.querySelector('[data-wf=\"test-step\"]')?.disabled) && !r.querySelector('.ag-foot [data-wf=\"test-stop\"]') && r.querySelector('.ag-foot [data-wf=\"test\"]')?.disabled"));
    await s.tap('.ag-wf-step[data-index="2"] [data-wf="test-step-stop"]');
    check(`${tag}: Stopp am Schritt beendet den Test, alles wieder bedienbar`, await s.waitFor("return !r.querySelector('[data-wf=\"test-step-stop\"]') && !r.querySelector('.ag-wf-step [data-wf=\"test-step\"]').disabled") && await s.sim("return window.__calls.some((x) => x.type === 'alarmageddon/stop_workflow')"));
    // Ganzer Ablauf: der Knopf unten wird zum Stopp, die Schritte bleiben gesperrt
    await s.tap('.ag-foot [data-wf="test"]');
    check(`${tag}: Test des ganzen Ablaufs: unten Stopp, an den Schritten kein Stopp`, await s.waitFor("return !!r.querySelector('.ag-foot [data-wf=\"test-stop\"]') && !r.querySelector('[data-wf=\"test-step-stop\"]') && [...r.querySelectorAll('.ag-wf-main [data-wf=\"test-step\"]')].every((b) => b.disabled)"));
    await s.tap('.ag-foot [data-wf="test-stop"]');
    await s.waitFor("return !!r.querySelector('.ag-foot [data-wf=\"test\"]') && !r.querySelector('.ag-foot [data-wf=\"test\"]').disabled");

    // Warten bearbeiten: 30 -> 45 s
    await s.tap('.ag-wf-step[data-index="2"] [data-wf="edit"]');
    check(`${tag}: Editor offen`, await s.waitFor("return r.getElementById('ag-step').open && !!r.querySelector('#ag-step [data-key=\"seconds\"]')"));
    await (await s.el('#ag-step [data-key="seconds"]')).fill("45");
    await s.tap('#ag-step [data-wf="apply"]');
    check(`${tag}: Warten 45 s`, await s.waitFor("return !r.getElementById('ag-step').open && r.querySelectorAll('.ag-wf-step')[2].innerText.includes('45')"));

    // Gerät schalten: ohne Gerät Fehler, Suche, Aktionen aus dem Gerät
    await s.tap('[data-wf="add"][data-at="5"]');
    check(`${tag}: Auswahl der Bausteine`, await s.waitFor("return r.querySelectorAll('#ag-step [data-wf=\"kind\"]').length === 8")); // seit 1.15.0 mit "Voralarm"
    await s.tap('#ag-step [data-wf="kind"][data-kind="device"]');
    check(`${tag}: Editor Gerät schalten`, await s.waitFor("return !!r.querySelector('#ag-step [data-wf=\"eq\"]')"));
    await s.tap('#ag-step [data-wf="apply"]');
    check(`${tag}: ohne Gerät abgelehnt`, await s.waitFor("return r.querySelector('#ag-step .ag-dlg-err').textContent.trim().length > 0"));
    await s.tap('#ag-step [data-wf="eq"]');
    await s.page.keyboard.type("steck");
    check(`${tag}: Suche filtert`, await s.waitFor("const rows=r.querySelectorAll('#ag-step [data-wf=\"pick\"]'); return rows.length === 1 && rows[0].dataset.ent === 'switch.steckdose_flur'"));
    check(`${tag}: Fokus im Suchfeld`, await s.ev("return r.activeElement === r.querySelector('#ag-step [data-wf=\"eq\"]')"));
    await s.tap('#ag-step [data-wf="pick"][data-ent="switch.steckdose_flur"]');
    check(`${tag}: Gerät als Pille, Aktionen sichtbar`, await s.waitFor("return r.querySelectorAll('#ag-step .ag-rpill').length === 1 && r.querySelectorAll('#ag-step [data-wf=\"action\"]').length === 3"));
    await s.tap('#ag-step [data-wf="apply"]');
    check(`${tag}: Schritt angehängt`, await s.waitFor("return r.querySelectorAll('.ag-wf-step').length === 6 && r.querySelectorAll('.ag-wf-step')[5].innerText.includes('Steckdose Flur')"));

    // Licht: das Gerät bietet Farbtemperatur an, kein JSON
    await s.tap('[data-wf="add"][data-at="6"]');
    await s.tap('#ag-step [data-wf="kind"][data-kind="device"]');
    await s.tap('#ag-step [data-wf="eq"]');
    await s.page.keyboard.type("licht");
    await s.tap('#ag-step [data-wf="pick"][data-ent="light.flur"]');
    check(`${tag}: Licht bietet Einstellungen an`, await s.waitFor("return !!r.querySelector('#ag-step [data-wf=\"opt-on\"][data-key=\"color_temp_kelvin\"]') && !!r.querySelector('#ag-step [data-wf=\"opt-on\"][data-key=\"brightness_pct\"]')"));
    check(`${tag}: kein JSON-Feld`, await s.ev("return !r.querySelector('#ag-step textarea') && !r.querySelector('#ag-step').innerText.includes('{')"));
    await s.tap('#ag-step [data-wf="opt-on"][data-key="color_temp_kelvin"]');
    check(`${tag}: Regler nach dem Einschalten`, await s.waitFor("return !!r.querySelector('#ag-step input[type=\"range\"][data-key=\"color_temp_kelvin\"]')"));
    await s.tap('#ag-step [data-wf="apply"]');
    check(`${tag}: Licht mit Kelvin in der Karte`, await s.waitFor("return r.querySelectorAll('.ag-wf-step')[6]?.innerText.includes('K')"));

    // Eigene Aktion aus den Diensten von HA, mit Feldern
    await s.tap('[data-wf="add"][data-at="7"]');
    await s.tap('#ag-step [data-wf="kind"][data-kind="custom"]');
    // Art und Aktion sind durchsuchbar: tippen filtert die Liste, ein Eintrag wählt
    await s.tap('#ag-step [data-wf="cb"][data-key="domain"]');
    check(`${tag}: Art: Liste mit allen Arten, Aktion noch gesperrt`, await s.waitFor("const d=r.getElementById('ag-step'); return d.querySelectorAll('[data-wf=\"cb-pick\"][data-key=\"domain\"]').length >= 4 && d.querySelector('[data-wf=\"cb\"][data-key=\"service\"]').disabled"));
    await s.page.keyboard.type("persist");
    check(`${tag}: Tippen filtert die Arten, Fokus bleibt`, await s.waitFor("const d=r.getElementById('ag-step'); const l=d.querySelectorAll('[data-wf=\"cb-pick\"][data-key=\"domain\"]'); return l.length === 1 && l[0].dataset.value === 'persistent_notification' && r.activeElement === d.querySelector('[data-wf=\"cb\"][data-key=\"domain\"]')"));
    await s.tap('#ag-step [data-wf="cb-pick"][data-key="domain"][data-value="persistent_notification"]');
    check(`${tag}: Art gewählt, Name im Feld`, await s.waitFor("const i=r.querySelector('#ag-step [data-wf=\"cb\"][data-key=\"domain\"]'); return i.value.length > 0 && !i.value.includes('persistent_notification') && !r.querySelector('#ag-step [data-wf=\"cb\"][data-key=\"service\"]').disabled"));
    await s.tap('#ag-step [data-wf="cb"][data-key="service"]');
    await s.page.keyboard.type("erst");
    check(`${tag}: Aktion durchsuchbar`, await s.waitFor("const l=r.querySelectorAll('#ag-step [data-wf=\"cb-pick\"][data-key=\"service\"]'); return l.length === 1 && l[0].dataset.value === 'create'"));
    await s.tap('#ag-step [data-wf="cb-pick"][data-key="service"][data-value="create"]');
    check(`${tag}: Felder des Dienstes`, await s.waitFor("return !!r.querySelector('#ag-step [data-wf=\"df\"][data-key=\"message\"]') && !!r.querySelector('#ag-step .ag-req')"));
    await s.tap('#ag-step [data-wf="apply"]');
    check(`${tag}: Pflichtfeld verlangt`, await s.waitFor("return r.querySelector('#ag-step .ag-dlg-err').textContent.includes('Nachricht') || r.querySelector('#ag-step .ag-dlg-err').textContent.includes('Message') || r.querySelector('#ag-step .ag-dlg-err').textContent.length > 0"));
    await (await s.el('#ag-step [data-wf="df"][data-key="message"]')).fill("Alarm im Haus");
    await s.tap('#ag-step [data-wf="apply"]');
    check(`${tag}: eigene Aktion angehängt`, await s.waitFor("return !r.getElementById('ag-step').open && r.querySelectorAll('.ag-wf-step').length === 8"));

    // Eigene Aktion mit übersetzten Namen (Dienst, Beschreibung, Feld), nicht mit den Kennungen von HA
    await s.tap('[data-wf="add"][data-at="8"]');
    await s.tap('#ag-step [data-wf="kind"][data-kind="custom"]');
    await s.tap('#ag-step [data-wf="cb"][data-key="domain"]');
    check(`${tag}: Art mit übersetztem Namen`, await s.waitFor(`return [...r.querySelectorAll('#ag-step [data-wf="cb-pick"][data-key="domain"]')].some((o) => o.dataset.value === 'cover' && o.querySelector('span').textContent === '${t.coverDomain}')`));
    await s.tap('#ag-step [data-wf="cb-pick"][data-key="domain"][data-value="cover"]');
    await s.tap('#ag-step [data-wf="cb"][data-key="service"]');
    check(`${tag}: Aktion mit übersetztem Namen statt cover.set_cover_position`, await s.ev(`const o=[...r.querySelectorAll('#ag-step [data-wf="cb-pick"][data-key="service"] span')].map((x) => x.textContent); return o.includes('${t.coverService}') && !o.some((x) => x.includes('set_cover_position'))`));
    await s.tap('#ag-step [data-wf="cb-pick"][data-key="service"][data-value="set_cover_position"]');
    check(`${tag}: Beschreibung und Feldname übersetzt, unbekanntes Feld lesbar`, await s.waitFor(`const d=r.getElementById('ag-step').textContent; return d.includes('${t.coverDesc}') && d.includes('Position') && d.includes('Speed') && !d.includes('speed')`));
    await s.tap('#ag-step [data-wf="close"]');
    check(`${tag}: Abbrechen mit Änderungen fragt vor dem Verwerfen`, await s.waitFor("return r.getElementById('ag-confirm').open && r.getElementById('ag-step').open"));
    await s.tap('#ag-confirm [data-c="yes"]');
    check(`${tag}: nach "Verwerfen" ist der Dialog zu`, await s.waitFor("return !r.getElementById('ag-step').open && !r.getElementById('ag-confirm').open"));

    // Push-Meldung: Standardtext steht im Feld und lässt sich ändern, Platzhalter und Vorschau
    await s.tap('.ag-wf-step[data-index="0"] [data-wf="edit"]');
    check(`${tag}: Push-Meldung mit Standardtext in den Feldern`, await s.waitFor(`const d=r.getElementById('ag-step'); return d.open && d.querySelector('[data-key="ntTitle"]').value === '🚨 Alarm: {name}' && d.querySelector('[data-key="ntMessage"]').value.startsWith('{sensor}') && d.querySelectorAll('[data-wf="ins"]').length === 7`));
    check(`${tag}: Vorschau mit echten Namen`, await s.ev("const p=r.querySelector('#ag-ntprev').innerText; return p.includes('🚨 Alarm: Haus') && !p.includes('{')"));
    const ntField = await s.el('#ag-step [data-key="ntTitle"]');
    await ntField.fill("ALARM im {name}");
    await s.tap('#ag-step [data-wf="ins"][data-token="{mode}"]');
    check(`${tag}: Platzhalter eingefügt, Vorschau folgt`, await s.waitFor("const v=r.querySelector('#ag-step [data-key=\"ntTitle\"]').value; const p=r.querySelector('#ag-ntprev').innerText; return v === 'ALARM im {name}{mode}' && p.includes('ALARM im Haus')"));
    await ntField.fill("{alarm} / {type} / {area}");
    check(`${tag}: Vorschau füllt {alarm}, {type} und {area} (Haustür im Flur)`, await s.waitFor(`const p=r.querySelector('#ag-ntprev').innerText; return p.includes('${t.alarmKind} / ${t.typeWord} / Flur') && !p.includes('{')`));
    await ntField.fill("ALARM im {name}{mode}");
    await (await s.el('#ag-step [data-key="ntMessage"]')).fill("Achtung: {sensor} um {time}");
    check(`${tag}: Zustellung im Schritt: kritisch an mit Lautstärke, Öffnen an, die anderen Knöpfe aus`, await s.ev("const d=r.getElementById('ag-step'); const on=(sel) => d.querySelector(sel).getAttribute('aria-checked'); return on('[data-wf=\"nt-crit\"]') === 'true' && !!d.querySelector('[data-wf=\"nt-vol\"]') && on('[data-wf=\"nt-btn\"][data-key=\"open\"]') === 'true' && on('[data-wf=\"nt-btn\"][data-key=\"silence\"]') === 'false' && on('[data-wf=\"nt-btn\"][data-key=\"disarm\"]') === 'false'"));
    check(`${tag}: Klickziel: Standard Protokoll, drei Möglichkeiten`, await s.ev("const sel=r.querySelector('#ag-step [data-wf=\"nt-click\"]'); return !!sel && sel.value === 'log' && sel.options.length === 3 && !r.querySelector('#ag-step [data-key=\"ntClickPath\"]')"));
    await (await s.el('#ag-step [data-wf="nt-click"]')).selectOption("custom");
    check(`${tag}: eigener Pfad zeigt ein Feld`, await s.waitFor("return !!r.querySelector('#ag-step [data-key=\"ntClickPath\"]')"));
    await s.tap('#ag-step [data-wf="apply"]');
    check(`${tag}: eigener Pfad ohne Angabe abgelehnt`, await s.waitFor("return r.getElementById('ag-step').open && r.querySelector('#ag-step .ag-dlg-err').textContent.includes('/')"));
    await (await s.el('#ag-step [data-key="ntClickPath"]')).fill("/lovelace/alarm");
    await (await s.el('#ag-step [data-wf="nt-click"]')).selectOption("overview");
    await (await s.el('#ag-step [data-wf="nt-click"]')).selectOption("custom");
    await (await s.el('#ag-step [data-key="ntClickPath"]')).fill("/lovelace/alarm");
    await s.tap('#ag-step [data-wf="nt-btn"][data-key="silence"]');
    await s.ev("const i=r.querySelector('#ag-step [data-wf=\"nt-vol\"]'); i.value='40'; i.dispatchEvent(new Event('input', { bubbles: true }));");
    await s.tap('#ag-step [data-wf="nt-crit"]');
    check(`${tag}: nicht kritisch blendet die Lautstärke aus`, await s.waitFor("return !r.querySelector('#ag-step [data-wf=\"nt-vol\"]')"));
    await s.tap('#ag-step [data-wf="nt-crit"]');

    // Empfänger: Standard sind die Alarm-Empfänger der Konfiguration, hier lassen sie sich ersetzen
    check(`${tag}: Empfänger: Standard zeigt die Alarm-Empfänger, kein eigener Wert`, await s.ev("const d=r.getElementById('ag-step'); const sw=d.querySelector('[data-wf=\"nt-tgt-own\"]'); const sec=sw.closest('.ag-sec, section, div[class*=\"sec\"]') || d; return sw.getAttribute('aria-checked') === 'false' && d.innerText.includes('mobile_app_diego'.replace('mobile_app_','')) && !d.querySelector('[data-wf=\"nt-tgt-add\"]') && !d.querySelector('[data-wf=\"nt-tgt-del\"]')"));
    await s.tap('#ag-step [data-wf="nt-tgt-own"]');
    check(`${tag}: Empfänger: eigene Liste startet mit den Alarm-Empfängern, Auswahl ohne diese`, await s.waitFor("const d=r.getElementById('ag-step'); const o=[...d.querySelectorAll('[data-wf=\"nt-tgt-add\"] option')].map((x) => x.value).filter(Boolean); return d.querySelectorAll('[data-wf=\"nt-tgt-del\"]').length === 1 && o.length === 2 && !o.includes('notify.mobile_app_diego')"));
    await (await s.el('#ag-step [data-wf="nt-tgt-add"]')).selectOption("notify.mobile_app_tablet");
    await s.tap('#ag-step [data-wf="nt-tgt-del"][data-target="notify.mobile_app_diego"]');
    check(`${tag}: Empfänger: Tablet hinzugefügt, Diego entfernt`, await s.waitFor("const d=r.getElementById('ag-step'); return [...d.querySelectorAll('[data-wf=\"nt-tgt-del\"]')].map((b) => b.dataset.target).join() === 'notify.mobile_app_tablet'"));
    await s.tap('#ag-step [data-wf="apply"]');
    check(`${tag}: Empfänger im Schritt gespeichert`, await s.waitFor("const st=r.host.actions.draft.wf.away[0]; return !r.getElementById('ag-step').open && JSON.stringify(st.targets) === JSON.stringify(['notify.mobile_app_tablet'])"));
    await s.tap('.ag-wf-step[data-index="0"] [data-wf="edit"]');
    check(`${tag}: Empfänger: beim erneuten Öffnen eigene Liste an`, await s.waitFor("const d=r.getElementById('ag-step'); return d.open && d.querySelector('[data-wf=\"nt-tgt-own\"]').getAttribute('aria-checked') === 'true' && d.querySelectorAll('[data-wf=\"nt-tgt-del\"]').length === 1"));
    await s.tap('#ag-step [data-wf="nt-tgt-own"]');
    check(`${tag}: Empfänger: Ausschalten verwirft die eigene Liste`, await s.waitFor("const d=r.getElementById('ag-step'); return d.querySelector('[data-wf=\"nt-tgt-own\"]').getAttribute('aria-checked') === 'false' && !d.querySelector('[data-wf=\"nt-tgt-del\"]')"));
    await s.tap('#ag-step [data-wf="nt-tgt-own"]');
    await s.tap('#ag-step [data-wf="nt-tgt-del"]');
    check(`${tag}: Empfänger: leere eigene Liste weist auf den Standard hin`, await s.waitFor("const d=r.getElementById('ag-step'); return !d.querySelector('[data-wf=\"nt-tgt-del\"]') && d.innerText.length > 0 && d.querySelector('[data-wf=\"nt-tgt-own\"]').getAttribute('aria-checked') === 'true'"));
    await s.tap('#ag-step [data-wf="apply"]');
    check(`${tag}: Empfänger: leere Liste wird nicht gespeichert (Standard gilt)`, await s.waitFor("const st=r.host.actions.draft.wf.away[0]; return !r.getElementById('ag-step').open && !('targets' in st)"));
    await s.tap('.ag-wf-step[data-index="0"] [data-wf="edit"]');
    await s.waitFor("return r.getElementById('ag-step').open");
    await s.tap('#ag-step [data-wf="apply"]');
    check(`${tag}: Karte zeigt den eigenen Text`, await s.waitFor("return !r.getElementById('ag-step').open && r.querySelectorAll('.ag-wf-step')[0].innerText.includes('ALARM im {name}{mode}')"));
    check(`${tag}: Titel, Text und Zustellung im Schritt`, await s.ev("const st=r.host.actions.draft.wf.away[0]; return st.type === 'notify' && st.title === 'ALARM im {name}{mode}' && st.message === 'Achtung: {sensor} um {time}' && st.critical === true && st.volume === 0.4 && st.buttons.silence === true && st.buttons.open === undefined && st.click === 'custom' && st.click_path === '/lovelace/alarm'"));
    await s.tap('.ag-wf-step[data-index="0"] [data-wf="edit"]');
    await s.waitFor("return r.getElementById('ag-step').open");
    await s.tap('#ag-step [data-wf="nt-default"]');
    await s.tap('#ag-step [data-wf="apply"]');
    check(`${tag}: Standardtext wiederhergestellt, nichts gespeichert`, await s.waitFor("const st=r.host.actions.draft.wf.away[0]; return !r.getElementById('ag-step').open && st.type === 'notify' && !('title' in st) && !('message' in st) && st.critical === true && st.buttons.silence === true"));

    // Warten, bis die Aktion beendet ist (1.10.0): Standard ist aus, der Ablauf läuft weiter. Ältere Abläufe ohne diese Angabe warteten
    // schon bisher: der Alarmton hier ist so einer und trägt darum die Pille
    check(`${tag}: älterer Schritt ohne Angabe wartet wie bisher und trägt die Pille "${t.waits}" (kein Schalter mehr an der Karte)`, await s.ev(`const c=r.querySelectorAll('.ag-wf-main .ag-wf-step')[4]; const p=c.querySelector('.ag-waitpill'); return !!p && p.textContent.trim() === ${JSON.stringify(t.waits)} && p.tagName === 'SPAN' && !r.querySelector('.ag-flow, [data-wf="flow"]')`));
    await s.tap('.ag-wf-step[data-index="4"] [data-wf="edit"]');
    await s.waitFor("return r.getElementById('ag-step').open && !!r.querySelector('#ag-step .ag-tone')");
    check(`${tag}: Option "${t.waitOpt}" im Alarmton, hier an`, await s.ev(`const b=r.querySelector('#ag-step [data-wf="waitend"]'); return !!b && b.getAttribute('aria-checked') === 'true' && b.closest('.ag-ef-row').innerText.includes(${JSON.stringify(t.waitOpt)}) && !r.querySelector('#ag-step [data-wf="detach"]')`));
    await s.tap('#ag-step [data-wf="waitend"]');
    await s.tap('#ag-step [data-wf="apply"]');
    check(`${tag}: ausgeschaltet: keine Pille mehr, der Schritt läuft weiter ("wait": false, kein "detach")`, await s.waitFor("const st=r.host.actions.draft.wf.away[4]; return !r.getElementById('ag-step').open && !r.querySelectorAll('.ag-wf-main .ag-wf-step')[4].querySelector('.ag-waitpill') && st.wait === false && !('detach' in st)"));
    check(`${tag}: alle Verbindungen sehen gleich aus (durchgezogen), ihre Linienstücke enden am Plus (nie darüber oder hindurch)`, await s.ev("const ps=[...r.querySelectorAll('.ag-wf-plus')]; return ps.length >= 6 && !r.querySelector('.ag-wf-plus.par, .ag-wf-end.par') && ps.every((plus) => { const segs=[...plus.querySelectorAll('.ag-wf-seg')]; const add=plus.querySelector('.ag-wf-add').getBoundingClientRect(); const a=segs[0].getBoundingClientRect(), b=segs[1].getBoundingClientRect(); return segs.length === 2 && segs.every((x) => !getComputedStyle(x).backgroundImage.includes('gradient')) && a.bottom <= add.top + 0.5 && b.top >= add.bottom - 0.5; })"));
    check(`${tag}: alles liegt auf einer Achse (Markensymbole, jedes Plus, jedes Linienstück, Linie zu "Alarm endet"), jede Verbindung hat eine Farbe, keine Linie liegt über einem Symbol`, await s.ev("const mid=(x) => { const b=x.getBoundingClientRect(); return b.left + b.width / 2; }; const end=r.querySelector('.ag-wf-end'); const cs=getComputedStyle(end, '::before'); const endMid=end.getBoundingClientRect().left + parseFloat(cs.marginLeft) + parseFloat(cs.width) / 2; const xs=[...r.querySelectorAll('.ag-wf-line > .ag-wf-start .ag-mini, .ag-wf-end .ag-mini, .ag-wf-add, .ag-wf-seg')].map(mid).concat(endMid); const axis=xs.every((x) => Math.abs(x - xs[0]) <= 1); const plain=[...r.querySelectorAll('.ag-wf-plus')].every((p) => { const k=[...p.querySelectorAll('.ag-wf-seg')].map((x) => getComputedStyle(x).backgroundImage.includes('repeating')); return k.length === 2 && k[0] === k[1] && k[0] === p.classList.contains('par'); }); const icons=[...r.querySelectorAll('.ag-wf-add, .ag-mini, .ag-wf-icon, .ag-wf-step')].map((x) => x.getBoundingClientRect()); const clear=[...r.querySelectorAll('.ag-wf-seg')].every((sg) => { const g=sg.getBoundingClientRect(); return icons.every((b) => g.bottom <= b.top + 0.5 || g.top >= b.bottom - 0.5 || g.right <= b.left || g.left >= b.right); }); return axis && plain && clear && getComputedStyle(r.querySelector('.ag-wf-line'), '::before').content === 'none'"));
    check(`${tag}: Warten und Meldung tragen nie eine Pille`, await s.ev("const cs=[...r.querySelectorAll('.ag-wf-main .ag-wf-step')]; return !cs[2].querySelector('.ag-waitpill') && !cs[0].querySelector('.ag-waitpill')"));
    await s.tap('.ag-wf-step[data-index="4"] [data-wf="edit"]');
    await s.waitFor("return r.getElementById('ag-step').open");
    await s.tap('#ag-step [data-wf="waitend"]');
    await s.tap('#ag-step [data-wf="apply"]');
    check(`${tag}: wieder eingeschaltet: Pille auf der Karte, "wait": true`, await s.waitFor("return !r.getElementById('ag-step').open && r.host.actions.draft.wf.away[4].wait === true && !!r.querySelectorAll('.ag-wf-main .ag-wf-step')[4].querySelector('.ag-waitpill')"));
    await s.tap('.ag-wf-step[data-index="2"] [data-wf="edit"]');
    await s.waitFor("return r.getElementById('ag-step').open");
    check(`${tag}: keine Option bei "Warten"`, await s.ev("return !r.querySelector('#ag-step [data-wf=\"waitend\"]')"));
    await s.tap('#ag-step [data-wf="close"]');

    // Szene
    await s.tap('[data-wf="add"][data-at="8"]');
    await s.tap('#ag-step [data-wf="kind"][data-kind="scene"]');
    await (await s.el('#ag-step [data-wf="scene"]')).selectOption("scene.film");
    await s.tap('#ag-step [data-wf="apply"]');
    check(`${tag}: Szene angehängt`, await s.waitFor("return r.querySelectorAll('.ag-wf-step').length === 9"));

    // Alarmton: Ton als Dropdown, Vorhören mit Hinweis, zweiter Player
    await s.tap('.ag-wf-step[data-index="4"] [data-wf="edit"]');
    await s.waitFor("return r.getElementById('ag-step').open && !!r.querySelector('#ag-step .ag-tone')");
    check(`${tag}: Ton als Dropdown mit fünf Tönen`, await s.ev("return r.querySelectorAll('#ag-step select[data-key=\"sound\"] option').length === 5"));
    // 1.26.0: ein einziger Knopf wie bei den Testknöpfen: erst Abspielen, beim Abspielen wird er zum Stopp-Knopf
    check(`${tag}: Vorschau: nur ein Knopf, zuerst Abspielen`, await s.ev("const t=r.querySelector('#ag-step .ag-tone'); return t.querySelectorAll('.ag-pv button').length === 1 && !!t.querySelector('[data-wf=\"pv-play\"]') && !t.querySelector('[data-wf=\"pv-pause\"]')"));
    await s.ev("const a=r.host.actions; a.previewing = a.edit.form && r.querySelector('#ag-step [data-wf=\"pv-play\"]').dataset.url; a.renderEditor(); return 1");
    check(`${tag}: beim Abspielen wird er zum Stopp-Knopf (derselbe Knopf, Stopp-Symbol)`, await s.waitFor("const t=r.querySelector('#ag-step .ag-tone'); return t.querySelectorAll('.ag-pv button').length === 1 && !!t.querySelector('[data-wf=\"pv-stop\"]') && !t.querySelector('[data-wf=\"pv-play\"]')"));
    await s.ev("r.querySelector('#ag-step [data-wf=\"pv-stop\"]').click(); return 1");
    check(`${tag}: Stopp beendet die Vorschau, der Knopf ist wieder Abspielen`, await s.waitFor("return !r.host.actions.previewing && !!r.querySelector('#ag-step [data-wf=\"pv-play\"]') && !r.querySelector('#ag-step [data-wf=\"pv-stop\"]')"));
    check(`${tag}: Hinweis, dass nicht auf der Anlage gespielt wird`, await s.ev("return /Handy|phone/.test(r.querySelector('#ag-step .ag-pv-note').innerText)"));
    check(`${tag}: Zurückstellen an`, await s.ev("return r.querySelector('#ag-step [data-wf=\"restore\"]').getAttribute('aria-checked') === 'true'"));
    await (await s.el('#ag-step select[data-key="sound"]')).selectOption("klaxon");
    await s.tap('#ag-step [data-wf="eq"]');
    check(`${tag}: nur Medienplayer in der Liste`, await s.ev("const l=[...r.querySelectorAll('#ag-step [data-wf=\"pick\"]')]; return l.length > 0 && l.every((b) => b.dataset.ent.startsWith('media_player.'))"));
    await s.tap('#ag-step [data-wf="pick"][data-ent="media_player.sonos_kueche"]');
    check(`${tag}: Dauer in Sekunden statt Wiederholungen`, await s.ev("const i=r.querySelector('#ag-step [data-key=\"playSeconds\"]'); return !!i && i.value === '20' && !r.querySelector('#ag-step [data-key=\"repeat\"]') && r.querySelectorAll('#ag-step [data-wf=\"playsecs\"]').length === 4"));
    await s.tap('#ag-step [data-wf="until"]');
    check(`${tag}: "Bis deaktiviert" blendet die Sekunden aus`, await s.waitFor("return !r.querySelector('#ag-step [data-key=\"playSeconds\"]') && r.querySelector('#ag-step [data-wf=\"until\"]').getAttribute('aria-checked') === 'true'"));
    await s.tap('#ag-step [data-wf="until"]');
    await s.tap('#ag-step [data-wf="playsecs"][data-value="60"]');
    check(`${tag}: Schnellwahl setzt 60 s`, await s.waitFor("return r.querySelector('#ag-step [data-key=\"playSeconds\"]').value === '60'"));
    await s.page.screenshot({ path: `${outDir}actions-editor-${lang}-${mobile ? "mobile" : "desktop"}.png`, fullPage: false });
    await s.tap('#ag-step [data-wf="apply"]');
    await s.waitFor("return !r.getElementById('ag-step').open");

    // Löschen des ersten Schritts (Push) und speichern
    await s.tap('.ag-wf-step[data-index="0"] [data-wf="delete"]');
    check(`${tag}: gelöscht`, await s.waitFor("return r.querySelectorAll('.ag-wf-step').length === 8"));
    await s.page.screenshot({ path: `${outDir}actions-${lang}-${mobile ? "mobile" : "desktop"}.png`, fullPage: true });
    await s.tap('[data-wf="save"]');
    check(`${tag}: gespeichert`, await s.waitFor(`return r.querySelector('.ag-foot').innerText.includes('${t.saved}')`));
    const saved = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/save_workflows').at(-1)");
    const away = saved?.workflows?.away || [];
    check(`${tag}: alle Auslöser gesendet`, JSON.stringify(Object.keys(saved?.workflows || {}).sort()) === JSON.stringify(["always", "away", "home", "night"]), JSON.stringify(Object.keys(saved?.workflows || {})));
    check(`${tag}: Schritte im Serverformat`, away.length === 8 && away[1].type === "wait" && away[1].seconds === 45
      && away[3].type === "sound" && away[3].wait === false && !("detach" in away[3]) && away[3].duration === 60 && !("repeat" in away[3] && away[3].repeat > 1) && away[3].sound === "klaxon" && JSON.stringify(away[3].players) === JSON.stringify(["media_player.sonos_wohnzimmer", "media_player.sonos_kueche"]) && away[3].restore === true
      && away[4].type === "action" && away[4].action === "switch.turn_on" && JSON.stringify(away[4].target) === JSON.stringify(["switch.steckdose_flur"])
      && away[5].action === "light.turn_on" && typeof away[5].data.color_temp_kelvin === "number"
      && away[6].action === "persistent_notification.create" && away[6].data.message === "Alarm im Haus"
      && away[7].action === "scene.turn_on" && JSON.stringify(away[7].target) === JSON.stringify(["scene.film"]), JSON.stringify(away));

    // Test starten und stoppen
    check(`${tag}: Test frei nach Speichern`, await s.waitFor("return !r.querySelector('[data-wf=\"test\"]').disabled"));
    await s.tap('[data-wf="test"]');
    check(`${tag}: Test läuft`, await s.waitFor("return !!r.querySelector('[data-wf=\"test-stop\"]') && !!r.querySelector('.ag-wf-head .ag-tag.warn')"));
    const test = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/test_workflow').at(-1)");
    check(`${tag}: Test für "Abwesend"`, test?.trigger === "away" && test?.entry_id === "e_haus" && !test?.step, JSON.stringify(test));
    await s.tap('[data-wf="test-stop"]');
    check(`${tag}: Test gestoppt`, await s.waitFor("return !!r.querySelector('[data-wf=\"test\"]') && !r.querySelector('.ag-wf-head .ag-tag')"));

    // Auslöser wechseln: "Nacht" leer, gemerkt
    await s.tap('.ag-wf-head [data-trigger="night"]');
    check(`${tag}: leerer Ablauf: nur das Plus, kein Hinweisfeld (1.26.1)`, await s.waitFor("return !r.querySelector('.ag-wf-empty, .ag-wf-main .ag-empty') && !!r.querySelector('.ag-wf-main [data-wf=\"add\"][data-at=\"0\"]') && r.querySelector('[data-wf=\"test\"]').disabled"));
    // 1.26.0: das Feld unter "Alarm endet" heisst nur "Abschlussmeldung" (Standardhinweis kurz, mit eigener Meldung ganz ohne Beschreibung)
    const closing = lang === "de" ? "Abschlussmeldung" : "Closing message";
    check(`${tag}: Feld unter "Alarm endet": nur "${closing}" und der kurze Standardhinweis`, await s.ev(`const c=r.querySelector('.ag-wf-endcard'); return c.querySelector('b').textContent.trim() === ${JSON.stringify(closing)} && c.querySelector('small').textContent.length < 40`));
    check(`${tag}: Auslöser gemerkt`, await s.ev("return localStorage.getItem('alarmageddon.trigger') === 'night'"));
    // Mit Änderung wegklicken verliert nichts: der Ablauf bleibt als Entwurf, ein Punkt am Reiter zeigt es
    await s.tap('.ag-wf-main [data-wf="add"][data-at="0"]');
    await s.tap('#ag-step [data-wf="kind"][data-kind="notify"]');
    await s.tap('#ag-step [data-wf="apply"]');
    await s.waitFor("return r.querySelectorAll('.ag-wf-step').length === 1");
    await s.tap('[data-sub="notify"]');
    check(`${tag}: Wechsel ohne Rückfrage`, await s.waitFor("return !r.getElementById('ag-discard')?.open && !!r.querySelector('.ag-nt')"));
    check(`${tag}: Punkt am Reiter Aktionen`, await s.ev("return r.querySelector('[data-sub=\"actions\"]').classList.contains('has-edit')"));
    await s.tap('[data-sub="actions"]');
    check(`${tag}: Entwurf der Aktionen noch da`, await s.waitFor("return r.querySelectorAll('.ag-wf-step').length === 1"));
    await s.tap('[data-wf="cancel"]');
    await s.tap('[data-sub="notify"]');

    // ----- Benachrichtigungen -----
    check(`${tag}: Benachrichtigungen offen`, await s.waitFor("return !!r.querySelector('.ag-nt [data-nt=\"target-add\"]')"));
    check(`${tag}: Empfänger als Dropdown, gewählte als Pille`, await s.ev("const sels=r.querySelectorAll('select[data-nt=\"target-add\"]'); return sels.length === 2 && sels[0].options.length === 3 && sels[1].options.length === 4 && r.querySelectorAll('.ag-nt .ag-recip .ag-rpill').length === 1 && r.querySelector('.ag-nt .ag-recip .ag-rpill').innerText.includes('diego')"));
    check(`${tag}: Kapitel mit Titel (Empfänger, Alarm-Arten, Wartung)`, await s.ev("return [...r.querySelectorAll('.ag-chap-t')].length === 3"));
    // 1.17.7: Jeder Schalter steht links, sein Text wächst nach rechts (so ist klar, welcher Schalter zu welcher Option gehört)
    const sw = await s.ev("const bad=[]; let n=0; for (const t of r.querySelectorAll('.ag-nt .ag-toggle')) { const q=t.getBoundingClientRect(); if (!q.width) continue; n++; const row=t.parentElement; const txt=[...row.children].filter((c) => c!==t && c.textContent.trim() && !c.matches('.ag-mini')); const tl=Math.min(...txt.map((c) => c.getBoundingClientRect().left)); if (!(q.right <= tl + 1)) bad.push([(t.getAttribute('aria-label')||'').slice(0,30), Math.round(q.right), Math.round(tl)]); } return { n, bad }");
    check(`${tag}: Meldungen: alle ${sw.n} Schalter stehen links vom Text`, sw.n >= 8 && sw.bad.length === 0, JSON.stringify(sw.bad.slice(0, 4)));
    // 1.18.0: Knöpfe der Meldung "Scharfschalten nicht möglich" ("Erneut versuchen", "Trotzdem scharf schalten"): zwei Schalter, beide an
    const arm = () => s.ev("return [...r.querySelectorAll('.ag-nt [data-nt=\"armbtn\"]')].map((b) => ({ key: b.dataset.key, on: b.getAttribute('aria-checked') === 'true', inType: !!b.closest('.ag-mt')?.querySelector('[data-nt=\"enabled\"][data-kind=\"arm_failed\"]'), hint: (b.parentElement.querySelector('small')?.textContent.length || 0) > 20 }))");
    const arm0 = await arm();
    check(`${tag}: "Scharfschalten nicht möglich" hat zwei Schalter für die Knöpfe der Meldung, beide an, mit Beschreibung`, arm0.length === 2 && arm0[0].key === "retry" && arm0[1].key === "force" && arm0.every((x) => x.on && x.inType && x.hint), JSON.stringify(arm0));
    // 1.25.1: Benennung wie bei den anderen Aktionen der Push-Meldung: Aktion "…" (Englisch Action "…"), Beschreibung "Knopf unter der Meldung: …"
    const names = await s.ev("return [...r.querySelectorAll('.ag-nt [data-nt=\"armbtn\"]')].map((b) => [b.parentElement.querySelector('span').childNodes[0].textContent.trim(), b.parentElement.querySelector('small').textContent.trim().slice(0, 40)])");
    const word = lang === "de" ? "Aktion" : "Action", lead = lang === "de" ? "Knopf unter der Meldung:" : "Button under the message:";
    check(`${tag}: die Knöpfe heissen ${word} "…" und beginnen die Beschreibung mit "${lead}"`, names.length === 2 && names.every(([n, h]) => n.startsWith(`${word} "`) && h.startsWith(lead)), JSON.stringify(names));
    await s.ev("r.querySelector('.ag-nt [data-nt=\"armbtn\"][data-key=\"force\"]').click(); return 1");
    check(`${tag}: ausgeschaltet zählt als Änderung (Punkt am Reiter)`, await s.waitFor("return r.host.notify.dirtyCount() === 1 && r.querySelector('[data-sub=\"notify\"]').classList.contains('has-edit') && r.querySelector('.ag-nt [data-nt=\"armbtn\"][data-key=\"force\"]').getAttribute('aria-checked') === 'false'"));
    await s.tap('.ag-foot [data-nt="save"]');
    check(`${tag}: gespeichert: der Server bekommt "arm_force_action": false, danach ist nichts mehr offen`, await s.waitFor("return r.host.notify.dirtyCount() === 0 && !r.querySelector('[data-sub=\"notify\"]').classList.contains('has-edit')") && (await s.sim("const c=window.__calls.filter((x) => x.type === 'alarmageddon/save_notify').pop(); return c.notify.arm_force_action === false && c.notify.arm_retry_action !== false")));
    await s.ev("r.querySelector('.ag-nt [data-nt=\"armbtn\"][data-key=\"force\"]').click(); return 1");
    await s.tap('.ag-foot [data-nt="save"]');
    await s.waitFor("return r.host.notify.dirtyCount() === 0");
    check(`${tag}: Alarmmeldung hier nicht einstellbar und kein Hinweiskapitel: keine Art "Alarm", keine Knöpfe`, await s.ev("return !r.querySelector('[data-nt=\"enabled\"][data-kind=\"triggered\"]') && !r.querySelector('[data-nt=\"button\"]') && !r.querySelector('[data-nt=\"to-actions\"]')"));
    // Empfänger der Wartung: im Dropdown wählen, als Pille mit x
    await (await s.el('select[data-nt="target-add"][data-key="maintenance_targets"]')).selectOption("notify.mobile_app_partnerin");
    check(`${tag}: Pille nach der Wahl`, await s.waitFor("return [...r.querySelectorAll('.ag-rpill')].some((p) => p.innerText.includes('partnerin'))"));
    check(`${tag}: gewählter Dienst nicht mehr im Dropdown`, await s.ev("return ![...r.querySelector('select[data-nt=\"target-add\"][data-key=\"maintenance_targets\"]').options].some((o) => o.value === 'notify.mobile_app_partnerin')"));
    check(`${tag}: Testknöpfe gesperrt bei Änderung`, await s.waitFor("return [...r.querySelectorAll('[data-nt=\"test\"]')].length > 0 && [...r.querySelectorAll('[data-nt=\"test\"]')].every((b) => b.disabled)"));
    // Je Art: Alarm leiser, "Eingangsverzögerung" einschalten und kritisch, Batterie kritisch
    await s.ev("const i=r.querySelector('[data-nt=\"volume\"][data-kind=\"sensor_report\"]'); i.value='50'; i.dispatchEvent(new Event('input', { bubbles: true }));");
    check(`${tag}: Lautstärke der Art angezeigt`, await s.waitFor("return r.querySelector('.ag-vol[data-kind=\"sensor_report\"]').textContent.trim() === '50 %'"));
    check(`${tag}: Regler nur bei kritischen Arten`, await s.ev("return !r.querySelector('[data-nt=\"volume\"][data-kind=\"armed\"]') && !r.querySelector('[data-nt=\"volume\"][data-kind=\"battery_low\"]')"));
    await s.tap('[data-nt="enabled"][data-kind="pending"]');
    check(`${tag}: Art eingeschaltet zeigt Einstellungen`, await s.waitFor("return !!r.querySelector('[data-nt=\"critical\"][data-kind=\"pending\"]')"));
    await s.tap('[data-nt="critical"][data-kind="pending"]');
    check(`${tag}: kritisch zeigt Regler`, await s.waitFor("return !!r.querySelector('[data-nt=\"volume\"][data-kind=\"pending\"]')"));
    await s.tap('[data-nt="critical"][data-kind="battery_low"]');
    await s.tap('[data-nt="enabled"][data-kind="disarmed"]');
    await s.tap('[data-nt="enabled"][data-kind="disarmed"]');
    await s.page.screenshot({ path: `${outDir}notify-${lang}-${mobile ? "mobile" : "desktop"}.png`, fullPage: true });
    await s.tap('[data-nt="save"]');
    check(`${tag}: Meldungen gespeichert`, await s.waitFor(`return r.querySelector('.ag-foot').innerText.includes('${t.saved}')`));
    const nt = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/save_notify').at(-1)?.notify");
    check(`${tag}: Werte je Art gesendet`, nt && JSON.stringify(nt.maintenance_targets) === JSON.stringify(["notify.mobile_app_partnerin"]) && nt.types.sensor_report.volume === 0.5 && nt.types.sensor_report.critical === true
      && nt.types.pending.enabled === true && nt.types.pending.critical === true && nt.types.battery_low.critical === true && nt.types.armed.enabled === false, JSON.stringify(nt));
    // Pille entfernen mit x
    await s.tap('[data-nt="target-del"][data-key="alarm_targets"][data-target="notify.mobile_app_diego"]');
    check(`${tag}: Pille mit x entfernt`, await s.waitFor("return r.querySelectorAll('.ag-nt .ag-recip .ag-rpill').length === 1 && !!r.querySelector('.ag-recip .ag-warntext')"));
    await s.tap('[data-nt="cancel"]');
    // Testmeldung einer Art
    await s.tap('[data-nt="test"][data-kind="battery_low"]');
    const tn = await s.sim("return window.__calls.filter((c) => c.type === 'alarmageddon/test_notify').at(-1)");
    check(`${tag}: Testmeldung der Art`, tn?.kind === "battery_low", JSON.stringify(tn));
    check(`${tag}: kein Überlauf (Meldungen)`, await s.ev("return document.documentElement.scrollWidth <= window.innerWidth"));
    check(`${tag}: keine Fehler im Browser`, s.errors.length === 0, s.errors.join(" | "));
    await s.ctx.close();
  }
}
await browser.close();
done();
