# Proposal 002: map extension points for features

Status: pending (the owner writes `Status: approved` when he agrees)
From: shared (integrator), for the campaigns feature

## Why
A feature (first: military campaigns) must draw its own lines, areas and points on the map. I-2 only lets the sidebar show places
(`setFeatures`) and one route (`setRoute`). A feature may not touch MapLibre objects (DOMAINS.md rule 4), so it needs commands.

## Current text
INTERFACES.md I-2 lists the `AHM.map` commands: `setFeatures, hidePlace, focusPlace, focusPoint, fitTo, fitRoute, setRoute, setRouteMarkers, setPick, editPin, resize, getZoom`.

## New text (I-2, version 1.4)
Provider: **map**. Consumers: features (and anyone).
- `AHM.map.addLayer(id, spec)`: `id` is `"<feature>:<name>"`; `spec = { type: 'line' | 'fill' | 'circle' | 'symbol', data: <GeoJSON FeatureCollection>, paint?, layout?, minzoom?, maxzoom? }` (the map checks that `type` is one of the four and that `paint`/`layout` keys are valid for it). Replaces a layer with the same id.
- `AHM.map.updateLayer(id, data)`: new GeoJSON for an existing layer.
- `AHM.map.removeLayer(id)`: removes it (no error when absent).
- `AHM.map.setLayerVisible(id, visible)`.
- Event `layer:click` `{ id, feature, lngLat }` for clicks on a feature of an added layer (the map emits it; the feature listens with `AHM.on`).
All of these survive a base-map switch (the map re-adds them). Layers added this way are drawn above the base map and below the place symbols.

## Who is affected
map (implements, in `app/js/map/`), shared (INTERFACES.md, `contract.test.js`, the `MAP` list in `features.test.js`), campaigns (uses it).

## Migration
None: additions only. A feature that does not call them is unaffected.

## Tests to add
Contract: the five names exist; `addLayer` rejects an id without the `<feature>:` prefix and unknown types; browser scenario with the MapLibre stub: add, update, remove, base-map switch.
