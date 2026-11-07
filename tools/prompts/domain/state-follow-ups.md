# Follow-up tasks for the other agents once the state module exists (proposal 003, steps 3-5)

Each agent: its own domain only, its own change log; `Status: approved` must be in the proposal and `app/js/state/state.js` must be built.

**Core agent** (`app/js/core/layer-rules.js`): replace the object literal `const lyState = { only: ..., noteAll: false }` by `const lyState = AHM.state.get('layers');`. Nothing else, names unchanged, `node tests/js/run.js` green (the owner updates the test load lists).

**Sidebar agent** (`app/js/sidebar/*`): (1) wherever `ui.js` sets `cur` (open place, close, edit), also `AHM.state.set('selected', cur ? cur.id : null)`; (2) after changing sets inside `lyState` in place, call `AHM.state.patch('layers', {})`. Do not read `selected` back; the sidebar keeps rendering as now.

**Map agent** (`app/js/map/*`, `app/css/map.css`): `AHM.on('state:selected', ({ value }) => ...)` draws a highlight (ring or halo) around the place with that id and removes it when `value` is null; the highlight survives `setFeatures` re-draws and base-map switches. Do not call the sidebar, do not read `AHM.state` for anything else.

**Open your own pull request (no manual step):** after `git push -u origin <branch>` run `gh api -X POST repos/bellaabrahamyanam-alt/AHM/pulls -f title="<type>: <what>" -f head="<branch>" -f base=main -f body="<summary>" --jq .html_url` (`gh pr create` does not work: GraphQL is blocked in Claude Code sessions; the `GH_TOKEN` is invalid but REST calls work through the session proxy). Then wait for CI: poll `gh api repos/bellaabrahamyanam-alt/AHM/commits/<branch>/check-runs --jq '[.check_runs[]|.conclusion//"pending"]|join(",")'` every 45 s (up to 10 min) until no `pending` is left. Only if every check is `success` merge: `gh api -X PUT repos/bellaabrahamyanam-alt/AHM/pulls/<n>/merge -f merge_method=squash -f commit_title="<pull-request title> (#<n>)"`. If a check failed, fix it on the same branch and push again; never merge red, never push to `main`. (Auto-merge is not enabled on the repository; this rule replaces it.)
