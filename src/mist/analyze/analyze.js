goog.declareModuleId('mist.analyze');

import AlertManager from 'opensphere/src/os/alert/alertmanager.js';
import * as buffer from 'opensphere/src/os/buffer/buffer.js';
import CommandProcessor from 'opensphere/src/os/command/commandprocessor.js';
import settings from 'opensphere/src/os/config/settings.js';
import DataManager from 'opensphere/src/os/data/datamanager.js';
import * as Dispatcher from 'opensphere/src/os/dispatcher.js';
import BaseFilterManager from 'opensphere/src/os/filter/basefiltermanager.js';
import {setIMapContainer, setMapContainer} from 'opensphere/src/os/map/mapinstance.js';
import MapContainer from 'opensphere/src/os/mapcontainer.js';
import Metrics from 'opensphere/src/os/metrics/metrics.js';
import {getCrossOrigin, setGetCrossOriginFn} from 'opensphere/src/os/net/net.js';
import {getParentWindow} from 'opensphere/src/os/os.js';
import AreaManager from 'opensphere/src/os/query/areamanager.js';
import FilterManager from 'opensphere/src/os/query/filtermanager.js';
import {setAreaManager, setFilterManager, setQueryManager} from 'opensphere/src/os/query/queryinstance.js';
import QueryManager from 'opensphere/src/os/query/querymanager.js';
import * as osStyle from 'opensphere/src/os/style/style.js';
import {setStyleManager} from 'opensphere/src/os/style/styleinstance.js';
import StyleManager from 'opensphere/src/os/style/stylemanager_shim.js';
import TimelineController from 'opensphere/src/os/time/timelinecontroller.js';
import * as column from 'opensphere/src/os/ui/column/column.js';
import ColumnActionManager from 'opensphere/src/os/ui/columnactions/columnactionmanager.js';
import SettingsManager from 'opensphere/src/os/ui/config/settingsmanager.js';
import exportManager from 'opensphere/src/os/ui/file/uiexportmanager.js';
import IconSelectorManager from 'opensphere/src/os/ui/icon/iconselectormanager.js';
import ImportManager from 'opensphere/src/os/ui/im/importmanager.js';
import MetricsManager from 'opensphere/src/os/ui/metrics/metricsmanager.js';
import {launchPropertyInfo} from 'opensphere/src/os/ui/propertyinfo.js';
import * as osWindow from 'opensphere/src/os/ui/window.js';
import Peer from 'opensphere/src/os/xt/peer.js';
import {ComponentManager} from '../../coreui/layout/componentmanager.js';

const googLog = goog.require('goog.log');
const GeoJSON = goog.require('ol.format.GeoJSON');

const Uri = goog.requireType('goog.Uri');
const EventTarget = goog.requireType('goog.events.EventTarget');
const Feature = goog.requireType('ol.Feature');
const {default: CrossOrigin} = goog.requireType('os.net.CrossOrigin');


/**
 * Property set on `window` with all application exports from the main window.
 * @type {string}
 */
export const EXPORT_PROPERTY = '_mistExports';

/**
 * @define {string} The base path to tools.html.
 */
export const TOOLS_PATH = goog.define('mist.analyze.TOOLS_PATH', '../opensphere-plugin-analyze/');

/**
 * Selector for the Analyze app.
 * @type {string}
 */
export const AppSelector = '#ng-app.js-analyze';

/**
 * Analyze window instances.
 * @type {!Object<string, !Window>}
 */
let analyzeWindows = {};

/**
 * Checks whether the current window context contains the Analyze app selector.
 * @return {boolean} If this is the Analyze app.
 */
export const isAnalyze = function() {
  return !!document.querySelector(AppSelector);
};

/**
 * Get an external window by id.
 * @param {string} id The window id.
 * @return {Window|undefined} The window, if registered.
 */
export const getExternal = function(id) {
  let win = analyzeWindows[id];
  if (win && win.closed) {
    // window was closed, but not cleaned up. drop the reference.
    unregisterExternal(id);
    win = undefined;
  }

  return win;
};

/**
 * Registers an external window as being a child of this app
 * @param {string} id The window id.
 * @param {Window} win The window.
 */
export let registerExternal = function(id, win) {
  if (win && !analyzeWindows[id]) {
    analyzeWindows[id] = win;
  }
};

/**
 * Unregisters an external window (typically on close of that window)
 * @param {string} id the window id.
 */
export let unregisterExternal = function(id) {
  delete analyzeWindows[id];
};

/**
 * Closes all the registered external windows
 */
export const closeExternal = function() {
  for (const id in analyzeWindows) {
    analyzeWindows[id].close();
  }

  analyzeWindows = {};
};

/**
 * Checks if the current window was launched externally from another window.
 *
 * @param {Window=} opt_window A Window context other than "this" window.
 * @return {boolean} If this is an external window
 */
