// Stile des Panels (Shadow DOM). Farben aus den Theme-Variablen von HA, Präfix --ag- (docs/DESIGN.md).
// Klassennamen mit eigenem Präfix, damit nichts kollidiert (LEARNINGS: gängige Namen haben Layouts zerschossen).

export const CSS = `
:host {
  --ag-card: var(--card-background-color, #fff);
  --ag-bg: var(--primary-background-color, #f4f6f9);
  --ag-text: var(--primary-text-color, #1f2328);
  --ag-text2: var(--secondary-text-color, #6b7280);
  --ag-text3: var(--disabled-text-color, #a3a9b3);
  --ag-divider: var(--divider-color, rgba(15,23,42,.09));
  --ag-primary: var(--primary-color, #03a9f4);
  --ag-success: var(--success-color, #2e9e4f);
  --ag-warning: var(--warning-color, #f59e0b);
  --ag-error: var(--error-color, #e5484d);
  --ag-subtle: color-mix(in srgb, var(--ag-text) 5%, var(--ag-card));
  --ag-hover: color-mix(in srgb, var(--ag-text) 4%, var(--ag-card));
  --ag-primary-soft: color-mix(in srgb, var(--ag-primary) 14%, transparent);
  --ag-success-soft: color-mix(in srgb, var(--ag-success) 15%, transparent);
  --ag-warning-soft: color-mix(in srgb, var(--ag-warning) 18%, transparent);
  --ag-error-soft: color-mix(in srgb, var(--ag-error) 13%, transparent);
  --ag-warning-text: color-mix(in srgb, var(--ag-warning) 70%, var(--ag-text));
  --ag-shadow: 0 10px 30px rgba(0,0,0,.18);
  --ag-shadow-s: 0 1px 2px rgba(0,0,0,.06), 0 1px 8px rgba(0,0,0,.05);
  display: flex; flex-direction: column; height: 100%;
  font-family: var(--ha-font-family-body, var(--paper-font-body1_-_font-family, Roboto, system-ui, sans-serif));
  color: var(--ag-text); background: var(--ag-bg); font-size: 14px; -webkit-font-smoothing: antialiased;
}
* { box-sizing: border-box; }
button { font: inherit; color: inherit; }
.ag-ic { display: block; flex: none; }
.ag-t2 { color: var(--ag-text2); }

/* Einziger Scroll-Container (LEARNINGS: das iframe-Dokument scrollt nie selbst) */
.ag-content { flex: 1; overflow: auto; overscroll-behavior: contain; padding: 0 var(--ag-px) calc(32px + env(safe-area-inset-bottom, 0px)); display: flex; flex-direction: column; gap: 18px; }
.ag-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
/* Fest beim Scrollen (Abstand und Ebene setzt _stickySync): eigener Grund, und ein Schatten in Grundfarbe deckt die Lücke darunter zu */
.ag-stk { position: sticky; background: var(--ag-bg); }
.ag-stk:not(.ag-stk-last) { padding-bottom: var(--ag-gap, 18px); margin-bottom: calc(-1 * var(--ag-gap, 18px)); }
/* Auf sehr breiten Bildschirmen bleibt der Inhalt höchstens 1680 px breit, der Rest ist Weissraum links und rechts */
.ag-content > .ag-head { padding-top: 20px; }
:host([narrow]) .ag-content > .ag-head { padding-top: 12px; }
.ag-content { --ag-gap: 18px; --ag-px: max(24px, calc((100vw - 1680px) / 2)); }
:host([narrow]) .ag-content { --ag-gap: 12px; --ag-px: 12px; }
.ag-table-wrap.ag-stickwrap { overflow: visible; }
.ag-stickwrap .ag-table th { position: sticky; top: var(--ag-th-top, 0px); z-index: 15; background: var(--ag-card); }
.ag-stickwrap .ag-table.ag-ltable th { background: color-mix(in srgb, var(--ag-text) 6%, var(--ag-card)); }
.ag-stickwrap .ag-table tr:first-child th:first-child { border-top-left-radius: 18px; }
.ag-stickwrap .ag-table tr:first-child th:last-child { border-top-right-radius: 18px; }
.ag-grow { flex: 1; }

/* Reiterleiste mit gleitender Kapsel (Design-Regel Auswahlknöpfe) */
/* Reiterleisten wie in Device Panel (Design-Regel, gleiche Werte): gleich breite Felder, Fläche = 7 % Textfarbe über der Kartenfarbe, die gewählte Kapsel
   (.ag-pill, vom Panel gesetzt, gleitet mit leichtem Nachschwingen) in der Farbe des Seitengrunds mit Innenrand, gewählter Reiter in der Akzentfarbe.
   Grösse darf abweichen (kompakte Leisten sind so breit wie ihr Inhalt), Stil nie. Ab fünf Reitern auf dem Handy vier Spalten in Zeilen. */
.ag-seg { position: relative; display: inline-grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 2px; padding: 3px; border-radius: 14px; max-width: 100%;
  background: color-mix(in srgb, var(--ag-text) 7%, var(--ag-card)); isolation: isolate; }
.ag-seg > button { position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; gap: 6px; min-width: 0; min-height: 36px; padding: 0 14px; white-space: nowrap;
  border: none; border-radius: 11px; background: none; color: color-mix(in srgb, var(--ag-text) 72%, transparent); font: inherit; font-size: 13.5px; text-align: center; cursor: pointer; transition: color .22s ease; }
.ag-seg > button:hover { color: var(--ag-text); }
.ag-seg > button.on { color: var(--ag-primary); font-weight: 500; }
.ag-seg > button:focus-visible { outline: 2px solid var(--ag-primary); outline-offset: -2px; }
.ag-seg > button:disabled { cursor: default; opacity: .55; }
.ag-seg > button:active { transform: scale(0.97); transition: transform 100ms ease-out; }
.ag-pill { position: absolute; z-index: 0; left: 0; top: 0; border-radius: 11px; background: var(--ag-bg); pointer-events: none; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ag-text) 7%, transparent);
  transition: transform .46s cubic-bezier(.3, 1.35, .5, 1), width .46s cubic-bezier(.3, 1.35, .5, 1), height .46s cubic-bezier(.3, 1.35, .5, 1), opacity .46s ease; }
.ag-pill.go { opacity: .8; }
@media (prefers-reduced-motion: reduce) { .ag-pill, .ag-seg > button { transition: none; } }

.ag-card { background: var(--ag-card); border-radius: 18px; box-shadow: var(--ag-shadow-s); border: 1px solid var(--ag-divider); }
.ag-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 38px; padding: 0 16px; border-radius: 999px; border: 1px solid var(--ag-divider); background: var(--ag-card); color: var(--ag-text); font-weight: 500; white-space: nowrap; cursor: pointer; }
.ag-btn:hover { background: var(--ag-hover); }
.ag-btn.primary { background: var(--ag-primary); border-color: var(--ag-primary); color: #fff; }
.ag-btn.primary:hover { background: color-mix(in srgb, var(--ag-primary) 88%, #000); }
.ag-btn.danger { background: var(--ag-error); border-color: var(--ag-error); color: #fff; }
.ag-btn:disabled { opacity: .5; cursor: default; }
.ag-btn:focus-visible { outline: 2px solid var(--ag-primary); outline-offset: 2px; }
.ag-tag { display: inline-flex; align-items: center; gap: 6px; height: 22px; padding: 0 9px; border-radius: 999px; font-size: 12px; font-weight: 500; white-space: nowrap; }
.ag-tag.ok { color: var(--ag-success); background: var(--ag-success-soft); }
.ag-tag.warn { color: var(--ag-warning-text); background: var(--ag-warning-soft); }
.ag-tag.err { color: var(--ag-error); background: var(--ag-error-soft); }
.ag-tag.none { color: var(--ag-text2); background: var(--ag-subtle); }
.ag-cbtn { width: 24px; height: 24px; border-radius: 50%; border: 1.5px solid var(--ag-primary); background: var(--ag-primary-soft); color: var(--ag-primary); display: grid; place-items: center; flex: none; cursor: pointer; padding: 0; }
.ag-label { font-size: 12px; letter-spacing: .04em; text-transform: uppercase; color: var(--ag-text2); font-weight: 500; }

/* Übersicht (Variante A) */
.ag-sysgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 16px; }
.ag-sys { padding: 18px; display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.ag-sys-top { display: flex; gap: 14px; align-items: center; }
.ag-shield { width: 52px; height: 52px; border-radius: 15px; display: grid; place-items: center; flex: none; }
.ag-sys h2 { margin: 0; font-size: 21px; font-weight: 500; overflow-wrap: anywhere; }
.ag-sys-state { font-size: 14px; font-weight: 500; }
.ag-sys-sub { font-size: 12.5px; color: var(--ag-text2); margin-top: 2px; font-variant-numeric: tabular-nums; }
.ag-sys .ag-seg { align-self: stretch; }
/* Handy mit vier Modi (Aus, Anwesend, Abwesend, Nacht): Symbol und Text passen nicht nebeneinander in ein Viertel der Breite, die
   Beschriftungen liefen ineinander. Dort nur der Text; so sitzt auch die Kapsel des gewählten Modus genau um ihr Wort. */
:host([narrow]) .ag-sys .ag-seg:has(> button:nth-of-type(4)) > button { padding-left: 2px; padding-right: 2px; }
:host([narrow]) .ag-sys .ag-seg:has(> button:nth-of-type(4)) > button > svg { display: none; }
.ag-rows { display: flex; flex-direction: column; border-top: 1px solid var(--ag-divider); }
.ag-row { display: flex; align-items: center; gap: 10px; padding: 10px 2px; border-bottom: 1px solid var(--ag-divider); font-size: 13.5px; min-width: 0; }
.ag-row:last-child { border-bottom: 0; }
.ag-row .ag-grow { min-width: 0; overflow-wrap: anywhere; }
.ag-mini { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; flex: none; background: var(--ag-subtle); color: var(--ag-text2); }
.ag-mini.warn { background: var(--ag-warning-soft); color: var(--ag-warning-text); }
.ag-mini.ok { background: var(--ag-success-soft); color: var(--ag-success); }
.ag-mini.err { background: var(--ag-error-soft); color: var(--ag-error); }
/* Alarmband (1.11.0): dasselbe Rot wie die scharfe Kachel, als Verlauf und mit rotem Rand. Vorher eine flache Fläche in der Fehlerfarbe,
   die im dunklen Design blass neben den übrigen Rottönen stand. Hell: volle Farbe, nach unten etwas tiefer. Dunkel: tiefes Rot aus Farbe und Karte. */
.ag-alarm { border-radius: 18px; padding: 16px 18px; background: linear-gradient(to top, color-mix(in srgb, var(--ag-error) 84%, #000), var(--ag-error)); box-shadow: 0 0 0 1px color-mix(in srgb, var(--ag-error) 70%, transparent), var(--ag-shadow-s); color: #fff; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: var(--ag-gap, 18px); }
:host([dark]) .ag-alarm { background: linear-gradient(to top, color-mix(in srgb, var(--ag-error) 70%, var(--ag-card)), color-mix(in srgb, var(--ag-error) 40%, var(--ag-card))); }
.ag-alarm b { font-size: 18px; font-weight: 500; }
.ag-copyfrom { height: 40px; min-width: 190px; max-width: 260px; flex: 0 1 auto; border-radius: 999px; }
:host([narrow]) .ag-foot:has(.ag-copyfrom) { flex-wrap: wrap; }
:host([narrow]) .ag-copyfrom { min-width: 0; flex: 1 1 100%; max-width: none; order: -1; }
.ag-alarm-btns { margin-left: auto; display: flex; gap: 10px; flex-wrap: wrap; }
.ag-alarm .ag-btn { background: #fff; color: var(--ag-error); border-color: #fff; min-height: 44px; font-size: 15px; }
.ag-alarm [data-act="ack"] { background: transparent; color: #fff; border-color: rgba(255, 255, 255, .8); }
.ag-log { padding: 4px 18px; }
.ag-log time { color: var(--ag-text2); min-width: 64px; font-variant-numeric: tabular-nums; flex: none; }
.ag-empty { padding: 28px; display: flex; flex-direction: column; gap: 10px; align-items: flex-start; max-width: 640px; }
.ag-empty h2 { margin: 0; font-size: 20px; font-weight: 500; }

/* Sensorgruppen (Variante B) */
.ag-tools { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.list-search { display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 6px 0 12px; border-radius: 14px; background: var(--ag-card); border: 1px solid var(--ag-divider); color: var(--ag-text2); min-width: 220px; flex: 0 1 360px; }
.list-search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--ag-text); font: inherit; height: 100%; }
.list-search input::-webkit-search-cancel-button { display: none; }
.ag-clear { border: 0; background: transparent; color: var(--ag-text2); width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; cursor: pointer; }
.ag-clear[hidden] { display: none; }
.ag-chip { display: inline-flex; align-items: center; gap: 7px; height: 34px; padding: 0 13px; border-radius: 999px; background: var(--ag-card); border: 1px solid var(--ag-divider); font-size: 13px; white-space: nowrap; cursor: pointer; }
.ag-chip.on { background: var(--ag-primary-soft); border-color: transparent; color: var(--ag-primary); }
.ag-select { height: 38px; border-radius: 999px; border: 1px solid var(--ag-divider); background: var(--ag-card); color: var(--ag-text); padding: 0 14px; font: inherit; }
.ag-hint { font-size: 12.5px; color: var(--ag-text2); display: inline-flex; gap: 6px; align-items: center; }
.ag-table-wrap { overflow-x: auto; }
.ag-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13.5px; }
.ag-table th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: .03em; color: var(--ag-text2); font-weight: 500; padding: 10px 14px; border-bottom: 1px solid var(--ag-divider); white-space: nowrap; }
.ag-table th.z, .ag-table td.z { text-align: center; width: 112px; }
.ag-allbtn { display: block; margin: 3px auto 0; border: 0; background: transparent; color: var(--ag-primary); font-size: 12px; text-transform: none; letter-spacing: 0; cursor: pointer; padding: 2px 6px; border-radius: 6px; }
.ag-table td { padding: 8px 14px; border-bottom: 1px solid var(--ag-divider); vertical-align: middle; }
.ag-table tr:last-child td { border-bottom: 0; }
.ag-table tr.grp td { background: var(--ag-subtle); font-weight: 500; font-size: 13px; padding: 8px 14px; }
.ag-table tr.changed td:first-child { box-shadow: inset 3px 0 0 var(--ag-warning); }
.ag-nm { display: flex; align-items: center; gap: 10px; min-width: 200px; }
.ag-nm small { display: block; color: var(--ag-text2); font-size: 12px; }
.ag-av { width: 32px; height: 32px; border-radius: 10px; background: var(--ag-subtle); color: var(--ag-text2); display: grid; place-items: center; flex: none; }
.ag-av.open { background: var(--ag-warning-soft); color: var(--ag-warning-text); }
.ag-av.missing { background: var(--ag-error-soft); color: var(--ag-error); }
.ag-box { width: 28px; height: 28px; border-radius: 8px; border: 2px solid var(--ag-text3); display: grid; place-items: center; margin: auto; color: #fff; background: transparent; cursor: pointer; padding: 0; touch-action: none; }
.ag-box.on { background: var(--ag-primary); border-color: var(--ag-primary); }
.ag-box:focus-visible, .ag-toggle:focus-visible, .ag-zbtn:focus-visible { outline: 2px solid var(--ag-primary); outline-offset: 2px; }
.ag-toggle { width: 40px; height: 22px; border-radius: 999px; border: 0; background: color-mix(in srgb, var(--ag-text) 25%, transparent); position: relative; cursor: pointer; padding: 0; flex: none; display: block; margin: auto; }
.ag-toggle::after { content: ""; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.3); transition: left .18s; }
.ag-toggle.on { background: var(--ag-primary); }
.ag-toggle.on::after { left: 20px; }
.ag-toggle:disabled { opacity: .35; cursor: default; }
/* Grundregel (Vorgabe des Nutzers, 1.17.8): Jeder Schalter steht links, sein Text rechts davon und wächst nach rechts.
   Zentral für alle Zeilenarten, damit auch jede neue Zeile der Regel folgt (Test: tests/panel/suites/switches-e2e.mjs). */
.ag-orow > .ag-toggle, .ag-ef-row > .ag-toggle, .ag-setrow > .ag-toggle, .ag-colrow > .ag-toggle, .ag-schrow > .ag-toggle { order: -1; }
.ag-batt { font-variant-numeric: tabular-nums; color: var(--ag-text2); }
.ag-batt.low { color: var(--ag-error); font-weight: 500; }
.ag-entry { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; color: var(--ag-warning-text); background: var(--ag-warning-soft); padding: 2px 7px; border-radius: 999px; }
.ag-foot { position: sticky; bottom: calc(-32px - env(safe-area-inset-bottom, 0px)); margin: auto calc(-1 * var(--ag-px)) calc(-32px - env(safe-area-inset-bottom, 0px)); padding: 12px var(--ag-px) calc(12px + env(safe-area-inset-bottom, 0px)); display: flex; gap: 10px; align-items: center; background: var(--ag-card); border-top: 1px solid var(--ag-divider); z-index: 30; }
.ag-foot > span:first-child { min-width: 0; font-size: 13.5px; }
.ag-foot .ag-saved { color: var(--ag-success); font-weight: 500; }
.ag-foot .ag-err, .ag-settx .ag-err { color: var(--ag-error); }
.ag-mcards { display: flex; flex-direction: column; gap: 8px; }
.ag-mcards.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; align-items: start; }
.ag-mcards.grid > .ag-group-label { grid-column: 1 / -1; margin-top: 8px; }
.ag-lz { display: flex; flex-wrap: wrap; gap: 8px; }
.ag-lfacts { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px 14px; padding-top: 10px; border-top: 1px solid var(--ag-divider); font-size: 12.5px; }
.ag-lfacts > div { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.ag-lfacts b { font-weight: 500; overflow-wrap: anywhere; }
.ag-lchips { display: flex; flex-wrap: wrap; gap: 10px; }
.ag-mcard { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.ag-mcard-top { display: flex; gap: 10px; align-items: center; }
.ag-zbtns { display: grid; grid-template-columns: repeat(var(--n, 3), 1fr); gap: 6px; }
.ag-zbtn { min-height: 44px; border-radius: 12px; border: 1px solid var(--ag-divider); background: var(--ag-card); display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-size: 13px; color: var(--ag-text2); cursor: pointer; padding: 0 4px; }
.ag-zbtn.on { background: var(--ag-primary); border-color: var(--ag-primary); color: #fff; }
.ag-mentry { display: flex; align-items: center; gap: 10px; font-size: 13px; min-height: 44px; }
.ag-mentry .ag-toggle { margin: 0; }
.ag-group-label { font-size: 12px; color: var(--ag-text2); margin: 6px 2px 0; font-weight: 500; }
/* Karten der Übersicht: Titel einer Gruppe (Bereich, Sensorart, Anlage) mit Anzahl, über die ganze Breite, mit Linie darunter */
.ag-group-head { display: flex; align-items: center; gap: 8px; margin: 14px 2px 0; padding-bottom: 8px; border-bottom: 1px solid var(--ag-divider); font-size: 15px; color: var(--ag-text); }
.ag-group-head b { font-weight: 600; }
.ag-group-head .ag-ic { color: var(--ag-text2); }
.ag-mcards > .ag-group-head:first-child { margin-top: 2px; }
.ag-mcards.grid > .ag-group-head { margin-top: 14px; }
.ag-mcards.grid > .ag-group-head:first-child { margin-top: 2px; }

/* Dialoge (Code, Rückfrage): auf dem Handy als Blatt von unten */
dialog.ag-dlg:focus, dialog.ag-dlg:focus-visible { outline: none; }
dialog.ag-dlg { border: 0; padding: 0; border-radius: 22px; background: var(--ag-card); color: var(--ag-text); box-shadow: var(--ag-shadow); width: min(420px, calc(100vw - 32px)); }
dialog.ag-dlg::backdrop { background: rgba(0,0,0,.45); }
/* Dialog: Kopf mit rundem X oben rechts (wie Device Panel), Inhalt scrollt, Knöpfe unten bleiben stehen */
dialog.ag-dlg[open] { display: flex; flex-direction: column; max-height: min(92vh, 900px); overflow: hidden; }
dialog.ag-dlg[open] > .ag-dlg-body { overflow: auto; min-height: 0; overscroll-behavior: contain; }
.ag-dlg-x { position: absolute; top: 14px; right: 14px; z-index: 5; display: grid; place-items: center; width: 42px; height: 42px; padding: 0; border: 1px solid var(--ag-divider); border-radius: 50%; background: var(--ag-card); color: var(--ag-text2); cursor: pointer; }
.ag-dlg-x:hover { background: var(--ag-subtle); color: var(--ag-text); }
.ag-dlg-x:focus-visible { outline: 2px solid var(--ag-primary); outline-offset: 2px; }
.ag-dlg-body > h3, .ag-dlg-body > .ag-sys-top { padding-right: 54px; min-height: 42px; }
.ag-dlg-btns { position: sticky; bottom: -22px; z-index: 4; margin: 0 -22px -22px; padding: 14px 22px calc(14px + env(safe-area-inset-bottom, 0px)); background: var(--ag-card); border-top: 1px solid var(--ag-divider); }
.ag-step-ed { max-height: none; overflow: auto; }
.ag-dlg-body { padding: 22px; display: flex; flex-direction: column; gap: 14px; }
.ag-dlg h3 { margin: 0; font-size: 19px; font-weight: 500; }
.ag-dlg-btns { display: flex; gap: 10px; justify-content: flex-end; }
.ag-code { height: 52px; border-radius: 14px; border: 1px solid var(--ag-divider); background: var(--ag-bg); color: var(--ag-text); font: inherit; font-size: 24px; letter-spacing: .3em; text-align: center; }
.ag-dlg-err { color: var(--ag-error); font-size: 13.5px; min-height: 18px; }
.ag-toast { position: absolute; left: 50%; transform: translateX(-50%); bottom: calc(24px + env(safe-area-inset-bottom, 0px)); width: max-content; max-width: calc(100% - 32px); background: #323232; color: #fff; padding: 12px 18px; border-radius: 12px; box-shadow: var(--ag-shadow); z-index: 10; font-size: 14px; }
.ag-root { position: relative; display: flex; flex-direction: column; height: 100%; }

/* Handy (Companion App): einspaltig, Reiter mit Symbol und kurzem Text (Entscheid des Nutzers) */
:host([narrow]) .ag-content { padding: 0 var(--ag-px) calc(24px + env(safe-area-inset-bottom, 0px)); gap: 12px; }
:host([narrow]) .ag-sysgrid { grid-template-columns: 1fr; gap: 12px; }
:host([narrow]) .ag-sys { padding: 14px; gap: 12px; }
:host([narrow]) .ag-tabs { flex: 1 1 100%; }
:host([narrow]) .ag-alarm-btns { margin-left: 0; width: 100%; flex-direction: column; }
:host([narrow]) .ag-alarm .ag-btn { width: 100%; }
:host([narrow]) .list-search { flex: 1 1 100%; min-width: 0; }
:host([narrow]) .ag-foot { margin: auto -12px calc(-24px - env(safe-area-inset-bottom, 0px)); padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0px)); bottom: calc(-24px - env(safe-area-inset-bottom, 0px)); }
/* Handy: jedes Fenster füllt den Bildschirm (kein Rand oben, kein verschenkter Platz). X oben rechts, die Leiste mit den Knöpfen
   ganz unten: sie steht ausserhalb des scrollenden Inhalts (alarmageddon-panel.js dock) und bewegt sich darum nie, auch nicht beim
   Ziehen über das Ende hinaus. Nur die kurzen Rückfragen (Verwerfen, Bestätigen) bleiben ein Blatt von unten. */
:host([narrow]) dialog.ag-dlg { margin: 0; width: 100vw; max-width: 100vw; height: 100dvh; max-height: 100dvh; border-radius: 0; padding-bottom: 0; }
:host([narrow]) dialog.ag-dlg[open] { max-height: 100dvh; }
:host([narrow]) dialog.ag-dlg[open] > .ag-dlg-body { flex: 1; overscroll-behavior: none; }
:host([narrow]) dialog.ag-dlg > .ag-dlg-btns { position: static; flex: none; margin: 0; padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px)); }
/* Drei Knöpfe passen nebeneinander (schmalere Polster); reicht der Platz auf einem sehr schmalen Handy nicht, brechen sie um statt abgeschnitten zu werden */
:host([narrow]) dialog.ag-dlg > .ag-dlg-btns { gap: 8px; flex-wrap: wrap; }
:host([narrow]) dialog.ag-dlg > .ag-dlg-btns .ag-btn { padding-left: 14px; padding-right: 14px; min-width: 0; }
:host([narrow]) .ag-dlg-body > .ag-dlg-btns { margin-top: auto; }
:host([narrow]) dialog#ag-discard, :host([narrow]) dialog#ag-confirm { margin: auto 0 0; height: fit-content; max-height: 92vh; border-radius: 22px 22px 0 0; padding-bottom: env(safe-area-inset-bottom, 0px); }

/* 0.3.0: Übersicht mit Liste, Konfiguration */
.ag-h2 { margin: 0; font-size: 18px; font-weight: 500; }
.ag-small { font-size: 12px; }
.ag-list-head { display: flex; align-items: baseline; gap: 12px; margin: 8px 4px 10px; }
.ag-chip.zero { opacity: .55; }
.ag-ztag { display: inline-block; font-size: 12px; padding: 2px 8px; border-radius: 999px; background: var(--ag-subtle); color: var(--ag-text2); margin: 1px 2px 1px 0; white-space: nowrap; }
.ag-bat { display: inline-flex; align-items: center; gap: 6px; font-variant-numeric: tabular-nums; }
.ag-bat i { display: block; width: 30px; height: 10px; border-radius: 3px; border: 1px solid var(--ag-divider); background: var(--ag-subtle); overflow: hidden; }
.ag-bat i s { display: block; height: 100%; background: var(--ag-success); }
.ag-bat.low { color: var(--ag-error); font-weight: 500; } .ag-bat.low i s { background: var(--ag-error); }
.ag-sig { display: inline-flex; align-items: center; gap: 6px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.ag-bars { display: inline-flex; align-items: flex-end; gap: 2px; height: 15px; }
.ag-bars i { display: block; width: 3px; border-radius: 1px; background: color-mix(in srgb, var(--ag-text) 18%, transparent); }
.ag-sig.l4 .ag-bars i.on, .ag-sig.l3 .ag-bars i.on { background: var(--ag-success); }
.ag-sig.l2 .ag-bars i.on { background: var(--ag-warning); } .ag-sig.l1 .ag-bars i.on { background: var(--ag-error); }
.ag-ltable td { white-space: nowrap; }
.ag-ltable td:first-child { white-space: normal; }
.ag-lrow, .ag-lcard { cursor: pointer; }
.ag-lrow:hover td { background: var(--ag-hover); }
/* Offen oder Bewegung erkannt: schwacher Farbverlauf von unten in der Warnfarbe (Karte und Zeile) */
/* Karte der Anlage, wenn sie scharf ist: roter Verlauf von unten, mit dem Modus dunkler */
.ag-sys.ag-armed { background-image: linear-gradient(to top, color-mix(in srgb, var(--ag-error) var(--ag-armed-tint, 14%), transparent), transparent 80%); }
/* Scharf ist auf jedem Gerät und in jedem Design sofort zu sehen: roter Rahmen, der gewählte Modus rot hinterlegt (statt blau).
   Deaktiviert: "Aus" grün. Im dunklen Design sind die Verläufe kräftiger, sonst gehen sie im dunklen Grund unter. */
.ag-sys.ag-armed { border-color: color-mix(in srgb, var(--ag-error) 70%, var(--ag-divider)); box-shadow: 0 0 0 1px color-mix(in srgb, var(--ag-error) 70%, transparent), var(--ag-shadow-s); }
.ag-sys.ag-armed .ag-seg > button.on { color: var(--ag-error); }
.ag-sys.ag-armed .ag-seg > .ag-pill { background: color-mix(in srgb, var(--ag-error) 16%, var(--ag-card)); box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--ag-error) 65%, transparent); }
.ag-sys.ag-disarmed .ag-seg > button.on { color: var(--ag-success); }
:host([dark]) .ag-sys.ag-armed-home { --ag-armed-tint: 30%; }
:host([dark]) .ag-sys.ag-armed-night { --ag-armed-tint: 40%; }
:host([dark]) .ag-sys.ag-armed-away { --ag-armed-tint: 52%; }
:host([dark]) .ag-sys.ag-disarmed { background-image: linear-gradient(to top, color-mix(in srgb, var(--ag-success) 26%, transparent), transparent 80%); }
.ag-sys.ag-disarmed { background-image: linear-gradient(to top, color-mix(in srgb, var(--ag-success) 14%, transparent), transparent 80%); }
.ag-sys.ag-armed-home { --ag-armed-tint: 13%; }
.ag-sys.ag-armed-night { --ag-armed-tint: 22%; }
.ag-sys.ag-armed-away { --ag-armed-tint: 32%; }
/* Alarm: die Kachel bleibt rot wie "scharf", am kräftigsten; die zweite Zeile nennt, seit wann und von wem scharf geschaltet wurde */
.ag-sys.ag-alarmed { --ag-armed-tint: 44%; border-color: var(--ag-error); }
:host([dark]) .ag-sys.ag-alarmed { --ag-armed-tint: 66%; }
.ag-sys-armed { display: flex; align-items: center; gap: 6px; margin-top: 3px; }
.ag-sys-armed svg { flex: none; }
.ag-lcard.act { background-image: linear-gradient(to top, color-mix(in srgb, var(--ag-warning) 16%, transparent), transparent 75%); }
.ag-lrow.act td { background-image: linear-gradient(to top, color-mix(in srgb, var(--ag-warning) 14%, transparent), transparent 90%); }
.ag-lrow.act:hover td { background-color: var(--ag-hover); }
.ag-lrow.bad td:first-child { box-shadow: inset 4px 0 0 var(--ag-error); }
.ag-lmeta { display: flex; gap: 14px; flex-wrap: wrap; align-items: center; font-size: 13px; }
.ag-colist { display: flex; flex-direction: column; border: 1px solid var(--ag-divider); border-radius: 14px; padding: 2px 12px; }
.ag-colrow { display: flex; align-items: center; gap: 4px; padding: 5px 0; border-bottom: 1px solid var(--ag-divider); }
.ag-colrow > span { flex: 1; min-width: 0; }
.ag-colrow .ag-iconbtn { width: 34px; height: 34px; }
.ag-iconbtn:disabled { opacity: .3; cursor: default; }
.ag-colrow:last-child { border-bottom: 0; }
.ag-colrow .ag-toggle { margin: 0 8px 0 0; }
.ag-ready { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 13px; padding: 10px 2px; border-bottom: 1px solid var(--ag-divider); }
.ag-ready:last-child { border-bottom: 0; }
.ag-rchip { display: inline-flex; gap: 5px; align-items: center; height: 26px; padding: 0 10px; border-radius: 999px; font-size: 12.5px; font-weight: 500; }
.ag-rchip.ok { background: var(--ag-success-soft); color: var(--ag-success); }
.ag-rchip.no { background: var(--ag-warning-soft); color: var(--ag-warning-text); }
.ag-status h2 { font-size: 19px; }
.ag-rowbtn { width: 100%; border: 0; background: transparent; text-align: left; cursor: pointer; font: inherit; color: inherit; }
.ag-rowbtn:hover { background: var(--ag-hover); }
/* Die Tabelle ist höchstens 1180 px breit: bietet der Bildschirm genug Platz, bleibt sie beim Öffnen der Optionen unverändert (die Kästchen
   rutschen nicht nach links), das Blatt steht daneben; erst auf schmaleren Fenstern wird die Tabelle schmaler */
.ag-sen-layout { display: grid; grid-template-columns: minmax(0, 1180px); gap: 16px; align-items: start; }
.ag-sen-layout.open { grid-template-columns: minmax(0, 1180px) minmax(420px, 1fr); }
.ag-sen-layout.open > .ag-side { justify-self: end; width: 420px; max-width: 100%; }
.ag-side:empty { display: none; }
.ag-sheet { position: sticky; top: var(--ag-th-top, 0px); overflow: hidden; }
.ag-side-head { display: flex; gap: 12px; align-items: center; padding: 16px 18px; border-bottom: 1px solid var(--ag-divider); }
.ag-side-head h3 { margin: 0; font-size: 19px; font-weight: 500; overflow-wrap: anywhere; }
.ag-side-body { padding: 12px 18px 16px; display: flex; flex-direction: column; gap: 4px; }
.ag-zline { display: flex; gap: 6px; flex-wrap: wrap; padding: 4px 0 10px; }
.ag-orow { display: flex; gap: 12px; align-items: flex-start; padding: 12px 0; border-bottom: 1px solid var(--ag-divider); }
.ag-orow:last-child { border-bottom: 0; }
.ag-orow .ag-toggle { margin: 6px 0 0; }
.ag-oav { width: 34px; height: 34px; border-radius: 10px; background: var(--ag-subtle); color: var(--ag-text2); display: grid; place-items: center; flex: none; }
.ag-oav.on { background: var(--ag-primary-soft); color: var(--ag-primary); }
.ag-otx { flex: 1; min-width: 0; }
.ag-otx b { font-weight: 500; display: block; }
.ag-otx small { display: block; color: var(--ag-text2); font-size: 12.5px; margin-top: 2px; line-height: 1.35; }
/* Einstellungen pro Modus: Schalter mit Text, daneben die Reiter; Punkt am Kästchen = eigener Wert dieses Modus */
.ag-pmbar { display: flex; flex-direction: column; align-items: flex-start; gap: 14px; margin: 22px 0; padding: 14px 18px; border: 1px solid var(--ag-divider); border-radius: 16px; background: var(--ag-card); }
.ag-pmsw { display: flex; align-items: center; gap: 12px; }
.ag-pmsw .ag-toggle { margin: 0; flex: none; }
/* Schalter, Reiter und alles, was zu den Reitern gehört, stehen in einem umrandeten Bereich: so ist klar, bis wohin die Einstellung greift */
/* Der Abstand unter der Leiste gehört zur festen Leiste (Innenabstand): er bleibt beim Scrollen gleich */
.ag-pmstick { margin: var(--ag-gap, 18px) 0 0; padding-bottom: var(--ag-gap, 18px); }
.ag-pmstick > .ag-pmbar { margin: 0; }
.ag-pmgroup { margin-top: 6px; padding: 16px 18px 18px; border: 1.5px solid var(--ag-divider); border-radius: 20px; background: color-mix(in srgb, var(--ag-text) 2%, var(--ag-card)); }
.ag-pmgroup.on { border: 2px solid color-mix(in srgb, var(--ag-primary) 45%, transparent); background: color-mix(in srgb, var(--ag-primary) 4%, var(--ag-card)); }
.ag-pmgroup > .ag-pmbar { margin: 0 0 14px; padding: 0; border: 0; background: none; }
.ag-pmbanner { display: flex; align-items: center; gap: 12px; margin: 4px 0 12px; padding: 12px 14px; border: 2px solid var(--ag-primary); border-radius: 14px; background: var(--ag-primary-soft); color: var(--ag-primary); }
.ag-pmbanner small { display: block; font-size: 12px; font-weight: 500; opacity: .85; }
.ag-pmbanner b { display: block; font-size: 18px; font-weight: 600; line-height: 1.25; }
.ag-pmnote { display: block; margin-top: 4px; font-size: 13px; line-height: 1.4; color: var(--ag-text); opacity: .9; }
.ag-pmscope { display: flex; align-items: center; gap: 8px; margin: 0 0 14px; color: var(--ag-primary); font-weight: 500; font-size: 13.5px; }
.ag-pmgroup .ag-subh:first-of-type { margin-top: 4px; }
.ag-box.own { position: relative; }
/* Eigener Wert (weicht von der Voreinstellung ab): blau wie der Punkt am Sensornamen. Orange steht nur für Ungespeichertes (Punkt an den Reitern) */
.ag-box.own::after { content: ""; position: absolute; top: -3px; right: -3px; width: 9px; height: 9px; border-radius: 50%; background: var(--ag-primary); border: 2px solid var(--ag-card); }
th.cur, td.cur { background: color-mix(in srgb, var(--ag-primary) 9%, transparent); }
th.cur { box-shadow: inset 0 3px 0 var(--ag-primary); }
/* Die Spalte des gewählten Modus: Titel zusätzlich fett */
.ag-table th.cur { font-weight: 700; color: var(--ag-text); }
.ag-zbtn.cur { box-shadow: 0 0 0 2px var(--ag-primary); }
.ag-block { display: block; margin-top: 2px; font-size: 12px; }
.ag-origin { display: inline-flex; gap: 4px; align-items: center; margin-top: 4px; font-size: 11.5px; color: var(--ag-text2); border: 0; background: transparent; padding: 0; font-family: inherit; }
.ag-origin.own { color: var(--ag-primary); font-weight: 500; cursor: pointer; }
.ag-owndot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: var(--ag-primary); margin-left: 6px; vertical-align: middle; }
.ag-iconbtn { border: 0; background: transparent; color: var(--ag-text2); width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; cursor: pointer; }
.ag-iconbtn:hover { background: var(--ag-hover); }
.ag-table tr.sel td { background: var(--ag-primary-soft); }
.ag-grab { width: 40px; height: 5px; border-radius: 3px; background: var(--ag-text3); margin: 8px auto 0; opacity: .6; }
dialog.ag-wide { width: min(880px, calc(100vw - 32px)); }
dialog.ag-sheetdlg .ag-side-head { padding-top: 10px; }
.ag-ptable th.z { white-space: normal; font-size: 11px; line-height: 1.25; width: 120px; }
.ag-setlist { padding: 4px 18px; }
/* Modi als Schalter (1.17.12): Zeilen wie im Sensor-Blatt; Hinweis und Fehler darunter */
.ag-moderow .ag-otx small { font-size: 12.5px; }
.ag-modenote { padding: 10px 0 12px; display: flex; flex-direction: column; gap: 6px; }
.ag-setrow { display: flex; gap: 16px; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--ag-divider); flex-wrap: wrap; }
.ag-setrow:last-child { border-bottom: 0; }
.ag-settx { flex: 1; min-width: 220px; }
.ag-settx b { font-weight: 500; display: block; }
.ag-settx small { display: block; color: var(--ag-text2); font-size: 12.5px; margin-top: 2px; }
.ag-setrow .ag-toggle { margin: 0; }
.ag-num { display: inline-flex; align-items: center; gap: 6px; }
.ag-num input { width: 84px; height: 38px; border-radius: 10px; border: 1px solid var(--ag-divider); background: var(--ag-bg); color: var(--ag-text); font: inherit; padding: 0 10px; font-variant-numeric: tabular-nums; }
.ag-num.bad input { border-color: var(--ag-error); }
.ag-numgrid { display: flex; gap: 12px; flex-wrap: wrap; }
.ag-numlabel { display: flex; flex-direction: column; gap: 4px; }
.ag-cfg { margin-top: 0; }
:host([narrow]) .ag-sen-layout.open { grid-template-columns: 1fr; }
/* Blatt des Sensors auf dem Handy: ganzer Bildschirm wie jedes Fenster; nur die Optionen scrollen, Kopf und Leiste "Fertig" stehen fest */
:host([narrow]) dialog.ag-sheetdlg { overflow: hidden; padding-bottom: 0; }
:host([narrow]) dialog.ag-sheetdlg > .ag-side-body { flex: 1; min-height: 0; overflow: auto; overscroll-behavior: none; }
:host([narrow]) .ag-list-head { margin-top: 2px; }

/* 0.4.0: Aktionen als Ablauf, Benachrichtigungen */

/* Ablauf: eine gedachte senkrechte Achse bei --wf-x. Markenzeile, Plus und Linienstücke sitzen im Fluss mittig auf ihr, nichts ist
   absolut gelegt: die Linie kann darum nie über einem Symbol liegen und ist in jeder Breite und jedem Design gleich. */
.ag-wf-line, .ag-wf-end { --wf-x: 34px; }
.ag-wf-line { position: relative; display: flex; flex-direction: column; align-items: stretch; max-width: 820px; }
.ag-wf-start .ag-mini { background-color: var(--ag-bg); }
.ag-wf-start .ag-mini.err { background-image: linear-gradient(var(--ag-error-soft), var(--ag-error-soft)); }
.ag-wf-start .ag-mini.ok { background-image: linear-gradient(var(--ag-success-soft), var(--ag-success-soft)); }
/* Punkte der Verzögerungen (1.19.0): gelbe Uhr; Kapitel der Aktionen-Seite */
.ag-wf-start .ag-mini.warn { background-image: linear-gradient(var(--ag-warning-soft), var(--ag-warning-soft)); color: var(--ag-warning-text); }
.ag-wf-sub { display: block; font-weight: 400; font-size: 13px; margin-top: 1px; }
.ag-wf-chap { margin: 26px 0 10px; }
.ag-wf-chap:first-child { margin-top: 4px; }
.ag-wf-chap .ag-chap-h { margin-bottom: 0; }
.ag-delaypill { background: var(--ag-primary-soft); color: var(--ag-primary); }
.ag-delayfixed { opacity: .5; margin-top: 12px; }
.ag-wf-start { display: flex; align-items: center; gap: 10px; padding: 6px 20px 0 calc(var(--wf-x) - 14px); font-weight: 500; }
.ag-wf-plus { display: flex; flex-direction: column; align-items: center; width: 28px; margin-left: calc(var(--wf-x) - 14px); }
.ag-wf-seg { flex: none; width: 2px; height: 16px; background: var(--ag-divider); }
/* Alle Verbindungen sehen gleich aus (1.10.0): Schritte laufen standardmässig weiter; hält einer den nächsten auf, sagt es die Pille
   auf dem Schritt. Hinter dem letzten Plus der Aktionen nach dem Quittieren folgt nichts: dort endet die Linie, daneben ein Hinweis. */
.ag-wf-plus { position: relative; }
.ag-wf-plus.last > .ag-wf-seg:last-of-type { visibility: hidden; }
.ag-wf-plushint { position: absolute; left: calc(100% + 12px); top: 50%; transform: translateY(-50%); width: max-content; max-width: min(520px, calc(100vw - 110px)); }
.ag-wf-after { max-width: 820px; }
.ag-waitpill { display: inline-flex; align-items: center; gap: 6px; margin-top: 8px; min-height: 28px; padding: 2px 10px; border-radius: 999px; background: var(--ag-warning-soft); color: var(--ag-warning-text); font-size: 12.5px; font-weight: 500; }
.ag-wf-add { width: 28px; height: 28px; border-radius: 50%; border: 1.5px dashed var(--ag-primary); background: var(--ag-card); color: var(--ag-primary); display: grid; place-items: center; cursor: pointer; padding: 0; flex: none; }
.ag-wf-add:hover { background: var(--ag-primary-soft); }
/* Läuft nebenher: gestrichelte Linie genau zwischen Karte und Plus (nie in die Karte hinein). Die Lücken sind deckend in der Seitenfarbe,
   so scheint die durchgehende Hauptlinie dahinter nicht durch und es entsteht keine doppelte Linie */
.ag-wf-step { display: flex; align-items: center; gap: 12px; padding: 12px 14px; position: relative; z-index: 1; }
.ag-wf-icon { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; flex: none; background: var(--ag-primary-soft); color: var(--ag-primary); }
.ag-wf-icon.k-notify, .ag-wf-icon.k-sound { background: var(--ag-error-soft); color: var(--ag-error); }
.ag-wf-icon.k-acknowledge { background: var(--ag-success-soft); color: var(--ag-success); }
/* Voralarm: Warnfarbe (leiser Vorbote), Aktivierungston: die Farbe des Panels (freundlich); der Alarmton bleibt rot */
.ag-wf-icon.k-prealarm { background: var(--ag-warning-soft); color: var(--ag-warning-text); }
.ag-wf-icon.k-wait { background: var(--ag-subtle); color: var(--ag-text2); }
.ag-wf-icon.k-open, .ag-wf-icon.k-close, .ag-wf-icon.k-end { background: var(--ag-success-soft); color: var(--ag-success); }
.ag-wf-text { flex: 1; min-width: 0; }
.ag-wf-text b { font-weight: 500; }
.ag-wf-text .ag-small { overflow-wrap: anywhere; }
/* Knöpfe je Schritt (1.17.4): umrandet wie Knöpfe, mindestens 44 px, mit Abstand, damit sie sich auf dem Handy treffen lassen */
.ag-wf-btns { display: flex; gap: 10px; flex: none; }
.ag-wf-btns .ag-iconbtn { width: 44px; height: 44px; border: 1px solid color-mix(in srgb, var(--ag-text2) 40%, transparent); background: var(--ag-card); color: var(--ag-text); }
.ag-wf-btns .ag-iconbtn:hover { background: var(--ag-hover); }
.ag-wf-btns .ag-iconbtn[data-wf="delete"] { color: var(--ag-error); }
.ag-wf-btns .ag-iconbtn:disabled { opacity: .3; cursor: default; }
.ag-wf-empty { margin-left: 20px; }
/* Ende des Ablaufs: die Linie des Ablaufs endet an der Marke "Alarm endet" und läuft nie durch die Karten */
.ag-wf-end { position: relative; max-width: 820px; }
.ag-wf-end::before { content: ""; display: block; width: 2px; height: 12px; margin-left: calc(var(--wf-x) - 1px); background: var(--ag-divider); }
.ag-wf-end .ag-wf-start { padding-top: 0; }
.ag-wf-endcard { margin: 8px 0 0; padding: 12px 14px; display: flex; align-items: center; gap: 12px; }
.ag-wf-endcard .ag-wf-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.ag-wf-line > .ag-card { position: relative; z-index: 1; }
.ag-wf-info { display: flex; gap: 8px; align-items: center; margin: 16px 8px 0; line-height: 1.4; }
.ag-wf-info .ag-ic { display: inline-block; }
/* contents: sonst klebt die Leiste nur innerhalb dieses Blocks und scrollt mit weg */
.ag-wf-head { display: contents; }
.ag-wf-head > .ag-tools { margin-bottom: 12px; }
.ag-handle { border: 0; background: transparent; color: var(--ag-text3); width: 30px; height: 44px; border-radius: 10px; display: grid; place-items: center; cursor: grab; flex: none; touch-action: none; padding: 0; }
.ag-handle:hover, .ag-handle:focus-visible { background: var(--ag-hover); color: var(--ag-text2); }
.ag-wf-step.dragging { z-index: 5; box-shadow: 0 10px 28px rgba(0,0,0,.28); cursor: grabbing; transition: none; }
.ag-wf-step { transition: transform .15s ease; }
/* Liste, in die der gezogene Schritt beim Loslassen fällt (1.22.0) */
.ag-wf-line.ag-drop { outline: 2px dashed var(--ag-primary); outline-offset: 8px; border-radius: 18px; background: var(--ag-primary-soft); }
/* Liste, die diese Art von Schritt nicht aufnimmt */
.ag-wf-line.ag-drop-no { outline: 2px dashed var(--ag-error); outline-offset: 8px; border-radius: 18px; background: var(--ag-error-soft); }
.ag-dragging, .ag-dragging * { cursor: grabbing !important; user-select: none; -webkit-user-select: none; }
.ag-ef { display: flex; flex-direction: column; gap: 6px; margin: 14px 0; }
.ag-ef-l { font-weight: 500; }
.ag-ef-h { color: var(--ag-text2); font-size: 12.5px; line-height: 1.35; }
.ag-ef-row { display: flex; flex-direction: row; align-items: flex-start; gap: 12px; }
.ag-ef-row .ag-settx { min-width: 0; }
.ag-ef-row .ag-toggle { margin: 1px 0 0; }
/* Eine Schalterzeile hat Luft zu dem, was vor ihr steht, und zum Regler, der zu ihr gehört */
.ag-efcard > * + .ag-ef-row { margin-top: 14px; }
.ag-ef-row + .ag-ef-range { margin-top: 14px; }
.ag-ef-range label { display: flex; justify-content: space-between; gap: 10px; font-size: 13px; color: var(--ag-text2); }
.ag-ef-range { max-width: 50%; min-width: 260px; }
/* Regler je Medienplayer (1.17.3): Luft zum Schalter darüber, zwischen den Reglern und zur Beschriftung */
.ag-ef-range label { margin-bottom: 8px; }
.ag-ef-range + .ag-ef-range, .ag-pervol + .ag-ef-range { margin-top: 20px; }
.ag-pervol { margin-bottom: 4px; }
:host([narrow]) .ag-ef-range { max-width: none; min-width: 0; }
.ag-ef-range .ag-range { max-width: none; }
.ag-ef-val { font-weight: 500; color: var(--ag-text); font-variant-numeric: tabular-nums; }
.ag-req { font-size: 11px; font-weight: 400; color: var(--ag-error); }
.ag-opt { border: 1px solid var(--ag-divider); border-radius: 12px; padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; }
.ag-more { margin: 10px 0; border-top: 1px solid var(--ag-divider); padding-top: 8px; }
.ag-more > summary { cursor: pointer; font-weight: 500; padding: 8px 0; min-height: 28px; }
.ag-combo { position: relative; }
.ag-search { display: flex; align-items: center; gap: 8px; height: 44px; padding: 0 6px 0 12px; border-radius: 12px; background: var(--ag-bg); border: 1px solid var(--ag-divider); color: var(--ag-text2); }
.ag-search:focus-within { border-color: var(--ag-primary); }
.ag-search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--ag-text); font: inherit; height: 100%; }
.ag-search input::-webkit-search-cancel-button { display: none; }
.ag-combo-list { display: none; flex-direction: column; max-height: 220px; overflow: auto; margin-top: 6px; border: 1px solid var(--ag-divider); border-radius: 12px; background: var(--ag-card); }
.ag-combo.open .ag-combo-list { display: flex; }
.ag-combo-item { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; padding: 8px 12px; min-height: 44px; justify-content: center; border: 0; border-bottom: 1px solid var(--ag-divider); background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.ag-combo-item:last-child { border-bottom: 0; }
.ag-combo-item:hover { background: var(--ag-hover); }
.ag-combo-item small { color: var(--ag-text2); font-size: 11.5px; }
.ag-combo-item.cur { background: var(--ag-primary-soft); }
.ag-search.off { opacity: .5; }
.ag-cbox .ag-search { cursor: text; }
.ag-cbox .ag-search .ag-ic:last-child { transform: rotate(90deg); margin-left: auto; opacity: .7; }
.ag-combo-more { padding: 8px 12px; }
.ag-tone { display: flex; gap: 8px; align-items: center; }
.ag-tone select { flex: 1; min-width: 0; }
.ag-pv { display: inline-flex; gap: 2px; padding: 2px; border-radius: 999px; border: 1px dashed var(--ag-warning-text); flex: none; }
.ag-pv .ag-iconbtn { width: 36px; height: 36px; }
.ag-pv .ag-iconbtn.on { color: var(--ag-primary); background: var(--ag-primary-soft); }
.ag-pv .ag-iconbtn:disabled { opacity: .3; cursor: default; }
.ag-pv-note { display: flex; gap: 6px; align-items: flex-start; font-size: 12px; color: var(--ag-warning-text); line-height: 1.35; }
.ag-pv-note .ag-ic { flex: none; margin-top: 1px; }
.ag-act { display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 14px; border-radius: 12px; border: 1px solid var(--ag-divider); background: var(--ag-card); color: var(--ag-text); font: inherit; cursor: pointer; }
.ag-act.on { background: var(--ag-primary-soft); border-color: transparent; color: var(--ag-primary); font-weight: 500; }
.ag-actions { display: flex; flex-direction: column; gap: 10px; }
.ag-log-tools { margin-bottom: 4px; flex-direction: column; align-items: stretch; gap: 10px; }
.ag-lfields { display: flex; flex-wrap: wrap; gap: 12px 16px; }
.ag-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.ag-fieldrow { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ag-lrange { display: flex; align-items: center; gap: 8px; color: var(--ag-text2); font-size: 14px; }
:host([narrow]) .ag-field { flex: 1 1 100%; }
:host([narrow]) .ag-fieldrow > .ag-select { flex: 1 1 auto; }
.ag-log-body { margin-bottom: 24px; }
.ag-date { height: 38px; border-radius: 999px; padding: 0 12px; min-width: 150px; }
.ag-ldates { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
/* Handy: die Auswahl füllt die erste Zeile, die Datumsfelder stehen in der zweiten, gleich breit nebeneinander */
:host([narrow]) .ag-log-tools .ag-fieldrow { flex-wrap: wrap; }
:host([narrow]) .ag-log-tools .ag-fieldrow > .ag-select { flex: 1 1 100%; }
:host([narrow]) .ag-log-tools .ag-ldates { flex: 1 1 100%; flex-wrap: nowrap; }
:host([narrow]) .ag-log-tools .ag-date { flex: 1 1 0; min-width: 0; }
.ag-inc { padding: 0; margin-bottom: 12px; overflow: hidden; }
.ag-inc-head { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 14px; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.ag-inc-head:hover { background: var(--ag-hover); }
.ag-inc-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ag-inc-text b { font-weight: 500; overflow-wrap: anywhere; }
.ag-inc-arrow { transition: transform .2s ease; flex: none; }
.ag-inc.open .ag-inc-arrow { transform: rotate(90deg); }
.ag-inc-body { padding: 4px 16px 16px; border-top: 1px solid var(--ag-divider); }
.ag-lg { display: flex; flex-direction: column; gap: 6px; padding: 14px 0 6px; }
.ag-lg-row { display: grid; grid-template-columns: minmax(110px, 200px) 1fr; gap: 12px; align-items: center; }
.ag-lg-name { display: flex; align-items: center; gap: 8px; font-size: 13px; min-width: 0; }
.ag-lg-name span:last-child { overflow-wrap: anywhere; }
.ag-lg-plot { position: relative; height: 22px; border-radius: 6px; background: var(--ag-subtle); }
.ag-lg-bar { position: absolute; top: 3px; bottom: 3px; border-radius: 4px; background: var(--ag-error); min-width: 4px; }
.ag-lg-bar.gone { background: repeating-linear-gradient(45deg, var(--ag-warning-text), var(--ag-warning-text) 3px, transparent 3px, transparent 6px); }
.ag-lg-mark { position: absolute; top: -3px; bottom: -3px; width: 2px; margin-left: -1px; z-index: 1; background: var(--ag-text3); }
.ag-lg-mark.warn { background: var(--ag-warning-text); }
.ag-lg-mark.err { background: var(--ag-error); outline: 1px solid var(--ag-card); }
.ag-lg-mark.ok { background: var(--ag-success); }
.ag-lg-axis { position: relative; height: 16px; font-size: 11.5px; color: var(--ag-text2); font-variant-numeric: tabular-nums; }
.ag-lg-axis span { position: absolute; transform: translateX(-50%); white-space: nowrap; }
.ag-lg-axis span:first-child { transform: none; }
.ag-lg-axis span:last-child { transform: translateX(-100%); }
.ag-lg-legend { margin-top: 4px; }
.ag-seq { list-style: none; margin: 14px 0 0; padding: 0; position: relative; }
/* Verbindung der Schritte (1.11.0): je Zeile ein Stück über und eines unter dem Symbol, beide enden 3 px vor dem Symbol. So liegt nie eine
   Linie hinter oder über einem Symbol (vorher lief eine durchgehende Linie hinter den Symbolen durch und schien durch ihre halb
   durchsichtige Fläche). Das Symbol (28 px) steht in der Zeile mittig: darum reicht jedes Stück vom Rand der Zeile bis kurz davor. */
.ag-seq-item { display: flex; align-items: center; gap: 12px; padding: 7px 0; position: relative; }
.ag-seq-item::before, .ag-seq-item::after { content: ""; position: absolute; left: 13px; width: 2px; height: calc(50% - 17px); background: var(--ag-divider); }
.ag-seq-item::before { top: 0; }
.ag-seq-item::after { bottom: 0; }
.ag-seq-item:first-child::before, .ag-seq-item:last-child::after { display: none; }
.ag-seq-item .ag-mini { position: relative; z-index: 1; flex: none; }
.ag-seq-item.err .ag-mini { background: var(--ag-error-soft); color: var(--ag-error); }
.ag-seq-item.warn .ag-mini { background: var(--ag-warning-soft); color: var(--ag-warning-text); }
.ag-seq-item.info .ag-mini { background: var(--ag-primary-soft); color: var(--ag-primary); }
.ag-seq-item.ok .ag-mini { background: var(--ag-success-soft); color: var(--ag-success); }
.ag-seq-text { flex: 1; min-width: 0; overflow-wrap: anywhere; font-size: 13.5px; }
.ag-seq-text b { font-weight: 500; }
.ag-seq-item time { display: flex; flex-direction: column; align-items: flex-end; font-size: 13px; font-variant-numeric: tabular-nums; flex: none; }
.ag-seq-item time small { color: var(--ag-text2); font-size: 11.5px; }
:host([narrow]) .ag-lg-row { grid-template-columns: 1fr; gap: 4px; }
:host([narrow]) .ag-lg-axisrow .ag-lg-name { display: none; }
.ag-ntprev { padding: 12px 14px; border-radius: 12px; background: var(--ag-subtle); display: flex; flex-direction: column; gap: 2px; overflow-wrap: anywhere; font-size: 13.5px; }
.ag-chip small { margin-left: 6px; color: var(--ag-text2); font-size: 11.5px; }
/* Ladeanzeige wie in Device Panel (loader.js): der Inhalt bleibt gedimmt, drei Punkte in der Farbe --ld liegen darüber */
.ag-ldwrap > .ag-content { opacity: .28; pointer-events: none; user-select: none; }
.ag-ldblur > .ag-content { opacity: .7; filter: blur(3px); transition: filter .15s ease; }
.ag-ld { position: absolute; left: 50%; top: 40%; width: 72px; height: 72px; margin: -36px 0 0 -36px; pointer-events: none; z-index: 20; }
.ag-ld s { position: absolute; width: 14px; height: 14px; border-radius: 50%; background: var(--ld, var(--ag-primary)); box-shadow: 0 0 12px color-mix(in srgb, var(--ld, var(--ag-primary)) 55%, transparent); }
.ag-ld s:nth-child(1) { left: 55px; top: 29px; }
.ag-ld s:nth-child(2) { left: 17px; top: 51px; }
.ag-ld s:nth-child(3) { left: 17px; top: 7px; }
.ag-kinds { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
.ag-kind { display: grid; grid-template-columns: auto 1fr; grid-template-rows: auto auto; column-gap: 12px; align-items: center; text-align: left; padding: 12px; border: 1px solid var(--ag-divider); border-radius: 14px; background: var(--ag-card); cursor: pointer; font: inherit; color: inherit; }
.ag-kind:hover { border-color: var(--ag-primary); }
.ag-kind .ag-wf-icon { grid-row: span 2; }
.ag-kind b { font-weight: 500; }
.ag-kind small { color: var(--ag-text2); font-size: 12px; line-height: 1.3; }
.ag-dlg-body .list-search { flex: none; height: 48px; min-height: 48px; min-width: 0; padding: 0 8px 0 14px; }
.ag-dlg-body .list-search input { font-size: 15px; }
.ag-pick-chips { gap: 10px; margin-top: 12px; }
.ag-step-ed .ag-sys-top h3 { margin: 0; }
.ag-elist { display: flex; flex-direction: column; max-height: 260px; overflow: auto; border: 1px solid var(--ag-divider); border-radius: 12px; }
.ag-erow { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 0; border-bottom: 1px solid var(--ag-divider); background: var(--ag-card); text-align: left; cursor: pointer; font: inherit; color: inherit; min-height: 44px; }
.ag-erow:last-child { border-bottom: 0; }
.ag-erow .ag-box { margin: 0; width: 24px; height: 24px; pointer-events: none; }
.ag-erow small { display: block; font-size: 11.5px; }
.ag-erow.on { background: var(--ag-primary-soft); }
.ag-sounds { display: flex; flex-wrap: wrap; gap: 6px; }
.ag-sound { display: inline-flex; align-items: center; }
.ag-sound .ag-iconbtn { width: 32px; height: 32px; }
.ag-fld { display: flex; flex-direction: column; gap: 6px; }
.ag-fld input[type="range"], .ag-range { width: 100%; max-width: 320px; accent-color: var(--ag-primary); }
.ag-input { height: 40px; border-radius: 10px; border: 1px solid var(--ag-divider); background: var(--ag-bg); color: var(--ag-text); font: inherit; padding: 0 12px; }
textarea.ag-input { height: auto; padding: 10px 12px; resize: vertical; }
.ag-mono { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 13px; }
.ag-evgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); column-gap: 24px; margin-top: 6px; }
.ag-warntext { color: var(--ag-warning-text) !important; display: flex !important; gap: 8px; margin-top: 4px !important; align-items: center; }
:host([narrow]) .ag-wf-step { flex-wrap: wrap; }
:host([narrow]) .ag-wf-btns { width: 100%; justify-content: flex-end; gap: 14px; margin-top: 4px; }
:host([narrow]) .ag-wf-endcard .ag-wf-btns { width: auto; }
:host([narrow]) .ag-wf-line, :host([narrow]) .ag-wf-end { --wf-x: 30px; }

/* 0.5.0: Codes pro Person, Sicherung, Prognose */
.ag-fc { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.ag-fc.warn { color: var(--ag-warning-text); }
.ag-codes { margin-top: 16px; }
.ag-coderow { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-top: 1px solid var(--ag-divider); }
.ag-coderow small { display: block; font-size: 12.5px; }
.ag-schrow { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 10px 0; border-top: 1px solid var(--ag-divider); }
.ag-schrow.dim > :not(.ag-toggle):not(.ag-iconbtn) { opacity: .55; }
.ag-schrow .ag-time { width: 140px; }
.ag-schrow .ag-toggle { margin: 0 4px 0 0; }
.ag-schrow select.ag-input { min-width: 150px; }
.ag-days { display: flex; gap: 4px; flex-wrap: wrap; }
.ag-day { width: 36px; height: 36px; border-radius: 999px; border: 1px solid var(--ag-divider); background: var(--ag-card); color: var(--ag-text2); font: inherit; font-size: 13px; cursor: pointer; padding: 0; }
.ag-day.on { background: var(--ag-primary); border-color: var(--ag-primary); color: #fff; font-weight: 500; }
.ag-day:focus-visible { outline: 2px solid var(--ag-primary); outline-offset: 2px; }
.ag-schwarn { flex-basis: 100%; }
:host([narrow]) .ag-schrow .ag-time, :host([narrow]) .ag-schrow select.ag-input { flex: 1 1 120px; min-width: 0; }
:host([narrow]) .ag-schrow .ag-days { flex-basis: 100%; order: 3; }
/* Handy: Schalter, Uhrzeit und Papierkorb in der ersten Zeile, darunter die Aktion in voller Breite, dann die Wochentage */
:host([narrow]) .ag-schrow > .ag-iconbtn { order: 1; }
:host([narrow]) .ag-schrow select.ag-input { order: 2; flex-basis: 100%; }
:host([narrow]) .ag-schrow > .ag-schwarn { order: 4; }
.ag-btnrow { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
:host([narrow]) .ag-codes .ag-btnrow { justify-content: flex-start; }
/* Lange Texte in der Auswahl "Offener Sensor" auf dem Handy: volle Breite, Text darf umbrechen statt abgeschnitten zu werden */
:host([narrow]) [data-seg="sys-open"] { display: flex; width: 100%; }
:host([narrow]) [data-seg="sys-open"] > button { flex: 1 1 0; min-width: 0; white-space: normal; line-height: 1.25; text-align: center; }

#ag-codes .ag-dlg-body { gap: 14px; }
#ag-codes .ag-fld small { font-size: 12.5px; }

/* Fünf Unterreiter auf dem Handy: volle Breite, gleich breit, kleinere Schrift (kein Abschneiden) */
.ag-btn.icon { width: 38px; padding: 0; }
.ag-btn.warn { background: var(--ag-warning); border-color: var(--ag-warning); color: #fff; }
button.ag-link, a.ag-link { display: inline-flex; align-items: center; gap: 5px; padding: 0 6px; border: 0; background: none; color: var(--ag-primary); font: inherit; font-size: 13px; cursor: pointer; text-decoration: none; white-space: nowrap; }
.ag-spin { flex: none; box-sizing: border-box; width: 16px; height: 16px; border: 2px solid color-mix(in srgb, currentColor 30%, transparent); border-top-color: currentColor; border-radius: 50%; animation: ag-spin .8s linear infinite; }
@keyframes ag-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .ag-spin { animation: none; } }
.ag-seg > button.has-dot { position: relative; }
.ag-seg > button.has-dot::after { content: ""; position: absolute; top: 4px; right: 3px; width: 8px; height: 8px; border-radius: 50%; background: var(--ag-primary); box-shadow: 0 0 0 2px color-mix(in srgb, var(--ag-text) 7%, var(--ag-card)); }

/* 0.8.0: Kapitel wie in Device Panel (Titel mit Strich davor), gleitende Seiten, Punkt "ungespeichert" */
.ag-chap { margin-top: 22px; }
.ag-chap:first-child { margin-top: 6px; }
.ag-chap-t { display: flex; align-items: center; gap: 10px; margin: 0 4px 10px; font-size: 17px; font-weight: 600; letter-spacing: .005em; }
.ag-chap-t::before { content: ""; flex: none; width: 4px; height: 20px; border-radius: 2px; background: var(--ag-primary); }
.ag-chap-h { margin: -4px 4px 12px; color: var(--ag-text2); font-size: 13.5px; line-height: 1.45; }
.ag-chap > .ag-card { margin-top: 0; }
/* Die Seite füllt die Höhe: die Leiste mit Speichern sitzt unten, auch wenn wenig Inhalt da ist; davor bleibt immer Abstand */
.ag-pane { display: flex; flex-direction: column; flex: 1 0 auto; }
.ag-pane > :has(+ .ag-foot) { margin-bottom: 24px; }
:host([narrow]) .ag-pane > :has(+ .ag-foot) { margin-bottom: 20px; }
.ag-pane.from-right { animation: ag-from-right .24s cubic-bezier(.2,.7,.2,1); }
.ag-pane.from-left { animation: ag-from-left .24s cubic-bezier(.2,.7,.2,1); }
@keyframes ag-from-right { from { opacity: 0; transform: translateX(36px); } to { opacity: 1; transform: none; } }
@keyframes ag-from-left { from { opacity: 0; transform: translateX(-36px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .ag-pane.from-right, .ag-pane.from-left { animation: none; } }
.ag-seg > button.has-edit { position: relative; }
.ag-seg > button.has-edit::after { content: ""; position: absolute; top: 4px; right: 3px; width: 8px; height: 8px; border-radius: 50%; background: var(--ag-warning); box-shadow: 0 0 0 2px color-mix(in srgb, var(--ag-text) 7%, var(--ag-card)); }
.ag-seg > button.has-edit.has-dot::after { background: var(--ag-warning); }

/* 0.9.0: Meldungen (Empfänger-Dropdown mit Pillen, Arten mit kritisch und Lautstärke) */
.ag-rline { margin-top: 10px; }
.ag-rsel { min-width: 220px; max-width: 100%; appearance: auto; }
.ag-rpills { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.ag-rpill { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 6px 0 12px; border-radius: 999px; background: var(--ag-primary-soft); color: var(--ag-primary); font-size: 14px; font-weight: 500; }
.ag-rpill.gone { background: var(--ag-warning-soft); color: var(--ag-warning-text); }
.ag-rx { display: grid; place-items: center; width: 24px; height: 24px; padding: 0; border: 0; border-radius: 50%; background: transparent; color: inherit; cursor: pointer; }
.ag-rx:hover { background: color-mix(in srgb, currentColor 16%, transparent); }
.ag-rx:focus-visible { outline: 2px solid currentColor; outline-offset: 1px; }
.ag-mtlist { padding: 4px 0; }
.ag-mt { padding: 12px 16px; border-top: 1px solid var(--ag-divider); }
.ag-mt:first-child { border-top: 0; }
.ag-mt.group { padding-bottom: 4px; }
.ag-mt-subs { margin: 6px 0 4px 40px; border-left: 2px solid var(--ag-divider); }
.ag-mt.sub { border-top: 0; padding: 10px 0 10px 14px; }
.ag-mt.sub .ag-mt-body { margin-left: 0; }
:host([narrow]) .ag-mt-subs { margin-left: 8px; }
/* Schalter stehen links, der Text wächst nach rechts (1.17.7): so ist klar, welcher Schalter zu welcher Option gehört */
.ag-mt-head { display: flex; align-items: flex-start; gap: 12px; }
.ag-mt-head > .ag-toggle { margin-top: 3px; }
.ag-mt-head > .ag-mini { margin-top: 0; }
.ag-mt-opt.sw { justify-content: flex-start; align-items: flex-start; flex-wrap: nowrap; }
.ag-mt-opt.sw > .ag-toggle { margin: 3px 0 0; }
.ag-mt-head .ag-settx { flex: 1 1 auto; min-width: 0; }
.ag-mt.off .ag-settx { opacity: .6; }
.ag-mt-body { display: flex; flex-direction: column; gap: 4px; margin: 10px 0 2px 52px; padding: 4px 12px; border-radius: 12px; background: var(--ag-subtle); }
.ag-mt-opt { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 40px; padding: 6px 0; }
.ag-mt-opt > span:first-child { flex: 1 1 auto; min-width: 0; }
.ag-mt-opt small { display: block; margin-top: 1px; color: var(--ag-text2); font-size: 12px; line-height: 1.35; }
.ag-mt-opt.vol { flex-wrap: wrap; }
.ag-mt-opt.vol .ag-range { flex: 1 1 200px; max-width: 320px; }
:host([narrow]) .ag-mt-body { margin-left: 0; }
:host([narrow]) .ag-mt-opt { flex-wrap: wrap; row-gap: 8px; }
:host([narrow]) .ag-mt-opt.sw { flex-wrap: nowrap; }
:host([narrow]) .ag-mt-opt.vol .ag-range { flex-basis: 100%; max-width: none; }

/* 0.10.0: Einstellungen je Modus */
.ag-scopebar { margin: 0 0 12px; overflow-x: auto; }

/* Tabellenkopf der Sensorliste: abgehoben (Grundfläche, kräftigere Schrift, Linie darunter), Spalten sortierbar */
.ag-table.ag-ltable th { background: color-mix(in srgb, var(--ag-text) 6%, var(--ag-card)); color: var(--ag-text); font-weight: 600; font-size: 12px; padding: 0; border-bottom: 2px solid var(--ag-divider); }
.ag-sortbtn { all: unset; box-sizing: border-box; display: inline-flex; align-items: center; gap: 4px; width: 100%; padding: 14px; cursor: pointer; text-transform: uppercase; letter-spacing: .04em; font-weight: 600; font-size: 12px; color: var(--ag-text2); }
.ag-sortbtn:hover { color: var(--ag-text); }
.ag-sortbtn.on { color: var(--ag-primary); }
.ag-sortbtn:focus-visible { outline: 2px solid var(--ag-primary); outline-offset: -2px; }
.ag-sortic { display: inline-flex; width: 14px; }
/* Rollbalken im Fenster: schmal, mit Abstand zum Rand und zu den runden Ecken */
.ag-dlg-body { scrollbar-gutter: stable; }
.ag-dlg-body::-webkit-scrollbar { width: 14px; }
.ag-dlg-body::-webkit-scrollbar-track { background: transparent; margin: 18px 0; }
.ag-dlg-body::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--ag-text) 28%, transparent); border-radius: 999px; border: 4px solid transparent; background-clip: padding-box; }
.ag-dlg-body::-webkit-scrollbar-thumb:hover { background: color-mix(in srgb, var(--ag-text) 45%, transparent); background-clip: padding-box; }
/* Alle Auswahlfelder (Dropdowns) einheitlich: eigener kleiner Pfeil mit Abstand zum Rand, Platz rechts dafür */
select.ag-select, select.ag-input, .ag-dlg select, .ag-view select {
  appearance: none; -webkit-appearance: none; cursor: pointer; padding-right: 40px;
  /* Pfeil als Vektorbild (der frühere Pfeil aus zwei Verläufen zeigte bei manchen Zoomstufen eine Kerbe); mittleres Grau passt zu hell und dunkel */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5l5 5 5-5z' fill='%238a8f98' stroke='%238a8f98' stroke-width='1' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-position: right 16px center; background-size: 12px 8px; background-repeat: no-repeat; }
/* Im Fenster "Ansicht" (Spalte mit flex): das Feld darf nicht zusammengedrückt werden und hat die Höhe und Rundung der Auswahlleisten darüber */
.ag-dlg-body > select.ag-input { flex: none; height: 42px; min-height: 42px; border-radius: 14px; padding-left: 16px; font-size: 14px; }
select.ag-select:focus-visible, select.ag-input:focus-visible { outline: 2px solid var(--ag-primary); outline-offset: 1px; }
/* Auswahl der Alarmanlage in der Konfiguration: auffällig, damit klar ist, dass sie für alle Reiter gilt */
select.ag-select[data-act="system"] { height: 52px; padding-left: 22px; font-size: 24px; letter-spacing: -.2px; border: 2px solid var(--ag-primary); background-color: var(--ag-primary-soft); color: var(--ag-primary); font-weight: 600; }
.ag-content { scroll-padding: calc(var(--ag-th-top, 0px) + 56px) 0 80px; }
/* Der Tabellenkopf klebt auch auf dem Handy (Regel: Titelzeile einer Tabelle scrollt nie weg). "clip" statt "auto", weil ein Rollbereich das Festkleben verhindert */
:host([narrow]) .ag-table-wrap.ag-stickwrap { overflow: clip; }
:host([narrow]) .ag-table-wrap.ag-stickwrap.hscroll { overflow-x: auto; }
:host([narrow]) .ag-stickwrap.hscroll .ag-table th { position: static; }
/* Damit nichts abgeschnitten wird, dürfen die Zellen auf dem Handy umbrechen und schrumpfen */
:host([narrow]) .ag-ltable td, :host([narrow]) .ag-ltable th { white-space: normal; }
:host([narrow]) .ag-ltable td, :host([narrow]) .ag-ltable th { padding-left: 6px; padding-right: 6px; }
:host([narrow]) .ag-ltable td:first-child, :host([narrow]) .ag-ltable th:first-child { padding-left: 12px; }
/* Kompakt: ohne Symbol vor dem Namen, Batterie nur als Zahl, Empfang nur als Balken */
:host([narrow]) .ag-ltable .ag-nm .ag-av { display: none; }
:host([narrow]) .ag-ltable .ag-bat i { display: none; }
:host([narrow]) .ag-ltable .ag-sig { font-size: 0; }
:host([narrow]) .ag-ltable .ag-sig .ag-bars { font-size: 13px; }
:host([narrow]) .ag-ltable th .ag-sortbtn { padding-left: 0; padding-right: 0; font-size: 10.5px; letter-spacing: 0; }
:host([narrow]) .ag-ltable .ag-fc { display: none; }
:host([narrow]) .ag-ltable td:last-child, :host([narrow]) .ag-ltable th:last-child { display: none; }
:host([narrow]) .ag-ltable td, :host([narrow]) .ag-ltable th { padding-left: 4px; padding-right: 4px; font-size: 12.5px; }
:host([narrow]) .ag-ltable tr.grp td { display: table-cell; }
.ag-table td.ag-acts { width: 1%; white-space: nowrap; padding-right: 16px; }
/* Papierkorb und Pfeil nebeneinander auf einer Höhe, der Pfeil ganz rechts */
.ag-actrow { display: flex; align-items: center; justify-content: flex-end; gap: 10px; }
.ag-actrow > * { flex: none; margin: 0; }
.ag-clickrow { cursor: pointer; }
.ag-table tr.ag-clickrow:hover td { background: color-mix(in srgb, var(--ag-text) 4%, transparent); }
/* Easter Egg (1.20.0): Dreifachklick aufs Logo. Bewegung reduzieren gilt hier bewusst nicht (Vorgabe des Nutzers). */
.ag-logo { cursor: pointer; -webkit-tap-highlight-color: transparent; }
.ag-egg { position: fixed; inset: 0; z-index: 10000; display: grid; place-items: center; padding: 16px; }
.ag-egg-scrim { position: absolute; inset: 0; background: rgba(0,0,0,.72); }
.ag-egg-pop { position: relative; width: min(340px, 100%); padding: 26px 22px 22px; border-radius: 28px; background: #17181b; border: 1px solid #2e2f34; color: #e8e8ea; text-align: center; overflow: hidden; outline: none; box-shadow: 0 24px 80px rgba(0,0,0,.6); }
.ag-egg-stage { position: relative; width: 200px; height: 200px; margin: 0 auto 10px; perspective: 700px; }
.ag-egg-beam { position: absolute; left: 50%; top: 50%; width: 520px; height: 520px; margin: -260px 0 0 -260px; border-radius: 50%; mix-blend-mode: screen;
  background: conic-gradient(from 0deg, rgba(255,150,60,0) 0deg, rgba(255,120,50,.55) 18deg, rgba(255,106,61,0) 44deg, transparent 180deg, rgba(255,120,50,.55) 198deg, rgba(255,106,61,0) 224deg, transparent 360deg);
  -webkit-mask: radial-gradient(circle, #000 18%, transparent 68%); mask: radial-gradient(circle, #000 18%, transparent 68%); animation: ag-egg-z 2.4s linear infinite; }
.ag-egg-glow { position: absolute; left: 50%; top: 46%; width: 90px; height: 90px; margin: -45px 0 0 -45px; border-radius: 50%; background: radial-gradient(circle, rgba(255,200,120,.95), rgba(255,106,61,.5) 45%, transparent 70%); animation: ag-egg-pulse 1.2s ease-in-out infinite; }
.ag-egg-logo { position: absolute; inset: 0; transform-style: preserve-3d; animation: ag-egg-y 4s linear infinite; }
.ag-egg-logo svg { width: 100%; height: 100%; overflow: visible; filter: drop-shadow(0 0 14px rgba(255,106,61,.55)); }
.ag-egg-pop h2 { margin: 6px 0 2px; font-size: 26px; font-weight: 600; }
.ag-egg-v { color: #ffb45e; font-weight: 700; font-size: 18px; }
.ag-egg-x { display: inline-block; margin-top: 18px; padding: 10px 26px; border-radius: 999px; background: #26272b; color: #e8e8ea; }
.ag-egg.full { padding: 0; }
.ag-egg.full .ag-egg-scrim { background: #0e0f11; }
.ag-egg.full .ag-egg-pop { width: 100%; height: 100%; border: 0; border-radius: 0; box-shadow: none; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: env(safe-area-inset-top, 0px) 22px env(safe-area-inset-bottom, 0px); }
.ag-egg.full .ag-egg-stage { width: min(280px, 72vw); height: min(280px, 72vw); margin-bottom: 18px; }
.ag-egg.full .ag-egg-pop h2 { font-size: 30px; }
.ag-egg.full .ag-egg-v { font-size: 20px; }
.ag-egg.full .ag-egg-x { margin-top: 34px; }
@keyframes ag-egg-y { to { transform: rotateY(360deg); } }
@keyframes ag-egg-z { to { transform: rotate(360deg); } }
@keyframes ag-egg-pulse { 50% { transform: scale(1.35); opacity: .7; } }
.ag-logo { flex: none; width: 40px; height: 40px; border-radius: 11px; object-fit: cover; }
/* Blatt (Handy): X rechts oben im Kopf, der Kopf lässt Platz dafür */
dialog.ag-sheetdlg .ag-dlg-x { top: 8px; right: 10px; width: 38px; height: 38px; }
dialog.ag-sheetdlg .ag-side-head { padding-right: 58px; }
/* Im Blatt hat der Dialog schon sein X oben rechts: das X der Kopfzeile (für das Seitenblatt am Computer) entfällt. Die Leiste "Fertig" liegt ohne den Randausgleich der anderen Dialoge bündig (sonst wird das Blatt 22 px zu breit) */
dialog.ag-sheetdlg .ag-side-head [data-sen="close-detail"] { display: none; }
dialog.ag-sheetdlg > .ag-dlg-btns { margin: 0; bottom: 0; }
.ag-origin { display: block; margin-top: 2px; color: var(--ag-text2); font-size: 12px; }
.ag-origin.own { color: var(--ag-primary); }
/* Kapitel im Dialog: kleinerer Titel, Karte mit Innenabstand */
.ag-chap-s { margin-top: 18px; }
.ag-chap-s:first-of-type { margin-top: 6px; }
.ag-sec-t { display: flex; align-items: center; gap: 10px; margin: 0 4px 8px; font-size: 15px; font-weight: 600; }
.ag-sec-t::before { content: ""; flex: none; width: 4px; height: 16px; border-radius: 2px; background: var(--ag-primary); }
.ag-efcard { padding: 14px 18px; box-shadow: none; }
.ag-efcard > .ag-ef:first-child { margin-top: 0; }
.ag-efcard > .ag-ef:last-child { margin-bottom: 0; }
.ag-efcard > .ag-ef-row + .ag-ef-row { margin-top: 12px; }
.ag-subh { margin: 14px 4px 8px; color: var(--ag-text2); font-size: 12px; font-weight: 500; letter-spacing: .05em; text-transform: uppercase; }
/* Handy: Tippfläche mindestens 44 px; die Leisten füllen die Breite; ab fünf Reitern vier Spalten in Zeilen (schmale Handys drei); Reiter mit Symbol: Symbol über dem Text */
:host([narrow]) .ag-seg { display: grid; width: 100%; box-sizing: border-box; }
:host([narrow]) .ag-seg > button { min-height: 44px; padding: 0 4px; }
:host([narrow]) .ag-dlg-body > select.ag-input { height: 50px; min-height: 50px; }
:host([narrow]) .ag-tabs > button { flex-direction: column; gap: 2px; font-size: 12px; min-height: 52px; }
#ag-view .ag-seg.small:has(> button:nth-child(4)):not(:has(> button:nth-child(5))),
:host([narrow]) .ag-seg.small:not(.ag-subs):has(> button:nth-child(4)):not(:has(> button:nth-child(5))) { display: grid; grid-auto-flow: row; grid-template-columns: repeat(2, minmax(0, 1fr)); }
:host([narrow]) .ag-seg:has(> button:nth-child(5)) { grid-auto-flow: row; grid-template-columns: repeat(4, minmax(0, 1fr)); }
@media (max-width: 389px) { :host([narrow]) .ag-seg:has(> button:nth-child(5)) { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
/* Name der Anlage oben in der Konfiguration: gross und fett, Stift, Sprung nach HA */
.ag-headsys { display: flex; align-items: center; gap: 8px; flex: 1 1 calc(100% - 60px); min-width: 0; }
.ag-head-cfg > .ag-tabs, .ag-head-cfg > .ag-seg { margin-right: auto; }
.ag-btn-ic { width: 40px; padding: 0; justify-content: center; flex: none; }
.ag-systitle { margin: 0; font-size: 28px; line-height: 1.2; font-weight: 700; letter-spacing: -.3px; overflow-wrap: anywhere; }
:host([narrow]) .ag-systitle { font-size: 22px; }
:host([narrow]) select.ag-select[data-act="system"] { font-size: 20px; height: 44px; min-width: 0; flex: 1 1 auto; max-width: 100%; }
.ag-rename-ids { border-bottom: 0; margin-top: 14px; display: flex; align-items: center; gap: 12px; cursor: pointer; }
/* Sensoren auf dem Handy: dieselbe Tabelle mit Kästchen, kompakt */
:host([narrow]) .ag-table th { padding: 8px 4px; font-size: 11px; }
:host([narrow]) .ag-table th:first-child { padding-left: 12px; }
:host([narrow]) .ag-table td { padding: 6px 4px; }
:host([narrow]) .ag-table td:first-child { padding-left: 12px; }
:host([narrow]) .ag-table th.z, :host([narrow]) .ag-table td.z { width: 46px; min-width: 0; }
:host([narrow]) .ag-table th.z > span { display: grid; place-items: center; }
:host([narrow]) .ag-table .ag-allbtn { display: block; margin: 2px auto 0; font-size: 10px; padding: 2px 0; }
:host([narrow]) .ag-table .ag-nm { min-width: 0; }
:host([narrow]) .ag-table .ag-nm > div { min-width: 0; overflow-wrap: anywhere; font-size: 13.5px; line-height: 1.25; }
:host([narrow]) .ag-table .ag-nm small { display: block; font-size: 11px; line-height: 1.3; }
:host([narrow]) .ag-table td.ag-acts { padding-right: 8px; }
:host([narrow]) .ag-table tr.grp td { padding: 6px 12px; }
.ag-bkname { display: block; font-weight: 500; }
.ag-bkdate { display: block; font-size: 12px; }
/* Protokoll: die Filter-Pillen der Ereignisse gleiten unter den festen Zeitraum und bleiben dort stehen */
.ag-evchips { position: sticky; top: var(--ag-th-top, 0px); z-index: 14; background: var(--ag-bg); padding: 8px 0; margin-bottom: 4px !important; }
.ag-log-tools { padding-bottom: 8px; }
/* Übersicht auf dem Handy: Suche (mit "Ansicht"), Filter-Pillen in einer Zeile zum Wischen, Auswahlfelder in einer Zeile; alles bleibt oben stehen */
:host([narrow]) .ag-ov-tools .ag-list-head { display: none; }
:host([narrow]) .ag-ov-tools .ag-tools { gap: 8px; padding: 8px 0; }
:host([narrow]) .ag-ov-tools .list-search { flex: 1 1 0; min-width: 0; order: 1; }
:host([narrow]) .ag-ov-tools [data-list="view"] { order: 2; font-size: 0; gap: 0; width: 44px; padding: 0; justify-content: center; flex: none; }
:host([narrow]) .ag-ov-tools .ag-lchips { order: 3; flex: 1 1 100%; flex-wrap: nowrap; overflow-x: auto; gap: 8px; scrollbar-width: none; }
:host([narrow]) .ag-ov-tools .ag-lchips::-webkit-scrollbar { display: none; }
:host([narrow]) .ag-ov-tools .ag-lchips .ag-chip { flex: none; }
:host([narrow]) .ag-ov-tools .ag-grow { display: none; }
:host([narrow]) .ag-ov-tools select.ag-select { order: 4; flex: 1 1 0; min-width: 0; }
/* ----- Sensoransicht (1.9.0): Desktop Fenster in der Breite der Voreinstellungen, Handy ganzer Bildschirm. Oben fest, nur die Liste scrollt ----- */
dialog.ag-svdlg[open] { height: min(92vh, 860px); }
.ag-sv { display: flex; flex-direction: column; flex: 1; min-height: 0; }
.ag-sv-fix { flex: none; padding: 20px 24px 0; user-select: none; -webkit-user-select: none; }
.ag-sv-head { display: flex; align-items: center; gap: 12px; min-height: 44px; padding-right: 54px; }
.ag-sv-head .ag-av { width: 44px; height: 44px; border-radius: 13px; flex: none; }
.ag-sv-ttl { min-width: 0; flex: 1; }
.ag-sv-ttl b { display: block; font-size: 19px; font-weight: 600; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ag-sv-ttl small { color: var(--ag-text2); font-size: 13px; }
.ag-sv-pill { height: 26px; padding: 0 11px; border-radius: 999px; display: inline-flex; align-items: center; font-size: 12.5px; font-weight: 500; white-space: nowrap; background: var(--ag-success-soft); color: var(--ag-success); flex: none; }
.ag-sv-pill.act { background: var(--ag-warning-soft); color: var(--ag-warning-text); }
.ag-sv-pill.off { background: var(--ag-subtle); color: var(--ag-text2); }
.ag-sv-ha { flex: none; }
/* Kacheln als Reiter: jede zeigt ihren aktuellen Wert, die gewählte bestimmt Grafik, Kennzahlen und Liste */
.ag-sv-tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 16px; }
.ag-sv-tiles.n3 { grid-template-columns: repeat(3, 1fr); }
.ag-sv-tiles.n2 { grid-template-columns: repeat(2, 1fr); }
.ag-sv-tile { border: 1px solid var(--ag-divider); border-radius: 14px; padding: 10px 12px; display: flex; align-items: center; gap: 10px; min-width: 0; min-height: 52px; background: var(--ag-card); color: var(--ag-text); font: inherit; text-align: left; cursor: pointer; }
.ag-sv-tile.on { border-color: var(--ag-primary); background: var(--ag-primary-soft); box-shadow: inset 0 0 0 1px var(--ag-primary); }
.ag-sv-ti { color: var(--ag-text2); display: grid; flex: none; }
.ag-sv-tile.on .ag-sv-ti { color: var(--ag-primary); }
.ag-sv-tx { min-width: 0; }
.ag-sv-tx small { display: block; font-size: 12px; color: var(--ag-text2); line-height: 1.2; }
.ag-sv-tx b { display: block; font-size: 14.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ag-sv-seg { display: inline-grid; grid-auto-flow: column; gap: 2px; padding: 3px; margin-top: 14px; border-radius: 13px; background: color-mix(in srgb, var(--ag-text) 6%, transparent); }
.ag-sv-seg button { min-height: 34px; padding: 0 18px; border: 0; border-radius: 10px; background: transparent; color: var(--ag-text2); font: inherit; font-size: 13.5px; white-space: nowrap; cursor: pointer; }
.ag-sv-seg button.on { background: var(--ag-card); color: var(--ag-primary); font-weight: 500; box-shadow: var(--ag-shadow-s); }
.ag-sv-kpis { display: flex; gap: 22px; margin-top: 14px; overflow: hidden; }
.ag-sv-kpi b { display: block; font-size: 20px; font-weight: 600; line-height: 1.15; font-variant-numeric: tabular-nums; white-space: nowrap; }
.ag-sv-kpi span { font-size: 12.5px; color: var(--ag-text2); white-space: nowrap; }
.ag-sv-chart { margin-top: 12px; }
.ag-sv-chart svg { display: block; width: 100%; height: auto; }
.ag-sv-legend { display: flex; gap: 14px; flex-wrap: wrap; align-items: center; margin-top: 8px; font-size: 12px; color: var(--ag-text2); }
.ag-sv-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 5px; vertical-align: -1px; }
.ag-sv-scale i { margin-right: 3px; }
.sv-i-on { background: var(--ag-warning); } .sv-i-armed { background: var(--ag-primary); } .sv-i-alarm { background: var(--ag-error); } .sv-i-gone { background: var(--ag-text3); } .sv-i-count { background: var(--ag-primary); }
.ag-sv-msg { padding: 22px 24px; text-align: center; line-height: 1.6; }
.ag-sv-msg .ag-btn { margin-top: 10px; }
.ag-sv-list { flex: 1; min-height: 0; overflow: auto; overscroll-behavior: contain; margin-top: 14px; border-top: 1px solid var(--ag-divider); }
.ag-sv-table { width: 100%; border-collapse: collapse; }
.ag-sv-table th { position: sticky; top: 0; z-index: 1; text-align: left; font-size: 11.5px; font-weight: 600; color: var(--ag-text2); padding: 10px 8px; background: var(--ag-subtle); }
.ag-sv-table th:first-child, .ag-sv-table td:first-child { padding-left: 24px; }
.ag-sv-table th:last-child, .ag-sv-table td:last-child { padding-right: 24px; }
.ag-sv-table td { padding: 10px 8px; border-bottom: 1px solid var(--ag-divider); font-variant-numeric: tabular-nums; vertical-align: middle; }
.ag-sv-table tr.day td { color: var(--ag-text2); font-size: 12.5px; font-weight: 500; padding-top: 14px; padding-bottom: 6px; border-bottom: 0; }
.ag-sv-table .c1 { width: 110px; } .ag-sv-table .c1w { width: 190px; } .ag-sv-table .c3 { width: 170px; } .ag-sv-table .c4 { width: 200px; } .ag-sv-table .r { text-align: right; }
.ag-sv-ev { display: inline-flex; align-items: center; gap: 8px; }
.ag-sv-ev small { display: block; color: var(--ag-text2); font-size: 12px; }
.ag-sv-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--ag-warning); flex: none; }
.ag-sv-dot.gone { background: var(--ag-text3); } .ag-sv-dot.alarm { background: var(--ag-error); }
.ag-sv-tag { display: inline-flex; align-items: center; gap: 5px; height: 22px; padding: 0 9px; border-radius: 999px; border: 0; font: inherit; font-size: 12px; background: var(--ag-subtle); color: var(--ag-text2); white-space: nowrap; }
.ag-sv-tag.arm { background: var(--ag-primary-soft); color: var(--ag-primary); }
.ag-sv-tag.ok { background: var(--ag-success-soft); color: var(--ag-success); }
button.ag-sv-tag.alarm { background: var(--ag-error-soft); color: var(--ag-error); font-weight: 500; cursor: pointer; margin-left: 8px; min-height: 26px; }
.ag-sv-note { margin: 12px 24px 16px; font-size: 12.5px; color: var(--ag-text2); }
.sv-tx { font-size: 11px; fill: var(--ag-text2); font-family: inherit; } .sv-tx.now { fill: var(--ag-text); } .sv-tx.ok { fill: var(--ag-success); } .sv-tx.warn { fill: var(--ag-warning-text); } .sv-tx.err { fill: var(--ag-error); }
.sv-track { fill: var(--ag-subtle); } .sv-on { fill: var(--ag-warning); } .sv-alarm { fill: var(--ag-error); } .sv-gone { fill: var(--ag-text3); }
.sv-armed { fill: var(--ag-primary); } .sv-armed.soft { opacity: .2; }
.sv-count { fill: var(--ag-primary); } .sv-grid { stroke: var(--ag-divider); } .sv-tick { stroke: var(--ag-text3); } .sv-tick.dash { stroke-dasharray: 2 3; }
.sv-line { fill: none; stroke: var(--ag-primary); stroke-width: 2.2; stroke-linejoin: round; stroke-linecap: round; } .sv-line.dash { stroke-dasharray: 5 5; opacity: .7; }
.sv-area { fill: var(--ag-primary); opacity: .1; } .sv-thr { stroke: var(--ag-error); stroke-dasharray: 4 4; } .sv-mark { stroke: var(--ag-success); stroke-dasharray: 3 3; }
.sv-dot { fill: var(--ag-card); stroke: var(--ag-primary); stroke-width: 2.4; }
.sv-zone { opacity: .1; } .sv-zone.ok { fill: var(--ag-success); } .sv-zone.warn { fill: var(--ag-warning); } .sv-zone.err { fill: var(--ag-error); }
.ag-sv-device { padding: 6px 24px 24px; display: flex; flex-direction: column; gap: 8px; }
.ag-sv-dcard { padding: 4px 16px; }
.ag-sv-drow { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 10px 0; border-bottom: 1px solid var(--ag-divider); }
.ag-sv-drow:last-child { border-bottom: 0; }
.ag-sv-drow b { font-weight: 500; text-align: right; overflow-wrap: anywhere; }
.ag-sv-chips { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
.ag-sv-config { align-self: flex-start; margin-top: 8px; }
/* Handy: ganzer Bildschirm, X oben rechts; Zustand und "In HA öffnen" in einer zweiten Zeile des Kopfs */
:host([narrow]) dialog.ag-dlg.ag-svdlg { padding-bottom: env(safe-area-inset-bottom, 0px); }
:host([narrow]) .ag-sv-list { overscroll-behavior: none; }
:host([narrow]) .ag-sv-fix { padding: 12px 16px 0; }
:host([narrow]) .ag-sv-head { display: grid; grid-template-columns: 44px 1fr auto; column-gap: 12px; row-gap: 10px; padding-right: 0; }
:host([narrow]) .ag-sv-ttl { grid-column: 2 / 4; padding-right: 52px; }
:host([narrow]) .ag-sv-ttl b { font-size: 18px; }
:host([narrow]) .ag-sv-pill { grid-column: 1 / 3; justify-self: start; }
:host([narrow]) .ag-sv-ha { grid-column: 3; min-height: 44px; }
:host([narrow]) .ag-sv-tiles, :host([narrow]) .ag-sv-tiles.n3, :host([narrow]) .ag-sv-tiles.n2 { display: flex; gap: 8px; margin: 12px -16px 0; padding: 0 16px; overflow-x: auto; scrollbar-width: none; }
:host([narrow]) .ag-sv-tiles::-webkit-scrollbar { display: none; }
:host([narrow]) .ag-sv-tile { flex: 1 0 auto; min-width: 104px; max-width: 170px; padding: 8px 10px; }
:host([narrow]) .ag-sv-ti { display: none; }
:host([narrow]) .ag-sv-tx b { font-size: 13.5px; }
:host([narrow]) .ag-sv-seg { display: grid; grid-auto-columns: 1fr; }
:host([narrow]) .ag-sv-seg button { min-height: 40px; padding: 0 4px; }
:host([narrow]) .ag-sv-kpis { gap: 18px; margin-top: 12px; }
:host([narrow]) .ag-sv-kpi b { font-size: 17px; }
:host([narrow]) .ag-sv-table th:first-child, :host([narrow]) .ag-sv-table td:first-child { padding-left: 16px; }
:host([narrow]) .ag-sv-table th:last-child, :host([narrow]) .ag-sv-table td:last-child { padding-right: 16px; }
:host([narrow]) .ag-sv-table td { padding: 9px 6px; }
:host([narrow]) button.ag-sv-tag.alarm { margin: 4px 0 0; display: flex; width: max-content; }
:host([narrow]) .ag-sv-note { margin: 12px 16px 16px; }
:host([narrow]) .ag-sv-device { padding: 6px 16px 24px; }
/* Ansicht: Schalter für die Namen der Sensoren (gilt für alle Geräte und die Meldungen, darum mit eigenem Hinweis darunter) */
.ag-namesrow { align-items: center; gap: 12px; }
.ag-namesrow .ag-settx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ag-namesrow .ag-settx b { font-weight: 500; }
.ag-namesrow .ag-settx small { color: var(--ag-text2); font-size: 12.5px; overflow-wrap: anywhere; }
.ag-namesnote { margin-top: 6px; }
/* Protokoll (1.13.0): zwei Reiter "Alarme" und "Alle Ereignisse" unter Zeitraum und Anlage (fest wie diese), je eine Liste */
.ag-log-fields { display: flex; flex-direction: column; gap: 10px; }
.ag-log-pane[hidden] { display: none; }
.ag-log-hint { margin: 2px 2px 12px; }
.ag-log-more { display: flex; margin: 12px auto 4px; }
/* Löschen eines Alarms: unten in der geöffneten Karte, rechts, in der Farbe einer Aktion, die nicht zurückzunehmen ist */
.ag-inc-foot { display: flex; justify-content: flex-end; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--ag-divider); }
.ag-inc-del { color: var(--ag-error); border-color: color-mix(in srgb, var(--ag-error) 45%, var(--ag-divider)); }
.ag-inc-del:hover { background: var(--ag-error-soft); }
/* Hauptreiter am Computer: das Symbol links vom Text, etwas kleiner als auf dem Handy (dort steht es über dem Text) */
:host(:not([narrow])) .ag-tabs > button > svg { width: 18px; height: 18px; flex: none; }
:host(:not([narrow])) .ag-tabs > button { gap: 7px; }
/* Ladeanzeige in Sensoransicht und Protokoll (1.13.2): dieselbe wie im ganzen Panel (.ag-ld), mitten in der Grafik und etwas kleiner.
   Mit alten Daten bleiben Kennzahlen, Grafik und Liste gedimmt stehen; beim ersten Laden steht sie in einer leeren Fläche. */
.ag-sv-chart { position: relative; }
.ag-sv-chart > .ag-ld, .ag-log-wait > .ag-ld { top: 50%; transform: scale(.78); }
.ag-sv-wait { min-height: 200px; }
:host([narrow]) .ag-sv-wait { min-height: 170px; }
.ag-sv[data-busy] .ag-sv-kpis, .ag-sv[data-busy] .ag-sv-chart > :not(.ag-ld), .ag-sv[data-busy] .ag-sv-legend, .ag-sv[data-busy] .ag-sv-list > * { opacity: .28; pointer-events: none; }
.ag-log-wait { position: relative; min-height: 240px; }
/* Zweite Zeile der Reiter (Konfiguration, Protokoll; 1.13.3): Symbol links vom Text, auf jedem Gerät. Auf dem Handy richten sich die
   Breiten nach dem Inhalt statt gleich breit zu sein: so haben vier Reiter mit Symbol auch auf schmalen Handys Platz. */
.ag-subs > button > svg { width: 16px; height: 16px; flex: none; }
:host([narrow]) .ag-subs { grid-auto-columns: auto; }
:host([narrow]) .ag-subs > button { gap: 3px; padding: 0 4px; font-size: 13px; }
:host([narrow]) .ag-subs > button > svg { width: 15px; height: 15px; }
/* Feste Punkte des Ablaufs (1.14.0): "Anlage scharf geschaltet", "Alarm beginnt", "Alarm endet (quittiert)". Grösser und kräftiger als
   bisher, damit die drei Abschnitte auf einen Blick zu erkennen sind. Scharf ist rot (weich), der Alarm rot (voll), das Ende grün. */
.ag-wf-start { gap: 12px; padding: 6px 20px 0 calc(var(--wf-x) - 18px); font-size: 16px; font-weight: 600; }
.ag-wf-start .ag-mini { width: 36px; height: 36px; border-radius: 11px; }
.ag-wf-start .ag-mini.alarm { background: var(--ag-error); color: #fff; }
.ag-wf-start .ag-mini.arm { background-image: linear-gradient(var(--ag-error-soft), var(--ag-error-soft)); color: var(--ag-error); }
.ag-wf-armed { max-width: 820px; margin-bottom: 10px; }
/* Schrift (1.14.0): Die Grösse folgt nie mehr der Automatik des Browsers. Auf dem iPhone vergrösserte sie einzelne Textblöcke, sobald
   die Seite länger wurde (aufgeklappter Alarm): derselbe Hinweis war einmal klein, einmal gross. */
:host { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
/* Handy: Beschreibungen und Hinweise durchgängig in einer gut lesbaren Grösse (Vorgabe des Nutzers: die kleine war zu klein) */
:host([narrow]) .ag-small, :host([narrow]) .ag-hint, :host([narrow]) .ag-settx small, :host([narrow]) .ag-otx small, :host([narrow]) .ag-pmbanner small,
:host([narrow]) .ag-pmnote, :host([narrow]) .ag-kind small, :host([narrow]) .ag-sys-sub, :host([narrow]) .ag-nm small, :host([narrow]) .ag-coderow small,
:host([narrow]) #ag-codes .ag-fld small, :host([narrow]) .ag-mt-opt small, :host([narrow]) .ag-pv-note, :host([narrow]) .ag-wf-text small,
:host([narrow]) .ag-inc-text small, :host([narrow]) .ag-sv-ttl small, :host([narrow]) .ag-erow small, :host([narrow]) .ag-combo-item small,
:host([narrow]) .ag-dlg-body > p, :host([narrow]) .ag-lfacts { font-size: 14.5px; line-height: 1.35; }
`;

