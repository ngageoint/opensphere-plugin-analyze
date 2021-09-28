goog.declareModuleId('coreui.chart.vega.base.stats');

import {roundWithPrecision} from 'opensphere/src/os/math/math.js';
import {measureText} from 'opensphere/src/os/ui/ui.js';
import {StatType} from '../../chartstats.js';
import {ChartType} from '../charttype.js';
import {Utils} from '../utils.js';

const {Model} = goog.requireType('coreui.chart.vega.data.Model');


/**
 * Font size for bin stats.
 * @type {number}
 */
const binStatFontSize = 12;


/**
 * Padding between bin stats and the left edge of the chart.
 * @type {number}
 */
const binStatPadding = 3;


/**
 * The font to use for chart stats.
 * @type {string}
 */
const statFont = 'sans-serif';


/**
 * Padding around data stats within the display box.
 * @type {number}
 */
const dataStatPadding = 5;


/**
 * Font size for data stats.
 * @type {number}
 */
const dataStatFontSize = 10;


/**
 * Prefix used on bin stat marks.
 * @type {string}
 */
const binStatPrefix = 'stat-bin-';


/**
 * Prefix used on data stat marks.
 * @type {string}
 */
const dataStatPrefix = 'stat-data-';


/**
 * User-facing labels for chart stats.
 * @enum {string}
 */
const StatLabel = {
  MEAN: 'Mean',
  MEDIAN: 'Median',
  STDDEV: 'StdDev',
  STDDEVP: 'Mean + StdDev',
  STDDEVM: 'Mean - StdDev',
  STDDEV2P: 'Mean + 2*StdDev',
  STDDEV2M: 'Mean - 2*StdDev',
  STDDEV3P: 'Mean + 3*StdDev',
  STDDEV3M: 'Mean - 3*StdDev'
};


/**
 * Signals for chart stat values.
 * @enum {string}
 */
const StatSignal = {
  BIN_MEAN: 'binStatMean',
  BIN_MEDIAN: 'binStatMedian',
  BIN_STDDEVP: 'binStatMeanPlusStddev',
  BIN_STDDEVM: 'binStatMeanMinusStddev',
  BIN_STDDEV2P: 'binStatMeanPlusStddev2',
  BIN_STDDEV2M: 'binStatMeanMinusStddev2',
  BIN_STDDEV3P: 'binStatMeanPlusStddev3',
  BIN_STDDEV3M: 'binStatMeanMinusStddev3',

  DATA_MEAN: 'dataStatMean',
  DATA_MEDIAN: 'dataStatMedian',
  DATA_STDDEV: 'dataStatStddev',
  DATA_STDDEVP: 'dataStatMeanPlusStddev',
  DATA_STDDEVM: 'dataStatMeanMinusStddev',
  DATA_STDDEV2P: 'dataStatMeanPlusStddev2',
  DATA_STDDEV2M: 'dataStatMeanMinusStddev2',
  DATA_STDDEV3P: 'dataStatMeanPlusStddev3',
  DATA_STDDEV3M: 'dataStatMeanMinusStddev3'
};


/**
 * User-facing label for NaN values.
 * @type {string}
 */
const nanLabel = 'Not a Number';


/**
 * If a chart supports statistics.
 * @param {bitsx.vega.Options} options The chart options.
 * @return {boolean}
 */
export const supportsStats = (options) => options && (options.type === ChartType.BAR || options.type === ChartType
    .LINE);



/**
 * Get the signal value to display in the UI.
 * @param {number} value The stat value.
 * @param {number=} opt_min The minimum allowed value.
 * @param {number=} opt_max The maximum allowed value.
 * @return {string|number} The signal value.
 */
const getSignalValue = (value, opt_min, opt_max) => {
  if (isNaN(value)) {
    return nanLabel;
  }

  //
  // Vega doesn't have a way to hide a mark, and rendering a mark outside the bounds of the chart will cause the
  // chart to shift. To work around this, move the mark within the bounds of the chart and set its opacity to 0.
  //
  // Hiding marks has been requested in https://github.com/vega/vega/issues/1153, but not yet worked.
  //
  const min = opt_min != null ? opt_min : -Infinity;
  const max = opt_max != null ? opt_max : Infinity;
  return value >= min && value <= max ? roundWithPrecision(value, 3) : 0;
};


