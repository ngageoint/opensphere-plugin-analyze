goog.declareModuleId('plugin.tools.ToolsMain');

goog.require('os.ui.ngRightClickDirective');
goog.require('os.ui.util.autoHeightDirective');

const {ROOT} = goog.require('mist');
const log = goog.require('goog.log');
const {isAnalyze} = goog.require('mist.analyze');
const SettingsInitializer = goog.require('mist.analyze.SettingsInitializer');
const PluginManager = goog.require('os.plugin.PluginManager');
const KMLPluginExt = goog.require('plugin.file.kml.KMLPluginExt');
const FeatureActionPluginExt = goog.require('plugin.im.action.feature.PluginExt');
const TrackPlugin = goog.require('plugin.mist.track.TrackPlugin');
const PiwikPlugin = goog.require('plugin.piwik.PiwikPlugin');
const PlacesPluginExt = goog.require('plugin.places.PluginExt');
const AbstractToolsMainCtrl = goog.require('tools.ui.AbstractToolsMainCtrl');

const Logger = goog.requireType('goog.log.Logger');


/**
 * Logger
 * @type {Logger}
 */
const LOGGER = log.getLogger('plugin.tools.ToolsMain');


/**
 * The tools-main directive
 * @return {angular.Directive}
 */
export const directive = () => ({
  restrict: 'E',
  replace: true,
  scope: true,
  templateUrl: ROOT + 'views/toolsmain.html',
  controller: Controller,
  controllerAs: 'toolsMain'
});


/**
 * The element tag for the directive.
 * @type {string}
 */
export const directiveTag = 'toolsMain';


/**
 * Controller function for the Tools Main directive
 * @unrestricted
 */
class Controller extends AbstractToolsMainCtrl {
  /**
   * Constructor.
   * @param {!angular.Scope} $scope The Angular scope.
   * @param {!angular.JQLite} $element The root DOM element.
   * @param {!angular.$compile} $compile The Angular $compile service.
   * @param {!angular.$timeout} $timeout The Angular $timeout service.
   * @param {!angular.$injector} $injector The Angular injector.
   * @ngInject
   */
  constructor($scope, $element, $compile, $timeout, $injector) {
    super($scope, $element, $compile, $timeout, $injector);
    this.log = LOGGER;
  }

  /**
   * @inheritDoc
   * @suppress {accessControls}
   */
  addPlugins() {
    super.addPlugins();

    // TODO: Due to the new way we load plugins, plugins for the main application
    // will attempt to load themselves into the Analyze window. This is a quick
    // way to get what we want, but we should look into a better way to do this.
    const pm = PluginManager.getInstance();
    pm.plugins_.length = 0;

    pm.addPlugin(new KMLPluginExt());
    pm.addPlugin(FeatureActionPluginExt.getInstance());
    pm.addPlugin(PlacesPluginExt.getInstance());
    pm.addPlugin(TrackPlugin.getInstance());
    pm.addPlugin(new PiwikPlugin());
  }
}

if (isAnalyze()) {
  // Initialize settings for this app
  const settingsInitializer = new SettingsInitializer();
  settingsInitializer.init();
}
