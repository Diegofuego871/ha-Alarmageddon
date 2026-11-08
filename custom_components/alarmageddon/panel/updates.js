// Konfiguration › Updates (nach dem Vorbild der Versionszeile von ha-device-panel): installierte und neueste Version (GitHub und
// HACS), Release Notes, Aktualisieren über HACS, Neustart, dazu die Einstellungen (tägliche Prüfung, Vorabversionen, automatisch
// installieren) als Entwurf mit "Speichern". Installiert wird nur über die Update-Entität von HACS für dieses Repository.

const V = new URL(import.meta.url).search;
const { ic, esc, errText, isConnectionError, chapter } = await import(`./common.js${V}`);

const REPO = "Diegofuego871/ha-Alarmageddon";
// Link auf dieses Repository, am Host verankert (wie update_check.is_repo_url im Server)
const REPO_URL_RE = /^https:\/\/github\.com\/diegofuego871\/ha-alarmageddon(?:[/?#]|$)/i;
const MARKET_PLATFORMS = ["hacs"];
const RESTART_WAIT_MS = 5 * 60 * 1000;

// Kleiner Markdown-Umsetzer für die Release Notes (CHANGELOG im Stil Keep a Changelog): Überschriften, Listen, Absätze,
// Codeblöcke, `Code`, **fett** und https-Links. HTML aus der Quelle wird nie übernommen: erst escapen, dann ersetzen.
function inlineMd(text) {
  return String(text)
    .split(/(`[^`]+`)/)
    .map((part) =>
      part.length > 2 && part.startsWith("`") && part.endsWith("`")
        ? `<code>${esc(part.slice(1, -1))}</code>`
        : esc(part)
            .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
            .replace(/\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    )
    .join("");
}

export function markdownHtml(markdown) {
  let html = "";
  let list = null;
  let para = [];
  let code = null;
  const flushPara = () => {
    if (para.length) html += `<p>${inlineMd(para.join(" "))}</p>`;
    para = [];
  };
  const flushList = () => {
    if (list) html += `<ul>${list.map((x) => `<li>${inlineMd(x)}</li>`).join("")}</ul>`;
    list = null;
  };
  for (const raw of String(markdown || "").replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (/^\s*```/.test(line)) {
      if (code) {
        html += `<pre>${esc(code.join("\n"))}</pre>`;
        code = null;
      } else {
        flushPara();
        flushList();
        code = [];
      }
      continue;
    }
    if (code) {
      code.push(line);
      continue;
    }
    let m;
    if (!line.trim()) {
      flushPara();
      flushList();
    } else if ((m = line.match(/^#{1,6}\s+(.*)$/))) {
      flushPara();
      flushList();
      html += `<h4>${inlineMd(m[1])}</h4>`;
    } else if ((m = line.match(/^\s*[-*]\s+(.*)$/))) {
      flushPara();
      (list ||= []).push(m[1]);
    } else if (list && /^\s+\S/.test(line)) {
      list[list.length - 1] += ` ${line.trim()}`;
    } else {
      flushList();
      para.push(line.trim());
    }
  }
  if (code) html += `<pre>${esc(code.join("\n"))}</pre>`;
  flushPara();
  flushList();
  return html;
}

// Versionsvergleich wie im Server (update_check.compare_versions): 0.10.0 > 0.9.9, eine Vorabversion (0.4.0b1) liegt unter der
// fertigen (0.4.0), aber über der vorherigen (0.3.2).
function versionKey(v) {
  const m = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?[-.]?(?:(alpha|beta|pre|rc|a|b)\.?(\d*))?/i.exec(String(v || "").trim());
  if (!m) return [0, 0, 0, 3, 0];
  const rank = { a: 0, alpha: 0, b: 1, beta: 1, pre: 1, rc: 2 };
  return [+m[1], +(m[2] || 0), +(m[3] || 0), m[4] ? rank[m[4].toLowerCase()] : 3, +(m[5] || 0)];
}

export function cmpVersion(a, b) {
  const x = versionKey(a);
  const y = versionKey(b);
  for (let i = 0; i < 5; i++) if (x[i] !== y[i]) return x[i] > y[i] ? 1 : -1;
  return 0;
}

const bare = (v) => (v == null ? v : String(v).replace(/^v/i, ""));

export class UpdatesUi {
  constructor(host) {
    this.host = host;
    this.v = {}; // checking, installing, installError, restarting, restartFrom, restartAt, restartError, hacsSyncing, data, error
    this.draft = null;
    this.saveState = null;
    this.saving = false;
    this.notes = null;
  }

  _t(key, vars) {
    return this.host._t(key, vars);
  }

  // ----- Zustand -----

  // Update-Entität von HACS für dieses Repository: erkannt nur am Link des Releases, nie am Titel oder an einer festen ID
  hacsEntity() {
    const hass = this.host._hass;
    if (!hass?.entities || !hass.states) return null;
    for (const e of Object.values(hass.entities)) {
      if (!e || !MARKET_PLATFORMS.includes(e.platform) || !String(e.entity_id).startsWith("update.")) continue;
      const st = hass.states[e.entity_id];
      if (st && REPO_URL_RE.test(String(st.attributes?.release_url || "").trim())) return st;
    }
    return null;
  }

  // Schalter "Pre-release" von HACS am selben Gerät. Deaktiviert (Standard bei HACS) fehlt er in hass.states: dann ist er aus.
  // Das Panel ändert ihn nie: aktivieren und einschalten macht der Nutzer im HACS-Gerät (Link im Hinweis).
  preReleaseSwitch() {
    const hass = this.host._hass;
    const upd = this.hacsEntity();
    if (!hass?.entities || !upd) return null;
    const deviceId = hass.entities[upd.entity_id]?.device_id;
    if (!deviceId) return null;
    const sw = Object.values(hass.entities).find(
      (e) => e && MARKET_PLATFORMS.includes(e.platform) && e.device_id === deviceId && String(e.entity_id).startsWith("switch.") && /pre.?release/i.test(`${e.entity_id} ${e.translation_key || ""}`)
    );
    const state = sw ? hass.states[sw.entity_id] : null;
    return { deviceId, on: Boolean(state && state.state === "on") };
  }

  isPre(ver, d) {
    if (!ver) return false;
    if (versionKey(ver)[3] < 3) return true;
    return Boolean(d.latest_prerelease && d.latest && cmpVersion(ver, d.latest) === 0);
  }

  state() {
    const v = this.v;
    const d = v.data || {};
    const hacs = this.hacsEntity();
    const a = hacs?.attributes || {};
    const wantsPre = Boolean(d.settings?.prerelease);
    const installed = d.installed || a.installed_version || null;
    let latest = d.latest || null;
    let url = d.latest_url || null;
    // HACS kennt eine Vorabversion nur mit eingeschaltetem "Pre-release"; ohne unseren Wunsch keine Vorabversion von HACS übernehmen
    if (a.latest_version && (!latest || cmpVersion(a.latest_version, latest) >= 0) && (wantsPre || !this.isPre(a.latest_version, d))) {
      latest = a.latest_version;
      url = a.release_url || url;
    }
    const beta = this.isPre(latest, d);
    const preSwitch = beta && hacs ? this.preReleaseSwitch() : null;
    const inProgress = Boolean(hacs && (a.in_progress === true || typeof a.in_progress === "number"));
    // HACS hat eine neuere Version auf die Platte gelegt, als gerade läuft: Neustart nötig
    const restart = Boolean(hacs && a.installed_version && installed && cmpVersion(a.installed_version, installed) > 0);
    let canInstall = Boolean(hacs && a.latest_version && installed && cmpVersion(a.latest_version, installed) > 0);
    // Vorabversion ohne "Pre-release" in HACS: HACS würde die stabile Version (oder nichts) installieren: sperren und erklären
    const betaBlocked = Boolean(beta && hacs && (!preSwitch || !preSwitch.on));
    if (betaBlocked) canInstall = false;
    const newer = Boolean(latest && installed && cmpVersion(latest, installed) > 0);
    return { v, d, hacs, a, installed, latest, url, inProgress, restart, canInstall, beta, betaBlocked, newer };
  }

  // Für den Punkt am Reiter: gibt es etwas Neues, das der Nutzer tun kann?
  hasNews() {
    const s = this.state();
    return Boolean(s.newer || s.restart);
  }

  // ----- Laden -----

  async load(force = false) {
    const h = this.host;
    const v = this.v;
    if (force) {
      v.checking = true;
      v.installError = null;
    }
    v.error = null;
    this.renderRow();
    let fresh = false;
    const jobs = [
      h._hass.callWS({ type: "alarmageddon/version", force }).then(
        (r) => {
          v.data = r;
          fresh = true;
        },
        (err) => (v.error = errText(err))
      ),
    ];
    // HACS prüft sonst nur alle Stunden: auf Knopfdruck sofort neu laden (öffentlicher Dienst, keine HACS-Interna)
    if (force) jobs.push(this.refreshHacs());
    await Promise.all(jobs);
    // GitHub kennt eine neuere Version als HACS: HACS einmal je neu gefundene Version nachladen lassen, sonst lässt sie sich nicht installieren
    const { hacs, a, latest } = this.state();
    if (!force && hacs && latest && v.hacsRefreshedFor !== latest && (!a.latest_version || cmpVersion(latest, a.latest_version) > 0)) {
      v.hacsRefreshedFor = latest;
      v.hacsSyncing = true;
      this.renderRow();
      await this.refreshHacs();
      // Der neue Stand der Entität kommt etwas nach dem Dienstaufruf: höchstens 4 Sekunden warten
      const until = Date.now() + 4000;
      while (Date.now() < until) {
        const now = this.state().a;
        if (now.latest_version && cmpVersion(now.latest_version, latest) >= 0) break;
        await new Promise((r) => setTimeout(r, 250));
      }
      v.hacsSyncing = false;
    }
    v.checking = false;
    // Nach einem Neustart bleibt die Seite offen: läuft jetzt eine andere Version (oder kam in 5 Minuten keiner), gilt "startet neu" nicht mehr
    if (v.restarting && fresh && (v.data.installed !== v.restartFrom || Date.now() - v.restartAt > RESTART_WAIT_MS)) {
      v.restarting = false;
      v.restartFrom = null;
    }
    if (v.data?.error && !v.data.latest) v.error = v.data.error;
    this.renderRow();
    h._renderDots?.();
  }

  async refreshHacs() {
    const hacs = this.hacsEntity();
    if (!hacs) return;
    try {
      await this.callService("homeassistant", "update_entity", { entity_id: hacs.entity_id });
    } catch {
      /* nicht kritisch: dann gilt der bisherige Stand von HACS */
    }
  }

  // Dienst über WebSocket statt hass.callService: der zeigt bei einem Fehler zusätzlich eine eigene Meldung, hier steht er in der Zeile
  callService(domain, service, data) {
    return this.host._hass.callWS({ type: "call_service", domain, service, service_data: data });
  }

  // ----- Darstellung -----

  html() {
    return `<div class="ag-upd">${chapter(this._t("updChapVersion"), '<div class="ag-ver-slot"></div>')}<div class="ag-upd-set"></div></div><div class="ag-foot"></div>`;
  }

  ensureDraft() {
    const s = this.v.data?.settings;
    if (!this.draft && s) this.draft = { check: !!s.check, prerelease: !!s.prerelease, auto_update: !!s.auto_update };
    return this.draft;
  }

  base() {
    const s = this.v.data?.settings || {};
    return { check: !!s.check, prerelease: !!s.prerelease, auto_update: !!s.auto_update };
  }

  dirtyCount() {
    if (!this.draft) return 0;
    const a = this.base();
    return Object.keys(a).filter((k) => a[k] !== this.draft[k]).length;
  }

  reset() {
    this.draft = null;
    this.saveState = null;
  }

  render() {
    if (!this.v.data && !this.v.checking && !this.v.error) this.load(false);
    this.renderRow();
    this.renderSettings();
    this.renderFoot();
  }

  renderRow() {
    const slot = this.host._view?.querySelector(".ag-ver-slot");
    if (slot) this.host._setHtml(slot, this._rowHtml(this.state()));
  }

  _formatRelative(epoch) {
    if (!epoch) return "";
    const diff = epoch - Date.now() / 1000;
    const abs = Math.abs(diff);
    try {
      const rtf = new Intl.RelativeTimeFormat(this.host._lang, { numeric: "auto" });
      for (const [unit, secs] of [["day", 86400], ["hour", 3600], ["minute", 60]]) if (abs >= secs) return rtf.format(Math.round(diff / secs), unit);
      return rtf.format(0, "minute");
    } catch {
      return "";
    }
  }

  _rowHtml({ v, d, hacs, a, installed, latest, url, inProgress, restart, canInstall, beta, betaBlocked, newer }) {
    const t = (k, vars) => this._t(k, vars);
    const auto = Boolean(d.settings?.auto_update && d.settings?.check);
    const row = (cls, icon, title, sub, right, mark = "") => `<div class="ag-ver ${cls}">
        <span class="ag-ver-ic">${ic(icon, 20)}</span>
        <div class="ag-ver-t"><b>${esc(title)}${mark}</b><small>${esc(sub)}</small></div>
        ${right ? `<div class="ag-ver-btns">${right}</div>` : ""}</div>`;
    const btn = (action, label, icon, cls = "", extra = "") => `<button type="button" class="ag-btn ${cls}" data-upd="${action}" ${extra}>${icon ? ic(icon, 16) : ""}${label ? esc(label) : ""}</button>`;
    const notes = latest && installed && newer ? `<button type="button" class="ag-link" data-upd="notes">${esc(t("updNotes"))}${ic("info", 15)}</button>` : "";
    if (v.restarting) return row("rst", "reset", t("updRestarting"), t("updRestartSub"), "");
    if (restart) {
      return row("rst", "reset", t("updRestartNeeded", { v: a.installed_version }), v.restartError ? `${t("updRestartError")} ${v.restartError}` : t("updRestartSub"),
        btn("restart", t("updRestart"), "reset", "warn"));
    }
    if (inProgress || v.installing) {
      return `<div class="ag-ver upd"><span class="ag-ver-ic">${ic("verUp", 20)}</span>
          <div class="ag-ver-t"><b>${esc(t("updInstalling", { v: v.installing || latest }))}</b><small>${esc(t("updInstallingSub"))}</small></div>
          <div class="ag-ver-prog"><i></i></div></div>`;
    }
    if (newer) {
      const viaHacs = (on) => t("updInstalledVia", { v: installed, via: on ? ` · ${t("updViaHacs")}` : "" });
      const sub = v.installError ? `${t("updInstallError")} ${v.installError}`
        : betaBlocked ? `${t("updInstalled", { v: installed })} · ${t("updPreShort")}`
        : !hacs ? `${viaHacs(false)} · ${t("updNoHacs")}`
        : canInstall ? viaHacs(true)
        : v.hacsSyncing ? `${viaHacs(true)} · ${t("updHacsSyncing")}`
        : `${viaHacs(true)} · ${t("updHacsPending")}`;
      const busy = v.checking || v.hacsSyncing;
      const spin = busy ? `<span class="ag-spin"></span>` : ic("refresh", 16);
      const checkBtn = canInstall || betaBlocked
        ? `<button type="button" class="ag-btn icon" data-upd="check" ${busy ? 'disabled aria-busy="true"' : ""} title="${esc(t("updCheck"))}" aria-label="${esc(t("updCheck"))}">${spin}</button>`
        : `<button type="button" class="ag-btn" data-upd="check" ${busy ? 'disabled aria-busy="true"' : ""}>${spin}${esc(t("updCheck"))}</button>`;
      const installBtn = canInstall ? btn("install", t("updUpdate"), "download", "primary") : betaBlocked ? btn("install", t("updUpdate"), "download", "primary", "disabled") : "";
      const hint = betaBlocked
        ? `<div class="ag-ver-hint">${esc(t("updPreHint"))}${this.preReleaseSwitch()?.deviceId ? `<div><button type="button" class="ag-link" data-upd="hacs-device" data-device="${esc(this.preReleaseSwitch().deviceId)}">${esc(t("updPreHintLink"))}</button></div>` : ""}</div>`
        : "";
      const tag = beta ? ` <span class="ag-ver-tag">${esc(t("updBeta"))}</span>` : "";
      return `${row(beta ? "upd beta" : "upd", beta ? "flask" : "verUp", t("updAvailable", { v: latest }), sub, `${notes}${checkBtn}${installBtn}`, tag).replace(/<\/div>\s*$/, `${hint}</div>`)}`;
    }
    const checked = d.checked_at ? t("updChecked", { when: this._formatRelative(d.checked_at) }) : "";
    const err = v.error === "rate_limit" ? t("updRateLimit") : v.error;
    const sub = v.checking ? t("updCheckingSub") : v.error ? `${t("updCheckError")} ${err}` : [t("updCurrent"), checked].filter(Boolean).join(" · ");
    const failed = Boolean(v.error && !v.checking);
    const currentNotes = installed ? `<button type="button" class="ag-link" data-upd="notes">${esc(t("updNotes"))}${ic("info", 15)}</button>` : "";
    const marks = `${d.installed_prerelease === true && !failed ? ` <span class="ag-ver-pre" title="${esc(t("updPreOn"))}">${ic("flask", 12)}${esc(t("updPreShort"))}</span>` : ""}${auto && !failed ? ` <span class="ag-ver-auto" title="${esc(t("updAutoOn"))}">${ic("refreshAuto", 12)}${esc(t("updAutoTag"))}</span>` : ""}`;
    return row(failed ? "err" : "ok", failed ? "alert" : "verOk", t("updName", { v: installed || "?" }), sub,
      `${currentNotes}<button type="button" class="ag-btn" data-upd="check" ${v.checking ? `disabled aria-busy="true" title="${esc(t("updChecking"))}"` : ""}>${v.checking ? `<span class="ag-spin"></span>` : ic("refresh", 16)}${esc(t("updCheck"))}</button>`, marks);
  }

  renderSettings() {
    const box = this.host._view?.querySelector(".ag-upd-set");
    const d = this.ensureDraft();
    if (!box) return;
    if (!d) return this.host._setHtml(box, "");
    // Automatisch installieren gilt nur mit der täglichen Prüfung: ohne sie zeigt der Schalter "aus"
    const on = (key) => (key === "auto_update" ? d.auto_update && d.check : d[key]);
    const toggle = (key, label, hint, disabled = false) => `<div class="ag-setrow"><div class="ag-settx"><b>${esc(this._t(label))}</b><small>${esc(this._t(hint))}</small></div>
      <button class="ag-toggle ${on(key) ? "on" : ""}" data-upd="set" data-key="${key}" role="switch" aria-checked="${on(key)}" aria-label="${esc(this._t(label))}" ${disabled ? "disabled" : ""}></button></div>`;
    this.host._setHtml(box, chapter(this._t("updChapSettings"), `<div class="ag-card ag-setlist">
      ${toggle("check", "updSetCheck", "updSetCheckHint")}
      ${toggle("prerelease", "updSetPre", "updSetPreHint")}
      ${toggle("auto_update", "updSetAuto", "updSetAutoHint", !d.check)}</div>`));
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
    h._setHtml(foot, `${status}<span class="ag-grow"></span><button class="ag-btn" data-upd="cancel" ${n ? "" : "disabled"}>${esc(this._t("cancel"))}</button>
      <button class="ag-btn primary" data-upd="save" ${n && !this.saving ? "" : "disabled"}>${ic("check", 18)}${esc(this._t("save"))}</button>`);
  }

  async save() {
    const d = this.draft;
    if (!d || this.saving) return;
    this.saving = true;
    this.renderFoot();
    try {
      // Automatisch installieren gilt nur mit der täglichen Prüfung: ohne sie wäre der Schalter wirkungslos, also auch aus
      const values = { ...d, auto_update: d.check && d.auto_update };
      this.v.data = await this.host._hass.callWS({ type: "alarmageddon/set_update", ...values });
      this.draft = null;
      this.saveState = "saved";
    } catch (err) {
      this.saveState = this._t("saveFailed", { message: errText(err) });
    } finally {
      this.saving = false;
      this.render();
      this.host._renderDots?.();
    }
  }

  // ----- Aktionen -----

  async action(name, el) {
    const v = this.v;
    if (name === "check") await this.load(true);
    else if (name === "notes") this.openNotes();
    else if (name === "hacs-device") {
      const id = el?.dataset.device;
      if (id) this.host._guard(() => this.host._navigate(`/config/devices/device/${id}`));
    } else if (name === "install") {
      const { hacs, a, canInstall } = this.state();
      if (!hacs || !canInstall || v.installing) return;
      v.installing = a.latest_version;
      v.installError = null;
      this.renderRow();
      try {
        await this.callService("update", "install", { entity_id: hacs.entity_id });
      } catch (err) {
        v.installError = errText(err);
      }
      v.installing = null;
      this.renderRow();
      this.host._renderDots?.();
    } else if (name === "restart") {
      // Eine Alarmanlage startet nie von selbst neu: nur auf ausdrücklichen Wunsch, mit Rückfrage
      if (!window.confirm(this._t("updRestartConfirm"))) return;
      v.restarting = true;
      v.restartError = null;
      v.restartFrom = this.state().installed;
      v.restartAt = Date.now();
      this.renderRow();
      try {
        await this.callService("homeassistant", "restart", {});
      } catch (err) {
        // Die Verbindung bricht beim Neustart ab: ein Verbindungsfehler ist normal; lehnt HA ab, steht der Fehler in der Zeile
        if (!isConnectionError(err)) {
          v.restarting = false;
          v.restartError = errText(err);
          this.renderRow();
        }
      }
    }
  }

  // ----- Release Notes -----

  _dlg() {
    return this.host._root.getElementById("ag-notes");
  }

  openNotes() {
    const s = this.state();
    const newer = Boolean(s.latest && s.installed && cmpVersion(s.latest, s.installed) > 0);
    const latest = bare(newer ? s.latest : s.installed);
    if (!latest) return;
    const n = (this.notes = {
      installed: newer ? bare(s.installed) : null,
      latest,
      current: !newer,
      url: newer ? s.url || null : `https://github.com/${REPO}/releases/tag/v${latest}`,
      loading: true, error: null, data: null,
    });
    this.renderNotes();
    const dlg = this._dlg();
    if (!dlg.open) dlg.showModal();
    dlg.scrollTop = 0;
    this.loadNotes(n);
  }

  async loadNotes(n, force = false) {
    try {
      const data = await this.host._hass.callWS({ type: "alarmageddon/release_notes", installed: n.installed || undefined, latest: n.latest, language: this.host._lang, force });
      if (this.notes !== n) return;
      n.data = data;
      n.error = data.error && !(data.entries || []).length ? data.error : null;
    } catch (err) {
      if (this.notes !== n) return;
      n.error = errText(err);
    }
    n.loading = false;
    this.renderNotes();
  }

  closeNotes() {
    this.notes = null;
    const dlg = this._dlg();
    if (dlg?.open) dlg.close();
  }

  renderNotes() {
    const n = this.notes;
    const dlg = this._dlg();
    if (!n || !dlg) return;
    const t = (k, vars) => this._t(k, vars);
    let body;
    if (n.loading) body = `<p class="ag-t2">${esc(t("notesLoading"))}</p>`;
    else if (n.error) {
      body = `<div class="ag-dlg-err">${esc(t("notesError"))} ${esc(n.error === "rate_limit" ? t("updRateLimit") : n.error)}</div>
        <div><button class="ag-btn" data-upd="notes-retry">${ic("refresh", 16)}${esc(t("notesRetry"))}</button></div>`;
    } else {
      const lang = this.host._lang;
      const note = n.data?.language && n.data.language !== lang ? `<div class="ag-t2 ag-small">${ic("info", 14)} ${esc(t("notesEnglishOnly"))}</div>` : "";
      body = note + (n.data?.entries || []).map((e) => {
        const ts = e.date && !Number.isNaN(Date.parse(e.date)) ? this.host._fmtDate?.(e.date) || e.date : "";
        return `<section class="ag-rn-entry"><h3><span>${esc(e.version)}</span>${ts ? `<small>${esc(ts)}</small>` : ""}</h3><div class="ag-rn">${markdownHtml(e.notes)}</div></section>`;
      }).join("");
    }
    const sub = n.current ? t("notesInstalled", { v: n.latest }) : n.installed ? `${n.installed} → ${n.latest}` : n.latest;
    this.host._setHtml(dlg, `<div class="ag-dlg-body ag-notes"><div class="ag-sys-top"><span class="ag-ver-ic">${ic("verUp", 22)}</span><div><h3>${esc(t("notesTitle"))}</h3><div class="ag-t2">${esc(sub)}</div></div></div>
      <div class="ag-rn-body">${body}</div>
      <div class="ag-dlg-btns">${n.url ? `<a class="ag-btn" href="${esc(n.url)}" target="_blank" rel="noopener">${esc(t("notesGithub"))}${ic("open", 15)}</a>` : ""}<button class="ag-btn primary" data-upd="notes-close">${esc(t("close"))}</button></div></div>`);
  }

  // ----- Ereignisse; true = erledigt -----

  onClick(el) {
    const act = el?.dataset.upd;
    if (!act) return false;
    if (act === "set") {
      const d = this.ensureDraft();
      if (!d) return true;
      d[el.dataset.key] = !d[el.dataset.key];
      this.saveState = null;
      this.renderSettings();
      this.renderFoot();
    } else if (act === "cancel") {
      this.reset();
      this.render();
    } else if (act === "save") this.save();
    else if (act === "notes-close") this.closeNotes();
    else if (act === "notes-retry" && this.notes) {
      this.notes.loading = true;
      this.notes.error = null;
      this.renderNotes();
      this.loadNotes(this.notes, true);
    } else this.action(act, el);
    return true;
  }
}
