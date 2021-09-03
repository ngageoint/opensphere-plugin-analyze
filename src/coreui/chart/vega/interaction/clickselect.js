goog.declareModuleId('coreui.chart.vega.interaction.ClickSelect');

import {default as AbstractInteraction} from './abstractinteraction.js';

const {default: Model} = goog.requireType('coreui.chart.vega.data.Model');


/**
 *
 */
class ClickSelect extends AbstractInteraction {
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
          // the item under the click, sent to callback function for actual selecting
          'name': this.id,
          'value': null,
          'on': [
            {
              'events': '*:click[event.button === 0 && !event.shiftKey]',
              'update': 'datum',
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
      if (value && value['count']) {
        this.model.select([value], true);
      }
    }
  }
}

export default ClickSelect;
