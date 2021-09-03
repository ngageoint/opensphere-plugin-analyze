goog.module('mist.ui.data.DateBinUI');
goog.module.declareLegacyNamespace();

const EventType = goog.require('goog.events.EventType');
const Module = goog.require('os.ui.Module');

const DateBinMethod = goog.requireType('os.histo.DateBinMethod');


/**
 * The date bin UI
 * @return {angular.Directive}
 */
const directive = () => ({
  restrict: 'AE',
  replace: true,
  templateUrl: mist.ROOT + 'views/data/datebin.html',
  controller: Controller
});


/**
 * Add the directive to the module
 */
Module.directive('datebin', [directive]);


/**
 * Controller for date bin UI
 * @unrestricted
 */
class Controller {
  /**
   * Constructor.
   * @param {!angular.Scope} $scope
   * @param {!angular.JQLite} $element
   * @ngInject
   */
  constructor($scope, $element) {
    /**
     * @type {angular.Scope}
     * @private
     */
    this.scope_ = $scope;

    /**
     * @type {boolean}
     */
    this.scope_['showEmptyBinsOption'] = false;

    // only config types once
    if (this.scope_['items']) {
      const method = /** @type {DateBinMethod} */ (this.scope_['items'][0]);
      $scope['types'] = method.getDateBinTypes();
    }

    this.onRestore_();
    $scope.$on('restore', this.onRestore_.bind(this));
    $scope.$watch('items', this.onRestore_.bind(this));
    $scope.$watch('type', this.onChange_.bind(this));
    $scope.$watch('show', this.onChange_.bind(this));
  }

  /**
   * Handles changes on the type
   * @private
   */
  onChange_() {
    if (this.scope_['items']) {
      const method = /** @type {DateBinMethod} */ (this.scope_['items'][0]);
      const type = this.scope_['type'];
      const show = this.scope_['show'];
      const changed = (type !== method.getDateBinType() || show !== method.getShowEmptyBins());

      if (changed) {
        if (type != null) {
          method.setDateBinType(type);
        }
        if (show != null) {
          method.setShowEmptyBins(show);
        }
        this.scope_.$emit(EventType.PROPERTYCHANGE);
      }
    }
  }

  /**
   * Restores the form from the item
   * @private
   */
  onRestore_() {
    if (this.scope_['items']) {
      const method = /** @type {DateBinMethod} */ (this.scope_['items'][0]);

      if (this.scope_['options']) {
        this.scope_['showEmptyBinsOption'] = (this.scope_['options']['showEmptyBinsOption'] === true);
      }
      this.scope_['type'] = method.getDateBinType();
      this.scope_['show'] = method.getShowEmptyBins();
    }
  }
}

exports = {
  Controller,
  directive
};
