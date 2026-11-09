// Konfiguration › Aktionen: pro Anlage und Alarm (Modus Anwesend, Abwesend, Nacht, "immer aktiv") ein Ablauf als Zeitachse.
// Bausteine: Push-Meldung, Gerät schalten (mit dem, was das Gerät kann), Alarmton, Warten, Szene oder Skript, weitere Aktion
// (jeder Dienst von Home Assistant mit seinen Feldern, kein JSON). Gespeichert werden Schritte im Format des Servers
// (workflow.py); Entwurf mit "Speichern". Schritte lassen sich am Griff ziehen und einzeln testen.

const V = new URL(import.meta.url).search;
const { ic, esc, MODE_ICON, MODE_KEY, errText } = await import(`./common.js${V}`);

// ----- Geräte und ihre Aktionen (wie die Routinen in Device Panel): Domäne -> Aktion -> Dienst -----
const COMMON = { on: "turn_on", off: "turn_off", toggle: "toggle" };
const DEVICE = {
  switch: COMMON, light: COMMON, fan: COMMON, input_boolean: COMMON, siren: COMMON, humidifier: COMMON, climate: COMMON, media_player: COMMON,
  cover: { on: "open_cover", off: "close_cover", toggle: "toggle" },
  valve: { on: "open_valve", off: "close_valve", toggle: "toggle" },
  lock: { on: "lock", off: "unlock" },
};
const MIXED = { on: "turn_on", off: "turn_off", toggle: "toggle" }; // gemischte Geräte: homeassistant.turn_on usw.
const ACTION_LABEL = {
  cover: { on: "actOpen", off: "actClose", toggle: "actToggle" },
  valve: { on: "actOpen", off: "actClose", toggle: "actToggle" },
  lock: { on: "actLock", off: "actUnlock" },
};
const ACTION_ICON = { on: "power", off: "powerOff", toggle: "restore" };
const cap = (domain, action) => ACTION_LABEL[domain]?.[action] || { on: "actOn", off: "actOff", toggle: "actToggle" }[action];
const SOUND_LEN = { siren: 4, beep: 3, klaxon: 3, warning: 2, chime: 2 }; // Länge der Töne in Sekunden (wie der Server)
const SOUND_KEY = { siren: "sndSiren", beep: "sndBeep", klaxon: "sndKlaxon", warning: "sndWarning", chime: "sndChime" };
const SCENE_DOMAINS = ["scene", "script"];

export const KINDS = [
  { kind: "notify", icon: "bell", label: "stepNotify", hint: "stepNotifyHint" },
  { kind: "device", icon: "power", label: "stepDevice", hint: "stepDeviceHint" },
  { kind: "sound", icon: "speaker", label: "stepSound", hint: "stepSoundHint" },
  { kind: "wait", icon: "timer", label: "stepWait", hint: "stepWaitHint" },
  { kind: "scene", icon: "script", label: "stepScene", hint: "stepSceneHint" },
  { kind: "custom", icon: "cog", label: "stepCustom", hint: "stepCustomHint" },
];

const OPTION_KEYS = { light: ["brightness_pct", "color_temp_kelvin"], cover: ["position"], climate: ["temperature", "hvac_mode"], fan: ["percentage"] };

// ----- Schritt des Servers <-> Formular -----

const blank = () => ({ kind: "custom", targets: [], restore: false, seconds: 30, detach: false, ntTitle: "", ntMessage: "", ntCritical: null, ntVolume: null, ntButtons: {}, ntClick: null, ntClickPath: "", until: false, playSeconds: 30, sound: "siren", setVolume: true, volume: 0.7, repeat: 3, action: "on", opts: {}, optsOn: {}, domain: "", service: "", data: {}, extra: {} });

export function fromStep(step) {
  return { ...fromStepBase(step), detach: !!step.detach };
}

function fromStepBase(step) {
  const f = blank();
  if (step.type === "notify") return { ...f, kind: "notify", ntTitle: step.title || "", ntMessage: step.message || "", ntCritical: step.critical ?? null, ntVolume: step.volume ?? null, ntButtons: { ...(step.buttons || {}) }, ntClick: step.click ?? null, ntClickPath: step.click_path || "" };
  if (step.type === "wait") return { ...f, kind: "wait", seconds: step.seconds };
  if (step.type === "sound") {
    return { ...f, kind: "sound", targets: [...step.players], sound: step.sound, setVolume: step.volume != null, volume: step.volume ?? 0.7, repeat: step.repeat || 1, until: step.duration === 0, playSeconds: step.duration ? step.duration : Math.max(5, (step.repeat || 1) * (SOUND_LEN[step.sound] || 4)), restore: step.restore !== false };
  }
  const action = String(step.action || "");
  const [domain, service] = action.split(".");
  const data = { ...(step.data || {}) };
  const keys = Object.keys(data);
  const base = { ...f, targets: [...(step.target || [])], restore: !!step.restore, domain, service };
  if ((action === "scene.turn_on" || action === "script.turn_on") && !keys.length) return { ...base, kind: "scene" };
  const act = DEVICE[domain] && Object.keys(DEVICE[domain]).find((a) => DEVICE[domain][a] === service);
  if (act && !keys.length) return { ...base, kind: "device", action: act };
  const mixed = domain === "homeassistant" && Object.keys(MIXED).find((a) => MIXED[a] === service);
  if (mixed && !keys.length) return { ...base, kind: "device", action: mixed };
  // Einstellungen, die ein Gerät kann (ein Dienstaufruf genügt)
  const only = (allowed) => keys.length > 0 && keys.every((k) => allowed.includes(k));
  const withOpts = (optData) => ({ ...base, kind: "device", action: "on", opts: optData, optsOn: Object.fromEntries(Object.keys(optData).map((k) => [k, true])) });
  if (domain === "light" && service === "turn_on" && only(OPTION_KEYS.light)) return withOpts(data);
  if (domain === "fan" && service === "turn_on" && only(OPTION_KEYS.fan)) return withOpts(data);
  if (domain === "cover" && service === "set_cover_position" && only(["position"])) return withOpts(data);
  if (domain === "climate" && service === "set_temperature" && only(["temperature", "hvac_mode"])) return withOpts(data);
  return { ...base, kind: "custom", data };
}

export function toStep(f) {
  const step = toStepBase(f);
  // Nicht abwarten gilt nur für Schritte, die etwas ausführen (nicht für Warten und Meldung)
  if (f.detach && (step.type === "action" || step.type === "sound")) step.detach = true;
  return step;
}

// Leer = Standardtext des Servers (folgt der Sprache); der Editor zeigt den Standard, speichert ihn aber nicht
export const NOTIFY_TOKENS = ["{name}", "{sensor}", "{time}", "{mode}"];

function toStepBase(f) {
  if (f.kind === "notify") {
    const out = { type: "notify" };
    const title = String(f.ntTitle || "").trim();
    const message = String(f.ntMessage || "").trim();
    if (title) out.title = title;
    if (message) out.message = message;
    if (f.ntCritical !== null && f.ntCritical !== undefined) out.critical = !!f.ntCritical;
    if (f.ntVolume !== null && f.ntVolume !== undefined) out.volume = Math.min(1, Math.max(0, Number(f.ntVolume)));
    if (Object.keys(f.ntButtons || {}).length) out.buttons = { ...f.ntButtons };
    if (f.ntClick) {
      out.click = f.ntClick;
      if (f.ntClick === "custom") out.click_path = String(f.ntClickPath || "").trim();
    }
    return out;
  }
  if (f.kind === "wait") return { type: "wait", seconds: Math.max(0, Math.round(Number(f.seconds) || 0)) };
  if (f.kind === "sound") {
    return { type: "sound", players: f.targets, sound: f.sound, volume: f.setVolume ? Number(f.volume) : null, duration: f.until ? 0 : Math.min(3600, Math.max(1, Math.round(Number(f.playSeconds) || 1))), restore: !!f.restore };
  }
  if (f.kind === "scene") return { type: "action", action: `${f.targets[0].split(".")[0]}.turn_on`, target: [f.targets[0]], data: {}, restore: false };
  if (f.kind === "device") {
    const domains = [...new Set(f.targets.map((e) => e.split(".")[0]))];
    const single = domains.length === 1 ? domains[0] : null;
    let action = single ? `${single}.${DEVICE[single][f.action]}` : `homeassistant.${MIXED[f.action]}`;
    const data = {};
    if (single && f.action === "on") {
      const on = (k) => f.optsOn[k] && f.opts[k] != null && f.opts[k] !== "";
      if (single === "cover" && on("position")) action = "cover.set_cover_position";
      if (single === "climate" && (on("temperature") || on("hvac_mode"))) action = "climate.set_temperature";
      for (const k of OPTION_KEYS[single] || []) if (on(k)) data[k] = f.opts[k];
    }
    return { type: "action", action, target: f.targets, data, restore: !!f.restore };
  }
  // Weitere Aktion: nur Werte der Felder, die ausgefüllt sind; unbekannte Werte aus einem früheren Schritt bleiben erhalten
  const data = {};
  for (const [k, v] of Object.entries({ ...f.extra, ...f.data })) if (v !== "" && v != null && !(typeof v === "number" && Number.isNaN(v))) data[k] = v;
  return { type: "action", action: `${f.domain}.${f.service}`, target: f.targets, data, restore: !!f.restore };
}

