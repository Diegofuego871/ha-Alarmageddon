// Konfiguration › Aktionen: pro Anlage und Alarm (Modus Anwesend, Abwesend, Nacht, "immer aktiv") ein Ablauf als
// Zeitachse. Bausteine: Push-Meldung, Einschalten, Ausschalten, Rollläden, Alarmton auf Medienplayern, Warten, Skript,
// eigene Aktion. Gespeichert werden Schritte im Format des Servers (workflow.py); Entwurf mit "Speichern".

const V = new URL(import.meta.url).search;
const { ic, esc, MODE_ICON, MODE_KEY, errText } = await import(`./common.js${V}`);

const SWITCHABLE = ["siren", "switch", "light", "fan", "input_boolean"];
export const KINDS = [
  { kind: "notify", icon: "bell", label: "stepNotify", hint: "stepNotifyHint" },
  { kind: "on", icon: "power", label: "stepOn", hint: "stepOnHint", domains: SWITCHABLE, restore: true },
  { kind: "off", icon: "powerOff", label: "stepOff", hint: "stepOffHint", domains: SWITCHABLE, restore: true },
  { kind: "open", icon: "blindsOpen", label: "stepOpen", hint: "stepOpen", domains: ["cover"], restore: false },
  { kind: "close", icon: "blinds", label: "stepClose", hint: "stepClose", domains: ["cover"], restore: false },
  { kind: "sound", icon: "speaker", label: "stepSound", hint: "stepSoundHint", domains: ["media_player"] },
  { kind: "wait", icon: "timer", label: "stepWait", hint: "stepWaitHint" },
  { kind: "script", icon: "script", label: "stepScript", hint: "stepScriptHint", domains: ["script"] },
  { kind: "custom", icon: "cog", label: "stepCustom", hint: "stepCustomHint", domains: null },
];
const SOUND_KEY = { siren: "sndSiren", beep: "sndBeep", klaxon: "sndKlaxon", warning: "sndWarning", chime: "sndChime" };

// Schritt des Servers -> Formular (welcher Baustein ist es?)
export function fromStep(step) {
  const f = { kind: "custom", targets: [], restore: false, seconds: 30, sound: "siren", volume: 0.7, repeat: 3, action: "", data: "{}" };
  if (step.type === "notify") return { ...f, kind: "notify" };
  if (step.type === "wait") return { ...f, kind: "wait", seconds: step.seconds };
  if (step.type === "sound") return { ...f, kind: "sound", targets: [...step.players], sound: step.sound, volume: step.volume ?? null, repeat: step.repeat || 1, restore: step.restore !== false };
  const action = String(step.action || "");
  const data = step.data && Object.keys(step.data).length ? JSON.stringify(step.data, null, 2) : "{}";
  const base = { ...f, targets: [...(step.target || [])], restore: !!step.restore, action, data };
  if (data === "{}") {
    if (action === "cover.open_cover") return { ...base, kind: "open" };
    if (action === "cover.close_cover") return { ...base, kind: "close" };
    if (action === "script.turn_on") return { ...base, kind: "script" };
    if (/\.turn_on$/.test(action) && !action.startsWith("script.")) return { ...base, kind: "on" };
    if (/\.turn_off$/.test(action) && !action.startsWith("script.")) return { ...base, kind: "off" };
  }
  return base;
}

// Formular -> Schritt des Servers
export function toStep(f) {
  if (f.kind === "notify") return { type: "notify" };
  if (f.kind === "wait") return { type: "wait", seconds: Math.max(0, Math.round(Number(f.seconds) || 0)) };
  if (f.kind === "sound") return { type: "sound", players: f.targets, sound: f.sound, volume: f.volume === null ? null : Number(f.volume), repeat: Math.max(1, Math.round(Number(f.repeat) || 1)), restore: !!f.restore };
  const domains = [...new Set(f.targets.map((e) => e.split(".")[0]))];
  const one = domains.length === 1 ? domains[0] : "homeassistant";
  const action = { on: `${one}.turn_on`, off: `${one}.turn_off`, open: "cover.open_cover", close: "cover.close_cover", script: "script.turn_on" }[f.kind] || f.action.trim();
  const data = f.kind === "custom" ? JSON.parse(f.data || "{}") : {};
  return { type: "action", action, target: f.targets, data, restore: !!f.restore };
}

