# Proposal 010: UI contract for marker types, shapes, point menu and icons (INTERFACES.md v1.5)

Status: approved (the owner, 2026-11-08, in the chat: "I approve everything")
From: shared (architect). Roll-out: `tasks/006` to `tasks/014`. Owner's requests of 2026-11-08: points 15 (point menu), 16 (marker dictionary), 19 and 20 (borders and routes, reusable styles, territories with names), 21 (clusters), 18 (icon buttons).
Owner's decisions: double click on a place marker works like the list; borders are lines OR filled areas, chosen per shape; shapes have NO dates; styles are reusable and editable (colour, line weight and pattern, area fill); an area has a name shown on the map.

## Current text
I-1 has no types, shapes or style endpoints; place types are fixed in `map/typeicons.js` (I-4). I-2 has no shapes and no point menu. There is no shared icon set.

## New text

### A. Test file for the sidebar domain (task 006)
`tests/js/sidebar.test.js`, owned by sidebar (`tools/domains.json`), placeholder with comments only; same method as proposal 009.

### B. Icons (new I-7). Provider: shared (`app/js/icons.js`). Consumers: sidebar, map
`AHM.icons.svg(name, size?)` returns an inline SVG string (default size 16, `currentColor`). Fixed names: `pencil`, `route-from`, `route-to`, `plus`, `close`, `trash`, `check`, `panel-left`, `panel-right`, `chevron-down`, `line`, `area`, `pin`. New names only by a change to this file. Source: Phosphor Icons (MIT), pasted as SVG paths, no network at runtime. Everything printed into HTML by the caller still goes through `esc` where text is involved.

### C. Types dictionary (new I-8). Provider: data (files, endpoints), core (loading), map (drawing). Consumers: sidebar
One dictionary for points, lines and areas, managed like languages and categories.
- File `types.json`: `{ version: 1, types: [ { code, geometry, names: [{ lang, name }], color, style } ] }`.
  - `code`: stable id, `[a-z0-9-]{1,32}`, made from the English name on creation, never changes. Places already point to a type by this code; place files do not change.
  - `geometry`: `point` | `line` | `area`, fixed at creation.
  - `color`: `#rrggbb`.
  - `style` by geometry: point `{ symbol }` (slug; unknown slug is drawn as a circle); line `{ width 1..12, pattern solid|dashed|dotted|double|triple, opacity 0.1..1, arrow true|false }`; area `{ fill_opacity 0..0.8, outline: { width, pattern, opacity } }` (the fill uses `color`).
- Seed entries: one point type per type that exists today (same colours and shapes as now), plus line types `border` and `route`, and area type `territory`.
- Endpoints: read `types`; write `typeSave` (`{ code?, geometry, names, color, style, edit? }`; `edit: true` changes an existing code, geometry and code never change), `typeDelete` (`{ code }`; 400 with the count of places and shapes that use it). Flag `canTypeAdmin` (same people as `canLanguage` today; 403 otherwise).
- Core (I-3): `loadTypes()`, `typeLabel(type, lang)`.
- Map: `AHM.map.setTypes(types)` (the sidebar passes the loaded dictionary), `AHM.map.getSymbols()` returns `[{ name, label }]` (the symbols the map can draw; the sidebar offers them in the editor). `typeIcon(type)` (I-4) keeps its signature and now draws from the dictionary.

### D. Shapes (new I-9). Provider: data (files, endpoints), core (loading, layer rules), map (drawing). Consumers: sidebar
- File `shapes.geojson`: FeatureCollection; `geometry` is `LineString` or `Polygon`; `properties`: `{ id (UUID), type_code, names: [{ lang, name }], created, updated }`. No dates.
- A shape's type must have the matching geometry (`line` with `LineString`, `area` with `Polygon`). Limits: at most 2000 points; a polygon ring is closed and has at least 4 coordinates; lon -180..180, lat -90..90.
- Layers: `layers.json` `members` may hold `{ "shape": id }` besides `{ "place": id }`. `layer_members` accepts `add_shapes` and `remove_shapes` (lists of ids; unknown id is 400). Deleting a shape removes it from every layer. Places and notes formats do not change.
- Endpoints: read `shapes`; write `shapeSave` with `shape_add`, `shape_update`, `shape_delete` (permission `canEdit`, like places).
- Core (I-3): `loadShapes()`, `layerAllowsShape(id)` (same Only/Hide rules as `layerAllows`).

### E. I-2 additions (map commands and events)
- Commands: `setShapes(featureCollection)` (feature properties `id, name, type_code`; replaces all), `hideShape(id | null)`, `highlightShape(id | null)`, `drawShape({ geometry: 'line' | 'area', type_code, coords? }, onChange) → { getGeometry(), setType(code), remove() }` (interactive editor; `coords` edits an existing shape; `onChange(geometry | null)`), `showMenu({ lon, lat }, { title?, actions: [{ id, icon, label }] })`, `hideMenu()`, plus `setTypes` and `getSymbols` from C.
- Events from the map: `shape:click` `{ id }` (click on a line or on an area outline, 6 px tolerance), `map:menu` `{ id, lon, lat }` (a button of the point menu was used; the menu closes). `map:click` gets an optional `shapes: [{ id }]` (shapes under the cursor, areas included); it is still emitted for every click that is not on a place.
- `icon` in a menu action is a name of I-7; `label` is the tooltip and the `aria-label`.

### F. UI rules (become `DESIGN.md`, task 009)
1. Hover and selected styles apply to the element itself only, never to the children or siblings of a container.
2. One icon family (I-7). Icon-only buttons have `title` and `aria-label`. Text buttons only for primary actions (Add note, Save, Cancel, Add layer).
3. Opening, closing or selecting never moves content that is not part of the change; scroll positions are kept.
4. A form shows Save and Cancel only while it is open; Save is disabled until the input is valid.
5. A type is shown as its marker only (the name is the tooltip).
6. One shadow level, nested radii, transitions 120-180 ms, `prefers-reduced-motion` turns them off.
7. Map: selected = larger marker with a white outline and a soft shadow, no accent colour; hover = about 15% lighter.

## Who is affected
All domains. Data (storage), core (loading, layer rules), map (drawing, menu), sidebar (editors, lists), shared (contract, icons, design rules). State is not affected: the selected shape is held by the sidebar and passed to the map with `highlightShape`.

## Migration
Tickets in this order (`tasks/README.md`): 006 and 009 (shared), then 010 and 011, then 012 and 013, then 014. Existing places, notes, layers, languages and categories stay valid without conversion.

## Tests
`tests/js/contract.test.js` accepts the new names before they exist and is tightened after tasks 010, 011 and 013 are merged (owner decides). `tests/fixtures/rules.json` gets the type and shape rules (data). Each task lists its own tests.

## Not in this proposal
Dates on shapes, import and export of GeoJSON, snapping to places, per-shape colour overrides, labels along lines beyond a simple line label.
