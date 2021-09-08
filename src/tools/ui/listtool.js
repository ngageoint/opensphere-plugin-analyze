goog.declareModuleId('tools.ui.ListToolUI');

goog.require('os.ui.SliderUI');
goog.require('os.ui.SourceGridUI');

import {Module} from './module.js';
import {ROOT} from '../tools.js';
import * as ListMenu from '../../mist/menu/listmenu.js';
import {Analyze as AnalyzeKeys} from '../../mist/metrics/keys.js';

import {isOSX} from 'opensphere/src/os/os.js';
import * as Dispatcher from 'opensphere/src/os/dispatcher.js';
import {MODAL_SELECTOR, apply} from 'opensphere/src/os/ui/ui.js';

const Delay = goog.require('goog.async.Delay');
const {getDocument} = goog.require('goog.dom');
const GoogEventType = goog.require('goog.events.EventType');
const KeyCodes = goog.require('goog.events.KeyCodes');
const KeyEvent = goog.require('goog.events.KeyEvent');
const KeyHandler = goog.require('goog.events.KeyHandler');
const {containsValue} = goog.require('goog.object');
const {listen: olListen, unlisten: olUnlisten} = goog.require('ol.events');

const AbstractComponentCtrl = goog.require('coreui.layout.AbstractComponentCtrl');
const layout = goog.require('coreui.layout');
const ActionEventType = goog.require('os.action.EventType');
const SelectionType = goog.require('os.events.SelectionType');
const Metrics = goog.require('os.metrics.Metrics');
const {isPrimitive} = goog.require('os.object');
const operator = goog.require('os.operator');
const PropertyChange = goog.require('os.source.PropertyChange');
const MenuEvent = goog.require('os.ui.menu.MenuEvent');
const OsListMenu = goog.require('os.ui.menu.list');
const ColumnEventType = goog.require('os.ui.slick.ColumnEventType');

const GoogEvent = goog.requireType('goog.events.Event');
const Menu = goog.requireType('os.ui.menu.Menu');
const PropertyChangeEvent = goog.requireType('os.events.PropertyChangeEvent');
const VectorSource = goog.requireType('os.source.Vector');


/**
 * The list tool directive
 * @return {angular.Directive}
 */
export const directive = () => ({
  restrict: 'E',
  replace: true,

  scope: {
    'container': '=',
    'source': '='
  },

  templateUrl: ROOT + 'views/tools/listtool.html',
  controller: Controller,
  controllerAs: 'list'
});

/**
 * Add the directive to the tools module
 */
Module.directive('listtool', [directive]);

/**
 * Controller class for the list tool
 * @unrestricted
 */
export class Controller extends AbstractComponentCtrl {
  /**
   * Constructor.
   * @param {!angular.Scope} $scope The Angular scope.
   * @param {!angular.JQLite} $element The root DOM element.
   * @ngInject
   */
  constructor($scope, $element) {
    super($scope, $element);

    /**
     * Menu for the source grid.
     * @type {?Menu}
     */
    this['contextMenu'] = ListMenu.MENU;

    /**
     * @type {string}
     */
    this['title'] = 'Search';

    /**
     * @type {boolean}
     */
    this['searchInProgress'] = false;

    /**
     * @type {string}
     */
    this['quickFilterTerm'] = '';

    /**
     * If data should be filtered to selected only.
     * @type {boolean}
     * @private
     */
    this['selectedOnly'] = false;

    /**
     * @type {number}
     */
    this['rowHeight'] = 0;

    /**
     * @type {number}
     */
    this['rowStep'] = 1;

    /**
     * Delay to debounce search calls.
     * @type {Delay|undefined}
     * @private
     */
    this.searchDelay_ = new Delay(this.onSearch_, 100, this);

    /**
     * Keyboard event handler.
     * @type {KeyHandler|undefined}
     * @private
     */
    this.keyHandler_ = new KeyHandler(getDocument());
    this.keyHandler_.listen(KeyEvent.EventType.KEY, this.handleKeyEvent_, false, this);

    // init from the container state
    this.restoreContainerState();
    this.updateRowHeight_();

    $scope.$watch('list.rowStep', this.onRowStepChange_.bind(this));
    $scope.$watch('list.selectedOnly', this.persistContainerState.bind(this));
    $scope.$watch('source', this.onSourceSwitch.bind(this));
  }

  /**
   * @inheritDoc
   */
  disposeInternal() {
    goog.dispose(this.keyHandler_);
    this.keyHandler_ = undefined;

    goog.dispose(this.searchDelay_);
    this.searchDelay_ = undefined;

    this.onSourceSwitch(null, this.scope['source']);

    super.disposeInternal();
  }

