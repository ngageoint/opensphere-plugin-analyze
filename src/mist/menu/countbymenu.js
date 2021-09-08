goog.module('mist.menu.countBy');

const dispatcher = goog.require('os.Dispatcher');
const osFeature = goog.require('os.feature');
const bitsCoreuiMenuList = goog.require('bits.coreui.menu.list');
const mistActionEventType = goog.require('mist.action.EventType');
const tools = goog.require('mist.menu.tools');
const keys = goog.require('mist.metrics.keys');
const EventType = goog.require('os.action.EventType');
const FeaturesVisibility = goog.require('os.command.FeaturesVisibility');
const {toRgbaString} = goog.require('os.style');
const Menu = goog.require('os.ui.menu.Menu');
const MenuItem = goog.require('os.ui.menu.MenuItem');
const MenuItemType = goog.require('os.ui.menu.MenuItemType');
const feature = goog.require('os.ui.menu.feature');
const list = goog.require('os.ui.menu.list');
const Metrics = goog.require('os.metrics.Metrics');
const ColorMethod = goog.require('os.data.histo.ColorMethod');
const {launchConfirmColor} = goog.require('os.ui.window.ConfirmColorUI');

const CountByUI = goog.requireType('tools.ui.CountByUI');
const MenuEvent = goog.requireType('os.ui.menu.MenuEvent');
const IHistogramUI = goog.requireType('os.ui.IHistogramUI');
const {Controller: CountByCtrl} = goog.requireType('tools.ui.CountByUI');

/**
 * Default groups in the count by menu.
 * @enum {string}
 */
const GroupLabel = {
  COLOR: 'Color',
  FILTER: 'Filter',
  CASCADE: 'Cascade',
  TOOLS: 'Tools'
};

/**
 * Prefix used on count by events.
 * @type {string}
 */
const PREFIX = 'countBy:';

/**
 * RegExp to remove prefix used on count by events.
 * @type {RegExp}
 */
const PREFIX_REGEXP = new RegExp('^' + PREFIX);

/**
 * @type {Menu|null}
 */
let MENU = null;

/**
 * Sets up count by menu
 */
