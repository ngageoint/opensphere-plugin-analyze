goog.declareModuleId('coreui.chart.vega.base.VegaChartUI');

import '../opsclock/opsclock.js';
import './vegaoptionsui.js';

import ThemeSettingsChangeEvent from 'opensphere/src/os/config/themesettingschangeevent.js';
import RecordField from 'opensphere/src/os/data/recordfield.js';
import * as dispatcher from 'opensphere/src/os/dispatcher.js';
import {getField} from 'opensphere/src/os/feature/feature.js';
import BinMethod from 'opensphere/src/os/histo/binmethod.js';
import {restoreMethod} from 'opensphere/src/os/histo/histo.js';
import UniqueBinMethod from 'opensphere/src/os/histo/uniquebinmethod.js';
import instanceOf from 'opensphere/src/os/instanceof.js';
import {unsafeClone} from 'opensphere/src/os/object/object.js';
import VectorSource from 'opensphere/src/os/source/vectorsource.js';
import {randomString} from 'opensphere/src/os/string/string.js';
import Module from 'opensphere/src/os/ui/module.js';
import ResizeEventType from 'opensphere/src/os/ui/resizeeventtype.js';
import {numerateNameCompare} from 'opensphere/src/os/ui/slick/column.js';
import {apply, removeResize, resize} from 'opensphere/src/os/ui/ui.js';
import {ROOT} from '../../../../tools/tools.js';
import {AbstractComponentCtrl} from '../../../layout/abstractcomponentctrl.js';
import {isActiveComponent} from '../../../layout/layout.js';
import {ChartDispatcher} from '../chartdispatcher.js';
import {ChartRegistry} from '../chartregistry.js';
import {DEFAULT_CHART} from '../charttype.js';
import {Model} from '../data/model.js';
import {SourceModel} from '../data/sourcemodel.js';
import {ChartManager} from './chartmanager.js';
import {EventType} from './eventtype.js';

const Debouncer = goog.require('goog.async.Debouncer');
const dispose = goog.require('goog.dispose');
const {getDocument} = goog.require('goog.dom');
const KeyCodes = goog.require('goog.events.KeyCodes');
const KeyEvent = goog.require('goog.events.KeyEvent');
const KeyHandler = goog.require('goog.events.KeyHandler');
const googObject = goog.require('goog.object');

const {VegaOptions} = goog.requireType('coreui.chart.vega.VegaOptions');
const {AbstractChart} = goog.requireType('coreui.chart.vega.base.AbstractChart');
const {VegaEvent} = goog.requireType('coreui.chart.vega.base.Event');
const {AbstractInteraction} = goog.requireType('coreui.chart.vega.interaction.AbstractInteraction');
const {default: ColumnDefinition} = goog.requireType('os.data.ColumnDefinition');
const {default: IBinMethod} = goog.requireType('os.histo.IBinMethod');


/**
 * The chart tool directive
 * @return {angular.Directive}
 */
export const directive = () => ({
  restrict: 'E',
  replace: true,
  scope: {
    'container': '=',
    'source': '='
  },
  templateUrl: ROOT + 'views/chart/vega/vegachart.html',
  controller: Controller,
  controllerAs: 'ctrl'
});

/**
 * The element tag for the directive.
 * @type {string}
 */
export const directiveTag = 'vegachart';

/**
 * Add the directive to the module
 */
Module.directive('vegachart', [directive]);

/**
 * Controller class for the chart container
 *
 * A vega chart requires an extension of {@link AbstractChart} and a
 * {@link Model} to back it. The chart can also have
 * {@link AbstractInteraction} to setup and tear down event listeners and define how those
 * interactions change the data model. (e.g. open a menu or zoom the chart)
 *
 * In general, when a selection is made or the chart is loaded this class will alert the model that a change is
 * required. The model will compute the new bins and alert the chart that it is time to update. The process is nearly
 * the same for interactions.
 * @unrestricted
 */
