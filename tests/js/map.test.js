// Tests of the map domain (DOMAINS.md; owner: map), written first (TDD) from tasks/004-map-highlight.md.
// They are red until `map-dev: task 004` is done. Real MapLibre is not available here: map.js is loaded into the vm
// context of lib/ctx.js and `maplibregl` is a recording stand-in (makeMapLibre below).
//
// What these tests fix (the spec leaves the drawing to the implementer; this is what a test can observe):
//   - the highlight is a `circle` layer `ahm-highlight` over its own GeoJSON source `ahm-highlight`;
//   - that source holds one Point feature (properties.id = the selected id) at the place's coordinates, and no feature
//     when nothing is selected or the id is not among the features last given to AHM.map.setFeatures;
//   - the selection is remembered: the ring follows the place when setFeatures moves it, appears when the place (or the
//     map) arrives after the selection, and stays through base-map switches;
//   - the map listens to AHM.on('state:selected', ({ value }) => ...) and reads AHM.state for nothing else
//     (AHM.state.get('selected') at most), emits no event of its own and adds no AHM.map command.
const { test, ok, eq } = require('./lib/harness');
const { load } = require('./lib/ctx');

const HL = 'ahm-highlight';
const CONFIG = {
  center: [44.5, 40],
  zoom: 7,
  basemap: { style: 'stub', satellites: [{ id: 'sat1', label: 'Satellite', tiles: [], maxzoom: 18, attribution: '' }] },
};
const P1 = ['p1', 44.5, 39.9];
const P2 = ['p2', 44.5, 40.1];
const P3 = ['p3', 44.3, 39.7];

/** A feature collection in the shape of INTERFACES.md I-2 (`setFeatures`). Each place is [id, lon, lat]. */
const fc = (...places) => ({
  type: 'FeatureCollection',
  features: places.map(([id, lon, lat]) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lon, lat] },
    properties: { id, name: id, type: 'City', type_code: 'city', dates: '', halo: '' },
  })),
});

/** A recording stand-in for the parts of MapLibre that map.js uses. Like the real one it refuses sources and layers
 *  before the style has loaded. `fire('load')` plays the map's load event. */
function makeMapLibre() {
  const rec = { loaded: false, layers: [], sources: {}, handlers: {} };
  const base = [
    { id: 'base-bg', type: 'background' },
    { id: 'base-water', type: 'fill', 'source-layer': 'water' },
  ];
  const own = (id) => rec.layers.find((l) => l.id === id);
  const any = (id) => own(id) || base.find((l) => l.id === id);
  const needStyle = () => {
    if (!rec.loaded) throw new Error('Style is not done loading');
  };
  const map = {
    on(name, a, b) {
      const key = b ? name + ':' + a : name;
      (rec.handlers[key] ||= []).push(b || a);
    },
    addControl() {},
    addSource(id, def) {
      needStyle();
      rec.sources[id] = {
        type: def.type,
        data: def.data,
        setData(d) {
          this.data = d;
        },
      };
    },
    getSource: (id) => rec.sources[id],
    removeSource(id) {
      delete rec.sources[id];
    },
    addLayer(def) {
      needStyle();
      rec.layers.push({ ...def });
    },
    getLayer: any,
    removeLayer(id) {
      rec.layers = rec.layers.filter((l) => l.id !== id);
    },
    setFilter(id, f) {
      const l = any(id);
      if (l) l.filter = f;
    },
    setLayoutProperty(id, k, v) {
      const l = any(id);
      if (l) (l.layout ||= {})[k] = v;
    },
    setPaintProperty(id, k, v) {
      const l = any(id);
      if (l) (l.paint ||= {})[k] = v;
    },
    getStyle: () => ({ layers: [...base, ...rec.layers] }),
    queryRenderedFeatures: () => [],
    getCanvas: () => ({ style: {} }),
    resize() {},
    flyTo() {},
    fitBounds() {},
    getZoom: () => 7,
  };
  const fire = (name, arg) => {
    if (name === 'load') rec.loaded = true;
    (rec.handlers[name] || []).forEach((fn) => fn(arg));
  };
  const maplibregl = {
    Map: function () {
      return map;
    },
    NavigationControl: function () {},
    Popup: function () {
      return {
        setLngLat() {
          return this;
        },
        setHTML() {
          return this;
        },
        addTo() {
          return this;
        },
        remove() {},
      };
    },
  };
  return { rec, fire, maplibregl };
}

