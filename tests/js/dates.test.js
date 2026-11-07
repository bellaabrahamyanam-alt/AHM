const { test, ok, eq, throws } = require('./lib/harness');
const path = require('path');
const fs = require('fs');
const D = require(path.join(__dirname, '..', '..', 'app', 'js', 'core', 'dates.js'));
const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'dates-vectors.json'), 'utf8'));

// small deterministic random numbers (the tests must give the same answer every run)
let seed = 12345;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));

test('dates: ISO text for epoch, a known day, year 0000 (= 1 BCE) and expanded years', () => {
  eq('1970-01-01T00:00:00Z', D.dateToTs('ymd', { era: 'CE', y: 1970, m: 1, d: 1 }));
  eq('1500-03-21T00:00:00Z', D.dateToTs('ymd', { era: 'CE', y: 1500, m: 3, d: 21 }));
  eq('0000-01-01T00:00:00Z', D.secToIso(D.daysFromCivil(0, 1, 1) * 86400));
  eq('-001199-01-01T00:00:00Z', D.dateToTs('y', { era: 'BCE', y: 1200 }));
  eq('+012345-06-07T00:00:00Z', D.secToIso(D.daysFromCivil(12345, 6, 7) * 86400));
});

test('dates: 20000 random modern days agree with JavaScript\'s own Date', () => {
  for (let i = 0; i < 20000; i++) {
    const t = Math.floor(ri(-60e9, 40e9) / 86400) * 86400 * 1; // seconds, whole days
    const dt = new Date(t * 1000);
    const y = dt.getUTCFullYear();
    if (y < 1 || y > 9999) continue;
    const ts = D.dateToTs('ymd', { era: 'CE', y, m: dt.getUTCMonth() + 1, d: dt.getUTCDate() });
    eq(t, D.isoToSec(ts));
    eq(t * 1000, Date.parse(ts));
  }
});

test('dates: every format, CE and BCE, round-trips (3000 random dates each) and is aligned', () => {
  for (const f of D.DATE_FORMATS)
    for (const era of ['CE', 'BCE'])
      for (let k = 0; k < 3000; k++) {
        const o = f.id === 'c' ? { era, n: ri(1, 1000) } : f.id === 'm' ? { era, n: ri(1, 100) } : { era, y: ri(1, 99999), m: ri(1, 12), d: ri(1, 28) };
        const ts = D.dateToTs(f.id, o);
        ok(D.dateAligned(f.id, ts), f.id + JSON.stringify(o));
        const b = D.dateFromTs(f.id, ts);
        eq(o.era, b.era);
        for (const key of f.fields) eq(o[key], b[key], f.id + JSON.stringify([o, b]));
        eq(ts, D.dateToTs(f.id, b));
        ok(D.isoToSec(D.datePeriodEnd(f.id, ts)) > D.isoToSec(ts), 'period end is after the start');
      }
});

test('dates: only the canonical spelling is accepted', () => {
  for (const bad of ['1970-01-01T00:00:00z', '1970-01-01T00:00:00+00:00', '1970-01-01T00:00:00', '1970-01-01', '1970-01-01T00:00Z',
    '1970-01-01T00:00:00Z\n', ' 1970-01-01T00:00:00Z', '+001970-01-01T00:00:00Z', '', 'x', '1970-13-01T00:00:00Z', '1970-02-30T00:00:00Z', '1970-01-01T24:00:00Z'])
    eq(null, D.isoToSec(bad), JSON.stringify(bad));
});

test('dates: alignment per format (century starts at year 1 of the century, millennium likewise)', () => {
  ok(D.dateAligned('c', '1501-01-01T00:00:00Z'));
  ok(!D.dateAligned('c', '1500-01-01T00:00:00Z'));
  ok(D.dateAligned('m', '2001-01-01T00:00:00Z'));
  ok(!D.dateAligned('y', '1500-02-01T00:00:00Z'));
  ok(D.dateAligned('mony', '1500-03-01T00:00:00Z'));
  ok(!D.dateAligned('ymd', '1500-03-21T00:00:01Z'));
});

test('dates: period ends', () => {
  eq('1500-03-22T00:00:00Z', D.datePeriodEnd('ymd', '1500-03-21T00:00:00Z'));
  eq('1501-01-01T00:00:00Z', D.datePeriodEnd('mony', '1500-12-01T00:00:00Z'));
  eq('1601-01-01T00:00:00Z', D.datePeriodEnd('c', '1501-01-01T00:00:00Z'));
  eq('3001-01-01T00:00:00Z', D.datePeriodEnd('m', '2001-01-01T00:00:00Z'));
});

