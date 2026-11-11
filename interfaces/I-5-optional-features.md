<!-- One interface of the contract; index and rules: INTERFACES.md -->

## I-5 Optional features (`window.AHM.features`, `app/js/features.js`). Provider: **shared**. Consumers: feature domains (first: **campaigns**)

A feature is a folder `app/features/<name>/` with `main.js` (and optionally `style.css`) owned by a domain called `<name>`. It exists
only when `<name>` is in `AHM_CONFIG.features`: development: the list in `config.js` (`?features=a,b` or `?features=` in the URL change
it); forum: only what the controller sends in `AHM_BACKEND.features` (it sends nothing today, so every feature is hidden). A feature
that is not listed is not requested, not run and not visible.
- `AHM.features.register(name, init)`: called once by `main.js`; `init({ name, base })` runs after the file loaded (`base` = the feature's folder URL).
- `AHM.features.onMapReady(fn)`: `fn()` runs when the map is ready (at once if it already is).
- `AHM.features.enabled(name)`: boolean.
- A feature uses only `AHM.features`, `AHM.on/emit` (its events are named `<name>:*`), the `AHM.map` commands of I-2 and the core functions of I-3. No top-level names, CSS selectors only `.<name>-…` / `#<name>-…`, and no other domain's file mentions its name.
  `tests/js/features.test.js` enforces all of this. Loading failures and exceptions of a feature are logged and never stop the app.
- Not yet possible (proposal `proposals/002-map-extension-points.md`, pending): drawing custom layers on the map.
