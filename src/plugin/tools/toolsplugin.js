goog.declareModuleId('plugin.tools.ToolsPlugin');

goog.require('mist.analyze.ButtonUI');
goog.require('mist.mixin.places');

import * as ToolsMain from './toolsmain.js'; // eslint-disable-line
import {ToolsSettingsInitializer} from './settingsinitializer.js';
import * as Dispatcher from 'opensphere/src/os/dispatcher.js';

const GoogEventType = goog.require('goog.events.EventType');

const ComponentManager = goog.require('coreui.layout.ComponentManager');
const MistActionEventType = goog.require('mist.action.EventType');
const {closeExternal, initializeExports, isAnalyze} = goog.require('mist.analyze');
const analyzeMenu = goog.require('mist.analyze.menu');
const countBy = goog.require('mist.menu.countBy');
const mistMenuList = goog.require('mist.menu.list');
const {handleAddColumn} = goog.require('mist.menu.tools');
const mistLayerMenu = goog.require('mist.ui.menu.layer');
const widget = goog.require('mist.ui.widget');

const ActionEventType = goog.require('os.action.EventType');
const osList = goog.require('os.ui.list');
const NavLocation = goog.require('os.ui.nav.Location');
const AbstractPlugin = goog.require('os.plugin.AbstractPlugin');
const PluginManager = goog.require('os.plugin.PluginManager');
const menuList = goog.require('os.ui.menu.list');

const {FeatureActionPluginExt} = goog.require('plugin.im.action.feature.FeatureActionPluginExt');
const {MilSymPlugin} = goog.require('plugin.milsym.MilSymPlugin');
const {TrackPlugin} = goog.require('plugin.mist.track.TrackPlugin');
const {PlacesPluginExt} = goog.require('plugin.places.PlacesPluginExt');


/**
 * Global ToolsPlugin instance.
 * @type {ToolsPlugin|undefined}
 */
let instance;


/**
 */
export class ToolsPlugin extends AbstractPlugin {
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

    // Set up the Analyze button menu.
    analyzeMenu.setup();

    // events forwarded from within an iframe
    const dispatcher = Dispatcher.getInstance();
    dispatcher.listen(ActionEventType.EXPORT, menuList.onExport);
    dispatcher.listen(MistActionEventType.ADDCOLUMN, handleAddColumn);

    // add listeners for action events that must be handled in the main window context
    mistMenuList.setupInternal();
    countBy.setupInternal();

    // initialize extra menus provided by MIST
    mistLayerMenu.setup();

    // add Analyze to top left
    osList.add(NavLocation.TOP_LEFT, '<analyze-button show-label="!punyWindow"></analyze-button>', 250);

    // close external windows when this window is closed
    window.addEventListener(GoogEventType.BEFOREUNLOAD, closeExternal);

    // export properties for external windows
    initializeExports();
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

if (isAnalyze()) {
  // Initialize settings for the Analyze window.
  const settingsInitializer = new ToolsSettingsInitializer();
  settingsInitializer.init();
} else {
  // Add the plugin to the main app.
  const pm = PluginManager.getInstance();
  pm.addPlugin(ToolsPlugin.getInstance());

  // Add plugins that provide exports for the Analyze window.
  pm.addPlugin(FeatureActionPluginExt.getInstance());
  pm.addPlugin(PlacesPluginExt.getInstance());
  pm.addPlugin(TrackPlugin.getInstance());
  pm.addPlugin(MilSymPlugin.getInstance());
}
