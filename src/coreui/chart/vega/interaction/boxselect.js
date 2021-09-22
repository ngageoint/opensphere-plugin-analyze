goog.declareModuleId('coreui.chart.vega.interaction.BoxSelect');

import * as dispatcher from 'opensphere/src/os/dispatcher.js';
import {Charts} from '../base/charts.js';
import {ChartType} from '../charttype.js';
import {Model} from '../data/model.js';
import {Utils} from '../utils.js';
import {AbstractInteraction} from './abstractinteraction.js';

const dispose = goog.require('goog.dispose');
const AlertEventSeverity = goog.require('os.alert.AlertEventSeverity');
const AlertManager = goog.require('os.alert.AlertManager');
const GlobalMenuEventType = goog.require('os.ui.GlobalMenuEventType');
const Menu = goog.require('os.ui.menu.Menu');
const MenuItem = goog.require('os.ui.menu.MenuItem');
const MenuItemType = goog.require('os.ui.menu.MenuItemType');

const {VegaEvent} = goog.requireType('coreui.chart.vega.base.Event');
const ColorBin = goog.requireType('os.data.histo.ColorBin');
const MenuEvent = goog.requireType('os.ui.menu.MenuEvent');


/**
 */
export class BoxSelect extends AbstractInteraction {
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
          // the box from start point to end point
          'name': this.id,
          'value': null, // 2 x 3 array of arrays [start point, end point, config]
          'on': [
            {
              'events':
              {
                'signal': `${this.id}end`
              },
              'update': `${this.id}start && ${this.id}end
                ? [slice(${this.id}start), slice(${this.id}end), [${this.id}ctrl]]
                : null`
            }, {
              'events':
              {
                'signal': `${this.id}mouseout`
              },
              'update': `${this.id}visible && ${this.id}start && ${this.id}mouseout
                ? [slice(${this.id}start), slice(${this.id}mouseout), [${this.id}ctrl]]
                : null`
            }
          ]
        }, {
          // Re-flags the ctrl key each mousedown
          'name': `${this.id}ctrl`,
          'value': false,
          'on': [
            {
              'events': {
                'type': 'mousedown',
                'filter': [
                  'event.button == 0',
                  '(event.shiftKey === true || event.ctrlKey === true || event.metaKey === true)'
                ]
              },
              'update': '(event.metaKey || event.ctrlKey)'
            }
          ]
        }, {
          // don't change the box when the boxselect menu is open
          'name': `${this.id}box`,
          'value': null
        }, {
          // start drawing the box
          'name': `${this.id}visible`,
          'value': false,
          'on': [
            {
              'events': {
                'type': 'mousedown',
                'filter': [
                  'event.button === 0',
                  '(event.shiftKey === true || event.ctrlKey === true || event.metaKey === true)'
                ]
              },
              'update': 'true'
            }
          ]
        }, {
          // The final point calculated on mouseup
          'name': `${this.id}end`,
          'value': null,
          'on': [
            {
              'events':
              {
                'type': 'mouseup',
                'filter': ['event.button === 0']
              },
              'update': `${this.id}box == null
                && ${this.id}visible
                && ${this.id}intermediate[0]
                && ${this.id}intermediate[1]
                ? xy()
                : null`
            }, {
              'events':
              {
                'signal': `${this.id}start`
              },
              'update': 'null'
            }
          ]
        }, {
          // The starting point calculated on mousedown
          'name': `${this.id}start`,
          'value': [0, 0],
          'on': [
            {
              'events':
              {
                'type': 'mousedown',
                'filter': [
                  'event.button === 0',
                  '(event.shiftKey === true || event.ctrlKey === true || event.metaKey === true)'
                ]
              },
              'update': '[x(), y() < -2 ? -2 : y()]'
            }
          ]
        }, {
          // handle mouseout similarly to end
          'name': `${this.id}mouseout`,
          'value': null,
          'on': [
            {
              'events':
              {
                'type': 'mouseout',
                'source': '.js-vega__view',
                'filter': ['event.button === 0'],
                'between': [
                  {
                    'type': 'mousedown'
                  },
                  {
                    'type': 'mouseup'
                  }
                ]
              },
              'update': `${this.id}box == null
                && ${this.id}visible
                ? xy()
                : null`
            }
          ]
        }, {
          // intermediate point for rendering the box before mouseup
          'name': `${this.id}intermediate`,
          'value': [0, 0],
          'on': [
            {
              'events':
              {
                'type': 'mousemove',
                'filter': [
                  'event.button === 0',
                  '(event.shiftKey === true || event.ctrlKey === true || event.metaKey === true)'
                ],
                'between': [
                  {
                    'type': 'mousedown'
                  },
                  {
                    'type': 'mouseup'
                  }
                ]
              },
              // don't reshape the box after the boxselect menu is open
              'update': `${this.id}box
                ? ${this.id}box
                : [x(), y() < -2 ? -2 : y()]`
            }, {
              'events':
              {
                'signal': `${this.id}visible`
              },
              'update': `slice(${this.id}start)`
            }
          ]
        }
      ],
      'marks': [{
        'name': `${this.id}brush`,
        'type': 'rect',
        'encode': {
          'enter': {
            'zindex': {
              'value': 999999999999999 // set this arbitrarily high to ensure its above everything
            }
          },
          'update': {
            'stroke': {
              'signal': `${this.id}ctrl ? "#FF1111" : "#00FEFE"`
            },
            'strokeWidth': {
              'signal': `${this.id}visible ? 4 : 0`
            },
            'opacity': {
              'signal': `${this.id}visible ? 1 : 0`
            },
            'x': {
              'signal': `${this.id}start[0]`
            },
            'x2': {
              'signal': `${this.id}intermediate[0]`
            },
            'y': {
              'signal': `${this.id}start[1]`
            },
            'y2': {
              'signal': `${this.id}intermediate[1]`
            }
          }
        }
      }]
    };

    // setup the menu so it's ready for use
    BoxSelect.setup();

    /**
     * The context menu for the UI.
     * @type {Menu|undefined}
     * @protected
     */
    this.contextMenu = BoxSelect.MENU;

    /**
     * The context menu for the UI.
     * @type {Array<ColorBin>}
     * @protected
     */
    this.bins = null;

    /**
     * The most recent coord set for this interaction
     * @type {Array<Array<Date|number|string>>}
     * @protected
     */
    this.coords = null;

    if (this.model) {
      const events = BoxSelect.EventType;
      for (const key in events) {
        this.model.listen(events[key], this.runSelection, false, this);
      }
    }
  }

  /**
   * The callback function for the interaction
   * @inheritDoc
   */
  disposeInternal() {
    if (this.model) {
      const events = BoxSelect.EventType;
      for (const key in events) {
        this.model.unlisten(events[key], this.runSelection, false, this);
      }
    }
    BoxSelect.MENU = undefined;
    super.disposeInternal();
  }

  /**
   * The callback function for the interaction
   * @inheritDoc
   */
  callback(name, value) {
    if (this.model && Array.isArray(value) && value.length == 3) {
      // decide to show the menu or not
      const isScatterPlot = BoxSelect.isScatterPlot_(this.model.id);
      const b = !(isScatterPlot && value[2][0] === true);
      this.view.signal('selectController', this.id);

      const min = 5;
      const threshold = (Math.abs(value[1][0] - value[0][0]) > min) || (Math.abs(value[1][1] - value[0][1]) > min);

      // must have drawn a box larger than Nx5 or 5xN px
      if (threshold) {
        if (b) {
          if (this.contextMenu.isOpen()) return;
          this.view.signal(`${this.id}box`, [value[1][0], value[1][1]]); // lock the box until this menu is closed

          // open the menu
          const xMax = this.view.width();
          const yMax = this.view.height();

          let x = 5 + value[1][0] + this.view.origin()[0] || 0;
          let y = 5 + value[1][1] + this.view.origin()[1] || 0;

          // always draw inside the chart so menu doesn't flow outside the window
          if (x < 20) x = 20;
          if (y < 30) y = 30;

          if (x > (xMax - 140)) x = xMax - 140;
          if (y > (yMax - 150)) y = yMax - 150;

          this.contextMenu.open(this.model, {
            my: 'left top',
            at: 'left+' + x + ' top+' + y,
            of: '#' + this.view.container()['id']
          });
        }

        // swap the axes in the arrays so the next calculations compare to the proper ranges
        const isChartRotated = (this.view.signal('isChartRotated') === true);
        if (isChartRotated && !isScatterPlot) {
          // NOTE: it's faster to do a temporary variable and swap (especially since no for loop
          // is needed), but this is not heavily used so brevity and future JS engine improvements win.
          value[0].reverse();
          value[1].reverse();
        }

        // translate coords to values
        const xArr = this.translateRange([value[0][0], value[1][0]], this.scaleNames[0]);
        if (xArr.length > 2) {
          xArr[1] = xArr[xArr.length - 1];
          xArr.length = 2;
        }
        const yArr = this.translateRange([value[0][1], value[1][1]], this.scaleNames[1]);
        if (yArr.length > 2) {
          yArr[1] = yArr[yArr.length - 1];
          yArr.length = 2;
        }

        this.coords = [xArr, yArr];

        // calculate the bins
        if (this.model.isMultiDimensional) {
          this.bins = this.model.getBinsBetweenMulti(this.model.seriesKeys, [xArr, yArr]);
        } else if (this.chartType === ChartType.BAR) {
          this.bins = this.model.getBinsBetween(this.model.seriesKeys[0], xArr)
              .filter(function(v) {
                return yArr[0] <= v['count'];
              });
        } else {
          this.bins = this.model.getBinsBetween(this.model.seriesKeys[0], xArr)
              .filter(function(v) {
                return yArr[0] <= v['count'] && v['count'] <= yArr[1];
              });
        }
      }

      if (b && threshold) {
        dispatcher.getInstance().listenOnce(GlobalMenuEventType.MENU_CLOSE, function() {
          this.cleanup();
        }.bind(this));
      } else if (!this.contextMenu.isOpen()) {
        // ensure this runs after the other vega signals finish processing
        setTimeout(function() {
          const evt = /** @type {VegaEvent} */ ({
            'id': this.model.id,
            'type': BoxSelect.EventType.ZOOM_XY
          });
          this.runSelection(evt);
          this.cleanup();
        }.bind(this), 100);
      }
    }
  }

  /**
   * The cleanup function that re-renders the chart
   */
  cleanup() {
    if (this.view) {
      this.view.signal(`${this.id}visible`, false);
      this.view.signal(`${this.id}box`, null);
      this.view.signal('selectController', null);
    }
    this.bins = null;

    // reset the view so the changes take effect
    if (this.model) {
      setTimeout(function() {
        this.model.softReset();
      }.bind(this), 100);
    }
  }

  /**
   * Menu selection was made, do the stuff
   * @param {VegaEvent} event
   * @protected
   */
  runSelection(event) {
    if (!this.model) {
      const msg = 'Layer source has been disconnected from the chart, please close and reopen the chart';
      AlertManager.getInstance().sendAlert(msg, AlertEventSeverity.ERROR);
    } else {
      switch (event.type) {
        case BoxSelect.EventType.SELECT:
          this.model.select(this.bins);
          break;
        case BoxSelect.EventType.SELECT_EXCLUSIVE:
          this.model.selectExclusive(this.bins);
          break;
        case BoxSelect.EventType.DESELECT:
          this.model.deselect(this.bins);
          break;
        case BoxSelect.EventType.HIDE:
          this.model.hideBins(this.bins);
          break;
        case BoxSelect.EventType.REMOVE:
          this.model.removeBins(this.bins);
          break;
        case BoxSelect.EventType.WINDOW_XY:
          this.setupWindow();
          break;
        case BoxSelect.EventType.WINDOW_X:
          this.setupWindow(0);
          break;
        case BoxSelect.EventType.WINDOW_Y:
          this.setupWindow(1);
          break;
        case BoxSelect.EventType.ZOOM_XY:
          const rangesX = this.calcRanges(0);
          const rangesY = this.calcRanges(1);
          if (rangesX && rangesY) {
            this.model.setDomainsDebounce.fire(this.model.currentDomain,
                this.model.seriesKeys, [rangesX, rangesY], true);
          }
          break;
        case BoxSelect.EventType.ZOOM_X:
          const xranges = this.calcRanges(0);
          if (xranges) {
            this.model.setDomain(this.model.currentDomain, this.model.seriesKeys[0], xranges, true);
          }
          break;
        case BoxSelect.EventType.ZOOM_Y:
          const yranges = this.calcRanges(1);
          if (yranges) {
            this.model.setDomain(this.model.currentDomain, this.model.seriesKeys[1], yranges, true);
          }
          break;
        case BoxSelect.EventType.RESET_VIEW:
        default:
          this.model.resetDomainDebounce.fire();
          break;
      }
    }
  }

  /**
   * @param {number} num axis index
   * @return {Array}
   */
  calcRanges(num) {
    let ranges = this.model && this.model.defaultDomain[this.model.seriesKeys[num]];
    if (this.coords && this.coords.length > num) {
      if (!ranges || ranges.length <= 2) {
        ranges = this.coords[num];
      } else {
        ranges = ranges.slice(
            ranges.indexOf(this.coords[num][0]),
            1 + ranges.indexOf(this.coords[num][this.coords[num].length - 1]));
      }
    } else {
      ranges = null;
    }
    return ranges;
  }

  /**
   * @param {number=} opt_num axis index
   */
  setupWindow(opt_num) {
    if (this.model && this.view) {
      let coords = this.coords.slice();

      if (opt_num != null) {
        // switch the axis index from the one we want to keep to the one we want to fill
        opt_num = opt_num ? 0 : 1;
        const replace = opt_num ? this.translateRange([0, this.view.height() - 1], this.scaleNames[opt_num]) :
            this.translateRange([0, this.view.width() - 1], this.scaleNames[opt_num]);
        coords[opt_num] = replace;
      }

      coords = Utils.rangeDomainSet(coords);

      this.view.signal('windowActive', true);
      this.view.signal('oldWindowBrush', coords);
      this.view.signal('windowBrush', coords);
    }
  }

  /**
   * Create the chart menu.
   */
  static setup() {
    if (!BoxSelect.MENU) {
      const selectChildren = [{
        label: 'Select',
        eventType: BoxSelect.EventType.SELECT,
        tooltip: 'Add items in this area to selection',
        icons: ['<i class="fa fa-fw fa-check-circle"></i> '],
        handler: BoxSelect.sendBrushMenuEvent,
        beforeRender: Charts.chartActionAllowed,
        sort: 10
      }, {
        label: 'Select Exclusive',
        eventType: BoxSelect.EventType.SELECT_EXCLUSIVE,
        tooltip: 'Select items in this area and deselect others',
        icons: ['<i class="fa fa-fw fa-check-circle"></i> '],
        handler: BoxSelect.sendBrushMenuEvent,
        beforeRender: Charts.chartActionAllowed,
        sort: 20
      }, {
        label: 'Deselect',
        eventType: BoxSelect.EventType.DESELECT,
        tooltip: 'Deselect items in this area',
        icons: ['<i class="fa fa-fw fa-times-circle"></i> '],
        handler: BoxSelect.sendBrushMenuEvent,
        beforeRender: Charts.chartActionAllowed,
        sort: 30
      }, {
        label: 'Hide',
        eventType: BoxSelect.EventType.HIDE,
        tooltip: 'Hide items in this area',
        icons: ['<i class="fa fa-fw fa-eye-slash"></i> '],
        handler: BoxSelect.sendBrushMenuEvent,
        beforeRender: Charts.chartWindowInactive,
        sort: 40
      }, {
        label: 'Remove',
        eventType: BoxSelect.EventType.REMOVE,
        tooltip: 'Remove items in this area',
        icons: ['<i class="fa fa-fw fa-times"></i> '],
        handler: BoxSelect.sendBrushMenuEvent,
        beforeRender: Charts.chartActionAllowed,
        sort: 50
      }, {
        label: 'Reset Chart',
        eventType: BoxSelect.EventType.RESET_VIEW,
        tooltip: 'Reset the bounds of the chart to default',
        icons: ['<i class="fa fa-fw fa-undo"></i> '],
        handler: BoxSelect.sendBrushMenuEvent,
        beforeRender: Charts.chartActionAllowed,
        sort: 50
      }];

      const windowChildren = [{
        label: 'Create Window',
        eventType: BoxSelect.EventType.WINDOW_XY,
        tooltip: 'Filter on this area (hide all items outside of the area)',
        icons: ['<i class="fa fa-fw fa-filter"></i> '],
        handler: BoxSelect.sendBrushMenuEvent,
        beforeRender: Charts.chartActionAllowed,
        sort: 10
      }, {
        label: 'Window X Range',
        eventType: BoxSelect.EventType.WINDOW_X,
        tooltip: 'Filter on this horizontal axis range',
        icons: ['<i class="fa fa-fw fa-filter"></i> '],
        handler: BoxSelect.sendBrushMenuEvent,
        beforeRender: Charts.chartActionAllowed,
        sort: 20
      }, {
        label: 'Window Y Range',
        eventType: BoxSelect.EventType.WINDOW_Y,
        tooltip: 'Filter on this vertical axis range',
        icons: ['<i class="fa fa-fw fa-filter"></i> '],
        handler: BoxSelect.sendBrushMenuEvent,
        beforeRender: Charts.chartActionAllowed,
        sort: 30
      }];

      const zoomChildren = [{
        label: 'Zoom to Area',
        eventType: BoxSelect.EventType.ZOOM_XY,
        tooltip: 'Zoom to this area',
        icons: ['<i class="fa fa-fw fa-crop"></i> '],
        handler: BoxSelect.sendBrushMenuEvent,
        beforeRender: Charts.chartActionAllowed,
        shortcut: 'ctrl+drag',
        sort: 10
      }, {
        label: 'Zoom to X Range',
        eventType: BoxSelect.EventType.ZOOM_X,
        tooltip: 'Zoom to this horizontal axis range',
        icons: ['<i class="fa fa-fw fa-crop"></i> '],
        handler: BoxSelect.sendBrushMenuEvent,
        beforeRender: Charts.chartActionAllowed,
        sort: 20
      }, {
        label: 'Zoom to Y Range',
        eventType: BoxSelect.EventType.ZOOM_Y,
        tooltip: 'Zoom to this veritcal axis range',
        icons: ['<i class="fa fa-fw fa-crop"></i> '],
        handler: BoxSelect.sendBrushMenuEvent,
        beforeRender: Charts.chartActionAllowed,
        sort: 30
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

      mi.addChild({
        label: 'Filter',
        type: MenuItemType.GROUP,
        sort: 20,
        children: windowChildren,
        beforeRender: BoxSelect.isScatterPlot
      });

      mi.addChild({
        label: 'Zoom',
        type: MenuItemType.GROUP,
        sort: 30,
        children: zoomChildren,
        beforeRender: BoxSelect.isScatterPlot
      });

      BoxSelect.MENU = new Menu(mi);
    }
  }

  /**
   * Dispose the chart menu.
   */
  static dispose() {
    dispose(BoxSelect.MENU);
    BoxSelect.MENU = undefined;
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

  /**
   * Function dropped into MenuItem(s) in the BoxSelect menu
   *
   * @param {Model} model the menu context (chart model)
   * @this {MenuItem}
   */
  static isScatterPlot(model) {
    this.visible = BoxSelect.isScatterPlot_(model.id);
  }

  /**
   * Implementation of the function used for MenuItem(s)
   *
   * @param {string} contextId the menu context (chart id)
   * @return {boolean}
   * @protected
   */
  static isScatterPlot_(contextId) {
    let visible = false;
    const charts = Charts.getInstance();

    if (charts) {
      const chart = charts.getChart(contextId);
      visible = chart && (chart.type == ChartType.SCATTER);
    }
    return (visible === true);
  }
}


/**
 * Events fired by the chart menu.
 * @enum {string}
 */
BoxSelect.EventType = {
  SELECT: 'brush:select',
  SELECT_EXCLUSIVE: 'brush:selectexclusive',
  DESELECT: 'brush:deselect',
  HIDE: 'brush:hide',
  REMOVE: 'brush:remove',

  HOLD_XY: 'brush:holdxy',
  HOLD_X: 'brush:holdx',
  HOLD_Y: 'brush:holdy',

  WINDOW_XY: 'brush:windowxy',
  WINDOW_X: 'brush:windowx',
  WINDOW_Y: 'brush:windowy',

  ZOOM_XY: 'brush:holdxy',
  ZOOM_X: 'brush:holdx',
  ZOOM_Y: 'brush:holdy',

  RESET_VIEW: 'brush:reset'
};


/**
 * Menu for vega charts
 * @type {Menu|undefined}
 */
BoxSelect.MENU = undefined;
