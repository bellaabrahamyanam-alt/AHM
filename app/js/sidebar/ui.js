// Sidebar, details, directions, search and the add-place form.
let noteText = {},
  editMk = null,
  cur = null,
  pick = null,
  rt = { a: null, b: null },
  rtInfo = "",
  geoTimer = null,
  geoRes = [],
  dlg = { mode: "place", p: null };
const typeLabel = (t) => t.replace(/_/g, " ");
const mark = (t, q) => {
  const i = q ? t.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return esc(t.slice(0, 100)) + "…";
  const a = Math.max(0, i - 30);
  return (
    (a ? "…" : "") +
    esc(t.slice(a, i)) +
    "<mark>" +
    esc(t.slice(i, i + q.length)) +
    "</mark>" +
    esc(t.slice(i + q.length, i + q.length + 70)) +
    "…"
  );
};
// ---- tabs, collapse ----
// Three tabs: Explore, Layers, More. "More" holds folds: maps, route (directions), lang; tab("route") opens that fold.
let curTab = "explore";
const FOLDS = ["maps", "route", "lang"];
function tab(n) {
  const top = FOLDS.includes(n) ? "more" : n;
  curTab = top;
  document
    .querySelectorAll(".tabs button")
    .forEach((b) => b.classList.toggle("on", b.dataset.tab === top));
  document
    .querySelectorAll("#side section")
    .forEach((s) => (s.hidden = s.id !== "tab-" + top));
  if (FOLDS.includes(n)) {
    FOLDS.forEach((f) => ($("#more-" + f).open = f === n));
    $("#more-" + n).scrollIntoView({ block: "nearest" });
  }
  if (cur && !editMk) closeDetail(); // a tab is navigation: leave the place sheet (but never in the middle of editing)
  lyRenderDetail(); // the layer sheet belongs to the Layers tab
}
document.querySelector(".tabs").addEventListener("click", (e) => {
  if (e.target.dataset.tab) tab(e.target.dataset.tab);
});
// the handle on the right edge of the sidebar: one button, the icon and the label say what it does now
function sideHandle(h) {
  const b = $("#collapse"),
    t = h ? "Expand sidebar" : "Collapse sidebar";
  b.innerHTML = AHM.icons.svg(h ? "panel-right" : "panel-left", 14);
  b.title = t;
  b.setAttribute("aria-label", t);
}
const toggleSide = (h) => {
  document.body.classList.toggle("collapsed", h);
  sideHandle(h);
  setTimeout(() => AHM.emit("sidebar:resized"), 250);
};
$("#collapse").onclick = () => toggleSide(!document.body.classList.contains("collapsed"));
sideHandle(false);
// ---- the details dock: a pane under the lists; the place details (#detail) and the layer details (#lyDetail) live in it ----
$(".stack").append($("#dock"));
function dockSync() {
  $("#dock").hidden = $("#detail").hidden && $("#lyDetail").hidden;
}
// The dock covers the lower half of the panel: if a row is hidden behind it, scroll the list just enough to centre the row.
function revealRow(li) {
  const box = li.closest(".body");
  requestAnimationFrame(() => {
    const b = box.getBoundingClientRect(),
      r = li.getBoundingClientRect();
    if (r.top >= b.top && r.bottom <= b.bottom) return;
    box.scrollTop += r.top + r.height / 2 - (b.top + b.height / 2);
  });
}
// ---- resizable sidebar: drag the edge, double-click resets, arrow keys nudge; size is remembered ----
const mobile = () => matchMedia("(max-width:700px)").matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sizeKey = () => (mobile() ? "ahm-side-h" : "ahm-side-w");
function setSize(v, save) {
  // desktop: width in px; mobile: height in vh
  v = mobile()
    ? clamp(v, 25, 85)
    : clamp(v, 280, Math.min(720, innerWidth - 240));
  document.documentElement.style.setProperty(
    mobile() ? "--side-h" : "--side-w",
    v + (mobile() ? "vh" : "px"),
  );
  requestAnimationFrame(() => AHM.emit("sidebar:resized"));
  if (save)
    try {
      localStorage.setItem(sizeKey(), v);
    } catch (e) {}
  return v;
}
const curSize = () =>
  mobile()
    ? ($("#side").offsetHeight / innerHeight) * 100
    : $("#side").offsetWidth;
