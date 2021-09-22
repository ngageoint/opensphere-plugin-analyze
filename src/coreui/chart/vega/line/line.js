goog.declareModuleId('coreui.chart.vega.line.Line');

import {AbstractChart} from '../base/abstractchart.js';
import {ChartType} from '../charttype.js';
import {SourceModel} from '../data/sourcemodel.js';
import {BoxSelect} from '../interaction/boxselect.js';
import {ClickContext} from '../interaction/clickcontext.js';
import {ClickContextEventType} from '../interaction/clickcontexteventtype.js';
import {ClickSelect} from '../interaction/clickselect.js';
import {Hover} from '../interaction/hover.js';
import {LineSpecHandler} from './linespec.js';

const {Model} = goog.requireType('coreui.chart.vega.data.Model');


/**
 * Vega implementation of a line chart. The line chart is a quantitative scale that preserves proportional differences.
 * It is a direct representation of the range values (y) over the domain values (x). A common example might be the
 * range values of counts of something (y) over a time domain (x) represented directly on the chart.
 */
export class Line extends AbstractChart {
  /**
   * Constructor.
   * @param {string} id The chart ID.
   * @param {angular.JQLite} container The container element.
   * @param {Model} model The data model.
   */
  constructor(id, container, model) {
    super(id, container, model);
    /**
     * @type {LineSpecHandler}
     */
    this.specHandler = new LineSpecHandler();

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
      this.specHandler = new LineSpecHandler(opt_spec);
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
      const hover = new Hover(this.model, ChartType.LINE);
      this.interactions[hover.id] = hover;
      const click = new ClickSelect(this.model, ChartType.LINE);
      this.interactions[click.id] = click;
      const context = new ClickContext(this.model, ChartType.LINE);
      this.interactions[context.id] = context;
      const box = new BoxSelect(this.model, ChartType.LINE);
      this.interactions[box.id] = box;
    }

    super.createInteractions();
  }

  /**
   * @inheritDoc
   */
  setupMenuActions() {
    super.setupMenuActions();

    // this chart doesn't support reset view
    this.menuActions[ClickContextEventType.RESET_VIEW] = false;
    this.menuActions[BoxSelect.EventType.RESET_VIEW] = false;
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

      const key0 = this.model.seriesKeys[0];
      const series0 = this.model.series[key0];

      const sortedDomain = series0.getResults().map((item) => item['label']);
      this.updateSpecSignal('xDomain', sortedDomain);
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
    return 1250;
  }
}
