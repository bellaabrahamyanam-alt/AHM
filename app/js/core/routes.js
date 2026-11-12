// Route chains (core domain): the pure rules behind "find a historical path from one place to another". No DOM and no map here.
// A route (core/shapes.js, route types) is a line with an ordered list of `stops`: the places it passes. Between two consecutive stops it is
// one SEGMENT. Places are the nodes of a graph and segments its edges, so several routes that share a place chain into one journey:
// Van → Ani on one route and Ani → Kars on another is the path Van → Ani → Kars. A one-way route (a march, a migration) can only be used in
// its own direction, a two-way route (trade, roads) in both. Needs core/shapes.js (lineKm, geomLines) to be loaded first.
const ROUTE_TRANSFER_KM = 30; // changing from one route to another counts like this many extra km, so a path with fewer changes wins a near tie

/** Index of the vertex of `pts` nearest to `p`, looking only from index `from` on. */
function nearestVertex(pts, p, from = 0) {
  let best = -1,
    d = Infinity;
  for (let i = from; i < pts.length; i++) {
    const e = (pts[i][0] - p[0]) ** 2 + (pts[i][1] - p[1]) ** 2;
    if (e < d) (d = e), (best = i);
  }
  return best;
}
/** The pieces of one route between its consecutive stops: [{ route, from, to, coords, km }]. placeAt(id) gives { lon, lat } or nothing. */
function routeSegments(s, placeAt) {
  if (!s.geometry || s.geometry.type !== 'LineString') return [];
  const pts = s.geometry.coordinates,
    out = [];
  let prev = null;
  (s.stops || []).forEach((id) => {
    const p = placeAt(id);
    if (!p) return; // a place that is not on the map any more
    const i = nearestVertex(pts, [p.lon, p.lat], prev ? prev.i : 0);
    if (prev && i > prev.i && id !== prev.id) {
      const coords = pts.slice(prev.i, i + 1);
      out.push({ route: s, from: prev.id, to: id, coords, km: lineKm(coords) });
    }
    if (!prev || i > prev.i || id !== prev.id) prev = { id, i };
  });
  return out;
}
/** The graph: Map place id → [{ route, from, to, coords, km }] (edges leaving the place). */
function routeGraph(routes, placeAt) {
  const adj = new Map(),
    add = (e) => (adj.get(e.from) || adj.set(e.from, []).get(e.from)).push(e);
  routes.forEach((s) =>
    routeSegments(s, placeAt).forEach((e) => {
      add(e);
      if (s.twoway) add({ route: s, from: e.to, to: e.from, coords: e.coords.slice().reverse(), km: e.km });
    })
  );
  return adj;
}
// a small binary heap of [cost, item]
function heapPush(h, x) {
  h.push(x);
  for (let i = h.length - 1; i > 0; ) {
    const p = (i - 1) >> 1;
    if (h[p][0] <= h[i][0]) break;
    [h[p], h[i]] = [h[i], h[p]];
    i = p;
  }
}
function heapPop(h) {
  const top = h[0],
    last = h.pop();
  if (h.length) {
    h[0] = last;
    for (let i = 0; ; ) {
      let m = i;
      for (const c of [2 * i + 1, 2 * i + 2]) if (c < h.length && h[c][0] < h[m][0]) m = c;
      if (m === i) break;
      [h[m], h[i]] = [h[i], h[m]];
      i = m;
    }
  }
  return top;
}
/** The cheapest list of edges from place a to place b that avoids the routes in `banned` (a Set of route ids), or null. */
function shortestEdges(adj, a, b, banned = new Set()) {
  if (a === b) return null;
  const best = new Map(), // state "place|route id" → cost
    prev = new Map(), // state → [previous state, edge]
    heap = [];
  const key = (place, route) => place + '|' + route;
  best.set(key(a, ''), 0);
  heapPush(heap, [0, [a, '']]);
  while (heap.length) {
    const [cost, [place, rid]] = heapPop(heap);
    if (cost > (best.get(key(place, rid)) ?? Infinity)) continue; // an outdated entry
    if (place === b) {
      const edges = [];
      for (let k = key(place, rid); prev.has(k); ) {
        const [pk, e] = prev.get(k);
        edges.unshift(e);
        k = pk;
      }
      return edges;
    }
    for (const e of adj.get(place) || []) {
      if (banned.has(e.route.id)) continue;
      const c = cost + e.km + (rid && rid !== e.route.id ? ROUTE_TRANSFER_KM : 0),
        k = key(e.to, e.route.id);
      if (c < (best.get(k) ?? Infinity)) {
        best.set(k, c);
        prev.set(k, [key(place, rid), e]);
        heapPush(heap, [c, [e.to, e.route.id]]);
      }
    }
  }
  return null;
}
/** Edges of the same route one after the other become one leg: [{ route, from, to, stops (the places passed, ends included), coords, km }]. */
function mergeLegs(edges) {
  const legs = [];
  edges.forEach((e) => {
    const l = legs[legs.length - 1];
    if (l && l.route.id === e.route.id) {
      l.to = e.to;
      l.stops.push(e.to);
      l.coords = l.coords.concat(e.coords.slice(1));
      l.km += e.km;
    } else legs.push({ route: e.route, from: e.from, to: e.to, stops: [e.from, e.to], coords: e.coords.slice(), km: e.km });
  });
  return legs;
}
/**
 * Historical paths from place a to place b over the routes: the best one and up to max-1 different ones (each found by leaving out one route of
 * the best path). Returns [{ legs, km, stops }] sorted by length; stops = every place on the way, a and b included. Empty when nothing connects them.
 * routes: the route shapes to use (the caller applies the period filter); placeAt(id) gives { lon, lat }.
 */
function findRoutePaths(routes, placeAt, a, b, max = 3) {
  const adj = routeGraph(routes, placeAt),
    first = shortestEdges(adj, a, b);
  if (!first) return [];
  const found = new Map(),
    keep = (edges) => {
      const legs = mergeLegs(edges),
        sig = legs.map((l) => l.route.id + ':' + l.from + '>' + l.to).join();
      if (!found.has(sig)) found.set(sig, { legs, km: legs.reduce((n, l) => n + l.km, 0), stops: legs.flatMap((l, i) => (i ? l.stops.slice(1) : l.stops)) });
    };
  keep(first);
  [...new Set(first.map((e) => e.route.id))].forEach((id) => {
    const alt = shortestEdges(adj, a, b, new Set([id]));
    if (alt) keep(alt);
  });
  return [...found.values()].sort((x, y) => x.km - y.km).slice(0, max);
}
/** The routes that pass through place id, sorted by name. */
const routesThrough = (routes, id) => routes.filter((s) => (s.stops || []).includes(id));
