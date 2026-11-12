# Proposal 003: one state manager for state shared between domains (I-6)

Status: approved (the owner, 2026-11-06 17:44; he also approved adding `state.js` to the test load lists and writing the state tests first, TDD)
From: shared (integrator). The owner decided on 2026-11-06: a separate **state** domain; first scope = the selected place + the layer state.
(The map agent's own proposal "003-map-selected-place" is replaced by this one; discard that file.)

## Why
The map must highlight the selected place, but only the sidebar knows it. A `setSelected` command on the map would keep the state in
the sidebar. State shared between domains belongs in one module that does nothing else. The same module fixes Known violation 1:
`lyState` (in core) carries sidebar state.

## Current text
I-2 has no way to tell the map the selected place. `lyState` is a top-level object of `core/layer-rules.js` used by core (17 places) and the sidebar (64).

## New text (INTERFACES.md I-6, version 1.4; I-2 and I-3 unchanged)
`window.AHM.state`, provider: **state** (`app/js/state/state.js`, one function scope, no DOM, no map, no sidebar). Consumers: everyone.
- `AHM.state.get(key)` → the value. `AHM.state.set(key, value)` → replaces it. `AHM.state.patch(key, partial)` → for object values, assigns the given fields.
- Every real change emits `AHM.emit('state:<key>', { value, old })` (nothing is emitted when the value is identical).
- Keys of version 1:
  - `selected`: id of the place shown now, or `null`. Written by the sidebar, read by the map (highlight).
  - `layers`: `{ only: Set, hide: Set, open, editing, staged, noteAll }`, exactly the fields of today's `lyState`. `get('layers')` returns the live object, so
    existing code that reads or mutates it keeps working; after mutating sets in place call `AHM.state.patch('layers', {})` to announce it.
- The module validates keys (unknown key = error), keeps no other state, and never calls other domains.
- New keys are added only by a proposal.

## Who is affected, and the steps (each domain in its own change, in this order)
1. **shared** (done in `changes/shared.md` #4): the domain `state`, the scaffold `app/js/state/state.js`, loaded right after `ahm.js`.
2. **state**: builds the module and its tests (`tests/js/state.test.js`) exactly as above.
3. **core**: `core/layer-rules.js` declares `const lyState = AHM.state.get('layers');` (one line instead of the object) so all names stay. Core must not read sidebar fields afterwards (Known violation 1 closes when the sidebar stops writing them directly, step 4).
4. **sidebar**: writes `selected` where it sets `cur` (`ui.js`: open, close, edit); announces layer changes with `patch('layers', {})`.
5. **map**: listens to `state:selected` and draws the highlight (a ring or halo around the symbol, own style in `map.css`/`map.js`); also keeps working for map clicks.
6. **shared**: `INTERFACES.md` I-6 + version 1.4, a contract test, the boundaries rule (nobody but `state` writes the module), `index.html` is already done.
Test load lists: `layer-rules.js` needs `state.js` loaded before it. The tests that load it (`layers.test.js`, `search.test.js`, `browser.test.js` pages) must add `'state.js'` to their load list: **this touches existing tests, so it needs the owner's explicit OK** (like the earlier test update); no assertion changes.

## Migration risk
Low: the object stays the same object, names stay. Steps 3-5 can be separate diffs; the app works after each one.

## Tests to add
state: get/set/patch, events fired once per change and not for identical values, unknown key refused, `layers` live object identity, no DOM names (boundaries). Contract: the key list. Browser: opening a place from the list and from the map both set `selected`.

## Clarifications made while writing the tests (TDD, 2026-11-06; the tests in `tests/js/state.test.js` are the exact specification)
- `AHM.state` has exactly three functions: `get`, `set`, `patch`.
- `patch(key, partial)` always emits `state:<key>` once (so `patch('layers', {})` announces an in-place change), with `{ value, old }`; `old` is a shallow copy of the object before the patch. `patch` on a key whose value is not an object (`selected`) throws.
- `set` emits only when the value is not identical (`!==`). `set('layers', x)` requires an object with the same fields as the default; the new object is then what `get('layers')` returns.
- Unknown keys throw in `get`, `set` and `patch` (the message contains "unknown key"); the object errors contain "object". Defaults: `selected` = `null`; `layers` = `{ only: Set, hide: Set, open: null, editing: null, staged: null, noteAll: false }`.
- Test load lists: `'state.js'` added first in `layers.test.js`, `search.test.js` and `contract.test.js` (the browser test loads `index.html` and needs nothing).
