# Domains and the working method (`ahm/map`)

Two things in this file: (1) **domains**, the areas of the code and who owns each file; (2) **how work gets done**: one `builder` agent does an item of `TODO.md`, one `critic` agent verifies it and merges.

Domains are areas, not walls. The one `builder` may change files of several domains in one item when the item needs it. What stays strict: **`sidebar` and `map` talk only through `window.AHM`** and nothing adds a cross-domain call beyond `INTERFACES.md` (`tests/js/boundaries.test.js` enforces it), and **protected files** change only with the owner's approval (below).

## The domains

| Domain | What it is | Owns (paths now) |
|---|---|---|
| **sidebar** | everything the user sees in the side panel: tabs, lists, details, forms, search fields, dialogs, date/place forms | `app/js/sidebar/*` (`ui.js`, `layers.js`, `placeform.js`, `datefield.js`, `searchfield.js`, `period.js`), `app/css/sidebar.css`, the sidebar parts of `app/index.html` |
| **map** | the map canvas and everything drawn or done on it: base maps, symbols, labels, halos, popups, markers, routes, historical-map overlays, map clicks | `app/js/map/*` (`map.js`, `overlays.js`, `typeicons.js`), `app/css/map.css`, and the **Maps fold** of the More tab in `app/index.html` (`#more-maps`: base map, groups, historical maps) |
| **data** | storage and the server: files in `data/`, PHP service and controller, the Node dev mirror, the file formats, validation rules | `data/**`, `service/**`, `controller/**`, `config/**`, `event/**`, `language/**`, `ext.php`, `composer.json`, `dev/**`, `tests/php/**`, `tests/data/**`, `tests/fixtures/rules.json` |
| **core** | functions with no DOM and no map: dates, search and filtering, layer rules, loading and normalising data in the browser, the outside services (place search, directions) | `app/js/core/*` (`dates.js`, `data.js`, `search.js`, `layer-rules.js`, `providers.js`), `tests/fixtures/dates-vectors.json` |
| **state** | the state manager: the one module that holds state shared between domains (selected place, layer state), provided as `AHM.state` (I-6; built, `changes/state.md` #1) | `app/js/state/**`, `tests/js/state.test.js` |
| **campaigns** | the military-campaigns feature, a switchable add-on (see "Features") | `app/features/campaigns/**`, `tests/js/campaigns.test.js` |
| **shared** (owner only) | the shell and the contracts: changes only in a TODO.md item with an `Approved:` line when it is a protected file | `app/index.html` (script and style list, page skeleton), `app/js/config.js`, `app/js/ahm.js`, `app/js/features.js`, `app/js/icons.js` (icons, I-7), `app/css/base.css`, `INTERFACES.md`, `DESIGN.md` (UI rules), `DOMAINS.md`, `AGENTS.md`, `tests/js/run.js` and `tests/js/lib/**`, `tools/**`, `CODEOWNERS` |

Notes:
- **data** includes the PHP/Node mirror: a rule changed in `service/store.php` is changed in `dev/save-handler.js` and in
  `tests/fixtures/rules.json` in the same change, by the same agent.
- **core** is used by sidebar and map. Its function names and signatures are an interface (I-3).
- Step 2 split the files that mixed two kinds of code: layer rules are `core/layer-rules.js`, the layers UI is `sidebar/layers.js`; the
  period fields and the search field template moved from `search.js` to `sidebar/`. Each file now has one owner.
- Tests live with the code they test: a domain's tests are owned by that domain. Tests for an interface (contract tests) are owned
  by **shared**; the domain that breaks one fixes its own code, never the test.
- The sample data in `data/` is owned by **data**.

## Rules (short)

1. **One item of `TODO.md` = one branch = one pull request.** Branch `<type>/<task>`, type = feat, fix, docs, test, refactor, chore (`feat/point-menu`). Never push to `master`.
2. **Interfaces** (`INTERFACES.md`, `interfaces/`): a change needs an item with an `Approved:` line of the owner. Use other domains only through them: the sidebar calls `AHM.map.*` and listens to `AHM.on(...)`, never `map.*`, MapLibre objects or map.js internals; anyone may call core functions. No new globals outside your own files.
3. **Tests first**, for every new rule; the contract and boundary tests are never edited to make a change pass.
4. **Records:** an entry in `changes/<domain>.md` of each domain touched (several builders never share one file because logs are per domain), the `docs/` section kept current, the item moved to Done in `TODO.md`. A decision a later agent could undo by mistake goes into `docs/08-underlying-decisions.md`.
5. **Decisions of the owner** are made in `TODO.md`: "Needs you" holds the question (2 or 3 options, a recommendation); the owner answers with a line `Approved: <date> <decision>`. There are no proposal, request or task-spec files any more (history: `changes/archive/`).

## Working method (builder and critic)

| Role | File | Does | Never |
|---|---|---|---|
| **owner** | (you) | adds items to `TODO.md`, decides "Needs you", gets the critic's reports | |
| **builder** | `.claude/agents/builder.md` | spec (as criteria), tests first, prototype and design, code, docs, pull request | merges; edits protected files without an `Approved:` item; edits a test only to make it pass |
| **critic** | `.claude/agents/critic.md` | verifies the pull request itself (CI, own test run, mutation check, test-weakening check, scope, protected files, diff review, manual run) and merges if all is good, else reports to the owner | changes any file; merges red or unverified work |

Commands: `builder: T-012`, `builder: next`, `builder: <free description>` (becomes an item first), `critic: PR #<n>`, `critic: all open PRs`, `builder: fix PR #<n>` (after a critic's report).

**Why two agents:** an author checking its own work misses what it assumed. The critic runs everything again from `master`, and its mutation check (the new tests must fail without the change) shows whether the tests test anything.

**What the critic cannot verify here:** the map canvas (the map library comes from a CDN the sandbox cannot reach), a real forum, real phones. It lists these as "needs the owner's eyes" with exact steps, and they are never counted as verified.

## Git workflow

- **Layout:** the repository root IS the extension (`app/`, `data/`, `service/`, `tests/`, `tools/`, documents). In a forum it is installed as `<forum>/ext/ahm/map/`. All paths are relative to the root.
- **Project:** GitHub `bellaabrahamyanam-alt/ahm`, trunk `master`, squash merges, only by the critic. `.gitlab-ci.yml` and `.gitlab/CODEOWNERS` are a mirror of the same logic.
- **CI** (`.github/workflows/ci.yml`, one job `ci`, runs `tools/ci.sh`): (1) `tools/ci-check-pr.js`: branch name `<type>/<task>`; protected files changed only when the PR description has `Owner-approved: T-NNN`; (2) `graph/`: in a PR the job rebuilds it and, when changed, commits it to the PR branch (secret `GRAPH_PUSH_TOKEN`) and stops, the new commit's run does the tests; on `master` it only checks; (3) PHP, data and JS tests. PRs that change only documents stop after step 1.
- **Protected files** (`protected` in `tools/domains.json`): the agent rules (`AGENTS.md`, `CLAUDE.md`, `DOMAINS.md`, `.claude/`, `tools/prompts/`), the contracts (`INTERFACES.md`, `interfaces/`, `contract.test.js`, `boundaries.test.js`), CI and ownership files. The builder cannot loosen the rules or the judge of its own work.
- **Commits** read `<type>: <what>` in English and end with the attribution lines of the environment.
- **A shallow clone** tracks only `master`: `git fetch origin master` before a rebase. In a Claude Code cloud session GitHub's GraphQL API is blocked: `gh pr create` fails, use `gh api repos/<owner>/<repo>/pulls` (REST).
- **Owner setup (no agent can change it):** `TODO.md` item T-004: protect `master` (require a PR and the check `ci`), squash merge on, "Automatically delete head branches" on, secret `GRAPH_PUSH_TOKEN` (fine-grained token, repository `ahm`, Contents: read and write). Never commit tokens or private forum data.

## Features (switchable add-ons)

A feature is new, unfinished functionality that must be **visible in development and hidden in production**, and removable without a trace.
It is built as a folder `app/features/<name>/` owned by its own domain `<name>` (INTERFACES.md I-5). The mechanism:
- **Switch:** `AHM_CONFIG.features` (`app/js/config.js`, shared). Development: the list in `config.js`; `?features=` in the URL hides all, `?features=a,b` picks.
  Forum: hidden unless the controller sends `AHM_BACKEND.features` (it does not). To remove a feature everywhere: delete its name from the list.
  To ship without it at all: leave out `app/features/<name>/` from the release package; the loader then only logs a warning.
- **Loader:** `app/js/features.js` (shared) is the only bridge. Nothing else in the app knows the feature exists; `tests/js/features.test.js`
  fails if any file of another domain mentions a feature's name, if the feature declares top-level names, uses anything but the interface, emits events not
  named `<name>:*`, or styles anything but `.<name>-…`/`#<name>-…`.
- **Rule:** work on a feature touches only its folder, its test file and its log. A need outside it (map drawing, server storage, a sidebar entry) is a TODO.md item under "Needs you" (first one: T-001, custom map layers).
- **Going live:** when the owner decides, the owner adds the name to what the controller sends (a TODO.md item, T-013) and the feature is on.

## How the rules are enforced (all in `node tests/js/run.js`, owned by shared)

- `domains.test.js`: every file has exactly one owner in `tools/domains.json`; CODEOWNERS is in sync.
- `ci.test.js`: the branch name rule and the protected-files rule of the pull-request check.
- `boundaries.test.js`: a script may not use a top-level name declared by another domain (the two written-down exceptions are in the test).
- `context.test.js`: the starter contexts in `context/` are current and short.
- `features.test.js`: the feature flag, the loader, and the isolation rules of every `app/features/<name>/` folder (I-5).
- `contract.test.js`: the endpoint names (I-1), `AHM.map` commands and events (I-2), core function names (I-3), `typeIcon` (I-4), the state manager and its keys (I-6; the map must handle `state:selected`); the names added in 1.5 (I-1, I-2, I-3) are accepted but not yet required.
- `icons.test.js`: the icon set of I-7 (names, markup, size, load order in `index.html`).
- A new file needs an owner line in `tools/domains.json` or the tests fail.
- Test ownership: `layers.test.js` and `sidebar.test.js` are sidebar's; `dates`, `data`, `search` tests and `dates-vectors.json` are core's; `php`, `data` tests, `parity.test.js`
  and `rules.json` are data's; `browser`, `lint`, `icons` and the five tests above (`features` and `context` too), the runner and `tests/js/lib` are shared.
