// Mockups "Aktionen während der Verzögerungen" (2026-11-12): das echte Panel im HA-Nachbau, die neuen Teile werden in die
// Seite eingesetzt (keine Funktion dahinter). Erfundene Daten. Aufruf: node docs/mockups/verzoegerung-aktionen-v1/src/mock.mjs
import { fileURLToPath } from "node:url";
import { launch, PORT, R } from "../../../../tests/panel/lib.mjs";
import { startServer } from "../../../../tests/panel/server.mjs";

const out = fileURLToPath(new URL("../", import.meta.url));
const server = await startServer(PORT);
const browser = await launch();

// Im Panel: die neuen festen Punkte samt Beispielschritten einsetzen. variant "A": eine Zeitachse; "B": zwei Kapitel.
const BUILD = `
  const wf = r.querySelector('.ag-wf');
  const armed = wf.querySelector('.ag-wf-armed');
  const main = wf.querySelector('.ag-wf-main');
  const icon = (sel) => r.querySelector(sel).querySelector('svg').outerHTML;
  const timer = r.querySelector('.ag-waitpill svg').outerHTML.replace(/width="\\d+"/, 'width="20"').replace(/height="\\d+"/, 'height="20"');
  const plusSvg = r.querySelector('.ag-wf-add svg').outerHTML;
  const btns = r.querySelector('.ag-wf-step .ag-wf-btns').outerHTML;
  const handle = r.querySelector('.ag-wf-step .ag-handle').outerHTML;
  const sound = icon('.ag-wf-icon.k-sound');
  const pill = (text) => '<span class="ag-waitpill" style="background:var(--ag-primary-soft);color:var(--ag-primary)">' + r.querySelector('.ag-waitpill svg').outerHTML + '<span>' + text + '</span></span>';
  const plus = (hint, last) => '<div class="ag-wf-plus ' + (last ? 'last' : '') + '"><span class="ag-wf-seg"></span><button class="ag-wf-add">' + plusSvg + '</button><span class="ag-wf-seg"></span>' + (hint ? '<small class="ag-wf-plushint ag-t2 ag-small">' + hint + '</small>' : '') + '</div>';
  const card = (kind, title, text, extra) => '<div class="ag-card ag-wf-step">' + handle + '<span class="ag-wf-icon k-' + kind + '">' + sound + '</span><div class="ag-wf-text"><b>' + title + '</b><div class="ag-t2 ag-small">' + text + '</div>' + (extra || '') + '</div>' + btns + '</div>';
  const point = (cls, zone, svg, title, sub, body) => '<div class="ag-wf-line ' + zone + '"><div class="ag-wf-start"><span class="ag-mini ' + cls + '" style="background-image:linear-gradient(var(--ag-warning-soft),var(--ag-warning-soft))">' + svg + '</span><span>' + title + (sub ? '<small class="ag-t2" style="display:block;font-weight:400;font-size:13px;margin-top:1px">' + sub + '</small>' : '') + '</span></div>' + body + '</div>';
  const mode = ' (Abwesend)';
  // 1. Scharfschalten beginnt: die Ausgangsverzögerung läuft
  const exit = point('warn', 'ag-wf-armed mock-exit', timer, 'Scharfschalten beginnt' + mode, 'Die Ausgangsverzögerung läuft (Abwesend: 30 s)',
    plus('', false) + card('chime', 'Aktivierungston', 'Piepsen · Sonos Flur · 40 %', pill('Solange die Ausgangsverzögerung läuft')) + plus('Weitere Aktion während der Ausgangsverzögerung', true));
  // 2. Anlage scharf geschaltet: wie bisher, mit einem Beispielschritt
  armed.querySelector('.ag-wf-plus').outerHTML = plus('', false) + card('chime', 'Aktivierungston', 'Bestätigung · Sonos Flur · 40 % · 2 s') + plus('Weitere Aktion beim Scharfschalten', true);
  // 3. Eingangsverzögerung läuft
  const entry = point('warn', 'ag-wf-armed mock-entry', timer, 'Eingangsverzögerung läuft' + mode, 'Zeit zum Deaktivieren (Abwesend: 30 s; hat der Sensor eine eigene Zeit, gilt seine)',
    plus('', false) + card('prealarm', 'Voralarm', 'Langsames Piepsen · Sonos Flur · 30 %', pill('Solange die Eingangsverzögerung läuft')) + plus('Weitere Aktion während der Eingangsverzögerung', true));
  armed.insertAdjacentHTML('beforebegin', exit);
  main.insertAdjacentHTML('beforebegin', entry);
  // Der Alarmablauf im Bild kürzer: nur die ersten zwei Schritte
  const steps = [...main.querySelectorAll('.ag-wf-step')];
  steps.slice(2).forEach((st) => { st.nextElementSibling?.remove(); st.remove(); });
  wf.querySelector('.ag-wf-after')?.remove();
  if (arg === 'B') {
    const chap = (t, h) => '<div class="mock-chap" style="margin:26px 0 10px"><h3 class="ag-chap-t" style="margin:0">' + t + '</h3><p class="ag-chap-h" style="margin:4px 0 0">' + h + '</p></div>';
    wf.querySelector('.mock-exit').insertAdjacentHTML('beforebegin', chap('Beim Scharfschalten', 'Was läuft, während du das Haus verlässt, und sobald die Anlage scharf ist.').replace('margin:26px', 'margin:4px'));
    wf.querySelector('.mock-entry').insertAdjacentHTML('beforebegin', chap('Bei einem Alarm', 'Was läuft, während die Zeit zum Deaktivieren läuft, beim Alarm selbst und danach.'));
  }
  return 1;`;

