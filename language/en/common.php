<?php
if (!defined('IN_PHPBB')) { exit; }
if (empty($lang) || !is_array($lang)) { $lang = []; }

$lang = array_merge($lang, [
    'AHM_MAP'            => 'Qartezadaran',
    'AHM_LOGIN_REQUIRED' => 'Please log in to view the map.',
]);
