goog.declareModuleId('tools.ui.CountByContainerUI');

import {Module} from './module.js';
import {ROOT} from '../tools.js';
import {AnalyzeEventType} from '../../mist/analyze/eventtype.js';
import {EXPORT_PROPERTY} from '../../mist/analyze/analyze.js';
import * as CountByMenu from '../../mist/menu/countbymenu.js';
import * as ToolsMenu from '../../mist/menu/toolsmenu.js';

import {inIframe} from 'opensphere/src/os/os.js';
import * as Dispatcher from 'opensphere/src/os/dispatcher.js';
import {getFilterColumns} from 'opensphere/src/os/source/source.js';

const Disposable = goog.require('goog.Disposable');
const {getValueByKeys} = goog.require('goog.object');
const MapContainer = goog.require('os.MapContainer');
const AlertManager = goog.require('os.alert.AlertManager');
const AlertEventSeverity = goog.require('os.alert.AlertEventSeverity');
const {HistoEventType, createFilter} = goog.require('os.data.histo');
const ColorMethod = goog.require('os.data.histo.ColorMethod');
const PayloadEvent = goog.require('os.events.PayloadEvent');
const BaseFilterManager = goog.require('os.filter.BaseFilterManager');
const FilterEvent = goog.require('os.ui.filter.FilterEvent');
const FilterEventType = goog.require('os.ui.filter.FilterEventType');

const ColumnDefinition = goog.requireType('os.data.ColumnDefinition');
const FilterEntry = goog.requireType('os.filter.FilterEntry');
const IFilterable = goog.requireType('os.filter.IFilterable');
const IHistogramUI = goog.requireType('os.ui.IHistogramUI');
const ISource = goog.requireType('os.source.ISource');


/**
 * Template to use when creating cascaded count bys
 * @type {string}
 * @const
 */
export const COUNTBY_CHILD_TEMPLATE = '<countby class="border-left" container="container" source="source" ' +
    'parent="parent"></countby>';

/**
 * Selector for the count by DOM element
 * @type {string}
 * @const
 */
export const COUNTBY_SELECTOR = '.js-countby';

/**
 * Selector for the DOM element containing the count bys
 * @type {string}
 * @const
 */
export const CONTAINER_SELECTOR = '.js-countby-container__countbys';

/**
 * Selector for the DOM element containing cascading scroll pane.
 * @type {string}
 * @const
 */
export const SCROLLPANE_SELECTOR = '.js-countby-container__scrollpane';

/**
 * The `controllerAs` value for the count by container.
 * @type {string}
 * @const
 */
export const COUNTBY_CONTAINER_CTRL = 'cbc';

/**
 * The countbycontainer directive
 * @return {angular.Directive}
 */
export const directive = () => ({
  restrict: 'E',
  replace: true,
  scope: {
    'container': '=',
    'source': '='
  },
  templateUrl: ROOT + 'views/tools/countbycontainer.html',
  controller: Controller,
  controllerAs: COUNTBY_CONTAINER_CTRL
});

/**
 * Add the directive to the module.
 */
Module.directive('countbycontainer', [directive]);

/**
 * Controller function for the countbycontainer directive
 * @unrestricted
 */
export class Controller extends Disposable {
  /**
   * Constructor.
   * @param {!angular.Scope} $scope
   * @param {!angular.JQLite} $element
   * @param {!angular.$compile} $compile
   * @ngInject
   */
  constructor($scope, $element, $compile) {
    super();

    /**
     * @type {?angular.Scope}
     */
    this.scope = $scope;

    /**
     * @type {?angular.JQLite}
     */
    this.element = $element;

    /**
     * @type {?angular.$compile}
     */
    this.compile = $compile;

    /**
     * Shorthand reference to the source powering the countby.
     * @type {ISource}
     */
    this.source = /** @type {ISource} */ ($scope['source']);

    if (!CountByMenu.MENU) {
      CountByMenu.setup();
    }

    if (CountByMenu.MENU) {
      CountByMenu.MENU.listen(AnalyzeEventType.CREATE_FILTER, this.createFilter, false, this);
    }

    $scope.$on('$destroy', this.dispose.bind(this));
  }

