// Data access and small helpers. The ONLY place that knows where our data comes from.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const norm = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
const getJSON = (u) =>
  fetch(u, { cache: 'no-cache' }).then((r) => {
    if (!r.ok) throw Error(r.status);
    return r.json();
  });
// ---- old data: files saved before the date model changed are converted here, so a not-yet-migrated store still works ----
const asDate = (v, text, approx) => (v && typeof v === 'object' ? dateUpgrade(v) : legacyToDate(v, text, approx));
const normPlace = (p) => {
  const mountain = p.type === 'mountain'; // a mountain has a height, not dates
  return {
    ...p,
    date_from: mountain ? null : asDate(p.date_from, p.date_from_text, p.approx),
    date_to: mountain ? null : asDate(p.date_to, p.date_to_text, p.approx),
    height_m: mountain && p.height_m != null ? p.height_m : null,
  };
};
const normNote = (n) => ({ ...n, layers: n.layers || [], date: n.date && typeof n.date === 'object' ? dateUpgrade(n.date) : asDate(n.year, n.when, false) });
const loadPlaces = () =>
  getJSON(AHM_CONFIG.url.places).then((fc) =>
    fc.features.map((f) =>
      normPlace({
        ...f.properties,
        lon: f.geometry.coordinates[0],
        lat: f.geometry.coordinates[1],
      })
    )
  );
const loadNotesIndex = () => getJSON(AHM_CONFIG.url.notesIndex).then((j) => j.notes.map(normNote));
// Layers, their notes and the categories are optional files: a store without them behaves as "no layers".
const loadOpt = (u, f) => getJSON(u).then(f).catch(() => []);
const normLayer = (l) => ({
  ...l,
  date_from: l.date_from ? dateUpgrade(l.date_from) : null,
  date_to: l.date_to ? dateUpgrade(l.date_to) : null,
});
const loadLayers = () => loadOpt(AHM_CONFIG.url.layers, (j) => j.layers.map(normLayer));
const loadLayerNotes = () =>
  loadOpt(AHM_CONFIG.url.layerNotesIndex, (j) =>
    j.notes.map((n) => ({ ...n, date: n.date && typeof n.date === 'object' ? dateUpgrade(n.date) : null }))
  );
const loadCategories = () => loadOpt(AHM_CONFIG.url.categories, (j) => j.categories);
const loadLanguages = () => getJSON(AHM_CONFIG.url.languages).then((j) => j.languages);
const loadNoteBody = (n) =>
  fetch(AHM_CONFIG.url.note(n.place, n.id), { cache: 'no-cache' })
    .then((r) => {
      if (!r.ok) throw Error(r.status);
      return r.text();
    })
    .then((t) => t.replace(/^---[\s\S]*?---\s*/, ''));
let places = [],
  notes = [],
  by = {},
  layers = [],
  layerNotes = [],
  categories = [],
  languages = []; // the dictionary of languages: [{ code, name, native }]; only administrators add to it
const label = (p, l) => (p.names.find((n) => n.lang === l) || p.names.find((n) => n.lang === 'en') || p.names[0]).name;
const langName = (code) => {
  const l = languages.find((x) => x.code === code);
  return l ? l.name : code;
};
// What a place shows instead of dates: a mountain its height, everything else its dates ('' when nothing is known).
const placeWhen = (p) =>
  p.type === 'mountain' ? (p.height_m == null ? '' : 'height ' + p.height_m + ' m') : spanText(p.date_from, p.date_to);
