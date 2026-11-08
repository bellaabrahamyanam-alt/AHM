# Request sidebar -> shared 001: a browser-test helper in tests/js/lib

**From:** sidebar (`sidebar-tdd: task 007`). **To:** shared (owner of `tests/js/lib/` and `tests/js/browser.test.js`). **Blocking:** no.

## What I need

A module `tests/js/lib/browser.js` that exports the browser-test set-up now private to `tests/js/browser.test.js`:

```js
const { scenario } = require('./lib/browser');
scenario('name', async (page, server) => { /* page = Playwright page, server = { base, root, data(file), post(url, body), stop() } */ });
```

Same behaviour as the `scenario` and `STUB` of `browser.test.js` today: start `lib/devserver.js` on a throw-away copy, launch Chromium, replace MapLibre by the stand-in, abort every other external request, fail on page errors, skip with `--no-browser` or when Playwright or Chromium is missing. `browser.test.js` then requires it instead of keeping its own copy.

## Why

Task 007 says the sidebar browser tests use the browser helpers of `tests/js/lib`, and a missing helper is a request to shared. There is none: `scenario` is a local function of `browser.test.js` and is not exported. `tests/js/sidebar.test.js` therefore carries a private copy (marked `TODO(request sidebar-to-shared-001)`); tasks 012 and 014 would copy it again. When the module exists the sidebar domain replaces its copy with the `require`.

## Interface

Only the call above. No change to the interfaces of INTERFACES.md.
