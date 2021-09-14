goog.declareModuleId('coreui.chart.vega.line.LineSpecHandler');

import {SpecHandler} from '../base/spechandler.js';


/**
 * The spec for the Vega line chart.
 */
export class LineSpecHandler extends SpecHandler {
  /**
   * Constructor.
   * @param {Object=} opt_spec A full spec to use override the default
   */
  constructor(opt_spec) {
    super();

    this.spec = {
      'signals': [
        {
          'name': 'lineColor',
          'value': '#aaa'
        },
        {
          'name': 'areaColorsActive',
          'value': false
        },
        {
          'name': 'isChartRotated',
          'value': false
        },
        {
          'name': 'xLabelAngle',
          'value': -45
        },
        {
          'name': 'xLabelAlign',
          'value': 'right'
        },
        {
          'name': 'xDomain', // the array of domain keys for the chart
          'value': null
        },
        {
          'name': 'yLabelAngle',
          'value': 0
        },
        {
          'name': 'yLabelAlign',
          'value': 'right'
        }
      ],
      'data': [
        {
          'name': 'areaColors',
          'values': []
        }
      ],
      'scales': [
        {
          'name': 'xScale',
          'type': 'point',
          'range': {'signal': 'isChartRotated ? yRange : xRange'},
          'domain': {
            'signal': 'xDomain'
          }
        },
        {
          'name': 'yScale',
          'type': 'linear',
          'range': {'signal': 'isChartRotated ? xRange : yRange'},
          'nice': true,
          'zero': true,
          'domain': {
            'data': 'data',
            'field': 'count'
          }
        }
      ],
      'axes': [
        {
          'orient': 'bottom',
          'scale': 'xScale',
          'offset': 10,
          'labelAlign': {'signal': 'isChartRotated ? yLabelAlign : xLabelAlign'},
          'labelAngle': {'signal': 'isChartRotated ? yLabelAngle : xLabelAngle'},
          'labelOverlap': 'greedy',
          'tickExtra': false,
          'grid': true
        },
        {
          'orient': 'left',
          'scale': 'yScale',
          'offset': 10,
          'labelAlign': {'signal': 'isChartRotated ? xLabelAlign : yLabelAlign'},
          'labelAngle': {'signal': 'isChartRotated ? xLabelAngle : yLabelAngle'},
          'grid': true
        }
      ],
      'marks': [
        {
          'name': 'lineMarks',
          'type': 'line',
          'interactive': false,
          'from': {
            'data': 'data'
          },
          'encode': {
            'enter': {
              'x': {
                'scale': {'signal': 'isChartRotated ? "yScale" : "xScale"'},
                'field': {'signal': 'isChartRotated ? "count" : "label"'}
              },
              'y': {
                'scale': {'signal': 'isChartRotated ? "xScale" : "yScale"'},
                'field': {'signal': 'isChartRotated ? "label" : "count"'}
              },
              'stroke': {
                'signal': 'lineColor'
              },
              'strokeWidth': {
                'value': 2
              },
              'fillOpacity': {
                'value': 0.7
              },
              'interpolate': {
                'value': 'linear'
              },
              'zindex': {
                'value': 1
              }
            },
            'update': {
              'tooltip': {
                'field': 'tooltip'
              }
            }
          }
        },
        {
          'name': 'pointMarks',
          'type': 'symbol',
          'from': {
            'data': 'data'
          },
          'encode': {
            'enter': {
              'x': {
                'scale': {'signal': 'isChartRotated ? "yScale" : "xScale"'},
                'field': {'signal': 'isChartRotated ? "count" : "label"'}
              },
              'y': {
                'scale': {'signal': 'isChartRotated ? "xScale" : "yScale"'},
                'field': {'signal': 'isChartRotated ? "label" : "count"'}
              },
              'size': {
                'value': 150
              },
              'tooltip': {
                'field': 'tooltip'
              }
            },
            'update': {
              'fill': {'signal': 'datum.color'},
              'fillOpacity': [
                {'test': this.highlightSelectionCheck, 'value': .9},
                {'value': 0.7}
              ],
              'stroke': this.strokeSet,
              'strokeWidth': {'value': 1},
              'strokeOpacity': this.strokeOpacitySet,
              'strokeDash': this.strokeDashSetAlt,
              'tooltip': {'field': 'tooltip'},
              'zindex': this.zindexSet
            },
            'hover': this.hoverSet
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
