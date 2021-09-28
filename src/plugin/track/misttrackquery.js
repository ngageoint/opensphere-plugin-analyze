goog.declareModuleId('plugin.mist.track.query');

import AlertEventSeverity from 'opensphere/src/os/alert/alerteventseverity.js';
import AlertManager from 'opensphere/src/os/alert/alertmanager.js';
import DataManager from 'opensphere/src/os/data/datamanager.js';
import RecordField from 'opensphere/src/os/data/recordfield.js';
import osEventType from 'opensphere/src/os/events/eventtype.js';
import PropertyChangeEvent from 'opensphere/src/os/events/propertychangeevent.js';
import BaseFilterManager from 'opensphere/src/os/filter/basefiltermanager.js';
import {filterFalsey} from 'opensphere/src/os/fn/fn.js';
import FeatureImporter from 'opensphere/src/os/im/featureimporter.js';
import MappingManager from 'opensphere/src/os/im/mapping/mappingmanager.js';
import instanceOf from 'opensphere/src/os/instanceof.js';
import osRequest from 'opensphere/src/os/net/request.js';
import OGCFilterCleaner from 'opensphere/src/os/ogc/filter/ogcfiltercleaner.js';
import OGCFilterModifier from 'opensphere/src/os/ogc/filter/ogcfiltermodifier.js';
import OGCFilterOverride from 'opensphere/src/os/ogc/filter/ogcfilteroverride.js';
import {getException} from 'opensphere/src/os/ogc/ogc.js';
import WFSFormatter from 'opensphere/src/os/ogc/wfs/wfsformatter.js';
import VectorSource from 'opensphere/src/os/source/vectorsource.js';
import TimeRange from 'opensphere/src/os/time/timerange.js';
import {addToTrack} from 'opensphere/src/os/track/track.js';
import TrackField from 'opensphere/src/os/track/trackfield.js';
import GeoJSONParser from 'opensphere/src/plugin/file/geojson/geojsonparser.js';

const googEventType = goog.require('goog.net.EventType');
const googEvent = goog.requireType('goog.events.Event');

const Feature = goog.requireType('ol.Feature');
const {default: OGCFilterModifierOptions} = goog.requireType('os.ogc.filter.OGCFilterModifierOptions');


const {default: ITime} = goog.requireType('os.time.ITime');


/**
 * Queries a track outside the bounds of the map.
 * @param {!Feature} track The track to query.
 * @param {number=} opt_time The amount of time, in milliseconds, to query before and after the track range
 * @param {number=} opt_start The track start time, in milliseconds
 * @param {number=} opt_end The track end time, in milliseconds
 */
export const requestTrack = function(track, opt_time, opt_start, opt_end) {
  if (!checkQueryTrack(track)) {
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
    request.listen(googEventType.SUCCESS, onRequestSuccess.bind(undefined, track));
    request.listen(googEventType.ERROR, onRequestFailure.bind(undefined, track));

    track.dispatchEvent(new PropertyChangeEvent('loading', true));
    queryOptions.loading = true;

    request.load();
  } else {
    reportError();
  }
};

/**
 * Check if a track can be queried for more data
 * @param {!Feature} track The track to query
 * @return {boolean}
 */
export const checkQueryTrack = function(track) {
  const sourceId = /** @type {string|undefined} */ (track.get(TrackField.ORIG_SOURCE_ID));
  if (sourceId) {
    const filterable = BaseFilterManager.getInstance().getFilterable(sourceId);
    if (!filterable || !filterable.isFilterable()) {
      reportError('The original data source cannot be queried.');
      return false;
    }
  }

  const queryOptions = /** @type {mistx.track.QueryOptions|undefined} */ (track.get(TrackField.QUERY_OPTIONS));
  if (!queryOptions || !queryOptions.filter || !queryOptions.startColumn || !queryOptions.endColumn) {
    const name = track.get('name');
    const msg = (name ? name + '. ' : '') +
        'Track does not contain information required for query. Only tracks created from a Count By or ' +
        'Stream Bins can be queried.';
    reportError(msg);
    return false;
  } else if (queryOptions.loading) {
    reportError('Track is already being queried. Please wait for the query to complete.');
    return false;
  }
  return true;
};

/**
 * Display an error alert when track query fails.
 * @param {string=} opt_details The error details.
 */
export const reportError = function(opt_details) {
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
export const onRequestSuccess = function(track, event) {
  const request = /** @type {!osRequest} */ (event.target);
  const response = /** @type {string|undefined} */ (request.getResponse());
  request.dispose();

  const queryOptions = /** @type {mistx.track.QueryOptions} */ (track.get(TrackField.QUERY_OPTIONS));
  if (response && queryOptions) {
    const mm = MappingManager.getInstance();
    const mappings = queryOptions.mappings.map(mm.restoreMapping.bind(mm)).filter(filterFalsey);

    const importer = new FeatureImporter(new GeoJSONParser());
    importer.setMappings(mappings);
    importer.listen(osEventType.COMPLETE, onImportComplete.bind(undefined, track));
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
export const onRequestFailure = function(track, event) {
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
export const onImportComplete = function(track, event) {
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
