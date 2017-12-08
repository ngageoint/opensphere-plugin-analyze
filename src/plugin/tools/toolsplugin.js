goog.provide('plugin.tools.ToolsPlugin');

goog.require('mist.action.chart');
goog.require('mist.action.countBy');
goog.require('mist.action.layer');
goog.require('mist.action.list');
goog.require('mist.action.tools');
goog.require('mist.analyze.buttonDirective');
goog.require('mist.analyze.menu');
goog.require('mist.ui.widget');
goog.require('mist.ui.widget.WidgetManager');
goog.require('os');
goog.require('os.plugin.AbstractPlugin');
goog.require('os.ui.window');
goog.require('plugin.im.action.feature.PluginExt');
goog.require('plugin.mist.defines');
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
 * @define {string} The path to the tools page
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

  mist.action.layer.setup();

  mist.analyze.MENU.listen(mist.action.EventType.TOOLS_EXTERNAL, plugin.tools.openExternal);
  mist.analyze.MENU.listen(mist.action.EventType.TOOLS_INTERNAL, plugin.tools.openInternal);

  // events forwarded from within an iframe
  os.dispatcher.listen(os.action.EventType.EXPORT, mist.action.list.handleListEvent);
  os.dispatcher.listen(mist.action.EventType.ADDCOLUMN, mist.action.tools.handleAddColumn);

  // add listeners for action events that must be handled in the main window context
  mist.action.list.setupInternal();
  mist.action.countBy.setupInternal();
  mist.action.chart.setupInternal();

  os.ui.action.windows.addWindow('analyze', {
    'icon': 'fa fa-list-alt lt-blue-icon',
    'label': 'Analyze',
    'description': 'List tool, count by, and other tools for analysis'
  }, true, plugin.tools.openExternal);

  os.ui.action.windows.addWindow('analyze-int', {
    'icon': 'fa fa-list-alt lt-blue-icon',
    'label': 'Analyze (Internal)',
    'description': 'List tool, count by, and other tools for analysis'
  }, true, plugin.tools.openInternal);

  // add Analyze to top left
  os.ui.list.add(os.ui.nav.Location.TOP_LEFT, '<analyze-button show-label="!punyWindow"></analyze-button>', 250);

  // export properties for external windows
  mist.analyze.initializeExports();

  // close external windows when this window is closed
  window.addEventListener(goog.events.EventType.BEFOREUNLOAD, mist.analyze.closeExternal);
};


/**
 * Opens the analyze tools in a new tab/window
 */
plugin.tools.openExternal = function() {
  window.open(plugin.tools.TOOLS_PATH + 'tools.html', '_blank');
};
goog.exportProperty(mist.analyze.ButtonCtrl.prototype, 'open', plugin.tools.openExternal);


/**
 * Opens the analyze tools internally via iframe
 */
plugin.tools.openInternal = function() {
  var id = 'analyze-window';

  if (os.ui.window.getById(id)) {
    os.ui.window.bringToFront(id);
  } else {
    var html = '<savedwindow id="' + id + '" key="analyze" label="Analyze"' +
        ' icon="lt-blue-icon fa fa-list-alt" x="center" y="center" width="765" height="525"' +
        ' min-width="515" max-width="1500" min-height="250" max-height="1000" show-close="true"' +
        ' no-scroll="true">' +
        '<iframe width="100%" height="100%" ng-src="' + plugin.tools.TOOLS_PATH + 'tools.html"></iframe>' +
        '</savedwindow>';

    os.ui.window.launch(html);
  }
};

(function() {
  if (!(os.inIframe() || mist.analyze.isExternal(window))) {
    var pm = os.plugin.PluginManager.getInstance();
    pm.addPlugin(plugin.tools.ToolsPlugin.getInstance());

    // plugins that add exports for Analyze
    pm.addPlugin(plugin.im.action.feature.PluginExt.getInstance());
    pm.addPlugin(plugin.places.PluginExt.getInstance());
  }
})();
