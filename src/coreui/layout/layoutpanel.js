goog.declareModuleId('coreui.layout.LayoutPanelUI');

import './dragcomponent.js';
import 'opensphere/src/os/ui/util/autoheight.js';
import Module from 'opensphere/src/os/ui/module.js';

import {apply} from 'opensphere/src/os/ui/ui.js';
import {ROOT} from '../../tools/tools.js';
import {ComponentManager} from './componentmanager.js';
import {LayoutEvent} from './layout.js';

const Disposable = goog.require('goog.Disposable');
const Delay = goog.require('goog.async.Delay');
const dispose = goog.require('goog.dispose');
const GoogEventType = goog.require('goog.events.EventType');


/**
 * The layout panel directive.
 * @return {angular.Directive}
 */
export const directive = () => ({
  restrict: 'E',
  replace: true,
  scope: {
    'parent': '@',
    'layout': '=',
    'shown': '='
  },
  controller: Controller,
  controllerAs: 'ctrl',
  templateUrl: ROOT + 'views/layout/layoutpanel.html'
});

/**
 * The element tag for the directive.
 * @type {string}
 */
export const directiveTag = 'layout-panel';

/**
 * Add the directive to the module.
 */
Module.directive('layoutPanel', [directive]);

/**
 * Controller function for the component-flyout directive.
 * @unrestricted
 */
export class Controller extends Disposable {
  /**
   * Constructor.
   * @param {!angular.Scope} $scope The Angular scope.
   * @ngInject
   */
  constructor($scope) {
    super();

    /**
     * The Angular scope.
     * @type {?angular.Scope}
     * @protected
     */
    this.scope = $scope;

    /**
     * Delay to debounce UI updates.
     * @type {Delay}
     * @protected
     */
    this.updateDelay = new Delay(this.onUpdateDelay, 50, this);

    /**
     * Components to display in the panel.
     * @type {!Array<!GoldenLayout.Component>}
     */
    this['components'] = [];

    var cm = ComponentManager.getInstance();
    cm.listen(GoogEventType.CHANGE, this.updateComponents, false, this);

    $scope.$watch('layout', this.updateComponents.bind(this));
    $scope.$on('$destroy', this.dispose.bind(this));
  }

  /**
   * @inheritDoc
   */
  disposeInternal() {
    super.disposeInternal();

    var cm = ComponentManager.getInstance();
    cm.unlisten(GoogEventType.CHANGE, this.updateComponents, false, this);

    dispose(this.updateDelay);
    this.updateDelay = null;

    this.scope = null;
  }

  /**
   * Update the components displayed in the flyout.
   * @protected
   */
  updateComponents() {
    if (this.updateDelay) {
      this.updateDelay.start();
    }
  }

  /**
   * Update the components displayed in the flyout.
   * @protected
   */
  onUpdateDelay() {
    this['components'] = ComponentManager.getInstance().getComponents();
    apply(this.scope);
  }

  /**
   * Close the panel.
   * @export
   */
  closePanel() {
    if (this.scope) {
      this.scope.$emit(LayoutEvent.TOGGLE_PANEL, false);
    }
  }

  /**
   * Close all widgets.
   * @export
   */
  removeAll() {
    if (this.scope) {
      this.scope.$emit(LayoutEvent.REMOVE_ALL);
    }
  }

  /**
   * Reset to the default widgets.
   * @export
   */
  reset() {
    if (this.scope) {
      this.scope.$emit(LayoutEvent.RESET);
    }
  }
}
