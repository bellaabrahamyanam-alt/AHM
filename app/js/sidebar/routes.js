// The Routes tab (sidebar domain): historical routes from one place to another (trade, military, migration, journeys, roads).
// A route is a shape (core/shapes.js) of a route type: a line stored in the same file, with the same layers, period filter and
// drawing tool as a border. Extra fields: from_place and to_place (ids of places, optional). The map draws arrows along the line.
// Ways to add one: follow modern roads between two places (OSRM), a straight line, or draw it on the map.
const rts = {
  open: null, // id of the route whose card is open
  types: new Set(), // type filter
  hidden: new Set(), // routes switched off in the list (this session only)
  form: null, // { id | null, ...fields } while the form is shown
  draw: null, // { mode: 'new' | 'edit', id, ctl, body } while the drawing tool is on
  adding: false,
};
const rtCan = () => AHM_CONFIG.canEdit;
const rtErr = (m) => ($('#rtErr') ? ($('#rtErr').textContent = m || '') : m && alert(m));
const rtVisible = () => shapesRun({ q: $('#rtQ') ? $('#rtQ').value : '', lang: $('#lang').value, types: rts.types, period: periodBounds(), group: 'route' });
const rtCur = () => rts.open && shapeById(rts.open);
const placeById = (id) => places.find((p) => p.id === id);
const rtEnds = (s, l) => [s.from_place, s.to_place].map((id) => (id && placeById(id) ? label(placeById(id), l) : ''));
const rtKm = (s) => {
  const km = geomLengthKm(s.geometry);
  return km < 1 ? '' : '≈ ' + Math.round(km).toLocaleString('en') + ' km';
};
const rtBody = (s, o = {}) => ({ ...shBody(s), from_place: s.from_place || '', to_place: s.to_place || '', ...o });
const rtBtn = (act, icon, text) =>
  `<button type="button" class="icon-btn" data-rtact="${act}" title="${text}" aria-label="${text}">${AHM.icons.svg(icon, 16)}</button>`;

async function rtReload() {
  shapes = await loadShapes();
  shRefresh();
  rtRenderView();
}

// ---- the list ----
function rtRenderList() {
  if (!$('#rtList')) return;
  const l = $('#lang').value,
    rows = rtVisible(),
    all = shapes.filter(isRoute),
    c = {};
  all.forEach((s) => (c[s.type] = (c[s.type] || 0) + 1));
  $('#rtTypes').innerHTML = ROUTE_TYPE_LIST.filter((t) => c[t] || rts.types.has(t))
    .map((t) => `<button class="chip${rts.types.has(t) ? ' on' : ''}" data-t="${t}">${shIcon(t)}${esc(SHAPE_TYPES[t].label)} <span>${c[t] || 0}</span></button>`)
    .join('');
  $('#rtCount').textContent = rows.length + ' of ' + all.length + ' routes';
  $('#rtList').innerHTML = rows.length
    ? rows
        .map((s) => {
          const t = shapeType(s.type),
            [a, b] = rtEnds(s, l),
            ends = a || b ? `${esc(a || '?')} → ${esc(b || '?')}` : '',
            when = shapeWhen(s);
          return (
            `<li data-sid="${s.id}"${rts.open === s.id ? ' class="on"' : ''}><div class="t"><span class="tmark" title="${esc(t.label)}">${shIcon(s.type)}</span><b>${esc(shapeName(s, l))}</b>` +
            `<label class="sh-eye" title="Show on the map"><input type="checkbox" data-vis="${s.id}"${rts.hidden.has(s.id) ? '' : ' checked'} aria-label="Show on the map"></label></div>` +
            `<div class="sn">${esc(t.label)}${ends ? ' · ' + ends : ''}${when ? ' · ' + esc(when) : ''}</div></li>`
          );
        })
        .join('')
    : `<li class="empty">${all.length ? 'No routes match. Try fewer filters.' : 'No routes yet.'}</li>`;
}
$('#rtList').addEventListener('click', (e) => {
  if (e.target.closest('.sh-eye')) return;
  const li = e.target.closest('li[data-sid]');
  if (!li || e.detail > 1) return;
  rts.open === li.dataset.sid && !rts.form ? rtClose() : rtOpen(li.dataset.sid);
});
$('#rtList').addEventListener('dblclick', (e) => {
  const li = e.target.closest('li[data-sid]');
  if (li && !e.target.closest('.sh-eye')) rtOpen(li.dataset.sid, true);
});
$('#rtList').addEventListener('change', (e) => {
  const id = e.target.dataset.vis;
  if (!id) return;
  e.target.checked ? rts.hidden.delete(id) : rts.hidden.add(id);
  shPush();
});
$('#rtTypes').addEventListener('click', (e) => {
  const b = e.target.closest('.chip[data-t]');
  if (!b) return;
  rts.types.has(b.dataset.t) ? rts.types.delete(b.dataset.t) : rts.types.add(b.dataset.t);
  shRefresh();
});
document.addEventListener('input', (e) => e.target.id === 'rtQ' && shRefresh());
$('#rtFit').onclick = () => AHM.map.fitTo(rtVisible().flatMap((s) => bboxCorners(shBox(s))));

