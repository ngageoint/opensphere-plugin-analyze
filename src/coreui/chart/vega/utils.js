goog.declareModuleId('coreui.chart.vega.Utils');

import DateBinMethod from 'opensphere/src/os/histo/datebinmethod.js';
import DateBinType from 'opensphere/src/os/histo/datebintype.js';


/**
 * Crossfilter empty id, because every item must have something that xf can filter on
 * @type {number}
 * @const
 */
export const NUMERIC_EMPTY_ID = -9999999998;

/**
 * The types dateBinTypes available for opsclocks
 * @type {Array<string>}
 * @const
 */
export const OPS_CLOCK_DATE_BIN_TYPES = [
  DateBinType.HOUR_OF_DAY,
  DateBinType.HOUR_OF_WEEK,
  DateBinType.HOUR_OF_MONTH
];

/**
 * Useful methods for interacting with Vega
 */
export const Utils = {
  /**
   * Gets the bin method for the opsclock. This method has a restricted set of available date bin types.
   * @param {os.histo.DateBinMethod=} opt_method method on which to apply additional opsclock settings
   * @return {!os.histo.DateBinMethod} The opsclock bin method instance.
   */
  getOpsClockMethod(opt_method) {
    const method = opt_method || new DateBinMethod();
    method.setShowEmptyBins(true);
    method.setDateBinTypes(OPS_CLOCK_DATE_BIN_TYPES);
    return method;
  },

  /**
   * Add/Remove/Replace item from vega object array in the spec
   * @param {Object} spec the vega spec
   * @param {string} key the key to search in the vega spec (i.e. signals, axes, etc.)
   * @param {string} name the name of the thing to add/remove
   * @param {Object=} opt_insert the thing to insert if adding
   */
  updateSpec(spec, key, name, opt_insert) {
    if (spec && spec[key] && Array.isArray(spec[key])) {
      let i = spec[key].length;
      while (i--) {
        if (spec[key][i] && (spec[key][i]['name'] == name || spec[key][i]['scale'] == name)) {
          spec[key].splice(i, 1);
        }
      }

      if (opt_insert) {
        if (Array.isArray(opt_insert)) {
          Array.prototype.push.apply(spec[key], opt_insert);
        } else {
          spec[key].push(opt_insert);
        }
      }
    }
  },

  /**
   * Add/Remove/Replace item from vega object array in the spec
   * @param {Object} spec the vega spec
   * @param {string} name the name of the thing to add/remove
   * @param {*=} opt_value the thing to insert if adding
   * @return {*} the value of the signal
   */
  specSignal(spec, name, opt_value) {
    const signals = spec['signals'];

    if (signals && Array.isArray(signals)) {
      const signal = signals.find((s) => {
        return s['name'] == name;
      });
      if (signal) {
        if (opt_value) signal['value'] = opt_value;
        return signal['value'];
      }
    }
  },

  /**
   * Change the domain array to an array of ranges
   * @param {Array<Array<string|number|Date>>} input
   * @return {Array<Array<string|number|Date>>}
   */
  rangeDomainSet(input) {
    return input.map(function(v) {
      return v.length == 2 ? v : [v[0], v[v.length - 1]];
    });
  },

  /**
   * Check to see if signal exists
   * @param {vega.View} view
   * @param {string} name
   * @return {boolean}
   */
  ifSignal(view, name) {
    return Object.keys(view.getState()['signals']).indexOf(name) >= 0;
  }
};
