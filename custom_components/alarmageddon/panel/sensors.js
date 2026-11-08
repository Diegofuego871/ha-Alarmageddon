// Konfiguration › Sensoren: Raster (Zonen je Modus, Eingangsverzögerung) mit Ziehen über Felder, Seitenblatt mit den
// Optionen pro Sensor (Herkunft: Voreinstellung der Sensorart oder eigener Wert) und Fenster "Voreinstellungen".
// Änderungen sind ein Entwurf mit "Abbrechen" und "Speichern" (Regel aus ha-device-panel).

const V = new URL(import.meta.url).search;
const { ic, esc, DC, OPENINGS, MOTION, MODE_KEY, MODE_ICON, OPTIONS, TYPES, DEFAULT_PRESETS, errText } = await import(`./common.js${V}`);

const ALL_MODES = ["home", "away", "night"];

export class SensorsUi {
  constructor(host) {
    this.host = host;
    this.q = "";
    this.filter = "all";
    this.draft = null;
    this.saveState = null;
    this.saving = false;
    this.detail = null; // Sensor im Seitenblatt
    this.paint = null;
    this.skipClick = false;
    this.presetDraft = null;
  }

  _t(key, vars) {
    return this.host._t(key, vars);
  }

  get system() {
    return this.host._system();
  }

  get presets() {
    return this.host._data?.presets || DEFAULT_PRESETS;
  }

  modes(s = this.system) {
    return s?.modes || ["home", "away"];
  }

  // ----- Entwurf -----

  ensureDraft() {
    const s = this.system;
    if (!s) return null;
    if (!this.draft || this.draft.entry !== s.entry_id) {
      this.draft = {
        entry: s.entry_id,
        zones: Object.fromEntries(ALL_MODES.map((m) => [m, new Set(s.zones?.[m] || [])])),
        entrySensors: new Set(s.entry_sensors || []),
        opts: JSON.parse(JSON.stringify(s.sensor_options || {})),
      };
    }
    return this.draft;
  }

  reset() {
    this.draft = null;
    this.saveState = null;
    this.detail = null;
  }

  changedIds() {
    const s = this.system;
    const d = this.draft;
    if (!s || !d || d.entry !== s.entry_id) return new Set();
    const out = new Set();
    for (const m of this.modes(s)) {
      const base = new Set(s.zones?.[m] || []);
      for (const id of d.zones[m]) if (!base.has(id)) out.add(id);
      for (const id of base) if (!d.zones[m].has(id)) out.add(id);
    }
    const baseEntry = new Set(s.entry_sensors || []);
    for (const id of d.entrySensors) if (!baseEntry.has(id)) out.add(id);
    for (const id of baseEntry) if (!d.entrySensors.has(id)) out.add(id);
    const baseOpts = s.sensor_options || {};
    for (const id of new Set([...Object.keys(baseOpts), ...Object.keys(d.opts)])) {
      if (JSON.stringify(sortKeys(baseOpts[id] || {})) !== JSON.stringify(sortKeys(d.opts[id] || {}))) out.add(id);
    }
    return out;
  }

  dirtyCount() {
    return this.changedIds().size;
  }

  preset(id) {
    return this.presets[this.host._sensor(id).type || "other"] || [];
  }

  // Wirksamer Wert: eigener Wert, sonst Voreinstellung der Sensorart
  eff(id, key) {
    const own = this.draft?.opts[id]?.[key];
    return own !== undefined ? own : this.preset(id).includes(key);
  }

  own(id, key) {
    return this.draft?.opts[id]?.[key] !== undefined;
  }

  inActive(id) {
    const d = this.draft;
    return this.modes().some((m) => d.zones[m].has(id));
  }

  setZone(id, mode, value) {
    const d = this.ensureDraft();
    if (!d) return;
    if (value) d.zones[mode].add(id);
    else d.zones[mode].delete(id);
    // Wer in keiner aktiven Zone mehr ist, verliert die Eingangsverzögerung (sonst lehnt der Server ab)
    if (!this.inActive(id)) d.entrySensors.delete(id);
    this.saveState = null;
  }

  setOption(id, key, value) {
    const d = this.ensureDraft();
    const opts = { ...(d.opts[id] || {}) };
    // Gleich wie die Voreinstellung: kein eigener Wert (bleibt so bei geänderter Voreinstellung mit)
    if (value === this.preset(id).includes(key)) delete opts[key];
    else opts[key] = value;
    if (Object.keys(opts).length) d.opts[id] = opts;
    else delete d.opts[id];
    this.saveState = null;
  }

