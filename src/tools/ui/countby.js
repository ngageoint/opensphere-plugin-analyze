goog.declareModuleId('tools.ui.CountByUI');

goog.require('os.ui.UISwitchUI');
goog.require('os.ui.slick.SlickGridUI');

import {registerClass} from 'opensphere/src/os/classregistry.js';
import * as Dispatcher from 'opensphere/src/os/dispatcher.js';
import {isOSX} from 'opensphere/src/os/os.js';
import {MODAL_SELECTOR, apply} from 'opensphere/src/os/ui/ui.js';
import {isActiveComponent} from '../../coreui/layout/layout.js';
import * as CountByMenu from '../../mist/menu/countbymenu.js';
import * as ListMenu from '../../mist/menu/listmenu.js';
import * as metricsKeys from '../../mist/metrics/keys.js';
import {ROOT} from '../tools.js';
import {AbstractHistogramCtrl} from './abstracthistogramctrl.js';
import * as CountByContainerUI from './countbycontainer.js';
import {CountByEventType} from './countbyremovecascade.js';
import {Module} from './module.js';

const DateBinMethod = goog.require('os.histo.DateBinMethod');
const DateRangeBinType = goog.require('os.histo.DateRangeBinType');
const KeyCodes = goog.require('goog.events.KeyCodes');
const Metrics = goog.require('os.metrics.Metrics');
const MenuEvent = goog.require('os.ui.menu.MenuEvent');
const OSEventType = goog.require('os.action.EventType');
const SlickGridEvent = goog.require('os.ui.slick.SlickGridEvent');
const array = goog.require('goog.array');
const asserts = goog.require('goog.asserts');
const formatter = goog.require('os.ui.slick.formatter');
const log = goog.require('goog.log');
const osUiMenuList = goog.require('os.ui.menu.list');
const osUiSlickColumn = goog.require('os.ui.slick.column');

const ColorBin = goog.requireType('os.data.histo.ColorBin');
const ColumnDefinition = goog.requireType('os.data.ColumnDefinition');


/**
 * The count by directive
 * @return {angular.Directive}
 */
export const directive = () => ({
  restrict: 'E',
  replace: true,
  scope: {
    'container': '=',
    'source': '=',
    'parent': '=?'
  },
  templateUrl: ROOT + 'views/tools/countby.html',
  controller: Controller,
  controllerAs: 'countby'
});

/**
 * Add the directive to the tools module
 */
Module.directive('countby', [directive]);

/**
 * Controller class for the source switcher
 * @unrestricted
 */
export class Controller extends AbstractHistogramCtrl {
  /**
   * Constructor.
   * @param {!angular.Scope} $scope The Angular scope.
   * @param {!angular.JQLite} $element The root DOM element.
   * @ngInject
   */
  constructor($scope, $element) {
    super($scope, $element);
    this.log = LOGGER;
    this.contextMenu = CountByMenu.MENU || null;

    /**
     * @type {boolean}
     * @private
     */
    this.userUpdated_ = false;

    // columns for the grid in the count by

    /**
     * @type {ColumnDefinition}
     * @private
     */
    this.colorCol_ = osUiSlickColumn.color();

    /**
     * If the chart date range toggle is enabled
     * @type {boolean}
     */
    this['dateRangeToggleEnabled'] = this.scope['config'] && this.scope['config']['method'] ?
        this.scope['config']['method']['arrayKeys'] : false;

    /**
     * @type {ColumnDefinition}
     * @private
     */
    this.rowCountCol_ = /** @type {ColumnDefinition} */ ({
      'id': 'row',
      'field': 'num',
      'name': '#',
      'width': 40,
      'minWidth': 30,
      'maxWidth': 0,
      'cssClass': 'align-right js-countby__cell--rowcount',
      'headerCssClass': 'align-right js-countby__column--rowcount',
      'formatter': formatter.rowNumber,
      'visible': false
    });

    /**
     * @type {ColumnDefinition}
     * @private
     */
    this.cascadeCol_ = /** @type {ColumnDefinition} */ ({
      'id': 'cascade',
      'field': 'cascade',
      'name': '<i class="fa fa-arrow-right" title="If the bin should be cascaded to the next Count By"/>',
      'resizeable': false,
      'sortable': true,
      'visible': false,
      'width': 35,
      'minWidth': 35,
      'maxWidth': 35,
      'cssClass': 'align-center js-countby__cell--cascade',
      'headerCssClass': 'align-center js-countby__column--cascade',
      'formatter': formatter.columnFormatter
    });

    $scope['gridCols'] = [
      this.rowCountCol_,
      this.colorCol_,
      {
        'id': 'label',
        'field': 'label',
        'name': 'Label',
        'sortable': true,
        'sortField': 'key',
        'headerCssClass': 'js-countby__column--label',
        'formatter': formatter.columnActionFormatter
      }, {
        'id': 'count',
        'field': 'count',
        'name': 'Count',
        'sortable': true,
        'width': 40,
        'cssClass': 'align-right js-countby__cell--count',
        'headerCssClass': 'align-right js-countby__column--count'
      },
      this.cascadeCol_
    ];

    // options for the grid in the count by
    $scope['gridOptions'] = {
      'dataItemColumnValueExtractor': this.getBinValue.bind(this),
      'dataItemColumnSortValueExtractor': this.getSortValue.bind(this),
      'enableColumnReorder': false,
      'forceFitColumns': true,
      'multiColumnSort': false,
      'multiSelect': true,
      'useRowRenderEvents': true
    };

    $scope.$watch('selectedBins', this.onSelectionChange.bind(this));
    $scope.$on(CountByEventType.REMOVE_CASCADE, this.onRemoveCascadeClick_.bind(this));
    $scope.$on(SlickGridEvent.HIGHLIGHT_CHANGE, this.onHighlightChange_.bind(this));
    $scope.$on('userInteraction', this.onUserInteraction.bind(this));

    // init from the container state
    this.restoreContainerState();
  }

