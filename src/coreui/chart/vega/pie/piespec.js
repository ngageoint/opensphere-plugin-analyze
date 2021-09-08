goog.declareModuleId('coreui.chart.vega.pie.PieSpecHandler');

import {SpecHandler} from '../base/spechandler.js';


/**
 * The spec for the Vega pie chart.
 */
export class PieSpecHandler extends SpecHandler {
  /**
   * Constructor.
   * @param {Object=} opt_spec A full spec to use override the default
   */
  constructor(opt_spec) {
    super();

    this.spec = {
      'signals': [
        {
          // use the smaller dimension of either height or width to calculate a good arc threshold
          // for whether of not to display labels
          'name': 'labelThreshold',
          'value': 0.1,
          'update': 'PI / (smallDim / 6)'
        },
        {
          // if the multi color slices are active
          'name': 'pieColorsActive',
          'value': false
        }
      ],
      'data': [
        {
          'name': 'piedata',
          'values': [],
          'transform': [
            {
              'type': 'pie',
              'field': 'count',
              'startAngle': Math.PI / 2,
              'endAngle': 5 * Math.PI / 2
            },
            {
              'type': 'formula',
              'expr': this.tooltipExpr,
              'as': 'tooltip'
            }
          ]
        },
        {
          'name': 'pieColors',
          'values': [],
          'transform': [
            {
              'type': 'lookup',
              'from': 'piedata',
              'key': 'label',
              'fields': ['key'],
              'as': ['origSlice']
            }
          ]
        }
      ],
      'scales': [
        {
          'name': 'xScale',
          'type': 'linear',
          'range': {'signal': 'xRange'},
          'domain': [0, 1]
        },
        {
          'name': 'yScale',
          'type': 'linear',
          'range': {'signal': 'yRange'},
          'domain': [0, 1]
        }
      ],
      'marks': [
        {
          'name': 'piemarks',
          'type': 'arc',
          'from': {
            'data': 'piedata'
          },
          'encode': {
            'update': {
              'x': {
                'signal': 'oldWidth / 2'
              },
              'y': {
                'signal': 'oldHeight / 2'
              },
              'fill': [
                {'signal': 'pieColorsActive ? "white" : datum.color'}
              ],
              'fillOpacity': [
                {'test': this.highlightSelectionCheck, 'value': .9},
                {'signal': 'pieColorsActive ? 0 : 0.7'}
              ],
              'stroke': this.strokeSet,
              'strokeWidth': this.strokeWidthSet,
              'strokeOpacity': this.strokeOpacitySet,
              'strokeDash': this.strokeDashSet,
              'startAngle': {
                'field': 'startAngle'
              },
              'endAngle': {
                'field': 'endAngle'
              },
              'outerRadius': {
                'signal': 'smallDim / 2'
              },
              'tooltip': {
                'field': 'tooltip'
              },
              'zindex': this.zindexSet
            },
            'hover': this.hoverSet
          }
        },
        {
          'name': 'pieColorMarks',
          'type': 'arc',
          'from': {
            'data': 'pieColors'
          },
          'interactive': false,
          'encode': {
            'update': {
              'x': {
                'signal': 'oldWidth / 2'
              },
              'y': {
                'signal': 'oldHeight / 2'
              },
              'fill': [
                {'field': 'color'}
              ],
              'fillOpacity': [
                {'value': .8}
              ],
              'startAngle': {
                'field': 'origSlice.startAngle'
              },
              'endAngle': {
                'field': 'origSlice.endAngle'
              },
              'innerRadius': {
                'signal': '(datum.val0 * smallDim / 2) / datum.total'
              },
              'outerRadius': {
                'signal': '(datum.val1 * smallDim / 2) / datum.total'
              },
              'zindex': this.zindexSetFront
            }
          }
        },
        {
          'name': 'pietext',
          'type': 'text',
          'from': {
            'data': 'piedata'
          },
          'zindex': 1,
          'encode': {
            'update': {
              'text': {
                'signal': '(datum.endAngle - datum.startAngle) > labelThreshold ? datum.label : ""'
              },
              'x': {
                'signal': 'oldWidth / 2'
              },
              'y': {
                'signal': 'oldHeight / 2'
              },
              'radius': {
                'signal': '(smallDim / 2) + 2 * baseFontSize'
              },
              'theta': {
                'signal': '(datum.startAngle + datum.endAngle) / 2'
              },
              'angle': {
                'signal': '(datum.startAngle + datum.endAngle) * PI / 360'
              },
              'align': {
                // This gross expression is the result of the start/endAngle transformation we perform.
                // The wedges in the bottom right quandrant visually are not between 0 and PI/2 as you'd expect, they
                // are between PI/2 and PI. The top right quadrant are between 2PI and 5PI/2.
                'signal': `((datum.startAngle + datum.endAngle) / 2 < PI) ||
                           ((datum.startAngle + datum.endAngle) / 2 > 2 * PI) ? "left" : "right"`
              },
              'limit': {
                'value': '200'
              },
              'fill': {
                'value': 'white'
              },
              'fontSize': {
                'signal': 'baseFontSize'
              },
              'baseline': {
                'value': 'middle'
              }
            }
          }
        }
      ]
    };

    this.init(this.spec);

    if (opt_spec) {
      this.applyOverride(opt_spec);
    }
  }

  /**
   * @inheritDoc
   */
  createTooltipExpr() {
    const field = 'xField + \': \' + datum.label + \'\\n\' + ';
    const count = '\'Count: \' + datum.count + \' (\' + format(datum.count / totalCount, \'.0%\') + \')\'';
    return field + count;
  }
}
