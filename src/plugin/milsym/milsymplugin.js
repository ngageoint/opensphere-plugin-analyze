goog.module('plugin.milsym.MilSymPlugin');

goog.require('coreui.milsym.MilSymDialogUI');

const AbstractPlugin = goog.require('os.plugin.AbstractPlugin');
const IconSelectorManager = goog.require('os.ui.icon.IconSelectorManager');


/**
 * Plugin that allows the user to interact with the icon service
 */
class MilSymPlugin extends AbstractPlugin {
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


exports = MilSymPlugin;
