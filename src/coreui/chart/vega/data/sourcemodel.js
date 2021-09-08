goog.declareModuleId('coreui.chart.vega.data.SourceModel');

goog.require('os.data.ColumnDefinition');
goog.require('os.data.xf.DataModel');

import * as coreuiChartStats from '../../chartstats.js';
import {default as Model} from './model.js';
import {default as ClickContextEventType} from '../interaction/clickcontexteventtype';
import * as osFeature from 'opensphere/src/os/feature/feature.js';
import * as osStyle from 'opensphere/src/os/style/style.js';

const Debouncer = goog.require('goog.async.Debouncer');
const Throttle = goog.require('goog.async.Throttle');
const dispose = goog.require('goog.dispose');
const GoogEventType = goog.require('goog.events.EventType');
const log = goog.require('goog.log');
const olArray = goog.require('ol.array');
const olEvents = goog.require('ol.events');
const olObj = goog.require('ol.obj');
const osArray = goog.require('os.array');
const osColor = goog.require('os.color');
const histo = goog.require('os.data.histo');
const ColorMethod = goog.require('os.data.histo.ColorMethod');
const SelectionType = goog.require('os.events.SelectionType');
const {cloneMethod} = goog.require('os.histo');
const DateBinMethod = goog.require('os.histo.DateBinMethod');
const DateRangeBinType = goog.require('os.histo.DateRangeBinType');
const NumericBinMethod = goog.require('os.histo.NumericBinMethod');
const PropertyChange = goog.require('os.source.PropertyChange');
const {launchConfirmColor} = goog.require('os.ui.window.ConfirmColorUI');
const GoogEvent = goog.requireType('goog.events.Event');
const olFeature = goog.requireType('ol.Feature');
const ColorBin = goog.requireType('os.data.histo.ColorBin');
const SourceHistogram = goog.requireType('os.data.histo.SourceHistogram');
const PropertyChangeEvent = goog.requireType('os.events.PropertyChangeEvent');
const IBinMethod = goog.requireType('os.histo.IBinMethod');
const UniqueBinMethod = goog.requireType('os.histo.UniqueBinMethod');
const VectorSource = goog.requireType('os.source.Vector');


/**
 * Model for data in vega chart powered by VectorSource
 * Leverages SourceHistogram s to do all of the heavy lifting
 */
class SourceModel extends Model {
  /**
   * Constructor.
   * @param {string} id ties the model to the chart
   * @param {VectorSource} source
   */
  constructor(id, source) {
    super(id);
    /**
     * @type {VectorSource}
     */
    this.source = source;

    /**
     * Hex color strings from the source's ColorModel. If something was auto or manually colored;
     * @type {Array}
     */
    this.colorsArr = [];

    /**
     * Bins that changed
     * @type {Array}
     */
    this.changeItems = [];

    /**
     * Debounce events coming in and include only the affect bins
     * @type {Debouncer}
     * @private
     */
    this.collectBinsDebounce_ = new Debouncer(this.collectSourceBins_, 100, this);

    /**
     * Semaphore to detect when waiting for collectBins to finish
     * @type {boolean}
     * @private
     */
    this.inCollectBinsDebounce_ = false;

    /**
     * Delay incoming to prevent processing all of the rapidly changing styles events
     *
     * Using a large delay since remaking the color folds, etc are intensive tasks; and a user probably doesn't care
     * to see an animation for a particular folor fold going from 299 to 298 to 297 to 296... only that the chart
     * redraws when the folds are stable.
     *
     * @type {Throttle}
     * @private
     */
    this.rebuildBinsDelay_ = new Throttle(this.rebuildBins_, 175, this);

    /**
     * Delay incoming to prevent processing all of the rapidly changing highlights events
     *
     * Using a small delay so user doesn't notice; but if user is simply moving the mouse across
     * the screen, then the charts don't try to redraw everything the cursor touches along the way
     *
     * @type {Throttle}
     * @private
     */
    this.highlightItemsDelay_ = new Throttle(this.highlightItems_, 75, this);

    /**
     * Delay/retry events that have conflicts with the data being modified by collectBinsDebounce_
     * @type {Throttle}
     * @private
     */
    this.onSourceChangeDelay_ = new Throttle(this.onSourceChange_, 35, this);

    if (this.source) {
      this.xf = this.source.getTimeModel();
      this.selectionCheckFn = function(bin) {
        return bin.items && bin.items.length ? this.source.isSelectedArray(bin.items) : false;
      }.bind(this);
    }

    olEvents.listen(this.source, GoogEventType.PROPERTYCHANGE, this.onSourceChange_, this);
  }

