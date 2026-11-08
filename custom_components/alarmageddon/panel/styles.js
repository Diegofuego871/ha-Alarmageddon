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
.ag-foot .ag-err { color: var(--ag-error); }
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
`;