  resetOption(id, key) {
    const d = this.ensureDraft();
    if (!d.opts[id]) return;
    delete d.opts[id][key];
    if (!Object.keys(d.opts[id]).length) delete d.opts[id];
    this.saveState = null;
  }

  // ----- Zeilen -----

  rows() {
    const h = this.host;
    const d = this.ensureDraft();
    if (!d) return [];
    const q = this.q.trim().toLowerCase();
    const chosen = new Set([...this.modes().flatMap((m) => [...d.zones[m]]), ...Object.keys(d.opts)]);
    return Object.entries(h._data?.sensors || {})
      .filter(([id, info]) => {
        const dc = info.device_class;
        if (this.filter === "openings" && !OPENINGS.has(dc)) return false;
        if (this.filter === "motion" && !MOTION.has(dc)) return false;
        if (this.filter === "other" && (OPENINGS.has(dc) || MOTION.has(dc))) return false;
        if (info.missing && !chosen.has(id)) return false;
        if (!q) return true;
        return [h._name(id), id, info.area, info.integration].some((v) => String(v || "").toLowerCase().includes(q));
      })
      .map(([id, info]) => ({ id, info, name: h._name(id), area: info.area || this._t("noArea") }))
      // "Ohne Bereich" ans Ende, sonst alphabetisch nach Bereich und Name
      .sort((a, b) => Number(!a.info.area) - Number(!b.info.area) || a.area.localeCompare(b.area) || a.name.localeCompare(b.name));
  }

  // ----- Darstellung -----

  html() {
    const narrow = this.host.hasAttribute("narrow");
    const filters = [["all", "filterAll"], ["openings", "filterOpenings"], ["motion", "filterMotion"], ["other", "filterOther"]]
      .map(([k, label]) => `<button class="ag-chip ${this.filter === k ? "on" : ""}" data-sen="filter" data-filter="${k}">${esc(this._t(label))}</button>`).join("");
    return `<div class="ag-tools">
        <label class="list-search">${ic("search", 18)}<input type="search" data-sen="search" placeholder="${esc(this._t("search"))}" value="${esc(this.q)}" aria-label="${esc(this._t("search"))}">
          <button class="ag-clear" data-sen="clear" aria-label="${esc(this._t("clearSearch"))}" ${this.q ? "" : "hidden"}>${ic("close", 16)}</button></label>
        ${filters}<span class="ag-grow"></span>${narrow ? "" : `<span class="ag-hint">${ic("hand", 16)}${esc(this._t("dragHint"))}</span>`}
        <button class="ag-btn" data-sen="presets">${ic("tune", 18)}${esc(this._t("presets"))}</button></div>
      <div class="ag-sen-layout"><div class="ag-gbody"></div><div class="ag-side"></div></div><div class="ag-foot"></div>`;
  }

  render() {
    const view = this.host._view;
    const body = view?.querySelector(".ag-gbody");
    if (!body || !this.ensureDraft()) return;
    const rows = this.rows();
    const narrow = this.host.hasAttribute("narrow");
    const changed = this.changedIds();
    if (!rows.length) this.host._setHtml(body, `<div class="ag-card ag-empty"><span class="ag-t2">${esc(this._t("noSensors"))}</span></div>`);
    else this.host._setHtml(body, narrow ? this._cards(rows) : this._table(rows, changed));
    this.renderSide();
    this.renderFoot();
  }

  _bits(r) {
    const h = this.host;
    const st = h._state(r.id)?.state;
    const [icon, label] = DC[r.info.device_class] || ["sensor", "dcOther"];
    const cls = r.info.missing ? "missing" : st === "on" ? "open" : "";
    const active = [
      ...(this.draft.entrySensors.has(r.id) ? [this._t("optEntryShort")] : []),
      ...OPTIONS.filter((o) => this.eff(r.id, o.key)).map((o) => this._t(o.short)),
    ];
    const sub = r.info.missing ? this._t("missing") : [this._t(label), ...active].join(" · ");
    const b = h._battery(r.id);
    const batt = b === null ? `<span class="ag-batt">${r.info.battery ? "–" : esc(this._t("mains"))}</span>` : `<span class="ag-batt ${b < this.host._lowBattery() ? "low" : ""}">${b} %</span>`;
    const ownDot = this.draft.opts[r.id] ? `<span class="ag-owndot" title="${esc(this._t("originOwn"))}"></span>` : "";
    return { av: `<span class="ag-av ${cls}">${ic(r.info.missing ? "offline" : icon, 18)}</span>`, sub, batt, ownDot };
  }

