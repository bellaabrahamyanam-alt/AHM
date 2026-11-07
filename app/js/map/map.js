// Map rendering: vector base map, satellite, toggles, our markers, route line (map domain).
// The map knows nothing about the sidebar. It receives commands through AHM.map.* and reports clicks through AHM.emit
// (INTERFACES.md, I-2). It starts itself at the end of this file.
let map, popup;
let mapReady = false,
  featuresNow = null, // the last feature collection received (drawn as soon as the map is ready)
  hiddenId = null,
  pickMarker = null,
  routeMarkers = {};
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
  popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
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
    map.addSource("ahm-places", { type: "geojson", data: EMPTY });
    map.addSource("ahm-label-src", { type: "geojson", data: EMPTY }); // separate source: a font problem can never hide the markers
    registerTypeIcons(map); // one symbol per place type (shape + colour), see typeicons.js
    map.addLayer({
      // a ring under the marker: the members of the layer being edited, or the colour of an "only" layer
      id: "ahm-halo",
      type: "circle",
      source: "ahm-places",
      filter: ["!=", ["get", "halo"], ""],
      paint: {
        "circle-radius": 17,
        "circle-color": "rgba(255,255,255,0)",
        "circle-stroke-width": 3,
        "circle-stroke-color": ["get", "halo"],
      },
    });
    map.addLayer({
      id: "ahm-places",
      type: "symbol",
      source: "ahm-places",
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
      map.addLayer({
        id: "ahm-labels",
        type: "symbol",
        source: "ahm-label-src",
        layout: {
          "text-field": ["get", "name"],
          "text-font": fl ? fl.layout["text-font"] : ["Noto Sans Regular"],
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
    }
    const placeAt = (e) =>
      map.queryRenderedFeatures(e.point, {
        layers: ["ahm-places", "ahm-labels"].filter((id) => map.getLayer(id)),
      })[0];
    map.on("click", (e) => {
      const ours = placeAt(e);
      if (ours) return AHM.emit("place:click", { id: ours.properties.id });
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
      const ours = placeAt(e);
      if (!ours) return;
      e.preventDefault(); // no default double-click zoom; the sidebar decides what a double click does
      AHM.emit("place:dblclick", { id: ours.properties.id });
    });
    map.on("mouseenter", "ahm-places", (e) => {
      map.getCanvas().style.cursor = "pointer";
      const f = e.features[0].properties;
      popup
        .setLngLat(e.lngLat)
        .setHTML(
          `<b>${esc(f.name)}</b><br><span class="sn">${esc(f.type)}${f.dates ? " · " + esc(f.dates) : ""}</span>`,
        )
        .addTo(map);
    });
    map.on("mouseleave", "ahm-places", () => {
      map.getCanvas().style.cursor = "";
      popup.remove();
    });
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
    AHM.emit("map:ready");
  });
  AHM.on("sidebar:resized", () => map.resize());
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

// ---- commands for the sidebar: AHM.map.* (INTERFACES.md, I-2) ----
const featureSources = ["ahm-places", "ahm-label-src"];
function applyFeatures() {
  if (mapReady && featuresNow)
    featureSources.forEach((id) => map.getSource(id) && map.getSource(id).setData(featuresNow));
}
function applyHidden() {
  if (!mapReady) return;
  const f = hiddenId ? ["!=", ["get", "id"], hiddenId] : null; // hide the old symbol while its pin is edited
  ["ahm-places", "ahm-labels"].forEach((id) => map.getLayer(id) && map.setFilter(id, f));
}
const lngLatOf = (p) => [p.lon, p.lat];
Object.assign(AHM.map, {
  setFeatures(fc) {
    featuresNow = fc;
    applyFeatures();
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
