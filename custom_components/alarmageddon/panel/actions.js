// Konfiguration › Aktionen: pro Anlage und Alarm (Modus Anwesend, Abwesend, Nacht, "immer aktiv") ein Ablauf als Zeitachse.
// Bausteine: Push-Meldung, Gerät schalten (mit dem, was das Gerät kann), Alarmton, Warten, Szene oder Skript, weitere Aktion
// (jeder Dienst von Home Assistant mit seinen Feldern, kein JSON). Gespeichert werden Schritte im Format des Servers
// (workflow.py); Entwurf mit "Speichern". Schritte lassen sich am Griff ziehen und einzeln testen.

const V = new URL(import.meta.url).search;
const { ic, esc, MODE_ICON, MODE_KEY, errText } = await import(`./common.js${V}`);

// ----- Geräte und ihre Aktionen (wie die Routinen in Device Panel): Domäne -> Aktion -> Dienst -----
const COMMON = { on: "turn_on", off: "turn_off", toggle: "toggle" };
const DEVICE = {
  switch: COMMON, light: COMMON, fan: COMMON, input_boolean: COMMON, siren: COMMON, humidifier: COMMON, climate: COMMON, media_player: COMMON,
  cover: { on: "open_cover", off: "close_cover", toggle: "toggle" },
  valve: { on: "open_valve", off: "close_valve", toggle: "toggle" },
  lock: { on: "lock", off: "unlock" },
};
const MIXED = { on: "turn_on", off: "turn_off", toggle: "toggle" }; // gemischte Geräte: homeassistant.turn_on usw.
const ACTION_LABEL = {
  cover: { on: "actOpen", off: "actClose", toggle: "actToggle" },
  valve: { on: "actOpen", off: "actClose", toggle: "actToggle" },
  lock: { on: "actLock", off: "actUnlock" },
};
const ACTION_ICON = { on: "power", off: "powerOff", toggle: "restore" };
const cap = (domain, action) => ACTION_LABEL[domain]?.[action] || { on: "actOn", off: "actOff", toggle: "actToggle" }[action];
const SOUND_LEN = { siren: 4, beep: 3, klaxon: 3, warning: 2, chime: 2 }; // Länge der Töne in Sekunden (wie der Server)
// Drei Arten von Tönen, jede mit eigenen Klängen (1.15.0): Alarmton, Voralarm, Aktivierungston
const SOUND_KEY = {
  siren: "sndSiren", beep: "sndBeep", klaxon: "sndKlaxon", hilo: "sndHilo", yelp: "sndYelp",
  chime: "sndChime", warning: "sndWarning", pre_beep: "sndPreBeep", pre_pulse: "sndPrePulse", pre_rising: "sndPreRising",
  tone_pip: "sndTonePip", tone_double: "sndToneDouble", tone_soft: "sndToneSoft", tone_bell: "sndToneBell", tone_rise: "sndToneRise", tone_confirm: "sndToneConfirm", tone_tick: "sndToneTick",
};
// Vergleich unabhängig von der Schreibweise (1.16.0): Der Server ergänzt beim Speichern Vorgaben und ordnet die Felder anders als das
// Panel. Mit einem Vergleich Zeichen für Zeichen galt ein eben gespeicherter Ablauf nach dem nächsten Laden als geändert ("3 Änderungen",
// obwohl nichts offen war). Verglichen wird darum, was das Panel aus beiden Seiten selbst schreiben würde, mit sortierten Feldern.
const stable = (v) => (Array.isArray(v) ? v.map(stable) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, stable(v[k])])) : v);
const canonStep = (step, zone) => {
  try {
    return stable(toStep(fromStep(step), zone));
  } catch (_err) {
    return stable(step);
  }
};
const canon = (list, zone = "main") => JSON.stringify((list || []).map((step) => canonStep(step, zone)));
const canonEnd = (end) => JSON.stringify(stable(normEnd(end)));
// Liste der Klänge in den Daten des Panels, je Schrittart
const TONE_LIST = { sound: "sounds", prealarm: "prealarms", chime: "chimes" };
const SCENE_DOMAINS = ["scene", "script"];

// Wartet der Ablauf auf das Ende dieses Schritts? Wie der Server (workflow.py step_waits): Schritte, die etwas ausführen (Gerät, Ton),
// laufen standardmässig weiter, der nächste startet sofort; nur mit "wait" wartet der Ablauf. Ältere Abläufe ohne "wait" warteten,
// ausser mit "detach". Ein Ton "bis zum Deaktivieren" (Dauer 0) endet nie von selbst: auf ihn lässt sich nicht warten.
const endless = (step) => step?.type === "sound" && step.duration === 0;
const waits = (step) => ["action", "sound", "chime", "prealarm"].includes(step?.type) && !endless(step) && ("wait" in step ? Boolean(step.wait) : step.type === "prealarm" || (step.type !== "chime" && !step.detach));
// Schritte, die nach dem Quittieren möglich sind (keine Alarmmeldung, kein Quittieren)
const AFTER_KINDS = ["device", "sound", "chime", "wait", "scene", "custom"];
// Schritte beim Scharfschalten (1.14.0): der Aktivierungston statt der Sirene, dazu Gerät, Warten, Szene und eigene Aktion
const ARMED_KINDS = ["chime", "device", "wait", "scene", "custom"];
// Alarmton und Aktivierungston teilen sich die Felder (Lautsprecher, Ton, Lautstärke, Dauer)
const isTone = (kind) => kind === "sound" || kind === "chime" || kind === "prealarm";
const isToneType = isTone; // die Schrittarten des Servers heissen gleich
// Lautstärke je Medienplayer (1.16.0): eigene Werte nur, wenn eingeschaltet, mehr als ein Lautsprecher gewählt ist und sie sich unterscheiden
const ownVolumes = (f) => {
  if (!f.setVolume || !f.perVolume || f.targets.length < 2) return null;
  const map = Object.fromEntries(f.targets.map((id) => [id, Number(f.volumes?.[id] ?? f.volume)]));
  return new Set(Object.values(map)).size > 1 ? map : null;
};
// Voralarm und Aktivierungston haben immer eine Dauer und stellen nichts zurück (anders als der Alarmton)
const isShortTone = (kind) => kind === "chime" || kind === "prealarm";
const ZONE_KEY = { main: "wf", after: "after", armed: "armed" };
const ZONE_CLASS = { main: ".ag-wf-main", after: ".ag-wf-after", armed: ".ag-wf-armed" };

export const KINDS = [
  { kind: "notify", icon: "bell", label: "stepNotify", hint: "stepNotifyHint" },
  { kind: "device", icon: "power", label: "stepDevice", hint: "stepDeviceHint" },
  { kind: "sound", icon: "speaker", label: "stepSound", hint: "stepSoundHint" },
  { kind: "prealarm", icon: "tone", label: "stepPrealarm", hint: "stepPrealarmHint" },
  { kind: "chime", icon: "note", label: "stepChime", hint: "stepChimeHint" },
  { kind: "wait", icon: "timer", label: "stepWait", hint: "stepWaitHint" },
  { kind: "acknowledge", icon: "check", label: "stepAck", hint: "stepAckHint" },
  { kind: "scene", icon: "script", label: "stepScene", hint: "stepSceneHint" },
  { kind: "custom", icon: "cog", label: "stepCustom", hint: "stepCustomHint" },
];

const OPTION_KEYS = { light: ["brightness_pct", "color_temp_kelvin"], cover: ["position"], climate: ["temperature", "hvac_mode"], fan: ["percentage"] };

// "Alarm endet": nur die optionale eigene Meldung; ob Geräte zurückkehren, entscheidet allein der Schritt ("Rückgängig")
export function normEnd(value) {
  const v = value && typeof value === "object" ? value : {};
  const out = {};
  if (v.notify?.enabled) out.notify = { enabled: true, title: v.notify.title || "", message: v.notify.message || "", critical: v.notify.critical ?? null, volume: v.notify.volume ?? null, click: v.notify.click || "log", click_path: v.notify.click_path || "", ...(v.notify.targets?.length ? { targets: [...v.notify.targets] } : {}) };
  return out;
}

// ----- Schritt des Servers <-> Formular -----

const blank = () => ({ kind: "custom", targets: [], ntTargets: null, restore: false, seconds: 30, wait: false, ntTitle: "", ntMessage: "", ntCritical: null, ntVolume: null, ntButtons: {}, ntClick: null, ntClickPath: "", until: false, playSeconds: 30, sound: "siren", setVolume: true, volume: 0.7, repeat: 3, action: "on", opts: {}, optsOn: {}, domain: "", service: "", data: {}, extra: {} });

export function fromStep(step) {
  return { ...fromStepBase(step), wait: waits(step) };
}

function fromStepBase(step) {
  const f = blank();
  if (step.type === "notify") return { ...f, kind: "notify", ntTitle: step.title || "", ntMessage: step.message || "", ntCritical: step.critical ?? null, ntVolume: step.volume ?? null, ntButtons: { ...(step.buttons || {}) }, ntClick: step.click ?? null, ntClickPath: step.click_path || "", ntTargets: step.targets?.length ? [...step.targets] : null };
  if (step.type === "wait") return { ...f, kind: "wait", seconds: step.seconds };
  if (step.type === "acknowledge") return { ...f, kind: "acknowledge" };
  if (isToneType(step.type)) Object.assign(f, { perVolume: Object.keys(step.volumes || {}).length > 0, volumes: { ...(step.volumes || {}) } });
  if (step.type === "chime") {
    return { ...f, kind: "chime", targets: [...(step.players || [])], sound: step.sound || "tone_pip", setVolume: step.volume != null, volume: step.volume ?? 0.5, until: false, playSeconds: step.duration || 3, restore: false };
  }
  if (step.type === "prealarm") {
    return { ...f, kind: "prealarm", targets: [...(step.players || [])], sound: step.sound || "pre_beep", setVolume: step.volume != null, volume: step.volume ?? 0.3, until: false, playSeconds: step.duration || 20, restore: false };
  }
  if (step.type === "sound") {
    return { ...f, kind: "sound", targets: [...step.players], sound: step.sound, setVolume: step.volume != null, volume: step.volume ?? 0.7, repeat: step.repeat || 1, until: step.duration === 0, playSeconds: step.duration ? step.duration : Math.max(5, (step.repeat || 1) * (SOUND_LEN[step.sound] || 4)), restore: step.restore !== false };
  }
  const action = String(step.action || "");
  const [domain, service] = action.split(".");
  const data = { ...(step.data || {}) };
  const keys = Object.keys(data);
  const base = { ...f, targets: [...(step.target || [])], restore: !!step.restore, domain, service };
  if ((action === "scene.turn_on" || action === "script.turn_on") && !keys.length) return { ...base, kind: "scene" };
  const act = DEVICE[domain] && Object.keys(DEVICE[domain]).find((a) => DEVICE[domain][a] === service);
  if (act && !keys.length) return { ...base, kind: "device", action: act };
  const mixed = domain === "homeassistant" && Object.keys(MIXED).find((a) => MIXED[a] === service);
  if (mixed && !keys.length) return { ...base, kind: "device", action: mixed };
  // Einstellungen, die ein Gerät kann (ein Dienstaufruf genügt)
  const only = (allowed) => keys.length > 0 && keys.every((k) => allowed.includes(k));
  const withOpts = (optData) => ({ ...base, kind: "device", action: "on", opts: optData, optsOn: Object.fromEntries(Object.keys(optData).map((k) => [k, true])) });
  if (domain === "light" && service === "turn_on" && only(OPTION_KEYS.light)) return withOpts(data);
  if (domain === "fan" && service === "turn_on" && only(OPTION_KEYS.fan)) return withOpts(data);
  if (domain === "cover" && service === "set_cover_position" && only(["position"])) return withOpts(data);
  if (domain === "climate" && service === "set_temperature" && only(["temperature", "hvac_mode"])) return withOpts(data);
  return { ...base, kind: "custom", data };
}

export function toStep(f, zone = "main") {
  const step = toStepBase(f);
  const volumes = isTone(f.kind) ? ownVolumes(f) : null;
  if (volumes) step.volumes = volumes;
  // Schritte, die etwas ausführen, laufen standardmässig weiter; "wait" hält den nächsten Schritt zurück, bis dieser fertig ist
  // (nie bei einem Ton bis zum Deaktivieren). Das Panel schreibt die Angabe immer mit: so ist ein neuer Schritt von einem älteren
  // ohne Angabe (der wartete) zu unterscheiden.
  if (step.type === "action" || step.type === "sound" || step.type === "chime" || step.type === "prealarm") step.wait = Boolean(f.wait) && !(f.kind === "sound" && f.until);
  if (zone !== "main") {
    // Nach dem Quittieren: nichts kehrt mehr zurück, und ein Ton braucht eine Dauer (niemand deaktiviert danach)
    if ("restore" in step) step.restore = false;
    if (step.type === "sound" && step.duration === 0) step.duration = Math.min(3600, Math.max(1, Math.round(Number(f.playSeconds) || 30)));
  }
  return step;
}