  _table(rows, changed) {
    const d = this.draft;
    const modes = this.modes();
    const head = `<tr><th>${esc(this._t("colSensor"))}</th>${modes.map((m) => `<th class="z">${esc(this._t(MODE_KEY[m]))}<button class="ag-allbtn" data-sen="all" data-mode="${m}">${esc(this._t("all"))}</button></th>`).join("")}
      <th class="z">${esc(this._t("colEntry"))}</th><th>${esc(this._t("colIntegration"))}</th><th>${esc(this._t("colBattery"))}</th><th></th></tr>`;
    let area = null;
    const body = [];
    for (const r of rows) {
      if (r.area !== area) {
        area = r.area;
        body.push(`<tr class="grp"><td colspan="${modes.length + 5}">${esc(area)} · ${rows.filter((x) => x.area === area).length}</td></tr>`);
      }
      const bits = this._bits(r);
      body.push(`<tr class="${changed.has(r.id) ? "changed" : ""} ${this.detail === r.id ? "sel" : ""}"><td><div class="ag-nm">${bits.av}<div>${esc(r.name)}${bits.ownDot}<small>${esc(bits.sub)}</small></div></div></td>
        ${modes.map((m) => {
          const on = d.zones[m].has(r.id);
          return `<td class="z"><button class="ag-box ${on ? "on" : ""}" data-box data-mode="${m}" data-ent="${esc(r.id)}" role="checkbox" aria-checked="${on}" aria-label="${esc(`${r.name}: ${this._t(MODE_KEY[m])}`)}">${on ? ic("check", 18) : ""}</button></td>`;
        }).join("")}
        <td class="z">${this._entryToggle(r)}</td><td>${esc(r.info.integration || "")}</td><td>${bits.batt}</td>
        <td style="width:44px"><button class="ag-cbtn" data-sen="detail" data-ent="${esc(r.id)}" aria-label="${esc(`${r.name}: ${this._t("details")}`)}">${ic("chevRight", 16)}</button></td></tr>`);
    }
    return `<div class="ag-card ag-table-wrap"><table class="ag-table">${head}${body.join("")}</table></div>`;
  }

  _entryToggle(r, extra = "") {
    const d = this.draft;
    const on = d.entrySensors.has(r.id);
    return `<button class="ag-toggle ${on ? "on" : ""}" data-sen="entry" data-ent="${esc(r.id)}" role="switch" aria-checked="${on}" aria-label="${esc(`${r.name}: ${this._t("colEntry")}`)}" ${this.inActive(r.id) ? "" : `disabled title="${esc(this._t("entryHint"))}"`} ${extra}></button>`;
  }

  _cards(rows) {
    const d = this.draft;
    const modes = this.modes();
    let area = null;
    const out = [];
    for (const r of rows) {
      if (r.area !== area) {
        area = r.area;
        out.push(`<div class="ag-group-label">${esc(area)}</div>`);
      }
      const bits = this._bits(r);
      out.push(`<div class="ag-card ag-mcard"><div class="ag-mcard-top">${bits.av}<div style="flex:1;min-width:0">${esc(r.name)}${bits.ownDot}<div class="ag-t2 ag-small">${esc(bits.sub)}</div></div>${bits.batt}
          <button class="ag-cbtn" data-sen="detail" data-ent="${esc(r.id)}" aria-label="${esc(`${r.name}: ${this._t("details")}`)}">${ic("chevRight", 16)}</button></div>
        <div class="ag-zbtns" style="--n:${modes.length}">${modes.map((m) => {
          const on = d.zones[m].has(r.id);
          return `<button class="ag-zbtn ${on ? "on" : ""}" data-sen="zone" data-mode="${m}" data-ent="${esc(r.id)}" aria-pressed="${on}">${ic(MODE_ICON[m], 16)}${esc(this._t(MODE_KEY[m]))}</button>`;
        }).join("")}</div></div>`);
    }
    return `<div class="ag-mcards">${out.join("")}</div>`;
  }

