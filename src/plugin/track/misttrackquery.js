goog.module('plugin.mist.track.query');
goog.module.declareLegacyNamespace();

const {addToTrack} = goog.require('os.track');
const AlertEventSeverity = goog.require('os.alert.AlertEventSeverity');
const AlertManager = goog.require('os.alert.AlertManager');
const BaseFilterManager = goog.require('os.filter.BaseFilterManager');
const DataManager = goog.require('os.data.DataManager');
const FeatureImporter = goog.require('os.im.FeatureImporter');
const {filterFalsey} = goog.require('os.fn');
const GeoJSONParser = goog.require('plugin.file.geojson.GeoJSONParser');
const {getException} = goog.require('os.ogc');
const googEventType = goog.require('goog.net.EventType');
const instanceOf = goog.require('os.instanceOf');
const MappingManager = goog.require('os.im.mapping.MappingManager');
const osEventType = goog.require('os.events.EventType');
const OGCFilterCleaner = goog.require('os.ogc.filter.OGCFilterCleaner');
const OGCFilterModifier = goog.require('os.ogc.filter.OGCFilterModifier');
const OGCFilterOverride = goog.require('os.ogc.filter.OGCFilterOverride');
const osRequest = goog.require('os.net.Request');
const PropertyChangeEvent = goog.require('os.events.PropertyChangeEvent');
const RecordField = goog.require('os.data.RecordField');
const TimeRange = goog.require('os.time.TimeRange');
const TrackField = goog.require('os.track.TrackField');
const VectorSource = goog.require('os.source.Vector');
const WFSFormatter = goog.require('os.ogc.wfs.WFSFormatter');

const Feature = goog.requireType('ol.Feature');
const googEvent = goog.requireType('goog.events.Event');
const ITime = goog.requireType('os.time.ITime');
const OGCFilterModifierOptions = goog.requireType('os.ogc.filter.OGCFilterModifierOptions');


/**
 * Queries a track outside the bounds of the map.
 * @param {!Feature} track The track to query.
 * @param {number=} opt_time The amount of time, in milliseconds, to query before and after the track range
 * @param {number=} opt_start The track start time, in milliseconds
 * @param {number=} opt_end The track end time, in milliseconds
 */
exports.requestTrack = function(track, opt_time, opt_start, opt_end) {
  if (!exports.checkQueryTrack(track)) {
    return;
  }

  const trackTime = /** @type {ITime|undefined} */ (track.get(RecordField.TIME));
  const queryOptions = /** @type {mistx.track.QueryOptions|undefined} */ (track.get(TrackField.QUERY_OPTIONS));

  if (queryOptions && trackTime) {
    const time = opt_time != null ? opt_time : 24 * 60 * 60 * 1000;
    const start = opt_start != null ? opt_start : trackTime.getStart() - time;
    const end = opt_end != null ? opt_end : trackTime.getEnd() + time;
    const range = new TimeRange(Math.min(start, end), Math.max(start, end));

    // create a request to query for additional track data as geojson
    const request = new osRequest(queryOptions.uri);
    request.setMethod(osRequest.METHOD_POST);
    request.setHeader('Accept', 'application/json, text/plain, */*');
    request.setValidator(getException);
    request.setDataFormatter(new WFSFormatter());

    // create the base OGC filter
    const ogcOptions = /** @type {!OGCFilterModifierOptions} */ ({
      filter: true,
      temporal: true
    });
    request.addModifier(new OGCFilterModifier(ogcOptions));

    // replace with the track filter
    const filterOverride = new OGCFilterOverride(
        queryOptions.filter,
        queryOptions.startColumn,
        queryOptions.endColumn,
        range);
    request.addModifier(filterOverride);

    // clean up the OGC filter
    request.addModifier(new OGCFilterCleaner());

    // request the data
    request.listen(googEventType.SUCCESS, exports.onRequestSuccess.bind(undefined, track));
    request.listen(googEventType.ERROR, exports.onRequestFailure.bind(undefined, track));

    track.dispatchEvent(new PropertyChangeEvent('loading', true));
    queryOptions.loading = true;

    request.load();
  } else {
    exports.reportError();
  }
};


/**
 * Check if a track can be queried for more data
 * @param {!Feature} track The track to query
 * @return {boolean}
 */
