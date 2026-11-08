// Liste der Sensoren auf der Übersicht (Vorlage: Liste von ha-device-panel): Suche, Filter, Spalten, Gruppierung,
// Sortierung; zeigt Zustand, Batterie, Empfang, Firmware und mehr. Ansicht pro Browser gemerkt (localStorage).

const V = new URL(import.meta.url).search;
const { ic, esc, DC, GONE } = await import(`./common.js${V}`);

const COLUMNS = ["area", "systems", "state", "battery", "forecast", "signal", "firmware", "model", "integration", "changed"];
const DEFAULT_VIEW = { cols: ["area", "systems", "state", "battery", "forecast", "signal", "firmware", "changed"], group: "area", sort: "name", layout: "list" };
const COL_LABEL = { area: "colArea", systems: "colSystems", state: "colState", battery: "colBattery", forecast: "colForecast", signal: "colSignal", firmware: "colFirmware", model: "colModel", integration: "colIntegration", changed: "colChanged" };
const MOTION_CLASSES = new Set(["motion", "occupancy", "presence", "moving"]);
const ZONE_SHORT = { home: "modeHome", away: "modeAway", night: "modeNight" };

export class ListUi {
  constructor(host) {
    this.host = host;
    this.q = "";
    this.filter = "all";
    this.sys = "";
    this.area = "";
    this.view = this._loadView();
  }

  _t(key, vars) {
    return this.host._t(key, vars);
  }

  _loadView() {
    try {
      const v = JSON.parse(localStorage.getItem("alarmageddon.view") || "null");
      if (v && Array.isArray(v.cols)) return { ...DEFAULT_VIEW, ...v, cols: v.cols.filter((c) => COLUMNS.includes(c)) };
    } catch {
      /* privater Modus oder ungültig: Standard */
    }
    return { ...DEFAULT_VIEW, cols: [...DEFAULT_VIEW.cols] };
  }

  _saveView() {
    try {
      localStorage.setItem("alarmageddon.view", JSON.stringify(this.view));
    } catch {
      /* nur für diese Sitzung */
    }
  }

  // Alle Sensoren, die einer Anlage zugeordnet sind (Zonen oder "immer aktiv"), mit ihren Zonen je Anlage
  members() {
    const out = new Map();
    for (const s of this.host._systems()) {
      const ids = new Set(s.modes.flatMap((m) => s.zones?.[m] || []));
      for (const [id, o] of Object.entries(s.sensor_options || {})) if (o.always) ids.add(id);
      for (const id of ids) {
        if (!out.has(id)) out.set(id, []);
        out.get(id).push({ entry: s.entry_id, title: s.title, modes: s.modes.filter((m) => (s.zones?.[m] || []).includes(id)) });
      }
    }
    return out;
  }

  rows() {
    const h = this.host;
    return [...this.members()].map(([id, systems]) => {
      const info = h._sensor(id);
      const st = h._state(id);
      const gone = !st || GONE.has(st.state) || info.missing;
      const battery = h._battery(id);
      const sigState = info.signal ? h._state(info.signal) : null;
      const sigVal = sigState ? Number(sigState.state) : NaN;
      return {
        id, info, systems, gone, battery,
        name: h._name(id),
        area: info.area || this._t("noArea"),
        state: st?.state,
        open: st?.state === "on",
        low: battery !== null && battery < h._lowBattery(),
        signal: Number.isFinite(sigVal) ? { value: sigVal, unit: sigState.attributes.unit_of_measurement || "" } : null,
        changed: st?.last_changed || null,
      };
    });
  }

  _matches(r) {
    if (this.sys && !r.systems.some((s) => s.entry === this.sys)) return false;
    if (this.area && r.area !== this.area) return false;
    if (this.filter === "problems" && !(r.gone || r.low)) return false;
    if (this.filter === "open" && !r.open) return false;
    if (this.filter === "battery" && !r.low) return false;
    if (this.filter === "offline" && !r.gone) return false;
    const q = this.q.trim().toLowerCase();
    if (!q) return true;
    return [r.name, r.id, r.area, r.info.integration, r.info.manufacturer, r.info.model, r.info.sw_version]
      .some((v) => String(v || "").toLowerCase().includes(q));
  }

