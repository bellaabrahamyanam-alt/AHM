# Change log of the data domain

## 2026-11-10 — #1 Two PHP tests follow the borders (shapes) work of commit 51e13445
**What:** `tests/php/RoutingTest.php`: the data route now offers `shapes` as well (the list the test expects). `tests/php/LayerTest.php`: the sample layer has 3 places and 1 border (`{ shape: id }`) as members, so the test expects 4 members and checks the border member's id. No code and no data file changed.
**Why:** commit `51e13445` (owner's hotfix, `[skip ci]`) added the borders to `service/store.php`, `controller/main.php` and `config/routing.yml`; the sample layer already held a border. Two tests were not updated, so job `tests` was red on `master` and every later merge request.
**Verify:** `php tests/php/run.php` (CI job `tests`).
**Follow-ups:** none.

One entry per change, newest last: date, what, why, files, how to verify, open follow-ups. Only the data domain appends here (DOMAINS.md, rule 7). The history before 2026-11-06 is in the legacy `AGENT_CHANGES.md` (entries #1-#26), which is now read-only.
