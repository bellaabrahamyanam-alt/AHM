<?php
namespace ahm\map\service;

/**
 * Dates, server side. Mirrors app/js/dates.js (read the comment at its top for the model):
 *   null (unknown)  or  ['fmt' => 'dmy', 'ts' => '1500-03-21T00:00:00Z', 'mode' => exact|approx|range, 'ts_to' => null|<ts>]
 * `ts` is an ISO 8601 / RFC 3339 UTC time stamp of the start of the period: years 0000-9999 with four digits, other years
 * (every BCE year; 0000 = 1 BCE) as a sign and six digits, e.g. '-001199-01-01T00:00:00Z' = 1200 BCE.
 * Knows nothing about phpBB. Integer arithmetic only (needs 64-bit PHP for years far from 1970, as every PHP 7+ on a 64-bit host).
 */
class dates
{
    const FORMATS = ['ymd', 'dmy', 'mdy', 'dmony', 'mony', 'y', 'c', 'm'];
    const MODES = ['exact', 'approx', 'range'];
    const DAY = 86400;
    const MIN_YEAR = -100000;
    const MAX_YEAR = 100000;

    private static function bad($m)
    {
        return new \InvalidArgumentException($m);
    }

    /** Floor division and modulo that also work for negative numbers. */
    private static function fl($a, $b)
    {
        $q = intdiv($a, $b);
        return $a % $b !== 0 && ($a < 0) !== ($b < 0) ? $q - 1 : $q;
    }

    private static function md($a, $b)
    {
        return (($a % $b) + $b) % $b;
    }

    public static function days_from_civil($y, $m, $d)
    {
        $y -= $m <= 2 ? 1 : 0;
        $era = self::fl($y, 400);
        $yoe = $y - $era * 400;
        $doy = self::fl(153 * ($m + ($m > 2 ? -3 : 9)) + 2, 5) + $d - 1;
        $doe = $yoe * 365 + self::fl($yoe, 4) - self::fl($yoe, 100) + $doy;
        return $era * 146097 + $doe - 719468;
    }

    /** @return int[] [astronomical year, month, day] */
    public static function civil_from_days($z)
    {
        $z += 719468;
        $era = self::fl($z, 146097);
        $doe = $z - $era * 146097;
        $yoe = self::fl($doe - self::fl($doe, 1460) + self::fl($doe, 36524) - self::fl($doe, 146096), 365);
        $doy = $doe - (365 * $yoe + self::fl($yoe, 4) - self::fl($yoe, 100));
        $mp = self::fl(5 * $doy + 2, 153);
        $d = $doy - self::fl(153 * $mp + 2, 5) + 1;
        $m = $mp + ($mp < 10 ? 3 : -9);
        return [$yoe + $era * 400 + ($m <= 2 ? 1 : 0), $m, $d];
    }

    private static function jan($y)
    {
        return self::days_from_civil($y, 1, 1) * self::DAY;
    }

    private static function is_leap($a)
    {
        return self::md($a, 4) === 0 && (self::md($a, 100) !== 0 || self::md($a, 400) === 0);
    }

    private static function days_in_month($a, $m)
    {
        return $m === 2 ? (self::is_leap($a) ? 29 : 28) : (in_array($m, [4, 6, 9, 11], true) ? 30 : 31);
    }

    /** 'YYYY-MM-DDTHH:MM:SSZ'; years outside 0000-9999 as +/-YYYYYY (ISO 8601 expanded year, 0000 = 1 BCE). */
    public static function sec_to_iso($sec)
    {
        $days = self::fl($sec, self::DAY);
        $rem = $sec - $days * self::DAY;
        list($a, $m, $d) = self::civil_from_days($days);
        $y = $a >= 0 && $a <= 9999 ? sprintf('%04d', $a) : ($a < 0 ? '-' : '+') . sprintf('%06d', abs($a));
        return sprintf('%s-%02d-%02dT%02d:%02d:%02dZ', $y, $m, $d, intdiv($rem, 3600), intdiv($rem % 3600, 60), $rem % 60);
    }