/**
 * If a set of stat options has an enabled statistic.
 * @param {Object<string, boolean>} options The stat options.
 * @return {boolean} If one or more stats are enabled.
 */
const hasEnabled = (options) => {
  if (options) {
    for (const key in options) {
      if (options[key]) {
        return true;
      }
    }
  }

  return false;
};


/**
 * Create a horizontal rule spec.
 * @param {string} name The rule name.
 * @param {string} signal The stat signal.
 * @param {string} color The color.
 * @return {!Object} The rule spec.
 */
const getHorizontalRule = (name, signal, color) => ({
  'type': 'rule',
  'name': name,
  'encode': {
    'enter': {
      'stroke': {'value': color},
      'strokeWidth': {'value': 3}
    },
    'update': {
      // Create a rule mark the full width of the chart.
      'x': {'scale': 'xScale', 'value': 0},
      'x2': {'signal': 'width'},
      'y': {'scale': 'yScale', 'signal': signal},
      'opacity': {'signal': `${signal} > 0 ? 1 : 0`}
    }
  }
});


/**
 * Create a horizontal rule label spec.
 * @param {string} name The label name.
 * @param {string} text The label text.
 * @param {string} signal The stat signal.
 * @param {string} color The color.
 * @return {!Object} The label spec.
 */
const getHorizontalRuleLabel = (name, text, signal, color) => ({
  'type': 'text',
  'name': name,
  'encode': {
    'enter': {
      // Label will appear above the rule on the left side of the chart, inset by the padding value.
      'dx': {'value': binStatPadding},
      'align': {'value': 'left'},
      'baseline': {'value': 'bottom'},
      'fill': {'value': color},
      'font': {'value': statFont},
      'fontSize': {'value': binStatFontSize}
    },
    'update': {
      'text': {'signal': text},
      'x': {'scale': 'xScale', 'value': 0},
      'y': {'scale': 'yScale', 'signal': signal},
      'opacity': {'signal': `${signal} > 0 ? 1 : 0`}
    }
  }
});

/**
 * Create a vertical rule spec.
 * @param {string} name The rule name.
 * @param {string} signal The stat signal.
 * @param {string} color The color.
 * @return {!Object} The rule spec.
 */
const getVerticalRule = (name, signal, color) => ({
  'type': 'rule',
  'name': name,
  'encode': {
    'enter': {
      'stroke': {'value': color},
      'strokeWidth': {'value': 3}
    },
    'update': {
      // Create a rule mark the full height of the chart.
      'y': {'scale': 'xScale', 'value': 0},
      'y2': {'signal': 'height'},
      'x': {'scale': 'yScale', 'signal': signal},
      'opacity': {'signal': `${signal} > 0 ? 1 : 0`}
    }
  }
});


/**
 * Create a vertical rule label spec.
 * @param {string} name The label name.
 * @param {string} text The label text.
 * @param {string} signal The stat signal.
 * @param {string} color The color.
 * @return {!Object} The label spec.
 */
const getVerticalRuleLabel = (name, text, signal, color) => ({
  'type': 'text',
  'name': name,
  'encode': {
    'enter': {
      // Label will appear above the rule on the left side of the chart, inset by the padding value.
      'dy': {'value': -binStatPadding},
      'align': {'value': 'left'},
      'angle': {'value': 90},
      'baseline': {'value': 'bottom'},
      'fill': {'value': color},
      'font': {'value': statFont},
      'fontSize': {'value': binStatFontSize}
    },
    'update': {
      'text': {'signal': text},
      'x': {'scale': 'yScale', 'signal': signal},
      'y': {'scale': 'xScale', 'signal': 'height'},
      'opacity': {'signal': `${signal} > 0 ? 1 : 0`}
    }
  }
});


/**
 * Create a data stat label.
 * @param {string} signal The stat signal.
 * @param {string} text The label text.
 * @param {number} xOffset The x offset for the label.
 * @param {number} yOffset The y offset for the label.
 * @param {string} color The color.
 * @return {!Object} The label spec.
 */
const getDataStatLabel = (signal, text, xOffset, yOffset, color) => ({
  'type': 'text',
  'name': `${dataStatPrefix}${signal}`,
  'encode': {
    'enter': {
      'fill': {'value': color},
      'align': {'value': 'left'},
      'baseline': {'value': 'top'},
      'font': {'value': statFont},
      'fontSize': {'value': dataStatFontSize}
    },
    'update': {
      'text': {'signal': `'${text}: ' + ${signal}`},
      'x': {'signal': `width - ${xOffset}`},
      'y': {'value': yOffset}
    }
  }
});


