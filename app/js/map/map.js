// Map rendering: vector base map, satellite, toggles, our markers, route line (map domain).
// The map knows nothing about the sidebar. It receives commands through AHM.map.* and reports clicks through AHM.emit
// (INTERFACES.md, I-2). It starts itself at the end of this file.
let map, tip;
let mapReady = false,
  featuresNow = null, // the last feature collection received (drawn as soon as the map is ready)
  hiddenId = null,
  selectedId = null, // id of the selected place (event state:selected), drawn by the selected look
  hoverId = null, // the place whose symbol is lifted under the mouse
  hoverCluster = null, // the bubble under the mouse
  pendingClick = null, // timer of a single click on a place: a double click cancels it
  pickMarker = null,
  routeMarkers = {};
const CLUSTER_RADIUS = 50; // px: places this close together become one bubble
const CLUSTER_MAX_ZOOM = 11; // from zoom 12 on every place is drawn on its own
const DBL_CLICK_MS = 300; // a single click on a place waits this long, in case a double click follows
const TIP_TOP_MIN = 60; // px from the top edge: closer than this, the tooltip goes below the bullet
const TIP_GAP = 6; // px between the bullet's edge and the tooltip
const BUBBLE = "#3a3f44";
const BUBBLE_HOVER = "#5a6168";
const SEL = {
  shadow: "ahm-highlight-shadow",
  ring: "ahm-highlight", // the white outline; the id the selection tests use
  outer: "ahm-highlight-outer",
  symbol: "ahm-highlight-symbol",
};
const EMPTY = { type: "FeatureCollection", features: [] };
const GROUPS = {
  Water: ["water", "waterway"],
  Roads: ["transportation", "transportation_name"],
  Places: ["place"],
  Boundaries: ["boundary"],
};
const view = { sat: null, off: new Set() }; // sat = id of the active satellite source, or null
function applyVis() {
  map.getStyle().layers.forEach((l) => {
    if (l.id.startsWith("ahm-")) return;
    const g = Object.keys(GROUPS).find((k) =>
      GROUPS[k].includes(l["source-layer"]),
    );
    const hide =
      (g && view.off.has(g)) ||
      (view.sat && ["background", "fill", "fill-extrusion"].includes(l.type));
    map.setLayoutProperty(l.id, "visibility", hide ? "none" : "visible");
  });
  AHM_CONFIG.basemap.satellites.forEach((s) =>
    map.setLayoutProperty(
      "ahm-sat-" + s.id,
      "visibility",
      view.sat === s.id ? "visible" : "none",
    ),
  );
  if (map.getLayer("ahm-labels")) {
    // dark text on the light map, light text on satellite imagery
    map.setPaintProperty(
      "ahm-labels",
      "text-color",
      view.sat ? "#ffffff" : "#333C43",
    );
    map.setPaintProperty(
      "ahm-labels",
      "text-halo-color",
      view.sat ? "#000000" : "#ffffff",
    );
  }
}
function initMap() {
  const b = AHM_CONFIG.basemap;
  map = new maplibregl.Map({
    container: "map",
    style: b.style,
    center: AHM_CONFIG.center,
    zoom: AHM_CONFIG.zoom,
  });
  $("#basemap").innerHTML =
    '<option value="">Map</option>' +
    b.satellites
      .map((s) => `<option value="${s.id}">${s.label}</option>`)
      .join("");
  map.on("error", (e) => {
    if ((e.sourceId || "").startsWith("ahm-sat-"))
      $("#status").textContent =
        "Satellite tiles failed to load: " +
        ((e.error && e.error.message) || "unknown error");
  });
  map.addControl(new maplibregl.NavigationControl(), "top-right");
  map.on("load", () => {
    const first = map.getStyle().layers[1];
    b.satellites.forEach((s) => {
      map.addSource("ahm-sat-" + s.id, {
        type: "raster",
        tiles: s.tiles,
        tileSize: 256,
        maxzoom: s.maxzoom,
        attribution: s.attribution,
      });
      map.addLayer(
        {
          id: "ahm-sat-" + s.id,
          type: "raster",
          source: "ahm-sat-" + s.id,
          layout: { visibility: "none" },
        },
        first && first.id,
      );
    });
    map.addSource("ahm-route", { type: "geojson", data: EMPTY });
    map.addLayer({
      id: "ahm-route",
      type: "line",
      source: "ahm-route",
      paint: { "line-color": "#1d6fd1", "line-width": 5, "line-opacity": 0.8 },
    });
    map.addSource("ahm-places", {
      type: "geojson",
      data: EMPTY,
      cluster: true,
      clusterRadius: CLUSTER_RADIUS,
      clusterMaxZoom: CLUSTER_MAX_ZOOM,
    });
    map.addSource("ahm-label-src", { type: "geojson", data: EMPTY }); // separate source: a font problem can never hide the markers
    registerTypeIcons(map); // one symbol per place type (shape + colour), see typeicons.js
    map.addLayer({
      // a ring under the marker: the members of the layer being edited, or the colour of an "only" layer
      id: "ahm-halo",
      type: "circle",
      source: "ahm-places",
      filter: ["all", ["!=", ["get", "halo"], ""], ["!", ["has", "point_count"]]],
      paint: {
        "circle-radius": 17,
        "circle-color": "rgba(255,255,255,0)",
        "circle-stroke-width": 3,
        "circle-stroke-color": ["get", "halo"],
      },
    });
    map.addLayer({
      // a bubble for places close together (zoom 11 and less); the count is drawn on top
      id: "ahm-clusters",
      type: "circle",
      source: "ahm-places",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": BUBBLE,
        "circle-radius": ["step", ["get", "point_count"], 14, 10, 18, 30, 22],
      },
    });
    map.addLayer({
      id: "ahm-places",
      type: "symbol",
      source: "ahm-places",
      filter: ["!", ["has", "point_count"]],
      layout: {
        "icon-image": [
          "coalesce",
          ["image", ["concat", "ahm-type-", ["get", "type_code"]]],
          ["image", "ahm-type-settlement"],
        ],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
    });
    if (map.getStyle().glyphs) {
      // name labels next to the markers, using a font the base map already provides
      const ops = [
        "step",
        "case",
        "match",
        "get",
        "literal",
        "interpolate",
        "coalesce",
      ];
      const fl = map
        .getStyle()
        .layers.find(
          (l) =>
            l.type === "symbol" &&
            l.layout &&
            Array.isArray(l.layout["text-font"]) &&
            l.layout["text-font"].every((x) => typeof x === "string") &&
            !ops.includes(l.layout["text-font"][0]),
        );
      const font = fl ? fl.layout["text-font"] : ["Noto Sans Regular"];
      map.addLayer({
        id: "ahm-labels",
        type: "symbol",
        source: "ahm-label-src",
        layout: {
          "text-field": ["get", "name"],
          "text-font": font,
          "text-size": ["interpolate", ["linear"], ["zoom"], 4, 11, 10, 14],
          "text-anchor": "top",
          "text-offset": [0, 1.3],
          "text-optional": true,
          "text-padding": 3,
        },
        paint: {
          "text-color": "#333C43",
          "text-halo-color": "#ffffff",
          "text-halo-width": 2,
        },
      });
      map.addLayer({
        id: "ahm-cluster-count",
        type: "symbol",
        source: "ahm-places",
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": font,
          "text-size": 13,
          "text-allow-overlap": true,
        },
        paint: { "text-color": "#ffffff" },
      });
    }
    // the selected place: drawn last, so it is above labels and every other symbol at every zoom
    map.addSource("ahm-highlight", { type: "geojson", data: EMPTY }); // one Point: the selected place, never clustered
    map.addLayer({
      id: SEL.shadow,
      type: "circle",
      source: "ahm-highlight",
      paint: {
        "circle-radius": 17,
        "circle-color": "rgba(0,0,0,0.35)",
        "circle-blur": 0.6,
        "circle-radius-transition": { duration: 150 },
      },
    });
    map.addLayer({
      id: SEL.ring,
      type: "circle",
      source: "ahm-highlight",
      paint: {
        "circle-radius": 14,
        "circle-color": "rgba(0,0,0,0)",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
        "circle-radius-transition": { duration: 150 },
        "circle-stroke-width-transition": { duration: 150 },
      },
    });
    map.addLayer({
      id: SEL.outer,
      type: "circle",
      source: "ahm-highlight",
      paint: {
        "circle-radius": 16,
        "circle-color": "rgba(0,0,0,0)",
        "circle-stroke-width": 1,
        "circle-stroke-color": "rgba(0,0,0,0.5)",
        "circle-radius-transition": { duration: 150 },
      },
    });
    map.addLayer({
      id: SEL.symbol,
      type: "symbol",
      source: "ahm-highlight",
      layout: {
        "icon-image": [
          "coalesce",
          ["image", ["concat", "ahm-type-", ["get", "type_code"]]],
          ["image", "ahm-type-settlement"],
        ],
        "icon-size": 1.3,
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
      paint: { "icon-opacity-transition": { duration: 150 } },
    });
    // ---- pointer events -------------------------------------------------------------------------------------
    const hitAt = (e, ids) =>
      map.queryRenderedFeatures(e.point, {
        layers: ids.filter((id) => map.getLayer(id)),
      })[0];
    const placeAt = (e) => hitAt(e, ["ahm-places", "ahm-labels", SEL.symbol]);
    const bubbleAt = (e) => hitAt(e, ["ahm-clusters"]);
    const zoomToBubble = (f) => {
      // zoom to the level where this bubble splits
      const src = map.getSource("ahm-places");
      if (!src) return;
      src
        .getClusterExpansionZoom(f.properties.cluster_id)
        .then((zoom) => map.easeTo({ center: f.geometry.coordinates, zoom }))
        .catch(() => {});
    };
    map.on("click", (e) => {
      const bubble = bubbleAt(e);
      if (bubble) return zoomToBubble(bubble);
      const ours = placeAt(e);
      if (ours) {
        clearTimeout(pendingClick);
        const id = ours.properties.id;
        pendingClick = setTimeout(() => {
          pendingClick = null;
          AHM.emit("place:click", { id });
        }, DBL_CLICK_MS);
        return;
      }
      const base = map
        .queryRenderedFeatures(e.point)
        .find(
          (f) =>
            !f.layer.id.startsWith("ahm-") && f.properties && f.properties.name,
        );
      AHM.emit("map:click", {
        lon: e.lngLat.lng,
        lat: e.lngLat.lat,
        name: base && base.properties.name,
      });
    });
    map.on("dblclick", (e) => {
      const bubble = bubbleAt(e);
      if (bubble) {
        e.preventDefault();
        return zoomToBubble(bubble);
      }
      const ours = placeAt(e);
      if (!ours) return;
      e.preventDefault(); // no default double-click zoom; the sidebar decides what a double click does
      clearTimeout(pendingClick);
      pendingClick = null;
      AHM.emit("place:dblclick", { id: ours.properties.id });
    });
    map.on("mouseenter", "ahm-places", (e) => {
      const f = e.features[0];
      map.getCanvas().style.cursor = "pointer";
      liftPlace(f.properties.id);
      showTip(f.properties, f.geometry.coordinates);
    });
    map.on("mouseleave", "ahm-places", () => {
      map.getCanvas().style.cursor = "";
      liftPlace(null);
      hideTip();
    });
    map.on("mouseenter", SEL.symbol, (e) => {
      // the selected place is not lifted, but it shows the pointer and its tooltip
      const f = e.features[0];
      map.getCanvas().style.cursor = "pointer";
      showTip(f.properties, f.geometry.coordinates);
    });
    map.on("mouseleave", SEL.symbol, () => {
      map.getCanvas().style.cursor = "";
      hideTip();
    });
    map.on("mouseenter", "ahm-clusters", (e) => {
      map.getCanvas().style.cursor = "pointer";
      hoverCluster = e.features[0].properties.cluster_id;
      paintBubbles();
    });
    map.on("mouseleave", "ahm-clusters", () => {
      map.getCanvas().style.cursor = "";
      hoverCluster = null;
      paintBubbles();
    });
    map.on("movestart", hideTip); // the tooltip is anchored to a bullet; a moving map moves the bullet
    $("#groups").innerHTML = Object.keys(GROUPS)
      .map(
        (g) =>
          `<label><input type="checkbox" data-g="${g}" checked> ${g}</label>`,
      )
      .join(" ");
    overlaysInit();
    syncOverlays();
    applyVis();
    mapReady = true;
    applyFeatures();
    applyHidden();
    applyHighlight();
    AHM.emit("map:ready");
  });
  AHM.on("sidebar:resized", () => map.resize());
  AHM.on("state:selected", ({ value }) => {
    selectedId = value == null ? null : value;
    if (mapReady && hoverId != null && hoverId === selectedId) liftPlace(null); // no lift on top of the selected look
    applyFeatures();
    applyHighlight();
  });
  $("#groups").addEventListener("change", (e) => {
    e.target.checked
      ? view.off.delete(e.target.dataset.g)
      : view.off.add(e.target.dataset.g);
    applyVis();
  });
  $("#basemap").addEventListener("change", (e) => {
    view.sat = e.target.value || null;
    $("#status").textContent = "";
    applyVis();
  });
}

