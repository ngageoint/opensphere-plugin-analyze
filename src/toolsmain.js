goog.provide('gv.tools.ToolsMainCtrl');
goog.provide('gv.tools.toolsMainDirective');

goog.require('goog.log');
goog.require('goog.log.Logger');
goog.require('mistdefines');
goog.require('os');
goog.require('os.ui');
goog.require('os.ui.ngRightClickDirective');
goog.require('os.ui.util.autoHeightDirective');
goog.require('plugin.chart.scatter.ScatterChartPlugin');
goog.require('plugin.file.kml.KMLPluginExt');
goog.require('plugin.im.action.feature.PluginExt');
goog.require('plugin.mist.track.TrackPlugin');
goog.require('plugin.places.PluginExt');
goog.require('tools.ui.AbstractToolsMainCtrl');
goog.require('tools.ui.Module');


/**
 * The tools-main directive
 * @return {angular.Directive}
 */
gv.tools.toolsMainDirective = function() {
  return {
    restrict: 'E',
    replace: true,
    scope: true,
    templateUrl: mist.ROOT + 'views/toolsmain.html',
    controller: gv.tools.ToolsMainCtrl,
    controllerAs: 'toolsMain'
  };
};


os.ui.replaceDirective('toolsMain', tools.ui.Module, gv.tools.toolsMainDirective);


/**
 * Controller function for the Tools Main directive
 * @param {!angular.Scope} $scope The Angular scope.
 * @param {!angular.JQLite} $element The root DOM element.
 * @param {!angular.$compile} $compile The Angular $compile service.
 * @param {!angular.$timeout} $timeout The Angular $timeout service.
 * @param {!angular.$injector} $injector The Angular injector.
 * @extends {tools.ui.AbstractToolsMainCtrl}
 * @constructor
 * @ngInject
 */
gv.tools.ToolsMainCtrl = function($scope, $element, $compile, $timeout, $injector) {
  gv.tools.ToolsMainCtrl.base(this, 'constructor', $scope, $element, $compile, $timeout, $injector);
  this.log = gv.tools.ToolsMainCtrl.LOGGER_;
};
goog.inherits(gv.tools.ToolsMainCtrl, tools.ui.AbstractToolsMainCtrl);


/**
 * Logger
 * @type {goog.log.Logger}
 * @private
 * @const
 */
gv.tools.ToolsMainCtrl.LOGGER_ = goog.log.getLogger('gv.tools.ToolsMainCtrl');


/**
 * @inheritDoc
 * @suppress {accessControls}
 */
gv.tools.ToolsMainCtrl.prototype.addPlugins = function() {
  gv.tools.ToolsMainCtrl.base(this, 'addPlugins');

  // TODO: Due to the new way we load plugins, plugins for the main application
  // will attempt to load themselves into the Analyze window. This is a quick
  // way to get what we want, but we should look into a better way to do this.
  os.ui.pluginManager.plugins_.length = 0;

  os.ui.pluginManager.addPlugin(new plugin.file.kml.KMLPluginExt());
  os.ui.pluginManager.addPlugin(plugin.chart.scatter.ScatterChartPlugin.getInstance());
  os.ui.pluginManager.addPlugin(plugin.im.action.feature.PluginExt.getInstance());
  os.ui.pluginManager.addPlugin(plugin.places.PluginExt.getInstance());
  os.ui.pluginManager.addPlugin(plugin.mist.track.TrackPlugin.getInstance());
};
