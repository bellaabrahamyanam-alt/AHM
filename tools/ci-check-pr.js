#!/usr/bin/env node
// Merge-request check (DOMAINS.md, "Git workflow"; run by the `domain` job of .gitlab-ci.yml). Usage: node tools/ci-check-pr.js <branch> <base-ref>
// The branch is named <domain>[+<domain>]/<task>, for example map/highlight or shared+state/scaffold. Every file the branch changed
// (git diff <base-ref>...HEAD) must belong to one of the named domains or be a record/request/proposal allowed by check-domain.js.
// `master` itself and branches named like release/... are not checked here.
const { execFileSync } = require('child_process');
const cd = require('./check-domain');

/** The domains named by a branch, or { error } when the name does not follow the convention. */
function domainsOfBranch(branch) {
  const m = /^([a-z]+(?:\+[a-z]+)*)\/[A-Za-z0-9._-]+$/.exec(branch || '');
  if (!m) return { error: `branch "${branch}" must be named <domain>/<task> (domains: ${cd.DOMAINS.join(', ')}; several: a+b/<task>)` };
  const list = m[1].split('+');
  const unknown = list.filter((d) => !cd.DOMAINS.includes(d));
  return unknown.length ? { error: `unknown domain "${unknown.join(',')}" in branch "${branch}" (known: ${cd.DOMAINS.join(', ')})` } : { domains: list };
}

function main(branch, base) {
  const b = domainsOfBranch(branch);
  if (b.error) return console.error(b.error), 1;
  const diff = execFileSync('git', ['diff', '--no-color', '--no-renames', `${base}...HEAD`], { maxBuffer: 1 << 28 }).toString();
  const bad = cd.check(b.domains, diff);
  if (bad.length) return console.error(`REJECTED: the branch touches files outside its domain (${b.domains.join(' + ')}):\n  ` + bad.join('\n  ')), 1;
  console.log(`ok: every changed file is in the domain ${b.domains.join(' + ')}`);
  return 0;
}
if (require.main === module) process.exit(main(process.argv[2], process.argv[3] || 'origin/master'));
module.exports = { domainsOfBranch };
