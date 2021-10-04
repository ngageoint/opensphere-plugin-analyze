goog.declareModuleId('plugin.tools.ToolsMain');

import 'opensphere/src/os/ui/ngrightclick.js';
import 'opensphere/src/os/ui/util/autoheight.js';
import {PiwikPlugin} from 'opensphere-plugin-geoint-viewer/src/plugin/piwik/piwikplugin.js';
import PluginManager from 'opensphere/src/os/plugin/pluginmanager.js';
import {ROOT} from '../../tools/tools.js';
import {AbstractToolsMainCtrl} from '../../tools/ui/abstracttoolsctrl.js';
import {Module} from '../../tools/ui/module.js';
import {FeatureActionPluginExt} from '../featureaction/featureactionpluginext.js';
import {KMLPluginExt} from '../file/kml/kmlpluginext.js';
import {PlacesPluginExt} from '../places/ext/placespluginext.js';
import {TrackPlugin} from '../track/misttrackplugin.js';

const log = goog.require('goog.log');

const Logger = goog.requireType('goog.log.Logger');


/**
 * Logger
 * @type {Logger}
 */
const LOGGER = log.getLogger('plugin.tools.ToolsMain');

/**
 * The tools-main directive
 * @return {angular.Directive}
 */
export const directive = () => ({
  restrict: 'E',
  replace: true,
  scope: true,
  templateUrl: ROOT + 'views/toolsmain.html',
  controller: Controller,
  controllerAs: 'toolsMain'
});

/**
 * The element tag for the directive.
 * @type {string}
 */
export const directiveTag = 'toolsMain';

/**
 * Add the directive to the tools module
 */
Module.directive(directiveTag, [directive]);

/**
 * Controller function for the Tools Main directive
 * @unrestricted
 */
class Controller extends AbstractToolsMainCtrl {
  /**
   * Constructor.
   * @param {!angular.Scope} $scope The Angular scope.
   * @param {!angular.JQLite} $element The root DOM element.
   * @param {!angular.$compile} $compile The Angular $compile service.
   * @param {!angular.$timeout} $timeout The Angular $timeout service.
   * @param {!angular.$injector} $injector The Angular injector.
   * @ngInject
   */
  constructor($scope, $element, $compile, $timeout, $injector) {
    super($scope, $element, $compile, $timeout, $injector);
    this.log = LOGGER;
  }

  /**
   * @inheritDoc
   * @suppress {accessControls}
   */
  addPlugins() {
    super.addPlugins();

    // TODO: Due to the new way we load plugins, plugins for the main application
    // will attempt to load themselves into the Analyze window. This is a quick
    // way to get what we want, but we should look into a better way to do this.
    const pm = PluginManager.getInstance();
    pm.plugins_.length = 0;

    pm.addPlugin(new KMLPluginExt());
    pm.addPlugin(FeatureActionPluginExt.getInstance());
    pm.addPlugin(PlacesPluginExt.getInstance());
    pm.addPlugin(TrackPlugin.getInstance());
    pm.addPlugin(new PiwikPlugin());
  }
}
