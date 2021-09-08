/**
 * @fileoverview Externs for the Golden Layout library.
 * @externs
 */

/**
 * The Golden Layout constructor.
 * @param {GoldenLayout.Config} config The Golden Layout configuration object.
 * @param {Element=} opt_container The container element.
 * @extends {GoldenLayout.EventEmitter}
 * @constructor
 */
var GoldenLayout = function(config, opt_container) {};

/**
 * The DOM element containing the layout.
 * @type {jQuery}
 */
GoldenLayout.prototype.container;

/**
 * The topmost item in the layout item tree.
 * @type {!GoldenLayout.ContentItem}
 */
GoldenLayout.prototype.root;

/**
 * Destroys the layout. Recursively calls destroy on all components and content items, removes all event listeners and
 * finally removes itself from the DOM.
 */
GoldenLayout.prototype.destroy;

/**
 * Renders the layout into the container. If init() is called before the document is ready it attaches itself as a
 * listener to the document and executes once it becomes ready.
 */
GoldenLayout.prototype.init;

/**
 * Turns a DOM element into a dragSource, meaning that the user can drag the element directly onto the layout where it
 * turns into a contentItem.
 * @param {jQuery} element The DOM element that will be turned into a dragSource.
 * @param {GoldenLayout.Component} itemConfiguration The component configuration.
 * @return {GoldenLayout.DragSource} The drag source.
 */
GoldenLayout.prototype.createDragSource;

/**
 * Registers either a component constructor or a component factory function with Golden Layout.
 * @param {string} name The name of the component, as referred to by componentName in the component configuration.
 * @param {Function} component A constructor or factory function. Will be invoked with new and two arguments,
 *                             a container object and a component state.
 */
GoldenLayout.prototype.registerComponent;

/**
 * Returns the current state of the layout and its components as a serialisable object.
 * @return {!GoldenLayout.Config}
 */
GoldenLayout.prototype.toConfig;

/**
 * Resizes the layout. If no arguments are provided GoldenLayout measures its container and resizes accordingly.
 * @param {number=} opt_width The new width.
 * @param {number=} opt_height The new height.
 */
GoldenLayout.prototype.updateSize;

/**
 * @typedef {{
 *   dimensions: (Object|undefined),
 *   labels: (Object|undefined),
 *   settings: (Object|undefined),
 *   content: (Array<!(GoldenLayout.Row|GoldenLayout.Column|GoldenLayout.Component)>|undefined)
 * }}
 */
GoldenLayout.Config;

/**
 * A drag source, for dragging new components into the layout.
 * @constructor
 */
GoldenLayout.DragSource = function() {};

/**
 * The drag listener.
 * @type {GoldenLayout.EventEmitter}
 */
GoldenLayout.DragSource.prototype._dragListener;

/**
 * A content item in the layout.
 * @extends {GoldenLayout.EventEmitter}
 * @constructor
 */
GoldenLayout.ContentItem = function() {
  /**
   * @type {jQuery}
   */
  this.closeElement;

  /**
   * @type {GoldenLayout.ContentItem}
   */
  this.contentItem;

  /**
   * @type {GoldenLayout.ContentItem}
   */
  this.header;

  /**
   * @type {jQuery}
   */
  this.controlsContainer;
};

/**
 * True if the item is maximised.
 * @type {boolean}
 */
GoldenLayout.ContentItem.prototype.isMaximised;

/**
 * True if the item is maximised.
 * @type {boolean}
 */
GoldenLayout.ContentItem.prototype.isMaximised;

/**
 * The type of item (row, column, stack, component, or root).
 * @type {string}
 */
GoldenLayout.ContentItem.prototype.type;

/**
 * An array of items that are children of this item.
 * @type {!Array<!GoldenLayout.ContentItem>}
 */
GoldenLayout.ContentItem.prototype.contentItems;

/**
 * This item's parent, or null for the root item.
 * @type {GoldenLayout.ContentItem}
 */
GoldenLayout.ContentItem.prototype.parent;

/**
 * Add a child to the item.
 * @param {!(GoldenLayout.ContentItem|Object)} itemOrConfig A content item or config to add.
 * @param {number=} opt_index Optional index to add the child.
 */
GoldenLayout.ContentItem.prototype.addChild;

