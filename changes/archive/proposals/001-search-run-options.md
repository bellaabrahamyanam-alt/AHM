# Proposal 001: `run(options)` instead of `run()` reading sidebar fields

Status: **approved** by the owner on 2026-11-06 ("yes to proposal 001"); **implemented** the same day (`changes/core.md` #1, `changes/sidebar.md` #1, INTERFACES.md v1.2)
Closes: INTERFACES.md, Known violation 1.

## Current
`core/search.js` `run()` reads `#q`, `#lang`, `#sort` and calls `periodBounds()` (sidebar/period.js, reads the date fields). Core is
therefore not pure, and the sidebar and the tests have to provide DOM stand-ins.

## New (I-3)
`run({ q, lang, sort, period })` where `q` = search text, `lang` = interface language, `sort` = `"name" | "date"`,
`period` = `{ from, to }` in seconds or null (what `periodBounds()` returns now). Everything else (types, layer filters) stays in the
shared state objects `state` and `lyState`. `byDateKey` and the other core names are unchanged.

## Who is affected
- core: `search.js` (signature), `search.test.js` (calls `run()` ~20 times: pass the options instead of setting stub fields).
- sidebar: `ui.js` builds the options from its fields (one `searchOptions()` helper) at its 4 call sites.
- shared: `boundaries.test.js` loses the `periodBounds` exception.

## Migration
One diff by the core domain plus one by the sidebar domain, in this order: core accepts BOTH call forms (`run()` keeps working),
the sidebar switches to `run(options)`, core drops the old form and the test changes. Behaviour does not change.

## Tests to add
Contract test: `run(options)` result equals the old `run()` result for the same inputs (sample data).
