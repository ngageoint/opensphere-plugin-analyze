goog.declareModuleId('coreui.chart.vega.base.VegaOptionsUI');

goog.require('os.ui.UISwitchUI');

import * as statsmenu from '../../chartstatsmenu.js';
import {default as ChartType} from '../charttype.js';
import {default as EventType} from './eventtype.js';
import * as stats from './vegachartstats.js';
import {ROOT} from '../../../../tools/tools.js';

import * as dispatcher from 'opensphere/src/os/dispatcher.js';
import * as ui from 'opensphere/src/os/ui/ui.js';

const Disposable = goog.require('goog.Disposable');
const dispose = goog.require('goog.dispose');
const GoogEventType = goog.require('goog.events.EventType');
const RecordField = goog.require('os.data.RecordField');
const BinMethod = goog.require('os.histo.BinMethod');
const DateBinMethod = goog.require('os.histo.DateBinMethod');
const NumericBinMethod = goog.require('os.histo.NumericBinMethod');
const UniqueBinMethod = goog.require('os.histo.UniqueBinMethod');
const Metrics = goog.require('os.metrics.Metrics');
const GlobalMenuEventType = goog.require('os.ui.GlobalMenuEventType');
const Module = goog.require('os.ui.Module');
const UISwitchEventType = goog.require('os.ui.UISwitchEventType');
const DataType = goog.require('os.xsd.DataType');

const GoogEvent = goog.requireType('goog.events.EventType');
const IBinMethod = goog.requireType('os.histo.IBinMethod');
const Menu = goog.requireType('os.ui.menu.Menu');


/**
 * Selector for the vega options collapse
 * @type {string}
 */
const OPTIONS_COLLAPSE_SELECTOR = '.js-vega-options__collapse';


/**
 * The chart tool directive
 * @return {angular.Directive}
 */
export const directive = () => ({
  restrict: 'E',
  replace: true,

  scope: {
    'availableOptions': '=',
    'options': '=',
    'columns': '='
  },

  templateUrl: ROOT + 'views/chart/vega/vegaoptions.html',
  controller: Controller,
  controllerAs: 'ctrl'
});

/**
 * The element tag for the directive.
 * @type {string}
 */
export const directiveTag = 'vegaoptions';


/**
 * Add the directive to the module
 */
Module.directive('vegaoptions', [directive]);



/**
 * Controller for the vega chart options
 * @unrestricted
 */
class Controller extends Disposable {
  /**
   * Constructor.
   * @param {!angular.Scope} $scope The Angular scope.
   * @param {!angular.JQLite} $element The root DOM element.
   * @param {!angular.$timeout} $timeout The Angular $timeout service.
   * @ngInject
   */
  constructor($scope, $element, $timeout) {
    super();

    /**
     * @type {angular.Scope}
     * @protected
     */
    this.scope = $scope;

    /**
     * @type {angular.JQLite}
     * @protected
     */
    this.element = $element;

    /**
     * @type {angular.$timeout}
     * @protected
     */
    this.timeout = $timeout;

    /**
     * Handler for showing this view.
     * @type {Function}
     */
    this.toggleHandler = this.toggleOptions.bind(this);

    /**
     * Pre-bound updateOptions call.
     * @type {Function}
     */
    this.updateFn = this.updateOptions.bind(this);

    /**
     * Bin statistics menu.
     * @type {Menu}
     */
    this['binStatMenu'] = null;

    /**
     * Data statistics menu.
     * @type {Menu}
     */
    this['dataStatMenu'] = null;

    /**
     * @type {boolean}
     */
    this['expanded'] = false;

    /**
     * The available bin methods.
     * @type {!Object<string, !function(new: IBinMethod)>}
     */
    this['methods'] = BinMethod;

    // hide the configuration by default
    this.timeout(function() {
      const el = this.element.find(OPTIONS_COLLAPSE_SELECTOR);
      if (el && el.length) {
        el.collapse('hide');
      }
    }.bind(this));

    this.scope.$watch('options', this.onOptionsChange.bind(this));

    this.scope.$on(GoogEventType.PROPERTYCHANGE, this.updateFn);
    this.scope.$on('$destroy', this.dispose.bind(this));
  }

  /**
   * @inheritDoc
   */
  disposeInternal() {
    super.disposeInternal();

    dispose(this['dataStatMenu']);
    dispose(this['binStatMenu']);

    this.removeToggleListener();
  }

