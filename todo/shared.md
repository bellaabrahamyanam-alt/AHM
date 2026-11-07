# To-do of the shared domain

Only the shared domain edits this file. Mark an item done with the date and the entry number of `changes/shared.md`.

- [x] The browser test "tabs, sheets, filters, layers, categories" was updated to the new sidebar (owner's OK 2026-11-06), `changes/shared.md` #2. The whole suite is green.
- [ ] CSS/HTML tests (part 4 of `tests/README.md`) are not written.
- [ ] Known violation 1 (tasks 002-003): `lyState` carries sidebar state (open, editing, staged, noteAll); split it (proposal needed).

- [x] Step 4: parallel work, features mechanism, campaigns domain (2026-11-06, `changes/shared.md` #3).
- [ ] Decide on `proposals/002-map-extension-points.md` (owner), then the map agent implements it and shared updates `INTERFACES.md` (v1.4), `contract.test.js` and the `MAP` list in `features.test.js`.
- [ ] When the owner wants the feature on a test forum: a request to the data domain so the controller sends `features: ['campaigns']`.
- [x] Proposal 003 approved, state tests written first, test load lists updated (2026-11-06, `changes/shared.md` #5).
- [x] State agent delivered (task 001); `INTERFACES.md` I-6 (v1.4) and the contract test for the key list (2026-11-07, `changes/shared.md` #15). [ ] Core, sidebar, map steps (tasks 002-004); then delete Known violation 1 in `INTERFACES.md`.
- [x] Starter contexts, architect package, token rules (2026-11-06, `changes/shared.md` #6). [ ] Tune `tools/context.json` after the first agent sessions.
- [x] Git workflow, CI, CODEOWNERS handles (2026-11-07, `changes/shared.md` #7). [ ] After the first push: check that the workflow runs green; fix it if not.
- [x] Task specs for the state roll-out in `tasks/` (2026-11-07, `changes/shared.md` #8). [ ] Task 005 (contract I-6) after 001-004.
- [x] Token cut in the test harness, tail-100 rule, agents open PRs with `gh api` + auto-merge (2026-11-07, `changes/shared.md` #9). [x] Owner made the repository public and enabled auto-merge and automatic deletion of merged branches (2026-11-07, `changes/shared.md` #14). [ ] Owner decides whether to turn on branch protection (Settings > Branches).
- [x] Agents merge their own green pull requests via `gh api` (2026-11-07, `changes/shared.md` #10).
- [x] Move to GitLab prepared: CI file, CODEOWNERS, merge request template, agent rules, specs (2026-11-07, `changes/shared.md` #16, `proposals/006-gitlab-move.md`). [x] Owner verified the GitLab account identity; CI is green; MR !1 merged. [x] Owner protected `master`: nobody may push, merging allowed (checked 2026-11-07, `changes/shared.md` #17). [x] Owner set the merge request options (owner's word, 2026-11-07, `changes/shared.md` #17). [x] Owner archived the GitHub repository and revoked its tokens (owner's word, 2026-11-07, `changes/shared.md` #17).
- [x] Clear start for every agent: Start-here section, Draft merge requests, Project instructions text (2026-11-07, `changes/shared.md` #18, `proposals/007-agent-start.md`). [ ] Owner: paste `tools/prompts/project-instructions.md` into the Claude Project, delete the old documents there. [ ] `sidebar-dev: task 003` opens the merge request on `sidebar/publish-state` (the red tests are already pushed).
- [x] Lean delivery: no merge request from `-tdd`, tests only when code changes, git when possible (2026-11-07, `changes/shared.md` #19, `proposals/008-lean-delivery.md`). [ ] Owner decides where `-tdd` and `-dev` run: Claude Code on his computer (git works) or a Project chat (GitLab tools). [ ] Optional: split job `tests` into PHP and JS, cache the installs.
- [ ] Proposal 009 (map test file, MR !8): owner writes `Status: approved`; then `gatekeeper` merges; then `map-tdd: task 004` (2026-11-08, `changes/shared.md` #21).
