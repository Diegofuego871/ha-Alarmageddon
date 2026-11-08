// Konfiguration › Benachrichtigungen (für alle Anlagen): Empfänger getrennt für Alarme und Wartung, kritische Meldung
// mit Lautstärke, Ereignisse, Push-Aktion "Deaktivieren" (standardmässig aus, Sicherheitsregel), Testmeldung.

const V = new URL(import.meta.url).search;
const { ic, esc, errText } = await import(`./common.js${V}`);

const EVENTS = [["triggered", "evtTriggered"], ["pending", "evtPending"], ["armed", "evtArmed"], ["disarmed", "evtDisarmed"], ["arm_failed", "evtArmFailed"], ["sensor_offline", "evtSensorOffline"]];
const MAINT_EVENTS = [["battery_low", "evtBatteryLow"], ["sensor_unavailable", "evtUnavailable"]];
const RANGES = { battery_threshold: [5, 50], offline_minutes: [5, 1440] };

export class NotifyUi {
  constructor(host) {
    this.host = host;
    this.draft = null;
    this.saveState = null;
    this.saving = false;
  }

  _t(key, vars) {
    return this.host._t(key, vars);
  }

  get base() {
    return this.host._data?.notify || { alarm_targets: [], maintenance_targets: [], critical: true, volume: 0.8, events: {}, disarm_action: false, battery_threshold: 20, offline_minutes: 60 };
  }

  ensureDraft() {
    if (!this.draft) this.draft = JSON.parse(JSON.stringify(this.base));
    return this.draft;
  }

  reset() {
    this.draft = null;
    this.saveState = null;
  }

  dirtyCount() {
    if (!this.draft) return 0;
    const a = this.base;
    const d = this.draft;
    let n = 0;
    for (const k of ["alarm_targets", "maintenance_targets"]) if (JSON.stringify([...(a[k] || [])].sort()) !== JSON.stringify([...d[k]].sort())) n += 1;
    for (const k of ["critical", "disarm_action"]) if (a[k] !== d[k]) n += 1;
    if (Math.round((a.volume ?? 0) * 100) !== Math.round(d.volume * 100)) n += 1;
    for (const [k] of [...EVENTS, ...MAINT_EVENTS]) if (!!a.events?.[k] !== !!d.events[k]) n += 1;
    for (const k of Object.keys(RANGES)) if (a[k] !== d[k]) n += 1;
    return n;
  }

  invalid() {
    const d = this.draft;
    return d ? Object.entries(RANGES).filter(([k, [lo, hi]]) => !Number.isInteger(d[k]) || d[k] < lo || d[k] > hi).map(([k]) => k) : [];
  }

  html() {
    return `<div class="ag-nt"></div><div class="ag-foot"></div>`;
  }

  _targets(key) {
    const d = this.draft;
    const services = this.host._data?.notify_services || [];
    if (!services.length) return `<div class="ag-t2 ag-small">${esc(this._t("ntNoServices"))}</div>`;
    return `<div class="ag-zline">${services.map((s) => {
      const on = d[key].includes(s);
      return `<button class="ag-chip ${on ? "on" : ""}" data-nt="target" data-key="${key}" data-target="${esc(s)}" aria-pressed="${on}">${ic("bell", 16)}${esc(s.replace(/^notify\.(mobile_app_)?/, ""))}</button>`;
    }).join("")}</div>`;
  }

  render() {
    const h = this.host;
    const box = h._view?.querySelector(".ag-nt");
    const d = this.ensureDraft();
    if (!box) return;
    const toggle = (attr, on, label) => `<button class="ag-toggle ${on ? "on" : ""}" ${attr} role="switch" aria-checked="${on}" aria-label="${esc(label)}"></button>`;
    const dirty = this.dirtyCount() > 0;
    const bad = new Set(this.invalid());
    const num = (key, unit) => `<span class="ag-num ${bad.has(key) ? "bad" : ""}"><input type="number" min="${RANGES[key][0]}" max="${RANGES[key][1]}" step="1" inputmode="numeric" data-nt="num" data-key="${key}" value="${esc(d[key])}" aria-label="${esc(key)}"><span class="ag-t2">${esc(unit)}</span></span>`;
    const html = `<div class="ag-card ag-setlist">
        <div class="ag-setrow"><div class="ag-settx"><b>${esc(this._t("ntAlarmTargets"))}</b><small>${esc(this._t("ntAlarmTargetsHint"))}</small>${this._targets("alarm_targets")}</div></div>
        <div class="ag-setrow"><div class="ag-settx"><b>${esc(this._t("ntMaintTargets"))}</b><small>${esc(this._t("ntMaintTargetsHint"))}</small>${this._targets("maintenance_targets")}</div></div>
        <div class="ag-setrow"><div class="ag-settx"><b>${esc(this._t("ntCritical"))}</b><small>${esc(this._t("ntCriticalHint"))}</small></div>${toggle('data-nt="critical"', d.critical, this._t("ntCritical"))}</div>
        ${d.critical ? `<div class="ag-setrow"><div class="ag-settx"><b>${esc(this._t("ntVolume"))}: <span class="ag-vol">${Math.round(d.volume * 100)} %</span></b></div>
          <input type="range" min="0" max="100" step="5" data-nt="volume" value="${Math.round(d.volume * 100)}" aria-label="${esc(this._t("ntVolume"))}" class="ag-range"></div>` : ""}
        <div class="ag-setrow"><div class="ag-settx"><b>${esc(this._t("ntEvents"))}</b>
          <div class="ag-evgrid">${EVENTS.map(([k, label]) => `<label class="ag-colrow"><span>${esc(this._t(label))}</span>${toggle(`data-nt="event" data-key="${k}"`, !!d.events[k], this._t(label))}</label>`).join("")}</div></div></div>
        <div class="ag-setrow"><div class="ag-settx"><b>${esc(this._t("ntMaint"))}</b><small>${esc(this._t("ntMaintHint"))}</small>
          <div class="ag-evgrid">${MAINT_EVENTS.map(([k, label]) => `<label class="ag-colrow"><span>${esc(this._t(label))}</span>${toggle(`data-nt="event" data-key="${k}"`, !!d.events[k], this._t(label))}</label>`).join("")}
            <label class="ag-colrow"><span>${esc(this._t("ntThreshold"))}</span>${num("battery_threshold", "%")}</label>
            <label class="ag-colrow"><span>${esc(this._t("ntOfflineAfter"))}</span>${num("offline_minutes", this._t("minutes"))}</label></div></div></div>
        <div class="ag-setrow"><div class="ag-settx"><b>${esc(this._t("ntDisarmAction"))}</b><small class="ag-warntext">${ic("alert", 14)} ${esc(this._t("ntDisarmActionHint"))}</small></div>${toggle('data-nt="disarm"', d.disarm_action, this._t("ntDisarmAction"))}</div>
        <div class="ag-setrow"><div class="ag-settx"><b>${esc(this._t("ntTest"))}</b>${dirty ? `<small>${esc(this._t("wfSaveFirst"))}</small>` : ""}</div>
          <button class="ag-btn" data-nt="test" data-group="alarm" ${dirty ? "disabled" : ""}>${ic("bell", 18)}${esc(this._t("ntTestAlarm"))}</button>
          <button class="ag-btn" data-nt="test" data-group="maintenance" ${dirty ? "disabled" : ""}>${ic("bell", 18)}${esc(this._t("ntTestMaint"))}</button></div></div>`;
    h._setHtml(box, html);
    this.renderFoot();
  }

