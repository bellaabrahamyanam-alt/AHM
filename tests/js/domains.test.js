// Domain ownership (DOMAINS.md): every file has exactly one owner, CODEOWNERS is made from the same table, and tools/check-domain.js
// rejects a diff that leaves its domain.
const { test, ok, eq } = require('./lib/harness');
const fs = require('fs');
const path = require('path');
const { ROOT } = require('./lib/ctx');
const cd = require('../../tools/check-domain');

const REPO = ROOT;
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    e.isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
};
const rel = (p) => path.relative(REPO, p).split(path.sep).join('/');

test('domains: every file of the extension has an owner (a new file needs a line in tools/domains.json)', () => {
  const none = walk(ROOT).map(rel).filter((p) => !cd.ownerOf(p));
  ok(none.length === 0, '\n    no owner: ' + none.join('\n    no owner: '));
});

test('domains: every entry of tools/domains.json points at something that exists, and each domain has its records', () => {
  const missing = [];
  for (const [d, list] of Object.entries(cd.cfg.domains)) {
    for (const e of list) if (!fs.existsSync(path.join(ROOT, e))) missing.push(d + ': ' + e);
    for (const r of [`changes/${d}.md`, `todo/${d}.md`]) if (!fs.existsSync(path.join(ROOT, r))) missing.push(d + ': ' + r);
  }
  ok(missing.length === 0, '\n    missing: ' + missing.join('\n    missing: '));
});

test('domains: CODEOWNERS is exactly what tools/check-domain.js --codeowners makes', () => {
  const file = path.join(ROOT, '.gitlab', 'CODEOWNERS'); // GitLab reads it here
  if (!fs.existsSync(file)) return console.log('    (no repository root here: skipped)');
  eq(cd.codeowners(), fs.readFileSync(file, 'utf8'));
});

test('domains: a diff is accepted inside its domain and rejected outside it', () => {
  const R = '';
  const diff = (...files) => files.map(([p, isNew]) => `--- ${isNew ? '/dev/null' : 'a/' + p}\n+++ b/${p}\n@@ -1 +1 @@\n-x\n+y\n`).join('');
  eq([], cd.check(['sidebar'], diff([R + 'app/js/sidebar/ui.js'], [R + 'app/css/sidebar.css'], [R + 'changes/sidebar.md'], ['diffs/sidebar/001-x.diff', true])));
  eq(1, cd.check(['sidebar'], diff([R + 'app/js/sidebar/ui.js'], [R + 'app/js/map/map.js'])).length);
  eq(1, cd.check(['map'], diff([R + 'changes/sidebar.md'])).length, "another domain's log");
  eq(1, cd.check(['sidebar'], diff([R + 'INTERFACES.md'])).length, 'shared files are for the owner only');
  eq(1, cd.check(['sidebar'], diff([R + 'app/js/new-file.js', true])).length, 'a file nobody owns');
  eq([], cd.check(['shared'], diff([R + 'INTERFACES.md'], [R + 'tools/domains.json'])));
  eq([], cd.check(['sidebar', 'map'], diff([R + 'app/js/sidebar/ui.js'], [R + 'app/js/map/map.js'])), 'several declared domains');
  // requests and proposals: new files only, requests named after the asking domain
  eq([], cd.check(['sidebar'], diff([R + 'requests/sidebar-to-map-001-fly.md', true])));
  eq(1, cd.check(['map'], diff([R + 'requests/sidebar-to-map-001-fly.md', true])).length, 'a request is written by the asking domain');
  eq(1, cd.check(['sidebar'], diff([R + 'requests/sidebar-to-map-001-fly.md'])).length, 'an existing request may not be edited');
  eq([], cd.check(['sidebar'], diff([R + 'proposals/001-run-options.md', true])));
  eq(1, cd.check(['sidebar'], diff([R + 'proposals/001-run-options.md'])).length, 'an existing proposal may not be edited');
  eq([], cd.check(['sidebar'], diff([R + 'app/node_modules/x/y.js'])), 'node_modules is ignored');
});
