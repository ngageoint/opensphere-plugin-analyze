goog.declareModuleId('plugin.milsym.MilSymPlugin');

import '../../coreui/milsym/milsymdialog.js';
import AbstractPlugin from 'opensphere/src/os/plugin/abstractplugin.js';
import IconSelectorManager from 'opensphere/src/os/ui/icon/iconselectormanager.js';


/**
 * Plugin that allows the user to interact with the icon service
 */
export class MilSymPlugin extends AbstractPlugin {
  /**
   * Constructor.
   */
  constructor() {
    super();
    this.errorMessage = null;
  }

  /**
   * inits the plugin
   * @override
   */
  init() {
    const iconService = {
      'id': 'milsym_icons',
      'name': 'MilSym Generator',
      'showResetButton': true,
      'html': '<milsymdialog is-autoheight="true" accept-callback="acceptCallback" ' +
          'selected="selected"></milsymdialog>'
    };
    IconSelectorManager.getInstance().add(iconService);
  }


  /**
   * @return {!MilSymPlugin}
   */
  static getInstance() {
    if (!instance) {
      instance = new MilSymPlugin();
    }
    return instance;
  }
}

/**
 * @type {MilSymPlugin|undefined}
 */
let instance;
