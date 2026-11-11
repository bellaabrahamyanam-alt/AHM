<!-- Section 13 of the project description; index: README.md -->

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
