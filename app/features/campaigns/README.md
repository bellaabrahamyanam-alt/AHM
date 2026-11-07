# Feature: military campaigns (domain `campaigns`)

Shows military campaigns on the map. It is a **switchable feature**: loaded only when `campaigns` is in `AHM_CONFIG.features`.

- **Switch on/off** (shared `app/js/config.js`, owner): development shows it by default; `?features=` in the page URL hides it,
  `?features=campaigns` shows it. In the forum it is hidden unless the page controller sends `features: ['campaigns']`
  (it sends nothing today). Deleting this folder is also safe: the loader logs one warning and the app runs as before.
- **Files:** `main.js` (calls `AHM.features.register('campaigns', init)`), `style.css` (selectors start with `.campaigns-`),
  `README.md`, tests in `tests/js/campaigns.test.js`. Put data, helpers and sub-folders here too.
- **Rules:** touch nothing outside this folder, tests and your records (`changes/campaigns.md`, `todo/campaigns.md`,
  `diffs/campaigns/`). Use only `AHM.features.*`, `AHM.on/emit` (events you emit are named `campaigns:*`), the `AHM.map` commands of
  INTERFACES.md I-2 and the core functions of I-3. Anything else: a request or proposal (`DOMAINS.md`).
