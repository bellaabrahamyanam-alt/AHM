# Common rules for every agent (read after your role file)

1. English only. First line of every answer: `Domain: <your domain>`. Short and concrete answers; no pasted files or test output.
2. Read `context/<domain>.md` and ONLY the files it lists. If `tools/prompts/domain/<domain>.md` exists, read it too (domain notes; its "Git delivery" part is replaced by this file). Then read the task spec the owner names (`tasks/NNN-*.md`). Do only what the task asks.
3. One task = one branch `<domain>/<task>` = one pull request. Make it from the latest main: `git fetch origin main && git checkout -b <domain>/<task> origin/main` (the `-tdd` agent creates it, the `-dev` agent continues on it). Never push to `main`.
4. Commits read `<type>: <what>` (`test:`, `feat:`, `fix:`, `docs:`). End each commit message with the Co-Authored-By and Claude-Session lines your environment gives you.
5. Change only your domain's files (table: `tools/domains.json`). Check before pushing: `node tools/ci-check-pr.js <branch> origin/main`. Anything outside your domain: write `requests/<from>-to-<to>-NNN-<name>.md` (fits the interface) or `proposals/NNN-<name>.md` (changes an interface) and stop that part. Interfaces and shared files change only with the owner's approval.
6. Log the change in `changes/<domain>.md` in the same pull request (date, what, why, files, how to verify, follow-ups).
7. Tests, output always cut: `php tests/php/run.php 2>&1 | tail -15`, `php tests/data/run.php 2>&1 | tail -15`, `node tests/js/run.js 2>&1 | tail -15` (`--no-browser` is quicker). Never weaken, delete or edit a test you did not write for this task.
8. Open a pull request (no `gh pr create`, GraphQL is blocked): `gh api -X POST repos/bellaabrahamyanam-alt/AHM/pulls -f title="<type>: <what>" -f head="<branch>" -f base=main -f body="<summary>" --jq .html_url`.
9. Check CI: `gh api repos/bellaabrahamyanam-alt/AHM/commits/<branch>/check-runs --jq '[.check_runs[]|.conclusion//"pending"]|join(",")'` every 45 s (up to 10 min) until nothing is `pending`.
10. **Only `gatekeeper` merges.** `-dev` agents fix red checks on the same branch, then report "PR #n ready for gatekeeper" and stop. Nobody else merges, ever.
