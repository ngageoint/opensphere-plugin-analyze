goog.module('coreui.milsym.MilSymDialogUI');
goog.module.declareLegacyNamespace();

const {ROOT} = goog.require('tools');
const EventType = goog.require('coreui.milsym.EventType');
const {Controller: MilSymCtrl} = goog.require('coreui.milsym.MilSymUI');
const Module = goog.require('os.ui.Module');


/**
 * A icon picker directive
 * @return {angular.Directive}
 */
const directive = () => ({
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
const directiveTag = 'milsymdialog';


/**
 * Add the directive to the module
 */
Module.directive('milsymdialog', [directive]);


/**
 * Controller for the icon picker directive
 * @unrestricted
 */
class Controller extends MilSymCtrl {
  /**
   * Constructor.
   * @param {!angular.Scope} $scope
   * @ngInject
   */
  constructor($scope) {
    super($scope);
    this.scope.$on(EventType.ICON_SELECTED, (event, options) => {
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

exports = {
  directive,
  directiveTag,
  Controller
};
