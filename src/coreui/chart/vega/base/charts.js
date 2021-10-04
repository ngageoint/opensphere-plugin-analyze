goog.declareModuleId('coreui.chart.vega.base.Charts');

const {AbstractChart} = goog.requireType('coreui.chart.vega.base.AbstractChart');
const {Model} = goog.requireType('coreui.chart.vega.data.Model');
const {default: MenuItem} = goog.requireType('os.ui.menu.MenuItem');


/**
 * Manager for different creating different Vega chart implementations.
 */
export class Charts {
  /**
   * Constructor.
   */
  constructor() {
    /**
     * @type {Object<string, AbstractChart>}
     */
    this.charts = {};
  }

  /**
   * Set chart by id
   * @param {string} id
   * @param {AbstractChart} chart
   */
  setChart(id, chart) {
    this.charts[id] = chart;
  }

  /**
   * Get chart by id
   * @param {string} id
   * @return {AbstractChart}
   */
  getChart(id) {
    return this.charts[id];
  }

  /**
   * Remove ref to chart
   * @param {string} id
   */
  removeChart(id) {
    this.charts[id] = null;
  }

  /**
   * @param {Model} model the menu context (chart model)
   * @this {MenuItem}
   */
  static chartWindowActive(model) {
    this.visible = false;
    const charts = Charts.getInstance();

    if (charts.getChart(model.id)) {
      const chart = charts.getChart(model.id);

      if (chart && this.eventType) {
        this.visible = model.windowActive && chart.supportsAction(this.eventType);
      }
    }
  }

  /**
   * @param {Model} model the menu context (chart model)
   * @this {MenuItem}
   */
  static chartWindowInactive(model) {
    this.visible = false;
    const charts = Charts.getInstance();

    if (charts.getChart(model.id)) {
      const chart = charts.getChart(model.id);
      if (chart && this.eventType) {
        this.visible = !!model && !model.windowActive && chart.supportsAction(this.eventType);
      }
    }
  }

  /**
   * @param {Model} model the menu context (chart model)
   * @this {MenuItem}
   */
  static chartActionAllowed(model) {
    this.visible = false;
    const charts = Charts.getInstance();

    if (charts.getChart(model.id)) {
      const chart = charts.getChart(model.id);
      if (chart && this.eventType) {
        this.visible = chart.supportsAction(this.eventType);
      }
    }
  }

  /**
   * Get the global instance.
   * @return {!Charts}
   */
  static getInstance() {
    if (!instance) {
      instance = new Charts();
    }

    return instance;
  }
}

/**
 * Global Charts instance.
 * @type {Charts|undefined}
 */
let instance;
