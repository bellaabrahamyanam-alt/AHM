# Proposal 006: move the project from GitHub to GitLab

Status: approved (the owner, 2026-11-07, in the chat: "yeh, let's fully prepare gitlab repository for working into there and update our specs to make it clear")
From: shared (architect). Merge request: branch `shared/gitlab-move`.

## Why
The owner moved the project to GitLab: https://gitlab.com/bellaabrahamyan.am/ahm (project id 88632181). GitHub is not used any more.

## Current text
`DOMAINS.md` "Git workflow", `AGENTS.md` rules 1 and 3, `tools/prompts/_common.md`, the role files: GitHub repository `bellaabrahamyanam-alt/AHM`, trunk `main`, pull requests, `gh api`, `.github/` files.

## New text
- Project `bellaabrahamyan.am/ahm`, trunk branch `master`. One task = one branch `<domain>/<task>` = one merge request (MR). The `-dev` agent opens the MR and stops; `gatekeeper` is the only merger (`accept_merge_request` with the reviewed head sha, squash, delete the source branch).
- CI is `.gitlab-ci.yml` (job `domain` for merge requests, job `tests`). Owners are in `.gitlab/CODEOWNERS` (generated, handle `@bellaabrahamyan.am`). The MR template is `.gitlab/merge_request_templates/Default.md`. `tools/ci-check-pr.js` compares with `origin/master`.
- Agents use git where it works; in the Claude cloud session they use the GitLab tools (`add_branch`, `add_commit`, `save_merge_request`, ...). `tools/prompts/_common.md` has the exact steps.
- Owner-only setup (no agent can do it): verify the account identity (GitLab runs no CI job before that), protect `master`, set the merge request options, connect GitLab to Claude, archive the GitHub repository and revoke its tokens. The list is in `DOMAINS.md`, "Git workflow".

## Who is affected
All agents (new delivery steps). No application code, no interface, no test assertion.

## Migration
The history before the move is one snapshot commit ("import snapshot of main from GitHub"). The GitHub repository stays as a read-only archive.

## Tests
No new test. `tests/js/domains.test.js` reads `.gitlab/CODEOWNERS` (path only, no assertion changed). CI runs on this merge request as soon as the owner has verified the account.
