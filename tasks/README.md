# Task specs (written by the architect)

One file per task. A task = one branch `<domain>/<task>` = one merge request. Order matters: do not start a task before the ones it depends on are merged.
Each spec: goal, domain, depends on, interface touched, acceptance criteria, out of scope. Agents are called by name (`.claude/agents/`: `<domain>-tdd`, `<domain>-dev`, `gatekeeper`) with the task number as the task (`sidebar-tdd: task 003` means the file `tasks/003-*.md`); shared rules are in `tools/prompts/_common.md`.

| # | Task | Branch | Depends on |
|---|---|---|---|
| 001 | State manager | `state/manager` | proposal 003 (approved) |
| 002 | Layer rules use the state | `core/layer-state` | 001 |
| 003 | Sidebar publishes the state | `sidebar/publish-state` | 001 |
| 004 | Map highlights the selected place | `map/highlight` | 001 (003 for a visible effect) |
| 005 | Contract I-6 (v1.4) | `shared/contract-i6` | 001-004 |
| 006 | Sidebar test file | `shared+sidebar/sidebar-test-file` | proposal 010 approved |
| 007 | Sidebar fixes (hover, selection, flicker, forms) | `sidebar/fixes` | 006 |
| 008 | Map markers (selected look, hover, tooltip, double click, clusters) | `map/marker-ux` | 004 |
| 009 | Contract v1.5 and design rules | `shared/ui-contract` | 005, proposal 010 approved |
| 010 | Map point menu | `map/point-menu` | 009 |
| 011 | Types dictionary and shapes: storage and loading | `data+core/types-and-shapes` | 009 |
| 012 | Sidebar layout (split, place card, Add layer, toggle, point menu) | `sidebar/layout` | 007, 009, 010 |
| 013 | Map draws types and shapes, edits shapes | `map/types-and-shapes` | 008, 011 |
| 014 | Sidebar: types editor and shapes | `sidebar/types-and-shapes` | 011, 012, 013 |
| 015 | Code graph tool (`graph/`) | `shared/graph-tool` | proposal 011 merged |
