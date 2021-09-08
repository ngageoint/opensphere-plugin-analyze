goog.declareModuleId('mist.analyze.menu');

import {AnalyzeEventType} from './eventtype.js';
import {openExternal, openInternal} from './analyze.js';
import {Analyze} from '../metrics/keys.js';

const Menu = goog.require('os.ui.menu.Menu');
const MenuItem = goog.require('os.ui.menu.MenuItem');
const MenuItemType = goog.require('os.ui.menu.MenuItemType');


/**
 * Analyze menu.
 * @type {(Menu<undefined>|undefined)}
 */
export let MENU = new Menu(new MenuItem({
  type: MenuItemType.ROOT,
  children: [{
    label: 'New Tab',
    eventType: AnalyzeEventType.TOOLS_EXTERNAL,
    tooltip: 'Open analysis tools in a new browser tab',
    icons: ['<i class="fa fa-fw fa-external-link"></i>'],
    metricKey: Analyze.OPEN,
    sort: 10
  }, {
    label: 'Internal Window',
    eventType: AnalyzeEventType.TOOLS_INTERNAL,
    tooltip: 'Open analysis tools in an internal window',
    icons: ['<i class="fa fa-fw fa-list-alt"></i>'],
    metricKey: Analyze.OPEN,
    sort: 20
  }]
}));

/**
 * Sets up analyze actions
 */
export const setup = function() {
  const menu = MENU;
  if (menu) {
    menu.listen(AnalyzeEventType.TOOLS_EXTERNAL, openExternal);
    menu.listen(AnalyzeEventType.TOOLS_INTERNAL, openInternal);
  }
};

/**
 * Disposes analyze actions
 */
export const dispose = function() {
  goog.dispose(MENU);
  MENU = undefined;
};
