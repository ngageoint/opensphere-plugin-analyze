goog.declareModuleId('coreui.chart.vega.interaction.DragPan');

import {default as Utils} from '../utils.js';
import {default as AbstractInteraction} from './abstractinteraction.js';

const {default: Model} = goog.requireType('coreui.chart.vega.data.Model');


/**
 */
class DragPan extends AbstractInteraction {
  /**
   * Constructor.
   * @param {Model} model
   * @param {string=} opt_chartType
   */
  constructor(model, opt_chartType) {
    super(model, opt_chartType);

    /**
     * @type {Array<number>}
     */
    this.prior = null;

    this.spec = {
      'signals':
      [
        {
          // the mouse position mid-drag
          'name': this.id,
          'value': null,
          'on': [
            {
              'events':
              {
                'source': 'window',
                'type': 'mousemove',
                'between': [
                  {
                    'type': 'mousedown'
                  }, {
                    'type': 'mouseup'
                  }
                ],
                'filter': [
                  'event.button === 0',
                  'event.shiftKey === false',
                  'event.ctrlKey === false',
                  'event.metaKey === false'
                ]
              },
              'update': `${this.id}drag ? xy() : null`
            },
            {
              'events':
              {
                'signal': `${this.id}drag`
              },
              'update': `(${this.id}drag !== false) ? ${this.id}drag : null`,
              'force': true
            }
          ]
        }, {
          // keep track of where the first click was, keep that data point under the mouse
          'name': `${this.id}drag`,
          'value': false,
          'on': [
            {
              'events':
              {
                'type': 'mousedown',
                'filter': [
                  'event.button === 0',
                  'event.shiftKey === false',
                  'event.ctrlKey === false',
                  'event.metaKey === false'
                ]
              },
              'update': 'xy()'
            },
            {
              'events':
              {
                'type': 'mouseup'
              },
              'update': 'false'
            }
          ]
        }
      ]
    };
  }

  /**
   * The callback function for the interaction
   * @inheritDoc
   */
  callback(name, value) {
    // if the starting position or current position doesn't exist, don't bother
    const isDragging = /** @type {boolean|null} */ (this.view ? this.view.signal(`${this.id}drag`) !== false : null);
    const isWindowDragging = this.windowDownCheck();

    if (!isDragging || isWindowDragging || !value) {
      this.prior = null; // reset the diff point for the next drag callback
      return;
    } else if (!this.prior) {
      this.prior = /** @type {Array<number>} */ (value
          .slice()); // save the value and wait for the next drag callback to do diff

      return;
    }

    // don't treat a regular click as a drag
    const pixels = Math.max(Math.abs(this.prior[0] - value[0]), Math.abs(this.prior[1] - value[1]));
    if (pixels < 3.0) {
      return;
    }

    // convert to in-scale values
    const translated = [
      this.translateCoord(value[0], this.scaleNames[0]),
      this.translateCoord(value[1], this.scaleNames[1])
    ];

    // convert to in-scale values
    const translatedPrior = [
      this.translateCoord(this.prior[0], this.scaleNames[0]),
      this.translateCoord(this.prior[1], this.scaleNames[1])
    ];

    this.prior = /** @type {Array<number>} */ (value.slice());

    let xDom = this.view.signal('xExtent');
    const xField = /** @type {string} */ (this.view.signal('xField'));
    const xFull = this.model.defaultDomain[xField];
    const xNull = 'No ' + xField; // TODO get this out of the binmethod

    // handle values that aren't numbers by using the index of that value in the original domain
    if (Array.isArray(xDom) && (xDom.length > 2 || typeof xDom[0] == 'string')) {
      const x0 = xFull.indexOf(xDom[0]);
      const x1 = xFull.indexOf(xDom[xDom.length - 1]);
      const range = Math.abs(x1 - x0);
      const diff = xFull.indexOf(translated[0] || xNull) - xFull.indexOf(translatedPrior[0] || xNull);

      // constrain the value of the pan to the current chart's domain
      xDom = [Math.min(Math.max(0, x0 - diff), xFull.length - range),
        Math.max(Math.min(xFull.length, 1 + x1 - diff), range)];
      xDom = xFull.slice(xDom[0], xDom[1]);
      if (xDom.length >= 3) {
        this.view.signal('xExtent', xDom.slice());
      }
    } else if (translated[0]) {
      const diff = (translated[0] - translatedPrior[0]);
      xDom = [xDom[0] - diff, xDom[1] - diff];
      this.view.signal('xExtent', xDom);
    }

    // do it all for the y axis too if needed
    if (this.model.isMultiDimensional) {
      let yDom = this.view.signal('yExtent');
      const yField = /** @type {string} */ (this.view.signal('yField'));
      const yFull = this.model.defaultDomain[yField];
      const yNull = 'No ' + yField; // TODO get this out of the binmethod

      if (Array.isArray(yDom) && (yDom.length > 2 || typeof yDom[0] == 'string')) {
        const y0 = yFull.indexOf(yDom[0]);
        const y1 = yFull.indexOf(yDom[yDom.length - 1]);
        const yRange = Math.abs(y1 - y0);
        const diff = yFull.indexOf(translated[1] || yNull) - yFull.indexOf(translatedPrior[1] || yNull);
        yDom = [Math.min(Math.max(0, y0 - diff), yFull.length - yRange),
          Math.max(Math.min(yFull.length, 1 + y1 - diff), yRange)];
        yDom = yFull.slice(yDom[0], yDom[1]);
        if (yDom.length >= 3) {
          this.view.signal('yExtent', yDom.slice());
        }
      } else if (translated[1]) {
        const diff = (translated[1] - translatedPrior[1]);
        yDom = [yDom[0] - diff, yDom[1] - diff];
        this.view.signal('yExtent', yDom);
      }

      this.model.setDomainsDebounce.fire(this.model.currentDomain, this.model.seriesKeys,
          /** @type {Array<Array>} */ ([this.view.signal('xExtent'), this.view.signal('yExtent')]), true);
    } else {
      this.model.setDomain(this.model.currentDomain, this.model.seriesKeys[0],
          /** @type {Array} */ (this.view.signal('xExtent')), true);
    }
  }

  /**
   * Check if window is being moved instead of the chart
   * @return {boolean}
   */
  windowDownCheck() {
    const downVal = this.view &&
    this.model &&
    this.model.windowId &&
    Utils.ifSignal(this.view, this.model.windowId + 'windowDown') &&
    this.view.signal(this.model.windowId + 'windowDown');

    // use some boolean acrobatics to see if the downVal is the default [0,0] or something else
    return Array.isArray(downVal) && !!(downVal[0] || downVal[1]);
  }
}

export default DragPan;
