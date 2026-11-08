// Tests of the sidebar domain (DOMAINS.md; owner: sidebar). Task 007 (tasks/007-sidebar-fixes.md): hover, text selection,
// flicker, empty forms, category rename. Tasks 012 and 014 add to this file.
// Browser tests: headless Chromium (Playwright) against the dev server on a throw-away copy of the data, map library replaced
// by a stand-in (same set-up as tests/js/browser.test.js). Skipped with --no-browser or when Playwright / Chromium is missing.
// All code that runs INSIDE the page is passed to Playwright as strings: tests/js/lint.test.js lints this file as Node code.
// TODO(request sidebar-to-shared-001): `scenario` and STUB are a private copy; use tests/js/lib/browser.js when it exists.
const { test, ok, eq } = require('./lib/harness');
const { start } = require('./lib/devserver');

const STUB = `(function(){
 const p=new Proxy(function(){},{get:(t,k)=>{ if(k==='then')return undefined;
  if(k==='on'||k==='once')return (ev,a,b)=>{const f=typeof a==='function'?a:b; if(ev==='load'||ev==='style.load'||ev==='idle')setTimeout(()=>f&&f({}),0); return p;};
  if(k==='getZoom')return()=>6; if(k==='getLayer'||k==='getSource')return()=>undefined; if(k==='queryRenderedFeatures')return()=>[];
  if(k==='getBounds')return()=>({getWest:()=>40,getEast:()=>48,getNorth:()=>42,getSouth:()=>36}); if(k==='getCanvas')return()=>({style:{}});
  if(k==='getStyle')return()=>({layers:[],sources:{}}); if(k==='isStyleLoaded')return()=>true; if(k==='getLngLat')return()=>({lat:40,lng:44});
  return ()=>p; }, apply:()=>p, construct:()=>p});
 window.maplibregl={Map:function(){return p;},Marker:function(){return p;},Popup:function(){return p;},NavigationControl:function(){return {};},LngLatBounds:function(){return {extend(){return this;},isEmpty(){return true;}};}};
})();`;

function playwright() {
  for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) {
    try {
      return require(p);
    } catch (e) {
      /* next */
    }
  }
  return null;
}

/** runs fn(page, server) on a fresh server and page; collects page errors and fails if there are any */
function scenario(name, fn) {
  test(name, async () => {
    const pw = playwright();
    if (process.env.AHM_NO_BROWSER || !pw) return console.log('    (browser tests skipped)');
    const S = await start();
    let browser;
    try {
      browser = await pw.chromium.launch();
    } catch (e) {
      await S.stop();
      return console.log('    (Chromium not available: skipped)');
    }
    const pg = await browser.newPage();
    pg.setDefaultTimeout(8000);
    const errs = [];
    pg.on('pageerror', (e) => errs.push('pageerror ' + e.message));
    pg.on('console', (m) => {
      if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console ' + m.text());
    });
    pg.on('dialog', (d) => d.accept());
    await pg.route('**/maplibre-gl*.js', (r) => r.fulfill({ contentType: 'text/javascript', body: '/* stand-in */' }));
    await pg.route((u) => !u.toString().startsWith(S.base) && !/maplibre-gl/.test(u.toString()), (r) => r.abort());
    await pg.addInitScript(STUB);
    try {
      await fn(pg, S);
      eq([], errs, 'page errors');
    } finally {
      await browser.close();
      await S.stop();
    }
  });
}

// ---- small helpers (page code is always a string) ----
const frames = (pg) => pg.evaluate('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))');
const countOf = (pg, sel) => pg.locator(sel).count();
const dialogClosed = (pg) => pg.waitForFunction("!document.querySelector('#dlg').open");
const park = async (pg) => {
  await pg.mouse.move(900, 600); // over the map, away from the panel
  await frames(pg);
};

