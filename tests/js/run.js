// Runner for the JavaScript part:  node tests/js/run.js [filter] [--no-browser]
const path = require('path');
const fs = require('fs');
const h = require('./lib/harness');
if (process.argv.includes('--no-browser')) process.env.AHM_NO_BROWSER = '1';
for (const f of fs.readdirSync(__dirname).filter((x) => x.endsWith('.test.js')).sort()) require(path.join(__dirname, f));
h.runAll(process.argv.slice(2).find((a) => !a.startsWith('--'))).then((okAll) => process.exit(okAll ? 0 : 1));