  _sorted(rows) {
    const by = {
      name: (a, b) => a.name.localeCompare(b.name),
      battery: (a, b) => (a.battery ?? 999) - (b.battery ?? 999) || a.name.localeCompare(b.name),
      changed: (a, b) => String(b.changed || "").localeCompare(String(a.changed || "")),
    }[this.view.sort] || ((a, b) => a.name.localeCompare(b.name));
    return rows.sort(by);
  }

  // ----- Darstellung -----

  toolsHtml() {
    const systems = this.host._systems();
    const areas = [...new Set(this.rows().map((r) => r.area))].sort((a, b) => a.localeCompare(b));
    const sysSel = systems.length > 1
      ? `<select class="ag-select" data-list="sys" aria-label="${esc(this._t("allSystems"))}"><option value="">${esc(this._t("allSystems"))}</option>${systems.map((s) => `<option value="${esc(s.entry_id)}" ${this.sys === s.entry_id ? "selected" : ""}>${esc(s.title)}</option>`).join("")}</select>`
      : "";
    const areaSel = `<select class="ag-select" data-list="area" aria-label="${esc(this._t("allAreas"))}"><option value="">${esc(this._t("allAreas"))}</option>${areas.map((a) => `<option ${this.area === a ? "selected" : ""}>${esc(a)}</option>`).join("")}</select>`;
    return `<div class="ag-list-head"><h2 class="ag-h2">${esc(this._t("listTitle"))}</h2><span class="ag-t2 ag-list-count"></span></div>
      <div class="ag-tools">
        <label class="list-search">${ic("search", 18)}<input type="search" data-list="search" placeholder="${esc(this._t("search"))}" value="${esc(this.q)}" aria-label="${esc(this._t("search"))}">
          <button class="ag-clear" data-list="clear" aria-label="${esc(this._t("clearSearch"))}" ${this.q ? "" : "hidden"}>${ic("close", 16)}</button></label>
        <span class="ag-lchips"></span>${sysSel}${areaSel}<span class="ag-grow"></span>
        ${this.host.hasAttribute("narrow") ? "" : this.host._segHtml("layout", [["list", this._t("layoutList"), "groups"], ["cards", this._t("layoutCards"), "grid"]], this.view.layout, "data-list-layout", "small")}
        <button class="ag-btn" data-list="view">${ic("columns", 18)}${esc(this._t("view"))}</button></div>`;
  }

  chipsHtml(rows) {
    const n = (f) => rows.filter((r) => {
      const saved = this.filter;
      this.filter = f;
      const ok = this._matches(r);
      this.filter = saved;
      return ok;
    }).length;
    return [["all", "filterAll"], ["problems", "filterProblems"], ["open", "filterOpen"], ["battery", "filterLowBattery"], ["offline", "filterOffline"]]
      .map(([k, label]) => {
        const count = n(k);
        return `<button class="ag-chip ${this.filter === k ? "on" : ""} ${count || k === "all" ? "" : "zero"}" data-list="filter" data-filter="${k}">${esc(this._t(label))} <span class="ag-t2">${count}</span></button>`;
      }).join("");
  }

  bodyHtml(rows, narrow) {
    if (!this.members().size) return `<div class="ag-card ag-empty"><span class="ag-t2">${esc(this._t("noMembers"))}</span></div>`;
    const shown = this._sorted(rows.filter((r) => this._matches(r)));
    if (!shown.length) return `<div class="ag-card ag-empty"><span class="ag-t2">${esc(this._t("noSensors"))}</span></div>`;
    const groups = this._groups(shown);
    return narrow || this.view.layout === "cards" ? this._cards(groups, narrow) : this._table(groups);
  }

