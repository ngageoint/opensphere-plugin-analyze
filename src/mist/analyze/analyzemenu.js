goog.declareModuleId('mist.analyze.menu');

import Menu from 'opensphere/src/os/ui/menu/menu.js';
import MenuItem from 'opensphere/src/os/ui/menu/menuitem.js';
import MenuItemType from 'opensphere/src/os/ui/menu/menuitemtype.js';
import {Analyze} from '../metrics/keys.js';
import {openExternal, openInternal} from './analyze.js';
import {AnalyzeEventType} from './eventtype.js';


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
