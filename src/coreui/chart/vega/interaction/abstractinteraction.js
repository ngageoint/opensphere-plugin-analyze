goog.declareModuleId('coreui.chart.vega.interaction.AbstractInteraction');

const Disposable = goog.require('goog.Disposable');
const osString = goog.require('os.string');
const {default: Model} = goog.requireType('coreui.chart.vega.data.Model');


const GoogEvent = goog.requireType('goog.events.Event');


/**
 * @abstract
 */
class AbstractInteraction extends Disposable {
  /**
   * Constructor.
   * @param {Model} model
   * @param {string=} opt_chartType
   */
  constructor(model, opt_chartType) {
    super();

    /**
     * @type {string}
     */
    this.id = osString.randomString();

    /**
     * @type {Model}
     * @protected
     */
    this.model = model;

    /**
     * @type {vega.View}
     * @protected
     */
    this.view = null;

    /**
     * @type {function((GoogEvent|string), *)}
     * @protected
     */
    this.callbackHandler = this.callback.bind(this);

    /**
     * @type {Object}
     */
    this.spec = {};

    /**
     * The scale names; some interactions need them to do stuff
     * @type {Array<string>}
     */
    this.scaleNames = ['xScale', 'yScale'];

    /**
     * The chart type that the interaction is attached to
     * @type {string}
     * @protected
     */
    this.chartType = opt_chartType || '';
  }

  /**
   * Dispose
   * @inheritDoc
   */
  disposeInternal() {
    super.disposeInternal();

    if (this.view) {
      this.view.removeSignalListener(this.id, this.callbackHandler);
    }

    this.model = null;
    this.view = null;
    this.spec = null;
  }

  /**
   * Attach the interaction's listeners
   * @param {vega.View} view
   */
  addListener(view) {
    // Going to need this later for clean up
    this.view = view;
    this.view.addSignalListener(this.id, this.callbackHandler);
  }

  /**
   * The callback function for the interaction
   * @abstract
   * @param {GoogEvent|string} event the event instance or signal name
   * @param {*} value the vega item or new signal value
   * @protected
   */
  callback(event, value) {}

  /**
   * Translate in-scale value to coordinate in the chart's pixel range
   *
   * NOTES:
   *  - For numerics, it only handles linear axes ATM; please add in log scales, etc as needed
   *  - For strings (unique, discrete), it gives the same spacing to each bin
   *
   * @param {number|string} value
   * @param {string} scaleName
   * @return {number}
   */
  toCoord(value, scaleName) {
    let coord = 0;
    if (this.view) {
      const scale = /** @type {vega.Scale} */ (this.view.scale(scaleName)); // use the typedef so scale.type doesn't min

      if (scale) {
        const domain = scale.domain();
        const range = scale.range();

        if (!domain || domain.length == 0 ||
            !range || range.length < 2) {
          // do nothing; return the default value
        } else if (domain.length == 2 &&
            typeof value == 'number' &&
            typeof domain[0] == 'number') {
          // try to convert the exact point value in the x or y coordinate system
          const val = /** @type {number} */ (value);
          const width = range[1] - range[0]; // points
          const start = /** @type {number} */ (domain[0]);
          const end = /** @type {number} */ (domain[1]);

          // conversion; TODO handle power, log, etc when needed
          const type = scale.type;
          switch (type) {
            case 'linear':
              coord = (width * (val - start) / (end - start)) + range[0];
              break;
            default:
              break;
          }
        } else {
          // try to snap to the bin in the x or y coordinate system
          const idx = domain.indexOf(value);
          if (idx >= 0) {
            let width = range[1] - range[0]; // points
            width = 1.0 * width / (domain.length - 1); // force to decimal
            coord = (idx * width) + range[0];
          }
        }
      }
    }
    return coord;
  }

  /**
   * Translate coordinates to values on the chart
   * @param {number} coord
   * @param {string} scaleName
   * @param {boolean=} opt_up round up to the next highest bin
   * @return {Date|number|string}
   */
  translateCoord(coord, scaleName, opt_up) {
    let val = '';
    if (this.view) {
      const scale = this.view.scale(scaleName);
      if (scale) {
        // try to invert the exact value
        val = scale.invert(coord);
        if (!val) {
          // add in a margin of error to find the closest value
          let width = scale.range()[1] - scale.range()[0];
          width = width / scale.domain().length;

          if (opt_up) {
            val = scale.invertRange([coord - width, coord]);
            if (Array.isArray(val)) {
              val = val[0];
            } else {
              opt_up = false;
            }
          }
          if (!opt_up) {
            val = scale.invertRange([coord, coord + width]);
            if (Array.isArray(val)) {
              val = val[0];
            }
          }
        }
      }
    }
    return val;
  }

  /**
   * Translate coordinate range on single axis to values on the chart
   * @param {Array<number>} coords
   * @param {string} scaleName
   * @return {Array<Date|number|string>}
   */
  translateRange(coords, scaleName) {
    let val = [];
    if (this.view) {
      const scale = this.view.scale(scaleName);
      coords = coords[0] < coords[1] ? coords : coords.reverse();
      if (scale && scale.invertRange) {
        // try to use the coordinates as provided
        val = scale.invertRange(coords);
        if (!val) {
          // translate coordinates individually
          val = [this.translateCoord(coords[0], scaleName, true), this.translateCoord(coords[1], scaleName)];
        }
        val = val[0] < val[1] ? val : val.reverse();
      }
    }
    return val;
  }
}

export default AbstractInteraction;
