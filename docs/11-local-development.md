<!-- Section 11 of the project description; index: README.md -->

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
