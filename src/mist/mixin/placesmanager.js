goog.module('mist.mixin.places');

goog.require('mist.mixin.vectorsource');

const settings = goog.require('os.config.Settings');
const PlacesManager = goog.require('plugin.places.PlacesManager');


/**
 * mixin to make saved places default to not show in analyze
 * @suppress {accessControls}
 */
(function() {
  const old = PlacesManager.prototype.getOptions;
  const oldKey = 'analyze';

  /**
   * options used to create the places layer
   * @return {Object<string, *>} the layer options
   * @protected
   * @override
   */
  PlacesManager.prototype.getOptions = function() {
    const options = old.call(this);

    // see if the user has this in the old setting
    const oldSetting = settings.getInstance().get(oldKey, false);
    if (oldSetting) {
      options[oldKey] = oldSetting;
      settings.getInstance().delete(oldKey);
    }

    // ensure we default to false
    if (!(oldKey in options)) {
      options[oldKey] = false;
    }

    return options;
  };
})();
