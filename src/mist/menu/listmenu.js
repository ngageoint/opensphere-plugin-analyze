goog.module('mist.menu.list');
goog.module.declareLegacyNamespace();

goog.require('ol.events');
goog.require('ol.extent');
goog.require('os.Fields');
goog.require('os.command.FeaturesVisibility');
goog.require('os.command.FlyToExtent');
goog.require('os.command.InvertSelect');
goog.require('os.command.SelectAll');
goog.require('os.command.SelectNone');
goog.require('os.feature');
goog.require('os.fn');
goog.require('os.map');
goog.require('os.metrics.Metrics');

const dispatcher = goog.require('os.Dispatcher');
const Event = goog.require('goog.events.Event');
const tools = goog.require('mist.menu.tools');
const keys = goog.require('mist.metrics.keys');
const MistDedupeUI = goog.require('mist.ui.MistDedupeUI');
const {inIframe} = goog.require('os');
const EventType = goog.require('os.action.EventType');
const {instanceOf} = goog.require('os.classRegistry');
const MistEventType = goog.require('mist.action.EventType');
const buffer = goog.require('os.buffer');
const BufferDialogUI = goog.require('os.ui.buffer.BufferDialogUI');
const Menu = goog.require('os.ui.menu.Menu');
const MenuItem = goog.require('os.ui.menu.MenuItem');
const MenuItemType = goog.require('os.ui.menu.MenuItemType');
const common = goog.require('os.ui.menu.common');
const feature = goog.require('os.ui.menu.feature');
const list = goog.require('os.ui.menu.list');
const Vector = goog.require('os.source.Vector');

const VectorSource = goog.requireType('os.source.Vector');
const MenuEvent = goog.requireType('os.ui.menu.MenuEvent');
const {Controller: SlickGridCtrl} = goog.requireType('os.ui.slick.SlickGridUI');


/**
 * Prefix used on list events.
 * @type {string}
 */
const PREFIX = 'list::';

/**
 * Default groups in the list menu.
 * @enum {string}
 */
const GroupLabel = {
  SELECT: feature.GroupLabel.SELECT,
  SHOW_HIDE: feature.GroupLabel.SHOW_HIDE,
  REMOVE: feature.GroupLabel.REMOVE,
  COLOR: feature.GroupLabel.COLOR,
  TOOLS: feature.GroupLabel.TOOLS,
  COPY: 'Copy Rows'
};

/**
 * Menu for list
 * @type {?Menu}
 */
let MENU = null;

/**
 * Sets up list tool menu
 */
const setup = function() {
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
        handler: list.onSortSelected,
        metricKey: keys.Analyze.LIST_SORT_SELECTED,
        beforeRender: list.visibleIfHasSelected,
        sort: 4
      }]
    }, {
      label: GroupLabel.COLOR,
      type: MenuItemType.GROUP,
      sort: 3,
      children: [{
        label: list.Strings.COLOR_SELECTED_LABEL,
        eventType: PREFIX + EventType.COLOR_SELECTED,
        tooltip: list.Strings.COLOR_SELECTED_TOOLTIP,
        icons: ['<i class="fa fa-fw fa-tint"></i>'],
        handler: list.onColorSelected,
        metricKey: keys.Analyze.LIST_COLOR_SELECTED,
        beforeRender: list.visibleIfHasSelected,
        sort: 0
      }, {
        label: list.Strings.COLOR_RESET_LABEL,
        eventType: PREFIX + EventType.RESET_COLOR,
        tooltip: list.Strings.COLOR_RESET_TOOLTIP,
        icons: ['<i class="fa fa-fw fa-tint"></i>'],
        handler: list.onResetColor,
        metricKey: keys.Analyze.LIST_RESET_COLOR,
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
          eventType: MistEventType.COPY_ROWS,
          handler: handleCopyRowsEvent,
          metricKey: keys.Analyze.LIST_COPY_ROWS
        }]
      }, {
        label: 'Export...',
        eventType: EventType.EXPORT,
        tooltip: 'Exports data to a file',
        icons: ['<i class="fa fa-fw fa-download"></i>'],
        handler: inIframe() ? undefined : handleExportEvent,
        metricKey: keys.Analyze.LIST_EXPORT,
        beforeRender: list.canExport
      }, {
        label: 'Deduplicate-By...',
        eventType: MistEventType.DEDUPE,
        tooltip: 'Deduplicate selected data',
        icons: ['<i class="fa fa-fw fa-sitemap fa-rotate-90"></i>'],
        handler: handleDedupeEvent,
        metricKey: keys.Analyze.LIST_DEDUPE,
        beforeRender: hasFeatures
      }, {
        label: 'Go To',
        eventType: PREFIX + EventType.GOTO,
        tooltip: 'Repositions the map to display features at this level of the tree',
        icons: ['<i class="fa fa-fw fa-fighter-jet"></i>'],
        metricKey: keys.Analyze.LIST_GOTO,
        beforeRender: list.visibleIfHasSelected
      }, {
        label: 'Create Buffer Region...',
        eventType: PREFIX + EventType.BUFFER,
        tooltip: 'Create buffer regions around loaded data',
        icons: ['<i class="fa fa-fw ' + buffer.ICON + '"></i>'],
        handler: inIframe() ? undefined : handleBufferEvent
      }]
    }]
  }));

  tools.addGenericItems(MENU, PREFIX);

  MENU.listen(PREFIX + EventType.SELECT, list.handleListEvent);
  MENU.listen(PREFIX + EventType.DESELECT, list.handleListEvent);
  MENU.listen(PREFIX + EventType.INVERT, list.handleListEvent);
};

