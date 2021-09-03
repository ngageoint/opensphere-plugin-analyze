goog.module('plugin.places.ext');

const {getValueByKeys} = goog.require('goog.object');
const {getExports} = goog.require('mist.analyze');
const {inIframe} = goog.require('os');
const {setAddFolder, setAddPlace, setSaveFromSource} = goog.require('plugin.places');
const PlacesManager = goog.require('plugin.places.PlacesManager');
const {setLaunchSavePlaces} = goog.require('plugin.places.ui.launchSavePlaces');

const VectorSource = goog.requireType('os.source.Vector');
const KMLNode = goog.requireType('plugin.file.kml.ui.KMLNode');
const {FolderOptions, PlaceOptions} = goog.requireType('plugin.places');


/**
 * Restore exports from the main application.
 */
exports.restoreExports = function() {
  const xPorts = getExports();
  if (xPorts) {
    const placesManager = getValueByKeys(xPorts, ['plugin', 'places', 'PlacesManager']);
    PlacesManager.setInstance(/** @type {!PlacesManager} */ (placesManager));

    const saveFromSource = getValueByKeys(xPorts, ['plugin', 'places', 'saveFromSource']);
    if (saveFromSource) {
      setSaveFromSource(/** @type {!function(!Object)} */ (saveFromSource));
    }

    const addFolder = getValueByKeys(xPorts, ['plugin', 'places', 'addFolder']);
    if (addFolder) {
      setAddFolder(/** @type {!function(!FolderOptions):KMLNode} */ (addFolder));
    }

    const addPlace = getValueByKeys(xPorts, ['plugin', 'places', 'addPlace']);
    if (addPlace) {
      setAddPlace(/** @type {!function(!PlaceOptions):KMLNode} */ (addPlace));
    }

    if (inIframe()) {
      // in an iframe, launch the save places window in the main application
      const launchSavePlaces = getValueByKeys(xPorts, ['plugin', 'places', 'ui', 'launchSavePlaces']);
      if (launchSavePlaces) {
        setLaunchSavePlaces(/** @type {!function(VectorSource)} */ (launchSavePlaces));
      }
    }
  }
};