  /**
   * @inheritDoc
   */
  disposeInternal() {
    super.disposeInternal();

    dispose(this.collectBinsDebounce_);
    dispose(this.onSourceChangeDelay_);
    dispose(this.highlightItemsDelay_);
    dispose(this.rebuildBinsDelay_);

    olEvents.unlisten(this.source, GoogEventType.PROPERTYCHANGE, this.onSourceChange_, this);
    this.source = null;
  }

  /**
   * Handles updating the series based on an options change event.
   * @inheritDoc
   */
  setOptions(options) {
    if (this.source.getHiddenItems().length) {
      super.setOptions(options, false);
    } else {
      super.setOptions(options, true);
    }
  }

  /**
   * @inheritDoc
   */
  addSeries(column, method) {
    const field = column['field'];
    const name = column['name'];

    if (field !== name) {
      this.fieldMap[field] = name;
    }

    // Date bins on multi dimensional charts should be treated as numeric, but we need to know if it is a date for display
    if (this.isMultiDimensional && method.getBinType() === DateBinMethod.TYPE) {
      method = new NumericBinMethod();
      method.setIsDate(true);
    }

    let binMethod = cloneMethod(method);
    binMethod.setField(field);
    binMethod.setValueFunction(osFeature.getField);

    // remove this series if it already exists
    if (olArray.includes(this.seriesKeys, field) || this.series[field]) {
      this.removeSeries(field);
    }

    // certain date time types allow for binning one item into multiple bins, allow for that here too
    if (binMethod.getBinType() === DateBinMethod.TYPE) {
      binMethod = /** @type {DateBinMethod} */ (binMethod);

      const dateBinType = binMethod.getDateBinType();
      if (DateRangeBinType[dateBinType]) {
        binMethod.setArrayKeys(true);
      }
    }

    // create a new histogram and set up the bin method
    const hist = this.createHistogram();
    hist.setBinMethod(binMethod);
    hist.setSortFn(binMethod.getSortLabelFnAsc());
    hist.setName(name);

    // Must use name here instead of field so data can be plotted correctly
    this.series[name] = hist;
    this.seriesKeys.push(name);
    hist.listen(GoogEventType.CHANGE, this.onHistogramChange, false, this);
    hist.incrementRefCount();
    this.changes.series = true;
  }

  /**
   * Generate a new histogram from the source
   * @return {SourceHistogram}
   */
  createHistogram() {
    return this.source.createHistogram();
  }

  /**
   * @inheritDoc
   */
  removeSeries(id) {
    const hist = /** @type {SourceHistogram} */ (this.series[id]);
    this.seriesKeys.splice(this.seriesKeys.indexOf(id), 1);
    if (hist) {
      hist.unlisten(GoogEventType.CHANGE, this.onHistogramChange, false, this);
      // decrement reference count so the histogram knows when to destroy itself
      hist.decrementRefCount();
    }
    this.series[id] = null;
    this.changes.series = true;
  }

  /**
   * @override
   */
  combineSeries(xHist, yHist) {
    if (this.isMultiDimensional) {
      const binMethod = yHist.getBinMethod();
      xHist.setSecondaryBinMethod(binMethod); // set the pivot on the x histogram
    }

    return xHist;
  }

