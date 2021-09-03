goog.module('plugin.mist.track.Metrics');

const {ID} = goog.require('plugin.mist.track.Constants');


/**
 * Metric keys for the MIST track plugin.
 * @enum {string}
 */
const Keys = {
  CREATE_MULTI_COUNTBY: ID + '.createMulti-countBy',
  CREATE_SINGLE_COUNTBY: ID + '.createSingle-countBy',
  ADD_TO_COUNTBY: ID + '.addTo-countBy',
  CREATE_LIST: ID + '.create-list',
  ADD_TO_LIST: ID + '.addTo-list',
  LAYERS_EXPAND_TRACK: ID + '.queryEntireTrack-layers',
  LAYERS_EXPAND_TRACK_DAY: ID + '.queryEntireTrack-layers-day',
  LAYERS_EXPAND_TRACK_WEEK: ID + '.queryEntireTrack-layers-week',
  LAYERS_EXPAND_TRACK_MONTH: ID + '.queryEntireTrack-layers-month',
  MAP_EXPAND_TRACK: ID + '.queryEntireTrack-map',
  MAP_EXPAND_TRACK_DAY: ID + '.queryEntireTrack-map-day',
  MAP_EXPAND_TRACK_WEEK: ID + '.queryEntireTrack-map-week',
  MAP_EXPAND_TRACK_MONTH: ID + '.queryEntireTrack-map-month'
};

exports = {
  Keys
};
