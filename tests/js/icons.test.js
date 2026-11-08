// Tests for the icon set of INTERFACES.md I-7 (app/js/icons.js, shared domain).
const { test, ok, eq } = require('./lib/harness');
const fs = require('fs');
const path = require('path');
const { ROOT, load } = require('./lib/ctx');

const NAMES = ['area', 'check', 'chevron-down', 'close', 'line', 'panel-left', 'panel-right', 'pencil', 'pin', 'plus', 'route-from', 'route-to', 'trash'];
const SRC = fs.readFileSync(path.join(ROOT, 'app', 'js', 'icons.js'), 'utf8');

test('icons I-7: icons.js defines exactly the fixed names, and AHM.icons offers only svg', () => {
  const have = [...SRC.matchAll(/^ {4}'([\w-]+)':/gm)].map((m) => m[1]).sort();
  eq(NAMES, have, 'the names in icons.js must be the names of INTERFACES.md I-7');
  const p = load(['icons.js']);
  eq(['svg'], Object.keys(p.X('AHM.icons')), 'AHM.icons');
});

test('icons I-7: every name draws a 16 px inline SVG in currentColor, and the size can be set', () => {
  const p = load(['icons.js']);
  for (const n of NAMES) {
    const s = p.X('AHM.icons.svg(__0)', n);
    ok(s.startsWith('<svg ') && s.endsWith('</svg>'), n + ': one <svg> element');
    ok(/viewBox="0 0 256 256"/.test(s) && /fill="currentColor"/.test(s) && /<path d="[^"]+"\/>/.test(s), n + ': viewBox, currentColor and a path');
    ok(/width="16" height="16"/.test(s), n + ': default size 16');
    ok(/width="24" height="24"/.test(p.X('AHM.icons.svg(__0, 24)', n)), n + ': size 24');
    ok(/aria-hidden="true"/.test(s), n + ': hidden from screen readers (the button around it carries the label)');
  }
});

test('icons I-7: an unknown name gives an empty string, a bad size gives 16', () => {
  const p = load(['icons.js']);
  for (const n of ['nope', '', 'constructor', '__proto__', 'toString']) eq('', p.X('AHM.icons.svg(__0)', n), 'name ' + JSON.stringify(n));
  for (const bad of [0, -3, NaN, '20', null]) ok(/width="16" height="16"/.test(p.X('AHM.icons.svg("pin", __0)', bad)), 'size ' + String(bad));
});

test('icons I-7: the markup is inert (no script, handler, link or network) and the licence is in the header', () => {
  const p = load(['icons.js']);
  for (const n of NAMES) {
    const s = p.X('AHM.icons.svg(__0)', n).replace('xmlns="http://www.w3.org/2000/svg"', '');
    ok(!/<script|\son\w+=|href|src=|url\(|https?:|style=/i.test(s), n + ': inert markup');
  }
  ok(!/\bfetch\b|XMLHttpRequest|\bimport\b/.test(SRC), 'icons.js loads nothing at runtime');
  const head = SRC.split('\n').slice(0, 3).join('\n');
  ok(/MIT/.test(head) && /Phosphor/.test(head), 'the Phosphor and MIT licence line is in the file header');
});

test('icons I-7: index.html loads icons.js once, after ahm.js and before every sidebar and map script', () => {
  const html = fs.readFileSync(path.join(ROOT, 'app', 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script src="(js\/[^"]+)"/g)].map((m) => m[1]);
  eq(1, scripts.filter((s) => s === 'js/icons.js').length, 'icons.js is loaded exactly once');
  const at = scripts.indexOf('js/icons.js');
  ok(at > scripts.indexOf('js/ahm.js'), 'after ahm.js (it needs AHM)');
  scripts.forEach((s, i) => {
    if (/^js\/(sidebar|map)\//.test(s)) ok(at < i, 'before ' + s);
  });
});