const setup = function() {
  MENU = new Menu(new MenuItem({
    type: MenuItemType.ROOT,
    children: [{
      label: feature.GroupLabel.SELECT,
      type: MenuItemType.GROUP,
      sort: 0,
      children: [{
        label: 'Sort Selected',
        eventType: PREFIX + EventType.SORT_SELECTED,
        tooltip: 'Sorts by the selected items',
        icons: ['<i class="fa fa-fw fa-sort"></i>'],
        metricKey: keys.Analyze.COUNT_BY_SORT_SELECTED,
        beforeRender: visibleIfHasSelectedBins,
        handler: onCountBy_,
        sort: 4
      }]
    }, {
      label: GroupLabel.TOOLS,
      type: MenuItemType.GROUP,
      sort: 5,
      children: [{
        label: 'Copy Rows',
        eventType: PREFIX + mistActionEventType.COPY_ROWS,
        tooltip: 'Copy selected rows to the clipboard, or all rows if nothing is selected',
        icons: ['<i class="fa fa-fw fa-files-o"></i>'],
        metricKey: keys.Analyze.COUNT_BY_COPY_ROWS,
        handler: onCountBy_,
        beforeRender: visibleIfHasBins
      }, {
        label: 'Toggle Row Count',
        eventType: mistActionEventType.TOGGLE_ROW,
        tooltip: 'Toggles a row count column',
        icons: ['<i class="fa fa-fw fa-list-ol"></i>'],
        metricKey: keys.Analyze.COUNT_BY_TOGGLE_ROW_COUNT,
        handler: onCountBy_
      }]
    }, {
      label: GroupLabel.COLOR,
      type: MenuItemType.GROUP,
      sort: 2,
      children: [{
        label: list.Strings.COLOR_SELECTED_LABEL,
        eventType: EventType.COLOR_SELECTED,
        tooltip: list.Strings.COLOR_SELECTED_TOOLTIP,
        icons: ['<i class="fa fa-fw fa-tint"></i>'],
        metricKey: keys.Analyze.COUNT_BY_COLOR_SELECTED,
        handler: onCountBy_,
        beforeRender: visibleIfHasSelectedItems,
        sort: 1
      }, {
        label: bitsCoreuiMenuList.Strings.COLOR_SELECTED_BINS_LABEL,
        eventType: EventType.COLOR_SELECTED_BINS,
        tooltip: bitsCoreuiMenuList.Strings.COLOR_SELECTED_BINS_TOOLTIP,
        icons: ['<i class="fa fa-fw fa-tint"></i>'],
        metricKey: keys.Analyze.COUNT_BY_COLOR_SELECTED,
        handler: onCountBy_,
        beforeRender: visibleIfHasSelectedBins,
        sort: 2
      }, {
        label: bitsCoreuiMenuList.Strings.COLOR_AUTO_LABEL,
        eventType: EventType.AUTO_COLOR,
        tooltip: bitsCoreuiMenuList.Strings.COLOR_AUTO_LABEL,
        icons: ['<i class="fa fa-fw fa-tint"></i>'],
        metricKey: keys.Analyze.COUNT_BY_AUTO_COLOR,
        handler: onCountBy_,
        sort: 3
      }, {
        label: list.Strings.COLOR_RESET_LABEL,
        eventType: EventType.RESET_COLOR,
        tooltip: list.Strings.COLOR_RESET_TOOLTIP,
        icons: ['<i class="fa fa-fw fa-tint"></i>'],
        metricKey: keys.Analyze.COUNT_BY_RESET_COLOR,
        handler: onCountBy_,
        sort: 4
      }]
    }, {
      label: GroupLabel.FILTER,
      type: MenuItemType.GROUP,
      sort: 3,
      children: [{
        label: 'Create Filter',
        eventType: mistActionEventType.CREATE_FILTER,
        tooltip: 'Creates a new filter from the selected bins',
        icons: ['<i class="fa fa-fw fa-filter"></i>'],
        metricKey: keys.Analyze.COUNT_BY_CREATE_FILTER,
        beforeRender: visibleIfCanCreateFilter,
        sort: 1
      }]
    }, {
      label: GroupLabel.CASCADE,
      type: MenuItemType.GROUP,
      sort: 4,
      children: [{
        label: 'Cascade All',
        eventType: mistActionEventType.CASCADE_ALL,
        tooltip: 'Cascade all results to the next Count By',
        icons: ['<i class="fa fa-fw fa-arrow-right"></i>'],
        metricKey: keys.Analyze.COUNT_BY_CASCADE_ALL,
        handler: onCountBy_,
        beforeRender: visibleIfHasCascade_,
        sort: 1
      }, {
        label: 'Remove Cascade',
        eventType: mistActionEventType.REMOVE_CASCADE,
        tooltip: 'Selected bins will no longer be passed to the next Count By',
        icons: ['<i class="fa fa-fw fa-times"></i>'],
        metricKey: keys.Analyze.COUNT_BY_RMOVE_CASCADE,
        handler: onCountBy_,
        beforeRender: visibleIfHasCascade_,
        sort: 2
      }, {
        label: 'Clear Cascade',
        eventType: mistActionEventType.CLEAR_CASCADE,
        tooltip: 'Stop cascading all bins to the next Count By',
        icons: ['<i class="fa fa-fw fa-times"></i>'],
        metricKey: keys.Analyze.COUNT_BY_CLEAR_CASCADE,
        handler: onCountBy_,
        sort: 3
      }]
    }]
  }));

  tools.addGenericItems(MENU, PREFIX);

  MENU.listen(PREFIX + EventType.SELECT, onCountBy_);
  MENU.listen(PREFIX + EventType.DESELECT, onCountBy_);
  MENU.listen(PREFIX + EventType.INVERT, onCountBy_);
};

/**
 * Disposes count by menu
 */
const dispose = function() {
  goog.dispose(MENU);
  MENU = null;
};

/**
 * If the Count By has one or more selected bins.
 * @param {IHistogramUI} ctrl The count by controller.
 * @return {boolean}
 */
const hasSelection = function(ctrl) {
  if (ctrl) {
    const selected = ctrl.getSelectedBins();
    return selected != null && selected.length > 0;
  }

  return false;
};

/**
 * Shows a menu item if the Count By is cascaded.
 * @param {Menu} context The context menu.
 * @param {IHistogramUI} ctrl The count by controller.
 * @this {MenuItem}
 */
