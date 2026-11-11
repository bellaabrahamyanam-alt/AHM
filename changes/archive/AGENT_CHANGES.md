> **LEGACY, READ-ONLY (since 2026-11-06).** Entries #1-#26 are the history of the single-agent period. From now on every domain
> writes its own `changes/<domain>.md` and `todo/<domain>.md` (DOMAINS.md, rule 7). Do not append here.

# Agent change log (`ahm/map`)

Newest entry last. Read `AGENTS.md` first. Each entry says what changed, why, in which files and how to check it, so
that another agent can continue without the chat history.

---

## 2026-11-03 — #1 Set up working requirements and change log

- **What:** Added `AGENTS.md` (the owner's standing requirements and the diff procedure) and this file.
  No application code was changed.
- **Why:** The owner asked that the requirements be stored and always followed, and that every change be recorded for
  other agents.
- **Files:** `ext/ahm/map/AGENTS.md` (new), `ext/ahm/map/AGENT_CHANGES.md` (new).
- **Verify:** Both files exist; the diff `ahm-map-001-agent-setup.diff` applies to the uploaded archive.
- **Observations for next steps (not fixed):**
  - `README.md` mentions `app/css/colours.css` and `data/overlays.json`; neither is in the archive.
    `app/index.html` links `css/colours.css`, so without it the colours variables may be missing (`style.css` has its
    own copy, README section 9).
  - README mentions `.editorconfig`, `.prettierrc.json`, `.prettierignore`; the archive has them without the leading
    dot, under `app/`.
  - `app/node_modules` (161 MB) is in the archive; consider excluding it from future archives.
  - README says the README "Not verified: behaviour inside a live phpBB"; still true.

---

## 2026-11-04 — #2 Language dictionary, one date model, mountain height, no colours.css, overlays.json

Requested by the owner. **Correction to entry #1:** `app/css/colours.css` never existed; the "missing file" note in #1
was wrong. The link is removed and the README says so (see `AGENTS.md`, "Facts … must not be fixed again").

**Note for other agents:** part of this work had already been done in the working tree by an earlier turn of this
session without a log entry and without delivering a diff. This entry covers the whole difference between the archive
(+ entry #1) and the tree at the end of this turn. That earlier part was audited and tested in this turn (see Verify).

### What
1. **colours.css:** removed the `<link … css/colours.css>` from `app/index.html`; README states there is no such file.
2. **overlays.json:** added `data/overlays.json` with the content the owner gave (`{ "version": 1, "overlays": [] }`).
3. **Language dictionary** (admins only add):
   - `data/languages.json`; `store::languages()`, `save_language()`, `lang_load()` (created from the languages in use
     if missing). `store::save()` refuses a name or note language that is not in the dictionary.
   - Route `GET /map/data/languages`, `POST /map/language-save` (administrators; `can_admin()` in the controller;
     `canLanguage` in the page config). Dev server: `POST /api/language/save`.
   - UI: every language field is a `<select>` of the dictionary (`langOptions()` in `placeform.js`), a hint says to ask an
     administrator when a language is missing, new **Languages** tab (list; add form only for administrators).
   - Languages cannot be renamed or removed in the interface (only added).
4. **One date model everywhere** (places, notes, period filter): a date is unknown (`null`) or
   `{ fmt, ts, mode, ts_to }`. `fmt` is the format the person chose (`ymd`, `dmy`, `mdy`, `dmony`, `mony`, `y`, `c`
   century, `m` millennium), `ts` is the UTC time stamp in seconds of the start of the period, `mode` is `exact`,
   `approx` or `range` (`ts_to` = start of the last period of the range). Files: `app/js/dates.js` (also loaded by
   `dev/save-handler.js`), `service/dates.php` (mirror), `app/js/datefield.js` (the input widget), changes in
   `placeform.js`, `ui.js`, `search.js`, `map.js`, `data.js`, `config.js`, `store.php`.
   - Dates are optional (default "Unknown"); a place has "began" and "ended".
   - Old data (year number + wording + `approx` flag, notes with `year:`/`when:`) is converted automatically
     (`store::migrate()`, dev server at start); the old file is copied to `archive/` first. `places.geojson` gets
     `"version": 2`. Note files carry one `date: {json}` line.
5. **Mountain:** has `height_m` (optional, whole metres 0–9000) and never dates; every other type has dates and no
   height. Form switches on the type; hover popup shows dates only when there are some.
6. `app/css/style.css`: styles for the date field and Languages tab; the language select in a name row widened
   (130 px; it was 56 px from the time it was a text box). `dev/build_notes_index.py` reads the new note format.
7. `README.md` rewritten for all of the above (sections 2, 4, 5, 6, 7, 8, 10, 13, 14). `AGENTS.md` extended.

### Files
Changed: `README.md`, `AGENTS.md`, `AGENT_CHANGES.md`, `config/routing.yml`, `controller/main.php`,
`service/store.php`, `app/index.html`, `app/css/style.css`, `app/js/{config,data,dates,map,placeform,search,ui}.js`,
`dev/{save-handler.js,build_notes_index.py}`. New: `service/dates.php`, `app/js/datefield.js`,
`data/languages.json`, `data/overlays.json`. (All paths under `ext/ahm/map/`.)

### Verify (all run on 2026-11-04, see README section 14)
- JS date model: 48 000 round trips; JS vs PHP: 25 600 vectors identical.
- `store.php` scenarios on a copy of the sample data (migration, languages, heights, dates, notes).
- Headless browser against the dev server: 18 checks, no page errors (map library stubbed).
- `php -l` on all PHP, `node --check` on all JS, `py_compile` on the Python script.

### Open / not verified
- Not tried inside a live phpBB. Controller permissions only syntax-checked in this turn.
- Sample data in `data/` is still in the old format; it is converted on first enable / first save / dev server start.
  Shipping it converted would rename every sample note file (large diff); decide with the owner.
- `ui.js` still uses double quotes (as the original); other files were reformatted with single quotes per README §9.
- Julian dates are not converted (entered as written, treated as Gregorian).
- Idea: let an administrator edit/deprecate a language (currently add-only).

---

## 2026-11-04 — #3 Timestamps in ISO 8601 / RFC 3339

Requested by the owner: "use ISO 8601 / RFC 3339 timestamp format".

### What
1. **Date `ts` / `ts_to` are now ISO 8601 / RFC 3339 text** (UTC, always `Z`, whole seconds) instead of integer seconds,
   e.g. `{ "fmt": "dmy", "ts": "1500-03-21T00:00:00Z", "mode": "exact", "ts_to": null }`.
   - Years 0000–9999: four digits (valid RFC 3339). Other years (all BCE, since 0000 = 1 BCE; and > 9999): ISO 8601
     expanded year `±YYYYYY`, e.g. 1200 BCE = `-001199-01-01T00:00:00Z`. RFC 3339 has no such years; this is the
     reason for "ISO 8601 / RFC 3339" together. Decision taken by me (the owner did not specify BCE handling).
   - Strict single spelling (`Z` only, no offsets, no `+000500`, no lower-case `z`, no trailing newline).
   - Internally everything is compared as seconds (`isoToSec` / `iso_to_sec`); **never compare the text
     alphabetically** (BCE sorts wrongly).
2. `app/js/dates.js`: new `secToIso`, `isoToSec`, `dateUpgrade`; `dateToTs` returns ISO text; `dateFromTs`, `dateAligned`,
   `datePeriodEnd` take ISO text; `dateBounds`/`dateKey` return seconds. `service/dates.php`: mirror
   (`sec_to_iso`, `iso_to_sec`, `upgrade`; `bounds()` returns seconds).
3. **Migration of data from #2** (integer `ts`): `store::migrate_place_dates` / `migrate_note_dates` and the dev server
   equivalents rewrite places (`places.geojson` becomes `"version": 3`) and note files; old file archived first. The
   browser (`data.js`) and the search index also upgrade on read, so unconverted data still works.
4. Overlay `created` / `updated` are now UTC with `Z` (`gmdate`), the dev server drops the milliseconds.
   Archive file names are unchanged (`Ymd-His`, local time; colons are not safe in file names).
5. README (section 5 Dates, places example, decisions table, Updating, verification) and `AGENTS.md` updated.

### Files (under `ext/ahm/map/`)
`app/js/dates.js`, `app/js/data.js`, `service/dates.php`, `service/store.php`, `dev/save-handler.js`, `README.md`,
`AGENTS.md`, `AGENT_CHANGES.md`. (`app/js/datefield.js` needed no change: it only passes the text through.)

### Verify (run 2026-11-04)
- JS: 48 000 round trips; 30 000 random ISO strings equal JavaScript's `Date.parse`; 15 rejected spellings.
- JS vs PHP: 25 600 vectors + 2 020 time stamp strings identical (incl. refusals); upgrade of seconds identical.
- `store.php`: sample data migration, saves, and conversion of #2-format places and notes (also the search index).
- Headless browser on the dev server: 21 checks, no page errors, incl. a seeded integer date upgraded and
  `places.geojson` on disk containing only ISO time stamps. Map library stubbed.

### Open
- Sample data in `data/` is still in the old (year number) format; it converts to the new format on first enable/save.
- Time zones / sub-day precision are not modelled: every date is a whole day or longer, start-of-period at 00:00:00Z.

---

## 2026-11-04 — #4 Thematic layers (subsets of the general layer), categories, tab rename

Requested by the owner ("Let's build it", after the discussion; decisions listed in README section 2 "Layers").

### What
1. **Data:** `data/categories.json`, `data/layers.json` (single file, ordered `members`), `data/layer-notes/<layer>/<note>.md` + `index.json`;
   place notes may have a header line `layers: id,id`; `notes/index.json` entries gain `layers: []`. (I had first said "one file per layer";
   the code uses one `layers.json`. Say so to the owner if they prefer per-file.)
2. **Back-end:** `service/store.php` (categories, layers, members, layer notes, tag cleanup, `layer_save` dispatcher; `save()` takes
   `layer_ids`/`layer_id` and `note.layers`), `config/routing.yml` (12 routes), `controller/main.php` (`layer_save` editors,
   `layer_delete`/`category_save` admins, `canLayerAdmin`), `dev/save-handler.js` (Node mirror).
   Part of this back-end existed in the tree before this entry without a log; it was audited and tested.
3. **Front-end:** new `app/js/layers.js` (Layers tab, filters Only/Hide, detail view, choose-places mode with one save, layer form,
   layer notes via the note dialog, categories, place-details layers). Hooks in `config.js`, `data.js` (loaders tolerate missing files),
   `search.js` (`layerAllows`), `map.js` (ring layer `ahm-halo`, clicks toggle membership while choosing), `ui.js` (notes scope, dialog
   tick boxes, reload, Reset, `#layer-<id>` link), `index.html`, `style.css`.
4. **Tab rename:** old "Layers" → **Maps** (`data-tab="maps"`, `section#tab-maps`, `overlays.js` `tab('maps')`).
5. README and AGENTS.md updated.

### Files (under `ext/ahm/map/`)
Changed: `README.md`, `AGENTS.md`, `AGENT_CHANGES.md`, `config/routing.yml`, `controller/main.php`, `service/store.php`,
`dev/save-handler.js`, `app/index.html`, `app/css/style.css`, `app/js/{config,data,search,map,overlays,ui}.js`.
New: `app/js/layers.js`, `data/categories.json`, `data/layers.json`, `data/layer-notes/index.json`.

### Verify (2026-11-04)
`php` store 81 checks, controller (phpBB stand-ins) 29, Node dev server 75, headless browser 22 (map stubbed), older tests still pass.

### Open
- Not tried in a live phpBB; the real map ring and marker clicking not exercised (map library stubbed).
- Deleting languages/categories is not supported. Reordering members and route lines are future work (data format is ready).
- Sample data still in the old format for places/notes (converts on first save).

---

## 2026-11-04 — #5 Sidebar restructure (less jumping, consistent, cozier)

Requested by the owner (pain points: jumping between views, too many controls, inconsistent look, cramped; scope: restructure navigation).

### What
1. **Tabs 5 → 3:** Explore, Layers, More. Maps, Directions, Languages became folds (`<details class="fold" id="more-maps|route|lang">`) in `section#tab-more`.
   `tab(n)` in `ui.js` maps the old names to More and opens the fold, so `tab('maps')`/`tab('route')` calls still work.
2. **Sheets:** `#detail` (place) and `#lyDetail` (layer) are `.sheet` panels (absolute, inside `.stack` beside `.body`) instead of hiding the list;
   header with Back, scrolling body, sticky `.sheet-actions` bar. The `.viewing` class and its CSS were removed. Tab click and typing in search close the place sheet.
3. **Active filter chips** (`#activeBar`: types, language, period via `ui.js`; layers via `layers.js`) visible while Filters is closed; Filters closed by default.
4. **Buttons/spacing:** `.primary`, `.danger`, `.back`; larger inputs/buttons/rows, 14 px gutters, line-height 1.45. Labels shortened (Edit, Route from, Route to).
5. README (section 2 Sidebar), AGENTS.md, this entry.

### Files (under `ext/ahm/map/`)
`app/index.html`, `app/css/style.css`, `app/js/ui.js`, `app/js/layers.js`, `README.md`, `AGENTS.md`, `AGENT_CHANGES.md`.

### Verify
Headless browser (map stubbed): 33 checks incl. three tabs, fold opening, chips, sheet keeps the list, Back, search leaves sheet, all layer flows; older e2e passes. Screenshots reviewed (desktop, 390 px wide).
### Open
Not tried on a real phone or in a live phpBB; the bottom-sheet drag on mobile was not re-tested. Dialogs (new place/note/layer) were only restyled slightly.

---

## 2026-11-04 — #6 PHP test suite (part 1 of 4) and an archive fix it found

Requested by the owner: write tests for the PHP part only; data, JS and CSS/HTML tests are prepared (plans) and come next, one at a time.

### What
1. **`tests/php/`**: dependency-free runner (`php tests/php/run.php [filter]`), harness, 9 test files, 92 tests (3 951 assertions): dates, places,
   notes, languages, migration, overlays, layers/categories, controller (phpBB stand-ins), routing. Shared fixture `tests/fixtures/dates-vectors.json`.
2. **`tests/README.md`**: how the suite works, what is not covered, and the plans for the data, JS and CSS/HTML parts.
3. **Bug found and fixed (data safety):** `store::save()` (new place, `place_update`, note edit) and `save_language()` named archive copies
   with a bare second-resolution stamp, so two changes in the same second **overwrote the first backup**. They now use `archive_path()`
   (unique names), as the layer code already did. The same fix is mirrored in `dev/save-handler.js` (`archivePath`).
4. Mutation spot checks (5 deliberate breaks of store/dates/controller) were all caught by the suite.

### Files (under `ext/ahm/map/`)
New: `tests/README.md`, `tests/fixtures/dates-vectors.json`, `tests/php/{run,harness}.php`, `tests/php/*Test.php`.
Changed: `service/store.php`, `dev/save-handler.js`, `AGENTS.md`, `AGENT_CHANGES.md`.

### Verify
`php tests/php/run.php` -> `92 passed, 0 failed`. `node --check dev/save-handler.js`.

### Open
Controller tests use stand-ins, not a live phpBB. Next: part 2 (data tests) — see `tests/README.md`; the owner should decide whether
the shipped sample data is converted to the current format first.

---

## 2026-11-04 — #7 Data tests (part 2 of 4) and plans for JS and CSS/HTML

Requested by the owner: write tests for the data part; prepare (plan) the JavaScript part, then the CSS/HTML part.

### What
1. **`tests/data/`**: `DataCheck.php` (read-only checker of a data folder, returns `[code, message]`), `run.php`, `DataTest.php` (38 tests:
   shipped sample as-is / migrated / API-built, read-only proof, 33 deliberate defects each reported with its own code, CLI exit codes).
   Live check: `php tests/data/run.php /path/to/store/ahm_map`.
2. **Finding (not a bug in code):** the shipped sample is entirely in the old format (`<lang>.md` notes, year numbers); the data test only allows
   those known old-format notices. Converting the sample is an open question for the owner (see below).
3. `tests/README.md`: part 2 documented; **concrete plans** for part 3 (JavaScript: Node `vm` + DOM stand-in, Playwright flows, a shared
   PHP/JS rule table for `dev/save-handler.js`, eslint/prettier) and part 4 (CSS/HTML: structure, accessibility, layout at 1280/390 px, CSS
   variables, `[hidden]` overrides, contrast, screenshots). No test code for 3 and 4 yet, by request.

### Files (under `ext/ahm/map/`)
New: `tests/data/{DataCheck.php,run.php,DataTest.php}`. Changed: `tests/README.md`, `AGENTS.md`, `AGENT_CHANGES.md`.

### Verify
`php tests/data/run.php` -> `38 passed, 0 failed`; `php tests/php/run.php` still `92 passed`.

### Open
Convert the shipped sample data to the current format (large diff: renames every sample note file)? Until decided, nothing else changes.

---

## 2026-11-05 — #8 JavaScript tests (part 3 of 4), a dev-server fix, plan for CSS/HTML

Requested by the owner: write tests for the JS part; prepare the CSS/HTML part (plan only).

### What
1. **`tests/js/`** (53 tests, `node tests/js/run.js [filter] [--no-browser]`): harness, `lib/ctx.js` (scripts in a vm with a DOM stand-in),
   `lib/devserver.js`; `dates`, `data`, `search`, `layers`, `parity`, `lint`, `browser` tests (see `tests/README.md`).
2. **Shared rule table `tests/fixtures/rules.json`** (58 cases) read by the new `tests/php/ParityTest.php` and by `tests/js/parity.test.js`:
   the PHP store and the Node dev server give the same verdict on every case (they did, on the first run).
3. **Bug fixed in `dev/save-handler.js`:** a broken or non-object JSON body (`garbage`, `null`, `"x"`, `[1]`) answered **500**; it now answers
   **400 "bad request"**, like the PHP controller.
4. ESLint over all browser scripts as one program found no undefined or doubly declared names (a real risk with classic scripts).
5. Mutation spot checks (hide logic, layer filter, note default, dev-server message) were caught.
6. `tests/README.md`: part 3 documented; part 4 plan refined (reuses the dev server and browser helpers).

### Files (under `ext/ahm/map/`)
New: `tests/js/**`, `tests/fixtures/rules.json`, `tests/php/ParityTest.php`. Changed: `dev/save-handler.js`, `tests/README.md`,
`AGENTS.md`, `AGENT_CHANGES.md`, `README.md`.

### Verify
`node tests/js/run.js` -> `53 passed` (~26 s with the browser scenarios; `--no-browser` ~2 s); `php tests/php/run.php` -> `93 passed`;
`php tests/data/run.php` -> `38 passed`.

### Open
Map drawing is not tested (stand-in). Part 4 (CSS/HTML) is planned, not written. Sample data conversion question (see #7) still open.

---

## 2026-11-05 — #9 Sidebar item 1: the "Armenian Highlands" title is removed

Requested by the owner (first of 15 sidebar items; only this one was asked for now). The full list is in `TODO.md` (new file); item 1 is marked done.

### What
- `app/index.html`: removed `<h1>Armenian Highlands</h1>` from the sidebar header (the browser tab `<title>` is unchanged).
- `app/css/style.css`: removed the unused `h1` rule; `header` now right-aligns the collapse button (`justify-content: flex-end`), so it stays where it was.
- `TODO.md` (new): all 15 requirements as a checklist; #1 done.

### Not changed (by request)
Nothing outside the sidebar; **no test was changed**.

### Verify
`php tests/php/run.php`, `php tests/data/run.php`, `node tests/js/run.js` all green with the unchanged tests.

### Open
Items 2-15 of `TODO.md`. The old "diff + changed files" delivery was replaced for this answer by the whole project as one tar.gz, at the owner's request.

---

## 2026-11-05 — #10 Delivery rules: full archive always, English only

Requested by the owner (no application code changed).

### What
- `AGENTS.md`: requirement 3 now says **always deliver the full archive** (everything incl. diffs, tests, docs, data, dotfiles; only
  `node_modules` excluded); new requirement 5 **language is English only** (conversation, code, comments, docs); new requirement 6
  points to `TODO.md`. Procedure step 4 updated.
- The diffs of all answers are now kept in the archive in `diffs/` (001-010; 009 = sidebar title removal, 010 = this change).

### Files
`ext/ahm/map/AGENTS.md`, `ext/ahm/map/AGENT_CHANGES.md`, and the new `diffs/` folder at the archive root.

### Verify
`tar tzf` of the archive shows `diffs/`, `ext/ahm/map/tests/`, `data/`, `TODO.md`, docs and no `node_modules`.

---

## 2026-11-05 — #11 Sidebar item 2: the collapse button is an icon

Requested by the owner (`TODO.md` item 2; only this item).

### What
- `app/index.html`: `#collapse` (was the text "«") and `#expand` (was "»") are now icon buttons (`.icon-btn`): a panel outline with a chevron
  inside (inline SVG, `currentColor`), with `title` and `aria-label`. Ids and the click handlers in `ui.js` are unchanged.
- `app/css/style.css`: `.icon-btn` (32 px square, muted colour, accent on hover / keyboard focus); in the phone layout the icon is turned
  90° so it matches the bottom sheet.
- `TODO.md`: item 2 marked done.

### Not changed
Nothing outside the sidebar; no test was changed.

### Verify
`php tests/php/run.php`, `php tests/data/run.php`, `node tests/js/run.js` pass with the unchanged tests; screenshots of the open and collapsed panel
(desktop) and the phone layout were looked at.

---

## 2026-11-05 — #12 Sidebar item 3: the resize edge is grey, not blue

Requested by the owner (`TODO.md` item 3; only this item).

### What
- `app/css/style.css`: `#resizer:hover`, `:focus` and `body.resizing #resizer` use the muted grey (`var(--muted-color)`, opacity 0.25) instead of the link blue (`var(--a)`, 0.35).
- `TODO.md`: item 3 marked done.

### Not changed
Nothing outside the sidebar; no test was changed.

### Verify
Drag the sidebar edge: the strip is light grey. The three test suites pass unchanged.

---

## 2026-11-05 — #13 Sidebar item 4: no "Search other places" button; Enter searches

Requested by the owner (`TODO.md` item 4; only this item).

### What
- `app/js/ui.js`: removed the `#geoGo` button (its input handler and click branch). Enter in the search field now runs the OpenStreetMap search (`doGeo`, needs 3+ characters). Typing still never searches. Enter no longer opens the first local result (the list is already shown while typing).
- `app/css/style.css`: removed the `#geoGo` rule.
- `app/index.html`: the placeholder says "(Enter: other places)" so the key is discoverable.
- `TODO.md`: item 4 marked done.

### Not changed
Nothing outside the sidebar; no test was changed.

### Verify
Type 3+ letters: no button appears; press Enter: "Searching…" then results (or the "not available" message offline). Test suites pass unchanged.

---

## 2026-11-05 — #14 Delivery rule: the diff is also sent as a separate file

Requested by the owner (he could not see the diff files, which were only inside the archive's `diffs/` folder).

### What
- `AGENTS.md`: requirement 1 now says the answer's diff is sent as its own separate file in addition to being stored in `diffs/` in the archive; requirement 3 says `diffs/` holds all diffs.

### Files
`ext/ahm/map/AGENTS.md`, `ext/ahm/map/AGENT_CHANGES.md`, `diffs/ahm-map-014-diff-delivery.diff`.

### Verify
Each answer has two attachments: the archive and that answer's `.diff`. `tar tzf` shows `diffs/` with all diffs.

---

## 2026-11-05 — #15 Sidebar item 5: Categories moved to the More tab, under Languages

Requested by the owner (`TODO.md` item 5; only this item).

### What
- `app/index.html`: the "Categories" block (`#catList`, `#catAdmin`) left the Layers tab and is now a new fold `#more-cat` ("Categories") in the More tab, right after the "Languages" fold. A one-line note says categories group the layers. The ids are unchanged, so `layers.js` needed no change.
- `TODO.md`: item 5 marked done.

### Known test failure (tests were NOT changed, by the owner's rule)
`node tests/js/run.js`: 52 passed, 1 failed. The browser scenario in `tests/js/browser.test.js` (around lines 160-180) still looks for `#catList` / `#catForm` / `#catSave` while the Layers tab is open; they are now in the More tab, inside a closed fold. PHP (93) and data (38) tests pass.
Follow-up for the owner's decision: update that scenario to open the More tab and the Categories fold (`[data-tab=more]`, then click `#more-cat summary`) before using the category controls.

### Verify
Open More: the Categories fold follows Languages; the Layers tab no longer shows categories (the category filter select above the layer list stays).

---

## 2026-11-05 — #16 Sidebar item 6: one table-like UI to add and edit languages

Requested by the owner (`TODO.md` item 6; only this item).

### What
- `app/js/ui.js`: the Languages fold is a table without lines: each row = pencil button · code · English name · native name (`li.tr`, CSS grid). The last row is the add/edit row: plus icon (adding) or pencil icon (editing) · code field · English-name field · native-name field, with placeholders. Below it Save (`#lgAdd`, half width) and Cancel (`#lgCancel`, half width). The pencil loads a language into that row (its code is read-only: names and notes refer to it); Cancel or a successful Save returns to "add". Non-administrators see the plain table without pencils and the old "ask an administrator" note. Element ids `#lgCode`, `#lgName`, `#lgNative`, `#lgAdd`, `#lgErr`, `#langList` are kept.
- Back end (needed for editing; before this a language could only be added): `service/store.php` `save_language()` and `dev/save-handler.js` `saveLang()` accept `edit: true`, which replaces the names of an existing code (error "is not in the list" if unknown); without `edit` the old behaviour is unchanged ("already in the list"). The old file is archived first, as for add.
- `app/css/style.css`: `.tr` grid, `.btn-pair` (half/half buttons), no row lines in `.langs`; the phone-layout 90° turn of the icons now targets only `#collapse svg, #expand svg` (it also hit the new pencils).
- `TODO.md`: item 6 marked done.

### Not changed
Tests were not changed and no test was added for editing a language (follow-up if wanted). Languages still cannot be deleted. Categories (item 7) are untouched.

### Tests
PHP 93 and data 38 pass. JS: 52 passed, 1 failed: the same categories scenario as in entry #15 (not related to this change).

### Verify
More > Languages: click a pencil, change a name, Save; or fill the bottom row and Save to add. Cancel resets the row.

---

## 2026-11-05 — #17 Sidebar item 7: categories use the same table-like UI

Requested by the owner (`TODO.md` item 7; only this item).

### What
- `app/js/layers.js` (`lyRenderCats`, `catFill`, `catClick`): each category row = pencil · name in the filter language (bold) · all names, as a grid without lines (`li.tr.tr-cat`). The pencil opens the name fields (the former "Rename" fields: language select, name, "+ Add another name") in a row right under that category, with Save and Cancel (half width each). When nothing is edited there is one full-width "Add" button (`#catAdd`) under the list; it opens the same fields under the list. Only one editor is open at a time; Save/Cancel close it. Ids `#catList`, `#catForm`, `#catSave`, `#catCancel`, `#catErr` are kept. State: `lyCatOpen` = null / 'new' / category id. Non-administrators see the table without pencils and the old note. Changing the interface language re-renders the list and closes an open editor.
- The icon constants `ICON_PENCIL` / `ICON_PLUS` moved from `ui.js` to `layers.js` (loaded first; the layer unit tests load `layers.js` alone).
- `app/css/style.css`: `.tr-cat` columns, `.cat-edit`, `button.wide`.
- `TODO.md`: item 7 marked done. No back-end change (categories could already be renamed and added).

### Tests
PHP 93, data 38 pass. JS 52 passed, 1 failed: the same browser scenario as in #15/#16; it also uses the old flow (fills `#catForm` without pressing "Add" and clicks the old "Rename" button). Tests were not changed (owner's rule). Follow-up: update that scenario (More tab, Categories fold, click `#catAdd` / the pencil).

### Verify
More > Categories: pencil opens the fields under the row; Cancel closes; "Add" opens the fields under the list; Save adds and closes.

---

## 2026-11-05 — #18 Sidebar item 8: place details open in the list; no map move, no Back

Requested by the owner (`TODO.md` item 8; only this item).

### What
- `app/js/ui.js`: `show(id)` no longer calls `map.flyTo`, so opening a place never moves the map (this also holds for a click on a map marker and for the `#place-<id>` link; moving the map on double click is item 9). The details (`#detail`, now an `li`) are placed by `placeDetail()` directly under that place's row in `#list`; the other places stay in the list; the open row has class `on`. `update()` parks `#detail` in the hidden `#detailHome` while the list is rebuilt and puts it back afterwards. If the open place is filtered out of the list, its row is added at the top so the details still hang under a name.
- Removed the "← Back" button and the sheet look: the details use `.inline-body` / `.inline-actions` (no overlay, no scrolling panel). The place name/type line and `<h2>` are no longer repeated in the details (the row above already shows them). The edit form lost its top "← Cancel" (the bottom Save/Cancel stay).
- Closing: click the open place again, press Esc, change the search, or switch tab (as before). Opening a place from another tab (a layer's place list) switches to Explore.
- `app/index.html`: `#detail` is an `li` inside a hidden `#detailHome` list; `app/css/style.css`: `li.place-open`, `li.on`, `.inline-body`, `.inline-actions`.
- `TODO.md`: item 8 marked done.

### Not changed
Layer details (item 10) still use the sheet and "← All layers". Place dialog, map code and back end untouched.

### Tests
PHP 93, data 38 pass. JS 52 passed, 1 failed: the same browser scenario as in #15-#17; it also clicks `[data-act=back]` and expects `#detail .sheet-actions`, which no longer exist. Tests not changed (owner's rule). Follow-up: update that scenario.

### Verify
Click a place: the map stays still, the details open under it and the other places remain; click it again: they fold. Edit opens the form in the same spot.

---

## 2026-11-05 — #19 Sidebar item 9: double click moves the map to a place

Requested by the owner (`TODO.md` item 9; only this item).

### What
- `app/js/ui.js`: new `focusPlace(id)`: opens the place's details if they are not open yet, then `map.flyTo` (zoom at least 8). A `dblclick` handler on `#list` calls it. The second click of a double click (`event.detail > 1`) is ignored by the single-click handler, so a double click does not fold the details it just opened.
- `app/js/map.js`: a `dblclick` handler on the map: on a place symbol or label it cancels the default double-click zoom and calls `focusPlace`. Not active while choosing places for a layer.
- Single clicks (map or list) still never move the map (`show()` has no `flyTo` since #18). `TODO.md`: item 9 marked done.

### Tests
PHP 93, data 38 pass; JS 52 passed, 1 failed (the same browser scenario as #15-#18). Checked in a browser with a recording stub: single click = 0 map moves, double click in the list = one `flyTo` and the details open. The map double click itself cannot be exercised here (MapLibre is stubbed): code review only.

### Verify
Single click a place (list or map marker): details open, map stays. Double click it: the map moves to it.

---

## 2026-11-05 — #20 Sidebar item 10: a clicked layer opens under itself in the list

Requested by the owner (`TODO.md` item 10).

### What
- `app/js/layers.js`: `#lyDetail` (now an `li`, parked in the hidden `#detailHome` list) is placed by `lyPlaceDetail()` right under the layer's row in `#lyList`; the other layers stay in the list; the open row has class `on`. The "← All layers" button and the sheet are gone (`lyRowHTML` was split out of `lyRenderList`; `inline-body` / `inline-actions` as for places). A second click on the open layer folds it. If the layer is filtered out of the list its row is added at the top.
- `app/index.html`: the `#lyDetail` sheet was removed from `.stack`; `#lyDetail` sits in `#detailHome`.
- `domPark()` (layers.js) and a guard on `li.after` keep the unit tests working: their DOM stand-ins have no `append`/`after`. Without it 17 layer tests failed. Tests were not changed.

### Note on history
Most of this code was already in the working tree (files modified at 18:59, after diff 019, with no log entry and no TODO mark). I reviewed it, fixed the unit-test breakage above, checked it in a browser (layer details inside `#lyList`, no Back button, second click folds) and log it here.

---

## 2026-11-05 — #21 Sidebar items 11 and 12: no type and language chips under Filters

### What
- `app/js/ui.js` `update()`: `#fActive` shows only the period chip; the selected types and the language are not repeated (they are visible inside Filters). Same status note as #20 (code was already in the tree; verified).

---

## 2026-11-05 — #22 Sidebar item 13: "Add layer" section

### What
- `app/index.html`: the Layers tab has a "Search layers" label with the search field and the category select only; a separate fold "Add layer" (`#ly-add`) holds one full-width "Add layer" button (`#lyNew`). The layer form title is "Add layer" (was "New layer"). `layers.js` hides the fold for people who cannot edit. Same status note as #20.

---

## 2026-11-05 — #23 Sidebar item 14: one search field with a clear (✕) button everywhere

### What
- `app/js/search.js`: `searchFieldHTML(id, placeholder, label)` is the single search-field template (input + ✕ that shows while there is text); `searchFieldSync()` refreshes the ✕ buttons after code changes a value; static fields are written in `index.html` as `<div data-searchfield="id" data-placeholder="…">` and filled in at load; two document-level handlers show the ✕ on input and clear the field on click (they fire a normal `input` event, so each field's own handler refilters).
- Used by the places search (`#q`), the layers search (`#lyQ`) and "Find a place…" while choosing layer places (`#lyPickQ`, `layers.js`).
- `app/js/ui.js`: the old `#qClear` / `syncClear` code removed; clearing `#q` also clears the other-places results; Reset and Esc call `searchFieldSync()`.

---

## 2026-11-05 — #24 Sidebar item 15: the place search moved to the top of the places list

### What
- `app/index.html`: the search bar (field + Reset) left the top of the sidebar and sits in the Explore tab directly above the count/"Fit map"/sort bar and the list, below Filters and the active chips. `app/css/style.css`: `.searchbar` padding adjusted to the tab's own padding.
- The search field now exists only in the Explore tab (the old "typing switches to Explore" code stays harmless).

### Not changed (items 10-15)
Nothing outside the sidebar; the back end and all tests are unchanged.

### Tests (after #20-#24)
PHP 93 and data 38 pass. JS 52 passed, 1 failed: the same browser scenario as #15-#19 (it still uses the old Layers-tab categories, "Back" and sheet selectors). Follow-up: update that scenario. Checked in a browser: ✕ appears/clears for `#q` and `#lyQ`, layer details open in the list without Back and fold on a second click.

---

## 2026-11-05 — #25 Domains and interfaces for parallel agents, step 1 of 4 (documents only)

Requested by the owner: split the responsibility so that several agents can work at the same time without merge conflicts,
with fixed interfaces that only the owner can change.

### What
- New `ext/ahm/map/DOMAINS.md`: the domains (sidebar, map, data, core, shared = owner only), file ownership today and after the
  roll-out, rules for every agent (declare the domain, own files only, interfaces only through `INTERFACES.md`, per-domain log,
  to-do and diff numbering), the request / proposal procedure, the integrator role, and the four roll-out steps.
- New `ext/ahm/map/INTERFACES.md` (version 1): I-1 data ↔ front end (endpoints, request keys, file formats), I-2 sidebar ↔ map
  (`window.AHM` commands and events; defined, NOT implemented yet), I-3 core function names; and the list of known violations
  that step 2 must remove.
- `AGENTS.md`: reading order now includes the two new files; new requirement 7 (domains and interfaces); corrected the stale
  "Sidebar structure" fact (details now open inside the list; no `.sheet` panels, no Back).

### Not changed
No code, no tests, no data. The legacy `AGENT_CHANGES.md` / `TODO.md` stay as they are until step 3.

### Next (needs the owner's "go")
Step 2: the refactor to the interface (one agent, one diff): add `window.AHM`, move the cross-domain calls onto it, split mixed
files, split `style.css`, move files into domain folders. Behaviour must not change; tests pass unchanged except for paths.

### Verify
Read the three documents; nothing else changed (the diff contains only them, `AGENT_CHANGES.md`).

---

## 2026-11-05 — #26 Domains, step 2 of 4: refactor to the interface (no behaviour change)

Requested by the owner ("Start step 2"). Sidebar, map and core now talk only through documented interfaces and live in domain folders.

### What
- **`window.AHM`** (`app/js/ahm.js`, shared): `$`, `AHM.on` / `AHM.emit`, `AHM.map`.
- **Map** (`app/js/map/map.js`): no longer reads any sidebar name. It provides `AHM.map.*` (`setFeatures, hidePlace, focusPlace, focusPoint, fitTo, fitRoute, setRoute, setRouteMarkers, setPick, editPin, resize, getZoom`) and emits `map:ready`, `place:click`, `place:dblclick`, `map:click`, `map:show-controls`; it listens to `sidebar:resized`. It starts itself on `DOMContentLoaded` (a timer-based load event could fire before `overlays.js` was parsed); `overlays.js` loads its data on the same event.
- **Sidebar** (`sidebar/ui.js`, `sidebar/layers.js`): every `map.*`, `maplibregl.*`, `EMPTY` use replaced by `AHM.map.*`; click handling (open details, pick a point, choose layer places, double click = `focusPlace`) is now in three `AHM.on(...)` handlers at the end of `ui.js`.
- **Files moved** into `app/js/core|sidebar|map/` and split by owner: `core/layer-rules.js` (filter state and pure rules, from `layers.js`), `sidebar/period.js` and `sidebar/searchfield.js` (from `search.js`); `providers.js` is core. `app/index.html` lists the scripts in the new order and links `css/base.css`, `css/sidebar.css`, `css/map.css` (the old `style.css` was cut by section: palette and reset in `base.css`, map canvas/popup/type symbols/overlay controls in `map.css`, the rest in `sidebar.css`; no rule was changed, rule order inside each file is the old order).
- Paths updated: `dev/save-handler.js` (`core/dates.js`), `dev/bs-config.js` (`js/**`), `app/prettierignore`, README (tree, tables), `AGENTS.md` facts.
- Docs: `DOMAINS.md` (table of paths now, step status), `INTERFACES.md` version 1.1: additions marked [1.1] (`focusPoint`, `editPin.setPosition`, `map:show-controls`, I-4 `typeIcon`) **need the owner's confirmation**; Known violations rewritten.

### Tests (changed only for paths and load lists)
- `tests/js/lib/ctx.js` finds a script by name in `app/js` or its domain folders and always loads `ahm.js` first.
- `tests/js/dates.test.js` (path), `layers.test.js` and `search.test.js` (load lists now include `layer-rules.js` and `searchfield.js`).
- Result: PHP 93 and data 38 pass; JS 52 passed, 1 failed, the same browser scenario with the same message as before the refactor (checked on the previous tree).
- Checked in a browser with a recording stub: single click on a place = no map move, details open; double click = one `flyTo`; "Fit map" = one `fitBounds`; map click opens the point card; collapsing the panel triggers a map resize. The real MapLibre drawing was NOT exercised (stubbed).

### Still open (see INTERFACES.md, Known violations)
`core/search.js` `run()` reads three sidebar fields (needs a signature change = proposal); `lyState` carries sidebar state.

### Verify
`php tests/php/run.php`, `php tests/data/run.php`, `node tests/js/run.js`; open the page: everything behaves as before.
