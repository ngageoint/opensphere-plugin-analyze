goog.declareModuleId('plugin.mist.track');

import AlertEventSeverity from 'opensphere/src/os/alert/alerteventseverity.js';
import AlertManager from 'opensphere/src/os/alert/alertmanager.js';
import CommandProcessor from 'opensphere/src/os/command/commandprocessor.js';
import SequenceCommand from 'opensphere/src/os/command/sequencecommand.js';
import DataManager from 'opensphere/src/os/data/datamanager.js';
import RecordField from 'opensphere/src/os/data/recordfield.js';
import cloneToContext from 'opensphere/src/os/filter/clonetocontext.js';
import osImplements from 'opensphere/src/os/implements.js';
import instanceOf from 'opensphere/src/os/instanceof.js';
import MapContainer from 'opensphere/src/os/mapcontainer.js';
import {getWfsParams} from 'opensphere/src/os/ogc/ogc.js';
import RequestSource from 'opensphere/src/os/source/requestsource.js';
import {createTrack, setAddToTrack, setCreateTrack} from 'opensphere/src/os/track/track.js';
import TrackField from 'opensphere/src/os/track/trackfield.js';
import IOGCDescriptor from 'opensphere/src/os/ui/ogc/iogcdescriptor.js';
import KMLNodeAdd from 'opensphere/src/plugin/file/kml/cmd/kmlnodeaddcmd.js';
import {updatePlacemark} from 'opensphere/src/plugin/file/kml/ui/kmlui.js';
import PlacesManager from 'opensphere/src/plugin/places/placesmanager.js';
import TrackEventType from 'opensphere/src/plugin/track/eventtype.js';
import {setCreateAndAdd, updateTrackSource} from 'opensphere/src/plugin/track/track.js';
import TrackManager from 'opensphere/src/plugin/track/trackmanager.js';
import {getExports} from '../../mist/analyze/analyze.js';
import {LAYER_TITLE} from './constants.js';
import {MistTrackEventType} from './eventtype.js';

const Uri = goog.require('goog.Uri');

const log = goog.require('goog.log');
const {getValueByKeys} = goog.require('goog.object');
const Logger = goog.requireType('goog.log.Logger');
const Feature = goog.requireType('ol.Feature');
const {default: ILayer} = goog.requireType('os.layer.ILayer');
const {default: IFeatureType} = goog.requireType('os.ogc.IFeatureType');

const {default: AddOptions} = goog.requireType('os.track.AddOptions');
const {default: CreateOptions} = goog.requireType('os.track.CreateOptions');
const {default: TrackFeatureLike} = goog.requireType('os.track.TrackFeatureLike');


const {default: TrackEvent} = goog.requireType('plugin.track.Event');


/**
 * Base logger for the track plugin.
 * @type {Logger}
 */
const LOGGER = log.getLogger('plugin.mist.track');

/**
 * Restore exports from the main application.
 */
export const restoreExports = function() {
  // find the main mist application
  const xports = getExports();
  if (xports) {
    const trackManager = xports['trackManager'];
    if (trackManager) {
      Object.assign(TrackManager, {
        getInstance: function() {
          return /** @type {!TrackManager} */ (trackManager);
        }});
    }

    const createAndAdd = getValueByKeys(xports, ['plugin', 'track', 'createAndAdd']);
    if (createAndAdd) {
      setCreateAndAdd(/** @type {function(!CreateOptions):(TrackFeatureLike|undefined)} */ (createAndAdd));
    }

    const createTrack_ = getValueByKeys(xports, ['os', 'track', 'createTrack']);
    if (createTrack_) {
      setCreateTrack(/** @type {function(!CreateOptions):(TrackFeatureLike|undefined)} */ (createTrack_));
    }

    const addToTrack = getValueByKeys(xports, ['os', 'track', 'addToTrack']);
    if (addToTrack) {
      setAddToTrack(/** @type {function(!AddOptions):!Array<!(ol.Coordinate|Feature)>} */ (addToTrack));
    }
  }
};


/**
 * Create tracks from histogram bins.
 * @param {!TrackEvent} event The track event.
 */
