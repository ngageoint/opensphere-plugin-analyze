goog.declareModuleId('mist.menu.countBy');

import * as dispatcher from 'opensphere/src/os/dispatcher.js';
import {getFirstColor, removeFeatures} from 'opensphere/src/os/feature/feature.js';
import {toRgbaString} from 'opensphere/src/os/style/style.js';
import {Strings as BitsListStrings} from '../../coreui/menu/listmenu.js';
import {AnalyzeEventType} from '../analyze/eventtype.js';
import {Analyze} from '../metrics/keys.js';
import {addGenericItems, canCreateHistogramFilter, onColorChosen} from './toolsmenu.js';

const CommandProcessor = goog.require('os.command.CommandProcessor');
const EventType = goog.require('os.action.EventType');
const FeaturesVisibility = goog.require('os.command.FeaturesVisibility');
const Menu = goog.require('os.ui.menu.Menu');
const MenuItem = goog.require('os.ui.menu.MenuItem');
const MenuItemType = goog.require('os.ui.menu.MenuItemType');
const {GroupLabel: FeatureGroupLabel} = goog.require('os.ui.menu.feature');
const {Strings: OSListStrings, hasSelected} = goog.require('os.ui.menu.list');
const Metrics = goog.require('os.metrics.Metrics');
const ColorMethod = goog.require('os.data.histo.ColorMethod');
const {launchConfirmColor} = goog.require('os.ui.window.ConfirmColorUI');

const {default: CountByUI} = goog.requireType('tools.ui.CountByUI');
const MenuEvent = goog.requireType('os.ui.menu.MenuEvent');
const IHistogramUI = goog.requireType('os.ui.IHistogramUI');
const {Controller: CountByCtrl} = goog.requireType('tools.ui.CountByUI');


/**
 * Default groups in the count by menu.
 * @enum {string}
 */
export const GroupLabel = {
  COLOR: 'Color',
  FILTER: 'Filter',
  CASCADE: 'Cascade',
  TOOLS: 'Tools'
};

/**
 * Prefix used on count by events.
 * @type {string}
 */
export const PREFIX = 'countBy:';

/**
 * RegExp to remove prefix used on count by events.
 * @type {RegExp}
 */
export const PREFIX_REGEXP = new RegExp('^' + PREFIX);

/**
 * @type {Menu|null}
 */
export let MENU = null;

/**
 * Sets up count by menu
 */
