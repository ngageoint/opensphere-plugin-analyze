goog.declareModuleId('coreui.chart.vega.ChartType');


/**
 * Various chart types
 * @enum {string}
 */
const ChartType = {
  BAR: 'bar',
  LINE: 'line',
  OPSCLOCK: 'opsclock',
  PIE: 'pie',
  SCATTER: 'scatter',
  SYMLOG: 'symlog'
};

/**
 * Default Vega chart type.
 * @type {string}
 */
export const DEFAULT_CHART = ChartType.BAR;

export default ChartType;
