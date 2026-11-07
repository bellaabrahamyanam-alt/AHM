// Tests of the campaigns feature (domain campaigns). Scaffold: the feature registers itself and mounts its badge.
const { test, ok, eq } = require('./lib/harness');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { ROOT } = require('./lib/ctx');

test('campaigns: main.js registers itself with the loader and mounts a badge when initialised', () => {
  const registered = {},
    appended = [],
    ready = [];
  const sandbox = {
    AHM: { features: { register: (n, f) => (registered[n] = f), onMapReady: (f) => ready.push(f) } },
    document: { createElement: () => ({}), body: { appendChild: (e) => appended.push(e) } },
  };
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'app', 'features', 'campaigns', 'main.js'), 'utf8'), vm.createContext(sandbox));
  eq(['campaigns'], Object.keys(registered));
  registered.campaigns({ name: 'campaigns', base: 'x/' });
  eq(1, appended.length);
  ok(appended[0].className.startsWith('campaigns-'), 'own class prefix');
  eq(1, ready.length);
  ready[0]();
});
