goog.declareModuleId('tools.ui.nav');

/**
 * Class for the left nav list.
 * @enum {string}
 */
export const Location = {
  LEFT: 'js-tools-nav-left',
  RIGHT: 'js-tools-nav-right'
};

/**
 * Events for the tools nav bar.
 * @enum {string}
 */
export const Event = {
  SOURCE: 'toolsNav:source',
  NEXT_SOURCE: 'toolsNav:nextSource',
  PREV_SOURCE: 'toolsNav:prevSource',
  ADD_TAB: 'toolsNav:addTab',
  REMOVE_TAB: 'toolsNav.removeTab',
  SET_TAB: 'toolsNav.setTab'
};
