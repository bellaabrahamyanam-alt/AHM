// One map symbol per place type. Every type has its own shape AND colour,
// so a mountain, a city and a fortress can be told apart at a glance.
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
};

/** Draws the symbol of a type on a canvas of px × px logical pixels (ratio = device pixels per logical pixel). */
function iconCanvas(type, px, ratio) {
  const st = TYPE_STYLE[type] || TYPE_STYLE.settlement,
    f = px / 28,
    c = document.createElement('canvas');
  c.width = c.height = Math.round(px * ratio);
  const g = c.getContext('2d');
  g.scale(ratio, ratio);
  g.translate(px / 2, px / 2);
  g.lineJoin = 'round';
  g.beginPath();
  SHAPES[st.shape](g, st.r * f);
  if (st.shape === 'ring') {
    g.lineWidth = 6 * f;
    g.strokeStyle = '#fff';
    g.stroke();
    g.lineWidth = 3 * f;
    g.strokeStyle = st.color;
    g.stroke();
  } else {
    g.lineWidth = 3.2 * f;
    g.strokeStyle = '#fff';
    g.stroke();
    g.fillStyle = st.color;
    g.fill();
    g.lineWidth = f;
    g.strokeStyle = 'rgba(0,0,0,.35)';
    g.stroke();
  }
  return c;
}
/** The same symbol with a thick white border that follows its shape (hover and selected look); a hair-line dark edge keeps it visible on pale maps. */
function iconCanvasHl(type, px, ratio) {
  const st = TYPE_STYLE[type] || TYPE_STYLE.settlement,
    c = document.createElement('canvas');
  c.width = c.height = Math.round(px * ratio);
  const g = c.getContext('2d');
  g.scale(ratio, ratio);
  g.translate(px / 2, px / 2);
  g.lineJoin = 'round';
  g.beginPath();
  SHAPES[st.shape](g, st.r);
  if (st.shape === 'ring') {
    g.lineWidth = 10;
    g.strokeStyle = 'rgba(0,0,0,.35)';
    g.stroke();
    g.lineWidth = 8.4;
    g.strokeStyle = '#fff';
    g.stroke();
    g.lineWidth = 3;
    g.strokeStyle = st.color;
    g.stroke();
  } else {
    g.lineWidth = 8;
    g.strokeStyle = 'rgba(0,0,0,.35)';
    g.stroke();
    g.lineWidth = 6.4;
    g.strokeStyle = '#fff';
    g.stroke();
    g.fillStyle = st.color;
    g.fill();
  }
  return c;
}
/** Adds one image per type to the map: 'ahm-type-city', 'ahm-type-mountain', ... and 'ahm-type-city-hl', ... (with the white border) */
function registerTypeIcons(map) {
  Object.keys(TYPE_STYLE).forEach((t) => {
    const c = iconCanvas(t, 28, 2);
    map.addImage('ahm-type-' + t, c.getContext('2d').getImageData(0, 0, c.width, c.height), { pixelRatio: 2 });
    const h = iconCanvasHl(t, 40, 2);
    map.addImage('ahm-type-' + t + '-hl', h.getContext('2d').getImageData(0, 0, h.width, h.height), { pixelRatio: 2 });
  });
}
// Small <img> of a type symbol for lists, chips and badges.
const iconCache = {};
const typeIcon = (t) =>
  `<img class="ti" alt="" src="${iconCache[t] || (iconCache[t] = iconCanvas(t, 16, 2).toDataURL())}">`;
