// Dashboard-Karten von Alarmageddon (1.34.0): "Bedienteil" und "Status", dieselben Kacheln wie die Übersicht des Panels, für jedes Dashboard.
// Die Karten laufen in der Oberfläche von Home Assistant, nicht im Panel: sie lesen nur Entitäten (jeder Nutzer sieht sie) und steuern
// über die Dienste von HA (alarm_control_panel.alarm_arm_*, alarm_disarm, alarmageddon.acknowledge). Das Panel braucht Administratorrechte,
// die Karten nicht; ob ein Code nötig ist, entscheidet die Alarmanlage (HA prüft ihn), nie die Karte.

const V = new URL(import.meta.url).search;
const { pickLang, translate } = await import(`./strings.js${V}`);
const { CSS } = await import(`./styles.js${V}`);
const { ic, esc, MODE_ICON, MODE_KEY, ARMED, GONE } = await import(`./common.js${V}`);

const FEATURE = { home: 1, away: 2, night: 4 }; // AlarmControlPanelEntityFeature
const ARM_SERVICE = { home: "alarm_arm_home", away: "alarm_arm_away", night: "alarm_arm_night" };
const ready = (hass, alarmId) => {
  // Entitäten derselben Anlage (dasselbe Gerät) über die Registrierung, die Home Assistant dem Frontend gibt
  const device = hass.entities?.[alarmId]?.device_id;
  const all = device ? Object.values(hass.entities).filter((e) => e.device_id === device && e.platform === "alarmageddon") : [];
  const byKey = (key) => all.find((e) => e.translation_key === key)?.entity_id;
  return { ready: ["home", "away", "night"].map((m) => [m, byKey(`ready_${m}`)]).filter(([, id]) => id && hass.states[id]), status: byKey("status") };
};

// Eigene Stile der Karte: das Panel ist eine ganze Seite, die Karte nur ein Stück davon (Fläche und Höhe gehören dem Dashboard)
const CARD_CSS = `
:host { display: block; height: auto; background: transparent; font-size: 14px; }
.ag-card-wrap { display: grid; gap: 12px; }
.ag-sys { margin: 0; }
.ag-toast { position: fixed; }
.ag-missing { padding: 16px; color: var(--ag-text2); }
dialog.ag-dlg { margin: auto; }
`;

class AlarmageddonCardBase extends HTMLElement {
  constructor() {
    super();
    this._root = this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._sig = "";
    this._seg = null;
    this._root.innerHTML = `<style>${CSS}${CARD_CSS}</style><div class="ag-card-wrap"></div>`;
    this._wrap = this._root.querySelector(".ag-card-wrap");
    this._root.addEventListener("click", (ev) => this._onClick(ev));
    this._root.addEventListener("submit", (ev) => this._onSubmit(ev));
  }

  setConfig(config) {
    if (!config?.entity) throw new Error("entity is required");
    this._config = { ...config };
    this._sig = "";
    this._render();
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    this._lang = pickLang(hass);
    // Das Stylesheet des Panels kennt dunkel nur über das Attribut (Alarmband); Home Assistant meldet es im Thema
    this.toggleAttribute("dark", Boolean(hass.themes?.darkMode));
    const sig = this._signature(hass);
    if (first || sig !== this._sig) {
      this._sig = sig;
      this._render();
    }
  }

  get hass() {
    return this._hass;
  }

  connectedCallback() {
    this._tick = setInterval(() => this._countdowns(), 1000);
    // Erst jetzt hat die Karte eine Grösse: neu zeichnen (die Kapsel braucht die Breite der Knöpfe) und bei jeder Änderung der Breite nachführen
    this._last = "";
    if (this._hass) this._render();
    this._ro = new ResizeObserver(() => {
      if (this._root.querySelector(".ag-seg")?.offsetWidth) {
        this._seg = null;
        this._placePill();
      }
    });
    this._ro.observe(this._wrap);
  }

