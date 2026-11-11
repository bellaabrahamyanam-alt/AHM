# Interfaces between the domains (`ahm/map`), version 1.5

This file is the contract. **Only the owner (the human) can change it**, through a proposal (`DOMAINS.md`). Agents read it, follow
it, and never edit it. A name, signature, event, endpoint or file format that is listed here may not be renamed, removed or
reinterpreted by any agent.

**Status (step 2 done):** I-1, I-2 and I-3 are implemented. The sidebar and the map no longer call each other: they use only
`window.AHM` (`app/js/ahm.js`, `app/js/map/map.js`). Version 1.1 added, during step 2, the items marked **[1.1]** below because the
refactor needed them; **the owner confirmed them on 2026-11-06**. Version 1.2 (2026-11-06) implements proposal 001: `run(options)`. Version 1.3 (2026-11-06, step 4, requested by the owner for the campaigns feature) adds I-5 (optional features). Version 1.4 (2026-11-07, proposal 003, approved) adds I-6 (the state manager `AHM.state`). The roll-out of I-6 is finished (tasks 002-004 merged, 2026-11-08): Known violation 1 is closed. Version 1.5 (2026-11-08, proposal 010, approved) adds I-7 (icons), I-8 (types dictionary) and I-9 (shapes) and the items marked **[1.5]** in I-1 to I-4. They are built by tasks 010-014 (`tasks/README.md`), so `contract.test.js` accepts them but does not require them yet. See "Known violations" for what is still open.

---

## I-1 Data ↔ front end (HTTP and files). Provider: **data**. Consumers: **core** (loading), **sidebar**, **map** (overlays only)

### Endpoints
The front end never builds URLs by itself; it reads them from `AHM_CONFIG.url` (set by `config.js` for the dev server, by the
forum controller through `window.AHM_BACKEND` in production). Names are fixed:

- Read (GET): `places`, `notesIndex`, `note(place, id)`, `languages`, `overlays`, `overlayImage(o)`, `layers`,
  `layerNotesIndex`, `categories`; **[1.5]** `types`, `shapes`.
- Write (POST, JSON unless noted): `save`, `languageSave`, `overlaySave`, `overlayUpload(id)` (multipart), `overlayDelete`,
  `layerSave`, `layerDelete`, `categorySave`; **[1.5]** `typeSave`, `typeDelete`, `shapeSave`, `shapeDelete` (`{ id }`; the sidebar deletes a border with it).
- Permission flags in config: `canEdit`, `loggedIn`, `loginUrl`, `canOverlay`, `canLanguage`, `canLayerAdmin`; **[1.5]** `canTypeAdmin`.
- Errors: HTTP 4xx with `{ "error": "<message>" }`; 400 for invalid input, 403 for no permission.

### Request bodies (the keys the front end may send)
- `save`: one of `place_add`, `place_update`, `note_add`, `note_update`, as implemented in `service/store.php`.
- `languageSave`: `{ code, name, native, edit? }` (`edit: true` changes the names of an existing code; the code never changes).
- `layerSave`: `layer_add`, `layer_update`, `layer_members` (`{ id, add?, remove?, order? }`), `layer_note_add`,
  `layer_note_update`. `categorySave`: `{ id?, names: [{ lang, name }] }`. **[1.5]** `layer_members` also accepts `add_shapes` and `remove_shapes` (I-9); `typeSave` and `typeDelete` are described in I-8, `shapeSave` (`shape_add`, `shape_update`, `shape_delete`) in I-9.
- Exact validation rules: `service/store.php` = `dev/save-handler.js` = `tests/fixtures/rules.json` (one table, checked by tests).

