// Protokoll (eigener Reiter der Startseite): aufgezeichnete Alarme als grafische Zeitachse und alle Ereignisse.
// Ein Alarm beginnt mit dem ersten Auslöser und endet mit dem Quittieren (Deaktivieren); der Server sammelt dazwischen
// jede Änderung der Sensoren (backend: recording.py). Oben je Sensor eine Bahn mit Balken (angesprochen von … bis …),
// darunter die Reihenfolge mit Uhrzeit und Abstand zum Anfang.

const V = new URL(import.meta.url).search;
const { ic, esc, DC, errText } = await import(`./common.js${V}`);
const { loaderHtml, loaderStart } = await import(`./loader.js${V}`);

// Zeiträume des Protokolls; "day" = ein gewählter Tag, "span" = von … bis (je ganze Tage)
const RANGES = ["all", "3h", "24h", "today", "yesterday", "7d", "30d", "day", "span"];
const HOURS = { "3h": 3, "24h": 24, "7d": 168, "30d": 720 };
const pad = (n) => String(n).padStart(2, "0");
const dayStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const stamp = (d) => `${dayStr(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const parseDay = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(s || "") ? new Date(`${s}T00:00:00`) : null);

const SHOWN = 200; // Ereignisse je Schritt in der Liste ("Weitere anzeigen" holt die nächsten); der Export enthält alles im Zeitraum
const SHOWN_ALARMS = 30; // Alarme je Schritt

const STATE_COLOR = { pending: "warn", triggered: "err", disarmed: "ok", restart: "none" };

export class LogUi {
  constructor(host) {
    this.pane = "alarms"; // gewählter Reiter: "alarms" (Standard) oder "events"
    this.shownEvents = SHOWN;
    this.shownAlarms = SHOWN_ALARMS;
    this.host = host;
    this.systems = null; // Antwort des Servers
    this.open = new Set(); // aufgeklappte Alarme (id), sobald der Nutzer einen auf- oder zugeklappt hat (touched)
    this.touched = false;
    this.expandFirst = false; // Tipp auf die Alarmmeldung: der neueste Alarm ist aufgeklappt, auch wenn er schon beendet ist
    this.seq = 0;
    this.error = null;
    // Filter (Zeitraum und Anlage), der Zeitraum bleibt pro Browser gemerkt
    const saved = host._loadPref("logRange", "all");
    this.range = RANGES.includes(saved) ? saved : "all";
    const today = dayStr(new Date());
    this.from = host._loadPref("logFrom", today);
    this.to = host._loadPref("logTo", today);
    this.system = "all";
  }

  dirtyCount() {
    return 0;
  }

  reset() {}

  _t(key, vars) {
    return this.host._t(key, vars);
  }

  // Aufgerufen beim Öffnen des Reiters und bei Zustandsänderungen; Antworten, die überholt wurden, verwirft sie (LEARNINGS)
  async load() {
    const seq = ++this.seq;
    if (!this.systems) loaderStart(this.host._root, this.host);
    try {
      // Mit dem Stand der letzten Antwort: der Server schickt nur dann wieder alles, wenn etwas dazukam
      const res = await this.host._hass.callWS({ type: "alarmageddon/log", ...(this.rev && this.systems ? { rev: this.rev } : {}) });
      if (seq !== this.seq) return;
      if (!res?.unchanged) this.systems = res?.systems || [];
      this.rev = res?.rev || null;
      this.error = null;
    } catch (err) {
      if (seq !== this.seq) return;
      this.rev = null; // nach einem Fehler wieder den ganzen Stand holen
      this.error = errText(err);
    }
    // Werkzeugleiste nur neu, wenn sich die Anlagen ändern (sonst verliert eine offene Auswahl alle 5 s ihren Fokus)
    const sig = (this.systems || []).map((s) => s.entry_id).join();
    if (sig !== this._toolsSig) {
      this._toolsSig = sig;
      this.renderTools();
    }
    this.render();
    this._poll();
  }

  // Nachladen, solange der Reiter offen ist: neue Ereignisse erscheinen von selbst. Läuft ein Alarm, jede Sekunde (1.11.0): seine Dauer
  // und der Balken laufen dann gleichmässig hoch statt alle 5 Sekunden zu springen; sonst alle 5 Sekunden.
  _poll() {
    clearTimeout(this._timer);
    if (this.host._tab !== "log") return;
    this._timer = setTimeout(() => this.host._tab === "log" && this.load(), this._running() ? 1000 : 5000);
  }

  _running() {
    try {
      return (this.systems ? this.incidents() : []).some((record) => !record.end);
    } catch (_err) {
      return false;
    }
  }

  stop() {
    clearTimeout(this._timer);
    this.seq += 1;
  }

  // Zeitfenster des gewählten Zeitraums: [von, bis) in Millisekunden, null = offen
  window() {
    const now = Date.now();
    if (HOURS[this.range]) return [now - HOURS[this.range] * 3600e3, null];
    const today = midnight(new Date()).getTime();
    if (this.range === "today") return [today, null];
    if (this.range === "yesterday") return [today - 86400e3, today];
    const a = parseDay(this.from);
    const b = parseDay(this.to);
    if (this.range === "day" && a) return [a.getTime(), new Date(a.getFullYear(), a.getMonth(), a.getDate() + 1).getTime()];
    if (this.range === "span" && a && b) {
      const [lo, hi] = a <= b ? [a, b] : [b, a];
      return [lo.getTime(), new Date(hi.getFullYear(), hi.getMonth(), hi.getDate() + 1).getTime()];
    }
    return [null, null];
  }

  _sys() {
    return (this.systems || []).filter((s) => this.system === "all" || s.entry_id === this.system);
  }

  _inWindow(t) {
    const [lo, hi] = this.window();
    const ms = new Date(t).getTime();
    return (lo === null || ms >= lo) && (hi === null || ms < hi);
  }

  incidents() {
    const [lo, hi] = this.window();
    return this._sys()
      .flatMap((s) => (s.recordings || []).map((r) => ({ ...r, system: s.title, entry_id: s.entry_id })))
      // Ein Alarm gehört dazu, wenn er sich mit dem Zeitraum überschneidet
      .filter((r) => (hi === null || new Date(r.start).getTime() < hi) && (lo === null || new Date(r.end || Date.now()).getTime() >= lo))
      .sort((a, b) => String(b.start).localeCompare(String(a.start)));
  }

  events() {
    return this._sys()
      .flatMap((s) => (s.events || []).map((e) => ({ ...e, system: s.title })))
      .filter((e) => this._inWindow(e.t))
      .sort((a, b) => String(b.t).localeCompare(String(a.t)));
  }

  // ----- Hilfen -----

  _clock(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString(this.host._hass?.locale?.language || this.host._lang, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  _day(iso) {
    return this.host._fmtTime(iso);
  }

  _dur(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    if (s < 60) return this._t("durS", { n: s });
    const m = Math.floor(s / 60);
    if (m < 60) return s % 60 ? `${m} min ${s % 60} s` : this._t("durMin", { n: m });
    return `${Math.floor(m / 60)} h ${m % 60} min`;
  }

  _icon(entity) {
    const dc = this.host._state(entity)?.attributes?.device_class || this.host._sensor(entity).device_class;
    return (DC[dc] || ["sensor"])[0];
  }

  _text(e, record) {
    const sensor = e.sensor ? this.host._name(e.sensor) : "";
    if (e.kind === "sensor") return this._t(e.to === "on" ? "logSensorOn" : e.to === "off" ? "logSensorOff" : "logSensorGone", { sensor });
    if (e.kind === "restart") return this._t("logRestart");
    if (e.kind === "notified") return this._t("logNotified", { type: this._t(`ntT_${e.type}`) });
    if (e.kind === "step_failed") {
      // Eingriff des Wächters (Server: workflow.py): Start, Vorbereitung, Ablauf oder ein Schritt hat zu lange gedauert
      if (e.reason === "watchdog") return this._t({ start: "logWatchdogStart", prepare: "logWatchdogPrepare", flow: "logWatchdogFlow" }[e.action] || "logWatchdogStep", { action: e.action || "?" });
      return this._t(e.reason === "timeout" ? "logStepTimeout" : "logStepError", { action: e.action || "?" });
    }
    if (e.kind === "step") {
      const targets = (e.targets || []).map((id) => this.host._name(id)).join(", ");
      const test = e.test ? ` (${this._t("logTest")})` : "";
      if (e.step === "notify") return this._t("logStepNotify") + test;
      if (e.step === "acknowledge") return this._t("logStepAck") + test;
      if (e.step === "wait") return this._t("logStepWait", { seconds: e.seconds }) + test;
      if (e.step === "sound" || e.step === "chime" || e.step === "prealarm") return this._t("logStepSound", { targets }) + test;
      return this._t("logStepAction", { action: e.action || "?", targets: targets || "–" }) + test;
    }
    // Zustandseinträge wie im Ereignisprotokoll formulieren (dort ohne "kind", damit die Person erscheint)
    return this.host._eventText(e.kind === "state" ? { ...e, kind: undefined, mode: record.mode } : { ...e, mode: record.mode });
  }

  _tone(e) {
    if (e.kind === "sensor") return e.to === "on" ? "err" : e.to === "off" ? "none" : "warn";
    if (e.kind === "state") return STATE_COLOR[e.state] || "none";
    if (e.kind === "sensor_offline") return "warn";
    if (e.kind === "step_failed") return "warn";
    if (e.kind === "step" || e.kind === "notified") return "info";
    return STATE_COLOR[e.kind] || "none";
  }

  // ----- Zeitachse -----

  _chart(record) {
    const entries = record.entries || [];
    const t0 = new Date(record.start).getTime();
    const open = !record.end;
    const t1 = Math.max(open ? Date.now() : new Date(record.end).getTime(), t0 + 10000);
    const span = t1 - t0;
    const pos = (iso) => Math.min(100, Math.max(0, ((new Date(iso).getTime() - t0) / span) * 100));
    const lanes = new Map();
    for (const e of entries) {
      if (e.kind !== "sensor") continue;
      if (!lanes.has(e.sensor)) lanes.set(e.sensor, []);
      lanes.get(e.sensor).push(e);
    }
    const bars = (list) => {
      const out = [];
      let from = list[0].to === "on" ? null : record.start; // erster Eintrag "aus": war schon vorher offen
      for (const e of list) {
        if (e.to === "on" && from == null) from = e.t;
        else if (e.to === "off" && from != null) {
          out.push([from, e.t, false]);
          from = null;
        } else if (e.to === "gone") out.push([e.t, e.t, true]);
      }
      if (from != null) out.push([from, open ? new Date(t1).toISOString() : record.end, false]);
      return out;
    };
    const marks = entries.filter((e) => e.kind === "state" || e.kind === "restart").map((e) => {
      const tone = this._tone(e);
      return `<i class="ag-lg-mark ${tone}" style="left:${pos(e.t)}%" title="${esc(this._clock(e.t))} · ${esc(this._text(e, record))}"></i>`;
    }).join("");
    const rows = [...lanes].map(([sensor, list]) => {
      const spans = bars(list).map(([a, b, gone]) => {
        const left = pos(a);
        const width = Math.max(pos(b) - left, 1.2);
        return `<i class="ag-lg-bar ${gone ? "gone" : ""}" style="left:${left}%;width:${width}%" title="${esc(this._clock(a))}"></i>`;
      }).join("");
      return `<div class="ag-lg-row"><div class="ag-lg-name"><span class="ag-mini">${ic(this._icon(sensor), 14)}</span><span>${esc(this.host._name(sensor))}</span></div><div class="ag-lg-plot">${marks}${spans}</div></div>`;
    }).join("");
    const axis = [0, 50, 100].map((p) => `<span style="left:${p}%">${esc(this._clock(new Date(t0 + (span * p) / 100).toISOString()))}</span>`).join("");
    return `<div class="ag-lg" role="img" aria-label="${esc(this._t("logChart"))}">${rows || `<div class="ag-t2 ag-small">${esc(this._t("logNoSensors"))}</div>`}
      <div class="ag-lg-row ag-lg-axisrow"><div class="ag-lg-name"></div><div class="ag-lg-axis">${axis}</div></div>
      <div class="ag-t2 ag-small ag-lg-legend">${esc(this._t("logLegend"))}</div></div>`;
  }

  _sequence(record) {
    const t0 = new Date(record.start).getTime();
    return `<ol class="ag-seq">${(record.entries || []).map((e) => {
      const off = new Date(e.t).getTime() - t0;
      const icon = e.kind === "sensor" ? this._icon(e.sensor) : e.state === "disarmed" ? "shieldOff" : e.kind === "restart" ? "refresh" : e.kind === "notified" ? "bell" : e.kind === "step" ? "power" : "alert";
      return `<li class="ag-seq-item ${this._tone(e)}"><span class="ag-mini">${ic(icon, 16)}</span>
        <div class="ag-seq-text"><b>${esc(this._text(e, record))}</b></div>
        <time>${esc(this._clock(e.t))}<small>${off > 0 ? `+${esc(this._dur(off))}` : esc(this._t("logStart"))}</small></time></li>`;
    }).join("")}</ol>${record.truncated ? `<div class="ag-t2 ag-small">${esc(this._t("logTruncated"))}</div>` : ""}`;
  }

  // Was ohne Zutun aufgeklappt ist (1.17.9): beendete Alarme sind zu, auch der neueste (Vorgabe des Nutzers). Offen ist nur
  // ein laufender Alarm (dort zählt, was gerade passiert) und der neueste nach einem Tipp auf die Alarmmeldung.
  _initialOpen(incidents) {
    const first = incidents[0];
    return new Set(first && (!first.end || this.expandFirst) ? [first.id] : []);
  }

  _card(record, expanded) {
    const open = !record.end;
    const first = record.sensor ? this.host._name(record.sensor) : this._t("evTriggeredManual");
    const end = open ? new Date().getTime() : new Date(record.end).getTime();
    const tag = open
      ? `<span class="ag-tag err">${esc(this._t("logRunning"))}</span>`
      : `<span class="ag-tag ok">${esc(record.ended_by ? this._t("logAcknowledgedBy", { name: record.ended_by }) : this._t("logAcknowledged"))}</span>`;
    return `<div class="ag-card ag-inc ${expanded ? "open" : ""}">
      <button class="ag-inc-head" data-log="toggle" data-id="${esc(record.id)}" aria-expanded="${expanded}">
        <span class="ag-wf-icon k-notify">${ic("alert", 20)}</span>
        <span class="ag-inc-text"><b>${esc(record.system)} · ${esc(this._day(record.start))}</b>
          <span class="ag-t2 ag-small">${esc(this._t("logFirst", { sensor: first }))} · ${esc(this._dur(end - new Date(record.start).getTime()))}</span></span>
        ${tag}<span class="ag-cbtn ag-inc-arrow">${ic("chevRight", 16)}</span></button>
      ${expanded ? `<div class="ag-inc-body">${this._chart(record)}${this._sequence(record)}${open ? "" : `<div class="ag-inc-foot"><button class="ag-btn ag-inc-del" data-log="delete" data-id="${esc(record.id)}" data-entry="${esc(record.entry_id || "")}">${ic("trash", 18)}${esc(this._t("logDelete"))}</button></div>`}</div>` : ""}</div>`;
  }

  // Einen aufgezeichneten Alarm löschen (1.13.0): erst nach Rückfrage. Der laufende Alarm hat keinen Knopf (der Server lehnte es auch ab).
  async deleteAlarm(entryId, id) {
    const h = this.host;
    const record = this.incidents().find((r) => r.id === id);
    if (!record || this.deleting) return;
    const text = this._t("logDeleteText", { system: record.system, time: `${this._day(record.start)}` });
    if (!(await h._confirm(this._t("logDeleteTitle"), text, this._t("logDeleteOk")))) return;
    this.deleting = true;
    try {
      await h._hass.callWS({ type: "alarmageddon/delete_recording", entry_id: entryId, recording: id });
      this.open.delete(id);
      this.rev = null; // den ganzen Stand neu holen
      await this.load();
    } catch (err) {
      h._toast(this._t("errGeneric", { message: errText(err) }));
    } finally {
      this.deleting = false;
    }
  }

  html() {
    // Aufbau wie in der Konfiguration (1.13.3): unter den Hauptreitern steht an derselben Stelle die zweite Zeile mit den Reitern dieses
    // Bereichs (hier "Alarme" und "Alle Ereignisse"), erst darunter Zeitraum und Anlage. Dieselben Klassen wie dort (.ag-cfg, .ag-subs).
    return `<div class="ag-cfg ag-head ag-log-panes ${this.host.hasAttribute("narrow") ? "narrow" : ""}">${this._panesHtml()}</div><div class="ag-tools ag-log-tools"><div class="ag-log-fields">${this._toolsHtml()}</div></div><div class="ag-log-body">${this.systems ? this._body() : ""}</div>
      <div class="ag-foot ag-log-foot"><span class="ag-t2 ag-log-count"></span><span class="ag-grow"></span>
        <button class="ag-iconbtn" data-log="export-csv" title="${esc(this._t("logExportHint"))}" aria-label="${esc(this._t("logExportCsv"))}">${ic("arrowLine", 22)}</button></div>`;
  }

  // Anzeige des gewählten Zeitraums mit Datum, damit klar ist, was die Liste zeigt
  _rangeText() {
    const [lo, hi] = this.window();
    if (lo === null && hi === null) return this._t(this.range === "all" ? "logRangeAllText" : "logRangePick");
    const lang = this.host._lang || "en";
    const end = hi === null ? Date.now() : hi - 1;
    const fmt = (ms, long) => new Date(ms).toLocaleDateString(lang, long ? { weekday: "long", day: "numeric", month: "long", year: "numeric" } : { day: "numeric", month: "short", year: "numeric" });
    return dayStr(new Date(lo)) === dayStr(new Date(end)) ? fmt(lo, true) : `${fmt(lo, false)} – ${fmt(end, false)}`;
  }

  _toolsHtml() {
    const opt = (k) => `<option value="${k}" ${k === this.range ? "selected" : ""}>${esc(this._t(`logRange_${k}`))}</option>`;
    const date = (key, value, label) => `<input type="date" class="ag-input ag-date" data-log="${key}" value="${esc(value)}" aria-label="${esc(label)}">`;
    const systems = this.systems || [];
    // Die Datumsfelder stehen in einer eigenen Gruppe: auf dem Handy bricht die Zeile nach der Auswahl um, "von" und "bis" stehen dann
    // gleich breit nebeneinander (vorher stand "von" schmal neben der Auswahl und "bis" breit darunter)
    const fields = this.range === "day" ? date("from", this.from, this._t("logDay"))
      : this.range === "span" ? `${date("from", this.from, this._t("logFrom"))}<span class="ag-t2">–</span>${date("to", this.to, this._t("logTo"))}` : "";
    const dates = fields ? `<div class="ag-ldates">${fields}</div>` : "";
    return `<div class="ag-lfields">
        <div class="ag-field"><span class="ag-label">${esc(this._t("logRange"))}</span>
          <div class="ag-fieldrow"><select class="ag-select" data-log="range" aria-label="${esc(this._t("logRange"))}">${RANGES.map(opt).join("")}</select>${dates}</div></div>
        ${systems.length > 1 ? `<div class="ag-field"><span class="ag-label">${esc(this._t("groupsSystem"))}</span>
          <div class="ag-fieldrow"><select class="ag-select" data-log="system" aria-label="${esc(this._t("groupsSystem"))}"><option value="all">${esc(this._t("logAllSystems"))}</option>${systems.map((x) => `<option value="${esc(x.entry_id)}" ${x.entry_id === this.system ? "selected" : ""}>${esc(x.title)}</option>`).join("")}</select></div></div>` : ""}
      </div>
      <div class="ag-lrange">${ic("calendar", 16)}<span>${esc(this._rangeText())}</span></div>`;
  }

  renderTools() {
    const el = this.host._view?.querySelector(".ag-log-fields");
    if (el) el.innerHTML = this._toolsHtml();
    this._count();
  }

  _count() {
    const el = this.host._view?.querySelector(".ag-log-count");
    if (el && this.systems) el.textContent = this._t("logCount", { events: this.events().length, alarms: this.incidents().length });
  }

  _body() {
    // Erstes Laden: dieselbe Ladeanzeige wie im ganzen Panel in einer leeren Fläche (vorher blieb der Reiter kurz leer)
    if (!this.systems && !this.error) return `<div class="ag-log-wait">${loaderHtml(esc(this._t("loading")))}</div>`;
    if (this.error) return `<div class="ag-card ag-empty"><span class="ag-t2">${esc(this._t("errGeneric", { message: this.error }))}</span></div>`;
    // Zwei Reiter (1.13.0): "Alarme" und "Alle Ereignisse". Zu sehen ist nur der gewählte: mit einem Jahr Aufbewahrung wären beide
    // Listen untereinander endlos, und die Ereignisse rutschten mit jedem Alarm weiter nach unten. Zeitraum und Anlage gelten für
    // beide. Beide Listen stehen im Dokument (die nicht gewählte ist ausgeblendet): so bleiben aufgeklappte Alarme und Filter beim Wechsel.
    const more = (kind, rest) => (rest > 0 ? `<button class="ag-btn ag-log-more" data-log="more" data-kind="${kind}">${esc(this._t("logShowMore", { count: Math.min(rest, kind === "alarms" ? SHOWN_ALARMS : SHOWN) }))}</button>` : "");
    const incidents = this.incidents();
    const initial = this._initialOpen(incidents);
    const expanded = (r) => (this.touched ? this.open.has(r.id) : initial.has(r.id));
    const shown = incidents.slice(0, this.shownAlarms);
    const alarms = incidents.length
      ? shown.map((r) => this._card(r, expanded(r))).join("") + more("alarms", incidents.length - shown.length)
      : `<div class="ag-card ag-empty"><span class="ag-t2">${esc(this._t(this.range === "all" && this.system === "all" ? "logNoAlarms" : "logNoAlarmsRange"))}</span></div>`;
    const all = this.events();
    const cat = (e) => (e.kind === "arm_failed" ? "failed" : e.state === "pending" || e.state === "triggered" ? "alarm" : e.state === "disarmed" ? "disarmed" : String(e.state || "").startsWith("armed") || e.state === "arming" ? "armed" : "other");
    const count = (k) => (k === "all" ? all.length : all.filter((e) => cat(e) === k).length);
    if (this.evFilter && this.evFilter !== "all" && !count(this.evFilter)) this.evFilter = "all";
    const filter = this.evFilter || "all";
    const events = filter === "all" ? all : all.filter((e) => cat(e) === filter);
    const chips = `<div class="ag-tools ag-evchips" style="margin-bottom:10px">${[["all", "evFilterAll"], ["alarm", "evFilterAlarm"], ["armed", "evFilterArmed"], ["disarmed", "evFilterDisarmed"], ["failed", "evFilterFailed"]]
      .map(([k, label]) => `<button class="ag-chip ${filter === k ? "on" : ""} ${count(k) || k === "all" ? "" : "zero"}" data-log="evfilter" data-filter="${k}">${esc(this._t(label))} <span class="ag-t2">${count(k)}</span></button>`).join("")}</div>`;
    const rows = events.length
      ? events.slice(0, this.shownEvents).map((e) => `<div class="ag-row"><time>${esc(this.host._fmtTime(e.t))}</time><span class="ag-grow"><b style="font-weight:500">${esc(e.system)}</b> · ${esc(this.host._eventText(e))}</span></div>`).join("")
      : `<div class="ag-row ag-t2">${esc(this._t("logNoEventsRange"))}</div>`;
    const on = this.pane === "events" ? "events" : "alarms";
    return `<div class="ag-log-pane" data-pane="alarms" role="tabpanel" ${on === "alarms" ? "" : "hidden"}><p class="ag-t2 ag-small ag-log-hint">${esc(this._t("logAlarmsHint"))}</p>${alarms}</div>
      <div class="ag-log-pane" data-pane="events" role="tabpanel" ${on === "events" ? "" : "hidden"}>${chips}<div class="ag-card ag-log"><div class="ag-rows" style="border-top:0">${rows}</div></div>${more("events", events.length - this.shownEvents)}</div>`;
  }

  // Reiter über der Liste; ohne Anzahl (Entscheid des Nutzers, 1.17.2)
  _panesHtml() {
    const tab = (key, label, icon) => `<button data-log="pane" data-pane="${key}" class="${this.pane === key ? "on" : ""}" role="tab" aria-selected="${this.pane === key}">${ic(icon, 20)}<span>${esc(this._t(label))}</span></button>`;
    return `<div class="ag-seg small ag-subs ag-log-seg" data-seg="log-pane" role="tablist">${tab("alarms", "logAlarms", "alert")}${tab("events", "logEvents", "history")}</div>`;
  }

  render() {
    const view = this.host._view?.querySelector(".ag-log-body");
    if (!view || this.host._tab !== "log") return;
    this.host._setHtml(view, this._body());
    const panes = this.host._view?.querySelector(".ag-log-panes");
    if (panes) {
      this.host._setHtml(panes, this._panesHtml());
      this.host._placePills();
    }
    this._count();
  }

  // Zeitraum, Daten und Anlage (select und date lösen "change" aus)
  onChange(el) {
    const k = el?.dataset?.log;
    if (!["range", "from", "to", "system"].includes(k)) return false;
    if (k === "range") {
      this.range = el.value;
      this.host._savePref("logRange", this.range);
    } else if (k === "system") this.system = el.value;
    else {
      this[k] = el.value;
      this.host._savePref(k === "from" ? "logFrom" : "logTo", el.value);
    }
    this.renderTools();
    this.render();
    return true;
  }

  // ----- Export: genau das, was der gewählte Zeitraum zeigt -----

  _rangeName() {
    return this.range === "day" ? this.from : this.range === "span" ? `${this.from}_${this.to}` : this.range;
  }

  _download(name, text, type) {
    const blob = new Blob([text], { type });
    const a = this.host.ownerDocument.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  exportFile() {
    if (!this.systems) return;
    const events = this.events().reverse();
    const incidents = this.incidents().reverse();
    const base = `alarmageddon-log-${this._rangeName()}-${dayStr(new Date())}`;
    // CSV mit Semikolon und BOM: öffnet sich in Excel im deutschsprachigen Raum richtig
    // Zellen, die wie eine Formel beginnen (= + - @), bekommen ein führendes Hochkomma: Excel führt sie sonst aus (CSV-Injection)
    const q = (v) => {
      const text = String(v ?? "");
      return `"${(/^[=+\-@]/.test(text) ? `'${text}` : text).replaceAll('"', '""')}"`;
    };
    const rows = [];
    for (const e of events) rows.push([e.t, e.system, this._t("logCsvEvent"), this.host._eventText(e), e.sensor || (e.sensors || []).join(" "), e.by || "", ""]);
    for (const r of incidents) for (const e of r.entries || []) rows.push([e.t, r.system, this._t("logCsvAlarmRow"), this._text(e, r), e.sensor || "", e.by || "", stamp(new Date(r.start))]);
    rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    const head = ["logCsvTime", "logCsvSystem", "logCsvType", "logCsvText", "logCsvSensor", "logCsvPerson", "logCsvAlarm"].map((k) => this._t(k));
    const csv = [head, ...rows.map((r) => [stamp(new Date(r[0])), ...r.slice(1)])].map((r) => r.map(q).join(";")).join("\r\n");
    this._download(`${base}.csv`, `\ufeff${csv}\r\n`, "text/csv;charset=utf-8");
  }

  onClick(el) {
    if (el?.dataset?.log === "export-csv") return this.exportFile(), true;
    if (el?.dataset?.log === "evfilter") {
      this.evFilter = el.dataset.filter;
      this.shownEvents = SHOWN;
      this.render();
      return true;
    }
    if (el?.dataset?.log === "pane") {
      if (this.pane === el.dataset.pane) return true;
      this.pane = el.dataset.pane;
      this.render();
      // Der neue Reiter beginnt oben (die andere Liste war vielleicht weit gescrollt)
      if (this.host._content) this.host._content.scrollTop = 0;
      this.host._stickySync?.();
      return true;
    }
    if (el?.dataset?.log === "more") {
      if (el.dataset.kind === "alarms") this.shownAlarms += SHOWN_ALARMS;
      else this.shownEvents += SHOWN;
      this.render();
      return true;
    }
    if (el?.dataset?.log === "delete") return this.deleteAlarm(el.dataset.entry, el.dataset.id), true;
    if (!el || el.dataset.log !== "toggle") return false;
    if (!this.touched) {
      this.touched = true;
      this.open = this._initialOpen(this.incidents());
    }
    const id = el.dataset.id;
    if (this.open.has(id)) this.open.delete(id);
    else this.open.add(id);
    this.render();
    return true;
  }
}
