# Change log of the sidebar domain

No entries yet.

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

---

## 2026-11-08 — #3 Sidebar fixes: hover isolation, no dblclick selection, flicker, empty forms, category rename (task 007)

### What
- `app/css/sidebar.css`: scoped `li:hover b` colour change to `li[data-id]:hover > .t > b` and `li[data-lid]:hover > .t > b` (direct child path), so hovering a list row no longer re-colours `<b>` inside nested note cards. Added `user-select: none` on `#list li[data-id]` and `#lyList li[data-lid]` to suppress text selection on fast double-click. Added `.cat-renaming` rule (blue outline) to mark the row being renamed.
- `app/js/sidebar/ui.js`: clear `#detail` content (`innerHTML = ''`) before `placeDetail()` in `show()`, so no frame shows the previous place name after clicking another place. Added `mousedown` handler on `#list` that calls `e.preventDefault()` on `e.detail > 1` to suppress browser text selection on double-click (dragging still selects). Language form: `#lgOpen` button shows `+ Add language`; `#lgForm` (Save, Cancel, fields) is hidden until the button is clicked; `lgValidate` disables Save until both code and English name are non-empty; `lgCloseForm` hides the form and shows the button again after Save or Cancel.
- `app/js/sidebar/layers.js`: category rename now sets `lyCatOpen = c.id` (was opening an inline row). `lyRenderCats` renders the row with `cat-renaming` class when `lyCatOpen === c.id` and fills `#catAdmin` with the same editor block as "New category" (heading changes to "Rename category"). No inline edit row is inserted. `catValidateSave` disables Save until at least one name is non-empty.

### Why
Task 007: five visible bugs reported by the owner (points 1, 3, 10, 11, 12–14, 17).

### Files
- `app/css/sidebar.css`
- `app/js/sidebar/ui.js`
- `app/js/sidebar/layers.js`
- `changes/sidebar.md`

### Verify
1. **Hover** – in the browser, open a place with ≥ 2 notes and a layer with ≥ 2 notes; hover each note title, button and row; the computed colour/background of every other element stays unchanged.
2. **No text selection** – double-click a place or layer row name: `getSelection().toString()` is empty; dragging still selects.
3. **No flicker** – click a second place; watch the DOM: `Noteville` (old name) never appears in `#detail` after the first mutation.
4. **Language form** – go to More → Languages; only `+ Add language` is visible. Click it: fields, Save (disabled), Cancel appear. Fill code and name: Save enables. Cancel: form closes, button returns. Add a valid language: form closes, row appears.
5. **Category rename** – go to More → Categories; click the pencil of a category: editor appears in `#catAdmin` with heading "Rename category" and names filled; no inline row; the row is outlined in blue. Cancel unmarks it. Save renames it.

### Open follow-ups
None.