// ---- the card ----
function rtOpen(id, fit) {
  if (!shapeById(id)) return;
  rtCancelForm();
  rts.open = id;
  tab('routes');
  rtRenderList();
  rtRenderView();
  history.replaceState(null, '', '#route-' + id);
  if (fit) AHM.map.fitTo(bboxCorners(shBox(shapeById(id))));
}
function rtClose() {
  rtCancelForm();
  rts.open = null;
  rtRenderList();
  rtRenderView();
  history.replaceState(null, '', location.pathname + location.search);
}
function rtShow(on) {
  $('#rtDetail').hidden = !on;
  dockSync();
}
function rtRenderView() {
  const s = rtCur(),
    d = $('#rtDetail');
  if (curTab === 'routes') AHM.map.highlightShape(s ? s.id : null);
  document.querySelectorAll('#rtList li.on').forEach((x) => x.classList.remove('on'));
  if (rts.form) return rtShow(curTab === 'routes');
  if (!s || curTab !== 'routes') return rtShow(false);
  const li = $(`#rtList li[data-sid="${s.id}"]`),
    l = $('#lang').value,
    t = shapeType(s.type),
    can = rtCan(),
    dis = can ? '' : ' disabled',
    when = shapeWhen(s),
    others = s.names.filter((n) => n.name !== shapeName(s, l)),
    inLy = layers.filter((ly) => lyMembers[ly.id] && lyMembers[ly.id].has(s.id)),
    free = layers.filter((ly) => !inLy.includes(ly)),
    end = (id, word) => {
      const p = id && placeById(id);
      return p ? `<button class="chip" data-rtact="place" data-pid="${p.id}" title="Show ${word} on the map">${esc(label(p, l))}</button>` : '<span class="sn">not set</span>';
    };
  if (li) li.classList.add('on');
  d.innerHTML =
    `<div class="dock-head"><span class="tmark" title="${esc(t.label)}">${shIcon(s.type)}</span><h3 class="dock-title">${esc(shapeName(s, l))}</h3><span class="dock-btns">` +
    (can ? rtBtn('edit', 'pencil', 'Edit names, type, places and dates') : '') +
    rtBtn('close', 'close', 'Close') +
    `</span></div><div class="dock-body">` +
    (others.length ? `<div class="sn">${others.map((n) => `${esc(n.name)} <span class="sn">(${esc(n.lang)})</span>`).join(' · ')}</div>` : '') +
    `<div class="sn">${esc(t.label)}${rtKm(s) ? ' · ' + rtKm(s) : ''}${when ? ' · ' + esc(when) : ''}</div>` +
    `<div class="label">From → To</div><div class="chips rt-ends">${end(s.from_place, 'the start')} <span class="sn">→</span> ${end(s.to_place, 'the end')}</div>` +
    `<div class="label">Look</div><div class="sh-look">` +
    `<label>Colour <input type="color" id="rtColor" value="${esc(s.color)}"${dis}></label>` +
    `<label>Line opacity <input type="range" id="rtOp" min="0.1" max="1" step="0.05" value="${s.opacity}"${dis}> <span id="rtOpVal">${Math.round(s.opacity * 100)}%</span></label>` +
    `<label class="sh-check"><input type="checkbox" id="rtLabel"${s.label ? ' checked' : ''}${dis}> Show the name on the map</label></div>` +
    `<div class="label">In layers</div><div class="chips">` +
    (inLy.length ? inLy.map((ly) => `<button class="chip ly-chip" data-rtact="layer" data-lid="${ly.id}"${ly.color ? ` style="--a:${esc(ly.color)}"` : ''}>${esc(lyName(ly, l))}</button>`).join('') : '<span class="sn">None yet.</span>') +
    `</div>` +
    (can && free.length ? `<select id="rtAddLayer" aria-label="Add to a layer"><option value="">Add to a layer…</option>${free.map((ly) => `<option value="${ly.id}">${esc(lyName(ly, l))}</option>`).join('')}</select>` : '') +
    (/^osrm:/.test(s.source || '') ? `<div class="sn">The path follows modern roads: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> (ODbL), via OSRM. Edit the path to match the historical one.</div>` : '') +
    `<div class="err-line" id="rtErr"></div></div><div class="dock-foot">` +
    `<button type="button" data-rtact="fit">Fit map</button>` +
    (can ? `${geomToDraw(s.geometry) ? '<button type="button" data-rtact="editpath">Edit path</button>' : ''}<button type="button" data-rtact="reverse" title="Swap the start and the end">Reverse</button><button type="button" class="danger" data-rtact="delete">Delete</button>` : '') +
    `</div>`;
  rtShow(true);
  if (li) revealRow(li);
}
/** Saves a change at once (the map is already showing it). */
async function rtStyle(s, patch) {
  const old = Object.fromEntries(Object.keys(patch).map((k) => [k, s[k]]));
  Object.assign(s, patch);
  shPush();
  setTimeout(() => AHM.map.previewShape(s.id, null), 500);
  try {
    await postJSON(shUrl().shapeSave, rtBody(s));
    rtErr('');
  } catch (e) {
    Object.assign(s, old);
    shPush();
    rtRenderView();
    rtErr(e.message);
  }
}
$('#rtDetail').addEventListener('input', (e) => {
  const s = rtCur();
  if (!s || rts.form) return;
  if (e.target.id === 'rtColor') AHM.map.previewShape(s.id, { color: e.target.value });
  if (e.target.id === 'rtOp') {
    AHM.map.previewShape(s.id, { opacity: +e.target.value });
    $('#rtOpVal').textContent = Math.round(e.target.value * 100) + '%';
  }
});
$('#rtDetail').addEventListener('change', async (e) => {
  const s = rtCur();
  if (!s || rts.form) return;
  if (e.target.id === 'rtColor') rtStyle(s, { color: e.target.value });
  else if (e.target.id === 'rtOp') rtStyle(s, { opacity: +e.target.value });
  else if (e.target.id === 'rtLabel') rtStyle(s, { label: e.target.checked });
  else if (e.target.id === 'rtAddLayer' && e.target.value) {
    try {
      await postJSON(shUrl().layerSave, { layer_members: { id: e.target.value, add: [s.id] } });
      await lyReload();
      rtRenderView();
    } catch (err) {
      rtErr(err.message);
    }
  }
});
$('#rtDetail').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-rtact]');
  if (!b) return;
  const act = b.dataset.rtact,
    s = rtCur();
  if (act === 'close') return rts.form ? rtCancelForm() : rtClose();
  if (act === 'typepick') return b.parentElement.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === b));
  if (act === 'save') return rtSaveForm();
  if (act === 'cancel') return rtCancelForm();
  if (!s) return;
  if (act === 'fit') AHM.map.fitTo(bboxCorners(shBox(s)));
  else if (act === 'layer') lyOpen(b.dataset.lid);
  else if (act === 'place') {
    const p = placeById(b.dataset.pid);
    if (p) AHM.map.focusPoint(p, Math.max(AHM.map.getZoom(), 8));
  } else if (act === 'edit') rtOpenForm({ ...s });
  else if (act === 'editpath') rtStartDraw({ mode: 'edit', id: s.id });
  else if (act === 'reverse') {
    try {
      await postJSON(shUrl().shapeSave, rtBody(s, { geometry: geomReverse(s.geometry), from_place: s.to_place || '', to_place: s.from_place || '' }));
      await rtReload();
    } catch (err) {
      rtErr(err.message);
    }
  } else if (act === 'delete') {
    if (!confirm(`Delete “${shapeName(s, $('#lang').value)}”? It also leaves its layers. A copy of the old file stays in the archive on the server.`)) return;
    try {
      await postJSON(shUrl().shapeDelete, { id: s.id });
      rts.open = null;
      history.replaceState(null, '', location.pathname + location.search);
      await rtReload();
      await lyReload();
    } catch (err) {
      rtErr(err.message);
    }
  }
});

