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
.ag-content { flex: 1; overflow: auto; overscroll-behavior: contain; padding: 20px 24px calc(32px + env(safe-area-inset-bottom, 0px)); display: flex; flex-direction: column; gap: 18px; }
.ag-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.ag-grow { flex: 1; }

/* Reiterleiste mit gleitender Kapsel (Design-Regel Auswahlknöpfe) */
.ag-seg { position: relative; display: inline-flex; padding: 4px; gap: 2px; border-radius: 14px; background: var(--ag-subtle); max-width: 100%; isolation: isolate; }
.ag-seg > button { position: relative; z-index: 1; border: 0; background: transparent; padding: 8px 16px; border-radius: 10px; color: var(--ag-text2); white-space: nowrap; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 36px; }
.ag-seg > button.on { color: var(--ag-text); font-weight: 500; }
.ag-seg > button:focus-visible { outline: 2px solid var(--ag-primary); outline-offset: 1px; }
.ag-seg > button:disabled { cursor: default; opacity: .55; }
.ag-pill { position: absolute; z-index: 0; top: 4px; bottom: 4px; left: 0; width: 0; border-radius: 10px; background: var(--ag-card); box-shadow: var(--ag-shadow-s); transition: transform .28s cubic-bezier(.3,.8,.3,1), width .28s cubic-bezier(.3,.8,.3,1); }
.ag-seg.small > button { padding: 7px 12px; font-size: 13.5px; min-height: 34px; }
@media (prefers-reduced-motion: reduce) { .ag-pill { transition: none; } }

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
.ag-sys .ag-seg > button { flex: 1; padding: 8px 6px; }
.ag-rows { display: flex; flex-direction: column; border-top: 1px solid var(--ag-divider); }
.ag-row { display: flex; align-items: center; gap: 10px; padding: 10px 2px; border-bottom: 1px solid var(--ag-divider); font-size: 13.5px; min-width: 0; }
.ag-row:last-child { border-bottom: 0; }
.ag-row .ag-grow { min-width: 0; overflow-wrap: anywhere; }
.ag-mini { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; flex: none; background: var(--ag-subtle); color: var(--ag-text2); }
.ag-mini.warn { background: var(--ag-warning-soft); color: var(--ag-warning-text); }
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
.ag-foot { position: sticky; bottom: calc(-32px - env(safe-area-inset-bottom, 0px)); margin: 0 -24px calc(-32px - env(safe-area-inset-bottom, 0px)); padding: 12px 24px calc(12px + env(safe-area-inset-bottom, 0px)); display: flex; gap: 10px; align-items: center; background: var(--ag-card); border-top: 1px solid var(--ag-divider); z-index: 3; }
.ag-foot > span:first-child { min-width: 0; font-size: 13.5px; }
.ag-foot .ag-saved { color: var(--ag-success); font-weight: 500; }
.ag-foot .ag-err, .ag-settx .ag-err { color: var(--ag-error); }
.ag-mcards { display: flex; flex-direction: column; gap: 8px; }
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
.ag-dlg-body { padding: 22px; display: flex; flex-direction: column; gap: 14px; }
.ag-dlg h3 { margin: 0; font-size: 19px; font-weight: 500; }
.ag-dlg-btns { display: flex; gap: 10px; justify-content: flex-end; }
.ag-code { height: 52px; border-radius: 14px; border: 1px solid var(--ag-divider); background: var(--ag-bg); color: var(--ag-text); font: inherit; font-size: 24px; letter-spacing: .3em; text-align: center; }
.ag-dlg-err { color: var(--ag-error); font-size: 13.5px; min-height: 18px; }
.ag-toast { position: absolute; left: 50%; transform: translateX(-50%); bottom: calc(24px + env(safe-area-inset-bottom, 0px)); width: max-content; max-width: calc(100% - 32px); background: #323232; color: #fff; padding: 12px 18px; border-radius: 12px; box-shadow: var(--ag-shadow); z-index: 10; font-size: 14px; }
.ag-root { position: relative; display: flex; flex-direction: column; height: 100%; }

/* Handy (Companion App): einspaltig, Reiter mit Symbol und kurzem Text (Entscheid des Nutzers) */
:host([narrow]) .ag-content { padding: 12px 12px calc(24px + env(safe-area-inset-bottom, 0px)); gap: 12px; }
:host([narrow]) .ag-sysgrid { grid-template-columns: 1fr; gap: 12px; }
:host([narrow]) .ag-sys { padding: 14px; gap: 12px; }
:host([narrow]) .ag-tabs { flex: 1 1 100%; }
:host([narrow]) .ag-tabs > button { flex: 1; flex-direction: column; gap: 2px; padding: 6px 4px; font-size: 12px; min-height: 52px; }
:host([narrow]) .ag-alarm .ag-btn { margin-left: 0; width: 100%; }
:host([narrow]) .list-search { flex: 1 1 100%; min-width: 0; }
:host([narrow]) .ag-foot { margin: 0 -12px calc(-24px - env(safe-area-inset-bottom, 0px)); padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0px)); bottom: calc(-24px - env(safe-area-inset-bottom, 0px)); }
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
.ag-colrow { display: flex; align-items: center; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid var(--ag-divider); }
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
.ag-sen-layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; align-items: start; }
.ag-sen-layout.open { grid-template-columns: minmax(0, 1fr) 420px; }
.ag-side:empty { display: none; }
.ag-sheet { position: sticky; top: 0; overflow: hidden; }
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
.ag-cfg { margin-top: -4px; }
:host([narrow]) .ag-sen-layout.open { grid-template-columns: 1fr; }
:host([narrow]) dialog.ag-sheetdlg { max-height: 88vh; overflow: auto; }
:host([narrow]) .ag-list-head { margin-top: 2px; }