    /** Seconds since 1970-01-01T00:00:00Z for a canonical time stamp, or null when the text is not one. */
    public static function iso_to_sec($s)
    {
        if (!is_string($s) || !preg_match('/^(\d{4}|[+-]\d{6})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z\z/', $s, $m)) {
            return null;
        }
        $a = (int) $m[1];
        list($mo, $d, $h, $mi, $se) = [(int) $m[2], (int) $m[3], (int) $m[4], (int) $m[5], (int) $m[6]];
        if ($mo < 1 || $mo > 12 || $d < 1 || $d > self::days_in_month($a, $mo) || $h > 23 || $mi > 59 || $se > 59) {
            return null;
        }
        $sec = self::days_from_civil($a, $mo, $d) * self::DAY + $h * 3600 + $mi * 60 + $se;
        return self::sec_to_iso($sec) === $s ? $sec : null; // one way to write each moment
    }

    /** Dates saved by the first version of this model had `ts` as whole seconds (a number): the same date with ISO text. */
    public static function upgrade($d)
    {
        if (!is_array($d) || !isset($d['ts']) || !is_int($d['ts'])) {
            return $d;
        }
        $d['ts'] = self::sec_to_iso($d['ts']);
        if (isset($d['ts_to']) && is_int($d['ts_to'])) {
            $d['ts_to'] = self::sec_to_iso($d['ts_to']);
        }
        return $d;
    }

    /** True when ts (a time stamp text) is exactly the start of a period of this format. */
    public static function aligned($fmt, $ts)
    {
        $sec = self::iso_to_sec($ts);
        if ($sec === null || self::md($sec, self::DAY) !== 0) {
            return false;
        }
        list($a, $m, $d) = self::civil_from_days(intdiv($sec, self::DAY));
        if ($a < self::MIN_YEAR || $a > self::MAX_YEAR) {
            return false;
        }
        switch ($fmt) {
            case 'mony':
                return $d === 1;
            case 'y':
                return $m === 1 && $d === 1;
            case 'c':
                return $m === 1 && $d === 1 && self::md($a - 1, 100) === 0;
            case 'm':
                return $m === 1 && $d === 1 && self::md($a - 1, 1000) === 0;
        }
        return true;
    }

    /** First moment after the period that starts at the time stamp text $ts, as a time stamp text. */
    public static function period_end($fmt, $ts)
    {
        return self::sec_to_iso(self::period_end_sec($fmt, self::iso_to_sec($ts)));
    }

    /** First second after the period that starts at $sec seconds. */
    private static function period_end_sec($fmt, $sec)
    {
        list($a, $m) = self::civil_from_days(intdiv($sec, self::DAY));
        switch ($fmt) {
            case 'mony':
                return $m === 12 ? self::jan($a + 1) : self::days_from_civil($a, $m + 1, 1) * self::DAY;
            case 'y':
                return self::jan($a + 1);
            case 'c':
                return self::jan($a + 100);
            case 'm':
                return self::jan($a + 1000);
        }
        return $sec + self::DAY;
    }

    /** Checks a date from a browser or a file. Returns the normalised date or null. Throws \InvalidArgumentException. */
    public static function clean($d, $what = 'date')
    {
        if ($d === null) {
            return null;
        }
        if (!is_array($d)) {
            throw self::bad("$what: not a valid date");
        }
        $d = self::upgrade($d);
        $fmt = $d['fmt'] ?? null;
        $mode = $d['mode'] ?? null;
        $ts = $d['ts'] ?? null;
        $to = $d['ts_to'] ?? null;
        if (!in_array($fmt, self::FORMATS, true)) {
            throw self::bad("$what: unknown date format");
        }
        if (!in_array($mode, self::MODES, true)) {
            throw self::bad("$what: choose exact, approximate or range");
        }
        if (!self::aligned($fmt, $ts)) {
            throw self::bad("$what: the time stamp does not match the chosen format");
        }
        if ($mode === 'range') {
            if (!self::aligned($fmt, $to)) {
                throw self::bad("$what: the end of the range does not match the chosen format");
            }
            if (self::iso_to_sec($to) <= self::iso_to_sec($ts)) {
                throw self::bad("$what: the end of the range must be after its start");
            }
        } elseif ($to !== null) {
            throw self::bad("$what: only a range has an end");
        }
        return ['fmt' => $fmt, 'ts' => $ts, 'mode' => $mode, 'ts_to' => $mode === 'range' ? $to : null];
    }

