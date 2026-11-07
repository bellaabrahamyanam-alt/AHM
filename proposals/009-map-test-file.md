# Proposal 009: the map domain owns `tests/js/map.test.js`

Status: approved (the owner, 2026-11-08, in the chat, when asked: "I give my approve")
From: shared (architect). Merge request: branch `shared/map-test-file` (!8).

## Why
`map-tdd: task 004` stopped: the map domain owns no test file, so it cannot write the red tests of task 004 without breaking the file-ownership rules (`tests/js/domains.test.js`, `ci-check-pr.js`). Registering a file owner in `tools/domains.json` is a shared change and needs the owner's approval.

## Current text
`tools/domains.json`, domain `map`: `app/js/map/`, `app/css/map.css`. Task 004 names no test file.

## New text
- `tools/domains.json`, domain `map`: add `tests/js/map.test.js`.
- `tasks/004-map-highlight.md`: a line "Test file: `tests/js/map.test.js` (new)".
- `context/map.md`: the "Your files" line lists the new file (what `node tools/make-context.js` generates).

## Who is affected
The map domain (`map-tdd`, `map-dev`). No application code or interface change.

## Migration
None. `tests/js/map.test.js` does not exist yet; `map-tdd: task 004` creates it.

## Tests
None new. `tests/js/domains.test.js` and `tests/js/context.test.js` run in the pipeline of this merge request.
