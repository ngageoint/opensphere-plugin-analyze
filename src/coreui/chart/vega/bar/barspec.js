goog.declareModuleId('coreui.chart.vega.bar.BarSpecHandler');

import {default as SpecHandler} from '../base/spechandler';


/**
 * The spec for the Vega bar chart.
 */
class BarSpecHandler extends SpecHandler {
  /**
   * Constructor.
   * @param {Object=} opt_spec A full spec to use override the default
   */
  constructor(opt_spec) {
    super();

    this.spec = {
      'signals': [{
        'name': 'barColorsActive',
        'values': false
      }, {
        'name': 'isChartRotated',
        'value': false
      }, {
        'name': 'xLabelAngle',
        'value': -45
      }, {
        'name': 'xLabelAlign',
        'value': 'right'
      }, {
        'name': 'xDomain', // the array of domain keys for the chart
        'value': null
      }, {
        'name': 'yLabelAngle',
        'value': 0
      }, {
        'name': 'yLabelAlign',
        'value': 'right'
      }],
      'data': [{
        'name': 'barColors',
        'values': []
      }],
      'scales': [
        {
          'name': 'xScale',
          'type': 'band',
          'range': {'signal': 'isChartRotated ? yRange : xRange'},
          'padding': 0.1,
          'domain': {'signal': 'xDomain'}
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
          'labelAlign': {'signal': 'isChartRotated ? yLabelAlign : xLabelAlign'},
          'labelAngle': {'signal': 'isChartRotated ? yLabelAngle : xLabelAngle'},
          'labelOverlap': 'greedy',
          'bandPosition': 1,
          'tickExtra': false,
          'grid': true
        },
        {
          'orient': 'left',
          'scale': 'yScale',
          'labelAlign': {'signal': 'isChartRotated ? xLabelAlign : yLabelAlign'},
          'labelAngle': {'signal': 'isChartRotated ? xLabelAngle : yLabelAngle'},
          'labelOverlap': 'greedy',
          'grid': true
        }
      ],
      'marks': [
        {
          'name': 'barmarks',
          'type': 'rect',
          'from': {
            'data': 'data'
          },
          'encode': {
            'enter': {
              'x': {
                'signal':
                  'isChartRotated ? scale("yScale", 0) : ' +
                  'scale("xScale", datum.label) + 2'
              },
              'x2': {
                'signal':
                  'isChartRotated ? scale("yScale", datum.count) : ' +
                  'scale("xScale", datum.label) + bandwidth("xScale") - 2'
              },
              'y': {
                'signal':
                  'isChartRotated ? scale("xScale", datum.label) + 2 : ' +
                  'scale("yScale", 0)'
              },
              'y2': {
                'signal':
                  'isChartRotated ? scale("xScale", datum.label) + bandwidth("xScale") - 2 : ' +
                  'scale("yScale", datum.count)'
              }
            },
            'update': {
              'fill': {'signal': 'barColorsActive ? "white" : datum.color'},
              'fillOpacity': [
                {'test': this.highlightSelectionCheck, 'value': .9},
                {'signal': 'barColorsActive ? 0 : 0.7'}
              ],
              'stroke': this.strokeSet,
              'strokeWidth': {'value': 2},
              'strokeOpacity': this.strokeOpacitySet,
              'strokeDash': this.strokeDashSet,
              'tooltip': {'field': 'tooltip'},
              'zindex': this.zindexSet
            },
            'hover': this.hoverSet
          }
        }, {
          'name': 'barColorMarks',
          'type': 'rect',
          'interactive': false,
          'from': {
            'data': 'barColors'
          },
          'encode': {
            'update': {
              'x': {
                'signal':
                  'isChartRotated ? scale("yScale", datum.val0) : ' +
                  'scale("xScale", datum.key) + 2'
              },
              'x2': {
                'signal':
                  'isChartRotated ? scale("yScale", datum.val1) : ' +
                  'scale("xScale", datum.key) + bandwidth("xScale") - 2'
              },
              'y': {
                'signal':
                  'isChartRotated ? scale("xScale", datum.key) + 2 : ' +
                  'scale("yScale", datum.val0)'
              },
              'y2': {
                'signal':
                  'isChartRotated ? scale("xScale", datum.key) + bandwidth("xScale") - 2 : ' +
                  'scale("yScale", datum.val1)'
              },
              'fill': {'field': 'color'},
              'fillOpacity': {'value': .7},
              'zindex': this.zindexSetFront
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

export default BarSpecHandler;
