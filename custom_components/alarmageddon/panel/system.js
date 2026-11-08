// Konfiguration › Anlage: Modi, Verzögerungen, Alarmdauer, Verhalten bei offenen Sensoren, Zeitplan (Entwurf mit "Speichern");
// dazu Codes pro Person und Sicherung (sofort).
// Dieselben Schlüssel wie der Optionsdialog von HA (WebSocket alarmageddon/save_system). Der Code bleibt im Optionsdialog.

const V = new URL(import.meta.url).search;
const { ic, esc, MODE_KEY, MODE_ICON, errText, chapter } = await import(`./common.js${V}`);

const MAX = 3600;
const ALL_MODES = ["home", "away", "night"];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export class SystemUi {
  constructor(host) {
    this.host = host;
    this.draft = null;
    this.saveState = null;
    this.saving = false;
  }

  _t(key, vars) {
    return this.host._t(key, vars);
  }

  get system() {
    return this.host._system();
  }

  base(s = this.system) {
    return {
      entry: s.entry_id,
      exit_delay: { home: 0, away: 60, night: 0, ...(s.exit_delay || {}) },
      entry_delay: s.entry_delay ?? 30,
      trigger_time: s.trigger_time ?? 180,
      modes: Object.fromEntries(ALL_MODES.map((m) => [m, (s.modes || ["home", "away"]).includes(m)])),
      open_sensors: s.open_sensors || "block",
      confirm_window: s.confirm_window ?? 60,
      schedules: JSON.parse(JSON.stringify(s.schedules || [])),
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
    for (const m of ["home", "away", "night"]) if (a.exit_delay[m] !== d.exit_delay[m]) n += 1;
    for (const k of ["entry_delay", "trigger_time", "open_sensors", "confirm_window"]) if (a[k] !== d[k]) n += 1;
    for (const m of ALL_MODES) if (a.modes[m] !== d.modes[m]) n += 1;
    if (JSON.stringify(a.schedules) !== JSON.stringify(d.schedules)) n += 1;
    return n;
  }

  // Zahlen lokal prüfen; ungültige Felder werden markiert und nichts wird gesendet (LEARNINGS: kein Speicherfehler)
  invalid() {
    const d = this.draft;
    const bad = [];
    const check = (key, v) => (!Number.isInteger(v) || v < 0 || v > MAX) && bad.push(key);
    for (const m of ["home", "away", "night"]) check(`exit_${m}`, d.exit_delay[m]);
    check("entry_delay", d.entry_delay);
    check("trigger_time", d.trigger_time);
    if (!Number.isInteger(d.confirm_window) || d.confirm_window < 5 || d.confirm_window > 600) bad.push("confirm_window");
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
    const bad = new Set(this.invalid());
    const num = (key, value, min = 0, max = MAX) => `<span class="ag-num ${bad.has(key) ? "bad" : ""}"><input type="number" min="${min}" max="${max}" step="1" inputmode="numeric" data-sys="num" data-key="${key}" value="${esc(value)}" aria-label="${esc(key)}"><span class="ag-t2">${esc(this._t("seconds"))}</span></span>`;
    const seg = `<div class="ag-seg small" data-seg="sys-open"><span class="ag-pill"></span>${[["block", "sysOpenBlock"], ["bypass", "sysOpenBypass"]]
      .map(([v, label]) => `<button data-sys="open" data-value="${v}" class="${d.open_sensors === v ? "on" : ""}">${esc(this._t(label))}</button>`).join("")}</div>`;
    const card = (rows) => `<div class="ag-card ag-setlist">${rows}</div>`;
    const modesRow = `<div class="ag-setrow"><div class="ag-settx"><div class="ag-zline">${ALL_MODES.map((m) => `<button class="ag-chip ${d.modes[m] ? "on" : ""}" data-sys="mode" data-mode="${m}" aria-pressed="${d.modes[m]}">${ic(MODE_ICON[m], 16)}${esc(this._t(MODE_KEY[m]))}</button>`).join("")}</div>
          ${bad.has("modes") ? `<small class="ag-err">${esc(this._t("sysModesNone"))}</small>` : ""}</div></div>`;
    const timesRows = `<div class="ag-setrow"><div class="ag-settx"><b>${esc(this._t("sysExitDelay"))}</b><small>${esc(this._t("sysExitDelayHint"))}</small></div>
          <div class="ag-numgrid">${modes.map((m) => `<label class="ag-numlabel"><span class="ag-t2 ag-small">${esc(this._t(MODE_KEY[m]))}</span>${num(`exit_${m}`, d.exit_delay[m])}</label>`).join("")}</div></div>
        <div class="ag-setrow"><div class="ag-settx"><b>${esc(this._t("sysEntryDelay"))}</b><small>${esc(this._t("sysEntryDelayHint"))}</small></div>${num("entry_delay", d.entry_delay)}</div>
        <div class="ag-setrow"><div class="ag-settx"><b>${esc(this._t("sysTriggerTime"))}</b><small>${esc(this._t("sysTriggerTimeHint"))}</small></div>${num("trigger_time", d.trigger_time)}</div>`;
    const behaviourRows = `<div class="ag-setrow"><div class="ag-settx"><b>${esc(this._t("sysOpen"))}</b></div>${seg}</div>
        <div class="ag-setrow"><div class="ag-settx"><b>${esc(this._t("sysConfirm"))}</b><small>${esc(this._t("sysConfirmHint"))}</small></div>${num("confirm_window", d.confirm_window, 5, 600)}</div>`;
    const html = chapter(this._t("sysModes"), card(modesRow), this._t("sysModesHint"))
      + chapter(this._t("chapTimes"), card(timesRows))
      + chapter(this._t("chapBehaviour"), card(behaviourRows))
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
    return chapter(this._t("bkTitle"), `<div class="ag-card ag-setlist ag-codes"><div class="ag-setrow"><div class="ag-settx"><small>${esc(this._t("bkHint"))}</small></div>
      <div class="ag-btnrow"><button class="ag-btn" data-sys="export">${ic("arrowDown", 18)}${esc(this._t("bkExport"))}</button>
        <button class="ag-btn" data-sys="import">${ic("arrowUp", 18)}${esc(this._t("bkImport"))}</button><input type="file" accept="application/json,.json" data-sys="import-file" hidden></div></div></div>`);
  }

  async exportBackup() {
    try {
      const data = await this.host._hass.callWS({ type: "alarmageddon/export" });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = this.host.ownerDocument.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `alarmageddon-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
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
    } catch (err) {
      this.host._toast(this._backupErr(err));
    }
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
        : first === "confirm_window" ? this._t("invalidNumber", { min: 5, max: 600 }) : this._t("invalidNumber", { min: 0, max: MAX });
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
      const exit = Object.fromEntries(modes.map((m) => [m, d.exit_delay[m]]));
      await h._hass.callWS({ type: "alarmageddon/save_system", entry_id: s.entry_id, exit_delay: exit, entry_delay: d.entry_delay, trigger_time: d.trigger_time,
        home_enabled: d.modes.home, away_enabled: d.modes.away, night_enabled: d.modes.night, open_sensors: d.open_sensors, confirm_window: d.confirm_window, schedules: d.schedules });
      Object.assign(s, { confirm_window: d.confirm_window, exit_delay: { ...s.exit_delay, ...exit }, entry_delay: d.entry_delay, trigger_time: d.trigger_time,
        night_enabled: d.modes.night, modes, open_sensors: d.open_sensors, schedules: JSON.parse(JSON.stringify(d.schedules)) });
      this.draft = null;
      this.saveState = "saved";
      h._fetch();
    } catch (err) {
      const known = { no_mode: "errNoMode", mode_active: "errModeActive" }[err?.code];
      this.saveState = known ? this._t(known) : this._t("saveFailed", { message: errText(err) });
    } finally {
      this.saving = false;
      this.render();
    }
  }

  onClick(el) {
    const act = el?.dataset.sys;
    if (!act) return false;
    const d = this.ensureDraft();
    const i = Number(el.dataset.index);
    if (act === "mode") {
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
    } else if (act === "open") {
      d.open_sensors = el.dataset.value;
      this.saveState = null;
      this.render();
    } else if (act === "cancel") {
      this.reset();
      this.render();
    } else if (act === "save") {
      this.save();
    } else if (act === "code") {
      this.host._navigate("/config/integrations/integration/alarmageddon");
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
    const key = el.dataset.key;
    if (key.startsWith("exit_")) d.exit_delay[key.slice(5)] = v;
    else d[key] = v;
    this.saveState = null;
    const [min, max] = key === "confirm_window" ? [5, 600] : [0, MAX];
    el.closest(".ag-num")?.classList.toggle("bad", !Number.isInteger(v) || v < min || v > max);
    this.renderFoot();
    return true;
  }
}