    /** [from, to) a date can mean, as seconds since 1970. */
    public static function bounds(array $d)
    {
        return [
            self::iso_to_sec($d['ts']),
            self::period_end_sec($d['fmt'], self::iso_to_sec($d['mode'] === 'range' ? $d['ts_to'] : $d['ts']))
        ];
    }

    /** Throws when a "from" date lies after the end of a "to" date. Either may be null. */
    public static function order_check($from, $to)
    {
        if ($from && $to && self::bounds($from)[0] >= self::bounds($to)[1]) {
            throw self::bad('the "from" date is after the "to" date');
        }
    }

    /** Astronomical year of a CE/BCE year, century or millennium start. */
    private static function ts_of($fmt, $era, $n)
    {
        if ($fmt === 'y') {
            $a = $era === 'CE' ? $n : 1 - $n;
        } else {
            $k = $fmt === 'c' ? 100 : 1000;
            $a = $era === 'CE' ? $k * ($n - 1) + 1 : -$k * $n + 1;
        }
        return self::sec_to_iso(self::jan($a));
    }

    /**
     * Old data (before this model): a year number (negative = BCE, no year 0), the wording as typed and an "approximate" flag.
     * Returns a date or null when nothing usable is there.
     */
    public static function from_legacy($year, $text, $approx)
    {
        $mode = $approx ? 'approx' : 'exact';
        $s = strtolower(trim((string) $text));
        $s = trim(preg_replace('/\s+/', ' ', str_replace('.', '', $s)));
        $s = preg_replace_callback(
            '/^(circa|ca|c|~)\s+(?=[-\d])/',
            function () use (&$mode) {
                $mode = 'approx';
                return '';
            },
            $s
        );
        if ($s !== '' && preg_match('/^(early|mid|late)?\s*(-)?\s*(\d{1,3})(?:st|nd|rd|th)?\s*(?:century|cent|cen|c)\s*(bce|bc|ce|ad)?$/', $s, $m)) {
            $n = (int) $m[3];
            if ($n >= 1 && $n <= 1000) {
                if ($m[1] !== '') {
                    $mode = 'approx'; // the third ("early") is not kept
                }
                $bce = $m[2] !== '' || in_array($m[4] ?? '', ['bce', 'bc'], true);
                return ['fmt' => 'c', 'ts' => self::ts_of('c', $bce ? 'BCE' : 'CE', $n), 'mode' => $mode, 'ts_to' => null];
            }
        }
        if ($s !== '' && preg_match('/^(?:ad|ce)?\s*(-)?\s*(\d{1,6})\s*(bce|bc|ce|ad)?$/', $s, $m) && (int) $m[2] >= 1 && (int) $m[2] <= 99999) {
            $bce = $m[1] !== '' || in_array($m[3] ?? '', ['bce', 'bc'], true);
            return ['fmt' => 'y', 'ts' => self::ts_of('y', $bce ? 'BCE' : 'CE', (int) $m[2]), 'mode' => $mode, 'ts_to' => null];
        }
        if ($year === null || $year === '' || (int) $year === 0 || abs((int) $year) > 99999) {
            return null;
        }
        $y = (int) $year;
        return ['fmt' => 'y', 'ts' => self::ts_of('y', $y < 0 ? 'BCE' : 'CE', abs($y)), 'mode' => $mode, 'ts_to' => null];
    }
}
