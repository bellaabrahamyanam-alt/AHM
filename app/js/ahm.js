// The shared namespace (shared domain): the DOM helper `$` and the window.AHM object through which the sidebar and the map talk
// to each other (INTERFACES.md, I-2). The map fills `AHM.map` with commands; both sides use `AHM.on` / `AHM.emit` for events.
// Handlers run synchronously; a handler that throws is logged and does not stop the others.
const $ = (s) => document.querySelector(s);
const AHM = (window.AHM = {
  map: {}, // commands, provided by map/map.js
  handlers: {},
  on(name, fn) {
    (this.handlers[name] ||= []).push(fn);
  },
  emit(name, data) {
    (this.handlers[name] || []).forEach((fn) => {
      try {
        fn(data);
      } catch (e) {
        console.error('AHM event "' + name + '":', e);
      }
    });
  },
});
