// Historical map images ("overlays"): a picture pinned to the map by its four corners, shown between two zoom levels with transparency.
// Everyone can see them and change their own transparency; administrators can add, move, stretch, rotate, edit and delete them.
let ovList = [],
  ovHidden = new Set(),
  ovLocal = {},
  ovEdit = null;
const OV_MAX_PX = 4096; // larger scans are shrunk before upload (also what weak GPUs can draw)
const ovId = (id) => 'ahm-ov-' + id;
const ovUrl = (o) => o.tmpUrl || AHM_CONFIG.url.overlayImage(o);
const ovOpacity = (o) => (ovEdit && ovEdit.id === o.id ? ovEdit.opacity : (ovLocal[o.id] ?? o.opacity));
const fmtZ = (z) => Math.round(z * 10) / 10;
const ovCenter = (c) => [c.reduce((s, p) => s + p[0], 0) / 4, c.reduce((s, p) => s + p[1], 0) / 4];

async function ovPost(url, body, type) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': type || 'application/json' },
    body: type ? body : JSON.stringify(body),
  });
  let j = {};
  try {
    j = await r.json();
  } catch (e) {}
  if (!r.ok) throw Error(j.error || r.status);
  return j;
}
async function loadOverlays() {
  try {
    const r = await fetch(AHM_CONFIG.url.overlays, { cache: 'no-cache' });
    ovList = r.ok ? (await r.json()).overlays || [] : [];
  } catch (e) {
    ovList = [];
  }
  syncOverlays();
  renderOvList();
}
// Make the map layers match ovList (add, update, remove).
function syncOverlays() {
  if (typeof map === 'undefined' || !map || !map.getLayer('ahm-route')) return;
  const want = new Set(ovList.map((o) => ovId(o.id)));
  map
    .getStyle()
    .layers.filter((l) => l.id.startsWith('ahm-ov-') && !want.has(l.id))
    .forEach((l) => {
      map.removeLayer(l.id);
      map.removeSource(l.id);
    });
  ovList.forEach((o) => {
    const id = ovId(o.id),
      editing = ovEdit && ovEdit.id === o.id,
      c = editing ? ovEdit.coords : o.coordinates;
    if (!map.getSource(id)) {
      map.addSource(id, { type: 'image', url: ovUrl(o), coordinates: c });
      map.addLayer({ id, type: 'raster', source: id, paint: { 'raster-fade-duration': 0 } }, 'ahm-route'); // above the base map, below route and markers
    } else map.getSource(id).setCoordinates(c);
    map.setPaintProperty(id, 'raster-opacity', ovOpacity(o));
    map.setLayerZoomRange(id, editing ? 0 : o.minzoom, editing ? 24 : o.maxzoom); // while editing it is always visible
    map.setLayoutProperty(id, 'visibility', ovHidden.has(o.id) && !editing ? 'none' : 'visible');
  });
}
const ovHint = (o) => {
  const z = map ? map.getZoom() : 0;
  return z >= o.minzoom && z < o.maxzoom
    ? 'Visible at this zoom'
    : `Hidden at this zoom (shown for zoom ${fmtZ(o.minzoom)}–${fmtZ(o.maxzoom)})`;
};
function updateOvHints() {
  ovList.forEach((o) => {
    const e = document.querySelector(`.ovhint[data-id="${o.id}"]`);
    if (e) e.textContent = ovHint(o);
  });
  const z = $('#ovZoom');
  if (z) z.textContent = fmtZ(map.getZoom());
}
function overlaysInit() {
  map.on('zoom', updateOvHints);
}

