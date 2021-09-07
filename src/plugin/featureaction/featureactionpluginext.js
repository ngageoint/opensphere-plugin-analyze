goog.declareModuleId('plugin.im.action.feature.FeatureActionPluginExt');

import {ID} from './featureactionext.js';
import {countByDispose, countBySetup} from './featureactionmenuext.js';

import {isMainWindow} from 'opensphere/src/os/os.js';

const AbstractPlugin = goog.require('os.plugin.AbstractPlugin');
const analyze = goog.require('mist.analyze');
const FeatureActionManager = goog.require('plugin.im.action.feature.Manager');
const googObject = goog.require('goog.object');
const {launchEditFeatureAction} = goog.require('plugin.im.action.feature.ui');
const osObject = goog.require('os.object');


/**
 * Plugin to add feature action capabilities to the Analyze window.
 */
export class FeatureActionPluginExt extends AbstractPlugin {
  /**
   * Constructor.
   */
  constructor() {
    super();
    this.id = ID;
  }

  /**
   * @inheritDoc
   */
  disposeInternal() {
    super.disposeInternal();

    if (!isMainWindow()) {
      countByDispose();
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

        countBySetup();
      }
    }
  }


  /**
   * @return {!FeatureActionPluginExt}
   */
  static getInstance() {
    if (!instance) {
      instance = new FeatureActionPluginExt();
    }
    return instance;
  }
}

/**
 * @type {FeatureActionPluginExt|undefined}
 */
let instance;
