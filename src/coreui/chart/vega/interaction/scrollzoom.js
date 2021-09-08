goog.declareModuleId('coreui.chart.vega.interaction.ScrollZoom');

import {AbstractInteraction} from './abstractinteraction.js';

const {Model} = goog.requireType('coreui.chart.vega.data.Model');


/**
 */
export class ScrollZoom extends AbstractInteraction {
  /**
   * Constructor.
   * @param {Model} model
   * @param {string=} opt_chartType
   */
  constructor(model, opt_chartType) {
    super(model, opt_chartType);
    this.spec = {
      'signals':
      [
        {
          // [point as an array, zoomfactor]
          'name': this.id,
          'value': null,
          'on': [
            {
              'events': {'signal': this.id + 'zoom'},
              'update': '[' + this.id + 'anchor, ' + this.id + 'zoom]'
            }
          ]
        }, {
          // update the zoom factor with each zoomy
          'name': this.id + 'zoom',
          'value': null,
          'on': [
            {
              'events': 'wheel!',
              'force': true,
              'update': 'pow(1.005, event.deltaY * pow(16, event.deltaMode))'
            }
          ]
        }, {
          // the point where the wheel was used
          'name': this.id + 'anchor',
          'value': null,
          'on': [
            {
              'events': 'wheel',
              'update': 'xy()'
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
    if (this.view && this.model && !this.model.isDisposed() && Array.isArray(value) && value.length == 2) {
      // get everything we need to find the next extent
      let xAnchor = this.translateRange([0, value[0][0]], this.scaleNames[0]);
      xAnchor = xAnchor[xAnchor.length - 1];
      xAnchor = xAnchor instanceof Date ? xAnchor.valueOf() : xAnchor;
      const zoom = value[1];
      let xDom = this.view.signal('xExtent');
      const xField = /** @type {string} */ (this.view.signal('xField'));
      const xFull = this.model.defaultDomain[xField];
      let xString = false;

      // handle values that aren't numbers by using the index of that value in the original domain
      if (Array.isArray(xDom) && (xDom.length > 2 || typeof xDom[0] == 'string')) {
        xString = true;
        const x0 = xFull.indexOf(xDom[0]);
        const x1 = xFull.indexOf(xDom[xDom.length - 1]);
        xAnchor = xFull.indexOf(xAnchor);
        xDom = [x0, x1];
      }

      // do the math to get the next extent
      xDom = [xAnchor + (xDom[0] - xAnchor) * zoom, xAnchor + (xDom[1] - xAnchor) * zoom];
      xDom = xString ? xFull.slice(Math.max(0, Math.floor(xDom[0])), Math.min(xFull.length, Math.ceil(xDom[1] + 1))) :
          xDom;

      if (this.model.isMultiDimensional) {
        // do it again for the y axis
        let yAnchor = this.translateRange([this.view.height(), value[0][1]], this.scaleNames[1]);
        yAnchor = yAnchor[yAnchor.length - 1];
        yAnchor = yAnchor instanceof Date ? yAnchor.valueOf() : yAnchor;
        let yDom = this.view.signal('yExtent');
        const yField = /** @type {string} */ (this.view.signal('yField'));
        const yFull = this.model.defaultDomain[yField];
        let yString = false;
        if (Array.isArray(yDom) && (yDom.length > 2 || typeof yDom[0] == 'string')) {
          yString = true;
          const y0 = yFull.indexOf(yDom[0]);
          const y1 = yFull.indexOf(yDom[yDom.length - 1]);
          yAnchor = yFull.indexOf(yAnchor);
          yDom = [y0, y1];
        }
        yDom = [yAnchor + (yDom[0] - yAnchor) * zoom, yAnchor + (yDom[1] - yAnchor) * zoom];
        yDom = yString ? yFull.slice(Math.max(0, Math.floor(yDom[0])), Math.min(yFull.length, Math
            .ceil(yDom[1] + 1))) :

            yDom;
        this.model.setDomainsDebounce.fire(this.model.currentDomain, [xField, yField], [xDom, yDom], true);
      } else {
        this.model.setDomain(this.model.currentDomain, xField, xDom, true);
      }
    }
  }
}
