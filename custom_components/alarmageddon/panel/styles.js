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
.ag-rows { display: flex; flex-direction: column; border-top: 1px solid var(--ag-divider); }
.ag-row { display: flex; align-items: center; gap: 10px; padding: 10px 2px; border-bottom: 1px solid var(--ag-divider); font-size: 13.5px; min-width: 0; }
.ag-row:last-child { border-bottom: 0; }
.ag-row .ag-grow { min-width: 0; overflow-wrap: anywhere; }
.ag-mini { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; flex: none; background: var(--ag-subtle); color: var(--ag-text2); }
.ag-mini.warn { background: var(--ag-warning-soft); color: var(--ag-warning-text); }
.ag-mini.ok { background: var(--ag-success-soft); color: var(--ag-success); }
.ag-mini.err { background: var(--ag-error-soft); color: var(--ag-error); }
.ag-alarm { border-radius: 18px; padding: 16px 18px; background: var(--ag-error); color: #fff; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.ag-alarm b { font-size: 18px; font-weight: 500; }
.ag-alarm .ag-btn { background: #fff; color: var(--ag-error); border-color: #fff; margin-left: auto; min-height: 44px; font-size: 15px; }
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
.ag-table tr.changed td:first-child { box-shadow: inset 3px 0 0 var(--ag-primary); }
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

/* Dialoge (Code, Rückfrage): auf dem Handy als Blatt von unten */
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
:host([narrow]) .ag-alarm .ag-btn { margin-left: 0; width: 100%; }
:host([narrow]) .list-search { flex: 1 1 100%; min-width: 0; }
:host([narrow]) .ag-foot { margin: auto -12px calc(-24px - env(safe-area-inset-bottom, 0px)); padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0px)); bottom: calc(-24px - env(safe-area-inset-bottom, 0px)); }
:host([narrow]) dialog.ag-dlg { margin: auto 0 0; width: 100vw; max-width: 100vw; border-radius: 22px 22px 0 0; padding-bottom: env(safe-area-inset-bottom, 0px); }

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
.ag-lrow.bad td:first-child { box-shadow: inset 4px 0 0 var(--ag-error); }
.ag-lmeta { display: flex; gap: 14px; flex-wrap: wrap; align-items: center; font-size: 13px; }
.ag-colist { display: flex; flex-direction: column; border: 1px solid var(--ag-divider); border-radius: 14px; padding: 2px 12px; }
.ag-colrow { display: flex; align-items: center; gap: 4px; padding: 5px 0; border-bottom: 1px solid var(--ag-divider); }
.ag-colrow > span { flex: 1; min-width: 0; }
.ag-colrow .ag-iconbtn { width: 34px; height: 34px; }
.ag-iconbtn:disabled { opacity: .3; cursor: default; }
.ag-colrow:last-child { border-bottom: 0; }
.ag-colrow .ag-toggle { margin: 0; }
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
.ag-sen-layout.open { grid-template-columns: minmax(0, 1180px) 420px; }
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
.ag-pmstick { margin: var(--ag-gap, 18px) 0; }
.ag-pmstick > .ag-pmbar { margin: 0; }
/* Fest stehende Leisten auf dem Handy kompakt: ohne Erklärtext, sonst bleibt zu wenig Platz für die Liste */
:host([narrow]) .ag-stk .ag-pmbar small, :host([narrow]) .ag-stk .ag-pmbar .ag-pmscope { display: none; }
:host([narrow]) .ag-stk .ag-pmbar { gap: 10px; padding: 10px 14px; }
.ag-pmgroup { margin-top: 6px; padding: 16px 18px 18px; border: 1.5px solid var(--ag-divider); border-radius: 20px; background: color-mix(in srgb, var(--ag-text) 2%, var(--ag-card)); }
.ag-pmgroup.on { border: 2px solid color-mix(in srgb, var(--ag-primary) 45%, transparent); background: color-mix(in srgb, var(--ag-primary) 4%, var(--ag-card)); }
.ag-pmgroup > .ag-pmbar { margin: 0 0 14px; padding: 0; border: 0; background: none; }
.ag-pmbanner { display: flex; align-items: center; gap: 12px; margin: 4px 0 12px; padding: 12px 14px; border: 2px solid var(--ag-primary); border-radius: 14px; background: var(--ag-primary-soft); color: var(--ag-primary); }
.ag-pmbanner small { display: block; font-size: 12px; font-weight: 500; opacity: .85; }
.ag-pmbanner b { display: block; font-size: 18px; font-weight: 600; line-height: 1.25; }
.ag-pmscope { display: flex; align-items: center; gap: 8px; margin: 0 0 14px; color: var(--ag-primary); font-weight: 500; font-size: 13.5px; }
.ag-pmgroup .ag-subh:first-of-type { margin-top: 4px; }
.ag-box.own { position: relative; }
.ag-box.own::after { content: ""; position: absolute; top: -3px; right: -3px; width: 9px; height: 9px; border-radius: 50%; background: var(--ag-warning); border: 2px solid var(--ag-card); }
th.cur, td.cur { background: color-mix(in srgb, var(--ag-primary) 9%, transparent); }
th.cur { box-shadow: inset 0 3px 0 var(--ag-primary); }
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
:host([narrow]) dialog.ag-sheetdlg { max-height: 88vh; overflow: auto; }
:host([narrow]) .ag-list-head { margin-top: 2px; }

