goog.declareModuleId('coreui.layout.DragComponentUI');

import Module from 'opensphere/src/os/ui/module.js';
import {apply} from 'opensphere/src/os/ui/ui.js';
import {ROOT} from '../../tools/tools.js';
import {GoldenLayoutEvent, LayoutEvent, minimizeAll} from './layout.js';

const Disposable = goog.require('goog.Disposable');
const {isEmptyOrWhitespace} = goog.require('goog.string');


/**
 * A draggable Golden Layout component.
 * @return {angular.Directive}
 */
export const directive = () => ({
  restrict: 'E',
  replace: true,
  scope: {
    'componentConfig': '=',
    'layout': '='
  },
  controller: Controller,
  controllerAs: 'ctrl',
  templateUrl: ROOT + 'views/layout/dragcomponent.html'
});

/**
 * The element tag for the directive.
 * @type {string}
 */
export const directiveTag = 'drag-component';

/**
 * Add the directive to the module.
 */
Module.directive('dragComponent', [directive]);

/**
 * Controller function for the drag-component directive.
 * @unrestricted
 */
export class Controller extends Disposable {
  /**
   * Constructor.
   * @param {!angular.Scope} $scope The Angular scope.
   * @param {!angular.JQLite} $element The root DOM element.
   * @ngInject
   */
  constructor($scope, $element) {
    super();

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
     * Deregistration function for the watcher.
     * @type {Function|undefined}
     * @protected
     */
    this.unwatchLayout = $scope.$watch('layout', this.createDragSource.bind(this));

    this.addDragComponentClass_();

    $scope.$on('$destroy', this.dispose.bind(this));
  }

  /**
   * @inheritDoc
   */
  disposeInternal() {
    super.disposeInternal();

    if (this.dragSource) {
      if (this.dragSource._dragListener) {
        this.dragSource._dragListener.off(GoldenLayoutEvent.DRAG_START, this.onDragStart, this);
        this.dragSource._dragListener.off(GoldenLayoutEvent.DRAG_STOP, this.onDragStop, this);
      }

      this.dragSource = null;
    }

    this.scope = null;
    this.element = null;
  }

  /**
   * Create the Golden Layout drag source.
   * @protected
   */
  createDragSource() {
    if (this.element && this.scope && this.scope['layout'] && this.scope['componentConfig']) {
      var component = /** @type {!GoldenLayout.Component} */ (this.scope['componentConfig']);
      var layout = /** {!GoldenLayout} */ (this.scope['layout']);

      this.dragSource = layout.createDragSource(this.element, component);
      this.addDragListeners();

      this.unwatchLayout();
      this.unwatchLayout = undefined;
    }
  }

  /**
   * Add drag listeners to the drag source.
   * @protected
   */
  addDragListeners() {
    if (this.dragSource) {
      this.dragSource._dragListener.on(GoldenLayoutEvent.DRAG_START, this.onDragStart, this);
      this.dragSource._dragListener.on(GoldenLayoutEvent.DRAG_STOP, this.onDragStop, this);
    }
  }

  /**
   * Toggle the drag state.
   * @param {boolean} dragging If the element is being dragged.
   * @export
   */
  toggleDrag(dragging) {
    this['dragging'] = dragging;

    if (dragging && this.scope && this.scope['layout']) {
      //
      // Golden Layout doesn't drag in new components very well if something is currently maximized. minimize all
      // components on mouse down as a workaround.
      //
      // this must be done on mousedown on the element instead of in the dragStart handler, because changing the layout
      // during the latter will cause problems with the drag proxy.
      //
      minimizeAll(/** @type {!GoldenLayout} */ (this.scope['layout']).root);
    }
  }

  /**
   * Handle drag start event.
   * @protected
   */
  onDragStart() {
    this.scope.$emit(LayoutEvent.DRAGGING, true);
    apply(this.scope);
  }

  /**
   * Handle drag stop event.
   * @protected
   */
  onDragStop() {
    // Golden Layout will create a new drag listener, so add listeners again
    this.addDragListeners();

    this['dragging'] = false;
    this.scope.$emit(LayoutEvent.DRAGGING, false);
    apply(this.scope);
  }

  /**
   * Determine if current scope contains a custom drag component class,
   * if so add the class
   * @private
   */
  addDragComponentClass_() {
    if (this.element &&
        this.scope &&
        this.scope['componentConfig'] &&
        this.scope['componentConfig']['componentState']) {
      var customDragClass = this.scope['componentConfig']['componentState']['dragComponentClass'];
      if (customDragClass && !isEmptyOrWhitespace(customDragClass)) {
        this.element.addClass(customDragClass);
      }
    }
  }
}
