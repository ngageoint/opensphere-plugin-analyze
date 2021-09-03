goog.declareModuleId('coreui.selector.GeneralSelectorUI');

import {Controller as SelectorController} from './selector.js';
import generalSelectorSignal from './generalselectorsignal.js';

import * as ui from 'opensphere/src/os/ui/ui.js';

const Module = goog.require('os.ui.Module');


/**
 * AngularJS directive that specializes in selecting general options.
 *
 *
 * Basic usage example:
 *
 * CONTROLLER
 * ``` javascript
 * $scope['options'] = [
 *  {
 *    'title': 'Option #1',
 *    'a': 1,
 *    'b': 2,
 *    'c': 3
 *  },
 *  {
 *    'title': 'Option #2',
 *    'a': 4,
 *    'b': 5,
 *    'c': 6
 *  },
 *  {
 *    'title': 'Option #3',
 *    'a': 7,
 *    'b': 8,
 *    'c': 9
 *  }
 * ];
 *
 * $scope['value'] = $scope['options'][1];
 *
 * $scope.$watch('value', function(newValue) {
 *   // Handle new value.
 * });
 * ```
 *
 * TEMPLATE FILE
 * ``` html
 * <generalselector general-value="value" general-options="options" key="title"></generalselector>
 * ```
 *
 *
 * Inherits from the Select Directive
 * @return {angular.Directive}
 */
export const directive = () => ({
  restrict: 'E',
  replace: true,

  scope: {
    'generalValue': '=?',
    'isRequired': '=?',
    'disabled': '=?',
    'generalOptions': '=',
    'formatSelection': '=?',
    'formatResult': '=?',
    'matcher': '=?', // Select2's matcher.
    'key': '@',
    'multiple': '=?',
    'placeholder': '@?',
    'onSelect': '=?', // Callback when an option is selected.
    'onUpdate': '=?' // Callback when the Select2 object is updated.
  },

  templateUrl: bits.ROOT + 'views/selector/selector.html',
  controller: Controller,
  controllerAs: 'ctrl'
});

/**
 * Add the directive to the module
 */
Module.directive('generalselector', [directive]);



/**
 * GeneralSelectorUI for the general picker
 * @unrestricted
 */
class Controller extends SelectorController {
  /**
   * Constructor.
   * @param {!angular.Scope} $scope
   * @param {!angular.JQLite} $element
   * @param {!angular.$timeout} $timeout
   * @ngInject
   */
  constructor($scope, $element, $timeout) {
    super($scope, $element, $timeout);

    /**
     * Index value.
     * Determined later by the $scope['general']
     * @type {number|Array}
     */
    this.scope_['value'] = this.scope_['multiple'] ? [] : null;

    /**
     * Options array
     * Determined later by the $scope['generalOptions']
     * @type {Array}
     */
    this.scope_['options'] = [];

    /**
     * Placeholder text
     * @type {Array}
     */
    this.scope_['placeholder'] = this.scope_['placeholder'] ||
        ('Select Option' + (this.scope_['multiple'] ? 's' : '') + '...');

    if (this.scope_['multiple']) {
      this.scope_.$watchCollection('generalValue', this.watchGeneralValue_.bind(this));
    } else {
      this.scope_.$watch('generalValue', this.watchGeneralValue_.bind(this));
    }
    this.scope_.$watchCollection('generalOptions', this.watchGeneralOptions_.bind(this));
  }

  /**
   * On the $scope['generalValue'] watch.
   * @param {Object} newGeneralValue
   * @private
   */
  watchGeneralValue_(newGeneralValue) {
    if (!newGeneralValue || !this.scope_['generalOptions']) {
      this.scope_['value'] = this.scope_['multiple'] ? [] : null;
      return;
    }
    var key = this.scope_['key'];
    if (this.scope_['multiple']) {
      this.scope_['value'] = newGeneralValue.map(function(gen) {
        return this.scope_['generalOptions'].reduce(function(acc, generalValue, index) {
          return gen && gen[key] === generalValue[key] ? index : acc;
        }, 0);
      }.bind(this));
    } else {
      // Search for a matching key with the selected general values and the options. Return the index.
      this.scope_['value'] = this.scope_['generalOptions'].reduce(function(acc, generalValue, index) {
        return newGeneralValue && newGeneralValue[key] === generalValue[key] ? index : acc;
      }, null);
    }
  }

  /**
   * On the $scope['generalOptions'] watch.
   * @param {Array<Object>} newGeneralValueOptions
   * @private
   */
  watchGeneralOptions_(newGeneralValueOptions) {
    if (Array.isArray(newGeneralValueOptions)) {
      this.scope_['options'] = newGeneralValueOptions.map(function(generalOption) {
        return generalOption[this.scope_['key']];
      }.bind(this));
      this.watchGeneralValue_(this.scope_['generalValue']);
    }
  }

  /**
   * Handles the callback when an option is selected.
   * @param {*} index
   * @override
   */
  handleSelect(index) {
    if (this.scope_['multiple']) {
      this.scope_['generalValue'] = index.map(function(selected) {
        return this.scope_['generalOptions'][selected];
      }.bind(this));
    } else {
      this.scope_['generalValue'] = this.scope_['generalOptions'][index];
    }
    ui.apply(this.scope_);
  }

  /**
   * Handles the callback when the select2 component is updated.
   * @override
   */
  handleUpdate() {
    this.scope_.$emit(generalSelectorSignal.VALIDATION, this.scope_['generalValue']);
  }

  /**
   * The event trigger for a change event on the Select2 element.
   * @param {select2.ChangeEvent} event The select2 event
   * @override
   */
  handleChange(event) {
    // Call the onSelect callback in the scope.
    // `event.val` is the index (or indices) of the selected option(s).
    this.timeout_(function() {
      this.handleSelect(event.val); // Abstact method to be overwritten.
      this.scope_['onSelect'](event.val); // Event call in scope.
    }.bind(this));
  }
}

export {Controller};
