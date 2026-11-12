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

## 2026-11-12 — Place types are a dictionary (T-021, I-8)

- **What:** `data/types.json` (seed of the 13 types), `store.php`: `types()`, `save_type()`, `delete_type()` (place type checked against the dictionary; a used type and `mountain` cannot be removed; old file archived), controller `type_save`/`type_delete` (admins only) and the `types` data route, page config `types`/`typeSave`/`typeDelete`/`canTypeAdmin`, the same in `dev/save-handler.js`; `DataCheck` checks `types.json`.
- **Why:** administrators must be able to add markers (iron mine, cedar forest, sword artefact) without a code change.
- **Files:** `data/types.json`, `service/store.php`, `controller/main.php`, `config/routing.yml`, `dev/save-handler.js`, `tests/php/TypeTest.php`, `tests/php/{ControllerTest,RoutingTest,ParityTest}.php`, `tests/data/DataCheck.php`, `tests/fixtures/rules.json`, `tests/js/parity.test.js`
- **How to verify:** `php tests/php/run.php`, `php tests/data/run.php`, `node tests/js/run.js`.
- **Follow-ups:** line and area types (`geometry` other than `point`); owner decisions in `TODO.md` T-021 (contract: `style.size`, `_` in codes, `typeIcon` with a draft).

One entry per change, newest last: date, what, why, files, how to verify, open follow-ups. Only the data domain appends here (DOMAINS.md, rule 7). The history before 2026-11-06 is in the legacy `AGENT_CHANGES.md` (entries #1-#26), which is now read-only.
