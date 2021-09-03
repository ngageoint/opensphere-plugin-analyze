goog.module('tools.ui.AllTimeCheckboxUI');
goog.module.declareLegacyNamespace();

const DataManager = goog.require('os.data.DataManager');
const Disposable = goog.require('goog.Disposable');
const GoogEventType = goog.require('goog.events.EventType');
const Module = goog.require('tools.ui.Module');
const PropertyChange = goog.require('os.data.PropertyChange');
const {ROOT} = goog.require('tools');

const PropertyChangeEvent = goog.requireType('os.events.PropertyChangeEvent');


/**
 * The all time checkbox directive.
 * @return {angular.Directive}
 */
const directive = () => ({
  restrict: 'AE',
  replace: true,
  scope: true,
  templateUrl: ROOT + 'views/tools/alltimecheckbox.html',
  controller: Controller,
  controllerAs: 'ctrl'
});


/**
 * Add the directive to the tools module
 */
Module.directive('alltimecheckbox', [directive]);


/**
 * Controller for the all time checkbox.
 * @unrestricted
 */
class Controller extends Disposable {
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

    const dm = DataManager.getInstance();

    /**
     * If data should be displayed for all time.
     * @type {boolean}
     */
    this['allTime'] = !dm.getTimeFilterEnabled();

    // listen for changes on the data manager
    dm.listen(GoogEventType.PROPERTYCHANGE, this.onDataManagerChange, false, this);

    $scope.$on('$destroy', this.dispose.bind(this));
  }

  /**
   * @inheritDoc
   */
  disposeInternal() {
    super.disposeInternal();

    DataManager.getInstance().unlisten(GoogEventType.PROPERTYCHANGE, this.onDataManagerChange, false, this);
    this.scope = null;
  }

  /**
   * Update the allTime value in settings.
   * @export
   */
  onAllTimeChange() {
    DataManager.getInstance().setTimeFilterEnabled(!this['allTime']);
  }

  /**
   * Handle property change events from the data manager.
   * @param {PropertyChangeEvent} event The change event
   * @protected
   */
  onDataManagerChange(event) {
    var p = event.getProperty();
    if (p === PropertyChange.TIME_FILTER_ENABLED) {
      this['allTime'] = !DataManager.getInstance().getTimeFilterEnabled();
    }
  }
}

exports = {
  Controller,
  directive
};
