// Contract tests for the interfaces in INTERFACES.md. A domain that breaks one fixes its own code, never this test (shared domain).
const { test, ok, eq } = require('./lib/harness');
const fs = require('fs');
const path = require('path');
const { ROOT, load } = require('./lib/ctx');

const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');
const jsFiles = (d) => fs.readdirSync(path.join(ROOT, 'app', 'js', d)).filter((f) => f.endsWith('.js')).map((f) => read('app', 'js', d, f));
const names = (src, re) => [...src.matchAll(re)].map((m) => m[1]);
const uniq = (a) => [...new Set(a)].sort();

// ---- I-1 data <-> front end ----
const READ = ['places', 'notesIndex', 'note', 'languages', 'overlays', 'overlayImage', 'layers', 'layerNotesIndex', 'categories'];
const WRITE = ['save', 'languageSave', 'overlaySave', 'overlayUpload', 'overlayDelete', 'layerSave', 'layerDelete', 'categorySave'];

test('contract I-1: config.js offers exactly the endpoint names of INTERFACES.md, in development and in the forum', () => {
  const p = load(['config.js']);
  eq(uniq([...READ, ...WRITE]), uniq(Object.keys(p.X('AHM_CONFIG.url'))), 'development URLs');
  const src = read('app', 'js', 'config.js');
  const forum = src.slice(src.indexOf('window.AHM_BACKEND\n    ? {'), src.indexOf('    : {'));
  eq(uniq([...READ, ...WRITE]), uniq(names(forum, /^\s{8}(\w+):/gm)), 'forum URLs');
});

test('contract I-1: the forum controller hands out every endpoint name, and the dev server knows every write endpoint', async () => {
  const php = read('controller', 'main.php');
  for (const k of [...READ, ...WRITE]) ok(php.includes(`'${k}' =>`), 'controller/main.php lacks the key ' + k);
  const S = await require('./lib/devserver').start();
  try {
    for (const url of ['/api/save', '/api/language/save', '/api/overlay/save', '/api/overlay/delete', '/api/layer/save', '/api/layer/delete', '/api/category/save']) {
      const r = await fetch(S.base + url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      ok(r.status === 400 || r.status === 403, `${url} answered ${r.status}; an empty request must be refused with 400 (or 403), not 404 or 500`);
      const j = await r.json().catch(() => null);
      ok(j && typeof j.error === 'string', `${url}: the error is {"error": "..."}`);
    }
    for (const f of ['places.geojson', 'languages.json', 'overlays.json', 'layers.json', 'categories.json', 'notes/index.json', 'layer-notes/index.json']) {
      const r = await fetch(S.base + '/data/' + f);
      ok(r.status === 200 && JSON.parse(await r.text()), 'data/' + f + ' is readable JSON');
    }
  } finally {
    await S.stop();
  }
});

// ---- I-2 sidebar <-> map ----
const MAP_COMMANDS = ['editPin', 'fitRoute', 'fitTo', 'focusPlace', 'focusPoint', 'getZoom', 'hidePlace', 'resize', 'setFeatures', 'setPick', 'setRoute', 'setRouteMarkers'];
const MAP_EVENTS = ['map:click', 'map:ready', 'map:show-controls', 'place:click', 'place:dblclick'];
const SIDEBAR_EVENTS = ['sidebar:resized'];

test('contract I-2: AHM.map has exactly the commands of INTERFACES.md', () => {
  const p = load(['typeicons.js', 'map.js']);
  eq(MAP_COMMANDS, Object.keys(p.X('AHM.map')).sort());
  for (const k of MAP_COMMANDS) ok(typeof p.X('AHM.map.' + k) === 'function', k + ' is a function');
});

test('contract I-2: the events emitted and handled match the lists, and each side uses only the interface', () => {
  const map = jsFiles('map').join('\n'),
    side = jsFiles('sidebar').join('\n');
  const emit = (s) => uniq(names(s, /AHM\.emit\(\s*["']([^"']+)["']/g)),
    on = (s) => uniq(names(s, /AHM\.on\(\s*["']([^"']+)["']/g));
  eq(MAP_EVENTS, emit(map), 'events emitted by the map');
  eq(SIDEBAR_EVENTS, emit(side), 'events emitted by the sidebar');
  eq(MAP_EVENTS.filter((e) => e !== 'map:ready'), on(side), 'events handled by the sidebar (map:ready needs no handler: features are queued)');
  eq(SIDEBAR_EVENTS, on(map), 'events handled by the map');
  const used = uniq(names(side, /AHM\.map\.(\w+)/g));
  ok(used.every((k) => MAP_COMMANDS.includes(k)), 'the sidebar calls an AHM.map command that is not in INTERFACES.md: ' + used.filter((k) => !MAP_COMMANDS.includes(k)));
  const props = uniq(names(map + side, /\bAHM\.(\w+)/g));
  eq(['emit', 'map', 'on'], props, 'only AHM.map, AHM.on and AHM.emit are used outside ahm.js');
});

// ---- I-3 core functions ----
const CORE = [
  'isoToSec', 'secToIso', 'dateToTs', 'dateFromTs', 'dateClean', 'dateUpgrade', 'dateBounds', 'spanBounds', 'dateKey', 'dateOrderCheck', 'dateText', 'spanText',
  'periodEndSec', 'datePeriodEnd', 'legacyToDate', 'getJSON', 'loadPlaces', 'loadNotesIndex', 'loadNoteBody', 'loadLayers', 'loadLayerNotes', 'loadCategories',
  'loadLanguages', 'esc', 'norm', 'label', 'langName', 'run', 'byDateKey', 'periodActive', 'layerAllows', 'lyScope', 'lyHalo', 'lyNoteVisible',
];

test('contract I-3: the core functions of INTERFACES.md exist with the same names', () => {
  const p = load(['state.js', 'config.js', 'dates.js', 'data.js', 'datefield.js', 'layer-rules.js', 'search.js', 'searchfield.js', 'period.js']);
  for (const k of CORE) ok(typeof p.X(k) === 'function', k + ' is missing from the core (or sidebar/period.js for periodActive)');
  ok(p.X('DATE_FORMATS') !== undefined, 'DATE_FORMATS');
});

test('contract I-4: typeIcon(type) and TYPE_STYLE exist (the symbols are drawn by the map domain, used by the sidebar)', () => {
  const p = load(['config.js', 'data.js', 'typeicons.js']);
  ok(typeof p.X('typeIcon') === 'function', 'typeIcon');
  ok(p.X('TYPE_STYLE.settlement') !== undefined, 'TYPE_STYLE.settlement');
});