/** map.js in a page of its own. `ready: false` leaves the map before its load event; `before(p)` runs before initMap().
 *  Handler errors of AHM.emit are only logged, so they are collected in `errors`. */
function boot({ ready = true, before } = {}) {
  const p = load(['map.js']);
  const ml = makeMapLibre();
  const errors = [];
  Object.assign(p.ctx, {
    maplibregl: ml.maplibregl,
    AHM_CONFIG: CONFIG,
    esc: String,
    registerTypeIcons() {},
    overlaysInit() {},
    syncOverlays() {},
    console: { log() {}, warn() {}, error: (...a) => errors.push(a.map(String).join(' ')) },
  });
  let onBasemap = null;
  p.el('#basemap').addEventListener = (name, fn) => {
    if (name === 'change') onBasemap = fn;
  };
  if (before) before(p);
  p.X('initMap()');
  if (ready) ml.fire('load');
  return { p, ml, errors, switchBasemap: (value) => onBasemap({ target: { value } }) };
}

const setFeatures = (p, collection) => p.X('AHM.map.setFeatures(__0)', collection);
const select = (p, value, old = null) => p.X("AHM.emit('state:selected', { value: __0, old: __1 })", value, old);
/** The Point features the highlight layer draws now (none when the layer or its source is missing or hidden). */
const ring = (ml) => {
  const layer = ml.rec.layers.find((l) => l.id === HL);
  const src = layer && ml.rec.sources[layer.source];
  if (!src || (layer.layout && layer.layout.visibility === 'none')) return [];
  const d = src.data || {};
  return d.type === 'FeatureCollection' ? d.features : d.type === 'Feature' ? [d] : [];
};
const drawn = (ml) => ring(ml).map((f) => f.geometry.coordinates);

test('map: highlight: state:selected draws one ring (circle layer ahm-highlight) at the place and moves with the selection', () => {
  const { p, ml, errors } = boot();
  setFeatures(p, fc(P1, P2, P3));
  select(p, 'p2');
  const layer = ml.rec.layers.find((l) => l.id === HL);
  ok(layer && layer.type === 'circle', 'a circle layer ahm-highlight exists');
  eq(HL, layer.source, 'it has its own source of the same name');
  eq([[44.5, 40.1]], drawn(ml), 'one ring at p2');
  eq(['p2'], ring(ml).map((f) => f.properties.id));
  select(p, 'p1', 'p2');
  eq([[44.5, 39.9]], drawn(ml), 'the ring moved to p1 and p2 has none');
  eq([], errors);
});

test('map: highlight: a null value removes the ring, and a later selection draws it again', () => {
  const { p, ml, errors } = boot();
  setFeatures(p, fc(P1, P2));
  select(p, 'p1');
  eq([[44.5, 39.9]], drawn(ml), 'drawn first');
  select(p, null, 'p1');
  eq([], drawn(ml), 'removed');
  select(p, 'p2');
  eq([[44.5, 40.1]], drawn(ml), 'drawn again');
  eq([], errors);
});

test('map: highlight: survives setFeatures re-draws (place moved, place gone and back)', () => {
  const { p, ml } = boot();
  setFeatures(p, fc(P1, P2));
  select(p, 'p1');
  eq([[44.5, 39.9]], drawn(ml), 'drawn');
  setFeatures(p, fc(['p1', 44.6, 39.95], P3));
  eq([[44.6, 39.95]], drawn(ml), 'follows the place after a re-draw that moved it');
  setFeatures(p, fc(P2));
  eq([], drawn(ml), 'the place is not among the features any more: nothing is drawn');
  setFeatures(p, fc(P1));
  eq([[44.5, 39.9]], drawn(ml), 'the selection is kept: the ring is back when the place is');
});

