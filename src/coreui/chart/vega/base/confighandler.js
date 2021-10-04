goog.declareModuleId('coreui.chart.vega.base.ConfigHandler');

import {HEATMAP_GRADIENT_HEX} from 'opensphere/src/os/color.js';


/**
 * The vega config is the JSON object that defines all of the values for the visualization
 * It generally takes precedence over the spec so it can be used for site wide application like themes
 */
export class ConfigHandler {
  /**
   * Constructor.
   * @param {Object=} opt_obj A config that should be created, will check the keys and override only those keys
   */
  constructor(opt_obj) {
    /**
     * Vega config keys
     * @type {Object}
     * @private
     */
    this.config_ = null;

    /**
     * Vega config keys
     * there are more for specific marks if needed (e.g. area, line, rect, symbol, etc.)
     * @type {Array}
     */
    this.configKeys = [
      'autosize', // {string|Object}
      'group', // {Object} top level viz settings
      'background', // {Color} background color for the entire view
      'events', // {Object} for preventing or allowing browser events on the vega view
      'mark', // {Object} override for all mark types
      'style', // {Object} override style settings
      'axis', // {Object} default settings for axes
      'legend', // {Object} default settings for all legends
      'title', // {Object} defaults for titles
      'range' // {Object} properties for named range arrays that can be used by the spec: scale: range
    ];

    /**
     * @type {jQuery|string}
     * @private
     */
    this.color_ = $('body').css('color') || 'rgb(255, 255, 255)';

    /**
     * @type {jQuery|string}
     * @private
     */
    this.backgroundColor_ = $('body').css('background-color') || 'rgb(255, 255, 255)';

    this.init();
  }

  /**
   * Setup the config
   * @param {Object=} opt_obj A config that should be created, will check the keys and override only those keys
   */
  init(opt_obj) {
    /**
     * The basic config to apply to all charts
     * @type {Object}
     */
    this.config_ = {
      '$schema': 'https://vega.github.io/schema/vega/v5.json',
      'padding': 10,
      'background': null,
      'events': {
        'defaults': {
          'prevent': true
        }
      },
      'mark': {
        'stroke': this.color_
      },
      'axis': {
        'domainColor': this.color_,
        'gridColor': this.color_,
        'gridOpacity': 0.1,
        'labelColor': this.color_,
        'tickColor': this.color_,
        'titleColor': this.color_
      },
      'legend': {
        'fillColor': this.backgroundColor_,
        'labelColor': this.color_,
        'strokeColor': this.color_
      },
      'title': {
        'color': this.color_
      },
      'range': {
        'heatmap': HEATMAP_GRADIENT_HEX
      }
    };

    if (opt_obj != null) {
      this.applyOverride(opt_obj);
    }
  }

  /**
   * Get the config
   * @return {Object}
   */
  getConfig() {
    return this.config_;
  }

  /**
   *
   * @param {Object} obj
   */
  applyOverride(obj) {
    if (obj != null) {
      for (const key in obj) {
        this.config_[key] = obj[key];
      }
    }
  }
}
