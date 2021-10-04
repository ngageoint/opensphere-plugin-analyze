goog.declareModuleId('coreui.chart.vega.data.Model');

import {binaryInsert} from 'opensphere/src/os/array/array.js';
import {getHslGradient} from 'opensphere/src/os/color.js';
import ColumnDefinition from 'opensphere/src/os/data/columndefinition.js';
import ColorBin from 'opensphere/src/os/data/histo/colorbin.js';
import DataModel from 'opensphere/src/os/data/xf/datamodel.js';
import {easeSinusoidal} from 'opensphere/src/os/easing/easing.js';
import DateBinMethod from 'opensphere/src/os/histo/datebinmethod.js';
import NumericBinMethod from 'opensphere/src/os/histo/numericbinmethod.js';
import UniqueBinMethod from 'opensphere/src/os/histo/uniquebinmethod.js';
import {getMaxFeatures} from 'opensphere/src/os/ogc/ogc.js';
import {randomString} from 'opensphere/src/os/string/string.js';
import Duration from 'opensphere/src/os/time/duration.js';
import * as time from 'opensphere/src/os/time/time.js';
import {getDataStats, getDefaultStats, getValueStats} from '../../chartstats.js';
import {VegaEvent} from '../base/event.js';
import {EventType} from '../base/eventtype.js';
import {ChartDispatcher} from '../chartdispatcher.js';
import {Utils} from '../utils.js';
import {Series} from './series.js';

const Debouncer = goog.require('goog.async.Debouncer');
const dispose = goog.require('goog.dispose');
const EventTarget = goog.require('goog.events.EventTarget');
const log = goog.require('goog.log');
const {SeriesLike} = goog.requireType('coreui.chart.vega.SeriesLike');

const Logger = goog.requireType('goog.log.Logger');
const {VegaOptions} = goog.requireType('coreui.chart.vega.VegaOptions');
const {default: IBinMethod} = goog.requireType('os.histo.IBinMethod');


/**
 * Model for data in vega chart
 * Manages the bins and serves them to the chart
 * Decides if interactions hit bins
 */
export class Model extends EventTarget {
  /**
   * Constructor.
   * @param {string} id ties the model to the chart
   * @param {Array<Object>=} opt_data
   */
  constructor(id, opt_data) {
    super();
    /**
     * @type {string}
     */
    this.id = id;

    /**
     * e.g. scatterplot
     * @type {boolean}
     */
    this.isMultiDimensional = false;

    /**
     * @type {Array<Object>}
     */
    this.rawData = opt_data || [];

    /**
     * Series label to bins map
     * @type {Object<string, Array<ColorBin>>}
     */
    this.bins = {};

    /**
     * Map fields to names if they are different so we can get the right one when we need it
     * @type {Object<string, string>}
     */
    this.fieldMap = {};

    /**
     * Series/field name to series map
     * Anything using this model should be careful not to have too many series-es
     * @type {Object<string, SeriesLike>}
     */
    this.series = {};

    /**
     * Series/field names
     * Keep this so we can order the series-es as necessary
     * @type {Array<string>}
     */
    this.seriesKeys = [];

    /**
     * Map of series name to domain
     * Numeric domain: [min, max]
     * Other domain: [a, b, c, d]
     * @type {Object<string, Array<*>>}
     */
    this.defaultDomain = {};

    /**
     * Map of series name to domain
     * Numeric domain: [min, max]
     * Other domain: [a, b, c, d]
     * @type {Object<string, Array<*>>}
     */
    this.currentDomain = {};

    /**
     * Number of series-es
     * @type {number}
     */
    this.seriesCount = 0;

    /**
     * @type {DataModel}
     */
    this.xf = new DataModel();

    /**
     * The accessor function created from smashing together the primary and secondary bin methods
     * @type {function(Object):string}
     * @protected
     */
    this.combinedAccessor;

    /**
     * The key method created from smashing together the primary and secondary key functions
     * @type {function(string):string}
     * @protected
     */
    this.combinedKeyMethod;

    /**
     * Limit the number of serieses for xf sake
     * @type {number}
     */
    this.maxSerieses = 16;

    /**
     * The colors available for serieses (in semi random order)
     * @type {Array<string>}
     */
    this.colors = getHslGradient(this.maxSerieses, 30, 330, true);

    /**
     * @type {Logger}
     * @protected
     */
    this.log = LOGGER;

    /**
     * A function to check if items on the chart are selected
     * @type {function(ColorBin): boolean}
     * @protected
     */
    this.selectionCheckFn = this.defaultSelectionCheckFn;

    /**
     * If the total count is higher than this number, don't show selection on multi dim charts
     * @type {number}
     */
    this.selectionMaxCount = 10000;

    /**
     * selected bins id to bin
     * @type {!Object<string, ColorBin>}
     */
    this.selectedBins = {};

    /**
     * Bin stat options.
     * @type {Object<string, boolean>|undefined}
     */
    this.binStatOptions = undefined;

    /**
     * Data stat options.
     * @type {Object<string, boolean>|undefined}
     */
    this.dataStatOptions = undefined;

    /**
     * Track changes to alert the chart that something is different
     * @type {Object<string, boolean>}
     */
    this.changes = {
      data: false, // the bins for the chart changed
      extent: false, // the extent for chart scale changed
      series: false // the series backing the chart changed
    };

    /**
     * This model has an active window
     * @type {boolean}
     */
    this.windowActive = false;

    /**
     * This model's window id
     * @type {string}
     */
    this.windowId = '';

    /**
     * This model's window ranges [x[], y[]]
     * @type {Array<Array<Date|number|string>>}
     */
    this.windowRanges = [];

    /**
     * The time used for debouncers on interactions with the model
     * Gets overriden by this.resetInteractionTime
     * @type {number}
     */
    this.interactionTime = 10;

    /**
     * Debounce moving the window
     * @type {Debouncer}
     */
    this.runWindowDebounce = new Debouncer(this.runWindow, this.interactionTime, this);

    /**
     * Debounce moving the chart
     * @type {Debouncer}
     */
    this.setDomainsDebounce = new Debouncer(this.setDomains, this.interactionTime, this);

    /**
     * Debounce processing data
     * @type {Debouncer}
     */
    this.processDataDebounce = new Debouncer(this.processData, this.interactionTime, this);

    /**
     * Debounce resetting the domain
     * @type {Debouncer}
     */
    this.resetDomainDebounce = new Debouncer(this.resetDomain, 1000, this);

    /**
     * @type {number}
     */
    this.invalidCount = 0;

    ChartDispatcher.listen(EventType.WINDOWACTIVE, this.onWindow, false, this);
  }

