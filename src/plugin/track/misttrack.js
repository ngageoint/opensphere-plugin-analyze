goog.module('plugin.mist.track');

const AlertEventSeverity = goog.require('os.alert.AlertEventSeverity');
const AlertManager = goog.require('os.alert.AlertManager');
const cloneToContext = goog.require('os.filter.cloneToContext');
const CommandProcessor = goog.require('os.command.CommandProcessor');
const {createTrack} = goog.require('os.track');
const DataManager = goog.require('os.data.DataManager');
const {getExports} = goog.require('mist.analyze');
const {getValueByKeys} = goog.require('goog.object');
const {getWfsParams} = goog.require('os.ogc');
const instanceOf = goog.require('os.instanceOf');
const IOGCDescriptor = goog.require('os.ui.ogc.IOGCDescriptor');
const KMLNodeAdd = goog.require('plugin.file.kml.cmd.KMLNodeAdd');
const {LAYER_TITLE} = goog.require('plugin.mist.track.Constants');
const log = goog.require('goog.log');
const MapContainer = goog.require('os.MapContainer');
const MistTrackEventType = goog.require('plugin.mist.track.EventType');
const osImplements = goog.require('os.implements');
const PlacesManager = goog.require('plugin.places.PlacesManager');
const RecordField = goog.require('os.data.RecordField');
const RequestSource = goog.require('os.source.Request');
const SequenceCommand = goog.require('os.command.SequenceCommand');
const {setAddToTrack, setCreateTrack} = goog.require('os.track');
const TrackEventType = goog.require('plugin.track.EventType');
const TrackField = goog.require('os.track.TrackField');
const TrackManager = goog.require('plugin.track.TrackManager');
const {updatePlacemark} = goog.require('plugin.file.kml.ui');
const {updateTrackSource, setCreateAndAdd} = goog.require('plugin.track');
const Uri = goog.require('goog.Uri');

const AddOptions = goog.requireType('os.track.AddOptions');
const CreateOptions = goog.requireType('os.track.CreateOptions');
const Feature = goog.requireType('ol.Feature');
const IFeatureType = goog.requireType('os.ogc.IFeatureType');
const ILayer = goog.requireType('os.layer.ILayer');
const Logger = goog.requireType('goog.log.Logger');
const TrackEvent = goog.requireType('plugin.track.Event');
const TrackFeatureLike = goog.requireType('os.track.TrackFeatureLike');


/**
 * Base logger for the track plugin.
 * @type {Logger}
 * @private
 * @const
 */
const LOGGER_ = log.getLogger('plugin.mist.track');


/**
 * Restore exports from the main application.
 */
exports.restoreExports = function() {
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
exports.createFromBinEvent = function(event) {
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
            exports.setQueryOptions(track, sourceId, /** @type {string} */ (entry.getFilter()));
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
            exports.setQueryOptions(track, sourceId, /** @type {string} */ (entry.getFilter()));
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
      log.error(LOGGER_, 'Unable to create track: track layer missing');
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
    log.error(LOGGER_, 'Unable to create tracks: no bins, or all bins were empty');

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
exports.setQueryOptions = function(track, sourceId, filter) {
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
    const uri = exports.getQueryUri(source);
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
exports.getQueryUri = function(source) {
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
