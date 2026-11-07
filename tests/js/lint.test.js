// Static checks with ESLint (installed globally here): undefined names and duplicate top-level names across the
// classic scripts. The scripts share ONE global scope in the page, so they are linted as one program in index.html order.
const { test, ok } = require('./lib/harness');
const fs = require('fs');
const path = require('path');
const { ROOT } = require('./lib/ctx');

function eslint() {
  for (const p of ['eslint', '/opt/node22/lib/node_modules/eslint']) {
    try {
      return require(p);
    } catch (e) {
      /* try the next place */
    }
  }
  return null;
}
const BROWSER = ['window', 'document', 'location', 'history', 'fetch', 'localStorage', 'matchMedia', 'navigator', 'console', 'setTimeout', 'clearTimeout',
  'requestAnimationFrame', 'maplibregl', 'alert', 'confirm', 'URL', 'FormData', 'Image', 'Blob', 'FileReader', 'AbortController', 'innerWidth', 'innerHeight',
  'getComputedStyle', 'HTMLElement', 'Event', 'module', 'devicePixelRatio', 'createImageBitmap', 'OffscreenCanvas', 'Promise', 'Intl'];

async function lint(code, file, globals, extra = {}) {
  const { ESLint } = eslint();
  const g = Object.fromEntries(globals.map((n) => [n, 'readonly']));
  const e = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [{ files: ['**/*.js'], languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: g, ...extra }, rules: { 'no-undef': 'error', 'no-redeclare': 'error', 'no-dupe-keys': 'error', 'no-const-assign': 'error', 'no-unreachable': 'error', 'no-dupe-args': 'error', 'no-func-assign': 'error' } }],
  });
  const [r] = await e.lintText(code, { filePath: file });
  return r.messages.map((m) => `${file}:${m.line}:${m.column} ${m.ruleId || 'syntax'} ${m.message}`);
}

test('lint: the browser scripts, as one program in index.html order, have no undefined or doubly declared names', async () => {
  if (!eslint()) return console.log('    (eslint not installed: skipped)');
  const html = fs.readFileSync(path.join(ROOT, 'app', 'index.html'), 'utf8');
  const files = [...html.matchAll(/<script src="(js\/[^"]+)"/g)].map((m) => m[1]);
  ok(files.length >= 10, 'found the scripts: ' + files.join(','));
  // line numbers are per file: lint each file with all OTHER files' top-level names declared as globals is not possible
  // for redeclarations, so concatenate, and map positions back to files
  let code = '';
  const starts = [];
  for (const f of files) {
    starts.push([code.split('\n').length, f]);
    code += fs.readFileSync(path.join(ROOT, 'app', f), 'utf8') + '\n';
  }
  const where = (line) => {
    const s = [...starts].reverse().find(([l]) => line >= l);
    return `${s[1]}:${line - s[0] + 1}`;
  };
  const msgs = (await lint(code, 'all.js', BROWSER)).map((m) => m.replace(/^all\.js:(\d+):\d+/, (_, l) => where(+l)));
  ok(msgs.length === 0, '\n    ' + msgs.join('\n    '));
});

test('lint: the Node dev server and the test runners have no undefined names', async () => {
  if (!eslint()) return console.log('    (eslint not installed: skipped)');
  // browser.test.js is left out: much of its code runs inside the page (pg.evaluate), with the page's globals
  const node = ['require', 'module', 'process', '__dirname', 'console', 'Buffer', 'setTimeout', 'clearTimeout', 'fetch', 'URL', 'globalThis'];
  const files = [path.join(ROOT, 'dev', 'save-handler.js'), ...fs.readdirSync(__dirname).filter((f) => f.endsWith('.js') && f !== 'browser.test.js').map((f) => path.join(__dirname, f)), ...fs.readdirSync(path.join(__dirname, 'lib')).map((f) => path.join(__dirname, 'lib', f))];
  const msgs = [];
  for (const f of files) msgs.push(...(await lint(fs.readFileSync(f, 'utf8'), path.relative(ROOT, f), node, { sourceType: 'commonjs' })));
  ok(msgs.length === 0, '\n    ' + msgs.join('\n    '));
});

test('lint: every script parses, and none uses module syntax (they are classic scripts)', () => {
  const html = fs.readFileSync(path.join(ROOT, 'app', 'index.html'), 'utf8');
  for (const m of html.matchAll(/<script src="(js\/[^"]+)"/g)) {
    const code = fs.readFileSync(path.join(ROOT, 'app', m[1]), 'utf8');
    ok(!/^\s*(import|export)\s/m.test(code), m[1] + ' uses import/export');
    new Function(code); // syntax check
  }
  ok(!/type="module"/.test(html), 'index.html has no module scripts');
});

test('lint: the checker itself finds an undefined name and a doubled declaration', async () => {
  if (!eslint()) return console.log('    (eslint not installed: skipped)');
  const undef = await lint('nowhere();\n', 'x.js', BROWSER);
  ok(undef.some((x) => /no-undef/.test(x)), undef.join(' | '));
  const twice = await lint('const a = 1;\nconst a = 2;\n', 'x.js', BROWSER);
  ok(twice.length > 0 && /already been declared|no-redeclare/.test(twice.join(' ')), twice.join(' | '));
});
