<?php
namespace ahm\map\tests;

use ahm\map\service\store;

const CORNERS = [[40, 41], [46, 41], [46, 37], [40, 37]];
// smallest valid PNG
const PNG = "\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\xcf\xc0\xf0\x1f\x00\x05\x00\x01\xff\x89\x99=\x1d\x00\x00\x00\x00IEND\xaeB`\x82";

function ov($extra = [])
{
    return array_merge(['title' => 'Old map', 'coordinates' => CORNERS, 'minzoom' => 4, 'maxzoom' => 9, 'opacity' => 0.5], $extra);
}

test('overlay: created with UTC time stamps ending in Z', function () {
    $dir = sandbox(false);
    $s = new store($dir);
    $s->save_overlay(ov());
    $o = $s->overlays()['overlays'][0];
    foreach (['created', 'updated'] as $k) {
        ok(preg_match('/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/', $o[$k]), "$k = {$o[$k]}");
    }
    same('', $o['file']);
});

test('overlay: validation (title, four corners, ranges, zoom, opacity)', function () {
    $s = new store(sandbox(false));
    throws('/title is required/', function () use ($s) {
        $s->save_overlay(ov(['title' => ' ']));
    });
    throws('/four corner/', function () use ($s) {
        $s->save_overlay(ov(['coordinates' => [[1, 1]]]));
    });
    throws('/bad coordinates/', function () use ($s) {
        $s->save_overlay(ov(['coordinates' => [[1, 1], [1, 1], [1, 1], ['x', 1]]]));
    });
    throws('/out of range/', function () use ($s) {
        $s->save_overlay(ov(['coordinates' => [[200, 1], [1, 1], [1, 1], [1, 1]]]));
    });
    throws('/zoom range/', function () use ($s) {
        $s->save_overlay(ov(['minzoom' => 9, 'maxzoom' => 4]));
    });
    throws('/zoom range/', function () use ($s) {
        $s->save_overlay(ov(['maxzoom' => 30]));
    });
    throws('/opacity/', function () use ($s) {
        $s->save_overlay(ov(['opacity' => 1.5]));
    });
});

test('overlay: update keeps the file and created time, changes the rest', function () {
    $s = new store(sandbox(false));
    $id = $s->save_overlay(ov());
    $c = $s->overlays()['overlays'][0]['created'];
    $s->save_overlay(ov(['id' => $id, 'title' => 'Renamed', 'opacity' => 0.9]));
    $o = $s->overlays()['overlays'][0];
    same('Renamed', $o['title']);
    same(0.9, $o['opacity']);
    same($c, $o['created']);
    same(1, count($s->overlays()['overlays']));
    throws('/unknown overlay/', function () use ($s) {
        $s->save_overlay(ov(['id' => NIL]));
    });
    throws('/bad id/', function () use ($s) {
        $s->save_overlay(ov(['id' => 'x']));
    });
});

test('overlay image: only PNG/JPEG/WebP bytes are accepted; the file is served by id', function () {
    $dir = sandbox(false);
    $s = new store($dir);
    $id = $s->save_overlay(ov());
    throws('/only PNG, JPEG or WebP/', function () use ($s, $id) {
        $s->save_overlay_image($id, '<html>not an image</html>');
    });
    throws('/missing or larger/', function () use ($s, $id) {
        $s->save_overlay_image($id, '');
    });
    $file = $s->save_overlay_image($id, PNG);
    same("$id.png", $file);
    [$path, $mime] = $s->overlay_file($id);
    same('image/png', $mime);
    same(PNG, file_get_contents($path));
    same(null, $s->overlay_file('not-an-id'));
    throws('/unknown overlay/', function () use ($s) {
        $s->save_overlay_image(NIL, PNG);
    });
});

test('overlay delete: moves the image to the archive, then the overlay is gone', function () {
    $dir = sandbox(false);
    $s = new store($dir);
    $id = $s->save_overlay(ov());
    $s->save_overlay_image($id, PNG);
    ok($s->delete_overlay($id));
    same([], $s->overlays()['overlays']);
    same(1, count(glob("$dir/archive/overlay-*-$id.png")), 'image archived, not deleted');
    throws('/unknown overlay/', function () use ($s, $id) {
        $s->delete_overlay($id);
    });
});
