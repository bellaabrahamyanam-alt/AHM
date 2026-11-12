#!/usr/bin/env node
// Pull-request check (DOMAINS.md, "Git workflow"; first step of tools/ci.sh). Usage: node tools/ci-check-pr.js <branch> <base-ref>
// 1. The branch is named <type>/<task>, type = feat, fix, docs, test, refactor or chore (for example feat/point-menu).
// 2. The rules and the machinery that judge the work ("protected" in tools/domains.json: agent rules, CI, contracts, ownership) may change only
//    with the owner's approval. The PR description must then hold a line `Owner-approved: T-NNN` naming the item of TODO.md in which the owner
//    wrote his decision (the critic checks that the item says so). Otherwise the check fails.
// `master` itself is not checked here.
const { execFileSync } = require('child_process');
const cd = require('./check-domain');

const TYPES = ['feat', 'fix', 'docs', 'test', 'refactor', 'chore'];

/** { type } or { error } for a branch name. */
function parseBranch(branch) {
  const m = /^([a-z]+)\/[A-Za-z0-9._-]+$/.exec(branch || '');
  if (!m || !TYPES.includes(m[1])) return { error: `branch "${branch}" must be named <type>/<task> with type ${TYPES.join(', ')}, for example feat/point-menu` };
  return { type: m[1] };
}

/** Changed paths that are protected (a protected entry ending in / is a folder). */
function protectedTouched(files) {
  const prot = cd.cfg.protected || [];
  return files.filter((f) => prot.some((p) => (p.endsWith('/') ? f.startsWith(p) : f === p)));
}

/** The approval id named by the PR description, or null. */
function approvalOf(body) {
  const m = /^\s*Owner-approved:\s*(T-\d+)\b/im.exec(body || '');
  return m ? m[1] : null;
}

function main(branch, base, body) {
  const b = parseBranch(branch);
  if (b.error) return console.error(b.error), 1;
  const files = execFileSync('git', ['diff', '--name-only', '--no-renames', `${base}...HEAD`], { maxBuffer: 1 << 28 }).toString().split('\n').filter(Boolean);
  const prot = protectedTouched(files.filter((f) => !/^graph\/[^/]+\.md$/.test(f)));
  if (prot.length && !approvalOf(body)) {
    return console.error(`REJECTED: the branch changes protected files and the PR description has no line "Owner-approved: T-NNN":\n  ` + prot.join('\n  ')), 1;
  }
  console.log(prot.length ? `ok: protected files changed with ${approvalOf(body)} (the critic checks the approval in TODO.md)` : 'ok: no protected file changed');
  return 0;
}
if (require.main === module) process.exit(main(process.argv[2], process.argv[3] || 'origin/master', process.env.PR_BODY));
module.exports = { parseBranch, protectedTouched, approvalOf };
