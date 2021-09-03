goog.module('plugin.im.action.feature.ext');


/**
 * Identifier for external import action plugin components.
 * @type {string}
 */
const ID = 'featureactionsext';

/**
 * Events for the external feature actions plugin.
 * @enum {string}
 */
const Metrics = {
  CREATE_FROM_COUNTBY: 'analyze.countBy.contextMenu.createFeatureAction'
};

/**
 * Events for the external feature actions plugin.
 * @enum {string}
 */
const EventType = {
  CREATE_FROM_COUNTBY: 'featureAction:createFromCountBy'
};

exports = {
  ID,
  Metrics,
  EventType
};