/**
 * Create a box to contain data stats.
 * @param {number} height The box height.
 * @param {number} width The box width.
 * @return {!Object} The box spec.
 */
const getDataStatRect = (height, width) => ({
  'type': 'rect',
  'name': `${dataStatPrefix}rect`,
  'encode': {
    'enter': {
      'stroke': {'value': '#000'},
      'strokeWidth': {'value': 2},
      'fill': {'value': '#000'},
      'fillOpacity': {'value': 0.5},
      'height': {'value': height},
      'width': {'value': width}
    },
    'update': {
      'x': {'signal': `width - ${width}`},
      'y': {'value': 0}
    }
  }
});


/**
 * Remove all bin stats.
 * @param {!Object} spec The Vega spec.
 */
const removeBinStats = (spec) => {
  if (spec) {
    for (const key in StatSignal) {
      updateBinStat(spec, StatSignal[key], false);
    }
  }
};


/**
 * Remove all data stats.
 * @param {!Object} spec The Vega spec.
 */
const removeDataStats = (spec) => {
  if (spec && spec['marks']) {
    let i = spec['marks'].length;
    while (i--) {
      if (spec['marks'][i] && spec['marks'][i]['name'] && spec['marks'][i]['name'].startsWith(dataStatPrefix)) {
        spec['marks'].splice(i, 1);
      }
    }
  }
};


/**
 * Update a stat rule.
 * @param {!Object} spec The Vega spec.
 * @param {string} signal The stat value signal.
 * @param {boolean} show If the bin stat should be displayed.
 * @param {string=} opt_label The label text.
 * @param {string=} opt_color The rule color.
 */
const updateBinStat = (spec, signal, show, opt_label, opt_color) => {
  const ruleName = `${binStatPrefix}${signal}`;
  const labelName = `${ruleName}-label`;
  const isChartRotated = (Utils.specSignal(spec, 'isChartRotated') === true);

  if (show) {
    const color = opt_color || 'white';
    Utils.updateSpec(spec, 'marks', ruleName,
      isChartRotated ?
      getVerticalRule(ruleName, signal, color) :
      getHorizontalRule(ruleName, signal, color)
    );

    const labelText = opt_label ? `'${opt_label} (' + ${signal} + ')'` : signal;
    Utils.updateSpec(spec, 'marks', labelName,
      isChartRotated ?
      getVerticalRuleLabel(labelName, labelText, signal, color) :
      getHorizontalRuleLabel(labelName, labelText, signal, color)
    );
  } else {
    Utils.updateSpec(spec, 'marks', ruleName);
    Utils.updateSpec(spec, 'marks', labelName);
  }
};


/**
 * Initialize statistic signals on a Vega spec.
 * @param {Model} model The chart model.
 * @param {Object} spec The Vega spec.
 */
export const initStatSignals = (model, spec) => {
  if (model && spec && model.binStatOptions && model.dataStatOptions) {
    for (const key in StatSignal) {
      Utils.updateSpec(spec, 'signals', StatSignal[key], {'name': StatSignal[key], 'value': null});
    }
  }
};

/**
 * Update statistic signal values.
 * @param {Model} model The chart model.
 * @param {vega.View} view The Vega view.
 */
export const updateStatSignals = (model, view) => {
  if (model && view) {
    updateBinStatSignals(model, view);
    updateDataStatSignals(model, view);
  }
};


/**
 * Update bin statistic signal values.
 * @param {Model} model The chart model.
 * @param {vega.View} view The Vega view.
 */
