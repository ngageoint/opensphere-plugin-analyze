goog.declareModuleId('mist.mixin.places');

import PlacesManager from 'opensphere/src/plugin/places/placesmanager.js';
import {ANALYZE_CONFIG_KEY} from './vectorsource.js';

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

    // ensure we default to false
    if (!(ANALYZE_CONFIG_KEY in options)) {
      options[ANALYZE_CONFIG_KEY] = false;
    }

    return options;
  };
})();