  /**
   * @inheritDoc
   */
  disposeInternal() {
    super.disposeInternal();

    if (CountByMenu.MENU) {
      CountByMenu.MENU.unlisten(AnalyzeEventType.CREATE_FILTER, this.createFilter, false, this);
    }

    // clean up any children that were compiled in
    var container = this.element.find(CONTAINER_SELECTOR);
    while (container.children().length > 1) {
      if (!this.remove(true)) {
        // break if a child wasn't removed
        break;
      }
    }

    this.scope = null;
    this.element = null;
  }

  /**
   *
   * @export
   */
  add() {
    if (this.scope && this.element) {
      var scope = this.scope.$new();
      scope['parent'] = this.getLastCountBy_();

      var container = this.element.find(CONTAINER_SELECTOR);
      var cbEl = this.compile(COUNTBY_CHILD_TEMPLATE)(scope);
      container.append(cbEl);

      this.updateChildren_();

      setTimeout((function() {
        if (this.element) {
          var scrollLeft = 5;
          this.element.find(COUNTBY_SELECTOR + ':not(:last-child)').each(function() {
            scrollLeft += $(this).outerWidth();
          });

          var scrollContent = this.element.find(SCROLLPANE_SELECTOR);
          scrollContent.animate({'scrollLeft': scrollLeft}, 500);
        }
      }).bind(this), 250);
    }
  }

  /**
   * @param {boolean=} opt_silent
   * @return {boolean}
   * @export
   */
  remove(opt_silent) {
    if (this.element) {
      var container = this.element.find(CONTAINER_SELECTOR);
      var children = container.children();
      if (children.length > 1) {
        if (!this.isDisposed()) {
          // don't allow cascades that are removed to continue coloring the source. this can lead to unexpected behavior
          this.resetColorMethod_(this.getLastCountBy_());
        }

        var last = children.last();
        var lastScope = last.scope();
        last.remove();

        if (lastScope) {
          lastScope.$destroy();
        }

        if (!opt_silent) {
          this.updateChildren_();
        }

        return true;
      }
    }

    return false;
  }

  /**
   * Reset the color method on a count by if it's currently coloring the source.
   * @param {IHistogramUI} cb The Count By controller
   * @private
   */
  resetColorMethod_(cb) {
    if (cb && this.scope && this.scope['source']) {
      var colorModel = this.scope['source'].getColorModel();
      if (colorModel) {
        var cbHisto = cb.getHistogram();
        var modelHisto = colorModel.getHistogram();
        if (cbHisto && cbHisto == modelHisto) {
          cbHisto.setColorMethod(ColorMethod.RESET);
          AlertManager.getInstance().sendAlert('Count By coloring removed from source.', AlertEventSeverity.INFO);
        }
      }
    }
  }

  /**
   * @private
   */
  updateChildren_() {
    if (this.scope) {
      this.scope.$broadcast(HistoEventType.TOGGLE_CASCADE);
    }
  }

  /**
   * Get the controller for the last Count By element.
   * @return {IHistogramUI}
   * @private
   */
  getLastCountBy_() {
    if (this.element) {
      var container = this.element.find(CONTAINER_SELECTOR);
      var cbEl = container.find(COUNTBY_SELECTOR + ':last-child > :first-child').first();
      if (cbEl) {
        return /** @type {IHistogramUI} */ (cbEl.scope()['countby']) || null;
      }
    }

    return null;
  }

  /**
   * Check if the current source supports filtering.
   * @return {boolean}
   * @export
   */
  isFilterable() {
    if (this.scope && this.scope['source']) {
      try {
        var layer = MapContainer.getInstance().getLayer(this.scope['source'].getId());
        if (layer) {
          return /** @type {IFilterable} */ (layer).isFilterable();
        }
      } catch (e) {
        // not filterable, fall through!
      }
    }

    return false;
  }

