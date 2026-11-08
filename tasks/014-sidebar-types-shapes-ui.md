# Task 014: sidebar: types dictionary editor and shapes

- **Domain:** sidebar. **Branch:** `sidebar/types-and-shapes`. **Depends on:** 011, 012 and 013 merged. **Interface touched:** uses I-8 and I-9 (`loadTypes`, `loadShapes`, `typeSave`, `typeDelete`, `shapeSave`, `layerAllowsShape`, `AHM.map.*` of proposal 010).
- **Test file:** `tests/js/sidebar.test.js`.
- **Goal:** the owner manages marker, line and area styles and draws borders, routes and territories.
- **Acceptance:**
  1. **Types editor.** More tab: a new fold "Types" built like Categories (and with the form rules of task 007): rows grouped Points, Lines, Areas with a preview and names; an editor at the bottom of the fold for new and rename. Fields: geometry (only when new), names per language, colour (12 presets and a hex field), then by geometry: point symbol grid (from `AHM.map.getSymbols()`); line width (thin, normal, bold and a 1..12 slider), pattern (solid, dashed, dotted, double, triple), opacity (light, normal, strong), arrow; area fill opacity (0..80%) and outline width, pattern, opacity. A small live preview drawn by the sidebar. Delete with a confirmation; the server's "in use by N" message is shown. Read-only without `canTypeAdmin`.
  2. **Place form.** The type chooser lists the point types of the dictionary with their marker.
  3. **Shapes list.** Explore tab: a switch "Places | Shapes"; shape rows show a swatch, the name and the type marker; selecting opens the shape in the dock of task 012 (names, type, layers, icon buttons: edit names and type, edit geometry, delete with confirmation). `shape:click` selects the shape and calls `highlightShape`.
  4. **Add shape.** "Add shape" asks Line or Area and the type (only types of that geometry), then draws with `AHM.map.drawShape`; Save is disabled until the geometry is valid (line 2 points, area 3); Cancel removes the drawing; the name is optional, and the form says that an unnamed territory shows no label on the map.
  5. **Layers.** A layer detail shows "Shapes (n)" next to "Places"; "Choose shapes" adds and removes members (`add_shapes`, `remove_shapes`). The map receives shapes through `setShapes` after the layer rules (`layerAllowsShape`), with names in the current language.
  6. **Point menu.** When `map:click` carries shapes, the menu title shows their names.
  - `changes/sidebar.md` entry.
- **Out of scope:** dates on shapes, import and export, snapping, per-shape colour overrides.
