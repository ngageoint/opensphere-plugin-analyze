goog.declareModuleId('coreui.chart.vega.symlog.Symlog');

import {AbstractChart} from '../base/abstractchart.js';
import {ChartType} from '../charttype.js';
import {SourceModel} from '../data/sourcemodel.js';
import {BoxSelect} from '../interaction/boxselect.js';
import {ClickSelect} from '../interaction/clickselect.js';
import {Hover} from '../interaction/hover.js';
import {SymlogSpecHandler} from './symlogspec.js';

const {Model} = goog.requireType('coreui.chart.vega.data.Model');


/**
 * Vega implementation of a symlog chart. The symlog chart is a quantitative scale that has a logarithmic transform
 * applied to the input domain value before the output range is computed. This type of chart is useful to plot data
 * that varies over multiple orders of magnitude and can include zero-valued data. This is useful for situations where
 * the chart needs to provide more visibility for data closer to the value of zero when there is also data considerably
 * farther away from the value of zero (hundreds, thousands, tens of thousands, etc)
 */
export class Symlog extends AbstractChart {
  /**
   * Constructor.
   * @param {string} id The chart ID.
   * @param {angular.JQLite} container The container element.
   * @param {Model} model The data model.
   */
  constructor(id, container, model) {
    super(id, container, model);
    /**
     * @type {SymlogSpecHandler}
     */
    this.specHandler = new SymlogSpecHandler();

    this.init();
  }

  /**
   * @inheritDoc
   */
  disposeInternal() {
    super.disposeInternal();

    this.disposeInteractions();
    this.specHandler = null;
  }

  /**
   * @inheritDoc
   */
  init(opt_spec) {
    super.init(opt_spec);

    if (opt_spec) {
      this.specHandler = new SymlogSpecHandler(opt_spec);
    }
    this.spec = this.specHandler.getSpec();

    this.setSignals();
  }

  /**
   * @inheritDoc
   */
  createInteractions() {
    if (this.spec) {
      this.disposeInteractions();

      // add the following interactions
      const hover = new Hover(this.model, ChartType.SYMLOG);
      this.interactions[hover.id] = hover;
      const click = new ClickSelect(this.model, ChartType.SYMLOG);
      this.interactions[click.id] = click;
      const box = new BoxSelect(this.model, ChartType.SYMLOG);
      this.interactions[box.id] = box;
    }

    super.createInteractions();
  }

  /**
   * @inheritDoc
   */
  updateData() {
    super.updateData();

    if (this.view != null) {
      const totalCount = this.model.getTotalCount();

      // set the new total count, used as part of the tooltip display
      this.updateSpecSignal('totalCount', totalCount);
    }
  }

  /**
   * Add variables to the spec before the view is created
   * @protected
   */
  setSignals() {
    let title = '';
    if (this.model instanceof SourceModel && this.model.source) {
      title = this.model.source.getTitle() || this.model.source.getId();
    }

    this.updateSpecSignal('dataSource', title);
  }

  /**
   * @inheritDoc
   */
  updateScale(xy, type) {
    this.recreateView = true;
  }

  /**
   * @inheritDoc
   */
  getMaxBinCount() {
    // min: 744 -- allow for all of the hours in a month
    return 1500;
  }
}
