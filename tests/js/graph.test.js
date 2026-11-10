// Code graph (tools/make-graph.js, proposal 011): one line per file, flags, size limits, the same text every time, graph/ up to date.
const { test, ok, eq } = require('./lib/harness');
const path = require('path');
const { execFileSync } = require('child_process');
const mg = require('../../tools/make-graph');
const TOOL = path.join(__dirname, '..', '..', 'tools', 'make-graph.js');

const DOMAINS = ['sidebar', 'core', 'data', 'shared'];
const owner = (p) => (p.startsWith('app/js/sidebar/') ? 'sidebar' : p.startsWith('app/js/core/') ? 'core' : p.startsWith('service/') ? 'data' : 'shared');
const FILES = {
  'app/js/core/dates.js': 'function formatDate(x) { return x; }\n',
  'app/js/core/dup.js': 'function showPanel() {}\n',
  'app/js/sidebar/ui.js': "function showPanel() { AHM.map.focusPlace(1); formatDate(2); }\nAHM.on('place:click', () => {});\nAHM.emit('sidebar:resized');\n",
  'app/js/sidebar/long.js': 'function big() {}\n' + '// x\n'.repeat(600),
  'service/store.php': '<?php\nclass Store {\n  public function save() {}\n}\n',
};
const make = (files = FILES, opts = {}) => mg.build(files, owner, { domains: DOMAINS, ...opts });

test('graph: one file per domain and INDEX.md; a line per file with names, AHM calls, events and users', () => {
  const g = make();
  eq(['graph/INDEX.md', 'graph/core.md', 'graph/data.md', 'graph/shared.md', 'graph/sidebar.md'], Object.keys(g.files).sort());
  eq([], g.problems);
  ok(/dates\.js` 1 lines\. defines: formatDate\. used by: sidebar:app\/js\/sidebar\/ui\.js/.test(g.files['graph/core.md']), g.files['graph/core.md']);
  const side = g.files['graph/sidebar.md'];
  ok(side.includes('AHM calls: map.focusPlace'), side);
  ok(side.includes('emits: sidebar:resized') && side.includes('listens: place:click'), side);
  ok(g.files['graph/data.md'].includes('defines: Store, save'), g.files['graph/data.md']);
});

test('graph: INDEX.md flags a long file, a name defined twice and a cross-domain use', () => {
  const idx = make().files['graph/INDEX.md'];
  ok(idx.includes('`app/js/sidebar/long.js` has 601 lines'), idx);
  ok(idx.includes('`showPanel` is defined in app/js/core/dup.js, app/js/sidebar/ui.js'), idx);
  ok(idx.includes('sidebar -> core: 1 name (formatDate)'), idx);
  const calm = make({ 'app/js/core/dates.js': FILES['app/js/core/dates.js'] }).files['graph/INDEX.md'];
  ok(!calm.includes('has ') && !calm.includes('defined in') && !calm.includes('->'), calm);
});

test('graph: the same files give the same text, in any order', () => {
  const back = {};
  for (const k of Object.keys(FILES).reverse()) back[k] = FILES[k];
  eq(make().files, make(back).files);
});

test('graph: over the size limit the tool reports the file; within it nothing', () => {
  eq([], make().problems);
  const bad = make(FILES, { limits: { domain: 100, index: 100 } }).problems;
  ok(bad.some((p) => p.startsWith('graph/sidebar.md is ')), bad.join(' | '));
  ok(bad.some((p) => p.startsWith('graph/INDEX.md is ')), bad.join(' | '));
});

test('graph: a one-line change of a listed file makes the graph stale, rebuilding makes it fresh', () => {
  const before = make().files;
  eq([], mg.stale(before, before));
  const after = make({ ...FILES, 'app/js/core/dates.js': FILES['app/js/core/dates.js'] + 'function newOne() {}\n' }).files;
  ok(mg.stale(after, before).includes('graph/core.md'), 'stale after the change');
  eq([], mg.stale(after, after));
  ok(mg.stale(before, { ...before, 'graph/gone.md': 'x' }).includes('graph/gone.md'), 'a file of a removed domain is stale');
});

test('graph: graph/ is up to date (run: node tools/make-graph.js)', () => {
  let rc = 0;
  try {
    execFileSync('node', [TOOL, '--check'], { stdio: 'pipe' });
  } catch (e) {
    rc = e.status;
    console.log('    ' + String(e.stderr).trim());
  }
  eq(0, rc);
});
