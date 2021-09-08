goog.declareModuleId('coreui.chart.vega.scatter.ScatterSpecHandler');

import {default as SpecHandler} from '../base/spechandler.js';


/**
 * The spec that will be used to partially overwrite the basic vega spec when a scatter chart is required
 */
class ScatterSpecHandler extends SpecHandler {
  /**
   * Constructor.
   * @param {Object=} opt_spec A full spec to use override the default
   */
  constructor(opt_spec) {
    super();

    this.spec = {
      'signals': [
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
          'name': 'yLabelAngle',
          'value': 0
        },
        {
          'name': 'yLabelAlign',
          'value': 'right'
        }
      ],
      'scales': [{
        'name': 'xScale',
        'type': 'linear',
        'range': {'signal': 'xRange'},
        'domain': {'signal': 'xExtent'},
        'zero': false
      }, {
        'name': 'yScale',
        'type': 'linear',
        'range': {'signal': 'yRange'},
        'domain': {'signal': 'yExtent'},
        'zero': false
      }, {
        'name': 'sizeScale',
        'type': 'linear',
        'range': [25, 20000],
        'domain': {'signal': '[1, totalCount]'},
        'zero': false
      }],
      'axes': [{
        'name': 'xAxis',
        'scale': 'xScale',
        'grid': true,
        'orient': 'bottom',
        'format': '~s',
        'labelAlign': {'signal': 'xLabelAlign'},
        'labelAngle': {'signal': 'xLabelAngle'},
        'title': {'signal': 'xField'}
      }, {
        'name': 'yAxis',
        'scale': 'yScale',
        'grid': true,
        'orient': 'left',
        'format': '~s',
        'labelAlign': {'signal': 'yLabelAlign'},
        'labelAngle': {'signal': 'yLabelAngle'},
        'title': {'signal': 'yField'}
      }],
      'marks': [
        // marks for basic symbols that appear in the chart
        {
          'type': 'symbol',
          'name': 'validMark',
          'from': {'data': 'valid'},
          'zindex': 1,
          'encode': {
            'enter': {
              'size': {'scale': 'sizeScale', 'signal': 'datum.count'},
              'tooltip': {'field': 'tooltip'},
              'x': {'scale': 'xScale', 'signal': 'datum[xField]'},
              'y': {'scale': 'yScale', 'signal': 'datum[yField]'},
              'zindex': this.zindexSet
            },
            'update': {
              'fill': [
                {'field': 'color'}
              ],
              'fillOpacity': [
                {'test': this.highlightSelectionCheck, 'value': 0.7},
                {'value': 0.5}
              ],
              'stroke': this.strokeSet,
              'strokeOpacity': this.strokeOpacitySet,
              'strokeWidth': {'value': 1},
              'strokeDash': this.strokeDashSetAlt
            },
            'hover': this.hoverSet
          }
        },
        // marks for the gutters where one coordinate is outside the bounds, starting at bottom left and moving clockwise
        {
          'type': 'symbol',
          'name': 'lowXlowYMark',
          'from': {'data': 'lowXlowY'},
          'zindex': 2,
          'encode': {
            'enter': {
              'size': {'scale': 'sizeScale', 'signal': 'datum.count/4'},
              'tooltip': {'field': 'tooltip'},
              'zindex': this.zindexSet
            },
            'update': {
              'x': {'signal': 'gutter * 3/4'},
              'y': {'signal': 'oldHeight - gutter * 3/4'},
              'fill': [
                {'signal': 'mutedColor'}
              ],
              'fillOpacity': [
                {'test': this.highlightSelectionCheck, 'value': 0.7},
                {'value': 0.2}
              ],
              'stroke': this.strokeSetAlt,
              'strokeOpacity': this.strokeOpacitySet,
              'strokeWidth': {'value': 1},
              'strokeDash': this.strokeDashSetAlt
            },
            'hover': this.hoverSet
          }
        }, {
          'type': 'symbol',
          'name': 'lowXMark',
          'from': {'data': 'lowX'},
          'zindex': 2,
          'encode': {
            'enter': {
              'size': {'scale': 'sizeScale', 'signal': 'datum.count/4'},
              'tooltip': {'field': 'tooltip'},
              'zindex': this.zindexSet
            },
            'update': {
              'x': {'signal': 'gutter * 3/4'},
              'y': {'scale': 'yScale', 'signal': 'datum[yField]'},
              'fill': [
                {'signal': 'mutedColor'}
              ],
              'fillOpacity': [
                {'test': this.highlightSelectionCheck, 'value': 0.7},
                {'value': 0.2}
              ],
              'stroke': this.strokeSetAlt,
              'strokeOpacity': this.strokeOpacitySet,
              'strokeWidth': {'value': 1},
              'strokeDash': this.strokeDashSetAlt
            },
            'hover': this.hoverSet
          }
        }, {
          'type': 'symbol',
          'name': 'lowXhighYMark',
          'from': {'data': 'lowXhighY'},
          'zindex': 2,
          'encode': {
            'enter': {
              'size': {'scale': 'sizeScale', 'signal': 'datum.count/4'},
              'tooltip': {'field': 'tooltip'},
              'zindex': this.zindexSet
            },
            'update': {
              'x': {'signal': 'gutter * 3/4'},
              'y': {'signal': 'gutter * 1/4'},
              'fill': [
                {'signal': 'mutedColor'}
              ],
              'fillOpacity': [
                {'test': this.highlightSelectionCheck, 'value': 0.7},
                {'value': 0.2}
              ],
              'stroke': this.strokeSetAlt,
              'strokeOpacity': this.strokeOpacitySet,
              'strokeWidth': {'value': 1},
              'strokeDash': this.strokeDashSetAlt
            },
            'hover': this.hoverSet
          }
        }, {
          'type': 'symbol',
          'name': 'highYMark',
          'from': {'data': 'highY'},
          'zindex': 2,
          'encode': {
            'enter': {
              'size': {'scale': 'sizeScale', 'signal': 'datum.count/4'},
              'tooltip': {'field': 'tooltip'},
              'zindex': this.zindexSet
            },
            'update': {
              'x': {'scale': 'xScale', 'signal': 'datum[xField]'},
              'y': {'signal': 'gutter * 1/4'},
              'fill': [
                {'signal': 'mutedColor'}
              ],
              'fillOpacity': [
                {'test': this.highlightSelectionCheck, 'value': 0.7},
                {'value': 0.2}
              ],
              'stroke': this.strokeSetAlt,
              'strokeOpacity': this.strokeOpacitySet,
              'strokeWidth': {'value': 1},
              'strokeDash': this.strokeDashSetAlt
            },
            'hover': this.hoverSet
          }
        }, {
          'type': 'symbol',
          'name': 'highXhighYMark',
          'from': {'data': 'highXhighY'},
          'zindex': 2,
          'encode': {
            'enter': {
              'size': {'scale': 'sizeScale', 'signal': 'datum.count/4'},
              'tooltip': {'field': 'tooltip'},
              'zindex': this.zindexSet
            },
            'update': {
              'x': {'signal': 'oldWidth - gutter * 1/4'},
              'y': {'signal': 'gutter * 1/4'},
              'fill': [
                {'signal': 'mutedColor'}
              ],
              'fillOpacity': [
                {'test': this.highlightSelectionCheck, 'value': 0.7},
                {'value': 0.2}
              ],
              'stroke': this.strokeSetAlt,
              'strokeOpacity': this.strokeOpacitySet,
              'strokeWidth': {'value': 1},
              'strokeDash': this.strokeDashSetAlt
            },
            'hover': this.hoverSet
          }
        }, {
          'type': 'symbol',
          'name': 'highXMark',
          'from': {'data': 'highX'},
          'zindex': 2,
          'encode': {
            'enter': {
              'size': {'scale': 'sizeScale', 'signal': 'datum.count/4'},
              'tooltip': {'field': 'tooltip'},
              'zindex': this.zindexSet
            },
            'update': {
              'x': {'signal': 'oldWidth - gutter * 1/4'},
              'y': {'scale': 'yScale', 'signal': 'datum[yField]'},
              'fill': [
                {'signal': 'mutedColor'}
              ],
              'fillOpacity': [
                {'test': this.highlightSelectionCheck, 'value': 0.7},
                {'value': 0.2}
              ],
              'stroke': this.strokeSetAlt,
              'strokeOpacity': this.strokeOpacitySet,
              'strokeWidth': {'value': 1},
              'strokeDash': this.strokeDashSetAlt
            },
            'hover': this.hoverSet
          }
        }, {
          'type': 'symbol',
          'name': 'highXlowYMark',
          'from': {'data': 'highXlowY'},
          'zindex': 2,
          'encode': {
            'enter': {
              'size': {'scale': 'sizeScale', 'signal': 'datum.count/4'},
              'tooltip': {'field': 'tooltip'},
              'zindex': this.zindexSet
            },
            'update': {
              'x': {'signal': 'oldWidth - gutter * 1/4'},
              'y': {'signal': 'oldHeight - gutter * 3/4'},
              'fill': [
                {'signal': 'mutedColor'}
              ],
              'fillOpacity': [
                {'test': this.highlightSelectionCheck, 'value': 0.7},
                {'value': 0.2}
              ],
              'stroke': this.strokeSetAlt,
              'strokeOpacity': this.strokeOpacitySet,
              'strokeWidth': {'value': 1},
              'strokeDash': this.strokeDashSetAlt
            },
            'hover': this.hoverSet
          }
        }, {
          'type': 'symbol',
          'name': 'lowYMark',
          'from': {'data': 'lowY'},
          'zindex': 2,
          'encode': {
            'enter': {
              'size': {'scale': 'sizeScale', 'signal': 'datum.count/4'},
              'tooltip': {'field': 'tooltip'},
              'zindex': this.zindexSet
            },
            'update': {
              'x': {'scale': 'xScale', 'signal': 'datum[xField]'},
              'y': {'signal': 'oldHeight - gutter * 3/4'},
              'fill': [
                {'signal': 'mutedColor'}
              ],
              'fillOpacity': [
                {'test': this.highlightSelectionCheck, 'value': 0.7},
                {'value': 0.2}
              ],
              'stroke': this.strokeSetAlt,
              'strokeOpacity': this.strokeOpacitySet,
              'strokeWidth': {'value': 1},
              'strokeDash': this.strokeDashSetAlt
            },
            'hover': this.hoverSet
          }
        }]
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
    const datumID = '(datum.count ? (\'Count\: \' + datum.count) : \'\') + ';
    const datumXField = ' + xField + \': \' + (xField != \'TIME\' ? datum[xField]: ' +
        'utcFormat(datum[xField], "%Y-%m-%d %H:%M:%SZ")) + ';
    const datumYField = ' + yField + \': \' + (yField != \'TIME\' ? datum[yField] : ' +
        'utcFormat(datum[yField], "%Y-%m-%d %H:%M:%SZ"))';

    return datumID + '\'\\n\'' + datumXField + '\'\\n\'' + datumYField;
  }
}

export default ScatterSpecHandler;
