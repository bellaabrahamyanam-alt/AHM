# Interfaces between the domains (`ahm/map`), version 1.5

This file is the contract. **Only the owner (the human) can change it**, through a proposal (`DOMAINS.md`). Agents read it, follow
it, and never edit it. A name, signature, event, endpoint or file format that is listed here may not be renamed, removed or
reinterpreted by any agent.

**Status (step 2 done):** I-1, I-2 and I-3 are implemented. The sidebar and the map no longer call each other: they use only
`window.AHM` (`app/js/ahm.js`, `app/js/map/map.js`). Version 1.1 added, during step 2, the items marked **[1.1]** below because the
refactor needed them; **the owner confirmed them on 2026-11-06**. Version 1.2 (2026-11-06) implements proposal 001: `run(options)`. Version 1.3 (2026-11-06, step 4, requested by the owner for the campaigns feature) adds I-5 (optional features). Version 1.4 (2026-11-07, proposal 003, approved) adds I-6 (the state manager `AHM.state`). The roll-out of I-6 is finished (tasks 002-004 merged, 2026-11-08): Known violation 1 is closed. Version 1.5 (2026-11-08, proposal 010, approved) adds I-7 (icons), I-8 (types dictionary) and I-9 (shapes) and the items marked **[1.5]** in I-1 to I-4. They are built by tasks 010-014 (`tasks/README.md`), so `contract.test.js` accepts them but does not require them yet. See "Known violations" for what is still open.

---

## The interfaces (one file each: open only the ones your domain provides or uses)

| Interface | What | File |
|---|---|---|
| I-1 | Data ↔ front end (HTTP and files) | [interfaces/I-1-data-front-end.md](interfaces/I-1-data-front-end.md) |
| I-2 | Sidebar ↔ map: the `window.AHM` namespace (commands, events) | [interfaces/I-2-sidebar-map.md](interfaces/I-2-sidebar-map.md) |
| I-3 | Core functions | [interfaces/I-3-core-functions.md](interfaces/I-3-core-functions.md) |
| I-4 | Place type symbols | [interfaces/I-4-place-type-symbols.md](interfaces/I-4-place-type-symbols.md) |
| I-5 | Optional features | [interfaces/I-5-optional-features.md](interfaces/I-5-optional-features.md) |
| I-6 | State manager (`AHM.state`) | [interfaces/I-6-state-manager.md](interfaces/I-6-state-manager.md) |
| I-7 | Icons | [interfaces/I-7-icons.md](interfaces/I-7-icons.md) |
| I-8 | Types dictionary | [interfaces/I-8-types-dictionary.md](interfaces/I-8-types-dictionary.md) |
| I-9 | Shapes | [interfaces/I-9-shapes.md](interfaces/I-9-shapes.md) |

The domain starters (`context/<domain>.md`) list the interface files of that domain. Content of the files is unchanged by the split of version 1.5.

---

## Known violations (open; agents must not add new ones)

1. (Closed 2026-11-08: the former `lyState` is `AHM.state.get('layers')`, I-6. The numbers of the other items stay.)
2. The sidebar and the map share HTML ids by design inside the Maps fold (`#more-maps`, owned by the map); outside it neither touches
   the other's ids.
3. `app/index.html` is edited by several domains (script list: shared; the sidebar parts and the Maps fold by their domains); step 4 may need markers or a split.
4. (2026-11-10, found by the red pipeline) The code differs from three rows above; the owner decides which side changes. `drawShape` takes `{ kind: 'line' \| 'area', coords?, color? }` and returns `{ getGeometry(), count(), undo(), remove() }`. `showMenu(point, actions, title, hint)` takes the actions as the second argument. `map:menu` carries `{ action, lon, lat, name }`, not `{ id, lon, lat }`.

Contract tests for this file: `tests/js/contract.test.js` (I-1 to I-4 and I-6; the [1.5] names are accepted but not yet required), `tests/js/icons.test.js` (I-7), `tests/js/features.test.js` (I-5), `tests/js/boundaries.test.js` (the only written-down exception left there is `typeIcon`, I-4).
