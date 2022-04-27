goog.declareModuleId('tools');
import {ROOT as APP_ROOT} from 'opensphere/src/os/os.js';

let appRoot = APP_ROOT;
if (appRoot == '../opensphere/') {
  appRoot = '../opensphere-plugin-analyze/';
}

/**
 * @define {string} The base path to this project.
 */
export const ROOT = appRoot;