  // Seitenblatt (Desktop rechts neben der Tabelle, Handy als Blatt von unten)
  sideHtml(id) {
    const h = this.host;
    const info = h._sensor(id);
    const [icon, label] = DC[info.device_class] || ["sensor", "dcOther"];
    const typeLabel = this._t((TYPES.find(([k]) => k === (info.type || "other")) || TYPES[5])[2]);
    const d = this.draft;
    const r = { id, name: h._name(id) };
    const meta = [this._t(label), info.area, info.integration].filter(Boolean).join(" · ");
    const zones = this.modes().map((m) => `<button class="ag-chip ${d.zones[m].has(id) ? "on" : ""}" data-sen="zone" data-mode="${m}" data-ent="${esc(id)}" aria-pressed="${d.zones[m].has(id)}">${ic(MODE_ICON[m], 16)}${esc(this._t(MODE_KEY[m]))}</button>`).join("");
    const entryRow = `<div class="ag-orow"><span class="ag-oav ${d.entrySensors.has(id) ? "on" : ""}">${ic("timer", 18)}</span><div class="ag-otx"><b>${esc(this._t("colEntry"))}</b><small>${esc(this._t("optEntryHint"))}</small></div>${this._entryToggle(r)}</div>`;
    const opts = OPTIONS.map((o) => {
      const on = this.eff(id, o.key);
      const own = this.own(id, o.key);
      const origin = own
        ? `<button class="ag-origin own" data-sen="reset-opt" data-ent="${esc(id)}" data-key="${o.key}">${ic("undo", 14)} ${esc(this._t("originOwn"))} · ${esc(this._t("resetToPreset"))}</button>`
        : `<span class="ag-origin">${esc(this._t("originPreset", { type: typeLabel }))}</span>`;
      return `<div class="ag-orow"><span class="ag-oav ${on ? "on" : ""}">${ic(o.icon, 18)}</span><div class="ag-otx"><b>${esc(this._t(o.name))}</b><small>${esc(this._t(o.hint))}</small>${origin}</div>
        <button class="ag-toggle ${on ? "on" : ""}" data-sen="opt" data-ent="${esc(id)}" data-key="${o.key}" role="switch" aria-checked="${on}" aria-label="${esc(`${r.name}: ${this._t(o.name)}`)}"></button></div>`;
    }).join("");
    return `<div class="ag-side-head"><span class="ag-shield" style="width:46px;height:46px;border-radius:14px;background:var(--ag-primary-soft);color:var(--ag-primary)">${ic(icon, 24)}</span>
        <div style="flex:1;min-width:0"><h3>${esc(r.name)}</h3><div class="ag-t2 ag-small">${esc(meta)}</div></div>
        <button class="ag-iconbtn" data-sen="close-detail" aria-label="${esc(this._t("cancel"))}">${ic("close", 22)}</button></div>
      <div class="ag-side-body"><div class="ag-label">${esc(this._t("zones"))}</div><div class="ag-zline">${zones}</div>
        <div class="ag-label">${esc(this._t("behaviour"))}</div>${entryRow}${opts}</div>`;
  }

  renderSide() {
    const h = this.host;
    const side = h._view?.querySelector(".ag-side");
    const layout = h._view?.querySelector(".ag-sen-layout");
    const narrow = h.hasAttribute("narrow");
    const dlg = h._root.getElementById("ag-sheet");
    if (!side) return;
    if (!this.detail) {
      layout?.classList.remove("open");
      h._setHtml(side, "");
      if (dlg.open) dlg.close();
      return;
    }
    if (narrow) {
      h._setHtml(side, "");
      layout?.classList.remove("open");
      h._setHtml(dlg, `<div class="ag-grab"></div>${this.sideHtml(this.detail)}<div class="ag-dlg-btns" style="padding:12px 18px"><button class="ag-btn primary" data-sen="close-detail">${esc(this._t("done"))}</button></div>`);
      if (!dlg.open) dlg.showModal();
    } else {
      layout?.classList.add("open");
      h._setHtml(side, `<div class="ag-card ag-sheet">${this.sideHtml(this.detail)}</div>`);
    }
  }

  renderFoot() {
    const h = this.host;
    const foot = h._view?.querySelector(".ag-foot");
    if (!foot) return;
    const n = this.dirtyCount();
    let status;
    if (this.saveState === "saved" && !n) status = `<span class="ag-saved">${ic("check", 16)} ${esc(this._t("saved"))}</span>`;
    else if (this.saveState && this.saveState !== "saved") status = `<span class="ag-err">${esc(this.saveState)}</span>`;
    else status = `<span class="ag-t2">${esc(n === 0 ? this._t("noChanges") : n === 1 ? this._t("change") : this._t("changes", { count: n }))}</span>`;
    h._setHtml(foot, `${status}<span class="ag-grow"></span><button class="ag-btn" data-sen="cancel" ${n ? "" : "disabled"}>${esc(this._t("cancel"))}</button>
      <button class="ag-btn primary" data-sen="save" ${n && !this.saving ? "" : "disabled"}>${ic("check", 18)}${esc(this._t("save"))}</button>`);
  }

