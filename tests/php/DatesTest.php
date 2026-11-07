<?php
namespace ahm\map\tests;

use ahm\map\service\dates;


test('ISO text: epoch, a known day, year 0000 = 1 BCE, expanded BCE years', function () {
    same('1970-01-01T00:00:00Z', dates::sec_to_iso(0));
    same(0, dates::iso_to_sec('1970-01-01T00:00:00Z'));
    same('1500-03-21T00:00:00Z', dates::sec_to_iso(dates::days_from_civil(1500, 3, 21) * 86400));
    same('0000-01-01T00:00:00Z', dates::sec_to_iso(dates::days_from_civil(0, 1, 1) * 86400));
    same('-001199-01-01T00:00:00Z', dates::sec_to_iso(dates::days_from_civil(-1199, 1, 1) * 86400)); // 1200 BCE
    same('+012345-06-07T00:00:00Z', dates::sec_to_iso(dates::days_from_civil(12345, 6, 7) * 86400));
});

test('ISO text: every year round-trips through seconds', function () {
    foreach ([-99999, -4712, -1199, -1, 0, 1, 999, 1000, 1970, 2026, 9999, 10000, 99999] as $y) {
        $iso = dates::sec_to_iso(dates::days_from_civil($y, 2, 28) * 86400);
        same($iso, dates::sec_to_iso(dates::iso_to_sec($iso)), "year $y");
    }
});

test('ISO text: only the one canonical spelling is accepted', function () {
    foreach (
        [
            '1970-01-01T00:00:00z', '1970-01-01T00:00:00+00:00', '1970-01-01T00:00:00', '1970-01-01', '1970-01-01T00:00Z',
            "1970-01-01T00:00:00Z\n", ' 1970-01-01T00:00:00Z', '+001970-01-01T00:00:00Z', '-000001-01-01T00:00:00Z' . 'x', '', 'x',
            '1970-13-01T00:00:00Z', '1970-02-30T00:00:00Z', '1970-01-01T24:00:00Z',
        ] as $bad
    ) {
        same(null, dates::iso_to_sec($bad), json_encode($bad));
    }
});

test('upgrade: old integer seconds become ISO text, everything else is untouched', function () {
    same(['fmt' => 'y', 'ts' => '1970-01-02T00:00:00Z', 'mode' => 'range', 'ts_to' => '1970-01-03T00:00:00Z'],
        dates::upgrade(['fmt' => 'y', 'ts' => 86400, 'mode' => 'range', 'ts_to' => 172800]));
    $already = ['fmt' => 'y', 'ts' => '1970-01-02T00:00:00Z', 'mode' => 'exact', 'ts_to' => null];
    same($already, dates::upgrade($already));
    same(null, dates::upgrade(null));
});

test('aligned: a time stamp must be the start of a period of its format', function () {
    ok(dates::aligned('ymd', '1500-03-21T00:00:00Z'));
    ok(!dates::aligned('ymd', '1500-03-21T00:00:01Z'), 'not midnight');
    ok(dates::aligned('mony', '1500-03-01T00:00:00Z'));
    ok(!dates::aligned('mony', '1500-03-02T00:00:00Z'));
    ok(dates::aligned('y', '1500-01-01T00:00:00Z'));
    ok(!dates::aligned('y', '1500-02-01T00:00:00Z'));
    ok(dates::aligned('c', '1501-01-01T00:00:00Z'), '16th century starts in 1501');
    ok(!dates::aligned('c', '1500-01-01T00:00:00Z'));
    ok(dates::aligned('m', '2001-01-01T00:00:00Z'), '3rd millennium starts in 2001');
    ok(!dates::aligned('m', '2000-01-01T00:00:00Z'));
    ok(dates::aligned('c', '-000099-01-01T00:00:00Z'), '1st century BCE: starts at year -99 (= 100 BCE)');
    ok(!dates::aligned('y', 'nonsense'));
});