// ---- the form: names, type, the two places, dates; for a new route also how the path is made ----
const rtTypeChips = (cur) =>
  ROUTE_TYPE_LIST.map((t) => `<button type="button" class="chip${t === cur ? ' on' : ''}" data-rtact="typepick" data-t="${t}" title="${esc(SHAPE_TYPES[t].label)}">${shIcon(t)}${esc(SHAPE_TYPES[t].label)}</button>`).join('');
/** The names a person can type for a place: the name shown now, with the type when two places share a name. */
function rtPlaceKeys() {
  const l = $('#lang').value,
    count = {},
    keys = new Map();
  places.forEach((p) => (count[label(p, l)] = (count[label(p, l)] || 0) + 1));
  places.forEach((p) => keys.set(count[label(p, l)] > 1 ? `${label(p, l)} (${typeLabel(p.type)}, ${p.lat.toFixed(2)}, ${p.lon.toFixed(2)})` : label(p, l), p.id));
  return keys;
}
function rtOpenForm(f) {
  rts.form = f;
  const names = f.names && f.names.length ? f.names : [{ lang: $('#lang').value || 'en', name: '' }],
    keys = rtPlaceKeys(),
    keyOf = (id) => [...keys].find(([, v]) => v === id);
  rts.keys = keys;
  const pick = (id, cls, word) =>
    `<input class="${cls}" list="rtPlaceList" value="${esc((keyOf(id) || [''])[0])}" placeholder="${word} (type a place name)" aria-label="${word}" autocomplete="off">`;
  $('#rtDetail').innerHTML =
    `<div class="dock-head"><span class="tmark">${shIcon(f.type || 'trade')}</span><h3 class="dock-title">${f.id ? 'Edit route' : 'New route'}</h3><span class="dock-btns">${rtBtn('cancel', 'close', 'Cancel')}</span></div>` +
    `<div class="dock-body"><div class="pf" id="rtForm"><div class="label">Names</div><div class="pf-names">${names.map(pfRow).join('')}</div>` +
    `<button type="button" class="pf-add">+ Add another name</button><div class="sn">${LANG_HINT}</div>` +
    `<div class="label">Type</div><div class="chips sh-typepick">${rtTypeChips(f.type || 'trade')}</div>` +
    `<div class="sn">The type sets the line pattern and the first colour. You can change the colour afterwards.</div>` +
    `<div class="label">From</div>${pick(f.from_place, 'rt-from', 'Start')}<div class="label">To</div>${pick(f.to_place, 'rt-to', 'End')}` +
    `<datalist id="rtPlaceList">${[...keys.keys()].map((k) => `<option value="${esc(k)}"></option>`).join('')}</datalist>` +
    `<div class="sn">Optional for a drawn path. The arrows on the map run from the start to the end.</div>` +
    (f.id
      ? ''
      : `<div class="label">Path</div><div class="chips sh-typepick rt-path">` +
        `<button type="button" class="chip on" data-rtact="typepick" data-p="draw">Draw on the map</button>` +
        `<button type="button" class="chip" data-rtact="typepick" data-p="straight">Straight line</button>` +
        `<button type="button" class="chip" data-rtact="typepick" data-p="roads">Follow modern roads</button></div>` +
        `<div class="sn">Straight line and modern roads need both places. A modern road is only a starting point: edit the path afterwards to match history.</div>`) +
    `<div class="label">Dates (optional)</div><div class="sn">When the route was used. Routes with dates follow the period filter.</div>` +
    `<div class="pf-sub">Began</div>${dfHTML('pf-from', f.date_from || null)}<div class="pf-sub">Ended</div>${dfHTML('pf-to', f.date_to || null)}</div>` +
    `<div class="err-line" id="rtErr"></div></div><div class="dock-foot"><button type="button" class="primary" data-rtact="save">${f.id ? 'Save' : 'Next'}</button><button type="button" data-rtact="cancel">Cancel</button></div>`;
  rtShow(true);
  tab('routes');
  const n = $('#rtForm .nn');
  if (n) n.focus();
}
placeFormWire($('#rtDetail'));
function rtPlaceId(root, cls, word) {
  const v = root.querySelector('.' + cls).value.trim();
  if (!v) return '';
  const keys = rts.keys,
    hit = keys.get(v) || [...keys].find(([k]) => norm(k) === norm(v));
  if (!hit) throw Error(`“${v}” is not a place of the map. Choose the ${word} from the list.`);
  return Array.isArray(hit) ? hit[1] : hit;
}
function rtReadForm() {
  const root = $('#rtForm'),
    names = [...root.querySelectorAll('.pf-name')].map((r) => ({ lang: r.querySelector('.nl').value, name: r.querySelector('.nn').value.trim() })).filter((n) => n.name);
  if (!names.length) throw Error('Give the route at least one name.');
  names.forEach((n) => {
    if (!languages.some((l) => l.code === n.lang)) throw Error(`The language “${n.lang || '?'}” is not in the list. Ask an administrator to add it.`);
  });
  const from = dfRead(root.querySelector('.pf-from'), 'Began'),
    to = dfRead(root.querySelector('.pf-to'), 'Ended'),
    a = rtPlaceId(root, 'rt-from', 'start'),
    b = rtPlaceId(root, 'rt-to', 'end');
  dateOrderCheck(from, to);
  if (a && a === b) throw Error('The start and the end are the same place.');
  const path = root.querySelector('.rt-path .chip.on');
  return { names, type: root.querySelector('.sh-typepick .chip.on').dataset.t, date_from: from, date_to: to, from_place: a, to_place: b, path: path ? path.dataset.p : null };
}
async function rtSaveForm() {
  const f = rts.form,
    btn = $('#rtDetail [data-rtact="save"]');
  try {
    const v = rtReadForm(),
      { path, ...fields } = v;
    if (f.id) {
      await postJSON(shUrl().shapeSave, rtBody(shapeById(f.id), fields));
      rts.form = null;
      await rtReload();
      return rtOpen(f.id);
    }
    const a = placeById(fields.from_place),
      b = placeById(fields.to_place),
      body = { ...fields, ...shapeDefaults(fields.type, 'line'), source: '' };
    if (path === 'draw') {
      rts.form = null;
      return rtStartDraw({ mode: 'new', body });
    }
    if (!a || !b) throw Error('Choose both places for this kind of path, or draw it.');
    btn.disabled = true;
    rtErr('Building the path…');
    if (path === 'straight') body.geometry = { type: 'LineString', coordinates: [[a.lon, a.lat], [b.lon, b.lat]] };
    else {
      let r;
      try {
        r = await route(a, b);
      } catch (e) {
        throw Error('No road path found between these places. Use a straight line or draw it.');
      }
      body.geometry = simplifyGeometry(r.geometry);
      body.source = 'osrm:driving';
    }
    await rtCreate(body);
  } catch (e) {
    if (btn) btn.disabled = false;
    rtErr(e.message);
  }
}
async function rtCreate(body) {
  const id = (await postJSON(shUrl().shapeSave, body)).id;
  rts.form = null;
  await rtReload();
  rtRenderAdd();
  rtOpen(id, true);
}
function rtCancelForm() {
  if (!rts.form) return;
  rts.form = null;
  rtRenderView();
}