const visibleIfHasCascade_ = function(context, ctrl) {
  this.visible = !!ctrl && ctrl.isCascaded();
};

/**
 * Shows a menu item if a filter can be created.
 * @param {Menu} context The context menu.
 * @param {IHistogramUI} ctrl The count by controller.
 * @this {MenuItem}
 */
const visibleIfCanCreateFilter = function(context, ctrl) {
  this.visible = tools.canCreateHistogramFilter(ctrl);
};

/**
 * Shows a menu item if the Count By has one or more bins.
 * @param {Menu} context The context menu.
 * @param {IHistogramUI} ctrl The count by controller.
 * @this {MenuItem}
 */
const visibleIfHasBins = function(context, ctrl) {
  this.visible = ctrl != null && ctrl.getBins().length > 0;
};

/**
 * Shows a menu item if the Count By has one or more selected bins.
 * @param {Menu} context The context menu.
 * @param {IHistogramUI} ctrl The count by controller.
 * @this {MenuItem}
 */
const visibleIfHasSelectedBins = function(context, ctrl) {
  this.visible = hasSelection(ctrl);
};

/**
 * Shows a menu item if the Source has one or more selected features.
 * @param {Menu} context The context menu.
 * @param {IHistogramUI} ctrl The count by controller.
 * @this {MenuItem}
 */
const visibleIfHasSelectedItems = function(context, ctrl) {
  const source = ctrl.getHistogram() ? ctrl.getHistogram().getSource() : null;
  this.visible = list.hasSelected(source);
};

/**
 * @param {MenuEvent} event
 */
const onCountBy_ = function(event) {
  const countBy = /** @type {CountByCtrl} */ (event.target);
  if (countBy) {
    const histogram = countBy.getHistogram();

    const eventType = event.type.replace(PREFIX_REGEXP, '');
    switch (eventType) {
      case EventType.SELECT:
        countBy.selectAll();
        Metrics.getInstance().updateMetric(keys.Analyze.COUNT_BY_SELECT_ALL, 1);
        break;
      case EventType.DESELECT:
        countBy.selectNone();
        Metrics.getInstance().updateMetric(keys.Analyze.COUNT_BY_DESELECT_ALL, 1);
        break;
      case EventType.INVERT:
        countBy.invertSelection();
        Metrics.getInstance().updateMetric(keys.Analyze.COUNT_BY_INVERT_SELECTION, 1);
        break;
      case EventType.SORT_SELECTED:
        countBy.sortSelection();
        Metrics.getInstance().updateMetric(keys.Analyze.COUNT_BY_SORT_SELECTED, 1);
        break;
      case EventType.COLOR_SELECTED_BINS:
        if (histogram) {
          const selectedBins = countBy.getSelectedBins();
          let color;
          for (let i = 0, n = selectedBins.length; i < n; i++) {
            const binColor = selectedBins[i].getColor();
            if (binColor) {
              color = binColor;
              break;
            }
          }

          const callback = tools.onColorChosen.bind(undefined, histogram, selectedBins);
          launchConfirmColor(callback, color);
        }
        break;
      case EventType.COLOR_SELECTED:
        if (histogram) {
          const source = histogram.getSource();
          if (source && source.getSelectedItems()) {
            const items = source.getSelectedItems();

            // call the confirm window from this context so it doesn't appear in the wrong tab
            launchConfirmColor(function(color) {
              source.setColor(items, toRgbaString(color));
            }, osFeature.getFirstColor(items));
          }
          Metrics.getInstance().updateMetric(keys.Analyze.COUNT_BY_COLOR_SELECTED, 1);
        }
        break;
      case EventType.AUTO_COLOR:
        if (histogram) {
          histogram.setColorMethod(ColorMethod.AUTO_COLOR);
          Metrics.getInstance().updateMetric(keys.Analyze.COUNT_BY_AUTO_COLOR, 1);
        }
        break;
      case EventType.AUTO_COLOR_BY_COUNT:
        // nope. see the comment above.
        // histogram.setColorMethod(ColorMethod.AUTO_COLOR_BY_COUNT);
        break;
      case EventType.RESET_COLOR:
        if (histogram) {
          histogram.setColorMethod(ColorMethod.RESET);
          Metrics.getInstance().updateMetric(keys.Analyze.COUNT_BY_RESET_COLOR, 1);
        }
        break;
      case mistActionEventType.TOGGLE_ROW:
        countBy.toggleRowCount();
        Metrics.getInstance().updateMetric(keys.Analyze.COUNT_BY_TOGGLE_ROW_COUNT, 1);
        break;
      case mistActionEventType.CASCADE_ALL:
        countBy.cascadeAll();
        Metrics.getInstance().updateMetric(keys.Analyze.COUNT_BY_CASCADE_ALL, 1);
        break;
      case mistActionEventType.REMOVE_CASCADE:
        countBy.removeCascadedBins(countBy.getSelectedBins());
        Metrics.getInstance().updateMetric(keys.Analyze.COUNT_BY_RMOVE_CASCADE, 1);
        break;
      case mistActionEventType.CLEAR_CASCADE:
        countBy.cascadeNone();
        Metrics.getInstance().updateMetric(keys.Analyze.COUNT_BY_CLEAR_CASCADE, 1);
        break;
      case mistActionEventType.COPY_ROWS:
        countBy.copyRows();
        break;
      default:
        break;
    }
  }
};

