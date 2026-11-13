# Info für Device Panel: Dashboard-Karten, so wie in Alarmageddon 1.34.0

Diese Datei ist für eine Claude-Code-Session im Repository `ha-device-panel` gedacht. Sie beschreibt, wie Alarmageddon seit 1.34.0
Karten für jedes Dashboard mitliefert, was dabei schiefgehen kann und wie es getestet ist. Quelle der Wahrheit ist der Code in
`Diegofuego871/ha-alarmageddon`: `custom_components/alarmageddon/panel/card.js`, `panel.py` (`_register_cards`, `CARD_URL`),
`tests/test_dashboard_card.py`, `tests/panel/sim/card-sim.html`, `tests/panel/suites/card-e2e.mjs`. Namen, Texte und Entitäten unten sind
die von Alarmageddon und müssen für Device Panel angepasst werden; was Device Panel zeigen soll, ist vorher mit dem Nutzer zu klären.

Stand: Alarmageddon 1.34.0 (2026-11-13). Der Nutzer hat bestätigt, dass die Karten in seinem Home Assistant erscheinen und laufen. Eine
Prüfung der Darstellung im dunklen Thema gegen ein echtes Home Assistant steht aus (siehe "Offen").

## 1. Was die Karten sind

- Eine JavaScript-Datei (ES-Modul) der Integration, die zwei eigene Elemente (`alarmageddon-card`, `alarmageddon-status-card`) anmeldet und
  in `window.customCards` einträgt. Dadurch erscheinen sie im Dialog "Karte hinzufügen" mit Vorschau; der Nutzer richtet nichts ein.
- Die Karten laufen in der Oberfläche von Home Assistant (nicht im iframe des Panels). Sie lesen nur Entitäten aus `hass.states` und
  `hass.entities` und rufen Dienste mit `hass.callService`. Kein WebSocket-Befehl des Panels, kein eigenes Token, kein eigener Server-Pfad
  für Daten.
- Warum das wichtig ist: Das Panel verlangt Administratorrechte (`require_admin=True`), die Karten nicht. Jede Person, die das Dashboard
  sieht, kann sie nutzen. Alles, was sie dürfen, müssen daher Entitäten und Dienste von HA hergeben, mit der Rechteprüfung von HA.
  Was heute nur ein WebSocket-Befehl des Panels kann, braucht für die Karte einen Dienst oder eine Entität (bei Alarmageddon: Dienst
  `alarmageddon.acknowledge` und Entität `sensor.<anlage>_status`).

## 2. Registrierung (Python)

```python
# const.py
PANEL_STATIC_URL_PATH = "/<domain>_panel"      # derselbe Pfad, der das Panel ausliefert
CARD_URL = f"{PANEL_STATIC_URL_PATH}/card.js?v={PANEL_VERSION}"   # ?v= ist der Cache-Buster, bei jeder Änderung an den Dateien erhöhen

# panel.py, am Ende der Panel-Registrierung (der statische Pfad ist dann schon angemeldet)
def _register_cards(hass):
    if hass.data.get(DATA_CARDS):
        return
    try:
        frontend.add_extra_js_url(hass, CARD_URL)   # ES-Modul, nicht es5=True
        hass.data[DATA_CARDS] = True
    except Exception:  # noqa: BLE001 - die Karten sind Zusatz
        _LOGGER.exception("The dashboard cards could not be registered; ...")
```

Geprüft im HA-Quellcode (2026.2): `frontend.add_extra_js_url(hass, url, es5=False)` legt die URL in `DATA_EXTRA_MODULE_URL`; das Frontend
bindet sie beim Laden der Seite als Modul ein. Folgen:

- `manifest.json` braucht `frontend` in `dependencies` (bei Alarmageddon schon wegen des Panels).
- Die Datei muss ohne Anmeldung auslieferbar sein: `async_register_static_paths([StaticPathConfig(pfad, ordner, True)])` liefert den
  Ordner des Panels. Ein Modul, das das Frontend per `<script>` holt, trägt kein Token. Deshalb darf die Datei nichts Geheimes enthalten.
