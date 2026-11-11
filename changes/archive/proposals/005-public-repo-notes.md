# Proposal 005: document the repository settings (public, auto-merge, auto-delete branches)

Status: approved (the owner, 2026-11-07, in the chat: "Yeh, let's do it with droping outdated part")
From: shared (architect). Replaces the unmerged branch `shared/docs-public-automerge`.

## Why
The owner made the repository public and turned on "Allow auto-merge" and "Automatically delete head branches". The documents still say the repository may be private and that agents merge their own pull requests.

## Current text
`DOMAINS.md`, "Git workflow": the "Owner setup, once" bullet says protect `main`, and that private repositories on the free plan cannot enforce it.

## New text
Four bullets: repository settings (public, auto-merge on, merged branches deleted, only `gatekeeper` merges), a public-repository warning (no secrets, no private data), branch protection as an optional owner-only step, and the one remaining owner setup step (link GitHub to Claude).

## Who is affected
Nobody's code. Interfaces and tests do not change.

## Tests
None new. `node tests/js/run.js --no-browser` stays green.
