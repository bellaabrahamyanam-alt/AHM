# Instructions for any AI agent working on this extension (`ahm/map`)

These are the owner's standing requirements. They apply to **every** answer and **every** change, by any agent.
Read this file first, then `DOMAINS.md` and `INTERFACES.md`, then `README.md`, then the log of your own domain `changes/<domain>.md` (the old single log `AGENT_CHANGES.md` is read-only history: read only its last 100 lines, `tail -n 100 AGENT_CHANGES.md`, never the whole file).

## Owner's working requirements (always follow)

1. **One diff file per answer** (when the work is NOT delivered by a GitHub pull request: see `DOMAINS.md`, "Git workflow", where the pull request is the diff). Every time you answer with changes, produce exactly one unified-diff file containing all the
   changes of that answer (`diff -ruN` style, paths `a/…` and `b/…` relative to the repository root, i.e. `app/...`, `tests/...`).
   **Send that diff to the owner as its own separate file in every answer** (`SendUserFile`, next to the archive), so it is visible
   without opening the archive. The same file is also stored in `diffs/` inside the archive (requirement 3).
2. **Record every change for other agents.** Every time you change something, append an entry to the change log of your domain,
   `changes/<domain>.md` (date, what, why, files, how to verify, open follow-ups). The entry is part of the same diff.
   Another agent must be able to continue from that file alone. (`AGENT_CHANGES.md` is the read-only history of entries #1-#26;
   when one agent works across several domains for the owner, it writes one entry in each domain log it touched.)
3. **Always deliver the FULL ARCHIVE** (when the work is NOT delivered by a pull request; with a pull request the repository is the archive) (supersedes the earlier "only changed files" rule). In every answer give the owner the
   whole project as ONE `.tar.gz` file. "Everything" means everything in the project: the code, **the diffs**, the tests, the
   documentation, the data, **dotfiles** and every other file. The ONLY thing left out is `node_modules` (any folder with that
   name). Nothing else is skipped, ever, and "the archive" always means this full archive.
   - The diffs of all answers are kept in the archive in `diffs/` (there is no `diffs/` folder since the repository root became the extension folder). New diffs go to
     `diffs/<domain>/NNN-<short-name>.diff` (numbering per domain, starting at 001; a diff that spans domains goes to the domain
     of the main change); the older ones stay as `diffs/ahm-map-NNN-<short-name>.diff`. The diff of the current answer is added there. The archive holds ALL diffs
     (001, 002, …); the separate file sent with an answer is only that answer's diff.
   - Check the archive before sending: list it, confirm `diffs/`, `tests/`, `data/`, `TODO.md` and the docs are inside and that no
     `node_modules` is.
4. **Keep these requirements.** This file is where the requirements are stored. Follow it every time. If the owner adds, changes
   or removes a requirement, update this file in the same answer (and the same diff). A copy is also kept in the Claude Project
   "PHPBB extension for map".
5. **Language: English only.** Talk to the owner in English, and write all code, comments, commit/diff labels, documentation,
   test names and messages in English, even if the owner writes in another language. Do not switch language.
6. **Sidebar to-do list:** the owner's open sidebar requirements are in `TODO.md`. Do only the items the owner
   asks for in an answer, do not change anything outside what the item needs, and do not change the tests unless the owner says
   so. When an item is finished, mark it done there (date and change-log entry number). All 15 items are done; new to-do items
   of a domain go to `todo/<domain>.md`.

