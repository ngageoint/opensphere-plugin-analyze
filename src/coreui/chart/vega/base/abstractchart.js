goog.declareModuleId('coreui.chart.vega.base.AbstractChart');

import {Utils} from '../utils.js';
import {ChartType} from '../charttype.js';
import {Charts} from './charts.js';
import {ConfigHandler} from './confighandler.js';
import {VegaEvent} from './event.js';
import {EventType} from './eventtype.js';
import * as stats from './vegachartstats.js';
import {SourceModel} from '../data/sourcemodel';
import {BoxSelect} from '../interaction/boxselect';
import {ClickContextEventType} from '../interaction/clickcontexteventtype';
import {DragSelect} from '../interaction/dragselect';

import * as dispatcher from 'opensphere/src/os/dispatcher.js';

const Debouncer = goog.require('goog.async.Debouncer');
const EventTarget = goog.require('goog.events.EventTarget');
const log = goog.require('goog.log');
const AlertEventSeverity = goog.require('os.alert.AlertEventSeverity');
const AlertManager = goog.require('os.alert.AlertManager');
const DateBinMethod = goog.require('os.histo.DateBinMethod');
const NumericBinMethod = goog.require('os.histo.NumericBinMethod');
const UniqueBinMethod = goog.require('os.histo.UniqueBinMethod');
const osObject = goog.require('os.object');

const {SpecHandler} = goog.requireType('coreui.chart.vega.base.SpecHandler');
const {Model} = goog.requireType('coreui.chart.vega.data.Model');
const {AbstractInteraction} = goog.requireType('coreui.chart.vega.interaction.AbstractInteraction');
const Logger = goog.requireType('goog.log.Logger');
const IBinMethod = goog.requireType('os.histo.IBinMethod');


/**
 * An abstract implementation of a Vega chart. This class connects our XF-based model classes with the Vega view.
 * @abstract
 */
export class AbstractChart extends EventTarget {
  /**
   * Constructor.
   * @param {string} id the chart id
   * @param {!angular.JQLite} element The chart container
   * @param {Model} model The data model
   */
  constructor(id, element, model) {
    super();
    /**
     * Links the chart to the view via events associated with this id
     * @type {string}
     */
    this.id = id;

    /**
     * The model to hold data
     * @type {Model}
     */
    this.model = model;

    /**
     * @type {angular.JQLite}
     * @protected
     */
    this.containerEl = element;

    /**
     * @type {angular.JQLite}
     * @protected
     */
    this.chartEl = this.containerEl.find('.js-vega__view');
    this.chartEl.attr('id', 'chart_' + this.id);

    /**
     * @type {angular.JQLite}
     * @protected
     */
    this.canvasEl = this.chartEl.find('canvas');

    /**
     * The allowed menu actions for this source
     * @type {Object<string, boolean>}
     */
    this.menuActions = {};
    this.setupMenuActions();

    /**
     * The primary config for charts
     * @type {ConfigHandler}
     * @protected
     */
    this.configHandler = null;

    /**
     * The primary config for charts
     * @type {Object}
     * @protected
     */
    this.config = null;

    /**
     * The spec used to create the view
     * @type {SpecHandler}
     */
    this.specHandler = null;

    /**
     * The spec used to create the view
     * @type {Object}
     */
    this.spec = null;

    /**
     * The view that controls the chart
     * @type {vega.View}
     */
    this.view = null;

    /**
     * True if a change necessitates a new view
     * @type {boolean}
     * @protected
     */
    this.recreateView = false;

    /**
     * True if the data changed and the ng scope might need to be updated
     * @type {boolean}
     * @protected
     */
    this.triggerUpdate = true;

    /**
     * @type {goog.log.Logger}
     * @protected
     */
    this.log = LOGGER;

    /**
     * @type {Object<string, AbstractInteraction>}
     * @protected
     */
    this.interactions = {};

    /**
     * Bar type is default
     * @type {ChartType}
     */
    this.type = ChartType.BAR;

    /**
     * Debounce to batch changes (e.g. panning changes to multiple axes)
     * @type {Debouncer}
     */
    this.runChartDebounce = new Debouncer(this.runChart, 25, this);

    this.model.listen(EventType.MODELCHANGE, this.onModelChange, false, this);
    this.model.listen(ClickContextEventType.COPY, this.copyChart, false, this);
    this.model.listen(ClickContextEventType.EXPORT, this.exportChart, false, this);
  }