export class ActionsUi {
  constructor(host) {
    this.host = host;
    this.trigger = host._loadPref("trigger", "away");
    this.draft = null;
    this.saveState = null;
    this.saving = false;
    this.edit = null; // { index, insert, form, q, error }
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
    if (!this.draft || this.draft.entry !== s.entry_id) this.draft = { entry: s.entry_id, wf: JSON.parse(JSON.stringify(s.workflows || {})) };
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
    for (const k of all) if (JSON.stringify((s.workflows || {})[k] || []) !== JSON.stringify(d.wf[k] || [])) n += 1;
    return n;
  }

  html() {
    return `<div class="ag-wf-head"></div><div class="ag-wf"></div><div class="ag-foot"></div>`;
  }

  render() {
    const h = this.host;
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
    const plus = (i) => `<div class="ag-wf-plus"><button class="ag-wf-add" data-wf="add" data-at="${i}" aria-label="${esc(this._t("wfAdd"))}">${ic("plus", 18)}</button></div>`;
    const cards = steps.map((step, i) => this._card(step, i, steps.length)).map((c, i) => c + plus(i + 1)).join("");
    h._setHtml(body, `<div class="ag-wf-line">
        <div class="ag-wf-start"><span class="ag-mini err">${ic("alert", 16)}</span>${esc(this._t("wfStart"))}</div>${plus(0)}
        ${steps.length ? cards : `<div class="ag-card ag-empty ag-wf-empty"><span class="ag-t2">${esc(this._t("wfEmpty"))}</span><button class="ag-btn primary" data-wf="add" data-at="0">${ic("plus", 18)}${esc(this._t("wfAdd"))}</button></div>`}
      </div><div class="ag-t2 ag-small ag-wf-info">${ic("restore", 14)} ${esc(this._t("wfStopInfo"))}</div>`);
    h._placePills();
    this.renderFoot();
  }

