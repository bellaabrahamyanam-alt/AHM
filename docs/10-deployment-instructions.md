<!-- Section 10 of the project description; index: README.md -->

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
