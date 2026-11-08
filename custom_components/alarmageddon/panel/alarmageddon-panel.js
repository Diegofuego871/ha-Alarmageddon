// Seitenpanel von Alarmageddon (Vanilla Web Component ohne Build, wie ha-device-panel; läuft als eingebautes iframe-Panel).
// Übersicht: oben die Steuerung der Anlagen und eine Kachel mit Warnungen, darunter die Liste der Sensoren (list.js) und
// die letzten Ereignisse. Konfiguration: Reiter Sensoren (sensors.js) und Anlage (system.js).
// Live-Zustände kommen aus hass.states, Konfiguration und Ereignisse über den WebSocket-Befehl alarmageddon/data.

// Gleicher Cache-Buster wie die Seite (?v=...), damit nie eine alte Datei zur neuen passt (LEARNINGS)
const V = new URL(import.meta.url).search;
const { pickLang, translate } = await import(`./strings.js${V}`);
const { CSS } = await import(`./styles.js${V}`);
const { ic, esc, MODE_ICON, MODE_KEY, ARMED, DC, GONE, POLL_MS, WS_TIMEOUT_MS, errText, isConnectionError, LOW_BATTERY } = await import(`./common.js${V}`);
const { ListUi } = await import(`./list.js${V}`);
const { SensorsUi } = await import(`./sensors.js${V}`);
const { SystemUi } = await import(`./system.js${V}`);
const { ActionsUi } = await import(`./actions.js${V}`);
const { NotifyUi } = await import(`./notify.js${V}`);
const { UpdatesUi } = await import(`./updates.js${V}`);
const { LogUi } = await import(`./log.js${V}`);
const SUBS = ["sensors", "actions", "notify", "system", "updates"];

class AlarmageddonPanel extends HTMLElement {
  constructor() {
    super();
    this._root = this.attachShadow({ mode: "open" });
    this._hass = null;
    this._data = null;
    this._tab = this._loadPref("tab", "overview");
    if (!["overview", "log", "config"].includes(this._tab)) this._tab = "overview";
    this._sub = this._loadPref("sub", "sensors");
    if (!SUBS.includes(this._sub)) this._sub = "sensors";
    this._sel = this._loadPref("system", null);
    this._fetchSeq = 0;
    this._sig = "";
    this._lastHtml = new WeakMap();
    this.list = new ListUi(this);
    this.sensors = new SensorsUi(this);
    this.systemUi = new SystemUi(this);
    this.actions = new ActionsUi(this);
    this.notify = new NotifyUi(this);
    this.updates = new UpdatesUi(this);
    this.log = new LogUi(this);
  }

  // Ansicht des gewählten Reiters unter Konfiguration
  get _cfgUi() {
    return { sensors: this.sensors, system: this.systemUi, actions: this.actions, notify: this.notify, updates: this.updates }[this._sub];
  }

