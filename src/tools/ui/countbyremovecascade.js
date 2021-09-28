goog.declareModuleId('tools.ui.CountByRemoveCascadeUI');

import Module from 'opensphere/src/os/ui/module.js';


/**
 * @enum {string}
 */
export const CountByEventType = {
  REMOVE_CASCADE: 'countby:removeCascade'
};

/**
 * The cascaderemove directive
 * @return {angular.Directive}
 */
export const directive = function() {
  return {
    restrict: 'E',
    replace: true,
    template: '<i class="fa fa-times text-danger c-glyph" ng-click="fireRemove()"' +
        'title="Exclude this bin from the next Count By and created filters"></i>',
    link: function($scope, $element, $attr) {
      /**
       * Function to run when removing a cascade
       */
      $scope['fireRemove'] = function() {
        $scope.$emit(CountByEventType.REMOVE_CASCADE, $scope['item']);
      };
    }
  };
};

/**
 * Add the directive to the module.
 */
Module.directive('cascaderemove', [directive]);
