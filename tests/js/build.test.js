// Production bundle (T-005, tools/build.js): app/dist is committed, so it must match the sources, keep every global name
// (the scripts share one global scope) and be served by the controller. It needs no Bun: the build itself is not run here.
const { test, ok, eq } = require('./lib/harness');
const fs = require('fs');
const path = require('path');
const b = require('../../tools/build');
const ROOT = path.join(__dirname, '..', '..');
const dist = (f) => fs.readFileSync(path.join(b.DIST, f), 'utf8');

test('build: index.html marks the scripts and styles to bundle (the page loads the same files in dev)', () => {
  const s = b.sources();
  ok(s.js.length >= 20, 'found the scripts: ' + s.js.join(','));
  ok(s.js[0] === 'js/config.js' && s.js.at(-1) === 'js/features.js', 'first config.js, last features.js: ' + s.js[0] + ' ' + s.js.at(-1));
  eq(['css/base.css', 'css/sidebar.css', 'css/map.css', 'css/shapes.css'], s.css);
  const html = fs.readFileSync(path.join(ROOT, 'app', 'index.html'), 'utf8');
  const all = [...html.matchAll(/<script src="(js\/[^"]+)"/g)].map((m) => m[1]);
  eq(all, s.js); // no local script outside the marked block: it would be missing from the bundle
});

test('build: app/dist is built from the current sources (run `bun tools/build.js` and commit app/dist/)', () => {
  ok(!b.stale(), 'app/dist is stale');
});

test('build: the minified script parses and keeps every top-level name of the sources', () => {
  const min = dist('app.min.js');
  new Function(min); // syntax check
  const src = b.joinJs(b.sources().js);
  const names = new Set();
  for (const m of src.matchAll(/^(?:async\s+)?(?:function\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
  ok(names.size > 100, 'found the top-level names: ' + names.size);
  const lost = [...names].filter((n) => !new RegExp('(?<![\\w$])' + n.replace(/\$/g, '\\$') + '(?![\\w$])').test(min));
  eq([], lost);
  ok(min.length < src.length * 0.8, 'the bundle is smaller than the sources');
});

test('build: the minified style keeps every custom property and class name of the sources', () => {
  const min = dist('app.min.css');
  const src = b.joinCss(b.sources().css).replace(/\/\*[\s\S]*?\*\//g, ''); // comments are removed on purpose
  const props = new Set([...src.matchAll(/--[a-z][\w-]*/g)].map((m) => m[0]));
  const classes = new Set([...src.matchAll(/\.([a-z][\w-]*)\s*[{,:.>\s[]/g)].map((m) => m[1]));
  ok(props.size > 10 && classes.size > 20, `found ${props.size} properties, ${classes.size} classes`);
  eq([], [...props].filter((p) => !min.includes(p)));
  eq([], [...classes].filter((c) => !min.includes('.' + c)));
  ok(min.length < src.length, 'the style is smaller than the sources');
});

test('build: the manifest lists the files and sizes of the bundle', () => {
  const m = JSON.parse(dist('manifest.json'));
  eq(b.sources().js, m.js);
  eq(b.sources().css, m.css);
  eq(Buffer.byteLength(dist('app.min.js')), m.bytes['app.min.js']);
  eq(Buffer.byteLength(dist('app.min.css')), m.bytes['app.min.css']);
  ok(/^[0-9a-f]{64}$/.test(m.hash), 'hash is sha256');
});
