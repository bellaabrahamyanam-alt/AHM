// Tests of the sidebar domain (DOMAINS.md; owner: sidebar). Placeholder, comments only, so that the file exists
// (tests/js/domains.test.js requires every registered file to exist). `sidebar-tdd: task 007` fills it
// (tasks/007-sidebar-fixes.md); tasks 012 and 014 add to it.

const { test, ok } = require('./lib/harness');
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
