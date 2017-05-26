goog.provide('plugin.tools.ToolsPlugin');

goog.require('mist.action.analyze');
goog.require('mist.action.chart');
goog.require('mist.action.countBy');
goog.require('mist.action.layer');
goog.require('mist.action.list');
goog.require('mist.action.tools');
goog.require('mist.ui.widget');
goog.require('mist.ui.widget.WidgetType');
goog.require('os');
goog.require('os.plugin.AbstractPlugin');
goog.require('os.ui.widget.WidgetManager');
goog.require('os.ui.window');
goog.require('plugin.mist.analyzeButtonDirective');
goog.require('plugin.mist.defines');


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
goog.define('plugin.mist.TOOLS_PATH', mist.ROOT);


/**
 * @define {string} The path to the tools page
 */
goog.define('plugin.tools.TOOLS_PATH', '../opensphere-plugin-analyze/');


/**
 * @inheritDoc
 */
plugin.tools.ToolsPlugin.prototype.init = function() {
  // set up analyze widgets
  var widgetManager = os.ui.widget.WidgetManager.getInstance();
  widgetManager.registerWidget(mist.ui.widget.WidgetType.LIST, mist.ui.widget.LIST);
  widgetManager.registerWidget(mist.ui.widget.WidgetType.COUNT_BY, mist.ui.widget.COUNT_BY);
  widgetManager.registerWidget(mist.ui.widget.WidgetType.CHART, mist.ui.widget.CHART);
  goog.exportSymbol('exports.widgetManager', os.ui.widget.WidgetManager.getInstance());

  mist.action.layer.setup();
  mist.action.analyze.setup();

  // events forwarded from within an iframe
  os.dispatcher.listen(os.action.EventType.EXPORT, mist.action.list.handleListEvent);
  os.dispatcher.listen(mist.action.EventType.ADDCOLUMN, mist.action.tools.handleAddColumn);

  // add listeners for action events that must be handled in the main window context
  mist.action.list.setupInternal();
  mist.action.countBy.setupInternal();
  mist.action.chart.setupInternal();
  mist.ui.widget.actionSetup();

  mist.action.analyze.manager.listen(mist.action.EventType.TOOLS_EXTERNAL, plugin.tools.openExternal);
  mist.action.analyze.manager.listen(mist.action.EventType.TOOLS_INTERNAL, plugin.tools.openInternal);

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
};


/**
 * Opens the analyze tools in a new tab/window
 */
plugin.tools.openExternal = function() {
  window.open(plugin.tools.TOOLS_PATH + 'tools.html', '_blank');
};
goog.exportProperty(plugin.mist.AnalyzeButtonCtrl.prototype, 'open', plugin.tools.openExternal);


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
  if (!(os.inIframe() || os.isExternal(window))) {
    os.plugin.PluginManager.getInstance().addPlugin(plugin.tools.ToolsPlugin.getInstance());
  }
})();
