goog.declareModuleId('plugin.mist.track.ExpandTrackUI');

goog.require('os.ui.datetime.DateTimeUI');

const Module = goog.require('os.ui.Module');
const osWindow = goog.require('os.ui.window');
const RecordField = goog.require('os.data.RecordField');
const {requestTrack} = goog.require('plugin.mist.track.query');
const {ROOT} = goog.require('tools');
const WindowEventType = goog.require('os.ui.WindowEventType');

const Feature = goog.requireType('ol.Feature');
const ITime = goog.requireType('os.time.ITime');


/**
 * The query track custom range ui directive
 * @return {angular.Directive}
 */
export const directive = function() {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      'track': '='
    },
    templateUrl: ROOT + 'views/plugin/track/expandtrack.html',
    controller: ExpandTrackCtrl,
    controllerAs: 'expandtrack'
  };
};

/**
 * Add the directive to the module.
 */
Module.directive('expandtrack', [directive]);

/**
 * Controller function for the custom track query directive
 * @unrestricted
 */
export class ExpandTrackCtrl {
  /**
   * @param {!angular.Scope} $scope
   * @param {!angular.JQLite} $element
   * @ngInject
   */
  constructor($scope, $element) {
    /**
     * @type {?angular.Scope}
     * @protected
     */
    this.scope = $scope;

    /**
     * @type {?angular.JQLite}
     * @protected
     */
    this.element = $element;

    /**
     * @type {!Feature}
     */
    this.track = this.scope['track'];

    const trackTime = /** @type {ITime|undefined} */ (this.track.get(RecordField.TIME));

    /**
     * @type {number}
     */
    this['min'] = trackTime.getStart();

    /**
     * @type {number}
     */
    this['start'] = this['min'];

    /**
     * @type {number}
     */
    this['max'] = trackTime.getEnd();

    /**
     * @type {number}
     */
    this['end'] = this['max'];

    this.scope.$emit(WindowEventType.READY);
  }

  /**
   * Make sure the end time is greater than the track ending
   * @return {boolean}
   * @export
   */
  endInvalid() {
    return this['max'] > this.dateToTime(this['end']);
  }

  /**
   * Make sure the start time is less than the track beginning
   * @return {boolean}
   * @export
   */
  startInvalid() {
    return this['min'] < this.dateToTime(this['start']);
  }

  /**
   * Turn a Date string into a number timestamp
   * @param {number} datetime
   * @return {string}
   * @export
   */
  prettyDate(datetime) {
    return moment.utc(datetime).format('YYYY-MM-DD HH:mm:ss');
  }

  /**
   * Turn a Date string into a number timestamp
   * @param {Date} date
   * @return {number}
   */
  dateToTime(date) {
    return (new Date(date)).getTime();
  }

  /**
   * Close
   * @export
   */
  close() {
    osWindow.close(this.element);
  }

  /**
   * Updates the time range of a track
   * @export
   */
  accept() {
    const start = this.dateToTime(this['start']);
    const end = this.dateToTime(this['end']);
    if (!(start === this['min'] && end === this['max'])) {
      requestTrack(this.track, undefined, start, end);
    }
    this.close();
  }

  /**
   * UI to pick the track query range
   * @param {!Feature} track The track to query.
   */
  static launch(track) {
    const scopeOptions = {
      'track': track
    };

    const name = track.get('name');
    const label = 'Query Track - ' + (name ? name : 'Custom Time Range');
    const windowOptions = {
      'id': 'expandtrack',
      'label': label,
      'icon': 'fa fa-download',
      'key': 'expandtrack',
      'x': 'center',
      'y': 'center',
      'width': '400',
      'min-width': '400',
      'max-width': '500',
      'height': 'auto',
      'show-close': 'true'
    };

    const template = '<expandtrack track="track"></expandtrack>';
    osWindow.create(windowOptions, template, undefined, undefined, undefined, scopeOptions);
  }
}