// ---- drawing: the same tool as for borders; a new route starts at its first place and ends at its second ----
function rtStartDraw({ mode, id, body }) {
  rtCancelForm();
  if (rts.draw) rts.draw.ctl.remove();
  if (sh.draw) shCancelDraw();
  const s = id && shapeById(id),
    a = body && placeById(body.from_place),
    b = body && placeById(body.to_place),
    min = mode === 'edit' ? 2 : 2 - (b ? 1 : 0),
    coords = s ? geomToDraw(s.geometry) : a ? [[a.lon, a.lat]] : [],
    ctl = AHM.map.drawShape({ kind: 'line', coords }, () => {
      const f = $('#rtFinish');
      if (f) f.disabled = ctl.points().length < min;
    });
  rts.open = null;
  rts.adding = false;
  rts.draw = { mode, id, ctl, body, min, end: b ? [b.lon, b.lat] : null };
  rtRenderList();
  rtRenderView();
  shPush();
  rtRenderAdd();
  if (s) AHM.map.fitTo(bboxCorners(shBox(s)));
  else if (a) AHM.map.fitTo([[a.lon, a.lat], ...(b ? [[b.lon, b.lat]] : [])]);
}
async function rtFinishDraw() {
  const d = rts.draw,
    pts = d.ctl.points();
  if (pts.length < d.min) return ($('#rtAddMsg').textContent = d.min > 1 ? 'A route needs at least 2 points.' : 'Click at least one point on the map.');
  if (d.end) pts.push(d.end);
  d.ctl.remove();
  rts.draw = null;
  const geometry = { type: 'LineString', coordinates: pts };
  try {
    if (d.mode === 'new') return await rtCreate({ ...d.body, geometry });
    await postJSON(shUrl().shapeSave, rtBody(shapeById(d.id), { geometry }));
  } catch (e) {
    alert(e.message);
  }
  await rtReload();
  rtRenderAdd();
  rtOpen(d.id);
}
function rtCancelDraw() {
  const d = rts.draw;
  if (!d) return;
  d.ctl.remove();
  rts.draw = null;
  shPush();
  rtRenderAdd();
  if (d.id) rtOpen(d.id);
}
AHM.on('draw:finish', () => rts.draw && rtFinishDraw());
AHM.on('draw:cancel', () => rts.draw && rtCancelDraw());