  /**
   * @inheritDoc
   */
  processData() {
    this.bins = {};
    if (this.isMultiDimensional && this.seriesKeys.length >= 2) {
      // set up the combined histogram
      this.combineSeries(this.series[this.seriesKeys[0]], this.series[this.seriesKeys[1]]);

      // get the domain for the histogram, adjust if numeric
      const hist = /** @type {SourceHistogram} */ (this.series[this
          .seriesKeys[0]]); // the combined source histogram has the xaxis id

      const pri = hist.getBinMethod();
      this.calculateDomain(hist.getId(), this.defaultDomain, this.seriesKeys[0], true);
      this.adjustNumericBinMethod(this.defaultDomain, this.seriesKeys[0], pri, 10);
      this.currentDomain[this.seriesKeys[0]] = Array.isArray(this.defaultDomain[this.seriesKeys[0]]) ?
          this.defaultDomain[this.seriesKeys[0]].slice() : [0, 1];
      hist.setBinMethod(pri);

      // do the same for the secondary bin method, on it's own histogram and on the primary
      const hist2 = this.series[this.seriesKeys[1]];
      const sec = hist.getSecondaryBinMethod();
      this.calculateDomain(hist2.getId(), this.defaultDomain, this.seriesKeys[1], true);
      this.adjustNumericBinMethod(this.defaultDomain, this.seriesKeys[1], sec, 10);
      this.currentDomain[this.seriesKeys[1]] = Array.isArray(this.defaultDomain[this.seriesKeys[1]]) ?
          this.defaultDomain[this.seriesKeys[1]].slice() : [0, 1];
      hist.setSecondaryBinMethod(sec);
      hist2.setBinMethod(sec);

      // force an update to the histogram and get the results
      hist.setForceAllData(this.windowActive);
      hist.updateResults();
      const bins = this.handleEmptyBins(this.seriesKeys[0], hist.getResults());
      this.bins[this.seriesKeys[0]] = bins;
    } else if (!this.isMultiDimensional && this.seriesKeys.length > 1) {
      for (const key in this.series) {
        // update each of the histograms, force update, and get the results
        const hist = /** @type {SourceHistogram} */ (this.series[key]);
        this.calculateDomain(hist.getId(), this.defaultDomain, key, true);
        this.currentDomain[key] = Array.isArray(this.defaultDomain[key]) ?
            this.defaultDomain[key].slice() : [0, 1];
        hist.setForceAllData(this.windowActive);
        hist.updateResults();
        const bins = this.handleEmptyBins(key, hist.getResults());
        this.bins[key] = bins;
      }
    } else if (!this.isMultiDimensional && this.seriesKeys.length == 1) {
      // update the histogram, force and update, and get the results
      const hist = /** @type {SourceHistogram} */ (this.series[this.seriesKeys[0]]);
      this.calculateDomain(hist.getId(), this.defaultDomain, this.seriesKeys[0], true);
      this.currentDomain[this.seriesKeys[0]] = Array.isArray(this.defaultDomain[this.seriesKeys[0]]) ?
          this.defaultDomain[this.seriesKeys[0]].slice() : [0, 1];
      hist.setForceAllData(this.windowActive);
      hist.updateResults();
      const bins = this.handleEmptyBins(this.seriesKeys[0], hist.getResults());
      this.bins[this.seriesKeys[0]] = bins;
    } else {
      log.error(this.log, 'Chart invalid. Series count and chart type do not match');
    }

    // map the results for the charts can access for plotting and display
    this.resetInteractionTime();
    return this.mapResults(this.bins);
  }

  /**
   * Reset the domain
   * @inheritDoc
   */
  resetDomain(opt_hardReset) {
    if (opt_hardReset) {
      this.deactivateWindow();
      if (this.source) {
        this.source.displayAll();
      }
    }
    super.resetDomain(opt_hardReset);
  }

  /**
   * Adjust and run the histogram when the domain is set
   * @inheritDoc
   */
  setDomain(domain, domainKey, arr, opt_alert) {
    const hist = /** @type {SourceHistogram} */ (this.series[domainKey]);
    const method = hist.getBinMethod();
    if (hist && method && Array.isArray(arr)) {
      domain[domainKey] = arr.slice();
      if (this.isMultiDimensional) {
        if (domain[domainKey][0] instanceof Date || domain[domainKey][1] instanceof Date) {
          // multidim charts need the number, not the date
          domain[domainKey][0] = Number(domain[domainKey][0]);
          domain[domainKey][1] = Number(domain[domainKey][1]);
        }
        this.adjustNumericBinMethod(domain, domainKey, method, 0);
        this.histAdjust(hist, method, domainKey);
      } else {
        this.histAdjust(hist, method, domainKey);
      }

      if (domainKey == this.seriesKeys[0]) {
        hist.updateResults();
        const bins = this.handleEmptyBins(domainKey, hist.getResults());
        this.bins[domainKey] = bins;
      }
      if (opt_alert) {
        this.mapResults(this.bins);
      }
    }
  }

