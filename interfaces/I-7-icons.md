<!-- One interface of the contract; index and rules: INTERFACES.md -->

## I-7 Icons **[1.5]** (`window.AHM.icons`, `app/js/icons.js`). Provider: **shared**. Consumers: **sidebar**, **map**

One icon set for the whole interface (`DESIGN.md`, rule 2). Source: Phosphor Icons, regular weight (MIT licence, stated in the file header), pasted as SVG paths; nothing is loaded at runtime. Only the shared domain writes the file.
- `AHM.icons.svg(name, size?)` returns an inline SVG string (default size 16, drawn in `currentColor`, `aria-hidden`). An unknown name gives `''`. The string holds no caller text, so it needs no `esc`; the button around it carries `title` and `aria-label`.
- Fixed names (exactly these thirteen; a new name only by a change to `icons.js`, this file and `tests/js/icons.test.js`): `pencil`, `route-from`, `route-to`, `plus`, `close`, `trash`, `check`, `panel-left`, `panel-right` (`panel-left` drawn mirrored), `chevron-down`, `line`, `area`, `pin`.
- `app/index.html` loads `js/icons.js` after `js/ahm.js` and before every sidebar and map script. Tests: `tests/js/icons.test.js`.