  /**
   * @inheritDoc
   */
  disposeInternal() {
    super.disposeInternal();
    if (this.view) {
      this.view.finalize();
    }

    this.disposeInteractions();

    dispatcher.getInstance().unlisten(EventType.MODELCHANGE, this.onModelChange, false, this);

    this.view = null;
    this.specHandler = null;
    this.spec = null;
    this.configHandler = null;
    this.config = null;

    Charts.getInstance().removeChart(this.id);
  }

  /**
   * Set up the vega config
   * @param {Object=} opt_spec
   * @protected
   */
  init(opt_spec) {
    this.configHandler = new ConfigHandler();
    this.config = this.configHandler.getConfig();

    // make sure vega can access the chart id for deconfliction
    this.updateSpecSignal('id', this.id);
    this.updateSpecSignal('maxCount', 1000000);
    this.createView();
  }

  /**
   * Initialize the interactions for the extending chart
   * Called after subclass function
   * @protected
   */
  createInteractions() {
    for (const id in this.interactions) {
      const interaction = this.interactions[id];
      for (const key in interaction.spec) {
        Utils.updateSpec(this.spec, key, interaction.spec[key], interaction.spec[key]);
      }
    }
  }

  /**
   * Attach the interactions to the view after view creation
   * @protected
   */
  attachInteractions() {
    for (const id in this.interactions) {
      this.interactions[id].addListener(this.view);
    }
  }

  /**
   * Dispose of the interactions for the extending chart
   * The id of the interaction is unique so any chart item in the spec with that id will be removed
   * @protected
   */
  disposeInteractions() {
    for (const id in this.interactions) {
      for (const key in this.spec) {
        let i = this.spec[key].length;
        while (i--) {
          if (this.spec[key][i] && this.spec[key][i]['name'] && this.spec[key][i]['name'].indexOf(id) > -1) {
            if (key == 'signals' && this.view) {
              this.view.signal(this.spec[key][i]['name'], null);
            }
            this.spec[key][i] = null;
            this.spec[key].splice(i, 1);
          }
        }
      }
      this.interactions[id].dispose();
    }
    this.interactions = {};
  }

  /**
   * Setup up the allowed menu actions for this chart type. Default to supporting all and have individual chart
   * implementations disable the ones they don't support.
   */
  setupMenuActions() {
    const actions = Object.values(BoxSelect.EventType);
    Array.prototype.push.apply(actions, Object.values(ClickContextEventType));
    Array.prototype.push.apply(actions, Object.values(DragSelect.EventType));

    for (let i = 0; i < actions.length; i++) {
      if (this.menuActions[actions[i]] !== false) {
        this.menuActions[actions[i]] = true;
      }
    }

    if (this.model) {
      const modelMenuActions = this.model.getMenuActions();
      osObject.merge(modelMenuActions, this.menuActions);
    }
  }

  /**
   * Check whether the chart supports a given menu event type.
   * @param {string} eventType The event type to check.
   * @return {boolean} Whether the event type is supported.
   */
  supportsAction(eventType) {
    return this.menuActions[eventType];
  }

  /**
   * The model changed, redo whatever needs to be changed and rerender the chart
   * @param {VegaEvent} event
   * @protected
   */
  onModelChange(event) {
    if (!this.isDisposed() && event != null && event.getId() == this.id) {
      if (this.model) {
        const changes = event.getConfig();

        if (changes.series) {
          let xType = '';
          let yType = '';
          const series = this.model.series;
          const keys = this.model.seriesKeys;

          // check for numeric bins
          if (keys[0] && series[keys[0]] && series[keys[0]].getBinMethod()) {
            xType = series[keys[0]].getBinMethod().getBinType();
            // check to see if the numeric bin is actually a time
            if (xType == NumericBinMethod.TYPE && series[keys[0]].getBinMethod().getIsDate()) {
              xType = DateBinMethod.TYPE;
            }
          }

          // if the chart is multi dimensional, get the correct bin type for the second axis
          if (keys[1] && series[keys[0]] && series[keys[0]].getSecondaryBinMethod()) {
            yType = series[keys[0]].getSecondaryBinMethod().getBinType();
            if (yType == NumericBinMethod.TYPE && series[keys[0]].getSecondaryBinMethod().getIsDate()) {
              yType = DateBinMethod.TYPE;
            }
          } else if (keys[1] && series[keys[1]] && series[keys[1]].getBinMethod()) {
            yType = series[keys[1]].getBinMethod().getBinType();
            if (yType == NumericBinMethod.TYPE && series[keys[1]].getBinMethod().getIsDate()) {
              yType = DateBinMethod.TYPE;
            }
          }

          this.updateScale('x', xType);
          this.updateScale('y', yType);
        }
        if (changes.extent || changes.series) {
          this.updateSignals();
        }
        if (changes.series) {
          stats.updateStatMarks(this.model, this.spec);
          this.createView();
        }
        if (changes.data) {
          this.updateData();
          this.triggerUpdate = true;
        }
        if (changes.data || changes.series) {
          stats.updateStatSignals(this.model, this.view);
        }
        this.runChartDebounce.fire();
      }
    }
  }