  _groups(rows) {
    if (this.view.group === "none") return [[null, rows]];
    const map = new Map();
    for (const r of rows) {
      const keys = this.view.group === "system" ? r.systems.map((s) => s.title) : [r.area];
      for (const k of keys) {
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(r);
      }
    }
    return [...map].sort((a, b) => a[0].localeCompare(b[0]));
  }

  _cell(col, r) {
    const h = this.host;
    switch (col) {
      case "area": return esc(r.area);
      case "systems": return r.systems.map((s) => `<span class="ag-ztag" title="${esc(s.title)}">${h._systems().length > 1 ? `${esc(s.title)}: ` : ""}${s.modes.length ? s.modes.map((m) => esc(this._t(ZONE_SHORT[m]))).join(" · ") : esc(this._t("optAlways"))}</span>`).join(" ");
      case "state": return this._stateHtml(r);
      case "battery": return this._batteryHtml(r);
      case "forecast": return this._forecastHtml(r) || `<span class="ag-t2">–</span>`;
      case "signal": return this._signalHtml(r);
      case "firmware": return esc(r.info.sw_version || "–");
      case "model": return `${esc(r.info.manufacturer || "–")}<div class="ag-t2 ag-small">${esc(r.info.model || "")}</div>`;
      case "integration": return esc(r.info.integration || "–");
      case "changed": return r.changed ? `<span title="${esc(h._fmtTime(r.changed))}">${esc(h._fmtAgo(r.changed))}</span>` : "–";
    }
    return "";
  }

  _stateHtml(r) {
    if (r.gone) return `<span class="ag-tag err">${esc(this._t("stUnavailable"))}</span>`;
    const motion = MOTION_CLASSES.has(r.info.device_class);
    if (r.open) return `<span class="ag-tag warn">${esc(this._t(motion ? "stDetected" : "stOpen"))}</span>`;
    return `<span class="ag-tag ok">${esc(this._t(motion ? "stClear" : "stClosed"))}</span>`;
  }

  // Prognose aus alarmageddon/battery_forecast (kommt nach der Liste); ohne genug Verlauf nichts
  _forecastHtml(r) {
    const days = r.info.battery ? this.host._forecast?.[r.info.battery] : null;
    if (days === null || days === undefined) return "";
    let text;
    if (days < 1) text = this._t("fcNow");
    else if (days < 60) text = this._t("fcDays", { count: Math.round(days) });
    else if (days < 365) text = this._t("fcMonths", { count: Math.round(days / 30) });
    else text = this._t("fcYear");
    return `<span class="ag-fc ${days < 30 ? "warn" : ""}" title="${esc(this._t("fcHint"))}">${ic("timer", 14)} ${esc(text)}</span>`;
  }

  _batteryHtml(r) {
    if (r.battery === null) return `<span class="ag-t2">${r.info.battery ? "–" : esc(this._t("mains"))}</span>`;
    const w = Math.max(4, Math.min(100, r.battery));
    return `<span class="ag-bat ${r.low ? "low" : ""}"><i><s style="width:${w}%"></s></i>${r.battery} %</span>`;
  }

  // Empfang je nach Integration als dBm oder LQI; Stufe aus dem Wert (wie ha-device-panel)
  _signalHtml(r) {
    if (!r.signal) return `<span class="ag-t2">–</span>`;
    const { value, unit } = r.signal;
    const dbm = /dbm/i.test(unit) || value < 0;
    const level = dbm ? (value >= -60 ? 4 : value >= -70 ? 3 : value >= -80 ? 2 : 1) : (value >= 150 ? 4 : value >= 100 ? 3 : value >= 60 ? 2 : 1);
    const bars = [1, 2, 3, 4].map((i) => `<i class="${i <= level ? "on" : ""}" style="height:${3 + i * 3}px"></i>`).join("");
    return `<span class="ag-sig l${level}"><span class="ag-bars">${bars}</span>${esc(dbm ? `${value} dBm` : `LQI ${value}`)}</span>`;
  }

