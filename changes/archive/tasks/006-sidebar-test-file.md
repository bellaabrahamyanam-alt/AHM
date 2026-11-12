# Task 006: the sidebar domain gets a test file

- **Domain:** shared + sidebar (the placeholder is a sidebar file). **Branch:** `shared+sidebar/sidebar-test-file`. **Depends on:** proposal 010 approved. Done by `architect`.
- **Goal:** `sidebar-tdd` can write tests without breaking the file-ownership rules (same method as proposal 009).
- **Acceptance:** `tests/js/sidebar.test.js` exists (comments-only placeholder); `tools/domains.json` lists it in domain `sidebar`; `.gitlab/CODEOWNERS` has the new line (same text as `node tools/check-domain.js --codeowners`); `context/sidebar.md` "Your files" line lists it (same text as the generator); `changes/shared.md` entry; `tests/js/domains.test.js` and `context.test.js` green. The existence test is NOT relaxed.
- **Out of scope:** any application code.
