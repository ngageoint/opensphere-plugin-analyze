goog.declareModuleId('coreui.chart.vega.interaction.ClickContextEventType');

/**
 * Events fired by the chart menu.
 * @enum {string}
 */
export default {
  SELECT_ALL: 'chartmenu:selectall',
  DESELECT_ALL: 'chartmenu:deselectall',
  INVERT_SELECTION: 'chartmenu:invertselection',
  ADD_CUSTOM_LABEL: 'chartmenu:addCustomLabel',
  HIDE_SELECTED: 'chartmenu:hideselected',
  HIDE_UNSELECTED: 'chartmenu:hideunselected',
  DISPLAY_ALL: 'chartmenu:displayall',
  RESET_VIEW: 'chartmenu:resetview',
  COLOR_SELECTED: 'chartmenu:colorselected',
  COLOR_SELECTED_BINS: 'chartmenu:colorselectedbins',
  AUTO_COLOR: 'chartmenu:autocolor',
  AUTO_COLOR_BY_COUNT: 'chartmenu:autocolorbycount',
  RESET_COLOR: 'chartmenu:resetcolor',
  REMOVE_SELECTED: 'chartmenu:removeselected',
  REMOVE_UNSELECTED: 'chartmenu:removeunselected',
  SORT_BY_LABEL: 'chartmenu:sortbylabel',
  SORT_BY_COUNT: 'chartmenu:sortbycount',
  COPY: 'chartmenu:copy',
  EXPORT: 'chartmenu:export'
};
