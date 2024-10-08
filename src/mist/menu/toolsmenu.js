goog.declareModuleId('mist.menu.tools');

import EventType from 'opensphere/src/os/action/eventtype.js';
import {instanceOf} from 'opensphere/src/os/classregistry.js';
import ColorMethod from 'opensphere/src/os/data/histo/colormethod.js';
import {inIframe} from 'opensphere/src/os/os.js';
import {isFilterable} from 'opensphere/src/os/source/source.js';
import Vector from 'opensphere/src/os/source/vectorsource.js';
import {toRgbaString} from 'opensphere/src/os/style/style.js';
import {launchAddColumn} from 'opensphere/src/os/ui/data/addcolumn.js';
import * as feature from 'opensphere/src/os/ui/menu/featuremenu.js';
import {AnalyzeEventType} from '../analyze/eventtype.js';
import {Analyze} from '../metrics/keys.js';

const GoogEvent = goog.require('goog.events.Event');

const {SourceModel} = goog.requireType('coreui.chart.vega.data.SourceModel');


const OlFeature = goog.requireType('ol.Feature');
const {default: ColorBin} = goog.requireType('os.data.histo.ColorBin');
const {default: SourceHistogram} = goog.requireType('os.data.histo.SourceHistogram');
const {default: IHistogramUI} = goog.requireType('os.ui.IHistogramUI');

const {default: Menu} = goog.requireType('os.ui.menu.Menu');
const {default: MenuEvent} = goog.requireType('os.ui.menu.MenuEvent');
const {default: MenuItem} = goog.requireType('os.ui.menu.MenuItem');
const {AbstractHistogramCtrl} = goog.requireType('tools.ui.AbstractHistogramCtrl');


/**
 * Metric keys to assign to generic menu items.
 * @type {!Array<!({eventType: string, key: string})>}
 */
export const METRIC_KEYS = [
  {eventType: EventType.SELECT, key: Analyze.SELECT_ALL},
  {eventType: EventType.DESELECT, key: Analyze.DESELECT_ALL},
  {eventType: EventType.INVERT, key: Analyze.INVERT_SELECTION},
  {eventType: EventType.HIDE_SELECTED, key: Analyze.HIDE_SELECTED},
  {eventType: EventType.HIDE_UNSELECTED, key: Analyze.HIDE_UNSELECTED},
  {eventType: EventType.DISPLAY_ALL, key: Analyze.DISPLAY_ALL},
  {eventType: EventType.REMOVE, key: Analyze.REMOVE_SELECTED},
  {eventType: EventType.REMOVE_UNSELECTED, key: Analyze.REMOVE_UNSELECTED}
];

/**
 * Sets up select, display, and remove options
 * @param {Menu} manager
 * @param {string=} opt_prefix
 */
export const addGenericItems = function(manager, opt_prefix) {
  const prefix = opt_prefix || '';
  const menuRoot = manager.getRoot();

  feature.addFeatureItems(manager, prefix);

  // assign metric keys to generic menu items
  METRIC_KEYS.forEach(function(obj) {
    const menuItem = menuRoot.find(prefix + obj.eventType);
    if (menuItem) {
      menuItem.metricKey = obj.key;
    }
  });

  const group = manager.getRoot().find(feature.GroupLabel.SELECT);
  goog.asserts.assert(group, 'Group should exist! Check spelling?');
  if (group) {
    group.addChild({
      label: 'Add Custom Label',
      eventType: AnalyzeEventType.ADDCOLUMN,
      tooltip: 'Adds a column to the selected records where custom data and labels can be provided',
      icons: ['<i class="fa fa-fw fa-plus"></i>'],
      handler: inIframe() ? undefined : handleAddColumn,
      metricKey: Analyze.ADD_CUSTOM_DATA,
      beforeRender: somethingIsSelected,
      sort: 5
    });
  }
};

/**
 * Checks if there are selected bins in the Count By to show/hide the Color Selected menu item.
 * @param {IHistogramUI=} opt_histoUi
 * @return {boolean}
 */
export const canCreateHistogramFilter = function(opt_histoUi) {
  if (opt_histoUi) {
    try {
      if (isFilterable(opt_histoUi.getSource())) {
        const parent = opt_histoUi.getParent();

        // we can create a filter if the count by has selected bins, is cascaded and has cascaded bins, or the parent
        // is able to create a filter
        return opt_histoUi.hasSelectedBins() || (opt_histoUi.isCascaded() && opt_histoUi.hasCascadedBins()) ||
            canCreateHistogramFilter(parent);
      }
    } catch (e) {
      // wasn't a histogram controller? fall through to return false
    }
  }

  return false;
};

/**
 * Gets the items from a set of bins
 * @param {!Array<!ColorBin>} bins
 * @return {!Array<!OlFeature>} items
 */
export const getCountByItems = function(bins) {
  // build an array in-place instead of using concat which will create a new array on each call
  const items = [];
  for (let i = 0, ii = bins.length; i < ii; i++) {
    const startIndex = items.length;
    const binItems = bins[i].getItems();
    items.length += binItems.length;

    for (let j = 0, jj = binItems.length; j < jj; j++) {
      items[startIndex + j] = binItems[j];
    }
  }

  return items;
};

/**
 * Handle the user choosing a selected bin color.
 * @param {!SourceHistogram} histogram The histogram
 * @param {!Array<!ColorBin>} bins The bins to color
 * @param {string} color The color
 */
export const onColorChosen = function(histogram, bins, color) {
  histogram.setColorMethod(ColorMethod.MANUAL, bins, toRgbaString(color));
};

/**
 * @param {Vector|AbstractHistogramCtrl} context
 * @param {*} target
 * @this {MenuItem}
 */
const somethingIsSelected = function(context, target) {
  this.visible = false;

  let source;
  if (context && instanceOf(context, Vector.NAME)) {
    source = source = /** @type {Vector} */ (context);
  } else if (target) {
    const ctrl = /** @type {AbstractHistogramCtrl} */ (target);
    if (typeof ctrl.getSource === 'function') {
      source = ctrl.getSource();
    }
  }

  if (instanceOf(source, Vector.NAME)) {
    source = /** @type {!Vector} */ (source);
    const selected = source.getSelectedItems();
    this.visible = selected != null && selected.length > 0;
  }
};

/**
 * @param {MenuEvent} event
 */
export const handleAddColumn = function(event) {
  if (event instanceof GoogEvent && !inIframe()) {
    // handle the event
    event.preventDefault();
    event.stopPropagation();

    let context = event.target;
    let source;

    if (instanceOf(context, Vector.NAME)) {
      source = context;
    } else if (context.getSource) {
      source = context.getSource();
    } else {
      source = context.source;
    }

    // handle events from Vega charts
    if (!source) {
      context = event.getContext();
      if (context) {
        source = /** @type {SourceModel} */ (context).source;
      }
    }

    if (instanceOf(source, Vector.NAME)) {
      source = /** @type {Vector} */ (source);
      launchAddColumn(source);
    }
  }
};