export const createFromBinEvent = function(event) {
  const bins = event.bins || [];
  if (!bins || bins.length <= 0) {
    AlertManager.getInstance().sendAlert('No data available to create tracks.', AlertEventSeverity.ERROR);
    return;
  }

  let title = event.title || 'Track';
  const sortField = event.sortField || RecordField.TIME;
  const filters = event.filters || [];
  const sourceId = event.sourceId;

  let track = null;
  const trackNodes = [];

  if (event.type === TrackEventType.CREATE_TRACK) {
    // creating a single track from all provided bins
    const features = bins.reduce(function(features, bin) {
      const items = bin.getItems();
      return items ? features.concat(items) : features;
    }, []);

    if (features && features.length > 0) {
      if (bins.length == 1) {
        title += ': ' + bins[0].getLabel();
      }

      track = createTrack(/** @type {!CreateOptions} */ ({
        features: features,
        name: title,
        color: bins[0].getColor(),
        sortField: sortField,
        includeMetadata: true
      }));

      if (track) {
        track.set(TrackField.ORIG_SOURCE_ID, sourceId);

        if (filters.length == 1) {
          const entry = cloneToContext(filters[0]);
          if (entry && entry.getFilter() && sourceId) {
            setQueryOptions(track, sourceId, /** @type {string} */ (entry.getFilter()));
          }
        }

        const trackNode = updatePlacemark({
          'feature': track
        });

        trackNodes.push(trackNode);
      }
    }
  } else if (event.type === MistTrackEventType.CREATE_TRACKS) {
    // creating one track for each provided bin
    for (let i = 0; i < bins.length; i++) {
      const bin = bins[i];
      const features = bin.getItems();
      if (features && features.length > 0) {
        const trackName = title + ': ' + bin.getLabel();
        track = createTrack(/** @type {!CreateOptions} */ ({
          features: features,
          name: trackName,
          color: bin.getColor(),
          sortField: sortField,
          includeMetadata: true
        }));

        if (track) {
          track.set(TrackField.ORIG_SOURCE_ID, sourceId);

          const entry = cloneToContext(filters[i]);
          if (entry && entry.getFilter() && sourceId) {
            setQueryOptions(track, sourceId, /** @type {string} */ (entry.getFilter()));
          }

          const trackNode = updatePlacemark({
            'feature': track
          });

          trackNodes.push(trackNode);
        }
      }
    }
  }

  if (trackNodes.length > 0) {
    const rootNode = PlacesManager.getInstance().getPlacesRoot();
    if (!rootNode) {
      log.error(LOGGER, 'Unable to create track: track layer missing');
      return;
    }

    let cmd;

    if (trackNodes.length == 1) {
      cmd = new KMLNodeAdd(trackNodes[0], rootNode);
      cmd.title = 'Create 1 track from Count By';
    } else {
      const cmds = [];
      for (let i = 0; i < trackNodes.length; i++) {
        cmds.push(new KMLNodeAdd(trackNodes[i], rootNode));
      }

      cmd = new SequenceCommand();
      cmd.setCommands(cmds);
      cmd.title = 'Create ' + cmds.length + ' tracks from Count By';
    }

    CommandProcessor.getInstance().addCommand(cmd);
    updateTrackSource(track);

    const alertMessage = trackNodes.length == 1 ?
        ('Created 1 track and added it to the ' + LAYER_TITLE + ' layer.') :
        ('Created ' + trackNodes.length + ' tracks and added them to the ' + LAYER_TITLE + ' layer.');
    AlertManager.getInstance().sendAlert(alertMessage, AlertEventSeverity.SUCCESS);
  } else {
    log.error(LOGGER, 'Unable to create tracks: no bins, or all bins were empty');

    const msg = 'Track creation failed. There were no valid features to create tracks from.';
    AlertManager.getInstance().sendAlert(msg, AlertEventSeverity.WARNING);
  }
};


/**
 * Save the data required to make feature requests for a track.
 * @param {!Feature} track The track.
 * @param {string} sourceId The source id for the originating data.
 * @param {string} filter The filter used to create the track.
 */
export const setQueryOptions = function(track, sourceId, filter) {
  track.set(TrackField.QUERY_OPTIONS, undefined);

  const layer = /** @type {ILayer} */ (MapContainer.getInstance().getLayer(sourceId));
  let source = DataManager.getInstance().getSource(sourceId);
  if (layer && instanceOf(source, RequestSource.NAME)) {
    source = /** @type {!RequestSource} */ (source);

    const importer = source.getImporter();
    let mappings = importer && importer.getMappings() || [];
    mappings = mappings.map(function(m) {
      return m.persist();
    });

    const layerOptions = layer.getLayerOptions();
    const uri = getQueryUri(source);
    if (layerOptions && layerOptions['featureType'] && uri) {
      const featureType = /** @type {IFeatureType} */ (layerOptions['featureType']);
      const startColumn = featureType.getStartDateColumnName();
      const endColumn = featureType.getEndDateColumnName();

      if (startColumn && endColumn) {
        const queryOptions = /** @type {!mistx.track.QueryOptions} */ ({
          filter: filter,
          mappings: mappings,
          startColumn: startColumn,
          endColumn: endColumn,
          queried: false,
          loading: false,
          uri: uri
        });

        track.set(TrackField.QUERY_OPTIONS, queryOptions);
      }
    }
  }
};


/**
 * Get the query URI from a source.
 * @param {!RequestSource} source The source.
 * @return {string} The URI.
 */
export const getQueryUri = function(source) {
  let result;

  const request = source.getRequest();
  if (request) {
    result = request.getUri().toString();
  } else {
    let descriptor = DataManager.getInstance().getDescriptor(source.getId());
    if (osImplements(descriptor, IOGCDescriptor.ID)) {
      descriptor = /** @type {IOGCDescriptor} */ (descriptor);

      const url = descriptor.getWfsUrl();
      const params = getWfsParams(descriptor);
      const uri = new Uri(url);
      uri.setQueryData(params);
      result = uri.toString();
    }
  }

  return result || '';
};
