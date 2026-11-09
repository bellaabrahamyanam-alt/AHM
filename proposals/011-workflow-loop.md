# Proposal 011: architect-led loop (replaces tdd -> dev -> gatekeeper)

Status: approved (owner, 2026-11-10)
Domain: shared
Replaces: the role split of proposals 004 and 008 (roles `<domain>-tdd`, `<domain>-dev`, `gatekeeper`).

## Why
The chain architect -> tdd -> dev -> gatekeeper used 4 chats per task. Each chat re-read the same context, and the handoffs cost a cold start each. Agents find files through a hand-written file list (`context/<domain>.md`), not through a map of who calls whom.

## The loop
1. **State** (architect): read `graph/INDEX.md`, `todo/`, `changes/`, open MRs.
2. **Spec** (architect): `specs/NNN-<feature>.md`: goal, what the user sees, acceptance criteria.
3. **Split** (architect): `tasks/NNN-<name>.md`, one per domain; each lists its files, taken from the graph.
4. **Structure** (architect): when the graph shows a problem (oversized file, cross-domain call, entry in "Known violations"), propose a new domain or a split/refactor as tasks. Interface changes stay proposals; the owner approves.
5. **Build** (`<domain>` agent): tests first, then code, one chat, one branch, one MR. CI must be `success`. Report: `MR !n ready for owner test`.
6. **Test** (owner): checks out the branch locally, starts the Node dev mirror, then tells the architect `MR !n: ok` or `MR !n: fix: <comments>`.
7. **Merge or fix** (architect): `ok`: merge with the head-sha guard (squash). `fix`: append the comments to the task spec (section `Fixes`); the same `<domain>` agent continues on the same branch. Back to step 6.

## Changes
- **Roles:** `<domain>-tdd` and `<domain>-dev` become one agent `<domain>` (sidebar, map, data, core, state, campaigns). Tests are written first and committed as `test:`, then code as `feat:`/`fix:`. A test the agent thinks is wrong: stop and tell the owner. Tests are never weakened.
- **gatekeeper** is removed. Its checks move to CI job `domain` and to a checklist in `.gitlab/merge_request_templates/Default.md` (domain, acceptance criteria, tests not weakened, interfaces untouched, change-log entry). Only the architect merges, and only after the owner's `ok`.
- **Code graph:** `tools/make-graph.js` (Node, no dependencies) writes `graph/INDEX.md` and `graph/<domain>.md`: one line per file with its exports, the `AHM.*` calls, the events it emits and listens to, who uses it, and its size. A test (like `context.test.js`) fails when `graph/` is stale. `graph/` replaces `context/<domain>.md`. The repository does not depend on graft or graphify; in Claude Code the owner may add them on top.
- **Web discovery:** the architect uses only-cli (web-browsing-cli) in Claude Code, and the built-in web search in a Project chat.
- **Unchanged:** domains, interfaces, branch names `<domain>/<task>`, one task = one branch = one MR, per-domain change logs, English only, `master` changes only through merge requests.

## Roll-out (one task each, in this order)
- 015 `shared/graph-tool`: `tools/make-graph.js`, `graph/`, freshness test, `tools/domains.json` lines. Depends on: this proposal.
- 016 `shared/agent-roles`: new `.claude/agents/<domain>.md` files, delete `-tdd`, `-dev` and `gatekeeper` files, rewrite `tools/prompts/_common.md`, `project-instructions.md`, MR template, `DOMAINS.md` ("Git workflow"), `AGENTS.md`. Depends on: 015.
- 017 `shared/specs-folder`: `specs/README.md`, `tasks/README.md` update (adds `Fixes` section). Depends on: 016.

## Out of scope
Changing domains, interfaces or CI rules. A hosted preview of branches (the owner tests locally).
