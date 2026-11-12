# TODO: the only list of work

The single place for what is to be done. It replaces task specs, proposals and requests (they are history in `changes/archive/`).

**How it works**
- The owner adds items and decides. The `builder` agent takes an item (`builder: T-003`, or `builder: next`), does it all (spec, tests, design, code, docs) and opens a pull request. The `critic` agent checks the pull request and merges it, or reports to the owner.
- One item = one pull request. Item ids `T-NNN` are never reused.
- **Needs you** holds what only the owner can decide. The builder writes the question there with 2 or 3 options and a recommendation, and stops that item. The owner answers by adding a line `Approved: <date> <decision>` to the item.
- **Protected files** (list `protected` in `tools/domains.json`: agent rules, CI, contracts `INTERFACES.md` and `interfaces/`, ownership) change only in an item that has an `Approved:` line. The pull request description then has `Owner-approved: T-NNN`, and the critic checks it against this file on `master`.
- When an item is finished the builder moves it to **Done** with the date and the pull request number. Keep the last 15 in Done; older ones go to `changes/archive/`.

Item format: `- [ ] T-NNN Title` then indented lines: `Done when:` (what can be checked), `Contract:` yes or no (does it change `INTERFACES.md`).

## Needs you (owner)

- [ ] T-001 Decide: map extension points for the campaigns feature (old proposal 002, `changes/archive/proposals/002-map-extension-points.md`)
  Done when: you write `Approved: <date> yes` or `no`. Yes means the builder adds the extension points to the map and the contract (I-5).
  Contract: yes.
- [ ] T-002 Decide: Known violation 4 in `INTERFACES.md` (`drawShape`, `showMenu`, `map:menu` differ from the contract rows)
  Done when: you choose for each row: change the code to the contract, or change the contract to the code. Recommendation: change the contract to the code (the code works and is tested; 3 rows).
  Contract: yes.
- [ ] T-003 Describe the requirements of the campaigns feature
  Done when: a few lines of what a campaign is and what it must do. Until then nothing is built (`app/features/campaigns/`).
  Contract: no.
- [ ] T-004 GitHub settings no agent can change
  Done when: (1) Settings > Branches: protect `master`, require pull request and the check `ci`; (2) Settings > General: squash merge on, "Automatically delete head branches" on; (3) secret `GRAPH_PUSH_TOKEN` (fine-grained token, repository `ahm`, Contents: read and write) in Settings > Secrets and variables > Actions; (4) delete the old branches `ci-github`, `fix-github-ci-owner`, `shared/fix-github-ci-owner`, `shared/agent-efficiency`, and decide about `feature/routes`.
  Contract: no.

## Next (builder)

- [ ] T-006 CI rebuilds `app/dist/` like `graph/` (so a PR does not need to, and two open PRs do not conflict on it)
  Done when: a PR that changes `app/js` or `app/css` gets its `app/dist/` rebuilt and committed by the job `ci` (Bun installed in the job), and the `build` test still passes. Needs `Approved:` (protected: `tools/ci.sh`, `.github/workflows/ci.yml`).
  Contract: no.
- [ ] T-024 Harden the `app/dist` check
  Done when: `node tools/build.js --check` also fails when `app.min.js` or `app.min.css` differ in size from the manifest (a hand-edited bundle with a matching manifest); the name test in `tests/js/build.test.js` finds each top-level name as a declaration in the bundle, not anywhere in the text; a test shows each failure. Needs `Approved:` (protected: `tests/js/build.test.js`).
  Contract: no.
- [ ] T-021 Log and document the Routes tab (it was merged without a change-log entry)
  Done when: `changes/sidebar.md`, `changes/core.md`, `changes/map.md` and `changes/data.md` each have an entry for what the routes work changed in their files (`app/js/sidebar/routes.js`, `core/routes.js`, `map/shapes.js`, `service/store.php`, `dev/save-handler.js`); the `docs/` sections that describe the tabs and the data format name the Routes tab; `tests/js/routes.test.js` also covers the sidebar part or the item says why not.
  Contract: no.
- [ ] T-022 Block commits that skip CI
  Done when: nine commits since #4 carry `[skip ci]` and `master` went red unnoticed. After T-004 (branch protection) is done, `[skip ci]` is only allowed for documents; the critic refuses a PR whose commits skip the check.
  Contract: no.
- [ ] T-010 Audit the old task specs 006 to 014 against the code
  Done when: for each spec in `changes/archive/tasks/` a line "done", "partly" or "open" with the evidence (file and test); every "partly" and "open" part becomes a new item here. `changes/shared.md` #29 says code of 2026-11-09 (details dock, borders, markers) was made outside the flow, so many are probably done.
  Contract: no.
- [ ] T-011 Make `graph/` cheaper to use: line ranges per definition
  Done when: `graph/<domain>.md` lists `name:line` for the definitions of each file, so an agent opens a part with offset and limit without a search; the size limits of `tests/js/graph.test.js` still hold or are changed with the reason. Measure before and after (bytes an agent reads for one change in `map.js`).
  Contract: no.
- [ ] T-012 CSS and HTML tests (part 4 of `tests/README.md`)
  Done when: the tests listed in part 4 exist and pass; no application change.
  Contract: no.
- [ ] T-013 Controller sends `features: ['campaigns']` when the owner switches the feature on (needs T-003)
  Done when: a data test shows the list in the page data; the forum setting is documented in `docs/10-*.md`.
  Contract: yes (I-1).

## Done

- [x] T-023 The page controller serves the bundle only when its files exist (2026-11-12, PR from branch `fix/dist-guard`)
  From the review of PR #8 (`critic`); no protected file changed.
- [x] T-005 Minify the JS and CSS with Bun (2026-11-12, PR from branch `feat/minify-bun`)
  Approved: 2026-11-12 owner, in the chat: "let's now just minify js and css only with bun. Do it and create PR" (covers `AGENTS.md`, `.claude/agents/builder.md`, `tools/domains.json`, both CODEOWNERS). Vite, webpack and HTML minify were left out on purpose.
- [x] T-020 Fix red CI on `master` after the `feature/routes` merge (2026-11-12, PR from branch `fix/master-ci`)
  Approved: 2026-11-12 owner, in the chat: "review master branch and fix red CI". Covers the protected files touched: `tools/domains.json` (owner of `tests/js/routes.test.js`: core), `interfaces/I-2-sidebar-map.md` and `tests/js/contract.test.js` (`showFound` added to the contract, because the Routes tab already used it). If you want `showFound` out of the contract, say so and it becomes an item.
- [x] T-000 Workflow: one `builder` and one `critic`, one `TODO.md`, no proposals (2026-11-12, PR from branch `chore/builder-critic`)
  Approved: 2026-11-12 owner, in the chat: one major agent, one critic/gatekeeper, only todos, no proposals.
