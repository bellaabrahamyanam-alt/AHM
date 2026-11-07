// Optional features (INTERFACES.md I-5, DOMAINS.md "Features"): the flag, the loader, and the isolation rules every feature folder
// app/features/<name>/ must obey. Shared domain: a feature that breaks one fixes its own code, never this test.
const { test, ok, eq } = require('./lib/harness');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { ROOT } = require('./lib/ctx');
const cd = require('../../tools/check-domain');

const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');
const FEATURES = path.join(ROOT, 'app', 'features');
const names = fs.existsSync(FEATURES) ? fs.readdirSync(FEATURES, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name) : [];
const PAGE = 'http://forum.test/ext/ahm/map/app/js/features.js';

/** A page with just enough DOM for js/features.js. `search` and `backend` choose the configuration like the real config.js does. */
function page({ features, scriptSrc = PAGE }) {
  const head = [];
  const listeners = {};
  const sandbox = {
    console: { error() {}, warn() {}, log() {} },
    AHM_CONFIG: { features },
    document: {
      currentScript: scriptSrc ? { src: scriptSrc } : null,
      readyState: 'complete',
      head: { appendChild: (e) => head.push(e) },
      createElement: (tag) => ({ tag, remove() { this.removed = true; } }),
      addEventListener: (n, f) => (listeners[n] = f),
    },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read('app', 'js', 'ahm.js'), sandbox);
  vm.runInContext('globalThis.AHM = AHM;', sandbox);
  vm.runInContext(read('app', 'js', 'features.js'), sandbox);
  return { AHM: sandbox.AHM, head, sandbox };
}

test('features: the flag — hidden in the forum unless the controller sends it; in development a list, the URL can change it', () => {
  const cfg = (backend, search) => {
    const sb = { window: null, location: { search }, AHM_BACKEND: undefined };
    sb.window = sb;
    if (backend) sb.AHM_BACKEND = backend;
    vm.createContext(sb);
    vm.runInContext(read('app', 'js', 'config.js') + '\nglobalThis.__f = AHM_CONFIG.features;', sb);
    return sb.__f;
  };
  eq(['campaigns'], cfg(null, ''), 'development default');
  eq([], cfg(null, '?features='), '?features= switches all off');
  eq(['a', 'b'], cfg(null, '?x=1&features=a,b'), '?features=a,b');
  eq([], cfg({}, ''), 'forum: the controller sends nothing, so nothing is loaded');
  eq([], cfg({}, '?features=campaigns'), 'forum: the URL cannot switch a feature on');
  eq(['campaigns'], cfg({ features: ['campaigns'] }, ''), 'forum: only what the controller sends');
});

test('features: nothing is loaded when no feature is switched on, and bad names are ignored', () => {
  eq(0, page({ features: [] }).head.length);
  eq(0, page({ features: undefined }).head.length);
  eq(0, page({ features: ['../evil', 'A b', 5, ''] }).head.length, 'only [a-z][a-z0-9-]* names');
});

test('features: a switched-on feature loads main.js and style.css from app/features/<name>/ next to the loader', () => {
  const p = page({ features: ['campaigns'] });
  eq(['link', 'script'], p.head.map((e) => e.tag));
  eq('http://forum.test/ext/ahm/map/app/features/campaigns/style.css', p.head[0].href);
  eq('http://forum.test/ext/ahm/map/app/features/campaigns/main.js', p.head[1].src);
  eq(false, p.head[1].async, 'scripts keep their order');
  p.head[0].onerror();
  ok(p.head[0].removed, 'a missing stylesheet is dropped quietly');
});

test('features: init runs after main.js loaded; a failing or missing feature never breaks the app', () => {
  const p = page({ features: ['campaigns', 'broken'] });
  const calls = [];
  p.AHM.features.register('campaigns', (c) => calls.push(c));
  p.AHM.features.register('broken', () => {
    throw new Error('boom');
  });
  p.AHM.features.register('other', () => calls.push('other'));
  const scripts = p.head.filter((e) => e.tag === 'script');
  scripts[0].onload();
  scripts[1].onload(); // throws inside init: logged, not thrown
  scripts[1].onerror();
  eq([{ name: 'campaigns', base: 'http://forum.test/ext/ahm/map/app/features/campaigns/' }], calls, 'init gets name and base; "other" is not switched on, so never runs');
  ok(p.AHM.features.enabled('campaigns') && !p.AHM.features.enabled('other'));
  const q = page({ features: ['campaigns'] });
  q.head.filter((e) => e.tag === 'script')[0].onload(); // main.js did not register: a warning only
});

test('features: onMapReady runs at once when the map is ready, otherwise at map:ready; a throwing callback is contained', () => {
  const p = page({ features: [] });
  const seen = [];
  p.AHM.features.onMapReady(() => seen.push('early'));
  p.AHM.features.onMapReady(() => {
    throw new Error('x');
  });
  eq([], seen);
  p.AHM.emit('map:ready');
  eq(['early'], seen);
  p.AHM.features.onMapReady(() => seen.push('late'));
  eq(['early', 'late'], seen);
});

