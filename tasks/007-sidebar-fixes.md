# Task 007: sidebar fixes (hover, selection, flicker, forms)

- **Domain:** sidebar. **Branch:** `sidebar/fixes`. **Depends on:** 006 merged. **Interface touched:** none.
- **Test file:** `tests/js/sidebar.test.js` (browser helpers of `tests/js/lib`, like `browser.test.js`; a missing helper is a request to shared).
- **Goal:** remove the visible bugs of the sidebar without changing its layout.
- **Acceptance** (numbers are the owner's points):
  1. **Hover (1, 13, 14, 17).** Hovering one note, one button, one layer row or one note title changes only that element. Find the cause (a `:hover` rule on a container restyles its children) and fix the rule, do not patch with overrides. An "open" state (for example "Add note" while its form is open) is shown only while the form is open and looks different from hover; hovering "Edit" never changes it. Test: in the browser, for a place with 2 or more notes and for a layer detail, hover each note title, "Add note", "Edit", "Route from", "Route to", "Only", "Hide"; the computed colour and background of every other note and button stay the same.
  2. **No text selection on double click (3).** Double click on a place name or row (and a layer row) zooms as today but selects no text; dragging the mouse still selects text. Test: simulate a double click, `getSelection().toString()` is empty.
  3. **No flicker (12).** After a click on a place, the header and the detail show only the new place; no frame shows the previous place name. Test: observe DOM changes after the click; the old name never appears after the first change.
  4. **Empty forms (10).** In Languages and Categories: Save is disabled until the input is valid (language: code and English name filled; category: at least one non-empty name); Save and Cancel show only while a form is open; the new-language row opens with a "+ Add language" button; Cancel closes without saving.
  5. **Category rename (11).** Rename opens in the same editor area at the bottom of the Categories fold as "New category" does (heading "Rename category", fields filled, the row marked), not inline under the item.
  - `changes/sidebar.md` entry with how to check each point by hand.
- **Out of scope:** split layout, Add layer button, icons, sidebar toggle (task 012), map files, `app/index.html`.
