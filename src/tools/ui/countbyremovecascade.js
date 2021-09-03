goog.module('tools.ui.CountByRemoveCascadeUI');

const Module = goog.require('os.ui.Module');


/**
 * @enum {string}
 */
const CountByEventType = {
  REMOVE_CASCADE: 'countby:removeCascade'
};


/**
 * The cascaderemove directive
 * @return {angular.Directive}
 */
const directive = function() {
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


exports = {
  CountByEventType,
  directive
};
