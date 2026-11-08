# Request sidebar -> shared 002: update tests/js/browser.test.js for the new Languages and Categories forms

**From:** sidebar (`sidebar-tdd: task 007`). **To:** shared (owner of `tests/js/browser.test.js`). **Blocking:** yes, for the merge request of `sidebar-dev: task 007`.

## What I need

Task 007, points 4 and 5, change behaviour that two checks of `tests/js/browser.test.js` rely on. The sidebar domain may not edit that file, so it must be updated by shared before (or together with) `sidebar-dev: task 007`; otherwise the CI job `tests` of that merge request fails on code that is correct.

1. **Languages** (scenario "browser: languages, optional dates ..."). The add-language fields are no longer always visible: the row shows a "+ Add language" button and the fields, Save (`#lgAdd`) and Cancel (`#lgCancel`) exist only while the form is open (it closes after a successful Save).
   - Replace `ok(await pg.locator('#lgAdd').count()===1, 'admin sees the add-language form ...')` by a check that `#more-lang button:has-text("Add language")` exists once.
   - Before the first `pg.fill('#lgCode','xcl')` and again before the duplicate-language attempt (`pg.fill('#lgCode','xcl'); pg.fill('#lgName','dup')`), insert `await pg.click('#more-lang button:has-text("Add language")');`.
2. **Categories** (scenario "browser: tabs, sheets, filters, layers ..."). Rename opens in the editor area at the bottom of the fold (`#catAdmin #catForm`, heading "Rename category"), not in a row under the item.
   - Replace the check `#catList li.tr:has-text("Pilgrimage") + li.cat-edit #catForm` ("the pencil opens the fields under the row") by `#catAdmin #catForm` with count 1 (and, if wanted, `#catList #catForm` count 0).
   - The following lines (fill `#catForm .nn`, click `#catSave`, check the new name) stay as they are.

## Why

Acceptance points 10 and 11 of the owner, written into `tasks/007-sidebar-fixes.md`. The new tests in `tests/js/sidebar.test.js` already describe the new behaviour; the old checks of `browser.test.js` describe the behaviour being replaced.

## Interface

None. The ids `#lgAdd`, `#lgCancel`, `#lgCode`, `#lgName`, `#catAdd`, `#catSave`, `#catCancel`, `#catForm` keep their meaning.