  _card(step, i, n) {
    const f = fromStep(step);
    const k = KINDS.find((x) => x.kind === f.kind);
    const name = (id) => this.host._name(id);
    let summary = "";
    if (f.kind === "notify") summary = this._t("stepNotifyHint");
    else if (f.kind === "wait") summary = this._t("stepWaitSummary", { seconds: f.seconds });
    else if (f.kind === "sound") summary = `${this._t(SOUND_KEY[f.sound] || "sndSiren")} · ${f.targets.map(name).join(", ") || this._t("stepNoTargets")}${f.volume !== null ? ` · ${Math.round(f.volume * 100)} %` : ""}${f.repeat > 1 ? ` · ${f.repeat}×` : ""}`;
    else if (f.kind === "custom") summary = `${f.action}${f.targets.length ? ` · ${f.targets.map(name).join(", ")}` : ""}`;
    else summary = f.targets.map(name).join(", ") || this._t("stepNoTargets");
    const restore = (f.kind === "sound" || f.restore) && f.kind !== "notify" && f.kind !== "wait" ? `<span class="ag-tag none" title="${esc(this._t("wfRestoreMark"))}">${ic("restore", 12)}</span>` : "";
    return `<div class="ag-card ag-wf-step" data-index="${i}"><span class="ag-wf-icon k-${f.kind}">${ic(k.icon, 20)}</span>
      <div class="ag-wf-text"><b>${esc(this._t(k.label))}</b> ${restore}<div class="ag-t2 ag-small">${esc(summary)}</div></div>
      <div class="ag-wf-btns"><button class="ag-iconbtn" data-wf="up" data-index="${i}" ${i === 0 ? "disabled" : ""} aria-label="${esc(this._t("stepUp"))}">${ic("arrowUp", 18)}</button>
        <button class="ag-iconbtn" data-wf="down" data-index="${i}" ${i === n - 1 ? "disabled" : ""} aria-label="${esc(this._t("stepDown"))}">${ic("arrowDown", 18)}</button>
        <button class="ag-iconbtn" data-wf="edit" data-index="${i}" aria-label="${esc(this._t("stepEdit"))}">${ic("pencil", 18)}</button>
        <button class="ag-iconbtn" data-wf="delete" data-index="${i}" aria-label="${esc(this._t("stepDelete"))}">${ic("trash", 18)}</button></div></div>`;
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

  // ----- Schritt-Auswahl und Editor (Dialog) -----

  _dlg() {
    return this.host._root.getElementById("ag-step");
  }

  openPicker(at) {
    this.edit = { insert: at, index: null, form: null, q: "", error: "" };
    const dlg = this._dlg();
    dlg.innerHTML = `<div class="ag-dlg-body"><h3>${esc(this._t("stepPick"))}</h3><div class="ag-kinds">${KINDS.map((k) => `<button class="ag-kind" data-wf="kind" data-kind="${k.kind}"><span class="ag-wf-icon k-${k.kind}">${ic(k.icon, 22)}</span><b>${esc(this._t(k.label))}</b><small>${esc(this._t(k.hint))}</small></button>`).join("")}</div>
      <div class="ag-dlg-btns"><button class="ag-btn" data-wf="close">${esc(this._t("cancel"))}</button></div></div>`;
    dlg.showModal();
  }

  openEditor(form) {
    this.edit.form = form;
    this.renderEditor();
    if (!this._dlg().open) this._dlg().showModal();
  }

  _entities(domains) {
    const states = this.host._hass?.states || {};
    const q = (this.edit.q || "").toLowerCase();
    return Object.values(states)
      .filter((s) => !domains || domains.includes(s.entity_id.split(".")[0]))
      .map((s) => ({ id: s.entity_id, name: s.attributes.friendly_name || s.entity_id }))
      .filter((e) => !q || e.name.toLowerCase().includes(q) || e.id.includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 150);
  }

  renderEditor() {
    const f = this.edit.form;
    const k = KINDS.find((x) => x.kind === f.kind);
    const fields = [];
    if (k.domains !== undefined && f.kind !== "notify" && f.kind !== "wait") {
      const list = this._entities(k.domains);
      const selected = f.targets.filter((id) => !list.some((e) => e.id === id)).map((id) => ({ id, name: this.host._name(id) }));
      fields.push(`<div class="ag-label">${esc(this._t(f.kind === "sound" ? "fldPlayers" : "fldDevices"))}</div>
        <label class="list-search">${ic("search", 18)}<input type="search" data-wf="eq" placeholder="${esc(this._t("search"))}" value="${esc(this.edit.q)}" aria-label="${esc(this._t("search"))}">
          <button class="ag-clear" data-wf="eq-clear" aria-label="${esc(this._t("clearSearch"))}" ${this.edit.q ? "" : "hidden"}>${ic("close", 16)}</button></label>
        <div class="ag-elist">${[...selected, ...list].map((e) => {
          const on = f.targets.includes(e.id);
          return `<button class="ag-erow ${on ? "on" : ""}" data-wf="ent" data-ent="${esc(e.id)}" role="checkbox" aria-checked="${on}"><span class="ag-box ${on ? "on" : ""}">${on ? ic("check", 16) : ""}</span><span class="ag-grow">${esc(e.name)}<small class="ag-t2">${esc(e.id)}</small></span></button>`;
        }).join("") || `<div class="ag-t2 ag-small" style="padding:10px">${esc(this._t("fldNoEntities"))}</div>`}</div>`);
    }
    if (f.kind === "notify") fields.push(`<div class="ag-t2">${esc(this._t("stepNotifyHint"))}</div>`);
    if (f.kind === "wait") fields.push(`<label class="ag-fld"><span class="ag-label">${esc(this._t("fldSeconds"))}</span><span class="ag-num"><input type="number" min="0" max="3600" data-wf="f" data-key="seconds" value="${esc(f.seconds)}" aria-label="${esc(this._t("fldSeconds"))}"><span class="ag-t2">s</span></span></label>`);
    if (f.kind === "sound") {
      const sounds = this.host._data?.sounds || [];
      fields.push(`<div class="ag-label">${esc(this._t("fldSound"))}</div><div class="ag-sounds">${sounds.map((s) => `<span class="ag-sound ${f.sound === s.id ? "on" : ""}"><button class="ag-chip ${f.sound === s.id ? "on" : ""}" data-wf="sound" data-sound="${s.id}">${esc(this._t(SOUND_KEY[s.id] || s.id))}</button><button class="ag-iconbtn ag-small" data-wf="preview" data-url="${esc(s.url)}" aria-label="${esc(`${this._t("fldPreview")}: ${this._t(SOUND_KEY[s.id] || s.id)}`)}">${ic("play", 16)}</button></span>`).join("")}</div>
        <label class="ag-fld"><span class="ag-label">${esc(this._t("fldVolume"))}: <b>${f.volume === null ? esc(this._t("fldVolumeKeep")) : `${Math.round(f.volume * 100)} %`}</b></span>
          <input type="range" min="0" max="100" step="5" data-wf="f" data-key="volume" value="${f.volume === null ? 50 : Math.round(f.volume * 100)}" aria-label="${esc(this._t("fldVolume"))}"></label>
        <label class="ag-fld"><span class="ag-label">${esc(this._t("fldRepeat"))}</span><span class="ag-num"><input type="number" min="1" max="50" data-wf="f" data-key="repeat" value="${esc(f.repeat)}" aria-label="${esc(this._t("fldRepeat"))}"><span class="ag-t2">×</span></span></label>`);
    }
    if (f.kind === "custom") {
      fields.push(`<label class="ag-fld"><span class="ag-label">${esc(this._t("fldAction"))}</span><input class="ag-input" data-wf="f" data-key="action" value="${esc(f.action)}" placeholder="${esc(this._t("fldActionHint"))}" aria-label="${esc(this._t("fldAction"))}"></label>
        <label class="ag-fld"><span class="ag-label">${esc(this._t("fldData"))}</span><textarea class="ag-input ag-mono" rows="4" data-wf="f" data-key="data" aria-label="${esc(this._t("fldData"))}">${esc(f.data)}</textarea></label>`);
    }
    if (["on", "off", "open", "close", "sound", "custom"].includes(f.kind)) {
      fields.push(`<div class="ag-setrow" style="border:0;padding:6px 0"><div class="ag-settx"><b>${esc(this._t("fldRestore"))}</b>${f.kind === "sound" ? `<small>${esc(this._t("fldRestoreSoundHint"))}</small>` : ""}</div>
        <button class="ag-toggle ${f.restore ? "on" : ""}" data-wf="restore" role="switch" aria-checked="${f.restore}" aria-label="${esc(this._t("fldRestore"))}"></button></div>`);
    }
    // Suchfeld behält den Fokus: nur die Liste neu, wenn darin getippt wird (siehe onInput)
    this.host._setHtml(this._dlg(), `<div class="ag-dlg-body ag-step-ed"><div class="ag-sys-top"><span class="ag-wf-icon k-${f.kind}">${ic(k.icon, 22)}</span><h3>${esc(this._t(k.label))}</h3></div>
      ${fields.join("")}<div class="ag-dlg-err" aria-live="polite">${esc(this.edit.error || "")}</div>
      <div class="ag-dlg-btns"><button class="ag-btn" data-wf="close">${esc(this._t("cancel"))}</button><button class="ag-btn primary" data-wf="apply">${esc(this._t("apply"))}</button></div></div>`);
  }

  apply() {
    const f = this.edit.form;
    let step;
    if (f.kind === "custom") {
      if (!/^[a-z0-9_]+\.[a-z0-9_]+$/.test(f.action.trim())) return this._editError("fldActionInvalid");
      try {
        JSON.parse(f.data || "{}");
      } catch {
        return this._editError("fldDataInvalid");
      }
    }
    if (["on", "off", "open", "close", "sound", "script"].includes(f.kind) && !f.targets.length) return this._editError("stepNoTargets");
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
    this.edit = null;
    this._dlg().close();
    this.render();
  }

  _editError(key, text) {
    this.edit.error = text || this._t(key);
    this.renderEditor();
  }

  async save() {
    const h = this.host;
    const s = this.system;
    const d = this.draft;
    if (!s || !d || this.saving) return;
    this.saving = true;
    this.renderFoot();
    try {
      const wf = Object.fromEntries(this.triggers(s).map((t) => [t, d.wf[t] || []]));
      await h._hass.callWS({ type: "alarmageddon/save_workflows", entry_id: s.entry_id, workflows: wf });
      s.workflows = JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(wf).filter(([, v]) => v.length))));
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