/* 0.4.0: Aktionen als Ablauf, Benachrichtigungen */

.ag-wf-line { position: relative; display: flex; flex-direction: column; align-items: stretch; max-width: 820px; }
.ag-wf-line::before { content: ""; position: absolute; left: 33px; top: 20px; bottom: 20px; width: 2px; background: var(--ag-divider); z-index: 0; }
.ag-wf-start .ag-mini { background-color: var(--ag-bg); }
.ag-wf-start .ag-mini.err { background-image: linear-gradient(var(--ag-error-soft), var(--ag-error-soft)); }
.ag-wf-start .ag-mini.ok { background-image: linear-gradient(var(--ag-success-soft), var(--ag-success-soft)); }
.ag-wf-start { display: flex; align-items: center; gap: 10px; padding: 6px 20px; font-weight: 500; position: relative; z-index: 1; }
.ag-wf-plus { display: flex; padding: 18px 0 6px 20px; position: relative; z-index: 1; }
.ag-wf-add { width: 28px; height: 28px; border-radius: 50%; border: 1.5px dashed var(--ag-primary); background: var(--ag-card); color: var(--ag-primary); display: grid; place-items: center; cursor: pointer; padding: 0; position: relative; z-index: 2; }
.ag-wf-add:hover { background: var(--ag-primary-soft); }
.ag-flow { display: inline-flex; align-items: center; gap: 6px; margin-top: 8px; height: 28px; padding: 0 10px; border-radius: 999px; border: 1px solid var(--ag-divider); background: transparent; color: var(--ag-text2); font: inherit; font-size: 12px; cursor: pointer; }
.ag-flow.par { border-color: transparent; background: var(--ag-primary-soft); color: var(--ag-primary); }
.ag-flow:hover { border-color: var(--ag-primary); }
.ag-wf-plus.par::before { content: ""; position: absolute; left: 33px; top: -14px; height: 32px; width: 0; border-left: 2px dashed var(--ag-primary); z-index: 0; }
.ag-wf-step { display: flex; align-items: center; gap: 12px; padding: 12px 14px; position: relative; z-index: 1; }
.ag-wf-icon { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; flex: none; background: var(--ag-primary-soft); color: var(--ag-primary); }
.ag-wf-icon.k-notify, .ag-wf-icon.k-sound { background: var(--ag-error-soft); color: var(--ag-error); }
.ag-wf-icon.k-wait { background: var(--ag-subtle); color: var(--ag-text2); }
.ag-wf-icon.k-open, .ag-wf-icon.k-close, .ag-wf-icon.k-end { background: var(--ag-success-soft); color: var(--ag-success); }
.ag-wf-text { flex: 1; min-width: 0; }
.ag-wf-text b { font-weight: 500; }
.ag-wf-text .ag-small { overflow-wrap: anywhere; }
.ag-wf-btns { display: flex; gap: 2px; flex: none; }
.ag-wf-btns .ag-iconbtn { width: 36px; height: 36px; }
.ag-wf-btns .ag-iconbtn:disabled { opacity: .3; cursor: default; }
.ag-wf-empty { margin-left: 20px; }
/* Ende des Ablaufs: die Linie des Ablaufs endet an der Marke "Alarm endet" und läuft nie durch die Karten */
.ag-wf-main::before { bottom: 0; }
.ag-wf-end { position: relative; max-width: 820px; }
.ag-wf-end::before { content: ""; position: absolute; left: 33px; top: 0; height: 20px; width: 2px; background: var(--ag-divider); }
.ag-wf-end { margin-top: 8px; }
.ag-wf-end .ag-wf-start { padding-top: 6px; }
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
.ag-dragging, .ag-dragging * { cursor: grabbing !important; user-select: none; -webkit-user-select: none; }
.ag-ef { display: flex; flex-direction: column; gap: 6px; margin: 14px 0; }
.ag-ef-l { font-weight: 500; }
.ag-ef-h { color: var(--ag-text2); font-size: 12.5px; line-height: 1.35; }
.ag-ef-row { display: flex; flex-direction: row; align-items: center; gap: 12px; }
.ag-ef-row .ag-settx { min-width: 0; }
.ag-ef-row .ag-toggle { margin: 0; }
.ag-ef-range label { display: flex; justify-content: space-between; gap: 10px; font-size: 13px; color: var(--ag-text2); }
.ag-ef-range { max-width: 50%; min-width: 260px; }
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
:host([narrow]) .ag-log-tools .ag-date { flex: 1 1 140px; min-width: 0; }
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
.ag-seq::before { content: ""; position: absolute; left: 15px; top: 14px; bottom: 14px; width: 2px; background: var(--ag-divider); }
.ag-seq-item { display: flex; align-items: center; gap: 12px; padding: 7px 0; position: relative; }
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
.ag-ld { position: absolute; left: 50%; top: 40%; width: 72px; height: 72px; margin: -36px 0 0 -36px; pointer-events: none; z-index: 20; }
.ag-ld s { position: absolute; width: 14px; height: 14px; border-radius: 50%; background: var(--ld, var(--ag-primary)); box-shadow: 0 0 12px color-mix(in srgb, var(--ld, var(--ag-primary)) 55%, transparent); }
.ag-ld s:nth-child(1) { left: 55px; top: 29px; }
.ag-ld s:nth-child(2) { left: 17px; top: 51px; }
.ag-ld s:nth-child(3) { left: 17px; top: 7px; }
@media (prefers-reduced-motion: reduce) { .ag-ld s { animation: ag-ld-pulse 1.4s ease-in-out infinite; } @keyframes ag-ld-pulse { 50% { opacity: .35; } } }
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
:host([narrow]) .ag-wf-btns .ag-iconbtn { width: 32px; height: 32px; }
:host([narrow]) .ag-wf-step { flex-wrap: wrap; }
:host([narrow]) .ag-wf-btns { width: 100%; justify-content: flex-end; }
:host([narrow]) .ag-wf-endcard .ag-wf-btns { width: auto; }
:host([narrow]) .ag-wf-line::before { left: 29px; }
:host([narrow]) .ag-wf-start, :host([narrow]) .ag-wf-plus { padding-left: 16px; }

