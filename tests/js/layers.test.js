const { test, ok, eq, J } = require('./lib/harness');
const { load, UI_STANDINS } = require('./lib/ctx');
const L = (id, name, ...m) => ({ id, names: [{ lang: 'en', name }], descriptions: [], category: null, color: null, date_from: null, date_to: null, members: m.map((x) => ({ place: x })) });

function page(layers = [L('A', 'Alpha', 'p1', 'p2'), L('B', 'Beta', 'p2')], cats = []) {
  const p = load(['state.js', 'config.js', 'dates.js', 'data.js', 'datefield.js', 'layer-rules.js', 'search.js', 'searchfield.js', 'placeform.js', 'layers.js'], UI_STANDINS);
  p.X('places = __0', [{ id: 'p1', type: 'city', names: [{ lang: 'en', name: 'One' }] }, { id: 'p2', type: 'city', names: [{ lang: 'en', name: 'Two' }] }, { id: 'p3', type: 'city', names: [{ lang: 'en', name: 'Three' }] }]);
  p.X('lySet(__0, [], __1)', layers, cats);
  return p;
}
const allows = (p, id) => p.X(`layerAllows("${id}")`);

test('layers: no filter allows every place', () => {
  const p = page();
  ['p1', 'p2', 'p3'].forEach((id) => ok(allows(p, id)));
  eq(0, p.X('lyFilterCount()'));
});

test('layers: "only" keeps members of any chosen layer (OR)', () => {
  const p = page();
  p.X('lyState.only.add("A")');
  eq([true, true, false], ['p1', 'p2', 'p3'].map((id) => allows(p, id)));
  p.X('lyState.only.add("B")');
  eq([true, true, false], ['p1', 'p2', 'p3'].map((id) => allows(p, id)));
});

test('layers: "hide" removes members of every chosen layer (NOT IN)', () => {
  const p = page();
  p.X('lyState.hide.add("B")');
  eq([true, false, true], ['p1', 'p2', 'p3'].map((id) => allows(p, id)));
  p.X('lyState.hide.add("A")');
  eq([false, false, true], ['p1', 'p2', 'p3'].map((id) => allows(p, id)));
});

test('layers: only + hide together: in the chosen layers but not in the hidden ones', () => {
  const p = page();
  p.X('lyState.only.add("A"); lyState.hide.add("B")');
  eq([true, false, false], ['p1', 'p2', 'p3'].map((id) => allows(p, id)));
});

test('layers: while places are being chosen every place is shown', () => {
  const p = page();
  p.X('lyState.only.add("A"); lyState.open = "A"; lyStartEdit()');
  ok(allows(p, 'p3'));
  ok(p.X('lyState.editing === "A"'));
  p.X('lyStopEdit()');
  ok(!allows(p, 'p3'));
});

test('layers: lyToggleFilter moves a layer between only and hide, and clicking again removes it', () => {
  const p = page();
  p.X('lyToggleFilter("only","A")');
  eq([['A'], []], J(p.X('[[...lyState.only], [...lyState.hide]]')));
  p.X('lyToggleFilter("hide","A")');
  eq([[], ['A']], J(p.X('[[...lyState.only], [...lyState.hide]]')));
  p.X('lyToggleFilter("hide","A")');
  eq([[], []], J(p.X('[[...lyState.only], [...lyState.hide]]')));
  ok(p.calls.includes('update'), 'the list and the map are refreshed');
});

test('layers: lyClearFilters (Reset) empties both lists', () => {
  const p = page();
  p.X('lyState.only.add("A"); lyState.hide.add("B"); lyClearFilters()');
  eq(0, p.X('lyFilterCount()'));
});

test('layers: a layer deleted by someone else disappears from the filters and from the open sheet', () => {
  const p = page();
  p.X('lyState.only.add("A"); lyState.hide.add("B"); lyState.open = "B"');
  p.X('lySet(__0, [], [])', [L('A', 'Alpha', 'p1')]);
  eq([['A'], []], J(p.X('[[...lyState.only], [...lyState.hide]]')));
  eq(null, p.X('lyState.open'));
});

test('layers: notes are limited to the open layer or the "only" layers that contain the place', () => {
  const p = page();
  eq(null, p.X('lyScope("p1", true)'), 'general view: all notes');
  p.X('lyState.open = "A"');
  eq(['A'], J(p.X('lyScope("p1", true)')));
  eq(null, p.X('lyScope("p3", true)'), 'a place that is not in the layer shows all its notes');
  p.X('lyState.noteAll = true');
  eq(null, p.X('lyScope("p1", true)'), '"show all notes"');
  p.X('lyState.noteAll = false; lyState.open = null; lyState.only.add("B")');
  eq(['B'], J(p.X('lyScope("p2", false)')));
  eq(null, p.X('lyScope("p1", false)'));
  ok(p.X('lyNoteVisible({layers:["A"]}, ["A"])'));
  ok(!p.X('lyNoteVisible({layers:[]}, ["A"])'));
  ok(p.X('lyNoteVisible({layers:[]}, null)'));
});

