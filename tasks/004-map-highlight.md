# Task 004: map highlights the selected place

- **Domain:** map. **Branch:** `map/highlight`. **Depends on:** 001 merged; visible only after 003.
- **Interface touched:** listens to `state:selected` (I-6). No new `AHM.map` command.
- **Goal:** `AHM.on('state:selected', ({ value }) => ...)` draws a ring/halo around the place with that id; removes it when `value` is null.
- **Acceptance:** highlight survives `setFeatures` re-draws and base-map switches; an id not among the features draws nothing and does not throw; map never calls the sidebar and reads `AHM.state` for nothing else; real MapLibre not available in tests, so the test uses the stub and the PR says how to check by hand; `changes/map.md` entry.
- **Out of scope:** new events, sidebar files.