test('features: with no script address the loader still works (relative base)', () => {
  const p = page({ features: ['campaigns'], scriptSrc: null });
  eq('features/campaigns/main.js', p.head[1].src);
});

// ---- the isolation rules, for every folder in app/features/ ----
test('features: each feature folder belongs to a domain of the same name, has main.js, and is the only place that mentions it', () => {
  const bad = [];
  const walk = (dir, out = []) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules') continue;
      const p = path.join(dir, e.name);
      e.isDirectory() ? walk(p, out) : out.push(p);
    }
    return out;
  };
  const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
  for (const n of names) {
    if (!cd.DOMAINS.includes(n)) bad.push(`app/features/${n}: no domain "${n}" in tools/domains.json`);
    if (!fs.existsSync(path.join(FEATURES, n, 'main.js'))) bad.push(`app/features/${n}/main.js is missing`);
    for (const f of walk(ROOT)) {
      if (!/\.(js|css|html|php|json|yml|md)$/.test(f)) continue;
      const owner = cd.ownerOf(rel(f));
      if (owner === n || owner === 'shared' || owner === 'ignored') continue;
      // the feature's id as a name (quoted, or as its folder): the plain English word in sample data is fine
      if (new RegExp(`['"\`]${n}['"\`]|features/${n}\\b`).test(fs.readFileSync(f, 'utf8'))) bad.push(`${rel(f)} (${owner}) mentions the feature "${n}"; only its own domain and shared files may`);
    }
  }
  ok(bad.length === 0, '\n    ' + bad.join('\n    '));
});

test('features: a feature declares no top-level names and uses only AHM.features / AHM.on / AHM.emit / AHM.map commands', async () => {
  let ESLint;
  for (const p of ['eslint', '/opt/node22/lib/node_modules/eslint']) {
    try {
      ({ ESLint } = require(p));
      break;
    } catch (e) {
      /* next */
    }
  }
  if (!ESLint) return console.log('    (eslint not installed: skipped)');
  const MAP = ['editPin', 'fitRoute', 'fitTo', 'focusPlace', 'focusPoint', 'getZoom', 'hidePlace', 'resize', 'setFeatures', 'setPick', 'setRoute', 'setRouteMarkers'];
  const bad = [];
  for (const n of names) {
    const dir = path.join(FEATURES, n);
    const files = fs.readdirSync(dir, { recursive: true }).filter((f) => f.endsWith('.js'));
    for (const f of files) {
      const code = fs.readFileSync(path.join(dir, f), 'utf8');
      const out = {};
      const plugin = { rules: { scan: { create: (c) => ({ 'Program:exit'(node) { const s = c.sourceCode.getScope(node); out.declared = s.variables.filter((v) => v.defs.length).map((v) => v.name); out.used = [...new Set(s.through.map((r) => r.identifier.name))]; } }) } } };
      const e = new ESLint({ overrideConfigFile: true, overrideConfig: [{ files: ['**/*.js'], plugins: { ahm: plugin }, languageOptions: { ecmaVersion: 2022, sourceType: 'script' }, rules: { 'ahm/scan': 'error' } }] });
      await e.lintText(code, { filePath: path.join(dir, f) });
      if (out.declared.length) bad.push(`${n}/${f} declares top-level names (wrap the file in a function): ${out.declared.join(', ')}`);
      for (const m of code.matchAll(/\bAHM\.(\w+)/g)) if (!['features', 'on', 'emit', 'map'].includes(m[1])) bad.push(`${n}/${f} uses AHM.${m[1]}, which is not an interface`);
      for (const m of code.matchAll(/\bAHM\.map\.(\w+)/g)) if (!MAP.includes(m[1])) bad.push(`${n}/${f} uses AHM.map.${m[1]}, which is not in INTERFACES.md`);
      for (const m of code.matchAll(/\bAHM\.emit\(\s*['"]([^'"]+)['"]/g)) if (!m[1].startsWith(n + ':')) bad.push(`${n}/${f} emits "${m[1]}"; its events must be named "${n}:..."`);
      for (const g of ['maplibregl', 'AHM_CONFIG', 'AHM_BACKEND', 'lyState', 'state']) if (out.used.includes(g)) bad.push(`${n}/${f} uses the global "${g}" of another domain`);
    }
  }
  ok(bad.length === 0, '\n    ' + bad.join('\n    '));
});

test('features: a feature stylesheet styles only its own names (.<name>- or #<name>-), never tags, :root, body or the app', () => {
  const bad = [];
  for (const n of names) {
    const file = path.join(FEATURES, n, 'style.css');
    if (!fs.existsSync(file)) continue;
    let css = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    css = css.replace(/@(?:-\w+-)?keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '').replace(/@font-face\s*\{[^}]*\}/g, '');
    for (const m of css.matchAll(/([^{}]+)\{/g)) {
      const prelude = m[1].trim();
      if (!prelude || prelude.startsWith('@')) continue;
      for (const sel of prelude.split(',')) {
        const s = sel.trim();
        if (!new RegExp(`^[.#]${n}-`).test(s)) bad.push(`${n}/style.css: selector "${s}" does not start with .${n}- or #${n}-`);
      }
    }
  }
  ok(bad.length === 0, '\n    ' + bad.join('\n    '));
});
