# Change log of the core domain

No entries yet.

One entry per change, newest last: date, what, why, files, how to verify, open follow-ups. Only the core domain appends here (DOMAINS.md, rule 7). The history before 2026-11-06 is in the legacy `AGENT_CHANGES.md` (entries #1-#26), which is now read-only.

---

## 2026-11-06 — #1 `run(options)` instead of reading sidebar fields (proposal 001, approved by the owner)

### What
- `core/search.js`: `run({ q, lang, sort, period })` with defaults; it no longer touches the DOM or calls `periodBounds()`. Behaviour is unchanged. INTERFACES.md I-3 (version 1.2) describes it; Known violation 1 is closed.
- `tests/js/search.test.js`: the stand-in form fields and the `periodBounds` stub are replaced by an options object passed to `run` (the same assertions).

### Verify
`node tests/js/run.js` (all green); `boundaries.test.js` now also forbids `$` and DOM names in core.