- Statische Pfade lassen sich nicht abmelden: nur einmal pro Lauf von HA registrieren (Merker in `hass.data`).
- Die Registrierung ist Zusatz und darf die Integration nie mitnehmen: in `try/except`, Fehler ins Log, Rest läuft weiter. Test dazu
  (`test_a_failing_card_registration_never_stops_...`).
- In Tests fehlt `hass.data["frontend_extra_module_url"]`, weil das Frontend nicht geladen ist: den Satz vorher als `set()` anlegen
  (`hass.data["frontend_extra_module_url"] = set()`), sonst `KeyError`.

## 3. Die Datei `card.js`

Aufbau, so wie in Alarmageddon (nicht neu erfinden, sondern den Code dort lesen):

- **Gleiche Dateien wie das Panel wiederverwenden.** `card.js` liegt im selben Ordner und importiert `strings.js`, `styles.js`,
  `common.js` des Panels. Damit sehen Karte und Panel gleich aus und sprechen gleich. Der Cache-Buster muss mit:

  ```js
  const V = new URL(import.meta.url).search;                  // "?v=138"
  const { pickLang, translate } = await import(`./strings.js${V}`);
  const { CSS } = await import(`./styles.js${V}`);
  ```

  Ohne `V` holt der Browser nach einem Update alte Nebendateien. Top-level `await` im Modul ist in aktuellen Browsern und der Companion
  App in Ordnung.

- **Shadow-DOM, Panel-CSS hinein.** `this.attachShadow({mode: "open"})`, `<style>${CSS}${CARD_CSS}</style>`. Das CSS des Panels liest
  Variablen von HA (`--primary-background-color`, `--card-background-color`, `--primary-text-color` …) und folgt so dem Thema des
  Dashboards. `CARD_CSS` überschreibt, was nur im Panel passt: `:host { display: block; height: auto; background: transparent }`
  (das Panel ist eine ganze Seite, die Karte ein Stück davon), Rand, Hintergründe, `position` der Meldung.
- **Pflichtmethoden einer Karte:** `setConfig(config)` (wirft bei fehlender Pflichtangabe), `set hass(hass)`, `getCardSize()`,
  dazu `static getStubConfig(hass)` (Vorgabe im Auswahldialog, wählt die erste passende Entität) und `static getConfigForm()`
  (Editor aus einem Schema von HA, Beschriftung über `computeLabel`, Texte aus `strings.js`). `getGridOptions()` für das neue Raster.
- **Nur neu zeichnen, wenn sich etwas ändert.** HA ruft `set hass` bei jeder Zustandsänderung irgendwo im System auf. Alarmageddon bildet
  eine Signatur aus den genutzten Entitäten (`last_updated`, `state`), Sprache und Admin-Flag und zeichnet nur bei Änderung neu. Ohne das
  flackert die Karte und verliert Fokus und Eingaben.
- **Entitäten finden über die Registrierung.** `hass.entities[id].device_id` und `translation_key` (Eintrag `platform === "<domain>"`)
  zeigen, welche Entitäten zum selben Gerät gehören. Keine Entitäts-IDs aus Namen raten (der Nutzer kann sie umbenennen).
- **Texte:** `strings.js` mit denselben Schlüsseln in Englisch und Deutsch. Die Karte nimmt die Sprache aus `hass.locale.language`;
  für Texte, die HA ohne `hass` abfragt (Name im Auswahldialog, Editor), liest `docLang()` `document.querySelector("home-assistant").hass`.
- **Anmelden:**

  ```js
  if (!customElements.get("<domain>-card")) customElements.define("<domain>-card", MeineKarte);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((c) => c.type === "<domain>-card")) {
    window.customCards.push({ type: "<domain>-card", name, description, preview: true, documentationURL });
  }
  ```

  Die Abfrage vor `define` verhindert den Fehler, wenn die Datei zweimal geladen wird (zum Beispiel zusätzlich als Ressource).

