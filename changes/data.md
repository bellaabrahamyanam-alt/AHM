# Change log of the data domain

## 2026-11-10 — #1 Two PHP tests follow the borders (shapes) work of commit 51e13445
**What:** `tests/php/RoutingTest.php`: the data route now offers `shapes` as well (the list the test expects). `tests/php/LayerTest.php`: the sample layer has 3 places and 1 border (`{ shape: id }`) as members, so the test expects 4 members and checks the border member's id. No code and no data file changed.
**Why:** commit `51e13445` (owner's hotfix, `[skip ci]`) added the borders to `service/store.php`, `controller/main.php` and `config/routing.yml`; the sample layer already held a border. Two tests were not updated, so job `tests` was red on `master` and every later merge request.
**Verify:** `php tests/php/run.php` (CI job `tests`).
**Follow-ups:** the data checker, see #2.

## 2026-11-10 — #2 The data checker accepts border members of a layer
**What:** `tests/data/DataCheck.php`: a layer member can be a border (`{ shape: id }`); it must exist in `shapes.geojson` when that file exists, otherwise [layer-member-missing]; a border twice in one layer is [layer-member-duplicate]. One new case in `tests/data/DataTest.php` (a border that does not exist). No code and no data file changed.
**Why:** the sample layer holds a border since the borders work; the checker only knew `{ place: id }` members, so 4 tests in `tests/data/` were red (job `tests`, after the PHP suite of #1 passed).
**Verify:** `php tests/data/run.php` (CI job `tests`).
**Follow-ups:** none.

## 2026-11-12 — #3 T-005: the page controller serves the minified bundle
**What:** `controller/main.php` (`page()`): when `app/dist/manifest.json` exists, the marked blocks of `app/index.html` are replaced by `dist/app.min.css?v=<hash>` and `dist/app.min.js?v=<hash>`; `window.AHM_BACKEND` is still written right before the first script. No manifest: the sources are served as before. `tests/php/ControllerTest.php`: new test.
**Why:** T-005 (see `changes/shared.md` #34). The hash in the address makes a new build load at once and lets the old one stay cached.
**Verify:** `php tests/php/run.php 2>&1 | tail -15` (94 passed).
**Follow-ups:** none.

## 2026-11-12 — #4 T-023: the controller serves the bundle only when its files exist
**What:** `controller/main.php` (`page()`): the bundle replaces the marked blocks only when `app/dist/app.min.js` and `app/dist/app.min.css` exist as well as a valid manifest; otherwise the sources are served. `tests/php/ControllerTest.php`: new test (each file hidden in turn).
**Why:** review of PR #8: a manifest without its files (partial copy of the extension) made the page link two dead files.
**Verify:** `php tests/php/run.php 2>&1 | tail -15` (95 passed).
**Follow-ups:** T-024.

One entry per change, newest last: date, what, why, files, how to verify, open follow-ups. Only the data domain appends here (DOMAINS.md, rule 7). The history before 2026-11-06 is in the legacy `AGENT_CHANGES.md` (entries #1-#26), which is now read-only.
