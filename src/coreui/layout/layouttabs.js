goog.declareModuleId('coreui.layout.LayoutTabsUI');

import './dragcomponent.js';
import {unsafeClone} from 'opensphere/src/os/object/object.js';
import Menu from 'opensphere/src/os/ui/menu/menu.js';
import MenuItem from 'opensphere/src/os/ui/menu/menuitem.js';
import MenuItemType from 'opensphere/src/os/ui/menu/menuitemtype.js';
import Module from 'opensphere/src/os/ui/module.js';
import {apply, measureText} from 'opensphere/src/os/ui/ui.js';
import * as ConfirmTextUI from 'opensphere/src/os/ui/window/confirmtext.js';
import {ROOT} from '../../tools/tools.js';
import {LayoutTabsEvent} from './layouttabsevent.js';
import {TabParams} from './tabparams.js';

const Disposable = goog.require('goog.Disposable');
const googArray = goog.require('goog.array');
const ViewportSizeMonitor = goog.require('goog.dom.ViewportSizeMonitor');
const GoogEventType = goog.require('goog.events.EventType');
const {getRandomString, truncate} = goog.require('goog.string');

const {default: MenuEvent} = goog.requireType('os.ui.menu.MenuEvent');


/**
 * The layout tabs directive.
 * @return {angular.Directive}
 */
export const directive = () => ({
  restrict: 'E',
  replace: true,
  scope: {
    'layoutConfigs': '='
  },
  controller: Controller,
  controllerAs: 'layoutTabsCtrl',
  templateUrl: ROOT + 'views/layout/layouttabs.html'
});

/**
 * The element tag for the directive.
 * @type {string}
 */
export const directiveTag = 'layout-tabs';

/**
 * Add the directive to the module.
 */
Module.directive('layoutTabs', [directive]);

/**
 * Controller function for the component-flyout directive.
 * @unrestricted
 */
export class Controller extends Disposable {
  /**
   * Constructor.
   * @param {!angular.Scope} $scope The Angular scope.
   * @param {!angular.JQLite} $element The root DOM element.
   * @param {!angular.$timeout} $timeout The Angular timeout.
   * @ngInject
   */
  constructor($scope, $element, $timeout) {
    super();

    /**
     * The Angular scope.
     * @type {?angular.Scope}
     * @protected
     */
    this.scope = $scope;

    /**
     * The root DOM element.
     * @type {?angular.JQLite}
     * @protected
     */
    this.element = $element;

    /**
     * Viewport size monitor for monitor resizes and updating the tabbing layout.
     * @type {goog.dom.ViewportSizeMonitor}
     * @protected
     */
    this.vsm = ViewportSizeMonitor.getInstanceForWindow();

    /**
     * Menu for right clicks on individual tabs.
     * @type {Menu<GoldenLayout.Config>}
     * @protected
     */
    this.menu = new Menu(new MenuItem({
      type: MenuItemType.ROOT,
      children: [{
        label: 'Rename Tab',
        eventType: LayoutTabsEvent.RENAME,
        tooltip: 'Rename the tab',
        icons: ['<i class="fa fa-fw fa-i-cursor"></i>'],
        handler: this.onMenuEvent.bind(this),
        sort: 100
      },
      {
        label: 'Duplicate Tab',
        eventType: LayoutTabsEvent.DUPLICATE,
        tooltip: 'Create an identical copy of this tab',
        icons: ['<i class="fa fa-fw fa-copy"></i>'],
        handler: this.onMenuEvent.bind(this),
        sort: 101
      },
      {
        label: 'Close Tab',
        eventType: LayoutTabsEvent.CLOSE,
        tooltip: 'Close the tab',
        icons: ['<i class="fa fa-fw fa-times"></i>'],
        handler: this.onMenuEvent.bind(this),
        beforeRender: this.beforeRender,
        sort: 102
      },
      {
        label: 'Close Other Tabs',
        eventType: LayoutTabsEvent.CLOSE_OTHER,
        tooltip: 'Disable all active application states',
        icons: ['<i class="fa fa-fw fa-times"></i>'],
        handler: this.onMenuEvent.bind(this),
        sort: 103
      },
      {
        label: 'Close Tabs to the Right',
        eventType: LayoutTabsEvent.CLOSE_TO_THE_RIGHT,
        tooltip: 'Disable all active application states',
        icons: ['<i class="fa fa-fw fa-times"></i>'],
        handler: this.onMenuEvent.bind(this),
        sort: 104
      }]
    }));

    /**
     * Menu for extra tabs to be placed into. Only used when there are more tabs than can fit in the space available.
     * @type {Menu<undefined>}
     * @protected
     */
    this.extraTabsMenu = null;

    /**
     * The configs currently being shown in the menu.
     * @type {Array<GoldenLayout.Config>}
     */
    this['extraTabs'] = [];

    /**
     * The configs currently being used as tabs.
     * @type {Array<GoldenLayout.Config>}
     */
    this['tabs'] = [];

    this.calculateTabs();

    $timeout(function() {
      $element.find('.js-layout-tabs').sortable({
        'items': '.js-layout-tab',
        'containment': '.js-layout-tabs',
        'snap': true,
        'axis': 'x',
        'tolerance': 'pointer',
        'revert': true,
        'start': function(event, ui) {
          ui['item'].find('.handle').addClass('moving');
        },
        'stop': this.onDragEnd.bind(this)
      });
    }.bind(this));

    this.vsm.listen(GoogEventType.RESIZE, this.calculateTabs, false, this);
    $scope.$on('$destroy', this.dispose.bind(this));
  }

