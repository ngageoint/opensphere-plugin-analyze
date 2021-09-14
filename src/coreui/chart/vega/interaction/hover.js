goog.declareModuleId('coreui.chart.vega.interaction.Hover');

import {SourceModel} from '../data/sourcemodel.js';
import {AbstractInteraction} from './abstractinteraction.js';

const {Model} = goog.requireType('coreui.chart.vega.data.Model');
const ColorBin = goog.requireType('os.data.histo.ColorBin');


/**
 */
export class Hover extends AbstractInteraction {
  /**
   * Constructor.
   * @param {Model} model
   * @param {string=} opt_chartType
   */
  constructor(model, opt_chartType) {
    super(model, opt_chartType);
    this.spec = {
      'signals': [
        {
          // light up the item underneath the mouse
          'name': this.id,
          'value': null,
          'on': [
            {
              'events': '*:mouseover',
              'update': 'datum'
            },
            {
              'events': '*:mouseout',
              'update': 'null',
              'force': true
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
    if (this.view && !this.view.signal('selectController')) {
      if (value && Array.isArray(value.items)) {
        if (value.items.length && this.model instanceof SourceModel &&
          this.model.source) {
          this.model.source.setHighlightedItems(value.items);
        } else {
          this.model.highlightBins(new Array(/** @type {ColorBin} */ (value)));
        }
      } else if (value == null) {
        if (this.model instanceof SourceModel && this.model.source) {
          this.model.source.setHighlightedItems(null);
        }
        this.model.highlightBins([]);
      }
    }
  }
}