  _table(groups) {
    const cols = COLUMNS.filter((c) => this.view.cols.includes(c));
    const head = `<tr><th>${esc(this._t("colName"))}</th>${cols.map((c) => `<th>${esc(this._t(COL_LABEL[c]))}</th>`).join("")}<th></th></tr>`;
    const body = groups.map(([g, rows]) => `${g !== null ? `<tr class="grp"><td colspan="${cols.length + 2}">${esc(g)} · ${rows.length}</td></tr>` : ""}${rows.map((r) => {
      const [icon] = DC[r.info.device_class] || ["sensor"];
      return `<tr class="ag-lrow ${r.gone ? "bad" : ""}" data-act="more" data-entity="${esc(r.id)}"><td><div class="ag-nm"><span class="ag-av ${r.gone ? "missing" : r.open ? "open" : ""}">${ic(r.gone ? "offline" : icon, 18)}</span><div>${esc(r.name)}<small>${esc(this._typeLabel(r))}</small></div></div></td>
        ${cols.map((c) => `<td>${this._cell(c, r)}</td>`).join("")}<td style="width:40px"><span class="ag-cbtn">${ic("chevRight", 16)}</span></td></tr>`;
    }).join("")}`).join("");
    return `<div class="ag-card ag-table-wrap"><table class="ag-table ag-ltable">${head}${body}</table></div>`;
  }

  // Karten: eine je Sensor mit allen Angaben der gewählten Spalten; auf dem Desktop als Raster, auf dem Handy untereinander
  _cards(groups, narrow = false) {
    const on = (c) => this.view.cols.includes(c);
    return `<div class="ag-mcards ${narrow ? "" : "grid"}">${groups.map(([g, rows]) => `${g !== null ? `<div class="ag-group-label">${esc(g)}</div>` : ""}${rows.map((r) => {
      const [icon] = DC[r.info.device_class] || ["sensor"];
      const meta = [this._batteryHtml(r), on("forecast") ? this._forecastHtml(r) : "", on("signal") ? this._signalHtml(r) : "",
        r.info.sw_version && on("firmware") ? `<span class="ag-t2">${ic("chip", 14)} ${esc(r.info.sw_version)}</span>` : ""].filter(Boolean).join("");
      const facts = [
        on("model") && (r.info.manufacturer || r.info.model) ? [this._t("colModel"), [r.info.manufacturer, r.info.model].filter(Boolean).join(" ")] : null,
        on("integration") && r.info.integration ? [this._t("colIntegration"), r.info.integration] : null,
        on("changed") && r.changed ? [this._t("colChanged"), this.host._fmtAgo(r.changed)] : null,
      ].filter(Boolean).map(([k, v]) => `<div><span class="ag-t2">${esc(k)}</span><b>${esc(v)}</b></div>`).join("");
      return `<div class="ag-card ag-mcard ag-lcard" data-act="more" data-entity="${esc(r.id)}"><div class="ag-mcard-top"><span class="ag-av ${r.gone ? "missing" : r.open ? "open" : ""}">${ic(r.gone ? "offline" : icon, 18)}</span>
        <div style="flex:1;min-width:0">${esc(r.name)}<div class="ag-t2 ag-small">${esc(this._typeLabel(r))} · ${esc(r.area)}</div></div>${this._stateHtml(r)}</div>
        ${on("systems") ? `<div class="ag-lz">${this._cell("systems", r)}</div>` : ""}<div class="ag-lmeta">${meta}</div>${facts ? `<div class="ag-lfacts">${facts}</div>` : ""}</div>`;
    }).join("")}`).join("")}</div>`;
  }

