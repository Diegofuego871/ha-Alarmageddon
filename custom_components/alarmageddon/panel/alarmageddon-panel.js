// Seitenpanel von Alarmageddon: Übersicht (Variante A, Karten) und Sensorgruppen (Variante B, Tabelle; Handy: Karten).
// Vanilla Web Component ohne Build (wie ha-device-panel). Läuft als eingebautes iframe-Panel; hass kommt aus panel.html.
// Live-Zustände liest das Panel aus hass.states, Konfiguration und Ereignisse über den WebSocket-Befehl alarmageddon/data.

// Gleicher Cache-Buster wie die Seite (?v=...), damit nie eine alte Datei zur neuen passt (LEARNINGS)
const V = new URL(import.meta.url).search;
const { pickLang, translate } = await import(`./strings.js${V}`);
const { CSS } = await import(`./styles.js${V}`);

// --- Symbole (Material Design Icons) ---------------------------------------
const P = {
  shieldHome: "M12,1L3,5V11C3,16.5 6.8,21.7 12,23C17.2,21.7 21,16.5 21,11V5L12,1M12,7L17,11V17H14V13H10V17H7V11L12,7Z",
  shieldAway: "M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,5A3,3 0 0,1 15,8A3,3 0 0,1 12,11A3,3 0 0,1 9,8A3,3 0 0,1 12,5M17.13,17C15.92,18.85 14.11,20.24 12,20.92C9.89,20.24 8.08,18.85 6.87,17C6.53,16.5 6.24,16 6,15.47C6,13.82 8.71,12.47 12,12.47C15.29,12.47 18,13.79 18,15.47C17.76,16 17.47,16.5 17.13,17Z",
  shieldOff: "M1,4.27L2.28,3L21,21.72L19.73,23L17.5,20.77C16.06,22 14.11,22.67 12,23C6.84,21.74 3,16.55 3,11V6.27L1,4.27M12,1L21,5V11C21,13.28 20.36,15.5 19.27,17.38L5.3,3.41L12,1Z",
  shield: "M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1Z",
  moon: "M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95Z",
  timer: "M12,20A7,7 0 0,1 5,13A7,7 0 0,1 12,6A7,7 0 0,1 19,13A7,7 0 0,1 12,20M19.03,7.39L20.45,5.97C20,5.46 19.55,5 19.04,4.56L17.62,6C16.07,4.74 14.12,4 12,4A9,9 0 0,0 3,13A9,9 0 0,0 12,22C17,22 21,17.97 21,13C21,10.88 20.26,8.93 19.03,7.39M11,14H13V8H11M15,1H9V3H15V1Z",
  alert: "M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z",
  window: "M6,11H10V9H14V11H18V4H6V11M18,13H6V20H18V13M6,2H18A2,2 0 0,1 20,4V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2Z",
  door: "M8,3C6.89,3 6,3.89 6,5V21H18V5C18,3.89 17.11,3 16,3H8M8,5H16V19H8V5M13,11V13H15V11H13Z",
  motion: "M13.5,5.5C14.59,5.5 15.5,4.58 15.5,3.5C15.5,2.38 14.59,1.5 13.5,1.5C12.39,1.5 11.5,2.38 11.5,3.5C11.5,4.58 12.39,5.5 13.5,5.5M9.89,19.38L10.89,15L13,17V23H15V15.5L12.89,13.5L13.5,10.5C14.79,12 16.79,13 19,13V11C17.09,11 15.5,10 14.69,8.58L13.69,7C13.29,6.38 12.69,6 12,6C11.69,6 11.5,6.08 11.19,6.08L6,8.28V13H8V9.58L9.79,8.88L8.19,17L3.29,16L2.89,18L9.89,19.38Z",
  smoke: "M12,3.25C12,3.25 6,10 6,14C6,17.32 8.69,20 12,20A6,6 0 0,0 18,14C18,10 12,3.25 12,3.25M14.47,9.97L15.53,11.03L9.53,17.03L8.47,15.97M9.75,10A1.25,1.25 0 0,1 11,11.25A1.25,1.25 0 0,1 9.75,12.5A1.25,1.25 0 0,1 8.5,11.25A1.25,1.25 0 0,1 9.75,10M14.25,14.5A1.25,1.25 0 0,1 15.5,15.75A1.25,1.25 0 0,1 14.25,17A1.25,1.25 0 0,1 13,15.75A1.25,1.25 0 0,1 14.25,14.5Z",
  garage: "M22,9V20H20V11H4V20H2V9L12,5L22,9M19,12H5V14H19V12M19,18H5V20H19V18M19,15H5V17H19V15Z",
  water: "M12,20A6,6 0 0,1 6,14C6,10 12,3.25 12,3.25C12,3.25 18,10 18,14A6,6 0 0,1 12,20Z",
  sensor: "M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7Z",
  battery: "M16,20H8V6H16M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.67C6,21.4 6.6,22 7.33,22H16.67A1.33,1.33 0 0,0 18,20.67V5.33C18,4.6 17.4,4 16.67,4Z",
  offline: "M2.28,3L1,4.27L2.47,5.74C2.04,6 1.61,6.29 1.2,6.6L3,9C3.53,8.6 4.08,8.25 4.66,7.93L6.89,10.16C6.15,10.5 5.44,10.91 4.8,11.4L6.6,13.8C7.38,13.22 8.26,12.77 9.2,12.47L11.75,15C10.5,15.07 9.34,15.5 8.4,16.2L12,21L14.46,17.73L17.74,21L19,19.72M12,3C9.85,3 7.8,3.38 5.9,4.07L8.29,6.47C9.5,6.16 10.72,6 12,6C15.38,6 18.5,7.11 21,9L22.8,6.6C19.79,4.34 16.06,3 12,3M12,9C11.62,9 11.25,9 10.88,9.05L14.07,12.25C15.29,12.53 16.43,13.07 17.4,13.8L19.2,11.4C17.2,9.89 14.7,9 12,9Z",
  chevRight: "M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z",
  plus: "M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z",
  check: "M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z",
  search: "M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z",
  close: "M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z",
  groups: "M3,4H7V8H3V4M9,5V7H21V5H9M3,10H7V14H3V10M9,11V13H21V11H9M3,16H7V20H3V16M9,17V19H21V17H9Z",
  hand: "M10,9A1,1 0 0,1 11,8A1,1 0 0,1 12,9V13.47L13.21,13.6L18.15,15.79C18.68,16.03 19,16.56 19,17.14V21.5C18.97,22.32 18.32,22.97 17.5,23H11C10.62,23 10.26,22.85 10,22.57L5.1,18.37L5.84,17.6C6.03,17.39 6.3,17.28 6.58,17.28H6.8L10,19V9Z",
};
const ic = (name, size = 18) =>
  `<svg class="ag-ic" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${P[name]}"/></svg>`;

