goog.declareModuleId('plugin.places.PlacesPluginExt');

import {isMainWindow} from 'opensphere/src/os/os.js';
import AbstractPlugin from 'opensphere/src/os/plugin/abstractplugin.js';
import {addFolder, addPlace, saveFromSource} from 'opensphere/src/plugin/places/places.js';
import PlacesManager from 'opensphere/src/plugin/places/placesmanager.js';
import {launchSavePlaces} from 'opensphere/src/plugin/places/ui/launchsaveplaces.js';
import {exportSymbol} from '../../../mist/analyze/analyze.js';
import {restoreExports} from './placesext.js';
import {listDispose, listSetup} from './placesmenuext.js';

const log = goog.require('goog.log');

const Logger = goog.requireType('goog.log.Logger');
const OlFeature = goog.requireType('ol.Feature');


/**
 * Logger.
 * @type {Logger}
 * @const
 */
const LOGGER = log.getLogger('plugin.places.PlacesPluginExt');

/**
 * Identifier used by the external places plugin.
 * @type {string}
 * @const
 */
const ID = 'places-ext';

/**
 * Plugin that adds saved places features to the external tools window.
 * @extends {AbstractPlugin}
 */
export class PlacesPluginExt extends AbstractPlugin {
  /**
   * Constructor
   */
  constructor() {
    super();
    this.id = ID;
  }

  /**
   * @inheritDoc
   */
  disposeInternal() {
    super.disposeInternal();

    if (!isMainWindow()) {
      listDispose();
    }
  }

  /**
   * @inheritDoc
   */
  init() {
    try {
      if (isMainWindow()) {
        exportSymbol('plugin.places.PlacesManager', PlacesManager.getInstance());
        exportSymbol('plugin.places.addFolder', addFolder);
        exportSymbol('plugin.places.addPlace', addPlace);
        exportSymbol('plugin.places.saveFromSource', saveFromSource);
        exportSymbol('plugin.places.ui.launchSavePlaces', launchSavePlaces);
      } else {
        // register actions
        listSetup();

        // replace functions from the main window
        restoreExports();
      }
    } catch (e) {
      log.error(LOGGER, 'Failed initializing external Places plugin:', e);
    }
  }

  /**
   * @return {!PlacesPluginExt}
   */
  static getInstance() {
    if (!instance) {
      instance = new PlacesPluginExt();
    }
    return instance;
  }
}

/**
 * @type {PlacesPluginExt|undefined}
 */
let instance;