  /**
   * @param {SourceHistogram} hist
   * @param {IBinMethod} method
   * @param {string} domainKey i.e. this.defaultDomain[domainKey]
   */
  histAdjust(hist, method, domainKey) {
    if (this.isMultiDimensional && domainKey == this.seriesKeys[1]) {
      // this is the y value so the x histogram needs to be updated as well
      const series0 = this.series[this.seriesKeys[0]];
      series0.setSecondaryBinMethod(method);
      series0.setForceAllData(this.windowActive);
    } else {
      hist.setBinMethod(method);
      hist.setForceAllData(this.windowActive);
    }

    this.changes.extent = true;
  }

  /**
   * @inheritDoc
   */
  runWindow(id, ranges) {
    const old = this.windowRanges.slice();
    super.runWindow(id, ranges);

    // check for changes before kicking everything off
    if (!old || old.length == 0 || (old && Array.isArray(old) && Array.isArray(old[0]) && Array.isArray(old[1]) &&
          (old[0][0] != this.windowRanges[0][0] || old[1][0] != this.windowRanges[1][0] ||
          old[0][old.length - 1] != this.windowRanges[0][this.windowRanges.length - 1] ||
          old[1][old.length - 1] != this.windowRanges[1][this.windowRanges.length - 1]))) {
      const data = this.getDataFromBins(this.getBinsBetweenMulti(this.seriesKeys, this.windowRanges));
      this.source.setVisibleFeatures(data);
    }
  }

  /**
   * @inheritDoc
   */
  onWindow(event) {
    super.onWindow(event);

    if (this.series && this.series[this.seriesKeys[0]]) {
      this.series[this.seriesKeys[0]].setForceAllData(this.windowActive);
    }
  }

  /**
   * Respond to changes on the histogram
   * @param {GoogEvent} event
   * @protected
   */
  onHistogramChange(event) {
    const request = /** @type {SourceHistogram} */ (event.target);
    let key = request.getBinMethod().getField();
    key = this.fieldMap[key] ? this.fieldMap[key] : key;

    if (key == this.seriesKeys[0]) {
      // update the colors
      this.updateSourceColors();
      const bins = this.handleEmptyBins(key, event.target.getResults());
      this.bins[key] = bins;

      // map only the items that changed
      this.bins[key] = this.mapResults(this.bins, key);
    }
  }

  /**
   * Respond to changes on the source
   * @param {PropertyChangeEvent} event
   * @private
   */
  onSourceChange_(event) {
    if (!this.isDisposed()) {
      const p = event.getProperty();
      switch (p) {
        case SelectionType.ADDED:
        case SelectionType.CHANGED:
        case SelectionType.REMOVED:
        case SelectionType.CLEAR:
        case PropertyChange.CLEARED:
        case PropertyChange.TIME_MODEL:
        case PropertyChange.VISIBLE:
          // make the changes and map the affected bins
          this.extractBins_(event);
          break;
        case PropertyChange.HIGHLIGHTED_ITEMS:
          // delay/retry if collectBins is processing
          if (this.inCollectBinsDebounce_) {
            if (!this.onSourceChangeDelay_.isDisposed()) {
              this.onSourceChangeDelay_
                  .fire(event);
            } // try again in a little bit
          } else {
            // highlight the affected bins
            this.highlightItems(
                this.collectSourceBins_(false, /** @type {Array<ol.Feature>} */ (event.getNewValue()))
            );
          }
          break;
        case PropertyChange.STYLE:
          // delay/retry if collectBins is processing
          if (this.inCollectBinsDebounce_) {
            if (!this.onSourceChangeDelay_.isDisposed()) {
              this.onSourceChangeDelay_
                  .fire(event);
            } // try again in a little bit
          } else {
            // if there was a style change we'll have to update all of the bins
            this.rebuildBins();
          }
          break;
        default:
          break;
      }
    }
  }

  /**
   * @inheritDoc
   */
  getTotalCount() {
    return this.source ? this.source.getFeatureCount() : this.getData().length;
  }

