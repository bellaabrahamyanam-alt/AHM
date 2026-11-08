# Change log of the map domain

## 1. 2026-11-08: map highlights the selected place (task 004)

- **What:** `AHM.on('state:selected', ({ value }) => ...)` draws a ring (circle layer `ahm-highlight`, own GeoJSON source of the same name, one Point with `properties.id`) around the place with that id; `value` null removes it. The selected id is remembered, so the ring is redrawn after every `setFeatures`, when the map has loaded, and stays through base-map switches (`applyVis` skips `ahm-` layers). An id that is not among the features draws nothing and does not throw.
- **Why:** the sidebar publishes the selection in `AHM.state` (tasks 001, 003); the map shows it.
- **Files:** `app/js/map/map.js`, `changes/map.md`, `todo/map.md`. Tests: `tests/js/map.test.js` (written by map-tdd).
- **No interface change:** no new `AHM.map` command, no new event; the map reads no `AHM.state` and calls no sidebar code.
- **How to verify:** `node tests/js/run.js --no-browser`. By hand (real MapLibre is not in the tests): open the app, click a place in the sidebar (needs task 003): an orange ring appears around its marker; click another: the ring moves; deselect: it disappears; switch Map/Satellite or edit a layer (setFeatures): the ring stays.
- **Follow-ups:** none.

One entry per change, newest last: date, what, why, files, how to verify, open follow-ups. Only the map domain appends here (DOMAINS.md, rule 7). The history before 2026-11-06 is in the legacy `AGENT_CHANGES.md` (entries #1-#26), which is now read-only.