test('dates: dateClean accepts null, normalises, and refuses bad input with readable messages', () => {
  eq(null, D.dateClean(null));
  const ok1 = { fmt: 'y', ts: '1500-01-01T00:00:00Z', mode: 'exact', ts_to: null };
  eq(ok1, D.dateClean({ ...ok1, extra: 1 }));
  throws(/unknown date format/, () => D.dateClean({ ...ok1, fmt: 'zz' }));
  throws(/choose exact/, () => D.dateClean({ ...ok1, mode: 'maybe' }));
  throws(/does not match the chosen format/, () => D.dateClean({ ...ok1, ts: '1500-02-01T00:00:00Z' }));
  throws(/only a range has an end/, () => D.dateClean({ ...ok1, mode: 'approx', ts_to: '1501-01-01T00:00:00Z' }));
  throws(/must be after its start/, () => D.dateClean({ ...ok1, mode: 'range', ts_to: '1500-01-01T00:00:00Z' }));
  throws(/end of the range does not match/, () => D.dateClean({ ...ok1, mode: 'range', ts_to: '1501-02-01T00:00:00Z' }));
});

test('dates: integer seconds from the first version are upgraded to ISO text; ISO text is untouched', () => {
  eq({ fmt: 'y', ts: '1970-01-02T00:00:00Z', mode: 'range', ts_to: '1970-01-03T00:00:00Z' }, D.dateUpgrade({ fmt: 'y', ts: 86400, mode: 'range', ts_to: 172800 }));
  const a = { fmt: 'y', ts: '1970-01-02T00:00:00Z', mode: 'exact', ts_to: null };
  eq(a, D.dateUpgrade(a));
  eq(null, D.dateUpgrade(null));
});

test('dates: bounds, spans and keys (unknown dates sort last)', () => {
  const c = { fmt: 'c', ts: '1501-01-01T00:00:00Z', mode: 'range', ts_to: '1601-01-01T00:00:00Z' };
  eq(['1501-01-01T00:00:00Z', '1701-01-01T00:00:00Z'], D.dateBounds(c).map(D.secToIso));
  eq(Infinity, D.dateKey(null));
  eq([-Infinity, Infinity], D.spanBounds(null, null));
  ok(D.dateKey(c) < Infinity);
});

test('dates: order check', () => {
  const y = (n) => ({ fmt: 'y', ts: String(n).padStart(4, '0') + '-01-01T00:00:00Z', mode: 'exact', ts_to: null });
  D.dateOrderCheck(y(1000), y(1500));
  D.dateOrderCheck(null, y(1500));
  D.dateOrderCheck(y(1500), null);
  throws(/after/, () => D.dateOrderCheck(y(1600), y(1500)));
});

test('dates: text shown to people', () => {
  eq('12th century BCE', D.dateText({ fmt: 'c', ts: D.dateToTs('c', { era: 'BCE', n: 12 }), mode: 'exact', ts_to: null }));
  ok(/1500/.test(D.dateText({ fmt: 'y', ts: '1500-01-01T00:00:00Z', mode: 'exact', ts_to: null })));
  ok(/^c\./.test(D.dateText({ fmt: 'y', ts: '1500-01-01T00:00:00Z', mode: 'approx', ts_to: null })), 'approximate dates start with c.');
  eq('', D.spanText(null, null));
});

test('dates: old wording and year numbers', () => {
  eq({ fmt: 'y', ts: '0500-01-01T00:00:00Z', mode: 'exact', ts_to: null }, D.legacyToDate(500, '', false));
  eq('approx', D.legacyToDate(-500, '', true).mode);
  eq(null, D.legacyToDate(0, '', false));
  eq(null, D.legacyToDate(null, 'long ago', false));
  eq('c', D.legacyToDate(null, '5th century', false).fmt);
  eq('approx', D.legacyToDate(null, 'c. 1200', false).mode);
  eq('-001199-01-01T00:00:00Z', D.legacyToDate(null, '1200 BCE', false).ts);
});

test('dates: identical answers to the shared test vectors (the same file the PHP tests read)', () => {
  ok(fixtures.v.length > 1000);
  for (const x of fixtures.v) {
    eq(x.ok, D.dateAligned(x.fmt, x.ts), 'aligned ' + JSON.stringify(x));
    if (x.ok) eq(x.end, D.datePeriodEnd(x.fmt, x.ts), 'end ' + JSON.stringify(x));
  }
  for (const x of fixtures.iso) {
    eq(x.sec, D.isoToSec(x.s), 'iso ' + x.s);
    if (x.sec !== null) eq(x.s, D.secToIso(x.sec));
  }
  for (const l of fixtures.legacy) eq(l.out, D.legacyToDate(l.y, l.t, l.a), 'legacy ' + JSON.stringify(l));
  for (const u of fixtures.up) eq(u.out, D.dateUpgrade(u.in));
});
