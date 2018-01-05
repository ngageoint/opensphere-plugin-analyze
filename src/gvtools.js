goog.provide('gv.tools');
goog.provide('gv.tools.Module');

goog.require('tools.ui.Module');


/**
 * @define {string} The root for views.
 */
goog.define('gv.tools.ROOT', '../opensphere-plugin-analyze/');


/**
 * Angular module 'gvTools'
 * @type {angular.Module}
 */
gv.tools.Module = angular.module('gvTools', [
  'ngSanitize',
  'os.ui',
  'tools']);
