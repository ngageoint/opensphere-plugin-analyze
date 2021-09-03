goog.module('coreui.layout.LayoutPanelUI');

goog.require('coreui.layout.DragComponentUI');
goog.require('os.ui.util.AutoHeightUI');

const {ROOT} = goog.require('tools');
const layout = goog.require('coreui.layout');
const ComponentManager = goog.require('coreui.layout.ComponentManager');
const Disposable = goog.require('goog.Disposable');
const Delay = goog.require('goog.async.Delay');
const dispose = goog.require('goog.dispose');
const GoogEventType = goog.require('goog.events.EventType');
const ui = goog.require('os.ui');
const Module = goog.require('os.ui.Module');


/**
 * The layout panel directive.
 * @return {angular.Directive}
 */
const directive = () => ({
  restrict: 'E',
  replace: true,

  scope: {
    'parent': '@',
    'layout': '=',
    'shown': '='
  },

  controller: Controller,
  controllerAs: 'ctrl',
  templateUrl: ROOT + 'views/layout/layoutpanel.html'
});

/**
 * The element tag for the directive.
 * @type {string}
 */
const directiveTag = 'layout-panel';


/**
 * Add the directive to the module.
 */
Module.directive('layoutPanel', [directive]);



/**
 * Controller function for the component-flyout directive.
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

    /**
     * Delay to debounce UI updates.
     * @type {Delay}
     * @protected
     */
    this.updateDelay = new Delay(this.onUpdateDelay, 50, this);

    /**
     * Components to display in the panel.
     * @type {!Array<!GoldenLayout.Component>}
     */
    this['components'] = [];

    var cm = ComponentManager.getInstance();
    cm.listen(GoogEventType.CHANGE, this.updateComponents, false, this);

    $scope.$watch('layout', this.updateComponents.bind(this));
    $scope.$on('$destroy', this.dispose.bind(this));
  }

  /**
   * @inheritDoc
   */
  disposeInternal() {
    super.disposeInternal();

    var cm = ComponentManager.getInstance();
    cm.unlisten(GoogEventType.CHANGE, this.updateComponents, false, this);

    dispose(this.updateDelay);
    this.updateDelay = null;

    this.scope = null;
  }

  /**
   * Update the components displayed in the flyout.
   * @protected
   */
  updateComponents() {
    if (this.updateDelay) {
      this.updateDelay.start();
    }
  }

  /**
   * Update the components displayed in the flyout.
   * @protected
   */
  onUpdateDelay() {
    this['components'] = ComponentManager.getInstance().getComponents();
    ui.apply(this.scope);
  }

  /**
   * Close the panel.
   * @export
   */
  closePanel() {
    if (this.scope) {
      this.scope.$emit(layout.LayoutEvent.TOGGLE_PANEL, false);
    }
  }

  /**
   * Close all widgets.
   * @export
   */
  removeAll() {
    if (this.scope) {
      this.scope.$emit(layout.LayoutEvent.REMOVE_ALL);
    }
  }

  /**
   * Reset to the default widgets.
   * @export
   */
  reset() {
    if (this.scope) {
      this.scope.$emit(layout.LayoutEvent.RESET);
    }
  }
}

exports = {
  Controller,
  directive,
  directiveTag
};
