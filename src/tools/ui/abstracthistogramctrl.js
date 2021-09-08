goog.declareModuleId('tools.ui.AbstractHistogramCtrl');

import * as DateBinUI from '../../mist/ui/data/datebin.js';// eslint-disable-line
import * as NumericBinUI from '../../mist/ui/data/numericbin.js';// eslint-disable-line

import {default as ChartKeys} from '../../coreui/chart/chart.js';
import * as ToolsMenu from '../../mist/menu/toolsmenu.js';
import {Analyze as AnalyzeKeys} from '../../mist/metrics/keys.js';

import {getField} from 'opensphere/src/os/feature/feature.js';
import {apply} from 'opensphere/src/os/ui/ui.js';

const {AbstractComponentCtrl} = goog.require('coreui.layout.AbstractComponentCtrl');
const BinMethod = goog.require('os.histo.BinMethod');
const DateBinMethod = goog.require('os.histo.DateBinMethod');
const DateRangeBinType = goog.require('os.histo.DateRangeBinType');
const Delay = goog.require('goog.async.Delay');
const EventType = goog.require('goog.events.EventType');
const {HistoEventType} = goog.require('os.data.histo');
const KeyEvent = goog.require('goog.events.KeyEvent');
const KeyHandler = goog.require('goog.events.KeyHandler');
const Metrics = goog.require('os.metrics.Metrics');
const NumericBinMethod = goog.require('os.histo.NumericBinMethod');
const PropertyChange = goog.require('os.source.PropertyChange');
const SelectionType = goog.require('os.events.SelectionType');
const Settings = goog.require('os.config.Settings');
const SlickGridEvent = goog.require('os.ui.slick.SlickGridEvent');
const log = goog.require('goog.log');
const {COLOR_ID, findByField, numerateNameCompare} = goog.require('os.ui.slick.column');
const windowSelector = goog.require('os.ui.windowSelector');
const {containsValue} = goog.require('goog.object');
const {getDocument} = goog.require('goog.dom');
const {listen: googListen, unlisten: googUnlisten} = goog.require('goog.events');
const {listen: olListen, unlisten: olUnlisten} = goog.require('ol.events');
const {OFFSET_KEY} = goog.require('os.time');
const IHistogramUI = goog.require('os.ui.IHistogramUI'); // eslint-disable-line

const BrowserEvent = goog.requireType('goog.events.BrowserEvent');
const ColorBin = goog.requireType('os.data.histo.ColorBin');
const ColumnDefinition = goog.requireType('os.data.ColumnDefinition');
const Event = goog.requireType('goog.events.Event');
const IBinMethod = goog.requireType('os.histo.IBinMethod');
const Menu = goog.requireType('os.ui.menu.Menu');
const PropertyChangeEvent = goog.requireType('os.events.PropertyChangeEvent');
const SourceHistogram = goog.requireType('os.data.histo.SourceHistogram');
const VectorSource = goog.requireType('os.source.Vector');


/**
 * Logger for tools.ui.AbstractHistogramCtrl
 * @type {log.Logger}
 */
const LOGGER = log.getLogger('tools.ui.AbstractHistogramCtrl');

/**
 * Default bin method type.
 * @type {string}
 */
const DEFAULT_METHOD = 'Unique';

/**
 * Abstract controller for directives backed by a source histogram.
 * @implements {IHistogramUI}
 * @unrestricted
 */
