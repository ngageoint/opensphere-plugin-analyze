goog.module('coreui.layout.ComponentManager');

const EventTarget = goog.require('goog.events.EventTarget');
const GoogEventType = goog.require('goog.events.EventType');
const googObject = goog.require('goog.object');
const osObject = goog.require('os.object');


/**
 * A Golden Layout component manager.
 */
class ComponentManager extends EventTarget {
  /**
   * Constructor.
   */
  constructor() {
    super();

    /**
     * Map of component type to the default configuration.
     * @type {!Object<string, !GoldenLayout.Component>}
     * @private
     */
    this.configs_ = {};
  }

  /**
   * Get all registered components, sorted by priority.
   * @return {!Array<!GoldenLayout.Component>}
   */
  getComponents() {
    return googObject.getValues(this.configs_);
  }

  /**
   * Create an instance of the default component configuration.
   * @param {string} type The component type.
   * @return {GoldenLayout.Component|undefined}
   */
  createComponent(type) {
    var instance;
    if (type in this.configs_) {
      instance = /** @type {!GoldenLayout.Component} */ (osObject.unsafeClone(this.configs_[type]));
    }

    return instance;
  }

  /**
   * Get the HTML template for a component.
   * @param {string} type The component type.
   * @return {Object|undefined}
   */
  getComponentState(type) {
    var component;
    var config = this.configs_[type];
    if (config) {
      component = config.componentState;
    }

    return component || undefined;
  }

  /**
   * Get the HTML template for a component.
   * @param {string} type The component type.
   * @return {string|undefined}
   */
  getTemplate(type) {
    var template;

    var componentState = this.getComponentState(type);
    if (componentState) {
      template = /** @type {string|undefined} */ (componentState['template']);
    }

    return template || undefined;
  }

  /**
   * Register a component configuration with the manager.
   * @param {string} type The component type.
   * @param {!GoldenLayout.Component} config The default configuration.
   *
   * @export Prevent the compiler from moving the function off the prototype.
   */
  registerComponent(type, config) {
    if (!(type in this.configs_) && typeof config === 'object') {
      if (!(config instanceof Object)) {
        // created in an external window context, so clone it to prevent memory leaks
        config = /** @type {!GoldenLayout.Component} */ (osObject.unsafeClone(config));
      }

      this.configs_[type] = config;
      this.dispatchEvent(GoogEventType.CHANGE);
    }
  }
}

goog.addSingletonGetter(ComponentManager);


exports = ComponentManager;