  /**
   * @inheritDoc
   */
  getBinCount(opt_safe) {
    let binCount = 0;

    for (const key in this.bins) {
      const bin = this.bins[key];
      if (!bin) continue; // skip this iteration

      const series = (!olObj.isEmpty(this.series)) ?
        this.series[key] :
        null;
      const method = (series) /** @type {UniqueBinMethod} */ ?
        (series.getBinMethod()) :
        null;
      if (series && method && method.getShowEmptyBins()) {
        // counted this bin the "showEmptyBins" way
        const stats = method.getStatsForBin(bin);
        if (stats != null) binCount += stats.binCountAll;
      } else {
        // counted this bin the non-empty bins ONLY way
        binCount += bin.length;
      }
    }

    return binCount;
  }

  /**
   * Debounce the source events while aggregating all of the bins
   * @param {PropertyChangeEvent} event
   * @private
   * @suppress {accessControls, checkTypes} To allow direct access to feature metadata.
   */
  extractBins_(event) {
    this.inCollectBinsDebounce_ = true;

    const old = /** @type {Array<olFeature>|null} */ (event.getOldValue() || []);
    const neww = /** @type {Array<olFeature>|null} */ (event.getNewValue() || []);
    if (this.changeItems.length) {
      Array.prototype.push.apply(this.changeItems, old);
      Array.prototype.push.apply(this.changeItems, neww);
    } else if (Array.isArray(old)) {
      Array.prototype.push.apply(old, neww);
      this.changeItems = old.slice();
    }

    if (!this.collectBinsDebounce_.isDisposed()) this.collectBinsDebounce_.fire(true);
  }

  /**
   * Collect the bins that need to be operated on, ignore the ones that don't
   * @param {boolean} mapEm
   * @param {Array<olFeature>=} opt_features
   * @return {Array<ColorBin>}
   * @private
   * @suppress {accessControls, checkTypes} To allow direct access to feature metadata.
   */
  collectSourceBins_(mapEm, opt_features) {
    if (!olObj.isEmpty(this.series)) {
      // create a map of bin key to bin
      const binMap = /** @type {Map<number|string, ColorBin>} */ (new Map());
      const series = this.series[this.seriesKeys[0]];
      const method = series.getBinMethod();
      const results = {};
      series.getResults().forEach(function(v) {
        if (v) {
          results[v.key] = v;
        }
      });

      const allVals = opt_features || [];
      if (!(Array.isArray(allVals) && allVals.length)) {
        osArray.removeDuplicates(this.changeItems, allVals);
      }

      let lastBinKey = '';

      if (Array.isArray(allVals)) {
        // check to see if we are dealing with date range bins here
        const dateRangeFlag = method.getBinType() == DateBinMethod.TYPE && series.getBinRanges();

        for (let j = 0; j < allVals.length; j++) {
          const bin = series.featureBins_[allVals[j].id];
          const binKeys = dateRangeFlag ? method.getValue(allVals[j]) : [];

          if (!dateRangeFlag) {
            if (bin && bin.key === lastBinKey) {
              continue;
            } else if (bin) {
              lastBinKey = bin.key;
              binMap.set(bin.key, bin);
            }
          } else {
            for (let i = 0; i < binKeys.length; i++) {
              binMap.set(binKeys[i], results[binKeys[i]]);
            }
          }
        }
      }

      this.changeItems = [];
      const final = Array.from(binMap.values());
      if (mapEm) {
        this.mapResults(final);
      }
      this.inCollectBinsDebounce_ = false;
      return final;
    }

    this.inCollectBinsDebounce_ = false;
    return [];
  }

  /**
   * Filter out calls within small delay for rebuilding bins since the last one is all that matters
   */
  rebuildBins() {
    if (!this.rebuildBinsDelay_.isDisposed()) this.rebuildBinsDelay_.fire();
  }

  /**
   * Rebuild the bins
   * @private
   */
  rebuildBins_() {
    // update the colors
    this.updateSourceColors();

    // remap all the bins
    this.mapResults(this.bins[this.seriesKeys[0]]);
  }

  /**
   * Filter out calls within small delay for highlighting the items since the last one is all that matters
   * @param {Array<ColorBin>} bins
   */
  highlightItems(bins) {
    if (!this.highlightItemsDelay_.isDisposed()) this.highlightItemsDelay_.fire(bins);
  }

