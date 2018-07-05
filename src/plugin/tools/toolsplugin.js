goog.provide('plugin.tools.ToolsPlugin');

goog.require('gv.tools.toolsMainDirective');
goog.require('mist');
goog.require('mist.action.chart');
goog.require('mist.action.countBy');
goog.require('mist.action.list');
goog.require('mist.action.tools');
goog.require('mist.analyze');
goog.require('mist.analyze.buttonDirective');
goog.require('mist.analyze.menu');
goog.require('mist.ui.widget');
goog.require('mist.ui.widget.WidgetManager');
goog.require('os');
goog.require('os.plugin.AbstractPlugin');
goog.require('os.plugin.PluginManager');
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
goog.define('plugin.tools.TOOLS_PATH', '../opensphere-plugin-analyze/');


/**
 * @inheritDoc
 */
plugin.tools.ToolsPlugin.prototype.init = function() {
  // set up analyze widgets
  var widgetManager = mist.ui.widget.WidgetManager.getInstance();
  widgetManager.registerWidget(mist.ui.widget.Type.LIST, mist.ui.widget.LIST);
  widgetManager.registerWidget(mist.ui.widget.Type.COUNT_BY, mist.ui.widget.COUNT_BY);
  widgetManager.registerWidget(mist.ui.widget.Type.CHART, mist.ui.widget.CHART);

  mist.analyze.MENU.listen(mist.action.EventType.TOOLS_EXTERNAL, mist.analyze.openExternal);
  mist.analyze.MENU.listen(mist.action.EventType.TOOLS_INTERNAL, mist.analyze.openInternal);

  // events forwarded from within an iframe
  os.dispatcher.listen(os.action.EventType.EXPORT, mist.action.list.handleListEvent);
  os.dispatcher.listen(mist.action.EventType.ADDCOLUMN, mist.action.tools.handleAddColumn);

  // add listeners for action events that must be handled in the main window context
  mist.action.list.setupInternal();
  mist.action.countBy.setupInternal();
  mist.action.chart.setupInternal();

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