  /**
   * @inheritDoc
   */
  disposeInternal() {
    super.disposeInternal();

    ChartDispatcher.unlisten(EventType.WINDOWACTIVE, this.onWindow, false, this);

    this.dumpSerieses();

    this.defaultDomain = null;
    this.currentDomain = null;
    this.xf = null;
    this.series = null;
    this.rawData = null;
    this.selectedBins = {};

    dispose(this.runWindowDebounce);
    this.runWindowDebounce = null;
    dispose(this.setDomainsDebounce);
    this.setDomainsDebounce = null;
    dispose(this.processDataDebounce);
    this.processDataDebounce = null;
    dispose(this.resetDomainDebounce);
    this.resetDomainDebounce = null;
  }

  /**
   * Alert that the model has changed
   */
  alertChanges() {
    const clone = Object.assign({}, this.changes); // unsafe clone is not needed here

    if (this.isMultiDimensional && this.seriesKeys && this.seriesKeys.length > 1) {
      if (Array.isArray(this.currentDomain[this.seriesKeys[1]]) && this.currentDomain[this.seriesKeys[1]].length) {
        if (this.currentDomain[this.seriesKeys[1]][0] ==
          this.currentDomain[this.seriesKeys[1]][this.currentDomain[this.seriesKeys[1]].length - 1]) {
          // first and last domain items are the same, hit the brakes, no valid data
          this.bins = {};
          this.dispatchEvent(new VegaEvent(EventType.MODELCHANGE, this.id, clone));
          return;
        }
      }
    }

    for (const key in this.changes) {
      this.changes[key] = false;
    }

    this.dispatchEvent(new VegaEvent(EventType.MODELCHANGE, this.id, clone));
  }

  /**
   * Get model-dependent menu action support for a chart.
   * @return {Object<string, boolean>} The menu options that this model supports.
   */
  getMenuActions() {
    return {};
  }

  /**
   * Reset the interaction debounce time based on the total number of features
   */
  resetInteractionTime() {
    this.interactionTime = Model.calculateInteractionTime(this.getTotalCount());

    dispose(this.runWindowDebounce);
    this.runWindowDebounce = new Debouncer(this.runWindow, this.interactionTime, this);

    dispose(this.setDomainsDebounce);
    this.setDomainsDebounce = new Debouncer(this.setDomains, this.interactionTime, this);
  }

  /**
   * Soft reset the model, without reprocsessing the data
   */
  softReset() {
    this.changes.extent = true;
    this.changes.data = true;
    this.alertChanges();

    this.dispatchEvent(new VegaEvent(EventType.SOFTRESETVIEW, this.id));
  }

  /**
   * Hard reset the model, recalculate the domain and reprocess the data
   * @param {boolean=} opt_hardReset
   */
  resetDomain(opt_hardReset) {
    if (opt_hardReset) {
      this.deactivateWindow();
      this.changes.series = true;
    }

    this.changes.extent = true;
    this.changes.data = true;

    if (this.processDataDebounce) {
      this.processDataDebounce.fire();
    }

    this.dispatchEvent(new VegaEvent(EventType.RESETVIEW, this.id));
  }