  // ----- Lebenszyklus -----

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    this._lang = pickLang(hass);
    if (first) {
      this._init();
      return;
    }
    // Wird bei jeder Zustandsänderung in HA aufgerufen: nur günstige Arbeit (LEARNINGS)
    if (this.sensors.paint) return; // während des Ziehens nichts neu aufbauen
    const sig = this._stateSig();
    if (sig !== this._sig) {
      this._sig = sig;
      this._renderLive();
    }
  }

  get hass() {
    return this._hass;
  }

  _init() {
    this._root.innerHTML = `<style>${CSS}</style><div class="ag-root"><div class="ag-content"></div>
      <dialog class="ag-dlg" id="ag-code"></dialog><dialog class="ag-dlg" id="ag-discard"></dialog><dialog class="ag-dlg" id="ag-view"></dialog>
      <dialog class="ag-dlg ag-wide" id="ag-presets"></dialog><dialog class="ag-dlg ag-sheetdlg" id="ag-sheet"></dialog>
      <dialog class="ag-dlg ag-wide" id="ag-step"></dialog><dialog class="ag-dlg" id="ag-codes"></dialog><dialog class="ag-dlg" id="ag-confirm"></dialog><dialog class="ag-dlg ag-wide" id="ag-pick"></dialog><dialog class="ag-dlg ag-wide" id="ag-notes"></dialog></div>`;
    this._content = this._root.querySelector(".ag-content");
    // Wie auch immer der Code-Dialog schliesst (Abbrechen, Escape, Erfolg): Auswahl wieder nach dem echten Zustand
    this._root.getElementById("ag-code").addEventListener("close", () => this._renderTop(true));
    this._root.getElementById("ag-notes").addEventListener("close", () => (this.updates.notes = null));
    // Blatt von unten mit Escape oder Hintergrund geschlossen: Seitenblatt ebenfalls zu
    this._root.getElementById("ag-sheet").addEventListener("close", () => {
      if (this.sensors.detail && this.hasAttribute("narrow")) {
        this.sensors.detail = null;
        this.sensors.render();
      }
    });
    // Beim Neuladen oder Schliessen der Seite mit offenen Änderungen warnt der Browser
    this.ownerDocument.defaultView.addEventListener("beforeunload", (ev) => {
      if ([this.sensors, this.systemUi, this.actions, this.notify, this.updates].some((ui) => ui.dirtyCount() > 0)) {
        ev.preventDefault();
        ev.returnValue = "";
      }
    });
    this._root.addEventListener("click", (ev) => this._onClick(ev));
    this._root.addEventListener("input", (ev) => this._onInput(ev));
    this._root.addEventListener("change", (ev) => this._onChange(ev));
    this._root.addEventListener("pointerdown", (ev) => {
      this.sensors.onPointerDown(ev);
      if (this._tab === "config" && this._sub === "actions") this.actions.onPointerDown(ev);
    });
    this._root.addEventListener("keydown", (ev) => {
      if (this._tab === "config" && this._sub === "actions") this.actions.onKeyDown(ev);
    });
    this._root.addEventListener("focusin", (ev) => this.actions.onFocus(ev.target, true));
    this._root.addEventListener("focusout", (ev) => this.actions.onFocus(ev.target, false));
    this._root.addEventListener("submit", (ev) => this._onSubmit(ev));
    const win = this.ownerDocument.defaultView;
    // Ziehen über mehrere Felder: Zuhörer am Fenster, nicht am Element (LEARNINGS)
    win.addEventListener("pointermove", (ev) => {
      this.sensors.onPointerMove(ev);
      this.actions.onPointerMove(ev);
    });
    const end = () => {
      this.sensors.endPaint();
      this.actions.onPointerEnd();
    };
    win.addEventListener("pointerup", end);
    win.addEventListener("pointercancel", end);
    this.ownerDocument.addEventListener("visibilitychange", () => {
      if (this.ownerDocument.visibilityState === "visible") this._fetch();
    });
    new ResizeObserver(() => {
      this._checkNarrow();
      this._placePills();
    }).observe(this);
    this._checkNarrow(true);
    this._render();
    this._fetch();
    this._poll = setInterval(() => {
      if (this.ownerDocument.visibilityState !== "hidden") this._fetch();
    }, POLL_MS);
    this._tick = setInterval(() => this._updateCountdowns(), 1000);
  }

  _checkNarrow(initial = false) {
    const narrow = this.clientWidth > 0 && this.clientWidth < 600;
    if (narrow === this.hasAttribute("narrow") && !initial) return;
    this.toggleAttribute("narrow", narrow);
    if (!initial) this._render();
  }

  _t(key, vars) {
    return translate(this._lang, key, vars);
  }

  _loadPref(key, fallback) {
    try {
      return localStorage.getItem(`alarmageddon.${key}`) || fallback;
    } catch {
      return fallback;
    }
  }

  _savePref(key, value) {
    try {
      localStorage.setItem(`alarmageddon.${key}`, value);
    } catch {
      /* privater Modus: nur für diese Sitzung */
    }
  }

  // ----- Daten -----

  // Batterieprognose getrennt: der Verlauf kann dauern, die Liste soll nicht warten. Höchstens einmal pro Stunde.
  async _fetchForecast() {
    if (this._forecastAt && Date.now() - this._forecastAt < 3600e3) return;
    this._forecastAt = Date.now();
    try {
      const res = await this._hass.callWS({ type: "alarmageddon/battery_forecast" });
      this._forecast = res?.forecast || {};
      if (this._tab === "overview" && this._view) this._renderView(false);
    } catch {
      this._forecastAt = 0; // nächster Abruf versucht es wieder; ohne Prognose bleibt die Spalte leer
    }
  }

  async _fetch() {
    if (!this._hass) return;
    const seq = ++this._fetchSeq;
    try {
      const data = await Promise.race([
        this._hass.callWS({ type: "alarmageddon/data" }),
        new Promise((_ok, fail) => setTimeout(() => fail(new Error("timeout")), WS_TIMEOUT_MS)),
      ]);
      // Nie eine ältere Antwort über eine neuere legen (LEARNINGS)
      if (seq !== this._fetchSeq) return;
      this._data = data;
      this._connError = false;
      if (!this._systems().some((s) => s.entry_id === this._sel)) this._sel = this._systems()[0]?.entry_id || null;
      for (const ui of [this.sensors, this.systemUi, this.actions, this.notify, this.updates]) if (!ui.dirtyCount()) ui.draft = null;
      this._sig = this._stateSig();
      this._fetchForecast();
      // Einmal beim Start (ohne Knopfdruck, der Server begrenzt die Abfragen): für den Punkt am Reiter
      if (!this._updatesChecked) {
        this._updatesChecked = true;
        this.updates.load(false);
      }
      // Erstes Laden: alles; danach nur die Ansicht, damit Suchfeld und Fokus bleiben
      if (!this._loaded || !this._view) {
        this._loaded = true;
        this._render();
      } else if (!this.sensors.paint) {
        this._renderView(false);
      }
    } catch (err) {
      if (seq !== this._fetchSeq) return;
      if (isConnectionError(err) || String(err?.message) === "timeout") {
        if (!this._connError) this._toast(this._t("errConnection"));
        this._connError = true;
        setTimeout(() => this._fetch(), 5000);
      } else {
        this._toast(this._t("errGeneric", { message: errText(err) }));
      }
    }
  }

  _systems() {
    return this._data?.systems || [];
  }

  _system(entryId = this._sel) {
    return this._systems().find((s) => s.entry_id === entryId) || null;
  }

  _sensor(entityId) {
    return this._data?.sensors?.[entityId] || { name: entityId, missing: true };
  }

  _state(entityId) {
    return this._hass?.states?.[entityId];
  }

  _name(entityId) {
    return this._state(entityId)?.attributes?.friendly_name || this._sensor(entityId).name || entityId;
  }

  // Schwelle "Batterie schwach" aus den Benachrichtigungen (global), damit Liste, Kachel und Meldung übereinstimmen
  _lowBattery() {
    return this._data?.notify?.battery_threshold ?? LOW_BATTERY;
  }

  _battery(entityId) {
    const bat = this._sensor(entityId).battery;
    const v = bat ? Number(this._state(bat)?.state) : NaN;
    return Number.isFinite(v) ? Math.round(v) : null;
  }

  // Nur was die Ansichten zeigen: Alarm-Entitäten, Sensoren mit ihren Batterien und ihrem Empfang
  _stateSig() {
    const parts = [];
    for (const s of this._systems()) {
      const st = this._state(s.entity_id);
      parts.push(st ? `${st.state}|${st.attributes.changed_by}|${st.attributes.deadline}|${st.attributes.triggered_by}` : "-");
    }
    // Update-Entität von HACS (Fortschritt, neue Version): ändert die Versionszeile
    const hacs = this.updates.hacsEntity();
    parts.push(hacs ? `${hacs.state}|${hacs.attributes.latest_version}|${hacs.attributes.installed_version}|${hacs.attributes.in_progress}` : "-");
    for (const [id, info] of Object.entries(this._data?.sensors || {})) {
      const st = this._state(id);
      parts.push(st ? `${st.state}|${st.last_changed}` : "-");
      if (info.battery) parts.push(this._state(info.battery)?.state ?? "-");
      if (info.signal) parts.push(this._state(info.signal)?.state ?? "-");
    }
    return parts.join(",");
  }

  // ----- Darstellung -----

  // Nur ersetzen, wenn sich der Text geändert hat; nie mit innerHTML vergleichen (LEARNINGS)
  _setHtml(el, html) {
    if (!el || this._lastHtml.get(el) === html) return;
    this._lastHtml.set(el, html);
    el.innerHTML = html;
  }

  _segHtml(name, items, current, attr = "data-act", cls = "") {
    return `<div class="ag-seg ${cls}" role="tablist" data-seg="${name}"><span class="ag-pill"></span>${items
      .map(([key, label, icon]) => `<button role="tab" ${attr}="${key}" class="${current === key ? "on" : ""}" aria-selected="${current === key}">${icon ? ic(icon, 20) : ""}<span>${esc(label)}</span></button>`)
      .join("")}</div>`;
  }

  _render() {
    if (!this._content) return;
    const narrow = this.hasAttribute("narrow");
    const tabs = this._segHtml("tabs", [
      ["overview", this._t(narrow ? "tabOverviewShort" : "tabOverview"), narrow ? "shieldHome" : null],
      ["log", this._t(narrow ? "tabLogShort" : "tabLog"), narrow ? "groups" : null],
      ["config", this._t(narrow ? "tabConfigShort" : "tabConfig"), narrow ? "cog" : null],
    ], this._tab, "data-tab", "ag-tabs");
    let right = "";
    if (this._tab === "overview" && !narrow) right = `<span class="ag-grow"></span><button class="ag-btn" data-act="add">${ic("plus")}${esc(this._t("addSystem"))}</button>`;
    this._lastHtml.delete(this._content);
    this._content.innerHTML = `<div class="ag-head">${tabs}${right}</div><div class="ag-view"></div>`;
    this._view = this._content.querySelector(".ag-view");
    this._view.style.display = "contents";
    this._renderView(true);
  }

  // Punkt am Reiter "Konfiguration" und am Unterreiter "Updates", wenn es etwas Neues gibt (Update oder Neustart)
  // und ein anderer Punkt (gelb) an den Reitern mit ungespeicherten Änderungen: nichts geht beim Wechseln verloren, der Punkt zeigt es
  _renderDots() {
    const news = this.updates.hasNews();
    const uis = { sensors: this.sensors, actions: this.actions, notify: this.notify, system: this.systemUi, updates: this.updates };
    let anyEdit = false;
    for (const [sub, ui] of Object.entries(uis)) {
      const edit = ui.dirtyCount() > 0;
      anyEdit ||= edit;
      const el = this._root.querySelector(`[data-sub="${sub}"]`);
      el?.classList.toggle("has-edit", edit);
      if (edit && el) el.title = this._t("unsavedTab");
      else el?.removeAttribute("title");
    }
    const cfg = this._root.querySelector('[data-tab="config"]');
    cfg?.classList.toggle("has-dot", news || anyEdit);
    cfg?.classList.toggle("has-edit", anyEdit);
    this._root.querySelector('[data-sub="updates"]')?.classList.toggle("has-dot", news);
  }

  _renderView(full) {
    if (!this._view || !this._data) return this._placePills();
    if (!this._systems().length && this._tab !== "config") {
      this._setHtml(this._view, this._emptyHtml());
      return;
    }
    if (this._tab !== "log") this.log.stop();
    if (this._tab === "config") this._renderConfig(full);
    else if (this._tab === "log") this._renderLogTab(full);
    else this._renderOverview(full);
    this._placePills();
    this._renderDots();
  }

  // Bei Zustandsänderungen in HA: nur die Teile, die Live-Werte zeigen
  _renderLive() {
    if (this._tab === "overview") {
      this._renderTop();
      this._renderList();
    } else if (this._tab === "log") {
      this.log.load(); // ein neuer Zustand (Alarm, Quittieren) gehört in die Zeitachse
    } else if (this._sub === "sensors") {
      this.sensors.render();
    } else if (this._sub === "updates") {
      this.updates.renderRow();
    }
    this._renderDots();
  }

  _emptyHtml() {
    return `<div class="ag-card ag-empty">${ic("shieldHome", 36)}<h2>${esc(this._t("emptyTitle"))}</h2><p class="ag-t2" style="margin:0">${esc(this._t("emptyText"))}</p>
      <button class="ag-btn primary" data-act="add">${ic("plus")}${esc(this._t("emptyButton"))}</button></div>`;
  }

  // Gleitende Kapsel unter dem gewählten Knopf (Design-Regel). Ohne gewählten Knopf keine Kapsel.
  _placePills() {
    for (const seg of this._root.querySelectorAll(".ag-seg")) {
      const pill = seg.querySelector(".ag-pill");
      const on = seg.querySelector(":scope > button.on");
      if (!pill) continue;
      if (!on) {
        pill.style.width = "0";
        pill.style.opacity = "0";
        continue;
      }
      // Neue Kapsel (nach einem Neuaufbau) sofort an ihren Platz, gleiten nur bei einem Wechsel
      const fresh = !pill.dataset.placed;
      if (fresh) pill.style.transition = "none";
      pill.style.opacity = "1";
      pill.style.width = `${on.offsetWidth}px`;
      pill.style.transform = `translateX(${on.offsetLeft}px)`;
      if (fresh) {
        void pill.offsetWidth;
        pill.style.transition = "";
        pill.dataset.placed = "1";
      }
    }
  }

  _toast(text) {
    clearTimeout(this._toastTimer);
    this._root.querySelector(".ag-toast")?.remove();
    const el = document.createElement("div");
    el.className = "ag-toast";
    el.setAttribute("role", "status");
    el.textContent = text;
    this._root.querySelector(".ag-root").appendChild(el);
    this._toastTimer = setTimeout(() => el.remove(), 5000);
  }

  _fmtTime(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const locale = this._hass?.locale?.language || this._lang;
    const now = new Date();
    const time = d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
    if (d.toDateString() === now.toDateString()) return time;
    const y = new Date(now.getTime() - 86400000);
    if (d.toDateString() === y.toDateString()) return `${this._t("yesterday")} ${time}`;
    return d.toLocaleDateString(locale, { day: "numeric", month: "short" });
  }

  // Auf die Minute gerundet, damit der Text nicht bei jeder Abfrage wechselt und Tipps verloren gehen (LEARNINGS)
  _fmtAgo(iso) {
    const ms = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(ms)) return "";
    const rtf = new Intl.RelativeTimeFormat(this._hass?.locale?.language || this._lang, { numeric: "auto", style: "short" });
    const min = Math.round(ms / 60000);
    if (min < 60) return rtf.format(-Math.max(min, 0), "minute");
    const hours = Math.round(min / 60);
    if (hours < 48) return rtf.format(-hours, "hour");
    return rtf.format(-Math.round(hours / 24), "day");
  }

  _fmtRemaining(iso) {
    const ms = new Date(iso).getTime() - Date.now();
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  _updateCountdowns() {
    for (const el of this._root.querySelectorAll("[data-countdown]")) {
      el.textContent = this._t("remaining", { time: this._fmtRemaining(el.dataset.countdown) });
    }
  }

  // ----- Übersicht -----

  _renderOverview(full) {
    if (full || !this._view.querySelector(".ag-ov-top")) {
      this._lastHtml.delete(this._view);
      this._view.innerHTML = `<div class="ag-ov-top"></div><div class="ag-ov-tools">${this.list.toolsHtml()}</div><div class="ag-ov-list"></div>`;
    }
    this._renderTop();
    this._renderList();
  }

  // Protokoll: Gerüst einmal, Inhalt vom Server; beim Öffnen neu laden
  _renderLogTab(full) {
    if (full || !this._view.querySelector(".ag-log-body")) {
      this._lastHtml.delete(this._view);
      this._view.innerHTML = this.log.html();
      this.log.render();
      this.log.load();
    }
  }

  _renderTop(force = false) {
    const top = this._view?.querySelector(".ag-ov-top");
    if (!top) return;
    if (force) this._lastHtml.delete(top);
    const systems = this._systems();
    const alarms = systems.filter((s) => this._state(s.entity_id)?.state === "triggered").map((s) => this._alarmBand(s)).join("");
    this._setHtml(top, `${alarms}<div class="ag-sysgrid">${systems.map((s) => this._sysCard(s)).join("")}${this._statusTile()}</div>`);
    this._placePills();
  }

  _renderList() {
    const toolsEl = this._view?.querySelector(".ag-ov-tools");
    const listEl = this._view?.querySelector(".ag-ov-list");
    if (!toolsEl || !listEl) return;
    const rows = this.list.rows();
    this._setHtml(toolsEl.querySelector(".ag-lchips"), this.list.chipsHtml(rows));
    const shown = rows.filter((r) => this.list._matches(r)).length;
    const count = toolsEl.querySelector(".ag-list-count");
    if (count) count.textContent = rows.length ? this._t("listCount", { shown, total: rows.length }) : "";
    this._setHtml(listEl, this.list.bodyHtml(rows, this.hasAttribute("narrow")));
  }

  _look(st) {
    const state = st?.state;
    const mode = st?.attributes?.arm_mode;
    if (!st || GONE.has(state)) return { text: this._t("stateUnavailable"), color: "var(--ag-text3)", soft: "var(--ag-subtle)", icon: "shield" };
    if (state === "disarmed") return { text: this._t("stateDisarmed"), color: "var(--ag-success)", soft: "var(--ag-success-soft)", icon: "shieldOff" };
    if (ARMED[state]) {
      const key = { home: "stateArmedHome", away: "stateArmedAway", night: "stateArmedNight" }[ARMED[state]];
      return { text: this._t(key), color: "var(--ag-primary)", soft: "var(--ag-primary-soft)", icon: MODE_ICON[ARMED[state]] };
    }
    if (state === "arming") return { text: this._t("stateArming", { mode: this._t(MODE_KEY[mode] || "modeAway") }), color: "var(--ag-warning)", soft: "var(--ag-warning-soft)", icon: "timer" };
    if (state === "pending") return { text: this._t("statePending"), color: "var(--ag-warning)", soft: "var(--ag-warning-soft)", icon: "timer" };
    return { text: this._t("stateTriggered"), color: "var(--ag-error)", soft: "var(--ag-error-soft)", icon: "alert" };
  }

  _members(s, mode) {
    return s.zones?.[mode] || [];
  }

  // Wie der Server: offene Sensoren der Zone ohne "darf offen sein" verhindern das Scharfschalten
  _blocking(s, mode) {
    return this._members(s, mode).filter((id) => this._state(id)?.state === "on" && !this._optionOf(s, id, "open_ok"));
  }

  _optionOf(s, id, key) {
    const own = s.sensor_options?.[id]?.[key];
    if (own !== undefined) return own;
    return (this._data?.presets?.[this._sensor(id).type || "other"] || []).includes(key);
  }

  _sysCard(s) {
    const st = this._state(s.entity_id);
    const look = this._look(st);
    const attrs = st?.attributes || {};
    const state = st?.state;
    const sub = [];
    if ((state === "arming" || state === "pending" || state === "triggered") && attrs.deadline) {
      sub.push(`<span data-countdown="${esc(attrs.deadline)}">${esc(this._t("remaining", { time: this._fmtRemaining(attrs.deadline) }))}</span>`);
    } else if (st?.last_changed) {
      sub.push(esc(this._t("since", { time: this._fmtTime(st.last_changed) })));
    }
    if (attrs.changed_by) sub.push(esc(attrs.changed_by));
    // Auswahl des Modus; während Verzögerung zählt der Zielmodus, bei Alarm ist nichts gewählt
    const current = state === "disarmed" ? "off" : ARMED[state] || (state === "arming" ? attrs.arm_mode : null);
    const modes = ["off", ...s.modes];
    const seg = `<div class="ag-seg" data-seg="mode-${esc(s.entry_id)}"><span class="ag-pill"></span>${modes
      .map((m) => `<button data-act="mode" data-entry="${esc(s.entry_id)}" data-mode="${m}" class="${m === current ? "on" : ""}" ${st ? "" : "disabled"}>${ic(MODE_ICON[m], 16)}<span>${esc(this._t(MODE_KEY[m]))}</span></button>`)
      .join("")}</div>`;
    // "Bereit für" je Modus (Variante B: Text mit Häkchen oder Warnzeichen, verständlich auch ohne Farben)
    let ready = "";
    let blockers = "";
    if (state === "disarmed") {
      const per = s.modes.map((m) => [m, this._blocking(s, m)]);
      ready = `<div class="ag-ready"><span class="ag-t2">${esc(this._t("readyFor"))}</span>${per.map(([m, b]) => `<span class="ag-rchip ${b.length ? "no" : "ok"}">${ic(b.length ? "alert" : "check", 14)}${esc(this._t(MODE_KEY[m]))}</span>`).join("")}</div>`;
      const open = [...new Set(per.flatMap(([, b]) => b))];
      blockers = open.map((id) => `<div class="ag-row"><span class="ag-mini warn">${ic((DC[this._sensor(id).device_class] || ["sensor"])[0], 16)}</span><span class="ag-grow">${esc(this._t("isOpen", { name: this._name(id) }))}</span></div>`).join("");
    }
    return `<div class="ag-card ag-sys" data-system="${esc(s.entry_id)}"><div class="ag-sys-top"><div class="ag-shield" style="background:${look.soft};color:${look.color}">${ic(look.icon, 28)}</div>
      <div style="flex:1;min-width:0"><h2>${esc(s.title)}</h2><div class="ag-sys-state" style="color:${look.color}">${esc(look.text)}</div><div class="ag-sys-sub">${sub.join(" · ")}</div></div>
      <button class="ag-cbtn" data-act="more" data-entity="${esc(s.entity_id)}" aria-label="${esc(s.title)}">${ic("chevRight", 16)}</button></div>
      ${seg}${ready || blockers ? `<div class="ag-rows">${ready}${blockers}</div>` : ""}</div>`;
  }

  // Kachel mit Warnungen oder "Alles in Ordnung"; ein Tipp filtert die Liste darunter
  _statusTile() {
    const rows = this.list.rows();
    const offline = rows.filter((r) => r.gone).length;
    const low = rows.filter((r) => r.low).length;
    const alarms = this._systems().filter((s) => this._state(s.entity_id)?.state === "triggered");
    const items = [
      ...alarms.map((s) => `<div class="ag-row"><span class="ag-mini err">${ic("alert", 16)}</span><span class="ag-grow">${esc(this._t("warnAlarm", { name: s.title }))}</span></div>`),
      ...(offline ? [`<button class="ag-row ag-rowbtn" data-list="filter" data-filter="offline"><span class="ag-mini err">${ic("offline", 16)}</span><span class="ag-grow">${esc(this._t("warnOffline", { count: offline }))}</span><span class="ag-cbtn">${ic("chevRight", 16)}</span></button>`] : []),
      ...(low ? [`<button class="ag-row ag-rowbtn" data-list="filter" data-filter="battery"><span class="ag-mini warn">${ic("battery", 16)}</span><span class="ag-grow">${esc(this._t("warnBattery", { count: low }))}</span><span class="ag-cbtn">${ic("chevRight", 16)}</span></button>`] : []),
    ];
    if (!items.length) {
      return `<div class="ag-card ag-sys ag-status ok"><div class="ag-sys-top"><div class="ag-shield" style="background:var(--ag-success-soft);color:var(--ag-success)">${ic("check", 28)}</div>
        <div><div class="ag-label">${esc(this._t("statusTitle"))}</div><h2>${esc(this._t("statusOk"))}</h2><div class="ag-sys-sub">${esc(this._t("statusOkText"))}</div></div></div></div>`;
    }
    return `<div class="ag-card ag-sys ag-status warn"><div class="ag-sys-top"><div class="ag-shield" style="background:var(--ag-warning-soft);color:var(--ag-warning-text)">${ic("alert", 28)}</div>
      <div><div class="ag-label">${esc(this._t("statusTitle"))}</div><h2>${esc(this._t("warnTitle", { count: items.length }))}</h2></div></div><div class="ag-rows">${items.join("")}</div></div>`;
  }

  _alarmBand(s) {
    const st = this._state(s.entity_id);
    const sensor = st?.attributes?.triggered_by;
    const text = sensor ? this._t("alarmBy", { sensor: this._name(sensor), time: this._fmtTime(st.last_changed) }) : "";
    return `<div class="ag-alarm" role="alert">${ic("alert", 30)}<div><b>${esc(this._t("alarmTitle", { name: s.title }))}</b><div style="opacity:.9;font-size:13px;margin-top:2px">${esc(text)}</div></div>
      <button class="ag-btn" data-act="mode" data-entry="${esc(s.entry_id)}" data-mode="off">${ic("shieldOff", 18)}${esc(this._t("disarm"))}</button></div>`;
  }

  _eventText(e) {
    const mode = this._t(MODE_KEY[e.mode] || "modeAway");
    const sensor = e.sensor ? this._name(e.sensor) : "";
    let text;
    if (e.kind === "sensor_offline") text = this._t("evOffline", { sensor });
    else if (e.kind === "sensor_report") text = this._t("evReported", { sensor });
    else if (e.kind === "silenced") text = this._t("evSilenced", { by: e.by || "?" });
    else if (e.kind === "unconfirmed") text = this._t("evUnconfirmed", { sensor });
    else if (e.kind === "schedule_skipped") {
      const action = e.action === "off" ? this._t("schOff") : this._t("schArm", { mode: this._t(MODE_KEY[e.action] || "modeAway") });
      text = this._t(e.reason === "alarm" ? "evScheduleSkippedAlarm" : "evScheduleSkipped", { action });
    }
    else if (e.kind === "arm_failed") text = this._t("evArmFailed", { mode, sensors: (e.sensors || []).map((x) => this._name(x)).join(", ") });
    else if (ARMED[e.state]) text = this._t("evArmed", { mode });
    else if (e.state === "arming") text = this._t("evArming", { mode });
    else if (e.state === "disarmed") text = this._t("evDisarmed");
    else if (e.state === "pending") text = this._t("evPending", { sensor });
    else if (e.state === "triggered") text = sensor ? this._t("evTriggered", { sensor }) : this._t("evTriggeredManual");
    else text = e.state;
    return e.by && !e.kind ? `${text} · ${e.by}` : text;
  }

  // ----- Konfiguration -----

  _renderConfig(full) {
    const narrow = this.hasAttribute("narrow");
    if (full || !this._view.querySelector(".ag-cfg")) {
      const label = (key) => this._t(narrow ? `${key}Short` : key);
      const subs = this._segHtml("sub", [["sensors", label("subSensors")], ["actions", label("subActions")], ["notify", label("subNotify")], ["system", label("subSystem")], ["updates", label("subUpdates")]], this._sub, "data-sub", "small ag-subs");
      const systems = this._systems();
      // Benachrichtigungen gelten für alle Anlagen: dort keine Auswahl der Anlage
      const pick = systems.length > 1 && !["notify", "updates"].includes(this._sub)
        ? `<select class="ag-select" data-act="system" aria-label="${esc(this._t("groupsSystem"))}">${systems.map((x) => `<option value="${esc(x.entry_id)}" ${x.entry_id === this._sel ? "selected" : ""}>${esc(x.title)}</option>`).join("")}</select>`
        : "";
      const body = !systems.length ? this._emptyHtml() : this._cfgUi.html();
      this._lastHtml.delete(this._view);
      // Die Seite gleitet von der Seite herein, wenn der Reiter wechselt (nicht bei jedem Neuaufbau)
      const slide = this._slide || "";
      this._slide = "";
      this._view.innerHTML = `<div class="ag-cfg ag-head ${narrow ? "narrow" : ""}">${subs}${pick}</div><div class="ag-pane ${slide}">${body}</div>`;
    }
    if (!this._systems().length) return;
    // Nie neu aufbauen, während ein Eingabefeld den Fokus hat (Cursor bliebe nicht stehen)
    const focused = this._root.activeElement && this._view.contains(this._root.activeElement) && /INPUT|TEXTAREA/.test(this._root.activeElement.tagName);
    if (full || !focused || this._sub === "sensors") this._cfgUi.render();
  }

  _resetConfig() {
    for (const ui of [this.sensors, this.systemUi, this.actions, this.notify, this.updates]) ui.reset();
  }

  _dirty() {
    return this._tab === "config" && [this.sensors, this.systemUi, this.actions, this.notify, this.updates].some((ui) => ui.dirtyCount() > 0);
  }

  // Rückfrage vor dem Verlassen mit offenen Änderungen (Einheitlich speichern)
  _guard(action) {
    if (!this._dirty()) return action();
    this._pending = action;
    const dlg = this._root.getElementById("ag-discard");
    dlg.innerHTML = `<div class="ag-dlg-body"><h3>${esc(this._t("discardTitle"))}</h3><div class="ag-t2">${esc(this._t("discardText"))}</div>
      <div class="ag-dlg-btns"><button class="ag-btn" data-act="discard">${esc(this._t("discard"))}</button><button class="ag-btn primary" data-act="keep">${esc(this._t("keepEditing"))}</button></div></div>`;
    dlg.showModal();
    dlg.querySelector('[data-act="keep"]').focus();
  }

  // Einfache Rückfrage; löst mit true oder false auf
  _confirm(title, text, okLabel) {
    const dlg = this._root.getElementById("ag-confirm");
    return new Promise((resolve) => {
      dlg.innerHTML = `<div class="ag-dlg-body"><h3>${esc(title)}</h3><div class="ag-t2">${esc(text)}</div>
        <div class="ag-dlg-btns"><button class="ag-btn" data-c="no">${esc(this._t("cancel"))}</button><button class="ag-btn primary" data-c="yes">${esc(okLabel)}</button></div></div>`;
      let answer = false;
      dlg.onclick = (ev) => {
        const b = ev.target.closest("[data-c]");
        if (!b) return;
        answer = b.dataset.c === "yes";
        dlg.close();
      };
      dlg.onclose = () => resolve(answer);
      dlg.showModal();
      dlg.querySelector('[data-c="yes"]').focus();
    });
  }

  // ----- Scharfschalten -----

  async _arm(entryId, mode, code) {
    const s = this._system(entryId);
    if (!s) return;
    const msg = { type: "alarmageddon/arm", entry_id: entryId, mode };
    if (code) msg.code = code;
    try {
      await this._hass.callWS(msg);
      this._closeDialog("ag-code");
      this._fetch(); // Ereignisse nachladen; der Zustand kommt über hass
    } catch (err) {
      const key = err?.code;
      // Ohne Code versucht: erst jetzt fragen (ein Standardcode in HA braucht keine Eingabe)
      if (!code && (key === "invalid_code" || key === "code_arm_required")) {
        this._openCode(s, mode);
        return;
      }
      const text = this._armError(s, mode, err);
      if (this._root.getElementById("ag-code").open) this._root.querySelector(".ag-dlg-err").textContent = text;
      else this._toast(text);
      // Die Kapsel wurde schon verschoben: neu aufbauen, auch wenn der Text gleich geblieben ist
      this._renderTop(true);
    }
  }

  _armError(s, mode, err) {
    switch (err?.code) {
      case "invalid_code": return this._t("errInvalidCode");
      case "code_locked": return this._t("errCodeLocked");
      case "code_arm_required": return this._t("errCodeRequired");
      case "disarm_first": return this._t("errDisarmFirst");
      case "service_not_supported": case "mode_not_enabled": return this._t("errNotSupported");
      case "open_sensors": {
        const open = this._blocking(s, mode).map((id) => this._name(id));
        return this._t("errOpenSensors", { sensors: open.join(", ") || "?" });
      }
      default: return this._t("errGeneric", { message: errText(err) });
    }
  }

  _openCode(s, mode) {
    const dlg = this._root.getElementById("ag-code");
    const title = mode === "off" ? this._t("codeDisarm", { name: s.title }) : this._t("codeArm", { mode: this._t(MODE_KEY[mode]), name: s.title });
    dlg.innerHTML = `<form class="ag-dlg-body" data-form="code" data-entry="${esc(s.entry_id)}" data-mode="${mode}">
      <h3>${esc(this._t("codeTitle"))}</h3><div class="ag-t2">${esc(title)}</div>
      <input class="ag-code" id="ag-code-input" type="password" inputmode="numeric" autocomplete="one-time-code" aria-label="${esc(this._t("codeLabel"))}" required>
      <div class="ag-dlg-err" aria-live="polite"></div>
      <div class="ag-dlg-btns"><button type="button" class="ag-btn" data-act="close-code">${esc(this._t("cancel"))}</button><button class="ag-btn primary" type="submit">${esc(this._t("ok"))}</button></div></form>`;
    dlg.showModal();
    dlg.querySelector("input").focus();
  }

  _closeDialog(id) {
    const dlg = this._root.getElementById(id);
    if (dlg?.open) dlg.close();
  }

  // ----- Ereignisse -----

  _onClick(ev) {
    if (this._tab === "config" && this._sub === "sensors" && this.sensors.onClick(ev.target.closest("[data-sen]"), ev)) return;
    if (this._tab === "config" && this._sub === "system" && this.systemUi.onClick(ev.target.closest("[data-sys], [data-scope]"))) return;
    if (this._tab === "config" && this._sub === "actions" && this.actions.onClick(ev.target.closest("[data-wf], [data-trigger]"))) return;
    if (this._tab === "config" && this._sub === "notify" && this.notify.onClick(ev.target.closest("[data-nt]"))) return;
    if (this.updates.onClick(ev.target.closest("[data-upd]"))) return;
    if (this._tab === "log" && this.log.onClick(ev.target.closest("[data-log]"))) return;
    const listEl = ev.target.closest("[data-list]");
    if (listEl && this.list.onClick(listEl)) return;
    const tab = ev.target.closest("[data-tab]");
    // Reiterwechsel verwirft nie etwas: jeder Reiter behält seinen Entwurf, ein gelber Punkt zeigt, wo noch etwas offen ist.
    // Rückfrage nur dort, wo ein Entwurf wirklich ersetzt würde (andere Anlage) und beim Neuladen der Seite.
    if (tab && tab.dataset.tab !== this._tab) {
      this._tab = tab.dataset.tab;
      this._savePref("tab", this._tab);
      this._render();
      return;
    }
    const sub = ev.target.closest("[data-sub]");
    if (sub && sub.dataset.sub !== this._sub) {
      const order = SUBS;
      this._slide = order.indexOf(sub.dataset.sub) > order.indexOf(this._sub) ? "from-right" : "from-left";
      this._sub = sub.dataset.sub;
      this._savePref("sub", this._sub);
      this._renderView(true);
      return;
    }
    const el = ev.target.closest("[data-act]");
    if (!el) return;
    const act = el.dataset.act;
    if (act === "mode") {
      const seg = el.closest(".ag-seg");
      if (seg && !el.classList.contains("on")) {
        // Kapsel sofort zum gewählten Knopf: Rückmeldung ohne auf HA zu warten
        seg.querySelectorAll(":scope > button").forEach((b) => b.classList.toggle("on", b === el));
        this._placePills();
      }
      this._arm(el.dataset.entry, el.dataset.mode);
    } else if (act === "more") {
      this._moreInfo(el.dataset.entity);
    } else if (act === "add") {
      this._navigate("/config/integrations/integration/alarmageddon");
    } else if (act === "close-code") {
      this._closeDialog("ag-code");
    } else if (act === "keep") {
      this._pending = null;
      this._closeDialog("ag-discard");
    } else if (act === "discard") {
      this._closeDialog("ag-discard");
      this._resetConfig();
      const action = this._pending;
      this._pending = null;
      action?.();
    }
  }

  _onInput(ev) {
    const el = ev.target;
    if (this.list.onInput(el)) return;
    if (this._tab === "config" && this._sub === "sensors" && this.sensors.onInput(el)) return;
    if (this._tab === "config" && this._sub === "system") this.systemUi.onInput(el);
    if (this._tab === "config" && this._sub === "actions") this.actions.onInput(el);
    if (this._tab === "config" && this._sub === "notify") this.notify.onInput(el);
  }

  _onChange(ev) {
    const el = ev.target;
    if (this.list.onChange(el)) return;
    if (el.dataset?.act !== "system") return;
    const value = el.value;
    el.value = this._sel;
    this._guard(() => {
      this._sel = value;
      this._savePref("system", value);
      this._resetConfig();
      this._renderView(true);
    });
  }

  _onSubmit(ev) {
    const form = ev.target.closest('[data-form="code"]');
    if (!form) return;
    ev.preventDefault();
    const code = form.querySelector("input").value.trim();
    if (code) this._arm(form.dataset.entry, form.dataset.mode, code);
  }

  // ----- Home Assistant -----

  _moreInfo(entityId) {
    try {
      const ha = window.parent.document.querySelector("home-assistant");
      ha?.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true }));
    } catch {
      /* ausserhalb von HA */
    }
  }

  // Wie ha-device-panel: Herkunft im Verlauf, damit der Zurück-Pfeil von HA hierher führt (LEARNINGS)
  _navigate(path) {
    try {
      const w = window.parent;
      w.history.pushState({ from: w.location.pathname }, "", path);
      w.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
    } catch {
      /* ausserhalb von HA */
    }
  }
}

customElements.define("alarmageddon-panel", AlarmageddonPanel);
