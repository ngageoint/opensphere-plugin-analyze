goog.declareModuleId('coreui.chart.vega.base.Event');

const GoogEvent = goog.require('goog.events.Event');

const {EventType} = goog.requireType('coreui.chart.vega.base.EventType');


/**
 * Reference to the object that is the target of this event
 */
export class VegaEvent extends GoogEvent {
  /**
   * Constructor.
   * @param {EventType} type
   * @param {string} id
   * @param {Object=} opt_config The object that changed
   * @param {Object=} opt_target
   */
  constructor(type, id, opt_config, opt_target) {
    const eventId = /** @type {string} */ (type);
    super(eventId, opt_target);

    /**
     * @type {Object}
     * @private
     */
    this.config_ = opt_config ? opt_config : null;

    /**
     * Deconflict chart events by chart id
     * @type {string}
     * @private
     */
    this.id_ = id;
  }

  /**
   * @return {Object}
   */
  getConfig() {
    return this.config_;
  }

  /**
   * @return {string}
   */
  getId() {
    return this.id_;
  }
}
