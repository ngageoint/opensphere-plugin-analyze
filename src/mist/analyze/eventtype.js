goog.declareModuleId('mist.analyze.EventType');

import EventType from 'opensphere/src/os/action/eventtype.js';


/**
 * @enum {string}
 */
export const AnalyzeEventType = {
  // tools
  ADDCOLUMN: 'addColumn',

  // layer
  HIDE_ANALYZE: 'layer:hideAnalyze',
  SHOW_ANALYZE: 'layer:showAnalyze',

  // dedupe
  DEDUPE: 'dedupe',

  // count by
  CASCADE_ALL: 'cascadeAll',
  REMOVE_CASCADE: 'removeCascade',
  CLEAR_CASCADE: 'clearCascade',
  CREATE_FILTER: 'createFilter',
  COPY_ROWS: 'copyRows',

  // columns
  TOGGLE_ROW: 'toggleRow',

  // charts
  SORT_BY_LABEL: 'sortByLabel',
  SORT_BY_COUNT: 'sortByCount',

  TOOLS_INTERNAL: 'toolsInternal',
  TOOLS_EXTERNAL: 'toolsExternal',

  // deprecated event types (moved to OpenSphere)
  INVERT: EventType.INVERT,
  HIDE_SELECTED: EventType.HIDE_SELECTED,
  HIDE_UNSELECTED: EventType.HIDE_UNSELECTED,
  DISPLAY_ALL: EventType.DISPLAY_ALL,
  REMOVE_UNSELECTED: EventType.REMOVE_UNSELECTED,
  SORTSELECTED: EventType.SORT_SELECTED
};
