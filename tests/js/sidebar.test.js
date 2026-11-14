// Tests of the sidebar domain (DOMAINS.md; owner: sidebar). Placeholder, comments only, so that the file exists
// (tests/js/domains.test.js requires every registered file to exist). `sidebar-tdd: task 007` fills it
// (tasks/007-sidebar-fixes.md); tasks 012 and 014 add to it.

const { test, ok, eq, J } = require('./lib/harness');
const { load } = require('./lib/ctx');

// ---- types dictionary (INTERFACES.md I-8) ----
const TYPES_DICT = [
  { code: 'city', geometry: 'point', names: [{ lang: 'en', name: 'City' }, { lang: 'ru', name: 'Город' }], color: '#b3261e', style: { symbol: 'circle', size: 10 } },
  { code: 'iron-mine', geometry: 'point', names: [{ lang: 'ru', name: 'Рудник' }, { lang: 'hy', name: 'Հանք' }], color: '#a0522d', style: { symbol: 'pickaxe', size: 9 } },
  { code: 'odd', geometry: 'point', names: [{ lang: 'en', name: 'Odd' }], color: 'red', style: { symbol: 'no-such-symbol', size: 99 } },
  { code: 'border', geometry: 'line', names: [{ lang: 'en', name: 'Border' }], color: '#000000', style: {} },
];

test('types: the place form offers the point types of the dictionary, sorted by name, keeps an unknown current type', () => {
  const p = load(['config.js', 'data.js', 'placeform.js']);
  p.X('types = __0', TYPES_DICT);
  const h = p.X('typeOptions("iron-mine", "en")');
  ok(h.includes('<option value="iron-mine" selected>'), 'current is selected');
  ok(!h.includes('border'), 'no line types');
  ok(h.indexOf('value="city"') < h.indexOf('value="odd"'), 'sorted by name');
  ok(p.X('typeOptions("gone", "en")').includes('value="gone" selected'), 'a type not in the dictionary stays visible');
});

test('types: svgToPath joins the shapes of an SVG file into one path and takes the box from the viewBox', () => {
  const p = load(['config.js', 'data.js', 'placeform.js']);
  const r = (svg) => J(p.X('svgToPath(__0)', svg));
  eq({ path: 'M256 10L500 500H10z', box: 512 }, r('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M256 10L500 500H10z"/></svg>'));
  eq({ path: 'M2 3H12V9H2Z', box: 24 }, r('<svg width="24" height="24"><rect x="2" y="3" width="10" height="6"/></svg>'), 'rectangle');
  eq('M2 5A3 3 0 1 0 8 5A3 3 0 1 0 2 5Z', r('<svg viewBox="0 0 24 24"><circle cx="5" cy="5" r="3"/></svg>').path, 'circle');
  eq('M0 0L10 0L5 8Z', r("<svg><polygon points='0,0 10,0 5,8'/></svg>").path, 'polygon');
  eq('M0 0L1 1 M5 5L6 6', r('<svg><path d="M0 0L1 1"/><path fill="red" d="M5 5L6 6"/></svg>').path, 'paths joined');
  eq({ path: '', box: 24 }, r('<svg><text>hi</text><image href="x.png"/></svg>'), 'nothing drawable');
  eq(24, r('<svg viewBox="0 0 3000 3000"><path d="M0 0L1 1"/></svg>').box, 'a box outside 8..2048 becomes 24');
});
