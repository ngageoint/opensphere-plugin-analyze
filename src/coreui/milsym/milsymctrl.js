goog.declareModuleId('coreui.milsym.MilSymUI');

goog.require('coreui.milsym.MilSymSaveUI');
goog.require('coreui.selector.GeneralSelectorUI');

const {ROOT} = goog.require('tools');
const {MilSymEventType} = goog.require('coreui.milsym.EventType');
const Module = goog.require('os.ui.Module');


/**
 * The milsym directive
 * @return {angular.Directive}
 */
export const directive = () => ({
  restrict: 'AE',
  replace: true,
  scope: {
    'isAutoheight': '=',
    'selected': '='
  },
  templateUrl: ROOT + 'views/milsym/milsym\.html',
  controller: Controller,
  controllerAs: 'ctrl'
});

/**
 * The element tag for the directive.
 * @type {string}
 */
export const directiveTag = 'milsym';

/**
 * Add the directive to the module.
 */
Module.directive('milsym', [directive]);

/**
 * Controller for milsym directive
 * @unrestricted
 */
export class Controller {
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

    /**
     * Default symbol is for an infantry platoon
     * @type {string}
     */
    this['SIDC'] = 'SFGPU-------';

    /**
     * @type {Object}
     */
    this['icon'] = {};

    /**
     * @type {string}
     */
    this['iconURL'] = '';

    /**
     * @type {Object}
     */
    this.scope['options'] = {
      'infoSize': 50,
      'strokeWidth': 4
    };

    this['currentVersion'] = {'standard': 'MIL-STD-2525C - Warfighting', 'key': 'ms2525c'};

    /**
     * @type {Array<Object<string, string>>}
     */
    this.scope['affiliations'] = [
      {id: 'P', type: 'Pending'},
      {id: 'U', type: 'Unknown'},
      {id: 'A', type: 'Assumed Friend'},
      {id: 'F', type: 'Friend'},
      {id: 'N', type: 'Neutral'},
      {id: 'S', type: 'Suspect'},
      {id: 'H', type: 'Hostile'},
      {id: 'G', type: 'Exercise Pending'},
      {id: 'W', type: 'Exercise Unkown'},
      {id: 'M', type: 'Exercise Assumed Friend'},
      {id: 'D', type: 'Exercise Friend'},
      {id: 'L', type: 'Exercise Neutral'},
      {id: 'J', type: 'Joker'},
      {id: 'K', type: 'Faker'}
    ];

    /**
     * @type {Array<Object<string, string>>}
     */
    this.scope['dimensions'] = [
      {id: 'Z', type: 'Unknown'},
      {id: 'P', type: 'Space'},
      {id: 'A', type: 'Air'},
      {id: 'G', type: 'Ground Equipment'},
      {id: 'G', type: 'Ground Installation'},
      {id: 'G', type: 'Ground Unit'},
      {id: 'S', type: 'Sea Surface'},
      {id: 'U', type: 'Sub Surface'},
      {id: 'F', type: 'SOF'}
    ];

    /**
     * @type {Array<Object<string, string>>}
     */
    this.scope['statuses'] = [
      {id: 'A', type: 'Anticipated/Planned'},
      {id: 'P', type: 'Present'},
      {id: 'C', type: 'Present/Fully Capable'},
      {id: 'D', type: 'Present/Damaged'},
      {id: 'X', type: 'Present/Destroyed'},
      {id: 'F', type: 'Present/Full to Capacity'}
    ];

    var key = this['currentVersion']['key'];
    /**
     * @type {Object<Object>}
     */
    this.scope['iconFunctions'] = {
      'Air': milstd[key].WAR.AIRTRK['main icon'],
      'Ground Equipment': milstd[key].WAR.GRDTRK_EQT['main icon'],
      'Ground Installation': milstd[key].WAR.GRDTRK_INS['main icon'],
      'Ground Unit': milstd[key].WAR.GRDTRK_UNT['main icon'],
      'Sea Surface': milstd[key].WAR.SSUF['main icon'],
      'SOF': milstd[key].WAR.SOFUNT['main icon'],
      'Sub Surface': milstd[key].WAR.SBSUF['main icon'],
      'Space': milstd[key].WAR.SPC['main icon'],
      'Unknown': [{code: '------', name: ['Unspecified']}]
    };
    this.scope['availFunctions'] = this.scope['iconFunctions']['Ground Unit'];

