// Boundary check (DOMAINS.md, INTERFACES.md): a script may use the top-level names of its own domain, of core and of shared, plus the
// names listed in ALLOWED below. A name declared by another domain's script is a violation. The scripts share one global scope, so
// this is the only thing that keeps the domains apart. Uses ESLint's scope analysis (skipped when ESLint is not installed).
const { test, ok } = require('./lib/harness');
const fs = require('fs');
const path = require('path');
const { ROOT } = require('./lib/ctx');
const { ownerOf } = require('../../tools/check-domain');

// Known violations and interface names, written down on purpose (INTERFACES.md): <using domain>: [names].
const ALLOWED = {
  sidebar: [
    'typeIcon', // I-4: place type symbols, provided by the map domain
  ],
  core: [],
  map: [],
  state: [],
};
// Free (browser) names a domain may not use at all.
const FORBIDDEN_FREE = {
  core: ['$', 'document', 'window', 'maplibregl', 'localStorage', 'history', 'location', 'alert', 'confirm'],
  sidebar: ['maplibregl'],
  map: [],
  state: ['$', 'document', 'window', 'maplibregl', 'localStorage', 'history', 'location', 'alert', 'confirm', 'fetch'],
};

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

async function analyse(files) {
  const { ESLint } = eslint();
  const seen = []; // per file, in the order given: { declared: Set, used: Map(name -> first line) }
  const plugin = {
    rules: {
      scan: {
        create(context) {
          return {
            'Program:exit'(node) {
              const scope = context.sourceCode.getScope(node);
              const declared = new Set(scope.variables.filter((v) => v.defs.length).map((v) => v.name));
              const used = new Map();
              for (const r of scope.through) if (!used.has(r.identifier.name)) used.set(r.identifier.name, r.identifier.loc.start.line);
              seen.push({ declared, used });
            },
          };
        },
      },
    },
  };
  const e = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [{ files: ['**/*.js'], plugins: { ahm: plugin }, languageOptions: { ecmaVersion: 2022, sourceType: 'script' }, rules: { 'ahm/scan': 'error' } }],
  });
  for (const f of files) await e.lintText(fs.readFileSync(path.join(ROOT, 'app', f), 'utf8'), { filePath: f });
  return Object.fromEntries(files.map((f, i) => [f, seen[i]]));
}

test('boundaries: no script uses a top-level name that belongs to another domain (except the written-down ones)', async () => {
  if (!eslint()) return console.log('    (eslint not installed: skipped)');
  const html = fs.readFileSync(path.join(ROOT, 'app', 'index.html'), 'utf8');
  const files = [...html.matchAll(/<script src="(js\/[^"]+)"/g)].map((m) => m[1]);
  const seen = await analyse(files);
  const declaredBy = {}; // name -> [files]
  for (const f of files) for (const n of seen[f].declared) (declaredBy[n] = declaredBy[n] || []).push(f);
  const domainOf = (f) => ownerOf('app/' + f);
  const bad = [];
  for (const f of files) {
    const me = domainOf(f);
    for (const [name, line] of seen[f].used) {
      if (FORBIDDEN_FREE[me] && FORBIDDEN_FREE[me].includes(name)) bad.push(`${f}:${line} ${me} may not use the browser name "${name}"`);
      for (const other of declaredBy[name] || []) {
        const o = domainOf(other);
        if (o === me || o === 'shared' || o === 'core') continue;
        if ((ALLOWED[me] || []).includes(name)) continue;
        bad.push(`${f}:${line} ${me} uses "${name}", declared by the ${o} domain (${other})`);
      }
    }
  }
  ok(bad.length === 0, '\n    ' + bad.join('\n    '));
});

test('boundaries: the checker itself sees a name used from another file', async () => {
  if (!eslint()) return console.log('    (eslint not installed: skipped)');
  const tmp = path.join(ROOT, 'app', 'js');
  const { ESLint } = eslint();
  const out = {};
  const plugin = { rules: { scan: { create: (c) => ({ 'Program:exit'(n) { out.used = c.sourceCode.getScope(n).through.map((r) => r.identifier.name); } }) } } };
  const e = new ESLint({ overrideConfigFile: true, overrideConfig: [{ files: ['**/*.js'], plugins: { ahm: plugin }, languageOptions: { ecmaVersion: 2022, sourceType: 'script' }, rules: { 'ahm/scan': 'error' } }] });
  await e.lintText('function mine() { return other(); }\n', { filePath: path.join(tmp, 'x.js') });
  ok(out.used.includes('other') && !out.used.includes('mine'), JSON.stringify(out));
});