/** loads the page (no transitions, so computed styles are final at once) and waits for the list */
async function boot(pg, S) {
  await pg.goto(S.base + '/index.html');
  await pg.waitForSelector('#list li[data-id]');
  await pg.addStyleTag({ content: '*,*::before,*::after{transition:none !important;animation:none !important}' });
}

/** waits (2.5 s) until sel is visible / hidden (hidden also = not in the page); a miss fails with msg */
async function expectVisible(pg, sel, want, msg) {
  try {
    await pg.waitForSelector(sel, { state: want ? 'visible' : 'hidden', timeout: 2500 });
  } catch (e) {
    ok(false, msg + ' [' + sel + ' should be ' + (want ? 'visible' : 'hidden') + ']');
  }
}

/** two places made through the sidebar's own dialogs: Noteville (2 notes) and Quietown (1 note); then a clean reload */
async function seedPlaces(pg, S) {
  await boot(pg, S);
  const plan = [
    ['Noteville', 44.9, 40.4, ['First note', 'Second note']],
    ['Quietown', 44.6, 40.1, ['Hush note']],
  ];
  for (const [name, lon, lat, titles] of plan) {
    await pg.evaluate(`openDlg('place', { lon: ${lon}, lat: ${lat}, name: ${JSON.stringify(name)} })`);
    await pg.fill('#nTitle', titles[0]);
    await pg.fill('#nText', 'Text of ' + titles[0] + '.');
    await pg.click('#dSave');
    await dialogClosed(pg);
    for (const t of titles.slice(1)) {
      await pg.evaluate(`openDlg('note', places.find((p) => p.names.some((n) => n.name === ${JSON.stringify(name)})))`);
      await pg.fill('#nTitle', t);
      await pg.fill('#nText', 'Text of ' + t + '.');
      await pg.click('#dSave');
      await dialogClosed(pg);
    }
  }
  await pg.evaluate("history.replaceState(null, '', location.pathname)"); // do not reopen the last place after the reload
  await boot(pg, S);
}

// ---- hover probe: the computed look of every observed element, before and while another element is hovered ----
const STYLE_PROPS = ['color', 'backgroundColor', 'borderTopColor', 'borderBottomColor', 'boxShadow', 'textDecorationLine', 'opacity', 'fontWeight'];
const PROBE = `(() => {
  const props = ${JSON.stringify(STYLE_PROPS)};
  window.__sig = (e) => { const s = getComputedStyle(e); return props.map((p) => s[p]).join('|'); };
  window.__desc = (e) => e.tagName + (e.className ? '.' + String(e.className).split(' ')[0] : '') + ' "' + (e.textContent || '').trim().slice(0, 18) + '"';
  window.__watch = (observed) => {
    window.__els = [...document.querySelectorAll(observed)].filter((e) => { const r = e.getClientRects()[0]; return r && r.width > 0 && r.height > 0; });
    window.__base = window.__els.map(window.__sig);
    return window.__els.length;
  };
  window.__aim = (i) => {
    const e = window.__els[i];
    e.scrollIntoView({ block: 'nearest' });
    const r = e.getClientRects()[0];
    return [r.x + r.width / 2, r.y + r.height / 2];
  };
  window.__leaks = (i) => {
    const t = window.__els[i];
    if (!t.matches(':hover')) return null;
    const out = [];
    window.__els.forEach((e, j) => {
      if (j === i || t.contains(e) || e.contains(t)) return; // the element itself, what it contains and what contains it may change
      if (window.__sig(e) !== window.__base[j]) out.push(window.__desc(e));
    });
    return out;
  };
})()`;

/**
 * Hovers each element matched by `observed` once (the mouse parked away for the baseline) and lists the hovers that also
 * restyled an element that is neither the hovered one, nor inside it, nor around it. [] = every hover changes only its own element.
 */