const updateBinStatSignals = (model, view) => {
  if (model && view) {
    // update signals for all enabled stat options
    const binOptions = model.binStatOptions;
    if (binOptions && hasEnabled(binOptions)) {
      const stats = model.getBinStats();
      if (binOptions[StatType.MEAN]) {
        view.signal(StatSignal.BIN_MEAN, getSignalValue(stats.mean, 0, stats.max));
      }
      if (binOptions[StatType.MEDIAN]) {
        view.signal(StatSignal.BIN_MEDIAN, getSignalValue(stats.median, 0, stats.max));
      }
      if (binOptions[StatType.STDDEV]) {
        view.signal(StatSignal.BIN_STDDEVP, getSignalValue(stats.mean + stats.stddev, 0, stats.max));
        view.signal(StatSignal.BIN_STDDEVM, getSignalValue(stats.mean - stats.stddev, 0, stats.max));
      }
      if (binOptions[StatType.STDDEV2]) {
        view.signal(StatSignal.BIN_STDDEV2P, getSignalValue(stats.mean + stats.stddev * 2, 0, stats.max));
        view.signal(StatSignal.BIN_STDDEV2M, getSignalValue(stats.mean - stats.stddev * 2, 0, stats.max));
      }
      if (binOptions[StatType.STDDEV3]) {
        view.signal(StatSignal.BIN_STDDEV3P, getSignalValue(stats.mean + stats.stddev * 3, 0, stats.max));
        view.signal(StatSignal.BIN_STDDEV3M, getSignalValue(stats.mean - stats.stddev * 3, 0, stats.max));
      }
    }
  }
};


/**
 * Update data statistic signal values.
 * @param {Model} model The chart model.
 * @param {vega.View} view The Vega view.
 */
const updateDataStatSignals = (model, view) => {
  if (model && view) {
    const dataOptions = model.dataStatOptions;
    if (dataOptions && hasEnabled(dataOptions)) {
      const stats = model.getDataStats();
      if (stats) {
        if (dataOptions[StatType.MEAN]) {
          view.signal(StatSignal.DATA_MEAN, getSignalValue(stats.mean));
        }
        if (dataOptions[StatType.MEDIAN]) {
          view.signal(StatSignal.DATA_MEDIAN, getSignalValue(stats.median));
        }
        if (dataOptions[StatType.STDDEV] || dataOptions[StatType.STDDEV2] || dataOptions[StatType.STDDEV3]) {
          view.signal(StatSignal.DATA_STDDEV, getSignalValue(stats.stddev));
        }
        if (dataOptions[StatType.STDDEV]) {
          view.signal(StatSignal.DATA_STDDEVP, getSignalValue(stats.mean + stats.stddev));
          view.signal(StatSignal.DATA_STDDEVM, getSignalValue(stats.mean - stats.stddev));
        }
        if (dataOptions[StatType.STDDEV2]) {
          view.signal(StatSignal.DATA_STDDEV2P, getSignalValue(stats.mean + stats.stddev * 2));
          view.signal(StatSignal.DATA_STDDEV2M, getSignalValue(stats.mean - stats.stddev * 2));
        }
        if (dataOptions[StatType.STDDEV3]) {
          view.signal(StatSignal.DATA_STDDEV3P, getSignalValue(stats.mean + stats.stddev * 3));
          view.signal(StatSignal.DATA_STDDEV3M, getSignalValue(stats.mean - stats.stddev * 3));
        }
      }
    }
  }
};


/**
 * Get the width of a chart label.
 * @param {string} prefix The label prefix.
 * @param {number} value The label value.
 * @param {number} fontSize The font size.
 * @return {number} The label width.
 */
const getLabelWidth = (prefix, value, fontSize) => {
  const valueText = isNaN(value) ? nanLabel : getSignalValue(Math.round(value)) + '.000';
  return measureText(`${prefix}: ${valueText}`, undefined, `${fontSize}px ${statFont}`).width;
};


/**
 * Update statistics displayed on a Vega chart.
 * @param {Model} model The chart model.
 * @param {Object} spec The Vega spec.
 */
