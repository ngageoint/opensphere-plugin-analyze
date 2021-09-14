goog.declareModuleId('coreui.chart.vega.interaction.WindowBrush');

import {EventType} from '../base/eventtype.js';
import {AbstractInteraction} from './abstractinteraction.js';

import {ChartDispatcher} from 'opensphere-plugin-analyze/src/coreui/chart/vega/chartdispatcher.js';

const {Model} = goog.requireType('coreui.chart.vega.data.Model');


/**
 */
export class WindowBrush extends AbstractInteraction {
  /**
   * Constructor.
   * @param {Model} model
   */
  constructor(model) {
    super(model);
    /**
     * @type {Object}
     * @protected
     */
    this.spec = {
      'signals': [
        {
          // when this is updated the window runs on the model
          'name': this.id,
          'value': [[0, 0], [0, 0]], // 2 x 2 array of arrays [scale adjusted start point, end point]
          'on': [
            {
              'events':
              {
                'signal': `${this.id}end`
              },
              'update':
  `${this.id}start
    && (${this.id}start[0] || ${this.id}start[1])
    && ${this.id}end
    && (${this.id}end[0] || ${this.id}end[1])
    ? [slice(${this.id}start), slice(${this.id}end)]
    : ${this.id}`
            },
            {
              'events':
              {
                // if the "global" signal here is updated with something valid:
                // run those coordinates against the scales and update the window brush
                'signal': 'windowBrush'
              },
              'update':
  `windowBrush
    && windowBrush[0]
    && (windowBrush[0][0] || windowBrush[0][1])
    && windowBrush[1]
    && (windowBrush[1][0] || windowBrush[1][1])
    ? [[scale("xScale", windowBrush[0][0]), scale("yScale", windowBrush[1][1])],
      [scale("xScale", windowBrush[0][1]), scale("yScale", windowBrush[1][0])]]
    : [[1, 1], [1, 1]]`
            },
            {
              'events':
              {
                // if the chart size was manually changed, the window needs to be updated
                'signal': 'resizeChart'
              },
              'update': `windowActive ? "resize" : ${this.id}`,
              'force': true,
              'debounce': 100
            },
            {
              'events': {
                // if one or both of the extents changed; kick off callback() even if the windowBrush didn't change
                'signal': `${this.id}extents`
              },
              'update': this.id,
              'force': true,
              'debounce': 100
            }
          ]
        }, {
          'name': `${this.id}extents`,
          'value': false,
          'on': [
            {
              'events':
              {
                // if the chart extent(s) change (e.g. pan, zoom, data column): run the window again
                'signal': 'xExtent'
              },
              'update': 'true',
              'force': true,
              'debounce': 100
            },
            {
              'events':
              {
                'signal': 'yExtent'
              },
              'update': 'true',
              'force': true,
              'debounce': 100
            }
          ]
        }, {
          // keep track of the dimensions so the window can't grow or shrink
          'name': `${this.id}dimensions`,
          'value': [0, 0],
          'on': [
            {
              'events': {
                'signal': this.id
              },
              'update':
  `${this.id} && ${this.id}[0] && ${this.id}[1]
    ? [clamp(${this.id}[1][0] - ${this.id}[0][0], 0, oldWidth - 1),
      clamp(${this.id}[1][1] - ${this.id}[0][1], 0, oldHeight - 1)]
    : ${this.id}dimensions`
            },
            {
              // if the size of the chart changes, try to keep the window inside
              'events': {
                'signal': 'oldWidth'
              },
              'update':
  `[
    clamp(${this.id}dimensions[0], 0, oldWidth - 1),
    clamp(${this.id}dimensions[1], 0, oldHeight - 1)
  ]`
            },
            {
              'events': {
                'signal': 'oldHeight'
              },
              'update':
  `[
    clamp(${this.id}dimensions[0], 0, oldWidth - 1),
    clamp(${this.id}dimensions[1], 0, oldHeight - 1)
  ]`
            }
          ]
        }, {
          // if the window is clicked on get the relative position of the mouse and allow it to be moved,
          // maintain that same relative mouse position as the window is moved
          'name': `${this.id}windowDown`,
          'value': [0, 0],
          'on': [
            {
              'events': `@${this.id}brushMark:mousedown[event.button === 0 && !event.shiftKey]`,
              'update': 'windowActive ? xy() : [0, 0]'
            }, {
              'events': '*:mousedown[event.button === 0 && !event.shiftKey]',
              'update':
  `windowActive
    && (${this.id}start[0] <= x() && x() <= ${this.id}end[0])
    && (${this.id}start[1] <= y() && y() <= ${this.id}end[1])
    ? xy()
    : [0, 0]`
            }, {
              'events':
              {
                'signal': `${this.id}relative`
              },
              'update':
  `${this.id}relative
    ? [${this.id}windowDown[0] + ${this.id}relative[0], ${this.id}windowDown[1] + ${this.id}relative[1]]
    : ${this.id}windowDown`
            }, {
              'events': 'window:mouseup',
              'update': '[0, 0]'
            }, {
              'events': 'window:keyup[event.key == "Shift"]',
              'update': '[0, 0]'
            }
          ]
        }, {
          // if using keys to move the window, increase the movement over time
          'name': `${this.id}accelerate`,
          'value': 2,
          'on': [
            {
              'events': 'window:keydown[event.shiftKey && (event.key == "ArrowRight" || event.key == "ArrowLeft" || ' +
              'event.key == "ArrowUp" || event.key == "ArrowDown")]',
              'update': `event.repeat ? ${this.id}accelerate + 1 : 2`,
              'force': true
            }
          ]
        }, {
          // get the change in movement so it can be applied to the window
          'name': `${this.id}relative`,
          'value': [0, 0],
          'on': [
            {
              // moved by mouse
              'events': 'mousemove',
              'filters': [
                'event.button === 0',
                '!event.shiftKey'
              ],
              'between': [
                {'type': `@${this.id}brushMark:mousedown`},
                {'type': 'mouseup'}
              ],
              'update':
  `${this.id}windowDown && (${this.id}windowDown[0] || ${this.id}windowDown[1])
    ? [x() - ${this.id}windowDown[0], y() - ${this.id}windowDown[1]]
    : [0, 0]`
            },
            {
              // moved by shift + arrow keys
              'events': 'window:keydown[event.shiftKey && event.key == "ArrowRight"]',
              'update': `[${this.id}accelerate + ${this.id}accelerate, 0]`,
              'force': true
            },
            {
              'events': 'window:keydown[event.shiftKey && event.key == "ArrowLeft"]',
              'update': `[-(${this.id}accelerate + ${this.id}accelerate), 0]`,
              'force': true
            },
            {
              'events': 'window:keydown[event.shiftKey && event.key == "ArrowDown"]',
              'update': `[0, ${this.id}accelerate + ${this.id}accelerate]`,
              'force': true
            },
            {
              'events': 'window:keydown[event.shiftKey && event.key == "ArrowUp"]',
              'update': `[0, -(${this.id}accelerate + ${this.id}accelerate)]`,
              'force': true
            }
          ]
        }, {
          // lowest x and y point for the window
          'name': `${this.id}start`,
          'value': [0, 0],
          'on': [
            {
              'events':
              {
                'signal': `${this.id}relative`
              },
              'update':
  `windowActive && ${this.id}start && ${this.id}dimensions && ${this.id}relative
    ? [
      (isValid(clamp(${this.id}start[0] + ${this.id}relative[0], 0, oldWidth - ${this.id}dimensions[0]))
        ? clamp(${this.id}start[0] + ${this.id}relative[0], 0, oldWidth - ${this.id}dimensions[0])
        : ${this.id}start[0]),
      (isValid(clamp(${this.id}start[1] + ${this.id}relative[1], 0, oldHeight - ${this.id}dimensions[1]))
        ? clamp(${this.id}start[1] + ${this.id}relative[1], 0, oldHeight - ${this.id}dimensions[1])
        : ${this.id}start[1])
      ]
    : ${this.id}start`
            },
            {
              'events':
              {
                'signal': 'windowBrush'
              },
              'update':
  `windowBrush
    ? [
      (isValid(min(scale("xScale", windowBrush[0][0]), scale("xScale", windowBrush[0][1])))
        ? min(scale("xScale", windowBrush[0][0]), scale("xScale", windowBrush[0][1]))
        : ${this.id}[0][0]),
      (isValid(min(scale("yScale", windowBrush[1][0]), scale("yScale", windowBrush[1][1])))
        ? min(scale("yScale", windowBrush[1][0]), scale("yScale", windowBrush[1][1]))
        : ${this.id}[1][0])
      ]
    : [0, 0]`
            }
          ]
        }, {
          // highest x and y point for the window
          'name': `${this.id}end`,
          'value': [0, 0],
          'on': [
            {
              'events':
              {
                'signal': `${this.id}relative`
              },
              'update':
  `windowActive && ${this.id}end && ${this.id}dimensions && ${this.id}relative
    ? [
      (isValid(clamp(${this.id}end[0] + ${this.id}relative[0], ${this.id}dimensions[0], oldWidth))
        ? clamp(${this.id}end[0] + ${this.id}relative[0], ${this.id}dimensions[0], oldWidth)
        : ${this.id}end[0]),
      (isValid(clamp(${this.id}end[1] + ${this.id}relative[1], ${this.id}dimensions[1], oldHeight))
        ? clamp(${this.id}end[1] + ${this.id}relative[1], ${this.id}dimensions[1], oldHeight)
        : ${this.id}end[1])
      ]
    : ${this.id}end`
            },
            {
              'events':
              {
                'signal': 'windowBrush'
              },
              'update':
  `windowBrush
    ? [
      (isValid(max(scale("xScale", windowBrush[0][0]), scale("xScale", windowBrush[0][1])))
        ? max(scale("xScale", windowBrush[0][0]), scale("xScale", windowBrush[0][1]))
        : ${this.id}[0][1]),
      (isValid(max(scale("yScale", windowBrush[1][0]), scale("yScale", windowBrush[1][1])))
        ? max(scale("yScale", windowBrush[1][0]), scale("yScale", windowBrush[1][1]))
        : ${this.id}[1][1])
      ]
    : [0, 0]`
            }
          ]
        }
      ],
      'marks': [{
        'name': `${this.id}brushMark`,
        'type': 'rect',
        'zindex': 0,
        'encode': {
          'enter': {
            'fill': {
              'value': '#006699' // (same color as window on timeline)
            },
            'stroke': {
              'value': '#006699' // (same color as window on timeline)
            },
            'zindex': {
              'value': '1'
            }
          },
          'update': {
            'fillOpacity': {
              'signal': 'windowActive ? 0.1 : 0'
            },
            'strokeWidth': {
              'signal': 'windowActive ? 4 : 0'
            },
            'opacity': {
              'signal': 'windowActive ? 1 : 0'
            },
            'x': {
              'signal': `${this.id}start && ${this.id}start[0] ? ${this.id}start[0] : ${this.id}[0][0]`
            },
            'x2': {
              'signal': `${this.id}end && ${this.id}end[0] ? ${this.id}end[0] : ${this.id}[1][0]`
            },
            'y': {
              'signal': `${this.id}start && ${this.id}start[1] ? ${this.id}start[1] : ${this.id}[0][1]`
            },
            'y2': {
              'signal': `${this.id}end && ${this.id}end[1] ? ${this.id}end[1] : ${this.id}[1][1]`
            }
          }
        }
      }]
    };

    /**
     * The data under the window
     * @type {Array<ol.Feature>}
     * @protected
     */
    this.data = null;
  }

