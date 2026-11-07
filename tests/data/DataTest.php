<?php
namespace ahm\map\tests;

function codes($problems)
{
    return array_values(array_unique(array_column($problems, 0)));
}

/** edit a JSON file of a sandbox with $fn(array): array */
function edit_json($dir, $name, callable $fn)
{
    file_put_contents("$dir/$name", json_encode($fn(json_file("$dir/$name")), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
}

function tree_hash($dir)
{
    $out = [];
    foreach (new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($dir, \FilesystemIterator::SKIP_DOTS)) as $f) {
        $out[$f->getPathname()] = md5_file($f->getPathname()) . filemtime($f->getPathname());
    }
    ksort($out);
    return $out;
}

/** a clean, migrated copy of the sample data with a note tied to the sample layer */
function clean_data()
{
    $s = fresh_store($dir);
    $layer = $s->layers()['layers'][0];
    $s->save(['place_id' => $layer['members'][0]['place'], 'note' => ['lang' => 'en', 'title' => 'Tied', 'text' => 'x', 'layers' => [$layer['id']]]]);
    $s->save_layer_note(['layer_id' => $layer['id'], 'note' => ['lang' => 'en', 'title' => 'About', 'text' => 'x']]);
    return [$dir, $layer];
}

test('shipped sample data (old format): only old-format notices (dates, note files <lang>.md, index), nothing structural', function () {
    $dir = sandbox();
    $codes = codes(DataCheck::run($dir));
    // the sample still has year numbers, one <lang>.md per language and no "lang:" header; store::migrate() converts them
    $structural = array_diff($codes, ['date-format', 'index-drift', 'note-id', 'note-language']);
    same([], array_values($structural), 'structural problems in the shipped sample: ' . implode(', ', $structural));
});

test('shipped sample data after migration: no problems at all (strict)', function () {
    $s = fresh_store($dir);
    same([], DataCheck::run($dir));
});

test('a store with notes, tags and layer notes made through the API is clean', function () {
    [$dir] = clean_data();
    same([], DataCheck::run($dir));
});

test('the checker only reads: the checked directory is byte-for-byte unchanged', function () {
    [$dir] = clean_data();
    $before = tree_hash($dir);
    DataCheck::run($dir);
    same($before, tree_hash($dir));
});

/** [description, defect, code the checker must report] */
function defects()
{
    return [
        ['places.geojson is broken JSON', function ($d) {
            file_put_contents("$d/places.geojson", '{oops');
        }, 'json-invalid'],
        ['languages.json missing', function ($d) {
            unlink("$d/languages.json");
        }, 'file-missing'],
        ['place id not a UUID', function ($d) {
            edit_json($d, 'places.geojson', function ($j) {
                $j['features'][0]['properties']['id'] = 'abc';
                return $j;
            });
        }, 'place-id'],
        ['two places with the same id', function ($d) {
            edit_json($d, 'places.geojson', function ($j) {
                $j['features'][1]['properties']['id'] = $j['features'][0]['properties']['id'];
                return $j;
            });
        }, 'place-id-duplicate'],
        ['place coordinates out of range', function ($d) {
            edit_json($d, 'places.geojson', function ($j) {
                $j['features'][0]['geometry']['coordinates'] = [200, 10];
                return $j;
            });
        }, 'place-coordinates'],
        ['place type not in the list', function ($d) {
            edit_json($d, 'places.geojson', function ($j) {
                $j['features'][0]['properties']['type'] = 'spaceport';
                return $j;
            });
        }, 'place-type'],
        ['place name in a language outside the dictionary', function ($d) {
            edit_json($d, 'places.geojson', function ($j) {
                $j['features'][0]['properties']['names'][0]['lang'] = 'zz';
                return $j;
            });
        }, 'place-language'],
        ['place without names', function ($d) {
            edit_json($d, 'places.geojson', function ($j) {
                $j['features'][0]['properties']['names'] = [];
                return $j;
            });
        }, 'place-names'],
        ['mountain with dates', function ($d) {
            edit_json($d, 'places.geojson', function ($j) {
                $p = &$j['features'][0]['properties'];
                $p['type'] = 'mountain';
                $p['date_from'] = ['fmt' => 'y', 'ts' => '1500-01-01T00:00:00Z', 'mode' => 'exact', 'ts_to' => null];
                return $j;
            });
        }, 'mountain-dates'],
        ['mountain too high', function ($d) {
            edit_json($d, 'places.geojson', function ($j) {
                $p = &$j['features'][0]['properties'];
                $p['type'] = 'mountain';
                $p['date_from'] = $p['date_to'] = null;
                $p['height_m'] = 9999;
                return $j;
            });
        }, 'mountain-height'],
        ['height on a town', function ($d) {
            edit_json($d, 'places.geojson', function ($j) {
                $j['features'][0]['properties']['type'] = 'town';
                $j['features'][0]['properties']['height_m'] = 100;
                return $j;
            });
        }, 'height-on-non-mountain'],
        ['date in the old integer format', function ($d) {
            edit_json($d, 'places.geojson', function ($j) {
                $j['features'][0]['properties']['type'] = 'town';
                $j['features'][0]['properties']['date_from'] = ['fmt' => 'y', 'ts' => 0, 'mode' => 'exact', 'ts_to' => null];
                return $j;
            });
        }, 'date-format'],
        ['date whose time stamp does not match its format', function ($d) {
            edit_json($d, 'places.geojson', function ($j) {
                $j['features'][0]['properties']['type'] = 'town';
                $j['features'][0]['properties']['date_from'] = ['fmt' => 'y', 'ts' => '1500-05-05T00:00:00Z', 'mode' => 'exact', 'ts_to' => null];
                return $j;
            });
        }, 'date-invalid'],
        ['begin after end', function ($d) {
            edit_json($d, 'places.geojson', function ($j) {
                $p = &$j['features'][0]['properties'];
                $p['type'] = 'town';
                $p['date_from'] = ['fmt' => 'y', 'ts' => '1600-01-01T00:00:00Z', 'mode' => 'exact', 'ts_to' => null];
                $p['date_to'] = ['fmt' => 'y', 'ts' => '1500-01-01T00:00:00Z', 'mode' => 'exact', 'ts_to' => null];
                return $j;
            });
        }, 'date-order'],
        ['note of a place that does not exist', function ($d) {
            $p = '99999999-9999-4999-8999-999999999999';
            mkdir("$d/notes/$p");
            file_put_contents("$d/notes/$p/55555555-5555-4555-8555-555555555555.md", "---\nid: 55555555-5555-4555-8555-555555555555\nlang: en\ntitle: t\n---\nx\n");
        }, 'note-orphan'],
        ['note header id differs from the file name', function ($d) {
            $f = glob("$d/notes/*/*.md")[0];
            file_put_contents($f, preg_replace('/^id: .*$/m', 'id: 66666666-6666-4666-8666-666666666666', file_get_contents($f)));
        }, 'note-id'],
        ['note in a language outside the dictionary', function ($d) {
            $f = glob("$d/notes/*/*.md")[0];
            file_put_contents($f, preg_replace('/^lang: .*$/m', 'lang: zz', file_get_contents($f)));
        }, 'note-language'],
        ['note file without a header', function ($d) {
            file_put_contents(glob("$d/notes/*/*.md")[0], "just text\n");
        }, 'note-header'],
        ['note tied to a layer that does not exist', function ($d) {
            $f = glob("$d/notes/*/*.md")[0];
            file_put_contents($f, preg_replace('/^(title: .*)$/m', "$1\nlayers: 77777777-7777-4777-8777-777777777777", file_get_contents($f), 1));
        }, 'note-tag-layer'],
        ['note tied to a layer its place is not in', function ($d) {
            $layer = json_file("$d/layers.json")['layers'][0]['id'];
            foreach (glob("$d/notes/*/*.md") as $f) {
                $pid = basename(dirname($f));
                $in = array_column(json_file("$d/layers.json")['layers'][0]['members'], 'place');
                if (!in_array($pid, $in, true)) {
                    file_put_contents($f, preg_replace('/^(title: .*)$/m', "$1\nlayers: $layer", file_get_contents($f), 1));
                    return;
                }
            }
        }, 'note-tag-member'],
        ['layer member that is not a place', function ($d) {
            edit_json($d, 'layers.json', function ($j) {
                $j['layers'][0]['members'][] = ['place' => '88888888-8888-4888-8888-888888888888'];
                return $j;
            });
        }, 'layer-member-missing'],
        ['layer member twice', function ($d) {
            edit_json($d, 'layers.json', function ($j) {
                $j['layers'][0]['members'][] = $j['layers'][0]['members'][0];
                return $j;
            });
        }, 'layer-member-duplicate'],
        ['layer category that does not exist', function ($d) {
            edit_json($d, 'layers.json', function ($j) {
                $j['layers'][0]['category'] = '99999999-9999-4999-8999-999999999999';
                return $j;
            });
        }, 'layer-category'],
        ['layer colour in upper case', function ($d) {
            edit_json($d, 'layers.json', function ($j) {
                $j['layers'][0]['color'] = '#AABBCC';
                return $j;
            });
        }, 'layer-color'],
        ['layer with two descriptions in one language', function ($d) {
            edit_json($d, 'layers.json', function ($j) {
                $j['layers'][0]['descriptions'] = [['lang' => 'en', 'text' => 'a'], ['lang' => 'en', 'text' => 'b']];
                return $j;
            });
        }, 'layer-description-duplicate'],
        ['layer name in a language outside the dictionary', function ($d) {
            edit_json($d, 'layers.json', function ($j) {
                $j['layers'][0]['names'][0]['lang'] = 'zz';
                return $j;
            });
        }, 'layer-language'],
        ['layer stamp not UTC ISO', function ($d) {
            edit_json($d, 'layers.json', function ($j) {
                $j['layers'][0]['created'] = '2026-11-04 10:00:00';
                return $j;
            });
        }, 'layer-stamp'],
        ['category id twice', function ($d) {
            edit_json($d, 'categories.json', function ($j) {
                $j['categories'][1]['id'] = $j['categories'][0]['id'];
                return $j;
            });
        }, 'category-id-duplicate'],
        ['layer note folder of a layer that does not exist', function ($d) {
            $l = '12121212-1212-4212-8212-121212121212';
            mkdir("$d/layer-notes/$l");
            file_put_contents("$d/layer-notes/$l/55555555-5555-4555-8555-555555555555.md", "---\nid: 55555555-5555-4555-8555-555555555555\nlang: en\ntitle: t\n---\nx\n");
        }, 'layer-note-orphan'],
        ['overlay image missing', function ($d) {
            file_put_contents("$d/overlays.json", json_encode(['version' => 1, 'overlays' => [[
                'id' => '31313131-3131-4131-8131-313131313131', 'file' => 'gone.png', 'coordinates' => [[1, 1], [2, 1], [2, 0], [1, 0]]]]]));
        }, 'overlay-file'],
        ['language code twice', function ($d) {
            edit_json($d, 'languages.json', function ($j) {
                $j['languages'][] = $j['languages'][0];
                return $j;
            });
        }, 'language-duplicate'],
        ['notes index out of date (a note edited by hand)', function ($d) {
            $f = glob("$d/notes/*/*.md")[0];
            file_put_contents($f, str_replace("---\n", "---\n", file_get_contents($f)) . "added by hand\n");
        }, 'index-drift'],
        ['notes index missing', function ($d) {
            unlink("$d/notes/index.json");
        }, 'index-missing'],
    ];
}

foreach (defects() as [$what, $defect, $code]) {
    test("the checker reports [$code]: $what", function () use ($defect, $code) {
        [$dir] = clean_data();
        $defect($dir);
        $got = codes(DataCheck::run($dir));
        ok(in_array($code, $got, true), "expected [$code], got [" . implode(', ', $got) . ']');
    });
}

test('the command line mode: exit 0 on a clean store, 1 on a broken one, and it prints the problem', function () {
    [$dir] = clean_data();
    $run = function ($d) {
        exec('php ' . escapeshellarg(__DIR__ . '/run.php') . ' ' . escapeshellarg($d) . ' 2>&1', $out, $code);
        return [$code, implode("\n", $out)];
    };
    [$code, $out] = $run($dir);
    same(0, $code, $out);
    unlink("$dir/languages.json");
    [$code, $out] = $run($dir);
    same(1, $code);
    ok(strpos($out, '[file-missing]') !== false, $out);
});
