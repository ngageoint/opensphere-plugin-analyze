goog.module('plugin.file.kml.KMLPluginExt');
goog.module.declareLegacyNamespace();

goog.require('plugin.file.kml.ui.KMLExportUI');

const AbstractPlugin = goog.require('os.plugin.AbstractPlugin');


/**
 * Provides KML support to external tools
 */
class KMLPluginExt extends AbstractPlugin {
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


exports = KMLPluginExt;