function renderOvList() {
  const shown = ovList.filter((o) => !o.tmpUrl);
  $('#ovList').innerHTML = shown.length
    ? shown
        .map(
          (
            o
          ) => `<div class="ov"><label><input type="checkbox" data-ov="${o.id}" ${ovHidden.has(o.id) ? '' : 'checked'}> <b>${esc(o.title)}</b></label>
    <div class="sn ovhint" data-id="${o.id}">${ovHint(o)}</div>
    <div class="row"><input type="range" min="0" max="1" step="0.05" value="${ovLocal[o.id] ?? o.opacity}" data-opa="${o.id}" title="Opacity (only for you)"><button data-fit="${o.id}">Fit</button>${AHM_CONFIG.canOverlay ? `<button data-edit="${o.id}">Edit</button>` : ''}</div></div>`
        )
        .join('')
    : '<div class="sn">No historical maps yet.</div>';
  $('#ovAdmin').innerHTML = AHM_CONFIG.canOverlay ? '<button id="ovAdd">Add image overlay…</button>' : '';
}
const ovFit = (c) =>
  map.fitBounds(
    c.reduce((b, p) => b.extend(p), new maplibregl.LngLatBounds(c[0], c[0])),
    { padding: 60 }
  );
$('#ovList').addEventListener('change', (e) => {
  const id = e.target.dataset.ov;
  if (!id) return;
  e.target.checked ? ovHidden.delete(id) : ovHidden.add(id);
  syncOverlays();
});
$('#ovList').addEventListener('input', (e) => {
  const id = e.target.dataset.opa;
  if (!id) return;
  ovLocal[id] = +e.target.value;
  map.setPaintProperty(ovId(id), 'raster-opacity', +e.target.value);
});
$('#ovList').addEventListener('click', (e) => {
  const f = e.target.dataset.fit,
    ed = e.target.dataset.edit;
  if (f) ovFit(ovList.find((o) => o.id === f).coordinates);
  else if (ed) startEdit(ovList.find((o) => o.id === ed));
});
$('#ovAdmin').addEventListener('click', (e) => {
  if (e.target.id === 'ovAdd') $('#ovFile').click();
});

// ---- adding: shrink the picture if needed, place it in the middle of the current view, then edit ----
async function ovPrepare(file) {
  const bmp = await createImageBitmap(file);
  let w = bmp.width,
    h = bmp.height;
  const k = Math.min(1, OV_MAX_PX / Math.max(w, h));
  const ok = ['image/png', 'image/jpeg', 'image/webp'].includes(file.type);
  if (k === 1 && ok && file.size <= 8e6) return { blob: file, w, h };
  w = Math.round(w * k);
  h = Math.round(h * k);
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  cv.getContext('2d').drawImage(bmp, 0, 0, w, h);
  const toBlob = (t, q) => new Promise((r) => cv.toBlob(r, t, q));
  let blob = await toBlob(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.9);
  if (blob.size > 9e6) blob = await toBlob('image/jpeg', 0.85);
  return { blob, w, h };
}
function ovStartCorners(w, h) {
  const r = map.getContainer().getBoundingClientRect(),
    s = Math.min((r.width * 0.6) / w, (r.height * 0.6) / h),
    pw = w * s,
    ph = h * s,
    cx = r.width / 2,
    cy = r.height / 2;
  return [
    [cx - pw / 2, cy - ph / 2],
    [cx + pw / 2, cy - ph / 2],
    [cx + pw / 2, cy + ph / 2],
    [cx - pw / 2, cy + ph / 2],
  ].map((p) => {
    const l = map.unproject(p);
    return [l.lng, l.lat];
  });
}
$('#ovFile').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    const img = await ovPrepare(f);
    const o = {
      id: 'new',
      title: f.name.replace(/\.[^.]+$/, ''),
      coordinates: ovStartCorners(img.w, img.h),
      minzoom: 0,
      maxzoom: 24,
      opacity: 0.6,
      file: '',
      tmpUrl: URL.createObjectURL(img.blob),
      blob: img.blob,
    };
    stopEdit();
    ovList.push(o);
    startEdit(o);
  } catch (err) {
    alert('Could not read that image: ' + err.message);
  }
});