  /**
   * Highlight the bin(s) with the item(s) inside
   * @param {Array<ColorBin>} bins
   * @private
   */
  highlightItems_(bins) {
    if (!olObj.isEmpty(this.bins)) {
      // remove all highlight
      const len = this.bins[this.seriesKeys[0]] ? this.bins[this.seriesKeys[0]].length : 0;

      for (let i = 0; i < len; i++) {
        if (this.bins[this.seriesKeys[0]][i]) {
          this.bins[this.seriesKeys[0]][i]['highlight'] = false;
        }
      }

      // add highlight to just the bins we want
      for (let i = 0; i < bins.length; i++) {
        if (bins[i]) {
          bins[i]['highlight'] = true;
        }
      }
      this.mapResults(bins);
    }
  }

  /**
   * @inheritDoc
   */
  select(bins, opt_toggle) {
    for (let i = 0; i < bins.length; i++) {
      opt_toggle && bins[i] && bins[i].items && bins[i].items.length && this.source.isSelectedArray(bins[i].items) ?
            this.source.removeFromSelected(bins[i].items) :
            this.source.addToSelected(bins[i].items);
    }
  }

  /**
   * @inheritDoc
   */
  selectExclusive(bins) {
    this.source.selectNone();
    for (let i = 0; i < bins.length; i++) {
      this.source.addToSelected(bins[i].items);
    }
  }

  /**
   * @inheritDoc
   */
  selectAll() {
    if (this.source) this.source.selectAll();
  }

  /**
   * @inheritDoc
   */
  invertSelection() {
    this.source.invertSelection();
  }

  /**
   * @inheritDoc
   */
  deselect(bins) {
    for (let i = 0; i < bins.length; i++) {
      this.source.removeFromSelected(bins[i].items);
    }
  }

  /**
   * @inheritDoc
   */
  clearSelection() {
    if (this.source) this.source.selectNone();
  }

  /**
   * @inheritDoc
   */
  hideBins(bins, opt_selected) {
    if (opt_selected) {
      this.source.hideSelected();
    } else if (opt_selected === false) {
      this.source.hideUnselected();
    } else {
      this.getDataFromBins(bins);
      this.source.hideFeatures(this.getDataFromBins(bins));
    }
  }

  /**
   * Display all bins
   */
  displayAll() {
    this.deactivateWindow();
    this.source.displayAll();
  }

  /**
   * @inheritDoc
   */
  removeBins(bins, opt_selected) {
    let items = [];
    if (opt_selected) {
      items = this.source.getSelectedItems();
    } else if (opt_selected === false) {
      items = this.source.getUnselectedItems();
    } else {
      items = /** @type {Array<!olFeature>} */ (this.getDataFromBins(bins));
    }
    if (Array.isArray(items) && items.length) {
      this.source.removeFeatures(items);
    }
  }

  /**
   * @inheritDoc
   */
  sort(type) {
    if (this.series) {
      const histogram = this.series[this.seriesKeys[0]];
      let sortFn;

      // clone the bin method so the triple equalities below will work if the method instance came from another
      // window context
      const binMethod = cloneMethod(histogram.getBinMethod());

      if (type == ClickContextEventType.SORT_BY_LABEL) {
        sortFn = histogram.getSortFn() === binMethod.getSortLabelFnAsc() ?
            binMethod.getSortLabelFnDesc() : binMethod.getSortLabelFnAsc();
        histogram.setSortFn(sortFn);
      } else if (type == ClickContextEventType.SORT_BY_COUNT) {
        sortFn = histogram.getSortFn() === binMethod.getSortCountFnAsc() ?
            binMethod.getSortCountFnDesc() : binMethod.getSortCountFnAsc();
        histogram.setSortFn(sortFn);
      }

      this.changes.series = true;
      this.processData();
    }
  }

  /**
   * Manage color on the source
   */
  autoColor() {
    this.series[this.seriesKeys[0]].setColorMethod(ColorMethod.AUTO_COLOR);
  }

  /**
   * Manage color on the source
   */
  autoColorByCount() {
    this.series[this.seriesKeys[0]].setColorMethod(ColorMethod.AUTO_COLOR);
  }

  /**
   * Manage color on the source
   */
  resetColor() {
    this.series[this.seriesKeys[0]].setColorMethod(ColorMethod.RESET);
  }

