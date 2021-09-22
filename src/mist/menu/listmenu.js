goog.declareModuleId('mist.menu.list');

import {instanceOf} from 'opensphere/src/os/classregistry.js';
import * as dispatcher from 'opensphere/src/os/dispatcher.js';
import {inIframe} from 'opensphere/src/os/os.js';
import {AnalyzeEventType} from '../analyze/eventtype.js';
import {Analyze} from '../metrics/keys.js';
import {launchDedupeUI} from '../ui/dedupedialog.js';
import {addGenericItems} from './toolsmenu.js';

const Event = goog.require('goog.events.Event');
const EventType = goog.require('os.action.EventType');
const buffer = goog.require('os.buffer');
const BufferDialogUI = goog.require('os.ui.buffer.BufferDialogUI');
const Menu = goog.require('os.ui.menu.Menu');
const MenuItem = goog.require('os.ui.menu.MenuItem');
const MenuItemType = goog.require('os.ui.menu.MenuItemType');
const {getSourcesFromContext} = goog.require('os.ui.menu.common');
const {GroupLabel: FeatureGroupLabel} = goog.require('os.ui.menu.feature');
const osListMenu = goog.require('os.ui.menu.list');
const Vector = goog.require('os.source.Vector');

const VectorSource = goog.requireType('os.source.Vector');
const MenuEvent = goog.requireType('os.ui.menu.MenuEvent');
const {Controller: SlickGridCtrl} = goog.requireType('os.ui.slick.SlickGridUI');


/**
 * Prefix used on list events.
 * @type {string}
 */
export const PREFIX = 'list::';

/**
 * Default groups in the list menu.
 * @enum {string}
 */
export const GroupLabel = {
  SELECT: FeatureGroupLabel.SELECT,
  SHOW_HIDE: FeatureGroupLabel.SHOW_HIDE,
  REMOVE: FeatureGroupLabel.REMOVE,
  COLOR: FeatureGroupLabel.COLOR,
  TOOLS: FeatureGroupLabel.TOOLS,
  COPY: 'Copy Rows'
};

/**
 * Menu for list
 * @type {?Menu}
 */
export let MENU = null;

/**
 * Sets up list tool menu
 */
export const setup = function() {
  MENU = new Menu(new MenuItem({
    type: MenuItemType.ROOT,
    children: [{
      label: GroupLabel.SELECT,
      type: MenuItemType.GROUP,
      sort: 0,
      children: [{
        label: 'Sort Selected',
        eventType: PREFIX + EventType.SORT_SELECTED,
        tooltip: 'Sorts by the selected items',
        icons: ['<i class="fa fa-fw fa-sort"></i>'],
        handler: osListMenu.onSortSelected,
        metricKey: Analyze.LIST_SORT_SELECTED,
        beforeRender: osListMenu.visibleIfHasSelected,
        sort: 4
      }]
    }, {
      label: GroupLabel.COLOR,
      type: MenuItemType.GROUP,
      sort: 3,
      children: [{
        label: osListMenu.Strings.COLOR_SELECTED_LABEL,
        eventType: PREFIX + EventType.COLOR_SELECTED,
        tooltip: osListMenu.Strings.COLOR_SELECTED_TOOLTIP,
        icons: ['<i class="fa fa-fw fa-tint"></i>'],
        handler: osListMenu.onColorSelected,
        metricKey: Analyze.LIST_COLOR_SELECTED,
        beforeRender: osListMenu.visibleIfHasSelected,
        sort: 0
      }, {
        label: osListMenu.Strings.COLOR_RESET_LABEL,
        eventType: PREFIX + EventType.RESET_COLOR,
        tooltip: osListMenu.Strings.COLOR_RESET_TOOLTIP,
        icons: ['<i class="fa fa-fw fa-tint"></i>'],
        handler: osListMenu.onResetColor,
        metricKey: Analyze.LIST_RESET_COLOR,
        beforeRender: hasFeatures,
        sort: 10
      }]
    }, {
      label: GroupLabel.TOOLS,
      type: MenuItemType.GROUP,
      sort: 10,
      children: [{
        label: GroupLabel.COPY,
        icons: ['<i class="fa fa-fw fa-files-o"></i>'],
        type: MenuItemType.SUBMENU,
        beforeRender: hasFeatures,
        children: [{
          label: 'to Clipboard',
          tooltip: 'Copy selected rows to the clipboard, or all rows if nothing is selected',
          icons: ['<i class="fa fa-fw fa-files-o"></i>'],
          eventType: AnalyzeEventType.COPY_ROWS,
          handler: handleCopyRowsEvent,
          metricKey: Analyze.LIST_COPY_ROWS
        }]
      }, {
        label: 'Export...',
        eventType: EventType.EXPORT,
        tooltip: 'Exports data to a file',
        icons: ['<i class="fa fa-fw fa-download"></i>'],
        handler: inIframe() ? undefined : handleExportEvent,
        metricKey: Analyze.LIST_EXPORT,
        beforeRender: osListMenu.canExport
      }, {
        label: 'Deduplicate-By...',
        eventType: AnalyzeEventType.DEDUPE,
        tooltip: 'Deduplicate selected data',
        icons: ['<i class="fa fa-fw fa-sitemap fa-rotate-90"></i>'],
        handler: handleDedupeEvent,
        metricKey: Analyze.LIST_DEDUPE,
        beforeRender: hasFeatures
      }, {
        label: 'Go To',
        eventType: PREFIX + EventType.GOTO,
        tooltip: 'Repositions the map to display features at this level of the tree',
        icons: ['<i class="fa fa-fw fa-fighter-jet"></i>'],
        metricKey: Analyze.LIST_GOTO,
        beforeRender: osListMenu.visibleIfHasSelected
      }, {
        label: 'Create Buffer Region...',
        eventType: PREFIX + EventType.BUFFER,
        tooltip: 'Create buffer regions around loaded data',
        icons: ['<i class="fa fa-fw ' + buffer.ICON + '"></i>'],
        handler: inIframe() ? undefined : handleBufferEvent
      }]
    }]
  }));

  addGenericItems(MENU, PREFIX);

  MENU.listen(PREFIX + EventType.SELECT, osListMenu.handleListEvent);
  MENU.listen(PREFIX + EventType.DESELECT, osListMenu.handleListEvent);
  MENU.listen(PREFIX + EventType.INVERT, osListMenu.handleListEvent);
};

