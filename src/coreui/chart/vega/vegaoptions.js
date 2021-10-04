goog.declareModuleId('coreui.chart.vega.VegaOptions');

const {default: ColumnDefinition} = goog.requireType('os.data.ColumnDefinition');
const {default: IBinMethod} = goog.requireType('os.histo.IBinMethod');

/**
 * Options for Vega charts.
 * @record
 */
export class VegaOptions {
  /**
   * Constructor.
   */
  constructor() {
    /**
     * @export {string}
     */
    this.type = '';

    /**
     * @export {string}
     */
    this.title = '';

    /**
     * @export {string}
     */
    this.icon = '';

    /**
     * @export {(number|undefined)}
     */
    this.priority = undefined;

    /**
     * @export {(boolean|undefined)}
     */
    this.primaryMethodTypeImmutable = undefined;

    /**
     * @export {(boolean|undefined)}
     */
    this.hidePrimary = undefined;

    /**
     * @export {(boolean|undefined)}
     */
    this.hidePrimaryType = undefined;

    /**
     * @export {(boolean|undefined)}
     */
    this.hidePrimaryBin = undefined;

    /**
     * @export {(boolean|undefined)}
     */
    this.secondaryMethodTypeImmutable = undefined;

    /**
     * @export {(boolean|undefined)}
     */
    this.hideSecondary = undefined;

    /**
     * @export {(boolean|undefined)}
     */
    this.hideSecondaryType = undefined;

    /**
     * @export {(boolean|undefined)}
     */
    this.hideSecondaryBin = undefined;

    /**
     * @export {(boolean|undefined)}
     */
    this.showReset = undefined;

    /**
     * @export {string}
     */
    this.metricKey = '';

    /**
     * @export {(Object<string, *>|undefined)}
     */
    this.signals = undefined;

    /**
     * @export {(ColumnDefinition|undefined)}
     */
    this.primary = undefined;

    /**
     * @export {(string|undefined)}
     */
    this.primaryMethodType = undefined;

    /**
     * @export {(IBinMethod|undefined)}
     */
    this.primaryMethod = undefined;

    /**
     * @export {(ColumnDefinition|undefined)}
     */
    this.secondary = undefined;

    /**
     * @export {(string|undefined)}
     */
    this.secondaryMethodType = undefined;

    /**
     * @export {(IBinMethod|undefined)}
     */
    this.secondaryMethod = undefined;

    /**
     * @export {(Object<string, boolean>|undefined)}
     */
    this.binStats = undefined;

    /**
     * @export {(Object<string, boolean>|undefined)}
     */
    this.dataStats = undefined;
  }
}