export class AbstractHistogramCtrl extends AbstractComponentCtrl {
  /**
   * Constructor.
   * @param {!angular.Scope} $scope The Angular scope.
   * @param {!angular.JQLite} $element The root DOM element.
   * @ngInject
   */
  constructor($scope, $element) {
    super($scope, $element);

    /**
     * The logger.
     * @type {log.Logger}
     * @protected
     */
    this.log = LOGGER;

    /**
     * Map of configurations for each source.
     * @type {Object<string, *>}
     * @protected
     */
    this.configMap = {};

    /**
     * The source driving the histogram.
     * @type {VectorSource}
     * @protected
     */
    this.source = null;

    /**
     * Delay to reduce how often we do updates.
     * @type {Delay|undefined}
     * @protected
     */
    this.resultDelay = new Delay(this.onResult, 25, this);

    /**
     * The context menu for the UI.
     * @type {Menu}
     * @protected
     */
    this.contextMenu = null;

    /**
     * If we're already inside an event handler. Used to prevent event loops.
     * @type {boolean}
     * @protected
     */
    this.inEvent = false;

    /**
     * The histogram driving the UI.
     * @type {SourceHistogram|undefined}
     * @protected
     */
    this.histogram = undefined;

    /**
     * @type {!Object<string, !ColorBin>}
     * @protected
     */
    this.cascades = {};

    /**
     * Keyboard event handler.
     * @type {KeyHandler|undefined}
     * @private
     */
    this.keyHandler_ = new KeyHandler(getDocument());
    this.keyHandler_.listen(KeyEvent.EventType.KEY, this.handleKeyEvent, false, this);

    // init scope vars
    this.scope['selectedBins'] = [];
    this.scope['dateRangeToggleVisible'] = false;
    this.scope['column'] = null;
    this.scope['methods'] = this.getBinMethods();
    this.initMethod();

    $scope.$watch('source', this.onSourceSwitch.bind(this));
    $scope.$watch('column', this.onColumnChange.bind(this));
    $scope.$watch('chart.chartCtrlOptions.dateRangeToggleEnabled', this.onDateRangeToggle.bind(this));
    $scope.$watch('dateRangeToggleEnabled', this.onDateRangeToggle.bind(this));

    googListen(this.element[0], EventType.CONTEXTMENU, this.onContextMenu, true, this);
    Settings.getInstance().listen(OFFSET_KEY, this.onOffsetChange_, false, this);

    $scope.$on(EventType.PROPERTYCHANGE, this.updateMethod.bind(this));

    // cascade events
    $scope.$on(HistoEventType.TOGGLE_CASCADE, this.onUpdateCascade.bind(this));
    $scope.$on(HistoEventType.REMOVE_CASCADE, this.onRemoveCascade_.bind(this));
  }

  /**
   * @inheritDoc
   */
  disposeInternal() {
    googUnlisten(this.element[0], EventType.CONTEXTMENU, this.onContextMenu, false, this);
    Settings.getInstance().unlisten(OFFSET_KEY, this.onOffsetChange_, false, this);

    goog.dispose(this.keyHandler_);
    this.keyHandler_ = undefined;

    goog.dispose(this.resultDelay);
    this.resultDelay = undefined;

    this.onSourceSwitch(null, this.scope['source']);

    // TODO: this is a workaround for widgets not cleaning up their scopes properly. since the grid scope won't clean up
    // its equality watcher, it will hold on to a reference to these bins. as a workaround, we empty out the array when
    // destroying. :(
    if (this.scope['bins']) {
      this.scope['bins'].length = 0;
    }

    super.disposeInternal();
  }

  /**
   * Get the bin methods available in the widget.
   * @return {!Object<string, !function(new: IBinMethod)>}
   * @protected
   */
  getBinMethods() {
    return BinMethod;
  }

  /**
   * @inheritDoc
   */
  getColumn() {
    return this.scope ? this.scope['column'] : null;
  }

  /**
   * Gets a bin value
   * @param {ColorBin} bin
   * @param {(ColumnDefinition|string)} col
   * @return {*} the value
   * @protected
   */
  getBinValue(bin, col) {
    if (col['id'] == COLOR_ID) {
      // special column mapping to the bin's color
      return bin.getColor();
    }

    var field = col['field'] || col;
    if (field == 'key') {
      return bin.getKey();
    }

    if (field == 'count') {
      return bin.getCount();
    }

    return bin.getLabel();
  }

  /**
   * Get the default bin method to use.
   * @return {string}
   * @protected
   */
  getDefaultMethod() {
    return DEFAULT_METHOD;
  }

