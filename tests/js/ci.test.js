// The pull-request check (tools/ci-check-pr.js, DOMAINS.md "Git workflow"): branch names, protected files, and a real git repository end to end.
const { test, ok, eq } = require('./lib/harness');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { parseBranch, approvalOf, protectedTouched, hasSkipMarker, skipCiOffenders } = require('../../tools/ci-check-pr');
const TOOL = path.join(__dirname, '..', '..', 'tools', 'ci-check-pr.js');

test('ci: branch names are <type>/<task>', () => {
  eq({ type: 'feat' }, parseBranch('feat/point-menu'));
  eq({ type: 'fix' }, parseBranch('fix/flicker'));
  for (const bad of ['main', 'feat', 'feat/', 'map/highlight', 'Feat/x', 'feat/a/b', 'agent/feat/x', '']) ok(parseBranch(bad).error, `"${bad}" must be refused`);
});

test('ci: protected files (rules, CI, contracts) change only with "Owner-approved: T-NNN" in the PR description', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ahm_ci_'));
  const git = (...a) => execFileSync('git', ['-C', dir, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { stdio: 'pipe' });
  const put = (f, t) => (fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }), fs.writeFileSync(path.join(dir, f), t));
  git('init', '-q', '-b', 'main');
  put('app/js/map/map.js', 'a\n');
  put('INTERFACES.md', 'a\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  git('checkout', '-q', '-b', 'feat/x');
  put('app/js/map/map.js', 'b\n');
  put('app/js/sidebar/ui.js', 'new\n'); // another domain: fine, one builder works across domains
  git('add', '-A');
  git('commit', '-qam', 'code only');
  const run = (branch, body) => spawnSync('node', [TOOL, branch, 'main'], { cwd: dir, encoding: 'utf8', env: { ...process.env, PR_BODY: body || '' } });
  eq(0, run('feat/x').status, 'code in several domains');
  put('INTERFACES.md', 'b\n');
  git('commit', '-qam', 'contract');
  const r = run('feat/x', 'no approval here');
  eq(1, r.status);
  ok(/INTERFACES\.md/.test(r.stderr), r.stderr);
  eq(0, run('feat/x', 'Summary\n\nOwner-approved: T-012\n').status, 'with the approval line');
  eq(1, run('feat/x', 'Owner-approved: 12').status, 'the id must look like T-012');
  eq(1, run('map/x', '').status, 'bad branch name');
  ok(approvalOf('x\nOwner-approved: T-7') === 'T-7' && approvalOf('') === null && approvalOf(undefined) === null, 'approvalOf');
  eq(['INTERFACES.md', 'tools/prompts/_common.md'], protectedTouched(['app/js/a.js', 'INTERFACES.md', 'tools/prompts/_common.md', 'tools/make-graph.js']));
});

test('ci: deleting a path that no domain owns is allowed, changing one is not', () => {
  const cd = require('../../tools/check-domain');
  const del = (p) => `--- a/${p}\n+++ /dev/null\n@@ -1 +0,0 @@\n-x\n`;
  const mod = (p) => `--- a/${p}\n+++ b/${p}\n@@ -1 +1 @@\n-x\n+y\n`;
  eq([], cd.check(['shared'], del('diffs/old.diff')), 'orphan deleted');
  eq(1, cd.check(['shared'], mod('diffs/old.diff')).length, 'orphan changed');
  eq(1, cd.check(['shared'], del('app/js/map/map.js')).length, 'owned file deleted by the wrong domain');
});

test('ci: graph/*.md files, which CI generates, pass on any branch; deeper files of graph/ do not', () => {
  const cd = require('../../tools/check-domain');
  const mod = (p) => `--- a/${p}\n+++ b/${p}\n@@ -1 +1 @@\n-x\n+y\n`;
  eq([], cd.check(['map'], mod('graph/core.md')), 'graph/core.md');
  eq(1, cd.check(['map'], mod('graph/sub/deep.md')).length, 'graph/sub/deep.md');
});

