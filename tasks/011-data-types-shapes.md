# Task 011: types dictionary and shapes: storage, endpoints, loading

- **Domain:** data + core. **Branch:** `data+core/types-and-shapes`. Run with `data-tdd` and `data-dev`; the core files below are allowed in this task (the branch names both domains). **Depends on:** 009 merged. **Interface touched:** I-1, I-3, I-8, I-9 as in proposal 010 C and D.
- **Core files allowed:** `app/js/core/data.js`, `app/js/core/layer-rules.js`, `tests/js/data.test.js`.
- **Goal:** the server and the browser can store and load types, shapes and their layer membership.
- **Acceptance:**
  1. **Types.** `data/types.json` seeded (one point type per type that exists today with the same colour and symbol, plus `border`, `route`, `territory`); existing places stay valid. Endpoints `types`, `typeSave`, `typeDelete`, flag `canTypeAdmin`; rules of proposal 010 C (code slug and unique, geometry fixed, colour, style ranges, names need a known language, delete refused with the usage count, 403 without permission).
  2. **Shapes.** `data/shapes.geojson` (one example border line and one example territory). Endpoints `shapes`, `shapeSave` (`shape_add`, `shape_update`, `shape_delete`); validation of proposal 010 D (geometry kind matches the type's geometry, point limits, closed ring, coordinate ranges, names list); permission `canEdit`.
  3. **Layers.** `members` accept `{ shape }`; `layer_members` accepts `add_shapes` and `remove_shapes`; unknown id is 400; deleting a shape removes it from all layers; places format unchanged.
  4. **Mirror.** PHP service and controller, Node dev server and `tests/fixtures/rules.json` change together; `tests/js/parity.test.js` green.
  5. **Core.** `loadTypes()`, `loadShapes()`, `typeLabel(type, lang)`, `layerAllowsShape(id)` (same Only/Hide meaning as for places); tests in `tests/js/data.test.js`.
  - `changes/data.md` and `changes/core.md` entries.
- **Out of scope:** drawing (013), editors and lists (014), dates on shapes.
