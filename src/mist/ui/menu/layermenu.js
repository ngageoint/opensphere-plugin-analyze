goog.declareModuleId('mist.ui.menu.layer');

import {AnalyzeEventType} from '../../analyze/eventtype.js';
import {showInAnalyze} from '../../mixin/vectorsource.js';

const MapContainer = goog.require('os.MapContainer');
const instanceOf = goog.require('os.instanceOf');
const Vector = goog.require('os.source.Vector');
const layerMenu = goog.require('os.ui.menu.layer');

const VectorLayer = goog.requireType('os.layer.Vector');
const MenuEvent = goog.requireType('os.ui.menu.MenuEvent');
const MenuItem = goog.requireType('os.ui.menu.MenuItem');


/**
 * Setup
 */
export const setup = function() {
  const menu = layerMenu.getMenu();
  if (menu && !menu.getRoot().find(AnalyzeEventType.HIDE_ANALYZE)) {
    const group = menu.getRoot().find(layerMenu.GroupLabel.LAYER);
    goog.asserts.assert(group, 'Group should exist! Check spelling?');

    group.addChild({
      label: 'Remove From Analyze Window',
      eventType: AnalyzeEventType.HIDE_ANALYZE,
      tooltip: 'Removes the layer from the Analyze window',
      icons: ['<i class="fa fa-fw fa-list-alt"></i>'],
      beforeRender: visibleIfShownInAnalyze,
      handler: handleHideInAnalyze
    });

    group.addChild({
      label: 'Show In Analyze Window',
      eventType: AnalyzeEventType.SHOW_ANALYZE,
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
export const isSourceHidden = function(source) {
  return !showInAnalyze(source);
};

/**
 * If a source is shown in the Analyze window.
 * @param {!Vector} source The source
 * @return {boolean} True if the source is shown
 */
export const isSourceShown = function(source) {
  return showInAnalyze(source);
};

/**
 * Get the layer sources that can be shown in the Analyze window.
 * @param {!Array<!VectorLayer>} layers The layers.
 * @return {!Array<!Vector>} Vector sources that can be shown in Analyze.
 */
export const getAnalyzeSources = function(layers) {
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
export const visibleIfShownInAnalyze = function(context) {
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
export const visibleIfHiddenFromAnalyze = function(context) {
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
export const handleShowInAnalyze = function(event) {
  const layers = layerMenu.getLayersFromContext(event.getContext()).filter(MapContainer.isVectorLayer);
  toggleLayersInAnalyze(layers, true);
};

/**
 * Show layers in the event context in the Analyze window.
 * @param {!MenuEvent<layerMenu.Context>} event The menu event.
 */
export const handleHideInAnalyze = function(event) {
  const layers = layerMenu.getLayersFromContext(event.getContext()).filter(MapContainer.isVectorLayer);
  toggleLayersInAnalyze(layers, false);
};

/**
 * Toggle if layers are shown in the Analyze window.
 * @param {!Array<!VectorLayer>} layers The layers to toggle.
 * @param {boolean} shown If the layers should be shown in the Analyze window.
 */
export const toggleLayersInAnalyze = function(layers, shown) {
  layers.forEach(function(layer) {
    const source = /** @type {Vector} */ (layer.getSource());
    if (source) {
      source.setShowInAnalyze(shown);
    }
  });
};