  /**
   * Handle change to scope options.
   * @param {bitsx.vega.Options} newVal The new options.
   * @param {bitsx.vega.Options} oldVal The old options.
   * @protected
   */
  onOptionsChange(newVal, oldVal) {
    dispose(this['binStatMenu']);
    dispose(this['dataStatMenu']);

    this['binStatMenu'] = null;
    this['dataStatMenu'] = null;

    const options = /** @type {bitsx.vega.Options} */ (newVal);
    if (options) {
      if (stats.supportsStats(options)) {
        options.binStats = options.binStats || {};
        options.dataStats = options.dataStats || {};

        this['binStatMenu'] = statsmenu.create(options.binStats, this.updateFn);
        this['dataStatMenu'] = statsmenu.create(options.dataStats, this.updateFn);
      } else {
        options.binStats = undefined;
        options.dataStats = undefined;
      }
    }
  }

  /**
   * @protected
   */
  addToggleListener() {
    document.addEventListener('click', this.toggleHandler, {'once': true, 'passive': true});
  }

  /**
   * @protected
   */
  removeToggleListener() {
    document.removeEventListener('click', this.toggleHandler, {'once': true, 'passive': true});
  }

  /**
   * @param {!bitsx.vega.Options} options The chart options.
   * @export
   */
  setChart(options) {
    this.scope.$emit(EventType.CHANGE_TYPE, options);
    this.scope.$broadcast(UISwitchEventType.UPDATE);

    Metrics.getInstance().updateMetric(options.metricKey, 1);
  }

  /**
   * Rotates the chart labels.
   * @param {boolean} horizontal indicates the horizontal axis, not necessarily x
   * @param {number=} opt_angle a specific angle to which to set the label; leave undefined to cycle [0, -45, -90]
   * @param {boolean=} opt_update run the signal changes; defaults to true
   * @private
   */
  rotateLabels_(horizontal, opt_angle, opt_update) {
    if (this.scope['options'] && this.scope['options'].signals) {
      const options = this.scope['options'];
      const signals = options.signals;

      const isScatterplot = (options.type == ChartType.SCATTER);
      const prefix = horizontal ? 'xLabel' : 'yLabel';
      const angle = `${prefix}Angle`;
      const align = `${prefix}Align`;

      if (opt_angle != undefined) {
        signals[angle] = opt_angle;
      } else {
        signals[angle] = signals[angle] == 0 ? -45 : signals[angle] == -45 ? -90 : 0;
      }

      // zero on bottom = center
      // -90 on left = center
      // else = right
      signals[align] = ((horizontal && signals[angle] == 0) ||
        (!isScatterplot && !horizontal && signals[angle] == -90)) ?
        'center' :
        'right';

      if (opt_update !== false) this.updateOptions(); // allow null/undefined
    }
  }

  /**
   * Rotates the chart horizontal-axis labels labels.
   * @export
   */
  rotateXLabels() {
    this.rotateLabels_(true);
  }

  /**
   * Rotates the chart vertical-axis labels labels.
   * @export
   */
  rotateYLabels() {
    this.rotateLabels_(false);
  }

  /**
   * Swaps the X and Y axes.
   * @export
   */
  swapAxes() {
    if (this.scope['options'].signals) {
      const options = this.scope['options'];
      const signals = options.signals;

      signals['isChartRotated'] = !signals['isChartRotated'];

      if (options.type == ChartType.SCATTER) {
        const primary = options['primary'];
        const primaryMethod = options['primaryMethod'];
        const primaryMethodType = options['primaryMethodType'];
        options['primary'] = options['secondary'];
        options['primaryMethod'] = options['secondaryMethod'];
        options['primaryMethodType'] = options['secondaryMethodType'];
        options['secondary'] = primary;
        options['secondaryMethod'] = primaryMethod;
        options['secondaryMethodType'] = primaryMethodType;
      }

      this.updateOptions();
    }
  }

