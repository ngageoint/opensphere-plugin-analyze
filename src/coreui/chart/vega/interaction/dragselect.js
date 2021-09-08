goog.declareModuleId('coreui.chart.vega.interaction.DragSelect');

import {Charts} from '../base/charts.js';
import {Model} from '../data/model.js';
import {AbstractInteraction} from './abstractinteraction.js';

import * as dispatcher from 'opensphere/src/os/dispatcher.js';

const dispose = goog.require('goog.dispose');
const GlobalMenuEventType = goog.require('os.ui.GlobalMenuEventType');
const Menu = goog.require('os.ui.menu.Menu');
const MenuItem = goog.require('os.ui.menu.MenuItem');
const MenuItemType = goog.require('os.ui.menu.MenuItemType');
const {VegaEvent} = goog.requireType('coreui.chart.vega.base.Event');

const GoogEvent = goog.requireType('goog.events.Event');
const ColorBin = goog.requireType('os.data.histo.ColorBin');
const MenuEvent = goog.requireType('os.ui.menu.MenuEvent');


/**
 */
export class DragSelect extends AbstractInteraction {
  /**
   * @param {Model} model
   * @param {string=} opt_chartType
   */
  constructor(model, opt_chartType) {
    super(model, opt_chartType);
    this.spec = {
      'signals': [
        {
          // trigger the menu
          'name': this.id,
          'value': null,
          'update': this.id + 'active ? null : true'
        },
        {
          // mouse position
          'name': this.id + 'position',
          'value': null,
          'on': [
            {
              'events': '*:mousemove',
              'update': this.id + 'active ? xy() : ' + this.id + 'position'
            }
          ]
        },
        {
          // actively selecting the bins
          'name': this.id + 'active',
          'value': null,
          'on': [
            {
              'events': '*:mousedown[event.button === 0]',
              'update': 'true'
            },
            {
              'events': 'mouseup',
              'update': 'false'
            }
          ]
        },
        {
          // start item
          'name': this.id + 'start',
          'value': null,
          'on': [
            {
              'events': '*:mousedown[event.button === 0]',
              'update': 'datum'
            }
          ]
        },
        {
          // current item / end item
          'name': this.id + 'intermediate',
          'value': null,
          'on': [
            {
              'events': '*:mousemove[event.button === 0]',
              'debounce': 100,
              'update': this.id + 'active ? datum : null'
            }
          ]
        }
      ]
    };

    // setup the menu so it's ready for use
    DragSelect.setup();

    /**
     * The context menu for the UI.
     * @type {Menu|undefined}
     * @protected
     */
    this.contextMenu = DragSelect.MENU;

    /**
     * The context menu for the UI.
     * @type {Array<ol.Feature>}
     * @protected
     */
    this.data = null;

    /**
     * The current set of bins
     * @type {Array<ColorBin>}
     * @protected
     */
    this.bins = null;

    /**
     * The first bin
     * @type {ColorBin}
     * @protected
     */
    this.start = null;

    /**
     * The last bin
     * @type {ColorBin}
     * @protected
     */
    this.end = null;

    /**
     * The current set of bins
     * @type {?function(ColorBin, ColorBin): Array<ColorBin>}
     * @protected
     */
    this.calcFunction = null;

    /**
     * @type {function((GoogEvent|string), *)}
     * @protected
     */
    this.hoverCallbackHandler = this.hoverCallback.bind(this);

    if (this.model) {
      const events = DragSelect.EventType;
      for (const key in events) {
        this.model.listen(events[key], this.runSelection, false, this);
      }
    }
  }


  /**
   * @inheritDoc
   */
  disposeInternal() {
    if (this.view) {
      this.view.removeSignalListener(this.id + 'intermediate', this.hoverCallbackHandler);
    }

    if (this.model) {
      const events = DragSelect.EventType;
      for (const key in events) {
        this.model.unlisten(events[key], this.runSelection, false, this);
      }
    }
    DragSelect.MENU = undefined;
    super.disposeInternal();
  }


  /**
   * Add an additional listener for the drag interaction
   * @inheritDoc
   */
  addListener(view) {
    super.addListener(view);
    if (this.view) {
      this.view.addSignalListener(this.id + 'intermediate', this.hoverCallbackHandler);
    }
  }


  /**
   * The callback function for the interaction
   * @inheritDoc
   */
  callback(name, value) {
    // on mouseup:
    if (this.model && value && this.view && this.bins && this.bins.length &&
          this.view.signal(this.id + 'intermediate')) {
      // get the data and open the menu
      this.data = this.model.getDataFromBins(this.bins);
      this.view.signal(this.id + 'start', null);
      this.view.signal(this.id, null);
      const pos = this.view.signal(this.id + 'position');

      const x = 5 + pos[0] + this.view.origin()[0] || 0;
      const y = 5 + pos[1] + this.view.origin()[1] || 0;
      this.contextMenu.open(this.model, {
        my: 'left top',
        at: 'left+' + x + ' top+' + y,
        of: '#' + this.view.container()['id']
      });

      dispatcher.getInstance().listenOnce(GlobalMenuEventType.MENU_CLOSE, function() {
        if (this.view) {
          this.view.signal('selectController', null);

          // reset the view so the changes take effect
          if (this.model) {
            setTimeout(function() {
              this.model.highlightBins([]);
              this.model.softReset();
            }.bind(this), 100);
          }
        }
        this.data = null;
      }.bind(this));
    }
  }


