# Armenian Highlands Map

An interactive, historical map of the Armenian Highlands, built as a **phpBB extension** (`ahm/map`). Forum guests can explore it; members and administrators can add and edit places, notes and historical map images. The same front-end also runs on its own under a small development server, without phpBB.

- **Version:** 0.1.0 (see `composer.json`)
- **Licence:** GPL-2.0-only (the extension), see [Licences of the data and services](#12-licences-of-the-data-and-services) for the map data.
- **Document status:** written from the project files as they are now. Anything not verified is marked as such in [Verification status](#14-verification-status).

---

## Contents

1. [Purpose](#1-purpose)
2. [Implemented features](#2-implemented-features)
3. [Architecture](#3-architecture)
4. [Project structure](#4-project-structure)
5. [Data model](#5-data-model)
6. [HTTP interface](#6-http-interface)
7. [Access control and security](#7-access-control-and-security)
8. [Underlying decisions](#8-underlying-decisions)
9. [Code style](#9-code-style)
10. [Deployment instructions](#10-deployment-instructions)
11. [Local development](#11-local-development)
12. [Licences of the data and services](#12-licences-of-the-data-and-services)
13. [Known limitations and ideas](#13-known-limitations-and-ideas)
14. [Verification status](#14-verification-status)

---

## 1. Purpose

The Highlands that Armenians call _Hayk_ (and other peoples call by other names) are poorly served by ordinary maps. Many settlements, fortresses and monuments are missing or have a different name, and no interactive map shows the historical regions.

This project gives a forum community a **shared, researchable map** of that area:

- places with **several names** in several languages and scripts (for example Ararat, Masis, Արարատ, Մասիս, Ağrı Dağı);
- **historical notes** per place, in many languages, each optionally dated;
- optional **dates** for a place (and a **height** for a mountain), so the map is a historical representation and not only a present-day one;
- **old map images** laid over the modern map (for example a map of the historical regions) with adjustable transparency and zoom range, because such pictures are never exactly accurate;
- good **search and filters** for fast browsing and research;
- **editing on the map itself**, with no desktop GIS needed, by forum members.

Design goals, in order: data that can never be lost, a foundation that does not need breaking changes later, simple hosting (shared hosting is enough), and independence from any one map provider.

---

## 2. Implemented features

### Map

- Vector base map (OpenFreeMap "Liberty", data from OpenStreetMap) and a Sentinel-2 satellite option.
- Layer toggles for **Water, Roads, Places, Boundaries** of the base map.
- **One symbol per place type**, different in shape and colour (13 types, see [Place types](#place-types)), also shown in the list and on the filter chips.
- Permanent **name labels** next to the symbols. They use a font the base map already provides and have their own data source, so a font problem can never hide the symbols.
- Hover popup with the name, type and dates. Click a symbol to open the place.
- Click anywhere on the map to get a point card with its coordinates and the name of the base-map feature under it, with the actions **Add place here**, **Directions from here** and **Directions to here**.
- Satellite imagery and labels switch to light text with a dark outline when the satellite layer is active.

### Search, filters and lists

- One search box over **all names** of every place (any language, any script, accent-insensitive) and the **full text of the notes**, with the matching part highlighted. A ✕ button (and Esc) clears it.
- Filters: place **type** (chips with counts), **language**, and a **period** (From / To, each a date field as described under [Dates](#dates)). Places that existed in the period are shown; places with no known dates are hidden while a period is set. A counter shows how many filters are active, and **Reset** clears them all.
- Sorting A–Z or by date, and **Fit map** to the current results.
- Search for **other places** (towns, villages and so on that are not in our data) through Nominatim. It runs only on Enter or a button, never while typing, and results are cached and throttled (see [Licences](#12-licences-of-the-data-and-services)).
- Permanent link to a place: `#place-<id>` in the address.

### Places

- **Several names per place, also several in one language.** The first name of each language is the one shown on the map. Names can be reordered and removed.
- Place **type** and two optional dates (**began** and **ended**). A **mountain** has an optional **height in metres** instead of dates.
- Every date is **optional** and is entered the same way everywhere (see [Dates](#dates)): unknown, exact, approximate or a range, in a format the person chooses.
- **Edit a place:** drag a red pin on the map (or type coordinates) to move it, and change names, type and dates. The old symbol is hidden while editing, and each save keeps a copy of the previous file.
- Add a place by clicking the map.

### Notes

- Any number of notes per place, **also several in one language** (for example one English note per century).
- Each note has a language (chosen from the dictionary), title, an optional date and text. Notes are sorted by date (undated last) and can be edited.
- Notes are stored one per file and loaded only when a place is opened.

### Historical map images (overlays)

- Administrators add an image (PNG, JPEG, WebP, up to 12 MB). Large scans are shrunk to 4096 px in the browser first.
- The image is pinned to the map by **four corners**: drag the red squares to stretch or fit it, the blue dot to move it, and use the sliders to rotate and scale it.
- Per image: title, default **opacity**, and a **zoom range** (shown from one zoom level up to another, with "= now" buttons).
- Every visitor can hide an overlay and change its opacity for themselves. Overlays can be edited and deleted (a copy is archived).

### Directions

- Car directions between any two points or places, with distance and time, swap and clear. The route is drawn on the map.

### Sidebar and page

- Three tabs: **Explore**, **Layers**, **More**. More holds three folds: **Maps & base map** (base map toggles, historical map images), **Directions**, **Languages**. Calling `tab('route')` (etc.) opens the right fold.
- **Sheets, not view swaps:** a place or a layer opens as a *sheet* over the list (back button on top, actions in a sticky bar at the bottom). The list underneath keeps its scroll position and filters. A place opened from a layer sheet lies on top of it, so Back returns to the layer. Clicking a tab or typing in the search box leaves the sheet.
- **Filters:** closed by default; whatever is active (types, language, period, layers) is shown as removable chips under the Filters line.
- **Buttons:** one language everywhere: default (secondary), `primary` (the one main action of a view), `danger`, `back`.
- The sidebar can be **collapsed**, **resized** by dragging its edge (double-click resets, arrow keys nudge) and the size is remembered. On narrow screens it becomes a bottom sheet.
- Colours follow the forum style "paper-and-pencil".

### Layers (thematic subsets)

- The **general layer** is everything: every place with every note. It is not stored. A **layer** is a named subset of it, for example "Military campaigns of Hammurabi". A place is never removed from the general layer; it can be in many layers.
- A layer has names and descriptions in dictionary languages, **one optional category**, an optional **colour**, an optional **date range**, its own **notes** and an **ordered** list of places (the order is kept for future route lines; there is no ordering interface yet).
- **Layers tab:** search layers, filter by category, **Only** (show just the places of the layer; several layers = OR) and **Hide** (NOT IN). The active filters are chips in Explore → Filters and are cleared by Reset. A layer detail view shows its places, notes, **Fit map**, and for editors **Add note**, **Edit layer**, **Choose places**. The period filter does not look at layers.
- **Choose places:** click places on the map or tick them in a list; nothing is saved until **Save places** (one request). Members get a ring on the map. There is no box-select.
- **Place details** list the layers of the place (editors can add or remove). **Notes** can be tied to layers (tick boxes in the note dialog). In the general view all notes show; with a layer open, or an "Only" filter, only the notes tied to those layers show (link "Show all notes").
- A new place added while a layer is open joins General and that layer (ticked in the dialog).
- **Categories** are a dictionary like languages: administrators add and rename (names in several languages); none are deleted. Editors create layers, edit places and write layer notes; administrators delete layers.

### Languages

- Every name and every note uses a language chosen from a **dictionary of languages**. There is no free text.
- The **Languages** tab lists the dictionary. **Only administrators add a language** (code, name in English, optional native name). Everybody else sees a hint: if a language is missing, ask an administrator.
- Languages cannot be renamed or removed in the interface, so no name or note can lose its language.

### Access

- **Guests** can look at everything. **Members** (or only administrators, by setting) can add and edit places and notes. **Administrators** manage the historical map images.
- A "Map" entry is added to the forum's **Quick links** menu.

### Data safety

- Every change keeps the previous version in `archive/`; files are written atomically and under a lock; nothing is ever deleted without an archived copy.
- Notes saved by older versions of the extension are converted automatically.

---

## 3. Architecture

### The idea in one picture

```
            VISITORS (browser)
                  │
   ┌──────────────┴───────────────┐
   │  Front-end: plain HTML/CSS/JS │   no build step, no framework
   │  (MapLibre GL JS draws the map)│
   └───────┬───────────────┬──────┘
           │ reads         │ writes (editors / admins)
           ▼               ▼
   ┌─────────────────────────────────────────┐
   │  Back-end                               │
   │   in the forum:  phpBB extension        │
   │     controller (login, permissions)     │
   │        └── service/store.php  (all data │
   │            rules, no phpBB inside)      │
   │   in development: browser-sync          │
   │        └── dev/save-handler.js (same    │
   │            rules, written in Node)      │
   └──────────────────┬──────────────────────┘
                      ▼
        FILES (no database): places.geojson,
        notes/<place>/<note>.md, notes/index.json,
        overlays.json, overlays/<id>.png, archive/

   Outside services used by the browser, all behind js/config.js:
   base-map tiles · satellite tiles · place search · directions
```

### Layers and responsibilities

| Layer                | Files                             | Responsibility                                                                        |
| -------------------- | --------------------------------- | ------------------------------------------------------------------------------------- |
| Page                 | `app/index.html`                  | The whole interface. Identical for the forum and for development.                     |
| Settings             | `app/js/config.js`                | The only place that knows addresses of data and outside services.                     |
| Data access          | `app/js/core/data.js`                | Loads places, notes and note text; small shared helpers.                              |
| Behaviour            | `search.js`, `ui.js`, `map.js`, … | Search and filters, the sidebar, the map, editing.                                    |
| Back-end entry       | `controller/main.php`             | Login and permission checks, HTTP responses. Thin.                                    |
| **Data rules**       | `service/store.php`               | Validation, saving, archiving, search index, migration. **Does not depend on phpBB.** |
| Forum glue           | `ext.php`, `event/listener.php`   | First-enable setup, language, Quick links entry.                                      |
| Development back-end | `dev/save-handler.js`             | The same rules as `store.php`, as browser-sync middleware.                            |

### How the same front-end runs in two places

`config.js` looks for `window.AHM_BACKEND`.

- **In the forum**, the controller serves `app/index.html` and inserts a small script with ready-made addresses for the data and save routes, plus the user's rights (`canEdit`, `canOverlay`, `loggedIn`). It also rewrites the asset links so they work from the forum's URL.
- **In development**, nothing is inserted, so `config.js` falls back to plain files under `/data/` and the `/api/…` endpoints of the development server.

The front-end therefore never changes between the two. Only `config.js` knows which one it is in.

### Data flow of a typical edit

1. The editor changes something in the browser (for example moves a place).
2. The browser sends **one JSON request** to the save route.
3. The controller checks the login and the right to edit, then passes the body to `store.php`.
4. `store.php` validates everything, copies the old file to `archive/`, writes the new file atomically, and rebuilds the notes search index when notes changed.
5. The browser reloads the data (the server answers with `no-cache` and an ETag, so the new data is shown at once) and shows the place.

### Where the live data lives

In the forum, live data is **not inside the extension**. On first enable, the sample data in `ext/ahm/map/data/` is copied to the forum's `store/ahm_map/`. `store/` is writable, is blocked from direct web access by phpBB, and survives extension updates.

---

## 4. Project structure

Paths are relative to the repository root. The repository root **is** the extension folder: in a forum it is installed as `<forum>/ext/ahm/map/`. There is no `ext/` folder and no forum style inside the repository.

```
ahm/map/
├─ composer.json                  extension name, version, requirements
├─ ext.php                        first enable: copies data/ to store/ahm_map/, converts old notes
├─ README.md                      this file
├─ AGENTS.md  AGENT_CHANGES.md    the owner's working rules for AI agents, and the log of every change they made
├─ .editorconfig  .prettierrc.json  .prettierignore     editor and formatting settings
│
├─ config/
│   ├─ routing.yml                the routes (addresses) of the extension
│   └─ services.yml               wiring, and the setting  ahm.map.editors
│
├─ app/features/<name>/           optional, switchable features (first: campaigns); loaded by app/js/features.js only when switched on
├─ tools/prompts/                 agent rules (`_common.md`) and domain notes (`domain/`); the agent roles are in `.claude/agents/`
│
├─ controller/main.php            page, data, notes, save, overlays: login + permissions
├─ service/store.php              ALL data rules (places, notes, languages, overlays, search index, migration)
├─ service/dates.php              the date model on the server (mirror of app/js/core/dates.js)
├─ event/listener.php             language file and the "Map" Quick links entry
├─ language/en/common.php         the few texts used by the forum side
├─ styles/all/template/event/
│   └─ navbar_header_quick_links_after.html     the menu entry (phpBB template syntax)
│
├─ app/                           the front-end (plain files, served as they are)
│   ├─ index.html                 the page
│   ├─ css/                       hand-formatted, sectioned; linked in this order
│   │   ├─ base.css               palette (copied from the forum style), tokens, page reset (shared)
│   │   ├─ sidebar.css            panel, tabs, lists, forms, details, folds, dialogs
│   │   └─ map.css                map canvas, popup, type symbols, historical-map controls
│   └─ js/                        classic scripts, one folder per domain (DOMAINS.md), loaded in this order:
│       ├─ config.js              settings and addresses (shared)
│       ├─ ahm.js                 `$` and window.AHM: the commands and events between sidebar and map (shared, INTERFACES.md I-2)
│       ├─ core/data.js           loading data (also converts old data), the language dictionary, small helpers
│       ├─ core/dates.js          THE date model (formats, UTC time stamps, checks, text); also loaded by dev/save-handler.js
│       ├─ core/layer-rules.js    layer filter state and the pure layer rules
│       ├─ core/search.js         filtering, searching, sorting
│       ├─ core/providers.js      place search and directions (outside services)
│       ├─ sidebar/datefield.js   the date input used everywhere (unknown / exact / approximate / range + format)
│       ├─ sidebar/searchfield.js the one search field with a clear (✕) button
│       ├─ sidebar/period.js      the period filter fields
│       ├─ sidebar/placeform.js   the place form (names, type, dates or height, position)
│       ├─ map/typeicons.js       one symbol per place type
│       ├─ map/map.js             the map: base maps, symbols, markers, route; commands AHM.map.*, events place:click …
│       ├─ map/overlays.js        historical map images (Maps fold)
│       ├─ sidebar/layers.js      thematic layers UI: list, details, forms, categories (Layers tab)
│       └─ sidebar/ui.js          sidebar, details, editing, start-up
│
├─ data/                          sample data AND the data used in development
│   ├─ places.geojson
│   ├─ languages.json             the dictionary of languages
│   ├─ overlays.json
│   ├─ categories.json            layer categories (dictionary)
│   ├─ layers.json                all layers, with their ordered members
│   ├─ layer-notes/               <layer-id>/<note-id>.md and index.json (generated)
│   └─ notes/
│       ├─ index.json             search index (generated)
│       └─ <place-id>/<note-id>.md
│
└─ dev/                           development only
    ├─ bs-config.js               browser-sync settings
    ├─ save-handler.js            saving for development (same rules as store.php)
    └─ build_notes_index.py       rebuilds notes/index.json by hand
```

Created at run time, not shipped: `store/ahm_map/` in the forum (live data, `archive/`, `overlays/`, `.lock`) and `dev/archive/` in development.

---

## 5. Data model

All data is plain files. There is no database.

### Identifiers

Every place, note and overlay has a **UUID** (version 4, or a fixed-seed version 5 for the sample data). It never changes and is the only thing that links records.

### Dates

One date model is used for places, notes and filters. It lives in `app/js/dates.js` (browser and dev server) and `service/dates.php` (forum server), which must stay in step.

A date is either **`null` (unknown)** or an object:

```json
{ "fmt": "dmy", "ts": "1500-03-21T00:00:00Z", "mode": "exact", "ts_to": null }
```

- **`mode`** says how sure the date is: `exact`, `approx` ("c. 800 BCE") or `range` (from `ts` to `ts_to`, both in the same format).
- **`fmt`** is the format the person chose. It is stored so the date is shown back exactly as it was entered: `ymd` (1500-03-21), `dmy` (21.03.1500), `mdy` (03/21/1500), `dmony` (21 March 1500), `mony` (March 1500), `y` (year), `c` (century), `m` (millennium).
- **`ts`** (and `ts_to`) is a **UTC time stamp in ISO 8601 / RFC 3339 text**, always ending in `Z`: the start of the period that was entered. A day is `T00:00:00Z` of that day, a month its 1st, a year 1 January, a century its first year (12th century BCE starts at 1200 BCE), a millennium likewise. With `fmt` and `ts` the original entry can always be rebuilt.
  - Years 0000 to 9999 are written with four digits, exactly as RFC 3339 requires (`1500-03-21T00:00:00Z`).
  - Outside that range the ISO 8601 **expanded year** is used: a sign and six digits. This covers every BCE date, because ISO 8601 numbers years astronomically (year `0000` is 1 BCE, so 1200 BCE is `-001199-01-01T00:00:00Z`, 782 BCE is `-000781-…`) and everything after 9999 CE (`+010000-01-01T00:00:00Z`). RFC 3339 itself has no such years, so these values are ISO 8601 only; JavaScript's `Date.parse` and most ISO 8601 libraries read them.
  - Only this one spelling is accepted: UTC `Z`, whole seconds, midnight for a period start, no offsets (`+00:00`), no lower-case `z`, no `+000500` for 500 CE. Anything else is refused by the server.
  - **Compare time stamps as instants, not as text.** Alphabetical order is wrong among BCE years (`-000781` sorts before `-001199`). The code converts to seconds first (`isoToSec` / `iso_to_sec`).
- A century or millennium covers its whole length: for filtering, "5th century" means 401 to 500 CE, and a range runs to the end of its last period.
- Calendar: proleptic Gregorian with year numbering 1 BCE, 1 CE (no year 0 for people; years 1 to 99999 either side). Julian dates are not converted: enter them as written.
- The server checks that `ts` really is the start of a period of the chosen format, that a range ends after it starts, and that a place does not end before it begins.

### Place types

`city`, `town`, `village`, `settlement`, `fortress`, `temple`, `tomb`, `inscription_site`, `monument`, `mountain`, `lake`, `river`, `region`.

The list is kept in three places that must stay in step: `PLACE_TYPES` (`placeform.js`), `TYPE_STYLE` (`typeicons.js`) and `TYPES` (`store.php`, `save-handler.js`).

### `places.geojson`

A GeoJSON `FeatureCollection` of points. It opens directly in QGIS or any GeoJSON tool.

```json
{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [44.7306, 40.1119] },
  "properties": {
    "id": "e7d52492-2313-5972-a766-3f1ef6a47a5d",
    "label": "Garni",
    "type": "temple",
    "date_from": { "fmt": "y", "ts": "-000799-01-01T00:00:00Z", "mode": "approx", "ts_to": null },
    "date_to": null,
    "height_m": null,
    "names": [
      { "lang": "hy", "name": "Գառնի" },
      { "lang": "en", "name": "Garni" },
      { "lang": "ru", "name": "Гарни" }
    ]
  }
}
```

- Coordinates are `[longitude, latitude]` (GeoJSON order).
- `names` may contain several names with the same `lang`. The first name of a language is the one shown. `lang` must be a code of the [language dictionary](#languages-1).
- `label` is derived (the first English name, or the first name). It exists only so GIS tools can label the points.
- `date_from` / `date_to` are [dates](#dates) or `null` (unknown). Both are optional. `date_to: null` means the end is not known (it no longer means "still exists").
- `height_m` is a whole number of metres (0 to 9000) or `null`, and only a **mountain** has one. A mountain never has dates; every other type never has a height.
- The file has `"version": 3`. Older files (version 1: dates as year numbers with `date_from_text` and `approx`; version 2: time stamps as whole seconds) are converted automatically, see [Updating](#updating).

### Notes

One Markdown file per note: `notes/<place-id>/<note-id>.md`, with a small header.

```
---
id: 76c418bc-e40a-5489-9457-ab0754a33b68
lang: ru
title: Разрушение
date: {"fmt":"c","ts":-37881820800,"mode":"exact","ts_to":null}
---
Text of the note, in Markdown or plain text.
```

The `date:` line is one line of JSON in the [date model](#dates) and is **left out when the date is unknown**. Notes are linked to a place by the folder name only; a place does not list its notes.

### `notes/index.json`

Generated from the note files after every save. It holds `id`, `place`, `lang`, `title`, `date` (or `null`) and the full `text` of every note. The browser loads it once to search inside notes. The `.md` files are the source of truth; the index can always be rebuilt (`dev/build_notes_index.py`, or any save).

### Layers and categories

`categories.json`: `{ "version": 1, "categories": [ { "id": "<uuid>", "names": [ { "lang", "name" } ] } ] }`.

`layers.json` (one file for all layers; chosen over one file per layer because the list is small and is read whole):

```json
{ "version": 1, "layers": [ {
  "id": "<uuid>", "names": [ { "lang": "en", "name": "Urartian fortresses" } ],
  "descriptions": [ { "lang": "en", "text": "…" } ],
  "category": "<category id>" , "color": "#9a3b2e",
  "date_from": null, "date_to": null,
  "members": [ { "place": "<place id>" } ],
  "created": "2026-11-04T10:00:00Z", "updated": "2026-11-04T10:00:00Z" } ] }
```

`members` is **ordered**; keep that order. `category`, `color` and the dates may be `null`.

Layer notes are `layer-notes/<layer-id>/<note-id>.md`, same header as place notes (`id`, `lang`, `title`, `date`); `layer-notes/index.json` is generated (`id`, `layer`, `lang`, `title`, `date`, `text`).

A **place note** may carry an extra header line `layers: <id>,<id>` and its `notes/index.json` entry has `layers: []`. A note can only be tied to layers the place belongs to. Taking a place out of a layer, or deleting a layer, removes the tags from the notes (the changed notes are archived first). Every change archives the old file.

### Languages

`languages.json` is the dictionary every name and note language is chosen from:

```json
{
  "version": 1,
  "languages": [
    { "code": "en", "name": "English", "native": "English" },
    { "code": "hy", "name": "Armenian", "native": "Հայերեն" }
  ]
}
```

- `code` is 2–8 letters, lower case, unique. It is the value stored in names and notes. `native` may be empty.
- The server refuses a place name or a note whose language is not in the file. Only administrators can add a language.
- If the file does not exist yet (an update from an older version), it is created from the languages already used in the data, with a short built-in list of names (`en`, `hy`, `ru`, `tr`, `la`, `xur`).

### Historical map images

`overlays.json`:

```json
{
  "version": 1,
  "overlays": [
    {
      "id": "…",
      "title": "Big Hayk regions",
      "file": "<id>.png",
      "coordinates": [
        [40, 41],
        [46, 41],
        [46, 37],
        [40, 37]
      ],
      "minzoom": 4,
      "maxzoom": 9,
      "opacity": 0.5,
      "created": "2026-11-04T08:13:00Z",
      "updated": "2026-11-04T08:13:00Z"
    }
  ]
}
```

- `coordinates` are the four corners **in this order: top-left, top-right, bottom-right, bottom-left**, as `[lon, lat]`.
- The image is visible from `minzoom` **up to but not including** `maxzoom`.
- The image files are in `overlays/<id>.<png|jpg|webp>`.

### `archive/`

Before any file is replaced or an image deleted, the old version is copied here with a time stamp in the compact ISO 8601 "basic" form, local server time, which is safe in file names (`places-20261103-101500.geojson`, `note-<place>-<note>-….md`, `overlay-…`, `languages-….json`, and `legacy-…` / `…-before-dates…` copies made by the migration). Nothing in `archive/` is ever read by the application. It is the undo history, to be restored by hand.

---

## 6. HTTP interface

In the forum every address is below `…/app.php` (for example `https://forum.example/app.php/map`), or without `app.php` when URL rewriting is on.

| Address                    | Method | Who      | Purpose                                               |
| -------------------------- | ------ | -------- | ----------------------------------------------------- |
| `/map`                     | GET    | everyone | The page.                                             |
| `/map/data/places`         | GET    | everyone | `places.geojson`.                                     |
| `/map/data/notes-index`    | GET    | everyone | `notes/index.json`.                                   |
| `/map/data/overlays`       | GET    | everyone | The overlay list.                                     |
| `/map/data/languages`      | GET    | everyone | The language dictionary.                              |
| `/map/data/layers`, `/map/data/layer-notes-index`, `/map/data/categories` | GET | everyone | Layers, layer notes index, categories. |
| `/map/note/{place}/{id}`   | GET    | everyone | One note, as Markdown.                                |
| `/map/overlay/{id}`        | GET    | everyone | One overlay image.                                    |
| `/map/save`                | POST   | editors  | Add a place, edit a place, add or edit a note (JSON). |
| `/map/language-save`       | POST   | admins   | Add a language (JSON `{ code, name, native }`).       |
| `/map/layer-save`          | POST   | editors  | Create or change a layer; change its places; add or edit a layer note (see below). |
| `/map/layer-delete`        | POST   | admins   | Delete a layer (JSON `{ "id": … }`; archived first). |
| `/map/category-save`       | POST   | admins   | Add or rename a category (JSON `{ id?, names }`).     |
| `/map/overlay-save`        | POST   | admins   | Create or update an overlay's settings (JSON).        |
| `/map/overlay-upload/{id}` | POST   | admins   | Send the image bytes (`Content-Type: image/*`).       |
| `/map/overlay-delete`      | POST   | admins   | Delete an overlay (JSON `{ "id": … }`).               |

Read routes answer with `Cache-Control: private, no-cache` and an `ETag`, so browsers always check but unchanged files cost only a short "not modified" reply.

**`/map/save` accepts one of three bodies:**

```jsonc
// new place (optionally with its first note)
{ "place": { "lat": 39.7, "lon": 44.3, "type": "mountain", "names": [{"lang":"en","name":"Ararat"}, {"lang":"en","name":"Masis"}],
             "height_m": 5137 },
  "note":  { "lang": "en", "title": "…", "date": { "fmt": "c", "ts": -37881820800, "mode": "exact", "ts_to": null }, "text": "…" } }
// (a place that is not a mountain sends "date_from" and "date_to" instead of "height_m"; each is a date object or null)

// change a place (its id never changes)
{ "place_update": { "id": "…", "lat": …, "lon": …, "type": "…", "names": […], "date_from": …, "date_to": …, "height_m": … } }

// add a note, or edit one (give "id" inside "note")
{ "place_id": "…", "note": { "id": "…", "lang": "…", "title": "…", "date": …, "text": "…" } }
```

`/map/save` also accepts `layer_ids: [...]` (or `layer_id`) next to a new `place` (the place joins those layers) and `note.layers: [...]` (omit on edit to keep the tags).

**`/map/layer-save` accepts one of:** `{ "layer": { "id"?, "names", "descriptions", "category", "date_from", "date_to", "color" } }`, `{ "layer_members": { "id", "add": [...], "remove": [...] } }`, `{ "layer_note": { "layer_id", "note": { "id"?, "lang", "title", "date", "text" } } }`.

Answers are JSON: `{ "ok": true, "id": "<place id>" }` or `{ "error": "<readable message>" }` with status 400 (bad input), 401 (not logged in), 403 (not allowed), 415 (wrong content type) or 500.

**In development** the same operations are served by `dev/save-handler.js` at `/api/save`, `/api/language/save`, `/api/overlay/save`, `/api/overlay/upload/{id}` and `/api/overlay/delete`, `/api/layer/save`, `/api/layer/delete` and `/api/category/save`, with no login. The data and images are plain static files under `/data/`.

---

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

## 8. Underlying decisions

| Decision                                                   | Why                                                                                                                        | What was set aside                         |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **Plain files, no database**                               | Runs on shared hosting, easy to back up and inspect, no schema migrations, and the data stays readable by other tools.     | MySQL tables; PostGIS.                     |
| **Places as GeoJSON**                                      | The standard exchange format: QGIS and every web map read it. Edits are small.                                             | A custom format; a GeoPackage.             |
| **Notes as one Markdown file each, linked by UUID**        | Text is separate from geometry, scales to thousands, can be edited and versioned on its own, and many notes per place fit. | Notes inside the GeoJSON.                  |
| **A generated search index** (`notes/index.json`)          | Full-text search with no server and no database. It is rebuilt from the files, so it can never disagree with them.         | Server-side search; one request per note.  |
| **Stable UUIDs everywhere**                                | Links, history and future synchronisation depend on IDs that never change.                                                 | Names or counters as keys.                 |
| **Names are a list, not a column**                         | Real places have many names, in many languages, even several in one language.                                              | One name per language.                     |
| **Dates are an ISO 8601 UTC time stamp plus the chosen format** | One standard, readable value that other tools understand, reliable for sorting and filtering, and the format lets every viewer see exactly what the researcher entered. | Free text; year numbers with typed wording; seconds as a bare number. |
| **A date can be unknown, approximate or a range**          | Researchers often know a date only roughly; "unknown" is a normal answer and every date is optional.                      | A single exact year.                       |
| **A mountain has a height, not dates**                     | A mountain has no founding or end; its height is the useful fact.                                                          | Dates on every type.                       |
| **Languages come from a dictionary managed by admins**     | Free text produced typos and unknown codes; a fixed list keeps names, notes and filters consistent.                       | Free-text language codes.                  |
| **Layers are subsets listing place ids; General is implicit** | One copy of each place; a place can be in many layers and always stays in General; removing it from a layer loses nothing. | Copying places into layers. |
| **Layer filters are separate from the period filter**      | Owner's decision: a period filter does not look at layers for now.                                                         | Finding layers by date overlap.            |
| **Layer members are an ordered list**                      | Campaigns have a sequence; kept for future route lines.                                                                    | An unordered set.                          |
| **Plain JavaScript, classic scripts, no build step**       | Upload and it works. Works unchanged under phpBB and under a static server. Nothing to install or compile.                 | A framework and bundler.                   |
| **MapLibre GL JS**                                         | Open source, no per-load fees, vector tiles, rich styling, native support for pinning images by four corners.              | Google Maps; Mapbox; Leaflet.              |
| **Everything outside is behind `config.js`**               | Base map, satellite, search and directions can be swapped one at a time, for example for our own tiles.                    | Calling providers from many places.        |
| **The data rules live in `store.php`, free of phpBB**      | They can be tested alone and reused if the forum is ever replaced.                                                         | Rules inside the controller.               |
| **The same page for the forum and for development**        | One code base. Only `config.js` knows the difference.                                                                      | A separate development copy.               |
| **Live data in `store/`, outside the extension**           | Updating or removing the extension never touches the data.                                                                 | Data inside `ext/`.                        |
| **Copy before every change; never delete without a copy**  | A mistake can always be undone by hand.                                                                                    | In-place edits.                            |
| **Server checks every write; buttons are only a courtesy** | Hidden buttons are not security.                                                                                           | Client-side checks only.                   |
| **Overlays are pinned by four corners**                    | The old pictures are imprecise, so they need stretching to fit; four corners allow any stretch.                            | One anchor point, scale and rotation only. |
| **Overlay opacity is a property of the image**             | The real map must show through. Visitors can also change it for themselves without saving.                                 | Changing the base map's opacity.           |
| **Labels use their own data source**                       | If a font fails to load, only the labels disappear. The symbols stay.                                                      | One source for symbols and labels.         |
| **Symbols drawn in code** (canvas)                         | No image files to maintain; the list and the map always use the same symbol.                                               | Image sprites.                             |
| **Place search only on Enter**                             | The free Nominatim server forbids search-as-you-type and allows 1 request per second.                                      | Autocomplete.                              |
| **Relative asset addresses through `path_helper`**         | Works whatever the forum's "Server URL settings" are.                                                                      | Absolute addresses.                        |
| **Colours copied from the forum style**                    | The map page looks like the rest of the forum, and the names match so it can later follow the style automatically.         | A separate palette.                        |

---

## 9. Code style

Formatting is automatic and checked into the repository (`.prettierrc.json`, `.prettierignore`, `.editorconfig`), so editors agree.

| Language                               | Tool and settings                                                                                                             |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| JavaScript, HTML, JSON, YAML, Markdown | Prettier 3: 120 columns, 2 spaces, single quotes, ES5 trailing commas.                                                        |
| PHP                                    | Prettier with `@prettier/plugin-php`: target PHP 7.1, PSR-2 braces, 4 spaces, single quotes, 120 columns, no trailing commas. |
| Python                                 | `black`, 120 columns.                                                                                                         |
| CSS                                    | **Hand-formatted** on purpose (Prettier skips `app/css/`): compact one-line rules grouped under section comments.    |
| Not formatted                          | `data/` (generated and user data) and `styles/` (phpBB template syntax).                                                      |

### Conventions

**General**

- Every file starts with a comment saying what it is for. Sections inside a file are marked `// ---- name ----` (CSS: `/* ---- name ---- */`).
- Comments explain **why**, not what.
- Names are in English, in `camelCase` for JavaScript, `snake_case` for PHP methods, `kebab-case` for CSS classes. Constant tables are `UPPER_CASE` (`TYPE_STYLE`, `PLACE_TYPES`).
- Functions that can fail with a user-visible problem **throw an `Error` with a readable sentence**, which the interface shows as it is.

**JavaScript**

- Classic `<script>` files sharing one global scope. The load order is fixed in `index.html` and listed in [Project structure](#4-project-structure). There are no modules or bundler on purpose.
- Prefixes keep names apart: `ov…` for overlays, `pf…` for the place form, `df…` for the date field, `ahm-…` for map layer, source and image ids.
- One place knows where data comes from (`data.js` with `config.js`); everything else asks it.
- Browser code never builds HTML from raw text; it goes through `esc()`.

**PHP**

- Namespace `ahm\map\…`. The controller stays thin; **all** validation and file handling is in `service/store.php`, which must not use phpBB classes.
- Bad input throws `\InvalidArgumentException` (answered as 400); anything else becomes a 500 with a short message.
- phpBB forbids `$_GET`, `$_POST` and `$_REQUEST`. Use its request class or `php://input`.
- Every write takes the lock, archives the old file first, and writes atomically (write a temporary file, then rename).

**CSS**

- Colours come only from variables. The palette is the first `:root` block of `css/base.css` (the same names and values as the forum style `paper-and-pencil`) and map-only values (radii, handle and route colours) are in a second `:root` block. There is no separate `colours.css` file.
- Boxed blocks share one rule (the "cards" section) instead of repeating it.

**Data and tests**

- Data files are never reformatted by tools.
- There is **no automated test suite in the repository** yet. See [Verification status](#14-verification-status).

---

## 10. Deployment instructions

### Requirements

- phpBB **3.2 or 3.3** (the extension declares `>=3.2.0,<4.0.0`) and PHP **7.1.3 or newer**.
- The web server user can **write** to the forum's `store/` folder (phpBB already needs this).
- Visitors' browsers can reach the outside services: the base map and fonts (OpenFreeMap), the satellite tiles (EOX), directions (OSRM), place search (Nominatim) and the MapLibre library from the jsDelivr CDN.

### First installation

1. **Copy** the repository contents (everything except `.git` and `node_modules`) so that they end up as `<forum>/ext/ahm/map/` (folder names in lower case, exactly `ahm` and `map`).
2. In the forum's admin panel (ACP): **Customise → Manage extensions**, find **Armenian Highlands Map**, click **Enable**.
   On enabling, the sample data (10 places, 20 notes) is copied to `<forum>/store/ahm_map/`.
3. **Purge the cache:** ACP → General → _Purge the cache_.
4. Open `https://your-forum/app.php/map`. A **Map** entry also appears in the **Quick links** menu.
5. Choose who may edit: open `config/services.yml` and set `ahm.map.editors` to `members` (every logged-in user) or `admins`. Purge the cache again after changing it.

### Updating

1. Replace the extension files.
2. Purge the cache. (The routes are cached by phpBB; skipping this gives errors such as _"Some mandatory parameters are missing … to generate a URL for route"_.)
3. If the notice for a release says the data format changed, **disable and re-enable** the extension. The conversion also runs by itself on the next save. Your data in `store/ahm_map/` is kept, and every file that is converted is copied to `archive/` first. The browser also understands the old format, so the map keeps working until the conversion has run.

**Update to the date model and the language dictionary (this release):** the conversion turns year numbers into dates (`approx` becomes mode `approx`, a typed century such as "12th century BCE" becomes a century date), creates `languages.json` from the languages already in use, and gives every place a `height_m`. Things to know: an old `date_to: null` ("still exists") becomes "unknown"; a **mountain loses its dates** (the old file is in `archive/`); "early / mid / late" century wording becomes an approximate century.

**Update to ISO 8601 time stamps (this release):** dates saved by the previous release have `ts` as whole seconds. They are converted to ISO 8601 / RFC 3339 text when the extension is enabled, on the next save, when the development server starts, and also on the fly when the page reads old data. The old file is copied to `archive/` first. `places.geojson` becomes `"version": 3`.

### Renaming the extension

Needed only to use another vendor or name. Names may contain letters, digits and underscores, **not hyphens** (they become a PHP namespace). Disable the extension in the ACP first, then from the forum root:

```sh
NEW_VENDOR=qartez; NEW_NAME=haykakan_lernashxarh
mkdir -p ext/$NEW_VENDOR && mv ext/ahm/map ext/$NEW_VENDOR/$NEW_NAME && rmdir ext/ahm
cd ext/$NEW_VENDOR/$NEW_NAME
grep -rIl --exclude-dir=data --exclude-dir=node_modules --exclude-dir=archive -e 'ahm\\map' -e 'ahm/map' -e 'ahm\.map\.' . \
  | xargs sed -i -e "s#ahm\\\\map#$NEW_VENDOR\\\\$NEW_NAME#g" -e "s#ahm/map#$NEW_VENDOR/$NEW_NAME#g" -e "s#ahm\.map\.#$NEW_VENDOR.$NEW_NAME.#g"
```

Then purge the cache and enable the new extension. The live data in `store/ahm_map/` is not tied to the name and keeps working. After any later update, run the `grep … | xargs sed …` lines again on the new files.

### Backups

Copy the whole **`store/ahm_map/`** folder. It holds the places, the notes, the overlays and the `archive/` history. To restore, put it back.

### Web server notes

- `store/` is blocked from the web by phpBB's own rules on Apache. On **Nginx** make sure your configuration also denies `store/`, as in phpBB's sample configuration.
- **Image uploads** are limited by PHP (`post_max_size`, default 8 MB) and by the web server (Nginx `client_max_body_size`). The application allows 12 MB; raise the server limits if bigger images should work. The browser already shrinks scans larger than 4096 px.
- For URLs without `app.php`, enable phpBB's URL rewriting.

### Configuration reference

| Setting                  | Where                 | Meaning                                                       |
| ------------------------ | --------------------- | ------------------------------------------------------------- |
| `ahm.map.editors`        | `config/services.yml` | `members` or `admins`: who may add and edit places and notes. |
| `center`, `zoom`, `bbox` | `app/js/config.js`    | Start view, and the area used to bias place search.           |
| `basemap.style`          | `app/js/config.js`    | Style address of the vector base map.                         |
| `basemap.satellites[]`   | `app/js/config.js`    | Satellite sources (each is an entry in the base-map list).    |
| `geocodeUrl`, `routeUrl` | `app/js/config.js`    | Place search and directions servers.                          |
| `features`               | `app/js/config.js`    | Optional features (`app/features/<name>/`) that are switched on: in development the list in the file (`?features=` in the URL hides all); in the forum only what the controller sends (nothing today, so they are hidden). See `DOMAINS.md`, "Features". |

### Troubleshooting

| Symptom                                                        | Likely cause and remedy                                                                                     |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Error about a missing route parameter, or a new feature absent | phpBB's cache is old. Purge the cache; if needed disable and re-enable the extension.                       |
| The page opens but the sidebar says it could not load data     | The data folder is missing or unreadable: check `store/ahm_map/` exists and the web server can read it.     |
| "Save failed" with a permission message                        | `store/ahm_map/` is not writable by the web server, or the user may not edit (see `ahm.map.editors`).       |
| "Save failed: only administrators can …"                       | The action is for administrators (overlays), or `ahm.map.editors` is `admins`.                              |
| Image upload fails                                             | The image is over a server limit (see above) or is not PNG, JPEG or WebP.                                   |
| "Language … is not in the list"                                | The language is not in the dictionary. An administrator adds it in the **Languages** tab.                   |
| An overlay does not show                                       | It is hidden at the current zoom: the Layers list says "Hidden at this zoom" and gives the zoom range.      |
| The base map is blank                                          | The browser cannot reach the map style or tiles (blocked, offline, or the provider is down).                |
| Armenian place names show as empty boxes on the map            | The base map's fonts lack Armenian letters. Names are still correct in the list. See the limitations below. |

---

## 11. Local development

You do not need phpBB. You need Node.js.

```sh
# from the repository root
npx browser-sync start --config dev/bs-config.js     # then open http://localhost:3000
```

- The page and its scripts are served from `app/`; `/data` is served from `data/`; `dev/save-handler.js` provides the `/api/…` endpoints. Changes to `app/` reload the page; changes to `data/` do not (saving a place must not reload it).
- In development **everyone may edit and manage overlays** (there is no login).
- Saving writes into `data/` itself, so the sample data changes as you work. Copies of replaced files go to `dev/archive/`.
- If you edit a note file by hand, rebuild the search index: `python3 dev/build_notes_index.py data/notes`.
- Format before committing: `npx prettier --write .` (uses `.prettierrc.json`; `data/`, `styles/` and `app/css/` are skipped by `.prettierignore`).

---

## 12. Licences of the data and services

This is a summary for planning and **not legal advice**. Terms change; check each provider before a public launch.

| Part                            | Used for                      | Terms in short                                                                                                                                                                                                            |
| ------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MapLibre GL JS                  | Drawing the map               | Open source, free.                                                                                                                                                                                                        |
| OpenFreeMap                     | Base map (OpenStreetMap data) | Free, commercial use allowed, **attribution required** (shown automatically). No guarantee of availability. Map data: ODbL, "© OpenStreetMap contributors".                                                               |
| Sentinel-2 cloudless 2020 (EOX) | Satellite layer               | **Non-commercial use only** (CC BY-NC-SA 4.0) with EOX's attribution wording and links (already set in `config.js`). Commercial use needs a licence from EOX.                                                             |
| Nominatim (public server)       | Search for other places       | Maximum **1 request per second** for the whole site, no search-as-you-type, results should be cached (the application searches only on Enter, caches, and throttles each visitor). A busy site should use its own server. |
| OSRM demo server                | Car directions                | Reasonable non-commercial use, about 1 request per second, no guarantees, not for production. Credit to OSRM and OpenStreetMap (shown in the Directions tab).                                                             |
| Data you enter                  | Places, notes, images         | Yours. Copying text or images from other works (for example Wikipedia, books, old maps) brings the licence of those works.                                                                                                |

If you import OpenStreetMap data into your own place data in bulk, the ODbL share-alike rule applies to that database. The sample places were typed by hand and contain no OSM import.

---

## 13. Known limitations and ideas

**Limitations**

- **No automated tests** in the repository; no "delete place" function (editing is possible, deleting a place is not).
- **Public search and directions servers** have usage limits that are per site, but the application can only throttle per visitor. A heavily used site needs its own geocoder and router, or a small server-side proxy with a cache.
- **Non-commercial satellite imagery.** If the forum earns money (ads, paid membership), ask EOX or change the satellite source.
- **Fonts for Armenian labels** depend on the base map provider. If they are missing, the labels show empty boxes. Hosting our own fonts (part of the next point) fixes it.
- The base map's layer toggles rely on the provider's layer names.
- Overlay order cannot be changed (newer images are drawn on top).
- Fitting an old picture by its four corners is a visual alignment, **not a true georeferencing**; errors in the old picture remain.
- One zoom range per overlay: a picture that is blurry when zoomed in must be split into two overlays.
- The forum-side language file has English only.
- Dates use the proleptic Gregorian calendar; Julian and other calendars are not converted. There is no year 0, and years run from 1 to 99999 on either side.
- A language cannot be renamed or removed in the interface (only added); edit `languages.json` by hand, carefully, if that is ever needed.
- Editing the same place at the same moment from two browsers: the last save wins (the earlier version is in `archive/`).

**Ideas for later**

- Own **PMTiles** base map for the Highlands (no dependence on a provider, offline use, our own fonts and labels), and then an offline and mobile version.
- **Historical routes** (trade roads, campaigns) as dated lines on the map.
- A "Map editors" **group** instead of the all-members / admins choice.
- Delete a place and an overlay-order control.
- Tests, and a small script to export and import the whole data set.
- A cuneiform reading and learning area linked to places that have inscriptions.

---

## 14. Verification status

What has been checked, so you know how far to trust this document:

- **Checked by running it (last check: 2026-11-04):**
  - the date model: 48 000 random round trips of all eight formats in `app/js/dates.js`; 30 000 random ISO time stamps (years −99000 to +99000) read back identically by JavaScript's own `Date.parse`; 25 600 test vectors and 2 020 time stamp strings (accepted and refused spellings) giving the same answers in JavaScript and in `service/dates.php` (alignment, end of period, old-data conversion, upgrade of seconds to ISO text, error cases);
  - `service/store.php` on a copy of the sample data: migration of the old format (50 conversions, 0 on a second run), conversion of data in the previous release's format (seconds to ISO text, in places and in notes), unknown languages refused for names and notes, adding a language (and its error cases), mountain height (valid, empty, too high, not whole), optional dates, a time stamp that does not match its format, notes with and without a date, and the rebuilt search index;
  - the interface in a headless browser against the development server (language tab and its add form, language selects in the place and note forms, date field with several formats and ranges, "31 February" refused, mountain with and without height, server refusing an unknown language). In that browser test the map library was replaced by a stand-in, so map drawing was not exercised.
- **Layers (2026-11-04):** `store.php` 81 checks; the controller with stand-ins for phpBB 29 checks (permissions, not a live phpBB); the Node dev server 75 checks; the interface in a headless browser (map library stubbed) 22 checks: Maps tab rename, Only / Hide, layer search, categories add and rename, create layer, choose places, layer note, new place joins the open layer with a tagged note, leave a layer, delete a layer. Ring colours and clicking markers on the real map were **not** exercised (stub).
- **Not re-checked in the last round:** the Node dev server's answers compared one by one with PHP's for the older features. Overlays and the guest view were not changed.
- **Not verified by me:** behaviour inside a live phpBB installation (the login gate, the administrator check, the Quick links entry and route generation). The extension owner has run earlier versions on a forum; each update should be tried there first.
- **Not verified:** the outside services (base map, satellite, search, directions) could not be reached from the environment used for testing, so their addresses and terms were checked against their documentation and were not exercised live from there.
- **Tests:** PHP `tests/php/` (`php tests/php/run.php`: 93 tests), data `tests/data/` (`php tests/data/run.php`: 38 tests; `php tests/data/run.php <store>` checks a live store, read only) and JavaScript `tests/js/` (`node tests/js/run.js`: 53 tests, incl. real-browser scenarios), all passing on 2026-11-05. The CSS/HTML part is planned in `tests/README.md`. The browser and Node scripts mentioned above are still **not** in the repository.
