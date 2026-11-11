# Instructions for any AI agent working on this extension (`ahm/map`)

The owner's standing requirements. They apply to **every** answer and **every** change, by any agent. Roles and the pull-request workflow: `tools/prompts/_common.md` and `DOMAINS.md`.

## 1. Start here (read nothing else first)

1. Name your domain in the first line of every answer: `Domain: <sidebar|map|data|core|state|campaigns|shared>`. The owner gives it (`map-dev: task 004` = domain map); if he does not, take it from the files he names, or ask ONE question.
2. Open `context/<domain>.md`. It lists what to read first and the code of the domain. Do not browse the rest of the project.
3. Find where to work in `graph/<domain>.md` (one line per file) and open that part of the file only (offset and limit).
4. Work. Before delivering run the checks of section 5.

Other documents, only when the task needs them: `DOMAINS.md` (domains, git workflow), `INTERFACES.md` and `interfaces/` (contracts), `docs/` (the project description, one file per section, index in `README.md`), `changes/archive/` (history: never read it whole).

## 2. Owner's working requirements (always follow)

1. **English only.** Talk to the owner in English, and write all code, comments, commit labels, documentation, test names and messages in English, even if the owner writes in another language.
2. **Record every change for other agents.** Append an entry to the change log of your domain, `changes/<domain>.md` (date, what, why, files, how to verify, open follow-ups), in the same pull request. Another agent must be able to continue from that file alone. An agent that works across several domains writes one entry in each log it touched. Keep the log short: when it grows past about 10 entries, move the oldest to `changes/archive/<domain>-NNN-NNN.md`.
3. **Deliver by pull request** (`DOMAINS.md`, "Git workflow"): the pull request is the diff and the repository is the archive. A diff file or a full archive is needed only when the work is NOT delivered by a pull request, or when the owner asks: the old rules are in `docs/legacy-chat-workflow.md`.
4. **Keep these requirements.** This file is where they are stored. If the owner adds, changes or removes one, update this file in the same pull request.
5. **To-do lists.** Do only the items the owner asks for, do not change anything outside what the item needs, and do not change the tests unless the owner says so. New to-do items of a domain go to `todo/<domain>.md`; when an item is finished, mark it done there (date and change-log entry number). `TODO.md` (the 15 sidebar items) is done and is history.
6. **Domains and interfaces.** The project is split into the domains **sidebar, map, data, core, state, campaigns** and **shared** (owner only); see `DOMAINS.md`. Each agent changes only its domain's files (`tools/domains.json`), talks to other domains only through the interfaces (`INTERFACES.md`), and writes a request or a proposal instead of touching anything else. **Interfaces and the shared files change only with the owner's explicit approval.** The sidebar and the map talk only through `window.AHM`; the rules are enforced by tests. A single agent working alone for the owner may touch several domains if his request needs it, but must keep the boundaries and must not add new cross-domain calls beyond "Known violations" in `INTERFACES.md`.

## 3. Token rules (they save the owner's tokens)

- Read `context/<domain>.md` and only what it lists; open a file once, and only the part you need.
- Change files with small edits, never by rewriting a whole file. Do not re-read a file you just wrote.
- Cut test and tool output: `| tail -15`, and `| cut -c1-300` when a line can be long.
- Do not paste files or test output into answers. Say what changed and the result in a few lines.
- One task per session; the next task starts a new session.
- Never open `changes/archive/`, `app/bun.lock`, `tests/fixtures/dates-vectors.json` or `node_modules` (denied in `.claude/settings.json`).
- When a domain's files change a lot, update `tools/context.json` and run `node tools/make-context.js` (`tests/js/context.test.js` fails if `context/` is stale). `node tools/make-context.js --cost` shows the bytes a starter makes an agent read.
- The architect works from the docs-only package `node tools/make-context.js --architect` (documents, records, proposals, tools; no application code).

## 4. Project rules (details: `docs/09-code-style.md`)

- No build step; classic scripts in the order listed in `app/index.html`. Escape output through `esc()`.
- All data rules live in `service/store.php` (no phpBB classes) and are mirrored in `dev/save-handler.js`. A rule changed in one must be changed in the other.
- The place-type list is kept in three places: `PLACE_TYPES` (`sidebar/placeform.js`), `TYPE_STYLE` (`map/typeicons.js`), `TYPES` (`store.php`, `save-handler.js`).
- Every write: lock, archive the old file, atomic write. Never delete data without an archived copy.
- Prettier settings: 120 columns, 2 spaces, single quotes. `app/css/*.css` are hand-formatted.
- Update the matching `docs/` section (index: `README.md`) when behaviour, structure, routes or data format change.

## 5. Checks before you deliver

- Branch `<domain>/<task>` (several domains `a+b/<task>`); never push to `master`.
- With git: `node tools/ci-check-pr.js <branch> origin/master`, then `node tests/js/run.js 2>&1 | tail -15`; add `php tests/php/run.php` and `php tests/data/run.php` for `service/`, `controller/` or the data format. Without git: `node tools/check-domain.js <domain> <diff>`.
- Add a test for every new rule. A validation rule lives in three places (PHP store, Node dev server, and the table `tests/fixtures/rules.json` that checks both): change all. When a PHP rule changes, change `dev/save-handler.js` too.
- Plans and status of the tests: `tests/README.md`.

## Facts about this project that must not be "fixed" again

- **There is NO `app/css/colours.css` and there must never be a link to it.** The owner confirmed it never existed.
  The palette is the first `:root` block of `app/css/base.css` (copied from the forum style `paper-and-pencil`,
  the forum style `paper-and-pencil` (no longer in the repository)). `app/index.html` links `css/base.css`, `css/sidebar.css`, `css/map.css` (the old single `style.css` was split in step 2). Do not recreate the file.
- `data/overlays.json` is `{ "version": 1, "overlays": [] }` (content given by the owner).
- Languages come from a dictionary (`data/languages.json`); only administrators add to it. No free-text language fields.
- Dates are optional everywhere and use one model (`app/js/core/dates.js` = `service/dates.php`): unknown (`null`), or
  `{ fmt, ts, mode: exact|approx|range, ts_to }`. A mountain has `height_m`, never dates.
- **Every stored timestamp is ISO 8601 / RFC 3339 text in UTC with `Z`** (owner's rule). Date `ts`/`ts_to`: four-digit years
  0000–9999, otherwise ISO 8601 expanded years `±YYYYYY` (year 0000 = 1 BCE, so 1200 BCE = `-001199-01-01T00:00:00Z`).
  Never store bare seconds. Never compare the text alphabetically (BCE sorts wrongly): use `isoToSec` / `iso_to_sec`.
  Overlay `created`/`updated` are `YYYY-MM-DDTHH:MM:SSZ`. Archive file names use the compact basic form (`Ymd-His`).
- **Layers:** the general layer is implicit (all places, all notes). Layers are subsets (`data/layers.json`, ordered `members`),
  categories are a dictionary (`data/categories.json`, admins add/rename, no delete). The period filter ignores layers (owner's
  decision). No box-select. The old "Layers" tab (base map, historical maps) is now **Maps**; "Layers" is the new feature.
  Removing a place from a layer never touches the general layer. Rules mirrored in `store.php` and `dev/save-handler.js`.
- **Sidebar structure (owner asked for a calmer, consistent UI):** tabs Explore / Layers / More; the details of a place or a
  layer open **inside the list, under that item** (no overlay, no Back button; a second click folds them; only a double click
  moves the map); tables without lines for languages and categories; every search field is the shared field with a ✕; primary
  action = `button.primary`, destructive = `.danger`. Keep new screens in this pattern.

