goog.provide('plugin.tools.ToolsPlugin');

goog.require('core.brand');
goog.require('core.brand.BrandOverrides');
goog.require('core.brand.FadeAppSuite');
goog.require('core.fade');
goog.require('coreui.chart.vega.base.vegaChartDirective');
goog.require('coreui.layout.ComponentManager');
goog.require('gv.tools.toolsMainDirective');
goog.require('mist');
goog.require('mist.analyze');
goog.require('mist.analyze.buttonDirective');
goog.require('mist.analyze.menu');
goog.require('mist.menu.chart');
goog.require('mist.menu.countBy');
goog.require('mist.menu.list');
goog.require('mist.menu.tools');
goog.require('mist.ui.widget');
goog.require('os');
goog.require('os.plugin.AbstractPlugin');
goog.require('os.plugin.PluginManager');
goog.require('os.ui.menu.list');
goog.require('os.ui.window');
goog.require('plugin.im.action.feature.PluginExt');
goog.require('plugin.mist.track.TrackPlugin');
goog.require('plugin.places.PluginExt');


/**
 * @extends {os.plugin.AbstractPlugin}
 * @constructor
 */
plugin.tools.ToolsPlugin = function() {
  plugin.tools.ToolsPlugin.base(this, 'constructor');
  this.id = 'tools';
};
goog.inherits(plugin.tools.ToolsPlugin, os.plugin.AbstractPlugin);
goog.addSingletonGetter(plugin.tools.ToolsPlugin);


/**
 * @define {string} The base path to tools.html.
 */
plugin.tools.TOOLS_PATH = goog.define('plugin.tools.TOOLS_PATH', '../opensphere-plugin-analyze/');


/**
 * @inheritDoc
 */
plugin.tools.ToolsPlugin.prototype.init = function() {
  os.ui.injector.get('$rootScope')['appSuite'] = core.appsuite;
  core.brand.APP = core.fade.suite.MIST;

  // set up analyze widgets
  var cm = coreui.layout.ComponentManager.getInstance();
  cm.registerComponent(mist.ui.widget.Type.LIST, mist.ui.widget.LIST);
  cm.registerComponent(mist.ui.widget.Type.COUNT_BY, mist.ui.widget.COUNT_BY);
  cm.registerComponent(mist.ui.widget.Type.CHART, mist.ui.widget.CHART);
  cm.registerComponent(mist.ui.widget.Type.VEGA, mist.ui.widget.VEGA);

  mist.analyze.MENU.listen(mist.action.EventType.TOOLS_EXTERNAL, mist.analyze.openExternal);
  mist.analyze.MENU.listen(mist.action.EventType.TOOLS_INTERNAL, mist.analyze.openInternal);

  // events forwarded from within an iframe
  os.dispatcher.listen(os.action.EventType.EXPORT, os.ui.menu.list.onExport);
  os.dispatcher.listen(mist.action.EventType.ADDCOLUMN, mist.menu.tools.handleAddColumn);

  // add listeners for action events that must be handled in the main window context
  mist.menu.list.setupInternal();
  mist.menu.countBy.setupInternal();
  mist.menu.chart.setupInternal();

  // add Analyze to top left
  os.ui.list.add(os.ui.nav.Location.TOP_LEFT, '<analyze-button show-label="!punyWindow"></analyze-button>', 250);

  // close external windows when this window is closed
  window.addEventListener(goog.events.EventType.BEFOREUNLOAD, mist.analyze.closeExternal);

  // export properties for external windows
  mist.analyze.initializeExports();

  // use GV's tools.html
  mist.analyze.basePath = plugin.tools.TOOLS_PATH;
};

(function() {
  if (!(os.inIframe() || mist.analyze.isExternal(window))) {
    var pm = os.plugin.PluginManager.getInstance();
    pm.addPlugin(plugin.tools.ToolsPlugin.getInstance());

    // plugins that add exports for Analyze
    pm.addPlugin(plugin.im.action.feature.PluginExt.getInstance());
    pm.addPlugin(plugin.places.PluginExt.getInstance());
    pm.addPlugin(plugin.mist.track.TrackPlugin.getInstance());
  }
})();
