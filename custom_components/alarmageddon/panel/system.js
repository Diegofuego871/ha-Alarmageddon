// Konfiguration › Anlage: Verzögerungen, Alarmdauer, Modus "Nacht", Verhalten bei offenen Sensoren.
// Dieselben Schlüssel wie der Optionsdialog von HA (WebSocket alarmageddon/save_system). Der Code bleibt im Optionsdialog.

const V = new URL(import.meta.url).search;
const { ic, esc, MODE_KEY, errText } = await import(`./common.js${V}`);

const MAX = 3600;

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
      night_enabled: !!s.night_enabled,
      open_sensors: s.open_sensors || "block",
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
    for (const k of ["entry_delay", "trigger_time", "night_enabled", "open_sensors"]) if (a[k] !== d[k]) n += 1;
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
    const modes = d.night_enabled ? ["home", "away", "night"] : ["home", "away"];
    const bad = new Set(this.invalid());
    const num = (key, value) => `<span class="ag-num ${bad.has(key) ? "bad" : ""}"><input type="number" min="0" max="${MAX}" step="1" inputmode="numeric" data-sys="num" data-key="${key}" value="${esc(value)}" aria-label="${esc(key)}"><span class="ag-t2">${esc(this._t("seconds"))}</span></span>`;
    const seg = `<div class="ag-seg small" data-seg="sys-open"><span class="ag-pill"></span>${[["block", "sysOpenBlock"], ["bypass", "sysOpenBypass"]]
      .map(([v, label]) => `<button data-sys="open" data-value="${v}" class="${d.open_sensors === v ? "on" : ""}">${esc(this._t(label))}</button>`).join("")}</div>`;
    const html = `<div class="ag-card ag-setlist">
        <div class="ag-setrow"><div class="ag-settx"><b>${esc(this._t("sysNight"))}</b><small>${esc(this._t("sysNightHint"))}</small></div>
          <button class="ag-toggle ${d.night_enabled ? "on" : ""}" data-sys="night" role="switch" aria-checked="${d.night_enabled}" aria-label="${esc(this._t("sysNight"))}"></button></div>
        <div class="ag-setrow"><div class="ag-settx"><b>${esc(this._t("sysExitDelay"))}</b><small>${esc(this._t("sysExitDelayHint"))}</small></div>
          <div class="ag-numgrid">${modes.map((m) => `<label class="ag-numlabel"><span class="ag-t2 ag-small">${esc(this._t(MODE_KEY[m]))}</span>${num(`exit_${m}`, d.exit_delay[m])}</label>`).join("")}</div></div>
        <div class="ag-setrow"><div class="ag-settx"><b>${esc(this._t("sysEntryDelay"))}</b><small>${esc(this._t("sysEntryDelayHint"))}</small></div>${num("entry_delay", d.entry_delay)}</div>
        <div class="ag-setrow"><div class="ag-settx"><b>${esc(this._t("sysTriggerTime"))}</b><small>${esc(this._t("sysTriggerTimeHint"))}</small></div>${num("trigger_time", d.trigger_time)}</div>
        <div class="ag-setrow"><div class="ag-settx"><b>${esc(this._t("sysOpen"))}</b></div>${seg}</div>
        <div class="ag-setrow"><div class="ag-settx"><b>${esc(this._t("sysCode"))}</b><small>${esc(this._t("sysCodeHint"))}</small></div>
          <button class="ag-btn" data-sys="code">${ic("cog", 18)}${esc(this._t("sysCodeOpen"))}</button></div></div>`;
    // Beim Tippen nie neu aufbauen (Cursor bliebe nicht stehen), nur bei Schaltern und Auswahl
    h._setHtml(form, html);
    h._placePills();
    this.renderFoot();
  }

  renderFoot() {
    const h = this.host;
    const foot = h._view?.querySelector(".ag-foot");
    if (!foot) return;
    const n = this.dirtyCount();
    const bad = this.invalid().length;
    let status;
    if (this.saveState === "saved" && !n) status = `<span class="ag-saved">${ic("check", 16)} ${esc(this._t("saved"))}</span>`;
    else if (this.saveState && this.saveState !== "saved") status = `<span class="ag-err">${esc(this.saveState)}</span>`;
    else if (bad) status = `<span class="ag-err">${esc(this._t("invalidNumber", { max: MAX }))}</span>`;
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
      const exit = d.night_enabled ? d.exit_delay : { home: d.exit_delay.home, away: d.exit_delay.away };
      await h._hass.callWS({ type: "alarmageddon/save_system", entry_id: s.entry_id, exit_delay: exit, entry_delay: d.entry_delay, trigger_time: d.trigger_time, night_enabled: d.night_enabled, open_sensors: d.open_sensors });
      Object.assign(s, { exit_delay: { ...s.exit_delay, ...exit }, entry_delay: d.entry_delay, trigger_time: d.trigger_time, night_enabled: d.night_enabled, open_sensors: d.open_sensors });
      if (d.night_enabled && !s.modes.includes("night")) s.modes = [...s.modes, "night"];
      if (!d.night_enabled) s.modes = s.modes.filter((m) => m !== "night");
      this.draft = null;
      this.saveState = "saved";
      h._fetch();
    } catch (err) {
      this.saveState = this._t("saveFailed", { message: errText(err) });
    } finally {
      this.saving = false;
      this.render();
    }
  }

  onClick(el) {
    const act = el?.dataset.sys;
    if (!act) return false;
    const d = this.ensureDraft();
    if (act === "night") {
      d.night_enabled = !d.night_enabled;
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
    } else {
      return false;
    }
    return true;
  }

  onInput(el) {
    if (el.dataset.sys !== "num") return false;
    const d = this.ensureDraft();
    const v = el.value === "" ? NaN : Number(el.value);
    const key = el.dataset.key;
    if (key.startsWith("exit_")) d.exit_delay[key.slice(5)] = v;
    else d[key] = v;
    this.saveState = null;
    el.closest(".ag-num")?.classList.toggle("bad", !Number.isInteger(v) || v < 0 || v > MAX);
    this.renderFoot();
    return true;
  }
}
