goog.declareModuleId('plugin.tools.ToolsPlugin');

import './toolsmain.js';
import '../../mist/analyze/analyzebutton.js';
import '../../mist/mixin/placesmanager.js';

import {ToolsSettingsInitializer} from './settingsinitializer.js';
import {FeatureActionPluginExt} from '../featureaction/featureactionpluginext.js';
import {MilSymPlugin} from '../milsym/milsymplugin.js';
import {TrackPlugin} from '../track/misttrackplugin.js';
import {PlacesPluginExt} from '../places/ext/placespluginext.js';
import {ComponentManager} from '../../coreui/layout/componentmanager.js';
import {AnalyzeEventType} from '../../mist/analyze/eventtype.js';
import {closeExternal, initializeExports, isAnalyze} from '../../mist/analyze/analyze.js';
import * as analyzeMenu from '../../mist/analyze/analyzemenu.js';
import * as countByMenu from '../../mist/menu/countbymenu.js';
import * as listMenu from '../../mist/menu/listmenu.js';
import {handleAddColumn} from '../../mist/menu/toolsmenu.js';
import * as layerMenu from '../../mist/ui/menu/layermenu.js';
import * as widget from '../../mist/ui/widget/widget.js';

import * as Dispatcher from 'opensphere/src/os/dispatcher.js';

const GoogEventType = goog.require('goog.events.EventType');
const ActionEventType = goog.require('os.action.EventType');
const osList = goog.require('os.ui.list');
const NavLocation = goog.require('os.ui.nav.Location');
const AbstractPlugin = goog.require('os.plugin.AbstractPlugin');
const PluginManager = goog.require('os.plugin.PluginManager');
const menuList = goog.require('os.ui.menu.list');


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
    dispatcher.listen(AnalyzeEventType.ADDCOLUMN, handleAddColumn);

    // add listeners for action events that must be handled in the main window context
    listMenu.setupInternal();
    countByMenu.setupInternal();

    // initialize extra menus provided by MIST
    layerMenu.setup();

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
