const { test, ok, eq, J } = require('./lib/harness');
const { load, UI_STANDINS } = require('./lib/ctx');
const page = () => load(['config.js', 'dates.js', 'data.js', 'datefield.js', 'search.js', 'placeform.js']);

test('data: esc() escapes the four dangerous characters and norm() folds case and accents', () => {
  const p = page();
  eq('&lt;b&gt; &amp; &quot;x&quot;', p.X('esc(__0)', '<b> & "x"'));
  eq(' &lt;', p.X('esc(" <")'));
  eq('arutasat', p.X('norm(__0)', 'ÁRÚTASAT'));
  eq('', p.X('norm(null)'));
});

test('data: normPlace converts old dates (year number + wording + approx) and keeps new ones', () => {
  const p = page();
  const old = J(p.X('normPlace({id:"a",type:"town",date_from:-500,date_from_text:"",approx:true,date_to:null,names:[]})'));
  eq('y', old.date_from.fmt);
  eq('approx', old.date_from.mode);
  eq('-000499-01-01T00:00:00Z', old.date_from.ts);
  eq(null, old.date_to);
  const nw = { fmt: 'y', ts: '1500-01-01T00:00:00Z', mode: 'exact', ts_to: null };
  eq(nw, J(p.X('normPlace({id:"a",type:"town",date_from:__0,date_to:null,names:[]})', nw)).date_from);
  const intSec = J(p.X('normPlace({id:"a",type:"town",date_from:{fmt:"y",ts:86400,mode:"exact",ts_to:null},date_to:null,names:[]})'));
  eq('1970-01-02T00:00:00Z', intSec.date_from.ts, 'integer seconds from the first version are upgraded');
});

test('data: a mountain has a height and never dates; other types never a height', () => {
  const p = page();
  const m = J(p.X('normPlace({id:"m",type:"mountain",date_from:{fmt:"y",ts:"1500-01-01T00:00:00Z",mode:"exact",ts_to:null},height_m:5137,names:[]})'));
  eq(null, m.date_from);
  eq(5137, m.height_m);
  eq(null, J(p.X('normPlace({id:"t",type:"town",height_m:100,names:[]})')).height_m);
});

test('data: normNote reads the new date, converts old year/when, and always has a layers list', () => {
  const p = page();
  eq([], J(p.X('normNote({id:"n",place:"p",lang:"en",title:"t",text:"x"})')).layers);
  eq(['L1'], J(p.X('normNote({id:"n",layers:["L1"],date:null})')).layers);
  const o = J(p.X('normNote({id:"n",year:-660,when:""})'));
  eq('y', o.date.fmt);
  eq(null, J(p.X('normNote({id:"n",date:null})')).date);
});

test('data: normLayer upgrades layer dates, null stays null', () => {
  const p = page();
  const l = J(p.X('normLayer({id:"l",names:[],members:[],date_from:{fmt:"y",ts:0,mode:"exact",ts_to:null},date_to:null})'));
  eq('1970-01-01T00:00:00Z', l.date_from.ts);
  eq(null, l.date_to);
});

test('data: label() prefers the asked language, then English, then the first name', () => {
  const p = page();
  const pl = '{names:[{lang:"hy",name:"Արտաշատ"},{lang:"en",name:"Artashat"},{lang:"ru",name:"Арташат"}]}';
  eq('Арташат', p.X(`label(${pl}, "ru")`));
  eq('Artashat', p.X(`label(${pl}, "fr")`));
  eq('Արտաշատ', p.X('label({names:[{lang:"hy",name:"Արտաշատ"}]}, "fr")'));
});

test('data: langName() uses the dictionary and falls back to the code; placeWhen() shows a height for mountains', () => {
  const p = page();
  p.X('languages = [{code:"hy",name:"Armenian",native:"Հայերեն"}]');
  eq('Armenian', p.X('langName("hy")'));
  eq('xx', p.X('langName("xx")'));
  eq('height 5137 m', p.X('placeWhen({type:"mountain",height_m:5137})'));
  eq('', p.X('placeWhen({type:"mountain",height_m:null})'));
  eq('', p.X('placeWhen({type:"town",date_from:null,date_to:null})'));
});

test('data: the optional layer files may be missing (404) and then mean "no layers"', async () => {
  const p = page();
  p.X('AHM_CONFIG.url.layers = "x"; AHM_CONFIG.url.layerNotesIndex = "x"; AHM_CONFIG.url.categories = "x";');
  // fetch is a stand-in that always fails: the loaders must still resolve to empty lists
  eq([], J(await p.X('loadLayers()')));
  eq([], J(await p.X('loadLayerNotes()')));
  eq([], J(await p.X('loadCategories()')));
});

// ---- types dictionary (INTERFACES.md I-8) ----
const TYPES = [
  { code: 'city', geometry: 'point', names: [{ lang: 'en', name: 'City' }, { lang: 'ru', name: 'Город' }], color: '#b3261e', style: { symbol: 'circle', size: 10 } },
  { code: 'iron-mine', geometry: 'point', names: [{ lang: 'ru', name: 'Рудник' }, { lang: 'hy', name: 'Հանք' }], color: '#a0522d', style: { symbol: 'pickaxe', size: 9 } },
  { code: 'odd', geometry: 'point', names: [{ lang: 'en', name: 'Odd' }], color: 'red', style: { symbol: 'no-such-symbol', size: 99 } },
  { code: 'border', geometry: 'line', names: [{ lang: 'en', name: 'Border' }], color: '#000000', style: {} },
];

test('types: typeLabel gives the name in the language, else English, else the first name, else the code', () => {
  const p = load(['config.js', 'data.js']);
  p.X('types = __0', TYPES);
  eq('Город', p.X('typeLabel("city", "ru")'));
  eq('City', p.X('typeLabel("city", "hy")'), 'no Armenian name: English');
  eq('Рудник', p.X('typeLabel("iron-mine", "en")'), 'no English name: the first one');
  eq('inscription site', p.X('typeLabel("inscription_site", "en")'), 'not in the dictionary: the code as words');
});