export const isExternal = function(opt_window) {
  try {
    // all browsers will block cross-origin access to Window.document and throw an exception
    return window.opener != null && window.opener.document != null;
  } catch (e) {
    // assume the opener wasn't our window
    return false;
  }
};

/**
 * Get the exports object from the main window.
 * @return {(Object<string, *>|undefined)}
 */
export const getExports = function() {
  const win = getParentWindow();
  return win !== window ? win[EXPORT_PROPERTY] : undefined;
};

/**
 * Get the export functions object from the main window.
 * @return {(Object<string, Function>|undefined)}
 */
export const getExportFns = function() {
  const xp = getExports();
  if (xp && xp['functions']) {
    return /** @type {!Object<string, Function>} */ (xp['functions']);
  }

  return undefined;
};

/**
 * Export a symbol on `window` for use in Analyze.
 * @param {string} symbol Unobfuscated name to export.
 * @param {*} value The value to export.
 */
export const exportSymbol = function(symbol, value) {
  goog.exportSymbol(EXPORT_PROPERTY + '.' + symbol, value);
};

/**
 * Exports properties for external access by the Analyze window.
 * @suppress {accessControls} To provide access to private properties.
 */
export const initializeExports = function() {
  exportSymbol('dispatcher', Dispatcher.getInstance());
  exportSymbol('commandStack', CommandProcessor.getInstance());
  exportSymbol('dataManager', DataManager.getInstance());
  exportSymbol('filterManager', FilterManager.getInstance());
  exportSymbol('queryManager', QueryManager.getInstance());
  exportSymbol('areaManager', AreaManager.getInstance());
  exportSymbol('importManager', ImportManager.getInstance());
  exportSymbol('columnActionManager', ColumnActionManager.getInstance());
  exportSymbol('exportManager', exportManager);
  exportSymbol('map', MapContainer.getInstance());
  exportSymbol('registerExternal', registerExternal);
  exportSymbol('unregisterExternal', unregisterExternal);
  exportSymbol('settings', settings.getInstance());
  exportSymbol('styleManager', StyleManager.getInstance());
  exportSymbol('settingsManager', SettingsManager.getInstance());
  exportSymbol('metricsManager', MetricsManager.getInstance());
  exportSymbol('alertManager', AlertManager.getInstance());
  exportSymbol('timelineController', TimelineController.getInstance());
  exportSymbol('iconSelectorManager', IconSelectorManager.getInstance());
  exportSymbol('peer', Peer.getInstance());
  exportSymbol('logRegistryInstance', googLog.LogRegistry_.instance_);
  exportSymbol('metrics', Metrics.getInstance());
  exportSymbol('componentManager', ComponentManager.getInstance());

  /**
   * Functions that must be run in the main application context. Primarily OL3 functions that use instanceof or
   * goog.asserts.assertInstanceof, both of which will fail comparing an object/class across window contexts. It
   * unfortunately isn't sufficient to use fn.call(window.parent, ...) because you're still calling the function
   * reference from the wrong window.
   *
   * If the below list is changed, make sure you also update `mist.analyze.replaceExportFunctions`.
   *
   * @type {Object<string, Function>}
   */
  const exportFunctions = {
    'createBufferFromConfig': buffer.createFromConfig,
    'writeGeomAsJSON': GeoJSON.writeGeometry_,
    'launchColumnManager': column.launchColumnManager,
    'launchFilterEdit': BaseFilterManager.edit,
    'launchPropertyInfo': launchPropertyInfo,
    'notifyStyleChange': osStyle.notifyStyleChange,
    'setFeatureStyle': osStyle.setFeatureStyle,
    'getCrossOrigin': getCrossOrigin
  };
  exportSymbol('functions', exportFunctions);
};

/**
 * Restores the singleton getters from exported instances.
 * @suppress {accessControls} To provide access to private properties.
 */