/* 0.4.0: Aktionen als Ablauf, Benachrichtigungen */
.ag-subs { max-width: 100%; overflow-x: auto; }
.ag-wf-line { position: relative; display: flex; flex-direction: column; align-items: stretch; max-width: 820px; }
.ag-wf-line::before { content: ""; position: absolute; left: 33px; top: 20px; bottom: 20px; width: 2px; background: var(--ag-divider); z-index: 0; }
.ag-wf-start { display: flex; align-items: center; gap: 10px; padding: 6px 20px; font-weight: 500; position: relative; z-index: 1; }
.ag-wf-plus { display: flex; padding: 6px 0 6px 20px; position: relative; z-index: 1; }
.ag-wf-add { width: 28px; height: 28px; border-radius: 50%; border: 1.5px dashed var(--ag-primary); background: var(--ag-card); color: var(--ag-primary); display: grid; place-items: center; cursor: pointer; padding: 0; }
.ag-wf-add:hover { background: var(--ag-primary-soft); }
.ag-wf-step { display: flex; align-items: center; gap: 12px; padding: 12px 14px; position: relative; z-index: 1; }
.ag-wf-icon { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; flex: none; background: var(--ag-primary-soft); color: var(--ag-primary); }
.ag-wf-icon.k-notify, .ag-wf-icon.k-sound { background: var(--ag-error-soft); color: var(--ag-error); }
.ag-wf-icon.k-wait { background: var(--ag-subtle); color: var(--ag-text2); }
.ag-wf-icon.k-open, .ag-wf-icon.k-close { background: var(--ag-success-soft); color: var(--ag-success); }
.ag-wf-text { flex: 1; min-width: 0; }
.ag-wf-text b { font-weight: 500; }
.ag-wf-text .ag-small { overflow-wrap: anywhere; }
.ag-wf-btns { display: flex; gap: 2px; flex: none; }
.ag-wf-btns .ag-iconbtn { width: 36px; height: 36px; }
.ag-wf-btns .ag-iconbtn:disabled { opacity: .3; cursor: default; }
.ag-wf-empty { margin-left: 20px; }
.ag-wf-info { display: flex; gap: 6px; align-items: center; margin: 6px 4px 0; }
.ag-wf-info .ag-ic { display: inline-block; }
.ag-kinds { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
.ag-kind { display: grid; grid-template-columns: auto 1fr; grid-template-rows: auto auto; column-gap: 12px; align-items: center; text-align: left; padding: 12px; border: 1px solid var(--ag-divider); border-radius: 14px; background: var(--ag-card); cursor: pointer; font: inherit; color: inherit; }
.ag-kind:hover { border-color: var(--ag-primary); }
.ag-kind .ag-wf-icon { grid-row: span 2; }
.ag-kind b { font-weight: 500; }
.ag-kind small { color: var(--ag-text2); font-size: 12px; line-height: 1.3; }
.ag-step-ed { max-height: 80vh; overflow: auto; }
.ag-dlg-body .list-search { flex: none; height: 40px; min-width: 0; }
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
.ag-warntext { color: var(--ag-warning-text) !important; display: flex !important; gap: 4px; align-items: center; }
:host([narrow]) .ag-wf-btns .ag-iconbtn { width: 32px; height: 32px; }
:host([narrow]) .ag-wf-step { flex-wrap: wrap; }
:host([narrow]) .ag-wf-btns { width: 100%; justify-content: flex-end; }
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
select.ag-input { appearance: auto; }
#ag-codes .ag-dlg-body { gap: 14px; }
#ag-codes .ag-fld small { font-size: 12.5px; }
`;
