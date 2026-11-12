// Starter context for agents (tools/make-context.js, AGENTS.md "Token rules"): up to date, short, complete.
const { test, ok, eq } = require('./lib/harness');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const mc = require('../../tools/make-context');
const cd = require('../../tools/check-domain');
const TOOL = path.join(__dirname, '..', '..', 'tools', 'make-context.js');

test('context: every domain has an entry, every listed file exists', () => {
  eq([], mc.problems());
  eq([...cd.DOMAINS].sort(), [...mc.domains].sort());
});

test('context: each starter is short (at most 6 code files, at most 14 files to read first) and starts with the common documents', () => {
  for (const d of mc.domains) {
    const l = mc.list(d);
    const first = mc.first(d);
    ok(l.length - first.length <= 6, `${d} lists ${l.length - first.length} code files`);
    ok(first.length <= 14, `${d} reads ${first.length} files first`);
    ok(l[0] === 'AGENTS.md' && l[1] === 'INTERFACES.md', `${d}: common documents first`);
    ok(l.includes(`graph/${d}.md`) && l.includes(`changes/${d}.md`) && l.includes('TODO.md'), `${d}: graph and own records`);
  }
});

test('context: the interface files of a domain exist, and every interface file is used by some domain', () => {
  const fs2 = require('fs');
  const used = new Set();
  for (const d of mc.domains) for (const f of mc.first(d)) if (f.startsWith('interfaces/')) (ok(fs2.existsSync(path.join(__dirname, '..', '..', f)), `${d}: ${f} is missing`), used.add(f));
  const all = fs2.readdirSync(path.join(__dirname, '..', '..', 'interfaces')).map((f) => 'interfaces/' + f);
  eq([], all.filter((f) => !used.has(f)), 'interface files no domain reads');
});

test('context: context/<domain>.md files are up to date (run: node tools/make-context.js)', () => {
  let rc = 0;
  try {
    execFileSync('node', [TOOL, '--check'], { stdio: 'pipe' });
  } catch (e) {
    rc = e.status;
    console.log('    ' + String(e.stderr).trim());
  }
  eq(0, rc);
});

