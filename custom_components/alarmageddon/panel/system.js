// Konfiguration › Anlage: Modi, Verzögerungen, Verhalten bei offenen Sensoren, Zeitplan (Entwurf mit "Speichern");
// dazu Codes pro Person und Sicherung (sofort).
// Dieselben Schlüssel wie der Optionsdialog von HA (WebSocket alarmageddon/save_system). Der Code bleibt im Optionsdialog.

const V = new URL(import.meta.url).search;
const { ic, esc, MODE_KEY, MODE_ICON, errText, chapter } = await import(`./common.js${V}`);

const MAX = 3600;
const DEFAULTS = { exit_delay: 0, entry_delay: 30, confirm_window: 60 };
const WINDOW = [5, 600];
const ALL_MODES = ["home", "away", "night"];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export class SystemUi {
  constructor(host) {
    this.host = host;
    this.draft = null;
    this.saveState = null;
    this.saving = false;
    this.backups = null; // in der Integration abgelegte Sicherungen (neueste zuerst), null = noch nicht geladen
    this.bkMax = 10;
    this.scope = "away"; // Modus, dessen Werte gerade angezeigt werden (Ansicht, nicht Teil des Entwurfs)
  }

  _t(key, vars) {
    return this.host._t(key, vars);
  }

  get system() {
    return this.host._system();
  }

  // Werte je Modus; fehlt etwas im Server-Stand, gilt die Grundeinstellung
  base(s = this.system) {
    const ms = s.mode_settings || {};
    const per = {};
    for (const m of ALL_MODES) per[m] = { ...DEFAULTS, ...(ms[m] || {}) };
    const active = (s.modes || ["home", "away"]).filter((m) => ALL_MODES.includes(m));
    // Schalter "Einstellungen pro Modus": gespeicherter Wert; ohne Wert an, wenn sich die Werte der Modi unterscheiden (Anlagen vor 0.34.0)
    const differ = active.some((m) => Object.keys(DEFAULTS).some((k) => per[m][k] !== per[active[0]][k]));
    return {
      entry: s.entry_id,
      perMode: typeof s.per_mode_settings === "boolean" ? s.per_mode_settings : differ,
      per,
      modes: Object.fromEntries(ALL_MODES.map((m) => [m, (s.modes || ["home", "away"]).includes(m)])),
      schedules: JSON.parse(JSON.stringify(s.schedules || [])),
      always: s.always_enabled !== false, // "Immer aktiv" als Ganzes (Standard an)
    };
  }

  ensureDraft() {
    const s = this.system;
    if (!s) return null;
    if (!this.draft || this.draft.entry !== s.entry_id) this.draft = this.base(s);
    return this.draft;
  }

  reset() {
    this.draft = null;
    this.saveState = null;
  }

  dirtyCount() {
    const s = this.system;
    if (!s || !this.draft || this.draft.entry !== s.entry_id) return 0;
    const a = this.base(s);
    const d = this.draft;
    let n = 0;
    if (a.perMode !== d.perMode) n += 1; // der Schalter zählt als eigene Änderung
    // Je Modus mit Änderungen zählt einmal ("Abwesend: 2 Werte" ist eine Änderung am Modus)
    for (const scope of ALL_MODES) if (Object.keys(a.per[scope]).some((k) => a.per[scope][k] !== d.per[scope][k])) n += 1;
    for (const m of ALL_MODES) if (a.modes[m] !== d.modes[m]) n += 1;
    if (a.always !== d.always) n += 1;
    if (JSON.stringify(a.schedules) !== JSON.stringify(d.schedules)) n += 1;
    return n;
  }

  // Zahlen lokal prüfen; ungültige Felder werden markiert und nichts wird gesendet (LEARNINGS: kein Speicherfehler)
  invalid() {
    const d = this.draft;
    const bad = [];
    const check = (key, v, [min, max] = [0, MAX]) => (!Number.isInteger(v) || v < min || v > max) && bad.push(key);
    for (const scope of ALL_MODES.filter((m) => d.modes[m])) {
      const v = d.per[scope];
      check(`${scope}.exit_delay`, v.exit_delay);
      check(`${scope}.entry_delay`, v.entry_delay);
      check(`${scope}.confirm_window`, v.confirm_window, WINDOW);
    }
    if (!ALL_MODES.some((m) => d.modes[m])) bad.push("modes");
    if (d.schedules.some((r) => !TIME_RE.test(r.time || "") || !r.days?.length)) bad.push("schedules");
    return bad;
  }

  html() {
    return `<div class="ag-sys-form"></div><div class="ag-foot"></div>`;
  }

  render() {
    const h = this.host;
    const form = h._view?.querySelector(".ag-sys-form");
    const d = this.ensureDraft();
    if (!form || !d) return;
    const modes = ALL_MODES.filter((m) => d.modes[m]);
    // Ohne Schalter gilt ein Satz Werte für alle Modi (angezeigt wird der des ersten Modus); mit Schalter wählt der Reiter den Modus
    if (!d.perMode) this.scope = modes[0] || "away";
    else if (!modes.includes(this.scope)) this.scope = modes.includes("away") ? "away" : modes[0] || "away";
    const scope = this.scope;
    const v = d.per[scope];
    const bad = new Set(this.invalid());
    const num = (field, value, min = 0, max = MAX, unit = "seconds") => `<span class="ag-num ${bad.has(`${scope}.${field}`) ? "bad" : ""}"><input type="number" min="${min}" max="${max}" step="1" inputmode="numeric" data-sys="num" data-field="${field}" value="${esc(value)}" aria-label="${esc(field)}"><span class="ag-t2">${esc(this._t(unit))}</span></span>`;
    // Reiter der Modi nur mit eingeschaltetem Schalter
    const scopeSeg = d.perMode ? h._segHtml("sys-scope", modes.map((m) => [m, this._t(MODE_KEY[m]), MODE_ICON[m]]), scope, "data-scope", "small") : "";
    const switchRow = `<div class="ag-pmbar"><div class="ag-pmsw"><button class="ag-toggle ${d.perMode ? "on" : ""}" data-sys="permode" role="switch" aria-checked="${d.perMode}" aria-label="${esc(this._t("sysPerMode"))}"></button>
      <div class="ag-settx"><b>${esc(this._t("sysPerMode"))}</b><small>${esc(this._t(d.perMode ? "sysPerModeOn" : "sysPerModeHint"))}</small></div></div>${scopeSeg}</div>`;
    const card = (rows) => `<div class="ag-card ag-setlist">${rows}</div>`;
    const modesRow = `<div class="ag-setrow"><div class="ag-settx"><div class="ag-zline">${ALL_MODES.map((m) => `<button class="ag-chip ${d.modes[m] ? "on" : ""}" data-sys="mode" data-mode="${m}" aria-pressed="${d.modes[m]}">${ic(MODE_ICON[m], 16)}${esc(this._t(MODE_KEY[m]))}</button>`).join("")}</div>
          <div class="ag-zline" style="margin-top:10px"><button class="ag-chip ${d.always ? "on" : ""}" data-sys="always" aria-pressed="${d.always}">${ic("flash", 16)}${esc(this._t("wfAlways"))}</button></div>
          ${d.always ? "" : `<small class="ag-warntext">${ic("alert", 14)} ${esc(this._t("sysAlwaysOff"))}</small>`}
          ${bad.has("modes") ? `<small class="ag-err">${esc(this._t("sysModesNone"))}</small>` : ""}</div></div>`;
    const row = (title, hint, control) => `<div class="ag-setrow"><div class="ag-settx"><b>${esc(this._t(title))}</b>${hint ? `<small>${esc(this._t(hint))}</small>` : ""}</div>${control}</div>`;
    const timesRows = row("sysExitDelay", "sysExitDelayHint", num("exit_delay", v.exit_delay)) + row("sysEntryDelay", "sysEntryDelayHint", num("entry_delay", v.entry_delay));
    const behaviourRows = row("sysConfirm", "sysConfirmHint", num("confirm_window", v.confirm_window, WINDOW[0], WINDOW[1]));
    const scopeLine = d.perMode ? `<div class="ag-pmscope">${ic(MODE_ICON[scope], 18)}${esc(this._t("pmScope", { mode: this._t(MODE_KEY[scope]) }))}</div>` : "";
    const perMode = chapter(this._t("chapPerMode"), `<div class="ag-pmgroup ${d.perMode ? "on" : ""}">${switchRow}${scopeLine}
        <div class="ag-subh">${esc(this._t("chapTimes"))}</div>${card(timesRows)}
        <div class="ag-subh">${esc(this._t("chapBehaviour"))}</div>${card(behaviourRows)}</div>`);
    const html = chapter(this._t("sysModes"), card(modesRow), this._t("sysModesHint")) + perMode
      + this._schedulesHtml(modes) + this._codesHtml() + this._backupHtml();
    // Beim Tippen nie neu aufbauen (Cursor bliebe nicht stehen), nur bei Schaltern und Auswahl
    h._setHtml(form, html);
    h._placePills();
    this.renderFoot();
  }

  // ----- Zeitplan (Teil des Entwurfs) -----

  _schedulesHtml(modes) {
    const d = this.draft;
    const days = this._t("schDays").split(",");
    const actionLabel = (a) => (a === "off" ? this._t("schOff") : this._t("schArm", { mode: this._t(MODE_KEY[a]) }));
    const rows = d.schedules.map((r, i) => {
      const actions = ["off", ...ALL_MODES.filter((m) => modes.includes(m) || r.action === m)];
      const off = r.action !== "off" && !modes.includes(r.action);
      return `<div class="ag-schrow ${r.enabled === false ? "dim" : ""}">
        <input type="time" class="ag-input ag-time" data-sys="sch-time" data-index="${i}" value="${esc(r.time)}" aria-label="${esc(this._t("schTime"))}">
        <select class="ag-input" data-sys="sch-action" data-index="${i}" aria-label="${esc(this._t("schAction"))}">${actions.map((a) => `<option value="${a}" ${a === r.action ? "selected" : ""}>${esc(actionLabel(a))}</option>`).join("")}</select>
        <div class="ag-days">${days.map((label, k) => {
          const on = r.days.includes(k);
          return `<button class="ag-day ${on ? "on" : ""}" data-sys="sch-day" data-index="${i}" data-day="${k}" aria-pressed="${on}">${esc(label)}</button>`;
        }).join("")}</div>
        <button class="ag-toggle ${r.enabled !== false ? "on" : ""}" data-sys="sch-on" data-index="${i}" role="switch" aria-checked="${r.enabled !== false}" aria-label="${esc(this._t("schOn"))}"></button>
        <button class="ag-iconbtn" data-sys="sch-del" data-index="${i}" aria-label="${esc(this._t("schDelete"))}">${ic("trash", 18)}</button>
        ${off ? `<small class="ag-warntext ag-schwarn">${ic("alert", 14)} ${esc(this._t("schModeOff"))}</small>` : ""}</div>`;
    }).join("");
    return chapter(this._t("schTitle"), `<div class="ag-card ag-setlist ag-codes ag-sched">
      <div class="ag-setrow"><div class="ag-settx"><small>${esc(this._t("schHint"))}</small></div>
        <button class="ag-btn" data-sys="sch-add">${ic("plus", 18)}${esc(this._t("schAdd"))}</button></div>
      ${rows || `<div class="ag-coderow ag-t2">${esc(this._t("schEmpty"))}</div>`}</div>`);
  }

  // ----- Codes pro Person (sofort gespeichert, nicht Teil des Entwurfs: ein Code soll nie im Panel liegen bleiben) -----

  _codesHtml() {
    const s = this.system;
    const users = this.host._data?.users || [];
    const userName = (id) => users.find((u) => u.id === id)?.name;
    const rows = (s.codes || []).map((c) => `<div class="ag-coderow"><span class="ag-mini">${ic("hand", 16)}</span><span class="ag-grow"><b>${esc(c.name)}</b><small class="ag-t2">${esc(userName(c.user_id) || this._t("codeNoUser"))}</small></span>
        <button class="ag-iconbtn" data-sys="code-del" data-id="${esc(c.id)}" aria-label="${esc(`${this._t("remove")}: ${c.name}`)}">${ic("trash", 18)}</button></div>`).join("");
    return chapter(this._t("sysCodes"), `<div class="ag-card ag-setlist ag-codes">
      <div class="ag-setrow"><div class="ag-settx"><small>${esc(this._t("sysCodesHint"))}</small></div>
        <button class="ag-btn" data-sys="code-add">${ic("plus", 18)}${esc(this._t("codeAdd"))}</button></div>
      ${rows}
      <div class="ag-coderow"><span class="ag-mini">${ic("lockClosed", 16)}</span><span class="ag-grow"><b>${esc(this._t("sysCodeMain"))}</b><small class="ag-t2">${esc(this._t(s.main_code ? "sysCodeMainSet" : "sysCodeMainNone"))}</small></span>
        <button class="ag-btn" data-sys="code">${ic("cog", 18)}${esc(this._t("sysCodeOpen"))}</button></div></div>`);
  }

  _backupHtml() {
    if (this.backups === null && !this._bkLoading) this.loadBackups();
    return chapter(this._t("bkTitle"), `<div class="ag-card ag-setlist ag-codes"><div class="ag-setrow"><div class="ag-settx"><small>${esc(this._t("bkHint"))}</small></div>
      <div class="ag-btnrow"><button class="ag-btn primary" data-sys="bk-create">${ic("check", 18)}${esc(this._t("bkSave"))}</button>
        <button class="ag-btn" data-sys="export">${ic("arrowDown", 18)}${esc(this._t("bkExport"))}</button>
        <button class="ag-btn" data-sys="import">${ic("arrowUp", 18)}${esc(this._t("bkImport"))}</button><input type="file" accept="application/json,.json" data-sys="import-file" hidden></div></div></div>
      <div class="ag-bkbody">${this._bkBody()}</div>`);
  }

  // Liste der Sicherungen als Tabelle: Datum, Anlagen, Herunterladen, Wiederherstellen, Löschen
  _bkBody() {
    if (this.backups === null) return "";
    const lang = this.host._lang || "en";
    const date = (iso) => (iso ? new Date(iso).toLocaleString(lang, { dateStyle: "medium", timeStyle: "short" }) : "–");
    if (!this.backups.length) return `<div class="ag-t2 ag-small" style="margin:10px 4px 0">${esc(this._t("bkEmpty"))}</div>`;
    const btn = (act, icon, key, id) => `<button class="ag-iconbtn" data-sys="${act}" data-id="${esc(id)}" title="${esc(this._t(key))}" aria-label="${esc(this._t(key))}">${ic(icon, 18)}</button>`;
    const rows = this.backups.map((b) => `<tr data-bk="${esc(b.id)}"><td><b class="ag-bkname">${esc(b.name || date(b.created))}</b>${b.name ? `<small class="ag-t2 ag-bkdate">${esc(date(b.created))}</small>` : ""}</td><td class="ag-t2">${esc((b.systems || []).join(", ") || "–")}</td>
        <td class="ag-acts"><div class="ag-actrow">${btn("bk-download", "arrowLine", "bkDownload", b.id)}${btn("bk-restore", "restore", "bkRestoreOne", b.id)}${btn("bk-delete", "trash", "bkDelete", b.id)}</div></td></tr>`).join("");
    return `<div class="ag-t2 ag-small" style="margin:10px 4px 6px">${esc(this._t("bkCount", { count: this.backups.length, max: this.bkMax }))}</div>
      <div class="ag-card ag-table-wrap ag-stickwrap"><table class="ag-table ag-bktable"><tr><th>${esc(this._t("bkColName"))}</th><th>${esc(this._t("bkColSystems"))}</th><th></th></tr>${rows}</table></div>`;
  }

  renderBackups() {
    const el = this.host._view?.querySelector(".ag-bkbody");
    if (el) this.host._setHtml(el, this._bkBody());
    this.host._stickySync?.();
  }

  async loadBackups() {
    this._bkLoading = true;
    try {
      const res = await this.host._hass.callWS({ type: "alarmageddon/backups" });
      this.backups = res.backups || [];
      this.bkMax = res.max || 10;
    } catch {
      this.backups = [];
    } finally {
      this._bkLoading = false;
    }
    this.renderBackups();
  }

  // "Sichern" fragt zuerst nach einem Namen (leer erlaubt: dann zeigt die Liste das Datum)
  openCreateBackup() {
    const dlg = this._codeDlg();
    dlg.innerHTML = `<form class="ag-dlg-body" data-form="backup"><h3>${esc(this._t("bkNameTitle"))}</h3>
      <label class="ag-t2 ag-small" for="ag-bk-name">${esc(this._t("bkNameLabel"))}</label>
      <input class="ag-input" id="ag-bk-name" type="text" maxlength="60" placeholder="${esc(this._t("bkNamePlaceholder"))}" style="width:100%;box-sizing:border-box" autocomplete="off">
      <div class="ag-dlg-err" aria-live="polite"></div>
      <div class="ag-dlg-btns"><button type="button" class="ag-btn" data-sys="code-close">${esc(this._t("cancel"))}</button><button class="ag-btn primary" type="submit">${esc(this._t("bkSave"))}</button></div></form>`;
    dlg.showModal();
    dlg.querySelector("input").focus();
  }

  async createBackup(name = "") {
    try {
      const res = await this.host._hass.callWS({ type: "alarmageddon/backup_create", name: String(name || "").trim() });
      this._codeDlg().close();
      this.backups = res.backups || [];
      this.bkMax = res.max || 10;
      this.renderBackups();
      this.host._toast(this._t("bkSaved"));
    } catch (err) {
      this.host._toast(this._t("errGeneric", { message: errText(err) }));
    }
  }

  _download(data, name) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = this.host.ownerDocument.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async downloadBackup(id) {
    try {
      const data = await this.host._hass.callWS({ type: "alarmageddon/backup_get", backup_id: id });
      this._download(data, `alarmageddon-${String(data.created || new Date().toISOString()).slice(0, 10)}.json`);
    } catch (err) {
      this.host._toast(this._t("errGeneric", { message: errText(err) }));
    }
  }

  async restoreBackup(id) {
    try {
      await this.askRestore(await this.host._hass.callWS({ type: "alarmageddon/backup_get", backup_id: id }));
    } catch (err) {
      this.host._toast(this._backupErr(err));
    }
  }

  openDeleteBackup(id) {
    const b = (this.backups || []).find((x) => x.id === id);
    if (!b) return;
    const lang = this.host._lang || "en";
    const dlg = this._codeDlg();
    dlg.innerHTML = `<div class="ag-dlg-body"><h3>${esc(this._t("bkDeleteTitle"))}</h3><div class="ag-t2">${esc(b.created ? new Date(b.created).toLocaleString(lang, { dateStyle: "medium", timeStyle: "short" }) : "")}</div>
      <div class="ag-dlg-err" aria-live="polite"></div>
      <div class="ag-dlg-btns"><button class="ag-btn" data-sys="code-close">${esc(this._t("cancel"))}</button><button class="ag-btn primary" data-sys="bk-delete-go" data-id="${esc(id)}">${esc(this._t("bkDelete"))}</button></div></div>`;
    dlg.showModal();
  }

  async deleteBackup(id) {
    try {
      const res = await this.host._hass.callWS({ type: "alarmageddon/backup_delete", backup_id: id });
      this.backups = res.backups || [];
      this._codeDlg().close();
      this.renderBackups();
    } catch (err) {
      this._codeError(this._t("errGeneric", { message: errText(err) }));
    }
  }

  async exportBackup() {
    try {
      const data = await this.host._hass.callWS({ type: "alarmageddon/export" });
      this._download(data, `alarmageddon-${new Date().toISOString().slice(0, 10)}.json`);
    } catch (err) {
      this.host._toast(this._t("errGeneric", { message: errText(err) }));
    }
  }

  _backupErr(err) {
    const key = { not_a_backup: "errNotABackup", newer_version: "errNewerVersion", invalid_backup: "errInvalidBackup" }[err?.code];
    return key ? this._t(key) : this._t("errGeneric", { message: errText(err) });
  }

  async importFile(input) {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    let data;
    try {
      data = JSON.parse(await file.text());
    } catch {
      return this.host._toast(this._t("errNotABackup"));
    }
    try {
      await this.askRestore(data);
    } catch (err) {
      this.host._toast(this._backupErr(err));
    }
  }

  // Prüft eine Sicherung (Datei oder abgelegt) und zeigt, was wiederhergestellt würde
  async askRestore(data) {
    const plan = await this.host._hass.callWS({ type: "alarmageddon/import", data, dry_run: true });
    this._pendingBackup = data;
    const dlg = this._codeDlg();
    const ok = plan.systems.length || plan.settings;
    dlg.innerHTML = `<div class="ag-dlg-body"><h3>${esc(this._t("bkConfirmTitle"))}</h3>
      ${plan.systems.length ? `<div>${esc(this._t("bkFound", { list: plan.systems.join(", ") }))}</div>` : `<div class="ag-t2">${esc(this._t("bkNoneFound"))}</div>`}
      ${plan.missing.length ? `<div class="ag-t2">${esc(this._t("bkMissing", { list: plan.missing.join(", ") }))}</div>` : ""}
      ${plan.settings ? `<div class="ag-t2">${esc(this._t("bkSettings"))}</div>` : ""}
      <div class="ag-dlg-err" aria-live="polite"></div>
      <div class="ag-dlg-btns"><button class="ag-btn" data-sys="code-close">${esc(this._t("cancel"))}</button><button class="ag-btn primary" data-sys="import-go" ${ok ? "" : "disabled"}>${esc(this._t("bkRestore"))}</button></div></div>`;
    dlg.showModal();
  }

  async importGo() {
    try {
      await this.host._hass.callWS({ type: "alarmageddon/import", data: this._pendingBackup });
      this._pendingBackup = null;
      this._codeDlg().close();
      this.host._resetConfig?.();
      this.host._toast(this._t("bkDone"));
      this.host._fetch();
    } catch (err) {
      this._codeError(this._backupErr(err));
    }
  }

  _codeDlg() {
    return this.host._root.getElementById("ag-codes");
  }

  openAddCode() {
    const users = this.host._data?.users || [];
    const taken = new Set((this.system.codes || []).map((c) => c.user_id).filter(Boolean));
    const dlg = this._codeDlg();
    dlg.innerHTML = `<div class="ag-dlg-body"><h3>${esc(this._t("codeAdd"))}</h3>
      <label class="ag-fld"><span class="ag-label">${esc(this._t("codeUser"))}</span><select class="ag-input" data-sys="cf" data-key="user_id" aria-label="${esc(this._t("codeUser"))}">
        <option value="">${esc(this._t("codeUserNone"))}</option>${users.filter((u) => !taken.has(u.id)).map((u) => `<option value="${esc(u.id)}">${esc(u.name)}</option>`).join("")}</select>
        <small class="ag-t2">${esc(this._t("codeUserHint"))}</small></label>
      <label class="ag-fld"><span class="ag-label">${esc(this._t("codeName"))}</span><input class="ag-input" data-sys="cf" data-key="name" maxlength="40" autocomplete="off" aria-label="${esc(this._t("codeName"))}"></label>
      <label class="ag-fld"><span class="ag-label">${esc(this._t("codeValue"))}</span><input class="ag-input" type="password" inputmode="numeric" autocomplete="new-password" data-sys="cf" data-key="code" maxlength="8" aria-label="${esc(this._t("codeValue"))}"></label>
      <label class="ag-fld"><span class="ag-label">${esc(this._t("codeRepeat"))}</span><input class="ag-input" type="password" inputmode="numeric" autocomplete="new-password" data-sys="cf" data-key="code2" maxlength="8" aria-label="${esc(this._t("codeRepeat"))}"></label>
      <div class="ag-dlg-err" aria-live="polite"></div>
      <div class="ag-dlg-btns"><button class="ag-btn" data-sys="code-close">${esc(this._t("cancel"))}</button><button class="ag-btn primary" data-sys="code-save">${ic("check", 18)}${esc(this._t("save"))}</button></div></div>`;
    dlg.showModal();
    dlg.querySelector('[data-key="name"]').focus();
  }

  openRemoveCode(id) {
    const c = (this.system.codes || []).find((x) => x.id === id);
    if (!c) return;
    const dlg = this._codeDlg();
    dlg.innerHTML = `<div class="ag-dlg-body"><h3>${esc(this._t("codeRemoveTitle"))}</h3><div class="ag-t2">${esc(this._t("codeRemoveText", { name: c.name }))}</div>
      <div class="ag-dlg-err" aria-live="polite"></div>
      <div class="ag-dlg-btns"><button class="ag-btn" data-sys="code-close">${esc(this._t("cancel"))}</button><button class="ag-btn danger" data-sys="code-remove" data-id="${esc(id)}">${ic("trash", 18)}${esc(this._t("remove"))}</button></div></div>`;
    dlg.showModal();
  }

  _codeError(text) {
    const box = this._codeDlg().querySelector(".ag-dlg-err");
    if (box) box.textContent = text;
  }

  async saveCode() {
    const dlg = this._codeDlg();
    const val = (k) => dlg.querySelector(`[data-key="${k}"]`).value;
    const name = val("name").trim();
    if (!name) return this._codeError(this._t("codeNameMissing"));
    if (!/^\d{4,8}$/.test(val("code"))) return this._codeError(this._t("errInvalidCodeFormat"));
    if (val("code") !== val("code2")) return this._codeError(this._t("codeMismatch"));
    try {
      await this.host._hass.callWS({ type: "alarmageddon/add_code", entry_id: this.system.entry_id, name, code: val("code"), user_id: val("user_id") || null });
      dlg.close();
      this.host._toast(this._t("saved"));
      this.host._fetch();
    } catch (err) {
      this._codeError(this._codeErrText(err));
    }
  }

  async removeCode(id) {
    try {
      await this.host._hass.callWS({ type: "alarmageddon/remove_code", entry_id: this.system.entry_id, code_id: id });
      this.system.codes = (this.system.codes || []).filter((c) => c.id !== id);
      this._codeDlg().close();
      this.render();
      this.host._fetch();
    } catch (err) {
      this._codeError(this._codeErrText(err));
    }
  }

  _codeErrText(err) {
    const key = { invalid_code_format: "errInvalidCodeFormat", name_taken: "errNameTaken", code_taken: "errCodeTaken", user_taken: "errUserTaken", too_many: "errTooMany" }[err?.code];
    return key ? this._t(key) : this._t("errGeneric", { message: errText(err) });
  }

  renderFoot() {
    const h = this.host;
    h._renderDots?.(); // Punkt "ungespeichert" an den Reitern
    const foot = h._view?.querySelector(".ag-foot");
    if (!foot) return;
    const n = this.dirtyCount();
    const badKeys = this.invalid();
    const bad = badKeys.length;
    let status;
    if (this.saveState === "saved" && !n) status = `<span class="ag-saved">${ic("check", 16)} ${esc(this._t("saved"))}</span>`;
    else if (this.saveState && this.saveState !== "saved") status = `<span class="ag-err">${esc(this.saveState)}</span>`;
    else if (bad) {
      const first = badKeys[0];
      const text = first === "modes" ? this._t("sysModesNone") : first === "schedules" ? this._t("schInvalid")
        : first.endsWith(".confirm_window") ? this._t("invalidNumber", { min: 5, max: 600 }) : this._t("invalidNumber", { min: 0, max: MAX });
      status = `<span class="ag-err">${esc(text)}</span>`;
    }
    else status = `<span class="ag-t2">${esc(n === 0 ? this._t("noChanges") : n === 1 ? this._t("change") : this._t("changes", { count: n }))}</span>`;
    h._setHtml(foot, `${status}<span class="ag-grow"></span><button class="ag-btn" data-sys="cancel" ${n ? "" : "disabled"}>${esc(this._t("cancel"))}</button>
      <button class="ag-btn primary" data-sys="save" ${n && !bad && !this.saving ? "" : "disabled"}>${ic("check", 18)}${esc(this._t("save"))}</button>`);
  }

  async save() {
    const h = this.host;
    const s = this.system;
    const d = this.draft;
    if (!s || !d || this.saving || this.invalid().length) return;
    this.saving = true;
    this.renderFoot();
    try {
      const modes = ALL_MODES.filter((m) => d.modes[m]);
      // Alle Modi (auch abgeschaltete behalten ihre Werte)
      const mode_settings = Object.fromEntries(ALL_MODES.map((m) => [m, { ...d.per[m] }]));
      await h._hass.callWS({ type: "alarmageddon/save_system", entry_id: s.entry_id, mode_settings, per_mode_settings: d.perMode,
        home_enabled: d.modes.home, away_enabled: d.modes.away, night_enabled: d.modes.night, always_enabled: d.always, schedules: d.schedules });
      Object.assign(s, { per_mode_settings: d.perMode, mode_settings: JSON.parse(JSON.stringify(mode_settings)), night_enabled: d.modes.night, always_enabled: d.always, modes, schedules: JSON.parse(JSON.stringify(d.schedules)) });
      this.draft = null;
      this.saveState = "saved";
      h._reloadWait();
    } catch (err) {
      const known = { no_mode: "errNoMode", mode_active: "errModeActive" }[err?.code];
      this.saveState = known ? this._t(known) : this._t("saveFailed", { message: errText(err) });
    } finally {
      this.saving = false;
      this.render();
    }
  }

  onClick(el) {
    // Modus der Einstellungen wählen: nur die Ansicht wechselt, der Entwurf bleibt
    if (el?.dataset.scope) {
      this.scope = el.dataset.scope;
      this.render();
      return true;
    }
    const act = el?.dataset.sys;
    if (!act) return false;
    const d = this.ensureDraft();
    const i = Number(el.dataset.index);
    if (act === "permode") {
      d.perMode = !d.perMode;
      if (!d.perMode) {
        // Aus: ein Satz Werte für alle Modi, der des ersten Modus
        const first = ALL_MODES.find((m) => d.modes[m]) || "away";
        for (const m of ALL_MODES) d.per[m] = { ...d.per[first] };
      }
      this.saveState = null;
      this.render();
    } else if (act === "always") {
      d.always = !d.always;
      this.saveState = null;
      this.render();
    } else if (act === "mode") {
      d.modes[el.dataset.mode] = !d.modes[el.dataset.mode];
      this.saveState = null;
      this.render();
    } else if (act === "sch-add") {
      const mode = ["away", "night", "home"].find((m) => d.modes[m]) || "away";
      d.schedules.push({ id: Math.random().toString(36).slice(2, 10), enabled: true, action: mode, time: "08:00", days: [0, 1, 2, 3, 4] });
      this.saveState = null;
      this.render();
    } else if (act === "sch-day") {
      const day = Number(el.dataset.day);
      const r = d.schedules[i];
      r.days = r.days.includes(day) ? r.days.filter((x) => x !== day) : [...r.days, day].sort((a, b) => a - b);
      this.saveState = null;
      this.render();
    } else if (act === "sch-on") {
      d.schedules[i].enabled = d.schedules[i].enabled === false;
      this.saveState = null;
      this.render();
    } else if (act === "sch-del") {
      d.schedules.splice(i, 1);
      this.saveState = null;
      this.render();
    } else if (act === "cancel") {
      this.reset();
      this.render();
    } else if (act === "save") {
      this.save();
    } else if (act === "code") {
      this.host._navigate("/config/integrations/integration/alarmageddon");
    } else if (act === "bk-create") {
      this.openCreateBackup();
    } else if (act === "bk-download") {
      this.downloadBackup(el.dataset.id);
    } else if (act === "bk-restore") {
      this.restoreBackup(el.dataset.id);
    } else if (act === "bk-delete") {
      this.openDeleteBackup(el.dataset.id);
    } else if (act === "bk-delete-go") {
      this.deleteBackup(el.dataset.id);
    } else if (act === "export") {
      this.exportBackup();
    } else if (act === "import-go") {
      this.importGo();
    } else if (act === "import") {
      // Dateiauswahl über einen echten Knopf (Tastatur), die Wahl kommt über onInput
      this.host._view?.querySelector('[data-sys="import-file"]')?.click();
    } else if (act === "import-file") {
      return false;
    } else if (act === "code-add") {
      this.openAddCode();
    } else if (act === "code-del") {
      this.openRemoveCode(el.dataset.id);
    } else if (act === "code-close") {
      this._codeDlg().close();
    } else if (act === "code-save") {
      this.saveCode();
    } else if (act === "code-remove") {
      this.removeCode(el.dataset.id);
    } else {
      return false;
    }
    return true;
  }

  onInput(el) {
    if (el.dataset.sys === "import-file") {
      this.importFile(el);
      return true;
    }
    if (el.dataset.sys === "cf") {
      // Benutzer gewählt und noch kein Name: Name des Benutzers vorschlagen
      if (el.dataset.key === "user_id" && el.value) {
        const name = this._codeDlg().querySelector('[data-key="name"]');
        if (!name.value) name.value = (this.host._data?.users || []).find((u) => u.id === el.value)?.name || "";
      }
      this._codeError("");
      return true;
    }
    if (el.dataset.sys === "sch-time" || el.dataset.sys === "sch-action") {
      const d = this.ensureDraft();
      const r = d.schedules[Number(el.dataset.index)];
      if (el.dataset.sys === "sch-time") {
        r.time = el.value;
        this.saveState = null;
        this.renderFoot(); // Uhrzeit: nicht neu aufbauen, sonst springt die Eingabe
      } else {
        r.action = el.value;
        this.saveState = null;
        this.render();
      }
      return true;
    }
    if (el.dataset.sys !== "num") return false;
    const d = this.ensureDraft();
    const v = el.value === "" ? NaN : Number(el.value);
    const field = el.dataset.field;
    // Ohne Schalter gilt der Wert für alle Modi
    for (const m of d.perMode ? [this.scope] : ALL_MODES) d.per[m][field] = v;
    this.saveState = null;
    const [min, max] = field === "confirm_window" ? WINDOW : [0, MAX];
    el.closest(".ag-num")?.classList.toggle("bad", !Number.isInteger(v) || v < min || v > max);
    this.renderFoot();
    return true;
  }
}