  /**
   * Handles updating the series based on an options change event.
   * @param {VegaOptions} options The options to set.
   * @param {boolean=} opt_resetAllowed
   */
  setOptions(options, opt_resetAllowed) {
    const config = options;
    this.isMultiDimensional = !!options.secondaryMethod;
    // clear everything, we're starting fresh
    this.dumpSerieses();

    this.binStatOptions = config.binStats;
    this.dataStatOptions = config.dataStats;

    if (config.primary && config.primaryMethod) {
      this.addSeries(config.primary, config.primaryMethod);

      if (this.isMultiDimensional && config.secondary && config.secondaryMethod) {
        this.addSeries(config.secondary, config.secondaryMethod);
        if (opt_resetAllowed) {
          // hit reset
          setTimeout(function() {
            if (this.resetDomainDebounce) {
              this.resetDomainDebounce.fire(true);
            }
          }.bind(this), 1000);
        } else {
          // soft reset
          setTimeout(function() {
            if (this.resetDomainDebounce) {
              this.resetDomainDebounce.fire();
            }
          }.bind(this), 1000);
        }
      } else if (this.processDataDebounce) {
        // reprocess the data
        this.processDataDebounce.fire();
      }
    }
    this.dispatchEvent(new VegaEvent(EventType.OPTIONS, this.id, options));
  }

  /**
   * Get a random color from a predetermined set
   * @return {string} hex color
   */
  pickColor() {
    if (this.colors.length < 1) {
      // skip red so we can use it for selection
      this.colors = getHslGradient(this.maxSerieses, 30, 330, true);
    }
    return this.colors.splice(0, 1)[0];
  }

  /**
   * setup the window
   * @param {string} id
   * @param {Array<Array<Date|number|string>>} ranges
   */
  runWindow(id, ranges) {
    this.windowId = id;

    this.windowRanges = Utils.rangeDomainSet(ranges);
    if (!this.windowActive) {
      this.activateWindow();
    }
    this.windowActive = true;
  }

  /**
   * Send event to ensure others release window capability
   */
  activateWindow() {
    const config = {'active': true};
    const event = new VegaEvent(EventType.WINDOWACTIVE, this.id, config);
    ChartDispatcher.dispatchEvent(event);
  }

  /**
   * Send event to ensure others release window capability
   */
  deactivateWindow() {
    const config = {'active': false};
    const event = new VegaEvent(EventType.WINDOWACTIVE, this.id, config);
    ChartDispatcher.dispatchEvent(event);
  }

  /**
   * Listen for window activation
   * @param {VegaEvent} event
   */
  onWindow(event) {
    const id = event.getId();
    const config = event.getConfig();

    if (id === this.id) {
      this.windowActive = config['active'];
    } else {
      this.windowActive = false;
    }
  }

  /**
   * Default selection check function if no other one was set on the model
   * @param {ColorBin} bin
   * @return {boolean}
   */
  defaultSelectionCheckFn(bin) {
    return !!this.selectedBins[bin['id']];
  }

  /**
   * Add a series object, if it's already there overwrite it. This enforces the limit of maxSerieses to keep xf fast.
   * @param {ColumnDefinition|Object<string, string>} column The column to build a series for.
   * @param {IBinMethod} method The bin method to use.
   */
  addSeries(column, method) {
    const isCol = column instanceof ColumnDefinition;
    const field = isCol ? column['field'] : (column ? Object.keys(column)[0] : randomString());
    if (this.seriesCount < this.maxSerieses) {
      const type = isCol ? column['type'] : (column ? Object.values(column)[0] : UniqueBinMethod.TYPE);
      const binType = method.getBinType();
      let width;
      let offset;
      let showEmpty;

      if (binType === NumericBinMethod.TYPE) {
        method = /** @type {NumericBinMethod} */ (method);

        width = method.getWidth();
        offset = method.getOffset();
        showEmpty = method.getShowEmptyBins();
      } else if (binType == DateBinMethod.TYPE) {
        method = /** @type {DateBinMethod} */ (method);

        showEmpty = method.getShowEmptyBins();
      }

      const ser = new Series(
          field, this.xf, type, this.pickColor(),
          binType, width, offset, showEmpty);

      this.series[field] = ser;
      this.seriesCount++;
      this.seriesKeys = Object.keys(this.series);
      this.changes.series = true;
    } else {
      log.error(this.log, 'Series: ' + field + ' was not added; too many series in existence.');
    }
  }

  /**
   * Remove a series object
   * @param {string} id the field on the item
   */
  removeSeries(id) {
    if (this.series[id]) {
      this.series[id].dispose();
      this.series[id] = null;
      this.xf.removeDimension(id);
      this.seriesCount--;
      this.seriesKeys = Object.keys(this.series);
      this.changes.series = true;
    } else {
      log.error(this.log, 'Series: ' + id + ' could not be found.');
    }
  }

