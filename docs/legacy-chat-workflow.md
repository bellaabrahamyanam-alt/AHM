# Legacy chat workflow: diff file and full archive

Moved out of `AGENTS.md` on 2026-11-11 to keep the agent starter short. These rules were the owner's requirements 1 and 3 and the procedure for work delivered in a chat **without git**. They apply only to work NOT delivered by a pull request, or when the owner asks for a diff or an archive. With a pull request the repository is the archive and the pull request is the diff (`DOMAINS.md`, "Git workflow").

1. **One diff file per answer** (when the work is NOT delivered by a GitLab merge request: see `DOMAINS.md`, "Git workflow", where the merge request is the diff). Every time you answer with changes, produce exactly one unified-diff file containing all the
   changes of that answer (`diff -ruN` style, paths `a/…` and `b/…` relative to the repository root, i.e. `app/...`, `tests/...`).
   **Send that diff to the owner as its own separate file in every answer** (`SendUserFile`, next to the archive), so it is visible
   without opening the archive. The same file is also stored in `diffs/` inside the archive (requirement 3).
2. **Record every change for other agents.** Every time you change something, append an entry to the change log of your domain,
   `changes/<domain>.md` (date, what, why, files, how to verify, open follow-ups). The entry is part of the same diff.
   Another agent must be able to continue from that file alone. (`AGENT_CHANGES.md` is the read-only history of entries #1-#26;
   when one agent works across several domains for the owner, it writes one entry in each domain log it touched.)
3. **Always deliver the FULL ARCHIVE** (when the work is NOT delivered by a merge request; with a merge request the repository is the archive) (supersedes the earlier "only changed files" rule). In every answer give the owner the
   whole project as ONE `.tar.gz` file. "Everything" means everything in the project: the code, **the diffs**, the tests, the
   documentation, the data, **dotfiles** and every other file. The ONLY thing left out is `node_modules` (any folder with that
   name). Nothing else is skipped, ever, and "the archive" always means this full archive.
   - The diffs of all answers are kept in the archive in `diffs/` (there is no `diffs/` folder since the repository root became the extension folder). New diffs go to
     `diffs/<domain>/NNN-<short-name>.diff` (numbering per domain, starting at 001; a diff that spans domains goes to the domain
     of the main change); the older ones stay as `diffs/ahm-map-NNN-<short-name>.diff`. The diff of the current answer is added there. The archive holds ALL diffs
     (001, 002, …); the separate file sent with an answer is only that answer's diff.
   - Check the archive before sending: list it, confirm `diffs/`, `tests/`, `data/`, `TODO.md` and the docs are inside and that no
     `node_modules` is.

## How the diff and the change log are produced (procedure)

1. Work on the tree. Keep an untouched baseline copy of the previous state.
2. Diff: `diff -ruN --exclude=node_modules <baseline> <current>` with paths normalised to `a/…` and `b/…`, saved as
   `<short-name>.diff`.
3. Check that the diff applies to the baseline (`patch -p1 --dry-run`).
4. Put the diff into `diffs/` and send the full archive (requirement 3).

## Notes from the first sessions (2026-11-03)

(first session, 2026-11-03)

- The archive has the dot-files without the dot (`app/editorconfig`, `app/prettierrc.json`, `app/prettierignore`).
- `app/node_modules` (161 MB) is in the archive and is excluded from diffs.
- The repository root is the extension (it is installed in a forum as `ext/ahm/map/`). The forum style `paper-and-pencil` and the `diffs/` folder were removed from the repository on 2026-11-07; `styles/` now holds only the extension's own phpBB styles (`styles/all`).
