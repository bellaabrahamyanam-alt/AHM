// Outside services: place search and directions. Replace the bodies to change provider.
// Public Nominatim policy: at most 1 request per second, cache results, no search-as-you-type (callers search on Enter / button only).
const geoCache = new Map();
let geoLast = 0;
const geocode = async (q, lang) => {
  const key = lang + "|" + q.toLowerCase();
  if (geoCache.has(key)) return geoCache.get(key);
  const wait = geoLast + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  geoLast = Date.now();
  const rs = await fetch(
    AHM_CONFIG.geocodeUrl +
      "?format=jsonv2&limit=6&bounded=1&accept-language=" +
      lang +
      "&viewbox=" +
      [
        AHM_CONFIG.bbox[0],
        AHM_CONFIG.bbox[3],
        AHM_CONFIG.bbox[2],
        AHM_CONFIG.bbox[1],
      ].join(",") +
      "&q=" +
      encodeURIComponent(q),
  )
    .then((r) => r.json())
    .then((a) =>
      a.map((x) => ({ name: x.display_name, lon: +x.lon, lat: +x.lat })),
    );
  geoCache.set(key, rs);
  return rs;
};
const route = (a, b) =>
  fetch(
    `${AHM_CONFIG.routeUrl}/${a.lon},${a.lat};${b.lon},${b.lat}?overview=full&geometries=geojson`,
  )
    .then((r) => r.json())
    .then((j) => {
      if (!j.routes || !j.routes.length) throw Error("none");
      const r = j.routes[0];
      return {
        geometry: r.geometry,
        km: r.distance / 1000,
        min: r.duration / 60,
      };
    });