  /**
   * Updates the row height based on the step
   * @private
   */
  onRowStepChange_() {
    this.updateRowHeight_();
    this.persistContainerState();
  }

  /**
   * Updates the row height based on the step
   * @private
   */
  updateRowHeight_() {
    this['rowHeight'] = (Controller.DEFAULT_ROW_HEIGHT * this['rowStep']) + 4;
  }

  /**
   * Handles changes to the source
   * @param {VectorSource} newVal
   * @param {VectorSource} oldVal
   */
  onSourceSwitch(newVal, oldVal) {
    if (oldVal && newVal !== oldVal) {
      olUnlisten(oldVal, GoogEventType.PROPERTYCHANGE, this.onSourceChange_, this);
    }

    this.source_ = newVal;

    if (newVal) {
      olListen(newVal, GoogEventType.PROPERTYCHANGE, this.onSourceChange_, this);
    }
  }

  /**
   * Handles change events on the source
   * @param {PropertyChangeEvent} e
   * @private
   */
  onSourceChange_(e) {
    var p = e.getProperty();
    if (p === PropertyChange.FEATURES || p === PropertyChange.FEATURE_VISIBILITY || containsValue(SelectionType, p)) {
      // refresh status if the features or selection changes
      // FIXME: the timeout is a workaround for the OL3 listener bug (removing listeners while handling that same event)
      apply(this.scope, 0);
    }
  }

  /**
   * Handle keyboard events.
   * @param {KeyEvent} event
   * @private
   */
  handleKeyEvent_(event) {
    var ctrlOr = isOSX() ? event.metaKey : event.ctrlKey;
    var applies = layout.isActiveComponent(this.componentId);

    if (!document.querySelector(MODAL_SELECTOR) && applies) {
      switch (event.keyCode) {
        case KeyCodes.DELETE:
          // this is an internal event in the list tool, so sending via the generic Dispatcher
          var evt = new MenuEvent(ListMenu.PREFIX + ActionEventType.REMOVE, this.scope['source']);
          Dispatcher.getInstance().dispatchEvent(evt);
          break;
        case KeyCodes.A:
          if (ctrlOr) {
            var evt = new MenuEvent(ActionEventType.SELECT, this.scope['source']);
            OsListMenu.handleListEvent(evt);
          }
          break;
        case KeyCodes.ESC:
          var evt = new MenuEvent(ActionEventType.DESELECT, this.scope['source']);
          OsListMenu.handleListEvent(evt);
          break;
        case KeyCodes.I:
          if (ctrlOr) {
            event.preventDefault();
            var evt = new MenuEvent(ActionEventType.INVERT, this.scope['source']);
            OsListMenu.handleListEvent(evt);
          }
          break;
        case KeyCodes.G:
          if (ctrlOr) {
            event.preventDefault();
            // this is an internal event in the list tool, so sending via the generic Dispatcher
            var evt = new MenuEvent(ListMenu.PREFIX + ActionEventType.GOTO, this.scope['source']);
            Dispatcher.getInstance().dispatchEvent(evt);
          }
          break;
        default:
          break;
      }
    }
  }

  /**
   * Gets the help text for the search.
   * @return {string}
   * @export
   */
  getHelpText() {
    return 'Searches the data by the provided value or expression. ' +
        'A single value will be searched for in the entire row. ' +
        'Alternatively, an expression can be provided with the column name and any of these operators: ' +
        '&lt; &lt;= = != &gt;= &gt; ~ !~';
  }

  /**
   * Clears the selection
   * @export
   */
  clearQuickFilter() {
    this['quickFilterTerm'] = '';
    this.doQuickFilter();
  }

  /**
   * kicks off the filter search
   * @export
   */
  doQuickFilter() {
    this['searchInProgress'] = true;
    this.searchDelay_.start();
  }