try {
  ["ahm-side-w", "ahm-side-h"].forEach((k) => {
    const v = localStorage.getItem(k);
    if (v && (k === "ahm-side-h") === mobile()) setSize(+v);
  });
} catch (e) {}
$("#resizer").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  $("#resizer").setPointerCapture(e.pointerId);
  document.body.classList.add("resizing");
});
$("#resizer").addEventListener("pointermove", (e) => {
  if (!document.body.classList.contains("resizing")) return;
  setSize(
    mobile() ? ((innerHeight - e.clientY) / innerHeight) * 100 : e.clientX,
  );
});
$("#resizer").addEventListener("pointerup", () => {
  document.body.classList.remove("resizing");
  setSize(curSize(), true);
});
$("#resizer").addEventListener("dblclick", () => {
  setSize(mobile() ? 52 : 380);
  try {
    localStorage.removeItem(sizeKey());
  } catch (e) {}
});
$("#resizer").addEventListener("keydown", (e) => {
  const d = { ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, ArrowUp: 1 }[e.key];
  if (!d) return;
  e.preventDefault();
  setSize(curSize() + d * (mobile() ? 3 : 20), true);
});
// ---- filters and results ----
function fillLangs() {
  const v = $("#lang").value;
  const langs = [
    ...new Set([
      ...places.flatMap((p) => p.names.map((n) => n.lang)),
      ...notes.map((n) => n.lang),
    ]),
  ].sort();
  $("#lang").innerHTML =
    '<option value="">All languages</option>' +
    langs
      .map((l) => `<option value="${esc(l)}">${esc(langName(l))} (${esc(l)})</option>`)
      .join("");
  $("#lang").value = v;
}
function fillTypes() {
  const c = {};
  places.forEach((p) => (c[p.type] = (c[p.type] || 0) + 1));
  $("#typeChips").innerHTML = Object.keys(c)
    .sort()
    .map(
      (t) =>
        `<button class="chip${state.types.has(t) ? " on" : ""}" data-t="${t}">${typeIcon(t)}${typeLabel(t)} <span>${c[t]}</span></button>`,
    )
    .join("");
}
function setData(p, n) {
  places = p;
  notes = n;
  by = {};
  n.forEach((x) => (by[x.place] ??= []).push(x));
  fillLangs();
  fillTypes();
}
function placeRowHTML(p, hits, l, q) {
  return (
    `<li data-id="${p.id}"><div class="t"><span class="tmark" title="${esc(typeLabel(p.type))}">${typeIcon(p.type)}</span><b>${esc(label(p, l))}</b></div>` +
    (placeWhen(p) ? `<div class="sn">${esc(placeWhen(p))}</div>` : "") +
    (hits[0] ? `<div class="sn">${mark(hits[0].text, q)}</div>` : "") +
    "</li>"
  );
}
// The details of the open place (#detail) live in the dock under the list; the list keeps all its rows and the open one is marked.
function placeDetail() {
  const d = $("#detail");
  document.querySelectorAll("#list li.on").forEach((x) => x.classList.remove("on"));
  if (!cur) {
    d.hidden = true;
    dockSync();
    return;
  }
  let li = $(`#list li[data-id="${cur.id}"]`);
  if (!li) {
    // the place is filtered out of the list: show its row anyway, so the open place always has a row
    const e = $("#list .empty");
    if (e) e.remove();
    $("#list").insertAdjacentHTML("afterbegin", placeRowHTML(cur, [], $("#lang").value, ""));
    li = $("#list li");
  }
  li.classList.add("on");
  d.hidden = false;
  dockSync();
  revealRow(li);
}
/** What run() needs from the sidebar fields (INTERFACES.md I-3). */
const searchOptions = () => ({ q: $("#q").value, lang: $("#lang").value, sort: $("#sort").value, period: periodBounds() });
function update() {
  const r = run(searchOptions()),
    l = $("#lang").value,
    q = $("#q").value.trim();
  const nf = state.types.size + (l ? 1 : 0) + (periodActive() ? 1 : 0) + lyFilterCount();
  $("#fcount").textContent = nf ? `(${nf})` : "";
  const chip = (k, t) => `<button class="chip on" data-clear="${k}" title="Remove this filter">${t} ✕</button>`;
  // the selected types and the language are shown inside Filters, so only the period is repeated here
  $("#fActive").innerHTML = periodActive() ? chip("period", "period") : "";
  $("#count").textContent = r.length + " of " + places.length + " places";
  $("#list").innerHTML = r.length
    ? r.map(({ p, hits }) => placeRowHTML(p, hits, l, q)).join("")
    : '<li class="empty">No places match. Try fewer filters.</li>';
  placeDetail();
  const fc = {
    type: "FeatureCollection",
    features: r.map(({ p }) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lon, p.lat] },
      properties: {
        id: p.id,
        name: label(p, l),
        type: typeLabel(p.type),
        type_code: p.type,
        dates: placeWhen(p),
        halo: lyHalo(p.id),
      },
    })),
  };
  AHM.map.setFeatures(fc);
}
$("#activeBar").addEventListener("click", (e) => {
  const k = e.target.closest("[data-clear]") && e.target.closest("[data-clear]").dataset.clear;
  if (!k) return;
  if (k.startsWith("type:")) state.types.delete(k.slice(5));
  else if (k === "lang") $("#lang").value = "";
  else if (k === "period") initPeriod();
  fillTypes();
  update();
});
["q", "lang", "sort"].forEach((i) =>
  $("#" + i).addEventListener("input", update),
);
// the period filter: two date fields (dfWire first, so a changed format is redrawn before the list is refiltered)
initPeriod();
["#fFrom", "#fTo"].forEach((s) => {
  dfWire($(s));
  ["input", "change"].forEach((ev) => $(s).addEventListener(ev, update));
});
$("#typeChips").addEventListener("click", (e) => {
  const t = e.target.closest(".chip");
  if (!t) return;
  state.types.has(t.dataset.t)
    ? state.types.delete(t.dataset.t)
    : state.types.add(t.dataset.t);
  fillTypes();
  update();
});
$("#reset").onclick = () => {
  ["q", "lang"].forEach((i) => ($("#" + i).value = ""));
  initPeriod();
  state.types.clear();
  lyClearFilters();
  $("#geo").innerHTML = "";
  searchFieldSync();
  fillTypes();
  update();
};
$("#fit").onclick = () => {
  AHM.map.fitTo(run(searchOptions()).map(({ p }) => [p.lon, p.lat]));
};
$("#list").addEventListener("click", (e) => {
  const li = e.target.closest("li[data-id]");
  if (!li || e.detail > 1) return; // the second click of a double click is left to the dblclick handler
  if (cur && cur.id === li.dataset.id && !editMk) closeDetail(); // a second click on the open place folds it
  else show(li.dataset.id);
});
// Double click on a place (map or list): open its details if they are not open yet, then move the map to it.
function focusPlace(id) {
  const p = places.find((x) => x.id === id);
  if (!p) return;
  if (!cur || cur.id !== id) show(id);
  AHM.map.focusPlace(id);
}
// A double click zooms; it must not select the name under the pointer (dragging still selects text).
[$("#list"), $("#lyList")].forEach((el) =>
  el.addEventListener("mousedown", (e) => {
    if (e.detail > 1) e.preventDefault();
  }),
);
$("#list").addEventListener("dblclick", (e) => {
  const li = e.target.closest("li[data-id]");
  if (li && !lyState.editing) focusPlace(li.dataset.id);
});
// ---- selected point on the map ----
const edit = (...a) => (AHM_CONFIG.canEdit ? a : []); // add/edit buttons only for people who may change data
const editHint = AHM_CONFIG.canEdit
  ? ""
  : '<div class="sn">' +
    (AHM_CONFIG.loggedIn
      ? "Adding places and notes is limited to administrators."
      : `<a href="${AHM_CONFIG.loginUrl}">Log in</a> to add places and notes.`) +
    "</div>";
