goog.declareModuleId('mist.mixin.places');

import {BASE_OPTIONS} from 'opensphere/src/plugin/places/placesmanager.js';
import {ANALYZE_CONFIG_KEY} from './vectorsource.js';

// Default "Show in Analyze" to false.
BASE_OPTIONS[ANALYZE_CONFIG_KEY] = false;
