# Proposal 004: named agent roles and one gatekeeper

Status: approved (the owner, 2026-11-07, in the chat: "I approve it")
From: shared (architect). Pull request: #5, branch `shared/agent-roles`.

## Why
The owner wants to call an agent by a fixed name plus a task, without repeating the whole role and workflow each time. He also wants one
senior agent that accepts changes for all domains. Before this, every agent merged its own pull request.

## Current text
`DOMAINS.md`, "Git workflow": "Pull request and merge are automatic: the agent opens its pull request ..., waits until every CI check is
`success`, then squash-merges it." Starter prompts `tools/prompts/*-agent.md` for map, campaigns and state only.

## New text
- 14 roles, one file each in `.claude/agents/<name>.md`: `architect`, `gatekeeper`, and for each domain (sidebar, map, data, core, state,
  campaigns) `<domain>-tdd` and `<domain>-dev`. Shared rules for all agents: `tools/prompts/_common.md`.
- `<domain>-tdd` pushes the failing tests first. `<domain>-dev` makes them green, opens the pull request, waits for CI and stops.
- `gatekeeper` is the only merger. It merges only if: CI green, branch and files in one domain, acceptance criteria of the task spec met,
  tests not weakened, no interface or shared file changed without an approved proposal, change-log entry present. Otherwise it comments on
  the pull request and sends it back.
- `DOMAINS.md` ("Roles per task", "Pull request, CI and acceptance", "Merge") says this. `.claude/` is owned by shared in `tools/domains.json`.
- The old prompts move unchanged to `tools/prompts/domain/` (their "Git delivery" part is replaced by `_common.md`).

## Who is affected
All agents (they are called by the new names). Interfaces I-1 to I-6 and all application code are NOT affected.

## Migration
None for code. An old agent session keeps working but must not merge; `gatekeeper` merges its pull request.

## Tests
No new test. `domains.test.js` (every file has an owner, CODEOWNERS in sync) and `context.test.js` pass: `node tests/js/run.js --no-browser`.
