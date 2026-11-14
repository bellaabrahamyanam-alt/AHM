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
  shRenderView(); // and the border card to the Borders tab
  rtRenderView(); // and the route card to the Routes tab
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
  $("#dock").hidden = $("#detail").hidden && $("#lyDetail").hidden && $("#shDetail").hidden && $("#rtDetail").hidden;
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
// ---- resizable details dock: drag its top edge, double-click resets, Up/Down arrows nudge; the height is remembered ----
const dockEl = $("#dock"),
  dockGrip = document.createElement("div"),
  dockMax = () => Math.max(160, $(".stack").clientHeight - 120); // always leave 120px of the list
dockGrip.id = "dockResizer";
dockGrip.tabIndex = 0;
dockGrip.setAttribute("role", "separator");
dockGrip.setAttribute("aria-orientation", "horizontal");
dockGrip.setAttribute("aria-label", "Resize details");
dockGrip.title = "Drag to resize (double-click to reset)";
dockEl.prepend(dockGrip);
function setDock(h, save) {
  h = clamp(h, 120, dockMax());
  dockEl.style.setProperty("--dock-h", h + "px");
  if (save)
    try {
      localStorage.setItem("ahm-dock-h", h);
    } catch (e) {}
  return h;
}
try {
  const v = +localStorage.getItem("ahm-dock-h");
  if (v) setDock(v);
} catch (e) {}
let dockDrag = null;
dockGrip.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  dockGrip.setPointerCapture(e.pointerId);
  dockDrag = { y: e.clientY, h: dockEl.offsetHeight };
  document.body.classList.add("dock-resizing");
});
dockGrip.addEventListener("pointermove", (e) => {
  if (dockDrag) setDock(dockDrag.h + dockDrag.y - e.clientY); // dragging up makes the dock taller
});
const dockDragEnd = () => {
  if (!dockDrag) return;
  dockDrag = null;
  document.body.classList.remove("dock-resizing");
  setDock(dockEl.offsetHeight, true);
};
dockGrip.addEventListener("pointerup", dockDragEnd);
dockGrip.addEventListener("pointercancel", dockDragEnd);
dockGrip.addEventListener("dblclick", () => {
  dockEl.style.removeProperty("--dock-h");
  try {
    localStorage.removeItem("ahm-dock-h");
  } catch (e) {}
});
dockGrip.addEventListener("keydown", (e) => {
  const d = { ArrowUp: 24, ArrowDown: -24 }[e.key];
  if (!d) return;
  e.preventDefault();
  setDock(dockEl.offsetHeight + d, true);
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
  const c = {},
    l = $("#lang").value;
  places.forEach((p) => (c[p.type] = (c[p.type] || 0) + 1));
  $("#typeChips").innerHTML = Object.keys(c)
    .sort((a, b) => typeLabel(a, l).localeCompare(typeLabel(b, l)))
    .map(
      (t) =>
        `<button class="chip${state.types.has(t) ? " on" : ""}" data-t="${esc(t)}">${typeIcon(t)}${esc(typeLabel(t, l))} <span>${c[t]}</span></button>`,
    )
    .join("");
  renderTypes(); // the list of the Place types fold shows the same names and counts
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
    `<li data-id="${p.id}"><div class="t"><span class="tmark" title="${esc(typeLabel(p.type, l))}">${typeIcon(p.type)}</span><b>${esc(label(p, l))}</b></div>` +
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
        type: typeLabel(p.type, l),
        type_code: p.type,
        dates: placeWhen(p),
        halo: lyHalo(p.id),
      },
    })),
  };
  AHM.map.setFeatures(fc);
  shRefresh(); // the borders follow the same filters
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
const pointActions = (p) => [
  ...(p && p.shapes && p.shapes.length ? [{ id: "border", icon: "area", label: "Open border: " + shapeName(shapeById(p.shapes[0].id), $("#lang").value) }] : []),
  ...(AHM_CONFIG.canEdit ? [{ id: "add", icon: "plus", label: "Add place here" }] : []),
  { id: "from", icon: "route-from", label: "Route from here" },
  { id: "to", icon: "route-to", label: "Route to here" },
];
let pickBusy = false; // "add" opened the dialog: the grey pin stays until the dialog closes
function pickPoint(p) {
  const hint = AHM_CONFIG.canEdit ? "" : AHM_CONFIG.loggedIn ? "Adding places is limited to administrators." : "Log in to add places.";
  AHM.map.showMenu(p, pointActions(p), p.name || "Selected point", hint); // first: it closes the previous menu, which clears the old pin
  pick = p;
  AHM.map.setPick(p);
}
AHM.on("map:menu", ({ action }) => {
  if (!pick) return;
  if (action === "border") {
    const id = pick.shapes[0].id;
    AHM.map.hideMenu();
    return shOpen(id);
  }
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
  `<div class="dock-head"><span class="tmark" title="${esc(typeLabel(p.type, l))}">${typeIcon(p.type)}</span>` +
  `<h3 class="dock-title">${esc(label(p, l))}</h3><span class="dock-btns">` +
  (AHM_CONFIG.canEdit ? iconBtn("editplace", "pencil", "Edit place") : "") +
  iconBtn("from", "route-from", "Route from here") +
  iconBtn("to", "route-to", "Route to here") +
  iconBtn("dockmax", "chevron-down", dockFull ? "Smaller panel" : "Larger panel") +
  iconBtn("closedetail", "close", "Close") +
  "</span></div>";
// The dock can take the whole panel (hiding the list) while a long note is read; the choice is remembered.
// (dockFull, not dockMax: dockMax() is the height limit of the drag-handle above.)
let dockFull = false;
try {
  dockFull = localStorage.getItem("ahm-dock-max") === "1";
} catch (e) {}
$("#dock").classList.toggle("max", dockFull);
function setDockFull(v) {
  dockFull = v;
  $("#dock").classList.toggle("max", v);
  try {
    localStorage.setItem("ahm-dock-max", v ? "1" : "0");
  } catch (e) {}
  const b = $("#detail [data-act=dockmax]");
  if (b) {
    b.title = v ? "Smaller panel" : "Larger panel";
    b.setAttribute("aria-label", b.title);
    requestAnimationFrame(fitNotes);
  }
}
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
  const oldBody = $("#detail .dock-body"),
    keepScroll = oldBody && shownId === p.id ? oldBody.scrollTop : 0; // the same place redrawn: stay where the reader was
  $("#detail").innerHTML = placeHeadHTML(p, l); // the new header at once: no frame shows the previous place
  placeDetail();
  history.replaceState(null, "", "#place-" + id);
  const bodies = await Promise.all(
    ns.map((n) => loadNoteBody(n).catch(() => n.text)),
  );
  if (seq !== showSeq) return; // another place was chosen while the notes were loading
  noteText = {};
  ns.forEach((n, i) => (noteText[n.id] = bodies[i]));
  if (shownId !== p.id) noteOpen.clear(); // another place: its notes start folded
  shownId = p.id;
  $("#detail").innerHTML =
    placeHeadHTML(p, l) +
    `<div class="dock-body"><p class="names">` +
    p.names
      .filter((n) => !l || n.lang === l)
      .map((n) => `<span lang="${esc(n.lang)}">${esc(n.name)}</span> <span class="sn">[${esc(n.lang)}]</span>`)
      .join(" · ") +
    "</p>" +
    lyPlaceHTML(p) +
    rtPlaceHTML(p) +
    lyScopeHTML(scope, ns.length, inLang.length) +
    (ns.length > 1
      ? `<div class="note-tools" hidden><span class="sn">${ns.length} notes</span><button type="button" class="note-all" data-note-all></button></div>`
      : "") +
    (ns.map((n, i) => noteHTML(n, bodies[i])).join("") || '<p class="sn">No notes yet.</p>') +
    editHint +
    `</div><div class="dock-foot">` +
    btns(...edit(["note", "Add note", "primary"])) +
    "</div>";
  fitNotes();
  const body = $("#detail .dock-body");
  if (body && keepScroll) body.scrollTop = keepScroll;
}
// ---- long notes: a folded preview with a "more…" toggle, so one long note never buries the rest of the place ----
const NOTE_LINES = 6; // lines of a folded note
const noteOpen = new Set(); // ids of long notes the reader has opened; kept while the panel is redrawn
let shownId = null; // the place whose details are drawn
// Paragraphs are separated by a blank line; a single line break inside one is kept.
const para = (t) =>
  String(t)
    .trim()
    .split(/\n\s*\n/)
    .filter((x) => x.trim())
    .map((x) => "<p>" + esc(x.trim()).replace(/\n/g, "<br>") + "</p>")
    .join("");
const noteHTML = (n, text) =>
  `<div class="note" data-nid="${esc(n.id)}" lang="${esc(n.lang)}"><div class="note-head"><div class="note-meta"><b>${esc(n.title)}</b> <span class="sn">${n.date ? esc(dateText(n.date)) + " · " : ""}${esc(langName(n.lang))}</span></div>${AHM_CONFIG.canEdit ? iconBtn("editnote", "pencil", "Edit note", `data-id="${esc(n.id)}"`, "sm") : ""}</div><div class="note-body" id="nb-${esc(n.id)}">${para(text)}</div><button type="button" class="note-more" hidden aria-expanded="false" aria-controls="nb-${esc(n.id)}" data-note-toggle></button></div>`;
const reduceMotion = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
const lineHeightOf = (el) => parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.45;
function noteLabels(note) {
  const open = noteOpen.has(note.dataset.nid),
    btn = note.querySelector(".note-more");
  btn.textContent = open ? "less" : "more…";
  btn.setAttribute("aria-expanded", String(open));
}
// Measure every note: only a note that is really longer than the fold gets the toggle (a short one is shown whole).
function fitNotes() {
  const root = $("#detail");
  if (!root) return;
  let longs = 0;
  root.querySelectorAll(".note").forEach((note) => {
    const body = note.querySelector(".note-body"),
      btn = note.querySelector(".note-more");
    if (!body || !btn) return;
    body.classList.remove("is-clamped");
    body.style.maxHeight = "";
    const long = body.scrollHeight > lineHeightOf(body) * (NOTE_LINES + 2); // folding must hide at least two lines to be worth a toggle
    note.classList.toggle("is-long", long);
    btn.hidden = !long;
    if (long) {
      longs++;
      body.classList.toggle("is-clamped", !noteOpen.has(note.dataset.nid));
      noteLabels(note);
    }
  });
  const tools = root.querySelector(".note-tools");
  if (tools) {
    tools.hidden = longs < 2;
    const all = tools.querySelector("[data-note-all]"),
      anyFolded = [...root.querySelectorAll(".note.is-long")].some((n) => !noteOpen.has(n.dataset.nid));
    all.textContent = anyFolded ? "Expand all" : "Collapse all";
  }
}
// Open or fold one note; animated unless the reader prefers less motion.
function setNote(note, open, animate = true) {
  const id = note.dataset.nid,
    body = note.querySelector(".note-body"),
    foldPx = Math.round(lineHeightOf(body) * NOTE_LINES);
  open ? noteOpen.add(id) : noteOpen.delete(id);
  noteLabels(note);
  const done = () => {
    body.classList.remove("anim");
    body.style.maxHeight = "";
    body.classList.toggle("is-clamped", !open);
  };
  if (!animate || reduceMotion()) return done();
  body.classList.add("anim", "is-clamped");
  if (open) {
    body.style.maxHeight = foldPx + "px";
    void body.offsetHeight; // start from the fold
    body.style.maxHeight = body.scrollHeight + "px";
  } else {
    body.classList.remove("is-clamped");
    body.style.maxHeight = body.scrollHeight + "px";
    body.classList.add("is-clamped");
    void body.offsetHeight;
    body.style.maxHeight = foldPx + "px";
    const scroller = $("#detail .dock-body");
    if (scroller && note.getBoundingClientRect().top < scroller.getBoundingClientRect().top)
      note.scrollIntoView({ block: "start", behavior: "smooth" }); // the head of a note folded from far below is brought back into view
  }
  let ended = false;
  const finish = () => (ended ? 0 : ((ended = true), done()));
  body.addEventListener("transitionend", finish, { once: true });
  setTimeout(finish, 400); // in case no transition event comes (display change, hidden tab)
}
$("#detail").addEventListener("click", (e) => {
  const t = e.target.closest("[data-note-toggle], [data-note-all]");
  if (!t) return;
  if (t.hasAttribute("data-note-all")) {
    const notesEl = [...$("#detail").querySelectorAll(".note.is-long")],
      open = notesEl.some((n) => !noteOpen.has(n.dataset.nid)); // any folded: open all; else fold all
    notesEl.forEach((n) => setNote(n, open));
    setTimeout(fitNotes, 420);
  } else {
    const note = t.closest(".note");
    setNote(note, !noteOpen.has(note.dataset.nid));
    setTimeout(fitNotes, 420); // refresh the "Expand all / Collapse all" label
  }
});
// A narrower or wider sidebar re-wraps the text: measure the notes again (only when the width really changed).
{
  let lastW = 0,
    raf = 0;
  new ResizeObserver(() => {
    const w = $("#detail").clientWidth;
    if (!w || w === lastW) return;
    lastW = w;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(fitNotes);
  }).observe($("#detail"));
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
  else if (a === "dockmax") setDockFull(!dockFull);
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
          `<li class="tr${l.code === lgEditing ? " on" : ""}"><span class="tc-btn">${
            AHM_CONFIG.canLanguage
              ? `<button type="button" class="icon-btn" data-lgedit="${esc(l.code)}" title="Edit ${esc(l.name)}" aria-label="Edit ${esc(l.name)}">${ICON_PENCIL}</button>`
              : ""
          }</span><b class="tc-code">${esc(l.code)}</b><span>${esc(l.name)}</span><span>${esc(l.native || "")}</span></li>`,
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
// ---- place types: the dictionary every place type is chosen from (only administrators add, change or remove) ----
// Same layout as languages: [buttons] [marker] [name] [code]. The form is shown only while it is open. The code of a
// new type is made by the server from its English name and never changes; places point to a type by that code.
let tyEditing = null; // the code being edited, or null = adding
let tyOpen = false;
const tyPoints = () => types.filter((t) => t.geometry === 'point');
function renderTypes() {
  const l = $("#lang").value,
    n = {};
  places.forEach((p) => (n[p.type] = (n[p.type] || 0) + 1));
  $("#typeList").innerHTML =
    tyPoints()
      .sort((a, b) => typeLabel(a.code, l).localeCompare(typeLabel(b.code, l)))
      .map(
        (t) =>
          `<li class="tr${t.code === tyEditing ? " on" : ""}"><span class="tc-btn">${
            AHM_CONFIG.canTypeAdmin
              ? `<button type="button" class="icon-btn" data-tyedit="${esc(t.code)}" title="Edit ${esc(typeLabel(t.code, l))}" aria-label="Edit ${esc(typeLabel(t.code, l))}">${ICON_PENCIL}</button>`
              : ""
          }</span><b class="tc-code">${typeIcon(t.code)}</b><span>${esc(typeLabel(t.code, l))}</span><span class="sn">${n[t.code] || 0}</span></li>`,
      )
      .join("") || '<li class="sn">No types yet.</li>';
}
const tyDraft = () => {
  const d = { symbol: $("#tySym").value, color: $("#tyColor").value, size: Number($("#tySize").value) };
  if (d.symbol === "custom") {
    d.path = $("#tyPath").value.trim();
    d.box = Number($("#tyBox").value);
  }
  return d;
};
// An SVG (a file the admin chose, or a whole <svg> pasted into the path box) becomes the path and the box of the symbol.
function tyUseSvg(text, from) {
  const r = svgToPath(text),
    msg = $("#tySvgMsg");
  if (!r.path) {
    msg.textContent =
      r.why === "transform"
        ? "This SVG moves or scales its shapes (transform), which is not supported. Export it again without transforms."
        : r.why === "origin"
          ? "The drawing area (viewBox) of this SVG does not start at 0 0, which is not supported. Export it again with a viewBox that starts at 0 0."
          : "Nothing to draw in this file. Use a simple one-colour SVG icon (paths, rectangles, circles).";
    return;
  }
  $("#tyPath").value = r.path;
  $("#tyBox").value = r.box;
  msg.textContent = from ? "Loaded " + from + "." : "SVG read.";
  tyValidate();
}
const tyNames = () =>
  [...$("#typeAdmin").querySelectorAll(".pf-name")]
    .map((r) => ({ lang: r.querySelector(".nl").value, name: r.querySelector(".nn").value.trim() }))
    .filter((x) => x.name);
// Save stays off until there is an English name (the code is made from it) when adding, or any name when editing.
const tyValidate = () => {
  if (!$("#tySym")) return; // the form is closed
  const b = $("#tyAdd");
  const custom = $("#tySym").value === "custom";
  $("#tyCustom").hidden = !custom;
  if (b) {
    const d = tyDraft();
    b.disabled =
      !(tyEditing ? tyNames().length : tyNames().some((x) => x.lang === "en")) ||
      (custom && !(/^\s*[Mm]/.test(d.path) && /^[MmLlHhVvCcSsQqTtAaZz0-9eE.,+\-\s]{2,20000}$/.test(d.path) && d.box >= 8 && d.box <= 2048));
  }
  const pv = $("#tyPrev");
  if (pv) pv.innerHTML = typeIcon(tyDraft()) + " " + esc($("#tySize").value);
};
function tyRenderAdmin(t) {
  const el = $("#typeAdmin");
  if (!AHM_CONFIG.canTypeAdmin) {
    el.innerHTML = '<div class="sn">Only administrators can add a type. Missing one? Ask an administrator.</div>';
    return;
  }
  if (!tyOpen) {
    el.innerHTML = '<button id="tyNew" class="wide">+ Add place type</button>';
    return;
  }
  const names = t && t.names.length ? t.names : [{ lang: "en", name: "" }],
    st = (t && t.style) || { symbol: "circle", size: 8 };
  el.innerHTML =
    `<div class="label">Names</div><div class="pf-names">${names.map((n) => pfRow(n)).join("")}</div>` +
    `<button type="button" class="pf-add">+ Add another name</button>` +
    `<div class="sn">${t ? "The code <b>" + esc(t.code) + "</b> never changes." : "The code is made from the English name."}</div>` +
    `<div class="label">Symbol</div><select id="tySym">${AHM.map
      .getSymbols()
      .map((y) => `<option value="${esc(y.name)}"${y.name === st.symbol ? " selected" : ""}>${esc(y.label)}</option>`)
      .join("")}<option value="custom"${st.symbol === "custom" ? " selected" : ""}>Custom (SVG path)…</option></select>` +
    `<div id="tyCustom" hidden><div class="sn">Choose an SVG icon file. It is drawn in the colour above. Simple one-colour icons work best (free ones: game-icons.net, lucide.dev).</div>` +
    `<input id="tyFile" type="file" accept=".svg,image/svg+xml" aria-label="SVG file"><div id="tySvgMsg" class="sn">${st.path ? "Current symbol kept; choose a file to replace it." : ""}</div>` +
    `<details><summary>Advanced: path and box</summary><textarea id="tyPath" rows="3" maxlength="60000" spellcheck="false" aria-label="SVG path">${esc(st.path || "")}</textarea>` +
    `<div class="label">Box</div><input id="tyBox" type="number" min="8" max="2048" step="1" value="${Number(st.box) || 24}" aria-label="Box size"></details></div>` +
    `<div class="label">Colour</div><input id="tyColor" type="color" value="${esc((t && t.color) || "#8d6e63").toLowerCase()}" aria-label="Colour">` +
    `<div class="label">Size</div><input id="tySize" type="range" min="4" max="14" step="0.5" value="${Number(st.size) || 8}" aria-label="Size"> <span id="tyPrev"></span>` +
    '<div class="btn-pair"><button id="tyAdd" class="primary" disabled>Save</button><button id="tyCancel">Cancel</button>' +
    (t ? '<button id="tyDel" title="Remove this type (only when no place uses it)">Remove</button>' : "") +
    '</div><div id="tyErr" class="sn err-line"></div>';
  tyValidate();
}
function tyFill(t) {
  tyOpen = true;
  tyEditing = t ? t.code : null;
  tyRenderAdmin(t);
  renderTypes();
}
function tyClose() {
  tyOpen = false;
  tyEditing = null;
  tyRenderAdmin();
  renderTypes();
}
// The dictionary changed (or was loaded): the map draws from it, the filters, lists and the place form follow.
function tySet(list) {
  types = list;
  AHM.map.setTypes(types);
  renderTypes();
  fillTypes();
  if (typeof update === "function") update();
}
async function tyPost(url, body) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Error("Save failed: " + (j.error || r.status));
  return j;
}
tyRenderAdmin();
placeFormWire($("#typeAdmin")); // the add / move up / remove buttons of the name rows
$("#typeAdmin").addEventListener("input", (e) => {
  if (e.target.id === "tyPath" && /<svg/i.test(e.target.value)) tyUseSvg(e.target.value);
  else tyValidate();
});
$("#typeAdmin").addEventListener("change", (e) => {
  const f = e.target.id === "tyFile" && e.target.files[0];
  if (f) f.text().then((t) => tyUseSvg(t, f.name));
});
$("#typeAdmin").addEventListener("change", tyValidate);
$("#typeAdmin").addEventListener("click", tyValidate);
$("#typeList").addEventListener("click", (e) => {
  const b = e.target.closest("[data-tyedit]");
  if (b) tyFill(types.find((t) => t.code === b.dataset.tyedit));
});
$("#typeAdmin").addEventListener("click", async (e) => {
  if (e.target.id === "tyNew") return tyFill(null);
  if (e.target.id === "tyCancel") return tyClose();
  const err = $("#tyErr");
  try {
    if (e.target.id === "tyDel") {
      if (!confirm("Remove the type “" + typeLabel(tyEditing, $("#lang").value) + "”?")) return;
      err.textContent = "Removing…";
      await tyPost(AHM_CONFIG.url.typeDelete, { code: tyEditing });
    } else if (e.target.id === "tyAdd") {
      err.textContent = "Saving…";
      const d = tyDraft();
      await tyPost(AHM_CONFIG.url.typeSave, {
        ...(tyEditing ? { code: tyEditing, edit: true } : {}),
        geometry: "point",
        names: tyNames(),
        color: d.color,
        style: { symbol: d.symbol, size: d.size, ...(d.symbol === "custom" ? { path: d.path, box: d.box } : {}) },
      });
    } else return;
    tySet(await loadTypes());
    tyClose();
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
AHM.on("map:click", (p) => {
  if (!lyState.editing) return pickPoint(p);
  if (p.shapes && p.shapes.length) lyToggleMember(p.shapes[0].id); // choosing members: a click inside a border picks it
});
// ---- start ----
renderRoute();
Promise.all([loadPlaces(), loadNotesIndex(), loadLanguages(), loadLayers(), loadLayerNotes(), loadCategories(), loadShapes(), loadTypes()])
  .then(([p, n, l, ly, ln, cs, sp, ty]) => {
    languages = l;
    renderLangs();
    types = ty;
    AHM.map.setTypes(types);
    renderTypes();
    setData(p, n);
    shSet(sp);
    lySet(ly, ln, cs);
    update();
    if (location.hash.startsWith("#place-")) show(location.hash.slice(7));
    else if (location.hash.startsWith("#layer-")) lyOpen(location.hash.slice(7));
    else if (location.hash.startsWith("#border-")) shOpen(location.hash.slice(8), true);
    else if (location.hash.startsWith("#route-")) rtOpen(location.hash.slice(7), true);
  })
  .catch(
    (e) =>
      ($("#count").textContent = "Could not load data (" + e.message + ")."),
  );