async function hoverLeaks(pg, observed) {
  await pg.evaluate(PROBE);
  await park(pg);
  const n = await pg.evaluate(`window.__watch(${JSON.stringify(observed)})`);
  ok(n >= 8, 'found elements to hover: ' + n);
  const bad = [];
  let missed = 0;
  for (let i = 0; i < n; i++) {
    const [x, y] = await pg.evaluate(`window.__aim(${i})`);
    await pg.mouse.move(x, y);
    await frames(pg);
    const leaks = await pg.evaluate(`window.__leaks(${i})`);
    if (leaks === null) missed++;
    else if (leaks.length) bad.push((await pg.evaluate(`window.__desc(window.__els[${i}])`)) + ' also restyles ' + [...new Set(leaks)].slice(0, 3).join(', '));
  }
  ok(missed <= n / 4, 'the pointer could not be put over ' + missed + ' of ' + n + ' elements');
  return bad;
}

// ---- 1. hover (acceptance 1) ----
scenario('sidebar: hovering one note, title or button of a place changes only that element', async (pg, S) => {
  await seedPlaces(pg, S);
  await pg.locator('#list li[data-id]', { hasText: 'Noteville' }).first().click();
  await pg.waitForFunction("document.querySelector('#detail').textContent.includes('Second note')");
  ok((await countOf(pg, '#detail .note')) === 2, 'the place shows its 2 notes');
  const bad = await hoverLeaks(pg, '#detail .note, #detail .note b, #detail p, #detail button, #list li[data-id], #list li[data-id] b');
  ok(bad.length === 0, bad.length + ' hover(s) restyle other elements: ' + bad.slice(0, 3).join('; '));
});