  /**
   * Update the chart variables (i.e. field and extent)
   */
  updateSignals() {
    const key0 = this.model.seriesKeys[0];
    const key1 = this.model.seriesKeys[1];
    const series0 = this.model.series[key0];
    const series1 = this.model.series[key1];

    if (this.model instanceof SourceModel && this.model.source) {
      this.updateSpecSignal('defaultColor', this.model.source.getColor());
    } else {
      this.updateSpecSignal('defaultColor', '#aaa');
    }

    this.updateSpecSignal('xField', series0 ? series0.getName() : undefined);
    this.updateSpecSignal('xExtent', this.model.currentDomain[key0]);

    this.updateSpecSignal('yField', series1 ? series1.getName() : undefined);
    this.updateSpecSignal('yExtent', this.model.currentDomain[key1]);

    if (this.view) {
      const x = this.view.scale('xScale');
      this.updateSpecSignal('xStep', x && x.step ? x.step() : 0);

      const y = this.view.scale('yScale');
      this.updateSpecSignal('yStep', y && y.step ? y.step() : 0);
    } else {
      this.updateSpecSignal('xStep', 0);
      this.updateSpecSignal('yStep', 0);
    }

    // initialize signals for statistics
    stats.initStatSignals(this.model, this.spec);
  }

  /**
   * Update the data on the chart
   */
  updateData() {
    if (this.view != null) {
      // get the data
      const oldData = this.view.getState().data['data'];
      const newData = this.model.getBins();

      // explicitly replace the old data with the new data
      this.view.change('data', vega.changeset().insert(newData).remove(oldData));
      this.updateSpecSignal('totalCount', this.model.getTotalCount());

      // add in multi color
      if (this.model instanceof SourceModel && this.model.colorsArr && this.model.colorsArr.length) {
        this.updateSpecSignal('colorsArray', this.model.colorsArr);
      } else {
        this.updateSpecSignal('colorsArray', []);
      }
    }
  }

  /**
   * Fix the scales and axes for the new data type
   * @param {string} xy the scale and axis to modify 'x' or 'y'
   * @param {?string} type the data column type
   */
  updateScale(xy, type) {}

  /**
   * When the chart changes size due to layout change or something else trigger internal updates to chart
   */
  resizeChart() {
    if (!this.isDisposed() && this.view) {
      let i = this.view.signal('resizeChart');
      i = ++i || 1;
      this.updateSpecSignal('resizeChart', i);
      this.runChartDebounce.fire();
    }
  }

  /**
   * @protected
   */
  createView() {
    if (!this.isDisposed()) {
      if (this.view) {
        this.view.finalize();
        this.view = null;
      }
      if (this.spec && this.config && this.model && (this.model.getBinCount() >= 0 || this.model.windowActive)) {
        this.createInteractions();
        this.view = new vega.View(vega.parse(this.spec, this.config))
            .logLevel(vega.Error)
            .renderer('canvas')
            .hover()
            .resize()
            .initialize('#chart_' + this.id);

        // run the view, use the returned promise to rerun the view to fill the flex container and set up the interactions
        this.view.runAsync()
            .then(function() {
              if (this.view) {
                this.attachInteractions();
                this.resizeChart();
              }
            }.bind(this));
        this.recreateView = false;
      }
    }
  }

  /**
   * Run the updates to the view
   */
  runChart() {
    if (!this.isDisposed()) {
      if (this.recreateView || !this.view) {
        // either a major update (scale/axis change) or something went wrong, start over
        this.createView();
        return;
      }

      if (this.view && this.containerEl) {
        this.view.height(Math.ceil(.95 * Math.max(30, Math.min(this.containerEl.height(), window.innerHeight))));
        this.view.width(Math.ceil(.95 * Math.max(30, Math.min(this.containerEl.width(), window.innerWidth))));
        this.view.resize().runAsync();

        if (this.triggerUpdate) {
          this.triggerUpdate = false;
          const event = new VegaEvent(EventType.UPDATESCOPE, this.id);
          dispatcher.getInstance().dispatchEvent(event);
        }
      }
    }
  }

