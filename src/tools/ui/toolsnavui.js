goog.module('tools.ui.nav.ToolsNavUI');

goog.require('coreui.layout.LayoutTabsUI');
goog.require('tools.ui.AllTimeCheckboxUI');
goog.require('tools.ui.LayoutButtonUI');
goog.require('tools.ui.SourceSwitcherUI');

const Disposable = goog.require('goog.Disposable');
const list = goog.require('os.ui.list');
const {ROOT} = goog.require('tools');
const {Module} = goog.require('tools.ui.Module');
const nav = goog.require('tools.ui.nav');

/**
 * The toolsnav directive.
 * @return {angular.Directive}
 */
const directive = () => ({
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
class Controller extends Disposable {
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
    list.add(nav.Location.LEFT, 'sourceswitcher', 2);
    list.add(nav.Location.LEFT, 'alltimecheckbox', 3);

    // add items to the right nav
    list.add(nav.Location.RIGHT, 'layout-button', 1);

    // listen for events from the source switcher
    $scope.$on(nav.Event.SOURCE, this.onSourceChange.bind(this));

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
   * @param {os.source.ISource|undefined} source The source.
   * @protected
   */
  onSourceChange(event, source) {
    if (this.scope) {
      this.scope['source'] = source;
    }
  }
}

exports = {
  Controller,
  directive
};
