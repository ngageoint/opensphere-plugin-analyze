goog.declareModuleId('coreui.chart.vega.symlog.SymlogSpecHandler');

import {SpecHandler} from '../base/spechandler.js';


/**
 * The spec for the Vega symlog chart.
 */
export class SymlogSpecHandler extends SpecHandler {
  /**
   * Constructor.
   * @param {Object=} opt_spec A full spec to use override the default
   */
  constructor(opt_spec) {
    super();

    const bodyColor = $('body').css('color');

    this.spec = {
      'signals': [
        {
          'name': 'width',
          'value': '',
          'on': [
            {
              'events': {
                'source': 'window',
                'type': 'resize'
              },
              'update': 'containerSize()[0] * 0.95'
            }
          ]
        },
        {
          'name': 'height',
          'value': '',
          'on': [
            {
              'events': {
                'source': 'window',
                'type': 'resize'
              },
              'update': 'containerSize()[1] * 0.95'
            }
          ]
        },
        {
          'name': 'domainZero',
          'value': null
        },
        {
          'name': 'lineColor',
          'value': '#aaa'
        },
        {
          'name': 'strokeDash',
          'value': null
        },
        {
          'name': 'legendClicked',
          'value': null,
          'on': [
            {
              'events': '@legendSymbol:click, @legendLabel:click',
              'update': '{value: datum.value}',
              'force': true
            }
          ]
        },
        {
          'name': 'domain',
          'on': [
            {
              'events': {'signal': 'brush'},
              'update': 'invert(\'x\', brush)'
            }
          ]
        },
        {
          'name': 'brush',
          'value': 0
        }
      ],
      'data': [
        {
          'name': 'selected',
          'on': [
            {'trigger': 'legendClicked', 'toggle': 'legendClicked'}
          ]
        }
      ],
      'scales': [
        {
          'name': 'xScale',
          'type': 'utc',
          'range': {'signal': 'xRange'},
          'domain': {
            'data': 'data',
            'field': 'label',
            'sort': {'op': 'valid', 'field': 'key'}
          }
        },
        {
          'name': 'yScale',
          'type': 'symlog',
          'range': {'signal': 'yRange'},
          'nice': true,
          'zero': true,
          'domain': {
            'data': 'data',
            'field': 'count'
          },
          'domainMax': {'signal': 'domainZero'}
        },
        {
          'name': 'cScale',
          'type': 'ordinal',
          'range': {
            'data': 'data',
            'field': 'color'
          },
          'domain': {
            'data': 'data',
            'field': 'type'
          }
        }
      ],
      'axes': [
        {
          'orient': 'bottom',
          'scale': 'xScale',
          'offset': 10,
          'format': '%m/%d - %H:%MZ',
          'labelFlush': 6,
          'labelPadding': 2,
          'labelSeparation': 14,
          'labelOverlap': 'greedy',
          'labelFontSize': 12,
          'tickExtra': false,
          'grid': true
        },
        {
          'orient': 'left',
          'scale': 'yScale',
          'offset': 10,
          'grid': true,
          'labelOverlap': 'greedy',
          'labelFontSize': 12,
          'tickMinStep': 1
        }
      ],
      'legends': [
        {
          'fill': 'cScale',
          'labelColor': bodyColor,
          'symbolType': 'square',
          'symbolStrokeColor': bodyColor,
          'symbolSize': 125,
          'cornerRadius': 4,
          'title': 'Layers (Click to Toggle)',
          'titleColor': bodyColor,
          'titleFontSize': 12,
          'titlePadding': 8,
          'labelFontSize': 12,
          'padding': 15,
          'labelLimit': 400,
          'encode': {
            'legend': {
              'enter': {
                'stroke': {'value': bodyColor},
                'strokeWidth': {'value': 1.5},
                'size': {'value': 50}
              }
            },
            'symbols': {
              'name': 'legendSymbol',
              'interactive': true,
              'update': {
                'opacity': [
                  {'test': '!length(data(\'selected\')) || indata(\'selected\', \'value\', datum.value)', 'value': 1},
                  {'value': 0.25}
                ]
              }
            },
            'labels': {
              'name': 'legendLabel',
              'interactive': true,
              'update': {
                'opacity': [
                  {'test': '!length(data(\'selected\')) || indata(\'selected\', \'value\', datum.value)', 'value': 1},
                  {'value': 0.25}
                ]
              }
            }
          }
        }
      ],
      'marks': [
        {
          'type': 'group',
          'from': {
            'facet': {
              'name': 'series',
              'data': 'data',
              'groupby': 'type'
            }
          },
          'marks': [
            {
              'name': 'lineMarks',
              'type': 'line',
              'interactive': false,
              'from': {
                'data': 'series'
              },
              'encode': {
                'enter': {
                  'x': {
                    'scale': 'xScale',
                    'field': 'label'
                  },
                  'y': {
                    'scale': 'yScale',
                    'field': 'count'
                  },
                  'stroke': {
                    'field': 'color'
                  },
                  'strokeWidth': {
                    'value': 3
                  },
                  'fillOpacity': {
                    'value': 1
                  },
                  'interpolate': {
                    'value': 'monotone'
                  },
                  'zindex': {
                    'value': 0
                  }
                },
                'update': {
                  'tooltip': {
                    'field': 'tooltip'
                  },
                  'strokeDash': {
                    'signal': 'strokeDash'
                  },
                  'opacity': [
                    {'test': '(!domain || inrange(datum.type, domain)) && (!length(data ("selected")) || ' +
                        'indata("selected", "value", datum.type))', 'value': 0.9},
                    {'value': 0}
                  ],
                  'zindex': [
                    {'test': '(!domain || inrange(datum.type, domain)) && (!length(data ("selected")) || ' +
                        'indata("selected", "value", datum.type))', 'value': 1},
                    {'value': 0}
                  ]
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
                    'scale': 'xScale',
                    'field': 'label'
                  },
                  'y': {
                    'scale': 'yScale',
                    'field': 'count'
                  },
                  'fill': {
                    'field': 'color'
                  },
                  'size': {
                    'value': 100
                  },
                  'tooltip': {
                    'field': 'tooltip'
                  },
                  'zindex': {
                    'value': 0
                  }
                },
                'update': {
                  'fillOpacity': [
                    {'test': this.highlightSelectionCheck, 'value': .9},
                    {'value': 0.7}
                  ],
                  'stroke': [
                    {'test': this.highlightSelectionCheck, 'value': '#fff'},
                    {'field': 'color'}
                  ],
                  'size': [
                    {'test': this.highlightSelectionCheck, 'value': 150},
                    {'value': 110}
                  ],
                  'fill': [
                    {'test': this.highlightSelectionCheck, 'value': '#fd1532'},
                    {'field': 'color'}
                  ],
                  'opacity': [
                    {'test': '(!domain || inrange(datum.type, domain)) && (!length(data ("selected")) || ' +
                        'indata("selected", "value", datum.type))', 'value': 0.9},
                    {'value': 0}
                  ],
                  'zindex': [
                    {'test': '(!domain || inrange(datum.type, domain)) && (!length(data ("selected")) || ' +
                        'indata("selected", "value", datum.type))', 'value': 1},
                    {'value': 0}
                  ],
                  'strokeDash': this.strokeDashSetAlt,
                  'tooltip': {
                    'signal': 'datum.count + \' results for \' + datum.type'
                  }
                },
                'hover': {
                  'fillOpacity': [
                    {'test': this.highlightSelectionCheck, 'value': 0.9},
                    {'value': 0.7}
                  ],
                  'stroke': [
                    {'test': this.highlightSelectionCheck, 'value': '#fff'},
                    {'field': 'color'}
                  ],
                  'size': [
                    {'test': this.highlightSelectionCheck, 'value': 150},
                    {'value': 110}
                  ],
                  'fill': [
                    {'test': this.highlightSelectionCheck, 'value': '#fd1532'},
                    {'field': 'color'}
                  ]
                }
              }
            }
          ]
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