  /**
   * Detects the Column data type and smartly sets the value; ONLY when the user changes the column.
   * @param {string|undefined} axis Either 'primary' or 'secondary'
   * @export
   */
  updateColumn(axis) {
    const column = this.scope['options'][axis];
    const immutable = (this
        .scope['options'][axis + 'MethodTypeImmutable'] === true); // allow chart to lock the bin method

    let binType = null;

    if (!immutable && column) {
      binType = null;
      switch (column['type']) {
        case DataType.DECIMAL:
        case DataType.INTEGER:
        case DataType.FLOAT:
          binType = NumericBinMethod.TYPE;
          break;
        case DataType.DATE:
          binType = DateBinMethod.TYPE;
          break;
        default:
          binType = (column['field'] == RecordField.TIME) ?
            DateBinMethod.TYPE :
            UniqueBinMethod.TYPE;
          break;
      }
    }

    if (binType) this.scope['options'][axis + 'MethodType'] = binType;

    this.updateOptions();
  }

  /**
   * Notifies other UIs that option changes were made.
   * @export
   */
  updateOptions() {
    this.scope.$emit(EventType.OPTIONS);
  }

  /**
   * Handler of the reset view button click
   * @export
   */
  resetView() {
    this.scope.$emit(EventType.RESETVIEW);
  }

  /**
   * Gets the UI for a bin method.
   * @param {IBinMethod} method
   * @return {string} The directive
   * @export
   */
  getMethodUi(method) {
    if (method instanceof DateBinMethod) {
      return 'datebin';
    } else if (method instanceof NumericBinMethod) {
      return 'numericbin';
    }

    return '';
  }

  /**
   * If a menu is open.
   * @param {Menu} menu The menu.
   * @return {boolean}
   * @export
   */
  isMenuOpen(menu) {
    return menu.isOpen();
  }

  /**
   * Open a menu.
   * @param {!angular.Scope.Event} event The click event.
   * @param {Menu} menu The menu to open.
   * @export
   */
  openMenu(event, menu) {
    if (menu && !menu.isOpen() && event && event.target) {
      // determine the appropriate menu context
      let context;
      const options = /** @type {bitsx.vega.Options} */ (this.scope['options']);
      if (options) {
        if (menu === this['dataStatMenu']) {
          context = options.dataStats;
        } else if (menu === this['binStatMenu']) {
          context = options.binStats;
        }
      }

      // open the menui
      menu.open(context, {
        my: 'left top+4',
        at: 'left bottom',
        of: event.target
      });

      // don't close the chart options when menu items are selected
      this.removeToggleListener();

      dispatcher.getInstance().listenOnce(GlobalMenuEventType.MENU_CLOSE, () => {
        // if options are still open, restore the toggle listener
        if (this['expanded']) {
          this.addToggleListener();
        }

        // update the button state
        ui.apply(this.scope);
      });
    }
  }

  /**
   * Toggle the vega options open/closed.
   *
   * NOTE: This is called twice when the button is used to close.
   *  - toggleOptions is directly called by the button
   *  - toggleHandler is triggered since an area outside the modal was clicked
   *
   * The button call could be prevented by adjusting the bind, e.g. ng-click="if(!ctrl.expanded) ctrl.toggleOptions()"
   * but that'd add more listeners to the DOM and introduce even more timing issues
   *
   * So in the end, the double-call is slimy, but OK since it consistently removes the "once" listener
   *
   * @param {GoogEvent=} opt_event
   * @export
   */
  toggleOptions(opt_event) {
    if (this.element) {
      let busy = false;

      // click off of the menu to close it (including on the close button)
      const el = this.element.find(OPTIONS_COLLAPSE_SELECTOR);
      const target = opt_event ? $(opt_event.target) : undefined;
      if (el && el.length) {
        busy = el.hasClass('collapsing'); // added/removed by bootstrap-collapse
        if (!busy) {
          if (target && target.closest(OPTIONS_COLLAPSE_SELECTOR).length) {
            el.collapse('show');
            this['expanded'] = true;
          } else if (opt_event === undefined) {
            el.collapse('toggle');
            this['expanded'] = !this['expanded'];
          } else {
            el.collapse('hide');
            this['expanded'] = false;
          }
        }
      }

      // if not already trying to expand or collapse...
      if (!busy) {
        if (this['expanded']) {
          // if menu is open, set up listen once for click outside menu to close it
          this.timeout(() => {
            this.addToggleListener();
          });
        }

        this.scope.$emit(EventType.OPTIONS_OPEN, this['expanded']);
        ui.apply(this.scope);
      }
    }
  }
}


/**
 * Options shown on options creation
 * @type {string}
 * @export
 */
Controller.prototype.DEFAULT_FIELD = '-- NONE --';


export {Controller};
