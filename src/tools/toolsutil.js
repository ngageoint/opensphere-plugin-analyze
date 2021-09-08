goog.declareModuleId('tools.util');

import {OPS_CLOCK_DATE_BIN_TYPES} from '../coreui/chart/vega/utils.js';
import * as vega from '../mist/ui/widget/mistchart.js';
import {Type as WidgetType} from '../mist/ui/widget/widget.js';
import {ComponentManager} from '../coreui/layout/componentmanager.js';

const DateBinMethod = goog.require('os.histo.DateBinMethod');
const NumericBinMethod = goog.require('os.histo.NumericBinMethod');
const Settings = goog.require('os.config.Settings');
const UniqueBinMethod = goog.require('os.histo.UniqueBinMethod');
const {unsafeClone} = goog.require('os.object');


/**
 * Global reference of arrays for default analyze window tab config/layouts.
 * @type {Array<GoldenLayout.Config>}
 */
export const layoutConfigs = [];

/**
 * Map of constant values from plugins; which may or may not be included in various builds of MIST.  At some
 * point in the future, it may be worth making each plugin register these values with MIST, but mapping between
 * them (which is what we use them for) isn't a simple thing to abstract.
 *
 * @type {Object<string,Object>}
 */
export const constants = {
  infinity: {
    VEGA: 'infinity_' + WidgetType.VEGA, // plugin.infinity.WidgetId.VEGA
    CHART: 'infinity_' + WidgetType.CHART, // plugin.infinity.WidgetId.CHART
    TAB_CLASS: 'c-lm-tab__infinity'
  },
  vega: {
    ID: 'vega', // plugin.vega.VegaPlugin.id
    BAR: 'bar', // ChartType.ChartType.<X>
    LINE: 'line', // ..
    OPSCLOCK: 'opsclock', // ..
    PIE: 'pie', // ..
    SCATTER: 'scatter', // ..
    SYMLOG: 'symlog' // ..
  },
  zing: {
    BAR: 'bar', // coreui.chart.ChartType.<X>
    HBAR: 'hbar', // ..
    LINE: 'line', // ..
    VLINE: 'vline', // ..
    PIE: 'pie', // ..
    OPS_CLOCK: 'opsclock', // plugin.chart.opsclock.ID
    OPS_CLOCK_CHART_TYPE: 'radar', // plugin.chart.opsclock.CHART_TYPE
    SCATTER_CHART_TYPE: 'scatter', // plugin.chart.scatter.CHART_TYPE
    SCATTER_INVERSE_CHART_TYPE: 'scatterInverse', // plugin.chart.scatter.INVERSE_CHART_TYPE
    LINEAR: 'Linear', // coreui.chart.AxisType
    LOG: 'Log', // ..
    DATETIME: 'Date/Time', // ..
    UNIQUE: 'Unique' // ..
  }
};

/**
 * Create the default Golden Layout content.
 * @return {!Array<!GoldenLayout.Config>}
 */
export const createDefaultContent = function() {
  var wm = ComponentManager.getInstance();

  var countBy = wm.createComponent(WidgetType.COUNT_BY);
  countBy.width = 25;

  var list = wm.createComponent(WidgetType.LIST);
  list.height = 65;

  var chart1 = wm.createComponent(WidgetType.VEGA);
  chart1.width = 40;

  var chart2 = wm.createComponent(WidgetType.VEGA);
  chart2.width = 60;

  return [{
    'type': 'row',
    'content': [countBy, {
      'type': 'column',
      'content': [list, {
        'type': 'row',
        'content': [chart1, chart2]
      }]
    }]
  }];
};

/**
 * Get the default configs for the GoldenLayout tabs. This can be contributed to by plugins through the
 * {@code layoutConfigs} array.
 * @return {Array<GoldenLayout.Config>} The configs.
 */
export const getDefaultConfigs = function() {
  var baseConfig = /** @type {!GoldenLayout.Config} */ (Settings.getInstance().get('toolsWindow.defaultConfig', {}));
  baseConfig['content'] = createDefaultContent();
  baseConfig['showClose'] = false;
  return [baseConfig].concat(layoutConfigs);
};

/**
 * If Vega plugin is available, convert Zing charts' GoldenConfig into a Vega GoldenConfig
 * @param {*=} config the GoldenConfig holder
 * @return {*} the GoldenConfig holder; possibly transformed
 */
export const transform = function(config) {
  /**
   * Recursively walk down the content arrays of the configs; transforming configs as needed
   *
   * @param {!Array<GoldenLayout.Component>} content - because we're dealing with partial objects, strict typing is failing
   * @param {string} source
   */
  var reconfig = function(content, source) {
    if (!content || content.length == 0) return;

    // len: checking the length of an array is basically free, but... we're splicing content, so why not
    for (var i = 0, len = content.length; i < len; i++) {
      try {
        var updated = null;
        if (content[i].id == WidgetType.CHART || content[i].id == constants.infinity.CHART) {
          updated = toVega(content[i], source);
        }

        // the old config was transformed from zing to vega; replace it in the array
        if (updated) {
          content.splice(i, 1, updated);
        }
      } catch (e) {
        // do nothing; the old config will be used (already vega)
      }

      // recurse down into the next GoldenLayout 'content'
      reconfig(content[i]['content'], source);
    }
  };

  if (config && config['layoutConfigs']) {
    reconfig(config['layoutConfigs'], config['source']);
  }

  return config;
};