  /**
   * @inheritDoc
   */
  disposeInternal() {
    super.disposeInternal();
    this.element.find('.js-layout-tabs').sortable('destroy');
    this.vsm.unlisten(GoogEventType.RESIZE, this.calculateTabs, false, this);
  }

  /**
   * This function calculates the total width needed by all of the current tabs. If it fits, they are all displayed.
   * If not, tabs are moved into a menu until they do.
   */
  calculateTabs() {
    // use the width of the container minus the width of the + and menu buttons
    var availableWidth =
      /** @type {number} */ (this.element.find('.js-layout-tabs').innerWidth()) - TabParams.PLUS_MENU_WIDTH;
    var configs = this.scope['layoutConfigs'].slice();
    var totalTabWidth = 0;
    var removed = [];

    // calculate the total width that each tab config would be if they were rendered
    configs.forEach(function(config) {
      // measure the text and add the static width of each row (borders, padding, X button)
      var textWidth = Math.min(measureText(config['title']).width + TabParams.CLOSE_WIDTH,
          TabParams.MAX_WIDTH);
      var width = Math.max(textWidth, TabParams.MIN_WIDTH);
      config['width'] = width;
      totalTabWidth += width;
    });

    if (totalTabWidth > availableWidth) {
      // remove configs until they fit
      var i = configs.length;
      while (i--) {
        var config = configs[i];

        if (!config['active']) {
          totalTabWidth -= config['width'];

          // remove it from the tab configs and add it to the menu configs
          configs.splice(i, 1);
          removed.push(config);

          if (totalTabWidth < availableWidth) {
            this['tabs'] = configs;
            break;
          }
        }
      }
    } else {
      this['tabs'] = configs;
    }

    this.updateMenu(removed);
    apply(this.scope);
  }

  /**
   * Updates the extra tabs menu from a set of configs.
   * @param {Array<GoldenLayout.Config>} configs The config of the tab to set.
   */
  updateMenu(configs) {
    if (!this.extraTabsMenu) {
      this.extraTabsMenu = new Menu(new MenuItem({
        type: MenuItemType.ROOT
      }));
    }

    // reset the menu and the array
    var menuRoot = this.extraTabsMenu.getRoot();
    if (menuRoot.children) {
      menuRoot.children.length = 0;
    }
    this['extraTabs'] = configs;

    if (!configs.length) {
      // leave the menu empty
      return;
    }

    configs.forEach(function(config) {
      var menuItem = {
        label: truncate(config['title'], 30),
        eventType: LayoutTabsEvent.EXTRA_TAB + getRandomString(),
        tooltip: 'Switch to this tab',
        handler: this.onExtraTabEvent.bind(this, config),
        sort: 103
      };

      menuRoot.addChild(menuItem);
    }.bind(this));
  }

  /**
   * Handler for menu events.
   * @param {MenuEvent<GoldenLayout.Config>} event The event.
   */
  onMenuEvent(event) {
    var config = event.getContext();

    if (config) {
      switch (event.type) {
        case LayoutTabsEvent.RENAME:
          // launch a dialog to rename it
          this.renameTab(config);
          break;
        case LayoutTabsEvent.DUPLICATE:
          // clone it and add it, but remove the hashKey or Angular will blow up (also make them closable)
          config = unsafeClone(config);
          config['showClose'] = true;
          delete config['$$hashKey'];

          this.addTab(config);
          break;
        case LayoutTabsEvent.CLOSE:
          this.removeTab(config);
          break;
        case LayoutTabsEvent.CLOSE_OTHER:
        case LayoutTabsEvent.CLOSE_TO_THE_RIGHT:
          var configs;
          if (event.type == LayoutTabsEvent.CLOSE_OTHER) {
            configs = this.scope['layoutConfigs'].slice();
            googArray.remove(configs, config);
          } else {
            configs = this['tabs'].slice();
            var idx = configs.indexOf(config);
            configs = configs.slice(idx + 1).concat(this['extraTabs']);
          }

          configs.forEach(function(c) {
            if (c['showClose']) {
              this.removeTab(c, true);
            }
          }.bind(this));

          this.calculateTabs();
          break;
        default:
          break;
      }
    }
  }

