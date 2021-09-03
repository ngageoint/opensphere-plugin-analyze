goog.module('mist.analyze.menu');
goog.module.declareLegacyNamespace();

const EventType = goog.require('mist.action.EventType');
const analyze = goog.require('mist.analyze');
const keys = goog.require('mist.metrics.keys');
const Menu = goog.require('os.ui.menu.Menu');
const MenuItem = goog.require('os.ui.menu.MenuItem');
const MenuItemType = goog.require('os.ui.menu.MenuItemType');


/**
 * Analyze menu.
 * @type {(Menu<undefined>|undefined)}
 */
analyze.MENU = new Menu(new MenuItem({
  type: MenuItemType.ROOT,
  children: [{
    label: 'New Tab',
    eventType: EventType.TOOLS_EXTERNAL,
    tooltip: 'Open analysis tools in a new browser tab',
    icons: ['<i class="fa fa-fw fa-external-link"></i>'],
    metricKey: keys.Analyze.OPEN,
    sort: 10
  }, {
    label: 'Internal Window',
    eventType: EventType.TOOLS_INTERNAL,
    tooltip: 'Open analysis tools in an internal window',
    icons: ['<i class="fa fa-fw fa-list-alt"></i>'],
    metricKey: keys.Analyze.OPEN,
    sort: 20
  }]
}));


/**
 * Sets up analyze actions
 */
const setup = function() {
  const menu = analyze.MENU;
  if (menu) {
    menu.listen(EventType.TOOLS_EXTERNAL, analyze.openExternal);
    menu.listen(EventType.TOOLS_INTERNAL, analyze.openInternal);
  }
};

/**
 * Disposes analyze actions
 */
const dispose = function() {
  goog.dispose(analyze.MENU);
  analyze.MENU = undefined;
};

exports = {
  setup,
  dispose
};
