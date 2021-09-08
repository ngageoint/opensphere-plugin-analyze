goog.declareModuleId('coreui.layout.AngularComponent');

import {ComponentManager} from './componentmanager.js';
import {injector} from 'opensphere/src/os/ui/ui.js';

const {isEmptyOrWhitespace} = goog.require('goog.string');


/**
 * A Golden Layout component that compiles an Angular directive.
 */
export class AngularComponent {
  /**
   * Constructor.
   * @param {angular.Scope|undefined} scope The Angular scope.
   * @param {!GoldenLayout.Container} container The component container.
   * @param {!Object} state The component state.
   */
  constructor(scope, container, state) {
    /**
     * The parent's Angular scope.
     * @type {angular.Scope|undefined}
     * @protected
     */
    this.parentScope = scope;

    /**
     * The component's Angular scope.
     * @type {angular.Scope|undefined}
     * @protected
     */
    this.scope = undefined;

    /**
     * The GoldenLayout container for the component.
     * @type {GoldenLayout.Container|undefined}
     * @protected
     */
    this.container = container;

    /**
     * The component's state object.
     * @type {Object|undefined}
     * @protected
     */
    this.state = state;

    this.initComponent();
  }

  /**
   * Initialize the Golden Layout component.
   * @protected
   */
  initComponent() {
    if (this.parentScope && this.container && this.state) {
      // try to get the template from the component manager first, in case it changed from what is saved in settings
      var template = ComponentManager.getInstance().getTemplate(this.state['type']);

      // otherwise use the state value
      if (!template) {
        template = this.state['template'];
      }

      var compile = injector.get('$compile');
      var element = this.container.getElement();
      if (compile && element && template && typeof template == 'string') {
        this.scope = this.parentScope.$new();
        this.scope['container'] = this.container;
        this.scope['state'] = this.state;

        // Allow the parent scope to pass options along
        if (this.parentScope['scopeOptions']) {
          Object.assign(this.scope, this.parentScope['scopeOptions']);
        }

        element.html(template);
        compile(element.contents())(this.scope);

        this.container.on('tab', this.onTab.bind(this));
        this.container.on('destroy', this.onDestroy.bind(this));
      }
    }
  }

  /**
   * Handle the Golden Layout `destroy` event.
   * @protected
   */
  onDestroy() {
    if (this.scope) {
      this.scope.$destroy();
      this.scope = undefined;
    }

    this.container = undefined;
    this.parentScope = undefined;
    this.state = undefined;
  }

  /**
   * Handle the Golden Layout 'tab' creation event, if custom tabClass is available
   * add it to the element.
   * @protected
   */
  onTab() {
    if (this.container &&
        this.container.tab &&
        this.container.tab.element &&
        this.state) {
      var customTabClass = this.state['tabClass'];
      if (customTabClass && !isEmptyOrWhitespace(customTabClass)) {
        this.container.tab.element.addClass(customTabClass);
      }
    }
  }
}