  /**
   * Create a new bin method of the specified type.
   * @param {string} type Bin method type
   * @return {IBinMethod} The bin method
   * @protected
   */
  createMethod(type) {
    var methodConstructor = /** @type {function(new: IBinMethod)} */ (this.scope['methods'][type]);
    var method = new methodConstructor();
    method.setValueFunction(getField);

    return method;
  }

  /**
   * Initalize the bin method to the default.
   * @protected
   */
  initMethod() {
    this.scope['methodType'] = this.getDefaultMethod();
    this.scope['method'] = this.createMethod(this.scope['methodType']);
  }

  /**
   * Update the bin method.
   * @protected
   */
  updateMethod() {
    var column = /** @type {ColumnDefinition} */ (this.scope['column']);
    var method = /** @type {IBinMethod} */ (this.scope['method']);
    method.setField(column ? column['field'] : '');

    // reset cascades when the bin method changes
    this.cascades = {};

    if (this.histogram) {
      this.histogram.setBinMethod(column ? method : null);
      this.histogram.setCascadeValues(null);

      // THIN-6840 and THIN-8484 - grab the sorting function from the bin method
      // Different BIN types may have different sorting functions.
      if (null != this.histogram.getBinMethod()) {
        this.histogram.setSortFn(this.histogram.getBinMethod().getSortLabelFnAsc());
      }

      // check whether the dateRangeToggle should be displayed and set to false if it should be disabled
      try {
        this.scope['dateRangeToggleVisible'] = DateRangeBinType[this.scope['method'].getDateBinType()];
        if (!this.scope['dateRangeToggleVisible']) {
          this.resetDateRangeToggles();
        } else {
          this.scope['dateRangeToggleEnabled'] = this['chartCtrlOptions']['dateRangeToggleEnabled'];
        }
      } catch (e) {
        this.resetDateRangeToggles();
      }
    }

    this.updateConfig();
  }

  /**
   * @inheritDoc
   */
  getHistogram() {
    return this.histogram;
  }

  /**
   * @inheritDoc
   */
  getParent() {
    return this.scope ? /** @type {AbstractHistogramCtrl|undefined} */ (this.scope['parent']) : undefined;
  }

  /**
   * Set the source histogram.
   * @param {SourceHistogram|undefined} histogram The histogram
   * @protected
   */
  setHistogram(histogram) {
    if (this.histogram) {
      // clean up listeners and decrement the reference count. if the count reaches zero, the histogram will dispose
      // itself so do not call dispose here!
      this.histogram.unlisten(EventType.CHANGE, this.onHistogramChange, false, this);
      this.histogram.decrementRefCount();
    }

    this.histogram = histogram;

    if (this.histogram && !this.isDisposed()) {
      this.histogram.listen(EventType.CHANGE, this.onHistogramChange, false, this);
      this.histogram.incrementRefCount();
    }
  }

  /**
   * @inheritDoc
   */
  getSource() {
    return this.source;
  }

  /**
   * Selects all bins in the histogram.
   */
  selectAll() {
    if (this.scope) {
      this.scope['selectedBins'] = this.scope['bins'];
    }
  }

  /**
   * Clears the selection.
   */
  selectNone() {
    if (this.scope) {
      this.scope['selectedBins'] = [];
    }
  }

  /**
   * Inverts the selection.
   */
  invertSelection() {
    if (this.scope) {
      this.scope['selectedBins'] = this.getUnselectedBins();
    }
  }

  /**
   * Sorts by the selected items.
   */
  sortSelection() {
    if (this.scope) {
      this.scope.$broadcast(SlickGridEvent.SORT_SELECTED);
    }
  }

  /**
   * @inheritDoc
   */
  getBins() {
    if (this.scope && this.scope['bins']) {
      return /** @type {!Array<!ColorBin>} */ (this.scope['bins']);
    }

    return [];
  }

  /**
   * @inheritDoc
   */
  hasBins() {
    return this.scope && this.scope['bins'] && this.scope['bins'].length > 0;
  }

  /**
   * @inheritDoc
   */
  getSelectedBins() {
    if (this.scope && this.scope['selectedBins']) {
      return /** @type {!Array<!ColorBin>} */ (this.scope['selectedBins']);
    }

    return [];
  }