  /**
   * Remove all serieses
   */
  dumpSerieses() {
    const serArr = this.seriesKeys.slice();
    for (let i = 0; i < serArr.length; i++) {
      const ser = serArr[i];
      this.removeSeries(ser);
    }

    this.fieldMap = {};
    this.series = {};
    this.seriesKeys = [];
  }

  /**
   * Combine the series for a 2D chart
   * @param {SeriesLike} xSeries
   * @param {SeriesLike} ySeries
   * @return {SeriesLike}
   */
  combineSeries(xSeries, ySeries) {
    if (this.isMultiDimensional) {
      const newId = xSeries.id + DataModel.SEPARATOR + ySeries.id;
      // TODO: As of THIN-11994 all charts use the SourceModel which overrides this method
      // When more generic charts are required a better way to add this combined series may need to be implemented
      // this.addSeries(newId, 'string');

      /**
       * @param {Object} item
       * @return {string}
       */
      this.combinedAccessor = function(item) {
        return xSeries.binMethod.getValue(item) + DataModel.SEPARATOR + ySeries.binMethod.getValue(item);
      };

      // overwrite the xf dimension with one utilizing the new accessor
      this.xf.addDimension(newId, this.combinedAccessor, false);

      /**
       * @param {string} key
       * @return {string}
       */
      this.combinedKeyMethod = function(key) {
        const keys = key.split(DataModel.SEPARATOR);
        return xSeries.binMethod.getBinKey(keys[0]) + DataModel.SEPARATOR +
            ySeries.binMethod.getBinKey(keys[1]);
      };

      return this.series[newId];
    }

    return null;
  }

  /**
   * Check the bin method for if the chart wants the empty bins, if it's supported, and
   * then add them to the bins if it wouldn't result in tooManyBins
   * @param {string} key the key that corresponds to the current bins
   * @param {Array<ColorBin>} bins the non-empty bins
   * @return {Array<ColorBin>|null}
   * @protected
   */
  handleEmptyBins(key, bins) {
    // if there's no data to iterate over...
    if (bins.length == 0) {
      // do nothing;
    } else if (this.series && this.series[key]) {
      const series = this.series[key];
      const method = /** @type {UniqueBinMethod} */ (series.getBinMethod());
      if (method && method.getShowEmptyBins()) {
        if (method.getBinType() == DateBinMethod.TYPE || method.getBinType() == NumericBinMethod.TYPE) {
          const maxBins = method.getMaxBins();
          const stats = method.getStatsForBin(bins);

          // if the caller wants to limit the results...
          // NOTE: getBinCount() method will set the VegaChartCtrl tooManyBins flag
          if (stats.binCountAll <= maxBins) {
            const min = stats.range[0];
            const max = stats.range[1];
            const step = stats.step;
            const result = this.generateEmptyBins_(bins, method, min, max, step);

            // only edit this.bins[key] if the bins need to be modified...
            if (result && result.length && bins.length < result.length) {
              return result || null;
            }
          }
        }
      }
    }
    return bins;
  }

  /**
   * Fill in the gaps for missing bins in the numeric range of the chart IFF it hasn't already been done
   * @param {Array<ColorBin>|undefined} bins
   * @param {UniqueBinMethod} method
   * @param {number} min
   * @param {number} max
   * @param {number} step
   * @return {Array<ColorBin>}
   * @private
   */
  generateEmptyBins_(bins, method, min, max, step) {
    if (!bins || min > max || step && step <= 0) return null;
    const maxLoops = method.getMaxBins() || 1000000; // don't allow an infinite/ridiculously big loop
    const isMonth = (step == DateBinMethod.MAGIC_MONTH_MILLIS);
    const isYear = (step == DateBinMethod.MAGIC_YEAR_MILLIS);
    const result = [];

    let idx = 0;
    let lcv = 0;
    let next = step;

    // use math to double-check the work hasn't already been done
    if (bins.length < (((max - min) / step) + 1)) {
      // cast to decimal to avoid loss of precision when adding "next"
      for (let cur = (0.0 + min); cur <= max; cur += next) {
        // to speed things up, assume the non-empty bin data is already ordered
        if (bins[idx] && bins[idx]['key'] == cur) {
          result.push(bins[idx]);
          idx++;
        } else {
          const bin = new ColorBin('#000');
          bin['key'] = cur;
          bin['label'] = method.getLabelForKey(cur);
          bin['id'] = bin['label'];
          bin['series'] = '';
          bin['count'] = 0;
          bin['sel'] = false;
          bin['highlight'] = false;
          result.push(bin);
        }

        // constant step size
        next = step;

        // variable step size
        if (isMonth) {
          next = time.step(new Date(cur), Duration.MONTH, 1);
        } else if (isYear) {
          next = time.step(new Date(cur), Duration.YEAR, 1);
        }

        if (++lcv > maxLoops) break;
      }
    }
    return result; // sorted
  }