test('period_end: first moment after the period', function () {
    same('1500-03-22T00:00:00Z', dates::period_end('ymd', '1500-03-21T00:00:00Z'));
    same('1501-01-01T00:00:00Z', dates::period_end('mony', '1500-12-01T00:00:00Z'), 'December rolls into January');
    same('1500-04-01T00:00:00Z', dates::period_end('mony', '1500-03-01T00:00:00Z'));
    same('1501-01-01T00:00:00Z', dates::period_end('y', '1500-01-01T00:00:00Z'));
    same('1601-01-01T00:00:00Z', dates::period_end('c', '1501-01-01T00:00:00Z'));
    same('3001-01-01T00:00:00Z', dates::period_end('m', '2001-01-01T00:00:00Z'));
});

test('clean: null is allowed (unknown date) and a good date comes back normalised', function () {
    same(null, dates::clean(null));
    $d = ['fmt' => 'dmy', 'ts' => '1500-03-21T00:00:00Z', 'mode' => 'exact', 'ts_to' => null, 'extra' => 'dropped'];
    same(['fmt' => 'dmy', 'ts' => '1500-03-21T00:00:00Z', 'mode' => 'exact', 'ts_to' => null], dates::clean($d));
});

test('clean: a range keeps its end, other modes must not have one', function () {
    $r = ['fmt' => 'c', 'ts' => '1501-01-01T00:00:00Z', 'mode' => 'range', 'ts_to' => '1601-01-01T00:00:00Z'];
    same($r, dates::clean($r));
    throws('/only a range has an end/', function () {
        dates::clean(['fmt' => 'y', 'ts' => '1500-01-01T00:00:00Z', 'mode' => 'approx', 'ts_to' => '1501-01-01T00:00:00Z']);
    });
});

test('clean: refuses bad input with a readable message', function () {
    $ok = ['fmt' => 'y', 'ts' => '1500-01-01T00:00:00Z', 'mode' => 'exact', 'ts_to' => null];
    throws('/not a valid date/', function () {
        dates::clean('x');
    });
    throws('/unknown date format/', function () use ($ok) {
        dates::clean(array_merge($ok, ['fmt' => 'zz']));
    });
    throws('/choose exact/', function () use ($ok) {
        dates::clean(array_merge($ok, ['mode' => 'maybe']));
    });
    throws('/does not match the chosen format/', function () use ($ok) {
        dates::clean(array_merge($ok, ['ts' => '1500-02-01T00:00:00Z']));
    });
    throws('/does not match the chosen format/', function () use ($ok) {
        dates::clean(array_merge($ok, ['ts' => '1500-01-01T00:00:00+01:00']));
    });
    throws('/end of the range does not match/', function () {
        dates::clean(['fmt' => 'y', 'ts' => '1500-01-01T00:00:00Z', 'mode' => 'range', 'ts_to' => '1501-02-01T00:00:00Z']);
    });
    throws('/must be after its start/', function () {
        dates::clean(['fmt' => 'y', 'ts' => '1500-01-01T00:00:00Z', 'mode' => 'range', 'ts_to' => '1500-01-01T00:00:00Z']);
    });
    throws('/must be after its start/', function () {
        dates::clean(['fmt' => 'y', 'ts' => '1500-01-01T00:00:00Z', 'mode' => 'range', 'ts_to' => '1400-01-01T00:00:00Z']);
    });
});

test('clean: years outside -100000..100000 are refused', function () {
    $iso = dates::sec_to_iso(dates::days_from_civil(100001, 1, 1) * 86400);
    throws('/does not match/', function () use ($iso) {
        dates::clean(['fmt' => 'y', 'ts' => $iso, 'mode' => 'exact', 'ts_to' => null]);
    });
});

test('clean: dates saved with integer seconds are upgraded on the way in', function () {
    $c = dates::clean(['fmt' => 'y', 'ts' => 0, 'mode' => 'exact', 'ts_to' => null]);
    same('1970-01-01T00:00:00Z', $c['ts']);
});