// Leer = Standardtext des Servers (folgt der Sprache); der Editor zeigt den Standard, speichert ihn aber nicht
export const NOTIFY_TOKENS = ["{name}", "{sensor}", "{time}", "{mode}"];

function toStepBase(f) {
  if (f.kind === "notify") {
    const out = { type: "notify" };
    const title = String(f.ntTitle || "").trim();
    const message = String(f.ntMessage || "").trim();
    if (title) out.title = title;
    if (message) out.message = message;
    if (f.ntCritical !== null && f.ntCritical !== undefined) out.critical = !!f.ntCritical;
    if (f.ntVolume !== null && f.ntVolume !== undefined) out.volume = Math.min(1, Math.max(0, Number(f.ntVolume)));
    if (Object.keys(f.ntButtons || {}).length) out.buttons = { ...f.ntButtons };
    // Eigene Empfänger nur mit mindestens einem Eintrag; ohne gelten die Alarm-Empfänger der Konfiguration
    if (f.ntTargets?.length) out.targets = [...f.ntTargets];
    if (f.ntClick) {
      out.click = f.ntClick;
      if (f.ntClick === "custom") out.click_path = String(f.ntClickPath || "").trim();
    }
    return out;
  }
  if (f.kind === "acknowledge") return { type: "acknowledge" };
  if (f.kind === "wait") return { type: "wait", seconds: Math.max(0, Math.round(Number(f.seconds) || 0)) };
  if (f.kind === "prealarm") {
    return { type: "prealarm", players: f.targets, sound: f.sound, volume: f.setVolume ? Number(f.volume) : null, duration: Math.min(600, Math.max(1, Math.round(Number(f.playSeconds) || 20))) };
  }
  if (f.kind === "chime") {
    return { type: "chime", players: f.targets, sound: f.sound, volume: f.setVolume ? Number(f.volume) : null, duration: Math.min(300, Math.max(1, Math.round(Number(f.playSeconds) || 3))) };
  }
  if (f.kind === "sound") {
    return { type: "sound", players: f.targets, sound: f.sound, volume: f.setVolume ? Number(f.volume) : null, duration: f.until ? 0 : Math.min(3600, Math.max(1, Math.round(Number(f.playSeconds) || 1))), restore: !!f.restore };
  }
  if (f.kind === "scene") return { type: "action", action: `${f.targets[0].split(".")[0]}.turn_on`, target: [f.targets[0]], data: {}, restore: false };
  if (f.kind === "device") {
    const domains = [...new Set(f.targets.map((e) => e.split(".")[0]))];
    const single = domains.length === 1 ? domains[0] : null;
    let action = single ? `${single}.${DEVICE[single][f.action]}` : `homeassistant.${MIXED[f.action]}`;
    const data = {};
    if (single && f.action === "on") {
      const on = (k) => f.optsOn[k] && f.opts[k] != null && f.opts[k] !== "";
      if (single === "cover" && on("position")) action = "cover.set_cover_position";
      if (single === "climate" && (on("temperature") || on("hvac_mode"))) action = "climate.set_temperature";
      for (const k of OPTION_KEYS[single] || []) if (on(k)) data[k] = f.opts[k];
    }
    return { type: "action", action, target: f.targets, data, restore: !!f.restore };
  }
  // Weitere Aktion: nur Werte der Felder, die ausgefüllt sind; unbekannte Werte aus einem früheren Schritt bleiben erhalten
  const data = {};
  for (const [k, v] of Object.entries({ ...f.extra, ...f.data })) if (v !== "" && v != null && !(typeof v === "number" && Number.isNaN(v))) data[k] = v;
  return { type: "action", action: `${f.domain}.${f.service}`, target: f.targets, data, restore: !!f.restore };
}

// ----- Was ein Gerät kann, aus seinem Zustand -----

function deviceOptions(states, targets) {
  const domains = [...new Set(targets.map((e) => e.split(".")[0]))];
  if (domains.length !== 1 || !OPTION_KEYS[domains[0]]) return [];
  const domain = domains[0];
  const sts = targets.map((e) => states[e]).filter(Boolean);
  if (!sts.length || sts.some((s) => s.state === "unavailable")) return [];
  const all = (fn) => sts.every(fn);
  const feats = (s) => Number(s.attributes?.supported_features) || 0;
  const out = [];
  if (domain === "light") {
    const modes = (s) => s.attributes?.supported_color_modes || [];
    if (all((s) => modes(s).some((m) => m !== "onoff"))) out.push({ key: "brightness_pct", type: "percent", label: "optBrightness", min: 1, max: 100 });
    if (all((s) => modes(s).includes("color_temp"))) {
      const lo = Math.max(...sts.map((s) => Number(s.attributes.min_color_temp_kelvin) || 2000));
      const hi = Math.min(...sts.map((s) => Number(s.attributes.max_color_temp_kelvin) || 6500));
      out.push({ key: "color_temp_kelvin", type: "kelvin", label: "optColorTemp", min: lo, max: Math.max(lo, hi), step: 100 });
    }
  } else if (domain === "cover") {
    if (all((s) => feats(s) & 4)) out.push({ key: "position", type: "percent", label: "optPosition", min: 0, max: 100 });
  } else if (domain === "fan") {
    if (all((s) => feats(s) & 1)) out.push({ key: "percentage", type: "percent", label: "optPercentage", min: 1, max: 100 });
  } else if (domain === "climate") {
    if (all((s) => feats(s) & 1)) {
      const lo = Math.max(...sts.map((s) => Number(s.attributes.min_temp) || 7));
      const hi = Math.min(...sts.map((s) => Number(s.attributes.max_temp) || 35));
      out.push({ key: "temperature", type: "temperature", label: "optTemperature", min: lo, max: Math.max(lo, hi), step: Number(sts[0].attributes.target_temp_step) || 0.5 });
    }
    const modes = (sts[0].attributes.hvac_modes || []).filter((m) => sts.every((s) => (s.attributes.hvac_modes || []).includes(m)) && m !== "off");
    if (modes.length) out.push({ key: "hvac_mode", type: "choice", label: "optHvac", values: modes });
  }
  return out;
}

// ----- Felder eines Dienstes von Home Assistant (hass.services) -----

function flatFields(fields, out = {}) {
  for (const [key, value] of Object.entries(fields || {})) {
    if (value && value.selector) out[key] = value;
    else if (value && value.fields) flatFields(value.fields, out);
    else if (value) out[key] = value;
  }
  return out;
}

const selectorType = (field) => Object.keys(field?.selector || {})[0] || "text";
const SIMPLE_SELECTORS = ["boolean", "number", "select", "text", "entity", "color_temp", "duration", "time", "date", "datetime", "icon", "url"];
const normalizeOptions = (opts) => (opts || []).map((o) => (typeof o === "object" ? { value: String(o.value), label: o.label || String(o.value) } : { value: String(o), label: String(o) }));

export class ActionsUi {
  constructor(host) {
    this.host = host;
    this.trigger = host._loadPref("trigger", "away");
    this.draft = null;
    this.saveState = null;
    this.saving = false;
    this.edit = null; // { index, insert, form, q, error, open }
    this.drag = null;
    this.previewing = null; // URL des Tons, der gerade auf diesem Gerät läuft
    this._comboPointer = false;
  }

  _t(key, vars) {
    return this.host._t(key, vars);
  }

  get system() {
    return this.host._system();
  }

  triggers(s = this.system) {
    // "Immer aktiv" nur, solange es an ist (Anlage › Modi); der gespeicherte Ablauf bleibt erhalten (der Server behält fehlende Auslöser)
    return [...(s?.modes || ["home", "away"]), ...(s?.always_enabled === false ? [] : ["always"])];
  }

  ensureDraft() {
    const s = this.system;
    if (!s) return null;
    if (!this.draft || this.draft.entry !== s.entry_id) {
      const wf = JSON.parse(JSON.stringify(s.workflows || {}));
      const end = { ...(s.workflow_end || {}) };
      const after = JSON.parse(JSON.stringify(s.workflows_after || {})); // Aktionen nach dem Quittieren, je Auslöser wie wf
      const armed = JSON.parse(JSON.stringify(s.workflows_armed || {})); // Aktionen beim Scharfschalten, je Modus (nicht für "Immer aktiv")
      // Ohne gespeicherte Wahl: an, wenn sich die Abläufe der Modi (oder "Immer aktiv") unterscheiden
      const keys = this.triggers(s);
      const modes = keys.filter((t) => t !== "always");
      const sig = (t) => [canon(wf[t]), canonEnd(end[t]), canon(after[t], "after")].join("|");
      const sigArmed = (t) => canon(armed[t], "armed");
      this.draft = { entry: s.entry_id, wf, end, after, armed, perMode: keys.some((t) => sig(t) !== sig(keys[0])) || modes.some((t) => sigArmed(t) !== sigArmed(modes[0])) };
    }
    if (!this.triggers(s).includes(this.trigger)) this.trigger = "away";
    // Schalter aus: ein Ablauf für alles, bearbeitet wird der des ersten Reiters
    if (!this.draft.perMode) this.trigger = this.triggers(s)[0];
    return this.draft;
  }

  // Der Stand, der gespeichert würde: ohne "Einstellungen pro Modus" gilt der erste Ablauf für alle Modi und "Immer aktiv"
  _effective(d, s = this.system) {
    if (d.perMode) return { wf: d.wf, end: d.end || {}, after: d.after || {}, armed: d.armed || {} };
    const keys = this.triggers(s);
    const wf = {};
    const end = {};
    const after = {};
    const armed = {};
    for (const t of keys) {
      wf[t] = JSON.parse(JSON.stringify(d.wf[keys[0]] || []));
      end[t] = JSON.parse(JSON.stringify(normEnd(d.end?.[keys[0]])));
      after[t] = JSON.parse(JSON.stringify(d.after?.[keys[0]] || []));
      if (t !== "always") armed[t] = JSON.parse(JSON.stringify(d.armed?.[keys[0]] || []));
    }
    return { wf, end, after, armed };
  }

  reset() {
    this.draft = null;
    this.saveState = null;
    this.edit = null;
  }

  // Schritte des gewählten Auslösers: der Ablauf beim Alarm ("main"), die Aktionen nach dem Quittieren ("after") oder die beim
  // Scharfschalten ("armed")
  steps(zone = "main") {
    return this.ensureDraft()?.[ZONE_KEY[zone] || "wf"]?.[this.trigger] || [];
  }

  _setSteps(list, zone = "main") {
    const d = this.ensureDraft();
    const key = ZONE_KEY[zone] || "wf";
    d[key] = { ...(d[key] || {}), [this.trigger]: list };
  }

  // Reiter (Auslöser) mit ungespeicherten Änderungen (für den Punkt am Reiter)
  dirtyTabs() {
    const s = this.system;
    const d = this.draft;
    if (!s || !d || d.entry !== s.entry_id) return [];
    const eff = this._effective(d, s);
    const all = new Set([...Object.keys(s.workflows || {}), ...Object.keys(eff.wf), ...Object.keys(s.workflows_after || {}), ...Object.keys(eff.after || {})]);
    return [...all].filter((k) => canon((s.workflows || {})[k]) !== canon(eff.wf[k]) || canonEnd((s.workflow_end || {})[k]) !== canonEnd((eff.end || {})[k]) || canon((s.workflows_after || {})[k], "after") !== canon((eff.after || {})[k], "after") || canon((s.workflows_armed || {})[k], "armed") !== canon((eff.armed || {})[k], "armed"))
      .map((k) => ["data-trigger", k]);
  }

  dirtyCount() {
    const s = this.system;
    const d = this.draft;
    if (!s || !d || d.entry !== s.entry_id) return 0;
    const eff = this._effective(d, s);
    const all = new Set([...Object.keys(s.workflows || {}), ...Object.keys(eff.wf), ...Object.keys(s.workflows_after || {}), ...Object.keys(eff.after || {})]);
    let n = 0;
    for (const k of all) {
      if (canon((s.workflows || {})[k]) !== canon(eff.wf[k]) || canonEnd((s.workflow_end || {})[k]) !== canonEnd((eff.end || {})[k]) || canon((s.workflows_after || {})[k], "after") !== canon((eff.after || {})[k], "after") || canon((s.workflows_armed || {})[k], "armed") !== canon((eff.armed || {})[k], "armed")) n += 1;
    }
    return n;
  }

