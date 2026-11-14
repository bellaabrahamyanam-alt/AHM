#!/usr/bin/env node
// Pull-request check (DOMAINS.md, "Git workflow"; first step of tools/ci.sh). Usage: node tools/ci-check-pr.js <branch> <base-ref>
// 1. The branch is named <type>/<task>, type = feat, fix, docs, test, refactor or chore (for example feat/point-menu).
// 2. The rules and the machinery that judge the work ("protected" in tools/domains.json: agent rules, CI, contracts, ownership) may change only
//    with the owner's approval. The PR description must then hold a line `Owner-approved: T-NNN` naming the item of TODO.md in which the owner
//    wrote his decision (the critic checks that the item says so). Otherwise the check fails.
// 3. A commit of the branch that skips CI ([skip ci], [ci skip], [no ci], [skip actions], [actions skip], skip-checks: true) may change documents
//    only. Nine such commits once left master red unnoticed (T-022). A pull request whose newest commit skips CI never runs this check at all,
//    so the critic checks the same rule (.claude/agents/critic.md, A1 and A8).
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

const SKIP = /\[(?:skip ci|ci skip|no ci|skip actions|actions skip)\]|^skip-checks:\s*true\s*$/im;
/** true when a commit message tells CI not to run. */
const hasSkipMarker = (message) => SKIP.test(message || '');
// What is not a document: the paths of CODE in tools/ci.sh (they need tests); keep the two in step. Everything else is a document.
const CODE = /^(app|controller|service|config|event|language|styles|data|dev|tests|context|graph)\/|^tools\/[^/]+$|^\.gitlab\/CODEOWNERS$|^\.gitlab-ci\.yml$|^\.github\/(workflows\/|CODEOWNERS$)|^[^/]+\.(php|json)$/;
/** The commits ({ sha, message, files }) that skip CI although they change something else than documents: their short ids and subjects. */
function skipCiOffenders(commits) {
  return commits.filter((c) => hasSkipMarker(c.message) && c.files.some((f) => CODE.test(f))).map((c) => `${c.sha.slice(0, 7)} ${String(c.message).split('\n')[0]}`);
}

function main(branch, base, body) {
  const b = parseBranch(branch);
  if (b.error) return console.error(b.error), 1;
  const files = execFileSync('git', ['diff', '--name-only', '--no-renames', `${base}...HEAD`], { maxBuffer: 1 << 28 }).toString().split('\n').filter(Boolean);
  const prot = protectedTouched(files.filter((f) => !/^graph\/[^/]+\.md$/.test(f)));
  if (prot.length && !approvalOf(body)) {
    return console.error(`REJECTED: the branch changes protected files and the PR description has no line "Owner-approved: T-NNN":\n  ` + prot.join('\n  ')), 1;
  }
  const git = (...a) => execFileSync('git', a, { maxBuffer: 1 << 28 }).toString();
  const commits = git('rev-list', '--no-merges', `${base}..HEAD`).split('\n').filter(Boolean).map((sha) => ({
    sha,
    message: git('show', '-s', '--format=%B', sha),
    files: git('diff-tree', '--no-commit-id', '--name-only', '-r', '--no-renames', sha).split('\n').filter(Boolean),
  }));
  const skip = skipCiOffenders(commits);
  if (skip.length) return console.error('REJECTED: these commits skip CI but change more than documents (remove the marker, [skip ci] is for documents only):\n  ' + skip.join('\n  ')), 1;
  console.log(prot.length ? `ok: protected files changed with ${approvalOf(body)} (the critic checks the approval in TODO.md)` : 'ok: no protected file changed');
  return 0;
}
if (require.main === module) process.exit(main(process.argv[2], process.argv[3] || 'origin/master', process.env.PR_BODY));
module.exports = { parseBranch, protectedTouched, approvalOf, hasSkipMarker, skipCiOffenders };