test('bounds: [start, end) in seconds; a range spans from its start to the end of its last period', function () {
    $c = dates::clean(['fmt' => 'c', 'ts' => '1501-01-01T00:00:00Z', 'mode' => 'range', 'ts_to' => '1601-01-01T00:00:00Z']);
    [$a, $b] = dates::bounds($c);
    same('1501-01-01T00:00:00Z', dates::sec_to_iso($a));
    same('1701-01-01T00:00:00Z', dates::sec_to_iso($b));
    $e = dates::clean(['fmt' => 'ymd', 'ts' => '1500-03-21T00:00:00Z', 'mode' => 'exact', 'ts_to' => null]);
    same(86400, dates::bounds($e)[1] - dates::bounds($e)[0]);
});

test('order_check: "from" must not lie after the end of "to"; unknown ends are fine', function () {
    $y = function ($year) {
        return dates::clean(['fmt' => 'y', 'ts' => sprintf('%04d-01-01T00:00:00Z', $year), 'mode' => 'exact', 'ts_to' => null]);
    };
    dates::order_check($y(1000), $y(1500));
    dates::order_check($y(1500), $y(1500)); // the same year is fine: from starts inside it
    dates::order_check(null, $y(1500));
    dates::order_check($y(1500), null);
    dates::order_check(null, null);
    throws('/after the "to" date/', function () use ($y) {
        dates::order_check($y(1600), $y(1500));
    });
});

test('from_legacy: old year numbers and wording', function () {
    same(['fmt' => 'y', 'ts' => '0500-01-01T00:00:00Z', 'mode' => 'exact', 'ts_to' => null], dates::from_legacy(500, '', false));
    same(['fmt' => 'y', 'ts' => '-000499-01-01T00:00:00Z', 'mode' => 'approx', 'ts_to' => null], dates::from_legacy(-500, '', true), '500 BCE, approximate');
    same(null, dates::from_legacy(0, '', false), 'there is no year 0 in the old data');
    same(null, dates::from_legacy(null, '', false));
    same(null, dates::from_legacy(null, 'long ago', false), 'unreadable wording and no year');
    same('c', dates::from_legacy(null, '5th century', false)['fmt']);
    same('approx', dates::from_legacy(null, 'c. 1200', false)['mode'], 'a "c." prefix means approximate');
    same('-001199-01-01T00:00:00Z', dates::from_legacy(null, '1200 BCE', false)['ts']);
});

test('parity with the JavaScript date model (shared fixture)', function () {
    $f = json_file(dirname(__DIR__) . '/fixtures/dates-vectors.json');
    foreach ($f['v'] as $x) {
        same($x['ok'], dates::aligned($x['fmt'], $x['ts']), 'aligned ' . json_encode($x));
        if ($x['ok']) {
            same($x['end'], dates::period_end($x['fmt'], $x['ts']), 'period_end ' . json_encode($x));
            same($x['ts'], dates::clean(['fmt' => $x['fmt'], 'ts' => $x['ts'], 'mode' => 'exact', 'ts_to' => null])['ts']);
        }
    }
    foreach ($f['iso'] as $x) {
        $sec = dates::iso_to_sec($x['s']);
        same($x['sec'], $sec, 'iso_to_sec ' . json_encode($x['s']));
        if ($sec !== null) {
            same($x['s'], dates::sec_to_iso($sec), 'round trip ' . $x['s']);
        }
    }
    foreach ($f['legacy'] as $l) {
        same(json_encode($l['out']), json_encode(dates::from_legacy($l['y'], $l['t'], $l['a'])), 'legacy ' . json_encode($l));
    }
    foreach ($f['up'] as $u) {
        same(json_encode($u['out']), json_encode(dates::upgrade($u['in'])), 'upgrade');
    }
    ok(count($f['v']) > 1000, 'the fixture is not empty');
});