// ---- hover and tooltip (task 008) ----
function liftPlace(id) {
  hoverId = id;
  map.setPaintProperty(
    "ahm-places",
    "icon-opacity",
    id == null ? null : ["case", ["==", ["get", "id"], id], 0.85, 1],
  );
}
function paintBubbles() {
  map.setPaintProperty(
    "ahm-clusters",
    "circle-color",
    hoverCluster == null
      ? BUBBLE
      : ["case", ["==", ["get", "cluster_id"], hoverCluster], BUBBLE_HOVER, BUBBLE],
  );
}
function showTip(props, coords) {
  hideTip();
  const style = TYPE_STYLE[props.type_code] || TYPE_STYLE.settlement;
  const anchor = map.project(coords).y < TIP_TOP_MIN ? "top" : "bottom";
  const html = `<b>${esc(props.name)}</b><br><span class="sn">${esc(props.type)}${props.dates ? " · " + esc(props.dates) : ""}</span>`;
  tip = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false,
    anchor,
    offset: style.r + TIP_GAP,
  })
    .setLngLat(coords)
    .setHTML(html)
    .addTo(map);
}
function hideTip() {
  if (tip) tip.remove();
  tip = null;
}

// ---- the selected place (task 004 and 008) ----
const featureSources = ["ahm-places", "ahm-label-src"];
function applyFeatures() {
  if (!mapReady || !featuresNow) return;
  // the selected place is drawn by its own look, so it is never inside a bubble
  const places = map.getSource("ahm-places");
  if (places)
    places.setData(
      selectedId == null
        ? featuresNow
        : {
            type: "FeatureCollection",
            features: featuresNow.features.filter(
              (f) => f.properties.id !== selectedId,
            ),
          },
    );
  const labels = map.getSource("ahm-label-src");
  if (labels) labels.setData(featuresNow);
}
function applyHidden() {
  if (!mapReady) return;
  const hide = hiddenId ? ["!=", ["get", "id"], hiddenId] : null; // hide the old symbol while its pin is edited
  const places = ["all", ["!", ["has", "point_count"]]];
  if (hide) places.push(hide);
  if (map.getLayer("ahm-places")) map.setFilter("ahm-places", places);
  if (map.getLayer("ahm-labels")) map.setFilter("ahm-labels", hide);
}
function applyHighlight() {
  // the selected place is redrawn after every setFeatures and once the map is ready
  const src = mapReady && map.getSource("ahm-highlight");
  if (!src) return;
  const f =
    selectedId != null && featuresNow && featuresNow.features.find((x) => x.properties.id === selectedId);
  src.setData(
    f
      ? {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: f.geometry.coordinates },
              properties: { id: selectedId, type_code: f.properties.type_code },
            },
          ],
        }
      : EMPTY,
  );
}
// ---- commands for the sidebar: AHM.map.* (INTERFACES.md, I-2) ----
const lngLatOf = (p) => [p.lon, p.lat];
Object.assign(AHM.map, {
  setFeatures(fc) {
    featuresNow = fc;
    applyFeatures();
    applyHighlight();
  },
  hidePlace(id) {
    hiddenId = id;
    applyHidden();
  },
  focusPlace(id) {
    const f = featuresNow && featuresNow.features.find((x) => x.properties.id === id);
    if (f) map.flyTo({ center: f.geometry.coordinates, zoom: Math.max(map.getZoom(), 8) });
  },
  focusPoint(p, zoom) {
    map.flyTo({ center: lngLatOf(p), zoom });
  },
  fitTo(points) {
    if (!points.length) return;
    const b = new maplibregl.LngLatBounds();
    points.forEach((x) => b.extend(x));
    map.fitBounds(b, { padding: 60, maxZoom: 10 });
  },
  fitRoute(coords) {
    const b = coords.reduce((x, c) => x.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
    map.fitBounds(b, { padding: 60 });
  },
  setRoute(geometry) {
    const s = map.getSource("ahm-route");
    if (s) s.setData(geometry ? { type: "Feature", geometry } : EMPTY);
  },
  setRouteMarkers(m) {
    Object.values(routeMarkers).forEach((x) => x.remove());
    routeMarkers = {};
    ["a", "b"].forEach((k) => {
      if (m[k])
        routeMarkers[k] = new maplibregl.Marker({ color: k === "a" ? "#2a8f4f" : "#1d6fd1" })
          .setLngLat(lngLatOf(m[k]))
          .addTo(map);
    });
  },
  setPick(p) {
    pickMarker && pickMarker.remove();
    pickMarker = p ? new maplibregl.Marker({ color: "#666" }).setLngLat(lngLatOf(p)).addTo(map) : null;
  },
  editPin(p, onMove) {
    const m = new maplibregl.Marker({ draggable: true, color: "#BC2A4D" }).setLngLat(lngLatOf(p)).addTo(map);
    m.on("drag", () => {
      const l = m.getLngLat();
      onMove({ lon: l.lng, lat: l.lat });
    });
    return {
      getPosition() {
        const l = m.getLngLat();
        return { lon: l.lng, lat: l.lat };
      },
      setPosition(q) {
        m.setLngLat(lngLatOf(q));
      },
      remove() {
        m.remove();
      },
    };
  },
  resize() {
    map.resize();
  },
  getZoom() {
    return map.getZoom();
  },
});
// start once every script has been loaded (the load handler uses overlays.js)
document.addEventListener("DOMContentLoaded", initMap);
