# Task 001: state manager

- **Domain:** state. **Branch:** `state/manager`. **Prompt:** `.claude/agents/state-tdd.md`, `.claude/agents/state-dev.md` (notes: `tools/prompts/domain/state.md`).
- **Interface touched:** none changed. Implements I-6 from `proposals/003-state-manager.md` (approved).
- **Goal:** `app/js/state/state.js` provides `AHM.state` with `get(key)`, `set(key, value)`, `patch(key, partial)`.
- **Acceptance:**
  1. `AHM_TDD=1 node tests/js/run.js --no-browser state` goes from 8 red to 8 green; no test weakened.
  2. First commit `test:` (only if tests are added), then `feat:`; CI shows red then green.
  3. Keys exactly `selected` and `layers`; unknown key throws ("unknown key"); non-object `patch` throws ("object").
  4. `state:<key>` event `{ value, old }` only on a real change; `patch` always emits.
  5. No top-level names, no DOM, no map, no sidebar, no fetch.
  6. `node tests/js/run.js` and `node tools/check-domain.js state <diff>` pass; `changes/state.md` entry in the PR.
- **Out of scope:** any other domain's file; new keys or API names (proposal needed).