// ----- Was ein Gerät kann, aus seinem Zustand -----

function deviceOptions(states, targets) {
  const domains = [...new Set(targets.map((e) => e.split(".")[0]))];
  if (domains.length !== 1 || !OPTION_KEYS[domains[0]]) return [];
  const domain = domains[0];
  const sts = targets.map((e) => states[e]).filter(Boolean);
  if (!sts.length || sts.some((s) => s.state === "unavailable")) return [];
  const all = (fn) => sts.every(fn);
  const feats = (s) => Number(s.attributes?.supported_features) || 0;
  const out = [];
  if (domain === "light") {
    const modes = (s) => s.attributes?.supported_color_modes || [];
    if (all((s) => modes(s).some((m) => m !== "onoff"))) out.push({ key: "brightness_pct", type: "percent", label: "optBrightness", min: 1, max: 100 });
    if (all((s) => modes(s).includes("color_temp"))) {
      const lo = Math.max(...sts.map((s) => Number(s.attributes.min_color_temp_kelvin) || 2000));
      const hi = Math.min(...sts.map((s) => Number(s.attributes.max_color_temp_kelvin) || 6500));
      out.push({ key: "color_temp_kelvin", type: "kelvin", label: "optColorTemp", min: lo, max: Math.max(lo, hi), step: 100 });
    }
  } else if (domain === "cover") {
    if (all((s) => feats(s) & 4)) out.push({ key: "position", type: "percent", label: "optPosition", min: 0, max: 100 });
  } else if (domain === "fan") {
    if (all((s) => feats(s) & 1)) out.push({ key: "percentage", type: "percent", label: "optPercentage", min: 1, max: 100 });
  } else if (domain === "climate") {
    if (all((s) => feats(s) & 1)) {
      const lo = Math.max(...sts.map((s) => Number(s.attributes.min_temp) || 7));
      const hi = Math.min(...sts.map((s) => Number(s.attributes.max_temp) || 35));
      out.push({ key: "temperature", type: "temperature", label: "optTemperature", min: lo, max: Math.max(lo, hi), step: Number(sts[0].attributes.target_temp_step) || 0.5 });
    }
    const modes = (sts[0].attributes.hvac_modes || []).filter((m) => sts.every((s) => (s.attributes.hvac_modes || []).includes(m)) && m !== "off");
    if (modes.length) out.push({ key: "hvac_mode", type: "choice", label: "optHvac", values: modes });
  }
  return out;
}

// ----- Felder eines Dienstes von Home Assistant (hass.services) -----

function flatFields(fields, out = {}) {
  for (const [key, value] of Object.entries(fields || {})) {
    if (value && value.selector) out[key] = value;
    else if (value && value.fields) flatFields(value.fields, out);
    else if (value) out[key] = value;
  }
  return out;
}

const selectorType = (field) => Object.keys(field?.selector || {})[0] || "text";
const SIMPLE_SELECTORS = ["boolean", "number", "select", "text", "entity", "color_temp", "duration", "time", "date", "datetime", "icon", "url"];
const normalizeOptions = (opts) => (opts || []).map((o) => (typeof o === "object" ? { value: String(o.value), label: o.label || String(o.value) } : { value: String(o), label: String(o) }));

export class ActionsUi {
  constructor(host) {
    this.host = host;
    this.trigger = host._loadPref("trigger", "away");
    this.draft = null;
    this.saveState = null;
    this.saving = false;
    this.edit = null; // { index, insert, form, q, error, open }
    this.drag = null;
    this.previewing = null; // URL des Tons, der gerade auf diesem Gerät läuft
    this._comboPointer = false;
  }

  _t(key, vars) {
    return this.host._t(key, vars);
  }

  get system() {
    return this.host._system();
  }

  triggers(s = this.system) {
    return [...(s?.modes || ["home", "away"]), "always"];
  }

  ensureDraft() {
    const s = this.system;
    if (!s) return null;
    if (!this.draft || this.draft.entry !== s.entry_id) this.draft = { entry: s.entry_id, wf: JSON.parse(JSON.stringify(s.workflows || {})), end: { ...(s.workflow_end || {}) } };
    if (!this.triggers(s).includes(this.trigger)) this.trigger = "away";
    return this.draft;
  }

  reset() {
    this.draft = null;
    this.saveState = null;
    this.edit = null;
  }

  steps() {
    return this.ensureDraft()?.wf[this.trigger] || [];
  }

  dirtyCount() {
    const s = this.system;
    const d = this.draft;
    if (!s || !d || d.entry !== s.entry_id) return 0;
    const all = new Set([...Object.keys(s.workflows || {}), ...Object.keys(d.wf)]);
    let n = 0;
    for (const k of all) {
      const endOf = (m) => (m || {})[k] || "restore_marked";
      if (JSON.stringify((s.workflows || {})[k] || []) !== JSON.stringify(d.wf[k] || []) || endOf(s.workflow_end) !== endOf(d.end)) n += 1;
    }
    return n;
  }

  html() {
    return `<div class="ag-wf-head"></div><div class="ag-wf"></div><div class="ag-foot"></div>`;
  }

  render() {
    const h = this.host;
    this.loadTranslations();
    const head = h._view?.querySelector(".ag-wf-head");
    const body = h._view?.querySelector(".ag-wf");
    const s = this.system;
    if (!head || !body || !this.ensureDraft()) return;
    const triggers = this.triggers(s).map((t) => [t, t === "always" ? this._t("wfAlways") : this._t(MODE_KEY[t]), t === "always" ? "flash" : MODE_ICON[t]]);
    const running = s.workflow_running;
    const dirty = this.dirtyCount() > 0;
    const testBtn = running && s.workflow_test
      ? `<button class="ag-btn" data-wf="test-stop">${ic("stop", 18)}${esc(this._t("wfTestStop"))}</button>`
      : `<button class="ag-btn" data-wf="test" ${dirty || running || !this.steps().length ? "disabled" : ""} title="${esc(dirty ? this._t("wfSaveFirst") : this._t("wfTestHint"))}">${ic("play", 18)}${esc(this._t("wfTest"))}</button>`;
    const status = running ? `<span class="ag-tag ${s.workflow_test ? "warn" : "err"}">${esc(this._t(s.workflow_test ? "wfTestRunning" : "wfAlarmRunning"))}</span>` : "";
    h._setHtml(head, `<div class="ag-tools"><span class="ag-t2">${esc(this._t("wfFor"))}</span>${h._segHtml("wf-trigger", triggers, this.trigger, "data-trigger", "small")}<span class="ag-grow"></span>${status}${testBtn}</div>
      ${this.trigger === "always" ? `<div class="ag-t2 ag-small" style="margin:-6px 4px 0">${esc(this._t("wfAlwaysHint"))}</div>` : ""}`);
    const steps = this.steps();
    // Nach einem Schritt, der nebenher läuft, ist die Verbindung gestrichelt: der nächste Schritt startet sofort
    const plus = (i) => `<div class="ag-wf-plus ${steps[i - 1]?.detach && ["action", "sound"].includes(steps[i - 1].type) ? "par" : ""}"><button class="ag-wf-add" data-wf="add" data-at="${i}" aria-label="${esc(this._t("wfAdd"))}">${ic("plus", 18)}</button></div>`;
    const cards = steps.map((step, i) => this._card(step, i, running)).map((c, i) => c + plus(i + 1)).join("");
    h._setHtml(body, `<div class="ag-wf-line">
        <div class="ag-wf-start"><span class="ag-mini err">${ic("alert", 16)}</span>${esc(this._t("wfStart"))}</div>${plus(0)}
        ${steps.length ? cards : `<div class="ag-card ag-empty ag-wf-empty"><span class="ag-t2">${esc(this._t("wfEmpty"))}</span><button class="ag-btn primary" data-wf="add" data-at="0">${ic("plus", 18)}${esc(this._t("wfAdd"))}</button></div>`}
        ${this._endHtml()}
      </div>`);
    h._placePills();
    this.renderFoot();
  }

  // Festes Ende des Ablaufs: "Alarm endet" (Deaktivieren/Quittieren) mit der Wahl, was mit den Geräten geschieht
  _endHtml() {
    const cur = this.draft?.end?.[this.trigger] || "restore_marked";
    const opts = ["restore_marked", "restore_all", "stop_only"];
    return `<div class="ag-wf-end"><div class="ag-wf-start"><span class="ag-mini ok">${ic("check", 16)}</span>${esc(this._t("wfEnd"))}</div>
      <div class="ag-card ag-wf-endcard"><div class="ag-ef-l">${esc(this._t("wfEndTitle"))}</div>
        <select class="ag-input" data-wf="end" aria-label="${esc(this._t("wfEndTitle"))}">${opts.map((o) => `<option value="${o}" ${cur === o ? "selected" : ""}>${esc(this._t(`wfEnd_${o}`))}</option>`).join("")}</select>
        <div class="ag-ef-h">${esc(this._t(`wfEnd_${cur}_hint`))}</div></div></div>`;
  }