/**
 * Disposes list tool menu
 */
const dispose = function() {
  goog.dispose(MENU);
  MENU = null;
};

/**
 * Handle the "Export" menu event.
 * @param {!MenuEvent} event The menu event.
 */
const handleExportEvent = function(event) {
  // if we're in internal analyze, allow the main window context (mistplugin) to handle this event
  if (event instanceof Event && !inIframe()) {
    event.preventDefault();
    event.stopPropagation();

    list.onExport(event);
  }
};

/**
 * Handle the "Copy Rows to Clipboard" menu event.
 * @param {!MenuEvent} event The menu event.
 */
const handleCopyRowsEvent = function(event) {
  const target = /** @type {SlickGridCtrl} */ (event.target);
  if (target && target.copyRows) {
    target.copyRows();
  }
};

/**
 * Handle buffer region events.
 * @param {!MenuEvent} event The menu event.
 */
const handleBufferEvent = function(event) {
  // if we're in internal analyze, allow the main window context (mistplugin) to handle this event
  let context = event.getContext();
  if (context && event instanceof Event && !inIframe()) {
    event.preventDefault();
    event.stopPropagation();

    context = /** @type {Object} */ (context);

    // only use the first source unless we ever support multiple in the picker
    const sources = common.getSourcesFromContext(context);
    BufferDialogUI.launchBufferDialog({
      'sources': sources && sources.length > 0 ? [sources[0]] : []
    });
  }
};

/**
 * Handle deduplicate menu events.
 * @param {MenuEvent} event The menu event.
 */
const handleDedupeEvent = function(event) {
  const source = /** @type {VectorSource} */ (event.getContext());
  MistDedupeUI.Controller.launch(source);
};

/**
 * Sets up list tool actions that must be handled from the main window context. These actions put a command on the
 * stack, which will cause a leak if the command is created externally.
 */
const setupInternal = function() {
  const prefix = PREFIX;
  dispatcher.getInstance().listen(prefix + EventType.HIDE_SELECTED, list.handleListEvent);
  dispatcher.getInstance().listen(prefix + EventType.HIDE_UNSELECTED, list.handleListEvent);
  dispatcher.getInstance().listen(prefix + EventType.DISPLAY_ALL, list.handleListEvent);
  dispatcher.getInstance().listen(prefix + EventType.REMOVE, list.handleListEvent);
  dispatcher.getInstance().listen(prefix + EventType.REMOVE_UNSELECTED, list.handleListEvent);
  dispatcher.getInstance().listen(prefix + EventType.GOTO, list.handleListEvent);
  dispatcher.getInstance().listen(prefix + EventType.BUFFER, handleBufferEvent);
};

/**
 * Cleans up internal list tool actions
 */
const disposeInternal = function() {
  const prefix = PREFIX;
  dispatcher.getInstance().unlisten(prefix + EventType.HIDE_SELECTED, list.handleListEvent);
  dispatcher.getInstance().unlisten(prefix + EventType.HIDE_UNSELECTED, list.handleListEvent);
  dispatcher.getInstance().unlisten(prefix + EventType.DISPLAY_ALL, list.handleListEvent);
  dispatcher.getInstance().unlisten(prefix + EventType.REMOVE, list.handleListEvent);
  dispatcher.getInstance().unlisten(prefix + EventType.REMOVE_UNSELECTED, list.handleListEvent);
  dispatcher.getInstance().unlisten(prefix + EventType.GOTO, list.handleListEvent);
  dispatcher.getInstance().unlisten(prefix + EventType.BUFFER, handleBufferEvent);
};

/**
 * @param {Vector} context
 * @this {MenuItem}
 */
const hasFeatures = function(context) {
  this.visible = false;

  if (instanceOf(context, Vector.NAME)) {
    const source = /** @type {!Vector} */ (context);
    const features = source.getFilteredFeatures();
    this.visible = !!features && features.length > 1;
  }
};

exports = {
  PREFIX,
  GroupLabel,
  get MENU() {
    return MENU; // don't export directly, because then it becomes fixed and .setup() can't replace it
  },
  setup,
  dispose,
  handleExportEvent,
  handleCopyRowsEvent,
  handleBufferEvent,
  handleDedupeEvent,
  setupInternal,
  disposeInternal,
  hasFeatures
};