  /**
   * Process the data by creating bins based on the series in the model
   * @return {Array<ColorBin>}
   */
  processData() {
    this.bins = {};
    this.invalidCount = 0;
    if (this.isMultiDimensional && this.seriesKeys.length >= 2) {
      const combined = this.combineSeries(this.series[this.seriesKeys[0]], this.series[this.seriesKeys[1]]);
      if (combined == null) {
        log.error(this.log, 'Chart invalid. Failure to create multidimensional chart');
        this.changes.data = true;
        return this.mapResults(this.bins); // empty
      }
      const bins = this.xf.groupData(combined.id,
          this.combinedKeyMethod,
          combined.reduceAdd.bind(combined),
          combined.reduceRemove.bind(combined),
          combined.reduceInit.bind(combined));
      this.bins[combined.id] = bins;
    } else if (!this.isMultiDimensional && this.seriesKeys.length > 1) {
      for (const key in this.series) {
        const series = this.series[key];
        let bins = this.xf.groupData(series.id,
            series.binMethod.getBinKey.bind(series.binMethod),
            series.reduceAdd.bind(series),
            series.reduceRemove.bind(series),
            series.reduceInit.bind(series));
        bins = this.handleEmptyBins(key, bins);
        this.bins[key] = bins;
      }
    } else if (!this.isMultiDimensional && this.seriesKeys.length == 1) {
      const series = this.series[this.seriesKeys[0]];
      let bins = this.xf.groupData(series.id,
          series.binMethod.getBinKey.bind(series.binMethod),
          series.reduceAdd.bind(series),
          series.reduceRemove.bind(series),
          series.reduceInit.bind(series));
      bins = this.handleEmptyBins(this.seriesKeys[0], bins);
      this.bins[series.id] = bins;
    } else {
      log.error(this.log, 'Chart invalid. Series count and chart type do not match');
    }
    this.changes.data = true;

    this.resetInteractionTime();
    return this.mapResults(this.bins);
  }

  /**
   * Find the domain for a given dimension on the xf DataModel
   * @param {string} dimId
   * @param {Object<string, Array<*>>} domain i.e. this.defaultDomain
   * @param {string} domainKey i.e. this.defaultDomain[domainKey]
   * @param {boolean=} opt_overwrite clear the current domain
   */
  calculateDomain(dimId, domain, domainKey, opt_overwrite) {
    // Get all of the unique keys from xf, as numbers if they can be coerced to numbers
    let temp = null;
    const tempArr = this.xf.getDimensionKeys(dimId);
    if (Array.isArray(tempArr) && tempArr.length) {
      temp = tempArr.map(function(v) {
        const key = this.series[domainKey].getBinMethod().getLabelForKey(v, false, true);
        return !isNaN(key) && !isNaN(parseFloat(key)) ? Number(key) : key;
      }.bind(this));

      if (opt_overwrite) {
        domain[domainKey] = temp.slice();
      } else if (!opt_overwrite) {
        const l = temp.length;
        for (let i = 0; i < l; i++) {
          binaryInsert(domain[domainKey], temp[i]);
        }
      }
    }

    temp = null;
  }

  /**
   * @param {Object<string, Array<*>>} domain i.e. this.defaultDomain
   * @param {string} domainKey i.e. this.defaultDomain[domainKey]
   * @param {Array} arr
   * @param {boolean=} opt_alert
   */
  setDomain(domain, domainKey, arr, opt_alert) {
    if (this.series[domainKey] && this.series[domainKey].binMethod) {
      domain[domainKey] = arr.slice();

      const method = this.series[domainKey].binMethod;
      this.adjustNumericBinMethod(domain, domainKey, method, 0);

      this.changes.extent = true;
      this.changes.data = true;

      if (opt_alert) {
        this.alertChanges();
      }
    }
  }

  /**
   * @param {Object<string, Array<*>>} domain i.e. this.defaultDomain
   * @param {Array<string>} domainKeys i.e. this.defaultDomain[domainKey]
   * @param {Array<Array>} arrs
   * @param {boolean=} opt_alert
   */
  setDomains(domain, domainKeys, arrs, opt_alert) {
    for (let i = 0; i < domainKeys.length; i++) {
      let alert = false;
      if (opt_alert && i == domainKeys.length - 1) {
        alert = true;
      }
      this.setDomain(domain, domainKeys[i], arrs[i], alert);
    }
  }