  // Kurzfassung eines Schritts für die Karte
  _summary(f) {
    const text = this._summaryBase(f);
    return f.detach && ["device", "sound", "scene", "custom"].includes(f.kind) ? `${text} · ${this._t("wfDetachedMark")}` : text;
  }

  _summaryBase(f) {
    const names = f.targets.map((id) => this.host._name(id)).join(", ") || this._t("stepNoTargets");
    if (f.kind === "notify") return f.ntTitle || f.ntMessage ? [f.ntTitle, f.ntMessage].filter(Boolean).join(" – ") : this._t("stepNotifyHint");
    if (f.kind === "wait") return this._t("stepWaitSummary", { seconds: f.seconds });
    if (f.kind === "sound") return `${this._t(SOUND_KEY[f.sound] || "sndSiren")} · ${names}${f.setVolume ? ` · ${Math.round(f.volume * 100)} %` : ""}· ${f.until ? this._t("fldPlayUntilShort") : this._t("durS", { n: f.playSeconds })}`;
    if (f.kind === "scene") return names;
    if (f.kind === "device") {
      const domains = new Set(f.targets.map((e) => e.split(".")[0]));
      const word = this._t(cap(domains.size === 1 ? [...domains][0] : "", f.action));
      const opts = Object.entries(f.optsOn).filter(([, on]) => on).map(([k]) => this._optText(k, f.opts[k])).filter(Boolean);
      return [word, names, ...opts].join(" · ");
    }
    return `${this._serviceName(f.domain, f.service)} · ${names}`;
  }

  _optText(key, value) {
    if (value == null || value === "") return "";
    if (key === "brightness_pct" || key === "position" || key === "percentage") return `${value} %`;
    if (key === "color_temp_kelvin") return `${value} K`;
    if (key === "temperature") return `${value} °`;
    return String(value);
  }

  _card(step, i, running) {
    const f = fromStep(step);
    const k = KINDS.find((x) => x.kind === f.kind);
    const restore = (f.kind === "sound" || f.restore) && f.kind !== "notify" && f.kind !== "wait" ? `<span class="ag-tag none" title="${esc(this._t("wfRestoreMark"))}">${ic("restore", 12)}</span>` : "";
    const title = f.kind === "custom" ? this._serviceName(f.domain, f.service) : this._t(k.label);
    return `<div class="ag-card ag-wf-step" data-index="${i}">
      <button class="ag-handle" data-wf="grab" data-index="${i}" aria-label="${esc(this._t("stepGrab"))}" title="${esc(this._t("stepGrab"))}">${ic("grip", 20)}</button>
      <span class="ag-wf-icon k-${f.kind}">${ic(k.icon, 20)}</span>
      <div class="ag-wf-text"><b>${esc(title)}</b> ${restore}<div class="ag-t2 ag-small">${esc(this._summary(f))}</div>${this._flowChip(f, i)}</div>
      <div class="ag-wf-btns"><button class="ag-iconbtn" data-wf="test-step" data-index="${i}" ${running ? "disabled" : ""} aria-label="${esc(this._t("stepTest"))}" title="${esc(running ? this._t("stepTestBusy") : this._t("stepTest"))}">${ic("play", 18)}</button>
        <button class="ag-iconbtn" data-wf="edit" data-index="${i}" aria-label="${esc(this._t("stepEdit"))}">${ic("pencil", 18)}</button>
        <button class="ag-iconbtn" data-wf="delete" data-index="${i}" aria-label="${esc(this._t("stepDelete"))}">${ic("trash", 18)}</button></div></div>`;
  }

  // Ablauf auf einen Blick: wartet der Ablauf auf das Ende dieses Schritts oder läuft er nebenher? Ein Tipp schaltet um.
  _flowChip(f, i) {
    if (!["device", "sound", "scene", "custom"].includes(f.kind)) return "";
    const par = !!f.detach;
    return `<button type="button" class="ag-flow ${par ? "par" : "seq"}" data-wf="flow" data-index="${i}" role="switch" aria-checked="${par}" title="${esc(this._t("fldDetachHint"))}">${ic(par ? "fork" : "arrowDown", 14)}<span>${esc(this._t(par ? "wfFlowPar" : "wfFlowSeq"))}</span></button>`;
  }

  renderFoot() {
    const h = this.host;
    h._renderDots?.(); // Punkt "ungespeichert" an den Reitern
    const foot = h._view?.querySelector(".ag-foot");
    if (!foot) return;
    const n = this.dirtyCount();
    let status;
    if (this.saveState === "saved" && !n) status = `<span class="ag-saved">${ic("check", 16)} ${esc(this._t("saved"))}</span>`;
    else if (this.saveState && this.saveState !== "saved") status = `<span class="ag-err">${esc(this.saveState)}</span>`;
    else status = `<span class="ag-t2">${esc(n === 0 ? this._t("noChanges") : n === 1 ? this._t("change") : this._t("changes", { count: n }))}</span>`;
    h._setHtml(foot, `${status}<span class="ag-grow"></span><button class="ag-btn" data-wf="cancel" ${n ? "" : "disabled"}>${esc(this._t("cancel"))}</button>
      <button class="ag-btn primary" data-wf="save" ${n && !this.saving ? "" : "disabled"}>${ic("check", 18)}${esc(this._t("save"))}</button>`);
  }

  // ----- Hilfen für den Editor -----

  get states() {
    return this.host._hass?.states || {};
  }

  _services() {
    return this.host._hass?.services || {};
  }

  // Übersetzungen der Dienste: HA liefert in hass.services nur Rohdaten; Namen, Beschreibungen und Feldnamen holt das Panel
  // wie die HA-Oberfläche über frontend/get_translations (einmal je Sprache, danach im Speicher)
  async loadTranslations() {
    const lang = this.host._hass?.locale?.language || this.host._lang;
    if (this._trLang === lang || this._trLoading) return;
    this._trLoading = true;
    const res = {};
    try {
      for (const category of ["services", "title", "entity_component", "selector"]) {
        const out = await this.host._hass.callWS({ type: "frontend/get_translations", language: lang, category });
        Object.assign(res, out?.resources || {});
      }
      this.tr = res;
      this._trLang = lang;
      if (this.host._tab === "config" && this.host._sub === "actions") {
        this.render();
        if (this.edit?.form && this._dlg()?.open) this.renderEditor();
      }
    } catch {
      this._trLang = lang; // ohne Übersetzungen bleibt es bei den Namen von HA; nicht dauernd neu versuchen
    } finally {
      this._trLoading = false;
    }
  }

  _tr(key) {
    return this.tr?.[key] || this.host._hass?.localize?.(key) || "";
  }

  // "set_cover_position" -> "Set cover position": besser lesbar als die Kennung, falls HA nichts liefert
  _human(id) {
    const s = String(id || "").replace(/_/g, " ").trim();
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
  }

  _domainName(d) {
    return this._tr(`component.${d}.title`) || this._tr(`component.${d}.entity_component._.name`) || this._human(d);
  }

  _serviceName(domain, service) {
    if (!domain || !service) return this._t("stepCustom");
    const meta = this._services()[domain]?.[service];
    return this._tr(`component.${domain}.services.${service}.name`) || meta?.name || this._human(service);
  }

  _serviceDesc(domain, service) {
    return this._tr(`component.${domain}.services.${service}.description`) || this._services()[domain]?.[service]?.description || "";
  }

  _fieldName(f, key, fd) {
    return this._tr(`component.${f.domain}.services.${f.service}.fields.${key}.name`) || fd.name || this._human(key);
  }

  _fieldDesc(f, key, fd) {
    return this._tr(`component.${f.domain}.services.${f.service}.fields.${key}.description`) || fd.description || "";
  }

