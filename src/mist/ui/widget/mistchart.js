goog.declareModuleId('mist.chart');

import DateBinMethod from 'opensphere/src/os/histo/datebinmethod.js';
import UniqueBinMethod from 'opensphere/src/os/histo/uniquebinmethod.js';
import {ChartKeys} from '../../../coreui/chart/chart.js';
import {ChartRegistry} from '../../../coreui/chart/vega/chartregistry.js';
import {ChartType} from '../../../coreui/chart/vega/charttype.js';
import {Utils} from '../../../coreui/chart/vega/utils.js';

const {VegaOptions} = goog.requireType('coreui.chart.vega.VegaOptions');


/**
 * Default options for a Vega bar chart.
 * @type {!VegaOptions}
 */
export const BAR_OPTIONS = {
  type: ChartType.BAR,
  title: 'Bar Chart',
  icon: 'fa-bar-chart',
  priority: 0,
  signals: {
    'xLabelAngle': -45,
    'xLabelAlign': 'right',
    'yLabelAngle': 0,
    'yLabelAlign': 'right',
    'isChartRotated': false
  },
  primaryMethod: new DateBinMethod(),
  primaryMethodType: DateBinMethod.TYPE,
  metricKey: ChartKeys.CHART_OPTIONS_BAR
};

/**
 * Default options for a Vega line chart.
 * @type {!VegaOptions}
 */
export const LINE_OPTIONS = {
  type: ChartType.LINE,
  title: 'Line Chart',
  icon: 'fa-line-chart',
  priority: 5,
  signals: {
    'xLabelAngle': -45,
    'xLabelAlign': 'right',
    'yLabelAngle': 0,
    'yLabelAlign': 'right',
    'isChartRotated': false
  },
  primaryMethod: new DateBinMethod(),
  primaryMethodType: DateBinMethod.TYPE,
  metricKey: ChartKeys.CHART_OPTIONS_LINE
};

/**
 * Default options for a Vega pie chart.
 * @type {!VegaOptions}
 */
export const PIE_OPTIONS = {
  type: ChartType.PIE,
  title: 'Pie Chart',
  icon: 'fa-pie-chart',
  priority: 10,
  primaryMethod: new DateBinMethod(),
  primaryMethodType: DateBinMethod.TYPE,
  metricKey: ChartKeys.CHART_OPTIONS_PIE
};

/**
 * Default options for a Vega scatter chart.
 * @type {!VegaOptions}
 */
export const SCATTER_OPTIONS = {
  type: ChartType.SCATTER,
  title: 'Scatter Chart',
  icon: 'fa-th',
  priority: 15,
  signals: {
    'xLabelAngle': -45,
    'xLabelAlign': 'right',
    'yLabelAngle': 0,
    'yLabelAlign': 'right',
    'isChartRotated': false
  },
  primaryMethod: new DateBinMethod(),
  primaryMethodType: DateBinMethod.TYPE,
  hidePrimaryBin: true,
  secondaryMethod: new UniqueBinMethod(),
  secondaryMethodType: UniqueBinMethod.TYPE,
  hideSecondaryBin: true,
  metricKey: ChartKeys.CHART_OPTIONS_SCATTER,
  showReset: true
};

/**
 * Default options for a Vega opsclock chart.
 * @type {!VegaOptions}
 */
export const OPSCLOCK_OPTIONS = {
  type: ChartType.OPSCLOCK,
  title: 'Ops Clock Chart',
  icon: 'fa-bullseye',
  priority: 20,
  primaryMethod: Utils.getOpsClockMethod(),
  primaryMethodType: DateBinMethod.TYPE,
  primaryMethodTypeImmutable: true,
  metricKey: ChartKeys.CHART_OPTIONS_OPSCLOCK,
  hidePrimaryType: true
};

/**
 * Register supported Vega chart types in the application.
 */
export const registerVegaCharts = function() {
  ChartRegistry.getInstance().registerChartType(BAR_OPTIONS);
  ChartRegistry.getInstance().registerChartType(LINE_OPTIONS);
  ChartRegistry.getInstance().registerChartType(PIE_OPTIONS);
  ChartRegistry.getInstance().registerChartType(SCATTER_OPTIONS);
  ChartRegistry.getInstance().registerChartType(OPSCLOCK_OPTIONS);
};