  /**
   * @inheritDoc
   */
  getBinValue(bin, col) {
    var field = col['field'] || col;
    if (field == 'cascade') {
      return bin.isCascaded ? CASCADE_TEMPLATE : '';
    }

    return super.getBinValue(bin, col);
  }

  /**
   * Get the enclosing count by container.
   * @return {CountByContainerUI.Controller}
   */
  getContainer() {
    if (this.element) {
      var parentScope = this.element.parent().scope();
      if (parentScope && parentScope[CountByContainerUI.COUNTBY_CONTAINER_CTRL]) {
        return /** @type {CountByContainerUI.Controller} */ (parentScope[CountByContainerUI.COUNTBY_CONTAINER_CTRL]);
      }
    }

    return null;
  }

  /**
   * Gets a bin value
   * @param {ColorBin} bin
   * @param {(ColumnDefinition|string)} col
   * @return {*} the value
   * @protected
   */
  getSortValue(bin, col) {
    var field = col['field'] || col;
    if (field == 'cascade') {
      return bin.isCascaded;
    }

    return this.getBinValue(bin, col);
  }

  /**
   * @inheritDoc
   */
  onColumnChange() {
    this.updateLabelColumn_();

    super.onColumnChange();
    Metrics.getInstance().updateMetric(metricsKeys.Analyze.COUNT_BY_GROUP_COLUMN, 1);
  }

  /**
   * Updates the label column with the new column name
   * @private
   */
  updateLabelColumn_() {
    // update the header for the label column
    var column = this.scope && this.scope['column'] || null;
    var cols = array.clone(this.scope['gridCols']);
    for (var i = 0, n = cols.length; i < n; i++) {
      var col = cols[i];

      if (col['id'] == 'label') {
        col['name'] = column ? column['name'] : 'Label';
        break;
      }
    }

    this.scope['gridCols'] = cols;
  }

  /**
   * @inheritDoc
   */
  onResult(opt_e) {
    super.onResult(opt_e);

    // invalidate the grid so the colors/cascades update
    this.scope.$broadcast(SlickGridEvent.INVALIDATE_ROWS);
  }

  /**
   * Handle cascade remove button click.
   * @param {angular.Scope.Event} event The event
   * @param {!ColorBin} bin
   * @private
   */
  onRemoveCascadeClick_(event, bin) {
    asserts.assert(bin != null, 'cascade remove bin is not defined');

    if (bin) {
      // stop cascading the bin
      this.removeCascadedBins([bin]);
    } else {
      log.error(this.log, 'Cascade remove clicked, but no bin present');
    }
  }

  /**
   * @inheritDoc
   */
  addCascadedBins(bins) {
    var changed = super.addCascadedBins(bins);

    // if the cascaded bins changed, trigger a row re-render to update the cascade UI
    if (changed) {
      this.scope.$broadcast(SlickGridEvent.INVALIDATE_ROWS);
    }

    return changed;
  }

  /**
   * @inheritDoc
   */
  removeCascadedBins(bins) {
    var changed = super.removeCascadedBins(bins);

    // if the cascaded bins changed, trigger a row re-render to update the cascade UI
    if (changed) {
      this.scope.$broadcast(SlickGridEvent.INVALIDATE_ROWS);
    }

    return changed;
  }