  html() {
    return `<div class="ag-wf-head"></div><div class="ag-wf"></div><div class="ag-foot"></div>`;
  }

  render() {
    const h = this.host;
    this.loadTranslations();
    const head = h._view?.querySelector(".ag-wf-head");
    const body = h._view?.querySelector(".ag-wf");
    const s = this.system;
    if (!head || !body || !this.ensureDraft()) return;
    const triggers = this.triggers(s).map((t) => [t, t === "always" ? this._t("wfAlways") : this._t(MODE_KEY[t]), t === "always" ? "flash" : MODE_ICON[t]]);
    const running = s.workflow_running;
    const status = running ? `<span class="ag-tag ${s.workflow_test ? "warn" : "err"}">${esc(this._t(s.workflow_test ? "wfTestRunning" : "wfAlarmRunning"))}</span>` : "";
    const d = this.draft;
    const tabs = d.perMode ? h._segHtml("wf-trigger", triggers, this.trigger, "data-trigger", "small") : "";
    const scope = d.perMode ? `<div class="ag-pmscope" style="margin:0">${ic(this.trigger === "always" ? "flash" : MODE_ICON[this.trigger], 18)}${esc(this._t(this.trigger === "always" ? "pmScopeAlways" : "pmScope", { mode: this._t(MODE_KEY[this.trigger] || "wfAlways") }))}</div>` : "";
    h._setHtml(head, `<div class="ag-tools"><div class="ag-pmbar" style="flex:1;margin:0"><div class="ag-pmsw"><button class="ag-toggle ${d.perMode ? "on" : ""}" data-wf="permode" role="switch" aria-checked="${d.perMode}" aria-label="${esc(this._t("wfPerMode"))}"></button>
        <div class="ag-settx"><b>${esc(this._t("wfPerMode"))}</b><small>${esc(this._t(d.perMode ? "wfPerModeOn" : "wfPerModeHint"))}</small></div></div>${tabs}${scope}</div>${status}</div>
      ${this.trigger === "always" && d.perMode ? `<div class="ag-t2 ag-small" style="margin:-6px 4px 0">${esc(this._t("wfAlwaysHint"))}</div>` : ""}`);
    const steps = this.steps();
    // Jede Verbindung zeichnet ihre Linie selbst (zwei Stücke über und unter dem Plus): so liegt sie nie über einem Symbol. Alle
    // Verbindungen sehen gleich aus; ob ein Schritt den nächsten aufhält, sagt die Pille "Wartet …" auf dem Schritt.
    const plus = (i) => `<div class="ag-wf-plus"><span class="ag-wf-seg"></span><button class="ag-wf-add" data-wf="add" data-at="${i}" aria-label="${esc(this._t("wfAdd"))}">${ic("plus", 18)}</button><span class="ag-wf-seg"></span></div>`;
    const cards = steps.map((step, i) => this._card(step, i, running)).map((c, i) => c + plus(i + 1)).join("");
    h._setHtml(body, `${this._armedHtml(running)}<div class="ag-wf-line ag-wf-main">
        <div class="ag-wf-start"><span class="ag-mini err alarm">${ic("alert", 20)}</span>${esc(this._t("wfStart"))}</div>${plus(0)}
        ${steps.length ? cards : `<div class="ag-card ag-empty ag-wf-empty"><span class="ag-t2">${esc(this._t("wfEmpty"))}</span><button class="ag-btn primary" data-wf="add" data-at="0">${ic("plus", 18)}${esc(this._t("wfAdd"))}</button></div>`}
      </div>${this._endHtml()}${this._afterHtml(running)}`);
    h._placePills();
    this.renderFoot();
  }

  // Festes Ende des Ablaufs: "Alarm endet" (Deaktivieren/Quittieren); alle Einstellungen im Fenster wie bei den Schritten
  _endHtml() {
    const e = normEnd(this.draft?.end?.[this.trigger]);
    return `<div class="ag-wf-end"><div class="ag-wf-start"><span class="ag-mini ok ag-end-ic">${ic("check", 20)}</span>${esc(this._t("wfEnd"))}</div>
      <div class="ag-card ag-wf-endcard"><span class="ag-wf-icon k-end">${ic("bell", 20)}</span><div class="ag-wf-text"><b>${esc(this._t(e.notify ? "wfEndOwn" : "wfEndDefault"))}</b><small class="ag-t2 ag-small">${esc(this._t(e.notify ? "wfEndOwnHint" : "wfEndDefaultHint"))}</small></div>
        <div class="ag-wf-btns"><button class="ag-iconbtn" data-wf="end-edit" aria-label="${esc(this._t("wfEndEdit"))}" title="${esc(this._t("wfEndEdit"))}">${ic("pencil", 18)}</button></div></div></div>`;
  }

  // Aktionen beim Scharfschalten (1.14.0): ganz oben der feste Punkt "Anlage scharf geschaltet" mit einer eigenen Liste, zum Beispiel
  // für den Aktivierungston. Je Modus wie die Alarmaktionen; im Reiter "Immer aktiv" gibt es ihn nicht (dort wird nie scharf geschaltet).
  _armedHtml(running) {
    if (this.trigger === "always") return "";
    const steps = this.steps("armed");
    const plus = (i) => `<div class="ag-wf-plus ${i === steps.length ? "last" : ""}"><span class="ag-wf-seg"></span><button class="ag-wf-add" data-wf="add" data-at="${i}" aria-label="${esc(this._t("wfArmedAdd"))}" title="${esc(this._t("wfArmedAdd"))}">${ic("plus", 18)}</button><span class="ag-wf-seg"></span>${i === steps.length ? `<small class="ag-wf-plushint ag-t2 ag-small">${esc(this._t(steps.length ? "wfArmedMore" : "wfArmedHint"))}</small>` : ""}</div>`;
    return `<div class="ag-wf-line ag-wf-armed" data-zone="armed"><div class="ag-wf-start"><span class="ag-mini arm">${ic("shield", 20)}</span>${esc(this._t("wfArmed"))}</div>${plus(0)}${steps.map((step, i) => this._card(step, i, running, "armed") + plus(i + 1)).join("")}</div>`;
  }

  // Aktionen nach dem Quittieren: eigene Liste hinter "Alarm endet", mit denselben Karten und demselben Plus wie oben. Möglich sind
  // Gerät, Ton (mit Dauer), Warten, Szene und eigene Aktion; "Rückgängig" gibt es hier nicht (danach folgt nichts mehr).
  _afterHtml(running) {
    const steps = this.steps("after");
    const plus = (i) => `<div class="ag-wf-plus ${i === steps.length ? "last" : ""}"><span class="ag-wf-seg"></span><button class="ag-wf-add" data-wf="add" data-at="${i}" aria-label="${esc(this._t("wfAfterAdd"))}" title="${esc(this._t("wfAfterAdd"))}">${ic("plus", 18)}</button><span class="ag-wf-seg"></span>${i === steps.length ? `<small class="ag-wf-plushint ag-t2 ag-small">${esc(this._t(steps.length ? "wfAfterMore" : "wfAfterHint"))}</small>` : ""}</div>`;
    return `<div class="ag-wf-line ag-wf-after" data-zone="after">${plus(0)}${steps.map((step, i) => this._card(step, i, running, "after") + plus(i + 1)).join("")}</div>`;
  }

  // Fenster "Alarm endet": Wahl beim Deaktivieren und optionale eigene Push-Meldung mit allen Optionen
  openEndEditor() {
    const e = normEnd(this.ensureDraft().end?.[this.trigger]);
    const n = e.notify || {};
    const form = { ...blank(), kind: "end", endNotify: !!e.notify, ntTitle: n.title || "", ntMessage: n.message || "", ntCritical: n.critical ?? null, ntVolume: n.volume ?? null,
      ntClick: n.click && n.click !== "log" ? n.click : null, ntClickPath: n.click_path || "", ntTargets: n.targets?.length ? [...n.targets] : null };
    this.edit = { index: null, insert: null, end: true, form, q: "", error: "", open: false };
    this.renderEditor();
    this._dlg().showModal();
  }

  _endFields(f) {
    const send = this._sec("wfEndSend", `<div class="ag-ef-row"><div class="ag-settx"><b>${esc(this._t("wfEndSend"))}</b><small>${esc(this._t("wfEndSendHint"))}</small></div>${this._toggle('data-wf="end-notify"', f.endNotify, "wfEndSend")}</div>`);
    return send + (f.endNotify ? `${this._notifyFields(f)}<div><button type="button" class="ag-btn" data-wf="end-test">${ic("play", 16)}${esc(this._t("wfEndTest"))}</button></div>` : "");
  }

  _endApply() {
    const f = this.edit.form;
    if (f.endNotify && f.ntClick === "custom" && !/^\/[^\s]*$/.test(String(f.ntClickPath || "").trim())) return this._editError("fldNtPathBad");
    const d = this.ensureDraft();
    d.end = { ...(d.end || {}), [this.trigger]: normEnd({ notify: f.endNotify ? { enabled: true, title: String(f.ntTitle || "").trim(), message: String(f.ntMessage || "").trim(), critical: f.ntCritical, volume: f.ntVolume, click: f.ntClick || "log", click_path: f.ntClick === "custom" ? String(f.ntClickPath || "").trim() : "", targets: f.ntTargets?.length ? f.ntTargets : undefined } : null }) };
    this.saveState = null;
    this.edit = null;
    this._dlg().close();
    this.render();
    this.host._renderDots();
  }

  // Meldung aus dem Fenster (auch ungespeichert) als Test an die Alarm-Empfänger
  async _endTest() {
    const f = this.edit.form;
    const n = { enabled: true, title: String(f.ntTitle || "").trim(), message: String(f.ntMessage || "").trim() };
    if (f.ntCritical !== null) n.critical = !!f.ntCritical;
    if (f.ntVolume !== null) n.volume = Math.min(1, Math.max(0, Number(f.ntVolume)));
    n.click = f.ntClick || "log";
    if (f.ntTargets?.length) n.targets = [...f.ntTargets];
    if (n.click === "custom") n.click_path = String(f.ntClickPath || "").trim();
    try {
      await this.host._hass.callWS({ type: "alarmageddon/test_end_notify", entry_id: this.system.entry_id, notify: n });
      this.host._toast(this._t("wfEndTested"));
    } catch (err) {
      this._editError(null, this._t("saveFailed", { message: errText(err) }));
    }
  }

  // Kurzfassung eines Schritts für die Karte
  _summary(f) {
    const text = this._summaryBase(f);
    return text;
  }

  _summaryBase(f) {
    const names = f.targets.map((id) => this.host._name(id)).join(", ") || this._t("stepNoTargets");
    if (f.kind === "notify") return f.ntTitle || f.ntMessage ? [f.ntTitle, f.ntMessage].filter(Boolean).join(" – ") : this._t("stepNotifyHint");
    if (f.kind === "acknowledge") return this._t("stepAckHint");
    if (f.kind === "wait") return this._t("stepWaitSummary", { seconds: f.seconds });
    if (isTone(f.kind)) return `${this._t(SOUND_KEY[f.sound] || "sndSiren")} · ${names}${f.setVolume ? ` · ${this._volumeText(f)}` : ""} · ${f.until ? this._t("fldPlayUntilShort") : this._t("durS", { n: f.playSeconds })}`;
    if (f.kind === "scene") return names;
    if (f.kind === "device") {
      const domains = new Set(f.targets.map((e) => e.split(".")[0]));
      const word = this._t(cap(domains.size === 1 ? [...domains][0] : "", f.action));
      const opts = Object.entries(f.optsOn).filter(([, on]) => on).map(([k]) => this._optText(k, f.opts[k])).filter(Boolean);
      return [word, names, ...opts].join(" · ");
    }
    return `${this._serviceName(f.domain, f.service)} · ${names}`;
  }

  _optText(key, value) {
    if (value == null || value === "") return "";
    if (key === "brightness_pct" || key === "position" || key === "percentage") return `${value} %`;
    if (key === "color_temp_kelvin") return `${value} K`;
    if (key === "temperature") return `${value} °`;
    return String(value);
  }

