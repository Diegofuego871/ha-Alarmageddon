// Protokoll (eigener Reiter der Startseite): aufgezeichnete Alarme als grafische Zeitachse und alle Ereignisse.
// Ein Alarm beginnt mit dem ersten Auslöser und endet mit dem Quittieren (Deaktivieren); der Server sammelt dazwischen
// jede Änderung der Sensoren (backend: recording.py). Oben je Sensor eine Bahn mit Balken (angesprochen von … bis …),
// darunter die Reihenfolge mit Uhrzeit und Abstand zum Anfang.

const V = new URL(import.meta.url).search;
const { ic, esc, DC, chapter, errText } = await import(`./common.js${V}`);

const STATE_COLOR = { pending: "warn", triggered: "err", disarmed: "ok", restart: "none" };

export class LogUi {
  constructor(host) {
    this.host = host;
    this.systems = null; // Antwort des Servers
    this.open = new Set(); // aufgeklappte Alarme (id); ohne Eintrag: der neueste
    this.touched = false;
    this.seq = 0;
    this.error = null;
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
    try {
      const res = await this.host._hass.callWS({ type: "alarmageddon/log" });
      if (seq !== this.seq) return;
      this.systems = res?.systems || [];
      this.error = null;
    } catch (err) {
      if (seq !== this.seq) return;
      this.error = errText(err);
    }
    this.render();
    this._poll();
  }

  // Läuft ein Alarm, wächst die Zeitachse: alle 5 Sekunden nachladen, solange der Reiter offen ist
  _poll() {
    clearTimeout(this._timer);
    if (this.host._tab !== "log" || !this.systems?.some((s) => s.recording)) return;
    this._timer = setTimeout(() => this.host._tab === "log" && this.load(), 5000);
  }

  stop() {
    clearTimeout(this._timer);
    this.seq += 1;
  }

  incidents() {
    return (this.systems || [])
      .flatMap((s) => (s.recordings || []).map((r) => ({ ...r, system: s.title })))
      .sort((a, b) => String(b.start).localeCompare(String(a.start)));
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
    // Zustandseinträge wie im Ereignisprotokoll formulieren (dort ohne "kind", damit die Person erscheint)
    return this.host._eventText(e.kind === "state" ? { ...e, kind: undefined, mode: record.mode } : { ...e, mode: record.mode });
  }

  _tone(e) {
    if (e.kind === "sensor") return e.to === "on" ? "err" : e.to === "off" ? "none" : "warn";
    if (e.kind === "state") return STATE_COLOR[e.state] || "none";
    if (e.kind === "sensor_offline") return "warn";
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
      const icon = e.kind === "sensor" ? this._icon(e.sensor) : e.state === "disarmed" ? "shieldOff" : e.kind === "restart" ? "refresh" : "alert";
      return `<li class="ag-seq-item ${this._tone(e)}"><span class="ag-mini">${ic(icon, 16)}</span>
        <div class="ag-seq-text"><b>${esc(this._text(e, record))}</b></div>
        <time>${esc(this._clock(e.t))}<small>${off > 0 ? `+${esc(this._dur(off))}` : esc(this._t("logStart"))}</small></time></li>`;
    }).join("")}</ol>${record.truncated ? `<div class="ag-t2 ag-small">${esc(this._t("logTruncated"))}</div>` : ""}`;
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
      ${expanded ? `<div class="ag-inc-body">${this._chart(record)}${this._sequence(record)}</div>` : ""}</div>`;
  }

  html() {
    if (!this.systems) return `<div class="ag-log-body"></div>`;
    return `<div class="ag-log-body">${this._body()}</div>`;
  }

  _body() {
    if (!this.systems && !this.error) return "";
    if (this.error) return `<div class="ag-card ag-empty"><span class="ag-t2">${esc(this._t("errGeneric", { message: this.error }))}</span></div>`;
    const incidents = this.incidents();
    const expanded = (r, i) => (this.touched ? this.open.has(r.id) : i === 0);
    const alarms = incidents.length
      ? incidents.map((r, i) => this._card(r, expanded(r, i))).join("")
      : `<div class="ag-card ag-empty"><span class="ag-t2">${esc(this._t("logNoAlarms"))}</span></div>`;
    const events = this.systems
      .flatMap((s) => (s.events || []).map((e) => ({ ...e, system: s.title })))
      .sort((a, b) => String(b.t).localeCompare(String(a.t)))
      .slice(0, 100);
    const rows = events.length
      ? events.map((e) => `<div class="ag-row"><time>${esc(this.host._fmtTime(e.t))}</time><span class="ag-grow"><b style="font-weight:500">${esc(e.system)}</b> · ${esc(this.host._eventText(e))}</span></div>`).join("")
      : `<div class="ag-row ag-t2">${esc(this._t("noEvents"))}</div>`;
    return chapter(this._t("logAlarms"), alarms, this._t("logAlarmsHint"))
      + chapter(this._t("logEvents"), `<div class="ag-card ag-log"><div class="ag-rows" style="border-top:0">${rows}</div></div>`);
  }

  render() {
    const view = this.host._view?.querySelector(".ag-log-body");
    if (!view || this.host._tab !== "log") return;
    this.host._setHtml(view, this._body());
  }

  onClick(el) {
    if (!el || el.dataset.log !== "toggle") return false;
    if (!this.touched) {
      this.touched = true;
      const first = this.incidents()[0];
      this.open = new Set(first ? [first.id] : []);
    }
    const id = el.dataset.id;
    if (this.open.has(id)) this.open.delete(id);
    else this.open.add(id);
    this.render();
    return true;
  }
}