// Maskieren auch von Anführungszeichen: Namen landen in Attributen (LEARNINGS)
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const MODE_ICON = { off: "shieldOff", home: "shieldHome", away: "shieldAway", night: "moon" };
const MODE_KEY = { off: "modeOff", home: "modeHome", away: "modeAway", night: "modeNight" };
const ARMED = { armed_home: "home", armed_away: "away", armed_night: "night" };
const DC = {
  door: ["door", "dcDoor"], window: ["window", "dcWindow"], opening: ["door", "dcOpening"], garage_door: ["garage", "dcGarage"],
  motion: ["motion", "dcMotion"], occupancy: ["motion", "dcOccupancy"], presence: ["motion", "dcPresence"],
  smoke: ["smoke", "dcSmoke"], gas: ["smoke", "dcGas"], carbon_monoxide: ["smoke", "dcCo"], moisture: ["water", "dcMoisture"],
  vibration: ["sensor", "dcVibration"], tamper: ["alert", "dcTamper"], safety: ["alert", "dcSafety"], sound: ["sensor", "dcSound"],
  glass_break: ["window", "dcGlass"],
};
const OPENINGS = new Set(["door", "window", "opening", "garage_door"]);
const MOTION = new Set(["motion", "occupancy", "presence"]);
const LOW_BATTERY = 20;
const POLL_MS = 30000;
const WS_TIMEOUT_MS = 20000;

// callWS wirft nicht immer einen Error (LEARNINGS): Text und Verbindungsfehler robust erkennen
const errText = (err) => (err && (err.message || err.code)) || String(err);
const isConnectionError = (err) => err === 1 || err === 3 || err?.code === 3 || /connection.?lost|socket/i.test(String(err?.message || err));

class AlarmageddonPanel extends HTMLElement {
  constructor() {
    super();
    this._root = this.attachShadow({ mode: "open" });
    this._hass = null;
    this._data = null;
    this._tab = this._loadPref("tab", "overview");
    this._sel = this._loadPref("system", null);
    this._filter = "all";
    this._query = "";
    this._draft = null;
    this._saveState = null; // null | "saved" | Fehlertext
    this._fetchSeq = 0;
    this._sig = "";
    this._lastHtml = new WeakMap();
    this._paint = null;
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
    if (this._paint) return; // während des Ziehens nichts neu aufbauen
    const sig = this._stateSig();
    if (sig !== this._sig) {
      this._sig = sig;
      if (this._tab === "overview") this._renderView();
      else this._renderGroupsBody();
    }
  }

  get hass() {
    return this._hass;
  }