export const setup = function() {
  MENU = new Menu(new MenuItem({
    type: MenuItemType.ROOT,
    children: [{
      label: FeatureGroupLabel.SELECT,
      type: MenuItemType.GROUP,
      sort: 0,
      children: [{
        label: 'Sort Selected',
        eventType: PREFIX + EventType.SORT_SELECTED,
        tooltip: 'Sorts by the selected items',
        icons: ['<i class="fa fa-fw fa-sort"></i>'],
        metricKey: Analyze.COUNT_BY_SORT_SELECTED,
        beforeRender: visibleIfHasSelectedBins,
        handler: onCountBy,
        sort: 4
      }]
    }, {
      label: GroupLabel.TOOLS,
      type: MenuItemType.GROUP,
      sort: 5,
      children: [{
        label: 'Copy Rows',
        eventType: PREFIX + AnalyzeEventType.COPY_ROWS,
        tooltip: 'Copy selected rows to the clipboard, or all rows if nothing is selected',
        icons: ['<i class="fa fa-fw fa-files-o"></i>'],
        metricKey: Analyze.COUNT_BY_COPY_ROWS,
        handler: onCountBy,
        beforeRender: visibleIfHasBins
      }, {
        label: 'Toggle Row Count',
        eventType: AnalyzeEventType.TOGGLE_ROW,
        tooltip: 'Toggles a row count column',
        icons: ['<i class="fa fa-fw fa-list-ol"></i>'],
        metricKey: Analyze.COUNT_BY_TOGGLE_ROW_COUNT,
        handler: onCountBy
      }]
    }, {
      label: GroupLabel.COLOR,
      type: MenuItemType.GROUP,
      sort: 2,
      children: [{
        label: OSListStrings.COLOR_SELECTED_LABEL,
        eventType: EventType.COLOR_SELECTED,
        tooltip: OSListStrings.COLOR_SELECTED_TOOLTIP,
        icons: ['<i class="fa fa-fw fa-tint"></i>'],
        metricKey: Analyze.COUNT_BY_COLOR_SELECTED,
        handler: onCountBy,
        beforeRender: visibleIfHasSelectedItems,
        sort: 1
      }, {
        label: BitsListStrings.COLOR_SELECTED_BINS_LABEL,
        eventType: EventType.COLOR_SELECTED_BINS,
        tooltip: BitsListStrings.COLOR_SELECTED_BINS_TOOLTIP,
        icons: ['<i class="fa fa-fw fa-tint"></i>'],
        metricKey: Analyze.COUNT_BY_COLOR_SELECTED,
        handler: onCountBy,
        beforeRender: visibleIfHasSelectedBins,
        sort: 2
      }, {
        label: BitsListStrings.COLOR_AUTO_LABEL,
        eventType: EventType.AUTO_COLOR,
        tooltip: BitsListStrings.COLOR_AUTO_LABEL,
        icons: ['<i class="fa fa-fw fa-tint"></i>'],
        metricKey: Analyze.COUNT_BY_AUTO_COLOR,
        handler: onCountBy,
        sort: 3
      }, {
        label: OSListStrings.COLOR_RESET_LABEL,
        eventType: EventType.RESET_COLOR,
        tooltip: OSListStrings.COLOR_RESET_TOOLTIP,
        icons: ['<i class="fa fa-fw fa-tint"></i>'],
        metricKey: Analyze.COUNT_BY_RESET_COLOR,
        handler: onCountBy,
        sort: 4
      }]
    }, {
      label: GroupLabel.FILTER,
      type: MenuItemType.GROUP,
      sort: 3,
      children: [{
        label: 'Create Filter',
        eventType: AnalyzeEventType.CREATE_FILTER,
        tooltip: 'Creates a new filter from the selected bins',
        icons: ['<i class="fa fa-fw fa-filter"></i>'],
        metricKey: Analyze.COUNT_BY_CREATE_FILTER,
        beforeRender: visibleIfCanCreateFilter,
        sort: 1
      }]
    }, {
      label: GroupLabel.CASCADE,
      type: MenuItemType.GROUP,
      sort: 4,
      children: [{
        label: 'Cascade All',
        eventType: AnalyzeEventType.CASCADE_ALL,
        tooltip: 'Cascade all results to the next Count By',
        icons: ['<i class="fa fa-fw fa-arrow-right"></i>'],
        metricKey: Analyze.COUNT_BY_CASCADE_ALL,
        handler: onCountBy,
        beforeRender: visibleIfHasCascade,
        sort: 1
      }, {
        label: 'Remove Cascade',
        eventType: AnalyzeEventType.REMOVE_CASCADE,
        tooltip: 'Selected bins will no longer be passed to the next Count By',
        icons: ['<i class="fa fa-fw fa-times"></i>'],
        metricKey: Analyze.COUNT_BY_RMOVE_CASCADE,
        handler: onCountBy,
        beforeRender: visibleIfHasCascade,
        sort: 2
      }, {
        label: 'Clear Cascade',
        eventType: AnalyzeEventType.CLEAR_CASCADE,
        tooltip: 'Stop cascading all bins to the next Count By',
        icons: ['<i class="fa fa-fw fa-times"></i>'],
        metricKey: Analyze.COUNT_BY_CLEAR_CASCADE,
        handler: onCountBy,
        sort: 3
      }]
    }]
  }));

  addGenericItems(MENU, PREFIX);

  MENU.listen(PREFIX + EventType.SELECT, onCountBy);
  MENU.listen(PREFIX + EventType.DESELECT, onCountBy);
  MENU.listen(PREFIX + EventType.INVERT, onCountBy);
};

/**
 * Disposes count by menu
 */
export const dispose = function() {
  goog.dispose(MENU);
  MENU = null;
};

/**
 * If the Count By has one or more selected bins.
 * @param {IHistogramUI} ctrl The count by controller.
 * @return {boolean}
 */
