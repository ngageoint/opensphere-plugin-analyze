goog.declareModuleId('plugin.tools.ToolsPlugin');

goog.require('coreui.chart.vega.base.vegaChartDirective');
goog.require('bits');
goog.require('mist.analyze.ButtonUI');
goog.require('mist.analyze.menu');

import {TOOLS_PATH} from './tools';
import {
  directive as toolsMainDirective,
  directiveTag as toolsMainTag
} from './toolsmain';

const GoogEventType = goog.require('goog.events.EventType');

const ComponentManager = goog.require('coreui.layout.ComponentManager');
const MistActionEventType = goog.require('mist.action.EventType');
const analyze = goog.require('mist.analyze');
const countBy = goog.require('mist.menu.countBy');
const mistMenuList = goog.require('mist.menu.list');
const {handleAddColumn} = goog.require('mist.menu.tools');
const widget = goog.require('mist.ui.widget');
const Module = goog.require('tools.ui.Module');

const {inIframe} = goog.require('os');
const Dispatcher = goog.require('os.Dispatcher');
const ActionEventType = goog.require('os.action.EventType');
const {replaceDirective} = goog.require('os.ui');
const osList = goog.require('os.ui.list');
const NavLocation = goog.require('os.ui.nav.Location');
const AbstractPlugin = goog.require('os.plugin.AbstractPlugin');
const PluginManager = goog.require('os.plugin.PluginManager');
const menuList = goog.require('os.ui.menu.list');

const pluginImActionFeaturePluginExt = goog.require('plugin.im.action.feature.PluginExt');
const MilSymPlugin = goog.require('plugin.milsym.MilSymPlugin');
const TrackPlugin = goog.require('plugin.mist.track.TrackPlugin');
const PluginExt = goog.require('plugin.places.PluginExt');


/**
 * Global ToolsPlugin instance.
 * @type {ToolsPlugin|undefined}
 */
let instance;


/**
 */
export default class ToolsPlugin extends AbstractPlugin {
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
    // set up analyze widgets
    var cm = ComponentManager.getInstance();
    cm.registerComponent(widget.Type.LIST, widget.LIST);
    cm.registerComponent(widget.Type.COUNT_BY, widget.COUNT_BY);
    cm.registerComponent(widget.Type.VEGA, widget.VEGA);

    analyze.MENU.listen(MistActionEventType.TOOLS_EXTERNAL, analyze.openExternal);
    analyze.MENU.listen(MistActionEventType.TOOLS_INTERNAL, analyze.openInternal);

    // events forwarded from within an iframe
    const dispatcher = Dispatcher.getInstance();
    dispatcher.listen(ActionEventType.EXPORT, menuList.onExport);
    dispatcher.listen(MistActionEventType.ADDCOLUMN, handleAddColumn);

    // add listeners for action events that must be handled in the main window context
    mistMenuList.setupInternal();
    countBy.setupInternal();

    // add Analyze to top left
    osList.add(NavLocation.TOP_LEFT, '<analyze-button show-label="!punyWindow"></analyze-button>', 250);

    // close external windows when this window is closed
    window.addEventListener(GoogEventType.BEFOREUNLOAD, analyze.closeExternal);

    // export properties for external windows
    analyze.initializeExports();

    // use GV's tools.html
    analyze.setBasePath(TOOLS_PATH);
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

// Replace MIST's tools-main directive with our own.
replaceDirective(toolsMainTag, Module, toolsMainDirective);

if (!(inIframe() || analyze.isExternal(window))) {
  const pm = PluginManager.getInstance();
  pm.addPlugin(ToolsPlugin.getInstance());

  // plugins that add exports for Analyze
  pm.addPlugin(pluginImActionFeaturePluginExt.getInstance());
  pm.addPlugin(PluginExt.getInstance());
  pm.addPlugin(TrackPlugin.getInstance());
  pm.addPlugin(MilSymPlugin.getInstance());
}