test('map: highlight: survives base-map switches (Map to satellite and back)', () => {
  const { p, ml, switchBasemap } = boot();
  setFeatures(p, fc(P1, P2));
  select(p, 'p1');
  eq([[44.5, 39.9]], drawn(ml), 'drawn');
  switchBasemap('sat1');
  eq([[44.5, 39.9]], drawn(ml), 'still drawn on the satellite map');
  setFeatures(p, fc(P1, P3));
  eq([[44.5, 39.9]], drawn(ml), 'and after a re-draw on the satellite map');
  switchBasemap('');
  eq([[44.5, 39.9]], drawn(ml), 'still drawn back on the vector map');
});

test('map: highlight: an id that is not among the features draws nothing and does not throw', () => {
  const { p, ml, errors } = boot();
  select(p, 'ghost');
  eq([], drawn(ml), 'no features at all yet');
  setFeatures(p, fc(P1));
  eq([], drawn(ml), 'features without that id');
  select(p, 'p1', 'ghost');
  eq([[44.5, 39.9]], drawn(ml), 'a known id draws');
  select(p, 'ghost', 'p1');
  eq([], drawn(ml), 'an unknown id removes the previous ring and draws nothing');
  eq([], errors, 'no handler threw');
});

test('map: highlight: a selection made before the features or before the map is ready is drawn when they arrive', () => {
  const a = boot();
  select(a.p, 'p1');
  eq([], drawn(a.ml), 'selected, no features yet');
  setFeatures(a.p, fc(P1, P2));
  eq([[44.5, 39.9]], drawn(a.ml), 'drawn when the features arrive');
  eq([], a.errors);
  const b = boot({ ready: false });
  setFeatures(b.p, fc(P1, P2));
  select(b.p, 'p2');
  b.ml.fire('load');
  eq([[44.5, 40.1]], drawn(b.ml), 'drawn when the map has loaded');
  eq([], b.errors, 'nothing touched the map before its style was loaded');
});

test('map: highlight: reads AHM.state only for the selection, calls no sidebar code and emits nothing of its own', () => {
  const { p, ml, errors, switchBasemap } = boot({
    before: (page) =>
      page.X(`
        globalThis.__reads = [];
        globalThis.__emitted = [];
        AHM.state = {
          get: (k) => (__reads.push(['get', k]), null),
          set: (k) => __reads.push(['set', k]),
          patch: (k) => __reads.push(['patch', k]),
        };
        const __emit = AHM.emit.bind(AHM);
        AHM.emit = (n, d) => (__emitted.push(n), __emit(n, d));
      `),
  });
  setFeatures(p, fc(P1, P2));
  select(p, 'p1');
  eq([[44.5, 39.9]], drawn(ml), 'the highlight works');
  select(p, 'ghost', 'p1');
  select(p, null, 'ghost');
  switchBasemap('sat1');
  setFeatures(p, fc(P2));
  const reads = p.X('__reads');
  ok(reads.every(([how, key]) => how === 'get' && key === 'selected'), 'AHM.state used: ' + JSON.stringify(reads));
  eq([], p.X('__emitted').filter((n) => n !== 'state:selected' && n !== 'map:ready'), 'no event of its own');
  eq([], errors, 'no call to a name that does not exist in a map-only page (the sidebar)');
});

test('map: highlight: adds no AHM.map command (INTERFACES.md I-2 stays as it is)', () => {
  const { p } = boot();
  eq(
    ['editPin', 'fitRoute', 'fitTo', 'focusPlace', 'focusPoint', 'getZoom', 'hidePlace', 'resize', 'setFeatures', 'setPick', 'setRoute', 'setRouteMarkers'],
    p.X('Object.keys(AHM.map).sort()'),
  );
});
