goog.module('mist.ui.menu.layer');

const MapContainer = goog.require('os.MapContainer');
const instanceOf = goog.require('os.instanceOf');
const Vector = goog.require('os.source.Vector');
const layerMenu = goog.require('os.ui.menu.layer');
const EventType = goog.require('mist.action.EventType');
const {showInAnalyze} = goog.require('mist.mixin.vectorsource');

const VectorLayer = goog.requireType('os.layer.Vector');
const MenuEvent = goog.requireType('os.ui.menu.MenuEvent');
const MenuItem = goog.requireType('os.ui.menu.MenuItem');


/**
 * Setup
 */
const setup = function() {
  const menu = layerMenu.getMenu();
  if (menu && !menu.getRoot().find(EventType.HIDE_ANALYZE)) {
    const group = menu.getRoot().find(layerMenu.GroupLabel.LAYER);
    goog.asserts.assert(group, 'Group should exist! Check spelling?');

    group.addChild({
      label: 'Remove From Analyze Window',
      eventType: EventType.HIDE_ANALYZE,
      tooltip: 'Removes the layer from the Analyze window',
      icons: ['<i class="fa fa-fw fa-list-alt"></i>'],
      beforeRender: visibleIfShownInAnalyze,
      handler: handleHideInAnalyze
    });

    group.addChild({
      label: 'Show In Analyze Window',
      eventType: EventType.SHOW_ANALYZE,
      tooltip: 'Adds the layer to the Analyze window',
      icons: ['<i class="fa fa-fw fa-list-alt"></i>'],
      beforeRender: visibleIfHiddenFromAnalyze,
      handler: handleShowInAnalyze
    });
  }
};

/**
 * If a source is hidden from the Analyze window.
 * @param {!Vector} source The source
 * @return {boolean} True if the source is hidden
 */
const isSourceHidden = function(source) {
  return !showInAnalyze(source);
};

/**
 * If a source is shown in the Analyze window.
 * @param {!Vector} source The source
 * @return {boolean} True if the source is shown
 */
const isSourceShown = function(source) {
  return showInAnalyze(source);
};

/**
 * Get the layer sources that can be shown in the Analyze window.
 * @param {!Array<!VectorLayer>} layers The layers.
 * @return {!Array<!Vector>} Vector sources that can be shown in Analyze.
 */
const getAnalyzeSources = function(layers) {
  layers = /** @type {!Array<!VectorLayer>} */ (layers.filter(MapContainer.isVectorLayer));

  return /** @type {!Array<!Vector>} */ (layers.map(function(layer) {
    return layer.getSource();
  }).filter(function(source) {
    return instanceOf(source, Vector.NAME);
  }));
};

/**
 * Show a menu item if all context layers are shown in the Analyze window.
 * @param {layerMenu.Context} context The menu context.
 * @this {MenuItem}
 */
const visibleIfShownInAnalyze = function(context) {
  this.visible = false;

  if (Array.isArray(context) && context.length > 0) {
    const layers = layerMenu.getLayersFromContext(context);
    if (layers.length == context.length) {
      const sources = getAnalyzeSources(layers);
      this.visible = sources.length === layers.length && sources.every(isSourceShown);
    }
  }
};

/**
 * Show a menu item if all context layers are hidden in the Analyze window.
 * @param {layerMenu.Context} context The menu context.
 * @this {MenuItem}
 */
const visibleIfHiddenFromAnalyze = function(context) {
  this.visible = false;

  if (Array.isArray(context)) {
    const layers = layerMenu.getLayersFromContext(context);
    if (layers.length == context.length) {
      const sources = getAnalyzeSources(layers);
      this.visible = sources.length === layers.length && sources.some(isSourceHidden);
    }
  }
};

/**
 * Show layers in the event context in the Analyze window.
 * @param {!MenuEvent<layerMenu.Context>} event The menu event.
 */
const handleShowInAnalyze = function(event) {
  const layers = layerMenu.getLayersFromContext(event.getContext()).filter(MapContainer.isVectorLayer);
  toggleLayersInAnalyze(layers, true);
};

/**
 * Show layers in the event context in the Analyze window.
 * @param {!MenuEvent<layerMenu.Context>} event The menu event.
 */
const handleHideInAnalyze = function(event) {
  const layers = layerMenu.getLayersFromContext(event.getContext()).filter(MapContainer.isVectorLayer);
  toggleLayersInAnalyze(layers, false);
};

/**
 * Toggle if layers are shown in the Analyze window.
 * @param {!Array<!VectorLayer>} layers The layers to toggle.
 * @param {boolean} shown If the layers should be shown in the Analyze window.
 */
const toggleLayersInAnalyze = function(layers, shown) {
  layers.forEach(function(layer) {
    const source = /** @type {Vector} */ (layer.getSource());
    if (source) {
      source.setShowInAnalyze(shown);
    }
  });
};

exports = {
  setup,
  isSourceHidden,
  isSourceShown,
  getAnalyzeSources,
  visibleIfShownInAnalyze,
  visibleIfHiddenFromAnalyze,
  handleShowInAnalyze,
  handleHideInAnalyze,
  toggleLayersInAnalyze
};