export const hasSelection = function(ctrl) {
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
export const visibleIfHasCascade = function(context, ctrl) {
  this.visible = !!ctrl && ctrl.isCascaded();
};

/**
 * Shows a menu item if a filter can be created.
 * @param {Menu} context The context menu.
 * @param {IHistogramUI} ctrl The count by controller.
 * @this {MenuItem}
 */
export const visibleIfCanCreateFilter = function(context, ctrl) {
  this.visible = canCreateHistogramFilter(ctrl);
};

/**
 * Shows a menu item if the Count By has one or more bins.
 * @param {Menu} context The context menu.
 * @param {IHistogramUI} ctrl The count by controller.
 * @this {MenuItem}
 */
export const visibleIfHasBins = function(context, ctrl) {
  this.visible = ctrl != null && ctrl.getBins().length > 0;
};

/**
 * Shows a menu item if the Count By has one or more selected bins.
 * @param {Menu} context The context menu.
 * @param {IHistogramUI} ctrl The count by controller.
 * @this {MenuItem}
 */
export const visibleIfHasSelectedBins = function(context, ctrl) {
  this.visible = hasSelection(ctrl);
};

/**
 * Shows a menu item if the Source has one or more selected features.
 * @param {Menu} context The context menu.
 * @param {IHistogramUI} ctrl The count by controller.
 * @this {MenuItem}
 */
export const visibleIfHasSelectedItems = function(context, ctrl) {
  const source = ctrl.getHistogram() ? ctrl.getHistogram().getSource() : null;
  this.visible = hasSelected(source);
};

/**
 * @param {MenuEvent} event
 */
const onCountBy = function(event) {
  const countBy = /** @type {CountByCtrl} */ (event.target);
  if (countBy) {
    const histogram = countBy.getHistogram();

    const eventType = event.type.replace(PREFIX_REGEXP, '');
    switch (eventType) {
      case EventType.SELECT:
        countBy.selectAll();
        Metrics.getInstance().updateMetric(Analyze.COUNT_BY_SELECT_ALL, 1);
        break;
      case EventType.DESELECT:
        countBy.selectNone();
        Metrics.getInstance().updateMetric(Analyze.COUNT_BY_DESELECT_ALL, 1);
        break;
      case EventType.INVERT:
        countBy.invertSelection();
        Metrics.getInstance().updateMetric(Analyze.COUNT_BY_INVERT_SELECTION, 1);
        break;
      case EventType.SORT_SELECTED:
        countBy.sortSelection();
        Metrics.getInstance().updateMetric(Analyze.COUNT_BY_SORT_SELECTED, 1);
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

          const callback = onColorChosen.bind(undefined, histogram, selectedBins);
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
            }, getFirstColor(items));
          }
          Metrics.getInstance().updateMetric(Analyze.COUNT_BY_COLOR_SELECTED, 1);
        }
        break;
      case EventType.AUTO_COLOR:
        if (histogram) {
          histogram.setColorMethod(ColorMethod.AUTO_COLOR);
          Metrics.getInstance().updateMetric(Analyze.COUNT_BY_AUTO_COLOR, 1);
        }
        break;
      case EventType.AUTO_COLOR_BY_COUNT:
        // nope. see the comment above.
        // histogram.setColorMethod(ColorMethod.AUTO_COLOR_BY_COUNT);
        break;
      case EventType.RESET_COLOR:
        if (histogram) {
          histogram.setColorMethod(ColorMethod.RESET);
          Metrics.getInstance().updateMetric(Analyze.COUNT_BY_RESET_COLOR, 1);
        }
        break;
      case AnalyzeEventType.TOGGLE_ROW:
        countBy.toggleRowCount();
        Metrics.getInstance().updateMetric(Analyze.COUNT_BY_TOGGLE_ROW_COUNT, 1);
        break;
      case AnalyzeEventType.CASCADE_ALL:
        countBy.cascadeAll();
        Metrics.getInstance().updateMetric(Analyze.COUNT_BY_CASCADE_ALL, 1);
        break;
      case AnalyzeEventType.REMOVE_CASCADE:
        countBy.removeCascadedBins(countBy.getSelectedBins());
        Metrics.getInstance().updateMetric(Analyze.COUNT_BY_RMOVE_CASCADE, 1);
        break;
      case AnalyzeEventType.CLEAR_CASCADE:
        countBy.cascadeNone();
        Metrics.getInstance().updateMetric(Analyze.COUNT_BY_CLEAR_CASCADE, 1);
        break;
      case AnalyzeEventType.COPY_ROWS:
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
export const setupInternal = function() {
  dispatcher.getInstance().listen(PREFIX + EventType.HIDE_SELECTED, handleInternalEvent);
  dispatcher.getInstance().listen(PREFIX + EventType.HIDE_UNSELECTED, handleInternalEvent);
  dispatcher.getInstance().listen(PREFIX + EventType.DISPLAY_ALL, handleInternalEvent);
  dispatcher.getInstance().listen(PREFIX + EventType.REMOVE, handleInternalEvent);
  dispatcher.getInstance().listen(PREFIX + EventType.REMOVE_UNSELECTED, handleInternalEvent);
};

/**
 * Cleans up internal list tool actions
 */
export const disposeInternal = function() {
  dispatcher.getInstance().unlisten(PREFIX + EventType.HIDE_SELECTED, handleInternalEvent);
  dispatcher.getInstance().unlisten(PREFIX + EventType.HIDE_UNSELECTED, handleInternalEvent);
  dispatcher.getInstance().unlisten(PREFIX + EventType.DISPLAY_ALL, handleInternalEvent);
  dispatcher.getInstance().unlisten(PREFIX + EventType.REMOVE, handleInternalEvent);
  dispatcher.getInstance().unlisten(PREFIX + EventType.REMOVE_UNSELECTED, handleInternalEvent);
};

/**
 * @param {MenuEvent} event
 */
const handleInternalEvent = function(event) {
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
          removeFeatures(source.getId(), source.getSelectedItems());
          break;
        case EventType.REMOVE_UNSELECTED:
          removeFeatures(source.getId(), source.getUnselectedItems());
          break;
        default:
          break;
      }

      if (cmd) {
        CommandProcessor.getInstance().addCommand(cmd);
      }
    }
  }
};
