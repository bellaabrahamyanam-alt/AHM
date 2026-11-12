// Optional features (shared domain; INTERFACES.md I-5). A feature is a folder app/features/<name>/ with main.js (and optionally
// style.css) that the page loads ONLY when <name> is listed in AHM_CONFIG.features. Not listed = nothing is requested, nothing runs,
// nothing is visible. The rest of the app never mentions a feature; this file is the only bridge.
//   AHM.features.register(name, init)  main.js calls it once; init({ name, base }) runs after main.js has loaded
//   AHM.features.onMapReady(fn)        fn() runs when the map is ready (at once if it already is)
//   AHM.features.enabled(name)         true when the feature is switched on
// A feature that fails to load or throws is logged and ignored; it never stops the app.
(() => {
  const NAME = /^[a-z][a-z0-9-]*$/;
  const wanted = (Array.isArray(AHM_CONFIG.features) ? AHM_CONFIG.features : []).filter((n) => typeof n === 'string' && NAME.test(n));
  const inits = {};
  let mapReady = false;
  AHM.on('map:ready', () => {
    mapReady = true;
  });
  // app/js/features.js -> app/features/ (works under the forum too, where the page URL says nothing about the extension folder);
  // in production this code runs inside the bundle app/dist/app.min.js?v=<hash>, one folder level below app/ as well
  const here = document.currentScript && document.currentScript.src;
  const root = here ? here.replace(/(?:js|dist)\/[^/]*$/, 'features/') : 'features/';
  const guard = (what, fn, arg) => {
    try {
      fn(arg);
    } catch (e) {
      console.error('AHM feature ' + what + ':', e);
    }
  };
  AHM.features = {
    enabled: (name) => wanted.includes(name),
    register(name, init) {
      if (wanted.includes(name) && typeof init === 'function') inits[name] = init;
    },
    onMapReady(fn) {
      if (mapReady) guard('(map ready)', fn);
      else AHM.on('map:ready', () => guard('(map ready)', fn));
    },
  };
  function load(name) {
    const base = root + name + '/';
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = base + 'style.css';
    css.onerror = () => css.remove(); // a feature may have no stylesheet
    document.head.appendChild(css);
    const js = document.createElement('script');
    js.src = base + 'main.js';
    js.async = false;
    js.onload = () => {
      if (inits[name]) guard('"' + name + '"', inits[name], { name, base });
      else console.warn('AHM feature "' + name + '": main.js did not call AHM.features.register');
    };
    js.onerror = () => console.warn('AHM feature "' + name + '" is switched on but ' + base + 'main.js could not be loaded');
    document.head.appendChild(js);
  }
  const start = () => wanted.forEach(load);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