  disconnectedCallback() {
    clearInterval(this._tick);
    this._ro?.disconnect();
  }

  getCardSize() {
    return 4;
  }

  getGridOptions() {
    return { columns: 12, min_columns: 4, rows: "auto" };
  }

  _t(key, vars) {
    return translate(this._lang || "en", key, vars);
  }

  // Nur neu zeichnen, wenn sich etwas ändert, das die Karte zeigt (Home Assistant ruft hass bei jeder Zustandsänderung irgendwo auf)
  _signature(hass) {
    const id = this._config?.entity;
    if (!id) return "";
    const rel = ready(hass, id);
    const ids = [id, ...rel.ready.map(([, e]) => e), rel.status].filter(Boolean);
    return ids.map((e) => `${e}:${hass.states[e]?.last_updated}:${hass.states[e]?.state}`).join("|") + `|${hass.entities?.[id]?.device_id}|${hass.locale?.language}|${hass.user?.is_admin}|${hass.themes?.darkMode}`;
  }

  _fmtTime(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const locale = this._hass?.locale?.language || this._lang;
    const now = new Date();
    const time = d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
    if (d.toDateString() === now.toDateString()) return time;
    if (d.toDateString() === new Date(now.getTime() - 86400000).toDateString()) return `${this._t("yesterday")} ${time}`;
    return d.toLocaleDateString(locale, { day: "numeric", month: "short" });
  }