  /**
   * Set the width and offset on the bin method to something more useful
   * @param {Object<string, Array<*>>} domain i.e. this.defaultDomain
   * @param {string} domainKey i.e. this.defaultDomain[domainKey]
   * @param {IBinMethod} binMethod
   * @param {number=} opt_padFactor percentage of padding to add on each side, zero is ok
   * @suppress {accessControls, checkTypes} To allow direct access to crossfilter
   */
  adjustNumericBinMethod(domain, domainKey, binMethod, opt_padFactor) {
    if (binMethod.getBinType() == NumericBinMethod.TYPE) {
      let temp = Array.isArray(domain[domainKey]) ? domain[domainKey] : [0, 1];

      // explicit reassignment because the output of array filter will break it
      domain[domainKey] = temp.filter(function(v) {
        return !isNaN(v) && !isNaN(parseFloat(v));
      });
      temp = domain[domainKey];
      // domain = [min, max]
      temp[1] = temp.length > 1 ? temp[1] : temp[0];
      temp[1] = temp[temp.length - 1];
      temp.length = 2;

      // if the keys from the bin method are the same, make an effort to get the correct values to use instead
      if (this.xf.getBottomRecord(this.series[domainKey].getId()) &&
            this.xf.getTopRecord(this.series[domainKey].getId())) {
        temp = temp[1] == temp[0] ? [this.xf.getBottomRecord(this.series[domainKey].getId()).get(domainKey),
          this.xf.getTopRecord(this.series[domainKey].getId()).get(domainKey)] : temp;
      }
      const tempArr = this.xf.getDimensionKeys(this.series[domainKey].getId());
      if (Array.isArray(tempArr) && (temp[0] == null || temp[1] == null)) {
        temp = [tempArr[0], tempArr[tempArr.length - 1]];
      }

      // keep the keys in the correct order
      temp = temp[1] >= temp[0] ?
          temp : temp.reverse();

      // find span
      const span = Math.ceil(temp[1]) - Math.floor(temp[0]);

      // add in some padding
      opt_padFactor = opt_padFactor === undefined ? 10 : opt_padFactor === 0 ? 0.0001 : opt_padFactor;
      const pad = span * (opt_padFactor / 100);
      temp[0] = Number(temp[0]) - pad;
      temp[1] = Number(temp[1]) + pad;

      // adjust the bin method
      binMethod = /** @type {NumericBinMethod} */ (binMethod);
      // set the min and max a little ways off the chart to ensure they will be off the chart and in the gutter
      // on multi dim charts
      binMethod.setMin(/** @type {number} */ (temp[0]) - (2 * pad));
      binMethod.setMax(/** @type {number} */ (temp[1]) + (2 * pad));
      if (span) {
        binMethod.setOffset(Math.floor(temp[0]));
        binMethod.setWidth(Number((span / 50)));
      }
    }
  }

  /**
   * Add keys to the bins in the data for easy access by chart specs
   * Be very careful how many bins are sent here, especially in extending classes, which have more processing to do
   * @param {Object<string, Array<ColorBin>>|Array<ColorBin>} bins
   * @param {boolean=} opt_key only map this key
   * @return {Array<ColorBin>}
   *
   * @suppress {accessControls, checkTypes} To allow direct access to color bins
   */
  mapResults(bins, opt_key) {
    const results = [];

    if (bins) {
      // get an array if the bins are an object
      const arr = Array.isArray(bins) ? bins : bins[this.seriesKeys[0]];

      if (arr && arr.length) {
        // get the serieses that will label the items
        const series = this.series[this.seriesKeys[0]];
        const pri = series.getBinMethod();
        const sec = this.isMultiDimensional && series.getSecondaryBinMethod ? series.getSecondaryBinMethod() : null;
        if (!series || !pri || (this.isMultiDimensional && !sec)) {
          // something is missing, return nothing
          return results;
        }

        // iterate over the bins to adjust the correct fields for display
        for (let j = 0; j < arr.length; j++) {
          const bin = arr[j];
          if (bin && bin['key'] != null) {
            bin['key'] = Array.isArray(bin['key']) ? bin['key'][0] : bin['key'];
            bin['count'] = bin.count || bin.items.length;

            // set the user facing label and attach to the seriesKey so the chart scale and axis can access it
            bin[this.seriesKeys[0]] = pri.getLabelForKey(bin['key'], false, true);
            if (this.isMultiDimensional && sec) {
              bin[this.seriesKeys[1]] = sec.getLabelForKey(bin['key'], true, true);
            }

            // don't bother getting a color, highlight, or selection if the bin is empty
            bin['color'] = bin['count'] ? bin.getColor() || '#aaa' : '#aaa';
            bin['highlight'] = bin['highlight'] == null || !bin['count'] ? false : bin['highlight'];
            bin['sel'] = (!bin['count'] || (this.isMultiDimensional && this.getTotalCount() > this
                .selectionMaxCount)) ?

                false : this.selectionCheckFn(bin);
            results.push(bin);
          }
        }
      }
    }

    this.changes.data = true;
    this.alertChanges();
    return results;
  }

