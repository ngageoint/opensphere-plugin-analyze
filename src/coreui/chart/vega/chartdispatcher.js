goog.declareModuleId('coreui.chart.vega.ChartDispatcher');

const EventTarget = goog.require('goog.events.EventTarget');

/**
 * Global chart dispatcher, for events that need to be handled by all charts.
 * @type {EventTarget}
 */
export const ChartDispatcher = new EventTarget();
