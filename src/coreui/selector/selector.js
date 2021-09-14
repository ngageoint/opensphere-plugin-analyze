goog.declareModuleId('coreui.selector.SelectorUI');

import {ROOT} from '../../tools/tools.js';

const Module = goog.require('os.ui.Module');


/**
 * This is a general AngularJS directive for Select2 input types.
 * This directive is intended to be traditionally inherited when wanting to
 * re-use the logic.
 *
 * See the ColumnSelector directive as an example for how to inherit this
 * directive.
 *
 * @return {angular.Directive}
 */
export const directive = () => ({
  restrict: 'E',
  replace: true,
  scope: {
    'value': '=?', // Value of the index (or indices) of the selected option(s).
    'options': '=', // Array of options to display in the selection menu.
    'disabled': '=?', // Disables the select form.
    'disabledOptions': '=?', // Set of options to disable in the selection menu.
    'multiple': '=?', // Allows the selection to have multiple selected options.
    'placeholder': '@?', // The placeholder text when the select input in empty.
    'formatSelection': '=?', // Select2's selection formatter.
    'formatResult': '=?', // Select2's result formatter.
    'matcher': '=?', // Select2's matcher.
    'maximumSelectionSize': '=?', // Maximum number of options to be selectable at a time.
    'isRequired': '=?', // Determines with the field is required.
    'onSelect': '=?', // Callback when an option is selected.
    'onUpdate': '=?' // Callback when the Select2 object is updated.
  },
  templateUrl: ROOT + 'views/selector/selector.html',
  controller: Controller,
  controllerAs: 'ctrl'
});

/**
 * Add the directive to the module
 */
Module.directive('selector', [directive]);

/**
 * SelectorUI for the Select2 input
 * @unrestricted
 */
export class Controller {
  /**
   * Constructor.
   * @param {!angular.Scope} $scope
   * @param {!angular.JQLite} $element
   * @param {!angular.$timeout} $timeout
   * @ngInject
   */
  constructor($scope, $element, $timeout) {
    /**
     * @type {?angular.Scope}
     * @protected
     */
    this.scope_ = $scope;

    /**
     * @type {?angular.JQLite}
     * @protected
     */
    this.element_ = $element;

    /**
     * @type {?angular.$timeout}
     * @protected
     */
    this.timeout_ = $timeout;

    /**
     * @type {Object}
     * @private
     */
    this.elements_ = {
      select2: this.element_.find('.js-selector')
    };

    this['selectFired'] = false;

    this.scope_['onSelect'] = this.scope_['onSelect'] || (() => {});
    this.scope_['onUpdate'] = this.scope_['onUpdate'] || (() => {});

    this['onSelectWrapper'] = function(args) {
      if (!this['selectFired']) {
        this.scope_['onSelect'](args);
        this['selectFired'] = true;
        setTimeout(function() {
          this['selectFired'] = false;
        }.bind(this), 200);
      }
    }.bind(this);

    this['model'] = undefined;

    this['handleChangeBound'] = this.handleChange.bind(this);

    /**
     * These scope properties require destroying and re-initializing Select2
     * whenever they're changed.
     */
    this.scope_.$watchGroup(
        ['value', 'disabled', 'options', 'multiple', 'placeholder'],
        this.update_.bind(this)
    );

    this.scope_.$on('$destroy', this.destroy_.bind(this));

    this.timeout_(this.initialize_.bind(this));
  }

  /**
   * Initialization of the selector
   * @private
   */
  initialize_() {
    var scope = this.scope_;

    // Generate the array of options with an associated id.
    var data = scope['options'] ? scope['options'].map(function(option, index) {
      let disabledFlag = false;
      if (scope['disabledOptions'] && scope['disabledOptions'].has(option)) {
        disabledFlag = true;
      }
      return {id: index, text: option, disabled: disabledFlag};
    }) : [];

    // Begin the Select2 options object.
    var select2Options = {
      'quietMillis': 100,
      'multiple': scope['multiple'] || false,
      'disabled': scope['disabled'] || false,
      'placeholder': scope['placeholder'] || 'Select...',
      'data': data
    };

    // Conditionally append additional Select2 options
    if (scope['formatSelection']) {
      select2Options['formatSelection'] = scope['formatSelection'];
    }
    if (scope['formatResult']) {
      select2Options['formatResult'] = scope['formatResult'];
    }
    if (scope['matcher']) {
      select2Options['matcher'] = scope['matcher'];
    }
    if (scope['maximumSelectionSize']) {
      select2Options['maximumSelectionSize'] = scope['maximumSelectionSize'];
    }


    // Initialize the element with Select2
    this.elements_.select2.select2(select2Options).on('change', this['handleChangeBound']);

    var selectedIndex = null;
    // The selectedIndex can only be a number/array representing the index/indices of the option(s)
    if (this.scope_['multiple']) {
      selectedIndex = Array.isArray(scope['value']) && scope['value'].length > 0 ? scope['value'] : [];
      this['model'] = selectedIndex.map(function(index) {
        return scope['options'][index];
      });
    } else {
      selectedIndex = typeof scope['value'] === 'number' ? scope['value'] : null;
      this['model'] = typeof selectedIndex === 'number' ? [scope['options'][selectedIndex]] : undefined;
    }

    this.timeout_(function() {
      this.elements_.select2.select2('val', selectedIndex);
    }.bind(this));
  }

  /**
   * Clean up.
   * @private
   */
  destroy_() {
    // Destroy the select2 instance on the element and all event listeners.
    this.elements_.select2.select2('destroy').off();
  }

  /**
   * Updates the Select2 options.
   * Changes to the Select2 configuration requires that we destroy it and
   * and re-initialize it with the new settings.
   * @private
   */
  update_() {
    // Destroy the select2 instance on the element and all event listeners.
    this.elements_.select2.select2('destroy').off();
    this.initialize_();
    // After initialization, trigger the onUpdate callbacks.
    this.handleUpdate(); // Abstact method to be overwritten.
    this.scope_['onUpdate'](); // Event call in scope.
  }

  /**
   * The event trigger for a change event on the Select2 element.
   * @param {select2.ChangeEvent} event The select2 event
   * @protected
   */
  handleChange(event) {
    // Call the onSelect callback in the scope.
    // `event.val` is the index (or indices) of the selected option(s).
    this.timeout_(() => {
      this['onSelectWrapper'](event.val); // Event call in scope.
      this.elements_.select2.select2('val', event.val);
    });
  }

  /**
   * Handles the update of the select2 values.
   */
  handleUpdate() {
    // Override this method with your own logic when inherited.
  }

  /**
   * Handles the selection of an option.
   * @param {*} index The index or indices of the selected option(s).
   */
  handleSelect(index) {
    // Override this method with your own logic when inherited.
  }
}