  /**
   * Manage color on the source
   *
   * @param {boolean=} opt_isBins
   *
   */
  colorSelected(opt_isBins) {
    let color = null;

    if (opt_isBins === true) {
      const histogram = this.series[this.seriesKeys[0]];

      // get the selected bins
      let bins = histogram.getResults().reduce(function(bins, bin) {
        if (bin['sel'] === true) bins.push(bin);
        return bins;
      }, []);

      // if none selected, get the hovered bin
      if (!bins || bins.length == 0) {
        bins = histogram.getResults().reduce(function(bins, bin) {
          if (bin['highlight'] === true) bins.push(bin);
          return bins;
        }, []);
      }

      if (bins && bins.length > 0) {
        color = bins[0]['color']; // grab color off the bin

        launchConfirmColor(function(color) {
          histogram.setColorMethod(ColorMethod.MANUAL, bins, osStyle.toRgbaString(color));
        }, color);
      }
    } else {
      const source = this.source;
      const items = source.getSelectedItems();
      color = osFeature.getFirstColor(items);

      launchConfirmColor(function(color) {
        source.setColor(items, osStyle.toRgbaString(color));
      }, color);
    }
  }

  /**
   * Update the colors from the source when necessary
   *
   * NOTE: this only changes an internal lookup on the colors -- so DON'T cascade/notify; which
   * will loop back here infinitely...
   * @suppress {accessControls, checkTypes} To allow direct access to bin data.
   */
  updateSourceColors() {
    let colors;
    const cm = (this.source) ? this.source.getColorModel() : null;
    const results = (cm) ? cm.getResults() : null;
    const bins = (this.bins) ? this.bins[this.seriesKeys[0]] : null;

    if (results && results.length) {
      // get the colors from the colormodel as hex so the chart can access them
      colors = this.source.getColorModel().getAllBinColors();
    } else if (bins && bins.length) {
      const lookup = {}; // there could be thousands of bins with the same colors over and over -- don't do any color twice

      // get missing the colors out of the folds from external histograms
      colors = this.bins[this.seriesKeys[0]].reduce(function(all, bin) {
        if (bin.colorCounts_) {
          for (const k in bin.colorCounts_) {
            if (!lookup[k]) {
              const label = [histo.OVERRIDE_LABEL, k].join(' ');
              all[label] = k;
              lookup[k] = true;
            }
          }
        }
        return all;
      }, {});
    }

    if (colors) {
      this.colorsArr = Object.keys(colors).map(function(v) {
        return osColor.toHexString(colors[v]);
      });

      osArray.removeDuplicates(this.colorsArr, undefined, function(item) {
        return item;
      });
    } else {
      this.colorsArr = [];
    }
  }

  /**
   * The sub-bins for the color bins as a stack for the chart
   * @param {string} prop the property to use from the bins
   * @return {Array<Object>} colors with counts
   * @suppress {accessControls, checkTypes} To allow direct access to bin data.
   */
  getColorFolds(prop) {
    const arr = [];
    if (this.bins) {
      // iterate over the colors for each bin to get each color count
      const bins = this.bins[this.seriesKeys[0]];
      if (bins && bins.length) {
        const bl = bins.length;
        let cl = this.colorsArr.length;

        // updateSourceColors() is called after changes, so on initial load it hasn't been called
        if (!cl) {
          this.updateSourceColors();
          cl = this.colorsArr.length;
        }

        for (let i = 0; i < bl; i++) {
          let prev = 0;
          for (let j = 0; j < cl; j++) {
            if (bins[i].colorCounts_ && bins[i].colorCounts_[this.colorsArr[j]]) {
              arr.push({
                'key': bins[i][prop],
                'color': this.colorsArr[j],
                'total': bins[i]['count'],
                'val0': prev,
                'val1': prev += bins[i].colorCounts_[this.colorsArr[j]]
              });
            }
          }
        }
      }
    }

    return arr;
  }

  /**
   * @inheritDoc
   */
  getDataStats() {
    // only single series is currently supported for data stats
    if (this.seriesKeys.length === 1) {
      const features = /** @type {Array<olFeature>} */ (this.getData());
      return coreuiChartStats.getFeatureStats(features, this.seriesKeys[0]);
    }

    return coreuiChartStats.getDefaultStats();
  }
}

export default SourceModel;