// ---- editing: drag the red corners to fit, the blue dot to move everything, sliders to rotate / scale ----
function startEdit(o) {
  stopEdit();
  AHM.emit('map:show-controls'); // the sidebar opens the Maps fold
  ovEdit = {
    id: o.id,
    o,
    isNew: !!o.tmpUrl,
    title: o.title,
    coords: o.coordinates.map((c) => c.slice()),
    minzoom: o.minzoom,
    maxzoom: o.maxzoom,
    opacity: o.opacity,
    base: null,
    handles: [],
    center: null,
  };
  ovEdit.base = ovEdit.coords.map((c) => c.slice());
  syncOverlays();
  buildHandles();
  renderEditPanel();
  ovFit(ovEdit.coords);
}
const ovLive = () => map.getSource(ovId(ovEdit.id)).setCoordinates(ovEdit.coords);
function ovRebase() {
  ovEdit.base = ovEdit.coords.map((c) => c.slice());
  ovEdit.center.setLngLat(ovCenter(ovEdit.coords));
  $('#ovRot').value = 0;
  $('#ovScale').value = 1;
  $('#ovRotVal').textContent = '0°';
  $('#ovScVal').textContent = '100%';
}
function buildHandles() {
  const mk = (cls, ll) => {
    const el = document.createElement('div');
    el.className = cls;
    return new maplibregl.Marker({ element: el, draggable: true }).setLngLat(ll).addTo(map);
  };
  ovEdit.handles = ovEdit.coords.map((c, i) => {
    const m = mk('ovh', c);
    m.on('drag', () => {
      const l = m.getLngLat();
      ovEdit.coords[i] = [l.lng, l.lat];
      ovLive();
      ovEdit.center.setLngLat(ovCenter(ovEdit.coords));
    });
    m.on('dragend', ovRebase);
    return m;
  });
  ovEdit.center = mk('ovh center', ovCenter(ovEdit.coords));
  ovEdit.center.getElement().title = 'Drag to move the whole image';
  let start = null;
  ovEdit.center.on('dragstart', () => {
    start = { c: ovEdit.center.getLngLat(), px: ovEdit.coords.map((p) => map.project(p)) };
  });
  ovEdit.center.on('drag', () => {
    const a = map.project(start.c),
      b = map.project(ovEdit.center.getLngLat());
    ovEdit.coords = start.px.map((p) => {
      const l = map.unproject([p.x + b.x - a.x, p.y + b.y - a.y]);
      return [l.lng, l.lat];
    });
    ovEdit.handles.forEach((h, i) => h.setLngLat(ovEdit.coords[i]));
    ovLive();
  });
  ovEdit.center.on('dragend', ovRebase);
}
function ovApplyRS() {
  // rotate / scale the shape captured at the last drag, around its centre (screen space)
  const rot = (+$('#ovRot').value * Math.PI) / 180,
    k = +$('#ovScale').value,
    px = ovEdit.base.map((p) => map.project(p));
  const cx = px.reduce((s, p) => s + p.x, 0) / 4,
    cy = px.reduce((s, p) => s + p.y, 0) / 4;
  ovEdit.coords = px.map((p) => {
    const dx = (p.x - cx) * k,
      dy = (p.y - cy) * k;
    const l = map.unproject([
      cx + dx * Math.cos(rot) - dy * Math.sin(rot),
      cy + dx * Math.sin(rot) + dy * Math.cos(rot),
    ]);
    return [l.lng, l.lat];
  });
  ovEdit.handles.forEach((h, i) => h.setLngLat(ovEdit.coords[i]));
  ovLive();
  $('#ovRotVal').textContent = $('#ovRot').value + '°';
  $('#ovScVal').textContent = Math.round(k * 100) + '%';
}
function renderEditPanel() {
  const e = ovEdit;
  if (!e) {
    $('#ovEditPanel').innerHTML = '';
    return;
  }
  $('#ovEditPanel').innerHTML = `<div class="ovpanel"><b>${e.isNew ? 'New image overlay' : 'Edit image overlay'}</b>
    <div class="sn">Drag the red squares to stretch and fit the corners, the blue dot to move the whole image.</div>
    <input id="ovTitle" value="${esc(e.title)}" placeholder="Title">
    <div class="label">Opacity <span id="ovOpVal">${Math.round(e.opacity * 100)}%</span></div><input id="ovOp" type="range" min="0" max="1" step="0.05" value="${e.opacity}">
    <div class="label">Rotate <span id="ovRotVal">0°</span> · Scale <span id="ovScVal">100%</span></div>
    <div class="row"><input id="ovRot" type="range" min="-180" max="180" step="0.5" value="0"><input id="ovScale" type="range" min="0.2" max="3" step="0.01" value="1"></div>
    <div class="label">Zoom range (now <span id="ovZoom">${fmtZ(map.getZoom())}</span>)</div>
    <div class="row"><input id="ovMin" type="number" min="0" max="24" step="0.5" value="${e.minzoom}" title="Show from zoom"><button data-z="min">= now</button><input id="ovMax" type="number" min="0" max="24" step="0.5" value="${e.maxzoom}" title="Hide from zoom"><button data-z="max">= now</button></div>
    <div class="sn">Shown from the first zoom up to, not including, the second. While editing it is always visible.</div>
    <div class="row"><button id="ovSave">Save</button><button id="ovCancel">Cancel</button>${e.isNew ? '' : '<button id="ovDelete">Delete</button>'}</div><div id="ovErr" class="sn"></div></div>`;
}
$('#ovEditPanel').addEventListener('input', (e) => {
  if (!ovEdit) return;
  const id = e.target.id;
  if (id === 'ovTitle') ovEdit.title = e.target.value;
  else if (id === 'ovOp') {
    ovEdit.opacity = +e.target.value;
    $('#ovOpVal').textContent = Math.round(ovEdit.opacity * 100) + '%';
    map.setPaintProperty(ovId(ovEdit.id), 'raster-opacity', ovEdit.opacity);
  } else if (id === 'ovRot' || id === 'ovScale') ovApplyRS();
  else if (id === 'ovMin') ovEdit.minzoom = +e.target.value;
  else if (id === 'ovMax') ovEdit.maxzoom = +e.target.value;
});
$('#ovEditPanel').addEventListener('click', async (e) => {
  if (!ovEdit) return;
  const z = e.target.dataset.z,
    err = (t) => ($('#ovErr').textContent = t);
  if (z) {
    const v = Math.round(map.getZoom() * 2) / 2;
    if (z === 'min') {
      ovEdit.minzoom = v;
      $('#ovMin').value = v;
    } else {
      ovEdit.maxzoom = v;
      $('#ovMax').value = v;
    }
  } else if (e.target.id === 'ovCancel') stopEdit();
  else if (e.target.id === 'ovDelete') {
    if (!confirm('Delete “' + ovEdit.title + '”? A copy is kept in the archive folder on the server.')) return;
    try {
      await ovPost(AHM_CONFIG.url.overlayDelete, { id: ovEdit.id });
      stopEdit();
      await loadOverlays();
    } catch (x) {
      err('Delete failed: ' + x.message);
    }
  } else if (e.target.id === 'ovSave') {
    const d = ovEdit;
    if (!d.title.trim()) return err('Give it a title.');
    if (!(d.minzoom >= 0 && d.maxzoom <= 24 && d.minzoom < d.maxzoom))
      return err('Zoom range: the first number must be smaller than the second (0–24).');
    const meta = {
      id: d.isNew ? undefined : d.id,
      title: d.title.trim(),
      coordinates: d.coords,
      minzoom: d.minzoom,
      maxzoom: d.maxzoom,
      opacity: d.opacity,
    };
    err('Saving…');
    try {
      const r = await ovPost(AHM_CONFIG.url.overlaySave, meta);
      if (d.isNew) {
        try {
          await ovPost(AHM_CONFIG.url.overlayUpload(r.id), d.o.blob, d.o.blob.type);
        } catch (x) {
          await ovPost(AHM_CONFIG.url.overlayDelete, { id: r.id }).catch(() => {});
          throw x;
        }
      }
      stopEdit();
      await loadOverlays();
    } catch (x) {
      err('Save failed: ' + x.message);
    }
  }
});
function stopEdit() {
  if (!ovEdit) return;
  ovEdit.handles.forEach((h) => h.remove());
  ovEdit.center && ovEdit.center.remove();
  if (ovEdit.isNew) {
    ovList = ovList.filter((o) => o.id !== 'new');
    URL.revokeObjectURL(ovEdit.o.tmpUrl);
  }
  ovEdit = null;
  syncOverlays();
  renderOvList();
  renderEditPanel();
}

document.addEventListener("DOMContentLoaded", loadOverlays); // the map domain starts its own data (after initMap)
