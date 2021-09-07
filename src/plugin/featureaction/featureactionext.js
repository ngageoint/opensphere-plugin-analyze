goog.declareModuleId('plugin.im.action.feature.ext');

/**
 * Identifier for external import action plugin components.
 * @type {string}
 */
export const ID = 'featureactionsext';

/**
 * Events for the external feature actions plugin.
 * @enum {string}
 */
export const Metrics = {
  CREATE_FROM_COUNTBY: 'analyze.countBy.contextMenu.createFeatureAction'
};

/**
 * Events for the external feature actions plugin.
 * @enum {string}
 */
export const EventType = {
  CREATE_FROM_COUNTBY: 'featureAction:createFromCountBy'
};
