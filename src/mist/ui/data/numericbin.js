goog.declareModuleId('mist.ui.data.NumericBinUI');

import {ROOT} from '../../../tools/tools.js';

const EventType = goog.require('goog.events.EventType');
const Module = goog.require('os.ui.Module');

const NumericBinMethod = goog.requireType('os.histo.NumericBinMethod');


/**
 * The numeric bin UI
 * @return {angular.Directive}
 */
export const directive = () => ({
  restrict: 'AE',
  replace: true,
  templateUrl: ROOT + 'views/data/numericbin.html',
  controller: Controller
});

/**
 * Add the directive to the module
 */
Module.directive('numericbin', [directive]);

/**
 * Controller for the numeric bin UI
 * @unrestricted
 */
export class Controller {
  /**
   * Constructor.
   * @param {!angular.Scope} $scope
   * @ngInject
   */
  constructor($scope) {
    /**
     * @type {angular.Scope}
     * @private
     */
    this.scope_ = $scope;

    /**
     * @type {boolean}
     */
    this.scope_['showEmptyBinsOption'] = false;

    this.onRestore_();
    $scope.$on('restore', this.onRestore_.bind(this));
    $scope.$watch('items', this.onRestore_.bind(this));
    $scope.$watch('width', this.onChange_.bind(this));
    $scope.$watch('offset', this.onChange_.bind(this));
    $scope.$watch('show', this.onChange_.bind(this));
  }

  /**
   * Handles changes to form
   * @private
   */
  onChange_() {
    const method = /** @type {NumericBinMethod} */ (this.scope_['items'][0]);
    const w = this.scope_['width'];
    const o = this.scope_['offset'];
    const show = this.scope_['show'];
    const changed = (w !== method.getWidth() || o !== method.getOffset() || show !== method.getShowEmptyBins());

    if (w != null) {
      method.setWidth(w);
    }

    if (o != null) {
      method.setOffset(o);
    }

    if (show != null) {
      method.setShowEmptyBins(show);
    }

    if (changed) {
      this.scope_.$emit(EventType.PROPERTYCHANGE);
    }
  }

  /**
   * Handles restore of form
   * @private
   */
  onRestore_() {
    if (this.scope_['items']) {
      const method = /** @type {NumericBinMethod} */ (this.scope_['items'][0]);

      if (this.scope_['options']) {
        this.scope_['showEmptyBinsOption'] = (this.scope_['options']['showEmptyBinsOption'] === true);
      }
      this.scope_['width'] = method.getWidth();
      this.scope_['offset'] = method.getOffset();
      this.scope_['show'] = method.getShowEmptyBins();
    }
  }
}
