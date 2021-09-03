goog.declareModuleId('coreui.chart.vega.base.EventType');

/**
 * Track the following
 * Event types are appended to the id of the chart
 * @enum {string}
 */
const EventType = {
  CHANGE_TYPE: 'vega:changeType',
  MODELCHANGE: 'modelchange',
  OPTIONS: 'vegaoptions',
  OPTIONS_OPEN: 'vegaoptionsopen',
  RESETVIEW: 'vegaresetview',
  SOFTRESETVIEW: 'vegasoftresetview',
  UPDATESCOPE: 'updatescope',
  WINDOWACTIVE: 'chart:windowactive'
};

export default EventType;