  /**
   * The callback function for the interaction
   * @inheritDoc
   */
  disposeInternal() {
    if (this.model) {
      this.model.deactivateWindow();
    }

    ChartDispatcher.unlisten(EventType.WINDOWACTIVE, this.deactivateWindow, false, this);

    super.disposeInternal();
  }

  /**
   * Add an additional listener for the window movement
   * @inheritDoc
   */
  addListener(view) {
    super.addListener(view);

    ChartDispatcher.listen(EventType.WINDOWACTIVE, this.deactivateWindow, false, this);
  }

  /**
   * Listen for window activation
   * Get rid of the window if deactivated
   * @param {coreui.chart.vega.base.Event} event
   */
  deactivateWindow(event) {
    if (this.model && this.view) {
      const id = event.getId();
      const config = event.getConfig();

      if (id === this.model.id) {
        this.view.signal('windowActive', config['active']);
        if (!config['active']) {
          this.view.signal(this.id, [[0, 0], [0, 0]]);
        }
      } else {
        this.view.signal(this.id, [[0, 0], [0, 0]]);
        this.view.signal(`${this.id}start`, [0, 0]);
        this.view.signal(`${this.id}end`, [0, 0]);
      }
    }
  }

  /**
   * The callback function for the interaction
   * @inheritDoc
   */
  callback(name, value) {
    if (this.model && !this.model.isDisposed() && this.view) {
      if (Array.isArray(value) && Array.isArray(value[0]) && Array.isArray(value[1]) && value[0][0] != value[0][1] &&
          value[1][0] != value[1][1]) {
        // calculate the bins
        if (this.model.isMultiDimensional && this.view.signal('windowActive')) {
          const invertedX = this.translateRange([value[0][0], value[1][0]], this.scaleNames[0]);
          const invertedY = this.translateRange([value[0][1], value[1][1]], this.scaleNames[1]);
          const extents = (this.view.signal(`${this.id}extents`) === true);
          if (extents) {
            this.view.signal(`${this.id}extents`, false); // signal that the extent change was processed
          }

          // use conditional assignment to avoid grabbing the signal if it's not needed
          const priorInverted = !extents || this.view.signal('oldWindowBrush');

          const prior = this.view.signal('oldWindowBrushValue');

          if (
            !prior ||
            // the window moved
            prior[0][0] != value[0][0] || prior[0][1] != value[0][1] ||
            prior[1][0] != value[1][0] || prior[1][1] != value[1][1] ||
            // the extent(s) moved; use "extents" as a flag to prevent string comparison if not needed
            (extents && !this.equals_(priorInverted[0][0], invertedX[0])) ||
            (extents && !this.equals_(priorInverted[1][0], invertedY[0]))
          ) {
            // keep the numeric value for fast number comparisons
            this.view.signal('oldWindowBrushValue', value);

            // save this in case we need to recreate it (e.g. on resize of chart container)
            // must be a 2x2 array to be compatible with all the signals dependent on windowBrush
            this.view.signal('oldWindowBrush', [
              [invertedX[0], invertedX[invertedX.length - 1]],
              [invertedY[0], invertedY[invertedY.length - 1]]
            ]);

            // run those bins on the model
            this.model.runWindowDebounce.fire(this.id, [invertedX, invertedY]);
          }
        }
      } else if (value === 'resize') {
        // the chart was resized and window will need to update
        const interaction = this;
        const prior = this.view.signal('oldWindowBrush');
        const id = this.id;

        // disable window so redraw works without shift to make space for badly-sized window
        this.view.signal(id, [[0, 0], [0, 0]]);
        this.view.signal(`${this.id}start`, [0, 0]);
        this.view.signal(`${this.id}end`, [0, 0]);

        // finish resizing, then...
        this.view.runAfter(function(view) {
          if (view) {
            // calculate the window's xy coordinates in the new system
            const coords = [[
              interaction.toCoord(prior[0][0], 'xScale'),
              interaction.toCoord(prior[1][0], 'yScale')
            ], [
              interaction.toCoord(prior[0][1], 'xScale'),
              interaction.toCoord(prior[1][1], 'yScale')
            ]];

            // re-apply the windowBrush by axis values
            view.signal('windowBrush', prior);

            // set up the coordinate system values for the next callback()
            view.signal('oldWindowBrushValue', coords);
            view.signal(`${id}start`, coords[0]);
            view.signal(`${id}end`, coords[1]);
            view.signal(id, coords);
          }
        });
      }
    }
  }

  /**
   * Compares two bin values from one of; Unique (string), Numeric, or Date axes
   * @param {number|Date|string|null|undefined} v1
   * @param {number|Date|string|null|undefined} v2
   * @return {boolean} true if equal
   * @private
   */
  equals_(v1, v2) {
    if (v1 instanceof Date && v2 instanceof Date) {
      return (v2.getTime() - v1.getTime()) == 0;
    }
    return (v2 == v1);
  }
}
