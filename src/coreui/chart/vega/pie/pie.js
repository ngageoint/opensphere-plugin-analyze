goog.declareModuleId('coreui.chart.vega.pie.Pie');

import {ChartType} from '../charttype.js';
import {AbstractChart} from '../base/abstractchart.js';
import {SourceModel} from '../data/sourcemodel.js';
import {BoxSelect} from '../interaction/boxselect.js';
import {ClickContext} from '../interaction/clickcontext.js';
import {ClickContextEventType} from '../interaction/clickcontexteventtype.js';
import {ClickSelect} from '../interaction/clickselect.js';
import {Hover} from '../interaction/hover.js';
import {PieSpecHandler} from './piespec.js';

const {Model} = goog.requireType('coreui.chart.vega.data.Model');


/**
 * Vega implementation of a pie chart.
 */
export class Pie extends AbstractChart {
  /**
   * Constructor.
   * @param {string} id The chart ID.
   * @param {angular.JQLite} container The container element.
   * @param {Model} model The data model.
   */
  constructor(id, container, model) {
    super(id, container, model);
    /**
     * @type {PieSpecHandler}
     */
    this.specHandler = new PieSpecHandler();

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
      this.specHandler = new PieSpecHandler(opt_spec);
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
      const hover = new Hover(this.model, ChartType.PIE);
      this.interactions[hover.id] = hover;
      const click = new ClickSelect(this.model, ChartType.PIE);
      this.interactions[click.id] = click;
      const context = new ClickContext(this.model, ChartType.PIE);
      this.interactions[context.id] = context;
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
    if (this.view != null && this.model && this.model instanceof SourceModel) {
      const oldData = this.view.data('piedata');
      const newData = this.model.getBins();
      this.view.change('piedata', vega.changeset().insert(newData).remove(oldData));

      // add in multi color
      const oldColors = this.view.data('pieColors');
      const newColors = this.model.getColorFolds('label');
      this.view.change('pieColors', vega.changeset().insert(newColors).remove(oldColors));

      if (newColors.length) {
        this.updateSpecSignal('pieColorsActive', true);
      } else {
        this.updateSpecSignal('pieColorsActive', false);
      }

      // set the new total count, used as part of the tooltip display
      const totalCount = this.model.getTotalCount();
      this.updateSpecSignal('totalCount', totalCount);
    }
  }

  /**
   * Add variables to the spec before the view is created
   * @protected
   */
  setSignals() {
    const title = this.model instanceof SourceModel && this.model.source && this.model.source.getTitle() ?
      this.model.source.getTitle() : this.model.source.getId() ||
      '';

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
  process(options) {
    // do nothing; no spec settings that can't be handled by signals
  }

  /**
   * @inheritDoc
   */
  getMaxBinCount() {
    return 60;
  }
}