export class Controller extends AbstractComponentCtrl {
  /**
   * Constructor.
   * @param {!angular.Scope} $scope The Angular scope.
   * @param {!angular.JQLite} $element The root DOM element.
   * @param {!angular.$timeout} $timeout The Angular timeout service.
   * @ngInject
   */
  constructor($scope, $element, $timeout) {
    super($scope, $element);

    /**
     * @type {angular.Scope}
     */
    this.scope = $scope;

    /**
     * @type {angular.JQLite}
     */
    this.element = $element;

    /**
     * @type {angular.$timeout}
     */
    this.timeout = $timeout;

    /**
     * Keyboard event handler.
     * @type {KeyHandler|undefined}
     * @private
     */
    this.keyHandler_ = undefined;

    /**
     * Delay to debounce chart resize events.
     * @type {Debouncer}
     * @private
     */
    this.resizeDebounce_ = new Debouncer(this.onResizeDebounce_, 100, this);

    /**
     * Resize handler.
     * @type {?function()}
     * @private
     */
    this.resizeFn_ = this.onResize_.bind(this);
    resize(this.element, this.resizeFn_);
    this.element.css('overflow', 'hidden');

    /**
     * ID so charts don't talk to eachother
     * @type {string}
     */
    this.id = randomString();

    /**
     * Map of chart configs by source ID. Note that these are NOT VegaOptions objects, but rather the results
     * of calling persist.
     * @type {Object<string, Object>}
     * @protected
     */
    this.sourceToConfig = {};

    /**
     * @type {angular.JQLite}
     */
    this.chartContainerElement = this.element.find('.js-vega__container');

    /**
     * @type {AbstractChart}
     */
    this.chart = null;

    /**
     * @type {Model}
     */
    this.model = null;

    /**
     * The options for the chart.
     * @type {VegaOptions}
     */
    this['options'] = null;

    const source = this.scope['source'];
    /**
     * The array of available columns for this chart.
     * @type {Array<ColumnDefinition>}
     */
    this['columns'] = source && source.getColumns().sort(numerateNameCompare) || [];

    /**
     * If the chart is valid to show.
     * @type {boolean}
     */
    this['valid'] = false;

    /**
     * If the options button is shown.
     * @type {boolean}
     */
    this['optionsVisible'] = false;

    /**
     * List of available chart types.
     * @type {Array<VegaOptions>}
     */
    this['availableOptions'] = ChartRegistry.getInstance().getChartTypes().sort(ChartRegistry.sortOptionsByPriority);

    /**
     * If the options are open
     * @type {boolean}
     */
    this.optionsOpen = false;

    /**
     * The timeout id for the options visible trigger
     * @type {number}
     */
    this.optionsTimeoutId = -1;

    this.restoreContainerState();

    ChartDispatcher.listen(EventType.UPDATESCOPE, this.onScopeChange, false, this);
    dispatcher.getInstance().listen(ThemeSettingsChangeEvent, this.onThemeChange, false, this);

    this.scope.$watch('source', this.onSourceChange.bind(this));

    this.scope.$on(ResizeEventType.UPDATE_RESIZE, this.onUpdateResize.bind(this));
    this.scope.$on(EventType.CHANGE_TYPE, this.onChartChange.bind(this));
    this.scope.$on(EventType.RESETVIEW, this.onResetView.bind(this));
    this.scope.$on(EventType.OPTIONS_OPEN, this.onOptionsOpen.bind(this));
    this.scope.$on(EventType.OPTIONS, this.onOptionsChange.bind(this));
    this.scope.$on('$destroy', this.dispose.bind(this));

    // set up key handlers
    this.keyHandler_ = new KeyHandler(getDocument());
    this.keyHandler_.listen(KeyEvent.EventType.KEY, this.handleKeyEvent, false, this);
  }

