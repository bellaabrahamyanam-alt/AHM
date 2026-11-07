# Task specs (written by the architect)

One file per task. A task = one branch `<domain>/<task>` = one pull request. Order matters: do not start a task before the ones it depends on are merged.
Each spec: goal, domain, depends on, interface touched, acceptance criteria, out of scope. Agents are called by name (`.claude/agents/`: `<domain>-tdd`, `<domain>-dev`, `gatekeeper`) with the spec file as the task; shared rules are in `tools/prompts/_common.md`.

| # | Task | Branch | Depends on |
|---|---|---|---|
| 001 | State manager | `state/manager` | proposal 003 (approved) |
| 002 | Layer rules use the state | `core/layer-state` | 001 |
| 003 | Sidebar publishes the state | `sidebar/publish-state` | 001 |
| 004 | Map highlights the selected place | `map/highlight` | 001 (003 for a visible effect) |
| 005 | Contract I-6 (v1.4) | `shared/contract-i6` | 001-004 |
