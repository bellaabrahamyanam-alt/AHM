// The pull-request check (tools/ci-check-pr.js, DOMAINS.md "Git workflow"): branch names, and a real git repository end to end.
const { test, ok, eq } = require('./lib/harness');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { domainsOfBranch } = require('../../tools/ci-check-pr');
const TOOL = path.join(__dirname, '..', '..', 'tools', 'ci-check-pr.js');

test('ci: branch names are <domain>/<task>, several domains joined by +', () => {
  eq({ domains: ['map'] }, domainsOfBranch('map/highlight'));
  eq({ domains: ['shared', 'state'] }, domainsOfBranch('shared+state/scaffold'));
  for (const bad of ['main', 'map', 'map/', 'nope/x', 'map+nope/x', 'Map/x', 'agent/map/x', '']) ok(domainsOfBranch(bad).error, `"${bad}" must be refused`);
});

test('ci: a branch that changes only its own domain passes, one that touches another domain is rejected', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ahm_ci_'));
  const git = (...a) => execFileSync('git', ['-C', dir, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { stdio: 'pipe' });
  const put = (f, t) => (fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }), fs.writeFileSync(path.join(dir, f), t));
  const R = '';
  git('init', '-q', '-b', 'main');
  put(R + 'app/js/map/map.js', 'a\n');
  put(R + 'app/js/sidebar/ui.js', 'a\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  git('checkout', '-q', '-b', 'map/x');
  put(R + 'app/js/map/map.js', 'b\n');
  git('commit', '-qam', 'own file');
  const run = (branch) => spawnSync('node', [TOOL, branch, 'main'], { cwd: dir, encoding: 'utf8' });
  eq(0, run('map/x').status, 'own domain');
  put(R + 'app/js/sidebar/ui.js', 'b\n');
  git('commit', '-qam', 'foreign file');
  const r = run('map/x');
  eq(1, r.status);
  ok(/ui\.js: owned by sidebar, not by map/.test(r.stderr), r.stderr);
  eq(0, run('map+sidebar/x').status, 'both domains named');
  eq(1, run('feature-x').status, 'bad branch name');
});

test('ci: deleting a path that no domain owns is allowed, changing one is not', () => {
  const cd = require('../../tools/check-domain');
  const del = (p) => `--- a/${p}\n+++ /dev/null\n@@ -1 +0,0 @@\n-x\n`;
  const mod = (p) => `--- a/${p}\n+++ b/${p}\n@@ -1 +1 @@\n-x\n+y\n`;
  eq([], cd.check(['shared'], del('diffs/old.diff')), 'orphan deleted');
  eq(1, cd.check(['shared'], mod('diffs/old.diff')).length, 'orphan changed');
  eq(1, cd.check(['shared'], del('app/js/map/map.js')).length, 'owned file deleted by the wrong domain');
});