  /**
   * @inheritDoc
   */
  disposeInternal() {
    super.disposeInternal();

    dispose(this.keyHandler_);
    this.keyHandler_ = undefined;

    removeResize(this.element, this.resizeFn_);
    this.destroyChart();

    ChartDispatcher.unlisten(EventType.UPDATESCOPE, this.onScopeChange, false, this);
    dispatcher.getInstance().unlisten(ThemeSettingsChangeEvent, this.onThemeChange, false, this);
    this.scope = null;
  }

  /**
   * Handle keyboard events.
   * @param {KeyEvent} event
   * @protected
   */
  handleKeyEvent(event) {
    const applies = isActiveComponent(this.componentId);

    if (applies) {
      switch (event.keyCode) {
        case KeyCodes.R:
          event.preventDefault();
          event.stopPropagation();
          this.timeout(function() {
            const m = this.model;
            const v = (this.chart) ? this.chart.view : null;
            if (m && v && !m.isDisposed()) {
              const xField = /** @type {string} */ (v.signal('xField'));
              const yField = /** @type {string} */ (v.signal('yField'));
              const xFull = m.defaultDomain[xField];
              const yFull = m.defaultDomain[yField];

              v.signal('xExtent', xFull);
              v.signal('yExtent', yFull);

              m.setDomainsDebounce.fire(m.currentDomain, m.seriesKeys,
                  /** @type {Array<Array>} */ ([v.signal('xExtent'), v.signal('yExtent')]), true);
            }
          }.bind(this));
          break;
        default:
          break;
      }
    }
  }

  /**
   * Handler for updating the resize listener. This is needed due to cases where the resize listener breaks.
   * @protected
   */
  onUpdateResize() {
    removeResize(this.element, this.resizeFn_);
    resize(this.element, this.resizeFn_);
  }

  /**
   * Make a new chart
   * Restore if there is a settings entry for this source/chart combination
   * @protected
   */
  createChart() {
    const source = this.scope['source'];
    const type = this['options'].type || DEFAULT_CHART;

    if (source && type) {
      this.model = instanceOf(source, VectorSource.NAME) ?
          new SourceModel(this.id, source) :
          new Model(this.id, source);

      this.chart = ChartManager.getInstance()
          .createChart(this.id, type, this.chartContainerElement, this.model);

      // use the options to populate the chart
      this.onOptionsChange();
    }
  }

  /**
   * Dispose of the chart
   * @protected
   */
  destroyChart() {
    if (this.chart) {
      this.chart.dispose();
      this.chart = null;
    }
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this['valid'] = false;
  }

  /**
   * Apply scope triggered outside of current scope
   * @param {?angular.Scope.Event} event
   * @param {VegaOptions} options The new chart options.
   */
  onChartChange(event, options) {
    this.destroyChart();

    this['options'] = options;

    this.createChart();
    this.onOptionsChange();
  }

  /**
   * Apply scope triggered outside of current scope
   * @param {VegaEvent} event
   */
  onScopeChange(event) {
    if (!this.isDisposed() && event && event.getId() == this.id) {
      if (this.model) {
        // check the bin count, we need more than 0, but fewer than the maximum allowed by the current chart type
        const count = this.model.getBinCount();
        const maxCount = this.chart.getMaxBinCount();

        this['binCount'] = count;
        this['maxCount'] = maxCount;
        this['valid'] = this.model.windowActive || count > 0;
        this['tooManyBins'] = count > maxCount;
        this['selectionWarning'] = this.model.isMultiDimensional &&
            this.model.getTotalCount() > this.model.selectionMaxCount;
      } else {
        this['valid'] = false;
        this['tooManyBins'] = false;
      }

      apply(this.scope);
    }
  }

  /**
   * The options menu is open or not
   * @param {?angular.Scope.Event} event
   * @param {boolean} newVal
   * @export
   */
  onOptionsOpen(event, newVal) {
    this.optionsOpen = newVal;
    if (!this['optionsVisible']) {
      this.toggleOptionsVisible(newVal);
    }
  }

