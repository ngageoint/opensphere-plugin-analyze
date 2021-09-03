/**
 * @fileoverview Externs for Vega.
 *
 * @externs
 */


/**
 * @type {Object}
 * @const
 */
var vega = {};


/**
 * Graph description
 * @constructor
 */
vega.DataFlow = function() {};


/**
 * @param {Object} spec parse spec
 * @param {Object=} opt_config parse config
 * @return {vega.DataFlow} dataflow graph description
 */
vega.parse;


/**
 * Provides component for rendering and visualization
 * @param {vega.DataFlow} spec the parsed specification
 * @constructor
 */
vega.View = function(spec) {};


/**
 * run the visualization
 * @return {vega.View}
 */
vega.View.prototype.run;


/**
 * add a callback after the run but before the promise
 * @param {function(vega.View)} handler function
 */
vega.View.prototype.runAfter;


/**
 * run the visualization, async
 * @return {goog.Promise}
 */
vega.View.prototype.runAsync;


/**
 * clean up the visualization for destruction (prevent memory leaks, etc.)
 */
vega.View.prototype.finalize;


/**
 * set up the visualization for display
 * @param container the DOM chart container
 * @return {vega.View}
 */
vega.View.prototype.initialize;


/**
 * add listener to the view
 * @param {string} input the event type selector
 * @param {function((goog.events.Event|string))} handler function
 * @return {vega.View}
 */
vega.View.prototype.addEventListener;


/**
 * remvoe listener from the view
 * @param {string} input the event type selector
 * @param {function((goog.events.Event|string))} handler function
 * @return {vega.View}
 */
vega.View.prototype.removeEventListener;


/**
 * add signal listener to the view
 * @param {string} input the signal name
 * @param {function((goog.events.Event|string), *)} handler function
 * @return {vega.View}
 */
vega.View.prototype.addSignalListener;


/**
 * remove signal listener from the view
 * @param {string} input the signal name
 * @param {function((goog.events.Event|string), *)} handler function
 * @return {vega.View}
 */
vega.View.prototype.removeSignalListener;


/**
 * Print vega information to the console
 * @param {string|number} level vega.None, .Warn, .Info, .Debug, .Error
 * @return {vega.View}
 */
vega.View.prototype.logLevel;


/**
 * @param {string} renderer svg or canvas or other custom ones
 * @return {vega.View}
 */
vega.View.prototype.renderer;


/**
 * @param {Object=} hoverSet
 * @param {Object=} updateSet
 * @return {vega.View}
 */
vega.View.prototype.hover;


/**
 * @param {string} color
 * @return {vega.View}
 */
vega.View.prototype.background;


/**
 * @param {string|number=} width px
 * @return {vega.View|number}
 */
vega.View.prototype.width;


/**
 * @param {string|number=} height px
 * @return {vega.View|number}
 */
vega.View.prototype.height;


/**
 * @param {Object} padding px {left: 5, bottom: 5}
 * @return {vega.View}
 */
vega.View.prototype.padding;


/**
 * Resize the chart on the next view
 * @return {vega.View}
 */
vega.View.prototype.resize;


/**
 * get the x, y origin for the graph
 * @return {Array}
 */
vega.View.prototype.origin;


/**
 * @param {Array=} toUpdate dirty items to update
 * @return {vega.View}
 */
vega.View.prototype.render;


/**
 * @param {Object} item report item as dirty
 * @return {vega.View}
 */
vega.View.prototype.dirty;


/**
 * @param {Object|string} key get the signal value
 * @param {*=} opt_value set the signal value
 * @return {Object|string|number|boolean|vega.View}
 */
vega.View.prototype.signal;


/**
 * get the state of the view
 * @return {Object}
 */
vega.View.prototype.getState;


/**
 * get the state of the view invokes view.run
 * @param {Object} state
 * @return {vega.View}
 */
vega.View.prototype.setState;


/**
 * An object to keep track of things to change in the vega view
 * @constructor
 */
vega.EventStream = function() {};


/**
 * @param {string} selector 'view', 'window', or css selector
 * @param {string} eventType e.g. 'mousedown'
 * @param {Function=} filter filter event objects
 * @return {vega.EventStream}
 */
vega.View.prototype.events;


/**
 * @param {Function} handler (width, height)
 * @return {vega.View}
 */
vega.View.prototype.addResizeListener;


/**
 * @param {Function} handler (width, height)
 * @return {vega.View}
 */
vega.View.prototype.removeResizeListener;


/**
 * @param {string} type 'svg', 'png', 'canvas'
 * @param {number=} scaleFactor
 * @return {Promise}
 */
vega.View.prototype.toImageURL;


/**
 * Get the container element
 * @return {Element}
 */
vega.View.prototype.container;


/**
 * An object to keep track of the scale
 * @constructor
 */
vega.Scale = function() {};


/**
 * Return scale bandwidth
 * @return {number}
 */
vega.Scale.prototype.bandwidth;


/**
 * Return scale bandwidth
 * @return {Array<number>}
 */
vega.Scale.prototype.range;


/**
 * Return scale bandwidth
 * @return {Array<*>}
 */
vega.Scale.prototype.domain;


/**
 * One of linear, pow, log, etc
 * @type {string}
 */
vega.Scale.prototype.type;


/**
 * Invert scale value
 * @param {*} value
 * @return {string|number}
 */
vega.Scale.prototype.invert;


/**
 * Invert scale value range
 * @param {Array<*>} range
 * @return {Array<string|number>}
 */
vega.Scale.prototype.invertRange;


/**
 * Returns the scale or projection with the given name
 * @param {string} name
 * @return {vega.Scale}
 */
vega.View.prototype.scale;


/**
 * Returns the data set with the given name
 * @param {string} name
 * @return {Array}
 */
vega.View.prototype.data;


/**
 * update the data with name in view, invoke run to apply
 * @param {string} name
 * @param {vega.ChangeSet} changeset
 * @return {Array}
 */
vega.View.prototype.change;


/**
 * An object to keep track of things to change in the vega view
 * @constructor
 */
vega.ChangeSet = function() {};


/**
 * create a changeset of new data to apply to the chart on the next vega pulse
 * @return {vega.ChangeSet}
 */
vega.changeset;


/**
 * insert data into the changeset for next render
 * @param {Array} data
 */
vega.ChangeSet.prototype.insert;


/**
 * remove data from the changeset for next render
 * @param {Array} data
 */
vega.ChangeSet.prototype.remove;


/**
 * get the quartiles for a given array
 * @param {Array} input
 * @param {Function=} accessor
 * @return {Array}
 */
vega.quartiles;


/**
 * registry function to add or access a scale function
 * @param {string} type
 * @param {Function=} scaleFunc to add to the registry
 * @return {Function|undefined} the contructor function for the scale
 */
vega.scale;


/**
 * registry function to add or access a color scheme function
 * @param {string} type
 * @param {Function=} schemeFunc to add to the registry
 * @return {Function|undefined} the contructor function for the scheme
 */
vega.scheme;


/**
 * registry function to add or access a color scheme function
 * @param {string} type
 * @param {Function=} schemeFunc to add to the registry
 * @return {Function|undefined} the contructor function for the scheme
 */
vega.expressionFunction;


/**
 * Keys are the transform names, values are the transform constructors
 * @type {Object}
 */
vega.transforms;
