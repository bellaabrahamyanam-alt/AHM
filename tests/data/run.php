<?php
/**
 * Data tests for ahm/map: checks the data files, not the code.
 *   php tests/data/run.php                 the shipped sample data (as shipped = notices; after migration = strict) + the checker's own tests
 *   php tests/data/run.php /path/to/store  read-only check of a live store (strict; exit code 1 on any problem)
 */
require dirname(__DIR__) . '/php/harness.php';
require __DIR__ . '/DataCheck.php';

use ahm\map\tests\DataCheck;

if (isset($argv[1]) && is_dir($argv[1])) {
    $p = DataCheck::run($argv[1]);
    foreach ($p as [$code, $msg]) {
        echo "  [$code] $msg\n";
    }
    echo count($p) ? count($p) . " problem(s) in $argv[1]\n" : "no problems in $argv[1]\n";
    exit(count($p) ? 1 : 0);
}
foreach (glob(__DIR__ . '/*Test.php') as $f) {
    require $f;
}
exit(\ahm\map\tests\run($argv[1] ?? '') ? 0 : 1);
