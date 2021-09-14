goog.declareModuleId('mist.metrics.keys');

/**
 * Analyze metrics
 * @enum {string}
 */
export const Analyze = {
  OPEN: 'analyze.OPEN',
  SELECT_ALL: 'analyze.selectAll',
  DESELECT_ALL: 'analyze.deSelectAll',
  INVERT_SELECTION: 'analyze.contextMenu.invertSelection',
  REMOVE_SELECTED: 'analyze.contextMenu.removeSelected',
  REMOVE_UNSELECTED: 'analyze..contextMenu.removeUnSelected',
  ADD_CUSTOM_DATA: 'analyze.contextMenu.addCustomData',
  HIDE_SELECTED: 'analyze.contextMenu.hideSelected',
  HIDE_UNSELECTED: 'analyze.contextMenu.hideUnSelected',
  DISPLAY_ALL: 'analyze.contextMenu.displayAll',
  REACHBACK: 'analyze.contextMenu.reachback',

  // Widget menu
  WIDGET_COUNT_BY: 'analyze.widget.add.countBy',
  WIDGET_LIST: 'analyze.widget.add.list',
  WIDGET_CHART: 'analyze.widget.add.chart',
  WIDGET_VEGA: 'analyze.widget.add.vega',
  WIDGET_CLOSE_ALL: 'analyze.widget.closeAll',
  WIDGET_RESET: 'analyze.widget.reset',

  // CountBy
  COUNT_BY_SELECT_ALL: 'analyze.countBy.contextMenu.selectAll',
  COUNT_BY_DESELECT_ALL: 'analyze.countBy.contextMenu.deSelectAll',
  COUNT_BY_INVERT_SELECTION: 'analyze.countBy.contextMenu.invertSelection',
  COUNT_BY_SORT_SELECTED: 'analyze.countBy.contextMenu.sortSelected',
  COUNT_BY_COLOR_SELECTED: 'analyze.countBy.contextMenu.colorSelected',
  COUNT_BY_AUTO_COLOR: 'analyze.countBy.contextMenu.autoColor',
  COUNT_BY_RESET_COLOR: 'analyze.countBy.contextMenu.resetColor',
  COUNT_BY_CREATE_FILTER: 'analyze.countBy.contextMenu.createFilter',
  COUNT_BY_CASCADE_ALL: 'analyze.countBy.contextMenu.cascadeAll',
  COUNT_BY_RMOVE_CASCADE: 'analyze.countBy.contextMenu.removeCascade',
  COUNT_BY_CLEAR_CASCADE: 'analyze.countBy.contextMenu.clearCascade',
  COUNT_BY_REMOVE_SELECTED: 'analyze.countBy.contextMenu.removeSelected',
  COUNT_BY_REMOVE_UNSELECTED: 'analyze.countBy.contextMenu.removeUnSelected',
  COUNT_BY_TOGGLE_ROW_COUNT: 'analyze.countBy.contextMenu.toggleRowCount',
  COUNT_BY_GROUP_COLUMN: 'analyze.countBy.groupColumn',
  COUNT_BY_GROUP_TYPE: 'analyze.countBy.groupColumnType',
  COUNT_BY_COPY_ROWS: 'analyze.countBy.copyRows',

  // DedupeBy
  DEDUPE_BY_CANCEL: 'analyze.dedupeBy.cancel',
  DEDUPE_BY_RUN: 'analyze.dedupeBy.run',
  DEDUPE_BY_SAVE: 'analyze.dedupeBy.save',
  DEDUPE_BY_NAME_CHANGE: 'analyze.dedupeBy.nameChange',
  DEDUPE_BY_ADD_COLUMN: 'analyze.dedupeBy.addColumn',
  DEDUPE_BY_EDIT_COLUMN: 'analyze.dedupeBy.editColumn',
  DEDUPE_BY_REMOVE_COLUMN: 'analyze.dedupeBy.removeColumn',
  DEDUPE_BY_CREATE: 'analyze.dedupeBy.create',
  DEDUPE_BY_COPY: 'analyze.dedupeBy.copy',
  DEDUPE_BY_REMOVE: 'analyze.dedupeBy.remove',
  DEDUPE_BY_NON_COMPAT_CONFIG: 'analyze.dedupeBy.nonCompatConfig',

  // List
  LIST_SEARCH: 'analyze.list.search',
  LIST_SELECT_ALL: 'analyze.list.contextMenu.selectAll',
  LIST_DESELECT_ALL: 'analyze.list.contextMenu.deSelectAll',
  LIST_INVERT_SELECTION: 'analyze.list.contextMenu.invertSelection',
  LIST_SORT_SELECTED: 'analyze.list.contextMenu.sortSelected',
  LIST_COLOR_SELECTED: 'analyze.list.contextMenu.colorSelected',
  LIST_RESET_COLOR: 'analyze.list.contextMenu.resetColor',
  LIST_EXPORT: 'analyze.list.contextMenu.export',
  LIST_DEDUPE: 'analyze.list.contextMenu.dedupe',
  LIST_GOTO: 'analyze.list.contextMenu.goTo',
  LIST_COPY_ROWS: 'analyze.list.contextMenu.copyRows'
};