  _typeLabel(r) {
    const [, label] = DC[r.info.device_class] || ["sensor", "dcOther"];
    return this._t(label);
  }

  viewDialogHtml() {
    const seg = (key, items) => `<div class="ag-seg small" data-seg="view-${key}"><span class="ag-pill"></span>${items.map(([v, label]) => `<button data-list="vset" data-key="${key}" data-value="${v}" class="${this.view[key] === v ? "on" : ""}">${esc(this._t(label))}</button>`).join("")}</div>`;
    return `<div class="ag-dlg-body"><h3>${esc(this._t("viewTitle"))}</h3>
      <div class="ag-label">${esc(this._t("viewGroup"))}</div>${seg("group", [["area", "groupArea"], ["system", "groupSystem"], ["none", "groupNone"]])}
      <div class="ag-label">${esc(this._t("viewSort"))}</div>${seg("sort", [["name", "sortName"], ["battery", "sortBattery"], ["changed", "sortChanged"]])}
      <div class="ag-label">${esc(this._t("viewColumns"))}</div>
      <div class="ag-colist">${COLUMNS.map((c) => `<label class="ag-colrow"><span>${esc(this._t(COL_LABEL[c]))}</span><button class="ag-toggle ${this.view.cols.includes(c) ? "on" : ""}" data-list="col" data-col="${c}" role="switch" aria-checked="${this.view.cols.includes(c)}" aria-label="${esc(this._t(COL_LABEL[c]))}"></button></label>`).join("")}</div>
      <div class="ag-dlg-btns"><button class="ag-btn" data-list="vreset" style="margin-right:auto">${esc(this._t("viewReset"))}</button><button class="ag-btn primary" data-list="vdone">${esc(this._t("done"))}</button></div></div>`;
  }

  // ----- Ereignisse; true = erledigt -----

  onClick(el) {
    if (el.dataset.listLayout) {
      this.view.layout = el.dataset.listLayout;
      this._saveView();
      el.closest(".ag-seg")?.querySelectorAll(":scope > button").forEach((b) => b.classList.toggle("on", b === el));
      this.host._placePills();
      this.host._renderList();
      return true;
    }
    const act = el.dataset.list;
    if (!act) return false;
    if (act === "filter") {
      this.filter = this.filter === el.dataset.filter && el.dataset.filter !== "all" ? "all" : el.dataset.filter;
      this.host._renderList();
    } else if (act === "clear") {
      const input = this.host._root.querySelector('[data-list="search"]');
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
    } else if (act === "view") {
      const dlg = this.host._root.getElementById("ag-view");
      dlg.innerHTML = this.viewDialogHtml();
      dlg.showModal();
      this.host._placePills();
    } else if (act === "vset") {
      this.view[el.dataset.key] = el.dataset.value;
      this._applyView();
    } else if (act === "col") {
      const c = el.dataset.col;
      this.view.cols = this.view.cols.includes(c) ? this.view.cols.filter((x) => x !== c) : [...this.view.cols, c];
      this._applyView();
    } else if (act === "vreset") {
      this.view = { ...DEFAULT_VIEW, cols: [...DEFAULT_VIEW.cols] };
      this._applyView();
    } else if (act === "vdone") {
      this.host._closeDialog("ag-view");
    } else {
      return false;
    }
    return true;
  }

  _applyView() {
    this._saveView();
    const dlg = this.host._root.getElementById("ag-view");
    dlg.innerHTML = this.viewDialogHtml();
    this.host._placePills();
    this.host._renderList();
  }

  onInput(el) {
    if (el.dataset.list !== "search") return false;
    this.q = el.value;
    this.host._root.querySelector('[data-list="clear"]').hidden = !this.q;
    this.host._renderList();
    return true;
  }

  onChange(el) {
    if (el.dataset.list === "sys") this.sys = el.value;
    else if (el.dataset.list === "area") this.area = el.value;
    else return false;
    this.host._renderList();
    return true;
  }
}

