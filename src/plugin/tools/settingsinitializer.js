goog.declareModuleId('plugin.tools.SettingsInitializer');

import Settings from 'opensphere/src/os/config/settings.js';
import AngularAppSettingsInitializer from 'opensphere/src/os/ui/config/angularappsettingsinitializer.js';
import {getExports} from '../../mist/analyze/analyze.js';


/**
 * Initialize settings for the Analyze window.
 */
export class ToolsSettingsInitializer extends AngularAppSettingsInitializer {
  /**
   * Constructor.
   */
  constructor() {
    super();

    this.ngAppSelector = '#ng-app';
    this.ngAppModule = 'tools';
  }

  /**
   * @inheritDoc
   */
  init() {
    // find the main application
    const xp = getExports();
    if (xp && xp['settings']) {
      Settings.setInstance(/** @type {!Settings} */ (xp['settings']));
      this.onSettingsLoaded();
    } else {
      throw new Error('Unable to find settings from main window!');
    }
  }

  /**
   * @inheritDoc
   */
  registerStorages() {}

  /**
   * @inheritDoc
   */
  onInitialized() {}
}