  /**
   * @inheritDoc
   */
  onUpdateCascade(event) {
    if (this.scope && this.element) {
      var showCascade = this.isCascaded();
      if (this.cascadeCol_['visible'] != showCascade) {
        if (showCascade) {
          if (!goog.object.isEmpty(this.cascades)) {
            this.restoreCascadedBins();
          } else {
            // if enabling cascade, set the cascade from currently selected bins
            this.setCascadedBins(this.scope['selectedBins']);
          }
        } else {
          // disable cascade
          this.setCascadedBins(null);
        }

        this.cascadeCol_['visible'] = showCascade;
        this.scope.$broadcast(SlickGridEvent.INVALIDATE_COLUMNS);
      }
    }
  }

  /**
   * @inheritDoc
   */
  refreshColors() {
    this.scope['bins'] = this.histogram ? this.histogram.getResults() : [];
    this.scope.$broadcast(SlickGridEvent.INVALIDATE_ROWS);
  }

  /**
   * Handles bin selection changes made within the count by. External changes are ignored by this handler.
   * @param {angular.Scope.Event} event
   * @param {ColorBin} bin
   * @private
   */
  onHighlightChange_(event, bin) {
    if (this.source) {
      var items = bin && bin.getItems();
      this.source.setHighlightedItems(items && items.length > 0 ? items : null);
    }
  }

  /**
   * Set flag to indicate the user changed the selection.
   */
  onUserInteraction() {
    this.userUpdated_ = true;
  }

  /**
   * @inheritDoc
   */
  selectAll() {
    this.onUserInteraction();
    super.selectAll();
  }

  /**
   * @inheritDoc
   */
  selectNone() {
    this.onUserInteraction();
    super.selectNone();
  }

  /**
   * @inheritDoc
   */
  invertSelection() {
    this.onUserInteraction();
    super.invertSelection();
  }

  /**
   * @inheritDoc
   */
  sortSelection() {
    this.onUserInteraction();
    super.sortSelection();
  }

  /**
   * Determine if we should reset the selection on the source.
   * @param {Array<ColorBin>} newVal
   * @param {Array<ColorBin>} oldVal
   * @return {boolean} If the selection should be reset
   * @private
   */
  shouldResetSelection_(newVal, oldVal) {
    // If the user requested an update, update
    if (!this.userUpdated_) {
      // If the arrays are null, we are initializing
      if (!newVal || !oldVal) {
        return false;
      }

      // Does new val has more items
      if (newVal.length > oldVal.length) {
        return true;
      }

      // Are Items are different
      for (var i = 0; i < newVal.length; i++) {
        // If a single newVal isnt found in the oldVal.
        // The items are different and we want to re-select
        var found = array.findIndex(oldVal, function(val) {
          return newVal[i].id == val.id;
        }) != -1;
        if (!found) {
          return true;
        }
      }
    }

    return true;
  }

  /**
   * Handles bin selection changes made within the count by. External changes are ignored by this handler.
   * @param {Array<ColorBin>} newVal
   * @param {Array<ColorBin>} oldVal
   */
  onSelectionChange(newVal, oldVal) {
    if (newVal && !this.inEvent && this.shouldResetSelection_(newVal, oldVal)) {
      this.inEvent = true;

      if (this.userUpdated_ && this.source && isActiveComponent(this.componentId)) {
        // WORKAROUND: Sweet, sometimes the newVal set of bins doesnt contain items.
        // Thats why we have to fire the result delay and re-lookup the selected bins.
        // The real fix we need to figure out how do we get bins without items.
        // Seems like a race condition in crossfilter?
        if (this.resultDelay && this.resultDelay.isActive()) {
          this.resultDelay.fire();
          var newValWithItems = [];
          array.forEach(newVal, (bin) => {
            var binWithItems = array.find(this.scope['bins'], function(scopeBin) {
              return scopeBin.id == bin.id;
            });
            if (binWithItems) {
              newValWithItems.push(binWithItems);
            }
          });
          newVal = newValWithItems;
        }

        var items = null;
        for (var i = 0, n = newVal.length; i < n; i++) {
          var bin = newVal[i];
          if (bin) {
            var list = bin.getItems();
            items = items ? items.concat(list) : list;
          }
        }

        // cascade user-selected bins
        this.addCascadedBins(newVal);

        this.source.setSelectedItems(items);
      }
    }

    this.inEvent = false;
    this.userUpdated_ = false;
  }

  /**
   * Initiate row copy in the grid.
   */
  copyRows() {
    this.scope.$broadcast(SlickGridEvent.COPY_ROWS, Controller.binToText);
  }

  /**
   * Toggles a color column on the grid
   * @param {boolean=} opt_switch True for on, false for off
   */
  toggleColor(opt_switch) {
    this.colorCol_['visible'] = opt_switch !== undefined ? opt_switch : !this.colorCol_['visible'];
    this.updateConfig();

    this.scope.$broadcast(SlickGridEvent.INVALIDATE_COLUMNS);
  }

