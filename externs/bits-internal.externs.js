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
 * Namespace.
 * @type {Object}
 */
bitsx.vega = {};

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
 *   primary: (os.data.ColumnDefinition|undefined),
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
