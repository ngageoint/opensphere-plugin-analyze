goog.module('plugin.tools.ToolsPlugin');

goog.require('core.brand.BrandOverrides');
goog.require('core.brand.FadeAppSuite');
goog.require('coreui.chart.vega.base.vegaChartDirective');
goog.require('gv.tools.ToolsMainUI');
goog.require('mist.analyze.buttonDirective');
goog.require('mist.analyze.menu');

const brand = goog.require('core.brand');
const fade = goog.require('core.fade');
const ComponentManager = goog.require('coreui.layout.ComponentManager');
const mist = goog.require('mist');
const analyze = goog.require('mist.analyze');
const chart = goog.require('mist.menu.chart');
const countBy = goog.require('mist.menu.countBy');
const mistMenuList = goog.require('mist.menu.list');
const tools = goog.require('mist.menu.tools');
const widget = goog.require('mist.ui.widget');
const os = goog.require('os');
const AbstractPlugin = goog.require('os.plugin.AbstractPlugin');
const PluginManager = goog.require('os.plugin.PluginManager');
const list = goog.require('os.ui.menu.list');
const pluginImActionFeaturePluginExt = goog.require('plugin.im.action.feature.PluginExt');
const TrackPlugin = goog.require('plugin.mist.track.TrackPlugin');
const PluginExt = goog.require('plugin.places.PluginExt');
const {TOOLS_PATH} = goog.require('plugin.tools');


/**
 */
class ToolsPlugin extends AbstractPlugin {
  /**
   * Constructor.
   */
  constructor() {
    super();
    this.id = 'tools';
  }

  /**
   * @inheritDoc
   */
  init() {
    os.ui.injector.get('$rootScope')['appSuite'] = core.appsuite;
    brand.APP = fade.suite.MIST;

    // set up analyze widgets
    var cm = ComponentManager.getInstance();
    cm.registerComponent(widget.Type.LIST, widget.LIST);
    cm.registerComponent(widget.Type.COUNT_BY, widget.COUNT_BY);
    cm.registerComponent(widget.Type.CHART, widget.CHART);
    cm.registerComponent(widget.Type.VEGA, widget.VEGA);

    analyze.MENU.listen(mist.action.EventType.TOOLS_EXTERNAL, analyze.openExternal);
    analyze.MENU.listen(mist.action.EventType.TOOLS_INTERNAL, analyze.openInternal);

    // events forwarded from within an iframe
    os.dispatcher.listen(os.action.EventType.EXPORT, list.onExport);
    os.dispatcher.listen(mist.action.EventType.ADDCOLUMN, tools.handleAddColumn);

    // add listeners for action events that must be handled in the main window context
    mistMenuList.setupInternal();
    countBy.setupInternal();
    chart.setupInternal();

    // add Analyze to top left
    os.ui.list.add(os.ui.nav.Location.TOP_LEFT, '<analyze-button show-label="!punyWindow"></analyze-button>', 250);

    // close external windows when this window is closed
    window.addEventListener(goog.events.EventType.BEFOREUNLOAD, analyze.closeExternal);

    // export properties for external windows
    analyze.initializeExports();

    // use GV's tools.html
    analyze.basePath = TOOLS_PATH;
  }

  /**
   * Get the global instance.
   * @return {!ToolsPlugin}
   */
  static getInstance() {
    if (!instance) {
      instance = new ToolsPlugin();
    }

    return instance;
  }
}

/**
 * Global ToolsPlugin instance.
 * @type {ToolsPlugin|undefined}
 */
let instance;


(function() {
  if (!(os.inIframe() || analyze.isExternal(window))) {
    var pm = PluginManager.getInstance();
    pm.addPlugin(ToolsPlugin.getInstance());

    // plugins that add exports for Analyze
    pm.addPlugin(pluginImActionFeaturePluginExt.getInstance());
    pm.addPlugin(PluginExt.getInstance());
    pm.addPlugin(TrackPlugin.getInstance());
  }
})();
exports = ToolsPlugin;
