# Change log of the sidebar domain

No entries yet.

One entry per change, newest last: date, what, why, files, how to verify, open follow-ups. Only the sidebar domain appends here (DOMAINS.md, rule 7). The history before 2026-11-06 is in the legacy `AGENT_CHANGES.md` (entries #1-#26), which is now read-only.

---

## 2026-11-06 — #1 The sidebar passes the search options to `run()`; fix: details clicks in the layer list

### What
- `sidebar/ui.js`: `searchOptions()` builds `{ q, lang, sort, period }` from the sidebar fields; `update()` and "Fit map" call `run(searchOptions())` (proposal 001).
- Bug fix `sidebar/layers.js`: a click on a button inside the open layer's details (for example "Choose places") also reached the layer list's own click handler after the details had been re-rendered; the handler no longer found `#lyDetail` among the ancestors of the detached button and called `lyToggleFilter("editplaces")`, which threw a TypeError (visible only in the console). The handler now asks `event.composedPath()`. It was found by the updated browser test.

### Verify
`node tests/js/run.js`.
