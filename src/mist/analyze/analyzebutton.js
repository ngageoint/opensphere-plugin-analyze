goog.declareModuleId('mist.analyze.ButtonUI');

import {Analyze} from '../metrics/keys.js';
import {openExternal} from './analyze.js';
import {MENU} from './analyzemenu.js';

const Module = goog.require('os.ui.Module');
const MenuButtonCtrl = goog.require('os.ui.menu.MenuButtonCtrl');


/**
 * The add data button bar directive
 * @return {angular.Directive}
 */
export const directive = () => ({
  restrict: 'E',
  replace: true,
  scope: true,
  controller: Controller,
  controllerAs: 'ctrl',
  template: '<div class="btn-group" ng-right-click="ctrl.openMenu()">' +
    '<button class="btn btn-primary" ng-click="ctrl.open()" title="List tool, count by, and other tools for ' +
    'analysis">' +
    '<i class="fa fa-list-alt" ng-class="{\'fa-fw\': puny}"></i> <span ng-class="{\'d-none\': puny}">Analyze</span>' +
    '</button>' +
    '<button class="btn btn-primary dropdown-toggle dropdown-toggle-split" ng-click="ctrl.openMenu()">' +
    '</button>'
});

/**
 * add the directive to the module
 */
Module.directive('analyzeButton', [directive]);

/**
 * Controller function for the analyze button directive
 * @unrestricted
 */
export class Controller extends MenuButtonCtrl {
  /**
   * Constructor.
   * @param {!angular.Scope} $scope The scope
   * @param {!angular.JQLite} $element The element
   * @ngInject
   */
  constructor($scope, $element) {
    super($scope, $element);
    this.menu = MENU;
    this.flag = 'analyze';
    this.metricKey = Analyze.OPEN;
  }

  /**
   * Open a new Analyze window.
   * @export
   */
  open() {
    openExternal();
  }
}
