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

## 3. 2026-11-12: Routes: "+ Add route" starts on the map; wiring of the routes commit
- **What:** "+ Add route" now goes straight to the map: the first click is the start, each next click a chain point (a place if it is clicked, otherwise a free geographic point), the last one the final point. "Next" opens the details form (names, type, direction, dates, line "As clicked" or "Modern roads"); "Back to the map" returns to the same points. The old place-name form stays as "or start from place names…". The card and the list show the chain from the line (start point, places, end point, free points allowed at the ends). Also fixed what commit 571630d left red: `tests/js/routes.test.js` owner, test script lists, five tabs, `showFound` in I-2, CODEOWNERS, context, graph.
- **Files:** `app/js/sidebar/routes.js`, `app/css/shapes.css`, `tests/js/browser.test.js`, `tests/js/layers.test.js`.
- **Verify:** `node tests/js/run.js`. By hand: Routes tab, "+ Add route", click three places of the map that are not places, Next, name it, Save.
- **Follow-ups:** the path finder joins routes only at places (free points do not join); PHP tests were not run here (no PHP).
