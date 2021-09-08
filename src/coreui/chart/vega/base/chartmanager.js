goog.declareModuleId('coreui.chart.vega.base.ChartManager');

import {default as ChartType} from '../charttype.js';
import {default as Bar} from '../bar/bar.js';
import {default as Charts} from './charts.js';
import {default as Line} from '../line/line';
import {default as Opsclock} from '../opsclock/opsclock';
import {default as Pie} from '../pie/pie';
import {default as Scatter} from '../scatter/scatter';
import {default as Symlog} from '../symlog/symlog';

const {default: AbstractChart} = goog.requireType('coreui.chart.vega.base.AbstractChart');
const {default: Model} = goog.requireType('coreui.chart.vega.data.Model');


/**
 * Manager for different creating different Vega chart implementations.
 */
class ChartManager {
  /**
   * Factory method
   * Defaults to scatter chart
   * @param {string} id
   * @param {string} type
   * @param {angular.JQLite} element
   * @param {Model} model
   * @return {AbstractChart}
   */
  createChart(id, type, element, model) {
    let chart = null;

    switch (type) {
      case ChartType.BAR:
        chart = new Bar(id, element, model);
        break;
      case ChartType.LINE:
        chart = new Line(id, element, model);
        break;
      case ChartType.OPSCLOCK:
        chart = new Opsclock(id, element, model);
        break;
      case ChartType.PIE:
        chart = new Pie(id, element, model);
        break;
      case ChartType.SCATTER:
        model.isMultiDimensional = true;
        chart = new Scatter(id, element, model);
        break;
      case ChartType.SYMLOG:
        chart = new Symlog(id, element, model);
        break;
      default:
        model.isMultiDimensional = true;
        chart = new Scatter(id, element, model);
        break;
    }

    chart.type = type;
    Charts.getInstance().setChart(id, chart);
    return chart;
  }

  /**
   * Get the global instance.
   * @return {!ChartManager}
   */
  static getInstance() {
    if (!instance) {
      instance = new ChartManager();
    }

    return instance;
  }
}


/**
 * Global ChartManager instance.
 * @type {ChartManager|undefined}
 */
let instance;


export default ChartManager;