const btns = (...a) =>
  a
    .map(([k, t, c]) => `<button data-act="${k}"${c ? ` class="${c}"` : ""}>${t}</button>`)
    .join(" ");
// A click on an empty point of the map opens a small menu at that point (map.js): add place, route from, route to.
const pointActions = () => [
  ...(AHM_CONFIG.canEdit ? [{ id: "add", icon: "plus", label: "Add place here" }] : []),
  { id: "from", icon: "route-from", label: "Route from here" },
  { id: "to", icon: "route-to", label: "Route to here" },
];
let pickBusy = false; // "add" opened the dialog: the grey pin stays until the dialog closes
function pickPoint(p) {
  const hint = AHM_CONFIG.canEdit ? "" : AHM_CONFIG.loggedIn ? "Adding places is limited to administrators." : "Log in to add places.";
  AHM.map.showMenu(p, pointActions(), p.name || "Selected point", hint); // first: it closes the previous menu, which clears the old pin
  pick = p;
  AHM.map.setPick(p);
}
AHM.on("map:menu", ({ action }) => {
  if (!pick) return;
  if (action === "add") {
    pickBusy = true;
    openDlg("place", pick);
  } else act(action, pick);
});
AHM.on("map:menu-close", () => {
  if (pickBusy) return;
  pick = null;
  AHM.map.setPick(null);
});
$("#dlg").addEventListener("close", () => {
  pickBusy = false;
  pick = null;
  AHM.map.setPick(null);
});
// ---- place details (open in the list, under the place; the map does not move) ----
const iconBtn = (act, icon, text, extra = "", cls = "") =>
  `<button type="button" class="icon-btn${cls ? " " + cls : ""}" data-act="${act}" ${extra} title="${text}" aria-label="${text}">${AHM.icons.svg(icon, 16)}</button>`;
