# Change log of the sidebar domain

## 2026-11-12 — Place types are a dictionary (T-025, I-8)

- **What:** More tab → "Place types" (list with markers and counts; admins: add, edit, remove, live preview); the place form and the filter chips use the dictionary; the old `PLACE_TYPES` list is gone.
- **Why:** administrators must be able to add markers (iron mine, cedar forest, sword artefact) without a code change.
- **Files:** `app/js/sidebar/{ui,placeform,layers,routes}.js`, `app/index.html`, `app/css/sidebar.css`, `tests/js/sidebar.test.js`, `tests/js/lib/ctx.js`
- **How to verify:** `node tests/js/run.js`. By hand: as an administrator add "Iron mine" (pickaxe), then pick it in a place.
- **Follow-ups:** none.

## 2026-11-14 — Custom symbols for place types (T-025)

- **What:** Place types editor: symbol list ends with "Custom (SVG path)…"; the admin chooses an SVG file (button) and the paths, rectangles, circles, ellipses and polygons of it become the symbol (`svgToPath` in `placeform.js`); the path and box can still be edited under "Advanced" or a whole `<svg>` pasted there; Save stays off until the path is valid; live preview. The path limit is 20000 characters (real icons are long).
- **Why:** the list of 15 symbols is too small (iron mine, cedar forest, sword artefact, ...).
- **Files:** `app/js/sidebar/ui.js`
- **How to verify:** By hand (not checked in a browser here): add a type, pick Custom, paste an icon path, check the preview and the marker on the map.
- **Follow-ups:** `style.path` and `style.box` are an addition to `interfaces/I-8` (see `TODO.md` T-026).

One entry per change, newest last: date, what, why, files, how to verify, open follow-ups. Only the sidebar domain appends here (DOMAINS.md, rule 7). The history before 2026-11-06 is in the legacy `AGENT_CHANGES.md` (entries #1-#26), which is now read-only.

---

## 2026-11-06 — #1 The sidebar passes the search options to `run()`; fix: details clicks in the layer list

### What
- `sidebar/ui.js`: `searchOptions()` builds `{ q, lang, sort, period }` from the sidebar fields; `update()` and "Fit map" call `run(searchOptions())` (proposal 001).
- Bug fix `sidebar/layers.js`: a click on a button inside the open layer's details (for example "Choose places") also reached the layer list's own click handler after the details had been re-rendered; the handler no longer found `#lyDetail` among the ancestors of the detached button and called `lyToggleFilter("editplaces")`, which threw a TypeError (visible only in the console). The handler now asks `event.composedPath()`. It was found by the updated browser test.

### Verify
`node tests/js/run.js`.

---

## 2026-11-07 — #2 Sidebar publishes selected place and layer changes to AHM.state (task 003)

### What
- `sidebar/ui.js`: wherever `cur` is set (show, closeDetail, editPlace), also `AHM.state.set('selected', cur ? cur.id : null)`. The sidebar never reads `selected` back.
- `sidebar/layers.js`: after in-place changes to the `lyState` sets or staged members (`lyToggleFilter`, `lyClearFilters`, `lySet` cleanup of deleted layers, `lyStartEdit`, `lyStopEdit`, `lyToggleMember`), call `AHM.state.patch('layers', {})` so listeners see `state:layers`.

### Why
Task 003 / I-6: the map (and others) read shared selection and layer filter state from `AHM.state`, not from sidebar internals.

### Files
- `app/js/sidebar/ui.js`
- `app/js/sidebar/layers.js`
- `changes/sidebar.md`

### Verify
`node tests/js/run.js` (includes the gated "sidebar publishes: …" tests in `tests/js/layers.test.js`).

### Open follow-ups
None for this task. Known violation 1 in INTERFACES.md closes when task 002 is also merged.
