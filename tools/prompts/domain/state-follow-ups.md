# Follow-up tasks for the other agents once the state module exists (proposal 003, steps 3-5)

Each agent: its own domain only, its own change log; `Status: approved` must be in the proposal and `app/js/state/state.js` must be built.

**Core agent** (`app/js/core/layer-rules.js`): replace the object literal `const lyState = { only: ..., noteAll: false }` by `const lyState = AHM.state.get('layers');`. Nothing else, names unchanged, `node tests/js/run.js` green (the owner updates the test load lists).

**Sidebar agent** (`app/js/sidebar/*`): (1) wherever `ui.js` sets `cur` (open place, close, edit), also `AHM.state.set('selected', cur ? cur.id : null)`; (2) after changing sets inside `lyState` in place, call `AHM.state.patch('layers', {})`. Do not read `selected` back; the sidebar keeps rendering as now.

**Map agent** (`app/js/map/*`, `app/css/map.css`): `AHM.on('state:selected', ({ value }) => ...)` draws a highlight (ring or halo) around the place with that id and removes it when `value` is null; the highlight survives `setFeatures` re-draws and base-map switches. Do not call the sidebar, do not read `AHM.state` for anything else.

**Git delivery:** see `tools/prompts/_common.md` (merge request on GitLab, rules 3 and 8-10).