  /**
   * Menu pre-render hook.
   * @param {GoldenLayout.Config} config The config of the tab.
   * @this {MenuItem}
   */
  beforeRender(config) {
    this.visible = true;

    if (this.eventType == LayoutTabsEvent.CLOSE && config['showClose'] != null) {
      this.visible = config['showClose'];
    }
  }

  /**
   * Handler for extra tab menu events.
   * @param {GoldenLayout.Config} config The config of the tab.
   * @param {MenuEvent<GoldenLayout.Config>} event The event.
   */
  onExtraTabEvent(config, event) {
    this.setTab(config);
    apply(this.scope);
  }

  /**
   * Opens the menu for the selected tab.
   * @param {angular.Scope.Event} event The event.
   * @param {GoldenLayout.Config} config The config of the tab.
   * @export
   */
  openMenu(event, config) {
    var position = {
      my: 'left top+3',
      at: 'left bottom',
      of: $(event.target),
      within: $(document.firstElementChild)
    };
    this.menu.open(config, position);
  }

  /**
   * Opens the menu for the extra tabs.
   * @param {angular.Scope.Event} event The event.
   * @export
   */
  openExtraTabsMenu(event) {
    var position = {
      my: 'right top+3',
      at: 'right bottom',
      of: $(event.target),
      within: $(document.firstElementChild)
    };
    this.extraTabsMenu.open(undefined, position);
  }

  /**
   * Sets the current active tab.
   * @param {GoldenLayout.Config} config The config of the tab to set.
   * @export
   */
  setTab(config) {
    if (!config['active']) {
      this.scope.$emit('toolsNav.setTab', config);

      var idx = this['tabs'].indexOf(config);
      if (idx == -1) {
        // move the item to the front of the layoutConfigs and recalculate the tabs
        idx = this.scope['layoutConfigs'].indexOf(config);
        this.scope['layoutConfigs'].splice(idx, 1);
        this.scope['layoutConfigs'].unshift(config);
        this.calculateTabs();
      }
    }
  }

  /**
   * Adds a new tab.
   * @param {GoldenLayout.Config=} opt_config Optional config to add.
   * @export
   */
  addTab(opt_config) {
    this.scope.$emit('toolsNav:addTab', opt_config);
    this.calculateTabs();
  }

  /**
   * Removes the tab corresponding to the config passed in.
   * @param {GoldenLayout.Config} config The config of the tab to remove.
   * @param {boolean=} opt_skipCalculate Whether to skip recalculating the tab configuration (for bulk removes).
   * @export
   */
  removeTab(config, opt_skipCalculate) {
    this.scope.$emit('toolsNav.removeTab', config);

    if (!opt_skipCalculate) {
      this.calculateTabs();
    }
  }

  /**
   * Handler for drag end.
   * @param {!jQuery.Event} event
   * @param {!{item: Element}} ui
   * @private
   */
  onDragEnd(event, ui) {
    var item = /** @type {jQuery} */ (ui['item']);
    var config = /** @type {GoldenLayout.Config} */ (item.scope()['config']);

    if (config) {
      item.find('.handle').removeClass('moving');

      // find the index we dropped it into
      var eles = this.element.find('.js-layout-tab');
      var newTabIndex = googArray.findIndex(eles, function(el) {
        return el == item[0];
      });

      googArray.remove(this.scope['layoutConfigs'], config);
      googArray.insertAt(this.scope['layoutConfigs'], config, newTabIndex);
      this.calculateTabs();
    }
  }

  /**
   * Launches a dialog to rename a tab.
   * @param {!GoldenLayout.Config} config
   */
  renameTab(config) {
    ConfirmTextUI.launchConfirmText({
      confirm: (title) => {
        // set the title and recalculate the tabs
        config['title'] = title;
        this.calculateTabs();
      },
      defaultValue: config['title'],
      prompt: 'Choose a new tab name:',
      select: true,
      windowOptions: /** @type {!osx.window.WindowOptions} */ ({
        icon: 'fa fa-i-cursor',
        label: 'Rename Tab'
      })
    });
  }
}