  /**
   * Highlight the bins on the chart
   * @param {Array<ColorBin>} bins
   */
  highlightBins(bins) {
    const allBins = this.getBins();
    for (let j = 0; j < allBins.length; j++) {
      if (bins.indexOf(allBins[j]) < 0) {
        allBins[j]['highlight'] = false;
      } else {
        allBins[j]['highlight'] = true;
      }
    }
    this.changes.data = true;
    this.alertChanges();
  }

  /**
   * Gets the total count of binned items.
   * @return {number}
   */
  getTotalCount() {
    return this.getData().length;
  }

  /**
   * Get the bin count
   * @param {boolean=} opt_safe
   * @return {number}
   */
  getBinCount(opt_safe) {
    let binCount = 0;
    for (const key in this.bins) {
      if (this.bins[key] != null) {
        binCount += this.bins[key].length;
      }
    }

    return binCount;
  }

  /**
   * Get the bins
   * @return {!Array<ColorBin>}
   */
  getBins() {
    let bins = null;
    for (const key in this.bins) {
      if (this.bins[key] != null) {
        if (bins) {
          Array.prototype.push.apply(bins, this.bins[key]);
        } else {
          bins = this.bins[key];
        }
      }
    }

    return bins || [];
  }

  /**
   * Get the data from xf
   * @param {number=} opt_num of results to return; default all
   * @param {string=} opt_seriesId
   * @param {boolean=} opt_bottom return the bottom results instead of top
   * @return {Array<*>}
   */
  getData(opt_num, opt_seriesId, opt_bottom) {
    return (this.xf) ? this.xf.getResults(opt_num, opt_seriesId, opt_bottom) : [];
  }

  /**
   * Get bin statistics for the model.
   * @return {!bitsx.chart.ChartStats}
   */
  getBinStats() {
    return getValueStats(this.getBins().map((bin) => bin['count']));
  }

  /**
   * Get data statistics for the model.
   * @return {!bitsx.chart.ChartStats}
   */
  getDataStats() {
    // only single series is currently supported for data stats
    if (this.seriesKeys.length === 1) {
      return getDataStats(this.getData(), this.seriesKeys[0]);
    }

    return getDefaultStats();
  }

  /**
   * filter data in one dimension
   * @param {string} seriesId
   * @param {Array<*>} arr [min, max]
   */
  filterData(seriesId, arr) {
    this.xf.filterDimension(seriesId, arr);
  }

  /**
   * Clear filters on the xf data model
   */
  clearFilters() {
    this.xf.clearAllFilters();
  }

  /**
   * Convenience: get filtered data for multiple dimensions
   * @param {Array<string>} seriesIds ['seriesX', 'seriesY']
   * @param {Array<Array<*>>} arr [[min, max], [min, max]]
   * @param {boolean=} opt_keep the filters in tact (i.e. don't clear)
   * @param {number=} opt_num of results to return; default all
   * @param {boolean=} opt_bottom return the bottom results instead of top
   * @return {Array<*>}
   */
  getFilteredDataMulti(seriesIds, arr, opt_keep, opt_num, opt_bottom) {
    let data = [];
    for (let i = 0; i < seriesIds.length; i++) {
      const seriesId = seriesIds[i];
      this.xf.filterDimension(seriesId, arr[i]);
    }

    data = this.getData(opt_num, seriesIds[0], opt_bottom);

    if (opt_keep) {
      return data;
    } else {
      this.xf.clearAllFilters();
      return data;
    }
  }

  /**
   * Get the bins that match a particular filterFunction
   * @param {function(*): Array<ColorBin>} filterFunction
   * @param {string=} opt_seriesId to run against; default to all serieses
   * @return {Array<ColorBin>}
   */
  getMatchingBins(filterFunction, opt_seriesId) {
    let bins = [];
    if (opt_seriesId) {
      const binArr = this.bins[opt_seriesId];
      if (binArr && binArr.length) {
        bins = binArr.filter(filterFunction);
      }
    } else {
      for (const key in this.bins) {
        const binArr = this.bins[key];
        Array.prototype.push.apply(bins, binArr.filter(filterFunction));
      }
    }

    return bins;
  }

  /**
   * Get the bins that are between two values, inclusive
   * @param {string} seriesId to run against; default to all serieses
   * @param {Array<Date|number|string>} extent [min, max]
   * @return {Array<ColorBin>}
   */
  getBinsBetween(seriesId, extent) {
    extent = this.getRangeFromLabels(seriesId, extent);
    const filterFunction = function(v) {
      if (extent.length == 1) { // handle wide, unique binning
        return extent[0] == v[seriesId];
      }
      return extent[0] <= v[seriesId] && v[seriesId] <= extent[1]; // if the box touches the bin, get it
    };

    return this.getMatchingBins(filterFunction, seriesId);
  }