/**
 * Disposes list tool menu
 */
export const dispose = function() {
  goog.dispose(MENU);
  MENU = null;
};

/**
 * Handle the "Export" menu event.
 * @param {!MenuEvent} event The menu event.
 */
export const handleExportEvent = function(event) {
  // if we're in internal analyze, allow the main window context (mistplugin) to handle this event
  if (event instanceof Event && !inIframe()) {
    event.preventDefault();
    event.stopPropagation();

    osListMenu.onExport(event);
  }
};

/**
 * Handle the "Copy Rows to Clipboard" menu event.
 * @param {!MenuEvent} event The menu event.
 */
export const handleCopyRowsEvent = function(event) {
  const target = /** @type {SlickGridCtrl} */ (event.target);
  if (target && target.copyRows) {
    target.copyRows();
  }
};

/**
 * Handle buffer region events.
 * @param {!MenuEvent} event The menu event.
 */
export const handleBufferEvent = function(event) {
  // if we're in internal analyze, allow the main window context (mistplugin) to handle this event
  let context = event.getContext();
  if (context && event instanceof Event && !inIframe()) {
    event.preventDefault();
    event.stopPropagation();

    context = /** @type {Object} */ (context);

    // only use the first source unless we ever support multiple in the picker
    const sources = getSourcesFromContext(context);
    BufferDialogUI.launchBufferDialog({
      'sources': sources && sources.length > 0 ? [sources[0]] : []
    });
  }
};

/**
 * Handle deduplicate menu events.
 * @param {MenuEvent} event The menu event.
 */
export const handleDedupeEvent = function(event) {
  const source = /** @type {VectorSource} */ (event.getContext());
  launchDedupeUI(source);
};

/**
 * Sets up list tool actions that must be handled from the main window context. These actions put a command on the
 * stack, which will cause a leak if the command is created externally.
 */
export const setupInternal = function() {
  const prefix = PREFIX;
  dispatcher.getInstance().listen(prefix + EventType.HIDE_SELECTED, osListMenu.handleListEvent);
  dispatcher.getInstance().listen(prefix + EventType.HIDE_UNSELECTED, osListMenu.handleListEvent);
  dispatcher.getInstance().listen(prefix + EventType.DISPLAY_ALL, osListMenu.handleListEvent);
  dispatcher.getInstance().listen(prefix + EventType.REMOVE, osListMenu.handleListEvent);
  dispatcher.getInstance().listen(prefix + EventType.REMOVE_UNSELECTED, osListMenu.handleListEvent);
  dispatcher.getInstance().listen(prefix + EventType.GOTO, osListMenu.handleListEvent);
  dispatcher.getInstance().listen(prefix + EventType.BUFFER, handleBufferEvent);
};

/**
 * Cleans up internal list tool actions
 */
export const disposeInternal = function() {
  const prefix = PREFIX;
  dispatcher.getInstance().unlisten(prefix + EventType.HIDE_SELECTED, osListMenu.handleListEvent);
  dispatcher.getInstance().unlisten(prefix + EventType.HIDE_UNSELECTED, osListMenu.handleListEvent);
  dispatcher.getInstance().unlisten(prefix + EventType.DISPLAY_ALL, osListMenu.handleListEvent);
  dispatcher.getInstance().unlisten(prefix + EventType.REMOVE, osListMenu.handleListEvent);
  dispatcher.getInstance().unlisten(prefix + EventType.REMOVE_UNSELECTED, osListMenu.handleListEvent);
  dispatcher.getInstance().unlisten(prefix + EventType.GOTO, osListMenu.handleListEvent);
  dispatcher.getInstance().unlisten(prefix + EventType.BUFFER, handleBufferEvent);
};

/**
 * @param {Vector} context
 * @this {MenuItem}
 */
export const hasFeatures = function(context) {
  this.visible = false;

  if (instanceOf(context, Vector.NAME)) {
    const source = /** @type {!Vector} */ (context);
    const features = source.getFilteredFeatures();
    this.visible = !!features && features.length > 1;
  }
};