### File formats (owned by **data**; the front end only reads them through `core`)
- `places.geojson`, `notes/index.json` + `notes/<place>/<id>.md`, `languages.json`, `categories.json`, `layers.json`,
  `layer-notes/index.json`, `overlays.json`; **[1.5]** `types.json` (I-8), `shapes.geojson` (I-9).
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
| `setTypes(types)` **[1.5]** | the types dictionary (I-8) as the sidebar loaded it; the map draws points, lines and areas from it |
| `getSymbols()` **[1.5]** | `[{ name, label }]`: the point symbols the map can draw (the sidebar offers them in the type editor); read only |
| `setShapes(featureCollection)` **[1.5]** | the lines and areas to draw now. Feature properties: `id, name, type_code`. Replaces everything. |
| `hideShape(id \| null)` **[1.5]** | hide one shape while it is being edited (`null` shows all) |
| `highlightShape(id \| null)` **[1.5]** | draw one shape as selected; the sidebar holds the selection and tells the map (no new state key) |
| `drawShape({ geometry: 'line' \| 'area', type_code, coords? }, onChange) → { getGeometry(), setType(code), remove() }` **[1.5]** | the interactive editor for a line or an area; `coords` edits an existing shape; `onChange(geometry \| null)` |
| `showMenu({ lon, lat }, { title?, actions: [{ id, icon, label }] })` **[1.5]** | a small menu at a point; `icon` is a name of I-7, `label` is the tooltip and the `aria-label`; one menu at a time |
| `hideMenu()` **[1.5]** | close the menu |
| `previewShape(id, { color?, opacity? } \| null)` **[1.5]** | show a colour or an opacity of a shape before it is saved; `null` puts the saved look back |
| `showPreview(geometry \| null)` **[1.5]** | a blue draft outline of a search result, shown before it is added |
| `isDrawing()` **[1.5]** | `true` while the drawing tool is active; read only |

