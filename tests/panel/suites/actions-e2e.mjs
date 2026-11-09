// Konfiguration › Aktionen (Ablauf je Alarm) und › Benachrichtigungen. Je Sprache, Desktop und Handy, echte Klicks/Taps.
import { check, done, launch, open, outDir } from "../lib.mjs";

const T = {
  de: { wait: "Warten", sound: "Alarmton", on: "Einschalten", noChanges: "Keine Änderungen", saved: "Gespeichert", oneChange: "1 Änderung", coverDomain: "Abdeckung", coverService: "Abdeckung auf Position fahren", detached: "läuft nebenher", coverDesc: "Fährt die Abdeckung auf die gewählte Position." },
  en: { wait: "Wait", sound: "Alarm sound", on: "Turn on", noChanges: "No changes", saved: "Saved", oneChange: "1 change", coverDomain: "Cover", coverService: "Move cover to position", detached: "runs alongside", coverDesc: "Moves the cover to the chosen position." },
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
    check(`${tag}: Kapsel am gewählten Auslöser`, await s.ev("const p=r.querySelector('.ag-wf-head .ag-seg .ag-pill'); const b=r.querySelector('.ag-wf-head [data-trigger=\"away\"]'); return !!p && Math.abs(p.getBoundingClientRect().left - b.getBoundingClientRect().left) < 2"));
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
    check(`${tag}: nur dieser Schritt gesendet`, await s.waitFor("return !!r.querySelector('[data-wf=\"test-stop\"]')") && await s.sim("const c=window.__calls.filter((x) => x.type === 'alarmageddon/test_workflow').at(-1); return c?.step?.type === 'wait' && c.trigger === 'away'"));
    await s.tap('[data-wf="test-stop"]');
    await s.waitFor("return !!r.querySelector('[data-wf=\"test\"]')");

    // Warten bearbeiten: 30 -> 45 s
    await s.tap('.ag-wf-step[data-index="2"] [data-wf="edit"]');
    check(`${tag}: Editor offen`, await s.waitFor("return r.getElementById('ag-step').open && !!r.querySelector('#ag-step [data-key=\"seconds\"]')"));
    await (await s.el('#ag-step [data-key="seconds"]')).fill("45");
    await s.tap('#ag-step [data-wf="apply"]');
    check(`${tag}: Warten 45 s`, await s.waitFor("return !r.getElementById('ag-step').open && r.querySelectorAll('.ag-wf-step')[2].innerText.includes('45')"));

    // Gerät schalten: ohne Gerät Fehler, Suche, Aktionen aus dem Gerät
    await s.tap('[data-wf="add"][data-at="5"]');
    check(`${tag}: Auswahl der Bausteine`, await s.waitFor("return r.querySelectorAll('#ag-step [data-wf=\"kind\"]').length === 6"));
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
    check(`${tag}: Push-Meldung mit Standardtext in den Feldern`, await s.waitFor(`const d=r.getElementById('ag-step'); return d.open && d.querySelector('[data-key="ntTitle"]').value === 'Alarm: {name}' && d.querySelector('[data-key="ntMessage"]').value.startsWith('{sensor}') && d.querySelectorAll('[data-wf="ins"]').length === 4`));
    check(`${tag}: Vorschau mit echten Namen`, await s.ev("const p=r.querySelector('#ag-ntprev').innerText; return p.includes('Alarm: Haus') && !p.includes('{')"));
    const ntField = await s.el('#ag-step [data-key="ntTitle"]');
    await ntField.fill("ALARM im {name}");
    await s.tap('#ag-step [data-wf="ins"][data-token="{mode}"]');
    check(`${tag}: Platzhalter eingefügt, Vorschau folgt`, await s.waitFor("const v=r.querySelector('#ag-step [data-key=\"ntTitle\"]').value; const p=r.querySelector('#ag-ntprev').innerText; return v === 'ALARM im {name}{mode}' && p.includes('ALARM im Haus')"));
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
    await s.tap('#ag-step [data-wf="apply"]');
    check(`${tag}: Karte zeigt den eigenen Text`, await s.waitFor("return !r.getElementById('ag-step').open && r.querySelectorAll('.ag-wf-step')[0].innerText.includes('ALARM im {name}{mode}')"));
    check(`${tag}: Titel, Text und Zustellung im Schritt`, await s.ev("const st=r.host.actions.draft.wf.away[0]; return st.type === 'notify' && st.title === 'ALARM im {name}{mode}' && st.message === 'Achtung: {sensor} um {time}' && st.critical === true && st.volume === 0.4 && st.buttons.silence === true && st.buttons.open === undefined && st.click === 'custom' && st.click_path === '/lovelace/alarm'"));
    await s.tap('.ag-wf-step[data-index="0"] [data-wf="edit"]');
    await s.waitFor("return r.getElementById('ag-step').open");
    await s.tap('#ag-step [data-wf="nt-default"]');
    await s.tap('#ag-step [data-wf="apply"]');
    check(`${tag}: Standardtext wiederhergestellt, nichts gespeichert`, await s.waitFor("const st=r.host.actions.draft.wf.away[0]; return !r.getElementById('ag-step').open && st.type === 'notify' && !('title' in st) && !('message' in st) && st.critical === true && st.buttons.silence === true"));

    // Nicht abwarten: Schalter im Editor eines Alarmtons, nicht bei "Warten"
    await s.tap('.ag-wf-step[data-index="4"] [data-wf="edit"]');
    await s.waitFor("return r.getElementById('ag-step').open && !!r.querySelector('#ag-step .ag-tone')");
    check(`${tag}: Option "Nicht abwarten" im Alarmton, aus`, await s.ev("const b=r.querySelector('#ag-step [data-wf=\"detach\"]'); return !!b && b.getAttribute('aria-checked') === 'false'"));
    await s.tap('#ag-step [data-wf="detach"]');
    await s.tap('#ag-step [data-wf="apply"]');
    check(`${tag}: Karte zeigt "läuft nebenher"`, await s.waitFor(`return !r.getElementById('ag-step').open && r.querySelectorAll('.ag-wf-step')[4].innerText.includes('${t.detached}')`));
    // Ablauf grafisch: Schalter an der Karte und gestrichelte Verbindung nach einem Schritt, der nebenher läuft
    check(`${tag}: Karte mit Schalter "Läuft nebenher", gestrichelte Verbindung danach`, await s.ev("const c=r.querySelectorAll('.ag-wf-step')[4]; const f=c.querySelector('.ag-flow'); const plus=[...r.querySelectorAll('.ag-wf-plus')][5]; return f.classList.contains('par') && f.getAttribute('aria-checked') === 'true' && plus.classList.contains('par') && getComputedStyle(plus, '::before').borderLeftStyle === 'dashed'"));
    check(`${tag}: gestrichelte Linie endet über dem Plus (läuft nicht hindurch), Plus mit Abstand`, await s.ev("const plus=[...r.querySelectorAll('.ag-wf-plus')][5]; const cs=getComputedStyle(plus,'::before'); const top=parseFloat(cs.top), h=parseFloat(cs.height); return top + h <= parseFloat(getComputedStyle(plus).paddingTop) && parseFloat(getComputedStyle(plus).paddingTop) >= 16 && getComputedStyle(plus.querySelector('.ag-wf-add')).zIndex === '2'"));
    check(`${tag}: Schritte, die warten, zeigen "Wartet auf das Ende"; Warten und Meldung haben keinen Schalter`, await s.ev("const cs=[...r.querySelectorAll('.ag-wf-step')]; const seq=cs[1].querySelector('.ag-flow'); return seq.classList.contains('seq') && !cs[2].querySelector('.ag-flow') && !cs[0].querySelector('.ag-flow')"));
    await s.tap('.ag-wf-step[data-index="4"] .ag-flow');
    check(`${tag}: Tipp auf den Schalter schaltet um`, await s.waitFor("const c=r.querySelectorAll('.ag-wf-step')[4].querySelector('.ag-flow'); return c.classList.contains('seq') && !r.querySelector('.ag-wf-plus.par') && !('detach' in r.host.actions.draft.wf.away[4])"));
    await s.tap('.ag-wf-step[data-index="4"] .ag-flow');
    check(`${tag}: wieder nebenher`, await s.waitFor("return r.host.actions.draft.wf.away[4].detach === true && !!r.querySelector('.ag-wf-plus.par')"));
    await s.tap('.ag-wf-step[data-index="2"] [data-wf="edit"]');
    await s.waitFor("return r.getElementById('ag-step').open");
    check(`${tag}: keine Option bei "Warten"`, await s.ev("return !r.querySelector('#ag-step [data-wf=\"detach\"]')"));
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
    check(`${tag}: Abspielen und Pause neben dem Ton`, await s.ev("const t=r.querySelector('#ag-step .ag-tone'); return !!t.querySelector('[data-wf=\"pv-play\"]') && !!t.querySelector('[data-wf=\"pv-pause\"]')"));
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
      && away[3].type === "sound" && away[3].detach === true && away[3].duration === 60 && !("repeat" in away[3] && away[3].repeat > 1) && away[3].sound === "klaxon" && JSON.stringify(away[3].players) === JSON.stringify(["media_player.sonos_wohnzimmer", "media_player.sonos_kueche"]) && away[3].restore === true
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
    check(`${tag}: leerer Ablauf mit Hinweis`, await s.waitFor("return !!r.querySelector('.ag-wf-empty') && r.querySelector('[data-wf=\"test\"]').disabled"));
    check(`${tag}: Auslöser gemerkt`, await s.ev("return localStorage.getItem('alarmageddon.trigger') === 'night'"));
    // Mit Änderung wegklicken verliert nichts: der Ablauf bleibt als Entwurf, ein Punkt am Reiter zeigt es
    await s.tap('.ag-wf-empty [data-wf="add"]');
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
    check(`${tag}: Empfänger als Dropdown, gewählte als Pille`, await s.ev("const sels=r.querySelectorAll('select[data-nt=\"target-add\"]'); return sels.length === 2 && sels[0].options.length === 3 && sels[1].options.length === 4 && r.querySelectorAll('.ag-rpill').length === 1 && r.querySelector('.ag-rpill').innerText.includes('diego')"));
    check(`${tag}: Kapitel mit Titel (Empfänger, Alarm-Arten, Wartung)`, await s.ev("return [...r.querySelectorAll('.ag-chap-t')].length === 3"));
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
    check(`${tag}: Pille mit x entfernt`, await s.waitFor("return r.querySelectorAll('.ag-rpill').length === 1 && !!r.querySelector('.ag-recip .ag-warntext')"));
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
