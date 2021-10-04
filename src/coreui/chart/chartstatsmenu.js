goog.declareModuleId('coreui.chart.statsmenu');

import Menu from 'opensphere/src/os/ui/menu/menu.js';
import MenuItem from 'opensphere/src/os/ui/menu/menuitem.js';
import MenuItemType from 'opensphere/src/os/ui/menu/menuitemtype.js';
import {StatType, StatTitle} from './chartstats.js';

const {default: MenuEvent} = goog.requireType('os.ui.menu.MenuEvent');


/**
 * Show a menu item if the context is a valid coordinate.
 *
 * @param {Object<string, boolean>} options The stat options.
 * @this {MenuItem}
 */
const beforeRender = function(options) {
  if (options && this.eventType) {
    const icon = options[this.eventType] ? 'fas fa-check-square' : 'far fa-square';
    this.icons = ['<i class="fa-fw ' + icon + '"></i>'];
  }
};


/**
 * Create a stat menu.
 * @param {!Object<string, boolean>} options The stat options.
 * @param {Function} callback Callback to fire on options change.
 * @return {!Menu} The menu.
 */
export const create = (options, callback) => {
  const menuRoot = new MenuItem({
    type: MenuItemType.ROOT
  });

  for (const key in StatType) {
    const type = StatType[key];
    options[type] = options[type] || false;

    menuRoot.addChild({
      eventType: type,
      label: StatTitle[type],
      tooltip: StatTitle[type],
      closeOnSelect: false,
      beforeRender: beforeRender,
      handler:
          /**
           * Show a menu item if the context is a valid coordinate.
           * @param {MenuEvent} event The event.
           * @this {MenuItem}
           */
          function(event) {
            const options = event.getContext();
            if (options) {
              options[event.type] = !options[event.type];
              event.target.reopen();

              if (callback) {
                callback();
              }
            }
          }
    });
  }

  return new Menu(menuRoot);
};