// The header of the place card: type marker (its title is the type), name, then edit / route from / route to / close.
const placeHeadHTML = (p, l) =>
  `<div class="dock-head"><span class="tmark" title="${esc(typeLabel(p.type))}">${typeIcon(p.type)}</span>` +
  `<h3 class="dock-title">${esc(label(p, l))}</h3><span class="dock-btns">` +
  (AHM_CONFIG.canEdit ? iconBtn("editplace", "pencil", "Edit place") : "") +
  iconBtn("from", "route-from", "Route from here") +
  iconBtn("to", "route-to", "Route to here") +
  iconBtn("closedetail", "close", "Close") +
  "</span></div>";
let showSeq = 0;
async function show(id) {
  const p = places.find((x) => x.id === id);
  if (!p) return;
  if (lyState.editing) return lyToggleMember(id); // choosing places for a layer
  if (curTab !== "explore") tab("explore"); // the list lives in the Explore tab
  stopEditPlace();
  AHM.map.hideMenu(); // a chosen place replaces the point menu and its pin
  cur = p;
  const seq = ++showSeq;
  AHM.state.set('selected', p.id);
  const l = $("#lang").value;
  const scope = lyScope(id, true),
    inLang = (by[id] || []).filter((n) => !l || n.lang === l);
  const ns = inLang
    .filter((n) => lyNoteVisible(n, scope))
    .sort((a, b) => byDateKey({ date_from: a.date }, { date_from: b.date }) || a.title.localeCompare(b.title));
  $("#detail").innerHTML = placeHeadHTML(p, l); // the new header at once: no frame shows the previous place
  placeDetail();
  history.replaceState(null, "", "#place-" + id);
  const bodies = await Promise.all(
    ns.map((n) => loadNoteBody(n).catch(() => n.text)),
  );
  if (seq !== showSeq) return; // another place was chosen while the notes were loading
  noteText = {};
  ns.forEach((n, i) => (noteText[n.id] = bodies[i]));
  const para = (t) =>
    t
      .split(/\n\s*\n/)
      .map((x) => "<p>" + esc(x) + "</p>")
      .join("");
  $("#detail").innerHTML =
    placeHeadHTML(p, l) +
    `<div class="dock-body"><p>` +
    p.names
      .filter((n) => !l || n.lang === l)
      .map((n) => `${esc(n.name)} <span class="sn">[${n.lang}]</span>`)
      .join(" · ") +
    "</p>" +
    lyPlaceHTML(p) +
    lyScopeHTML(scope, ns.length, inLang.length) +
    (ns
      .map(
        (n, i) =>
          `<div class="note"><div class="note-head"><div class="note-meta"><b>${esc(n.title)}</b> <span class="sn">${n.date ? esc(dateText(n.date)) + " · " : ""}${esc(langName(n.lang))}</span></div>${AHM_CONFIG.canEdit ? iconBtn("editnote", "pencil", "Edit note", `data-id="${n.id}"`, "sm") : ""}</div>${para(bodies[i])}</div>`,
      )
      .join("") || '<p class="sn">No notes yet.</p>') +
    editHint +
    `</div><div class="dock-foot">` +
    btns(...edit(["note", "Add note", "primary"])) +
    "</div>";
}
function closeDetail() {
  stopEditPlace();
  cur = null;
  AHM.state.set('selected', null);
  update(); // folds the details and removes the highlight of the row
  history.replaceState(null, "", location.pathname + location.search);
}
// ---- directions ----
const ptName = (p) =>
  p
    ? p.name || p.lat.toFixed(4) + ", " + p.lon.toFixed(4)
    : "—  choose on the map";
