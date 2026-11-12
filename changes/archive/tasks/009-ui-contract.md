# Task 009: contract v1.5 and design rules

- **Domain:** shared. **Branch:** `shared/ui-contract`. **Depends on:** 005 merged (same file `INTERFACES.md`); proposal 010 approved. Done by `architect`.
- **Goal:** write proposal 010 into the contract and give both domains the same icons and rules.
- **Acceptance:**
  - `INTERFACES.md` version 1.5: new I-7 (icons), I-8 (types), I-9 (shapes); additions to I-1, I-2, I-3 exactly as in proposal 010.
  - `app/js/icons.js` with `AHM.icons.svg` and the fixed names (Phosphor, MIT; licence line in the file header); script tag in `app/index.html` before the sidebar scripts; owner line in `tools/domains.json`, `.gitlab/CODEOWNERS` and `context/` updated; a test for the names in `tests/js/` (shared).
  - `DESIGN.md` with the seven rules of proposal 010 F and the numbers for the map look; owner line in `tools/domains.json`.
  - `tests/js/contract.test.js` accepts the new commands, events and names but does not require them yet (like entry #22); tightened after 010, 011 and 013 are merged (owner decides).
  - `DOMAINS.md` (rows and the list of contract tests), `changes/shared.md` entry; all suites green.
- **Out of scope:** any drawing, storage or sidebar code.
