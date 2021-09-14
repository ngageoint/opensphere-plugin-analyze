goog.declareModuleId('tools.ui.LayoutButtonUI');

import {Module} from './module.js';
import {LayoutEvent} from '../../coreui/layout/layout.js';

const Disposable = goog.require('goog.Disposable');


/**
 * The layout button directive
 * @return {angular.Directive}
 */
export const directive = () => ({
  restrict: 'E',
  replace: true,
  controller: Controller,
  controllerAs: 'ctrl',

  template: '<button class="btn btn-primary dropdown-toggle" ng-click="ctrl.toggleFlyout()"' +
    ' ng-class="showLayoutPanel && \'active\'" title="Modify the contents of this window">' +
    '<i class="fa " ng-class="{\'fa-gear\' : !showLayoutPanel, \'fa-close\' : showLayoutPanel}"></i> ' +
    '{{showLayoutPanel ? "Close" : "Layout"}}' +
    '</button>'
});

/**
 * add the directive to the module
 */
Module.directive('layoutButton', [directive]);

/**
 * Controller function for the layout-button directive
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

    $scope.$on('$destroy', this.dispose.bind(this));
  }

  /**
   * @inheritDoc
   */
  disposeInternal() {
    super.disposeInternal();
    this.scope = null;
  }

  /**
   * Toggle the layout flyout.
   * @export
   */
  toggleFlyout() {
    if (this.scope) {
      this.scope.$emit(LayoutEvent.TOGGLE_PANEL);
    }
  }
}
