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
