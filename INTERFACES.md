# Interfaces between the domains (`ahm/map`), version 1.3

This file is the contract. **Only the owner (the human) can change it**, through a proposal (`DOMAINS.md`). Agents read it, follow
it, and never edit it. A name, signature, event, endpoint or file format that is listed here may not be renamed, removed or
reinterpreted by any agent.

**Status (step 2 done):** I-1, I-2 and I-3 are implemented. The sidebar and the map no longer call each other: they use only
`window.AHM` (`app/js/ahm.js`, `app/js/map/map.js`). Version 1.1 added, during step 2, the items marked **[1.1]** below because the
refactor needed them; **the owner confirmed them on 2026-11-06**. Version 1.2 (2026-11-06) implements proposal 001: `run(options)`. Version 1.3 (2026-11-06, step 4, requested by the owner for the campaigns feature) adds I-5 (optional features). See "Known violations" for what is still open.

---

## I-1 Data ↔ front end (HTTP and files). Provider: **data**. Consumers: **core** (loading), **sidebar**, **map** (overlays only)

### Endpoints
The front end never builds URLs by itself; it reads them from `AHM_CONFIG.url` (set by `config.js` for the dev server, by the
forum controller through `window.AHM_BACKEND` in production). Names are fixed:

- Read (GET): `places`, `notesIndex`, `note(place, id)`, `languages`, `overlays`, `overlayImage(o)`, `layers`,
  `layerNotesIndex`, `categories`.
- Write (POST, JSON unless noted): `save`, `languageSave`, `overlaySave`, `overlayUpload(id)` (multipart), `overlayDelete`,
  `layerSave`, `layerDelete`, `categorySave`.
- Permission flags in config: `canEdit`, `loggedIn`, `loginUrl`, `canOverlay`, `canLanguage`, `canLayerAdmin`.
- Errors: HTTP 4xx with `{ "error": "<message>" }`; 400 for invalid input, 403 for no permission.

### Request bodies (the keys the front end may send)
- `save`: one of `place_add`, `place_update`, `note_add`, `note_update`, as implemented in `service/store.php`.
- `languageSave`: `{ code, name, native, edit? }` (`edit: true` changes the names of an existing code; the code never changes).
- `layerSave`: `layer_add`, `layer_update`, `layer_members` (`{ id, add?, remove?, order? }`), `layer_note_add`,
  `layer_note_update`. `categorySave`: `{ id?, names: [{ lang, name }] }`.
- Exact validation rules: `service/store.php` = `dev/save-handler.js` = `tests/fixtures/rules.json` (one table, checked by tests).

### File formats (owned by **data**; the front end only reads them through `core`)
- `places.geojson`, `notes/index.json` + `notes/<place>/<id>.md`, `languages.json`, `categories.json`, `layers.json`,
  `layer-notes/index.json`, `overlays.json`.
- Dates: `null` or `{ fmt, ts, mode: exact|approx|range, ts_to }`; every `ts` is ISO 8601 / RFC 3339 text in UTC with `Z`.
- Ids are UUID text. Names and descriptions are lists of `{ lang, name|text }`; `lang` comes from `languages.json`.

---

## I-2 Sidebar ↔ map: the `window.AHM` namespace. Provider: **map** (commands) and **sidebar** (events)

The sidebar and the map talk only through this object. Neither side may touch the other's variables, DOM ids or library objects
(no `map.*`, no `maplibregl.*` in the sidebar; no `show()`, `lyState`, `cur`, `tab()` in the map).

### Commands, provided by the map (`AHM.map.*`), called by the sidebar
| Call | Meaning |
|---|---|
| `setFeatures(featureCollection)` | the places to draw now. Feature properties: `id, name, type, type_code, dates, halo`. Replaces everything. |
| `hidePlace(id \| null)` | hide one place's symbol while its pin is being edited (`null` shows all) |
| `focusPlace(id)` | move the map to the place (zoom at least 8; the place must be among the features last set). The only call that moves the map to a place. |
| `focusPoint({lon, lat}, zoom)` **[1.1]** | move the map to a point (a result of the place search) |
| `fitTo([[lon, lat], …])` | zoom the map to these points (the "Fit map" button) |
| `fitRoute(coords)` / `setRoute(geometry \| null)` | draw or clear the route line |
| `setRouteMarkers({ a, b })` | start and end markers (`{lon, lat}` or null) |
| `setPick({lon, lat} \| null)` | the grey "selected point" marker |
| `editPin({lon, lat}, onMove) → { getPosition(), setPosition({lon, lat}) [1.1], remove() }` | the draggable red pin used while editing a place |
| `resize()` | the panel changed size |
| `getZoom()` | current zoom (read only) |