  /**
   * Toggles a row count column on the grid
   * @param {boolean=} opt_switch True for on, false for off
   */
  toggleRowCount(opt_switch) {
    this.rowCountCol_['visible'] = opt_switch !== undefined ? opt_switch : !this.rowCountCol_['visible'];
    this.updateConfig();

    this.scope.$broadcast(SlickGridEvent.INVALIDATE_COLUMNS);
  }

  /**
   * Determine whether overlapping date range binning is possible
   * @return {boolean}
   * @export
   */
  ifDateRanges() {
    return this.scope &&
        this.scope['method'] &&
        this.scope['method'] instanceof DateBinMethod &&
        DateRangeBinType[this.scope['method'].getDateBinType()] &&
        !this.isCascaded();
  }

  /**
   * @inheritDoc
   */
  persist(opt_to) {
    opt_to = super.persist(opt_to);
    opt_to['showColor'] = this.colorCol_['visible'];
    opt_to['showRowCount'] = this.rowCountCol_['visible'];

    return opt_to;
  }

  /**
   * @inheritDoc
   */
  restore(config) {
    this.toggleColor(config['showColor']);
    this.toggleRowCount(config['showRowCount']);

    super.restore(config);
    this.updateLabelColumn_();
  }

  /**
   * Gets the status
   * @return {string}
   * @export
   */
  getStatus() {
    var msg = '';

    if (!this.isDisposed()) {
      var selected = this.scope['selectedBins'];
      var bins = this.scope['bins'];

      if (selected && selected.length > 0) {
        msg += 'Selected ' + selected.length + ' of ';
      }

      if (bins && bins.length > 0) {
        msg += bins.length + ' bin' + (bins.length != 1 ? 's' : '');
      } else {
        msg = '<i class="fa fa-warning text-warning"></i>&nbsp;';

        if (!this.source) {
          msg += 'Please choose a data source.';
        } else if (!this.scope['column']) {
          msg += 'Please choose a column.';
        } else if (this.element.prev().length > 0) {
          msg += 'Please select data in the previous Count By.';
        } else {
          msg += 'There is no data in the selected data source.';
        }
      }
    }

    return msg;
  }

  /**
   * @inheritDoc
   */
  handleKeyEvent(event) {
    var ctrlOr = isOSX() ? event.metaKey : event.ctrlKey;
    var applies = isActiveComponent(this.componentId);

    if (!document.querySelector(MODAL_SELECTOR) && applies) {
      switch (event.keyCode) {
        case KeyCodes.DELETE:
          // this is an internal event in the list tool, so sending via the generic Dispatcher
          var evt = new MenuEvent(ListMenu.PREFIX + OSEventType.REMOVE, this.scope['source']);
          Dispatcher.getInstance().dispatchEvent(evt);
          break;
        case KeyCodes.A:
          if (ctrlOr) {
            this.selectAll();
            apply(this.scope);
          }
          break;
        case KeyCodes.ESC:
          var evt = new MenuEvent(OSEventType.DESELECT, this.scope['source']);
          osUiMenuList.handleListEvent(evt);
          break;
        case KeyCodes.I:
          if (ctrlOr) {
            event.preventDefault();
            this.invertSelection();
            apply(this.scope);
          }
          break;
        case KeyCodes.G:
          if (ctrlOr) {
            event.preventDefault();
            // this is an internal event in the list tool, so sending via the generic Dispatcher
            var evt = new MenuEvent(ListMenu.PREFIX + OSEventType.GOTO, this.scope['source']);
            Dispatcher.getInstance().dispatchEvent(evt);
          }
          break;
        default:
          break;
      }
    } else {
      // since the event wasn't on this widget, make sure the user update flag is false
      this.userUpdated_ = false;
    }
  }

  /**
   * Copy a histogram bin to text.
   * @param {ColorBin} bin The bin.
   * @return {string} The text string.
   */
  static binToText(bin) {
    return bin.getLabel() + ',' + bin.getCount();
  }
}

/**
 * Class name
 * @type {string}
 */
export const NAME = 'tools.ui.CountByCtrl';
registerClass(NAME, Controller);

/**
 * Logger.
 * @type {log.Logger}
 */
const LOGGER = log.getLogger('tools.ui.CountByUI');

/**
 * The HTML template used for cascaded rows.
 * @type {string}
 */
export const CASCADE_TEMPLATE =
    '<div class="cascade-bin">' +
    '<cascaderemove></cascaderemove>' +
    '&nbsp;' +
    '<i class="fa fa-arrow-right text-success" ' +
        'title="This bin is being included in the next Count By and created filters"></i>' +
    '</div>';
