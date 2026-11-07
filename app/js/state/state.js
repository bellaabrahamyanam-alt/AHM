// State manager (domain "state"; INTERFACES.md I-6, proposals/003-state-manager.md). The ONE place that holds state shared between
// domains (the selected place, the layer state). Provided to everyone as AHM.state; it knows nothing about the DOM, the map or the sidebar.
// One function scope: no top-level names.
(() => {
  const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const values = {
    selected: null,
    layers: { only: new Set(), hide: new Set(), open: null, editing: null, staged: null, noteAll: false },
  };
  const layerFields = Object.keys(values.layers).sort().join();

  const check = (key) => {
    if (!Object.prototype.hasOwnProperty.call(values, key)) throw new Error('state: unknown key "' + key + '"');
  };

  const get = (key) => {
    check(key);
    return values[key];
  };

  const set = (key, value) => {
    check(key);
    if (key === 'layers' && (!isObject(value) || Object.keys(value).sort().join() !== layerFields)) {
      throw new Error('state: "layers" needs an object with the fields ' + layerFields);
    }
    const old = values[key];
    if (value === old) return;
    values[key] = value;
    AHM.emit('state:' + key, { value, old });
  };

  const patch = (key, partial) => {
    check(key);
    const value = values[key];
    if (!isObject(value)) throw new Error('state: "' + key + '" is not an object, patch needs an object value');
    if (!isObject(partial)) throw new Error('state: patch needs an object');
    const old = { ...value };
    Object.assign(value, partial);
    AHM.emit('state:' + key, { value, old });
  };

  AHM.state = { get, set, patch };
})();
