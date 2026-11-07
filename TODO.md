> **LEGACY, READ-ONLY (since 2026-11-06).** Entries #1-#26 are the history of the single-agent period. From now on every domain
> writes its own `changes/<domain>.md` and `todo/<domain>.md` (DOMAINS.md, rule 7). Do not append here.

# Sidebar to-do list (owner's requirements, 2026-11-05)

Work is done one item at a time, only when the owner asks for it. Do not change anything outside the sidebar and do not change the
tests for these items. Mark an item done here (with the date and the `AGENT_CHANGES.md` entry) when it is finished.

- [x] 1. Remove the "Armenian Highlands" title from the sidebar header. (done 2026-11-05, entry #9)
- [x] 2. Replace the "«" collapse button with something better. (done 2026-11-05, entry #11: icon button; the "»" show button matches)
- [x] 3. Replace the blue colour of the sidebar edge while it is being resized with something better. (done 2026-11-05, entry #12: neutral grey)
- [x] 4. Remove the "Search other places (OpenStreetMap)…" button (it is broken: cut off, with empty space); search other places with the Enter key instead. (done 2026-11-05, entry #13)
- [x] 5. Move the "Categories" section from the Layers tab to the More tab, under "Languages". (done 2026-11-05, entry #15; one browser test still expects the old place, see the entry)
- [x] 6. One generalised UI for adding and editing languages, laid out like a table without lines (good offsets): (done 2026-11-05, entry #16)
  - row: edit button (pencil) · language code · language name in English · language name in that language;
  - add row: add button (plus) · code field with placeholder · English-name field with placeholder · native-name field with placeholder;
  - below: Save (half of the width) and Cancel (the other half).
- [x] 7. The same for categories: (done 2026-11-05, entry #17)
  - row: edit button (pencil) · category name in the language chosen in the filter · all names in order, as now;
  - clicking the pencil opens the same fields as the current "Rename" under that category, with Save and Cancel (half and half);
  - adding: when nothing is being edited, one full-width "Add" button; clicking it shows the edit fields with Save and Cancel (half and half).
- [x] 8. Clicking a place in the list must not move the map. Show its details in the sidebar under that place in the list (the other places stay in the list). Remove the "Back" button and the jumping back and forth. (done 2026-11-05, entry #18)
- [x] 9. Double click on a place (on the map or in the sidebar list) moves the map focus to it. A single click, on the map or in the sidebar, never does. (done 2026-11-05, entry #19)
- [x] 10. The same as 8 for layers: a clicked layer opens under itself in the list, no new block and no "Back" button. (done 2026-11-05, entry #20)
- [x] 11. Remove the chips of the selected types under the Filters block (the types are already shown inside Filters). (done 2026-11-05, entry #21)
- [x] 12. The same for the language: remove it from under the Filters block. (done 2026-11-05, entry #21)
- [x] 13. Rename "New layer" to "Add layer" and move it to its own "Add layer" section (like languages and categories); the "Search layers" section is only for searching and filtering by category. (done 2026-11-05, entry #22)
- [x] 14. Every search field has a clear (✕) button; one reusable search field used everywhere. (done 2026-11-05, entry #23)
- [x] 15. Move the place search field to the top of the places list, out of the top of the Filters block. (done 2026-11-05, entry #24)