### Events, emitted by the map (`AHM.on(name, handler)`), handled by the sidebar
| Event | Payload | When |
|---|---|---|
| `map:ready` | none | the map and its layers exist |
| `place:click` | `{ id }` | single click on a place symbol or label. The map never moves. |
| `place:dblclick` | `{ id }` | double click on a place; the map has cancelled its own zoom; the sidebar decides (it calls `AHM.map.focusPlace(id)`) |
| `map:click` | `{ lon, lat, name?, shapes? }` | click on the map that is not on a place (`name` = the base map's label under the cursor, if any; **[1.5]** `shapes: [{ id }]` = the shapes under the cursor, areas included) |
| `map:show-controls` **[1.1]** | none | the map asks the sidebar to open the Maps fold (when an historical map is edited) |
| `shape:click` **[1.5]** | `{ id }` | click on a line or on the outline of an area (6 px tolerance) |
| `map:menu` **[1.5]** | `{ id, lon, lat }` | a button of the point menu was used (`id` = the action's id, `lon`/`lat` = the point the menu was opened at); the menu closes |
| `map:menu-close` **[1.5]** | none | the point menu closed (a button, Esc, or another menu opened) |
| `draw:finish` **[1.5]** | none | Enter or a double click while a shape is being drawn |
| `draw:cancel` **[1.5]** | none | Esc while a shape is being drawn |

### Events handled by the map (from the sidebar and from the state manager)
| Event | Payload | When |
|---|---|---|
| `sidebar:resized` | none | emitted by the sidebar: the panel was resized or collapsed (the map calls its own `resize()`) |
| `state:selected` **(I-6)** | `{ value, old }` | emitted by `AHM.state`: the selected place changed (`value` = place id or `null`). The map handles it to highlight the place; it never writes `selected`. |

Rules: handlers are synchronous and must not throw; payloads are plain data (no DOM nodes, no library objects); an event is
never renamed, only added (by proposal).

---

## I-4 Place type symbols **[1.1]**. Provider: **map** (`map/typeicons.js`). Consumer: **sidebar**

`typeIcon(type)` returns the small HTML symbol of a place type (used in lists and details) and `TYPE_STYLE` holds its shape and
colour, so the list shows the same symbol as the map. The sidebar only calls `typeIcon`; it never reads `TYPE_STYLE`. **[1.5]** `typeIcon(type)` keeps its signature and, once `AHM.map.setTypes` has been called, draws from the types dictionary (I-8).

---

## I-3 Core functions. Provider: **core**. Consumers: **sidebar**, **map**, **data's** dev tools

The names and argument lists below are stable. Core never reads the DOM or the map.

- **Dates** (`dates.js`): `isoToSec`, `secToIso`, `dateToTs`, `dateFromTs`, `dateClean`, `dateUpgrade`, `dateBounds`, `spanBounds`,
  `dateKey`, `dateOrderCheck`, `dateText`, `spanText`, `periodEndSec`, `datePeriodEnd`, `legacyToDate`, `DATE_FORMATS`.
  Same results as `service/dates.php` (tests: `tests/fixtures/dates-vectors.json`).
- **Loading and naming** (`data.js`): `getJSON`, `loadPlaces`, `loadNotesIndex`, `loadNoteBody`, `loadLayers`, `loadLayerNotes`,
  `loadCategories`, `loadLanguages`, `esc`, `norm`, `label(place, lang)`, `langName(code)`; **[1.5]** `loadTypes`, `typeLabel(type, lang)` (I-8), `loadShapes` (I-9). Everything printed into HTML goes
  through `esc`.
- **Filtering** (`search.js` and the filter rules of `layers.js`): `run(options)` (the filtered, sorted places; `options = { q, lang, sort, period }`: `q` search text, `lang` language code or `''`, `sort` `'name' | 'date'`, `period` = `[start, end)` in seconds or nulls; types and layer filters stay in `state` and `lyState`), `byDateKey`,
  `periodBounds`, `periodActive`, and the layer rules (`layerAllows`, `lyScope`, `lyHalo`, `lyNoteVisible`; **[1.5]** `layerAllowsShape(id)`, I-9).

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

## I-6 State manager (`window.AHM.state`, `app/js/state/state.js`). Provider: **state**. Consumers: everyone

The one module that holds state shared between domains. It has no DOM, no map and no sidebar code and calls no other domain. Only the
state domain writes `app/js/state/`. Spec: `proposals/003-state-manager.md` (approved), tests: `tests/js/state.test.js`.
- `AHM.state.get(key)` returns the value. `AHM.state.set(key, value)` replaces it. `AHM.state.patch(key, partial)` assigns the given fields of an object value. These three are the whole API.
- Keys (version 1.4, exactly these two; new keys only by proposal):
  - `selected`: id of the place shown now, or `null` (default). Written by the sidebar, read by the map (highlight).
  - `layers`: `{ only: Set, hide: Set, open, editing, staged, noteAll }`, the fields of the former `lyState`. `get('layers')` returns the live object; after changing its sets in place call `AHM.state.patch('layers', {})` to announce it.
- Events: `AHM.emit('state:<key>', { value, old })`. `set` emits only when the value is not identical (`!==`); `patch` always emits once (`old` = shallow copy from before the patch).
- Errors (thrown): unknown key (message contains "unknown key"); `patch` on a value that is not an object, or with a non-object argument; `set('layers', x)` with anything but an object that has the same fields.
- Rules: nobody but `state.js` assigns `AHM.state`; state events are named `state:<key>`; the sidebar and the map may use `AHM.state` besides `AHM.map`, `AHM.on` and `AHM.emit`.
- Roll-out (tasks `tasks/002`-`004`, merged 2026-11-08): core reads `lyState` from `AHM.state.get('layers')`; the sidebar writes `selected` and announces layer changes; the map listens to `state:selected`.

---

## I-7 Icons **[1.5]** (`window.AHM.icons`, `app/js/icons.js`). Provider: **shared**. Consumers: **sidebar**, **map**

One icon set for the whole interface (`DESIGN.md`, rule 2). Source: Phosphor Icons, regular weight (MIT licence, stated in the file header), pasted as SVG paths; nothing is loaded at runtime. Only the shared domain writes the file.
- `AHM.icons.svg(name, size?)` returns an inline SVG string (default size 16, drawn in `currentColor`, `aria-hidden`). An unknown name gives `''`. The string holds no caller text, so it needs no `esc`; the button around it carries `title` and `aria-label`.
- Fixed names (exactly these thirteen; a new name only by a change to `icons.js`, this file and `tests/js/icons.test.js`): `pencil`, `route-from`, `route-to`, `plus`, `close`, `trash`, `check`, `panel-left`, `panel-right` (`panel-left` drawn mirrored), `chevron-down`, `line`, `area`, `pin`.
- `app/index.html` loads `js/icons.js` after `js/ahm.js` and before every sidebar and map script. Tests: `tests/js/icons.test.js`.

## I-8 Types dictionary **[1.5]**. Provider: **data** (files, endpoints), **core** (loading), **map** (drawing). Consumer: **sidebar**

One dictionary for points, lines and areas, managed like languages and categories. Built by tasks 011 (data, core), 013 (map) and 014 (sidebar).
- File `types.json`: `{ version: 1, types: [ { code, geometry, names: [{ lang, name }], color, style } ] }`.
  - `code`: stable id, `[a-z0-9-]{1,32}`, made from the English name when the type is created, never changes. Places already point to a type by this code; place files do not change.
  - `geometry`: `point` | `line` | `area`, fixed at creation. `color`: `#rrggbb`.
  - `style` by geometry: point `{ symbol }` (a slug; an unknown slug is drawn as a circle); line `{ width 1..12, pattern solid|dashed|dotted|double|triple, opacity 0.1..1, arrow true|false }`; area `{ fill_opacity 0..0.8, outline: { width, pattern, opacity } }` (the fill uses `color`).
- Seed entries: one point type for each type that exists today (same colours and shapes as now), the line types `border` and `route`, and the area type `territory`.
- Endpoints: read `types`; write `typeSave` (`{ code?, geometry, names, color, style, edit? }`; `edit: true` changes an existing code, and geometry and code never change) and `typeDelete` (`{ code }`; 400 with the count of places and shapes that use it). Flag `canTypeAdmin` (the same people as `canLanguage` today; 403 otherwise).
- Core (I-3): `loadTypes()`, `typeLabel(type, lang)`.
- Map (I-2): `AHM.map.setTypes(types)` (the sidebar passes the loaded dictionary), `AHM.map.getSymbols()`. `typeIcon(type)` (I-4) draws from the dictionary.

## I-9 Shapes **[1.5]**. Provider: **data** (files, endpoints), **core** (loading, layer rules), **map** (drawing). Consumer: **sidebar**

Lines and areas on the map (borders, routes, territories). Built by tasks 011 (data, core), 013 (map) and 014 (sidebar).
- File `shapes.geojson`: a FeatureCollection. `geometry` is `LineString` or `Polygon`; `properties`: `{ id (UUID), type_code, names: [{ lang, name }], created, updated }`. Shapes have no dates.
- The type of a shape must have the matching geometry (`line` with `LineString`, `area` with `Polygon`). Limits: at most 2000 points; a polygon ring is closed and has at least 4 coordinates; lon -180..180, lat -90..90.
- Layers: `members` in `layers.json` may hold `{ "shape": id }` besides `{ "place": id }`. `layer_members` accepts `add_shapes` and `remove_shapes` (lists of ids; an unknown id is 400). Deleting a shape removes it from every layer. The formats of places and notes do not change.
- Endpoints: read `shapes`; write `shapeSave` with `shape_add`, `shape_update`, `shape_delete` (permission `canEdit`, like places).
- Core (I-3): `loadShapes()`, `layerAllowsShape(id)` (the same Only/Hide rules as `layerAllows`).
- Map (I-2): `setShapes`, `hideShape`, `highlightShape`, `drawShape`; events `shape:click` and `map:click` with `shapes`. The selected shape is held by the sidebar and passed to the map with `highlightShape`; there is no new state key.

---

## Known violations (open; agents must not add new ones)

1. (Closed 2026-11-08: the former `lyState` is `AHM.state.get('layers')`, I-6. The numbers of the other items stay.)
2. The sidebar and the map share HTML ids by design inside the Maps fold (`#more-maps`, owned by the map); outside it neither touches
   the other's ids.
3. `app/index.html` is edited by several domains (script list: shared; the sidebar parts and the Maps fold by their domains); step 4 may need markers or a split.
4. (2026-11-10, found by the red pipeline) The code differs from three rows above; the owner decides which side changes. `drawShape` takes `{ kind: 'line' \| 'area', coords?, color? }` and returns `{ getGeometry(), count(), undo(), remove() }`. `showMenu(point, actions, title, hint)` takes the actions as the second argument. `map:menu` carries `{ action, lon, lat, name }`, not `{ id, lon, lat }`.

Contract tests for this file: `tests/js/contract.test.js` (I-1 to I-4 and I-6; the [1.5] names are accepted but not yet required), `tests/js/icons.test.js` (I-7), `tests/js/features.test.js` (I-5), `tests/js/boundaries.test.js` (the only written-down exception left there is `typeIcon`, I-4).
