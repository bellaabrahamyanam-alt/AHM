// One map symbol per place type. Every type has its own shape AND colour,
// so a mountain, a city and a fortress can be told apart at a glance.
// The table below is only the start (and the fallback, `settlement`): once the sidebar passes the types dictionary
// (AHM.map.setTypes, contract I-8) setTypeStyles() rebuilds it, so a type an administrator adds is drawn too.
const TYPE_STYLE = {
  city: { shape: 'circle', color: '#B3261E', r: 10 },
  town: { shape: 'circle', color: '#E07B39', r: 8 },
  village: { shape: 'circle', color: '#C9A227', r: 6.5 },
  settlement: { shape: 'circle', color: '#8D6E63', r: 7.5 },
  fortress: { shape: 'square', color: '#455A64', r: 8.5 },
  temple: { shape: 'diamond', color: '#7B1FA2', r: 9 },
  tomb: { shape: 'plus', color: '#5D4037', r: 9 },
  inscription_site: { shape: 'star', color: '#F9A825', r: 10 },
  monument: { shape: 'hexagon', color: '#00796B', r: 9 },
  mountain: { shape: 'triangle', color: '#2E7D32', r: 10 },
  lake: { shape: 'drop', color: '#1976D2', r: 9 },
  river: { shape: 'bar', color: '#0288D1', r: 9 },
  region: { shape: 'ring', color: '#6A1B9A', r: 10 },
};
const poly = (g, pts) => {
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
};
const SHAPES = {
  circle: (g, r) => g.arc(0, 0, r, 0, 7),
  ring: (g, r) => g.arc(0, 0, r, 0, 7),
  square: (g, r) => g.rect(-r, -r, 2 * r, 2 * r),
  diamond: (g, r) =>
    poly(g, [
      [0, -r * 1.2],
      [r * 1.2, 0],
      [0, r * 1.2],
      [-r * 1.2, 0],
    ]),
  triangle: (g, r) =>
    poly(g, [
      [0, -r * 1.15],
      [r * 1.15, r * 0.85],
      [-r * 1.15, r * 0.85],
    ]),
  hexagon: (g, r) =>
    poly(
      g,
      [0, 1, 2, 3, 4, 5].map((i) => [r * Math.cos((i * Math.PI) / 3), r * Math.sin((i * Math.PI) / 3)])
    ),
  star: (g, r) =>
    poly(
      g,
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => {
        const a = -Math.PI / 2 + (i * Math.PI) / 5,
          d = i % 2 ? r * 0.48 : r * 1.15;
        return [d * Math.cos(a), d * Math.sin(a)];
      })
    ),
  plus: (g, r) => {
    const t = r * 0.35;
    poly(g, [
      [-t, -r],
      [t, -r],
      [t, -t],
      [r, -t],
      [r, t],
      [t, t],
      [t, r],
      [-t, r],
      [-t, t],
      [-r, t],
      [-r, -t],
      [-t, -t],
    ]);
  },
  drop: (g, r) => {
    g.moveTo(0, -r * 1.2);
    g.bezierCurveTo(r * 1.1, -r * 0.1, r, r, 0, r);
    g.bezierCurveTo(-r, r, -r * 1.1, -r * 0.1, 0, -r * 1.2);
  },
  bar: (g, r) => g.rect(-r * 1.2, -r * 0.4, r * 2.4, r * 0.8),
  pentagon: (g, r) =>
    poly(
      g,
      [0, 1, 2, 3, 4].map((i) => [r * 1.1 * Math.cos(-Math.PI / 2 + (i * 2 * Math.PI) / 5), r * 1.1 * Math.sin(-Math.PI / 2 + (i * 2 * Math.PI) / 5)])
    ),
  // for forests, groves
  tree: (g, r) =>
    poly(g, [[0, -1.2], [0.6, -0.3], [0.3, -0.3], [0.85, 0.45], [0.2, 0.45], [0.2, 1], [-0.2, 1], [-0.2, 0.45], [-0.85, 0.45], [-0.3, -0.3], [-0.6, -0.3]].map(([x, y]) => [x * r, y * r])),
  // for weapons, artefacts, battles
  sword: (g, r) =>
    poly(g, [[0, -1.25], [0.18, -0.9], [0.18, 0.35], [0.6, 0.35], [0.6, 0.6], [0.15, 0.6], [0.15, 0.95], [0.3, 0.95], [0.3, 1.2], [-0.3, 1.2], [-0.3, 0.95], [-0.15, 0.95], [-0.15, 0.6], [-0.6, 0.6], [-0.6, 0.35], [-0.18, 0.35], [-0.18, -0.9]].map(([x, y]) => [x * r, y * r])),
  // for mines, quarries
  pickaxe: (g, r) =>
    poly(g, [[-1.2, -0.5], [-0.7, -0.95], [0, -1.05], [0.7, -0.95], [1.2, -0.5], [0.75, -0.55], [0.15, -0.62], [0.15, 1.15], [-0.15, 1.15], [-0.15, -0.62], [-0.75, -0.55]].map(([x, y]) => [x * r, y * r])),
  // for battles, borders, claims
  flag: (g, r) => poly(g, [[-0.7, -1.2], [1, -0.65], [-0.4, -0.05], [-0.4, 1.2], [-0.7, 1.2]].map(([x, y]) => [x * r, y * r])),
};
/** The point symbols the map can draw, for the type editor of the sidebar (AHM.map.getSymbols). */
const SYMBOL_LABELS = {
  circle: 'Circle', ring: 'Ring', square: 'Square', diamond: 'Diamond', triangle: 'Triangle', hexagon: 'Hexagon',
  pentagon: 'Pentagon', star: 'Star', plus: 'Cross', drop: 'Drop', bar: 'Bar', tree: 'Tree', sword: 'Sword', pickaxe: 'Pickaxe', flag: 'Flag',
};
const getSymbolList = () => Object.keys(SYMBOL_LABELS).map((name) => ({ name, label: SYMBOL_LABELS[name] }));
/** Rebuilds TYPE_STYLE from the point types of the dictionary. An unknown symbol is drawn as a circle; `settlement` stays the fallback. */
function setTypeStyles(list) {
  const fallback = TYPE_STYLE.settlement;
  Object.keys(TYPE_STYLE).forEach((k) => delete TYPE_STYLE[k]);
  (list || [])
    .filter((t) => t.geometry === 'point')
    .forEach((t) => {
      const st = t.style || {};
      TYPE_STYLE[t.code] = {
        shape: SHAPES[st.symbol] ? st.symbol : 'circle',
        color: /^#[0-9a-fA-F]{6}$/.test(t.color) ? t.color : fallback.color,
        r: typeof st.size === 'number' && st.size >= 4 && st.size <= 14 ? st.size : fallback.r,
        ...(st.symbol === 'custom' && validPath(st.path) ? { path: st.path, box: validBox(st.box) ? st.box : 24 } : {}),
      };
    });
  if (!TYPE_STYLE.settlement) TYPE_STYLE.settlement = fallback;
  Object.keys(iconCache).forEach((k) => delete iconCache[k]);
}

