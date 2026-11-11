# Change log of the map domain

## 1. 2026-11-08: map highlights the selected place (task 004)

- **What:** `AHM.on('state:selected', ({ value }) => ...)` draws a ring (circle layer `ahm-highlight`, own GeoJSON source of the same name, one Point with `properties.id`) around the place with that id; `value` null removes it. The selected id is remembered, so the ring is redrawn after every `setFeatures`, when the map has loaded, and stays through base-map switches (`applyVis` skips `ahm-` layers). An id that is not among the features draws nothing and does not throw.
- **Why:** the sidebar publishes the selection in `AHM.state` (tasks 001, 003); the map shows it.
- **Files:** `app/js/map/map.js`, `changes/map.md`, `todo/map.md`. Tests: `tests/js/map.test.js` (written by map-tdd).
- **No interface change:** no new `AHM.map` command, no new event; the map reads no `AHM.state` and calls no sidebar code.
- **How to verify:** `node tests/js/run.js --no-browser`. By hand (real MapLibre is not in the tests): open the app, click a place in the sidebar (needs task 003): an orange ring appears around its marker; click another: the ring moves; deselect: it disappears; switch Map/Satellite or edit a layer (setFeatures): the ring stays.
- **Follow-ups:** none.

## 2. 2026-11-08: map markers: selected look, hover, tooltip, double click, clusters (task 008)

- **What:** the selected place has a white outline, a thin dark outer ring, a soft shadow and its own type symbol about 30% larger (layers `ahm-highlight*`, drawn last so they are above all labels and symbols); the orange ring is gone. Hover lifts a place symbol (icon-opacity 0.85), shows a pointer and a tooltip with name and type above the bullet (below it when there is no room); one tooltip at a time, closed on leave and when the map moves. Double click on a place emits `place:dblclick` once, cancels the map zoom and no `place:click`; a single click waits 300 ms first. Places closer than 50 px form a round bubble with the count (clusters up to zoom 11; `ahm-clusters`, `ahm-cluster-count`); a bubble click or double click zooms to where it splits. The selected place is kept out of the clustered source.
- **Why:** clearer, better-looking markers (task 008 points 4-7, 21 and 5).
- **Files:** `app/js/map/map.js`, `changes/map.md`. Tests: `tests/js/map.test.js` (written by map-tdd).
- **No interface change:** no new `AHM.map` command, no new event. `place:click` and `place:dblclick` keep their payload.
- **How to verify:** `node tests/js/run.js --no-browser`. By hand: select a place (its symbol grows with a white outline, no orange ring); hover a place (it lightens, tooltip above it); double click a place (sidebar opens its focus, map does not zoom twice); zoom out on a dense area (round bubbles with counts); click a bubble (map zooms to where it splits).
- **Follow-ups:** `todo/map.md` not ticked in this change; the sidebar half of double click is task 012.

One entry per change, newest last: date, what, why, files, how to verify, open follow-ups. Only the map domain appends here (DOMAINS.md, rule 7). The history before 2026-11-06 is in the legacy `AGENT_CHANGES.md` (entries #1-#26), which is now read-only.

## 3. 2026-11-12: drawing a line marks start (A), end (B)
- **What:** in `drawShape` with `kind: 'line'` the first point is drawn as A (blue), the last as B (red), with tooltips; the ones between stay small dots. No new command or event.
- **Files:** `app/js/map/shapes.js`, `app/css/shapes.css` (sidebar-owned, the marker styles).
- **Verify:** by hand (real MapLibre is not in the tests): add a route and click three points.
- **Follow-ups:** none.