  /**
   * Get the bins that are between two values, inclusive, across multi dimension
   * @param {Array<string>} seriesIds to run against; default to all serieses
   * @param {Array<Array<Date|number|string>>} extents [[min, max], [min, max]]
   * @return {Array<ColorBin>}
   */
  getBinsBetweenMulti(seriesIds, extents) {
    for (let j = 0; j < extents.length; j++) {
      extents[j] = this.getRangeFromLabels(seriesIds[j], extents[j]);
    }

    const filterFunction = function(v) {
      for (let i = 0; i < extents.length; i++) {
        const extent = extents[i];
        const seriesId = seriesIds[i];
        const valid = extent[0] <= v[seriesId] && v[seriesId] <= extent[1];
        if (!valid) {
          return false;
        }
      }
      return true;
    };

    return this.getMatchingBins(filterFunction, seriesIds[0]);
  }

  /**
   * Get the data from bins
   * @param {Array<ColorBin>} bins to run against; default to all serieses
   * @return {Array<*>}
   */
  getDataFromBins(bins) {
    const arr = [];
    for (let i = 0; i < bins.length; i++) {
      Array.prototype.push.apply(arr, bins[i].items);
    }
    return arr;
  }

  /**
   * Get the real range from the numericbin ranges
   * @param {string} seriesId to run against; default to all serieses
   * @param {Array<Date|string|number>} arr to run against; default to all serieses
   * @return {Array<number>}
   */
  getRangeFromLabels(seriesId, arr) {
    arr = arr.slice();
    // coerce the extents of labels of number ranges to the numbers themselves, if they really are number ranges
    if (this.series[seriesId].getBinMethod().getBinType() == NumericBinMethod.TYPE &&
          typeof arr[0] == 'string' && Number(arr[0]) != arr[0] &&
          arr[0].indexOf(NumericBinMethod.LABEL_RANGE_SEP) + 1 &&
          typeof arr[1] == 'string' && Number(arr[1]) != arr[1] &&
          arr[1].indexOf(NumericBinMethod.LABEL_RANGE_SEP) + 1) {
      arr[0] = arr[0].slice(0, arr[0].indexOf(NumericBinMethod.LABEL_RANGE_SEP));
      arr[1] = arr[1].slice(arr[1].indexOf(NumericBinMethod.LABEL_RANGE_SEP) +
            NumericBinMethod.LABEL_RANGE_SEP.length);
    }
    return arr;
  }

  /**
   * Sort the data model by a particular direction. Implemented by subclasses.
   * @param {string} type
   */
  sort(type) {}

  /**
   * Select bins
   * @param {Array<ColorBin>} bins
   * @param {boolean=} opt_toggle
   */
  select(bins, opt_toggle) {
    for (let i = 0; i < bins.length; i++) {
      if (this.selectedBins[bins[i]['id']] && opt_toggle) {
        delete this.selectedBins[bins[i]['id']];
      } else {
        this.selectedBins[bins[i]['id']] = bins[i];
      }
    }
  }

  /**
   * Select bins
   * @param {Array<ColorBin>} bins
   */
  selectExclusive(bins) {
    this.selectedBins = {};
    this.select(bins);
  }

  /**
   * Select all bins
   */
  selectAll() {
    const bins = this.getBins();
    this.select(bins);
  }

  /**
   * Invert selection on bins
   */
  invertSelection() {
    const bins = this.getBins();
    for (let i = 0; i < bins.length; i++) {
      if (this.selectedBins[bins[i]['id']]) {
        delete this.selectedBins[bins[i]['id']];
      } else {
        this.selectedBins[bins[i]['id']] = bins[i];
      }
    }
  }

  /**
   * Unselect the bins
   * @param {Array<ColorBin>} bins
   */
  deselect(bins) {
    for (let i = 0; i < bins.length; i++) {
      delete this.selectedBins[bins[i]['id']];
    }
  }

  /**
   * Clear all bin selection
   */
  clearSelection() {
    this.selectedBins = {};
  }

  /**
   * Hide bins
   * @param {Array<ColorBin>} bins
   * @param {boolean=} opt_selected (true for selected, false for unselected, undefined for given bins)
   */
  hideBins(bins, opt_selected) {
    this.bins = {};
  }

  /**
   * Hide bins
   * @param {Array<ColorBin>} bins
   * @param {boolean=} opt_selected (true for selected, false for unselected, undefined for given bins)
   */
  removeBins(bins, opt_selected) {
    this.bins = {};
  }

  /**
   * Calculate the appropriate debounce time for interactions for a chart with a given number of items
   * @param {number} itemCount
   * @return {number}
   */
  static calculateInteractionTime(itemCount) {
    const minTime = 1;
    const maxTime = 100;
    const maxCount = getMaxFeatures();

    // calculate on sinusoidal easing curve
    return Math.ceil(easeSinusoidal(itemCount, minTime, maxTime - minTime, maxCount)) || minTime;
  }
}

/**
 * @type {Logger}
 */
const LOGGER = log.getLogger('coreui.chart.vega.data.Model');
