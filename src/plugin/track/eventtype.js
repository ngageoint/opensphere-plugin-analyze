goog.declareModuleId('plugin.mist.track.EventType');

import {ID} from './constants.js';

/**
 * Events for the MIST track plugin.
 * @enum {string}
 */
export const MistTrackEventType = {
  CREATE_TRACKS: ID + ':createMulti',
  EXPAND_TRACK_DAY: ID + ':expandTrackDay',
  EXPAND_TRACK_WEEK: ID + ':expandTrackWeek',
  EXPAND_TRACK_MONTH: ID + ':expandTrackMonth',
  EXPAND_TRACK: ID + ':expandTrack'
};