    /**
     * @type {Array<Object<string, string>>}
     */
    this.scope['groups'] = [
      {id: 'A', type: 'Headquarters (HQ)'},
      {id: 'B', type: 'Task Force (TF) HQ'},
      {id: 'C', type: 'Feint Dummy (FD) HQ'},
      {id: 'D', type: 'Feint Dummy/Task Force (FD/TF) HQ'},
      {id: 'E', type: 'Task Force (TF)'},
      {id: 'F', type: 'Feint Dummy (FD)'},
      {id: 'G', type: 'Feint Dummy/Task Force (FD/TF)'},
      {id: '-', type: 'Unspecified'}
    ];

    /**
     * @type {Array<Object<string, string>>}
     */
    this.scope['sizes'] = [
      {id: 'A', type: 'Team/Crew'},
      {id: 'B', type: 'Squad'},
      {id: 'C', type: 'Section'},
      {id: 'D', type: 'Platoon/Detachment'},
      {id: 'E', type: 'Company/Battery/Troop'},
      {id: 'F', type: 'Battalion/Squadron'},
      {id: 'G', type: 'Regiment/Group'},
      {id: 'H', type: 'Brigade'},
      {id: 'I', type: 'Division'},
      {id: 'J', type: 'Corps/MEF'},
      {id: 'K', type: 'Army'},
      {id: 'L', type: 'Army Group/Front'},
      {id: 'M', type: 'Region'},
      {id: 'N', type: 'Command'},
      {id: '-', type: 'Unspecified'}
    ];

    /**
     * @type {Array<Object<string, string>>}
     */
    this['additionalOptions'] = [
      {title: 'Additional Information:', model: 'additionalInformation'},
      {title: 'Altitude/Depth:', model: 'altitudeDepth'},
      {title: 'Combat Effectiveness:', model: 'combatEffectiveness'},
      {title: 'Direction:', model: 'direction'},
      {title: 'DTG:', model: 'dtg'},
      {title: 'Engagement Bar:', model: 'engagementBar'},
      {title: 'Evaluation Rating:', model: 'evaluationRating'},
      {title: 'Higher Formation:', model: 'higherFormation'},
      {title: 'IFF/SIF:', model: 'iffSif'},
      {title: 'Location:', model: 'location'},
      {title: 'Quantity:', model: 'quantity'},
      {title: 'Reinforced or Reduced:', model: 'reinforcedReduced'},
      {title: 'Signature Equipment:', model: 'signatureEquipment'},
      {title: 'Special C2 Headquarters:', model: 'specialHeadquarters'},
      {title: 'Speed:', model: 'speed'},
      {title: 'Staff Comments:', model: 'staffComments'},
      {title: 'Unique Designation:', model: 'uniqueDesignation'}
    ];

    this.scope['popoverContent'] = 'This generator is limited to the Milsymbol standard 2525 Version C and the ' +
      'Warfighting coding scheme.';

    this.scope.$watchGroup(
        ['selectedOpts.aff', 'selectedOpts.dim', 'selectedOpts.stat', 'selectedOpts.funct',
          'selectedOpts.group', 'selectedOpts.size'],
        function(newVal) {
          var base = 'S' + newVal[0].id + newVal[1].id + newVal[2].id;
          var funct = newVal[3].code;
          var modifiers = newVal[4].id + newVal[5].id;
          this['SIDC'] = base + funct + modifiers;
          this.setIcon();
        }.bind(this));

    this.scope.$watch('selectedOpts.dim', function(newVal) {
      this.formatFuncts(this.scope['iconFunctions'][newVal['type']], this.scope['selectedOpts']['funct']);
      this.setIcon();
    }.bind(this));

    this.scope.$on('iconselector.reseticon', function(event) {
      this.resetIcon();
    }.bind(this));

