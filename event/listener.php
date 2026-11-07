<?php
namespace ahm\map\event;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;

class listener implements EventSubscriberInterface
{
    protected $helper;
    protected $template;

    public function __construct(\phpbb\controller\helper $helper, \phpbb\template\template $template)
    {
        $this->helper = $helper;
        $this->template = $template;
    }

    public static function getSubscribedEvents()
    {
        return ['core.user_setup' => 'load_language', 'core.page_header' => 'add_link'];
    }

    public function load_language($event)
    {
        $lang_set_ext = $event['lang_set_ext'];
        $lang_set_ext[] = ['ext_name' => 'ahm/map', 'lang_set' => 'common'];
        $event['lang_set_ext'] = $lang_set_ext;
    }

    public function add_link()
    {
        $this->template->assign_var('U_AHM_MAP', $this->helper->route('ahm_map_page', [], false));
    }
}
