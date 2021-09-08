goog.declareModuleId('coreui.chart.statsmenu');

import {StatType, StatTitle} from './chartstats.js';

const Menu = goog.require('os.ui.menu.Menu');
const MenuItem = goog.require('os.ui.menu.MenuItem');
const MenuItemType = goog.require('os.ui.menu.MenuItemType');

const MenuEvent = goog.requireType('os.ui.menu.MenuEvent');


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