  /**
   * Check if a filter can be created from the histogram.
   * @return {boolean}
   * @export
   */
  canFilter() {
    if (this.element) {
      var scope = this.element.find(CONTAINER_SELECTOR + ' ' + COUNTBY_SELECTOR + ' > :first-child')
          .first().scope();
      if (scope && scope['countby']) {
        return ToolsMenu.canCreateHistogramFilter(/** @type {!IHistogramUI} */ (scope['countby']));
      }
    }

    return false;
  }

  /**
   * Check if a cascade can be removed.
   * @return {boolean}
   * @export
   */
  canRemove() {
    if (this.element) {
      var children = this.element.find(CONTAINER_SELECTOR).children();
      return children && children.length > 1;
    }

    return false;
  }

  /**
   * Get the histogram UI's for the container.
   * @param {IHistogramUI=} opt_until The Count By to stop at.
   * @return {!Array<!IHistogramUI>}
   */
  getHistogramUIs(opt_until) {
    var controllers = [];
    var cbs = this.element.find(CONTAINER_SELECTOR + ' ' + COUNTBY_SELECTOR + ' > :first-child');
    for (var i = 0; i < cbs.length; i++) {
      var scope = angular.element(cbs[i]).scope();
      if (scope && scope['countby']) {
        var cb = /** @type {!IHistogramUI} */ (scope['countby']);
        controllers.push(cb);

        if (opt_until && cb === opt_until) {
          break;
        }
      }
    }

    return controllers;
  }

  /**
   * Create a filter entry from Count By's in the container.
   * @param {!Array<!ColumnDefinition>} columns The filter columns.
   * @return {FilterEntry}
   */
  getFilter(columns) {
    var controllers = this.getHistogramUIs();
    if (!controllers.length) {
      AlertManager.getInstance().sendAlert('No Count Bys are available to create a filter.', AlertEventSeverity.ERROR);
      return null;
    }

    return createFilter(controllers, columns);
  }

  /**
   * Create a filter entry from Count By's in the container and launch the filter edit dialog.
   * @param {PayloadEvent<Function>=} opt_event
   * @export
   */
  createFilter(opt_event) {
    var source = this.scope && /** @type {ISource} */ (this.scope['source']);
    if (!source) {
      AlertManager.getInstance().sendAlert('No source selected to filter.', AlertEventSeverity.ERROR);
      return;
    }

    var columns = getFilterColumns(source, false);
    if (!columns || !columns.length) {
      AlertManager.getInstance().sendAlert('Selected data source is not filterable.', AlertEventSeverity.ERROR);
      return;
    }

    var entry = this.getFilter(columns);
    if (entry) {
      var sourceId = source.getId();
      entry.setType(sourceId);
      entry.setTitle('Count By Filter ' + filterCount++);
      const next = function() {
        let editFilterFn;
        if (inIframe()) {
          // for internal analyze, launch the filter edit in the main window
          editFilterFn = /** @type {Function|undefined} */ (getValueByKeys(
              window, EXPORT_PROPERTY, 'functions', 'launchFilterEdit'));
        }

        if (!editFilterFn) {
          // external analyze, or the function wasn't exported
          editFilterFn = BaseFilterManager.edit;
        }

        const winLabel = 'Create Filter for ' + source.getTitle();
        editFilterFn(sourceId, columns, this.onFilterReady.bind(this), entry, winLabel);
      }.bind(this);

      const doNext = opt_event && opt_event instanceof PayloadEvent ? opt_event.getPayload() : next;
      doNext(entry);
    }
  }

  /**
   * Handle user choosing filter title.
   * @param {FilterEntry} entry
   * @export
   */
  onFilterReady(entry) {
    if (entry) {
      var event = new FilterEvent(FilterEventType.ADD_FILTER, undefined, entry);
      Dispatcher.getInstance().dispatchEvent(event);

      var source = this.scope && /** @type {ISource} */ (this.scope['source']);
      var layerName = source ? ('<strong>' + source.getTitle() + '</strong>') : 'the selected data source';
      AlertManager.getInstance().sendAlert('Created a new filter for ' + layerName + '.', AlertEventSeverity.SUCCESS);
    }
  }
}

/**
 * Counter for filters generated from a Count By.
 * @type {number}
 */
let filterCount = 1;
