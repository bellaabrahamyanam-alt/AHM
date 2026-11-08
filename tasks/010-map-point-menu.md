# Task 010: map point menu (click on an empty place)

- **Domain:** map. **Branch:** `map/point-menu`. **Depends on:** 009 merged. **Interface touched:** `AHM.map.showMenu`, `AHM.map.hideMenu`, event `map:menu` (proposal 010 E, I-7 icons).
- **Test file:** `tests/js/map.test.js`.
- **Goal:** a click on the map that is not on a place can show a small menu at the cursor; the sidebar decides what it holds (task 012).
- **Acceptance:**
  - `showMenu({ lon, lat }, { title?, actions })` draws a compact card with an arrow at the point, above it; it moves below when there is no room. Each action is an icon-only round button (`AHM.icons.svg(action.icon)`), `title` and `aria-label` = `label`. Optional title line above the buttons.
  - A button emits `map:menu { id, lon, lat }` and closes the menu. The menu also closes on Esc, a click elsewhere, the start of a drag or zoom, and when another menu opens. One menu at a time; `hideMenu()` closes it.
  - Buttons are reachable with Tab and work with Enter. The menu follows the point when the map moves slowly (pan by keys) or closes (either is fine, the PR says which).
  - `map:click` is unchanged. The map calls no sidebar code and knows no action name.
  - `changes/map.md` entry.
- **Out of scope:** the actions themselves (sidebar, task 012), shapes.
