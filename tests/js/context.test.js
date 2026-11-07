// Starter context for agents (tools/make-context.js, AGENTS.md "Token rules"): up to date, short, complete; the architect package has no code.
const { test, ok, eq } = require('./lib/harness');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const mc = require('../../tools/make-context');
const cd = require('../../tools/check-domain');
const TOOL = path.join(__dirname, '..', '..', 'tools', 'make-context.js');

test('context: every domain has an entry, every listed file exists', () => {
  eq([], mc.problems());
  eq([...cd.DOMAINS].sort(), [...mc.domains].sort());
});

test('context: each read list is short (at most 9 files) and starts with the common documents', () => {
  for (const d of mc.domains) {
    const l = mc.list(d);
    ok(l.length <= 9, `${d} reads ${l.length} files`);
    ok(l[0] === 'AGENTS.md' && l[1] === 'INTERFACES.md', `${d}: common documents first`);
    ok(l.includes(`changes/${d}.md`) && l.includes(`todo/${d}.md`), `${d}: own records`);
  }
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

test('context: the architect package holds documents, records and tools, and no application code', () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ahm_arch_')), 'a.tar.gz');
  execFileSync('node', [TOOL, '--architect', out], { stdio: 'pipe' });
  const files = execFileSync('tar', ['-tzf', out]).toString().split('\n').filter(Boolean);
  for (const must of ['AGENTS.md', 'DOMAINS.md', 'INTERFACES.md', 'tools/domains.json', 'context/map.md', 'changes/shared.md', 'proposals/003-state-manager.md']) ok(files.includes(must), 'missing ' + must);
  const code = files.filter((f) => /^(app|data|service|controller|dev|tests\/js|tests\/php|styles)\//.test(f));
  eq([], code, 'application code in the architect package');
});
