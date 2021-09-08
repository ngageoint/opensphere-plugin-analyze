goog.module('mist.mixin.places');

const Settings = goog.require('os.config.Settings');
const {ANALYZE_CONFIG_KEY} = goog.require('mist.mixin.vectorsource');
const PlacesManager = goog.require('plugin.places.PlacesManager');


/**
 * mixin to make saved places default to not show in analyze
 * @suppress {accessControls}
 */
(function() {
  const old = PlacesManager.prototype.getOptions;

  /**
   * options used to create the places layer
   * @return {Object<string, *>} the layer options
   * @protected
   * @override
   */
  PlacesManager.prototype.getOptions = function() {
    const options = old.call(this);

    // see if the user has this in the old setting
    const oldSetting = Settings.getInstance().get(ANALYZE_CONFIG_KEY, false);
    if (oldSetting) {
      options[ANALYZE_CONFIG_KEY] = oldSetting;
      Settings.getInstance().delete(ANALYZE_CONFIG_KEY);
    }

    // ensure we default to false
    if (!(ANALYZE_CONFIG_KEY in options)) {
      options[ANALYZE_CONFIG_KEY] = false;
    }

    return options;
  };
})();