  async test(stop) {
    const h = this.host;
    const s = this.system;
    try {
      await h._hass.callWS(stop ? { type: "alarmageddon/stop_workflow", entry_id: s.entry_id } : { type: "alarmageddon/test_workflow", entry_id: s.entry_id, trigger: this.trigger });
      s.workflow_running = stop ? null : this.trigger;
      s.workflow_test = !stop;
      this.render();
      if (!stop) setTimeout(() => h._fetch(), 61000);
    } catch (err) {
      h._toast(this._t("errGeneric", { message: errText(err) }));
    }
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
    const d = this.ensureDraft();
    const i = Number(el.dataset.index);
    const list = d?.wf[this.trigger] || [];
    if (act === "add") this.openPicker(Number(el.dataset.at));
    else if (act === "kind") {
      const k = KINDS.find((x) => x.kind === el.dataset.kind);
      this.openEditor({ ...fromStep({ type: "action", action: "" }), kind: k.kind, restore: k.kind === "sound" ? true : !!k.restore, volume: 0.7, repeat: 3, sound: "siren" });
    } else if (act === "edit") {
      this.edit = { index: i, insert: null, form: fromStep(list[i]), q: "", error: "" };
      this.renderEditor();
      this._dlg().showModal();
    } else if (act === "delete") {
      list.splice(i, 1);
      d.wf[this.trigger] = list;
      this.saveState = null;
      this.render();
    } else if (act === "up" || act === "down") {
      const j = act === "up" ? i - 1 : i + 1;
      [list[i], list[j]] = [list[j], list[i]];
      d.wf[this.trigger] = list;
      this.saveState = null;
      this.render();
    } else if (act === "ent") {
      const f = this.edit.form;
      const id = el.dataset.ent;
      f.targets = f.targets.includes(id) ? f.targets.filter((x) => x !== id) : [...f.targets, id];
      this.renderEditor();
    } else if (act === "sound") {
      this.edit.form.sound = el.dataset.sound;
      this.renderEditor();
    } else if (act === "preview") {
      this._preview?.pause();
      this._preview = new Audio(el.dataset.url);
      this._preview.play().catch(() => {});
    } else if (act === "restore") {
      this.edit.form.restore = !this.edit.form.restore;
      this.renderEditor();
    } else if (act === "eq-clear") {
      const input = this._dlg().querySelector('[data-wf="eq"]');
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
    } else if (act === "apply") this.apply();
    else if (act === "close") {
      this._preview?.pause();
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

  onInput(el) {
    const act = el.dataset.wf;
    if (!act || !this.edit) return false;
    if (act === "eq") {
      this.edit.q = el.value;
      // Nur die Liste neu aufbauen, damit das Suchfeld den Fokus behält (LEARNINGS)
      const list = this._dlg().querySelector(".ag-elist");
      const html = this._listHtml();
      if (list) list.innerHTML = html;
      this._dlg().querySelector('[data-wf="eq-clear"]').hidden = !el.value;
      return true;
    }
    if (act === "f") {
      const key = el.dataset.key;
      this.edit.form[key] = key === "volume" ? Number(el.value) / 100 : el.value;
      if (key === "volume") el.closest(".ag-fld").querySelector("b").textContent = `${el.value} %`;
      return true;
    }
    return false;
  }

  _listHtml() {
    const f = this.edit.form;
    const k = KINDS.find((x) => x.kind === f.kind);
    const list = this._entities(k.domains);
    return list.map((e) => {
      const on = f.targets.includes(e.id);
      return `<button class="ag-erow ${on ? "on" : ""}" data-wf="ent" data-ent="${esc(e.id)}" role="checkbox" aria-checked="${on}"><span class="ag-box ${on ? "on" : ""}">${on ? ic("check", 16) : ""}</span><span class="ag-grow">${esc(e.name)}<small class="ag-t2">${esc(e.id)}</small></span></button>`;
    }).join("") || `<div class="ag-t2 ag-small" style="padding:10px">${esc(this._t("fldNoEntities"))}</div>`;
  }
}
