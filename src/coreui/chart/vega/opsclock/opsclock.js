goog.declareModuleId('coreui.chart.vega.opsclock.Opsclock');

import {default as ChartType} from '../charttype.js';
import {default as Utils} from '../utils.js';
import {default as AbstractChart} from '../base/abstractchart.js';
import {default as SourceModel} from '../data/sourcemodel.js';
import {default as ClickContext} from '../interaction/clickcontext.js';
import {default as ClickContextEventType} from '../interaction/clickcontexteventtype.js';
import {default as ClickSelect} from '../interaction/clickselect.js';
import {default as DragSelect} from '../interaction/dragselect.js';
import {default as Hover} from '../interaction/hover.js';
import {default as OpsclockSpecHandler} from './opsclockspec.js';
const olObj = goog.require('ol.obj');
const DateBinMethod = goog.require('os.histo.DateBinMethod');
const DateBinType = goog.require('os.histo.DateBinType');
const UniqueBinMethod = goog.require('os.histo.UniqueBinMethod');

const {default: Model} = goog.requireType('coreui.chart.vega.data.Model');
const ColorBin = goog.requireType('os.data.histo.ColorBin');


/**
 */
class Opsclock extends AbstractChart {
  /**
   * Constructor.
   * @param {string} id
   * @param {angular.JQLite} container
   * @param {Model} model the data model
   */
  constructor(id, container, model) {
    super(id, container, model);
    /**
     * @type {OpsclockSpecHandler}
     */
    this.specHandler = new OpsclockSpecHandler();

    /**
     * @type {Array<ColorBin>}
     */
    this.data = [];

    this.init();
  }

  /**
   * @inheritDoc
   */
  disposeInternal() {
    super.disposeInternal();

    this.disposeInteractions();
    this.specHandler = null;
    this.data = null;
  }

  /**
   * @inheritDoc
   */
  init(opt_spec) {
    super.init(opt_spec);
    if (opt_spec) {
      this.specHandler = new OpsclockSpecHandler(opt_spec);
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
      const click = new ClickSelect(this.model, ChartType.OPSCLOCK);
      this.interactions[click.id] = click;
      const context = new ClickContext(this.model, ChartType.OPSCLOCK);
      this.interactions[context.id] = context;
      const hover = new Hover(this.model, ChartType.OPSCLOCK);
      this.interactions[hover.id] = hover;
      const drag = new DragSelect(this.model, ChartType.OPSCLOCK);
      this.interactions[drag.id] = drag;

      // set the function that will calculate which bins to highlight or select
      drag.setCalcFunction(this.calcFunction.bind(this));
    }

    // super call
    super.createInteractions();
  }

  /**
   * @inheritDoc
   */
  setupMenuActions() {
    super.setupMenuActions();

    // this chart doesn't support sorting
    this.menuActions[ClickContextEventType.SORT_BY_LABEL] = false;
    this.menuActions[ClickContextEventType.SORT_BY_COUNT] = false;
  }

  /**
   * The function for calculating which bins lie between two given bins
   * @param {ColorBin} a
   * @param {ColorBin} b
   * @return {Array<ColorBin>}
   */
  calcFunction(a, b) {
    let arr = [];
    if (this.model) {
      const bins = this.model.getBins();

      const dayArr = [Math.floor(a.key / 24), Math.floor(b.key / 24)].sort(function(i, j) {
        return i - j;
      });
      const hourArr = [(a.key % 24), (b.key % 24)];

      // calculate which other bins are between the start and end bins for the drag selection
      arr = bins.filter(function(v) {
        const hr = (v.key % 24);
        const hrmatch = hourArr[0] <= hourArr[1] ?
            (hourArr[0] <= hr && hr <= hourArr[1]) : (hourArr[0] <= hr || hr <= hourArr[1]);
        if (!hrmatch) {
          return false;
        }
        const dy = Math.floor(v.key / 24);
        return dayArr[0] <= dy && dy <= dayArr[1];
      });
    }
    return arr;
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
   * Update the data on the view
   * @inheritDoc
   */
  updateData() {
    if (this.view != null && !olObj.isEmpty(this.model.series)) {
      this.data = this.model.getBins().sort(function(a, b) {
        return a['key'] - b['key'];
      });

      // get bins for labeling hours
      const hours = this.data.filter(function(v, i, a) {
        return this.data[this.data.length - 1]['key'] - 24 < v['key'];
      }.bind(this));

      const oldData = this.view.data('data');
      const oldDays = this.view.data('days');
      const oldHours = this.view.data('hours');
      const newData = this.data.slice();

      let meth = this.model.series[this.model.seriesKeys[0]].getBinMethod();
      if (meth.getBinType() == DateBinMethod.TYPE) {
        meth = /** @type {DateBinMethod} */ (meth);

        // find out how many wedges we need to fit
        var skipDays = false;
        var wedges = 0;
        const type = meth.getDateBinType();
        switch (type) {
          case DateBinType.HOUR_OF_DAY:
            this.updateSpecSignal('dateType', 'day');
            skipDays = true;
            wedges = 5;
            break;
          case DateBinType.HOUR_OF_WEEK:
            this.updateSpecSignal('dateType', 'week');
            wedges = 17;
            break;
          case DateBinType.HOUR_OF_MONTH:
            this.updateSpecSignal('dateType', 'month');
            wedges = 65;
            break;
          default:
            break;
        }

        this.view.signal('rings', wedges);
      }

      const daysArr = skipDays ? [] :
        [this.data[0], this.data[Math.floor(this.data.length / 2)], this.data[this.data.length - 1]];
      this.view.change('days', vega.changeset().insert(daysArr).remove(oldDays));
      this.view.change('hours', vega.changeset().insert(hours).remove(oldHours));
      this.view.change('data', vega.changeset().insert(newData).remove(oldData));
    }
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
  runChart() {
    if (this.view) {
      // this will define the middle of the gradient
      this.view.signal('domMid', Math.floor(this.view.signal('countExtent')[1] / 2.5));
    }
    super.runChart();
  }

  /**
   * @inheritDoc
   */
  modifyMethod(method) {
    super.modifyMethod(method);
    if (method instanceof UniqueBinMethod) {
      if (method instanceof DateBinMethod) {
        Utils.getOpsClockMethod(method); // apply opsclock's restrictions
      }
    }
  }
}


export default Opsclock;
