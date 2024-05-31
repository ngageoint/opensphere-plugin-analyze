goog.declareModuleId('coreui.chart.vega.bar.Bar');

import osActionEventType from 'opensphere/src/os/action/eventtype.js';
import {AbstractChart} from '../base/abstractchart.js';
import {ChartType} from '../charttype.js';
import {SourceModel} from '../data/sourcemodel.js';
import {BoxSelect} from '../interaction/boxselect.js';
import {ClickContext} from '../interaction/clickcontext.js';
import {ClickContextEventType} from '../interaction/clickcontexteventtype.js';
import {ClickSelect} from '../interaction/clickselect.js';
import {Hover} from '../interaction/hover.js';
import {BarSpecHandler} from './barspec.js';

const {Model} = goog.requireType('coreui.chart.vega.data.Model');


/**
 * Vega implementation of a bar chart.
 */
export class Bar extends AbstractChart {
  /**
   * Constructor.
   * @param {string} id The chart ID.
   * @param {angular.JQLite} container The container element.
   * @param {Model} model The data model.
   */
  constructor(id, container, model) {
    super(id, container, model);
    /**
     * @type {BarSpecHandler}
     */
    this.specHandler = new BarSpecHandler();

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
      this.specHandler = new BarSpecHandler(opt_spec);
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
      const hover = new Hover(this.model, ChartType.BAR);
      this.interactions[hover.id] = hover;
      const click = new ClickSelect(this.model, ChartType.BAR);
      this.interactions[click.id] = click;
      const context = new ClickContext(this.model, ChartType.BAR);
      this.interactions[context.id] = context;
      const box = new BoxSelect(this.model, ChartType.BAR);
      this.interactions[box.id] = box;
    }

    super.createInteractions();
  }

  /**
   * @inheritDoc
   */
  setupMenuActions() {
    super.setupMenuActions();

    // this chart coloring by selected bin
    this.menuActions[osActionEventType.COLOR_SELECTED] = true;

    // this chart doesn't support reset view
    this.menuActions[ClickContextEventType.RESET_VIEW] = false;
    this.menuActions[BoxSelect.EventType.RESET_VIEW] = false;
  }

  /**
   * @inheritDoc
   */
  updateData() {
    super.updateData();

    if (this.view != null && this.model instanceof SourceModel) {
      const totalCount = this.model.getTotalCount();

      // set the new total count, used as part of the tooltip display
      this.updateSpecSignal('totalCount', totalCount);

      const key0 = this.model.seriesKeys[0];
      const bin0 = this.model.bins[key0];

      if (bin0) {
        const sortedDomain = bin0.map((item) => item['label']);
        this.updateSpecSignal('xDomain', sortedDomain);
      }

      // add in multi color bars
      const oldData = this.view.data('barColors');
      const newData = this.model.getColorFolds('label');
      this.view.change('barColors', vega.changeset().insert(newData).remove(oldData));

      if (newData.length) {
        this.updateSpecSignal('barColorsActive', true);
      } else {
        this.updateSpecSignal('barColorsActive', false);
      }
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
  getMaxBinCount() {
    // min: 744 -- allow for all of the hours in a month
    return 1250;
  }
}