  /**
   * @inheritDoc
   */
  hasSelectedBins() {
    return this.scope && this.scope['selectedBins'] && this.scope['selectedBins'].length > 0;
  }

  /**
   * @inheritDoc
   */
  getSelectedItems() {
    return ToolsMenu.getCountByItems(this.getSelectedBins());
  }

  /**
   * @inheritDoc
   */
  getUnselectedBins() {
    // compute unselected bins
    var unselectedBins = [];
    if (this.scope['selectedBins'] && this.scope['bins']) {
      for (var i = 0, n = this.scope['bins'].length; i < n; i++) {
        if (this.scope['selectedBins'].indexOf(this.scope['bins'][i]) === -1) {
          unselectedBins.push(this.scope['bins'][i]);
        }
      }
    } else if (this.scope['bins']) {
      unselectedBins = this.scope['bins'].slice();
    }

    return unselectedBins;
  }

  /**
   * @inheritDoc
   */
  getUnselectedItems() {
    return ToolsMenu.getCountByItems(this.getUnselectedBins());
  }

  /**
   * Gets the UI for a bin method.
   * @param {IBinMethod} method
   * @return {string} The directive
   * @export
   */
  getUi(method) {
    if (method instanceof DateBinMethod) {
      return 'datebin';
    } else if (method instanceof NumericBinMethod) {
      return 'numericbin';
    }

    return '';
  }

  /**
   * Handles changes to the column
   * @protected
   */
  onColumnChange() {
    this.updateMethod();
  }

  /**
   * Handle a context menu event
   * @param {BrowserEvent} event
   * @protected
   */
  onContextMenu(event) {
    if (this.contextMenu) {
      event.preventDefault();
      event.stopPropagation();

      this.contextMenu.open(this.contextMenu, {
        my: 'left top',
        at: 'left+' + event.clientX + ' top+' + event.clientY,
        of: windowSelector.CONTAINER
      }, this);
    }
  }

  /**
   * Handles changes to histogram
   * @param {Event} e
   * @protected
   */
  onHistogramChange(e) {
    if (this.resultDelay) {
      this.resultDelay.start();
    }
  }

  /**
   * Handles method type change from user interaction.
   * @export
   */
  onMethodTypeChange() {
    this.scope['method'] = this.createMethod(this.scope['methodType']);
    this.updateMethod();
    Metrics.getInstance().updateMetric(AnalyzeKeys.COUNT_BY_GROUP_TYPE, 1);
  }

  /**
   * Handle histogram result change.
   * @param {Event=} opt_e
   * @protected
   */
  onResult(opt_e) {
    this.scope['bins'] = this.histogram ? this.histogram.getResults() : [];

    // restore bin cascade settings
    this.restoreCascadedBins();

    apply(this.scope);
  }

  /**
   * Respond to application settings changes
   * @param {PropertyChangeEvent} e
   * @private
   */
  onOffsetChange_(e) {
    this.updateMethod();
  }

  /**
   * Handle change events on the source.
   * @param {PropertyChangeEvent} e
   * @protected
   */
  onSourceChange(e) {
    var p = e.getProperty();
    if (p === PropertyChange.COLUMNS || p === PropertyChange.COLUMN_ADDED) {
      // update column chooser data
      this.updateColumns();
    } else if (p === PropertyChange.STYLE || p === PropertyChange.COLOR) {
      // refresh histogram colors when the source style changes
      this.refreshColors();
    } else if (!!p && containsValue(SelectionType, p) && !this.inEvent) {
      this.clearSelection();
    }
  }

  /**
   * Update colors displayed for the histogram.
   * @protected
   */
  clearSelection() {
    if (this.scope) {
      this.scope['selectedBins'] = [];
      apply(this.scope);
    }
  }

  /**
   * Update colors displayed for the histogram.
   * @protected
   */
  refreshColors() {
    // extend in abstract classes
  }

