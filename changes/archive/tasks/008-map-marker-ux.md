# Task 008: map markers: selected look, hover, tooltip, double click, clusters

- **Domain:** map. **Branch:** `map/marker-ux`. **Depends on:** 004 merged. **Interface touched:** none (uses `place:click` and `place:dblclick` of I-2).
- **Test file:** `tests/js/map.test.js` (MapLibre is not available in tests: use the stub; the PR says how to check by hand).
- **Goal:** better-looking and clearer markers on the map.
- **Acceptance** (numbers are the owner's points):
  1. **Selected place (5).** The orange ring is gone. A selected place is drawn about 30% larger with a white outline, a thin dark outer ring (about 50% opacity) and a soft shadow; no accent colour; complete at every zoom (the old ring has gaps; it must be above labels and other symbols); changes with a short transition (about 150 ms). It survives `setFeatures`, base-map switches and layer halos, as in task 004.
  2. **Hover (6).** The hovered place symbol is about 15% lighter and the cursor is a pointer; restored on leave; not applied on top of the selected look; correct after `setFeatures`.
  3. **Tooltip (7).** The popup with name and type sits at the top centre of the hovered bullet, with its arrow pointing at it, offset by the marker radius plus 6 px; it never covers the bullet; it moves below the bullet when there is no room above; one popup at a time; it closes on leave and when the map starts moving.
  4. **Double click (4, map half).** Double click on a place symbol or label emits `place:dblclick { id }` exactly once, the map's own zoom is cancelled and no `place:click` is emitted for it; double click on empty map keeps the normal zoom. (The sidebar half is task 012.)
  5. **Clusters (21).** Places close to each other are drawn as one round bubble with the count (MapLibre cluster source; radius about 50 px; no clusters from zoom 12; both numbers are constants at the top of the file). Bubble size has 3 steps, neutral dark colour, white count, lighter on hover. Click or double click on a bubble zooms to where it splits. No `place:click` for a bubble. The selected place is never inside a bubble. `setFeatures`, `hidePlace`, `focusPlace`, `fitTo` keep working.
  - `changes/map.md` entry.
- **Out of scope:** the types dictionary and shapes (task 013), the point menu (task 010), sidebar files.
