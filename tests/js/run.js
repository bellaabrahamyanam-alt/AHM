// Runner for the JavaScript part:  node tests/js/run.js [filter] [--no-browser] [--domain=<name>]
// --domain=<name> runs only the test files that domain owns in tools/domains.json (CI runs one job per domain, .gitlab-ci.yml).
const path = require('path');
const fs = require('fs');
const h = require('./lib/harness');
if (process.argv.includes('--no-browser')) process.env.AHM_NO_BROWSER = '1';
const domain = (process.argv.find((a) => a.startsWith('--domain=')) || '').slice('--domain='.length);
let files = fs
  .readdirSync(__dirname)
  .filter((x) => x.endsWith('.test.js'))
  .sort();
if (domain) {
  const cd = require('../../tools/check-domain');
  if (!cd.DOMAINS.includes(domain)) (console.error(`unknown domain: ${domain} (known: ${cd.DOMAINS.join(', ')})`), process.exit(2));
  files = files.filter((f) => cd.ownerOf('tests/js/' + f) === domain);
  console.log(`domain ${domain}: ${files.length} test file(s): ${files.join(', ') || '(none)'}`);
}
for (const f of files) require(path.join(__dirname, f));
h.runAll(process.argv.slice(2).find((a) => !a.startsWith('--'))).then((okAll) => process.exit(okAll ? 0 : 1));
