goog.declareModuleId('coreui.chart.vega.scatter.Scatter');

import {default as Utils, NUMERIC_EMPTY_ID} from '../utils.js';
import {default as ChartType} from '../charttype.js';
import {default as AbstractChart} from '../base/abstractchart.js';
import {default as BoxSelect} from '../interaction/boxselect.js';
import {default as ClickContext} from '../interaction/clickcontext.js';
import {default as ClickContextEventType} from '../interaction/clickcontexteventtype.js';
import {default as ClickSelect} from '../interaction/clickselect.js';
import {default as DragPan} from '../interaction/dragpan.js';
import {default as Hover} from '../interaction/hover.js';
import {default as ScrollZoom} from '../interaction/scrollzoom.js';
import {default as WindowBrush} from '../interaction/windowbrush.js';
import {default as ScatterSpecHandler} from './scatterspec.js';
const DateBinMethod = goog.require('os.histo.DateBinMethod');
const NumericBinMethod = goog.require('os.histo.NumericBinMethod');

const {default: Model} = goog.requireType('coreui.chart.vega.data.Model');


/**
 */
class Scatter extends AbstractChart {
  /**
   * Constructor.
   * @param {string} id
   * @param {angular.JQLite} container
   * @param {Model} model the data model
   */
  constructor(id, container, model) {
    super(id, container, model);
    /**
     * @type {ScatterSpecHandler}
     */
    this.specHandler = new ScatterSpecHandler();

    /**
     * @type {number}
     */
    this.gutter = 20;

    this.dataSets = {
      'valid': [],
      'lowXlowY': [],
      'lowX': [],
      'lowXhighY': [],
      'highY': [],
      'highXhighY': [],
      'highX': [],
      'highXlowY': [],
      'lowY': []
    };

    this.init();
  }

  /**
   * @inheritDoc
   */
  disposeInternal() {
    super.disposeInternal();

    this.disposeInteractions();
    this.specHandler = null;
    this.dataSets = null;
  }

  /**
   * @inheritDoc
   */
  init(opt_spec) {
    super.init(opt_spec);
    if (opt_spec) {
      this.specHandler = new ScatterSpecHandler(opt_spec);
    }
    this.spec = this.specHandler.getSpec();

    this.setData();
    this.setSignals();
  }