  /**
   * Handle changes to the source attached to the widget.
   * @param {VectorSource} newVal
   * @param {VectorSource} oldVal
   * @protected
   */
  onSourceSwitch(newVal, oldVal) {
    // oldVal === newVal on directive initialization, so none of this will be set up yet
    if (oldVal && oldVal !== newVal) {
      olUnlisten(oldVal, EventType.PROPERTYCHANGE, this.onSourceChange, this);

      // cache settings for each source so they're remembered across source changes
      this.configMap[this.source.getId()] = this.persist();

      // destroy the current histogram
      this.setHistogram(null);
    }

    this.source = newVal;
    this.updateColumns();

    if (newVal && !this.isDisposed()) {
      olListen(newVal, EventType.PROPERTYCHANGE, this.onSourceChange, this);

      var parent = this.getParent();
      if (parent) {
        // create a cascaded histogram
        this.setHistogram(this.createHistogram(parent.getHistogram()));

        // create a fresh method of the same type, then reset the column on cascaded UI's. we don't know if the cascade
        // will be valid, so reset the cascade.
        this.scope['method'] = this.createMethod(this.scope['methodType']);
        this.scope['column'] = null;
      } else {
        // create a root histogram
        this.setHistogram(this.createHistogram());

        // only restore if we're the first in a cascade, otherwise we'll need to make sure the preceding UI's are still
        // configured
        var config = this.configMap[this.source.getId()];
        if (config) {
          // already have config saved for this source
          this.restore(/** @type {!Object} */ (config));
        } else if (this.scope['column']) {
          // column was matched from the previous source
          this.onColumnChange();
        } else {
          // new source - use defaults
          this.initMethod();
        }
      }
    } else {
      this.scope['bins'] = [];
    }

    this.updateConfig();
  }

  /**
   * Update the displayed columns for the current source.
   * @protected
   */
  updateColumns() {
    if (!this.isDisposed()) {
      if (this.source) {
        var cols = this.source.getColumns();
        cols.sort(numerateNameCompare);
        this.scope['columns'] = cols;

        // try to find a matching column by the user-facing name
        if (this.scope['column']) {
          // TODO: goog.array
          this.scope['column'] = goog.array.find(cols, goog.partial(findByField, 'name',
              this.scope['column']['name']));
        }
      } else {
        this.scope['columns'] = [];
        this.scope['column'] = null;
      }
    }
  }

  /**
   * Get the default config for this widget.
   * @return {Object}
   * @protected
   */
  getDefaultConfig() {
    return {};
  }

  /**
   * Update the widget configuration. This config is saved by the application and will be used when opening/closing the
   * Analyze window.
   * @protected
   */
  updateConfig() {
    this.persistContainerState();
  }

  /**
   * @inheritDoc
   *
   * @todo This assumes the cascaded element is an adjacent sibling in the DOM, and will not work if we change that.
   */
  isCascaded() {
    return !!this.element && this.element.next().length > 0;
  }