  renderFoot() {
    const h = this.host;
    const foot = h._view?.querySelector(".ag-foot");
    if (!foot) return;
    const n = this.dirtyCount();
    const bad = this.invalid().length;
    let status;
    if (bad) status = `<span class="ag-err">${esc(this._t("ntInvalid"))}</span>`;
    else if (this.saveState === "saved" && !n) status = `<span class="ag-saved">${ic("check", 16)} ${esc(this._t("saved"))}</span>`;
    else if (this.saveState && this.saveState !== "saved") status = `<span class="ag-err">${esc(this.saveState)}</span>`;
    else status = `<span class="ag-t2">${esc(n === 0 ? this._t("noChanges") : n === 1 ? this._t("change") : this._t("changes", { count: n }))}</span>`;
    h._setHtml(foot, `${status}<span class="ag-grow"></span><button class="ag-btn" data-nt="cancel" ${n ? "" : "disabled"}>${esc(this._t("cancel"))}</button>
      <button class="ag-btn primary" data-nt="save" ${n && !bad && !this.saving ? "" : "disabled"}>${ic("check", 18)}${esc(this._t("save"))}</button>`);
  }

  async save() {
    const h = this.host;
    if (!this.draft || this.saving || this.invalid().length) return;
    this.saving = true;
    this.renderFoot();
    try {
      const result = await h._hass.callWS({ type: "alarmageddon/save_notify", notify: this.draft });
      if (h._data) h._data.notify = result?.notify || JSON.parse(JSON.stringify(this.draft));
      this.draft = null;
      this.saveState = "saved";
    } catch (err) {
      this.saveState = this._t("saveFailed", { message: errText(err) });
    } finally {
      this.saving = false;
      this.render();
    }
  }

  async test(group) {
    const h = this.host;
    try {
      const result = await h._hass.callWS({ type: "alarmageddon/test_notify", group });
      const n = result?.targets?.length || 0;
      h._toast(n ? this._t("ntTestSent", { count: n }) : this._t("ntTestNone"));
    } catch (err) {
      h._toast(this._t("errGeneric", { message: errText(err) }));
    }
  }

  onClick(el) {
    const act = el?.dataset.nt;
    if (!act) return false;
    const d = this.ensureDraft();
    if (act === "target") {
      const key = el.dataset.key;
      const t = el.dataset.target;
      d[key] = d[key].includes(t) ? d[key].filter((x) => x !== t) : [...d[key], t];
    } else if (act === "critical") d.critical = !d.critical;
    else if (act === "event") d.events[el.dataset.key] = !d.events[el.dataset.key];
    else if (act === "disarm") d.disarm_action = !d.disarm_action;
    else if (act === "cancel") this.draft = null;
    else if (act === "save") return this.save(), true;
    else if (act === "test") return this.test(el.dataset.group), true;
    else return false;
    this.saveState = null;
    this.render();
    return true;
  }

  onInput(el) {
    if (el.dataset.nt === "num") {
      const d = this.ensureDraft();
      const key = el.dataset.key;
      d[key] = el.value === "" ? NaN : Number(el.value);
      this.saveState = null;
      const [lo, hi] = RANGES[key];
      el.closest(".ag-num")?.classList.toggle("bad", !Number.isInteger(d[key]) || d[key] < lo || d[key] > hi);
      this.renderFoot();
      return true;
    }
    if (el.dataset.nt !== "volume") return false;
    this.ensureDraft().volume = Number(el.value) / 100;
    this.saveState = null;
    const label = this.host._view.querySelector(".ag-vol");
    if (label) label.textContent = `${el.value} %`;
    this.renderFoot();
    return true;
  }
}
