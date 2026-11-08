# Task 013: map draws the types dictionary and shapes, and edits shapes

- **Domain:** map. **Branch:** `map/types-and-shapes`. **Depends on:** 008 and 011 merged. **Interface touched:** `setTypes`, `getSymbols`, `setShapes`, `hideShape`, `highlightShape`, `drawShape`, events `shape:click` and `map:click.shapes` (proposal 010 C and E).
- **Test file:** `tests/js/map.test.js` (stub; the PR says how to check by hand).
- **Goal:** places, lines and areas look as their type says, and shapes can be drawn on the map.
- **Acceptance:**
  1. **Point types.** `setTypes(types)`: each place symbol takes its colour and symbol from its type; `getSymbols()` lists at least circle, square, diamond, triangle, star and pictograms for ore or mine, gold, silver, port or anchor, tree or forest, castle or fortress, church or temple, bridge, battle, mountain pass, spring, market (Phosphor, MIT, or Maki, CC0; the licence goes into `changes/map.md`; no network at runtime). Unknown type or symbol: a grey circle. `typeIcon(type)` (I-4) shows the same look in lists.
  2. **Lines.** `setShapes`: width, colour, opacity, pattern (solid, dashed, dotted, `double` and `triple` as two or three parallel lines) and arrow along the line when the type says so.
  3. **Areas.** Fill with the type colour and `fill_opacity`, outline from the type. The shape name is drawn at the middle of the area; a line shows its name along the line; text has a halo and shows from a zoom that does not clutter (constant at the top of the file). Draw order: areas, then lines, then places.
  4. **State.** `hideShape(id | null)`, `highlightShape(id | null)` (thicker outline and soft glow, same rules as the selected place); `shape:click { id }` on a line or an outline (6 px tolerance); `map:click` carries `shapes: [{ id }]` for the shapes under the cursor, areas included, and is still emitted.
  5. **Drawing.** `drawShape({ geometry, type_code, coords? }, onChange)`: click adds a point, drag moves a point, clicking a midpoint handle inserts one, Backspace or right click removes a point, Ctrl+Z undoes, Enter or double click finishes (line at least 2 points, area at least 3), Esc cancels; live preview in the style of the type; `setType(code)` changes the preview; `getGeometry()`; `remove()`; `onChange(geometry | null)`.
  - `changes/map.md` entry.
- **Out of scope:** the editor forms and lists (014), loading and saving (011), dates, snapping to places.