/**
 * Sets up count by menu that must be handled from the main window context. These actions put a command on the
 * stack, which will cause a leak if the command is created externally.
 */
const setupInternal = function() {
  dispatcher.getInstance().listen(PREFIX + EventType.HIDE_SELECTED,
      handleInternalEvent_);
  dispatcher.getInstance().listen(PREFIX + EventType.HIDE_UNSELECTED,
      handleInternalEvent_);
  dispatcher.getInstance().listen(PREFIX + EventType.DISPLAY_ALL,
      handleInternalEvent_);
  dispatcher.getInstance().listen(PREFIX + EventType.REMOVE,
      handleInternalEvent_);
  dispatcher.getInstance().listen(PREFIX + EventType.REMOVE_UNSELECTED,
      handleInternalEvent_);
};

/**
 * Cleans up internal list tool actions
 */
const disposeInternal = function() {
  dispatcher.getInstance().unlisten(PREFIX + EventType.HIDE_SELECTED,
      handleInternalEvent_);
  dispatcher.getInstance().unlisten(PREFIX + EventType.HIDE_UNSELECTED,
      handleInternalEvent_);
  dispatcher.getInstance().unlisten(PREFIX + EventType.DISPLAY_ALL,
      handleInternalEvent_);
  dispatcher.getInstance().unlisten(PREFIX + EventType.REMOVE,
      handleInternalEvent_);
  dispatcher.getInstance().unlisten(PREFIX + EventType.REMOVE_UNSELECTED,
      handleInternalEvent_);
};

/**
 * @param {MenuEvent} event
 */
const handleInternalEvent_ = function(event) {
  const countBy = /** @type {IHistogramUI} */ (event.target);
  if (countBy) {
    const source = countBy.getSource();
    if (source) {
      let cmd;
      const eventType = event.type.replace(PREFIX_REGEXP, '');
      switch (eventType) {
        case EventType.HIDE_SELECTED:
          cmd = new FeaturesVisibility(source.getId(), source.getSelectedItems(), false);
          break;
        case EventType.HIDE_UNSELECTED:
          cmd = new FeaturesVisibility(source.getId(), source.getUnselectedItems(), false);
          break;
        case EventType.DISPLAY_ALL:
          cmd = new FeaturesVisibility(source.getId(), source.getHiddenItems(), true);
          break;
        case EventType.REMOVE:
          osFeature.removeFeatures(source.getId(), source.getSelectedItems());
          break;
        case EventType.REMOVE_UNSELECTED:
          osFeature.removeFeatures(source.getId(), source.getUnselectedItems());
          break;
        default:
          break;
      }

      if (cmd) {
        os.command.CommandProcessor.getInstance().addCommand(cmd);
      }
    }
  }
};

exports = {
  GroupLabel,
  PREFIX,
  PREFIX_REGEXP,
  get MENU() {
    return MENU; // don't export directly, because then it becomes fixed and .setup() can't replace it
  },
  setup,
  dispose,
  hasSelection,
  visibleIfCanCreateFilter,
  visibleIfHasBins,
  visibleIfHasSelectedBins,
  visibleIfHasSelectedItems,
  setupInternal,
  disposeInternal
};