  _card(step, i, running, zone = "main") {
    const f = fromStep(step);
    const k = KINDS.find((x) => x.kind === f.kind);
    const restore = zone === "main" && (f.kind === "sound" || f.restore) && f.kind !== "notify" && f.kind !== "wait" && f.kind !== "acknowledge" ? `<span class="ag-tag none" title="${esc(this._t("wfRestoreMark"))}">${ic("restore", 12)}</span>` : "";
    const title = f.kind === "custom" ? this._serviceName(f.domain, f.service) : this._t(k.label);
    return `<div class="ag-card ag-wf-step" data-index="${i}">
      <button class="ag-handle" data-wf="grab" data-index="${i}" aria-label="${esc(this._t("stepGrab"))}" title="${esc(this._t("stepGrab"))}">${ic("grip", 20)}</button>
      <span class="ag-wf-icon k-${f.kind}">${ic(k.icon, 20)}</span>
      <div class="ag-wf-text"><b>${esc(title)}</b> ${restore}<div class="ag-t2 ag-small">${esc(this._summary(f))}</div>${this._waitPill(f)}</div>
      <div class="ag-wf-btns"><button class="ag-iconbtn" data-wf="test-step" data-index="${i}" ${running ? "disabled" : ""} aria-label="${esc(this._t("stepTest"))}" title="${esc(running ? this._t("stepTestBusy") : this._t("stepTest"))}">${ic("play", 18)}</button>
        <button class="ag-iconbtn" data-wf="edit" data-index="${i}" aria-label="${esc(this._t("stepEdit"))}">${ic("pencil", 18)}</button>
        <button class="ag-iconbtn" data-wf="delete" data-index="${i}" aria-label="${esc(this._t("stepDelete"))}">${ic("trash", 18)}</button></div></div>`;
  }

  // "70 %" oder, mit eigenen Werten je Medienplayer, die Spanne "30–70 %"
  _volumeText(f) {
    const own = ownVolumes(f);
    if (!own) return `${Math.round(f.volume * 100)} %`;
    const values = Object.values(own).map((v) => Math.round(v * 100));
    return `${Math.min(...values)}–${Math.max(...values)} %`;
  }

  // Pille auf dem Schritt, wenn der Ablauf auf sein Ende wartet (die Ausnahme; standardmässig läuft alles weiter). Eingestellt wird
  // das im Fenster des Schritts.
  _waitPill(f) {
    if (!f.wait || !["device", "sound", "chime", "prealarm", "scene", "custom"].includes(f.kind) || (f.kind === "sound" && f.until)) return "";
    return `<span class="ag-waitpill">${ic("timer", 14)}<span>${esc(this._t("wfWaits"))}</span></span>`;
  }

  // "Testen" steht unten bei den anderen Knöpfen (auf dem Handy nur das Symbol, damit alle drei Platz haben)
  _testBtnHtml(dirty) {
    const s = this.system;
    const running = s?.workflow_running;
    const label = this._t(running && s.workflow_test ? "wfTestStop" : "wfTest");
    const text = this.host.hasAttribute("narrow") ? "" : esc(label);
    if (running && s.workflow_test) return `<button class="ag-btn" data-wf="test-stop" aria-label="${esc(label)}">${ic("stop", 18)}${text}</button>`;
    return `<button class="ag-btn" data-wf="test" aria-label="${esc(label)}" ${dirty || running || !this.steps().length ? "disabled" : ""} title="${esc(dirty ? this._t("wfSaveFirst") : this._t("wfTestHint"))}">${ic("play", 18)}${text}</button>`;
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
    // "Aktionen übernehmen von": nur mit "Einstellungen pro Modus" (sonst gilt ohnehin ein Ablauf für alle)
    const others = this.draft?.perMode ? this.triggers().filter((t) => t !== this.trigger) : [];
    const name = (t) => (t === "always" ? this._t("wfAlways") : this._t(MODE_KEY[t]));
    const copy = others.length
      ? `<select class="ag-input ag-copyfrom" data-wf="copy-from" aria-label="${esc(this._t("wfCopyFrom"))}"><option value="">${esc(this._t("wfCopyFrom"))}</option>${others.map((t) => `<option value="${t}">${esc(name(t))}</option>`).join("")}</select>`
      : "";
    h._setHtml(foot, `${status}<span class="ag-grow"></span>${copy}${this._testBtnHtml(n > 0)}<button class="ag-btn" data-wf="cancel" ${n ? "" : "disabled"}>${esc(this._t("cancel"))}</button>
      <button class="ag-btn primary" data-wf="save" ${n && !this.saving ? "" : "disabled"}>${ic("check", 18)}${esc(this._t("save"))}</button>`);
  }

  // ----- Hilfen für den Editor -----

  get states() {
    return this.host._hass?.states || {};
  }

  _services() {
    return this.host._hass?.services || {};
  }

  // Übersetzungen der Dienste: HA liefert in hass.services nur Rohdaten; Namen, Beschreibungen und Feldnamen holt das Panel
  // wie die HA-Oberfläche über frontend/get_translations (einmal je Sprache, danach im Speicher)
  async loadTranslations() {
    const lang = this.host._hass?.locale?.language || this.host._lang;
    if (this._trLang === lang || this._trLoading) return;
    this._trLoading = true;
    const res = {};
    try {
      for (const category of ["services", "title", "entity_component", "selector"]) {
        const out = await this.host._hass.callWS({ type: "frontend/get_translations", language: lang, category });
        Object.assign(res, out?.resources || {});
      }
      this.tr = res;
      this._trLang = lang;
      if (this.host._tab === "config" && this.host._sub === "actions") {
        this.render();
        if (this.edit?.form && this._dlg()?.open) this.renderEditor();
      }
    } catch {
      this._trLang = lang; // ohne Übersetzungen bleibt es bei den Namen von HA; nicht dauernd neu versuchen
    } finally {
      this._trLoading = false;
    }
  }

  _tr(key) {
    return this.tr?.[key] || this.host._hass?.localize?.(key) || "";
  }

  // "set_cover_position" -> "Set cover position": besser lesbar als die Kennung, falls HA nichts liefert
  _human(id) {
    const s = String(id || "").replace(/_/g, " ").trim();
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
  }

  _domainName(d) {
    return this._tr(`component.${d}.title`) || this._tr(`component.${d}.entity_component._.name`) || this._human(d);
  }

  _serviceName(domain, service) {
    if (!domain || !service) return this._t("stepCustom");
    const meta = this._services()[domain]?.[service];
    return this._tr(`component.${domain}.services.${service}.name`) || meta?.name || this._human(service);
  }

  _serviceDesc(domain, service) {
    return this._tr(`component.${domain}.services.${service}.description`) || this._services()[domain]?.[service]?.description || "";
  }

  _fieldName(f, key, fd) {
    return this._tr(`component.${f.domain}.services.${f.service}.fields.${key}.name`) || fd.name || this._human(key);
  }

  _fieldDesc(f, key, fd) {
    return this._tr(`component.${f.domain}.services.${f.service}.fields.${key}.description`) || fd.description || "";
  }

