<?php
namespace ahm\map\tests;

use ahm\map\service\store;

function legacy_sandbox()
{
    $dir = sandbox(false);
    $pid = '11111111-1111-4111-8111-111111111111';
    $nid = '33333333-3333-4333-8333-333333333333';
    mkdir("$dir/notes/$pid", 0775, true);
    file_put_contents("$dir/languages.json", json_encode(['version' => 1, 'languages' => [['code' => 'en', 'name' => 'English', 'native' => 'English']]]));
    $mk = function ($id, $type, $from, $to) {
        return ['type' => 'Feature', 'geometry' => ['type' => 'Point', 'coordinates' => [44, 40]],
            'properties' => ['id' => $id, 'label' => 'A', 'type' => $type, 'date_from' => $from, 'date_to' => $to, 'height_m' => null, 'names' => [['lang' => 'en', 'name' => 'A']]]];
    };
    file_put_contents("$dir/places.geojson", json_encode(['type' => 'FeatureCollection', 'version' => 2, 'features' => [
        // version-2 format: integer seconds (-14800233600 = 1501-01-01, -11644473600 = 1601-01-01)
        $mk($pid, 'town', ['fmt' => 'c', 'ts' => -14800233600, 'mode' => 'range', 'ts_to' => -11644473600], ['fmt' => 'y', 'ts' => 0, 'mode' => 'approx', 'ts_to' => null]),
        $mk('22222222-2222-4222-8222-222222222222', 'village', null, ['fmt' => 'y', 'ts' => '1500-01-01T00:00:00Z', 'mode' => 'exact', 'ts_to' => null]),
    ]]));
    file_put_contents("$dir/notes/$pid/$nid.md", "---\nid: $nid\nlang: en\ntitle: T\nlayers: 44444444-4444-4444-8444-444444444444\ndate: " .
        json_encode(['fmt' => 'dmy', 'ts' => 86400, 'mode' => 'exact', 'ts_to' => null]) . "\n---\nbody\n");
    return [$dir, $pid, $nid];
}

test('migrate: integer-second dates in places and notes become ISO text', function () {
    [$dir, $pid, $nid] = legacy_sandbox();
    $s = new store($dir);
    ok($s->migrate() > 0);
    $f = json_file("$dir/places.geojson");
    same(3, $f['version']);
    $p = $f['features'][0]['properties'];
    same('1501-01-01T00:00:00Z', $p['date_from']['ts']);
    same('1601-01-01T00:00:00Z', $p['date_from']['ts_to']);
    same('1970-01-01T00:00:00Z', $p['date_to']['ts']);
    same('1500-01-01T00:00:00Z', $f['features'][1]['properties']['date_to']['ts'], 'already-new dates are untouched');
    ok(strpos(file_get_contents("$dir/notes/$pid/$nid.md"), '"ts":"1970-01-02T00:00:00Z"') !== false, 'note date');
    same('1970-01-02T00:00:00Z', note_index($dir)[0]['date']['ts'], 'search index');
});

test('migrate: keeps the note\'s layers: header line', function () {
    [$dir, $pid, $nid] = legacy_sandbox();
    (new store($dir))->migrate();
    ok(strpos(file_get_contents("$dir/notes/$pid/$nid.md"), "layers: 44444444-4444-4444-8444-444444444444\n") !== false);
});

test('migrate: archives what it changes and does nothing the second time', function () {
    [$dir] = legacy_sandbox();
    $s = new store($dir);
    $s->migrate();
    ok(count(glob("$dir/archive/*")) >= 1, 'archive has copies');
    same(0, $s->migrate(), 'second run converts nothing');
});

test('migrate: the shipped sample data (old year format) is converted without loss', function () {
    $dir = sandbox();
    $before = json_file("$dir/places.geojson");
    $s = new store($dir);
    $n = $s->migrate();
    ok($n > 0, 'sample data needed conversion: ' . $n);
    $after = json_file("$dir/places.geojson");
    same(count($before['features']), count($after['features']), 'no place lost');
    foreach ($after['features'] as $f) {
        $p = $f['properties'];
        ok(!array_key_exists('approx', $p) && !array_key_exists('date_from_text', $p), 'legacy keys gone');
        foreach (['date_from', 'date_to'] as $k) {
            ok($p[$k] === null || is_string($p[$k]['ts']), "$k is null or ISO");
        }
    }
    same(0, $s->migrate());
});
