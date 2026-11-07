<?php
namespace ahm\map;

/** On first enable, copies the sample data (ext/ahm/map/data) into store/ahm_map, where the map keeps its live data. */
class ext extends \phpbb\extension\base
{
    public function enable_step($old_state)
    {
        if ($old_state === false) {
            $root = $this->container->getParameter('core.root_path');
            $dst = $root . 'store/ahm_map/';
            if (!is_file($dst . 'places.geojson')) {
                self::copy_tree(__DIR__ . '/data/', $dst);
            }
            (new \ahm\map\service\store($dst))->migrate();      // also converts notes saved by older versions
            return 'seeded';
        }
        return parent::enable_step($old_state);
    }

    private static function copy_tree($src, $dst)
    {
        @mkdir($dst, 0775, true);
        foreach (scandir($src) as $name) {
            if ($name === '.' || $name === '..') { continue; }
            if (is_dir($src . $name)) { self::copy_tree($src . $name . '/', $dst . $name . '/'); }
            else { copy($src . $name, $dst . $name); }
        }
    }
}