  _entitiesAll(domains) {
    return Object.values(this.states)
      .filter((s) => !domains.length || domains.includes(s.entity_id.split(".")[0]))
      .map((s) => ({ id: s.entity_id, name: s.attributes?.friendly_name || s.entity_id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  _entities(domains) {
    const q = (this.edit?.q || "").toLowerCase();
    return this._entitiesAll(domains || []).filter((e) => !q || e.name.toLowerCase().includes(q) || e.id.includes(q));
  }

  // Auswahlfeld: Suchfeld mit Liste darunter, gewählte als Pille mit x (wie die Empfänger)
  _combo(domains, f, placeholderKey) {
    const pills = f.targets.map((id) => `<span class="ag-rpill ${this.states[id] ? "" : "gone"}">${ic("bell", 14)}<span>${esc(this.host._name(id))}</span><button type="button" class="ag-rx" data-wf="unpick" data-ent="${esc(id)}" aria-label="${esc(this._t("ntRemove", { name: this.host._name(id) }))}">${ic("close", 14)}</button></span>`).join("");
    return `<div class="ag-combo ${this.edit.open ? "open" : ""}">
      <label class="ag-search">${ic("search", 18)}<input type="search" data-wf="eq" placeholder="${esc(this._t(placeholderKey))}" value="${esc(this.edit.q)}" autocomplete="off" aria-label="${esc(this._t(placeholderKey))}">
        <button type="button" class="ag-clear" data-wf="eq-clear" aria-label="${esc(this._t("clearSearch"))}" ${this.edit.q ? "" : "hidden"}>${ic("close", 16)}</button></label>
      <div class="ag-combo-list" role="listbox">${this._comboItems(domains, f)}</div>
      ${pills ? `<div class="ag-rpills">${pills}</div>` : ""}</div>`;
  }

  _comboItems(domains, f) {
    const list = this._entities(domains).filter((e) => !f.targets.includes(e.id));
    const shown = list.slice(0, 60);
    if (!shown.length) return `<div class="ag-t2 ag-small ag-combo-more">${esc(this._t("fldNoMatch"))}</div>`;
    return shown.map((e) => `<button type="button" class="ag-combo-item" role="option" data-wf="pick" data-ent="${esc(e.id)}"><span>${esc(e.name)}</span><small>${esc(e.id)}</small></button>`).join("")
      + (list.length > shown.length ? `<div class="ag-t2 ag-small ag-combo-more">${esc(this._t("fldMore", { count: list.length - shown.length }))}</div>` : "");
  }

  _domainsOf(f) {
    if (isTone(f.kind)) return ["media_player"];
    if (f.kind === "device") return Object.keys(DEVICE);
    if (f.kind === "scene") return SCENE_DOMAINS;
    const meta = this._services()[f.domain]?.[f.service];
    const doms = [].concat(meta?.target?.entity || []).flatMap((x) => [].concat(x?.domain || []));
    return doms.length ? doms : f.domain ? [f.domain] : null;
  }

  _dlg() {
    return this.host._root.getElementById("ag-step");
  }

  openPicker(at, zone = "main") {
    this.edit = { insert: at, index: null, form: null, q: "", error: "", open: false, zone };
    // Je Liste nur, was dort Sinn hat: beim Alarm die Sirene (kein Aktivierungston), beim Scharfschalten der Aktivierungston (keine Sirene)
    const allowed = zone === "after" ? AFTER_KINDS : zone === "armed" ? ARMED_KINDS : null;
    const kinds = allowed ? allowed.map((kind) => KINDS.find((k) => k.kind === kind)) : KINDS.filter((k) => k.kind !== "chime");
    const dlg = this._dlg();
    this.host._setHtml(dlg, `<div class="ag-dlg-body"><h3>${esc(this._t("stepPick"))}</h3><div class="ag-kinds">${kinds.map((k) => `<button class="ag-kind" data-wf="kind" data-kind="${k.kind}"><span class="ag-wf-icon k-${k.kind}">${ic(k.icon, 22)}</span><b>${esc(this._t(k.label))}</b><small>${esc(this._t(k.hint))}</small></button>`).join("")}</div>
      <div class="ag-dlg-btns"><button class="ag-btn" data-wf="close">${esc(this._t("cancel"))}</button></div></div>`);
    dlg.showModal();
  }

  openEditor(form) {
    this.edit.form = form;
    this.renderEditor();
    if (!this._dlg().open) this._dlg().showModal();
  }

  // ----- Editor -----

  // Einfaches Feld mit Beschriftung (innerhalb eines Kapitels)
  _ef(label, body, hint = "") {
    return `<div class="ag-ef"><div class="ag-ef-l">${esc(this._t(label))}</div>${hint ? `<div class="ag-ef-h">${esc(this._t(hint))}</div>` : ""}${body}</div>`;
  }

  // Kapitel im Dialog (Design-Regel "Kapitel"): Titel mit Strich davor, darunter die Karte
  _sec(title, body, hint = "") {
    return `<section class="ag-chap ag-chap-s"><h4 class="ag-sec-t">${esc(this._t(title))}</h4>${hint ? `<p class="ag-chap-h">${esc(this._t(hint))}</p>` : ""}<div class="ag-card ag-efcard">${body}</div></section>`;
  }

  _field(label, body, hint = "") {
    return this._sec(label, body, hint);
  }

  _toggle(attr, on, label) {
    return `<button class="ag-toggle ${on ? "on" : ""}" ${attr} role="switch" aria-checked="${on}" aria-label="${esc(this._t(label))}"></button>`;
  }

  // Nicht abwarten: der nächste Schritt startet sofort; sinnvoll für lange Töne und träge Geräte
  // "Warten, bis die Aktion beendet ist": aus ist der Standard (der nächste Schritt startet sofort)
  _waitRow(f) {
    if (!["device", "sound", "chime", "prealarm", "scene", "custom"].includes(f.kind)) return "";
    const fixed = f.kind === "sound" && f.until;
    return `<div class="ag-ef ag-ef-row"><div class="ag-settx"><b>${esc(this._t("fldWait"))}</b><small>${esc(this._t(fixed ? "wfFlowUntil" : "fldWaitHint"))}</small></div>${this._toggle(`data-wf="waitend"${fixed ? " disabled" : ""}`, f.wait && !fixed, "fldWait")}</div>`;
  }

  // "Rückgängig" gibt es nur im Ablauf beim Alarm: nach dem Quittieren folgt nichts mehr, das etwas zurückstellen könnte
  _restoreRow(f) {
    const row = (this.edit?.zone || "main") !== "main" || isShortTone(f.kind) ? "" : `<div class="ag-ef ag-ef-row"><div class="ag-settx"><b>${esc(this._t("fldRestore"))}</b><small>${esc(this._t(f.kind === "sound" ? "fldRestoreSoundHint" : "fldRestoreHint"))}</small></div>${this._toggle('data-wf="restore"', f.restore, "fldRestore")}</div>`;
    return `${row}${this._waitRow(f)}`;
  }

  _rangeRow(attr, label, value, min, max, step, text) {
    return `<div class="ag-ef-range"><label><span>${esc(label)}</span><b class="ag-ef-val">${esc(text)}</b></label><input type="range" class="ag-range" ${attr} min="${min}" max="${max}" step="${step}" value="${esc(value)}" aria-label="${esc(label)}"></div>`;
  }

  _deviceFields(f) {
    const domains = [...new Set(f.targets.map((e) => e.split(".")[0]))];
    const single = domains.length === 1 ? domains[0] : null;
    const actions = f.targets.length ? Object.keys(single ? DEVICE[single] : MIXED) : [];
    if (actions.length && !actions.includes(f.action)) f.action = actions[0];
    const picker = actions.length
      ? `<div class="ag-actions">${actions.map((a) => `<button class="ag-act ${f.action === a ? "on" : ""}" data-wf="action" data-value="${a}" aria-pressed="${f.action === a}">${ic(ACTION_ICON[a], 18)}${esc(this._t(cap(single || "", a)))}</button>`).join("")}</div>`
      : `<div class="ag-t2 ag-small">${esc(this._t("fldChooseFirst"))}</div>`;
    let options = "";
    if (f.action === "on" && domains.length > 1) options = `<div class="ag-t2 ag-small">${esc(this._t("optsMixed"))}</div>`;
    if (f.action === "on" && single) {
      options = deviceOptions(this.states, f.targets).map((sp) => {
        const on = !!f.optsOn[sp.key];
        const label = this._t(sp.label);
        let control = "";
        if (on) {
          const val = f.opts[sp.key] ?? (sp.type === "choice" ? sp.values[0] : sp.min);
          if (sp.type === "choice") control = `<select class="ag-input" data-wf="opt" data-key="${sp.key}" aria-label="${esc(label)}">${sp.values.map((v) => `<option value="${esc(v)}" ${v === val ? "selected" : ""}>${esc(this._hvacLabel(v))}</option>`).join("")}</select>`;
          else control = this._rangeRow(`data-wf="opt" data-key="${sp.key}"`, label, val, sp.min, sp.max, sp.step || 1, this._optText(sp.key, val));
        }
        return `<div class="ag-opt"><div class="ag-ef-row"><div class="ag-settx"><b>${esc(label)}</b>${on ? "" : `<small>${esc(this._t("optUnchanged"))}</small>`}</div>${this._toggle(`data-wf="opt-on" data-key="${sp.key}"`, on, sp.label)}</div>${control}</div>`;
      }).join("");
    }
    return this._field("fldDevices", this._combo(Object.keys(DEVICE), f, "fldSearchDevice"))
      + this._field("fldAction", picker)
      + (options ? this._field("optsTitle", options) : "")
      + this._restoreRow(f);
  }

  _hvacLabel(mode) {
    const key = `hvac_${mode}`;
    const text = this._t(key);
    return text === key ? mode : text;
  }

  _soundFields(f) {
    // Jede Art bietet ihre eigenen Klänge an; ein früher gewählter Klang einer anderen Art bleibt wählbar, solange er eingestellt ist
    const all = [...(this.host._data?.sounds || []), ...(this.host._data?.prealarms || []), ...(this.host._data?.chimes || [])];
    const own = this.host._data?.[TONE_LIST[f.kind] || "sounds"] || [];
    const sounds = own.some((s) => s.id === f.sound) ? own : [...own, ...all.filter((s) => s.id === f.sound)];
    const current = sounds.find((s) => s.id === f.sound);
    const play = Boolean(this.previewing && current && this.previewing === current.url);
    const tone = `<div class="ag-tone"><select class="ag-input" data-wf="f" data-key="sound" aria-label="${esc(this._t("fldTone"))}">${sounds.map((s) => `<option value="${s.id}" ${s.id === f.sound ? "selected" : ""}>${esc(this._t(SOUND_KEY[s.id] || s.id))}</option>`).join("")}</select>
        <div class="ag-pv" role="group" aria-label="${esc(this._t("pvNote"))}">
          <button class="ag-iconbtn ${play ? "on" : ""}" data-wf="pv-play" data-url="${esc(current?.url || "")}" aria-label="${esc(this._t("pvPlay"))}" title="${esc(this._t("pvPlay"))}">${ic("play", 18)}</button>
          <button class="ag-iconbtn" data-wf="pv-pause" ${play ? "" : "disabled"} aria-label="${esc(this._t("pvPause"))}" title="${esc(this._t("pvPause"))}">${ic("pause", 18)}</button></div></div>
      <div class="ag-pv-note">${ic("info", 14)} ${esc(this._t("pvNote"))}</div>`;
    const volume = `<div class="ag-ef-row"><div class="ag-settx"><b>${esc(this._t("fldVolumeSet"))}</b>${f.setVolume ? "" : `<small>${esc(this._t("fldVolumeKeep"))}</small>`}</div>${this._toggle('data-wf="setvol"', f.setVolume, "fldVolumeSet")}</div>
      ${f.setVolume && !(f.perVolume && f.targets.length > 1) ? this._rangeRow('data-wf="volume"', this._t("fldVolume"), Math.round(f.volume * 100), 0, 100, 5, `${Math.round(f.volume * 100)} %`) : ""}
      ${f.setVolume && f.targets.length > 1 ? `<div class="ag-ef-row ag-pervol"><div class="ag-settx"><b>${esc(this._t("fldVolumePer"))}</b><small>${esc(this._t("fldVolumePerHint"))}</small></div>${this._toggle('data-wf="pervol"', f.perVolume, "fldVolumePer")}</div>` : ""}
      ${f.setVolume && f.perVolume && f.targets.length > 1 ? f.targets.map((id) => { const v = Math.round(Number(f.volumes?.[id] ?? f.volume) * 100); return this._rangeRow(`data-wf="pvol" data-ent="${esc(id)}"`, this.host._hass?.states?.[id]?.attributes?.friendly_name || id, v, 0, 100, 5, `${v} %`); }).join("") : ""}`;
    return this._field("fldPlayers", this._combo(["media_player"], f, "fldSearchPlayer"))
      + this._field("fldTone", tone)
      + this._field("fldVolume", volume)
      + this._field("fldPlayFor", this._playFor(f) + (f.kind === "chime" ? `<div class="ag-pv-note">${ic("info", 14)} ${esc(this._t("fldChimeFor"))}</div>` : ""))
      + this._restoreRow(f);
  }

  // Dauer des Alarmtons: Sekunden oder "bis zum Deaktivieren"
  _playFor(f) {
    // Nach dem Quittieren gibt es "bis zum Deaktivieren" nicht: niemand deaktiviert danach, der Ton braucht eine Dauer
    const until = this.edit?.zone === "after" || isShortTone(f.kind) ? "" : `<div class="ag-ef-row"><div class="ag-settx"><b>${esc(this._t("fldPlayUntil"))}</b><small>${esc(this._t("fldPlayUntilHint"))}</small></div>${this._toggle('data-wf="until"', f.until, "fldPlayUntil")}</div>`;
    if (f.until) return until;
    const quick = [10, 30, 60, 300].map((s) => `<button class="ag-chip ${Number(f.playSeconds) === s ? "on" : ""}" data-wf="playsecs" data-value="${s}">${esc(s >= 60 ? this._t("durMin", { n: s / 60 }) : this._t("durS", { n: s }))}</button>`).join("");
    return `<span class="ag-num"><input type="number" min="1" max="3600" data-wf="f" data-key="playSeconds" value="${esc(f.playSeconds)}" aria-label="${esc(this._t("fldPlayFor"))}"><span class="ag-t2">s</span></span>
      <div class="ag-zline">${quick}</div><div class="ag-ef-h">${esc(this._t("fldPlayForHint"))}</div>${until}`;
  }

  // Titel und Text der Push-Meldung: der Standardtext steht im Feld und lässt sich ändern; Platzhalter füllt der Server beim Alarm
  _notifyFields(f) {
    const [dt, dm] = this._ntDefaults(f);
    const chips = NOTIFY_TOKENS.map((tok) => `<button type="button" class="ag-chip" data-wf="ins" data-token="${esc(tok)}">${esc(tok)}<small>${esc(this._t(`ntTok_${tok.slice(1, -1)}`))}</small></button>`).join("");
    return `<div class="ag-t2">${esc(this._t(f.kind === "end" ? "wfEndNotifyHint" : "stepNotifyHint"))}</div>
      ${this._sec("chapNtContent", `${this._ef("fldNtTitle", `<input class="ag-input" data-wf="f" data-key="ntTitle" maxlength="100" value="${esc(f.ntTitle || dt)}" aria-label="${esc(this._t("fldNtTitle"))}">`)}
      ${this._ef("fldNtMessage", `<textarea class="ag-input" rows="3" data-wf="f" data-key="ntMessage" maxlength="300" aria-label="${esc(this._t("fldNtMessage"))}">${esc(f.ntMessage || dm)}</textarea>`)}
      ${this._ef("fldNtTokens", `<div class="ag-zline">${chips}</div>`, "fldNtTokensHint")}
      ${this._ef("fldNtPreview", `<div class="ag-ntprev" id="ag-ntprev">${this._ntPreview(f)}</div>
        <div><button type="button" class="ag-btn" data-wf="nt-default">${ic("undo", 16)}${esc(this._t("fldNtDefault"))}</button></div>`)}`)}
      ${this._ntDelivery(f)}`;
  }

  // Standardtext der Meldung: Alarm oder "Alarm endet" (eigener Text, nie kritisch)
  _ntDefaults(f) {
    return f.kind === "end" ? [this._t("ntEndDefaultTitle"), this._t("ntEndDefaultMessage")] : [this._t("ntDefaultTitle"), this._t("ntDefaultMessage")];
  }

  // Wirksame Werte der Alarmmeldung: aus dem Schritt, sonst der frühere globale Wert (so ändert sich bei bestehenden Schritten nichts)
  _ntGlobal() {
    const g = this.host._data?.notify || {};
    return { critical: g.types?.triggered?.critical ?? true, volume: g.types?.triggered?.volume ?? 0.8, open: g.open_action ?? true, silence: g.silence_action ?? false, acknowledge: g.acknowledge_action ?? true, disarm: g.disarm_action ?? false };
  }

  // Empfänger der Meldung: Standard sind die Alarm-Empfänger der Konfiguration; hier lassen sie sich für diese Meldung ersetzen
  _ntRecipients(f) {
    const short = (x) => x.replace(/^notify\.(mobile_app_)?/, "");
    const data = this.host._data || {};
    const services = data.notify_services || [];
    const globalTargets = data.notify?.alarm_targets || [];
    const own = Array.isArray(f.ntTargets);
    const pill = (x, removable) => `<span class="ag-rpill ${services.includes(x) ? "" : "gone"}">${ic("bell", 14)}<span>${esc(short(x))}</span>${removable ? `<button type="button" class="ag-rx" data-wf="nt-tgt-del" data-target="${esc(x)}" aria-label="${esc(this._t("ntRemove", { name: short(x) }))}">${ic("close", 14)}</button>` : ""}</span>`;
    let body;
    if (!own) {
      body = globalTargets.length
        ? `<small>${esc(this._t("fldNtTargetsDefault"))}</small><div class="ag-rpills">${globalTargets.map((x) => pill(x, false)).join("")}</div>`
        : `<small class="ag-warntext">${ic("alert", 14)} ${esc(this._t("ntNoneChosen"))}</small>`;
    } else {
      const free = services.filter((x) => !f.ntTargets.includes(x));
      body = `<div class="ag-rline"><select class="ag-input ag-rsel" data-wf="nt-tgt-add" aria-label="${esc(this._t("ntAdd"))}" ${free.length ? "" : "disabled"}>
          <option value="">${esc(this._t(free.length ? "ntAdd" : "ntAllChosen"))}</option>${free.map((x) => `<option value="${esc(x)}">${esc(short(x))}</option>`).join("")}</select></div>
        ${f.ntTargets.length ? `<div class="ag-rpills">${f.ntTargets.map((x) => pill(x, true)).join("")}</div>` : `<small>${esc(this._t("fldNtTargetsEmpty"))}</small>`}`;
    }
    return this._sec("fldNtTargets", `<div class="ag-ef-row"><div class="ag-settx"><b>${esc(this._t("fldNtTargetsOwn"))}</b><small>${esc(this._t("fldNtTargetsOwnHint"))}</small></div>${this._toggle('data-wf="nt-tgt-own"', own, "fldNtTargetsOwn")}</div>${body}`);
  }

  _ntDelivery(f) {
    const g = this._ntGlobal();
    const end = f.kind === "end";
    const critical = f.ntCritical ?? (end ? false : g.critical);
    const volume = Math.round((f.ntVolume ?? g.volume) * 100);
    const btn = (key, label, hint, warn) => {
      const on = f.ntButtons?.[key] ?? g[key];
      return `<div class="ag-ef-row"><div class="ag-settx"><b>${esc(this._t(label))}</b><small class="${warn ? "ag-warntext" : ""}">${warn ? `${ic("alert", 14)} ` : ""}${esc(this._t(hint))}</small></div>${this._toggle(`data-wf="nt-btn" data-key="${key}"`, on, label)}</div>`;
    };
    return this._ntRecipients(f)
      + this._sec("fldNtDelivery", `<div class="ag-ef-row"><div class="ag-settx"><b>${esc(this._t("ntCriticalShort"))}</b><small>${esc(this._t("fldNtCriticalHint"))}</small></div>${this._toggle('data-wf="nt-crit"', critical, "ntCriticalShort")}</div>
        ${critical ? this._rangeRow('data-wf="nt-vol"', this._t("ntVolumeShort"), volume, 0, 100, 5, `${volume} %`) : ""}`)
      + this._sec("fldNtClick", `<select class="ag-input" data-wf="nt-click" aria-label="${esc(this._t("fldNtClick"))}">${["log", "overview", "custom"].map((k) => `<option value="${k}" ${(f.ntClick || "log") === k ? "selected" : ""}>${esc(this._t(`ntClick_${k}`))}</option>`).join("")}</select>
        ${f.ntClick === "custom" ? `<input class="ag-input ag-mono" data-wf="f" data-key="ntClickPath" value="${esc(f.ntClickPath || "")}" placeholder="/lovelace/alarm" aria-label="${esc(this._t("ntClick_custom"))}" autocapitalize="off" autocomplete="off" spellcheck="false">` : ""}`, "fldNtClickHint")
      + (end ? "" : this._sec("fldNtButtons", `${btn("open", "ntOpenAction", "ntOpenActionHint", false)}${btn("silence", "ntSilenceAction", "ntSilenceActionHint", true)}${btn("acknowledge", "ntAckAction", "ntAckActionHint", true)}${btn("disarm", "ntDisarmAction", "ntDisarmActionHint", true)}`));
  }

  // Vorschau mit echten Namen der Anlage und eines Sensors, so wie die Meldung aussähe
  _ntPreview(f) {
    const s = this.system;
    const sensorId = Object.values(s?.zones || {}).flat()[0];
    const fill = (text) => text
      .replaceAll("{name}", s?.title || "")
      .replaceAll("{sensor}", sensorId ? this.host._name(sensorId) : "")
      .replaceAll("{time}", new Date().toLocaleTimeString(this.host._hass?.locale?.language || this.host._lang, { hour: "2-digit", minute: "2-digit" }))
      .replaceAll("{mode}", this._t(MODE_KEY[this.trigger] || "modeAway"));
    const [dt, dm] = this._ntDefaults(f);
    const title = fill(f.ntTitle || dt).trim();
    const message = fill(f.ntMessage || dm).trim();
    return `<b>${esc(title)}</b><div>${esc(message)}</div>`;
  }

  _waitFields(f) {
    const quick = [10, 30, 60, 300].map((s) => `<button class="ag-chip ${Number(f.seconds) === s ? "on" : ""}" data-wf="secs" data-value="${s}">${esc(s >= 60 ? this._t("durMin", { n: s / 60 }) : this._t("durS", { n: s }))}</button>`).join("");
    return this._field("fldDuration", `<span class="ag-num"><input type="number" min="0" max="3600" data-wf="f" data-key="seconds" value="${esc(f.seconds)}" aria-label="${esc(this._t("fldSeconds"))}"><span class="ag-t2">s</span></span><div class="ag-zline" style="margin-top:10px">${quick}</div>`);
  }

  _sceneFields(f) {
    const options = SCENE_DOMAINS.map((d) => [d, this._entitiesAll([d])]).filter(([, list]) => list.length)
      .map(([d, list]) => `<optgroup label="${esc(this._t(d === "scene" ? "grpScenes" : "grpScripts"))}">${list.map((e) => `<option value="${esc(e.id)}" ${f.targets[0] === e.id ? "selected" : ""}>${esc(e.name)}</option>`).join("")}</optgroup>`).join("");
    return this._field("fldSceneScript", options
      ? `<select class="ag-input" data-wf="scene" aria-label="${esc(this._t("fldSceneScript"))}"><option value="">${esc(this._t("fldChoose"))}</option>${options}</select>`
      : `<div class="ag-t2 ag-small">${esc(this._t("fldNoEntities"))}</div>`);
  }

  // Durchsuchbares Auswahlfeld (tippen filtert): Art und Aktion bei "Eigene Aktion"; die Listen sind lang
  _cbItems(key, f) {
    const services = this._services();
    const q = (this.edit?.cb?.key === key ? this.edit.cb.q : "").trim().toLowerCase();
    const items = key === "domain"
      ? Object.keys(services).filter((d) => Object.keys(services[d] || {}).length).map((d) => ({ value: d, label: this._domainName(d) }))
      : Object.keys(services[f.domain] || {}).map((s) => ({ value: s, label: this._serviceName(f.domain, s) }));
    items.sort((x, y) => x.label.localeCompare(y.label));
    const shown = items.filter((it) => !q || it.label.toLowerCase().includes(q) || it.value.toLowerCase().includes(q));
    if (!shown.length) return `<div class="ag-t2 ag-small ag-combo-more">${esc(this._t("fldNoMatch"))}</div>`;
    const cur = key === "domain" ? f.domain : f.service;
    return shown.map((it) => `<button type="button" class="ag-combo-item ${it.value === cur ? "cur" : ""}" role="option" data-wf="cb-pick" data-key="${key}" data-value="${esc(it.value)}"><span>${esc(it.label)}</span><small>${esc(key === "domain" ? it.value : `${f.domain}.${it.value}`)}</small></button>`).join("");
  }

  _cbox(key, f, label) {
    const cur = key === "domain" ? f.domain : f.service;
    const text = !cur ? "" : key === "domain" ? this._domainName(cur) : this._serviceName(f.domain, cur);
    const disabled = key === "service" && !f.domain;
    return `<div class="ag-combo ag-cbox"><label class="ag-search ${disabled ? "off" : ""}">${ic("search", 18)}<input type="search" data-wf="cb" data-key="${key}" value="${esc(text)}" placeholder="${esc(this._t("fldChoose"))}" autocomplete="off" aria-label="${esc(label)}" ${disabled ? "disabled" : ""}>${ic("chevRight", 16)}</label>
      <div class="ag-combo-list" role="listbox">${this._cbItems(key, f)}</div></div>`;
  }

  _customFields(f) {
    const services = this._services();
    const domains = Object.keys(services).filter((d) => Object.keys(services[d] || {}).length).sort();
    if (!domains.length) return `<div class="ag-t2">${esc(this._t("fldNoServices"))}</div>`;
    const dom = this._cbox("domain", f, this._t("fldKind"));
    const srv = this._cbox("service", f, this._t("fldAction"));
    const meta = services[f.domain]?.[f.service];
    let html = this._field("fldKind", dom) + this._field("fldAction", srv + (this._serviceDesc(f.domain, f.service) ? `<div class="ag-ef-h" style="margin-top:6px">${esc(this._serviceDesc(f.domain, f.service))}</div>` : ""));
    if (!meta) return html + this._restoreRow(f);
    if (meta.target) html += this._field("fldDevices", this._combo(this._domainsOf(f), f, "fldSearchDevice"));
    const fields = Object.entries(flatFields(meta.fields));
    const req = fields.filter(([, fd]) => fd.required);
    const opt = fields.filter(([, fd]) => !fd.required);
    html += req.map(([k, fd]) => this._dataField(k, fd, f)).join("");
    if (opt.length) html += `<details class="ag-more" ${opt.some(([k]) => f.data[k] != null && f.data[k] !== "") ? "open" : ""}><summary>${esc(this._t("fldMoreSettings"))}</summary>${opt.map(([k, fd]) => this._dataField(k, fd, f)).join("")}</details>`;
    // Werte aus einem früheren Schritt, die zu keinem Feld passen, bleiben erhalten und werden nur genannt
    const known = new Set(fields.map(([k]) => k));
    const extra = Object.entries(f.extra).filter(([k]) => !known.has(k));
    if (extra.length) html += `<div class="ag-ef-h">${esc(this._t("fldExtra"))}: ${esc(extra.map(([k, v]) => `${k}: ${typeof v === "object" ? "…" : v}`).join(", "))}</div>`;
    return html + this._restoreRow(f);
  }

  _dataField(key, fd, f) {
    const type = selectorType(fd);
    const val = f.data[key];
    const sel = fd.selector?.[type] || {};
    const name = this._fieldName(f, key, fd);
    const desc = this._fieldDesc(f, key, fd);
    const attr = `data-wf="df" data-key="${esc(key)}" data-type="${type}"`;
    let control;
    if (!SIMPLE_SELECTORS.includes(type) || (type === "select" && sel.multiple) || (type === "entity" && sel.multiple)) {
      control = `<div class="ag-t2 ag-small">${ic("info", 14)} ${esc(this._t("fldUnsupported"))}</div>`;
    } else if (type === "boolean") {
      control = `<div class="ag-ef-row"><span class="ag-t2">${esc(desc)}</span>${this._toggle(`${attr} data-bool`, !!val, "fldValue")}</div>`;
    } else if (type === "number" || type === "color_temp") {
      const min = sel.min ?? sel.min_kelvin ?? "";
      const max = sel.max ?? sel.max_kelvin ?? "";
      const slider = sel.mode === "slider" && min !== "" && max !== "";
      const shown = val ?? fd.default ?? min;
      control = slider
        ? this._rangeRow(attr, name, shown, min, max, sel.step || 1, `${shown}${sel.unit_of_measurement ? ` ${sel.unit_of_measurement}` : ""}`)
        : `<span class="ag-num"><input type="number" ${attr} min="${min}" max="${max}" step="${sel.step || "any"}" value="${esc(val ?? "")}" placeholder="${esc(fd.default ?? "")}" aria-label="${esc(name)}"><span class="ag-t2">${esc(sel.unit_of_measurement || "")}</span></span>`;
    } else if (type === "select") {
      control = `<select class="ag-input" ${attr} aria-label="${esc(name)}"><option value="">${esc(this._t("fldChoose"))}</option>${normalizeOptions(sel.options).map((o) => `<option value="${esc(o.value)}" ${String(val) === o.value ? "selected" : ""}>${esc((sel.translation_key && this._tr(`component.${f.domain}.selector.${sel.translation_key}.options.${o.value}`)) || o.label)}</option>`).join("")}</select>`;
    } else if (type === "entity") {
      const list = this._entitiesAll([].concat(sel.domain || []));
      control = list.length <= 250
        ? `<select class="ag-input" ${attr} aria-label="${esc(name)}"><option value="">${esc(this._t("fldChoose"))}</option>${list.map((e) => `<option value="${esc(e.id)}" ${val === e.id ? "selected" : ""}>${esc(e.name)}</option>`).join("")}</select>`
        : `<input class="ag-input" ${attr} value="${esc(val ?? "")}" aria-label="${esc(name)}">`;
    } else {
      control = `<input class="ag-input" ${attr} value="${esc(val ?? "")}" placeholder="${esc(fd.example ?? "")}" aria-label="${esc(name)}">`;
    }
    return `<div class="ag-ef"><div class="ag-ef-l">${esc(name)}${fd.required ? ` <span class="ag-req">${esc(this._t("fldRequired"))}</span>` : ""}</div>${desc && type !== "boolean" ? `<div class="ag-ef-h">${esc(desc)}</div>` : ""}${control}</div>`;
  }

  renderEditor() {
    const f = this.edit.form;
    if (this.edit.snap === undefined) this.edit.snap = JSON.stringify(f); // Stand beim Öffnen: Abbrechen fragt nur bei echten Änderungen
    const k = f.kind === "end" ? { kind: "end", icon: "check", label: "wfEnd" } : KINDS.find((x) => x.kind === f.kind);
    let fields;
    if (f.kind === "end") fields = this._endFields(f);
    else if (f.kind === "notify") fields = this._notifyFields(f);
    else if (f.kind === "device") fields = this._deviceFields(f);
    else if (isTone(f.kind)) fields = this._soundFields(f);
    else if (f.kind === "wait") fields = this._waitFields(f);
    else if (f.kind === "acknowledge") fields = `<div class="ag-t2">${esc(this._t("fldAckHint"))}</div>`;
    else if (f.kind === "scene") fields = this._sceneFields(f);
    else fields = this._customFields(f);
    this.host._setHtml(this._dlg(), `<div class="ag-dlg-body ag-step-ed"><div class="ag-sys-top"><span class="ag-wf-icon k-${f.kind}">${ic(k.icon, 22)}</span><h3>${esc(this._t(k.label))}</h3></div>
      ${fields}<div class="ag-dlg-err" aria-live="polite">${esc(this.edit.error || "")}</div>
      <div class="ag-dlg-btns"><button class="ag-btn" data-wf="close">${esc(this._t("cancel"))}</button><button class="ag-btn primary" data-wf="apply">${esc(this._t("apply"))}</button></div></div>`);
  }

  apply() {
    const f = this.edit.form;
    if (f.kind === "end") return this._endApply();
    if (["device", "sound", "chime", "prealarm", "scene"].includes(f.kind) && !f.targets.length) return this._editError("stepNoTargets");
    if (f.kind === "notify" && f.ntClick === "custom" && !/^\/[^\s]*$/.test(String(f.ntClickPath || "").trim())) return this._editError("fldNtPathBad");
    if (f.kind === "custom") {
      if (!f.domain || !f.service) return this._editError("stepNoService");
      const meta = this._services()[f.domain]?.[f.service];
      const fields = flatFields(meta?.fields);
      const empty = (k) => f.data[k] === undefined || f.data[k] === "" || Number.isNaN(f.data[k]);
      const missing = Object.entries(fields).find(([k, fd]) => fd.required && selectorType(fd) !== "boolean" && SIMPLE_SELECTORS.includes(selectorType(fd)) && empty(k) && !f.extra[k]);
      if (missing) return this._editError(null, this._t("fldMissing", { name: this._fieldName(f, missing[0], missing[1]) }));
      if (meta?.target && !f.targets.length && !("entity_id" in fields)) return this._editError("stepNoTargets");
    }
    let step;
    try {
      step = toStep(f, this.edit.zone);
    } catch (err) {
      return this._editError(null, errText(err));
    }
    const zone = this.edit.zone || "main";
    const list = [...this.steps(zone)];
    if (this.edit.index !== null) list[this.edit.index] = step;
    else list.splice(this.edit.insert, 0, step);
    this._setSteps(list, zone);
    this.saveState = null;
    this._stopPreview();
    this.edit = null;
    this._dlg().close();
    this.render();
  }

  _editError(key, text) {
    this.edit.error = text || this._t(key);
    this.renderEditor();
  }

  // ----- Vorhören auf diesem Gerät (nicht auf dem Medienplayer) -----

  _play(url) {
    this._stopPreview();
    const audio = new Audio(url);
    audio.addEventListener("ended", () => {
      if (this._preview === audio) {
        this._preview = null;
        this.previewing = null;
        if (isTone(this.edit?.form?.kind)) this.renderEditor();
      }
    });
    this._preview = audio;
    this.previewing = url;
    audio.play().catch(() => {
      if (this._preview === audio) {
        this._preview = null;
        this.previewing = null;
        if (isTone(this.edit?.form?.kind)) this.renderEditor();
      }
    });
  }

  _stopPreview() {
    if (this._preview) {
      this._preview.pause();
      this._preview = null;
    }
    this.previewing = null;
  }

  // ----- Speichern und Testen -----

  async save() {
    const h = this.host;
    const s = this.system;
    const d = this.draft;
    if (!s || !d || this.saving) return;
    this.saving = true;
    this.renderFoot();
    try {
      const eff = this._effective(d, s);
      const wf = Object.fromEntries(this.triggers(s).map((t) => [t, eff.wf[t] || []]));
      const end = Object.fromEntries(this.triggers(s).map((t) => [t, normEnd(eff.end[t])]));
      const after = Object.fromEntries(this.triggers(s).map((t) => [t, eff.after?.[t] || []]));
      const armed = Object.fromEntries(this.triggers(s).filter((t) => t !== "always").map((t) => [t, eff.armed?.[t] || []]));
      const saved = await h._hass.callWS({ type: "alarmageddon/save_workflows", entry_id: s.entry_id, workflows: wf, workflow_end: end, workflows_after: after, workflows_armed: armed });
      s.workflows_armed = JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(armed).filter(([, v]) => v.length))));
      s.workflows_after = JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(after).filter(([, v]) => v.length))));
      s.workflow_end = Object.fromEntries(Object.entries(end).filter(([, v]) => v.notify));
      s.workflows = JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(wf).filter(([, v]) => v.length))));
      this.draft = null;
      this.saveState = "saved";
      this.host._markSaved(this); // Punkte "ungespeichert" verschwinden sofort
      // Nur warten, wenn die Anlage wirklich neu lädt (der Server sagt es; ältere Server ohne Angabe: wie bisher warten)
      if (saved?.reload !== false) h._reloadWait(s.entry_id);
      else h._fetch();
    } catch (err) {
      this.saveState = this._t("saveFailed", { message: errText(err) });
    } finally {
      this.saving = false;
      this.render();
    }
  }

  async test(stop, step) {
    const h = this.host;
    const s = this.system;
    try {
      const msg = stop ? { type: "alarmageddon/stop_workflow", entry_id: s.entry_id } : { type: "alarmageddon/test_workflow", entry_id: s.entry_id, trigger: this.trigger };
      if (step) msg.step = step;
      await h._hass.callWS(msg);
      s.workflow_running = stop ? null : this.trigger;
      s.workflow_test = !stop;
      this.render();
      if (!stop) setTimeout(() => h._fetch(), 61000);
    } catch (err) {
      h._toast(this._t("errGeneric", { message: errText(err) }));
    }
  }

  // Einzelner Schritt: läuft wirklich auf den Geräten, darum vorher fragen
  async testStep(index, zone = "main") {
    const step = this.steps(zone)[index];
    if (!step) return;
    const ok = await this.host._confirm(this._t("stepTestTitle"), this._t("stepTestText"), this._t("stepTestRun"));
    if (ok) await this.test(false, step);
  }

  // ----- Ziehen am Griff (Pointer-Ereignisse am Fenster, Tastatur mit Pfeiltasten) -----

  onPointerDown(ev) {
    if (ev.target.closest?.(".ag-combo-list")) this._comboPointer = true;
    const grab = ev.target.closest?.('[data-wf="grab"]');
    if (!grab || (ev.button !== undefined && ev.button !== 0)) return;
    const root = this.host._view;
    // Nur die Karten derselben Liste (Ablauf beim Alarm oder Aktionen danach): gezogen wird innerhalb der Liste
    const line = grab.closest(".ag-wf-line") || root;
    const cards = [...line.querySelectorAll(".ag-wf-step")];
    const from = Number(grab.dataset.index);
    if (!cards[from] || cards.length < 2) return;
    ev.preventDefault();
    const rects = cards.map((c) => c.getBoundingClientRect());
    const slot = (rects[from + 1] ? rects[from + 1].top : rects[from].bottom + 40) - rects[from].top;
    this.drag = { from, to: from, startY: ev.clientY, cards, rects, slot, moved: false, zone: line.dataset?.zone || "main" };
    cards[from].classList.add("dragging");
    root.classList.add("ag-dragging");
  }

  onPointerMove(ev) {
    const d = this.drag;
    if (!d) return;
    const dy = ev.clientY - d.startY;
    if (Math.abs(dy) > 4) d.moved = true;
    d.cards[d.from].style.transform = `translateY(${dy}px)`;
    const center = d.rects[d.from].top + d.rects[d.from].height / 2 + dy;
    // Neue Stelle: so viele andere Karten, wie oberhalb der Mitte der gezogenen liegen
    let to = 0;
    d.rects.forEach((r, i) => {
      if (i !== d.from && r.top + r.height / 2 < center) to += 1;
    });
    d.to = to;
    d.cards.forEach((c, i) => {
      if (i === d.from) return;
      let shift = 0;
      if (d.from < d.to && i > d.from && i <= d.to) shift = -d.slot;
      else if (d.from > d.to && i < d.from && i >= d.to) shift = d.slot;
      c.style.transform = shift ? `translateY(${shift}px)` : "";
    });
    // Am Rand des Fensters mitscrollen
    const win = this.host.ownerDocument.defaultView;
    if (ev.clientY < 70) win.scrollBy(0, -12);
    else if (ev.clientY > win.innerHeight - 70) win.scrollBy(0, 12);
  }

  onPointerEnd() {
    setTimeout(() => (this._comboPointer = false), 250);
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    this.host._view?.classList.remove("ag-dragging");
    d.cards.forEach((c) => {
      c.style.transform = "";
      c.classList.remove("dragging");
    });
    if (d.moved && d.to !== d.from) this._move(d.from, d.to, d.zone);
  }

  _move(from, to, zone = "main") {
    const list = [...this.steps(zone)];
    const [step] = list.splice(from, 1);
    list.splice(to, 0, step);
    this._setSteps(list, zone);
    this.saveState = null;
    this.render();
  }

  // Tastatur am Griff: Pfeiltasten verschieben den Schritt (Ersatz für das Ziehen)
  onKeyDown(ev) {
    const grab = ev.target.closest?.('[data-wf="grab"]');
    if (!grab || !["ArrowUp", "ArrowDown"].includes(ev.key)) return false;
    const i = Number(grab.dataset.index);
    const j = ev.key === "ArrowUp" ? i - 1 : i + 1;
    ev.preventDefault();
    const zone = grab.closest("[data-zone]")?.dataset.zone || "main";
    if (j < 0 || j >= this.steps(zone).length) return true;
    this._move(i, j, zone);
    this.host._view.querySelector(`${ZONE_CLASS[zone] || ".ag-wf-main"} [data-wf="grab"][data-index="${j}"]`)?.focus();
    return true;
  }

  // Suchfeld: Liste nur zeigen, solange es den Fokus hat oder darin getippt wird
  onFocus(el, inside) {
    if (inside && ["ntTitle", "ntMessage"].includes(el?.dataset?.key)) {
      this.ntField = el;
      return true;
    }
    if (el?.dataset?.wf === "cb" && this.edit) {
      const combo = el.closest(".ag-combo");
      if (inside) {
        this.edit.cb = { key: el.dataset.key, q: "" };
        el.select(); // der Text wird beim Tippen ersetzt; die Liste zeigt zuerst alles
        const list = combo.querySelector(".ag-combo-list");
        list.innerHTML = this._cbItems(el.dataset.key, this.edit.form);
        combo.classList.add("open");
        list.querySelector(".cur")?.scrollIntoView({ block: "nearest" });
      } else {
        setTimeout(() => {
          if (this._comboPointer) return;
          combo.classList.remove("open");
          if (this.edit?.cb?.key === el.dataset.key) this.edit.cb = null;
          const f = this.edit?.form;
          if (f && el.isConnected) {
            const cur = el.dataset.key === "domain" ? f.domain : f.service;
            el.value = !cur ? "" : el.dataset.key === "domain" ? this._domainName(cur) : this._serviceName(f.domain, cur);
          }
        }, 120);
      }
      return true;
    }
    if (el?.dataset?.wf !== "eq" || !this.edit) return false;
    const combo = el.closest(".ag-combo");
    this.edit.open = inside;
    if (inside) combo?.classList.add("open");
    else setTimeout(() => !this._comboPointer && combo?.classList.remove("open"), 120);
    return true;
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
    if (act === "permode") {
      const dr = this.ensureDraft();
      const first = this.triggers()[0];
      if (dr.perMode) {
        // Aus: der Ablauf des ersten Modus gilt für alle (bis zu "Speichern" lässt sich das mit "Abbrechen" zurücknehmen)
        const eff = this._effective(dr);
        dr.wf = eff.wf;
        dr.end = eff.end;
        this.trigger = first;
      } else {
        this.trigger = first;
      }
      dr.perMode = !dr.perMode;
      this.render();
      return true;
    }
    if (act === "grab") return true; // das Ziehen läuft über Pointer-Ereignisse; ein Klick tut nichts
    const d = this.ensureDraft();
    const i = Number(el.dataset.index);
    // Liste des Klicks: Ablauf beim Alarm oder Aktionen nach dem Quittieren (im Fenster die Liste, aus der es geöffnet wurde)
    const zone = el.closest("[data-zone]")?.dataset.zone || (el.closest("dialog") ? this.edit?.zone : null) || "main";
    const list = d ? this.steps(zone) : [];
    const form = this.edit?.form;
    if (act === "add") this.openPicker(Number(el.dataset.at), zone);
    else if (act === "kind") {
      const k = KINDS.find((x) => x.kind === el.dataset.kind);
      this.openEditor({ ...blank(), kind: k.kind, restore: k.kind === "sound" && (this.edit?.zone || "main") === "main", ...(k.kind === "chime" ? { sound: "tone_pip", playSeconds: 3, until: false, volume: 0.5 } : {}), ...(k.kind === "prealarm" ? { sound: "pre_beep", playSeconds: 20, until: false, setVolume: true, volume: 0.3, wait: true } : {}) }); // Alarmton beim Alarm: standardmässig zurückstellen; Aktivierungston: Piepsen, 3 Sekunden
    } else if (act === "edit") {
      this.edit = { index: i, insert: null, form: fromStep(list[i]), q: "", error: "", open: false, zone };
      this.renderEditor();
      this._dlg().showModal();
    } else if (act === "delete") {
      this._setSteps(list.filter((_s, k) => k !== i), zone);
      this.saveState = null;
      this.render();
    } else if (act === "test-step") this.testStep(i, zone);
    else if (act === "pick") {
      if (!form.targets.includes(el.dataset.ent)) form.targets = [...form.targets, el.dataset.ent];
      this.edit.q = "";
      this.edit.open = false;
      this.renderEditor();
    } else if (act === "unpick") {
      form.targets = form.targets.filter((x) => x !== el.dataset.ent);
      this.renderEditor();
    } else if (act === "action") {
      form.action = el.dataset.value;
      this.renderEditor();
    } else if (act === "ins") {
      // Platzhalter an der Schreibmarke des zuletzt benutzten Textfelds einfügen
      const field = this.ntField && this._dlg().contains(this.ntField) ? this.ntField : this._dlg().querySelector('[data-key="ntTitle"]');
      const pos = field.selectionStart ?? field.value.length;
      field.value = field.value.slice(0, pos) + el.dataset.token + field.value.slice(field.selectionEnd ?? pos);
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.focus();
      field.setSelectionRange(pos + el.dataset.token.length, pos + el.dataset.token.length);
    } else if (act === "cb-pick") {
      const key = el.dataset.key;
      if (form[key] !== el.dataset.value) {
        form[key] = el.dataset.value;
        if (key === "domain") form.service = "";
        form.data = {};
        form.extra = {};
      }
      this.edit.cb = null;
      this.renderEditor();
    } else if (act === "nt-tgt-own") {
      // Einschalten beginnt mit den bisherigen Alarm-Empfängern; ausschalten verwirft die eigene Liste
      form.ntTargets = Array.isArray(form.ntTargets) ? null : [...(this.host._data?.notify?.alarm_targets || [])];
      this.renderEditor();
    } else if (act === "nt-tgt-del") {
      form.ntTargets = (form.ntTargets || []).filter((x) => x !== el.dataset.target);
      this.renderEditor();
    } else if (act === "nt-crit") {
      form.ntCritical = !(form.ntCritical ?? (form.kind === "end" ? false : this._ntGlobal().critical));
      this.renderEditor();
    } else if (act === "nt-btn") {
      const key = el.dataset.key;
      form.ntButtons = { ...(form.ntButtons || {}), [key]: !(form.ntButtons?.[key] ?? this._ntGlobal()[key]) };
      this.renderEditor();
    } else if (act === "end-edit") {
      this.openEndEditor();
    } else if (act === "end-notify") {
      form.endNotify = !form.endNotify;
      this.renderEditor();
    } else if (act === "end-test") {
      this._endTest();
    } else if (act === "nt-default") {
      form.ntTitle = "";
      form.ntMessage = "";
      this.renderEditor();
    } else if (act === "until") {
      form.until = !form.until;
      if (this.edit?.zone === "after") form.until = false; // nach dem Quittieren braucht ein Ton eine Dauer
      if (form.until) form.wait = false; // endet nie von selbst: darauf lässt sich nicht warten
      this.renderEditor();
    } else if (act === "playsecs") {
      form.playSeconds = Number(el.dataset.value);
      this.renderEditor();
    } else if (act === "secs") {
      form.seconds = Number(el.dataset.value);
      this.renderEditor();
    } else if (act === "opt-on") {
      const key = el.dataset.key;
      form.optsOn[key] = !form.optsOn[key];
      if (form.optsOn[key] && form.opts[key] == null) {
        const spec = deviceOptions(this.states, form.targets).find((sp) => sp.key === key);
        form.opts[key] = spec ? (spec.type === "choice" ? spec.values[0] : key === "brightness_pct" ? 100 : spec.min) : "";
      }
      this.renderEditor();
    } else if (act === "setvol") {
      form.setVolume = !form.setVolume;
      this.renderEditor();
    } else if (act === "pervol") {
      // Je Medienplayer einzeln: jeder beginnt mit dem gemeinsamen Wert
      form.perVolume = !form.perVolume;
      if (form.perVolume) form.volumes = Object.fromEntries(form.targets.map((id) => [id, form.volumes?.[id] ?? form.volume]));
      this.renderEditor();
    } else if (act === "waitend") {
      if (!(form.kind === "sound" && form.until)) form.wait = !form.wait;
      this.renderEditor();
    } else if (act === "restore") {
      form.restore = !form.restore;
      this.renderEditor();
    } else if (act === "df" && el.hasAttribute("data-bool")) {
      form.data[el.dataset.key] = !form.data[el.dataset.key];
      this.renderEditor();
    } else if (act === "pv-play") {
      if (el.dataset.url) this._play(el.dataset.url);
      this.renderEditor();
    } else if (act === "pv-pause") {
      this._stopPreview();
      this.renderEditor();
    } else if (act === "eq-clear") {
      const input = this._dlg().querySelector('[data-wf="eq"]');
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
    } else if (act === "apply") this.apply();
    else if (act === "close") {
      this._stopPreview();
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

  // Alle Aktionen (Schritte und "Alarm endet") eines anderen Modus in den Reiter übernehmen; gespeichert wird erst mit "Speichern"
  async _copyFrom(from) {
    const d = this.ensureDraft();
    const to = this.trigger;
    if (!d?.perMode || !from || from === to || !this.triggers().includes(from)) return;
    const name = (t) => (t === "always" ? this._t("wfAlways") : this._t(MODE_KEY[t]));
    const steps = JSON.parse(JSON.stringify(d.wf[from] || []));
    const end = JSON.parse(JSON.stringify(normEnd(d.end?.[from])));
    const after = JSON.parse(JSON.stringify(d.after?.[from] || [])); // auch die Aktionen nach dem Quittieren
    const same = JSON.stringify([d.wf[to] || [], normEnd(d.end?.[to]), d.after?.[to] || []]) === JSON.stringify([steps, end, after]);
    if (same) return;
    // Rückfrage nur, wenn der Entwurf dieses Reiters wirklich ersetzt würde
    const hasOwn = (d.wf[to] || []).length > 0 || Object.keys(normEnd(d.end?.[to])).length > 0 || (d.after?.[to] || []).length > 0;
    if (hasOwn && !(await this.host._confirm(this._t("wfCopyTitle"), this._t("wfCopyText", { from: name(from), to: name(to) }), this._t("wfCopyOk")))) return;
    if (this.trigger !== to || this.draft !== d) return; // während der Rückfrage gewechselt
    d.wf = { ...d.wf, [to]: steps };
    d.end = { ...(d.end || {}), [to]: end };
    d.after = { ...(d.after || {}), [to]: after };
    // Die Aktionen beim Scharfschalten gehen mit, wenn beide Reiter Modi sind ("Immer aktiv" hat keine)
    if (from !== "always" && to !== "always") d.armed = { ...(d.armed || {}), [to]: JSON.parse(JSON.stringify(d.armed?.[from] || [])) };
    this.saveState = null;
    this.render();
    this.host._renderDots();
  }

  onInput(el) {
    const act = el.dataset.wf;
    if (act === "copy-from") {
      const value = el.value;
      el.value = "";
      this._copyFrom(value);
      return true;
    }
    if (!act || !this.edit?.form) return false;
    const f = this.edit.form;
    if (act === "eq") {
      this.edit.q = el.value;
      this.edit.open = true;
      // Nur die Liste neu aufbauen, damit das Suchfeld den Fokus behält (LEARNINGS)
      const list = this._dlg().querySelector(".ag-combo-list");
      if (list) list.innerHTML = this._comboItems(this._domainsOf(f), f);
      const clear = this._dlg().querySelector('[data-wf="eq-clear"]');
      if (clear) clear.hidden = !el.value;
      this._dlg().querySelector(".ag-combo")?.classList.add("open");
      return true;
    }
    if (act === "cb") {
      this.edit.cb = { key: el.dataset.key, q: el.value };
      // Nur die Liste neu, das Feld behält Fokus und Schreibmarke
      el.closest(".ag-combo").querySelector(".ag-combo-list").innerHTML = this._cbItems(el.dataset.key, f);
      el.closest(".ag-combo").classList.add("open");
      return true;
    }
    if (act === "f") {
      const key = el.dataset.key;
      if (key === "domain" || key === "service") {
        f[key] = el.value;
        if (key === "domain") f.service = "";
        f.data = {};
        f.extra = {};
        this.renderEditor();
      } else if (key === "sound") {
        f.sound = el.value;
        this._stopPreview();
        this.renderEditor();
      } else if (key === "ntTitle" || key === "ntMessage") {
        // Entspricht der Text dem Standard, bleibt das Feld leer (folgt der Sprache)
        const def = this._ntDefaults(f)[key === "ntTitle" ? 0 : 1];
        f[key] = el.value.trim() === def ? "" : el.value;
        const prev = this._dlg().querySelector("#ag-ntprev");
        if (prev) prev.innerHTML = this._ntPreview(f);
      } else f[key] = el.value;
      return true;
    }
    if (act === "scene") {
      f.targets = el.value ? [el.value] : [];
      return true;
    }
    if (act === "nt-tgt-add") {
      if (el.value && /^notify\.[a-z0-9_]+$/.test(el.value) && !(f.ntTargets || []).includes(el.value)) f.ntTargets = [...(f.ntTargets || []), el.value];
      this.renderEditor();
      return true;
    }
    if (act === "nt-click") {
      f.ntClick = el.value === "log" ? null : el.value;
      this.renderEditor();
      return true;
    }
    if (act === "nt-vol") {
      f.ntVolume = Number(el.value) / 100;
      el.closest(".ag-ef-range").querySelector(".ag-ef-val").textContent = `${el.value} %`;
      return true;
    }
    if (act === "pvol") {
      f.volumes = { ...(f.volumes || {}), [el.dataset.ent]: Number(el.value) / 100 };
      el.closest(".ag-ef-range").querySelector(".ag-ef-val").textContent = `${el.value} %`;
      return true;
    }
    if (act === "volume") {
      f.volume = Number(el.value) / 100;
      el.closest(".ag-ef-range").querySelector(".ag-ef-val").textContent = `${el.value} %`;
      return true;
    }
    if (act === "opt") {
      const key = el.dataset.key;
      f.opts[key] = el.tagName === "SELECT" ? el.value : Number(el.value);
      const val = el.closest(".ag-opt")?.querySelector(".ag-ef-val");
      if (val) val.textContent = this._optText(key, f.opts[key]);
      return true;
    }
    if (act === "df") {
      if (el.hasAttribute("data-bool")) return true;
      const type = el.dataset.type;
      const key = el.dataset.key;
      if (el.type === "range") {
        f.data[key] = Number(el.value);
        const val = el.closest(".ag-ef-range")?.querySelector(".ag-ef-val");
        if (val) val.textContent = el.value;
      } else if (type === "number" || type === "color_temp") f.data[key] = el.value === "" ? "" : Number(el.value);
      else f.data[key] = el.value;
      return true;
    }
    return false;
  }
}
