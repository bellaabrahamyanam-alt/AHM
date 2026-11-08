# Change log of the shared domain

Owner-only domain: the integrator (the owner, or an agent he names) writes here.

One entry per change, newest last: date, what, why, files, how to verify, open follow-ups. Only the shared domain appends here (DOMAINS.md, rule 7). The history before 2026-11-06 is in the legacy `AGENT_CHANGES.md` (entries #1-#26), which is now read-only.

---

## 2026-11-06 — #1 Domains, step 3 of 4: enforcement tooling and per-domain records

Requested by the owner ("I admit and approve everything which you asked for"): approved step 3 and the [1.1] interface additions.

### What
- `tools/domains.json` (the one ownership table), `tools/check-domain.js` (rejects a diff outside the declared domain(s); `--owner`, `--codeowners`), `CODEOWNERS` (made from the table; the `@ahm-*` names are placeholders for real people or teams).
- Tests (shared domain, run by `node tests/js/run.js`): `domains.test.js` (every file has an owner, CODEOWNERS in sync, the checker's accept/reject rules), `boundaries.test.js` (ESLint scope analysis: a script may not use a top-level name declared by another domain; the two allowed exceptions are written in the test), `contract.test.js` (I-1 endpoint names in `config.js`, controller and dev server; I-2 `AHM.map` commands and the event lists; I-3 core function names; I-4 `typeIcon`).
- Per-domain records: `changes/<domain>.md`, `todo/<domain>.md`, `diffs/<domain>/`, `requests/`, `proposals/` (with README). The legacy `AGENT_CHANGES.md` and `TODO.md` are read-only history (banner added). `AGENTS.md` (requirements 1-3, 6, 7), `DOMAINS.md` (status, test ownership, how to run the checks) and `INTERFACES.md` (v1.1 confirmed by the owner) updated.
- `proposals/001-search-run-options.md`: a pending proposal to remove Known violation 1 (needs the owner's "approved").

### Verify
`node tests/js/run.js`; `node tools/check-domain.js sidebar <diff>`; `node tools/check-domain.js --owner <path>`.

---

## 2026-11-06 — #2 Browser test updated to the new sidebar; boundaries test tightened

Requested by the owner ("yes to the test update, yes to proposal 001").

### What
- `tests/js/browser.test.js`, scenario "tabs, sheets, filters, layers…": now expects the sidebar as it is after items 5-15: no chip for a selected type, places and layers open inside their list under themselves with no Back button (a second click folds them), the search ✕, categories in the More tab (one "Add" button, then the fields with Save and Cancel; the pencil opens them under the row), "Add layer" in its own fold, and `run(searchOptions())`. The scenario is the only test that exercises the whole flow, and it had not run past its first steps since item 5; running it fully found the layer-list click bug logged in `changes/sidebar.md` #1.
- `tests/js/boundaries.test.js`: the `periodBounds` exception is gone and core may not use `$`.
- `INTERFACES.md` version 1.2, `proposals/001-search-run-options.md` marked approved and implemented, `todo/shared.md` and `todo/core.md` updated.

### Result
PHP 93, data 38, JS 65 passed, 0 failed.

---

## 2026-11-06 — #3 Domains, step 4 of 4: parallel work, the switchable-feature mechanism, the campaigns domain

Requested by the owner ("let's go to step 4 ... one agent works on the map, a second adds military campaigns on the map; his work must touch nothing else and be easy to enable and disable: visible in development, hidden in production").

### What
- **Parallel-work process** written into `DOMAINS.md` ("Parallel work"): start from the latest archive, one domain per agent, diff per domain, integrator merges with `patch`, conflicts impossible by construction (per-domain records), cross-domain needs by request/proposal. `AGENTS.md`, status and roll-out updated. One reading made explicit: a domain agent also sends the full archive of its own tree (owner's rule 3); the integrator's merged archive counts.
- **Interface I-5 (version 1.3), added at the owner's request, he reviews it:** `AHM.features.register / onMapReady / enabled` and the flag `AHM_CONFIG.features`. New shared files `app/js/features.js` (the loader, last script in `index.html`) and a `features` line in `config.js`. Development: `["campaigns"]` in the file, `?features=` hides, `?features=a,b` picks. Forum: only `AHM_BACKEND.features`, which the controller does not send, so the feature is hidden in production without any other change. A feature that fails to load or throws is logged and ignored.
- **New domain `campaigns`** (`tools/domains.json`, `CODEOWNERS`): `app/features/campaigns/` (scaffold: `main.js` with a development badge, `style.css`, `README.md`), `tests/js/campaigns.test.js`, `changes/campaigns.md`, `todo/campaigns.md`, `diffs/campaigns/`.
- **Isolation enforced by `tests/js/features.test.js`** (shared, 9 tests): the flag in every environment, the loader (nothing loaded when off, bad names, URLs next to the loader, failures contained, `onMapReady`), and for every feature folder: it has a domain and `main.js`; no file of another domain mentions its name; no top-level names; only `AHM.features/on/emit/map` and the listed map commands; events named `<name>:*`; CSS selectors only `.<name>-`/`#<name>-`. Checked by temporarily breaking each rule.
- `proposals/002-map-extension-points.md` (pending): `AHM.map.addLayer/updateLayer/removeLayer/setLayerVisible` and `layer:click`, so a feature can draw on the map without touching MapLibre.
- Starter prompts for the two agents: `tools/prompts/map-agent.md`, `tools/prompts/campaigns-agent.md`. `README.md` (settings, structure) and `tests/README.md` updated.

### Verify
`node tests/js/run.js` (features: 9, campaigns: 1); `node tools/check-domain.js shared <diff>`; open the page: the badge "Campaigns (development)" shows bottom left; with `?features=` it does not and no request for `app/features/` is made.

### Follow-ups
- Production switch-on for a test forum needs the controller to send `features` (data domain: a request when the owner wants it).
- Real map drawing needs proposal 002 (owner's approval), saving needs I-1 endpoints (proposal by the campaigns agent).
- Not exercised in a live phpBB (the loader derives the feature URL from its own script address to survive the forum's asset paths).

---

## 2026-11-06 — #4 State domain scaffold and proposal 003 (state manager)

Requested by the owner: shared state needs one module that only manages state; domain **state**; first scope = selected place + layer state (his answers 2026-11-06).

### What
- Domain `state` in `tools/domains.json` / `CODEOWNERS`: `app/js/state/state.js` (scaffold, `AHM.state = {}`; loaded right after `ahm.js` in `index.html`), `tests/js/state.test.js`, `changes/state.md`, `todo/state.md`, `diffs/state/`. Boundaries test: the state domain may not use DOM, window, fetch or MapLibre names. `tests/js/lib/ctx.js` finds scripts in `app/js/state/`.
- `proposals/003-state-manager.md` (pending): the API (`get/set/patch`, `state:<key>` events, keys `selected` and `layers`) and the six migration steps. It replaces the map agent's own proposal 003, which never reached `proposals/` (the checker does accept a new proposal file from the map domain; tested).
- Prompts: `tools/prompts/state-agent.md`, `tools/prompts/state-follow-ups.md` (core, sidebar, map steps).

### Verify
`node tests/js/run.js`: 76 passed.

### Follow-ups
The owner's `Status: approved` on proposal 003, and his OK to add `'state.js'` to the test load lists of `layers.test.js`, `search.test.js`, `browser.test.js` (no assertion change) before core step 3.

---

## 2026-11-06 — #5 Proposal 003 approved; state tests written first (TDD)

Owner: "I approve it and let you write tests in order to state agent follow TDD" (also approved adding `state.js` to the test load lists).

### What
- `proposals/003-state-manager.md`: `Status: approved`; a clarifications section fixes the details the tests need (exactly `get/set/patch`; `patch` always emits; error messages contain "unknown key" / "object").
- `tests/js/state.test.js`: 8 tests that specify the module (surface, defaults, unknown keys, `set` events and identical-value silence, live `layers` object, `patch` announcing, non-object errors, handler errors contained). They are skipped while `AHM.state` is only the scaffold (so other domains keep a green suite) and run with `AHM_TDD=1`. Checked both ways: 8 red on the scaffold, 8 green against a throwaway reference implementation (not kept).
- `'state.js'` added first to the load lists of `layers.test.js` (sidebar's), `search.test.js` (core's) and `contract.test.js` (shared). `browser.test.js` loads `index.html` and needed no change. No assertion changed.
- `tools/prompts/state-agent.md`: TDD workflow.

### Verify
`node tests/js/run.js`: 83 passed; `AHM_TDD=1 node tests/js/run.js --no-browser state`: 8 failed until the state agent delivers.

---

## 2026-11-06 — #6 Starter contexts and token rules

Requested by the owner ("Yes build it") to cut the tokens agents spend: read lists per domain, a docs-only package for the architect, token rules for all agents.

### What
- `tools/context.json` (brief + 3 domain files per domain; common AGENTS.md, INTERFACES.md; own records added automatically) and `tools/make-context.js`: writes `context/<domain>.md` for all 7 domains (brief, "read these files and only these", own files, six token rules); `--check` for staleness; `--architect [out]` writes a docs-only tar.gz (documents, records, proposals, requests, tools, context; no app, data, PHP or tests code).
- `tests/js/context.test.js` (4 tests): every domain has an entry and existing files; lists of at most 9 files; `context/` up to date; architect package has no application code.
- `AGENTS.md`: new section "Token rules"; the three agent prompts (`tools/prompts/`) now start with "read `context/<domain>.md`". Rule 3 (full archive) is unchanged: the whole tree stays on disk because the tests need it.
- `context/` and the new test belong to shared (`tools/domains.json`, `CODEOWNERS`).

### Verify
`node tools/make-context.js --check`; `node tests/js/run.js`.

### Follow-ups
Read lists are a first guess; after the first agent sessions, adjust `tools/context.json` where an agent needed another file.

---

## 2026-11-07 — #7 Git workflow (step 5): repository, CI, pull requests, roles

Requested by the owner (pulling tar archives and replacing files by hand is the weak part; he wants commits, hashes, real merges). Repository: https://github.com/bellaabrahamyanam-alt/AHM.

### What
- Git repository at the project root with two commits: the import of the project as it was, then this change (history starts here).
- `.gitignore` (`node_modules/`, `*.tar.gz`, `*.bundle`); `.github/workflows/ci.yml` (job `domain`: `tools/ci-check-pr.js`; job `tests`: PHP, data, JS with eslint and playwright installed); `.github/pull_request_template.md`.
- `tools/ci-check-pr.js`: branch `<domain>[+<domain>]/<task>`; fails the pull request if it changes a file outside the named domain(s). `tests/js/ci.test.js` (2 tests, a real git repository).
- CODEOWNERS moved to `.github/CODEOWNERS` (where GitHub reads it), handles from `"owners"` in `tools/domains.json` (all = `@bellaabrahamyanam-alt`); `domains.test.js` follows it.
- `DOMAINS.md`: section "Git workflow" (branches, roles architect / TDD writer / implementer / merger, commits, merge, owner setup); AGENTS.md rules 1 and 3 apply only when work is not delivered by pull request; the three agent prompts got a "Git delivery" paragraph.

### Verify
`node tests/js/run.js`; `git log`. The workflow file was NOT run on GitHub yet (no push access from here): the first pull request is its test.

### Follow-ups
Owner: push the bundle, protect `main`, link GitHub to Claude, revoke the token pasted in the chat. Then: create the first real branch for the state agent (`state/manager`).

---

## 2026-11-07 — #8 Task specs for the state roll-out (architect)

Architect session. Added `tasks/` (owner line in `tools/domains.json`, CODEOWNERS regenerated) (README + 5 specs: state manager, core, sidebar, map, contract I-6) with goals, dependencies, interface touched and acceptance criteria. No code, no interface change.

### Verify
`node tests/js/run.js --no-browser 2>&1 | tail -15`.

### Follow-ups
Owner: merge this PR, then start the state agent (`tools/prompts/state-agent.md`, branch `state/manager`). Decide proposal 002 and the sample-data conversion.

---

## 2026-11-07 — #9 Fewer wasted tokens; agents open their own pull requests

Owner's requests: stop a long test failure from flooding the context; read only the last 100 lines of the legacy log; agents open pull requests themselves; auto-merge.

### What
- `tests/js/lib/harness.js`: a failure message is cut at 600 characters (the CODEOWNERS mismatch printed ~10k tokens on one line, which `head`/`tail` cannot cut).
- `AGENTS.md`: token rule `| cut -c1-300`; `AGENT_CHANGES.md` is read as `tail -n 100` only.
- `tools/prompts/*.md` and `DOMAINS.md` (Git workflow): agents open the pull request with `gh api` (REST; GraphQL is blocked) and enable auto-merge.

### Verify
`node tests/js/run.js --no-browser 2>&1 | tail -3`.

### Follow-ups
Owner: "Allow auto-merge" in the repository settings; branch protection on `main` is not available for private repositories on the free plan, so auto-merge may merge before CI finishes (see todo).

---

## 2026-11-07 — #10 Agents merge their own green pull requests

Owner: "yeh, I want it". "Allow auto-merge" cannot be set through the proxy, so the rule is in the prompts instead.

### What
- `tools/prompts/*.md`: after pushing, the agent opens the pull request with `gh api`, polls the check runs, merges (squash, `gh api`) only when all are `success`; red = fix and push again, never merge red.
- `DOMAINS.md` (Git workflow): same rule; the owner's merge button is no longer needed.

### Verify
`node tests/js/run.js --no-browser 2>&1 | tail -3`. First real use: the state agent.

### Follow-ups
Without branch protection nothing technical stops a red merge; the rule relies on the agent. If an agent breaks it, tell the owner.

---

## 2026-11-07 — #11 The repository root is the extension (flattened `ext/ahm/map/`)

Owner's request: remove `styles/` and `diffs/`, move everything from `ext/ahm/map/` to the repository root, because the nested layout confused the agents.

### What
- Removed the forum style `styles/` (paper-and-pencil) and the `diffs/` folder (history stays in git). Moved all of `ext/ahm/map/*` to the root with `git mv` (history kept); the extension's own phpBB styles are now `styles/all` (owned by data).
- `tools/domains.json`: `root` is `""`; `outside.shared` is only `.github/` and `.gitignore`; `.git/` is ignored by the owner test. `.github/CODEOWNERS` regenerated; `ci.yml` runs `tools/ci-check-pr.js` and the tests from the root.
- Tests changed only for the new location (owner asked for this move): `domains.test.js`, `ci.test.js`, `features.test.js`, `boundaries.test.js` (path prefix and repository root).
- Docs: `README.md`, `AGENTS.md`, `DOMAINS.md` (layout note; archive/diff method marked legacy), `tools/prompts/*.md` (deliver by pull request), `tools/make-context.js`, `tools/context.json`, `context/*.md` regenerated, `dev/bs-config.js`, pull-request template.
- `tools/check-domain.js`: deleting a path that no domain owns (any more) is allowed (the one-time removal of `diffs/` and the old `ext/` paths); changing one, or deleting an owned file from the wrong domain, is still rejected (new test in `ci.test.js`). This PR touches every domain, so its branch is named `shared+sidebar+map+core+state+campaigns+data/flatten-root`.
- Unchanged on purpose: the forum install path `<forum>/ext/ahm/map/` in `controller/main.php`, `ext.php`, README install text and the fake forum URLs in `features.test.js`. The repository is installed into a forum under that folder name.

### Verify
`php tests/php/run.php` 93, `php tests/data/run.php` 38, `node tests/js/run.js` 89, all green. In the repository root: no `ext/` and no `diffs/`.

### Follow-ups
- Open pull requests of other agents on the old paths must be rebased (their files moved).
- `AGENT_CHANGES.md` and old `changes/*.md` entries keep the old paths as history. `check-domain.js` still tolerates `diffs/<domain>/` records.
- To install in a forum: copy the repository (without `.git`, `node_modules`) to `<forum>/ext/ahm/map/`.

## 2026-11-07 — #12 Named agent roles and a gatekeeper (owner approved: "go")
**What:** 14 fixed agent names, callable without a long prompt: `architect`, `gatekeeper` (the only merger), and per domain (sidebar, map, data, core, state, campaigns) `<domain>-tdd` (failing tests first) and `<domain>-dev` (code, pull request, no merge).
**Why:** the owner wants to call an agent by name plus a task, and wants one senior agent that accepts changes for all domains (before, every agent merged its own pull request).
**Files:** `.claude/agents/*.md` (14 role files, new); `tools/prompts/_common.md` (new, rules for all agents); old prompts moved with `git mv` to `tools/prompts/domain/` (`map.md`, `campaigns.md`, `state.md`, `state-follow-ups.md`; content unchanged, their "Git delivery" part is replaced by `_common.md`); `DOMAINS.md` ("Roles per task", "Pull request, CI and acceptance", "Merge"); `tools/domains.json` (`.claude/` owned by shared); `.github/CODEOWNERS` and `context/shared.md` regenerated; `README.md`, `tasks/README.md`, `tasks/001-state-manager.md`, `todo/shared.md` (paths and wording only).
**Verify:** `node tests/js/run.js --no-browser` 90 passed. Call example: `map-dev: do tasks/006-x.md`.
**Follow-ups:** the `gatekeeper` merges only after CI is green; if a pull request is already open from an old agent, the owner tells `gatekeeper` to take it. Domain notes for sidebar, core and data do not exist yet (their `context/<domain>.md` is enough).

## 2026-11-07 — #13 Proposal 004 for the agent roles (gatekeeper asked for it)
**What:** `proposals/004-agent-roles.md`, `Status: approved` (the owner wrote "I approve it" in the chat on 2026-11-07). Entry #12 is the change it covers.
**Why:** `gatekeeper` correctly refused PR #5: shared files (`DOMAINS.md`, `tools/domains.json`, ...) changed without an approved proposal.
**Files:** `proposals/004-agent-roles.md` (new), `changes/shared.md`.
**Verify:** call `gatekeeper: PR #5` again; the checks are unchanged and CI is green.

## 2026-11-07 — #14 Docs: the repository is public; auto-merge and branch auto-delete are on
**What:** `DOMAINS.md` (Git workflow): the old "protect main; private repositories cannot enforce this" note is replaced by four bullets: repository settings (public, auto-merge on, merged branches deleted automatically, only `gatekeeper` merges), a public-repository warning (no secrets, no private data), branch protection as an optional owner-only step, and the one remaining owner setup step. `todo/shared.md`: the auto-merge follow-up is closed. `proposals/005-public-repo-notes.md` (approved by the owner).
**Why:** the owner made the repository public and enabled the two settings; the documents must say so. This replaces the old branch `shared/docs-public-automerge`; its outdated line ("agents merge their own pull requests") is dropped.
**Verify:** read "Git workflow" in `DOMAINS.md`; CI green. No code and no test changed.
**Follow-ups:** the owner decides on branch protection. Check that nothing private is in the git history now that the repository is public.

## 2026-11-07 — #15 Contract I-6 (INTERFACES.md v1.4) after the state manager was built (task 005, first part)
**What:** `INTERFACES.md` version 1.4 with the new section I-6 (`AHM.state`: `get`/`set`/`patch`, keys `selected` and `layers`, events `state:<key>`, errors, rules); the "Known violations" item 1 now says when it closes (tasks 002 and 003 merged; it is NOT removed yet). `DOMAINS.md`: the state row says the module is built and approved. `tests/js/contract.test.js`: two I-6 tests (exact API and exact key list read from `state.js`; nobody else assigns `AHM.state`) and the I-2 test now allows `AHM.state` next to `AHM.map`, `AHM.on` and `AHM.emit` (tasks 003 and 004 would fail CI otherwise).
**Why:** proposal 003 step 6 (approved by the owner 2026-11-06); task 001 is merged (`changes/state.md` #1). Tasks 002-004 are not merged yet, so only the first part of task 005 is done.
**Files:** `INTERFACES.md`, `DOMAINS.md`, `tests/js/contract.test.js`, `todo/shared.md`, `changes/shared.md`.
**Verify:** `node tests/js/run.js` all green; adding a key to `state.js` makes the I-6 contract test fail (checked by hand).
**Follow-ups:** after tasks 002 and 003 are merged: delete Known violation 1 and the "Closes when" text; after task 004: nothing more in this file. The existing assertion change in an existing test needs the owner's OK (tests of shared; no weakening of the key and API checks).

## 2026-11-07 — #16 Move to GitLab: specs, CI, merge requests (proposal 006)
**What:** The project lives in the GitLab project `bellaabrahamyan.am/ahm` (trunk `master`); GitHub is not used any more. Already on the branch before this entry: `.gitlab-ci.yml` (jobs `domain` for merge requests and `tests`), `.gitlab/CODEOWNERS` (generated, handle `@bellaabrahamyan.am`), `.gitlab/merge_request_templates/Default.md`, `tools/ci-check-pr.js` and `tools/check-domain.js` (`master`, `.gitlab/`), `tools/domains.json` (`.gitlab/` and `.gitlab-ci.yml` owned by shared), `tests/js/domains.test.js` (CODEOWNERS path only), `tools/prompts/_common.md`, `gatekeeper` and the `-dev` role files (merge requests, GitLab tools). This entry adds: `DOMAINS.md` ("Git workflow" rewritten for GitLab, owner setup list), `AGENTS.md` (rules 1 and 3 say merge request), `tools/context.json` and `context/shared.md` (regenerated), a comment in `.gitlab-ci.yml`, `proposals/006-gitlab-move.md` (approved by the owner), `todo/shared.md`.
**Why:** the owner moved the project to GitLab and asked to prepare it fully and to make the specs clear.
**Verify:** CI ran on GitLab and passed: after the owner verified the account identity, pipeline 3039964592 on head 85b566c9 of MR !1 finished with jobs `domain` and `tests` both `success`. (Before that, GitLab refused every CI job: "Identity verification is required in order to run CI jobs".) MR !1 was merged into `master`.
**Follow-ups (owner only):** protect `master` and set the merge request options (`DOMAINS.md`, "Git workflow"; today every developer may push to `master`); connect GitLab to Claude for the cloud sessions; archive the GitHub repository and revoke every GitHub token that was pasted in a chat.

## 2026-11-07 — #17 Owner setup done: `master` protected, merge request options set, GitHub archived and tokens revoked
**What:** `todo/shared.md`: all owner setup items are done. Checked through the GitLab API: branch `master` is protected, `developers_can_push` is false, `developers_can_merge` is true (before MR !1 it was true for push). By the owner's word (not checkable with the GitLab tools): the merge request options are set (pipelines must succeed, threads resolved, squash, delete source branch), the GitHub repository is archived and its tokens are revoked. Docs only; no code, test or interface change (proposal 006).
**Why:** keep the to-do list true.
**Verify:** read `todo/shared.md`; GitLab > Settings > Repository > Protected branches.

## 2026-11-07 — #18 A clear start for every agent (proposal 007, owner approved)
**What:** After `sidebar-tdd task 003` in a Claude Project chat the agent tried to clone, searched work items, listed the missing `ext/ahm/map`, and opened no merge request. Fixes: `tools/prompts/_common.md` now starts with "Start here" (command format, `task 003` = `tasks/003-*.md`, repository map, old documents are old, cloud chat uses the GitLab tools only and CI is the test run, tool cheat sheet, finish with the next command); the `-tdd` role opens a Draft merge request and the `-dev` role removes the Draft mark when CI is green; `gatekeeper` refuses a Draft; new `tools/prompts/project-instructions.md` (text for the Claude Project); `architect.md` rewritten from the owner's original brief; `DOMAINS.md` and `tasks/README.md` updated; `proposals/007-agent-start.md`. The 12 `<domain>-tdd` and `<domain>-dev` role files are rewritten.
**Why:** one command must be enough, and the owner must see a merge request per task from the start.
**Verify:** CI of the merge request. Then: `sidebar-tdd: task 003` opens the Draft merge request on the branch `sidebar/publish-state` without exploring.
**Follow-ups (owner only):** paste `tools/prompts/project-instructions.md` into the Claude Project and delete the old documents and the old architect brief there; the old text still describes `ext/ahm/map/`, GitHub and cloning and was the likely cause of the confusion (inferred, not seen).

## 2026-11-07 — #19 Lean delivery (proposal 008, owner approved)
**What:** the `-tdd` agent opens no merge request (the Draft flow of #18 is dropped); only `-dev` opens it. `.gitlab-ci.yml`: job `tests` runs only when code, tests, config, `context/`, `tools/*`, `*.php` or `*.json` change; documents (every `.md` file) skip it. `tools/prompts/_common.md`: agents test git once and clone when it works (local tests, small outputs), rule 11 (small tool output), the two role flows now live there; the 12 domain role files are short; `gatekeeper` has no Draft check; `project-instructions.md` updated; `DOMAINS.md`; proposals 007 (note) and 008.
**Why:** CI minutes and tokens. Red tests on a merge request waste a pipeline; a documents-only change ran the full PHP and JS tests with browser.
**Verify:** CI of this merge request (it changes `.gitlab-ci.yml`, so the tests still run once). Then a documents-only merge request must show only the job `domain`. `sidebar-dev: task 003` opens the merge request on `sidebar/publish-state`.
**Follow-ups:** the path list in `.gitlab-ci.yml` must grow with a new top-level code folder. Optional next step: split `tests` into PHP and JS jobs with their own path lists, and cache the npm and Playwright installs. Owner decides where `-tdd` and `-dev` run: Claude Code on his computer (git works) or a Project chat (GitLab tools; this plan has no option to allow gitlab.com).

## 2026-11-07 — #20 Tokens: no git probe in the chat, one commit per step, one chat per task
**What:** `tools/prompts/_common.md` (Start here, point 4; rule 11) and `tools/prompts/project-instructions.md`: in a Claude chat the agent no longer tests git (gitlab.com is blocked and cannot be allowed on this plan, checked on the settings screen); Claude Code on the owner's computer keeps git. New token rules: all file changes of a step in one `add_commit`; one chat per task. Checked: `.gitlab-ci.yml` of this branch already lists neither `README.md` nor `INTERFACES.md` for the job `tests`; no change needed. Documents only; no code, test or interface change.
**Why:** the failed `git ls-remote` was a wasted call in every chat session; long chats re-send every old tool result.
**Verify:** CI of this merge request shows only the job `domain` (documents only). The owner pastes the new text of `project-instructions.md` into the Project.
**Follow-ups (owner only):** run the `-tdd` and `-dev` agents in Claude Code with a local clone (the biggest token saving); in the GitLab connector switch off the tools the agents do not use.

## 2026-11-08 — #21 The map domain gets a test file (proposal 009)
**What:** `map-tdd: task 004` stopped because the map domain owned no test file. `tools/domains.json`: `tests/js/map.test.js` added to the map domain; `tasks/004-map-highlight.md` names it; `context/map.md` "Your files" line updated by hand (the generator could not be run in the chat); `proposals/009-map-test-file.md`. No application code or interface change. Merge only after the owner writes `Status: approved` in the proposal (gatekeeper refused !8 without it).
**Why:** the file-ownership tests forbid map-tdd from writing into another domain's test file.
**Verify:** CI of this merge request (`domains.test.js`, `context.test.js`). If `context.test.js` fails, run `node tools/make-context.js` and commit the result.
**Fix after CI of !8 (2026-11-08):** `tests/js/domains.test.js` failed twice: `tests/js/map.test.js` was registered but did not exist, and `.gitlab/CODEOWNERS` was stale. Fixed in !9 (branch `shared+map/map-test-file`, replaces !8): comments-only placeholder `tests/js/map.test.js` (a map file, so the branch names `map`) and the new CODEOWNERS line (same text as `node tools/check-domain.js --codeowners`, added by hand). The existence test is NOT relaxed.
**Follow-ups:** `map-tdd: task 004`.

## 2026-11-08 — #22 I-2 event list: the map handles `state:selected` (I-6)
**What:** `INTERFACES.md` I-2: the table of events handled by the map has a new row `state:selected` (`{ value, old }`, emitted by `AHM.state`; the map highlights the selected place and never writes `selected`). `tests/js/contract.test.js`: the check "events handled by the map" accepts `state:selected` besides `sidebar:resized`; the test stays green before and after the map implements it. No code change.
**Why:** the roll-out of I-6 (`tasks/004-map-highlight.md`) makes the map listen to `state:selected`; the contract must name it first.
**Verify:** CI of this merge request (`contract.test.js`).
**Follow-ups:** `map-tdd: task 004`. Once the map handles the event, the test may be tightened to require it (owner decides).

## 2026-11-08 — #23 UI roadmap: proposal 010 and tasks 006-014
**What:** the owner's 21 requests (screenshots, 2026-11-08) are grouped into 9 tasks in 5 waves: `tasks/006` to `tasks/014`. `proposals/010-ui-contract.md` (Status: pending) holds the interface changes: icons (I-7), one types dictionary for points, lines and areas (I-8), shapes with layer membership (I-9), map commands and events for shapes and a point menu (I-2), the UI rules. `tasks/README.md` lists them. Documents only; nothing is built.
**Why:** points 15, 16, 19, 20, 21 need new interfaces, and only the owner can approve them. The other points are fixes inside one domain.
**Verify:** CI of this merge request (only the job `domain`). Read the proposal.
**Follow-ups:** the owner writes `Status: approved` in the proposal (or asks for changes); then task 005, 006, 009 (architect), and the waves: 007 and 008 first, then 010 and 011, then 012 and 013, then 014.

## 2026-11-08 — #25 Task 006: the sidebar domain gets a test file
**What:** `tests/js/sidebar.test.js` (comments-only placeholder) is registered for the sidebar domain in `tools/domains.json`, `.gitlab/CODEOWNERS` and `context/sidebar.md` (same text as the generators make), and named in the test-ownership line of `DOMAINS.md`. The branch names the sidebar domain because the placeholder is a sidebar file (same method as proposal 009). The existence test is not relaxed.
**Why:** proposal 010 A (approved 2026-11-08, `tasks/006-sidebar-test-file.md`): `sidebar-tdd` needs a test file of its own for tasks 007, 012 and 014.
**Verify:** `node tests/js/run.js` (CI job `tests`: `domains.test.js`, `context.test.js`).
**Follow-ups:** `sidebar-tdd: task 007`.