/**
 * Remove the item from its parent.
 */
GoldenLayout.ContentItem.prototype.remove;

/**
 * Remove a child from the item.
 * @param {!GoldenLayout.ContentItem} item The item to remove.
 * @param {boolean=} opt_keepChild If true the item won't be destroyed.
 */
GoldenLayout.ContentItem.prototype.removeChild;

/**
 * Maximises the item or minimises it if it's already maximised.
 */
GoldenLayout.ContentItem.prototype.toggleMaximise;

/**
 * Fix tab issue
 * @param {number} x
 * @param {number} y
 */
GoldenLayout.ContentItem.prototype._$highlightDropZone;


/**
 * Golden Layout event emitter.
 * @constructor
 */
GoldenLayout.EventEmitter = function() {};

/**
 * Subscribe to an event.
 * @param {string} eventName The event type.
 * @param {Function} callback The callback.
 * @param {*=} opt_context The `this` context for the callback.
 */
GoldenLayout.EventEmitter.prototype.on;

/**
 * Unsubscribes either all listeners if just an `eventName` is provided, just a specific callback if invoked with
 * `eventName` and `callback` or just a specific callback with a specific context if invoked with all three arguments.
 * @param {string} eventName The event type.
 * @param {Function=} opt_callback The callback.
 * @param {*=} opt_context The `this` context for the callback.
 */
GoldenLayout.EventEmitter.prototype.unbind;

/**
 * Alias for unbind.
 * @param {string} eventName The event type.
 * @param {Function=} opt_callback The callback.
 * @param {*=} opt_context The `this` context for the callback.
 */
GoldenLayout.EventEmitter.prototype.off;

/**
 * The Golden Layout component container.
 * @extends {GoldenLayout.EventEmitter}
 * @constructor
 */
GoldenLayout.Container = function() {};

/**
 * The current width of the container in pixels.
 * @type {number}
 */
GoldenLayout.Container.prototype.width;

/**
 * The current height of the container in pixels.
 * @type {number}
 */
GoldenLayout.Container.prototype.height;

/**
 * A reference to the component-item that controls this container.
 * @type {GoldenLayout.Component}
 */
GoldenLayout.Container.prototype.parent;

/**
 * The current title of the container.
 * @type {number}
 */
GoldenLayout.Container.prototype.title;

/**
 * A reference to the GoldenLayout instance this container belongs to.
 * @type {!GoldenLayout}
 */
GoldenLayout.Container.prototype.layoutManager;

/**
 * Merges the provided state into the current one.
 * @param {!Object} state A serialisable object.
 */
GoldenLayout.Container.prototype.extendState;

/**
 * True if the item is currently hidden.
 * @return {boolean}
 */
GoldenLayout.Container.prototype.isHidden;

/**
 * Returns the container's inner element as a jQuery element.
 * @return {jQuery}
 */
GoldenLayout.Container.prototype.getElement;

/**
 * Returns the current state.
 * @return {!Object} The current state.
 */
GoldenLayout.Container.prototype.getState;

/**
 * Overwrites the components state with the provided value.
 * @param {!Object} state A serialisable object.
 */
GoldenLayout.Container.prototype.setState;

/**
 * Sets the item's title to the provided value. Triggers `titleChanged` and `stateChanged` events.
 * @param {string} title The new title.
 */
GoldenLayout.Container.prototype.setTitle;

/**
 * @typedef {{
 *   id: string,
 *   type: string,
 *   componentName: string,
 *   componentState: !Object,
 *   content: (Array<!(GoldenLayout.Row|GoldenLayout.Column|GoldenLayout.Component)>|undefined),
 *   title: string,
 *   height: (number|undefined),
 *   width: (number|undefined)
 * }}
 */
GoldenLayout.Component;

/**
 * @typedef {{
 *   type: string,
 *   content: (Array<!(GoldenLayout.Row|GoldenLayout.Column|GoldenLayout.Component)>|undefined)
 * }}
 */
GoldenLayout.Row;

/**
 * @typedef {{
 *   type: string,
 *   content: (Array<!(GoldenLayout.Row|GoldenLayout.Column|GoldenLayout.Component)>|undefined)
 * }}
 */
GoldenLayout.Column;
