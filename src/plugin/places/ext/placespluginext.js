goog.module('plugin.places.PluginExt');

const AbstractPlugin = goog.require('os.plugin.AbstractPlugin');
const {addFolder, addPlace, saveFromSource} = goog.require('plugin.places');
const {exportSymbol} = goog.require('mist.analyze');
const {isMainWindow} = goog.require('os');
const {listDispose, listSetup} = goog.require('plugin.places.ext.menu');
const log = goog.require('goog.log');
const PlacesManager = goog.require('plugin.places.PlacesManager');
const {restoreExports} = goog.require('plugin.places.ext');
const {launchSavePlaces} = goog.require('plugin.places.ui.launchSavePlaces');

const Logger = goog.requireType('goog.log.Logger');
const OlFeature = goog.requireType('ol.Feature');


/**
 * Logger for plugin.places.PluginExt
 * @type {Logger}
 * @private
 * @const
 */
const LOGGER_ = log.getLogger('plugin.places.PluginExt');


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
class PluginExt extends AbstractPlugin {
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
      log.error(LOGGER_, 'Failed initializing external Places plugin:', e);
    }
  }

  /**
   * @return {!PluginExt}
   */
  static getInstance() {
    if (!instance) {
      instance = new PluginExt();
    }
    return instance;
  }
}

/**
 * @type {PluginExt|undefined}
 */
let instance;


exports = PluginExt;