  async save() {
    const h = this.host;
    const s = this.system;
    const d = this.draft;
    if (!s || !d || this.saving) return;
    // Bisherige Reihenfolge behalten, neue Sensoren hinten anfügen
    const order = (m) => [...(s.zones?.[m] || []).filter((id) => d.zones[m].has(id)), ...[...d.zones[m]].filter((id) => !(s.zones?.[m] || []).includes(id)).sort()];
    const zones = Object.fromEntries(ALL_MODES.map((m) => [m, order(m)]));
    this.saving = true;
    this.renderFoot();
    try {
      await h._hass.callWS({ type: "alarmageddon/save_zones", entry_id: s.entry_id, zones, entry_sensors: [...d.entrySensors].sort(), sensor_options: d.opts });
      // Sofort als gespeichert zeigen; die Anlage lädt neu, die Daten kommen gleich nach
      s.zones = zones;
      s.entry_sensors = [...d.entrySensors].sort();
      s.sensor_options = JSON.parse(JSON.stringify(d.opts));
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

  // ----- Voreinstellungen je Sensorart -----

  presetsHtml() {
    const p = this.presetDraft;
    const rows = TYPES.map(([kind, icon, label]) => `<tr><td><div class="ag-nm"><span class="ag-av">${ic(icon, 18)}</span>${esc(this._t(label))}</div></td>
      ${OPTIONS.map((o) => {
        const on = (p[kind] || []).includes(o.key);
        return `<td class="z"><button class="ag-box ${on ? "on" : ""}" data-sen="preset" data-kind="${kind}" data-key="${o.key}" role="checkbox" aria-checked="${on}" aria-label="${esc(`${this._t(label)}: ${this._t(o.name)}`)}">${on ? ic("check", 18) : ""}</button></td>`;
      }).join("")}</tr>`).join("");
    const own = this.host._systems().reduce((n, s) => n + Object.keys(s.sensor_options || {}).length, 0);
    return `<div class="ag-dlg-body"><h3>${esc(this._t("presetsTitle"))}</h3><div class="ag-t2">${esc(this._t("presetsText"))}</div>
      <div class="ag-table-wrap"><table class="ag-table ag-ptable"><tr><th>${esc(this._t("colType"))}</th>${OPTIONS.map((o) => `<th class="z">${esc(this._t(o.name))}</th>`).join("")}</tr>${rows}</table></div>
      <div class="ag-t2 ag-small">${own ? esc(this._t("presetsOwnCount", { count: own })) : ""}</div><div class="ag-dlg-err" aria-live="polite"></div>
      <div class="ag-dlg-btns"><button class="ag-btn" data-sen="presets-restore" style="margin-right:auto">${esc(this._t("presetsRestore"))}</button>
        <button class="ag-btn" data-sen="presets-cancel">${esc(this._t("cancel"))}</button><button class="ag-btn primary" data-sen="presets-save">${esc(this._t("save"))}</button></div></div>`;
  }

  openPresets() {
    this.presetDraft = JSON.parse(JSON.stringify(this.presets));
    const dlg = this.host._root.getElementById("ag-presets");
    dlg.innerHTML = this.presetsHtml();
    dlg.showModal();
  }

  async savePresets() {
    const h = this.host;
    const dlg = h._root.getElementById("ag-presets");
    try {
      await h._hass.callWS({ type: "alarmageddon/save_presets", presets: this.presetDraft });
      if (h._data) h._data.presets = JSON.parse(JSON.stringify(this.presetDraft));
      dlg.close();
      h._toast(this._t("presetsSaved"));
      this.render();
      h._fetch();
    } catch (err) {
      dlg.querySelector(".ag-dlg-err").textContent = this._t("saveFailed", { message: errText(err) });
    }
  }

  // ----- Ereignisse; true = erledigt -----

  onClick(el, ev) {
    if (ev.target.closest("[data-box]") && !el?.dataset.sen) {
      // Tastatur (Enter, Leertaste) löst nur click aus; Maus und Finger laufen über pointerdown
      if (this.skipClick) {
        this.skipClick = false;
        return true;
      }
      const box = ev.target.closest("[data-box]");
      this.setZone(box.dataset.ent, box.dataset.mode, !box.classList.contains("on"));
      this.render();
      return true;
    }
    const act = el?.dataset.sen;
    if (!act) return false;
    const id = el.dataset.ent;
    if (act === "filter") {
      this.filter = el.dataset.filter;
      this.host._view.querySelectorAll('[data-sen="filter"]').forEach((b) => b.classList.toggle("on", b === el));
      this.render();
    } else if (act === "clear") {
      ev.preventDefault();
      const input = this.host._view.querySelector('[data-sen="search"]');
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
    } else if (act === "all") {
      const rows = this.rows();
      const mode = el.dataset.mode;
      const value = !rows.every((r) => this.draft.zones[mode].has(r.id));
      rows.forEach((r) => this.setZone(r.id, mode, value));
      this.render();
    } else if (act === "zone") {
      this.setZone(id, el.dataset.mode, !this.draft.zones[el.dataset.mode].has(id));
      this.render();
    } else if (act === "entry") {
      const d = this.ensureDraft();
      if (d.entrySensors.has(id)) d.entrySensors.delete(id);
      else d.entrySensors.add(id);
      this.saveState = null;
      this.render();
    } else if (act === "opt") {
      this.setOption(id, el.dataset.key, !this.eff(id, el.dataset.key));
      this.render();
    } else if (act === "reset-opt") {
      this.resetOption(id, el.dataset.key);
      this.render();
    } else if (act === "detail") {
      this.detail = this.detail === id && !this.host.hasAttribute("narrow") ? null : id;
      this.render();
    } else if (act === "close-detail") {
      this.detail = null;
      this.render();
    } else if (act === "cancel") {
      this.draft = null;
      this.saveState = null;
      this.render();
    } else if (act === "save") {
      this.save();
    } else if (act === "presets") {
      this.openPresets();
    } else if (act === "preset") {
      const list = new Set(this.presetDraft[el.dataset.kind] || []);
      if (list.has(el.dataset.key)) list.delete(el.dataset.key);
      else list.add(el.dataset.key);
      this.presetDraft[el.dataset.kind] = OPTIONS.map((o) => o.key).filter((k) => list.has(k));
      this.host._setHtml(this.host._root.getElementById("ag-presets"), this.presetsHtml());
    } else if (act === "presets-restore") {
      this.presetDraft = JSON.parse(JSON.stringify(DEFAULT_PRESETS));
      this.host._setHtml(this.host._root.getElementById("ag-presets"), this.presetsHtml());
    } else if (act === "presets-cancel") {
      this.host._closeDialog("ag-presets");
    } else if (act === "presets-save") {
      this.savePresets();
    } else {
      return false;
    }
    return true;
  }

  onInput(el) {
    if (el.dataset.sen !== "search") return false;
    this.q = el.value;
    this.host._view.querySelector('[data-sen="clear"]').hidden = !this.q;
    // Nur die Liste neu, Suchfeld behält Fokus und Cursor (LEARNINGS)
    this.render();
    return true;
  }

  // Ziehen über mehrere Kästchen derselben Spalte setzt alle auf den Wert des ersten
  onPointerDown(ev) {
    const box = ev.target.closest("[data-box]");
    if (!box || ev.button > 0 || !this.host._view?.contains(box)) return;
    ev.preventDefault();
    const value = !box.classList.contains("on");
    this.paint = { mode: box.dataset.mode, value, touched: new Set([box.dataset.ent]) };
    this.setZone(box.dataset.ent, box.dataset.mode, value);
    paintBox(box, value);
    this.skipClick = true;
  }

  onPointerMove(ev) {
    if (!this.paint) return;
    const el = this.host._root.elementFromPoint(ev.clientX, ev.clientY)?.closest?.("[data-box]");
    if (!el || el.dataset.mode !== this.paint.mode || this.paint.touched.has(el.dataset.ent)) return;
    this.paint.touched.add(el.dataset.ent);
    this.setZone(el.dataset.ent, el.dataset.mode, this.paint.value);
    paintBox(el, this.paint.value);
  }

  endPaint() {
    if (!this.paint) return;
    this.paint = null;
    this.render();
  }
}

// Während des Ziehens nur das Kästchen ändern, erst beim Loslassen neu aufbauen (LEARNINGS)
function paintBox(box, value) {
  box.classList.toggle("on", value);
  box.setAttribute("aria-checked", String(value));
  box.innerHTML = value ? ic("check", 18) : "";
}

function sortKeys(o) {
  return Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
}