  _init() {
    this._root.innerHTML = `<style>${CSS}</style><div class="ag-root"><div class="ag-content"></div>
      <dialog class="ag-dlg" id="ag-code"></dialog><dialog class="ag-dlg" id="ag-discard"></dialog></div>`;
    this._content = this._root.querySelector(".ag-content");
    // Wie auch immer der Code-Dialog schliesst (Abbrechen, Escape, Erfolg): Auswahl wieder nach dem echten Zustand
    this._root.getElementById("ag-code").addEventListener("close", () => {
      this._lastHtml.delete(this._view);
      this._renderView();
    });
    this._root.addEventListener("click", (ev) => this._onClick(ev));
    this._root.addEventListener("input", (ev) => this._onInput(ev));
    this._root.addEventListener("change", (ev) => this._onChange(ev));
    this._root.addEventListener("pointerdown", (ev) => this._onPointerDown(ev));
    this._root.addEventListener("submit", (ev) => this._onSubmit(ev));
    const win = this.ownerDocument.defaultView;
    // Ziehen über mehrere Felder: Zuhörer am Fenster, nicht am Element (LEARNINGS)
    win.addEventListener("pointermove", (ev) => this._onPointerMove(ev));
    win.addEventListener("pointerup", () => this._endPaint());
    win.addEventListener("pointercancel", () => this._endPaint());
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
      if (!this._dirtyCount()) this._draft = null;
      this._sig = this._stateSig();
      // Erstes Laden: alles; danach nur die Ansicht, damit Suchfeld und Fokus bleiben
      if (!this._loaded || !this._view) {
        this._loaded = true;
        this._render();
      } else if (!this._paint) {
        this._renderView();
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

  _battery(entityId) {
    const bat = this._sensor(entityId).battery;
    const v = bat ? Number(this._state(bat)?.state) : NaN;
    return Number.isFinite(v) ? Math.round(v) : null;
  }

  // Nur was die Ansicht zeigt: Alarm-Entitäten, Sensoren der Zonen und ihre Batterien
  _stateSig() {
    const parts = [];
    for (const s of this._systems()) {
      const st = this._state(s.entity_id);
      parts.push(st ? `${st.state}|${st.attributes.changed_by}|${st.attributes.deadline}|${st.attributes.triggered_by}` : "-");
    }
    const ids = new Set(Object.keys(this._data?.sensors || {}));
    for (const id of ids) {
      parts.push(this._state(id)?.state ?? "-");
      const bat = this._sensor(id).battery;
      if (bat) parts.push(this._state(bat)?.state ?? "-");
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

  _render() {
    if (!this._content) return;
    const tabs = [
      ["overview", "shieldHome", this._t("tabOverview"), this._t("tabOverviewShort")],
      ["groups", "groups", this._t("tabGroups"), this._t("tabGroupsShort")],
    ];
    const narrow = this.hasAttribute("narrow");
    const tabsHtml = `<div class="ag-seg ag-tabs" role="tablist" data-seg="tabs"><span class="ag-pill"></span>${tabs
      .map(([key, icon, label, short]) => `<button role="tab" data-act="tab" data-tab="${key}" class="${this._tab === key ? "on" : ""}" aria-selected="${this._tab === key}">${narrow ? ic(icon, 20) : ""}<span>${esc(narrow ? short : label)}</span></button>`)
      .join("")}</div>`;
    const add = narrow || this._tab !== "overview" ? "" : `<span class="ag-grow"></span><button class="ag-btn" data-act="add">${ic("plus")}${esc(this._t("addSystem"))}</button>`;
    this._lastHtml.delete(this._content);
    this._content.innerHTML = `<div class="ag-head">${tabsHtml}${add}</div><div class="ag-view"></div>`;
    this._view = this._content.querySelector(".ag-view");
    this._view.style.display = "contents";
    this._renderView(true);
  }

  _renderView(full = false) {
    if (!this._view) return;
    if (this._tab === "groups") {
      if (full || !this._view.querySelector(".ag-gbody")) this._renderGroups();
      else this._renderGroupsBody();
    } else {
      this._setHtml(this._view, this._overviewHtml());
    }
    this._placePills();
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

  // ----- Übersicht (Variante A) -----

  _overviewHtml() {
    if (!this._data) return "";
    const systems = this._systems();
    if (!systems.length) {
      return `<div class="ag-card ag-empty">${ic("shieldHome", 36)}<h2>${esc(this._t("emptyTitle"))}</h2><p class="ag-t2" style="margin:0">${esc(this._t("emptyText"))}</p>
        <button class="ag-btn primary" data-act="add">${ic("plus")}${esc(this._t("emptyButton"))}</button></div>`;
    }
    const alarms = systems.filter((s) => this._state(s.entity_id)?.state === "triggered").map((s) => this._alarmBand(s)).join("");
    return `${alarms}<div class="ag-sysgrid">${systems.map((s) => this._sysCard(s)).join("")}</div>${this._logHtml()}`;
  }

  _look(st) {
    const state = st?.state;
    const mode = st?.attributes?.arm_mode;
    if (!st || state === "unavailable" || state === "unknown") return { text: this._t("stateUnavailable"), color: "var(--ag-text3)", soft: "var(--ag-subtle)", icon: "shield" };
    if (state === "disarmed") return { text: this._t("stateDisarmed"), color: "var(--ag-success)", soft: "var(--ag-success-soft)", icon: "shieldOff" };
    if (ARMED[state]) {
      const key = { home: "stateArmedHome", away: "stateArmedAway", night: "stateArmedNight" }[ARMED[state]];
      return { text: this._t(key), color: "var(--ag-primary)", soft: "var(--ag-primary-soft)", icon: MODE_ICON[ARMED[state]] };
    }
    if (state === "arming") return { text: this._t("stateArming", { mode: this._t(MODE_KEY[mode] || "modeAway") }), color: "var(--ag-warning)", soft: "var(--ag-warning-soft)", icon: "timer" };
    if (state === "pending") return { text: this._t("statePending"), color: "var(--ag-warning)", soft: "var(--ag-warning-soft)", icon: "timer" };
    return { text: this._t("stateTriggered"), color: "var(--ag-error)", soft: "var(--ag-error-soft)", icon: "alert" };
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
    return `<div class="ag-card ag-sys" data-system="${esc(s.entry_id)}"><div class="ag-sys-top"><div class="ag-shield" style="background:${look.soft};color:${look.color}">${ic(look.icon, 28)}</div>
      <div style="flex:1;min-width:0"><h2>${esc(s.title)}</h2><div class="ag-sys-state" style="color:${look.color}">${esc(look.text)}</div><div class="ag-sys-sub">${sub.join(" · ")}</div></div>
      <button class="ag-cbtn" data-act="more" data-entity="${esc(s.entity_id)}" aria-label="${esc(s.title)}">${ic("chevRight", 16)}</button></div>
      ${seg}<div class="ag-rows">${this._sysRows(s, st)}</div></div>`;
  }

  _members(s, mode) {
    return s.zones?.[mode] || [];
  }

  _sysRows(s, st) {
    const armedMode = ARMED[st?.state] || (["arming", "pending", "triggered"].includes(st?.state) ? st.attributes.arm_mode : null);
    // Unscharf: Bereitschaft über alle Zonen; scharf: die Zone des Modus
    const ids = armedMode ? this._members(s, armedMode) : [...new Set(s.modes.flatMap((m) => this._members(s, m)))];
    const open = ids.filter((id) => this._state(id)?.state === "on");
    const unreachable = ids.filter((id) => ["unavailable", "unknown"].includes(this._state(id)?.state) || this._sensor(id).missing);
    const low = ids.filter((id) => {
      const b = this._battery(id);
      return b !== null && b < LOW_BATTERY;
    });
    const rows = [];
    const count = ids.length
      ? `<span class="ag-grow">${esc(this._t("monitored", { count: ids.length }))}</span>${open.length ? `<span class="ag-tag warn">${esc(this._t("openCount", { count: open.length }))}</span>` : `<span class="ag-tag ok">${esc(this._t("readyAll"))}</span>`}`
      : `<span class="ag-grow ag-t2">${esc(this._t("monitoredNone"))}</span>`;
    rows.push(`<div class="ag-row">${ic("shield", 18)}${count}</div>`);
    for (const id of open) rows.push(`<div class="ag-row"><span class="ag-mini warn">${ic(this._dcIcon(id), 16)}</span><span class="ag-grow">${esc(this._t("isOpen", { name: this._name(id) }))}</span></div>`);
    for (const id of unreachable) rows.push(`<div class="ag-row"><span class="ag-mini err">${ic("offline", 16)}</span><span class="ag-grow">${esc(this._t("unreachable", { name: this._name(id) }))}</span></div>`);
    for (const id of low) rows.push(`<div class="ag-row"><span class="ag-mini warn">${ic("battery", 16)}</span><span class="ag-grow">${esc(this._t("lowBattery", { name: this._name(id), level: this._battery(id) }))}</span></div>`);
    return rows.join("");
  }

  _dcIcon(id) {
    return (DC[this._sensor(id).device_class] || ["sensor"])[0];
  }

  _alarmBand(s) {
    const st = this._state(s.entity_id);
    const sensor = st?.attributes?.triggered_by;
    const text = sensor ? this._t("alarmBy", { sensor: this._name(sensor), time: this._fmtTime(st.last_changed) }) : "";
    return `<div class="ag-alarm" role="alert">${ic("alert", 30)}<div><b>${esc(this._t("alarmTitle", { name: s.title }))}</b><div style="opacity:.9;font-size:13px;margin-top:2px">${esc(text)}</div></div>
      <button class="ag-btn" data-act="mode" data-entry="${esc(s.entry_id)}" data-mode="off">${ic("shieldOff", 18)}${esc(this._t("disarm"))}</button></div>`;
  }

  _logHtml() {
    const events = this._systems()
      .flatMap((s) => (s.events || []).map((e) => ({ ...e, system: s.title })))
      .sort((a, b) => String(b.t).localeCompare(String(a.t)))
      .slice(0, 10);
    const rows = events.length
      ? events.map((e) => `<div class="ag-row"><time>${esc(this._fmtTime(e.t))}</time><span class="ag-grow"><b style="font-weight:500">${esc(e.system)}</b> · ${esc(this._eventText(e))}</span></div>`).join("")
      : `<div class="ag-row ag-t2">${esc(this._t("noEvents"))}</div>`;
    return `<div><div class="ag-label" style="margin:0 4px 8px">${esc(this._t("recentEvents"))}</div><div class="ag-card ag-log"><div class="ag-rows" style="border-top:0">${rows}</div></div></div>`;
  }

  _eventText(e) {
    const mode = this._t(MODE_KEY[e.mode] || "modeAway");
    const sensor = e.sensor ? this._name(e.sensor) : "";
    let text;
    if (ARMED[e.state]) text = this._t("evArmed", { mode });
    else if (e.state === "arming") text = this._t("evArming", { mode });
    else if (e.state === "disarmed") text = this._t("evDisarmed");
    else if (e.state === "pending") text = this._t("evPending", { sensor });
    else if (e.state === "triggered") text = sensor ? this._t("evTriggered", { sensor }) : this._t("evTriggeredManual");
    else text = e.state;
    return e.by ? `${text} · ${e.by}` : text;
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
      this._lastHtml.delete(this._view);
      this._renderView();
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
        const open = this._members(s, mode).filter((id) => this._state(id)?.state === "on").map((id) => this._name(id));
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

  // ----- Sensorgruppen (Variante B) -----

  _activeModes(s) {
    return s?.modes || ["home", "away"];
  }

  _makeDraft(s) {
    return {
      entry: s.entry_id,
      zones: Object.fromEntries(["home", "away", "night"].map((m) => [m, new Set(s.zones?.[m] || [])])),
      entrySensors: new Set(s.entry_sensors || []),
    };
  }

  _ensureDraft() {
    const s = this._system();
    if (!s) return null;
    if (!this._draft || this._draft.entry !== s.entry_id) this._draft = this._makeDraft(s);
    return this._draft;
  }

  _changedIds() {
    const s = this._system();
    const d = this._draft;
    if (!s || !d || d.entry !== s.entry_id) return new Set();
    const out = new Set();
    for (const m of this._activeModes(s)) {
      const base = new Set(s.zones?.[m] || []);
      for (const id of d.zones[m]) if (!base.has(id)) out.add(id);
      for (const id of base) if (!d.zones[m].has(id)) out.add(id);
    }
    const baseEntry = new Set(s.entry_sensors || []);
    for (const id of d.entrySensors) if (!baseEntry.has(id)) out.add(id);
    for (const id of baseEntry) if (!d.entrySensors.has(id)) out.add(id);
    return out;
  }

  _dirtyCount() {
    return this._changedIds().size;
  }

  _rows() {
    const s = this._system();
    const d = this._ensureDraft();
    if (!s || !d) return [];
    const q = this._query.trim().toLowerCase();
    const chosen = new Set(this._activeModes(s).flatMap((m) => [...d.zones[m]]));
    return Object.entries(this._data?.sensors || {})
      .filter(([id, info]) => {
        const dc = info.device_class;
        if (this._filter === "openings" && !OPENINGS.has(dc)) return false;
        if (this._filter === "motion" && !MOTION.has(dc)) return false;
        if (this._filter === "other" && (OPENINGS.has(dc) || MOTION.has(dc))) return false;
        if (info.missing && !chosen.has(id)) return false;
        if (!q) return true;
        return [this._name(id), id, info.area, info.integration].some((v) => String(v || "").toLowerCase().includes(q));
      })
      .map(([id, info]) => ({ id, info, name: this._name(id), area: info.area || this._t("noArea") }))
      // "Ohne Bereich" ans Ende, sonst alphabetisch nach Bereich und Name
      .sort((a, b) => Number(!a.info.area) - Number(!b.info.area) || a.area.localeCompare(b.area) || a.name.localeCompare(b.name));
  }

  _renderGroups() {
    const s = this._system();
    if (!this._data) return this._setHtml(this._view, "");
    if (!s) return this._setHtml(this._view, this._overviewHtml());
    const systems = this._systems();
    const pick = systems.length > 1
      ? `<select class="ag-select" data-act="system" aria-label="${esc(this._t("groupsSystem"))}">${systems.map((x) => `<option value="${esc(x.entry_id)}" ${x.entry_id === s.entry_id ? "selected" : ""}>${esc(x.title)}</option>`).join("")}</select>`
      : "";
    const filters = [["all", "filterAll"], ["openings", "filterOpenings"], ["motion", "filterMotion"], ["other", "filterOther"]]
      .map(([k, label]) => `<button class="ag-chip ${this._filter === k ? "on" : ""}" data-act="filter" data-filter="${k}">${esc(this._t(label))}</button>`).join("");
    const narrow = this.hasAttribute("narrow");
    const html = `<div class="ag-tools">${pick}
        <label class="list-search">${ic("search", 18)}<input type="search" data-act="search" placeholder="${esc(this._t("search"))}" value="${esc(this._query)}" aria-label="${esc(this._t("search"))}">
          <button class="ag-clear" data-act="clear-search" aria-label="${esc(this._t("clearSearch"))}" ${this._query ? "" : "hidden"}>${ic("close", 16)}</button></label>
        ${filters}${narrow ? "" : `<span class="ag-grow"></span><span class="ag-hint">${ic("hand", 16)}${esc(this._t("dragHint"))}</span>`}</div>
      <div class="ag-gbody"></div><div class="ag-foot"></div>`;
    this._lastHtml.delete(this._view);
    this._view.innerHTML = html;
    this._renderGroupsBody();
  }

  _renderGroupsBody() {
    const body = this._view?.querySelector(".ag-gbody");
    if (!body) return;
    const s = this._system();
    const d = this._ensureDraft();
    if (!s || !d) return;
    const rows = this._rows();
    const modes = this._activeModes(s);
    const changed = this._changedIds();
    const narrow = this.hasAttribute("narrow");
    if (!rows.length) {
      this._setHtml(body, `<div class="ag-card ag-empty"><span class="ag-t2">${esc(this._t("noSensors"))}</span></div>`);
    } else if (narrow) {
      this._setHtml(body, this._cardsHtml(rows, modes, d));
    } else {
      this._setHtml(body, this._tableHtml(rows, modes, d, changed));
    }
    this._renderFoot();
  }

  _sensorBits(r) {
    const st = this._state(r.id)?.state;
    const [icon, label] = DC[r.info.device_class] || ["sensor", "dcOther"];
    const cls = r.info.missing ? "missing" : st === "on" ? "open" : "";
    const sub = r.info.missing ? this._t("missing") : this._t(label);
    const b = this._battery(r.id);
    const batt = b === null ? `<span class="ag-batt">${r.info.battery ? "–" : esc(this._t("mains"))}</span>` : `<span class="ag-batt ${b < LOW_BATTERY ? "low" : ""}">${b} %</span>`;
    return { av: `<span class="ag-av ${cls}">${ic(r.info.missing ? "offline" : icon, 18)}</span>`, sub, batt };
  }

  _inActive(d, modes, id) {
    return modes.some((m) => d.zones[m].has(id));
  }

  _tableHtml(rows, modes, d, changed) {
    const head = `<tr><th>${esc(this._t("colSensor"))}</th>${modes.map((m) => `<th class="z">${esc(this._t(MODE_KEY[m]))}<button class="ag-allbtn" data-act="all" data-mode="${m}">${esc(this._t("all"))}</button></th>`).join("")}
      <th class="z">${esc(this._t("colEntry"))}</th><th>${esc(this._t("colIntegration"))}</th><th>${esc(this._t("colBattery"))}</th></tr>`;
    let area = null;
    const body = [];
    for (const r of rows) {
      if (r.area !== area) {
        area = r.area;
        const n = rows.filter((x) => x.area === area).length;
        body.push(`<tr class="grp"><td colspan="${modes.length + 4}">${esc(area)} · ${n}</td></tr>`);
      }
      const bits = this._sensorBits(r);
      const active = this._inActive(d, modes, r.id);
      body.push(`<tr class="${changed.has(r.id) ? "changed" : ""}"><td><div class="ag-nm">${bits.av}<div>${esc(r.name)}<small>${esc(bits.sub)}</small></div></div></td>
        ${modes.map((m) => {
          const on = d.zones[m].has(r.id);
          return `<td class="z"><button class="ag-box ${on ? "on" : ""}" data-box data-mode="${m}" data-ent="${esc(r.id)}" role="checkbox" aria-checked="${on}" aria-label="${esc(`${r.name}: ${this._t(MODE_KEY[m])}`)}">${on ? ic("check", 18) : ""}</button></td>`;
        }).join("")}
        <td class="z"><button class="ag-toggle ${d.entrySensors.has(r.id) ? "on" : ""}" data-act="entry" data-ent="${esc(r.id)}" role="switch" aria-checked="${d.entrySensors.has(r.id)}" aria-label="${esc(`${r.name}: ${this._t("colEntry")}`)}" ${active ? "" : `disabled title="${esc(this._t("entryHint"))}"`}></button></td>
        <td>${esc(r.info.integration || "")}</td><td>${bits.batt}</td></tr>`);
    }
    return `<div class="ag-card ag-table-wrap"><table class="ag-table">${head}${body.join("")}</table></div>`;
  }

  _cardsHtml(rows, modes, d) {
    let area = null;
    const out = [];
    for (const r of rows) {
      if (r.area !== area) {
        area = r.area;
        out.push(`<div class="ag-group-label">${esc(area)}</div>`);
      }
      const bits = this._sensorBits(r);
      const active = this._inActive(d, modes, r.id);
      const info = [bits.sub, r.info.integration].filter(Boolean).map(esc).join(" · ");
      out.push(`<div class="ag-card ag-mcard"><div class="ag-mcard-top">${bits.av}<div style="flex:1;min-width:0">${esc(r.name)}<div class="ag-t2" style="font-size:12px">${info}</div></div>${bits.batt}</div>
        <div class="ag-zbtns" style="--n:${modes.length}">${modes.map((m) => {
          const on = d.zones[m].has(r.id);
          return `<button class="ag-zbtn ${on ? "on" : ""}" data-act="zone" data-mode="${m}" data-ent="${esc(r.id)}" aria-pressed="${on}">${ic(MODE_ICON[m], 16)}${esc(this._t(MODE_KEY[m]))}</button>`;
        }).join("")}</div>
        <div class="ag-mentry">${ic("timer", 18)}<span class="ag-grow">${esc(this._t("colEntry"))}</span>
          <button class="ag-toggle ${d.entrySensors.has(r.id) ? "on" : ""}" data-act="entry" data-ent="${esc(r.id)}" role="switch" aria-checked="${d.entrySensors.has(r.id)}" aria-label="${esc(`${r.name}: ${this._t("colEntry")}`)}" ${active ? "" : "disabled"}></button></div></div>`);
    }
    return `<div class="ag-mcards">${out.join("")}</div>`;
  }

  _renderFoot() {
    const foot = this._view?.querySelector(".ag-foot");
    if (!foot) return;
    const n = this._dirtyCount();
    let status;
    if (this._saveState === "saved" && !n) status = `<span class="ag-saved">${ic("check", 16)} ${esc(this._t("saved"))}</span>`;
    else if (this._saveState && this._saveState !== "saved") status = `<span class="ag-err">${esc(this._saveState)}</span>`;
    else status = `<span class="ag-t2">${esc(n === 0 ? this._t("noChanges") : n === 1 ? this._t("change") : this._t("changes", { count: n }))}</span>`;
    this._setHtml(foot, `${status}<span class="ag-grow"></span><button class="ag-btn" data-act="cancel" ${n ? "" : "disabled"}>${esc(this._t("cancel"))}</button>
      <button class="ag-btn primary" data-act="save" ${n && !this._saving ? "" : "disabled"}>${ic("check", 18)}${esc(this._t("save"))}</button>`);
  }

  // Zone setzen; wer in keiner aktiven Zone mehr ist, verliert auch die Eingangsverzögerung (sonst lehnt der Server ab)
  _setZone(id, mode, value) {
    const s = this._system();
    const d = this._ensureDraft();
    if (!d || !s) return;
    if (value) d.zones[mode].add(id);
    else d.zones[mode].delete(id);
    if (!this._inActive(d, this._activeModes(s), id)) d.entrySensors.delete(id);
    this._saveState = null;
  }

  async _save() {
    const s = this._system();
    const d = this._draft;
    if (!s || !d || this._saving) return;
    // Bisherige Reihenfolge behalten, neue Sensoren hinten anfügen
    const order = (m) => [...(s.zones?.[m] || []).filter((id) => d.zones[m].has(id)), ...[...d.zones[m]].filter((id) => !(s.zones?.[m] || []).includes(id)).sort()];
    const zones = Object.fromEntries(["home", "away", "night"].map((m) => [m, order(m)]));
    this._saving = true;
    this._renderFoot();
    try {
      await this._hass.callWS({ type: "alarmageddon/save_zones", entry_id: s.entry_id, zones, entry_sensors: [...d.entrySensors].sort() });
      // Sofort als gespeichert zeigen; die Anlage lädt neu, die Daten kommen gleich nach
      s.zones = zones;
      s.entry_sensors = [...d.entrySensors].sort();
      this._draft = null;
      this._saveState = "saved";
      this._fetch();
    } catch (err) {
      this._saveState = this._t("saveFailed", { message: errText(err) });
    } finally {
      this._saving = false;
      this._renderGroupsBody();
    }
  }

  // Rückfrage vor dem Verlassen mit offenen Änderungen (Einheitlich speichern)
  _guard(action) {
    if (this._tab !== "groups" || !this._dirtyCount()) return action();
    this._pending = action;
    const dlg = this._root.getElementById("ag-discard");
    dlg.innerHTML = `<div class="ag-dlg-body"><h3>${esc(this._t("discardTitle"))}</h3><div class="ag-t2">${esc(this._t("discardText"))}</div>
      <div class="ag-dlg-btns"><button class="ag-btn" data-act="discard">${esc(this._t("discard"))}</button><button class="ag-btn primary" data-act="keep">${esc(this._t("keepEditing"))}</button></div></div>`;
    dlg.showModal();
    dlg.querySelector('[data-act="keep"]').focus();
  }

  // ----- Ereignisse -----

  _onClick(ev) {
    const el = ev.target.closest("[data-act]");
    if (ev.target.closest("[data-box]")) {
      // Tastatur (Enter, Leertaste) löst nur click aus; Maus und Finger laufen über pointerdown
      if (this._skipClick) {
        this._skipClick = false;
        return;
      }
      const box = ev.target.closest("[data-box]");
      this._setZone(box.dataset.ent, box.dataset.mode, !box.classList.contains("on"));
      this._renderGroupsBody();
      return;
    }
    if (!el) return;
    const act = el.dataset.act;
    if (act === "tab" && el.dataset.tab !== this._tab) {
      this._guard(() => {
        this._draft = null;
        this._saveState = null;
        this._tab = el.dataset.tab;
        this._savePref("tab", this._tab);
        this._render();
      });
    } else if (act === "mode") {
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
    } else if (act === "filter") {
      this._filter = el.dataset.filter;
      this._view.querySelectorAll('[data-act="filter"]').forEach((b) => b.classList.toggle("on", b === el));
      this._renderGroupsBody();
    } else if (act === "clear-search") {
      ev.preventDefault();
      const input = this._view.querySelector('[data-act="search"]');
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
    } else if (act === "all") {
      const rows = this._rows();
      const d = this._ensureDraft();
      const mode = el.dataset.mode;
      const value = !rows.every((r) => d.zones[mode].has(r.id));
      rows.forEach((r) => this._setZone(r.id, mode, value));
      this._renderGroupsBody();
    } else if (act === "zone") {
      this._setZone(el.dataset.ent, el.dataset.mode, !el.classList.contains("on"));
      this._renderGroupsBody();
    } else if (act === "entry") {
      const d = this._ensureDraft();
      if (d.entrySensors.has(el.dataset.ent)) d.entrySensors.delete(el.dataset.ent);
      else d.entrySensors.add(el.dataset.ent);
      this._saveState = null;
      this._renderGroupsBody();
    } else if (act === "cancel") {
      this._draft = null;
      this._saveState = null;
      this._renderGroupsBody();
    } else if (act === "save") {
      this._save();
    } else if (act === "keep") {
      this._pending = null;
      this._closeDialog("ag-discard");
    } else if (act === "discard") {
      this._closeDialog("ag-discard");
      this._draft = null;
      const action = this._pending;
      this._pending = null;
      action?.();
    }
  }

  _onInput(ev) {
    if (ev.target.dataset?.act !== "search") return;
    this._query = ev.target.value;
    this._view.querySelector(".ag-clear").hidden = !this._query;
    // Nur die Liste neu, Suchfeld behält Fokus und Cursor (LEARNINGS)
    this._renderGroupsBody();
  }

  _onChange(ev) {
    if (ev.target.dataset?.act !== "system") return;
    const value = ev.target.value;
    const previous = this._sel;
    ev.target.value = previous;
    this._guard(() => {
      this._sel = value;
      this._savePref("system", value);
      this._draft = null;
      this._saveState = null;
      this._renderGroups();
    });
  }

  _onSubmit(ev) {
    const form = ev.target.closest('[data-form="code"]');
    if (!form) return;
    ev.preventDefault();
    const code = form.querySelector("input").value.trim();
    if (code) this._arm(form.dataset.entry, form.dataset.mode, code);
  }

  // Ziehen über mehrere Kästchen derselben Spalte setzt alle auf den Wert des ersten
  _onPointerDown(ev) {
    const box = ev.target.closest("[data-box]");
    if (!box || ev.button > 0) return;
    ev.preventDefault();
    const value = !box.classList.contains("on");
    this._paint = { mode: box.dataset.mode, value, touched: new Set([box.dataset.ent]) };
    this._setZone(box.dataset.ent, box.dataset.mode, value);
    this._paintBox(box, value);
    this._skipClick = true;
  }

  _onPointerMove(ev) {
    if (!this._paint) return;
    const el = this._root.elementFromPoint(ev.clientX, ev.clientY)?.closest?.("[data-box]");
    if (!el || el.dataset.mode !== this._paint.mode || this._paint.touched.has(el.dataset.ent)) return;
    this._paint.touched.add(el.dataset.ent);
    this._setZone(el.dataset.ent, el.dataset.mode, this._paint.value);
    this._paintBox(el, this._paint.value);
  }

  // Während des Ziehens nur das Kästchen ändern, erst beim Loslassen neu aufbauen (LEARNINGS)
  _paintBox(box, value) {
    box.classList.toggle("on", value);
    box.setAttribute("aria-checked", String(value));
    box.innerHTML = value ? ic("check", 18) : "";
  }

  _endPaint() {
    if (!this._paint) return;
    this._paint = null;
    this._renderGroupsBody();
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