export const restoreSingletonsFromExports = function() {
  // find the main application
  const xp = getExports();
  if (xp) {
    // make the same exports list available on this window
    window[EXPORT_PROPERTY] = xp;

    Object.assign(Peer, {
      getInstance: function() {
        return /** @type {!Peer} */ (xp['peer']);
      }});

    // modularized singletons use setInstance to replace the local instance with one from the main window
    if (xp['alertManager']) {
      AlertManager.setInstance(/** @type {!AlertManager} */ (xp['alertManager']));
    }
    if (xp['areaManager']) {
      const areaManager = /** @type {!AreaManager} */ (xp['areaManager']);
      AreaManager.setInstance(areaManager);
      setAreaManager(areaManager);
    }
    if (xp['commandStack']) {
      CommandProcessor.setInstance(/** @type {!CommandProcessor} */ (xp['commandStack']));
    }
    if (xp['componentManager']) {
      ComponentManager.setInstance(/** @type {!ComponentManager} */ (xp['componentManager']));
    }
    if (xp['dataManager']) {
      DataManager.setInstance(/** @type {!DataManager} */ (xp['dataManager']));
    }
    if (xp['dispatcher']) {
      Dispatcher.setInstance(/** @type {!EventTarget} */ (xp['dispatcher']));
    }
    if (xp['filterManager']) {
      const filterManager = /** @type {!FilterManager} */ (xp['filterManager']);
      FilterManager.setInstance(filterManager);
      setFilterManager(filterManager);
    }
    if (xp['iconSelectorManager']) {
      IconSelectorManager.setInstance(/** @type {!IconSelectorManager} */ (xp['iconSelectorManager']));
    }
    if (xp['importManager']) {
      ImportManager.setInstance(/** @type {!ImportManager} */ (xp['importManager']));
    }
    if (xp['map']) {
      const mapContainer = /** @type {!MapContainer} */ (xp['map']);
      MapContainer.setInstance(mapContainer);
      setIMapContainer(mapContainer);
      setMapContainer(mapContainer);
    }
    if (xp['metrics']) {
      Metrics.setInstance(/** @type {!Metrics} */ (xp['metrics']));
    }
    if (xp['metricsManager']) {
      MetricsManager.setInstance(/** @type {!MetricsManager} */ (xp['metricsManager']));
    }
    if (xp['queryManager']) {
      const queryManager = /** @type {!QueryManager} */ (xp['queryManager']);
      QueryManager.setInstance(queryManager);
      setQueryManager(queryManager);
    }
    if (xp['settingsManager']) {
      SettingsManager.setInstance(/** @type {!SettingsManager} */ (xp['settingsManager']));
    }
    if (xp['styleManager']) {
      const styleManager = /** @type {!StyleManager} */ (xp['styleManager']);
      StyleManager.setInstance(styleManager);
      setStyleManager(styleManager);
    }
    if (xp['timelineController']) {
      TimelineController.setInstance(/** @type {!TimelineController} */ (xp['timelineController']));
    }

    // share logs with the main window
    const logRegistryInstance = /** @type {!goog.log.LogRegistry_|undefined} */ (xp['logRegistryInstance']);
    if (logRegistryInstance) {
      googLog.LogRegistry_.instance_ = logRegistryInstance;
      googLog.info(googLog.getRootLogger(), 'Replaced log manager with parent.');
    }
  }

  replaceExportFunctions();
};

/**
 * Replace functions local to the Analyze window with the main window's function.
 * @suppress {accessControls} To provide access to private functions.
 */
export const replaceExportFunctions = function() {
  const xp = getExports();
  if (xp && xp['functions']) {
    const exportFns = xp['functions'];

    if (xp['registerExternal']) {
      registerExternal = /** @type {function(string, (Window|null)): undefined} */ (xp['registerExternal']);
    }

    if (xp['unregisterExternal']) {
      unregisterExternal = /** @type {function(string): undefined} */ (xp['unregisterExternal']);
    }

    if (exportFns['createBufferFromConfig']) {
      const createFromConfig = /** @type {function(buffer.BufferConfig, boolean=):Array<!Feature>} */ (
        exportFns['createBufferFromConfig']);
      buffer.setCreateFromConfig(createFromConfig);
    }

    if (exportFns['writeGeomAsJSON']) {
      GeoJSON.writeGeometry_ = exportFns['writeGeomAsJSON'];
    }

    if (exportFns['notifyStyleChange']) {
      const notifyStyleChangeFn = /** @type {!osStyle.NotifyStyleChangeFn} */ (exportFns['notifyStyleChange']);
      osStyle.setNotifyStyleChangeFn(notifyStyleChangeFn);
    }

    if (exportFns['setFeatureStyle']) {
      const setFeatureStyleFn = /** @type {!osStyle.SetFeatureStyleFn} */ (exportFns['setFeatureStyle']);
      osStyle.setSetFeatureStyleFn(setFeatureStyleFn);
    }

    if (exportFns['getCrossOrigin']) {
      const getCrossOriginFn = /** @type {function((Uri|string)):!CrossOrigin} */ (exportFns['getCrossOrigin']);
      setGetCrossOriginFn(getCrossOriginFn);
    }
  }
};

/**
 * Opens the analyze tools in a new tab/window.
 */
export const openExternal = function() {
  window.open(TOOLS_PATH + 'tools.html', '_blank');
};

/**
 * Opens the analyze tools internally via iframe.
 */
export const openInternal = function() {
  const id = 'analyze-window';

  if (osWindow.getById(id)) {
    osWindow.bringToFront(id);
  } else {
    const toolsPath = TOOLS_PATH + 'tools.html';
    const html = '<savedwindow id="' + id + '" key="analyze" label="Analyze"' +
        ' icon="lt-blue-icon fa fa-list-alt" x="center" y="center" width="765" height="525"' +
        ' min-width="515" max-width="1500" min-height="250" max-height="1000" show-close="true">' +
        '<iframe class="border-0 flex-fill" width="100%" height="100%" ng-src="' + toolsPath + '"></iframe>' +
        '</savedwindow>';

    osWindow.launch(html);
  }
};