  /**
   * Convenience update the spec and signal within the chart
   * @param {string} name
   * @param {*} value
   * @param {Array<Object<string, string>>=} opt_on
   */
  updateSpecSignal(name, value, opt_on) {
    const signal = {'name': name, 'value': value};
    if (Array.isArray(opt_on) && opt_on.length) {
      signal['on'] = opt_on;
      this.recreateView = true;
    }
    Utils.updateSpec(this.spec, 'signals', name, signal);
    if (this.view) {
      this.view.signal(name, value);
    }
  }

  /**
   * Convenience remove and signal from spec and the chart
   * @param {string} name
   */
  removeSpecSignal(name) {
    Utils.updateSpec(this.spec, 'signals', name);
    if (this.view) {
      this.view.signal(name, null);
    }
  }

  /**
   * Export the current chart to png
   */
  exportChart() {
    if (this.view) {
      // change the chart background so the image isn't transparent then export as png
      this.view.background(/** @type {string} */ ($('body').css('backgroundColor')) || 'white');
      this.view.toImageURL('png').then(function(url) {
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('target', '_blank');
        link.setAttribute('download', 'FADE_chart_' + new Date().toISOString().replace(/[.:-]/g, '').slice(0, 13));
        link.dispatchEvent(new MouseEvent('click'));
        this.view.background('rgba(0, 0, 0, 0)');
        this.runChart();
      }.bind(this)).catch(function(error) {
        const msg = 'There was a problem exporting the chart!';
        AlertManager.getInstance().sendAlert(msg, AlertEventSeverity.ERROR);
        this.view.background('rgba(0, 0, 0, 0)');
        this.runChart();
      }.bind(this));
    }
  }

  /**
   * Copy the current chart as png
   * TODO
   * Does not work. Might need to check for and use the clipboard API instead
   */
  copyChart() {
    if (this.view) {
      // change the chart background so the image isn't transparent then copy it as png
      this.view.background(/** @type {string} */ ($('body').css('backgroundColor')) || 'white');
      this.view.toImageURL('png').then(function(url) {
        const selector = 'vegaChartSelectionDiv';
        const img = document.createElement('img');
        const div = document.createElement('div');
        img.src = url;
        div.contentEditable = true;
        div.classList.add(selector);
        div.appendChild(img);
        document.body.appendChild(div);
        if (document.body.createTextRange) {
          const range = document.body.createTextRange();
          range.moveToElementText(img);
          range.select();
        } else if (window.getSelection) {
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(img);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        document.execCommand('copy');
        document.body.removeChild(div);
        this.view.background('rgba(0, 0, 0, 0)');
        this.runChart();
      }.bind(this)).catch(function(error) {
        const msg = 'There was a problem exporting the chart!';
        AlertManager.getInstance().sendAlert(msg, AlertEventSeverity.ERROR);
        this.view.background('rgba(0, 0, 0, 0)');
        this.runChart();
      }.bind(this));
    }
  }

  /**
   * Apply changes to parts of the spec that can't handle signals
   * @param {!bitsx.vega.Options} options
   */
  process(options) {
    const spec = this.spec;
    const isChartRotated = (options.signals['isChartRotated'] === true);

    // manually change the part(s) of the spec that can't handle signals
    spec['axes'][0]['orient'] = (isChartRotated ? 'left' : 'bottom');
    spec['axes'][1]['orient'] = (isChartRotated ? 'bottom' : 'left');
  }

  /**
   * Get the maximum number of bins supported by the chart.
   * @return {number} The maximum number of bins the chart supports.
   */
  getMaxBinCount() {
    return Infinity;
  }

  /**
   * Adjusts the settings of a method to be appropriate to the type of chart
   * @param {IBinMethod} method
   */
  modifyMethod(method) {
    if (method instanceof UniqueBinMethod) {
      // apply the chart's limitations to the bins
      method.setMaxBins(this.getMaxBinCount());
    }
  }
}

/**
 * Logger for vega.base.AbstractChart
 * @type {Logger}
 */
const LOGGER = log.getLogger('coreui.chart.vega.base.AbstractChart');
