// Konfiguration › Meldungen (für alle Anlagen), in Kapiteln: Empfänger (Dropdown, gewählte als Pille mit x, getrennt für Alarme und
// Wartung), Alarmmeldungen und Wartungsmeldungen (je Art an/aus, kritisch ja/nein und Lautstärke, Testmeldung), Knöpfe in der
// Meldung. Entwurf mit "Speichern"; Testmeldungen gehen mit dem gespeicherten Stand hinaus.

const V = new URL(import.meta.url).search;
const { ic, esc, errText, chapter } = await import(`./common.js${V}`);

// Arten je Gruppe in der Reihenfolge der Anzeige, mit Symbol
const GROUPS = {
  alarm: [["triggered", "alert"], ["sensor_report", "bell"], ["sensor_offline", "offline"], ["pending", "timer"], ["arm_failed", "doorOpen"], ["armed", "shieldAway"], ["disarmed", "shieldOff"]],
  maintenance: [["battery_low", "battery"], ["sensor_unavailable", "offline"], ["update_available", "verUp"]],
};
const TARGET_KEY = { alarm: "alarm_targets", maintenance: "maintenance_targets" };
const RANGES = { battery_threshold: [5, 50], offline_minutes: [5, 1440] };
// Arten mit einem Zahlenfeld: Schlüssel, Beschriftung, Einheit
const NUMBERS = { battery_low: ["battery_threshold", "ntThreshold", "%"], sensor_unavailable: ["offline_minutes", "ntOfflineAfter", "minutes"] };
const KINDS = [...GROUPS.alarm, ...GROUPS.maintenance].map(([k]) => k);