- **Dienste statt Befehle:** `hass.callService(domain, service, {entity_id, ...})`. Einen Fehler der Prüfung (falscher Code, gesperrt)
  liefert HA als Ausnahme mit Text in der Sprache des Nutzers: ihn anzeigen (Toast oder Meldung im Fenster), nie selbst übersetzen.
- **Sensible Eingaben (Code):** ein `<dialog>` im Shadow-DOM, Feld `type="password"`, beim Schliessen leeren (`close`-Ereignis **und**
  nach Erfolg sofort, `_wipe`). Ein Code darf nie in der Seite stehen bleiben und nie im Log erscheinen. Nie selbst prüfen: HA prüft
  (Alarmageddon: `ServiceValidationError` mit `invalid_code` und `code_locked`).
- **Panel öffnen:** `history.pushState(null, "", "/<url_path>")`, danach `window.dispatchEvent(new CustomEvent("location-changed", {bubbles: true, composed: true}))`.
  Den Pfeil nur zeigen, wenn `hass.user.is_admin` (das Panel ist für andere nicht erreichbar).
- **Aufräumen:** Intervalle (Countdown) in `connectedCallback` starten und in `disconnectedCallback` stoppen; `ResizeObserver` ebenso.

## 4. Fallstricke, die wir erlebt haben

1. **Die Karte fehlt im Auswahldialog.** Beim ersten Versuch des Nutzers (Companion App, iOS) zeigte die Suche nach "Alarmageddon" nur
   "Manuell". Nach den Schritten unten ging es; die genaue Ursache wurde nicht festgestellt (Vermutung: Neustart oder Cache). Der
   Auswahldialog kennt nur Module, die beim **Laden der Seite** eingebunden wurden. Prüfreihenfolge:
   1. HACS zeigt die neue Version, und HA wurde **neu gestartet** (ein Neuladen der Integration reicht nicht).
   2. `/<domain>_panel/card.js?v=<Zahl>` im Browser öffnen: muss Quelltext zeigen (sonst 404: Registrierung oder Pfad).
   3. Browser hart neu laden (Strg+Shift+R); in der App unter Einstellungen › Fehlerbehebung › "Frontend-Cache zurücksetzen", App ganz
      schliessen und neu öffnen.
   4. Karte als YAML (`type: custom:<domain>-card`) einfügen: "Das Custom-Element existiert nicht" heisst, das Modul wurde nicht geladen.
   5. Notfalls als Ressource eintragen (Einstellungen › Dashboards › Ressourcen, Typ JavaScript-Modul). Das wäre ein Hinweis, dass der
      Mechanismus der Integration das Problem ist.
   Das gehört in die README (Abschnitt "Dashboard cards"), damit Nutzer es selbst finden.
2. **Zeichnen vor der Grösse.** Elemente mit Gleitkapsel (Segmentleiste) brauchen die Breite ihrer Knöpfe. Erst in `connectedCallback`
   (Element hat eine Grösse) und bei jedem `ResizeObserver`-Ereignis die Kapsel setzen.
3. **Meldungen und Fenster im Shadow-DOM:** `position: fixed` und `<dialog>` wirken in einer Karte anders als in einer Seite. Das
   `showModal()`-Fenster legt sich über die ganze Oberfläche von HA und funktioniert, braucht aber `margin: auto` (siehe `CARD_CSS`).
4. **Entitätsdienst im Test:** Den Zustandsautomaten nicht aus demselben Task erneut abwarten (Verklemmung); eine Prüfung nach der
   Code-Abfrage wiederholen, denn der Zustand kann sich während der Prüfung ändern (Alarmageddon: Alarm endet, während der Code
   geprüft wird; Test `test_acknowledge_is_refused_when_the_alarm_ended_during_the_code_check`).
