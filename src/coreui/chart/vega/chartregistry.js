goog.declareModuleId('coreui.chart.vega.ChartRegistry');

const osObject = goog.require('os.object');
const {
  default: ChartType
} = goog.requireType('coreui.chart.vega.ChartType');


/**
 * Manage the registered Vega chart types and provide helper function(s) to sort/display them
 */
class ChartRegistry {
  /**
   * Constructor
   */
  constructor() {
    /**
     * Object of registered Vega chart types.
     * @type {Object<string, bitsx.vega.Options>}
     * @private
     */
    this.chartTypes_ = {};

    /**
     * Object of additional, chart-specific configuration for each registered chart type.
     * @type {!Object<string, !Object>}
     * @private
     */
    this.chartConfigs_ = {};
  }

  /**
   * Get the a chart type registered in the application by id.
   * @param {string|undefined} id The chart options id.
   * @return {bitsx.vega.Options|undefined} The chart options, if registered.
   */
  getChartType(id) {
    return id ? osObject.unsafeClone(this.chartTypes_[id]) : undefined;
  }

  /**
   * Get the chart types registered in the application.
   * @return {!Array<!bitsx.vega.Options>} The chart types.
   */
  getChartTypes() {
    return (this.chartTypes_) ? Object.values(this.chartTypes_).map(osObject.unsafeClone) : [];
  }

  /**
   * Register a new chart type in the application.
   * @param {!bitsx.vega.Options} options The chart options.
   * @param {Object=} opt_config Default configuration overrides.
   */
  registerChartType(options, opt_config) {
    if (!options || !options.type) {
      throw new Error('Unable to register chart without a type.');
    }

    if (!this.chartTypes_[options.type]) {
      this.chartTypes_[options.type] = options;

      // base chart configuration
      const chartConfig = {
        'type': options.type
      };

      // merge in the provided config, replacing existing keys
      if (opt_config) {
        Object.apply(opt_config, chartConfig);
      }

      this.chartConfigs_[options.type] = chartConfig;
    }
  }

  /**
   * Sort chart options in order of ascending priority.
   * @param {!bitsx.vega.Options} a First options object.
   * @param {!bitsx.vega.Options} b Second options object.
   * @return {number} The sort value.
   */
  static sortOptionsByPriority(a, b) {
    if (a.priority != null && b.priority != null) {
      return a.priority > b.priority ? 1 : a.priority < b.priority ? -1 : 0;
    }

    return a.priority != null ? -1 : b.priority != null ? 1 : 0;
  }

  /**
   * Get the global instance.
   * @return {!ChartRegistry}
   */
  static getInstance() {
    if (!instance) {
      instance = new ChartRegistry();
    }

    return instance;
  }

  /**
   * Set the global instance.
   * @param {ChartRegistry} value
   */
  static setInstance(value) {
    instance = value;
  }
}

/**
 * Global instance.
 * @type {ChartRegistry|undefined}
 */
let instance;


export default ChartRegistry;