const short = (s) => s.replace(/^notify\.(mobile_app_)?/, "");

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
    const types = Object.fromEntries(KINDS.map((k) => [k, { enabled: true, critical: false, volume: 0.8 }]));
    return this.host._data?.notify || { alarm_targets: [], maintenance_targets: [], types, disarm_action: false, battery_threshold: 20, offline_minutes: 60 };
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
    for (const k of Object.values(TARGET_KEY)) if (JSON.stringify([...(a[k] || [])].sort()) !== JSON.stringify([...d[k]].sort())) n += 1;
    for (const kind of KINDS) {
      const x = a.types?.[kind] || {};
      const y = d.types[kind];
      if (!!x.enabled !== !!y.enabled || !!x.critical !== !!y.critical || Math.round((x.volume ?? 0) * 100) !== Math.round(y.volume * 100)) n += 1;
    }
    if (a.disarm_action !== d.disarm_action) n += 1;
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

  // ----- Empfänger: Dropdown zum Hinzufügen, gewählte als Pille mit x -----

  _recipients(group) {
    const d = this.draft;
    const key = TARGET_KEY[group];
    const services = this.host._data?.notify_services || [];
    const chosen = d[key];
    const free = services.filter((s) => !chosen.includes(s));
    // Auch ein gewählter Dienst, den es nicht mehr gibt, bleibt sichtbar (und lässt sich entfernen)
    const pills = chosen.map((s) => `<span class="ag-rpill ${services.includes(s) ? "" : "gone"}">${ic("bell", 14)}<span>${esc(short(s))}</span><button type="button" class="ag-rx" data-nt="target-del" data-key="${key}" data-target="${esc(s)}" aria-label="${esc(this._t("ntRemove", { name: short(s) }))}">${ic("close", 14)}</button></span>`).join("");
    const select = services.length
      ? `<select class="ag-input ag-rsel" data-nt="target-add" data-key="${key}" aria-label="${esc(this._t("ntAdd"))}" ${free.length ? "" : "disabled"}>
          <option value="">${esc(this._t(free.length ? "ntAdd" : "ntAllChosen"))}</option>${free.map((s) => `<option value="${esc(s)}">${esc(short(s))}</option>`).join("")}</select>`
      : `<div class="ag-t2 ag-small">${esc(this._t("ntNoServices"))}</div>`;
    const none = !chosen.length && services.length ? `<small class="ag-warntext">${ic("alert", 14)} ${esc(this._t("ntNoneChosen"))}</small>` : "";
    return `<div class="ag-setrow ag-recip"><div class="ag-settx"><b>${esc(this._t(group === "alarm" ? "ntAlarmTargets" : "ntMaintTargets"))}</b><small>${esc(this._t(group === "alarm" ? "ntAlarmTargetsHint" : "ntMaintTargetsHint"))}</small>
        <div class="ag-rline">${select}</div>${pills ? `<div class="ag-rpills">${pills}</div>` : ""}${none}</div></div>`;
  }

  // ----- Eine Meldungsart -----

  _type(kind, icon, dirty) {
    const d = this.draft;
    const s = d.types[kind];
    const toggle = (attr, on, label) => `<button class="ag-toggle ${on ? "on" : ""}" ${attr} role="switch" aria-checked="${on}" aria-label="${esc(label)}"></button>`;
    const name = this._t(`ntT_${kind}`);
    const pct = Math.round(s.volume * 100);
    let body = "";
    if (s.enabled) {
      const num = NUMBERS[kind];
      const bad = new Set(this.invalid());
      body = `<div class="ag-mt-body">
        <div class="ag-mt-opt"><span>${esc(this._t("ntCriticalShort"))}</span>${toggle(`data-nt="critical" data-kind="${kind}"`, s.critical, `${name}: ${this._t("ntCriticalShort")}`)}</div>
        ${s.critical ? `<div class="ag-mt-opt vol"><span>${esc(this._t("ntVolumeShort"))}: <b class="ag-vol" data-kind="${kind}">${pct} %</b></span>
          <input type="range" min="0" max="100" step="5" data-nt="volume" data-kind="${kind}" value="${pct}" class="ag-range" aria-label="${esc(`${name}: ${this._t("ntVolumeShort")}`)}"></div>` : ""}
        ${num ? `<div class="ag-mt-opt"><span>${esc(this._t(num[1]))}</span><span class="ag-num ${bad.has(num[0]) ? "bad" : ""}"><input type="number" min="${RANGES[num[0]][0]}" max="${RANGES[num[0]][1]}" step="1" inputmode="numeric" data-nt="num" data-key="${num[0]}" value="${esc(d[num[0]])}" aria-label="${esc(this._t(num[1]))}"><span class="ag-t2">${esc(num[2] === "minutes" ? this._t("minutes") : num[2])}</span></span></div>` : ""}
        <div class="ag-mt-opt"><span class="ag-t2 ag-small">${esc(this._t("ntTestHint"))}</span>
          <button class="ag-btn" data-nt="test" data-kind="${kind}" ${dirty ? "disabled" : ""} title="${esc(dirty ? this._t("wfSaveFirst") : this._t("ntTestType"))}">${ic("play", 16)}${esc(this._t("ntTestType"))}</button></div></div>`;
    }
    return `<div class="ag-mt ${s.enabled ? "" : "off"}"><div class="ag-mt-head"><span class="ag-mini ${kind === "triggered" ? "err" : ""}">${ic(icon, 16)}</span>
        <div class="ag-settx"><b>${esc(name)}</b><small>${esc(this._t(`ntH_${kind}`))}</small></div>
        ${toggle(`data-nt="enabled" data-kind="${kind}"`, s.enabled, name)}</div>${body}</div>`;
  }

  render() {
    const h = this.host;
    const box = h._view?.querySelector(".ag-nt");
    const d = this.ensureDraft();
    if (!box) return;
    const dirty = this.dirtyCount() > 0;
    const card = (rows) => `<div class="ag-card ag-setlist">${rows}</div>`;
    const list = (group) => GROUPS[group].map(([kind, icon]) => this._type(kind, icon, dirty)).join("");
    const html = chapter(this._t("ntChapRecipients"), card(this._recipients("alarm") + this._recipients("maintenance")), this._t("ntChapRecipientsHint"))
      + chapter(this._t("ntChapAlarm"), `<div class="ag-card ag-mtlist">${list("alarm")}</div>`, this._t("ntChapAlarmHint"))
      + chapter(this._t("ntChapMaint"), `<div class="ag-card ag-mtlist">${list("maintenance")}</div>`, this._t("ntChapMaintHint"))
      + chapter(this._t("ntChapButtons"), card(`<div class="ag-setrow"><div class="ag-settx"><b>${esc(this._t("ntDisarmAction"))}</b><small class="ag-warntext">${ic("alert", 14)} ${esc(this._t("ntDisarmActionHint"))}</small></div>
          <button class="ag-toggle ${d.disarm_action ? "on" : ""}" data-nt="disarm" role="switch" aria-checked="${d.disarm_action}" aria-label="${esc(this._t("ntDisarmAction"))}"></button></div>`));
    h._setHtml(box, html);
    this.renderFoot();
  }

  renderFoot() {
    const h = this.host;
    h._renderDots?.(); // Punkt "ungespeichert" an den Reitern
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
    // Testmeldungen gehen mit dem gespeicherten Stand hinaus: mit offenen Änderungen gesperrt
    h._view.querySelectorAll('[data-nt="test"]').forEach((b) => (b.disabled = n > 0));
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

  async test(kind) {
    const h = this.host;
    try {
      const result = await h._hass.callWS({ type: "alarmageddon/test_notify", kind });
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
    if (act === "target-del") {
      d[el.dataset.key] = d[el.dataset.key].filter((x) => x !== el.dataset.target);
    } else if (act === "enabled") d.types[el.dataset.kind].enabled = !d.types[el.dataset.kind].enabled;
    else if (act === "critical") d.types[el.dataset.kind].critical = !d.types[el.dataset.kind].critical;
    else if (act === "disarm") d.disarm_action = !d.disarm_action;
    else if (act === "cancel") this.draft = null;
    else if (act === "save") return this.save(), true;
    else if (act === "test") return this.test(el.dataset.kind), true;
    else return false;
    this.saveState = null;
    this.render();
    return true;
  }

  onInput(el) {
    const act = el.dataset.nt;
    if (act === "target-add") {
      if (!el.value) return true;
      const d = this.ensureDraft();
      d[el.dataset.key] = [...d[el.dataset.key], el.value];
      this.saveState = null;
      this.render();
      return true;
    }
    if (act === "num") {
      const d = this.ensureDraft();
      const key = el.dataset.key;
      d[key] = el.value === "" ? NaN : Number(el.value);
      this.saveState = null;
      const [lo, hi] = RANGES[key];
      el.closest(".ag-num")?.classList.toggle("bad", !Number.isInteger(d[key]) || d[key] < lo || d[key] > hi);
      this.renderFoot();
      return true;
    }
    if (act === "volume") {
      const kind = el.dataset.kind;
      this.ensureDraft().types[kind].volume = Number(el.value) / 100;
      this.saveState = null;
      const label = this.host._view.querySelector(`.ag-vol[data-kind="${kind}"]`);
      if (label) label.textContent = `${el.value} %`;
      this.renderFoot();
      return true;
    }
    return false;
  }
}
