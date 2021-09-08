goog.module('coreui.milsym.MilSymSaveUI');

goog.require('coreui.selector.GeneralSelectorUI');

const {ROOT} = goog.require('tools');
const milsym = goog.require('coreui.milsym');
const EventType = goog.require('coreui.milsym.EventType');
const olObj = goog.require('ol.obj');
const Settings = goog.require('os.config.Settings');
const Module = goog.require('os.ui.Module');



/**
 * The milsym directive
 * @return {angular.Directive}
 */
const directive = () => ({
  restrict: 'AE',
  replace: true,

  scope: {
    'isAutoheight': '=',
    'selectedOpts': '=',
    'options': '=',
    'iconUrl': '='
  },

  templateUrl: ROOT + 'views/milsym/milsymsave\.html',
  controller: Controller,
  controllerAs: 'ctrl'
});

/**
 * The element tag for the directive.
 * @type {string}
 */
const directiveTag = 'milsymsave';


/**
 * Add the directive to the module.
 */
Module.directive('milsymsave', [directive]);



/**
 * Controller for milsymsave directive
 * @unrestricted
 */
class Controller {
  /**
   * Constructor.
   * @param {!angular.Scope} $scope
   * @ngInject
   */
  constructor($scope) {
    /**
     * @type {?angular.Scope}
     */
    this.scope = $scope;
    this.scope['formatSelection'] = this.select2Formatter.bind(this);
    this.scope['formatResult'] = this.select2Formatter.bind(this);

    /**
     * milsym id for settings
     * @type {string}
     */
    this['id'] = milsym.settingsID;

    /**
     * Name used in saved settings
     * @type {string}
     */
    this['saveName'] = '';

    /**
     * Returns whether or not the name
     * selected already exists in settings
     */
    this['validName'] = false;

    /**
     * Holds array of saved objects
     * @type {Array<Object>}
     */
    this['savedIcons'] = this.populateSavedIcons();
    this.scope['selectedIcon'] = undefined;

    this.scope.$watch('selectedIcon', this.reloadSaved.bind(this));

    this.scope.$on(EventType.RESET_ICON, function(event) {
      this.scope['selectedIcon'] = undefined;
    }.bind(this));
  }

  /**
   * Creates the Array{Object} for saved icons from settings
   * @return {Array<Object>}
   */
  populateSavedIcons() {
    var icons = [];
    var inSettings = /** @type {Object} */ (Settings.getInstance().get(this['id'])) || {};
    var keys = Object.keys(inSettings) || [];

    for (var i = 0; i < keys.length; i++) {
      icons[i] = inSettings[keys[i]];
      icons[i]['name'] = keys[i];
    }

    return icons;
  }

  /**
   * Reloads the Icon
   * @param {Object} value
   */
  reloadSaved(value) {
    if (value) {
      olObj.assign(this.scope['selectedOpts'], value);
      this.scope['options'] = value['options'];
    }
  }

  /**
   * Reloads the Icon
   * @param {string} value
   * @return {boolean}
   * @export
   */
  checkName(value) {
    for (var i = 0; i < this['savedIcons'].length; i++) {
      if (value == this['savedIcons'][i]['name']) {
        this['validName'] = false;
        return false;
      }
    }
    this['validName'] = true;
    return true;
  }

  /**
   * Reloads the Icon
   * @param {string} name
   * @export
   */
  saveIcon(name) {
    var fullName = this['id'] + '.' + name;

    var settings = {};
    olObj.assign(settings, this.scope['selectedOpts']);
    settings['options'] = this.scope['options'];
    settings['url'] = this.scope['iconUrl'];
    Settings.getInstance().set(fullName, settings);

    this['saveName'] = '';
    this.reloadSavedSet();
  }

  /**
   * Deletes the Icon from settings
   * @param {string} name
   * @export
   */
  deleteIcon(name) {
    var setting = this['id'] + '.' + name;
    Settings.getInstance().delete(setting);
    this.reloadSavedSet();
  }

  /**
   * Reload set of saved Icons
   * @export
   */
  reloadSavedSet() {
    this['savedIcons'] = this.populateSavedIcons();
    this.scope['selectedIcon'] = undefined;
  }

  /**
   * Formats the select2 option
   * @param {Object} item
   * @return {string|angular.JQLite}
   */
  select2Formatter(item) {
    if (item) {
      var title = item['text'];
      var index = item['id'];
      var icons = this['savedIcons'];
      var val = '';
      val += '<img class="c-icon-picker__icon c-icon-picker__background rounded"' +
        'src="' + icons[index]['url'] + '" />';
      val += '<span title="' + icons[index]['name'] + '">';
      val += title + '</span>';
      return val;
    } else {
      return '';
    }
  }
}

exports = {
  Controller,
  directive,
  directiveTag
};
