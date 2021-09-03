goog.module('mist.mixin.vectorsource');
goog.module.declareLegacyNamespace();

const PropertyChangeEvent = goog.require('os.events.PropertyChangeEvent');
const instanceOf = goog.require('os.instanceOf');
const osSource = goog.require('os.source');
const Vector = goog.require('os.source.Vector');
const OlFeature = goog.require('ol.Feature');
const SimpleGeom = goog.require('ol.geom.SimpleGeometry');


/**
 * @type {string}
 * @const
 */
osSource.SHOW_ANALYZE = 'showInAnalyze';


/**
 * @type {boolean}
 * @private
 */
Vector.prototype.showInAnalyze_ = true;


/**
 * @return {boolean} Whether or not the source is shown in the Analyze window
 */
Vector.prototype.getShowInAnalyze = function() {
  return this.showInAnalyze_;
};


/**
 * @param {boolean} value  Whether or not the source is shown in the Analyze window
 */
Vector.prototype.setShowInAnalyze = function(value) {
  if (!!this.showInAnalyze_ !== value) {
    this.showInAnalyze_ = value;
    this.dispatchEvent(new PropertyChangeEvent(osSource.SHOW_ANALYZE, value, !value));
  }
};


/**
 * If a value is a vector source that should be shown in the Analyze window.
 * @param {*} source The source.
 * @return {boolean} Whether or not the source is should be shown.
 */
osSource.showInAnalyze = function(source) {
  return instanceOf(source, Vector.NAME) && /** @type {!Vector} */ (source).getShowInAnalyze();
};


(function() {
  const oldPersist = Vector.prototype.persist;

  /**
   * @inheritDoc
   */
  Vector.prototype.persist = function(opt_to) {
    const options = oldPersist.call(this, opt_to);
    options['analyze'] = this.getShowInAnalyze();
    return options;
  };

  const oldRestore = Vector.prototype.restore;

  /**
   * @inheritDoc
   */
  Vector.prototype.restore = function(config) {
    oldRestore.call(this, config);

    if (config['analyze'] != undefined) {
      this.setShowInAnalyze(config['analyze']);
    }
  };

  const addFeatures = Vector.prototype.addFeatures;

  /**
   * @inheritDoc
   */
  Vector.prototype.addFeatures = function(features) {
    addFeatures.call(this, features);

    const data = {
      'type': 'features',
      'count': this.getFeatureCount()
    };

    if (features.length == 0) { // done loading, post the count
      window.parent.postMessage(data, '*');
    }
  };

  const setSelectedItems = Vector.prototype.setSelectedItems;

  /**
   * @inheritDoc
   */
  Vector.prototype.setSelectedItems = function(items) {
    setSelectedItems.call(this, items);

    if (instanceOf(items, OlFeature.NAME)) {
      const flatCoords = items.getGeometry() && items.getGeometry() instanceof SimpleGeom ?
        /** @type SimpleGeom */ (items.getGeometry()).getFlatCoordinates() : null;
      const data = {
        'type': 'selected',
        'selected': items.values_
      };

      // clone the geometry to remove any listeners/methods - postMessage will fail otherwise
      if (data['selected']['geometry']) {
        data['selected']['geometry'] = data['selected']['geometry'].clone();
        // setting items.values_ above sets a minified version of items,
        // so 'flatCoordinates' is then not accessible elsewhere
        if (flatCoords) {
          data['selected']['geometry']['flatCoordinates'] = flatCoords;
        }
      }
      window.parent.postMessage(data, '*');
    }
  };
})();
