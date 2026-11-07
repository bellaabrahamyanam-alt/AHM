# Task 003: sidebar publishes the state

- **Domain:** sidebar. **Branch:** `sidebar/publish-state`. **Depends on:** 001 merged (002 recommended first).
- **Interface touched:** uses I-6 `AHM.state.set('selected', ...)` and `AHM.state.patch('layers', {})`.
- **Goal:** (1) wherever `ui.js` sets `cur` (open, close, edit), also `AHM.state.set('selected', cur ? cur.id : null)`; (2) after changing sets inside `lyState` in place, call `AHM.state.patch('layers', {})`.
- **Acceptance:** `selected` equals the open place id, or null when closed, in every path (click, double click, map click, Esc, tab switch, `#place-<id>` link, filter hides it); the sidebar never reads `selected` back; behaviour unchanged; `node tests/js/run.js` green; `changes/sidebar.md` entry.
- **Out of scope:** map code, core code, `index.html`.
