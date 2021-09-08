goog.module('plugin.mist.track.EventType');

const {ID} = goog.require('plugin.mist.track.Constants');


/**
 * Events for the MIST track plugin.
 * @enum {string}
 */
exports = {
  CREATE_TRACKS: ID + ':createMulti',
  EXPAND_TRACK_DAY: ID + ':expandTrackDay',
  EXPAND_TRACK_WEEK: ID + ':expandTrackWeek',
  EXPAND_TRACK_MONTH: ID + ':expandTrackMonth',
  EXPAND_TRACK: ID + ':expandTrack'
};
