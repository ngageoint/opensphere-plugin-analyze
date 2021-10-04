goog.declareModuleId('plugin.file.kml.KMLPluginExt');

import 'opensphere/src/plugin/file/kml/ui/kmlexportui.js';
import AbstractPlugin from 'opensphere/src/os/plugin/abstractplugin.js';


/**
 * Provides KML support to external tools
 */
export class KMLPluginExt extends AbstractPlugin {
  /**
   * Constructor.
   */
  constructor() {
    super();
    this.id = KMLPluginExt.ID;
  }

  /**
   * @inheritDoc
   */
  init() {
    // nothing needs to be done, but this plugin needs to be loaded by tools to make sure the KML export UI is
    // registered with Angular via the goog.require above.
  }
}

/**
 * @type {string}
 * @const
 */
KMLPluginExt.ID = 'kml-ext';
