// A very small test harness for the JavaScript part (no dependencies). Tests are async-friendly.
const assert = require('assert');
const tests = [];
let asserts = 0;
const test = (name, fn) => tests.push([name, fn]);
const ok = (c, m) => {
  asserts++;
  assert.ok(c, m || 'expected true');
};
const eq = (expected, actual, m) => {
  asserts++;
  // compare through JSON so values made inside a vm context (other realm) compare by content
  assert.strictEqual(JSON.stringify(actual), JSON.stringify(expected), (m ? m + '\n' : '') + `expected ${JSON.stringify(expected)}\n  actual   ${JSON.stringify(actual)}`);
};
const throws = (re, fn, m) => {
  asserts++;
  try {
    fn();
  } catch (e) {
    assert.ok(re.test(e.message), `${m || ''} wrong message: ${e.message} (wanted ${re})`);
    return;
  }
  assert.fail(`${m || ''} no error, wanted ${re}`);
};
const J = (x) => JSON.parse(JSON.stringify(x === undefined ? null : x));
async function runAll(filter) {
  let pass = 0,
    fail = 0;
  const t0 = Date.now();
  for (const [name, fn] of tests) {
    if (filter && !name.toLowerCase().includes(filter.toLowerCase())) continue;
    try {
      await fn();
      pass++;
      console.log('  ok   ' + name);
    } catch (e) {
      fail++;
      console.log('  FAIL ' + name + '\n    ' + (m => (m.length > 600 ? m.slice(0, 600) + ' …[cut, ' + m.length + ' chars]' : m))(String(e.message)).replace(/\n/g, '\n    '));
    }
  }
  console.log(`\n${pass} passed, ${fail} failed, ${asserts} assertions, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  return fail === 0;
}
module.exports = { test, ok, eq, throws, J, runAll };
