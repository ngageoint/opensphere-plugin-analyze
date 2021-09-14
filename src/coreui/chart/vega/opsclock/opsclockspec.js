goog.declareModuleId('coreui.chart.vega.opsclock.OpsclockSpecHandler');

import {SpecHandler} from '../base/spechandler.js';


/**
 * The spec that will be used to partially overwrite the basic vega spec when a opsclock chart is required
 */
export class OpsclockSpecHandler extends SpecHandler {
  /**
   * Constructor.
   * @param {Object=} opt_spec A full spec to use override the default
   */
  constructor(opt_spec) {
    // register the color scheme
    vega.scheme('opsclockcolors', OpsclockSpecHandler.colorInterpolator);

    super();
    this.spec = {
      'data': [
        {
          'name': 'hours',
          'value': []
        },
        {
          'name': 'days',
          'value': []
        }
      ],
      'signals': [
        {
          'name': 'rings',
          'value': 17
        },
        {
          'name': 'innerRadius',
          'value': 6,
          'update': 'smallDim && rings ? smallDim / rings : 6'
        },
        {
          'name': 'domMid',
          'value': 0
        },
        {
          'name': 'dateType',
          'signal': 'none'
        }
      ],
      'scales': [
        {
          'name': 'xScale',
          'type': 'linear',
          'domain': {
            'data': 'data',
            'field': 'count'
          },
          'domainMin': 0,
          'range': {
            'scheme': 'opsclockcolors'
          }
        },
        {
          'name': 'yScale',
          'type': 'linear',
          'domain': {
            'data': 'data',
            'field': 'count'
          },
          'domainMin': 0,
          'range': {
            'scheme': 'opsclockcolors'
          }
        }
      ],
      'legends': [
        {
          'fill': 'yScale',
          'orient': 'bottom-right',
          'padding': 2,
          'strokeColor': '#aaa',
          'labelColor': '#aaa',
          'labelFontSize': 12,
          'gradientThickness': 12,
          'gradientLength': {'signal': 'oldHeight / 3 < 100 ? 100 : oldHeight / 3'},
          'tickCount': 3
        }
      ],
      'marks': [
        // marks for basic symbols that appear in the chart
        {
          'name': 'opsclockarcmark',
          'type': 'arc',
          'from': {
            'data': 'data'
          },
          'encode': {
            'enter': {
              'x': {
                'signal': 'oldWidth / 2'
              },
              'y': {
                'signal': 'oldHeight / 2'
              },
              'tooltip': {'field': 'tooltip'},
              'startAngle': {
                'signal': '((datum.key % 24) * PI / 12)'
              },
              'endAngle': {
                'signal': '((datum.key % 24) * (PI / 12) + (PI / 12))'
              },
              'innerRadius': {
                'signal': 'innerRadius + (innerRadius * floor(datum.key / 24))'
              },
              'outerRadius': {
                'signal': 'innerRadius + innerRadius + (innerRadius * floor(datum.key / 24))'
              }
            },
            'update': {
              'fill': [
                {
                  'scale': 'yScale',
                  'field': 'count'
                }],
              'fillOpacity': [
                {'test': this.highlightSelectionCheck, 'value': .9},
                {'value': 0.7}],
              'stroke': this.strokeSetWhite,
              'strokeWidth': this.strokeWidthSet,
              'strokeOpacity': this.strokeOpacitySet,
              'strokeDash': this.strokeDashSet,
              'zindex': this.zindexSet
            },
            'hover': this.hoverSet
          }
        }, {
          'name': 'opsclockTextMarkHours',
          'type': 'text',
          'interactive': false,
          'from': {'data': 'hours'},
          'zindex': 1,
          'encode': {
            'enter': {
              'x': {
                'signal': 'oldWidth / 2'
              },
              'y': {
                'signal': 'oldHeight / 2'
              }
            },
            'update': {
              'radius': {
                'signal': '20 + (innerRadius * 2) + (innerRadius * floor(datum.key / 24))'
              },
              'theta': {
                'signal': '((datum.key % 24) * (PI / 12))'
              },
              'text': {
                'signal': 'length(toString(datum.key % 24)) == 1 ? "0" + datum.key % 24 : datum.key % 24'
              },
              'align': {'value': 'center'},
              'baseline': {'value': 'middle'},
              'zindex': this.zindexSetFront
            }
          }
        }, {
          'name': 'opsclockTextMarkDays',
          'type': 'text',
          'interactive': false,
          'from': {'data': 'days'},
          'zindex': 1,
          'encode': {
            'enter': {
              'x': {
                'signal': 'oldWidth / 2'
              },
              'y': {
                'signal': 'oldHeight / 2'
              }
            },
            'update': {
              'radius': {
                'signal': '(innerRadius * 1.5) + (innerRadius * floor(datum.key / 24))'
              },
              'theta': 0,
              'text': {
                'signal': 'dateType == "month" ? floor(datum.key / 24) : dayAbbrevFormat(floor(datum.key / 24))'
              },
              'align': {'value': 'center'},
              'baseline': {'value': 'middle'},
              'zindex': this.zindexSetFront
            }
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
    const datumID = '"Count: " + datum.count + (dateType == "day" ? "" : "\\nDay: " + (dateType == "week" ? ' +
        'dayFormat(floor(datum.key / 24)) : 1 + floor(datum.key / 24))) + "\\nHour: " + (datum.key % 24)';
    return datumID;
  }

  /**
   * An opsclock based colorInterpolator
   * Maps from [0, 1] to a hex color
   * @param {number} value
   * @return {string}
   */
  static colorInterpolator(value) {
    if (!(Array.isArray(OpsclockSpecHandler.colors) &&
        OpsclockSpecHandler.colors.length == 6)) {
      // something wrong with the colors, default to greyscale
      const c = Math.max(0, Math.min(255, Math.round(255 * value)));
      return 'rgb(' + c + ', ' + c + ', ' + c + ')';
    }

    if (value <= 0) {
      return OpsclockSpecHandler.colors[0];
    } else if (value <= 0.4) {
      return OpsclockSpecHandler.colors[1];
    } else if (value <= 0.7) {
      return OpsclockSpecHandler.colors[2];
    } else if (value <= 0.9) {
      return OpsclockSpecHandler.colors[3];
    } else if (value < 1) {
      return OpsclockSpecHandler.colors[4];
    } else {
      return OpsclockSpecHandler.colors[5];
    }
  }
}


/**
 * An array of six colors for the opsclock colorInterpolator (bottom, 40, 70, 90, 100, top)
 * @type {Array<string>}
 */
OpsclockSpecHandler.colors = ['#111111', '#1122ee', '#22eeee', '#22ee22', '#eeaa11',
  '#ee1111'];