test('ci: ONE job (tools/ci.sh) does the domain check, the graph and every test; every JS test file belongs to a domain (so the job runs it)', () => {
  const cd = require('../../tools/check-domain');
  const root = path.join(__dirname, '..', '..');
  const yml = fs.readFileSync(path.join(root, '.gitlab-ci.yml'), 'utf8');
  const sh = fs.readFileSync(path.join(root, 'tools', 'ci.sh'), 'utf8');
  ok(/^ci:/m.test(yml) && !/^stages:/m.test(yml) && !/^(tests|graph|domain)[:\w]*:/m.test(yml), '.gitlab-ci.yml must have the one job `ci` and no other job');
  ok(yml.includes('tools/ci.sh'), 'the job ci does not run tools/ci.sh');
  const gh = fs.readFileSync(path.join(root, '.github', 'workflows', 'ci.yml'), 'utf8');
  ok(gh.includes('tools/ci.sh') && /^  ci:/m.test(gh) && !/^  (tests|graph|domain):/m.test(gh), '.github/workflows/ci.yml must have the one job `ci` and run tools/ci.sh');
  for (const v of ['CI_MERGE_REQUEST_IID', 'CI_MERGE_REQUEST_TARGET_BRANCH_NAME', 'CI_MERGE_REQUEST_SOURCE_BRANCH_NAME', 'CI_SERVER_HOST', 'CI_PROJECT_PATH', 'GRAPH_PUSH_TOKEN', 'PR_BODY']) ok(gh.includes(v), `the GitHub workflow does not set ${v}, which tools/ci.sh reads`);
  for (const part of ['tools/ci-check-pr.js', 'tools/make-graph.js', 'make-graph.js --check', 'tools/build.js', 'bun@', 'app/dist', 'git push', 'php tests/php/run.php', 'php tests/data/run.php', 'node tests/js/run.js']) ok(sh.includes(part), `tools/ci.sh does not run: ${part}`);
  for (const f of fs.readdirSync(__dirname).filter((x) => x.endsWith('.test.js'))) {
    ok(cd.DOMAINS.includes(cd.ownerOf('tests/js/' + f)), `tests/js/${f} has no domain, so no CI job would run it`);
  }
});

test('ci: a commit that skips CI ([skip ci] and the other markers) is allowed only when it changes documents', () => {
  for (const m of ['fix: x [skip ci]', 'x [ci skip]', 'x [no ci]', 'x [skip actions]', 'x [actions skip]', 'x\n\nskip-checks: true', 'X [SKIP CI]']) ok(hasSkipMarker(m), `"${m}" skips CI`);
  for (const m of ['fix: skip the ci step', 'feat: no ci config', 'x [skip] y', '']) ok(!hasSkipMarker(m), `"${m}" does not`);
  const c = (message, ...files) => ({ sha: 'abcdef1234', message, files });
  eq([], skipCiOffenders([c('docs: x [skip ci]', 'changes/map.md', 'README.md', 'docs/02-implemented-features.md', '.claude/agents/critic.md', 'tools/prompts/_common.md')]), 'documents only');
  eq(['abcdef1'], skipCiOffenders([c('fix: x [skip ci]', 'app/js/map/map.js')]).map((o) => o.slice(0, 7)), 'code');
  eq(1, skipCiOffenders([c('fix: x [skip ci]', 'changes/map.md', 'service/store.php')]).length, 'documents and code together');
  eq(1, skipCiOffenders([c('x [skip ci]', 'graph/core.md')]).length, 'graph/ is generated code: CI must run');
  eq(1, skipCiOffenders([c('x [skip ci]', 'tools/ci.sh')]).length, 'CI itself');
  eq([], skipCiOffenders([c('fix: x', 'app/js/map/map.js')]), 'code without the marker');
});

test('ci: the check refuses a pull request with a skip-CI commit on code, in a real git repository', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ahm_ci_'));
  const git = (...a) => execFileSync('git', ['-C', dir, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { stdio: 'pipe' });
  const put = (f, t) => (fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }), fs.writeFileSync(path.join(dir, f), t));
  git('init', '-q', '-b', 'main');
  put('app/js/a.js', 'a\n');
  put('changes/map.md', 'a\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  git('checkout', '-q', '-b', 'fix/x');
  put('changes/map.md', 'b\n');
  git('commit', '-qam', 'docs: note [skip ci]');
  const run = () => spawnSync('node', [TOOL, 'fix/x', 'main'], { cwd: dir, encoding: 'utf8', env: { ...process.env, PR_BODY: '' } });
  eq(0, run().status, 'a document commit may skip CI');
  put('app/js/a.js', 'b\n');
  git('commit', '-qam', 'fix: quick change [skip ci]');
  const r = run();
  eq(1, r.status);
  ok(/skip/i.test(r.stderr) && /app\/js\/a\.js|fix: quick change/.test(r.stderr), r.stderr);
});