function renderRoute() {
  $("#rFrom").textContent = ptName(rt.a);
  $("#rTo").textContent = ptName(rt.b);
  $("#rInfo").textContent = rtInfo;
}
function markers() {
  AHM.map.setRouteMarkers(rt);
}
function setPt(k, p) {
  rt[k] = p;
  markers();
  tab("route");
  if (rt.a && rt.b) doRoute();
  else {
    rtInfo =
      "Now choose the " +
      (k === "a" ? "destination" : "start") +
      " on the map.";
    renderRoute();
  }
}
function doRoute() {
  rtInfo = "Routing…";
  renderRoute();
  route(rt.a, rt.b)
    .then((r) => {
      AHM.map.setRoute(r.geometry);
      rtInfo = `${r.km.toFixed(1)} km · ${Math.round(r.min)} min by car`;
      renderRoute();
      AHM.map.fitRoute(r.geometry.coordinates);
    })
    .catch((e) => {
      rtInfo = "No route found (" + e.message + ")";
      renderRoute();
    });
}
$("#rSwap").onclick = () => {
  [rt.a, rt.b] = [rt.b, rt.a];
  markers();
  rt.a && rt.b ? doRoute() : renderRoute();
};
$("#rClear").onclick = () => {
  rt = { a: null, b: null };
  rtInfo = "";
  markers();
  AHM.map.setRoute(null);
  renderRoute();
};
// ---- actions from the point card and the detail view ----
function act(a, p) {
  if (a === "from") setPt("a", p);
  else if (a === "to") setPt("b", p);
  else if (a === "add") openDlg("place", p);
  else if (a === "note") openDlg("note", p);
  else if (a === "editplace") editPlace(p);
}
$("#detail").addEventListener("click", (e) => {
  const b = e.target.closest("[data-act]"), // an icon button: the click lands on its svg
    a = b && b.dataset.act;
  if (!a) return;
  if (a === "canceledit") show(cur.id);
  else if (a === "saveedit") saveEditPlace();
  else if (a === "closedetail") closeDetail();
  else if (a === "editnote")
    openDlg(
      "note",
      cur,
      notes.find((n) => n.id === b.dataset.id),
    );
  else if (cur)
    act(
      a,
      a === "note" || a === "editplace"
        ? cur
        : { lon: cur.lon, lat: cur.lat, name: label(cur, $("#lang").value) },
    );
});
// ---- search: Enter looks for other places in the geocoder, Esc clears ----
$("#q").addEventListener("input", () => {
  if ($("#q").value === "") $("#geo").innerHTML = ""; // the ✕ (or Esc) also drops the other-places results
  // searching is navigation too: go back to the results (and to the Explore tab)
  if (cur && !editMk) closeDetail();
  if (curTab !== "explore" && $("#q").value) tab("explore");
});
$("#q").addEventListener("keydown", (e) => {
  // Enter searches other places (OpenStreetMap); typing never does (public-server policy)
  if (e.key === "Enter") doGeo();
  if (e.key === "Escape") {
    $("#q").value = "";
    $("#geo").innerHTML = "";
    searchFieldSync();
    update();
  }
});
document.addEventListener("keydown", (e) => {
  if (
    e.key === "Escape" &&
    cur &&
    !$("#dlg").open &&
    !/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName)
  )
    closeDetail();
});
const OSM_CREDIT =
  '<div class="sn">Search: Nominatim · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a></div>';