test('layers: halo = colour of an "only" layer; while choosing, the members get a ring', () => {
  const colored = [{ ...L('A', 'Alpha', 'p1'), color: '#aa3344' }, L('B', 'Beta', 'p2')];
  const p = page(colored);
  eq('', p.X('lyHalo("p1")'));
  p.X('lyState.only.add("A")');
  eq('#aa3344', p.X('lyHalo("p1")'));
  eq('', p.X('lyHalo("p2")'));
  p.X('lyState.only.clear(); lyState.open = "A"; lyStartEdit()');
  eq('#aa3344', p.X('lyHalo("p1")'));
  eq('', p.X('lyHalo("p3")'));
  p.X('lyToggleMember("p3")');
  eq('#aa3344', p.X('lyHalo("p3")'));
  p.X('lyToggleMember("p1")');
  eq('', p.X('lyHalo("p1")'));
});

test('layers: lyName falls back to English, then the first name', () => {
  const p = page();
  eq('Alpha', p.X('lyName(lyById("A"), "xx")'));
  eq('Первый', p.X('lyName({names:[{lang:"ru",name:"Первый"}]}, "en")'));
});

test('layers: layer names and descriptions are escaped when drawn (no HTML injection)', () => {
  const bad = L('X', '<img src=x onerror=alert(1)>', 'p1');
  bad.descriptions = [{ lang: 'en', text: '<script>alert(1)</script>' }];
  const p = page([bad]);
  p.el('#lang').value = 'en';
  p.X('lyOpen("X")');
  const html = p.el('#lyList').innerHTML + p.el('#lyDetail').innerHTML;
  ok(html.includes('&lt;img'), 'name escaped');
  ok(!/<img|<script/i.test(html), 'no raw tag in the output: ' + html.slice(0, 200));
});

test('layers: categories list is sorted, filtered by search, and the category name is searchable', () => {
  const c = [{ id: 'c1', names: [{ lang: 'en', name: 'Military campaign' }] }];
  const l = { ...L('A', 'Alpha', 'p1'), category: 'c1' };
  const p = page([l, L('B', 'Beta')], c);
  p.el('#lang').value = 'en';
  p.el('#lyQ').value = 'military';
  p.el('#lyCat').value = '';
  p.X('lyRenderList()');
  const html = p.el('#lyList').innerHTML;
  ok(html.includes('Alpha') && !html.includes('Beta'), html);
  eq('1 of 2 layers', p.el('#lyCount').textContent);
});

test('layers: choosing places shows +added −removed and Save sends ONE request with both lists', async () => {
  const p = page(); // layer A has p1 and p2
  const sent = [];
  p.ctx.fetch = async (url, o) => {
    if (o && o.method === 'POST') {
      sent.push(J({ url, body: JSON.parse(o.body) }));
      return { ok: true, json: async () => ({ ok: true }) };
    }
    return { ok: true, json: async () => (url === '/layers' ? { layers: [L('A', 'Alpha', 'p2', 'p3')] } : url === '/lnotes' ? { notes: [] } : { categories: [] }) };
  };
  p.X('AHM_CONFIG.url.layerSave = "/save"; AHM_CONFIG.url.layers = "/layers"; AHM_CONFIG.url.layerNotesIndex = "/lnotes"; AHM_CONFIG.url.categories = "/cats"');
  p.el('#lang').value = 'en';
  p.X('lyOpen("A"); lyStartEdit(); lyToggleMember("p1"); lyToggleMember("p3")');
  eq(['p2', 'p3'].sort(), J(p.X('[...lyState.staged]')).sort());
  await p.X('lySavePlaces()');
  eq(1, sent.length, 'one request');
  eq({ url: '/save', body: { layer_members: { id: 'A', add: ['p3'], remove: ['p1'] } } }, sent[0]);
  eq(null, p.X('lyState.editing'), 'choosing is over after saving');
});

test('layers: nothing is sent when nothing changed', async () => {
  const p = page();
  const sent = [];
  p.ctx.fetch = async (url, o) => (o && o.method === 'POST' ? (sent.push(1), { ok: true, json: async () => ({}) }) : { ok: true, json: async () => ({ layers: [L('A', 'Alpha', 'p1', 'p2')], notes: [], categories: [] }) });
  p.X('AHM_CONFIG.url.layers = "/l"; AHM_CONFIG.url.layerNotesIndex = "/n"; AHM_CONFIG.url.categories = "/c"; lyState.open = "A"; lyStartEdit()');
  await p.X('lySavePlaces()');
  eq(0, sent.length);
});
