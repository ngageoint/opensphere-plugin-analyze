goog.module('coreui.layout');
goog.module.declareLegacyNamespace();


/**
 * Golden Layout events.
 * @enum {string}
 */
const GoldenLayoutEvent = {
  DRAG: 'drag',
  DRAG_START: 'dragStart',
  DRAG_STOP: 'dragStop',
  STATE_CHANGED: 'stateChanged'
};

/**
 * Internal layout events.
 * @enum {string}
 */
const LayoutEvent = {
  DRAGGING: 'layout:dragging',
  REMOVE_ALL: 'layout:removeAll',
  RESET: 'layout:reset',
  TOGGLE_PANEL: 'layout:togglePanel'
};

/**
 * The active component id.
 * @type {string|undefined}
 * @private
 */
let activeComponentId_ = undefined;

/**
 * Sets the global variable for the active component id.
 * @param {string|undefined} id The component id.
 */
const setActiveComponentId = function(id) {
  activeComponentId_ = id;
};

/**
 * Check if a component id is active.
 * @param {string|undefined} id The id of the component we are checking.
 * @return {boolean} True when the id matches (i.e. is active).
 */
const isActiveComponent = function(id) {
  return !!id && id === activeComponentId_;
};

/**
 * Minimize a Golden Layout node and all of its children.
 * @param {GoldenLayout.ContentItem} node The node.
 */
const minimizeAll = function(node) {
  if (node) {
    if (node.isMaximised) {
      node.toggleMaximise();
    }

    if (node.contentItems && node.contentItems.length) {
      node.contentItems.forEach(function(item) {
        minimizeAll(item);
      });
    }
  }
};

/**
 * Clean up potential errors in the Golden Layout config.
 * @param {!Object} config The config.
 */
const cleanConfig = function(config) {
  if (Array.isArray(config['content'])) {
    if (config['content'].length > 1) {
      // we have encountered cases where the base level content array has multiple elements in it, which causes
      // Golden Layout to blow up, so reset the length of the array to 1 if that case comes up
      config['content'].length = 1;
    }

    config['content'].forEach(cleanContentItem);
  }
};

/**
 * Clean up potential errors in the Golden Layout config.
 * @param {!Object} contentItem The config.
 */
const cleanContentItem = function(contentItem) {
  if (contentItem['activeItemIndex']) {
    //
    // Golden Layout has a bug the will break initialization if the active tab index in a stack is beyond the number
    // of items in the stack. this happens when a tab has two items, the second is closed, and the active tab isn't
    // set prior to refresh. this function fixes the config for that scenario.
    //
    if (!contentItem['content'] || contentItem['activeItemIndex'] >= contentItem['content'].length) {
      contentItem['activeItemIndex'] = 0;
    }
  }

  if (Array.isArray(contentItem['content'])) {
    contentItem['content'].forEach(cleanContentItem);
  }
};

/**
 * This function prevents allowing tabs in golden layout (issue #228)
 * @param {number} x
 * @param {number} y
 * @this {GoldenLayout.ContentItem}
 */
const disallowTabsDropZone = function(x, y) {
  for (var segment in this['_contentAreaDimensions']) {
    var area = this['_contentAreaDimensions'][segment]['hoverArea'];
    if (area['x1'] < x && area['x2'] > x && area['y1'] < y && area['y2'] > y) {
      if (segment !== 'header') {
        this['_resetHeaderDropZone']();
        this['_highlightBodyDropZone'](segment);
      }
      return;
    }
  }
};

exports = {
  GoldenLayoutEvent,
  LayoutEvent,
  setActiveComponentId,
  isActiveComponent,
  minimizeAll,
  cleanConfig,
  cleanContentItem,
  disallowTabsDropZone
};
