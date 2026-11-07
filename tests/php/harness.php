<?php
/** A very small test harness: test(), assertions, and a sandbox copy of the sample data. */
namespace ahm\map\tests;

$root = dirname(__DIR__, 2);
require_once $root . '/service/dates.php';
require_once $root . '/service/store.php';

use ahm\map\service\store;

class Failure extends \Exception
{
}

class Ctx
{
    public static $tests = [];
    public static $dirs = [];
    public static $asserts = 0;
    public static $file = '';
}

/** Registers a test. Tests of one file run in order; each should create its own sandbox. */
function test($name, callable $fn)
{
    Ctx::$tests[] = [basename(debug_backtrace()[0]['file'], '.php') . ': ' . $name, $fn];
}

function ok($cond, $msg = '')
{
    Ctx::$asserts++;
    if (!$cond) {
        throw new Failure($msg ?: 'expected true');
    }
}

function same($expected, $actual, $msg = '')
{
    Ctx::$asserts++;
    if ($expected !== $actual) {
        throw new Failure(($msg ? "$msg\n" : '') . '  expected: ' . json_encode($expected, JSON_UNESCAPED_UNICODE) .
            "\n  actual:   " . json_encode($actual, JSON_UNESCAPED_UNICODE));
    }
}

/** $fn must throw \InvalidArgumentException whose message matches $regex. */
function throws($regex, callable $fn, $msg = '')
{
    Ctx::$asserts++;
    try {
        $fn();
    } catch (\InvalidArgumentException $e) {
        if (!preg_match($regex, $e->getMessage())) {
            throw new Failure(($msg ? "$msg\n" : '') . "  wrong message: {$e->getMessage()} (wanted $regex)");
        }
        return;
    }
    throw new Failure(($msg ? "$msg\n" : '') . "  no error, wanted $regex");
}

/** A temporary copy of the sample data (data/); removed after the test. */
function sandbox($copySample = true)
{
    $dir = sys_get_temp_dir() . '/ahm_test_' . getmypid() . '_' . count(Ctx::$dirs);
    mkdir($dir, 0775, true);
    if ($copySample) {
        exec('cp -r ' . escapeshellarg(dirname(__DIR__, 2) . '/data') . '/. ' . escapeshellarg($dir));
    }
    Ctx::$dirs[] = $dir;
    return $dir;
}

/** A store on a sandbox with the sample data already migrated to the current format. */
function fresh_store(&$dir = null)
{
    $dir = sandbox();
    $s = new store($dir);
    $s->migrate();
    return $s;
}

function json_file($path)
{
    return json_decode(file_get_contents($path), true);
}

/** ids of all places in a sandbox, in file order */
function place_ids($dir)
{
    return array_map(function ($f) {
        return $f['properties']['id'];
    }, json_file("$dir/places.geojson")['features']);
}

function note_index($dir)
{
    return json_file("$dir/notes/index.json")['notes'];
}

function find_by($list, $key, $value)
{
    foreach ($list as $x) {
        if (($x[$key] ?? null) === $value) {
            return $x;
        }
    }
    return null;
}

function rrmdir($d)
{
    exec('rm -rf ' . escapeshellarg($d));
}

function run($filter = '')
{
    $pass = $fail = 0;
    $t0 = microtime(true);
    foreach (Ctx::$tests as [$name, $fn]) {
        if ($filter !== '' && stripos($name, $filter) === false) {
            continue;
        }
        try {
            $fn();
            $pass++;
            echo "  ok   $name\n";
        } catch (\Throwable $e) {
            $fail++;
            echo "  FAIL $name\n    " . str_replace("\n", "\n    ", $e->getMessage()) . "\n";
            if (!($e instanceof Failure)) {
                echo '    at ' . basename($e->getFile()) . ':' . $e->getLine() . "\n";
            }
        }
        foreach (Ctx::$dirs as $d) {
            rrmdir($d);
        }
        clearstatcache(); // the next sandbox may reuse a path
        Ctx::$dirs = [];
    }
    printf("\n%d passed, %d failed, %d assertions, %.1fs\n", $pass, $fail, Ctx::$asserts, microtime(true) - $t0);
    return $fail === 0;
}