  /**
   * Run the filter for the list tool
   * @private
   */
  onSearch_() {
    var items = [];
    if (this['quickFilterTerm']) {
      var text = goog.string.trim(this['quickFilterTerm']);

      if (this.source_ != null && text !== null && text !== '') {
        apply(this.scope);
        var features = this.source_.getFilteredFeatures();

        // is it a column comparison?
        var columSpecified = false;
        var useCol;
        var exp;
        var cmprTxt = '';
        var regExp = '<|<=|=|!=|>|>=|~|!~';
        var input = text.split(' ');
        // does it split to 3?
        if (input.length === 3) {
          useCol = input[0];
          exp = input[1];
          cmprTxt = input[2];

          // is there a comparison operator on the middle term (and not elsewhere)?
          var find1 = useCol.search(regExp);
          var find2 = exp.search(regExp);
          var find3 = cmprTxt.search(regExp);
          if (find1 === -1 && find3 === -1 && find2 !== -1) {
            columSpecified = true;
          }
        }

        // get visible columns and ignore hidden ones
        var visibleCols = [];
        var cols = this.source_.getColumnsArray();
        for (var i = 0; i < cols.length; i++) {
          if (cols[i]['visible']) {
            visibleCols.push(cols[i]['field']);
          }
        }

        if (!columSpecified) {
          for (var featureIndex = 0; featureIndex < features.length; featureIndex++) {
            for (var keyIndex = 0; keyIndex < visibleCols.length; keyIndex++) {
              var colData = features[featureIndex].values_[visibleCols[keyIndex]];
              if (colData != null && isPrimitive(colData) &&
                  colData.toString().toLowerCase().indexOf(text.toLowerCase()) > -1) {
                items.push(features[featureIndex]);
                break;
              }
            }
          }
        } else {
          // appease closure
          if (!useCol || !exp || !cmprTxt) {
            return;
          }

          // match the case of the column searched to the column name if a match exists, assumes unique column names!
          var foundIt = false;
          useCol = useCol.toLowerCase();
          for (var keyIndex = 0; keyIndex < visibleCols.length; keyIndex++) {
            var temp = visibleCols[keyIndex];
            if (temp.toLowerCase().indexOf(useCol) > -1) {
              useCol = visibleCols[keyIndex];
              foundIt = true;
              break;
            }
          }

          if (foundIt) { // only search visible columns
            for (var featureIndex = 0; featureIndex < features.length; featureIndex++) {
              if (visibleCols.indexOf(useCol) > -1) {
                var props = features[featureIndex].getProperties();
                var data = props[useCol];
                if (data !== null && isPrimitive(data) && operator.TYPES[exp](data, cmprTxt)) {
                  items.push(features[featureIndex]);
                }
              }
            }
          }
        }
      }
    }
    this.source_.setSelectedItems(items);
    this['searchInProgress'] = false;
    Metrics.getInstance().updateMetric(AnalyzeKeys.LIST_SEARCH, 1);
  }

  /**
   * Gets the status text for the footer from the current source
   * @return {string}
   * @export
   */
  getStatus() {
    var src = this.scope ? /** @type {VectorSource} */ (this.scope['source']) : null;
    var msg = '';

    if (src) {
      var details = [];

      var selected = src.getSelectedItems();
      if (selected && selected.length > 0) {
        details.push(selected.length + ' selected');
      }

      var model = src.getTimeModel();
      if (model) {
        var total = model.getSize();
        var shown = src.getFilteredFeatures().length;
        if (total > 0) {
          msg += shown + ' record' + (shown != 1 ? 's' : '');

          var hidden = total - shown;
          if (hidden > 0) {
            details.push(hidden + ' hidden');
          }
        }
      } else {
        var total = src.getFeatures();
        if (total && total.length > 0) {
          msg += total.length + ' record' + (total.length != 1 ? 's' : '');
        }
      }

      if (this['selectedOnly']) {
        details.push('showing selected only');
      }

      if (details.length > 0) {
        msg += ' (' + details.join(', ') + ')';
      }
    }

    return msg;
  }

  /**
   * Opens the column manager.
   * @export
   */
  openColumnManager() {
    this.scope.$broadcast(ColumnEventType.MANAGE);
  }

  /**
   * Opens the column menu.
   * @export
   */
  openColumnMenu() {
    if (this.scope && this.element) {
      var target = this.element.find('.js-list-tool__column-button');
      if (target.length) {
        this.scope.$broadcast(ColumnEventType.CONTEXTMENU, {
          my: 'left top',
          at: 'left bottom',
          of: target
        });
      }
    }
  }

  /**
   * Opens the column menu.
   * @export
   */
  openListMenu() {
    if (this.scope && this.element) {
      var target = this.element.find('.js-list-tool__context-button');
      var offset = target.offset();
      var menuPosition = [offset.left, offset.top + target.outerHeight()];

      this.scope.$broadcast(GoogEventType.CONTEXTMENU, menuPosition);
    }
  }

  /**
   * @param {GoogEvent} evt
   * @protected
   */
  onMenuClose(evt) {
    this.scope['menu'] = null;
  }

  /**
   * @inheritDoc
   */
  persist(opt_to) {
    opt_to = super.persist(opt_to);
    opt_to['rowStep'] = this['rowStep'];
    opt_to['selectedOnly'] = this['selectedOnly'];

    return opt_to;
  }

  /**
   * @inheritDoc
   */
  restore(config) {
    super.restore(config);

    this['rowStep'] = config['rowStep'] || 1;
    this['selectedOnly'] = config['selectedOnly'] || false;
  }
}

/**
 * The default row height (not including padding)
 * @type {number}
 */
Controller.DEFAULT_ROW_HEIGHT = 21;
