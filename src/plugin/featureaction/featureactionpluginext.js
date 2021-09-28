goog.declareModuleId('plugin.im.action.feature.FeatureActionPluginExt');

import {isMainWindow} from 'opensphere/src/os/os.js';
import FeatureActionManager from 'opensphere/src/plugin/featureaction/featureactionmanager.js';
import {launchEditFeatureAction} from 'opensphere/src/plugin/featureaction/ui/index.js';
import {EXPORT_PROPERTY, exportSymbol} from '../../mist/analyze/analyze.js';
import {ID} from './featureactionext.js';
import {countByDispose, countBySetup} from './featureactionmenuext.js';

const AbstractPlugin = goog.require('os.plugin.AbstractPlugin');
const googObject = goog.require('goog.object');
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
      exportSymbol('importActionManager', FeatureActionManager.getInstance());
      osObject.set(window, [EXPORT_PROPERTY, 'functions', 'launchFeatureActionEdit'], launchEditFeatureAction);
    } else {
      const manager = /** @type {FeatureActionManager|undefined} */
          (googObject.getValueByKeys(window, EXPORT_PROPERTY, 'importActionManager'));
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