// Im Schritt-Editor des Aktivierungstons: die Dauer mit der neuen Wahl. variant "S": Schalter; "C": Chip in der Reihe.
const DURATION = `
  const d = r.getElementById('ag-step');
  d.querySelector('h3').textContent = 'Aktivierungston';
  const tone = d.querySelector('select'); if (tone) tone.options[tone.selectedIndex].textContent = 'Piepsen';
  const pl = d.querySelector('.ag-rpill span'); if (pl) pl.textContent = 'Sonos Flur';
  const card = [...d.querySelectorAll('.ag-sec-t')].find((h) => h.textContent.includes('klingeln')).parentElement.querySelector('.ag-efcard');
  const num = card.querySelector('.ag-num');
  const chips = card.querySelector('.ag-zline');
  card.querySelector('.ag-ef-h').textContent = 'Der Ton wiederholt sich so lange und hört dann auf. Deaktivieren stoppt ihn jederzeit.';
  card.querySelector('.ag-ef-row')?.remove();
  [...d.querySelectorAll('.ag-step-ed > .ag-ef-row')].forEach((e) => e.remove());
  if (arg === 'S') {
    card.insertAdjacentHTML('afterbegin', '<div class="ag-ef-row" style="margin-bottom:14px"><div class="ag-settx"><b>Solange die Ausgangsverzögerung läuft</b><small>Der Ton endet von selbst, sobald die Anlage scharf ist oder deaktiviert wird. Aktuell 30 s (Abwesend); ändert sich mit der Einstellung der Anlage.</small></div><button class="ag-toggle on" role="switch" aria-checked="true"></button></div>');
    num.style.opacity = '.4'; chips.style.opacity = '.4';
    num.querySelector('input').value = '30'; num.querySelector('input').disabled = true;
    card.querySelector('.ag-ef-h').textContent = 'Feste Dauer: nur, wenn der Schalter oben aus ist.';
  } else {
    chips.insertAdjacentHTML('afterbegin', '<button class="ag-chip on">' + r.querySelector('.ag-waitpill svg').outerHTML + ' Ausgangsverzögerung</button>');
    num.querySelector('input').value = '30'; num.querySelector('input').disabled = true; num.style.opacity = '.5';
    card.querySelector('.ag-ef-h').textContent = 'Gewählt: so lange, wie die Ausgangsverzögerung läuft (aktuell 30 s in Abwesend). Der Ton endet, sobald die Anlage scharf ist oder deaktiviert wird.';
  }
  card.scrollIntoView({ block: 'center' });
  return 1;`;

async function shot(name, { mobile = false, height, prepare }) {
  const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: height || 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1440, height: height || 950 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.addInitScript(() => { try { localStorage.setItem("alarmageddon.tab", "config"); } catch {} });
  await page.goto(`http://127.0.0.1:${PORT}/ha-sim.html?lang=de&theme=light`);
  const frame = await (await page.waitForSelector("#panel-frame")).contentFrame();
  await frame.waitForFunction(new Function(`const r=${R}; return r && r.querySelector(".ag-view")`));
  const ev = (code, arg) => frame.evaluate(new Function("arg", `const r=${R};` + code), arg);
  await ev("r.querySelector('[data-sub=\"actions\"]').click(); return 1");
  await frame.waitForFunction(new Function(`const r=${R}; return r.querySelectorAll('.ag-wf-step').length > 0`));
  await page.waitForTimeout(600);
  await prepare(ev, page);
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${out}${name}.png` });
  console.log(`${name}.png`);
  await ctx.close();
}

const flow = (variant) => async (ev) => {
  await ev(BUILD, variant);
  await ev("r.querySelector('.mock-chap, .mock-exit').scrollIntoView({ block: 'start' }); r.host._content.scrollTop -= 12; return 1");
};
const duration = (variant) => async (ev, page) => {
  await ev("r.querySelector('.ag-wf-main .ag-wf-icon.k-sound').closest('.ag-wf-step').querySelector('[data-wf=\"edit\"]').click(); return 1");
  await page.waitForTimeout(500);
  await ev(DURATION, variant);
};

await shot("1a-ablauf-A-zeitachse", { height: 1820, prepare: flow("A") });
await shot("1b-ablauf-A-handy", { mobile: true, height: 1900, prepare: flow("A") });
await shot("2a-ablauf-B-kapitel", { height: 1980, prepare: flow("B") });
await shot("2b-ablauf-B-handy", { mobile: true, height: 2100, prepare: flow("B") });
await shot("3a-dauer-A-schalter", { height: 820, prepare: duration("S") });
await shot("3b-dauer-A-handy", { mobile: true, prepare: duration("S") });
await shot("4a-dauer-B-auswahl", { height: 820, prepare: duration("C") });
await shot("4b-dauer-B-handy", { mobile: true, prepare: duration("C") });
await browser.close();
server.close();
