// Run from the repository root:  npx browser-sync start --config dev/bs-config.js
const path = require('path'), app = path.join(__dirname, '..', 'app');
module.exports = {
  server: { baseDir: app, routes: { '/data': path.join(__dirname, '..', 'data') } },
  port: 3000, ui: false, notify: false, open: false,
  files: [app + '/index.html', app + '/css/*.css', app + '/js/**/*.js'],   // data/ is not watched, so saving doesn't reload the page
  middleware: [require('./save-handler')]
};