function doGeo() {
  const q = $("#q").value.trim();
  if (q.length < 3) return;
  $("#geo").innerHTML = '<div class="sn">Searching…</div>';
  geocode(q, $("#lang").value || "en")
    .then((rs) => {
      geoRes = rs;
      $("#geo").innerHTML =
        (rs.length
          ? '<div class="label">Other places (OpenStreetMap)</div><ul>' +
            rs.map((r, i) => `<li data-i="${i}">${esc(r.name)}</li>`).join("") +
            "</ul>"
          : '<div class="sn">No other places found.</div>') + OSM_CREDIT;
    })
    .catch(() => {
      $("#geo").innerHTML =
        '<div class="sn">The search service is not available right now.</div>';
    });
}
$("#geo").addEventListener("click", (e) => {
  const li = e.target.closest("li");
  if (!li) return;
  const r = geoRes[li.dataset.i];
  AHM.map.focusPoint(r, 11);
  pickPoint({ lon: r.lon, lat: r.lat, name: r.name.split(",")[0] });
});
// ---- add place / add note / edit place ----
placeFormWire($("#dPlaceForm"));
placeFormWire($("#detail"));
dfWire($("#nDate"));

function openDlg(mode, p, note) {
  dlg = { mode, p, note };
  $("#dErr").textContent = "";
  $("#dPlace").style.display = mode === "place" ? "" : "none";
  $("#dTitle").textContent =
    mode === "place"
      ? "New place"
      : (note ? "Edit note" : "New note") + " · " + label(p, $("#lang").value);
  if (mode === "place")
    $("#dPlaceForm").innerHTML = placeFormHTML({
      lat: p.lat.toFixed(6),
      lon: p.lon.toFixed(6),
      type: "settlement",
      date_from: null,
      date_to: null,
      height_m: null,
      names: [{ lang: $("#lang").value || "en", name: p.name || "" }],
    });
  lyDlgLayers(mode, p, note);
  $("#nLang").innerHTML = langOptions(note ? note.lang : $("#lang").value || "en");
  $("#nDate").innerHTML = dfHTML("n-date", note ? note.date : null);
  $("#nTitle").value = note ? note.title : "";
  $("#nText").value = note ? (noteText[note.id] || note.text).trim() : "";
  $("#dlg").showModal();
}
$("#dCancel").onclick = () => $("#dlg").close();

