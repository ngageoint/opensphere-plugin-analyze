/**
 * @fileoverview Closure compiler externs for bits-internal. Defines types that need to be left uncompiled so
 * Angular can reference them.
 *
 * @externs
 */


/**
 * Namespace.
 * @type {Object}
 */
var bitsx = {};


/**
 * Namespace.
 * @type {Object}
 */
bitsx.chart = {};


/**
 * Namespace.
 * @type {Object}
 */
bitsx.mini = {};


/**
 * Namespace.
 * @type {Object}
 */
bitsx.vega = {};


/**
 * @typedef {{
 *   id: string,
 *   priority: (number|undefined),
 *   types: !Array<string>,
 *   title: string,
 *   icon: string,
 *   ui: string,
 *   optionsUi: (string|undefined),
 *   modelFn: (Function|undefined),
 *   metricKey: string,
 *   supportsColors: (boolean|undefined),
 *   supportsColorModel: (boolean|undefined)
 * }}
 */
bitsx.chart.ChartOptions;


/**
 * @typedef {{
 *   min: number,
 *   max: number,
 *   mean: number,
 *   median: number,
 *   stddev: number
 * }}
 */
bitsx.chart.ChartStats;


/**
 * @typedef {{
 *   column: os.data.ColumnDefinition,
 *   columns: Array<!os.data.ColumnDefinition>,
 *   config: !Object,
 *   method: os.histo.IBinMethod,
 *   methods: !Object<string, !function(new: os.histo.IBinMethod)>,
 *   methodType: ?string,
 *   model: !Object,
 *   select: !Array<string>,
 * }}
 */
bitsx.chart.ChartControllerOptions;


/**
 * @typedef {{
 *   model: !Object,
 *   title: ?string,
 *   chartType: ?string,
 *   config: ?Object,
 *   selection: ?Array<string>
 * }}
 */
bitsx.chart.Options;


/**
 * @typedef {{
 *   file: (Array<string>|undefined),
 *   wms: (Array<string>|undefined),
 *   datepicker: (boolean|undefined),
 *   draw: (boolean|undefined),
 *   dragdrop: (boolean|undefined),
 *   height: (number|undefined)
 * }}
 */
bitsx.mini.MapConfig;


/**
 * @typedef {{
 *   date: string
 * }}
 */
bitsx.vega.WatchboxDataDefinition;


/**
 * // type - metrickey //
 * Typically configured once per chart type and not edited on the fly; used by VegaOptions directive and controller
 * for business logic and showing/hiding UI elements
 *
 * // signals - dataStats //
 * User-configurable; often with defaults.
 *
 * @typedef {{
 *   type: string,
 *   title: string,
 *   icon: string,
 *   priority: (number|undefined),
 *   primaryMethodTypeImmutable: (boolean|undefined),
 *   hidePrimary: (boolean|undefined),
 *   hidePrimaryType: (boolean|undefined),
 *   hidePrimaryBin: (boolean|undefined),
 *   secondaryMethodTypeImmutable: (boolean|undefined),
 *   hideSecondary: (boolean|undefined),
 *   hideSecondaryType: (boolean|undefined),
 *   hideSecondaryBin: (boolean|undefined),
 *   showReset: (boolean|undefined),
 *   metricKey: string,
 *
 *   signals: (Object<string, *>|undefined),
 *   primary: (os.data.ColumnDefinition|bitsx.vega.WatchboxDataDefinition|undefined),
 *   primaryMethodType: (string|undefined),
 *   primaryMethod: (os.histo.IBinMethod|undefined),
 *   secondary: (os.data.ColumnDefinition|undefined),
 *   secondaryMethodType: (string|undefined),
 *   secondaryMethod: (os.histo.IBinMethod|undefined),
 *   binStats: (Object<string, boolean>|undefined),
 *   dataStats: (Object<string, boolean>|undefined)
 * }}
 */
bitsx.vega.Options;