exports.checkQueryTrack = function(track) {
  const sourceId = /** @type {string|undefined} */ (track.get(TrackField.ORIG_SOURCE_ID));
  if (sourceId) {
    const filterable = BaseFilterManager.getInstance().getFilterable(sourceId);
    if (!filterable || !filterable.isFilterable()) {
      exports.reportError('The original data source cannot be queried.');
      return false;
    }
  }

  const queryOptions = /** @type {mistx.track.QueryOptions|undefined} */ (track.get(TrackField.QUERY_OPTIONS));
  if (!queryOptions || !queryOptions.filter || !queryOptions.startColumn || !queryOptions.endColumn) {
    const name = track.get('name');
    const msg = (name ? name + '. ' : '') +
        'Track does not contain information required for query. Only tracks created from a Count By or ' +
        'Stream Bins can be queried.';
    exports.reportError(msg);
    return false;
  } else if (queryOptions.loading) {
    exports.reportError('Track is already being queried. Please wait for the query to complete.');
    return false;
  }
  return true;
};


/**
 * Display an error alert when track query fails.
 * @param {string=} opt_details The error details.
 */
exports.reportError = function(opt_details) {
  let msg = 'Unable to request additional data for the selected track.';
  if (opt_details) {
    msg += ' ' + opt_details;
  }

  AlertManager.getInstance().sendAlert(msg, AlertEventSeverity.WARNING);
};


/**
 * Queries a track outside the bounds of the map.
 * @param {!Feature} track The track to query.
 * @param {!googEvent} event The event.
 */
exports.onRequestSuccess = function(track, event) {
  const request = /** @type {!osRequest} */ (event.target);
  const response = /** @type {string|undefined} */ (request.getResponse());
  request.dispose();

  const queryOptions = /** @type {mistx.track.QueryOptions} */ (track.get(TrackField.QUERY_OPTIONS));
  if (response && queryOptions) {
    const mm = MappingManager.getInstance();
    const mappings = queryOptions.mappings.map(mm.restoreMapping.bind(mm)).filter(filterFalsey);

    const importer = new FeatureImporter(new GeoJSONParser());
    importer.setMappings(mappings);
    importer.listen(osEventType.COMPLETE, exports.onImportComplete.bind(undefined, track));
    importer.startImport(response);
  } else {
    track.dispatchEvent(new PropertyChangeEvent('loading', false));

    if (queryOptions) {
      queryOptions.loading = false;
    }
  }
};


/**
 * Queries a track outside the bounds of the map.
 * @param {!Feature} track The track to query.
 * @param {!googEvent} event The event.
 */
exports.onRequestFailure = function(track, event) {
  const request = /** @type {!osRequest} */ (event.target);
  request.dispose();

  track.dispatchEvent(new PropertyChangeEvent('loading', false));

  const queryOptions = /** @type {mistx.track.QueryOptions} */ (track.get(TrackField.QUERY_OPTIONS));
  if (queryOptions) {
    queryOptions.loading = false;
  }
};


/**
 * Queries a track outside the bounds of the map.
 * @param {!Feature} track The track to query.
 * @param {!googEvent} event The event.
 */
exports.onImportComplete = function(track, event) {
  const importer = /** @type {!FeatureImporter} */ (event.target);
  const features = /** @type {Array<!Feature>|undefined} */ (importer.getData());
  importer.dispose();

  track.dispatchEvent(new PropertyChangeEvent('loading', false));

  if (features) {
    const addedFeatures = /** @type {!Array<!Feature>} */ (addToTrack({
      features: features,
      track: track,
      includeMetadata: true
    }));
    const sourceId = /** @type {string|undefined} */ (track.get(TrackField.ORIG_SOURCE_ID));
    let source = sourceId ? DataManager.getInstance().getSource(sourceId) : null;
    if (instanceOf(source, VectorSource.NAME)) {
      source = /** @type {!VectorSource} */ (source);
      source.addFeatures(addedFeatures);
    }

    // flag the track as having been queried
    const queryOptions = /** @type {mistx.track.QueryOptions} */ (track.get(TrackField.QUERY_OPTIONS));
    if (queryOptions) {
      queryOptions.queried = true;
      queryOptions.loading = false;
    }
  }
};