  /**
   * @inheritDoc
   */
  createInteractions() {
    if (this.spec) {
      this.disposeInteractions();

      // add the following interactions
      const hover = new Hover(this.model, ChartType.SCATTER);
      this.interactions[hover.id] = hover;
      const click = new ClickSelect(this.model, ChartType.SCATTER);
      this.interactions[click.id] = click;
      const context = new ClickContext(this.model, ChartType.SCATTER);
      this.interactions[context.id] = context;
      const box = new BoxSelect(this.model, ChartType.SCATTER);
      this.interactions[box.id] = box;
      const scroll = new ScrollZoom(this.model, ChartType.SCATTER);
      this.interactions[scroll.id] = scroll;
      const drag = new DragPan(this.model, ChartType.SCATTER);
      this.interactions[drag.id] = drag;
      const window = new WindowBrush(this.model);
      this.interactions[window.id] = window;
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
   * Add the data sets to the spec before the view is created
   * @protected
   */
  setData() {
    for (const setName in this.dataSets) {
      const dataSet = {'name': setName, 'values': []};
      Utils.updateSpec(this.spec, 'data', setName, dataSet);
    }
  }

  /**
   * Add variables to the spec before the view is created
   * @protected
   */
  setSignals() {
    this.updateSpecSignal('gutter', this.gutter);
  }

  /**
   * Bin the data into the various gutters using crossfilter
   * Extra gutter bins are only used for numerical data
   */
  binData() {
    if (this.model) {
      const xCol = this.model.seriesKeys[0];
      const yCol = this.model.seriesKeys[1];

      if (xCol && yCol) {
        const xExtent = this.model.currentDomain[xCol];
        const yExtent = this.model.currentDomain[yCol];

        if (xExtent && yExtent) {
          // for each of the gutters and the valid plots, get the bins that will be in each
          const lowX = [[NUMERIC_EMPTY_ID + 1,
            xExtent[0]], [yExtent[0],
            yExtent[yExtent.length - 1]]];
          this.dataSets['lowX'] = this.model.getBinsBetweenMulti([xCol, yCol],
              lowX);

          const highX = [[xExtent[xExtent.length - 1],
            Infinity], [yExtent[0],
            yExtent[yExtent.length - 1]]];
          this.dataSets['highX'] = this.model.getBinsBetweenMulti([xCol, yCol],
              highX);

          const lowY = [[xExtent[0],
            xExtent[xExtent.length - 1]], [NUMERIC_EMPTY_ID + 1,
            yExtent[0]]];
          this.dataSets['lowY'] = this.model.getBinsBetweenMulti([xCol, yCol],
              lowY);

          const highY = [[xExtent[0],
            xExtent[xExtent.length - 1]],
          [yExtent[yExtent.length - 1],
            Infinity]];
          this.dataSets['highY'] = this.model.getBinsBetweenMulti([xCol, yCol],
              highY);

          const lowXlowY = [[NUMERIC_EMPTY_ID + 1,
            xExtent[0]], [NUMERIC_EMPTY_ID + 1,
            yExtent[0]]];
          this.dataSets['lowXlowY'] = this.model.getBinsBetweenMulti([xCol, yCol],
              lowXlowY);

          const lowXhighY = [[NUMERIC_EMPTY_ID + 1,
            xExtent[0]], [yExtent[yExtent.length - 1],
            Infinity]];
          this.dataSets['lowXhighY'] = this.model.getBinsBetweenMulti([xCol, yCol],
              lowXhighY);

          const highXlowY = [[xExtent[xExtent.length - 1],
            Infinity], [NUMERIC_EMPTY_ID + 1,
            yExtent[0]]];
          this.dataSets['highXlowY'] = this.model.getBinsBetweenMulti([xCol, yCol],
              highXlowY);

          const highXhighY = [[xExtent[xExtent.length - 1],
            Infinity], [yExtent[yExtent.length - 1],
            Infinity]];
          this.dataSets['highXhighY'] = this.model.getBinsBetweenMulti([xCol, yCol],
              highXhighY);

          const valid = [[xExtent[0],
            xExtent[xExtent.length - 1]], [yExtent[0],
            yExtent[yExtent.length - 1]]];
          this.dataSets['valid'] = this.model.getBinsBetweenMulti([xCol, yCol],
              valid);
        }
      }
    }
  }

  /**
   * Update the data on the view
   * @inheritDoc
   */
  updateData() {
    if (this.view != null) {
      super.updateData();
      this.binData();

      // remove all of the old data and add in the new data
      for (const setName in this.dataSets) {
        const oldData = this.view.data(setName);
        const data = this.dataSets[setName];

        this.view.change(setName, vega.changeset().insert(data).remove(oldData));
      }
    }
  }

  /**
   * @inheritDoc
   */
  updateScale(xy, type) {
    const scale = {
      'name': xy + 'Scale',
      'domain': {'signal': xy + 'Extent'}
    };
    scale['range'] = xy == 'x' ? {'signal': 'xRange'} : {'signal': 'yRange'};

    const axes = this.spec['axes'];
    const axis = axes && axes.find(function(a) {
      return a['name'] == xy + 'Axis';
    }) || {
      'name': xy + 'Axis',
      'scale': xy + 'Scale',
      'grid': true,
      'offset': 0,
      'title': {'signal': xy + 'Field'},
      'orient': xy == 'x' ? 'bottom' : 'left'
    };

    if (type == NumericBinMethod.TYPE) {
      scale['type'] = 'linear';
      scale['zero'] = false;
      axis['format'] = '~s';
    } else if (type == DateBinMethod.TYPE) {
      // never use 'nice' on scatterplots, panning will get super shaky as it forces an adjustment every update
      scale['type'] = 'utc';
      axis['format'] = '%Y-%m-%d %H:%M:%SZ';
      // time scales have a tendency to collapse so try to run the view now
      this.runChartDebounce.fire();
    } else {
      scale['type'] = 'point';
      delete axis['format'];
    }

    Utils.updateSpec(this.spec, 'scales', xy + 'Scale', scale);
    Utils.updateSpec(this.spec, 'axes', xy + 'Axis', axis);
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
    // numeric bins are supposed to be about 50x50, add some extra overhead for zooming in and out
    return 4000;
  }
}

/**
 * Number of records to show in gutter
 * Don't show them all to increase performance
 * Generally the items that will be shown in the gutter are the closest ones; if user pans in that direction
 * @type {number}
 * @protected
 * @const
 */
Scatter.GUTTER_NUM = 256;

export default Scatter;