5. **Nur-lesende Nutzer:** `hass.callService` scheitert für Nutzer ohne Recht mit "Unauthorized". Im Test mit einem Nutzer ohne
   Administratorrechte prüfen, dass die Karte den Fehler zeigt und nicht still scheitert.

## 5. Tests (so weit Alarmageddon sie hat)

- **Python (`tests/test_dashboard_card.py`):** Dienst für Nutzer ohne Administratorrechte, abgelehnt ohne Voraussetzung, Code und
  Sperre, Registrierung (`CARD_URL` in `frontend_extra_module_url`, Datei auslieferbar), scheiternde Registrierung nimmt nichts mit.
- **Nachbau eines Dashboards (`tests/panel/sim/card-sim.html`):** eine Seite, die `hass` nachbaut (`states`, `entities`, `locale`,
  `user`, `callService`) und die Karte einbindet; Parameter für Sprache, Thema, Administrator, Code, fehlende Entität.
- **Playwright (`tests/panel/suites/card-e2e.mjs`):** je Sprache, Desktop und Handy (390 × 844), echte Klicks: Zustände, Modusleiste,
  Code-Fenster (falscher Code, Abbrechen, Code nicht mehr in der Seite), Alarmband, Pfeil nur für Administratoren, fehlende Entität.
- **Mutationsprobe:** jede Schutzmassnahme (Code nötig, Administrator für den Pfeil, Code leeren) hat eine Zeile in
  `scripts/mutation_check.py`.
- **Was die Tests nicht zeigen:** Dass HA die Datei wirklich einbindet und der Auswahldialog sie anzeigt, prüft nur ein echtes Home
  Assistant. Nach jeder Änderung an der Registrierung dort einmal ansehen.

## 6. Sicherheit

- Karten sind für alle Nutzer sichtbar: Nie Tokens, Schlüssel, Codes, Adressen oder Namen aus dem Panel in die Datei oder in eine Entität
  schreiben, die Nutzer ohne Recht nicht sehen sollen.
- Was die Karte darf, bestimmt der Dienst auf dem Server, nie die Karte (die Oberfläche lässt sich umgehen). Ausgeblendete Knöpfe
  ersetzen keine Prüfung.
- Einstellungen, die Karten betreffen (bei Alarmageddon: "Quittieren verlangt den Code", Standard aus), gehören in die Sicherung und
  haben Tests.

## 7. Ablauf der Lieferung (Regeln des Nutzers aus Alarmageddon)

- Neue Funktion = neue Minor-Version, `PANEL_VERSION` erhöhen (Cache-Buster), CHANGELOG und README in zwei Sprachen, Bilder neu.
- Vor Änderungen am Aussehen ein Mockup (mehrere Varianten, Desktop und Handy, Empfehlung); der Nutzer entscheidet visuell. Für die
  Karten war es `docs/mockups/dashboard-karte-v1/`: Variante A (zwei einzelne Karten) wurde gewählt.
- Offene Entscheide mit Auswirkungen vorher stellen: Wer darf was mit der Karte? (Bei Alarmageddon: Quittieren darf jede Person, der
  Administrator bestimmt, ob ein Code nötig ist; das Panel bleibt nur für Administratoren.)

## Offen (Stand 2026-11-13)

- Dunkles Thema (seit 1.34.1 gelöst): Das Stylesheet des Panels nutzt `:host([dark])` (Alarmband). Die Karte setzt das Attribut in
  `set hass` mit `this.toggleAttribute("dark", Boolean(hass.themes?.darkMode))` und nimmt `darkMode` in die Signatur auf, sonst
  zeichnet sie bei einem Wechsel nicht neu. Das Panel selbst liest die gezeichnete Farbe (`_syncDark`), weil seine Fläche nicht
  transparent ist. Der Nachbau liefert `themes.darkMode` (`card-sim.html`), der Test steht in `card-e2e.mjs`. Im echten dunklen
  Dashboard noch nicht angesehen.
- Ursache des anfangs fehlenden Eintrags im Auswahldialog: nicht bestätigt (siehe "Fallstricke" 1).