export const updateStatMarks = (model, spec) => {
  if (!model || !spec) {
    return;
  }

  const statCss = getComputedStyle(document.documentElement).getPropertyValue('--primary');
  const statColor = statCss ? statCss.toString().trim() : 'white';

  // TODO: add selected stats
  // const selStatCss = getComputedStyle(document.documentElement).getPropertyValue('--success');
  // const selStatColor = selStatCss ? selStatCss.toString().trim() : 'pink';

  const binOptions = model.binStatOptions;
  if (binOptions && hasEnabled(binOptions)) {
    updateBinStat(spec, StatSignal.BIN_MEAN, binOptions[StatType.MEAN], StatLabel.MEAN, statColor);
    updateBinStat(spec, StatSignal.BIN_MEDIAN, binOptions[StatType.MEDIAN], StatLabel.MEDIAN, statColor);
    updateBinStat(spec, StatSignal.BIN_STDDEVP, binOptions[StatType.STDDEV], StatLabel.STDDEVP, statColor);
    updateBinStat(spec, StatSignal.BIN_STDDEVM, binOptions[StatType.STDDEV], StatLabel.STDDEVM, statColor);
    updateBinStat(spec, StatSignal.BIN_STDDEV2P, binOptions[StatType.STDDEV2], StatLabel.STDDEV2P, statColor);
    updateBinStat(spec, StatSignal.BIN_STDDEV2M, binOptions[StatType.STDDEV2], StatLabel.STDDEV2M, statColor);
    updateBinStat(spec, StatSignal.BIN_STDDEV3P, binOptions[StatType.STDDEV3], StatLabel.STDDEV3P, statColor);
    updateBinStat(spec, StatSignal.BIN_STDDEV3M, binOptions[StatType.STDDEV3], StatLabel.STDDEV3M, statColor);
  } else {
    removeBinStats(spec);
  }

  removeDataStats(spec);

  const dataOptions = model.dataStatOptions;
  if (dataOptions && hasEnabled(dataOptions)) {
    const dataStats = model.getDataStats();
    if (dataStats) {
      const statLabels = [];

      // Determine a reasonable max width to use for the data stats box.
      const textWidth = getLabelWidth(StatLabel.STDDEV3P, dataStats.max, dataStatFontSize);

      if (dataOptions[StatType.MEAN]) {
        statLabels.push(getDataStatLabel(StatSignal.DATA_MEAN, StatLabel.MEAN, textWidth + dataStatPadding,
            statLabels.length * (dataStatFontSize + 1) + dataStatPadding, statColor));
      }
      if (dataOptions[StatType.MEDIAN]) {
        statLabels.push(getDataStatLabel(StatSignal.DATA_MEDIAN, StatLabel.MEDIAN, textWidth + dataStatPadding,
            statLabels.length * (dataStatFontSize + 1) + dataStatPadding, statColor));
      }
      if (dataOptions[StatType.STDDEV] || dataOptions[StatType.STDDEV2] || dataOptions[StatType.STDDEV3]) {
        statLabels.push(getDataStatLabel(StatSignal.DATA_STDDEV, StatLabel.STDDEV, textWidth + dataStatPadding,
            statLabels.length * (dataStatFontSize + 1) + dataStatPadding, statColor));
      }
      if (dataOptions[StatType.STDDEV]) {
        statLabels.push(getDataStatLabel(StatSignal.DATA_STDDEVP, StatLabel.STDDEVP, textWidth + dataStatPadding,
            statLabels.length * (dataStatFontSize + 1) + dataStatPadding, statColor));
        statLabels.push(getDataStatLabel(StatSignal.DATA_STDDEVM, StatLabel.STDDEVM, textWidth + dataStatPadding,
            statLabels.length * (dataStatFontSize + 1) + dataStatPadding, statColor));
      }
      if (dataOptions[StatType.STDDEV2]) {
        statLabels.push(getDataStatLabel(StatSignal.DATA_STDDEV2P, StatLabel.STDDEV2P, textWidth + dataStatPadding,
            statLabels.length * (dataStatFontSize + 1) + dataStatPadding, statColor));
        statLabels.push(getDataStatLabel(StatSignal.DATA_STDDEV2M, StatLabel.STDDEV2M, textWidth + dataStatPadding,
            statLabels.length * (dataStatFontSize + 1) + dataStatPadding, statColor));
      }
      if (dataOptions[StatType.STDDEV3]) {
        statLabels.push(getDataStatLabel(StatSignal.DATA_STDDEV3P, StatLabel.STDDEV3P, textWidth + dataStatPadding,
            statLabels.length * (dataStatFontSize + 1) + dataStatPadding, statColor));
        statLabels.push(getDataStatLabel(StatSignal.DATA_STDDEV3M, StatLabel.STDDEV3M, textWidth + dataStatPadding,
            statLabels.length * (dataStatFontSize + 1) + dataStatPadding, statColor));
      }

      const rectHeight = statLabels.length * (dataStatFontSize + 1) + dataStatPadding * 2;
      const rectWidth = textWidth + dataStatPadding * 2;
      spec['marks'].push(getDataStatRect(rectHeight, rectWidth));
      Array.prototype.push.apply(spec['marks'], statLabels);
    }
  }
};