7. **Domains and interfaces (several agents).** The project is split into the domains **sidebar, map, data, core, state, campaigns** and
   **shared** (owner only); see `DOMAINS.md`. When more than one agent works, each agent: declares its domain in the first line of
   its answer, changes only that domain's files, talks to other domains only through the interfaces in `INTERFACES.md`, and writes
   a request or a proposal instead of touching anything else. **Interfaces and the shared files change only with the owner's
   explicit approval.** The roll-out is in steps (documents → refactor → enforcement → parallel work); the current step is stated in
   `DOMAINS.md`. Steps 1-4 are done (parallel work: `DOMAINS.md`, "Parallel work" and "Features"; new feature domain: **campaigns**): the sidebar and the map talk only through `window.AHM`, and the rules are enforced by tests.
   **Before delivering, run `node tools/check-domain.js <your-domain> <your-diff>` and `node tests/js/run.js`** (the tests include
   file ownership, the cross-domain boundaries and the interface contracts). When several agents work in parallel each stays in its
   own domain (a feature agent only in its feature folder). A single agent working alone for the owner may touch several domains if his request needs it
   (`check-domain.js sidebar,map <diff>`), but must keep the boundaries and must not add new cross-domain calls beyond those listed under "Known violations" in `INTERFACES.md`.

## Token rules (added 2026-11-06; they save the owner's tokens)

Every agent starts by reading `context/<domain>.md` (generated by `node tools/make-context.js`, listed in `tools/context.json`) and ONLY the files it lists.
Do not browse the rest; open a file once and read only the part you need; change files with small edits; cut test output (`| tail -15`, and `| cut -c1-300` when a line can be long: the test runner already cuts failure messages at 600 characters);
do not paste files or test output into answers; one task per session, the next task starts a new session from the latest archive.
The whole tree stays on disk because the tests need it; the rule limits what is read, not what is delivered (rule 3 is unchanged).
The architect (integrator) works from the docs-only package `node tools/make-context.js --architect` (documents, records, proposals, tools; no application code).
When a domain's files change a lot, update `tools/context.json` and run the generator (`tests/js/context.test.js` fails if `context/` is stale).

## Project rules (from `README.md`, section 9; abbreviated)

- No build step; classic scripts in the order listed in `app/index.html`. Escape output through `esc()`.
- All data rules live in `service/store.php` (no phpBB classes) and are mirrored in `dev/save-handler.js`.
  A rule changed in one must be changed in the other.
- The place-type list is kept in three places: `PLACE_TYPES` (`sidebar/placeform.js`), `TYPE_STYLE` (`map/typeicons.js`),
  `TYPES` (`store.php`, `save-handler.js`).
- Every write: lock, archive the old file, atomic write. Never delete data without an archived copy.
- Prettier settings: 120 columns, 2 spaces, single quotes. `app/css/*.css` are hand-formatted.
- Update `README.md` when behaviour, structure, routes or data format change.

## How the diff and the change log are produced (procedure)

1. Work on the tree. Keep an untouched baseline copy of the previous state.
2. Diff: `diff -ruN --exclude=node_modules <baseline> <current>` with paths normalised to `a/…` and `b/…`, saved as
   `<short-name>.diff`.
3. Check that the diff applies to the baseline (`patch -p1 --dry-run`).
4. Put the diff into `diffs/` and send the full archive (requirement 3).

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

## Tests (owner wants them built in four separate parts)

Order: **PHP (done) → data (done) → JavaScript (done) → CSS/HTML**. Plans and status are in `tests/README.md`. Run PHP tests with
`php tests/php/run.php` before delivering any change to `service/` or `controller/`, and `php tests/data/run.php` after any change to the data format or sample data; `node tests/js/run.js` after any change to `app/js/` or `dev/`; add a test for every new rule. A validation rule lives in three places (PHP store, Node dev server, and the table `tests/fixtures/rules.json` that checks both): change all.
When a PHP rule changes, change `dev/save-handler.js` too (the same tests will later be run against it).
 (first session, 2026-11-03)

- The archive has the dot-files without the dot (`app/editorconfig`, `app/prettierrc.json`, `app/prettierignore`).
- `app/node_modules` (161 MB) is in the archive and is excluded from diffs.
- The repository root is the extension (it is installed in a forum as `ext/ahm/map/`). The forum style `paper-and-pencil` and the `diffs/` folder were removed from the repository on 2026-11-07; `styles/` now holds only the extension's own phpBB styles (`styles/all`).