/* 0.5.0: Codes pro Person, Sicherung, Prognose */
.ag-fc { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.ag-fc.warn { color: var(--ag-warning-text); }
.ag-codes { margin-top: 16px; }
.ag-coderow { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-top: 1px solid var(--ag-divider); }
.ag-coderow small { display: block; font-size: 12.5px; }
.ag-schrow { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 10px 0; border-top: 1px solid var(--ag-divider); }
.ag-schrow.dim > :not(.ag-toggle):not(.ag-iconbtn) { opacity: .55; }
.ag-schrow .ag-time { width: 140px; }
.ag-schrow .ag-toggle { margin: 0 0 0 auto; }
.ag-schrow select.ag-input { min-width: 150px; }
.ag-days { display: flex; gap: 4px; flex-wrap: wrap; }
.ag-day { width: 36px; height: 36px; border-radius: 999px; border: 1px solid var(--ag-divider); background: var(--ag-card); color: var(--ag-text2); font: inherit; font-size: 13px; cursor: pointer; padding: 0; }
.ag-day.on { background: var(--ag-primary); border-color: var(--ag-primary); color: #fff; font-weight: 500; }
.ag-day:focus-visible { outline: 2px solid var(--ag-primary); outline-offset: 2px; }
.ag-schwarn { flex-basis: 100%; }
:host([narrow]) .ag-schrow .ag-time, :host([narrow]) .ag-schrow select.ag-input { flex: 1 1 120px; min-width: 0; }
:host([narrow]) .ag-schrow .ag-days { flex-basis: 100%; }
.ag-btnrow { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
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
.ag-mt-head { display: flex; align-items: center; gap: 12px; }
.ag-mt-head .ag-settx { flex: 1 1 auto; min-width: 0; }
.ag-mt.off .ag-settx { opacity: .6; }
.ag-mt-body { display: flex; flex-direction: column; gap: 4px; margin: 10px 0 2px 40px; padding: 4px 12px; border-radius: 12px; background: var(--ag-subtle); }
.ag-mt-opt { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 40px; padding: 6px 0; }
.ag-mt-opt > span:first-child { flex: 1 1 auto; min-width: 0; }
.ag-mt-opt small { display: block; margin-top: 1px; color: var(--ag-text2); font-size: 12px; line-height: 1.35; }
.ag-mt-opt.vol { flex-wrap: wrap; }
.ag-mt-opt.vol .ag-range { flex: 1 1 200px; max-width: 320px; }
:host([narrow]) .ag-mt-body { margin-left: 0; }
:host([narrow]) .ag-mt-opt { flex-wrap: wrap; row-gap: 8px; }
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
  background-image: linear-gradient(45deg, transparent 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, transparent 50%);
  background-position: calc(100% - 22px) 50%, calc(100% - 16px) 50%; background-size: 6px 6px, 6px 6px; background-repeat: no-repeat; }
select.ag-select:focus-visible, select.ag-input:focus-visible { outline: 2px solid var(--ag-primary); outline-offset: 1px; }
/* Auswahl der Alarmanlage in der Konfiguration: auffällig, damit klar ist, dass sie für alle Reiter gilt */
select.ag-select[data-act="system"] { height: 52px; padding-left: 22px; font-size: 24px; letter-spacing: -.2px; border: 2px solid var(--ag-primary); background-color: var(--ag-primary-soft); color: var(--ag-primary); font-weight: 600; }
.ag-content { scroll-padding: calc(var(--ag-th-top, 0px) + 56px) 0 80px; }
:host([narrow]) .ag-table-wrap.ag-stickwrap { overflow-x: auto; }
:host([narrow]) .ag-stickwrap .ag-table th { position: static; }
.ag-table td.ag-acts { width: 1%; white-space: nowrap; padding-right: 16px; }
/* Papierkorb und Pfeil nebeneinander auf einer Höhe, der Pfeil ganz rechts */
.ag-actrow { display: flex; align-items: center; justify-content: flex-end; gap: 10px; }
.ag-actrow > * { flex: none; margin: 0; }
.ag-clickrow { cursor: pointer; }
.ag-table tr.ag-clickrow:hover td { background: color-mix(in srgb, var(--ag-text) 4%, transparent); }
.ag-logo { flex: none; width: 40px; height: 40px; border-radius: 11px; object-fit: cover; }
/* Blatt (Handy): X rechts oben im Kopf, der Kopf lässt Platz dafür */
dialog.ag-sheetdlg .ag-dlg-x { top: 8px; right: 10px; width: 38px; height: 38px; }
dialog.ag-sheetdlg .ag-side-head { padding-right: 58px; }
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
:host([narrow]) .ag-tabs > button { flex-direction: column; gap: 2px; font-size: 12px; min-height: 52px; }
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
`;