  /**
   * @inheritDoc
   *
   * @todo This assumes the cascaded element is an adjacent sibling in the DOM, and will not work if we change that.
   */
  hasCascadedBins() {
    if (this.isCascaded()) {
      for (var i = 0; i < this.scope['bins'].length; i++) {
        if (this.scope['bins'][i].isCascaded) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Cascade all bins to the next count by.
   */
  cascadeAll() {
    if (this.isCascaded()) {
      this.addCascadedBins(this.scope['bins']);
    }
  }

  /**
   * Stop cascading all bins to the next count by.
   */
  cascadeNone() {
    if (this.isCascaded()) {
      this.removeCascadedBins(this.scope['bins']);
      this.cascades = {};
    }
  }

  /**
   * @param {angular.Scope.Event} event
   * @param {ColorBin} bin
   * @private
   */
  onRemoveCascade_(event, bin) {
    event.stopPropagation();

    if (bin) {
      this.removeCascadedBins([bin]);
    }
  }

  /**
   * Sets which bins are cascaded to child histograms.
   * @param {Array<ColorBin>} bins
   */
  setCascadedBins(bins) {
    var cascadeValues = null;
    var oldCascades = this.cascades;
    this.cascades = {};

    if (this.isCascaded() && bins) {
      for (var i = 0; i < bins.length; i++) {
        var bin = bins[i];
        if (bin) {
          bin.isCascaded = true;
          this.cascades[bin['id']] = bin;
          delete oldCascades[bin['id']];

          cascadeValues = cascadeValues || [];
          cascadeValues.push(bin.getKey());
        }
      }
    }

    for (var key in oldCascades) {
      oldCascades[key].isCascaded = false;
    }

    // set the values to cascade so child histograms can filter on them
    if (this.histogram) {
      this.histogram.setCascadeValues(cascadeValues);
    }
  }

  /**
   * Restore cascade settings for all bins.
   * @protected
   */
  restoreCascadedBins() {
    var cascadeValues = null;

    if (this.isCascaded()) {
      // if bins are being cascaded, restore cascade settings
      var bins = this.scope['bins'];
      for (var i = 0; i < bins.length; i++) {
        var bin = bins[i];
        if (bin && this.cascades[bin['id']]) {
          // update the bin reference and mark the bin as cascaded
          this.cascades[bin['id']] = bin;
          bin.isCascaded = true;

          cascadeValues = cascadeValues || [];
          cascadeValues.push(bin.getKey());
        }
      }
    }

    // set the values to cascade so child histograms can filter on them
    if (this.histogram) {
      this.histogram.setCascadeValues(cascadeValues);
    }
  }

  /**
   * Adds bins to the cascade.
   * @param {!Array<!ColorBin>} bins
   * @return {boolean} If the cascaded bins changed
   */
  addCascadedBins(bins) {
    var changed = false;
    if (this.isCascaded() && this.histogram) {
      var cascadeValues = (this.histogram.getCascadeValues() || []).slice();

      for (var i = 0; i < bins.length; i++) {
        var bin = bins[i];
        if (bin && !bin.isCascaded) {
          bin.isCascaded = true;
          this.cascades[bin['id']] = bin;
          cascadeValues.push(bin.getKey());
          changed = true;
        }
      }

      // update the histogram values that should be cascaded to children. only set these values if they actually changed
      // since it will trigger a UI refresh
      if (changed) {
        this.histogram.setCascadeValues(cascadeValues);
      }
    }

    return changed;
  }

  /**
   * Remove bins from the cascade.
   * @param {!Array<!ColorBin>} bins
   * @return {boolean} If the cascaded bins changed
   */
  removeCascadedBins(bins) {
    var changed = false;
    if (this.isCascaded() && this.histogram) {
      var cascadeValues = (this.histogram.getCascadeValues() || []).slice();

      for (var i = 0; i < bins.length; i++) {
        var bin = bins[i];
        if (bin && bin.isCascaded) {
          bin.isCascaded = false;
          delete this.cascades[bin['id']];
          // TODO: goog.array
          goog.array.remove(cascadeValues, bin.getKey());
          changed = true;
        }
      }

      // update the histogram values that should be cascaded to children. only set these values if they actually changed
      // since it will trigger a UI refresh
      if (changed) {
        this.histogram.setCascadeValues(cascadeValues);
      }
    }

    return changed;
  }

  /**
   * @param {angular.Scope.Event} event
   * @protected
   */
  onUpdateCascade(event) {
    // implement if cascading is supported
  }

  /**
   * @inheritDoc
   */
  createXmlFilter(opt_allowAll) {
    var filter = null;
    var method = this.histogram && this.histogram.getBinMethod();
    if (method && !this.isDateMethod()) {
      var filterBins;

      if (this.isCascaded()) {
        // use bins that are being cascaded to the next histogram
        var bins = /** @type {Array<ColorBin>} */ (this.scope['bins']);
        for (var i = 0; i < bins.length; i++) {
          var bin = bins[i];
          if (bin && bin.isCascaded) {
            filterBins = filterBins || [];
            filterBins.push(bin);
          }
        }
      }

      if (!filterBins) {
        // not cascading, so use selected bins
        filterBins = this.getSelectedBins();
      }

      if (!filterBins.length && opt_allowAll) {
        filterBins = this.getBins();
      }

      if (filterBins && filterBins.length > 0) {
        filter = method.exportAsFilter(filterBins);
      } else {
        filter = '';
      }
    }

    return filter;
  }

  /**
   * @inheritDoc
   */
  isDateMethod() {
    // can't filter on dates because it interferes with the application date control
    if (this.histogram) {
      var method = this.histogram.getBinMethod();
      return !!method && method.getBinType() == DateBinMethod.TYPE;
    }

    return false;
  }

  /**
   * Handle chart config changes to the histogram method options.
   * @param {boolean=} opt_value The new value
   * @export
   */
  onDateRangeToggle(opt_value) {
    if (this.histogram && this.scope['method']) {
      // if undefined then keep the value the same
      this.scope['dateRangeToggleEnabled'] = opt_value != null ? opt_value : this.scope['dateRangeToggleEnabled'];
      // set bin ranges on histogram and method
      this.histogram.setBinRanges(this.scope['dateRangeToggleEnabled']);
      this.scope['method'].setArrayKeys(this.scope['dateRangeToggleEnabled']);
      Metrics.getInstance().updateMetric(ChartKeys.CHART_BIN_TIME_RANGES, 1);
      // undo all cascading so the count by doesn't get confused
      this.cascadeNone();
      // update and persist so it will be checked next time too
      this.updateMethod();
    }
  }

  /**
   * reset the data range bin toggles
   */
  resetDateRangeToggles() {
    this.scope['dateRangeToggleEnabled'] = false;
    this.scope['dateRangeToggleVisible'] = false;
  }

  /**
   * @inheritDoc
   */
  persist(opt_to) {
    opt_to = super.persist(opt_to);

    if (!this.isDisposed()) {
      var method = /** @type {IBinMethod} */ (this.scope['method']);
      opt_to['method'] = method.persist();

      if (this.source) {
        opt_to['source'] = this.source.getId();
      }
    }

    return opt_to;
  }

  /**
   * @inheritDoc
   */
  restore(config) {
    if (!this.isDisposed() && config) {
      // update the method from config
      var mConfig = /** @type {Object|undefined} */ (config['method']);
      if (mConfig) {
        this.restoreMethod(mConfig);
      }

      if (config['source']) {
        this.configMap[config['source']] = config;
      }
    }
  }

  /**
   * Restore the histogram method from a method config object.
   * @param {Object} config The method config object.
   * @protected
   */
  restoreMethod(config) {
    if (!this.isDisposed() && config) {
      // update the method from config
      var methodType = config['type'] || this.getDefaultMethod();
      var method = this.createMethod(methodType);
      method.restore(config);
      method.setValueFunction(getField);

      this.scope['methodType'] = methodType;
      this.scope['method'] = method;

      var methodField = config['field'] || undefined;
      if (methodField) {
        this.scope['dateRangeToggleEnabled'] = this.scope['method'].getArrayKeys();
        if (this.histogram) {
          // don't set a method on the histogram unless it has been configured with a column, or it may display unexpected
          // results to the user
          this.histogram.setBinMethod(method);
          this.histogram.setBinRanges(this.scope['method'].getArrayKeys());
        }

        var cols = this.scope['columns'];
        if (cols) {
          for (var i = 0, n = cols.length; i < n; i++) {
            if (cols[i]['field'] == methodField) {
              this.scope['column'] = cols[i];
              break;
            }
          }
        }
      } else {
        this.scope['column'] = null;
      }
    }
  }

  /**
   * Handler for keyboard events
   * @param {KeyEvent} event
   * @protected
   */
  handleKeyEvent(event) {
    // implement for keyboard shortcuts
  }

  /**
   * Gets the histogram from the source.
   * @param {SourceHistogram=} opt_parent Optional parent histogram reference.
   * @return {SourceHistogram} The histogram.
   * @export
   */
  createHistogram(opt_parent) {
    return this.source.createHistogram(opt_parent);
  }
}
