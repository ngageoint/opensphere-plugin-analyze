goog.declareModuleId('plugin.mist.track.TrackPlugin');

import {isMainWindow} from 'opensphere/src/os/os.js';
import JsonField from 'opensphere/src/plugin/file/kml/jsonfield.js';
import * as places from 'opensphere/src/plugin/places/places.js';
import {createAndAdd} from 'opensphere/src/plugin/track/track.js';
import TrackManager from 'opensphere/src/plugin/track/trackmanager.js';
import {EXPORT_PROPERTY, exportSymbol} from '../../mist/analyze/analyze.js';
import {ID} from './constants.js';
import {restoreExports} from './misttrack.js';
import * as trackMenu from './misttrackmenu.js';

const AbstractPlugin = goog.require('os.plugin.AbstractPlugin');
const {createTrack, addToTrack} = goog.require('os.track');
const TrackField = goog.require('os.track.TrackField');



/**
 * The static instance of the plugin.
 * @type {TrackPlugin}
 */
let instance;

/**
 * Provides track features to MIST.
 */
export class TrackPlugin extends AbstractPlugin {
  /**
   * Constructor.
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
    trackMenu.disposeInternal();
  }

  /**
   * @inheritDoc
   */
  init() {
    if (isMainWindow()) {
      trackMenu.layerSetup();
      trackMenu.spatialSetup();
      trackMenu.setupInternal();

      if (window[EXPORT_PROPERTY]) {
        exportSymbol('trackManager', TrackManager.getInstance());
        exportSymbol('plugin.track.createAndAdd', createAndAdd);
        exportSymbol('os.track.createTrack', createTrack);
        exportSymbol('os.track.addToTrack', addToTrack);
      }
    } else {
      trackMenu.countBySetup();
      trackMenu.listSetup();

      restoreExports();
    }

    // add the track query options field to the KML JSON fields array and the places export field
    // this will allow the proper export and import of the query options (since it is a JSON object)
    JsonField.push(TrackField.QUERY_OPTIONS);
    places.ExportFields.push(TrackField.QUERY_OPTIONS);
  }

  /**
   * Get the static instance of the plugin.
   * @return {!TrackPlugin}
   */
  static getInstance() {
    if (!instance) {
      instance = new TrackPlugin();
    }
    return instance;
  }

  /**
   * Set the static instance of the plugin.
   * We only really need this if exporting to an external window.
   * @param {!TrackPlugin} value
   */
  static setInstance(value) {
    instance = value;
  }
}
