#!/usr/bin/env node
// Production bundle (T-005): minifies the browser JS and CSS into app/dist/. Only whitespace and syntax are minified; names are
// NOT renamed, because the scripts are classic scripts that share one global scope (AGENTS.md, section 4).
//   bun tools/build.js            write app/dist/app.min.js, app/dist/app.min.css and app/dist/manifest.json (needs Bun)
//   node tools/build.js --check   exit 1 if app/dist was not built from the current sources, or a bundle differs in size from the manifest (tests/js/build.test.js; no Bun needed)
// The files to bundle, and their order, are read from the marked blocks of app/index.html:
//   <!-- ahm:css --> ... <!-- /ahm:css -->   and   <!-- ahm:js --> ... <!-- /ahm:js -->
// app/dist/ is committed: a forum installs the extension by copying the repository and has no Bun.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const APP = path.join(__dirname, '..', 'app');
const DIST = path.join(APP, 'dist');
const OPTIONS = 'js: --no-bundle --minify-whitespace --minify-syntax; css: --minify; v1'; // part of the hash: a changed option rebuilds

const block = (html, name) => {
  const m = html.match(new RegExp(`<!-- ahm:${name} -->([\\s\\S]*?)<!-- /ahm:${name} -->`));
  if (!m) throw new Error(`app/index.html has no <!-- ahm:${name} --> block`);
  return m[1];
};

/** The source files (relative to app/), in load order. */
function sources() {
  const html = fs.readFileSync(path.join(APP, 'index.html'), 'utf8');
  return {
    css: [...block(html, 'css').matchAll(/<link rel="stylesheet" href="(css\/[^"]+)"/g)].map((m) => m[1]),
    js: [...block(html, 'js').matchAll(/<script src="(js\/[^"]+)"/g)].map((m) => m[1]),
  };
}

const read = (files) => files.map((f) => fs.readFileSync(path.join(APP, f), 'utf8'));
// A `;` line between scripts: a script that starts with `(` must not continue the previous one.
const joinJs = (files) => read(files).join('\n;\n');
const joinCss = (files) => read(files).join('\n');

function hashOf(s) {
  const h = crypto.createHash('sha256').update(OPTIONS);
  for (const f of [...s.css, ...s.js]) h.update('\0' + f + '\0').update(fs.readFileSync(path.join(APP, f)));
  return h.digest('hex');
}

/** true when app/dist is missing, was built from other sources, or a bundle differs in size from the manifest (a hand-edited bundle). */
function stale(dist = DIST) {
  const file = path.join(dist, 'manifest.json');
  if (!fs.existsSync(file)) return true;
  const m = JSON.parse(fs.readFileSync(file, 'utf8'));
  const s = sources();
  if (m.hash !== hashOf(s)) return true;
  return ['app.min.js', 'app.min.css'].some((f) => !fs.existsSync(path.join(dist, f)) || !m.bytes || fs.statSync(path.join(dist, f)).size !== m.bytes[f]);
}

/** true when `name` is declared in the bundle: `function|class|const|let|var name`, or a later declarator of a merged declaration (`let a=1,name=2`). A call, a property or an assignment does not count. */
function hasDeclaration(code, name) {
  const n = name.replace(/\$/g, '\\$');
  return new RegExp(`(?:^|[^\\w$.])(?:function\\*?|class|const|let|var)\\s+${n}(?![\\w$])|[,;]\\s*${n}\\s*=(?!=)`).test(code);
}

function bunBuild(inFile, outFile, flags) {
  const r = spawnSync('bun', ['build', inFile, ...flags, '--outfile', outFile], { encoding: 'utf8' });
  if (r.error || r.status !== 0) throw new Error(`bun build failed for ${path.basename(inFile)}: ${r.error || r.stderr || r.stdout}`);
}

function build() {
  const s = sources();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ahm-build-'));
  try {
    fs.mkdirSync(DIST, { recursive: true });
    fs.writeFileSync(path.join(tmp, 'app.js'), joinJs(s.js));
    fs.writeFileSync(path.join(tmp, 'app.css'), joinCss(s.css));
    bunBuild(path.join(tmp, 'app.js'), path.join(DIST, 'app.min.js'), ['--no-bundle', '--minify-whitespace', '--minify-syntax']);
    bunBuild(path.join(tmp, 'app.css'), path.join(DIST, 'app.min.css'), ['--minify']);
    const size = (f) => fs.statSync(path.join(DIST, f)).size;
    const manifest = { hash: hashOf(s), js: s.js, css: s.css, bytes: { 'app.min.js': size('app.min.js'), 'app.min.css': size('app.min.css') } };
    fs.writeFileSync(path.join(DIST, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    return manifest;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

module.exports = { sources, joinJs, joinCss, hashOf, stale, hasDeclaration, build, DIST };

if (require.main === module) {
  if (process.argv.includes('--check')) {
    if (stale()) (console.error('app/dist is stale: run `bun tools/build.js` and commit app/dist/'), process.exit(1));
    console.log('app/dist is up to date');
  } else {
    const m = build();
    console.log(`built app/dist: app.min.js ${m.bytes['app.min.js']} bytes, app.min.css ${m.bytes['app.min.css']} bytes`);
  }
}
