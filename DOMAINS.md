# Domains: who may change what (`ahm/map`)

Purpose: several agents can work at the same time without merge conflicts and without touching each other's code.
Every file belongs to exactly one domain. An agent changes files of **its own domain only**. Everything between domains goes through
the interfaces in `INTERFACES.md`, and **only the owner (the human) can change an interface**.

**Status of this structure: step 4 of 4 done** (documents, refactor to the interface, enforcement tooling, parallel work). Agents may now
work at the same time, one per domain, as described in "Parallel work" below. The first agents: **map** and **campaigns**
(starter prompts: `tools/prompts/`).

## The domains

| Domain | What it is | Owns (paths now) |
|---|---|---|
| **sidebar** | everything the user sees in the side panel: tabs, lists, details, forms, search fields, dialogs, date/place forms | `app/js/sidebar/*` (`ui.js`, `layers.js`, `placeform.js`, `datefield.js`, `searchfield.js`, `period.js`), `app/css/sidebar.css`, the sidebar parts of `app/index.html` |
| **map** | the map canvas and everything drawn or done on it: base maps, symbols, labels, halos, popups, markers, routes, historical-map overlays, map clicks | `app/js/map/*` (`map.js`, `overlays.js`, `typeicons.js`), `app/css/map.css`, and the **Maps fold** of the More tab in `app/index.html` (`#more-maps`: base map, groups, historical maps) |
| **data** | storage and the server: files in `data/`, PHP service and controller, the Node dev mirror, the file formats, validation rules | `data/**`, `service/**`, `controller/**`, `config/**`, `event/**`, `language/**`, `ext.php`, `composer.json`, `dev/**`, `tests/php/**`, `tests/data/**`, `tests/fixtures/rules.json` |
| **core** | functions with no DOM and no map: dates, search and filtering, layer rules, loading and normalising data in the browser, the outside services (place search, directions) | `app/js/core/*` (`dates.js`, `data.js`, `search.js`, `layer-rules.js`, `providers.js`), `tests/fixtures/dates-vectors.json` |
| **state** | the state manager: the one module that holds state shared between domains (selected place, layer state), provided as `AHM.state` (I-6, proposal 003, approved; built, `changes/state.md` #1) | `app/js/state/**`, `tests/js/state.test.js` |
| **campaigns** | the military-campaigns feature, a switchable add-on (see "Features") | `app/features/campaigns/**`, `tests/js/campaigns.test.js` |
| **shared** (owner only) | the shell and the contracts: no agent edits these without an approved proposal | `app/index.html` (script and style list, page skeleton), `app/js/config.js`, `app/js/ahm.js`, `app/js/features.js`, `app/css/base.css`, `INTERFACES.md`, `DOMAINS.md`, `AGENTS.md`, `tests/js/run.js` and `tests/js/lib/**`, `tools/**`, `CODEOWNERS` |

Notes:
- **data** includes the PHP/Node mirror: a rule changed in `service/store.php` is changed in `dev/save-handler.js` and in
  `tests/fixtures/rules.json` in the same change, by the same agent.
- **core** is used by sidebar and map. Its function names and signatures are an interface (I-3).
- Step 2 split the files that mixed two kinds of code: layer rules are `core/layer-rules.js`, the layers UI is `sidebar/layers.js`; the
  period fields and the search field template moved from `search.js` to `sidebar/`. Each file now has one owner.
- Tests live with the code they test: a domain's tests are owned by that domain. Tests for an interface (contract tests) are owned
  by **shared**; the domain that breaks one fixes its own code, never the test.
- The sample data in `data/` is owned by **data**.

## Rules for every agent

1. **Declare your domain** in the first line of your answer ("Domain: sidebar"). Work only in that domain's files.
2. **Never edit another domain's file**, not even for a one-line fix. Write a request instead (below).
3. **Never change an interface** (`INTERFACES.md`, or any name, signature, event, endpoint or file format it lists). If your work
   needs a different interface, write a proposal (below) and stop that part of the work. The owner decides.
4. **Use other domains only through their interface**: the sidebar calls `AHM.map.*` and listens to `AHM.on(...)`, never `map.*`,
   never MapLibre objects, never map.js internals. The map never reads the sidebar's state. Anyone may call core functions.
5. **No new globals** outside your own files. Cross-domain names exist only as listed in `INTERFACES.md`.
6. **One diff per answer, your domain only.** The diff is checked by `node tools/check-domain.js <domain> <diff>`: a file outside the
   declared domain (other than your own records) rejects it. The table of owners is `tools/domains.json`; `CODEOWNERS` is made from it.
7. **Your own records**, after the roll-out: change log `changes/<domain>.md`, to-do `todo/<domain>.md`, diff numbering per domain
   (only when the owner asks for diff files; work normally goes by pull request). Never append to another domain's records. This is what prevents merge conflicts in the
   shared log files.
8. **Tests:** run your domain's tests and the contract tests before delivering. Do not change the tests of another domain.

## Parallel work (step 4)

> **Legacy method (archives and diff files).** Since the repository became the project root (2026-11-07) work goes by pull request, see "Git workflow" below. The steps here describe the old archive method and apply only if the owner asks for diff files.

Roles: the **owner** decides and approves; the **integrator** (the owner, or one agent he names) merges; each **domain agent** works in one domain.
1. **Start.** Every agent starts from the latest full archive (or, with git, its own branch/worktree `agent/<domain>`; the tree is not a git
   repository today, so the archive plus diffs is the working method). Agents never share a working copy.
2. **Work.** The agent declares its domain, changes only its domain's files, logs in `changes/<domain>.md`, and runs
   `node tools/check-domain.js <domain> <diff>` and `node tests/js/run.js`.
3. **Deliver.** One diff `diffs/<domain>/NNN-<name>.diff` (its own numbering), the log entry, the test result, and the full archive of its tree
   (AGENTS.md rule 3; the integrator's merged archive is the one that counts).
4. **Merge.** The integrator applies the diffs one by one (`patch -p1 --dry-run`, then for real), runs all three test sets, and builds the archive.
   Diffs of different domains never touch the same file (the records are per domain), so they do not conflict.
   A diff that does not apply goes back to its agent, who re-applies the work on the newest archive. Only the integrator edits shared files.
5. **Cross-domain needs** go through `requests/` (fits the current interface) or `proposals/` (changes an interface); the owner decides.

## Git workflow (step 5; replaces the archives and diff files)

**Layout:** the repository root IS the extension (`app/`, `data/`, `service/`, `tests/`, `tools/`, the documents). In a forum it is installed as `<forum>/ext/ahm/map/`. There is no `ext/`, no `diffs/` and no forum style in the repository; `styles/` holds only the extension's own phpBB styles (owned by data). All paths in this project are relative to the repository root.

The project lives in the GitLab project `bellaabrahamyan.am/ahm` (https://gitlab.com/bellaabrahamyan.am/ahm, project id 88632181; the repository root is the extension). The trunk branch is `master`. GitHub is not used any more; the history before 2026-11-07 is one snapshot commit.
- **`master`** changes only through merge requests (MR). CI (`.gitlab-ci.yml`) must be green: job `domain` (`tools/ci-check-pr.js`: the branch may change only the
  domain(s) named in its name) and job `tests` (PHP, data, JS incl. browser and lint; it runs only when code, tests, config, `context/`, `tools/*`, `INTERFACES.md` or `README.md` change, so merge requests that change only documents such as `changes/`, `todo/`, `proposals/`, `tasks/`, `AGENTS.md`, `DOMAINS.md`, `tools/prompts/` or `.claude/` skip it; the path list is in `.gitlab-ci.yml`). `.gitlab/CODEOWNERS` (made by `check-domain.js --codeowners`) asks the owner to review.
- **Branches** are named `<domain>/<task>` (`map/highlight`; several domains `shared+state/scaffold`). One branch, one task, one merge request.
- **Roles per task.** Fixed agent names (files `.claude/agents/<name>.md`, shared rules `tools/prompts/_common.md`): `architect` (task specs, proposals, interfaces), `<domain>-tdd` (commits the failing tests first, `test: ...`, and pushes the branch; no merge request, so no pipeline runs on tests that are red on purpose), `<domain>-dev` (continues on that branch, `feat: ...`/`fix: ...`, runs the tests, then opens the merge request, does not merge), `gatekeeper` (the only merger, all domains). Domains: sidebar, map, data, core, state, campaigns. Call an agent by name plus a task: `map-dev: task 006` (the file `tasks/006-*.md`), `map-dev: do tasks/006-x.md` or `map-dev: <free description>`. A small task may have one agent doing both tdd and dev, tests first. In a Claude Project chat the first line of a message is `<role>: <task>`; the owner pastes `tools/prompts/project-instructions.md` into the Project once. If gitlab.com is not blocked in the chat, agents clone and run the tests locally; if it is blocked, they use the GitLab tools and the CI pipeline is the test run (the owner can allow gitlab.com in the chat's network settings).
- **Commits** read `<type>: <what>` in English. The change-log entry of the domain (`changes/<domain>.md`) is in the same merge request (AGENTS.md rule 2).
- **Keep up to date:** `git pull --rebase origin master` before the merge request is ready. Records are per domain, so conflicts are rare; shared files are changed only by shared branches.
- **Merge request, CI and acceptance:** only the `-dev` agent opens the merge request (`tools/prompts/_common.md` rule 8), after the tests pass locally when it has git; it waits until the newest pipeline is `success` and stops ("MR !n ready for gatekeeper"). It never merges. The `-tdd` agent only pushes its branch: no merge request, no pipeline. The `gatekeeper` checks the merge request against the task spec (domain, acceptance criteria, tests not weakened, interfaces untouched, change-log entry, CI green) and merges it (`accept_merge_request`, squash, only with the head sha it reviewed), or sends it back with a note. Never merge red.
- **Merge:** by `gatekeeper` only; squash merge, title = the MR title. The owner pulls with `git pull origin master`.
- **No diff file and no archive** are needed for work delivered by merge request (AGENTS.md rules 1 and 3 apply only to work NOT delivered that way, or when the owner asks).
- **Repository settings (owner only; no agent can change them):** Settings > Repository > Protected branches: `master`, nobody may push to it, merging only by the owner or `gatekeeper`. Settings > Merge requests: tick "Pipelines must succeed" and "All threads must be resolved", set squash commits to "Require" (or "Encourage") and tick "Delete source branch". Without these settings the rule "never merge red" is the only guard.
- **Secrets:** if the project is public, everything committed is world-readable. Public or not, never commit passwords, tokens, personal data or private forum data; `data/` holds sample data only (live data stays in the forum's `store/ahm_map/`).
- **CODEOWNERS:** `.gitlab/CODEOWNERS` names the owner for every path. Making an owner's approval mandatory may need a paid GitLab plan (check Settings > Repository > Protected branches); until then `gatekeeper` is the guard.
- **Owner setup, once:** (1) verify the GitLab account identity (phone or card): without it GitLab runs no CI job ("Identity verification is required in order to run CI jobs"); (2) protect `master` and set the merge request options above; (3) connect GitLab to Claude so the cloud agents can use the GitLab tools (they act as the user who connected it); (4) archive the GitHub repository and revoke its tokens.

## Features (switchable add-ons, step 4)

A feature is new, unfinished functionality that must be **visible in development and hidden in production**, and removable without a trace.
It is built as a folder `app/features/<name>/` owned by its own domain `<name>` (INTERFACES.md I-5). The mechanism:
- **Switch:** `AHM_CONFIG.features` (`app/js/config.js`, shared). Development: the list in `config.js`; `?features=` in the URL hides all, `?features=a,b` picks.
  Forum: hidden unless the controller sends `AHM_BACKEND.features` (it does not). To remove a feature everywhere: delete its name from the list.
  To ship without it at all: leave out `app/features/<name>/` from the release package; the loader then only logs a warning.
- **Loader:** `app/js/features.js` (shared) is the only bridge. Nothing else in the app knows the feature exists; `tests/js/features.test.js`
  fails if any file of another domain mentions a feature's name, if the feature declares top-level names, uses anything but the interface, emits events not
  named `<name>:*`, or styles anything but `.<name>-…`/`#<name>-…`.
- **Agent rule:** a feature agent touches only its folder, its test file and its records. Needs outside (map drawing, server storage, a sidebar entry) are
  requests or proposals; the owner decides. First open one: `proposals/002-map-extension-points.md` (custom map layers).
- **Going live:** when the owner decides, he (or the integrator) adds the name to what the controller sends (data domain request) and the feature is on.

## Requests and proposals (the only way across a boundary)

- **Request** (a need from another domain's code that fits the current interface): add a file
  `requests/<from>-to-<to>-NNN-<name>.md` (what, why, the exact interface call you expect). The owner forwards it; the owning
  agent implements it in its own domain.
- **Proposal** (a change to an interface): `proposals/NNN-<name>.md` with: current text, new text, who is affected, migration
  steps, tests to add. Nothing is implemented before the owner writes "approved" in the file. After approval the owner (or the
  integrator agent he names) updates `INTERFACES.md` and its version number, then each affected domain adapts in its own change.
- Both folders exist (`requests/`, `proposals/`, each with a README). `proposals/001-search-run-options.md` (implemented) and `proposals/002-map-extension-points.md` (pending) exist.

## Integrator

The owner, or one agent he names for a given moment, is the **integrator**. Only the integrator: edits **shared** files, merges
the domains' diffs, runs the full test set (`php tests/php/run.php`, `php tests/data/run.php`, `node tests/js/run.js`), and builds
and sends the full archive (`AGENTS.md`, requirement 3). A domain agent delivers its diff, its log entry and its test result; it
does not build the archive when several agents work in parallel.

## How the rules are enforced (all in `node tests/js/run.js`, owned by shared)

- `domains.test.js`: every file has exactly one owner in `tools/domains.json`; CODEOWNERS is in sync; the diff checker accepts and rejects what it should.
- `boundaries.test.js`: a script may not use a top-level name declared by another domain (the two written-down exceptions are in the test).
- `context.test.js`: the starter contexts in `context/` are current and short; the architect package has no application code.
- `features.test.js`: the feature flag, the loader, and the isolation rules of every `app/features/<name>/` folder (I-5).
- `contract.test.js`: the endpoint names (I-1), `AHM.map` commands and events (I-2), core function names (I-3), `typeIcon` (I-4).
- A new file needs an owner line in `tools/domains.json` (shared domain, owner approval) or the tests fail.
- Test ownership: `layers.test.js` is sidebar's; `dates`, `data`, `search` tests and `dates-vectors.json` are core's; `php`, `data` tests, `parity.test.js`
  and `rules.json` are data's; `browser`, `lint` and the five tests above (`features` and `context` too), the runner and `tests/js/lib` are shared.

## Roll-out (each step needs the owner's "go")

1. **Documents** (done): `DOMAINS.md`, `INTERFACES.md`, `AGENTS.md`. No code changes.
2. **Refactor to the interface** (done, entry #26; the owner reviews it): add `window.AHM` (I-2), move every current
   cross-domain call onto it (list in `INTERFACES.md`, "Known violations"), split `layers.js` and `search.js` by owner, split
   `style.css` into `base.css`, `sidebar.css`, `map.css`, move files into `app/js/<domain>/`, and update the script list.
   Behaviour did not change; the tests pass unchanged except for file paths and load lists.
3. **Enforcement** (done, `changes/shared.md` #1): `CODEOWNERS`, `tools/check-domain` (rejects a diff with files outside the declared domain), ESLint
   `no-restricted-globals` / import rules per folder, contract tests for I-1 to I-3, and the per-domain logs, to-dos and diff
   folders (the legacy `AGENT_CHANGES.md` and `TODO.md` become read-only history).
4. **Parallel work** (done, `changes/shared.md` #3): "Parallel work" and "Features" above; the campaigns domain and its scaffold; starter prompts in `tools/prompts/`.
