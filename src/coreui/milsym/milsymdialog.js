goog.declareModuleId('coreui.milsym.MilSymDialogUI');

import {ROOT} from '../../tools/tools.js';
import {Controller as MilSymCtrl} from './milsymctrl.js';
import {MilSymEventType} from './milsymeventtype.js';

const Module = goog.require('os.ui.Module');


/**
 * A icon picker directive
 * @return {angular.Directive}
 */
export const directive = () => ({
  restrict: 'AE',
  replace: true,
  scope: {
    'selected': '=',
    'acceptCallback': '=',
    'isAutoheight': '='
  },
  templateUrl: ROOT + 'views/milsym/milsym\.html',
  controller: Controller,
  controllerAs: 'ctrl'
});

/**
 * The element tag for the directive.
 * @type {string}
 */
export const directiveTag = 'milsymdialog';

/**
 * Add the directive to the module
 */
Module.directive('milsymdialog', [directive]);

/**
 * Controller for the icon picker directive
 * @unrestricted
 */
export class Controller extends MilSymCtrl {
  /**
   * Constructor.
   * @param {!angular.Scope} $scope
   * @ngInject
   */
  constructor($scope) {
    super($scope);
    this.scope.$on(MilSymEventType.ICON_SELECTED, (event, options) => {
      this.onSelection_(options);
    });
  }

  /**
   * Handles icon pick events.
   * @param {Array} options First index holds the url and second holds the SIDC
   * @private
   */
  onSelection_(options) {
    this.scope['selected']['path'] = options[0];
    this.scope['selected']['options'] = options[2];
  }
}
