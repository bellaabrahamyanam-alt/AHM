# Task 002: layer rules use the state

- **Domain:** core. **Branch:** `core/layer-state`. **Depends on:** 001 merged.
- **Interface touched:** none (I-3 names unchanged).
- **Goal:** `app/js/core/layer-rules.js`: replace the object literal `lyState` by `const lyState = AHM.state.get('layers');`.
- **Acceptance:** all names unchanged; `lyState` keeps `only, hide, open, editing, staged, noteAll`; `node tests/js/run.js` green with no test change (state.js is already in the load lists); `check-domain.js core <diff>` passes; `changes/core.md` entry.
- **Out of scope:** `search.js`, any sidebar code, the test files.
