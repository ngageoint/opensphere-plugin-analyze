goog.declareModuleId('coreui.chart.vega.base.SpecHandler');

import {Utils} from '../utils.js';


/**
 * The vega spec is the JSON object that defines all of the values for the visualization
 */
export class SpecHandler {
  /**
   * Constructor.
   * @param {Object=} opt_obj A spec that should be created, will check the keys and override only those keys
   */
  constructor(opt_obj) {
    /**
     * Vega spec object
     * @type {Object}
     * @protected
     */
    this.spec = null;

    /**
     * @type {jQuery|string}
     */
    this.color = $('body').css('color');

    /**
     * @type {string}
     * @protected
     */
    this.highlightSelectionCheck = 'datum.highlight || datum.sel';

    /**
     * @type {string}
     * @protected
     */
    this.partialSelectCheck = 'datum.sel != true && !datum.sel && datum.sel != false';

    /**
     * @type {Array<Object<string, *>>}
     * @protected
     */
    this.strokeSet = [
      {'test': this.highlightSelectionCheck, 'value': 'white'},
      {'test': this.partialSelectCheck, 'value': 'white'},
      {'signal': 'datum.color'}
    ];

    /**
     * @type {Array<Object<string, *>>}
     * @protected
     */
    this.strokeSetAlt = [
      {'test': this.highlightSelectionCheck, 'value': 'white'},
      {'test': this.partialSelectCheck, 'value': 'white'},
      {'signal': 'mutedColor'}
    ];

    /**
     * @type {Array<Object<string, *>>}
     * @protected
     */
    this.strokeSetWhite = [
      // almost white
      {'value': '#eee'}
    ];

    /**
     * @type {Array<Object<string, *>>}
     * @protected
     */
    this.strokeOpacitySet = [
      {'test': this.highlightSelectionCheck, 'value': 0.9},
      {'test': this.partialSelectCheck, 'value': 0.7},
      {'value': 0.5}
    ];

    /**
     * @type {Array<Object<string, *>>}
     * @protected
     */
    this.strokeWidthSet = [
      {'test': this.highlightSelectionCheck, 'value': 3},
      {'test': this.partialSelectCheck, 'value': 2},
      {'value': 1}
    ];

    /**
     * @type {Array<Object<string, *>>}
     * @protected
     */
    this.strokeDashSet = [
      {'test': this.highlightSelectionCheck, 'value': [0]},
      {'test': this.partialSelectCheck, 'value': [10, 4]},
      {'value': [0]}
    ];

    /**
     * @type {Array<Object<string, *>>}
     * @protected
     */
    this.strokeDashSetAlt = [
      {'test': this.highlightSelectionCheck, 'value': [0]},
      {'test': this.partialSelectCheck, 'value': [3]},
      {'value': [0]}
    ];

    /**
     * @type {Array<Object<string, *>>}
     * @protected
     */
    this.zindexSet = [
      {'test': this.highlightSelectionCheck, 'value': 'maxCount - datum.count + 2'},
      {'test': this.partialSelectCheck, 'value': 'maxCount - datum.count - 1'},
      {'signal': 'maxCount - datum.count'}
    ];

    /**
     * @type {Array<Object<string, *>>}
     * @protected
     */
    this.zindexSetFront = [
      {'test': this.highlightSelectionCheck, 'value': 'maxCount * 2 + 2'},
      {'test': this.partialSelectCheck, 'value': 'maxCount * 2 + 1'},
      {'signal': 'maxCount * 2'}
    ];

    /**
     * @type {Object<string, *>}
     * @protected
     */
    this.hoverSet = {
      'fillOpacity': {
        'value': 0.9
      },
      'stroke': {
        'value': 'white'
      },
      'strokeDash': {
        'value': [0]
      },
      'zindex': this.zindexSetFront
    };

    /**
     * Vega spec keys //
     * @type {Array}
     * @protected
     */
    this.specKeys = [
      '$schema', // {URL} URL for Vega schema
      'description', // {string} text desc of the viz
      'background', // {Color} background color for the entire view
      'width', // {number} width of the data rect
      'height', // {number} height of data rect
      'padding', // {number|Object} padding in px to add around the viz {left: 5, top: 5 ...}
      'autosize', // {string} set how size should be determined default: pad
      'config', // {Config} default style settings for marks, legends, etc.
      'signals', // {Signal[]} dynamic variables for the viz
      'data', // {Data[]} data set definitions
      'scales', // {Scale[]} scales map data values to viz values (pixels, color, etc)
      'projections', // {Projection[]} map projections
      'axes', // {Axis[]} viz for the scales
      'legends', // {Legend[]}
      'title', // {Title} title text
      'marks', // {Mark[]} graph marks (lines, symbols, rects, etc.)
      'encode' // {Encode} properties for the top level group mark (e.g. the chart's data rect)
    ];

    /**
     * The vega chart mark tooltip
     * @type {string}
     */
    this.tooltipExpr = this.createTooltipExpr();

    /**
     * The basic spec for all charts
     * Individual charts will override with their own specs
     * Marks will supplied by the chart's spec
     * @type {Object}
     */
    this.defaultSpec = {
      'padding': 0,
      // fit is dangerous but necessary if we want the charts to stay within the container
      // must be careful when tying signals to a constantly changing height and width
      'autosize': {'type': 'fit'},
      'signals': [{
        'name': 'selectController', // the interaction with this id is working the selection
        'value': null
      }, {
        'name': 'resizeChart', // a signal to trigger internal chart resize changes to window, scale ranges, etc.
        'value': '0'
      }, {
        'name': 'oldWidth', // width changes all the time, use this metered signal for downstream signal changes
        'value': '100',
        'update': 'width && (resizeChart || abs((width - oldWidth) / width) > .01) ? width : oldWidth'
      }, {
        'name': 'oldHeight', // height changes all the time, use this metered signal for downstream signal changes
        'value': '100',
        'update': 'height && (resizeChart || abs((height - oldHeight) / height) > .01) ? height : oldHeight'
      }, {
        'name': 'smallDim', // the smaller of either height or width
        'value': '1',
        'update': 'oldHeight && oldWidth ? min(oldHeight, oldWidth) : smallDim'
      }, {
        'name': 'baseFontSize', // adjust the font size to the chart view oldHeight
        'value': '12',
        'update': 'oldHeight ? max(floor(oldHeight/50), 10) : 12'
      }, {
        'name': 'isChartRotated', // the chart axes are flipped
        'value': null
      }, {
        'name': 'xField', // the dimension the chart is displaying (e.g. TIME or LON)
        'value': null
      }, {
        'name': 'xExtent', // the lower and upper bounds of the currently displayed values on xField
        'value': null
      }, {
        'name': 'xRange', // the range of pixels to plot the scale onto
        'value': [0, 100],
        'update': 'oldWidth ? [gutter, oldWidth - gutter] : xRange'
      }, {
        'name': 'xStep', // the step between values on certain scale types
        'value': null
      }, {
        'name': 'yField',
        'value': null
      }, {
        'name': 'yExtent',
        'value': null
      }, {
        'name': 'yRange',
        'value': [100, 0],
        'update': 'oldHeight ? [oldHeight - gutter, gutter] : yRange'
      }, {
        'name': 'yStep',
        'value': null
      }, {
        'name': 'totalCount', // total count of items for tooltip percentages
        'value': 1
      }, {
        'name': 'maxCount', // used the calculate z order
        'value': 200000
      }, {
        'name': 'gutter', // certain chart types can display items in a gutter if they are outside the current extent
        'value': 0
      }, {
        'name': 'colorsArray', // the colors for auto-colored charts
        'value': []
      }, {
        'name': 'foldsArray', // the colors vs values for auto-colored charts
        'value': []
      }, {
        'name': 'windowActive', // track if the window is active or not
        'value': false
      }, {
        'name': 'windowBrush', // the window [start[x, y], end[x, y]]
        'value': null
      }, {
        'name': 'oldWindowBrush', // temp storage of old window brush so it can be recreated on chart resize
        'value': null
      }, {
        'name': 'oldWindowBrushValue', // temp storage of old window brush numerics so prev/next can be compared quickly
        'value': null
      }, {
        'name': 'defaultColor',
        'value': '#aaa'
      }, {
        'name': 'mutedColor',
        'value': '#aaa'
      }],
      'data': [{
        'name': 'data', // all data
        'values': [],
        'transform': [
          {
            'type': 'formula',
            'expr': this.tooltipExpr,
            'as': 'tooltip'
          },
          {
            'type': 'extent',
            'field': 'count',
            'signal': 'countExtent'
          }]
      }, {
        'name': 'valid', // data that will be plotted
        'values': []
      }, {
        'name': 'invalid', // data that cannot be plotted
        'values': []
      }],
      'scales': [],
      'marks': [],
      'axes': [],
      'legends': [],
      'title': {
        'text': {'signal': 'yField ? xField + " / " + yField : xField'},
        'fontSize': {'signal': 'baseFontSize ? baseFontSize * 1.5 : 0'}
      }
    };
  }

  /**
   * Setup the spec, called by child classes
   * @param {Object=} opt_obj A spec that should be created, will check the names of vega items and override
   * @protected
   */
  init(opt_obj) {
    if (opt_obj != null) {
      this.applyOverride(opt_obj);
    } else {
      this.spec = Object.assign({}, this.defaultSpec);
    }
  }

  /**
   * Get the spec
   * @return {Object}
   */
  getSpec() {
    return this.spec;
  }

  /**
   * @param {Object} obj
   */
  applyOverride(obj) {
    const spec = Object.assign({}, this.defaultSpec);
    if (obj != null) {
      for (const key in obj) {
        for (let j = 0; j < obj[key].length; j++) {
          const item = obj[key][j];
          item['name'] = item['name'] || item['scale'] || '';
          Utils.updateSpec(spec, key, item['name'], item);
        }
      }
    }

    this.spec = spec;
  }

  /**
   * Create the tooltip expression used in for the tooltip datum field.
   * @return {string} the tooltip expression
   */
  createTooltipExpr() {
    return '';
  }
}
