goog.declareModuleId('coreui.layout.AbstractComponentCtrl');

import {isActiveComponent, setActiveComponentId} from './layout.js';

const Disposable = goog.require('goog.Disposable');
const {listen, unlisten} = goog.require('goog.events');
const GoogEventType = goog.require('goog.events.EventType');
const {getRandomString} = goog.require('goog.string');

const {default: IPersistable} = goog.requireType('os.IPersistable');


/**
 * Abstract controller for Golden Layout Angular components.
 * @implements {IPersistable}
 * @unrestricted
 */
export class AbstractComponentCtrl extends Disposable {
  /**
   * Constructor.
   * @param {!angular.Scope} $scope The Angular scope.
   * @param {!angular.JQLite} $element The root DOM element.
   * @ngInject
   */
  constructor($scope, $element) {
    super();

    /**
     * The component id.
     * @type {string}
     * @protected
     */
    this.componentId = getRandomString();

    /**
     * The Angular scope.
     * @type {?angular.Scope}
     * @protected
     */
    this.scope = $scope;

    /**
     * The root DOM element.
     * @type {?angular.JQLite}
     * @protected
     */
    this.element = $element;

    /**
     * The Golden Layout container for this component.
     * @type {GoldenLayout.Container|undefined}
     * @protected
     */
    this.layoutContainer = /** @type {GoldenLayout.Container|undefined} */ (this.scope['container']);

    /**
     * If the state is being restored.
     * @type {boolean}
     * @protected
     */
    this.restoring = false;

    listen(this.element[0], GoogEventType.MOUSEDOWN, this.onMouseDown, true, this);

    $scope.$on('$destroy', this.dispose.bind(this));

    this.init();
  }

  /**
   * @inheritDoc
   */
  disposeInternal() {
    super.disposeInternal();

    if (isActiveComponent(this.componentId)) {
      setActiveComponentId(undefined);
    }

    if (this.element) {
      unlisten(this.element[0], GoogEventType.MOUSEDOWN, this.onMouseDown, true, this);
    }

    this.scope = null;
    this.element = null;
  }

  /**
   * Setup anything here
   */
  init() {
    // Placeholder
  }

  /**
   * Get the current config.
   * @return {Object|undefined} The config, or undefined if not available.
   */
  getCurrentConfig() {
    if (!this.isDisposed() && this.layoutContainer) {
      var state = this.layoutContainer.getState();
      if (state) {
        return /** @type {Object|undefined} */ (state['config']);
      }
    }

    return undefined;
  }

  /**
   * Handle mouse down event on the element.
   * @protected
   */
  onMouseDown() {
    setActiveComponentId(this.componentId);
  }

  /**
   * Persist the controller's configuration to the Golden Layout container state.
   * @protected
   */
  persistContainerState() {
    if (!this.isDisposed() && this.layoutContainer && !this.restoring) {
      // intentionally avoids using extendState for components with varying configuration sets
      var state = this.layoutContainer.getState();
      state['config'] = this.persist();
    }
  }

  /**
   * Restore the controller's configuration from the Golden Layout container state.
   * @protected
   */
  restoreContainerState() {
    if (!this.isDisposed() && this.layoutContainer) {
      this.restoring = true;

      var state = this.layoutContainer.getState();
      if (state) {
        var config = /** @type {Object|undefined} */ (state['config']);
        if (config) {
          this.restore(config);
        }
      }

      this.restoring = false;
    }
  }

  /**
   * @inheritDoc
   */
  persist(opt_to) {
    // implement in extending classes
    return opt_to || {};
  }

  /**
   * @inheritDoc
   */
  restore(config) {
    // implement in extending classes
  }
}
