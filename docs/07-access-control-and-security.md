<!-- Section 7 of the project description; index: README.md -->

## 7. Access control and security

### Who may do what

| Action                                                | Guest | Member | Administrator |
| ----------------------------------------------------- | :---: | :----: | :-----------: |
| View map, places, notes, overlays; search; directions |   ✔   |   ✔    |       ✔       |
| Add and edit places, add and edit notes               |   ✘   |  ✔ \*  |       ✔       |
| Add, edit and delete historical map images            |   ✘   |   ✘    |       ✔       |
| Add a language to the dictionary                      |   ✘   |   ✘    |       ✔       |
| Create layers, change their places, write layer notes |   ✘   |  ✔ \*  |       ✔       |
| Delete a layer; add or rename a category              |   ✘   |   ✘    |       ✔       |

\* Members can edit when `ahm.map.editors` is `members` (the default). Set it to `admins` and only administrators can edit. Edit `config/services.yml`, then purge the forum cache. "Administrator" means the phpBB permission `a_`.

The buttons are hidden for people who may not use them, but **the server checks every write**.

### Protections in place

- **Output is escaped** in the browser (`esc()`); note text is shown as plain text, never as HTML.
- **All input is validated on the server** (types, ranges, dates, heights, languages against the dictionary, zoom range, opacity, coordinates, image type).
- **Images are identified by their first bytes**, not by what the browser says, and limited to 12 MB.
- **File names come from validated UUIDs only**, so no request can name an arbitrary file.
- **Cross-site forgery:** write routes accept only `application/json` (or `image/*` for uploads). A web page on another site cannot send these without the browser asking permission first.
- **Concurrent saves** are serialised by a lock file; writes are atomic (a half-written file is never visible).
- **Live data is outside the web root** in `store/`, which phpBB blocks from direct access.
- phpBB's rule against reading `$_GET` is respected (`api` reads parameters through phpBB's request class).

---