  _entitiesAll(domains) {
    return Object.values(this.states)
      .filter((s) => !domains.length || domains.includes(s.entity_id.split(".")[0]))
      .map((s) => ({ id: s.entity_id, name: s.attributes?.friendly_name || s.entity_id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  _entities(domains) {
    const q = (this.edit?.q || "").toLowerCase();
    return this._entitiesAll(domains || []).filter((e) => !q || e.name.toLowerCase().includes(q) || e.id.includes(q));
  }

  // Auswahlfeld: Suchfeld mit Liste darunter, gewählte als Pille mit x (wie die Empfänger)
  _combo(domains, f, placeholderKey) {
    const pills = f.targets.map((id) => `<span class="ag-rpill ${this.states[id] ? "" : "gone"}">${ic("bell", 14)}<span>${esc(this.host._name(id))}</span><button type="button" class="ag-rx" data-wf="unpick" data-ent="${esc(id)}" aria-label="${esc(this._t("ntRemove", { name: this.host._name(id) }))}">${ic("close", 14)}</button></span>`).join("");
    return `<div class="ag-combo ${this.edit.open ? "open" : ""}">
      <label class="ag-search">${ic("search", 18)}<input type="search" data-wf="eq" placeholder="${esc(this._t(placeholderKey))}" value="${esc(this.edit.q)}" autocomplete="off" aria-label="${esc(this._t(placeholderKey))}">
        <button type="button" class="ag-clear" data-wf="eq-clear" aria-label="${esc(this._t("clearSearch"))}" ${this.edit.q ? "" : "hidden"}>${ic("close", 16)}</button></label>
      <div class="ag-combo-list" role="listbox">${this._comboItems(domains, f)}</div>
      ${pills ? `<div class="ag-rpills">${pills}</div>` : ""}</div>`;
  }

  _comboItems(domains, f) {
    const list = this._entities(domains).filter((e) => !f.targets.includes(e.id));
    const shown = list.slice(0, 60);
    if (!shown.length) return `<div class="ag-t2 ag-small ag-combo-more">${esc(this._t("fldNoMatch"))}</div>`;
    return shown.map((e) => `<button type="button" class="ag-combo-item" role="option" data-wf="pick" data-ent="${esc(e.id)}"><span>${esc(e.name)}</span><small>${esc(e.id)}</small></button>`).join("")
      + (list.length > shown.length ? `<div class="ag-t2 ag-small ag-combo-more">${esc(this._t("fldMore", { count: list.length - shown.length }))}</div>` : "");
  }

  _domainsOf(f) {
    if (f.kind === "sound") return ["media_player"];
    if (f.kind === "device") return Object.keys(DEVICE);
    if (f.kind === "scene") return SCENE_DOMAINS;
    const meta = this._services()[f.domain]?.[f.service];
    const doms = [].concat(meta?.target?.entity || []).flatMap((x) => [].concat(x?.domain || []));
    return doms.length ? doms : f.domain ? [f.domain] : null;
  }

  _dlg() {
    return this.host._root.getElementById("ag-step");
  }

  openPicker(at) {
    this.edit = { insert: at, index: null, form: null, q: "", error: "", open: false };
    const dlg = this._dlg();
    this.host._setHtml(dlg, `<div class="ag-dlg-body"><h3>${esc(this._t("stepPick"))}</h3><div class="ag-kinds">${KINDS.map((k) => `<button class="ag-kind" data-wf="kind" data-kind="${k.kind}"><span class="ag-wf-icon k-${k.kind}">${ic(k.icon, 22)}</span><b>${esc(this._t(k.label))}</b><small>${esc(this._t(k.hint))}</small></button>`).join("")}</div>
      <div class="ag-dlg-btns"><button class="ag-btn" data-wf="close">${esc(this._t("cancel"))}</button></div></div>`);
    dlg.showModal();
  }

  openEditor(form) {
    this.edit.form = form;
    this.renderEditor();
    if (!this._dlg().open) this._dlg().showModal();
  }

  // ----- Editor -----

  // Einfaches Feld mit Beschriftung (innerhalb eines Kapitels)
  _ef(label, body, hint = "") {
    return `<div class="ag-ef"><div class="ag-ef-l">${esc(this._t(label))}</div>${hint ? `<div class="ag-ef-h">${esc(this._t(hint))}</div>` : ""}${body}</div>`;
  }

  // Kapitel im Dialog (Design-Regel "Kapitel"): Titel mit Strich davor, darunter die Karte
  _sec(title, body, hint = "") {
    return `<section class="ag-chap ag-chap-s"><h4 class="ag-sec-t">${esc(this._t(title))}</h4>${hint ? `<p class="ag-chap-h">${esc(this._t(hint))}</p>` : ""}<div class="ag-card ag-efcard">${body}</div></section>`;
  }

  _field(label, body, hint = "") {
    return this._sec(label, body, hint);
  }

  _toggle(attr, on, label) {
    return `<button class="ag-toggle ${on ? "on" : ""}" ${attr} role="switch" aria-checked="${on}" aria-label="${esc(this._t(label))}"></button>`;
  }

  // Nicht abwarten: der nächste Schritt startet sofort; sinnvoll für lange Töne und träge Geräte
  _detachRow(f) {
    if (!["device", "sound", "scene", "custom"].includes(f.kind)) return "";
    return `<div class="ag-ef ag-ef-row"><div class="ag-settx"><b>${esc(this._t("fldDetach"))}</b><small>${esc(this._t("fldDetachHint"))}</small></div>${this._toggle('data-wf="detach"', f.detach, "fldDetach")}</div>`;
  }

  _restoreRow(f) {
    return `<div class="ag-ef ag-ef-row"><div class="ag-settx"><b>${esc(this._t("fldRestore"))}</b><small>${esc(this._t(f.kind === "sound" ? "fldRestoreSoundHint" : "fldRestoreHint"))}</small></div>${this._toggle('data-wf="restore"', f.restore, "fldRestore")}</div>${this._detachRow(f)}`;
  }

  _rangeRow(attr, label, value, min, max, step, text) {
    return `<div class="ag-ef-range"><label><span>${esc(label)}</span><b class="ag-ef-val">${esc(text)}</b></label><input type="range" class="ag-range" ${attr} min="${min}" max="${max}" step="${step}" value="${esc(value)}" aria-label="${esc(label)}"></div>`;
  }

  _deviceFields(f) {
    const domains = [...new Set(f.targets.map((e) => e.split(".")[0]))];
    const single = domains.length === 1 ? domains[0] : null;
    const actions = f.targets.length ? Object.keys(single ? DEVICE[single] : MIXED) : [];
    if (actions.length && !actions.includes(f.action)) f.action = actions[0];
    const picker = actions.length
      ? `<div class="ag-actions">${actions.map((a) => `<button class="ag-act ${f.action === a ? "on" : ""}" data-wf="action" data-value="${a}" aria-pressed="${f.action === a}">${ic(ACTION_ICON[a], 18)}${esc(this._t(cap(single || "", a)))}</button>`).join("")}</div>`
      : `<div class="ag-t2 ag-small">${esc(this._t("fldChooseFirst"))}</div>`;
    let options = "";
    if (f.action === "on" && domains.length > 1) options = `<div class="ag-t2 ag-small">${esc(this._t("optsMixed"))}</div>`;
    if (f.action === "on" && single) {
      options = deviceOptions(this.states, f.targets).map((sp) => {
        const on = !!f.optsOn[sp.key];
        const label = this._t(sp.label);
        let control = "";
        if (on) {
          const val = f.opts[sp.key] ?? (sp.type === "choice" ? sp.values[0] : sp.min);
          if (sp.type === "choice") control = `<select class="ag-input" data-wf="opt" data-key="${sp.key}" aria-label="${esc(label)}">${sp.values.map((v) => `<option value="${esc(v)}" ${v === val ? "selected" : ""}>${esc(this._hvacLabel(v))}</option>`).join("")}</select>`;
          else control = this._rangeRow(`data-wf="opt" data-key="${sp.key}"`, label, val, sp.min, sp.max, sp.step || 1, this._optText(sp.key, val));
        }
        return `<div class="ag-opt"><div class="ag-ef-row"><div class="ag-settx"><b>${esc(label)}</b>${on ? "" : `<small>${esc(this._t("optUnchanged"))}</small>`}</div>${this._toggle(`data-wf="opt-on" data-key="${sp.key}"`, on, sp.label)}</div>${control}</div>`;
      }).join("");
    }
    return this._field("fldDevices", this._combo(Object.keys(DEVICE), f, "fldSearchDevice"))
      + this._field("fldAction", picker)
      + (options ? this._field("optsTitle", options) : "")
      + this._restoreRow(f);
  }

  _hvacLabel(mode) {
    const key = `hvac_${mode}`;
    const text = this._t(key);
    return text === key ? mode : text;
  }

  _soundFields(f) {
    const sounds = this.host._data?.sounds || [];
    const current = sounds.find((s) => s.id === f.sound);
    const play = Boolean(this.previewing && current && this.previewing === current.url);
    const tone = `<div class="ag-tone"><select class="ag-input" data-wf="f" data-key="sound" aria-label="${esc(this._t("fldTone"))}">${sounds.map((s) => `<option value="${s.id}" ${s.id === f.sound ? "selected" : ""}>${esc(this._t(SOUND_KEY[s.id] || s.id))}</option>`).join("")}</select>
        <div class="ag-pv" role="group" aria-label="${esc(this._t("pvNote"))}">
          <button class="ag-iconbtn ${play ? "on" : ""}" data-wf="pv-play" data-url="${esc(current?.url || "")}" aria-label="${esc(this._t("pvPlay"))}" title="${esc(this._t("pvPlay"))}">${ic("play", 18)}</button>
          <button class="ag-iconbtn" data-wf="pv-pause" ${play ? "" : "disabled"} aria-label="${esc(this._t("pvPause"))}" title="${esc(this._t("pvPause"))}">${ic("pause", 18)}</button></div></div>
      <div class="ag-pv-note">${ic("info", 14)} ${esc(this._t("pvNote"))}</div>`;
    const volume = `<div class="ag-ef-row"><div class="ag-settx"><b>${esc(this._t("fldVolumeSet"))}</b>${f.setVolume ? "" : `<small>${esc(this._t("fldVolumeKeep"))}</small>`}</div>${this._toggle('data-wf="setvol"', f.setVolume, "fldVolumeSet")}</div>
      ${f.setVolume ? this._rangeRow('data-wf="volume"', this._t("fldVolume"), Math.round(f.volume * 100), 0, 100, 5, `${Math.round(f.volume * 100)} %`) : ""}`;
    return this._field("fldPlayers", this._combo(["media_player"], f, "fldSearchPlayer"))
      + this._field("fldTone", tone)
      + this._field("fldVolume", volume)
      + this._field("fldPlayFor", this._playFor(f))
      + this._restoreRow(f);
  }

  // Dauer des Alarmtons: Sekunden oder "bis zum Deaktivieren"
  _playFor(f) {
    const until = `<div class="ag-ef-row"><div class="ag-settx"><b>${esc(this._t("fldPlayUntil"))}</b><small>${esc(this._t("fldPlayUntilHint"))}</small></div>${this._toggle('data-wf="until"', f.until, "fldPlayUntil")}</div>`;
    if (f.until) return until;
    const quick = [10, 30, 60, 300].map((s) => `<button class="ag-chip ${Number(f.playSeconds) === s ? "on" : ""}" data-wf="playsecs" data-value="${s}">${esc(s >= 60 ? this._t("durMin", { n: s / 60 }) : this._t("durS", { n: s }))}</button>`).join("");
    return `<span class="ag-num"><input type="number" min="1" max="3600" data-wf="f" data-key="playSeconds" value="${esc(f.playSeconds)}" aria-label="${esc(this._t("fldPlayFor"))}"><span class="ag-t2">s</span></span>
      <div class="ag-zline">${quick}</div><div class="ag-ef-h">${esc(this._t("fldPlayForHint"))}</div>${until}`;
  }

  // Titel und Text der Push-Meldung: der Standardtext steht im Feld und lässt sich ändern; Platzhalter füllt der Server beim Alarm
  _notifyFields(f) {
    const dt = this._t("ntDefaultTitle");
    const dm = this._t("ntDefaultMessage");
    const chips = NOTIFY_TOKENS.map((tok) => `<button type="button" class="ag-chip" data-wf="ins" data-token="${esc(tok)}">${esc(tok)}<small>${esc(this._t(`ntTok_${tok.slice(1, -1)}`))}</small></button>`).join("");
    return `<div class="ag-t2">${esc(this._t("stepNotifyHint"))}</div>
      ${this._sec("chapNtContent", `${this._ef("fldNtTitle", `<input class="ag-input" data-wf="f" data-key="ntTitle" maxlength="100" value="${esc(f.ntTitle || dt)}" aria-label="${esc(this._t("fldNtTitle"))}">`)}
      ${this._ef("fldNtMessage", `<textarea class="ag-input" rows="3" data-wf="f" data-key="ntMessage" maxlength="300" aria-label="${esc(this._t("fldNtMessage"))}">${esc(f.ntMessage || dm)}</textarea>`)}
      ${this._ef("fldNtTokens", `<div class="ag-zline">${chips}</div>`, "fldNtTokensHint")}
      ${this._ef("fldNtPreview", `<div class="ag-ntprev" id="ag-ntprev">${this._ntPreview(f)}</div>
        <div><button type="button" class="ag-btn" data-wf="nt-default">${ic("undo", 16)}${esc(this._t("fldNtDefault"))}</button></div>`)}`)}
      ${this._ntDelivery(f)}`;
  }

  // Wirksame Werte der Alarmmeldung: aus dem Schritt, sonst der frühere globale Wert (so ändert sich bei bestehenden Schritten nichts)
  _ntGlobal() {
    const g = this.host._data?.notify || {};
    return { critical: g.types?.triggered?.critical ?? true, volume: g.types?.triggered?.volume ?? 0.8, open: g.open_action ?? true, silence: g.silence_action ?? false, disarm: g.disarm_action ?? false };
  }

  _ntDelivery(f) {
    const g = this._ntGlobal();
    const critical = f.ntCritical ?? g.critical;
    const volume = Math.round((f.ntVolume ?? g.volume) * 100);
    const btn = (key, label, hint, warn) => {
      const on = f.ntButtons?.[key] ?? g[key];
      return `<div class="ag-ef-row"><div class="ag-settx"><b>${esc(this._t(label))}</b><small class="${warn ? "ag-warntext" : ""}">${warn ? `${ic("alert", 14)} ` : ""}${esc(this._t(hint))}</small></div>${this._toggle(`data-wf="nt-btn" data-key="${key}"`, on, label)}</div>`;
    };
    return this._sec("fldNtDelivery", `<div class="ag-ef-row"><div class="ag-settx"><b>${esc(this._t("ntCriticalShort"))}</b><small>${esc(this._t("fldNtCriticalHint"))}</small></div>${this._toggle('data-wf="nt-crit"', critical, "ntCriticalShort")}</div>
        ${critical ? this._rangeRow('data-wf="nt-vol"', this._t("ntVolumeShort"), volume, 0, 100, 5, `${volume} %`) : ""}`)
      + this._sec("fldNtClick", `<select class="ag-input" data-wf="nt-click" aria-label="${esc(this._t("fldNtClick"))}">${["log", "overview", "custom"].map((k) => `<option value="${k}" ${(f.ntClick || "log") === k ? "selected" : ""}>${esc(this._t(`ntClick_${k}`))}</option>`).join("")}</select>
        ${f.ntClick === "custom" ? `<input class="ag-input ag-mono" data-wf="f" data-key="ntClickPath" value="${esc(f.ntClickPath || "")}" placeholder="/lovelace/alarm" aria-label="${esc(this._t("ntClick_custom"))}" autocapitalize="off" autocomplete="off" spellcheck="false">` : ""}`, "fldNtClickHint")
      + this._sec("fldNtButtons", `${btn("open", "ntOpenAction", "ntOpenActionHint", false)}${btn("silence", "ntSilenceAction", "ntSilenceActionHint", true)}${btn("disarm", "ntDisarmAction", "ntDisarmActionHint", true)}`);
  }

  // Vorschau mit echten Namen der Anlage und eines Sensors, so wie die Meldung aussähe
  _ntPreview(f) {
    const s = this.system;
    const sensorId = Object.values(s?.zones || {}).flat()[0];
    const fill = (text) => text
      .replaceAll("{name}", s?.title || "")
      .replaceAll("{sensor}", sensorId ? this.host._name(sensorId) : "")
      .replaceAll("{time}", new Date().toLocaleTimeString(this.host._hass?.locale?.language || this.host._lang, { hour: "2-digit", minute: "2-digit" }))
      .replaceAll("{mode}", this._t(MODE_KEY[this.trigger] || "modeAway"));
    const title = fill(f.ntTitle || this._t("ntDefaultTitle")).trim();
    const message = fill(f.ntMessage || this._t("ntDefaultMessage")).trim();
    return `<b>${esc(title)}</b><div>${esc(message)}</div>`;
  }

  _waitFields(f) {
    const quick = [10, 30, 60, 300].map((s) => `<button class="ag-chip ${Number(f.seconds) === s ? "on" : ""}" data-wf="secs" data-value="${s}">${esc(s >= 60 ? this._t("durMin", { n: s / 60 }) : this._t("durS", { n: s }))}</button>`).join("");
    return this._field("fldDuration", `<span class="ag-num"><input type="number" min="0" max="3600" data-wf="f" data-key="seconds" value="${esc(f.seconds)}" aria-label="${esc(this._t("fldSeconds"))}"><span class="ag-t2">s</span></span><div class="ag-zline" style="margin-top:10px">${quick}</div>`);
  }

  _sceneFields(f) {
    const options = SCENE_DOMAINS.map((d) => [d, this._entitiesAll([d])]).filter(([, list]) => list.length)
      .map(([d, list]) => `<optgroup label="${esc(this._t(d === "scene" ? "grpScenes" : "grpScripts"))}">${list.map((e) => `<option value="${esc(e.id)}" ${f.targets[0] === e.id ? "selected" : ""}>${esc(e.name)}</option>`).join("")}</optgroup>`).join("");
    return this._field("fldSceneScript", options
      ? `<select class="ag-input" data-wf="scene" aria-label="${esc(this._t("fldSceneScript"))}"><option value="">${esc(this._t("fldChoose"))}</option>${options}</select>`
      : `<div class="ag-t2 ag-small">${esc(this._t("fldNoEntities"))}</div>`);
  }

  // Durchsuchbares Auswahlfeld (tippen filtert): Art und Aktion bei "Eigene Aktion"; die Listen sind lang
  _cbItems(key, f) {
    const services = this._services();
    const q = (this.edit?.cb?.key === key ? this.edit.cb.q : "").trim().toLowerCase();
    const items = key === "domain"
      ? Object.keys(services).filter((d) => Object.keys(services[d] || {}).length).map((d) => ({ value: d, label: this._domainName(d) }))
      : Object.keys(services[f.domain] || {}).map((s) => ({ value: s, label: this._serviceName(f.domain, s) }));
    items.sort((x, y) => x.label.localeCompare(y.label));
    const shown = items.filter((it) => !q || it.label.toLowerCase().includes(q) || it.value.toLowerCase().includes(q));
    if (!shown.length) return `<div class="ag-t2 ag-small ag-combo-more">${esc(this._t("fldNoMatch"))}</div>`;
    const cur = key === "domain" ? f.domain : f.service;
    return shown.map((it) => `<button type="button" class="ag-combo-item ${it.value === cur ? "cur" : ""}" role="option" data-wf="cb-pick" data-key="${key}" data-value="${esc(it.value)}"><span>${esc(it.label)}</span><small>${esc(key === "domain" ? it.value : `${f.domain}.${it.value}`)}</small></button>`).join("");
  }

  _cbox(key, f, label) {
    const cur = key === "domain" ? f.domain : f.service;
    const text = !cur ? "" : key === "domain" ? this._domainName(cur) : this._serviceName(f.domain, cur);
    const disabled = key === "service" && !f.domain;
    return `<div class="ag-combo ag-cbox"><label class="ag-search ${disabled ? "off" : ""}">${ic("search", 18)}<input type="search" data-wf="cb" data-key="${key}" value="${esc(text)}" placeholder="${esc(this._t("fldChoose"))}" autocomplete="off" aria-label="${esc(label)}" ${disabled ? "disabled" : ""}>${ic("chevRight", 16)}</label>
      <div class="ag-combo-list" role="listbox">${this._cbItems(key, f)}</div></div>`;
  }

  _customFields(f) {
    const services = this._services();
    const domains = Object.keys(services).filter((d) => Object.keys(services[d] || {}).length).sort();
    if (!domains.length) return `<div class="ag-t2">${esc(this._t("fldNoServices"))}</div>`;
    const dom = this._cbox("domain", f, this._t("fldKind"));
    const srv = this._cbox("service", f, this._t("fldAction"));
    const meta = services[f.domain]?.[f.service];
    let html = this._field("fldKind", dom) + this._field("fldAction", srv + (this._serviceDesc(f.domain, f.service) ? `<div class="ag-ef-h" style="margin-top:6px">${esc(this._serviceDesc(f.domain, f.service))}</div>` : ""));
    if (!meta) return html + this._restoreRow(f);
    if (meta.target) html += this._field("fldDevices", this._combo(this._domainsOf(f), f, "fldSearchDevice"));
    const fields = Object.entries(flatFields(meta.fields));
    const req = fields.filter(([, fd]) => fd.required);
    const opt = fields.filter(([, fd]) => !fd.required);
    html += req.map(([k, fd]) => this._dataField(k, fd, f)).join("");
    if (opt.length) html += `<details class="ag-more" ${opt.some(([k]) => f.data[k] != null && f.data[k] !== "") ? "open" : ""}><summary>${esc(this._t("fldMoreSettings"))}</summary>${opt.map(([k, fd]) => this._dataField(k, fd, f)).join("")}</details>`;
    // Werte aus einem früheren Schritt, die zu keinem Feld passen, bleiben erhalten und werden nur genannt
    const known = new Set(fields.map(([k]) => k));
    const extra = Object.entries(f.extra).filter(([k]) => !known.has(k));
    if (extra.length) html += `<div class="ag-ef-h">${esc(this._t("fldExtra"))}: ${esc(extra.map(([k, v]) => `${k}: ${typeof v === "object" ? "…" : v}`).join(", "))}</div>`;
    return html + this._restoreRow(f);
  }

  _dataField(key, fd, f) {
    const type = selectorType(fd);
    const val = f.data[key];
    const sel = fd.selector?.[type] || {};
    const name = this._fieldName(f, key, fd);
    const desc = this._fieldDesc(f, key, fd);
    const attr = `data-wf="df" data-key="${esc(key)}" data-type="${type}"`;
    let control;
    if (!SIMPLE_SELECTORS.includes(type) || (type === "select" && sel.multiple) || (type === "entity" && sel.multiple)) {
      control = `<div class="ag-t2 ag-small">${ic("info", 14)} ${esc(this._t("fldUnsupported"))}</div>`;
    } else if (type === "boolean") {
      control = `<div class="ag-ef-row"><span class="ag-t2">${esc(desc)}</span>${this._toggle(`${attr} data-bool`, !!val, "fldValue")}</div>`;
    } else if (type === "number" || type === "color_temp") {
      const min = sel.min ?? sel.min_kelvin ?? "";
      const max = sel.max ?? sel.max_kelvin ?? "";
      const slider = sel.mode === "slider" && min !== "" && max !== "";
      const shown = val ?? fd.default ?? min;
      control = slider
        ? this._rangeRow(attr, name, shown, min, max, sel.step || 1, `${shown}${sel.unit_of_measurement ? ` ${sel.unit_of_measurement}` : ""}`)
        : `<span class="ag-num"><input type="number" ${attr} min="${min}" max="${max}" step="${sel.step || "any"}" value="${esc(val ?? "")}" placeholder="${esc(fd.default ?? "")}" aria-label="${esc(name)}"><span class="ag-t2">${esc(sel.unit_of_measurement || "")}</span></span>`;
    } else if (type === "select") {
      control = `<select class="ag-input" ${attr} aria-label="${esc(name)}"><option value="">${esc(this._t("fldChoose"))}</option>${normalizeOptions(sel.options).map((o) => `<option value="${esc(o.value)}" ${String(val) === o.value ? "selected" : ""}>${esc((sel.translation_key && this._tr(`component.${f.domain}.selector.${sel.translation_key}.options.${o.value}`)) || o.label)}</option>`).join("")}</select>`;
    } else if (type === "entity") {
      const list = this._entitiesAll([].concat(sel.domain || []));
      control = list.length <= 250
        ? `<select class="ag-input" ${attr} aria-label="${esc(name)}"><option value="">${esc(this._t("fldChoose"))}</option>${list.map((e) => `<option value="${esc(e.id)}" ${val === e.id ? "selected" : ""}>${esc(e.name)}</option>`).join("")}</select>`
        : `<input class="ag-input" ${attr} value="${esc(val ?? "")}" aria-label="${esc(name)}">`;
    } else {
      control = `<input class="ag-input" ${attr} value="${esc(val ?? "")}" placeholder="${esc(fd.example ?? "")}" aria-label="${esc(name)}">`;
    }
    return `<div class="ag-ef"><div class="ag-ef-l">${esc(name)}${fd.required ? ` <span class="ag-req">${esc(this._t("fldRequired"))}</span>` : ""}</div>${desc && type !== "boolean" ? `<div class="ag-ef-h">${esc(desc)}</div>` : ""}${control}</div>`;
  }

  renderEditor() {
    const f = this.edit.form;
    if (this.edit.snap === undefined) this.edit.snap = JSON.stringify(f); // Stand beim Öffnen: Abbrechen fragt nur bei echten Änderungen
    const k = KINDS.find((x) => x.kind === f.kind);
    let fields;
    if (f.kind === "notify") fields = this._notifyFields(f);
    else if (f.kind === "device") fields = this._deviceFields(f);
    else if (f.kind === "sound") fields = this._soundFields(f);
    else if (f.kind === "wait") fields = this._waitFields(f);
    else if (f.kind === "scene") fields = this._sceneFields(f);
    else fields = this._customFields(f);
    this.host._setHtml(this._dlg(), `<div class="ag-dlg-body ag-step-ed"><div class="ag-sys-top"><span class="ag-wf-icon k-${f.kind}">${ic(k.icon, 22)}</span><h3>${esc(this._t(k.label))}</h3></div>
      ${fields}<div class="ag-dlg-err" aria-live="polite">${esc(this.edit.error || "")}</div>
      <div class="ag-dlg-btns"><button class="ag-btn" data-wf="close">${esc(this._t("cancel"))}</button><button class="ag-btn primary" data-wf="apply">${esc(this._t("apply"))}</button></div></div>`);
  }

  apply() {
    const f = this.edit.form;
    if (["device", "sound", "scene"].includes(f.kind) && !f.targets.length) return this._editError("stepNoTargets");
    if (f.kind === "notify" && f.ntClick === "custom" && !/^\/[^\s]*$/.test(String(f.ntClickPath || "").trim())) return this._editError("fldNtPathBad");
    if (f.kind === "custom") {
      if (!f.domain || !f.service) return this._editError("stepNoService");
      const meta = this._services()[f.domain]?.[f.service];
      const fields = flatFields(meta?.fields);
      const empty = (k) => f.data[k] === undefined || f.data[k] === "" || Number.isNaN(f.data[k]);
      const missing = Object.entries(fields).find(([k, fd]) => fd.required && selectorType(fd) !== "boolean" && SIMPLE_SELECTORS.includes(selectorType(fd)) && empty(k) && !f.extra[k]);
      if (missing) return this._editError(null, this._t("fldMissing", { name: this._fieldName(f, missing[0], missing[1]) }));
      if (meta?.target && !f.targets.length && !("entity_id" in fields)) return this._editError("stepNoTargets");
    }
    let step;
    try {
      step = toStep(f);
    } catch (err) {
      return this._editError(null, errText(err));
    }
    const d = this.ensureDraft();
    const list = [...(d.wf[this.trigger] || [])];
    if (this.edit.index !== null) list[this.edit.index] = step;
    else list.splice(this.edit.insert, 0, step);
    d.wf[this.trigger] = list;
    this.saveState = null;
    this._stopPreview();
    this.edit = null;
    this._dlg().close();
    this.render();
  }

  _editError(key, text) {
    this.edit.error = text || this._t(key);
    this.renderEditor();
  }

  // ----- Vorhören auf diesem Gerät (nicht auf dem Medienplayer) -----

  _play(url) {
    this._stopPreview();
    const audio = new Audio(url);
    audio.addEventListener("ended", () => {
      if (this._preview === audio) {
        this._preview = null;
        this.previewing = null;
        if (this.edit?.form?.kind === "sound") this.renderEditor();
      }
    });
    this._preview = audio;
    this.previewing = url;
    audio.play().catch(() => {
      if (this._preview === audio) {
        this._preview = null;
        this.previewing = null;
        if (this.edit?.form?.kind === "sound") this.renderEditor();
      }
    });
  }

  _stopPreview() {
    if (this._preview) {
      this._preview.pause();
      this._preview = null;
    }
    this.previewing = null;
  }

  // ----- Speichern und Testen -----

  async save() {
    const h = this.host;
    const s = this.system;
    const d = this.draft;
    if (!s || !d || this.saving) return;
    this.saving = true;
    this.renderFoot();
    try {
      const wf = Object.fromEntries(this.triggers(s).map((t) => [t, d.wf[t] || []]));
      const end = Object.fromEntries(this.triggers(s).map((t) => [t, d.end?.[t] || "restore_marked"]));
      await h._hass.callWS({ type: "alarmageddon/save_workflows", entry_id: s.entry_id, workflows: wf, workflow_end: end });
      s.workflow_end = Object.fromEntries(Object.entries(end).filter(([, v]) => v !== "restore_marked"));
      s.workflows = JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(wf).filter(([, v]) => v.length))));
      this.draft = null;
      this.saveState = "saved";
      h._reloadWait(s.entry_id);
    } catch (err) {
      this.saveState = this._t("saveFailed", { message: errText(err) });
    } finally {
      this.saving = false;
      this.render();
    }
  }

  async test(stop, step) {
    const h = this.host;
    const s = this.system;
    try {
      const msg = stop ? { type: "alarmageddon/stop_workflow", entry_id: s.entry_id } : { type: "alarmageddon/test_workflow", entry_id: s.entry_id, trigger: this.trigger };
      if (step) msg.step = step;
      await h._hass.callWS(msg);
      s.workflow_running = stop ? null : this.trigger;
      s.workflow_test = !stop;
      this.render();
      if (!stop) setTimeout(() => h._fetch(), 61000);
    } catch (err) {
      h._toast(this._t("errGeneric", { message: errText(err) }));
    }
  }

  // Einzelner Schritt: läuft wirklich auf den Geräten, darum vorher fragen
  async testStep(index) {
    const step = this.steps()[index];
    if (!step) return;
    const ok = await this.host._confirm(this._t("stepTestTitle"), this._t("stepTestText"), this._t("stepTestRun"));
    if (ok) await this.test(false, step);
  }

  // ----- Ziehen am Griff (Pointer-Ereignisse am Fenster, Tastatur mit Pfeiltasten) -----

  onPointerDown(ev) {
    if (ev.target.closest?.(".ag-combo-list")) this._comboPointer = true;
    const grab = ev.target.closest?.('[data-wf="grab"]');
    if (!grab || (ev.button !== undefined && ev.button !== 0)) return;
    const root = this.host._view;
    const cards = [...root.querySelectorAll(".ag-wf-step")];
    const from = Number(grab.dataset.index);
    if (!cards[from] || cards.length < 2) return;
    ev.preventDefault();
    const rects = cards.map((c) => c.getBoundingClientRect());
    const slot = (rects[from + 1] ? rects[from + 1].top : rects[from].bottom + 40) - rects[from].top;
    this.drag = { from, to: from, startY: ev.clientY, cards, rects, slot, moved: false };
    cards[from].classList.add("dragging");
    root.classList.add("ag-dragging");
  }

  onPointerMove(ev) {
    const d = this.drag;
    if (!d) return;
    const dy = ev.clientY - d.startY;
    if (Math.abs(dy) > 4) d.moved = true;
    d.cards[d.from].style.transform = `translateY(${dy}px)`;
    const center = d.rects[d.from].top + d.rects[d.from].height / 2 + dy;
    // Neue Stelle: so viele andere Karten, wie oberhalb der Mitte der gezogenen liegen
    let to = 0;
    d.rects.forEach((r, i) => {
      if (i !== d.from && r.top + r.height / 2 < center) to += 1;
    });
    d.to = to;
    d.cards.forEach((c, i) => {
      if (i === d.from) return;
      let shift = 0;
      if (d.from < d.to && i > d.from && i <= d.to) shift = -d.slot;
      else if (d.from > d.to && i < d.from && i >= d.to) shift = d.slot;
      c.style.transform = shift ? `translateY(${shift}px)` : "";
    });
    // Am Rand des Fensters mitscrollen
    const win = this.host.ownerDocument.defaultView;
    if (ev.clientY < 70) win.scrollBy(0, -12);
    else if (ev.clientY > win.innerHeight - 70) win.scrollBy(0, 12);
  }

  onPointerEnd() {
    setTimeout(() => (this._comboPointer = false), 250);
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    this.host._view?.classList.remove("ag-dragging");
    d.cards.forEach((c) => {
      c.style.transform = "";
      c.classList.remove("dragging");
    });
    if (d.moved && d.to !== d.from) this._move(d.from, d.to);
  }

  _move(from, to) {
    const dr = this.ensureDraft();
    const list = [...(dr.wf[this.trigger] || [])];
    const [step] = list.splice(from, 1);
    list.splice(to, 0, step);
    dr.wf[this.trigger] = list;
    this.saveState = null;
    this.render();
  }

  // Tastatur am Griff: Pfeiltasten verschieben den Schritt (Ersatz für das Ziehen)
  onKeyDown(ev) {
    const grab = ev.target.closest?.('[data-wf="grab"]');
    if (!grab || !["ArrowUp", "ArrowDown"].includes(ev.key)) return false;
    const i = Number(grab.dataset.index);
    const j = ev.key === "ArrowUp" ? i - 1 : i + 1;
    ev.preventDefault();
    if (j < 0 || j >= this.steps().length) return true;
    this._move(i, j);
    this.host._view.querySelector(`[data-wf="grab"][data-index="${j}"]`)?.focus();
    return true;
  }

  // Suchfeld: Liste nur zeigen, solange es den Fokus hat oder darin getippt wird
  onFocus(el, inside) {
    if (inside && ["ntTitle", "ntMessage"].includes(el?.dataset?.key)) {
      this.ntField = el;
      return true;
    }
    if (el?.dataset?.wf === "cb" && this.edit) {
      const combo = el.closest(".ag-combo");
      if (inside) {
        this.edit.cb = { key: el.dataset.key, q: "" };
        el.select(); // der Text wird beim Tippen ersetzt; die Liste zeigt zuerst alles
        const list = combo.querySelector(".ag-combo-list");
        list.innerHTML = this._cbItems(el.dataset.key, this.edit.form);
        combo.classList.add("open");
        list.querySelector(".cur")?.scrollIntoView({ block: "nearest" });
      } else {
        setTimeout(() => {
          if (this._comboPointer) return;
          combo.classList.remove("open");
          if (this.edit?.cb?.key === el.dataset.key) this.edit.cb = null;
          const f = this.edit?.form;
          if (f && el.isConnected) {
            const cur = el.dataset.key === "domain" ? f.domain : f.service;
            el.value = !cur ? "" : el.dataset.key === "domain" ? this._domainName(cur) : this._serviceName(f.domain, cur);
          }
        }, 120);
      }
      return true;
    }
    if (el?.dataset?.wf !== "eq" || !this.edit) return false;
    const combo = el.closest(".ag-combo");
    this.edit.open = inside;
    if (inside) combo?.classList.add("open");
    else setTimeout(() => !this._comboPointer && combo?.classList.remove("open"), 120);
    return true;
  }

  // ----- Ereignisse; true = erledigt -----

  onClick(el) {
    const trig = el?.closest?.("[data-trigger]");
    if (trig && !el.dataset.wf) {
      this.trigger = trig.dataset.trigger;
      this.host._savePref("trigger", this.trigger);
      this.render();
      return true;
    }
    const act = el?.dataset.wf;
    if (!act) return false;
    if (act === "grab") return true; // das Ziehen läuft über Pointer-Ereignisse; ein Klick tut nichts
    const d = this.ensureDraft();
    const i = Number(el.dataset.index);
    const list = d?.wf[this.trigger] || [];
    const form = this.edit?.form;
    if (act === "add") this.openPicker(Number(el.dataset.at));
    else if (act === "kind") {
      const k = KINDS.find((x) => x.kind === el.dataset.kind);
      this.openEditor({ ...blank(), kind: k.kind, restore: k.kind === "sound", detach: k.kind === "sound" }); // Alarmton: standardmässig "nicht abwarten" und zurückstellen
    } else if (act === "edit") {
      this.edit = { index: i, insert: null, form: fromStep(list[i]), q: "", error: "", open: false };
      this.renderEditor();
      this._dlg().showModal();
    } else if (act === "flow") {
      const step = list[i];
      if (step?.detach) delete step.detach;
      else if (step) step.detach = true;
      d.wf[this.trigger] = list;
      this.saveState = null;
      this.render();
    } else if (act === "delete") {
      list.splice(i, 1);
      d.wf[this.trigger] = list;
      this.saveState = null;
      this.render();
    } else if (act === "test-step") this.testStep(i);
    else if (act === "pick") {
      if (!form.targets.includes(el.dataset.ent)) form.targets = [...form.targets, el.dataset.ent];
      this.edit.q = "";
      this.edit.open = false;
      this.renderEditor();
    } else if (act === "unpick") {
      form.targets = form.targets.filter((x) => x !== el.dataset.ent);
      this.renderEditor();
    } else if (act === "action") {
      form.action = el.dataset.value;
      this.renderEditor();
    } else if (act === "ins") {
      // Platzhalter an der Schreibmarke des zuletzt benutzten Textfelds einfügen
      const field = this.ntField && this._dlg().contains(this.ntField) ? this.ntField : this._dlg().querySelector('[data-key="ntTitle"]');
      const pos = field.selectionStart ?? field.value.length;
      field.value = field.value.slice(0, pos) + el.dataset.token + field.value.slice(field.selectionEnd ?? pos);
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.focus();
      field.setSelectionRange(pos + el.dataset.token.length, pos + el.dataset.token.length);
    } else if (act === "cb-pick") {
      const key = el.dataset.key;
      if (form[key] !== el.dataset.value) {
        form[key] = el.dataset.value;
        if (key === "domain") form.service = "";
        form.data = {};
        form.extra = {};
      }
      this.edit.cb = null;
      this.renderEditor();
    } else if (act === "nt-crit") {
      form.ntCritical = !(form.ntCritical ?? this._ntGlobal().critical);
      this.renderEditor();
    } else if (act === "nt-btn") {
      const key = el.dataset.key;
      form.ntButtons = { ...(form.ntButtons || {}), [key]: !(form.ntButtons?.[key] ?? this._ntGlobal()[key]) };
      this.renderEditor();
    } else if (act === "nt-default") {
      form.ntTitle = "";
      form.ntMessage = "";
      this.renderEditor();
    } else if (act === "until") {
      form.until = !form.until;
      this.renderEditor();
    } else if (act === "playsecs") {
      form.playSeconds = Number(el.dataset.value);
      this.renderEditor();
    } else if (act === "secs") {
      form.seconds = Number(el.dataset.value);
      this.renderEditor();
    } else if (act === "opt-on") {
      const key = el.dataset.key;
      form.optsOn[key] = !form.optsOn[key];
      if (form.optsOn[key] && form.opts[key] == null) {
        const spec = deviceOptions(this.states, form.targets).find((sp) => sp.key === key);
        form.opts[key] = spec ? (spec.type === "choice" ? spec.values[0] : key === "brightness_pct" ? 100 : spec.min) : "";
      }
      this.renderEditor();
    } else if (act === "setvol") {
      form.setVolume = !form.setVolume;
      this.renderEditor();
    } else if (act === "detach") {
      form.detach = !form.detach;
      this.renderEditor();
    } else if (act === "restore") {
      form.restore = !form.restore;
      this.renderEditor();
    } else if (act === "df" && el.hasAttribute("data-bool")) {
      form.data[el.dataset.key] = !form.data[el.dataset.key];
      this.renderEditor();
    } else if (act === "pv-play") {
      if (el.dataset.url) this._play(el.dataset.url);
      this.renderEditor();
    } else if (act === "pv-pause") {
      this._stopPreview();
      this.renderEditor();
    } else if (act === "eq-clear") {
      const input = this._dlg().querySelector('[data-wf="eq"]');
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
    } else if (act === "apply") this.apply();
    else if (act === "close") {
      this._stopPreview();
      this.edit = null;
      this._dlg().close();
    } else if (act === "cancel") {
      this.draft = null;
      this.saveState = null;
      this.render();
    } else if (act === "save") this.save();
    else if (act === "test") this.test(false);
    else if (act === "test-stop") this.test(true);
    else return false;
    return true;
  }

  onChange(el) {
    if (el.dataset?.wf !== "end") return false;
    this.ensureDraft().end[this.trigger] = el.value;
    this.render();
    this.host._renderDots();
    return true;
  }

  onInput(el) {
    const act = el.dataset.wf;
    if (!act || !this.edit?.form) return false;
    const f = this.edit.form;
    if (act === "eq") {
      this.edit.q = el.value;
      this.edit.open = true;
      // Nur die Liste neu aufbauen, damit das Suchfeld den Fokus behält (LEARNINGS)
      const list = this._dlg().querySelector(".ag-combo-list");
      if (list) list.innerHTML = this._comboItems(this._domainsOf(f), f);
      const clear = this._dlg().querySelector('[data-wf="eq-clear"]');
      if (clear) clear.hidden = !el.value;
      this._dlg().querySelector(".ag-combo")?.classList.add("open");
      return true;
    }
    if (act === "cb") {
      this.edit.cb = { key: el.dataset.key, q: el.value };
      // Nur die Liste neu, das Feld behält Fokus und Schreibmarke
      el.closest(".ag-combo").querySelector(".ag-combo-list").innerHTML = this._cbItems(el.dataset.key, f);
      el.closest(".ag-combo").classList.add("open");
      return true;
    }
    if (act === "f") {
      const key = el.dataset.key;
      if (key === "domain" || key === "service") {
        f[key] = el.value;
        if (key === "domain") f.service = "";
        f.data = {};
        f.extra = {};
        this.renderEditor();
      } else if (key === "sound") {
        f.sound = el.value;
        this._stopPreview();
        this.renderEditor();
      } else if (key === "ntTitle" || key === "ntMessage") {
        // Entspricht der Text dem Standard, bleibt das Feld leer (folgt der Sprache)
        const def = this._t(key === "ntTitle" ? "ntDefaultTitle" : "ntDefaultMessage");
        f[key] = el.value.trim() === def ? "" : el.value;
        const prev = this._dlg().querySelector("#ag-ntprev");
        if (prev) prev.innerHTML = this._ntPreview(f);
      } else f[key] = el.value;
      return true;
    }
    if (act === "scene") {
      f.targets = el.value ? [el.value] : [];
      return true;
    }
    if (act === "nt-click") {
      f.ntClick = el.value === "log" ? null : el.value;
      this.renderEditor();
      return true;
    }
    if (act === "nt-vol") {
      f.ntVolume = Number(el.value) / 100;
      el.closest(".ag-ef-range").querySelector(".ag-ef-val").textContent = `${el.value} %`;
      return true;
    }
    if (act === "volume") {
      f.volume = Number(el.value) / 100;
      el.closest(".ag-ef-range").querySelector(".ag-ef-val").textContent = `${el.value} %`;
      return true;
    }
    if (act === "opt") {
      const key = el.dataset.key;
      f.opts[key] = el.tagName === "SELECT" ? el.value : Number(el.value);
      const val = el.closest(".ag-opt")?.querySelector(".ag-ef-val");
      if (val) val.textContent = this._optText(key, f.opts[key]);
      return true;
    }
    if (act === "df") {
      if (el.hasAttribute("data-bool")) return true;
      const type = el.dataset.type;
      const key = el.dataset.key;
      if (el.type === "range") {
        f.data[key] = Number(el.value);
        const val = el.closest(".ag-ef-range")?.querySelector(".ag-ef-val");
        if (val) val.textContent = el.value;
      } else if (type === "number" || type === "color_temp") f.data[key] = el.value === "" ? "" : Number(el.value);
      else f.data[key] = el.value;
      return true;
    }
    return false;
  }
}
