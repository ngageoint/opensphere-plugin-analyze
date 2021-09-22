goog.declareModuleId('tools.ui.nav.ToolsNavUI');

import './alltimecheckbox.js';
import './layoutbutton.js';
import './sourceswitcher.js';
import '../../coreui/layout/layouttabs.js';

import {ROOT} from '../tools.js';
import {Module} from './module.js';
import {Event as NavEvent, Location} from './toolsnav.js';

const Disposable = goog.require('goog.Disposable');
const ISource = goog.requireType('os.source.ISource');
const {add} = goog.require('os.ui.list');


/**
 * The toolsnav directive.
 * @return {angular.Directive}
 */
export const directive = () => ({
  restrict: 'E',
  replace: true,

  scope: {
    'allTime': '=',
    'showLayoutPanel': '=',
    'source': '=',
    'layoutConfigs': '='
  },

  templateUrl: ROOT + 'views/tools/toolsnav.html',
  controller: Controller,
  controllerAs: 'toolsNav'
});

Module.directive('toolsnav', [directive]);

/**
 * Controller for the tools nav directive.
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

    // add items to the left nav
    add(Location.LEFT, 'sourceswitcher', 2);
    add(Location.LEFT, 'alltimecheckbox', 3);

    // add items to the right nav
    add(Location.RIGHT, 'layout-button', 1);

    // listen for events from the source switcher
    $scope.$on(NavEvent.SOURCE, this.onSourceChange.bind(this));

    $scope.$on('$destroy', this.dispose.bind(this));
  }

  /**
   * @inheritDoc
   */
  disposeInternal() {
    super.disposeInternal();

    this.scope = null;
    this.element = null;
  }

  /**
   * Handle Angular source change events from the source switcher.
   * @param {angular.Scope.Event} event The event.
   * @param {ISource|undefined} source The source.
   * @protected
   */
  onSourceChange(event, source) {
    if (this.scope) {
      this.scope['source'] = source;
    }
  }
}