  /**
   * Triggered on mouseenter/mouseleave
   * @param {boolean} bool
   * @export
   */
  toggleOptionsVisible(bool) {
    if (bool) {
      clearTimeout(this.optionsTimeoutId);
      this['optionsVisible'] = true;
      apply(this.scope);
    } else {
      this.optionsTimeoutId = setTimeout(function() {
        this['optionsVisible'] = this.optionsOpen || false;
        apply(this.scope);
      }.bind(this), 1000);
    }
  }

  /**
   * Initializes or updates the bin method.
   */
  initMethod() {
    const options = this['options'];

    if (options) {
      if (!options.primaryMethodType) {
        options.primaryMethodType = UniqueBinMethod.TYPE;
      }

      options.primaryMethod = this.createMethod(options.primaryMethodType);

      if (this.model && this.model.isMultiDimensional) {
        if (!options.secondaryMethodType) {
          options.secondaryMethodType = UniqueBinMethod.TYPE;
        }

        options.secondaryMethod = this.createMethod(options.secondaryMethodType);
      }
    }
  }

  /**
   * Creates a new bin method.
   * @param {string} type The method type.
   * @return {IBinMethod} The method or null if not found.
   */
  createMethod(type) {
    const methodCtor = BinMethod[type];
    let method = null;

    if (methodCtor) {
      method = new methodCtor();
      method.setValueFunction(getField);
      this.modifyMethod(method);
    }

    return method;
  }

  /**
   * Initializes or updates the bin method.
   */
  updateMethod() {
    const options = this['options'];

    if (options.primaryMethod.getBinType() != options.primaryMethodType) {
      options.primaryMethod = this.createMethod(options.primaryMethodType);
    } else if (options.primaryMethod instanceof UniqueBinMethod) {
      // apply the chart's limitations to the bins
      this.modifyMethod(options.primaryMethod);
    }

    if (!options.primary) {
      options.primary = this['columns'].find(function(col) {
        return col['field'] == RecordField.TIME;
      }) || this['columns'][0];
    }

    if (this.model && this.model.isMultiDimensional) {
      if (options.secondaryMethod.getBinType() != options.secondaryMethodType) {
        options.secondaryMethod = this.createMethod(options.secondaryMethodType);
      } else if (options.secondaryMethod instanceof UniqueBinMethod) {
        // apply the chart's limitations to the bins
        this.modifyMethod(options.secondaryMethod);
      }
    }
  }

  /**
   * Adjusts the settings of a method to be appropriate to the type of chart
   * @param {IBinMethod} method
   */
  modifyMethod(method) {
    if (this.chart) this.chart.modifyMethod(method); // apply any additional restrictions from the chart
  }

  /**
   * Initializes or updates part(s) of the spec that don't handle signals
   */
  updateAxes() {
    this.chart.process(this['options']);
  }

  /**
   * Handles options updates.
   */
  onOptionsChange() {
    if (this.model) {
      this.updateMethod();
      this.updateAxes();

      for (const key in this['options'].signals) {
        this.chart.updateSpecSignal(key, this['options'].signals[key]);
      }

      this.model.setOptions(this['options']);
      this.persistContainerState();
    }
  }

  /**
   * Reset the view
   */
  onResetView() {
    if (this.model && this.model instanceof SourceModel && !this.model.isDisposed()) {
      if (!this.model.source && this.scope['source']) {
        this.destroyChart();
        this.createChart();
      } else if (this.model.source.getFeatureCount() && !this.model.source.getFilteredFeatures().length) {
        // If user uses the chart to hide all of the features there is no way to get back, so give them one here
        this.model.source.displayAll();
      }
      this.model.resetDomainDebounce.fire(true);
    }
  }

  /**
   * Theme change event handler
   * @protected
   */
  onThemeChange() {
    this.destroyChart();
    this.createChart();
  }