    this.scope['selectedOpts'] = {
      'aff': {},
      'dim': {},
      'stat': {},
      'funct': {},
      'group': {},
      'size': {}
    };

    /**
     * Default Values for the icon generator
     * @const {Object}
     */
    this.scope['defaultVals'] = {
      'aff': this.scope['affiliations'].slice()[3],
      'dim': this.scope['dimensions'].slice()[5],
      'stat': this.scope['statuses'].slice()[1],
      'funct': this.scope['iconFunctions']['Ground Unit'].slice()[0],
      'group': this.scope['groups'].slice()[7],
      'size': this.scope['sizes'].slice()[14]
    };

    this.setDefaultsValues();
  }

  /**
   * Creates a new icon from the SIDC and options
   */
  setDefaultsValues() {
    var scope = this.scope;
    var settings = scope['selected']['options'] || undefined;
    var opts = scope['selected']['options'] || {};

    settings = settings || this.scope['defaultVals'];
    Object.assign(scope['selectedOpts'], settings);
    scope['availFunctions'] = this.scope['iconFunctions'][settings['dim']['type']];
    scope['options'] = opts.options || scope['options'];
  }

  /**
   * Creates a new icon from the SIDC and options
   */
  setIcon() {
    this['icon'] = new ms.Symbol(this['SIDC'], this['scope']['options']);
    this.setIconURL();
    this.setAsIcon();
  }

  /**
   * Returns and sets the url for the current milsym icon
   * @return {string} the image's URL
   */
  setIconURL() {
    this['iconURL'] = this['icon'].asCanvas().toDataURL();
    return this['iconURL'];
  }

  /**
   * Formats the iconFunction data for a given battle dimension to include a properly
   * formatted name needed in select2
   * @param {Array<Object>} arr iconFunction array for given battle dimension
   * @param {Object} item
   * @return {Array<Object>}
   */
  formatFuncts(arr, item) {
    for (var i = 0; i < arr.length; i++) {
      if (arr[i]['type'] != undefined) {
        break;
      }
      arr[i]['type'] = this.displayName(arr[i]);
    }
    var inArr = arr.find(function(el) {
      return el['hierarchy'] == item['hierarchy'];
    });

    // if the item isn't in the new array, then just default to the first element
    if (!inArr) {
      this.scope['selectedOpts']['funct'] = this.scope['iconFunctions'][this.scope['selectedOpts']['dim']['type']][0];
    }
    this.scope['availFunctions'] = arr;
    return arr;
  }

  /**
   * Creates the string used to display names for iconFunctions
   * @param {Object} item An object specific to a functionID
   * @return {string} The name displayed for a given functionID
   */
  displayName(item) {
    if (item.name.length == 1) {
      return 'Unspecified';
    } else if (item.name.length == 2) {
      return item.name[1];
    } else {
      return item.name[item.name.length - 3] + ' ' + item.name[item.name.length - 1];
    }
  }

  /**
   * Resets all parts of the icon to default
   * @export
   */
  resetIcon() {
    var scope = this.scope;

    Object.assign(scope['selectedOpts'], scope['defaultVals']);
    scope['availFunctions'] = this.scope['iconFunctions'][this.scope['selectedOpts']['dim']['type']];
    scope['options'] = {
      infoSize: 50,
      strokeWidth: 4
    };
    scope.$broadcast(MilSymEventType.RESET_ICON);
    this.setIcon();
  }

  /**
   * Sets the current milspec object as the icon
   */
  setAsIcon() {
    var opts = this.scope['selectedOpts'];
    opts['options'] = this.scope['options'];

    this.scope.$emit(MilSymEventType.ICON_SELECTED, [this['iconURL'], this.scope.$id, opts]);
  }

  /**
   * Sets additional options input by the user
   * @param {string} field
   * @param {string} item
   * @export
   */
  updateAddInfo(field, item) {
    if (item.length > 50) {
      item = item.slice(0, item.length - 1);
    }
    var opt = {};
    opt[field] = item;
    this['icon'] = this['icon'].setOptions(opt);
    this.scope['options'][field] = item;
    this.setIcon();
  }
}
