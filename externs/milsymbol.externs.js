/**
 * @fileoverview Externs for Milsymbol.
 *
 * @externs
 */


/**
 * @type {Object}
 * @const
 */
var ms = {};


/**
 * @param {string} type render type
 * @param {Object} styles Render style
 * @constructor
 */
ms.Symbol = function(type, styles) {};


/**
 * @function
 * @return {HTMLCanvasElement}
 */
ms.Symbol.prototype.asCanvas;

/**
 * @function
 * @return {string}
 */
ms.Symbol.prototype.toDataURL;