  _fmtRemaining(iso) {
    const s = Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  _countdowns() {
    for (const el of this._root.querySelectorAll("[data-countdown]")) el.textContent = this._t("remaining", { time: this._fmtRemaining(el.dataset.countdown) });
  }

  _name(id) {
    return this._hass?.states?.[id]?.attributes?.friendly_name || id;
  }

  _title(st) {
    return this._config?.name || st?.attributes?.friendly_name || this._config?.entity;
  }

  _set(html) {
    if (this._last === html) return;
    this._last = html;
    this._wrap.innerHTML = html;
    this._placePill();
  }

  // Die gewählte Fläche der Modusleiste gleitet zum neuen Knopf (wie im Panel); beim ersten Zeichnen steht sie sofort richtig
  _placePill() {
    const bar = this._root.querySelector(".ag-seg");
    const on = bar?.querySelector(":scope > button.on");
    if (!bar || !on || !bar.offsetWidth) {
      this._seg = null;
      return;
    }
    const rect = { x: on.offsetLeft, y: on.offsetTop, w: on.offsetWidth, h: on.offsetHeight };
    bar.querySelector(":scope > .ag-pill")?.remove();
    const pill = this.ownerDocument.createElement("i");
    pill.className = "ag-pill";
    pill.setAttribute("aria-hidden", "true");
    bar.appendChild(pill);
    const apply = (r) => {
      pill.style.width = `${r.w}px`;
      pill.style.height = `${r.h}px`;
      pill.style.transform = `translate(${r.x}px, ${r.y}px)`;
    };
    const from = this._seg;
    const still = !from || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    pill.style.transition = "none";
    apply(from || rect);
    void pill.offsetWidth;
    pill.style.transition = "";
    if (!still) pill.classList.add("go");
    apply(rect);
    this._seg = rect;
  }

  // ----- Code abfragen (wie im Panel: ein Fenster, die Prüfung macht Home Assistant) -----

  _askCode(title, run) {
    let dlg = this._root.querySelector("dialog.ag-dlg");
    if (!dlg) {
      dlg = this.ownerDocument.createElement("dialog");
      dlg.className = "ag-dlg";
      this._root.appendChild(dlg);
      // Ein getippter Code bleibt nie im Fenster stehen, egal wie es schliesst
      dlg.addEventListener("close", () => this._wipe(dlg));
    }
    this._run = run;
    dlg.innerHTML = `<form class="ag-dlg-body" data-form="code"><h3>${esc(this._t("codeTitle"))}</h3><div class="ag-t2">${esc(title)}</div>
      <input class="ag-code" type="password" inputmode="numeric" autocomplete="one-time-code" aria-label="${esc(this._t("codeLabel"))}" required>
      <div class="ag-dlg-err" aria-live="polite"></div>
      <div class="ag-dlg-btns"><button type="button" class="ag-btn" data-act="close-code">${esc(this._t("cancel"))}</button><button class="ag-btn primary" type="submit">${esc(this._t("ok"))}</button></div></form>`;
    dlg.showModal();
    dlg.querySelector("input").focus();
  }

  _wipe(dlg) {
    for (const input of dlg.querySelectorAll('input[type="password"]')) input.value = "";
    dlg.innerHTML = "";
  }

  async _onSubmit(ev) {
    const form = ev.target.closest('[data-form="code"]');
    if (!form) return;
    ev.preventDefault();
    const dlg = form.closest("dialog");
    const code = form.querySelector("input").value;
    try {
      await this._run(code);
      dlg.close();
      this._wipe(dlg); // nicht erst auf das Ereignis "close" warten
    } catch (err) {
      // Home Assistant liefert den Fehler in der Sprache des Nutzers ("Wrong code.")
      form.querySelector(".ag-dlg-err").textContent = err?.message || this._t("errInvalidCode");
    }
  }

  _toast(text) {
    const el = this.ownerDocument.createElement("div");
    el.className = "ag-toast";
    el.textContent = text;
    this._root.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  _openPanel() {
    this.ownerDocument.defaultView.history.pushState(null, "", "/alarmageddon");
    this.ownerDocument.defaultView.dispatchEvent(new CustomEvent("location-changed", { bubbles: true, composed: true }));
  }

  _onClick(ev) {
    const el = ev.target.closest("[data-act]");
    if (!el) return;
    const act = el.dataset.act;
    if (act === "close-code") el.closest("dialog").close();
    else this._act(act, el);
  }
}

// ----- Bedienteil -----

class AlarmageddonCard extends AlarmageddonCardBase {
  static getStubConfig(hass) {
    const id = Object.values(hass?.entities || {}).find((e) => e.platform === "alarmageddon" && e.entity_id.startsWith("alarm_control_panel."))?.entity_id
      || Object.keys(hass?.states || {}).find((e) => e.startsWith("alarm_control_panel."));
    return { entity: id || "", show_ready: true, show_alarm_band: true, open_panel: true };
  }

  static getConfigForm() {
    return {
      schema: [
        { name: "entity", required: true, selector: { entity: { domain: "alarm_control_panel", integration: "alarmageddon" } } },
        { name: "name", selector: { text: {} } },
        { name: "show_ready", selector: { boolean: {} } },
        { name: "show_alarm_band", selector: { boolean: {} } },
        { name: "open_panel", selector: { boolean: {} } },
      ],
      computeLabel: (schema) => translate(docLang(), `cardOpt_${schema.name}`),
    };
  }

  _look(st) {
    const state = st?.state;
    const mode = st?.attributes?.arm_mode;
    if (!st || GONE.has(state)) return { text: this._t("stateUnavailable"), color: "var(--ag-text3)", soft: "var(--ag-subtle)", icon: "shield" };
    if (state === "disarmed") return { text: this._t("stateDisarmed"), color: "var(--ag-success)", soft: "var(--ag-success-soft)", icon: "shieldOff" };
    if (ARMED[state]) {
      const key = { home: "stateArmedHome", away: "stateArmedAway", night: "stateArmedNight" }[ARMED[state]];
      return { text: this._t(key), color: "var(--ag-error)", soft: "var(--ag-error-soft)", icon: MODE_ICON[ARMED[state]] };
    }
    if (state === "arming") return { text: this._t("stateArming", { mode: this._t(MODE_KEY[mode] || "modeAway") }), color: "var(--ag-warning)", soft: "var(--ag-warning-soft)", icon: "timer" };
    if (state === "pending") return { text: this._t("statePending"), color: "var(--ag-warning)", soft: "var(--ag-warning-soft)", icon: "timer" };
    return { text: this._t("stateTriggered"), color: "var(--ag-error)", soft: "var(--ag-error-soft)", icon: "alert", solid: true };
  }

  _modes(st) {
    const features = Number(st?.attributes?.supported_features) || 0;
    return ["home", "away", "night"].filter((m) => features & FEATURE[m]);
  }

  _render() {
    const hass = this._hass;
    if (!hass || !this._config) return;
    const id = this._config.entity;
    const st = hass.states[id];
    if (!st) {
      this._set(`<div class="ag-card ag-missing">${esc(this._t("cardMissing", { entity: id }))}</div>`);
      return;
    }
    const attrs = st.attributes || {};
    const state = st.state;
    const look = this._look(st);
    const title = this._title(st);
    const sub = [];
    if ((state === "arming" || state === "pending" || state === "triggered") && attrs.deadline) {
      sub.push(`<span data-countdown="${esc(attrs.deadline)}">${esc(this._t("remaining", { time: this._fmtRemaining(attrs.deadline) }))}</span>`);
    } else if (st.last_changed) {
      sub.push(esc(this._t("since", { time: this._fmtTime(st.last_changed) })));
    }
    const alarmish = state === "pending" || state === "triggered";
    if (alarmish && attrs.triggered_by) sub.push(esc(this._name(attrs.triggered_by)));
    else if (attrs.changed_by && (!alarmish || !attrs.arm_mode)) sub.push(esc(attrs.changed_by));
    const armedKey = alarmish ? { home: "stateArmedHome", away: "stateArmedAway", night: "stateArmedNight" }[attrs.arm_mode] : null;
    const armedLine = armedKey
      ? `<div class="ag-sys-sub ag-sys-armed">${ic(MODE_ICON[attrs.arm_mode], 14)}<span>${esc([`${this._t(armedKey)}${attrs.armed_at ? ` ${this._t("since", { time: this._fmtTime(attrs.armed_at) })}` : ""}`, attrs.armed_by || ""].filter(Boolean).join(" · "))}</span></div>`
      : "";
    const current = state === "disarmed" ? "off" : ARMED[state] || (state === "arming" ? attrs.arm_mode : null);
    const modes = ["off", ...this._modes(st)];
    const seg = `<div class="ag-seg" data-seg="mode" role="tablist">${modes
      .map((m) => `<button role="tab" data-act="mode" data-mode="${m}" class="${m === current ? "on" : ""}" aria-selected="${m === current}" ${GONE.has(state) ? "disabled" : ""}>${ic(MODE_ICON[m], 16)}<span>${esc(this._t(MODE_KEY[m]))}</span></button>`)
      .join("")}</div>`;
    // "Bereit für" je Modus aus den Bereit-Entitäten der Anlage; offene Sensoren aus deren Attribut
    let rows = "";
    const rel = ready(hass, id);
    if (state === "disarmed" && this._config.show_ready !== false && rel.ready.length) {
      const chips = rel.ready.filter(([m]) => modes.includes(m)).map(([m, eid]) => {
        const blocked = hass.states[eid].state !== "on";
        return [m, blocked, hass.states[eid].attributes?.blocking_sensors || []];
      });
      const open = [...new Set(chips.flatMap(([, , b]) => b))];
      rows = `<div class="ag-rows"><div class="ag-ready"><span class="ag-t2">${esc(this._t("readyFor"))}</span>${chips
        .map(([m, blocked]) => `<span class="ag-rchip ${blocked ? "no" : "ok"}">${ic(blocked ? "alert" : "check", 14)}${esc(this._t(MODE_KEY[m]))}</span>`).join("")}</div>
        ${open.map((sid) => `<div class="ag-row"><span class="ag-mini warn">${ic("alert", 16)}</span><span class="ag-grow">${esc(this._t("isOpen", { name: this._name(sid) }))}</span></div>`).join("")}</div>`;
    }
    const armedClass = ARMED[state] ? ` ag-armed ag-armed-${ARMED[state]}` : state === "triggered" ? " ag-armed ag-alarmed" : state === "disarmed" ? " ag-disarmed" : "";
    const band = state === "triggered" && this._config.show_alarm_band !== false
      ? `<div class="ag-alarm" role="alert">${ic("alert", 30)}<div><b>${esc(this._t("alarmTitle", { name: title }))}</b><div style="opacity:.9;font-size:13px;margin-top:2px">${esc(attrs.triggered_by ? this._t("alarmBy", { sensor: this._name(attrs.triggered_by), time: this._fmtTime(st.last_changed) }) : "")}</div></div>
        <div class="ag-alarm-btns"><button class="ag-btn" data-act="ack" title="${esc(this._t("ackHint"))}">${ic("check", 18)}${esc(this._t("ack"))}</button>
        <button class="ag-btn" data-act="mode" data-mode="off">${ic("shieldOff", 18)}${esc(this._t("disarm"))}</button></div></div>`
      : "";
    const more = this._config.open_panel !== false && hass.user?.is_admin
      ? `<button class="ag-cbtn" data-act="panel" aria-label="${esc(title)}">${ic("chevRight", 16)}</button>` : "";
    this._set(`${band}<div class="ag-card ag-sys${armedClass}"><div class="ag-sys-top"><div class="ag-shield" style="background:${look.solid ? look.color : look.soft};color:${look.solid ? "#fff" : look.color}">${ic(look.icon, 28)}</div>
      <div style="flex:1;min-width:0"><h2>${esc(title)}</h2><div class="ag-sys-state" style="color:${look.color}">${esc(look.text)}</div><div class="ag-sys-sub">${sub.join(" · ")}</div>${armedLine}</div>${more}</div>
      ${seg}${rows}</div>`);
  }

  async _act(act, el) {
    const hass = this._hass;
    const id = this._config.entity;
    const st = hass.states[id];
    if (act === "panel") return this._openPanel();
    if (!st) return;
    const attrs = st.attributes || {};
    if (act === "ack") {
      const call = (code) => hass.callService("alarmageddon", "acknowledge", { entity_id: id, ...(code ? { code } : {}) });
      if (attrs.code_ack_required) this._askCode(this._t("codeAck", { name: this._title(st) }), call);
      else await call().catch((err) => this._toast(err?.message || String(err)));
      return;
    }
    if (act !== "mode") return;
    const mode = el.dataset.mode;
    const service = mode === "off" ? "alarm_disarm" : ARM_SERVICE[mode];
    const call = (code) => hass.callService("alarm_control_panel", service, { entity_id: id, ...(code ? { code } : {}) });
    const needsCode = Boolean(attrs.code_format) && (mode === "off" || attrs.code_arm_required);
    if (needsCode) {
      this._askCode(mode === "off" ? this._t("codeDisarm", { name: this._title(st) }) : this._t("codeArm", { mode: this._t(MODE_KEY[mode]), name: this._title(st) }), call);
      return;
    }
    // Die Kapsel wechselt sofort; scheitert der Aufruf, steht sie danach wieder nach dem echten Zustand
    for (const b of this._root.querySelectorAll(".ag-seg > button")) b.classList.toggle("on", b === el);
    this._placePill();
    try {
      await call();
    } catch (err) {
      this._toast(err?.message || String(err));
      this._last = "";
      this._render();
    }
  }
}

// ----- Status -----

class AlarmageddonStatusCard extends AlarmageddonCardBase {
  static getStubConfig(hass) {
    return AlarmageddonCard.getStubConfig(hass);
  }

  static getConfigForm() {
    return {
      schema: [
        { name: "entity", required: true, selector: { entity: { domain: "alarm_control_panel", integration: "alarmageddon" } } },
      ],
      computeLabel: (schema) => translate(docLang(), `cardOpt_${schema.name}`),
    };
  }

  getCardSize() {
    return 2;
  }

  _render() {
    const hass = this._hass;
    if (!hass || !this._config) return;
    const id = this._config.entity;
    if (!hass.states[id]) {
      this._set(`<div class="ag-card ag-missing">${esc(this._t("cardMissing", { entity: id }))}</div>`);
      return;
    }
    const sid = ready(hass, id).status;
    const st = sid ? hass.states[sid] : null;
    if (!st) {
      this._set(`<div class="ag-card ag-missing">${esc(this._t("cardNoStatus"))}</div>`);
      return;
    }
    const a = st.attributes || {};
    const names = (list) => list.map((x) => this._name(typeof x === "string" ? x : x.entity_id)).join(", ");
    const items = [
      ...(a.alarm ? [`<div class="ag-row"><span class="ag-mini err">${ic("alert", 16)}</span><span class="ag-grow">${esc(this._t("warnAlarm", { name: this._title(hass.states[id]) }))}</span></div>`] : []),
      ...((a.offline || []).length ? [`<div class="ag-row"><span class="ag-mini err">${ic("offline", 16)}</span><span class="ag-grow">${esc(this._t("warnOffline", { count: a.offline.length }))}<small class="ag-t2" style="display:block">${esc(names(a.offline))}</small></span></div>`] : []),
      ...((a.low_battery || []).length ? [`<div class="ag-row"><span class="ag-mini warn">${ic("battery", 16)}</span><span class="ag-grow">${esc(this._t("warnBattery", { count: a.low_battery.length }))}<small class="ag-t2" style="display:block">${esc(names(a.low_battery))}</small></span></div>`] : []),
    ];
    if (!items.length) {
      this._set(`<div class="ag-card ag-sys ag-status ok"><div class="ag-sys-top"><div class="ag-shield" style="background:var(--ag-success-soft);color:var(--ag-success)">${ic("check", 28)}</div>
        <div><div class="ag-label">${esc(this._t("statusTitle"))}</div><h2>${esc(this._t("statusOk"))}</h2><div class="ag-sys-sub">${esc(this._t("statusOkText"))}</div></div></div></div>`);
      return;
    }
    this._set(`<div class="ag-card ag-sys ag-status warn"><div class="ag-sys-top"><div class="ag-shield" style="background:var(--ag-warning-soft);color:var(--ag-warning-text)">${ic("alert", 28)}</div>
      <div><div class="ag-label">${esc(this._t("statusTitle"))}</div><h2>${esc(this._t("warnTitle", { count: items.length }))}</h2></div></div><div class="ag-rows">${items.join("")}</div></div>`);
  }

  _act() {}
}

// Sprache für Texte, die Home Assistant ohne hass anfragt (Auswahl der Karten, Editor)
function docLang() {
  const ha = document.querySelector("home-assistant");
  return pickLang(ha?.hass || { language: document.documentElement.lang });
}

if (!customElements.get("alarmageddon-card")) {
  customElements.define("alarmageddon-card", AlarmageddonCard);
  customElements.define("alarmageddon-status-card", AlarmageddonStatusCard);
}
window.customCards = window.customCards || [];
for (const [type, name, description] of [
  ["alarmageddon-card", "cardPickControl", "cardPickControlText"],
  ["alarmageddon-status-card", "cardPickStatus", "cardPickStatusText"],
]) {
  if (!window.customCards.some((c) => c.type === type)) {
    window.customCards.push({ type, name: translate(docLang(), name), description: translate(docLang(), description), preview: true, documentationURL: "https://github.com/Diegofuego871/ha-alarmageddon" });
  }
}