// ---- adding ----
function rtRenderAdd() {
  const box = $('#rtAdd');
  if (!rtCan()) return (box.innerHTML = '');
  if (rts.draw) {
    const d = rts.draw;
    box.innerHTML =
      `<div class="sh-banner"><b>${d.mode === 'edit' ? 'Editing the path' : 'Drawing the route'}</b>` +
      `<div class="sn">${d.mode === 'new' ? 'Click the map to add the points between the start and the end' + (d.end ? ' (the end is added for you)' : '') + '. ' : 'Click the map to add points. '}Drag a point to move it, right-click to remove it, Backspace undoes. Enter or a double click finishes, Esc cancels.</div>` +
      `<div class="row"><button type="button" data-rtadd="undo">Undo</button><button type="button" class="primary" id="rtFinish" data-rtadd="finish"${d.ctl.points().length < d.min ? ' disabled' : ''}>${d.mode === 'edit' ? 'Save path' : 'Finish'}</button>` +
      `<button type="button" data-rtadd="canceldraw">Cancel</button></div><div class="err-line" id="rtAddMsg"></div></div>`;
  } else box.innerHTML = `<button type="button" class="wide" data-rtadd="new">+ Add route</button>`;
}
$('#rtAdd').addEventListener('click', (e) => {
  const b = e.target.closest('[data-rtadd]');
  if (!b) return;
  const a = b.dataset.rtadd;
  if (a === 'new') (rts.open = null), rtRenderList(), rtOpenForm({ id: null });
  else if (a === 'undo') rts.draw.ctl.undo();
  else if (a === 'finish') rtFinishDraw();
  else if (a === 'canceldraw') rtCancelDraw();
});
rtRenderAdd();
