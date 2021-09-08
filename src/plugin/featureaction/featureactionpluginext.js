goog.module('plugin.im.action.feature.PluginExt');

const AbstractPlugin = goog.require('os.plugin.AbstractPlugin');
const analyze = goog.require('mist.analyze');
const ext = goog.require('plugin.im.action.feature.ext');
const featureActionExtMenu = goog.require('plugin.im.action.feature.ext.menu');
const FeatureActionManager = goog.require('plugin.im.action.feature.Manager');
const googObject = goog.require('goog.object');
const {isMainWindow} = goog.require('os');
const {launchEditFeatureAction} = goog.require('plugin.im.action.feature.ui');
const osObject = goog.require('os.object');


/**
 * Plugin to add feature action capabilities to the Analyze window.
 */
class PluginExt extends AbstractPlugin {
  /**
   * Constructor.
   */
  constructor() {
    super();
    this.id = ext.ID;
  }

  /**
   * @inheritDoc
   */
  disposeInternal() {
    super.disposeInternal();

    if (!isMainWindow()) {
      featureActionExtMenu.countByDispose();
    }
  }

  /**
   * @inheritDoc
   */
  init() {
    if (isMainWindow()) {
      // export for child windows
      analyze.exportSymbol('importActionManager', FeatureActionManager.getInstance());
      osObject.set(window, [analyze.EXPORT_PROPERTY, 'functions', 'launchFeatureActionEdit'], launchEditFeatureAction);
    } else {
      const manager = /** @type {FeatureActionManager|undefined} */
          (googObject.getValueByKeys(window, analyze.EXPORT_PROPERTY, 'importActionManager'));
      if (manager) {
        // use the manager from the main window context.
        FeatureActionManager.setInstance(manager);

        featureActionExtMenu.countBySetup();
      }
    }
  }


  /**
   * @return {!PluginExt}
   */
  static getInstance() {
    if (!instance) {
      instance = new PluginExt();
    }
    return instance;
  }
}

/**
 * @type {PluginExt|undefined}
 */
let instance;


exports = PluginExt;