  /**
   * Callback for hover on new thing
   * @param {GoogEvent|string} name the signal name
   * @param {*} value the vega item or new signal value
   */
  hoverCallback(name, value) {
    if (value && this.view && this.model && this.calcFunction && this.view.signal(this.id + 'active')) {
      this.bins = [];
      this.view.signal('selectController', this.id);
      this.start = /** @type {ColorBin} */ (this.view.signal(this.id + 'start'));
      this.end = /** @type {ColorBin} */ (this.view.signal(this.id + 'intermediate'));
      this.calculateBins();

      if (this.bins && this.bins.length) {
        this.model.highlightBins(this.bins);
      }
    }
  }


  /**
   * Set the function that will calculate the intermediate bins
   * @param {function(ColorBin, ColorBin): Array<ColorBin>} func
   */
  setCalcFunction(func) {
    this.calcFunction = func;
  }


  /**
   * Calculate the intermediate bins
   * @protected
   */
  calculateBins() {
    if (this.start && this.end) {
      this.bins = this.calcFunction(this.start, this.end);
    }
  }


  /**
   * Menu selection was made, do the stuff
   * @param {VegaEvent} event
   * @protected
   */
  runSelection(event) {
    switch (event.type) {
      case DragSelect.EventType.SELECT_EXCLUSIVE:
        this.model.selectExclusive(this.bins);
        break;
      case DragSelect.EventType.DESELECT:
        this.model.deselect(this.bins);
        break;
      case DragSelect.EventType.HIDE:
        this.model.hideBins(this.bins);
        break;
      case DragSelect.EventType.REMOVE:
        this.model.removeBins(this.bins);
        break;
      case DragSelect.EventType.SELECT:
      default:
        this.model.select(this.bins);
        break;
    }
  }


  /**
   * Create the chart menu.
   */
  static setup() {
    if (!DragSelect.MENU) {
      const selectChildren = [{
        label: 'Select',
        eventType: DragSelect.EventType.SELECT,
        tooltip: 'Add items in this area to selection',
        icons: ['<i class="fa fa-fw fa-check-circle"></i> '],
        handler: DragSelect.sendBrushMenuEvent,
        beforeRender: Charts.chartActionAllowed,
        sort: 10
      }, {
        label: 'Select Exclusive',
        eventType: DragSelect.EventType.SELECT_EXCLUSIVE,
        tooltip: 'Select items in this area and deselect others',
        icons: ['<i class="fa fa-fw fa-check-circle"></i> '],
        handler: DragSelect.sendBrushMenuEvent,
        beforeRender: Charts.chartActionAllowed,
        sort: 20
      }, {
        label: 'Deselect',
        eventType: DragSelect.EventType.DESELECT,
        tooltip: 'Deselect items in this area',
        icons: ['<i class="fa fa-fw fa-times-circle"></i> '],
        handler: DragSelect.sendBrushMenuEvent,
        beforeRender: Charts.chartActionAllowed,
        sort: 30
      }, {
        label: 'Hide',
        eventType: DragSelect.EventType.HIDE,
        tooltip: 'Hide items in this area',
        icons: ['<i class="fa fa-fw fa-eye-slash"></i> '],
        handler: DragSelect.sendBrushMenuEvent,
        beforeRender: Charts.chartWindowInactive,
        sort: 40
      }, {
        label: 'Remove',
        eventType: DragSelect.EventType.REMOVE,
        tooltip: 'Remove items in this area',
        icons: ['<i class="fa fa-fw fa-times"></i> '],
        handler: DragSelect.sendBrushMenuEvent,
        beforeRender: Charts.chartActionAllowed,
        sort: 50
      }];

      const mi = new MenuItem({
        type: MenuItemType.ROOT
      });

      mi.addChild({
        label: 'Select',
        type: MenuItemType.GROUP,
        sort: 10,
        children: selectChildren
      });

      DragSelect.MENU = new Menu(mi);
    }
  }


  /**
   * Dispose the chart menu.
   */
  static dispose() {
    dispose(DragSelect.MENU);
    DragSelect.MENU = undefined;
  }


  /**
   * Handle chart menu events.
   * @param {MenuEvent|string} event The event.
   */
  static sendBrushMenuEvent(event) {
    const model = /** @type {Model} */ (event.getContext());

    if (model instanceof Model) {
      model.dispatchEvent(event);
    }
  }
}

/**
 * Events fired by the chart menu.
 * @enum {string}
 */
DragSelect.EventType = {
  SELECT: 'brush:select',
  SELECT_EXCLUSIVE: 'brush:selectexclusive',
  DESELECT: 'brush:deselect',
  HIDE: 'brush:hide',
  REMOVE: 'brush:remove'
};


/**
 * Menu for vega charts
 * @type {Menu|undefined}
 */
DragSelect.MENU = undefined;
