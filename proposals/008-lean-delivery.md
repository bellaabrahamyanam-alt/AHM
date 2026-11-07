# Proposal 008: lean delivery (no merge request from -tdd, tests only when code changes, git when possible)

Status: approved (the owner, 2026-11-07, in the chat: "TDD agent should only push his branch and dev agent should create MR"; "we must to run those tests only when we change those files"; "If they can clone then they must to clone")
From: shared (architect). Merge request: branch `shared/agent-start` (same as proposal 007).

## Why
CI minutes and tokens cost money. A merge request from the `-tdd` agent runs the full tests on code that is red on purpose. A change in a `.md` file ran the full PHP and JS tests with browser. Agents were told not to clone, although cloning is the cheapest way (local tests, no big tool outputs).

## Current text
Proposal 007: the `-tdd` agent opens a Draft merge request; `.gitlab-ci.yml` job `tests` runs on every merge request and on `master`; the Project instructions say: do not clone.

## New text
- The `-tdd` agent writes the red tests, commits and pushes the branch, and opens NO merge request. Only the `-dev` agent opens it, when its code is pushed (with git: after the tests pass locally). `gatekeeper` loses the Draft check.
- `.gitlab-ci.yml`: job `tests` has `rules: changes:` and runs only when code, tests, config, `context/`, `tools/*`, `INTERFACES.md`, `README.md`, `*.php` or `*.json` change. Documents (`changes/`, `todo/`, `proposals/`, `requests/`, `tasks/`, `tools/prompts/`, `.claude/`, `AGENTS.md`, `DOMAINS.md`) skip it. Job `domain` stays on every merge request (it is cheap). Reason for the list: tests read `INTERFACES.md` (contract tests) and `context/*.md` (freshness); no test reads the skipped files.
- `tools/prompts/_common.md` rule 4: agents test git once (`git ls-remote`); if it works they clone, run the tests locally and push; if gitlab.com is blocked they use the GitLab tools and CI is the test run. New rule 11 keeps tool output small. The role files shrink to the domain facts; the flow lives only in `_common.md`.

## Who is affected
All agents. No application code, interface or test changes.

## Migration
The branch `sidebar/publish-state` already has the red tests of task 003 and no merge request: `sidebar-dev: task 003` opens it.

## Tests
None new. This merge request changes `.gitlab-ci.yml`, so its own pipeline still runs the tests; the next documents-only merge request must show a pipeline with only the job `domain`.