/**
 * Convert Zing to Vega.
 *
 * WARNING: Brittle.  Must keep in sync with updates to ZingChart AND VegaChart implementations;  But
 * toZing() can be removed after this goes to prod; and toVega() can be removed after X months of supporting
 * the transition.
 *
 * @param {GoldenLayout.Component} record the ZingChart config
 * @param {string} source the Source's ID
 * @return {GoldenLayout.Component|null} the VegaChart config
 */
export const toVega = function(record, source) {
  if (!record) return null;

  var isInfinity = (record.id == constants.infinity.CHART);
  if ((record.id == WidgetType.CHART || isInfinity) &&
      record.componentState &&
      record.componentState['config'] &&
      record.componentState['config']['chartconfig'] &&
      record.componentState['config']['method']) {
    var transform = Object.assign({}, record); // steal sizes, etc from the original record;

    var chartConfig = record.componentState['config']['chartconfig'];
    var method = record.componentState['config']['method'];
    var type = chartConfig['chartId'];
    var subtype = chartConfig['chartType'];

    if (type == constants.zing.OPS_CLOCK) {
      type = constants.vega.OPSCLOCK;
      method['showEmptyBins'] = true;
      method['binTypes'] = OPS_CLOCK_DATE_BIN_TYPES; // opsclock only does Hour of: Day, Week, Month
    } else {
      method['showEmptyBins'] = (chartConfig['showOBins'] === true);
    }

    var config = {'type': type};
    config[constants.vega.BAR] = unsafeClone(vega.BAR_OPTIONS);
    config[constants.vega.LINE] = unsafeClone(vega.LINE_OPTIONS);
    config[constants.vega.PIE] = unsafeClone(vega.PIE_OPTIONS);
    config[constants.vega.SCATTER] = unsafeClone(vega.SCATTER_OPTIONS);
    config[constants.vega.OPSCLOCK] = unsafeClone(vega.OPSCLOCK_OPTIONS);

    if (!config[type]) return null; // if an old config was saved with an unsupported type; leave it alone

    // get the isChartRotated signal from the old chartTypes
    var rotate = {};
    rotate[constants.zing.BAR] = false;
    rotate[constants.zing.HBAR] = true;
    rotate[constants.zing.LINE] = false;
    rotate[constants.zing.VLINE] = true;
    rotate[constants.zing.SCATTER_CHART_TYPE] = false;
    rotate[constants.zing.SCATTER_INVERSE_CHART_TYPE] = true;

    var isChartRotated = rotate.hasOwnProperty(subtype) ? rotate[subtype] : null; // true, false or undefined
    var xAngle = 0;
    var yAngle = 0;

    // if there was a backward-save, then resore the true angle instead of the old limitation to -45 or 0
    if (chartConfig['xLabelAngle']) xAngle = chartConfig['xLabelAngle'];
    else if (chartConfig['angleXLabels']) xAngle = -45;
    if (chartConfig['yLabelAngle']) yAngle = chartConfig['yLabelAngle'];

    var signals = {
      'xLabelAngle': xAngle,
      'xLabelAlign': ((isChartRotated && xAngle == 0) || (!isChartRotated && xAngle == -90)) ? 'center' : 'right',
      'yLabelAngle': yAngle,
      'yLabelAlign': ((isChartRotated && yAngle == -90) || (!isChartRotated && yAngle == 0)) ? 'center' : 'right',
      'isChartRotated': isChartRotated
    };

    if (chartConfig['xAxis'] && chartConfig['xColumn'] && chartConfig['yAxis'] && chartConfig['yColumn']) {
      // 2D Case: use the X and Y axes; the "method" could be for either X or Y
      const methodTypeLookup = {};
      methodTypeLookup[constants.zing.DATETIME] = DateBinMethod.TYPE;
      methodTypeLookup[constants.zing.UNIQUE] = UniqueBinMethod.TYPE;
      methodTypeLookup[constants.zing.LINEAR] = NumericBinMethod.TYPE;
      methodTypeLookup[constants.zing.LOG] = NumericBinMethod.TYPE; // convert to numeric

      var methodX = {
        'type': methodTypeLookup[chartConfig['xAxis']],
        'field': chartConfig['xColumn']['field']
      };
      var methodY = {
        'type': methodTypeLookup[chartConfig['yAxis']],
        'field': chartConfig['yColumn']['field']
      };

      Object.assign(config[type], /** @type {bitsx.vega.Options} */ ({
        primary: {'field': methodX['field']},
        primaryMethod: methodX,
        primaryMethodType: methodX['type'],
        secondary: {'field': methodY['field']},
        secondaryMethod: methodY,
        secondaryMethodType: methodY['type'],
        signals: signals
      }));
    } else {
      // Default Case: Just use "method" for the proper binning configs, etc
      Object.assign(config[type], /** @type {bitsx.vega.Options} */ ({
        primary: {'field': method['field']},
        primaryMethod: method,
        primaryMethodType: method['type'],
        signals: signals
      }));
    }

    transform.id = (isInfinity) ?
      constants.infinity.VEGA :
      WidgetType.VEGA;

    transform.componentState = {
      'type': (isInfinity) ?
        constants.infinity.VEGA :
        WidgetType.VEGA,
      'template': (isInfinity) ?
        '<infinityvegachart source="source" container="container"></infinityvegachart>' :
        '<vegachart container="container" source="source"></vegachart>',
      'tabClass': (isInfinity) ?
        constants.infinity.TAB_CLASS :
        null,
      'config': config
    };
    return /** @type {GoldenLayout.Component} */ (transform);
  }

  return null;
};
