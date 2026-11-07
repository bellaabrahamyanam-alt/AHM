<?php
/**
 * Test runner for the PHP part of ahm/map (service/dates.php, service/store.php, controller/main.php, config/routing.yml).
 * No dependencies, no phpBB needed:   php tests/php/run.php [filter]
 * `filter` = part of a test file or test name. Exit code 0 = all passed.
 */
require __DIR__ . '/harness.php';

$filter = $argv[1] ?? '';
foreach (glob(__DIR__ . '/*Test.php') as $file) {
    require $file;
}
exit(\ahm\map\tests\run($filter) ? 0 : 1);