scenario('sidebar: hovering one note, title, row or button of a layer changes only that element; an open button differs from hover', async (pg, S) => {
  await boot(pg, S);
  await pg.evaluate('lyOpen(layers[0].id)');
  await pg.waitForSelector('#lyDetail [data-lyact=addnote]');
  for (const t of ['Layer note one', 'Layer note two']) {
    await pg.click('#lyDetail [data-lyact=addnote]');
    await pg.fill('#nTitle', t);
    await pg.fill('#nText', 'Text of ' + t + '.');
    await pg.click('#dSave');
    await dialogClosed(pg);
    await pg.waitForSelector('#lyDetail .ly-note:has-text("' + t + '")');
  }
  await pg.click('#lyDetail [data-lyact=only]'); // "Only this layer" is now in its open (on) state
  await pg.waitForSelector('#lyDetail button.on');
  // an open button looks different from a hovered one, and hovering another button never changes it
  await park(pg);
  const bg = (sel) => pg.evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(sel)})).backgroundColor`);
  const onBefore = await bg('#lyDetail button.on');
  await pg.hover('#lyDetail [data-lyact=fit]');
  await frames(pg);
  const hovered = await bg('#lyDetail [data-lyact=fit]');
  ok(onBefore !== hovered, 'the open button and a hovered button look different: ' + onBefore + ' / ' + hovered);
  await pg.hover('#lyDetail [data-lyact=editlayer]');
  await frames(pg);
  eq(onBefore, await bg('#lyDetail button.on'), 'hovering "Edit" must not change the open button');
  const bad = await hoverLeaks(
    pg,
    '#lyDetail .ly-note, #lyDetail .ly-note b, #lyDetail p, #lyDetail button, #lyDetail .ly-members li, #lyDetail .ly-members li b, #lyList > li[data-lid], #lyList > li[data-lid] b, #lyList > li[data-lid] button'
  );
  ok(bad.length === 0, bad.length + ' hover(s) restyle other elements: ' + bad.slice(0, 3).join('; '));
});

// ---- 2. no text selection on double click (acceptance 2) ----
scenario('sidebar: a double click on a place or layer row selects no text, dragging still does', async (pg, S) => {
  await boot(pg, S);
  const selected = () => pg.evaluate('String(getSelection())');
  const clear = () => pg.evaluate('getSelection().removeAllRanges()');
  // a place name
  await pg.locator('#list li[data-id] b').first().dblclick();
  eq('', await selected(), 'no text is selected after a double click on a place name');
  ok((await countOf(pg, '#list li.on')) === 1, 'the double click still opens the place');
  // a line of a place row (date or text hit)
  await pg.evaluate('closeDetail()');
  await clear();
  const line = pg.locator('#list li[data-id] .sn').first();
  if (await line.count()) {
    await line.dblclick({ position: { x: 6, y: 6 } });
    eq('', await selected(), 'no text is selected after a double click on the date line of a place row');
  }
  // dragging over a name still selects text
  await pg.evaluate('closeDetail()');
  await clear();
  const box = await pg.locator('#list li[data-id]:not(.on) b').nth(1).boundingBox();
  ok(box && box.width > 8, 'a place name to drag over');
  await pg.mouse.move(box.x + 2, box.y + box.height / 2);
  await pg.mouse.down();
  await pg.mouse.move(box.x + box.width - 2, box.y + box.height / 2, { steps: 6 });
  await pg.mouse.up();
  ok((await selected()).length > 0, 'dragging the mouse over a place name still selects its text');
  await pg.evaluate('closeDetail()');
  await clear();
  // a layer row
  await pg.click('[data-tab=layers]');
  await pg.locator('#lyList li[data-lid] b').first().dblclick();
  eq('', await selected(), 'no text is selected after a double click on a layer row');
});

// ---- 3. no flicker (acceptance 3) ----
const OBSERVE = `(() => {
  const d = document.querySelector('#detail');
  window.__seen = [];
  new MutationObserver(() => {
    window.__seen.push({ shown: !d.hidden && !!d.closest('#list'), text: d.textContent });
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'class'] });
})()`;

scenario('sidebar: after a click on another place no frame shows the previous place in the details', async (pg, S) => {
  await seedPlaces(pg, S);
  await pg.locator('#list li[data-id]', { hasText: 'Noteville' }).first().click();
  await pg.waitForFunction("document.querySelector('#detail').textContent.includes('Second note')");
  await pg.evaluate(OBSERVE);
  await pg.locator('#list li[data-id]', { hasText: 'Quietown' }).first().click();
  await pg.waitForFunction("!document.querySelector('#detail').hidden && document.querySelector('#detail').textContent.includes('Hush note')");
  await frames(pg);
  const states = await pg.evaluate('window.__seen');
  ok(states.length > 0, 'the page changed after the click');
  const stale = states.filter((s) => s.shown && s.text.includes('Noteville'));
  ok(stale.length === 0, stale.length + ' of ' + states.length + ' states after the click show the details of the previous place (Noteville) in the list');
  ok(states[states.length - 1].text.includes('Quietown'), 'the last state shows the new place');
  ok(!states[states.length - 1].text.includes('Noteville'), 'the last state does not show the old place');
});

// ---- 4. empty forms (acceptance 4) ----
const ADD_LANG = '#more-lang button:has-text("Add language")';

scenario('sidebar: the language form opens on "+ Add language", Save needs a valid input, Cancel closes it without saving', async (pg, S) => {
  await boot(pg, S);
  await pg.click('[data-tab=more]');
  await pg.click('#more-lang > summary');
  const before = await countOf(pg, '#langList li.tr');
  // closed: only the "+ Add language" button
  await expectVisible(pg, ADD_LANG, true, 'the new-language row shows a "+ Add language" button');
  for (const id of ['#lgAdd', '#lgCancel', '#lgCode', '#lgName'])
    await expectVisible(pg, id, false, 'the form is closed: Save, Cancel and the fields are not shown');
  // open: fields, Save (disabled while invalid) and Cancel
  await pg.click(ADD_LANG);
  await expectVisible(pg, '#lgCode', true, 'the button opens the form');
  await expectVisible(pg, '#lgAdd', true, 'Save shows while the form is open');
  await expectVisible(pg, '#lgCancel', true, 'Cancel shows while the form is open');
  ok(await pg.locator('#lgAdd').isDisabled({ timeout: 2500 }), 'Save is disabled while the form is empty');
  await pg.fill('#lgCode', 'xzz');
  ok(await pg.locator('#lgAdd').isDisabled({ timeout: 2500 }), 'Save is still disabled with a code but no English name');
  await pg.fill('#lgName', 'Temporary');
  ok(await pg.locator('#lgAdd').isEnabled({ timeout: 2500 }), 'Save is enabled with a code and an English name');
  await pg.fill('#lgName', '');
  ok(await pg.locator('#lgAdd').isDisabled({ timeout: 2500 }), 'Save is disabled again when the English name is cleared');
  await pg.fill('#lgName', 'Temporary');
  // Cancel closes without saving
  await pg.click('#lgCancel');
  await expectVisible(pg, '#lgAdd', false, 'Cancel closes the form (Save is gone)');
  await expectVisible(pg, '#lgCancel', false, 'Cancel closes the form (Cancel is gone)');
  await expectVisible(pg, ADD_LANG, true, 'the "+ Add language" button is back after Cancel');
  eq(before, await countOf(pg, '#langList li.tr'), 'Cancel adds no language');
  ok(!JSON.stringify(S.data('languages.json')).includes('xzz'), 'Cancel saved nothing on the server');
  // the pencil of a language opens the same form, filled, so Save is enabled
  await pg.click('#langList [data-lgedit] >> nth=0');
  await expectVisible(pg, '#lgAdd', true, 'the pencil opens the form with Save');
  await expectVisible(pg, '#lgCancel', true, 'the pencil opens the form with Cancel');
  ok(await pg.locator('#lgAdd').isEnabled({ timeout: 2500 }), 'Save is enabled for a language that is filled in');
  await pg.click('#lgCancel');
  await expectVisible(pg, '#lgAdd', false, 'Cancel closes the edit form');
  // a valid language is saved and the form closes
  await pg.click(ADD_LANG);
  await pg.fill('#lgCode', 'xcl');
  await pg.fill('#lgName', 'Classical Armenian');
  await pg.click('#lgAdd');
  await pg.waitForFunction('document.querySelectorAll("#langList li.tr").length === ' + (before + 1));
  await expectVisible(pg, '#lgAdd', false, 'the form closes after Save');
  await expectVisible(pg, ADD_LANG, true, 'the "+ Add language" button is back after Save');
});

scenario('sidebar: the category form shows Save and Cancel only while open, and Save needs a name', async (pg, S) => {
  await boot(pg, S);
  await pg.click('[data-tab=more]');
  await pg.click('#more-cat > summary');
  const rows = await countOf(pg, '#catList li.tr');
  await expectVisible(pg, '#catAdd', true, 'the Add button is shown while no form is open');
  await expectVisible(pg, '#catSave', false, 'no Save while no form is open');
  await expectVisible(pg, '#catCancel', false, 'no Cancel while no form is open');
  await pg.click('#catAdd');
  await expectVisible(pg, '#catSave', true, 'Save shows while the form is open');
  await expectVisible(pg, '#catCancel', true, 'Cancel shows while the form is open');
  eq('New category', ((await pg.locator('#catAdmin .label').first().textContent()) || '').trim(), 'heading of the new-category form');
  ok(await pg.locator('#catSave').isDisabled({ timeout: 2500 }), 'Save is disabled while every name is empty');
  await pg.fill('#catForm .nn', 'Pilgrimage');
  ok(await pg.locator('#catSave').isEnabled({ timeout: 2500 }), 'Save is enabled with one name');
  await pg.fill('#catForm .nn', '');
  ok(await pg.locator('#catSave').isDisabled({ timeout: 2500 }), 'Save is disabled again when the name is cleared');
  await pg.fill('#catForm .nn', 'Pilgrimage');
  await pg.click('#catCancel');
  await expectVisible(pg, '#catSave', false, 'Cancel closes the form (Save is gone)');
  await expectVisible(pg, '#catCancel', false, 'Cancel closes the form (Cancel is gone)');
  await expectVisible(pg, '#catAdd', true, 'the Add button is back after Cancel');
  eq(rows, await countOf(pg, '#catList li.tr'), 'Cancel adds no category');
  ok(!JSON.stringify(S.data('categories.json')).includes('Pilgrimage'), 'Cancel saved nothing on the server');
});

// ---- 5. category rename (acceptance 5) ----
/** what a row and its children look like (colour, background, weight, borders, outline, shadow), so a "marked" row is detectable without a class name */
const rowSig = (pg, cid) =>
  pg.evaluate(`(() => {
    const row = document.querySelector(${JSON.stringify('#catList li[data-cid="' + cid + '"]')});
    const props = ['color', 'backgroundColor', 'fontWeight', 'borderLeftColor', 'borderLeftWidth', 'outlineStyle', 'boxShadow'];
    const sig = (e) => props.map((p) => getComputedStyle(e)[p]).join('|');
    return [row, ...row.children].map(sig).join(' / ');
  })()`);
const formNames = (pg) =>
  pg.evaluate("[...document.querySelectorAll('#catForm .pf-name')].map((r) => r.querySelector('.nl').value + ':' + r.querySelector('.nn').value)");

scenario('sidebar: Rename opens in the editor area at the bottom of the Categories fold, filled, with the row marked', async (pg, S) => {
  await boot(pg, S);
  await pg.click('[data-tab=more]');
  await pg.click('#more-cat > summary');
  const cid = await pg.locator('#catList li.tr').nth(1).getAttribute('data-cid');
  const names = await pg.evaluate(`categories.find((c) => c.id === ${JSON.stringify(cid)}).names.map((n) => n.lang + ':' + n.name)`);
  const other = await pg.locator('#catList li.tr').nth(2).getAttribute('data-cid');
  await park(pg);
  const unmarked = await rowSig(pg, cid);
  const otherSig = await rowSig(pg, other);
  eq(otherSig, unmarked, 'two plain category rows look the same (baseline of this test)');
  await pg.click(`#catList li[data-cid="${cid}"] [data-lyact=editcat]`);
  await expectVisible(pg, '#catAdmin #catForm', true, 'Rename opens the editor in the area at the bottom of the fold (the one of "New category")');
  eq(0, await countOf(pg, '#catList #catForm'), 'the editor is not inline under the item');
  eq(0, await countOf(pg, '#catList li.cat-edit'), 'there is no inline edit row under the item');
  eq('Rename category', ((await pg.locator('#catAdmin .label').first().textContent()) || '').trim(), 'heading of the rename editor');
  eq(names, await formNames(pg), 'the fields hold the names of the category');
  ok(await pg.locator('#catSave').isEnabled({ timeout: 2500 }), 'Save is enabled while the names are filled');
  await park(pg);
  ok((await rowSig(pg, cid)) !== unmarked, 'the row of the category being renamed is marked (it looks different from a plain row)');
  eq(otherSig, await rowSig(pg, other), 'other rows are not marked');
  // Cancel closes the editor and unmarks the row
  await pg.click('#catCancel');
  await expectVisible(pg, '#catSave', false, 'Cancel closes the rename editor');
  await expectVisible(pg, '#catAdd', true, 'the Add button is back after Cancel');
  await park(pg);
  eq(unmarked, await rowSig(pg, cid), 'the row is unmarked after Cancel');
  // rename for real
  await pg.click(`#catList li[data-cid="${cid}"] [data-lyact=editcat]`);
  await expectVisible(pg, '#catAdmin #catForm', true, 'Rename opens the editor again');
  await pg.fill('#catForm .nn >> nth=0', 'Renamed category');
  await pg.click('#catSave');
  await pg.waitForFunction("document.querySelector('#catList').textContent.includes('Renamed category')");
  await expectVisible(pg, '#catSave', false, 'the editor closes after Save');
  await expectVisible(pg, '#catAdd', true, 'the Add button is back after Save');
  await park(pg);
  eq(otherSig, await rowSig(pg, cid), 'the renamed row is no longer marked');
});