### Events, emitted by the map (`AHM.on(name, handler)`), handled by the sidebar
| Event | Payload | When |
|---|---|---|
| `map:ready` | none | the map and its layers exist |
| `place:click` | `{ id }` | single click on a place symbol or label. The map never moves. |
| `place:dblclick` | `{ id }` | double click on a place; the map has cancelled its own zoom; the sidebar decides (it calls `AHM.map.focusPlace(id)`) |
| `map:click` | `{ lon, lat, name? }` | click on empty map (`name` = the base map's label under the cursor, if any) |
| `map:show-controls` **[1.1]** | none | the map asks the sidebar to open the Maps fold (when an historical map is edited) |

### Events, emitted by the sidebar, handled by the map
| Event | Payload | When |
|---|---|---|
| `sidebar:resized` | none | the panel was resized or collapsed (the map calls its own `resize()`) |

Rules: handlers are synchronous and must not throw; payloads are plain data (no DOM nodes, no library objects); an event is
never renamed, only added (by proposal).

---

## I-4 Place type symbols **[1.1]**. Provider: **map** (`map/typeicons.js`). Consumer: **sidebar**

`typeIcon(type)` returns the small HTML symbol of a place type (used in lists and details) and `TYPE_STYLE` holds its shape and
colour, so the list shows the same symbol as the map. The sidebar only calls `typeIcon`; it never reads `TYPE_STYLE`.

---

## I-3 Core functions. Provider: **core**. Consumers: **sidebar**, **map**, **data's** dev tools

The names and argument lists below are stable. Core never reads the DOM or the map. (One exception is still open: Known violation 1, `run()`.)

- **Dates** (`dates.js`): `isoToSec`, `secToIso`, `dateToTs`, `dateFromTs`, `dateClean`, `dateUpgrade`, `dateBounds`, `spanBounds`,
  `dateKey`, `dateOrderCheck`, `dateText`, `spanText`, `periodEndSec`, `datePeriodEnd`, `legacyToDate`, `DATE_FORMATS`.
  Same results as `service/dates.php` (tests: `tests/fixtures/dates-vectors.json`).
- **Loading and naming** (`data.js`): `getJSON`, `loadPlaces`, `loadNotesIndex`, `loadNoteBody`, `loadLayers`, `loadLayerNotes`,
  `loadCategories`, `loadLanguages`, `esc`, `norm`, `label(place, lang)`, `langName(code)`. Everything printed into HTML goes
  through `esc`.
- **Filtering** (`search.js` and the filter rules of `layers.js`): `run(options)` (the filtered, sorted places; `options = { q, lang, sort, period }`: `q` search text, `lang` language code or `''`, `sort` `'name' | 'date'`, `period` = `[start, end)` in seconds or nulls; types and layer filters stay in `state` and `lyState`), `byDateKey`,
  `periodBounds`, `periodActive`, and the layer rules (`layerAllows`, `lyScope`, `lyHalo`, `lyNoteVisible`).

---

## I-5 Optional features (`window.AHM.features`, `app/js/features.js`). Provider: **shared**. Consumers: feature domains (first: **campaigns**)

A feature is a folder `app/features/<name>/` with `main.js` (and optionally `style.css`) owned by a domain called `<name>`. It exists
only when `<name>` is in `AHM_CONFIG.features`: development: the list in `config.js` (`?features=a,b` or `?features=` in the URL change
it); forum: only what the controller sends in `AHM_BACKEND.features` (it sends nothing today, so every feature is hidden). A feature
that is not listed is not requested, not run and not visible.
- `AHM.features.register(name, init)`: called once by `main.js`; `init({ name, base })` runs after the file loaded (`base` = the feature's folder URL).
- `AHM.features.onMapReady(fn)`: `fn()` runs when the map is ready (at once if it already is).
- `AHM.features.enabled(name)`: boolean.
- A feature uses only `AHM.features`, `AHM.on/emit` (its events are named `<name>:*`), the `AHM.map` commands of I-2 and the core functions of I-3. No top-level names, CSS selectors only `.<name>-…` / `#<name>-…`, and no other domain's file mentions its name.
  `tests/js/features.test.js` enforces all of this. Loading failures and exceptions of a feature are logged and never stop the app.
- Not yet possible (proposal `proposals/002-map-extension-points.md`, pending): drawing custom layers on the map.

---

## Known violations (open; agents must not add new ones)

1. `core/layer-rules.js` holds `lyState`, which also carries sidebar state (`open`, `editing`, `staged`, `noteAll`).
2. The sidebar and the map share HTML ids by design inside the Maps fold (`#more-maps`, owned by the map); outside it neither touches
   the other's ids.
3. `app/index.html` is edited by several domains (script list: shared; the sidebar parts and the Maps fold by their domains); step 4 may need markers or a split.

Contract tests for this file: `tests/js/contract.test.js` (I-1 to I-4), `tests/js/features.test.js` (I-5), `tests/js/boundaries.test.js` (the only written-down exception left there is `typeIcon`, I-4).