/** A custom symbol is an SVG path (`d`) drawn in a square box (default 24) whose corner is 0,0; the same rule as the server. */
const PATH_RE = /^[MmLlHhVvCcSsQqTtAaZz0-9eE.,+\-\s]{2,4000}$/;
const validPath = (d) => typeof d === 'string' && PATH_RE.test(d) && /^\s*[Mm]/.test(d);
const validBox = (b) => typeof b === 'number' && b >= 8 && b <= 2048;
/** Path2D of a custom symbol scaled to about 2.3 radii and centred; null when the browser has no Path2D (the symbol is then a circle). */
function customPath(st, r) {
  if (!st.path || typeof Path2D === 'undefined' || typeof DOMMatrix === 'undefined') return null;
  const k = (r * 2.3) / st.box,
    p = new Path2D();
  p.addPath(new Path2D(st.path), new DOMMatrix([k, 0, 0, k, (-st.box / 2) * k, (-st.box / 2) * k]));
  return p;
}
/** The style of a type code, or of a draft `{ symbol, color, size }` (the preview in the type editor). Unknown codes fall back to `settlement`. */
const styleOf = (t) =>
  t && typeof t === 'object'
    ? {
        shape: SHAPES[t.symbol] ? t.symbol : 'circle',
        color: /^#[0-9a-fA-F]{6}$/.test(t.color) ? t.color : '#8D6E63',
        r: t.size >= 4 && t.size <= 14 ? t.size : 8,
        ...(t.symbol === 'custom' && validPath(t.path) ? { path: t.path, box: validBox(t.box) ? t.box : 24 } : {}),
      }
    : TYPE_STYLE[t] || TYPE_STYLE.settlement;
