// Liste der Sensoren auf der Übersicht (Vorlage: Liste von ha-device-panel): Suche, Filter, Spalten, Gruppierung,
// Sortierung; zeigt Zustand, Batterie, Empfang, Firmware und mehr. Ansicht pro Browser gemerkt (localStorage).

const V = new URL(import.meta.url).search;
const { ic, esc, DC, GONE, TYPES } = await import(`./common.js${V}`);

const COLUMNS = ["area", "systems", "state", "battery", "forecast", "signal", "firmware", "model", "integration", "changed"];
// Ansicht je Gerätetyp (wie Device Panel): Desktop und Handy haben eigene Spalten (Liste), Angaben (Karten), Gruppierung und Sortierung.
// Gespeichert pro Benutzer bei Home Assistant (frontend/set_user_data) mit lokaler Kopie; die Liste ist die Standardansicht, Karten sind optional.
const VIEW_KEY = "alarmageddon_view";
const SAVE_DELAY_MS = 400;
const COL_ON = {
  desktop: ["area", "systems", "state", "battery", "forecast", "signal", "firmware", "changed"],
  mobile: ["state", "battery", "signal"],
};
const FIELD_ON = {
  desktop: ["systems", "battery", "forecast", "signal", "firmware", "changed"],
  mobile: ["systems", "battery", "signal", "firmware", "changed"],
};
const defaultView = (kind) => ({
  layout: "list", group: "area", sort: "name", dir: "asc",
  cols: COLUMNS.map((k) => [k, COL_ON[kind].includes(k)]),
  fields: COLUMNS.filter((k) => k !== "state").map((k) => [k, FIELD_ON[kind].includes(k)]),
});
// Gespeicherte Ansicht bereinigen: Unbekanntes fällt weg, neue Spalten kommen mit ihrem Standard ans Ende
function sanitizeView(raw, kind) {
  const d = defaultView(kind);
  if (!raw || typeof raw !== "object") return d;
  const order = (saved, defs) => {
    const known = new Set(defs.map(([k]) => k));
    const out = [];
    for (const item of Array.isArray(saved) ? saved : []) {
      if (Array.isArray(item) && known.has(item[0]) && !out.some(([k]) => k === item[0])) out.push([item[0], Boolean(item[1])]);
    }
    for (const [k, on] of defs) if (!out.some(([x]) => x === k)) out.push([k, on]);
    return out;
  };
  return {
    layout: raw.layout === "cards" ? "cards" : "list",
    group: ["area", "system", "none"].includes(raw.group) ? raw.group : d.group,
    sort: ["name", ...COLUMNS].includes(raw.sort) ? raw.sort : d.sort,
    dir: raw.dir === "desc" ? "desc" : "asc",
    cols: order(raw.cols, d.cols),
    fields: order(raw.fields, d.fields),
  };
}
const sanitizeViews = (raw) => {
  const r = raw && typeof raw === "object" ? raw : {};
  return { desktop: sanitizeView(r.desktop, "desktop"), mobile: sanitizeView(r.mobile, "mobile"), updated: Number(r.updated) || 0 };
};
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
    this.type = ""; // Filter nach Sensorart (Tür, Fenster, Bewegung …)
    this.views = this._loadViews();
    this.viewUpdated = 0;
  }

  _t(key, vars) {
    return this.host._t(key, vars);
  }

  // Die Ansicht für dieses Gerät: Handy oder Desktop (schmales Panel = Handy)
  get kind() {
    return this.host.hasAttribute("narrow") ? "mobile" : "desktop";
  }

  get view() {
    return this.views[this.kind];
  }

  set view(v) {
    this.views[this.kind] = v;
  }

  colsOn() {
    return this.view.cols.filter(([, on]) => on).map(([k]) => k);
  }

  fieldsOn() {
    return this.view.fields.filter(([, on]) => on).map(([k]) => k);
  }

  _loadViews() {
    try {
      const raw = JSON.parse(localStorage.getItem(VIEW_KEY) || "null");
      if (raw) {
        this.viewUpdated = Number(raw.updated) || 0;
        return sanitizeViews(raw);
      }
      // Frühere Ansicht (nur Spaltenschlüssel, ein Satz für alles) übernehmen: sie galt für den Desktop
      const old = JSON.parse(localStorage.getItem("alarmageddon.view") || "null");
      if (old && Array.isArray(old.cols)) {
        const v = sanitizeViews({ desktop: { layout: old.layout, group: old.group, sort: old.sort, cols: COLUMNS.map((k) => [k, old.cols.includes(k)]) } });
        return v;
      }
    } catch {
      /* privater Modus oder ungültig: Standard */
    }
    return sanitizeViews(null);
  }

  _data() {
    return { desktop: this.views.desktop, mobile: this.views.mobile, updated: this.viewUpdated };
  }

  // Nach jeder Änderung: lokal sofort, bei Home Assistant verzögert und gebündelt
  _saveView() {
    this.viewUpdated = Date.now();
    this.viewDirty = true;
    try {
      localStorage.setItem(VIEW_KEY, JSON.stringify(this._data()));
    } catch {
      /* nur für diese Sitzung */
    }
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this._saveRemote(), SAVE_DELAY_MS);
  }

  async _saveRemote() {
    if (!this.host._hass || !this.remoteLoaded) return;
    try {
      await this.host._hass.callWS({ type: "frontend/set_user_data", key: VIEW_KEY, value: this._data() });
      this.viewDirty = false;
    } catch {
      /* die lokale Kopie bleibt */
    }
  }

  // Stand von Home Assistant holen: er gilt, wenn er mindestens so neu ist wie die lokale Kopie und hier nichts ungespeichert ist;
  // sonst geht die lokale Kopie an Home Assistant. So folgen die Spalten dem Benutzer auf jedes Gerät.
  async loadRemote() {
    if (this.remoteLoaded || !this.host._hass) return;
    let value = null;
    try {
      const res = await this.host._hass.callWS({ type: "frontend/get_user_data", key: VIEW_KEY });
      value = res ? res.value : null;
    } catch {
      return; // ohne Speicher bei Home Assistant bleibt es bei der lokalen Kopie
    }
    this.remoteLoaded = true;
    if (value && !this.viewDirty && (Number(value.updated) || 0) >= this.viewUpdated) {
      const v = sanitizeViews(value);
      this.views = { desktop: v.desktop, mobile: v.mobile };
      this.viewUpdated = v.updated;
      try {
        localStorage.setItem(VIEW_KEY, JSON.stringify(this._data()));
      } catch {
        /* siehe _saveView */
      }
      this.host._renderList?.();
    } else if (!value || this.viewDirty) {
      this._saveRemote();
    }
  }

  // Alle Sensoren, die einer Anlage zugeordnet sind (Zonen oder "immer aktiv"), mit ihren Zonen je Anlage
  members() {
    const out = new Map();
    for (const s of this.host._systems()) {
      const ids = new Set(s.modes.flatMap((m) => s.zones?.[m] || []));
      // "Immer aktiv" wie controller.always_sensors: alle Sensoren der Anlage (Liste der Konfiguration, Zonen, eigene Werte), bei denen
      // die Option wirkt, also mit eigenem Wert (je Modus: Reiter "Immer aktiv") oder sonst der Voreinstellung der Sensorart
      const alwaysOn = s.always_enabled !== false; // "Immer aktiv" insgesamt aus: kein Sensor ist immer aktiv
      const known = new Set(alwaysOn ? [...ids, ...(s.sensors || []), ...Object.keys(s.sensor_options || {})] : []);
      if (alwaysOn && s.per_mode_sensors) for (const per of Object.values(s.sensor_modes || {})) for (const id of Object.keys(per || {})) known.add(id);
      const presets = this.host._data?.presets || {};
      for (const id of known) {
        const own = (s.per_mode_sensors ? s.sensor_modes?.always?.[id]?.always : undefined) ?? s.sensor_options?.[id]?.always;
        const on = own !== undefined ? own : (presets[this.host._sensor(id).type || "other"] || []).includes("always");
        if (on) ids.add(id);
      }
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
        // "Offen" gilt nur für Türen, Fenster und Ähnliches; Bewegung, Belegung und Anwesenheit haben den eigenen Filter "Belegung"
        occupied: st?.state === "on" && MOTION_CLASSES.has(info.device_class),
        open: st?.state === "on" && !MOTION_CLASSES.has(info.device_class),
        low: battery !== null && battery < h._lowBattery(),
        signal: Number.isFinite(sigVal) ? { value: sigVal, unit: sigState.attributes.unit_of_measurement || "" } : null,
        // Letzte echte Änderung (offen <-> zu) vom Server; HA setzt last_changed bei jedem Neustart zurück, das gilt hier nicht
        changed: h._data?.last_changes?.[id] || null,
      };
    });
  }

  // filter: der gewählte Filter oder (für die Zähler der Pillen) ein anderer; Suche und Auswahlfelder gelten immer
  _matches(r, filter = this.filter) {
    if (this.sys && !r.systems.some((s) => s.entry === this.sys)) return false;
    if (this.area && r.area !== this.area) return false;
    if (this.type && (r.info.type || "other") !== this.type) return false;
    if (filter === "problems" && !(r.gone || r.low)) return false;
    if (filter === "open" && !r.open) return false;
    if (filter === "occupied" && !r.occupied) return false;
    if (filter === "battery" && !r.low) return false;
    if (filter === "offline" && !r.gone) return false;
    const q = this.q.trim().toLowerCase();
    if (!q) return true;
    return [r.name, r.id, r.area, r.info.integration, r.info.manufacturer, r.info.model, r.info.sw_version]
      .some((v) => String(v || "").toLowerCase().includes(q));
  }

  // Sortierwert je Spalte: Zahlen als Zahl, Texte als Text; leere Werte stehen immer am Ende, auch absteigend
  _sortKey(col, r) {
    switch (col) {
      case "area": return r.area;
      case "systems": return r.systems.map((s) => s.title).join(" ");
      // Erst nach Rang (nicht erreichbar, offen, in Ordnung), dann nach dem angezeigten Text: "ruhig" und "zu" stehen je beieinander
      case "state": return `${r.gone ? 0 : r.open || r.occupied ? 1 : 2}|${this._stateLabel(r)}`;
      case "battery": return r.battery;
      case "forecast": {
        const d = r.info.battery ? this.host._forecast?.[r.info.battery] : null;
        return Number.isFinite(Number(d)) && d !== null ? Number(d) : null;
      }
      case "signal": return r.signal ? r.signal.value : null;
      case "firmware": return r.info.sw_version || null;
      case "model": return [r.info.manufacturer, r.info.model].filter(Boolean).join(" ") || null;
      case "integration": return r.info.integration || null;
      case "changed": return r.changed ? Date.parse(r.changed) || null : null;
      default: return r.name;
    }
  }

  _sorted(rows) {
    const col = this.view.sort;
    const sign = this.view.dir === "desc" ? -1 : 1;
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    return rows.sort((a, b) => {
      const x = this._sortKey(col, a);
      const y = this._sortKey(col, b);
      const nx = x === null || x === undefined || x === "";
      const ny = y === null || y === undefined || y === "";
      if (nx !== ny) return nx ? 1 : -1;
      const c = nx ? 0 : typeof x === "number" && typeof y === "number" ? x - y : collator.compare(String(x), String(y));
      return c * sign || collator.compare(a.name, b.name);
    });
  }

  // ----- Darstellung -----

  toolsHtml() {
    const systems = this.host._systems();
    const areas = [...new Set(this.rows().map((r) => r.area))].sort((a, b) => a.localeCompare(b));
    const sysSel = systems.length > 1
      ? `<select class="ag-select" data-list="sys" aria-label="${esc(this._t("allSystems"))}"><option value="">${esc(this._t("allSystems"))}</option>${systems.map((s) => `<option value="${esc(s.entry_id)}" ${this.sys === s.entry_id ? "selected" : ""}>${esc(s.title)}</option>`).join("")}</select>`
      : "";
    const areaSel = `<select class="ag-select" data-list="area" aria-label="${esc(this._t("allAreas"))}"><option value="">${esc(this._t("allAreas"))}</option>${areas.map((a) => `<option ${this.area === a ? "selected" : ""}>${esc(a)}</option>`).join("")}</select>`;
    const typeSel = `<select class="ag-select" data-list="type" aria-label="${esc(this._t("allTypes"))}"><option value="">${esc(this._t("allTypes"))}</option>${TYPES.map(([k, , label]) => `<option value="${k}" ${this.type === k ? "selected" : ""}>${esc(this._t(label))}</option>`).join("")}</select>`;
    return `<div class="ag-list-head"><h2 class="ag-h2">${esc(this._t("listTitle"))}</h2><span class="ag-t2 ag-list-count"></span></div>
      <div class="ag-tools">
        <label class="list-search">${ic("search", 18)}<input type="search" data-list="search" placeholder="${esc(this._t("search"))}" value="${esc(this.q)}" aria-label="${esc(this._t("search"))}">
          <button class="ag-clear" data-list="clear" aria-label="${esc(this._t("clearSearch"))}" ${this.q ? "" : "hidden"}>${ic("close", 16)}</button></label>
        <span class="ag-lchips"></span>${sysSel}${areaSel}${typeSel}<span class="ag-grow"></span>
        ${this.host.hasAttribute("narrow") ? "" : this.host._segHtml("layout", [["list", this._t("layoutList"), "groups"], ["cards", this._t("layoutCards"), "grid"]], this.view.layout, "data-list-layout", "small")}
        <button class="ag-btn" data-list="view">${ic("columns", 18)}${esc(this._t("view"))}</button></div>`;
  }

  chipsHtml(rows) {
    const n = (f) => rows.filter((r) => this._matches(r, f)).length;
    return [["all", "filterAll"], ["problems", "filterProblems"], ["open", "filterOpen"], ["occupied", "filterOccupied"], ["battery", "filterLowBattery"], ["offline", "filterOffline"]]
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
    return this.view.layout === "cards" ? this._cards(groups, narrow) : this._table(groups);
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

  _stateLabel(r) {
    if (r.gone) return this._t("stUnavailable");
    const motion = MOTION_CLASSES.has(r.info.device_class);
    if (r.open || r.occupied) return this._t(motion ? "stDetected" : "stOpen");
    return this._t(motion ? "stClear" : "stClosed");
  }

  _stateHtml(r) {
    return `<span class="ag-tag ${r.gone ? "err" : r.open || r.occupied ? "warn" : "ok"}">${esc(this._stateLabel(r))}</span>`;
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
    const cols = this.colsOn();
    // Spaltenköpfe sortieren (Klick wechselt Richtung); Pfeil an der gewählten Spalte
    const th = (key, label) => {
      const on = this.view.sort === key;
      return `<th aria-sort="${on ? (this.view.dir === "desc" ? "descending" : "ascending") : "none"}"><button type="button" class="ag-sortbtn ${on ? "on" : ""}" data-list="sort" data-key="${key}" title="${esc(this._t("sortBy", { column: label }))}">${esc(label)}<span class="ag-sortic">${on ? ic(this.view.dir === "desc" ? "arrowDown" : "arrowUp", 14) : ""}</span></button></th>`;
    };
    const head = `<tr>${th("name", this._t("colName"))}${cols.map((c) => th(c, this._t(COL_LABEL[c]))).join("")}<th></th></tr>`;
    const body = groups.map(([g, rows]) => `${g !== null ? `<tr class="grp"><td colspan="${cols.length + 2}">${esc(g)} · ${rows.length}</td></tr>` : ""}${rows.map((r) => {
      const [icon] = DC[r.info.device_class] || ["sensor"];
      return `<tr class="ag-lrow ${r.gone ? "bad" : ""} ${!r.gone && (r.open || r.occupied) ? "act" : ""}" data-act="more" data-entity="${esc(r.id)}"><td><div class="ag-nm"><span class="ag-av ${r.gone ? "missing" : r.open || r.occupied ? "open" : ""}">${ic(r.gone ? "offline" : icon, 18)}</span><div>${esc(r.name)}<small>${esc(this._typeLabel(r))}</small></div></div></td>
        ${cols.map((c) => `<td>${this._cell(c, r)}</td>`).join("")}<td style="width:40px"><span class="ag-cbtn">${ic("chevRight", 16)}</span></td></tr>`;
    }).join("")}`).join("");
    return `<div class="ag-card ag-table-wrap ag-stickwrap"><table class="ag-table ag-ltable">${head}${body}</table></div>`;
  }

  // Karten: eine je Sensor mit allen Angaben der gewählten Spalten; auf dem Desktop als Raster, auf dem Handy untereinander
  _cards(groups, narrow = false) {
    const fields = this.fieldsOn();
    const on = (c) => fields.includes(c);
    return `<div class="ag-mcards ${narrow ? "" : "grid"}">${groups.map(([g, rows]) => `${g !== null ? `<div class="ag-group-label">${esc(g)}</div>` : ""}${rows.map((r) => {
      const [icon] = DC[r.info.device_class] || ["sensor"];
      const meta = [this._batteryHtml(r), on("forecast") ? this._forecastHtml(r) : "", on("signal") ? this._signalHtml(r) : "",
        r.info.sw_version && on("firmware") ? `<span class="ag-t2">${ic("chip", 14)} ${esc(r.info.sw_version)}</span>` : ""].filter(Boolean).join("");
      const facts = [
        on("model") && (r.info.manufacturer || r.info.model) ? [this._t("colModel"), [r.info.manufacturer, r.info.model].filter(Boolean).join(" ")] : null,
        on("integration") && r.info.integration ? [this._t("colIntegration"), r.info.integration] : null,
        on("changed") && r.changed ? [this._t("colChanged"), this.host._fmtAgo(r.changed)] : null,
      ].filter(Boolean).map(([k, v]) => `<div><span class="ag-t2">${esc(k)}</span><b>${esc(v)}</b></div>`).join("");
      return `<div class="ag-card ag-mcard ag-lcard ${!r.gone && (r.open || r.occupied) ? "act" : ""}" data-act="more" data-entity="${esc(r.id)}"><div class="ag-mcard-top"><span class="ag-av ${r.gone ? "missing" : r.open || r.occupied ? "open" : ""}">${ic(r.gone ? "offline" : icon, 18)}</span>
        <div style="flex:1;min-width:0">${esc(r.name)}<div class="ag-t2 ag-small">${esc(this._typeLabel(r))} · ${esc(r.area)}</div></div>${this._stateHtml(r)}</div>
        ${on("systems") ? `<div class="ag-lz">${this._cell("systems", r)}</div>` : ""}<div class="ag-lmeta">${meta}</div>${facts ? `<div class="ag-lfacts">${facts}</div>` : ""}</div>`;
    }).join("")}`).join("")}</div>`;
  }

  _typeLabel(r) {
    const [, label] = DC[r.info.device_class] || ["sensor", "dcOther"];
    return this._t(label);
  }

  viewDialogHtml() {
    const seg = (key, items) => `<div class="ag-seg small" data-seg="view-${key}">${items.map(([v, label]) => `<button data-list="vset" data-key="${key}" data-value="${v}" class="${this.view[key] === v ? "on" : ""}">${esc(this._t(label))}</button>`).join("")}</div>`;
    // Spalten und Angaben: Schalter und Pfeile zum Umordnen, je Gerät (Handy, Desktop) eigene Einstellung
    const rows = (set) => this.view[set].map(([k, on], i, all) => `<div class="ag-colrow"><span>${esc(this._t(COL_LABEL[k]))}</span>
        <button class="ag-iconbtn" data-list="mv" data-set="${set}" data-key="${k}" data-dir="-1" ${i === 0 ? "disabled" : ""} aria-label="${esc(this._t("stepUp"))}">${ic("arrowUp", 18)}</button>
        <button class="ag-iconbtn" data-list="mv" data-set="${set}" data-key="${k}" data-dir="1" ${i === all.length - 1 ? "disabled" : ""} aria-label="${esc(this._t("stepDown"))}">${ic("arrowDown", 18)}</button>
        <button class="ag-toggle ${on ? "on" : ""}" data-list="col" data-set="${set}" data-key="${k}" role="switch" aria-checked="${on}" aria-label="${esc(this._t(COL_LABEL[k]))}"></button></div>`).join("");
    return `<div class="ag-dlg-body"><h3>${esc(this._t("viewTitle"))}</h3>
      <div class="ag-t2 ag-small">${esc(this._t(this.kind === "mobile" ? "viewForMobile" : "viewForDesktop"))}</div>
      <div class="ag-label">${esc(this._t("viewLayout"))}</div>${seg("layout", [["list", "layoutList"], ["cards", "layoutCards"]])}
      <div class="ag-label">${esc(this._t("viewGroup"))}</div>${seg("group", [["area", "groupArea"], ["system", "groupSystem"], ["none", "groupNone"]])}
      <div class="ag-label">${esc(this._t("viewSort"))}</div><select class="ag-input" data-list="vsort" aria-label="${esc(this._t("viewSort"))}">${["name", ...COLUMNS].map((k) => `<option value="${k}" ${this.view.sort === k ? "selected" : ""}>${esc(this._t(k === "name" ? "colName" : COL_LABEL[k]))}</option>`).join("")}</select>
      <div style="margin-top:8px">${seg("dir", [["asc", "dirAsc"], ["desc", "dirDesc"]])}</div>
      <div class="ag-label">${esc(this._t("viewColumns"))}</div><div class="ag-colist">${rows("cols")}</div>
      <div class="ag-label">${esc(this._t("viewFields"))}</div><div class="ag-colist">${rows("fields")}</div>
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
      this.host._setHtml(dlg, this.viewDialogHtml());
      dlg.showModal();
      this.host._placePills();
    } else if (act === "sort") {
      const key = el.dataset.key;
      this.view.dir = this.view.sort === key && this.view.dir === "asc" ? "desc" : "asc";
      this.view.sort = key;
      this._saveView();
      this.host._renderList();
    } else if (act === "vset") {
      this.view[el.dataset.key] = el.dataset.value;
      this._applyView();
    } else if (act === "col") {
      const set = el.dataset.set;
      this.view[set] = this.view[set].map(([k, on]) => [k, k === el.dataset.key ? !on : on]);
      this._applyView();
    } else if (act === "mv") {
      const set = el.dataset.set;
      const list = [...this.view[set]];
      const i = list.findIndex(([k]) => k === el.dataset.key);
      const j = i + Number(el.dataset.dir);
      if (i >= 0 && j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]];
      this.view[set] = list;
      this._applyView();
    } else if (act === "vreset") {
      this.view = defaultView(this.kind);
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
    // Über _setHtml: das Fenster behält seine Scrollposition (sonst springt es bei jedem Klick nach oben)
    this.host._setHtml(dlg, this.viewDialogHtml());
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
    else if (el.dataset.list === "type") this.type = el.value;
    else if (el.dataset.list === "vsort") {
      this.view.sort = el.value;
      this._applyView();
      return true;
    } else return false;
    this.host._renderList();
    return true;
  }
}