  /**
   * Source was changed
   * @param {VectorSource} newVal
   * @param {VectorSource} oldVal
   * @protected
   */
  onSourceChange(newVal, oldVal) {
    // oldVal === newVal on directive initialization, so none of this will be set up yet
    if (oldVal && oldVal !== newVal) {
      // cache settings for each source so they're remembered across source changes
      this.sourceToConfig[oldVal.getId()] = this.persist();
    }

    this['columns'] = newVal && newVal.getColumns().sort(numerateNameCompare) || [];

    if (newVal != oldVal || !this.chart) {
      this.destroyChart();

      if (newVal) {
        const config = this.sourceToConfig[newVal.getId()];
        if (config) {
          this.restore(config);
        } else {
          this.initMethod();
        }

        this.createChart();
      }
    }
  }

  /**
   * Handler for jquery resize on angular element
   * @protected
   */
  onResize_() {
    if (this.chart) {
      this.resizeDebounce_.fire();
    }
  }

  /**
   * Resize the chart
   * @protected
   */
  onResizeDebounce_() {
    this.chart.runChart();
    this.chart.resizeChart();
  }

  /**
   * @inheritDoc
   */
  restoreContainerState() {
    super.restoreContainerState();

    if (!this['options']) {
      // get the default chart config
      this['options'] = ChartRegistry.getInstance().getChartType(DEFAULT_CHART);

      if (this['options']) {
        // default the column to time or to the first column if there isn't a time field
        this['options'].primary = this['columns'].find(function(col) {
          return col['field'] == RecordField.TIME;
        }) || this['columns'][0];

        this.initMethod();
        this.onChartChange(null, this['options']);
      }
    }
  }

  /**
   * @inheritDoc
   */
  persist(opt_to) {
    opt_to = super.persist(opt_to);

    opt_to['type'] = this['options'].type;

    this['availableOptions'].forEach(function(options) {
      options = googObject.clone(options);

      if (options.primaryMethod) {
        options['primaryMethod'] = options.primaryMethod.persist();
      }

      if (options.secondaryMethod) {
        options['secondaryMethod'] = options.secondaryMethod.persist();
      }

      if (options.primary) {
        options['primary'] = options.primary.persist();
      }

      if (options.secondary) {
        options['secondary'] = options.secondary.persist();
      }

      opt_to[options.type] = options;
    });

    return opt_to;
  }

  /**
   * @inheritDoc
   */
  restore(config) {
    this['availableOptions'].length = 0;

    for (const key in config) {
      const options = unsafeClone(config[key]);

      if (typeof options == 'object') {
        // recreate the bin method instances
        let method;
        const primaryConfig = options.primaryMethod;
        if (primaryConfig) {
          method = restoreMethod(primaryConfig);
          if (method) {
            method.setValueFunction(getField);
          }

          options.primaryMethod = method;
        }

        const secondaryConfig = options.secondaryMethod;
        if (secondaryConfig) {
          method = restoreMethod(secondaryConfig);
          if (method) {
            method.setValueFunction(getField);
          }

          options.secondaryMethod = method;
        }

        // restore the columns to the object references in the columns array
        const primary = options.primary;
        if (primary) {
          options.primary = this['columns'].find(function(col) {
            return col['field'] == primary['field'];
          });
        }

        const secondary = options.secondary;
        if (secondary) {
          options.secondary = this['columns'].find(function(col) {
            return col['field'] == secondary['field'];
          });
        }

        if (options.type == config['type']) {
          this['options'] = options;
        }

        this['availableOptions'].push(options);
      }
    }

    if (this['availableOptions'].length == 0) {
      this['availableOptions'] = ChartRegistry.getInstance().getChartTypes().sort(ChartRegistry.sortOptionsByPriority);
    }

    if (this['options']) {
      this.onChartChange(null, this['options']);
    }
  }

  /**
   * Restore the bin method from a method config object.
   * @param {Object} config The method config object.
   * @return {IBinMethod} The restored bin method.
   * @protected
   */
  restoreMethod(config) {
    // update the method from config
    const methodType = config['type'];
    const methodCtor = BinMethod[methodType];
    let method = null;

    if (methodCtor) {
      method = new methodCtor();

      method.restore(config);
    }

    return method;
  }
}