// Sends one change to the server, reloads the data and shows the place.
async function saveAndShow(body) {
  const r = await fetch(AHM_CONFIG.url.save, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Error("Save failed: " + (j.error || r.status));
  const [p, n] = await Promise.all([loadPlaces(), loadNotesIndex()]);
  setData(p, n);
  await lyReload(); // layers changed too (a new place may have joined some)
  show(j.id);
}
$("#dSave").onclick = async () => {
  if (dlg.mode === "lnote") return lyDlgSave(); // a note of a layer
  const body = {},
    text = $("#nText").value.trim(),
    tagged = lyDlgChecked();
  try {
    if (dlg.mode === "place") {
      body.place = readPlaceForm($("#dPlaceForm"));
      if (tagged.length) body.layer_ids = tagged;
    } else body.place_id = dlg.p.id;
    if (text) {
      if (!$("#nTitle").value.trim()) throw Error("A note needs a title.");
      body.note = {
        id: dlg.note && dlg.note.id,
        lang: $("#nLang").value,
        title: $("#nTitle").value.trim(),
        date: dfRead($("#nDate .df"), "Note date"), // optional: null when the date is unknown
        text,
      };
      if (tagged.length || dlg.mode === "note") body.note.layers = tagged;
    } else if (dlg.mode === "note") throw Error("Write the note text.");
    await saveAndShow(body);
    $("#dlg").close();
    AHM.map.setPick(null);
    $("#pick").innerHTML = "";
  } catch (e) {
    $("#dErr").textContent = e.message;
  }
};

// ---- edit a place in the sidebar: drag the pin (or type the coordinates), change names, type, dates ----
function editPlace(p) {
  stopEditPlace();
  cur = p;
  AHM.state.set('selected', p.id);
  placeDetail();
  $("#detail").innerHTML =
    '<div class="dock-head"><h3 class="dock-title">Edit place</h3></div>' +
    '<div class="dock-body"><div class="sn">Drag the red pin on the map to move the place, or type the coordinates.</div>' +
    placeFormHTML(p) +
    '</div><div class="dock-foot"><div id="pfErr" class="sn err-line"></div><button class="primary" data-act="saveedit">Save</button><button data-act="canceledit">Cancel</button></div>';
  AHM.map.hidePlace(p.id); // hide the old symbol so the pin does not leave a ghost behind
  editMk = AHM.map.editPin(p, (l) => {
    $("#detail .pf-lat").value = l.lat.toFixed(6);
    $("#detail .pf-lon").value = l.lon.toFixed(6);
  });
}
function stopEditPlace() {
  if (!editMk) return;
  editMk.remove();
  editMk = null;
  AHM.map.hidePlace(null);
}
async function saveEditPlace() {
  const err = $("#pfErr");
  try {
    const v = readPlaceForm($("#detail"));
    err.textContent = "Saving…";
    await saveAndShow({ place_update: { id: cur.id, ...v } });
  } catch (e) {
    err.textContent = e.message;
  }
}
$("#detail").addEventListener("input", (e) => {
  // typing coordinates moves the pin
  if (!editMk || !e.target.matches(".pf-lat, .pf-lon")) return;
  const lat = parseFloat($("#detail .pf-lat").value),
    lon = parseFloat($("#detail .pf-lon").value);
  if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180)
    editMk.setPosition({ lon, lat });
});
// ---- languages: the dictionary every name and note language is chosen from (only administrators add or edit) ----
// One table-like layout without lines: [button] [code] [English name] [name in the language itself].
// Rows: pencil = edit. The last row is the add/edit row (plus = add, pencil = editing); Save and Cancel sit below it.
let lgEditing = null; // the code being edited, or null = adding
let lgOpen = false; // the form is shown only while it is open
function renderLangs() {
  $("#langList").innerHTML =
    languages
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(
        (l) =>
          `<li class="tr tr-cat${l.code === lgEditing ? " on" : ""}"><span class="tc-btn">${
            AHM_CONFIG.canLanguage
              ? `<button type="button" class="icon-btn" data-lgedit="${esc(l.code)}" title="Edit ${esc(l.name)}" aria-label="Edit ${esc(l.name)}">${ICON_PENCIL}</button>`
              : ""
          }</span><span class="tc-name"><b>${esc(l.name)}</b> <span class="sn">[${esc(l.code)}]</span></span><span class="sn">${esc(l.native || "")}</span></li>`,
      )
      .join("") || '<li class="sn">No languages yet.</li>';
}
// Save stays off until the code and the English name are filled.
const lgValidate = () => {
  const b = $("#lgAdd");
  if (b) b.disabled = !($("#lgCode").value.trim() && $("#lgName").value.trim());
};
// The form is shown only while it is open: "+ Add language" opens it empty, the pencil of a row opens it filled.
function lgRenderAdmin() {
  $("#langAdmin").innerHTML = !AHM_CONFIG.canLanguage
    ? '<div class="sn">Only administrators can add a language. Missing one? Ask an administrator.</div>'
    : lgOpen
      ? '<div class="tr tr-edit"><span class="tc-btn"><span class="tc-mode" id="lgMode"></span></span>' +
        '<input id="lgCode" maxlength="8" placeholder="code, e.g. hy" aria-label="Language code">' +
        '<input id="lgName" placeholder="Name in English" aria-label="Name in English">' +
        '<input id="lgNative" placeholder="Name in the language" aria-label="Name in the language itself"></div>' +
        '<div class="btn-pair"><button id="lgAdd" class="primary" disabled>Save</button><button id="lgCancel">Cancel</button></div><div id="lgErr" class="sn err-line"></div>'
      : '<button id="lgNew" class="wide">+ Add language</button>';
}
function lgFill(l) {
  lgOpen = true;
  lgEditing = l ? l.code : null;
  lgRenderAdmin();
  renderLangs();
  $("#lgCode").value = l ? l.code : "";
  $("#lgCode").readOnly = !!l; // the code is what names and notes refer to, so it never changes
  $("#lgName").value = l ? l.name : "";
  $("#lgNative").value = l ? l.native || "" : "";
  $("#lgMode").innerHTML = l ? ICON_PENCIL : ICON_PLUS;
  $("#lgErr").textContent = "";
  lgValidate();
}
function lgClose() {
  lgOpen = false;
  lgEditing = null;
  lgRenderAdmin();
  renderLangs();
}
lgRenderAdmin();
$("#langAdmin").addEventListener("input", lgValidate);
$("#langList").addEventListener("click", (e) => {
  const b = e.target.closest("[data-lgedit]");
  if (!b) return;
  lgFill(languages.find((l) => l.code === b.dataset.lgedit));
  $("#lgName").focus();
});
$("#langAdmin").addEventListener("click", async (e) => {
  if (e.target.id === "lgNew") {
    lgFill(null);
    return $("#lgCode").focus();
  }
  if (e.target.id === "lgCancel") return lgClose();
  if (e.target.id !== "lgAdd") return;
  const err = $("#lgErr");
  try {
    err.textContent = "Saving…";
    const r = await fetch(AHM_CONFIG.url.languageSave, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: $("#lgCode").value,
        name: $("#lgName").value,
        native: $("#lgNative").value,
        ...(lgEditing ? { edit: true } : {}),
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Error("Save failed: " + (j.error || r.status));
    languages = await loadLanguages();
    fillLangs();
    lgClose();
  } catch (x) {
    err.textContent = x.message;
  }
});
// ---- events from the map (INTERFACES.md, I-2) ----
AHM.on("place:click", ({ id }) => (lyState.editing ? lyToggleMember(id) : show(id)));
// the map moves by itself (AHM.map.focusPlace, the move the list row uses); the sidebar only opens the place
AHM.on("place:dblclick", ({ id }) => {
  if (!lyState.editing && (!cur || cur.id !== id)) show(id);
});
AHM.on("map:show-controls", () => tab("maps"));
AHM.on("map:click", (p) => !lyState.editing && pickPoint(p)); // choosing places for a layer: empty clicks do nothing
// ---- start ----
renderRoute();
Promise.all([loadPlaces(), loadNotesIndex(), loadLanguages(), loadLayers(), loadLayerNotes(), loadCategories()])
  .then(([p, n, l, ly, ln, cs]) => {
    languages = l;
    renderLangs();
    setData(p, n);
    lySet(ly, ln, cs);
    update();
    if (location.hash.startsWith("#place-")) show(location.hash.slice(7));
    else if (location.hash.startsWith("#layer-")) lyOpen(location.hash.slice(7));
  })
  .catch(
    (e) =>
      ($("#count").textContent = "Could not load data (" + e.message + ")."),
  );
