# Armenian Highlands Map

An interactive, historical map of the Armenian Highlands, built as a **phpBB extension** (`ahm/map`). Forum guests can explore it; members and administrators can add and edit places, notes and historical map images. The same front-end also runs on its own under a small development server, without phpBB.

- **Version:** 0.1.0 (see `composer.json`)
- **Licence:** GPL-2.0-only (the extension), see [Licences of the data and services](docs/12-licences-of-the-data-and-services.md) for the map data.
- **Document status:** written from the project files as they are now. Anything not verified is marked as such in [Verification status](docs/14-verification-status.md).

---

## Contents

1. [Purpose](docs/01-purpose.md)
2. [Implemented features](docs/02-implemented-features.md)
3. [Architecture](docs/03-architecture.md)
4. [Project structure](docs/04-project-structure.md)
5. [Data model](docs/05-data-model.md)
6. [HTTP interface](docs/06-http-interface.md)
7. [Access control and security](docs/07-access-control-and-security.md)
8. [Underlying decisions](docs/08-underlying-decisions.md)
9. [Code style](docs/09-code-style.md)
10. [Deployment instructions](docs/10-deployment-instructions.md)
11. [Local development](docs/11-local-development.md)
12. [Licences of the data and services](docs/12-licences-of-the-data-and-services.md)
13. [Known limitations and ideas](docs/13-known-limitations-and-ideas.md)
14. [Verification status](docs/14-verification-status.md)

---

## Contents

The description is split into one file per section, so a reader (or an agent) opens only the section it needs.

| # | Section | About |
|---|---|---|
| 1 | [Purpose](docs/01-purpose.md) | What the extension is for |
| 2 | [Implemented features](docs/02-implemented-features.md) | Map, search, places, notes, overlays and other built features |
| 3 | [Architecture](docs/03-architecture.md) | Layers, how the front end runs in two places, data flow, where live data lives |
| 4 | [Project structure](docs/04-project-structure.md) | Folders and files, what lives where |
| 5 | [Data model](docs/05-data-model.md) | Places, notes, dates, layers, files and their rules |
| 6 | [HTTP interface](docs/06-http-interface.md) | Endpoints, request and answer formats |
| 7 | [Access control and security](docs/07-access-control-and-security.md) | Who may do what, protections in place |
| 8 | [Underlying decisions](docs/08-underlying-decisions.md) | Why things are the way they are |
| 9 | [Code style](docs/09-code-style.md) | Conventions |
| 10 | [Deployment instructions](docs/10-deployment-instructions.md) | Install in a phpBB forum, update, uninstall |
| 11 | [Local development](docs/11-local-development.md) | Run the dev server and the tests |
| 12 | [Licences of the data and services](docs/12-licences-of-the-data-and-services.md) | Map data and library licences |
| 13 | [Known limitations and ideas](docs/13-known-limitations-and-ideas.md) | Open limits and ideas |
| 14 | [Verification status](docs/14-verification-status.md) | What was verified and what was not |
