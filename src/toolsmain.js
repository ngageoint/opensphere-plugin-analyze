goog.module('gv.tools.ToolsMainUI');

goog.require('mistdefines');
goog.require('os');
goog.require('os.ui.ngRightClickDirective');
goog.require('os.ui.util.autoHeightDirective');

const log = goog.require('goog.log');
const SettingsInitializer = goog.require('mist.analyze.SettingsInitializer');
const ui = goog.require('os.ui');
const ScatterChartPlugin = goog.require('plugin.chart.scatter.ScatterChartPlugin');
const KMLPluginExt = goog.require('plugin.file.kml.KMLPluginExt');
const pluginImActionFeaturePluginExt = goog.require('plugin.im.action.feature.PluginExt');
const ImageryPlugin = goog.require('plugin.imagery.ImageryPlugin');
const TrackPlugin = goog.require('plugin.mist.track.TrackPlugin');
const PluginExt = goog.require('plugin.places.PluginExt');
const AbstractToolsMainCtrl = goog.require('tools.ui.AbstractToolsMainCtrl');
const Module = goog.require('tools.ui.Module');
const Logger = goog.requireType('goog.log.Logger');


/**
 * Logger
 * @type {Logger}
 */
const LOGGER = log.getLogger('gv.tools.ToolsMainCtrl');


/**
 * The tools-main directive
 * @return {angular.Directive}
 */
const directive = () => ({
  restrict: 'E',
  replace: true,
  scope: true,
  templateUrl: mist.ROOT + 'views/toolsmain.html',
  controller: Controller,
  controllerAs: 'toolsMain'
});
ui.replaceDirective('toolsMain', Module, directive);


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
    ui.pluginManager.plugins_.length = 0;

    ui.pluginManager.addPlugin(new KMLPluginExt());
    ui.pluginManager.addPlugin(ScatterChartPlugin.getInstance());
    ui.pluginManager.addPlugin(pluginImActionFeaturePluginExt.getInstance());
    ui.pluginManager.addPlugin(PluginExt.getInstance());
    ui.pluginManager.addPlugin(TrackPlugin.getInstance());
    ui.pluginManager.addPlugin(ImageryPlugin.getInstance());
  }
}

if (mist.analyze.isAnalyze()) {
  // Initialize settings for this app
  var settingsInitializer = new SettingsInitializer();
  settingsInitializer.init();
}

exports = {
  Controller,
  directive
};