/** Draws the symbol of a type on a canvas of px × px logical pixels (ratio = device pixels per logical pixel). */
function iconCanvas(type, px, ratio) {
  const st = styleOf(type),
    f = px / 28,
    c = document.createElement('canvas');
  c.width = c.height = Math.round(px * ratio);
  const g = c.getContext('2d');
  g.scale(ratio, ratio);
  g.translate(px / 2, px / 2);
  g.lineJoin = 'round';
  g.beginPath();
  const P = customPath(st, st.r * f),
    stroke = () => (P ? g.stroke(P) : g.stroke()),
    fill = () => (P ? g.fill(P) : g.fill());
  SHAPES[st.shape](g, st.r * f);
  if (st.shape === 'ring') {
    g.lineWidth = 6 * f;
    g.strokeStyle = '#fff';
    stroke();
    g.lineWidth = 3 * f;
    g.strokeStyle = st.color;
    stroke();
  } else {
    g.lineWidth = 3.2 * f;
    g.strokeStyle = '#fff';
    stroke();
    g.fillStyle = st.color;
    fill();
    g.lineWidth = f;
    g.strokeStyle = 'rgba(0,0,0,.35)';
    stroke();
  }
  return c;
}
/** The same symbol with a thick white border that follows its shape (hover and selected look); a hair-line dark edge keeps it visible on pale maps. */
function iconCanvasHl(type, px, ratio) {
  const st = styleOf(type),
    c = document.createElement('canvas');
  c.width = c.height = Math.round(px * ratio);
  const g = c.getContext('2d');
  g.scale(ratio, ratio);
  g.translate(px / 2, px / 2);
  g.lineJoin = 'round';
  g.beginPath();
  const P = customPath(st, st.r),
    stroke = () => (P ? g.stroke(P) : g.stroke()),
    fill = () => (P ? g.fill(P) : g.fill());
  SHAPES[st.shape](g, st.r);
  if (st.shape === 'ring') {
    g.lineWidth = 10;
    g.strokeStyle = 'rgba(0,0,0,.35)';
    stroke();
    g.lineWidth = 8.4;
    g.strokeStyle = '#fff';
    stroke();
    g.lineWidth = 3;
    g.strokeStyle = st.color;
    stroke();
  } else {
    g.lineWidth = 8;
    g.strokeStyle = 'rgba(0,0,0,.35)';
    stroke();
    g.lineWidth = 6.4;
    g.strokeStyle = '#fff';
    stroke();
    g.fillStyle = st.color;
    fill();
  }
  return c;
}
/** Adds one image per type to the map: 'ahm-type-city', 'ahm-type-mountain', ... and 'ahm-type-city-hl', ... (with the white border) */
function registerTypeIcons(map) {
  const put = (name, c) => {
    if (map.hasImage && map.hasImage(name)) map.removeImage(name); // a type that was changed is drawn again
    map.addImage(name, c.getContext('2d').getImageData(0, 0, c.width, c.height), { pixelRatio: 2 });
  };
  Object.keys(TYPE_STYLE).forEach((t) => {
    put('ahm-type-' + t, iconCanvas(t, 28, 2));
    put('ahm-type-' + t + '-hl', iconCanvasHl(t, 40, 2));
  });
}
// Small <img> of a type symbol for lists, chips and badges.
const iconCache = {};
const typeIcon = (t) =>
  `<img class="ti" alt="" src="${typeof t === 'object' && t ? iconCanvas(t, 16, 2).toDataURL() : iconCache[t] || (iconCache[t] = iconCanvas(t, 16, 2).toDataURL())}">`;
