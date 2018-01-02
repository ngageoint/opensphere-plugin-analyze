/* eslint-env es6 */

'use strict';

const fs = require('fs');
const path = require('path');
const resolver = require('opensphere-build-resolver/utils');

/**
 * Directory containing build artifacts generated by `bits-resolver`.
 * @type {string}
 */
const buildDir = '.build';

/**
 * Path to the build directory.
 * @type {string}
 */
const buildPath = path.join(process.cwd(), buildDir);

/**
 * Path to the version file.
 * @type {string}
 */
const versionFile = path.join(buildPath, 'version');

/**
 * Relative path of the version directory.
 * @type {string}
 */
const version = fs.readFileSync(versionFile, 'utf8').trim().replace(/.*\//, '');

// this is done this way so that we don't require node_modules/opensphere to be linked to ../opensphere
const appPath = path.join(__dirname, '..', 'opensphere');
const sharedResources = require(appPath).sharedResources;

/**
 * Resources for `bits-index` to include in `tools.html`.
 * @type {Array<Object>}
 */
const toolsResources = sharedResources.concat([
  {
    source: path.join('..', 'mist', 'views'),
    target: path.join('views'),
    files: [
      'data',
      'plugin/omar',
      'tools',
      'toolsmain.html'
    ]
  },
  {
    source: path.join('..', 'bits-internal', 'views'),
    target: 'views',
    files: ['chart']
  },
  {
    source: path.join('..', 'bits-internal', 'vendor', 'gridster'),
    target: 'vendor/gridster',
    css: ['angular-gridster.min.css'],
    scripts: ['angular-gridster.min.js']
  },
  {
    source: resolver.resolveModulePath('zingchart/client'),
    target: 'vendor/zingchart',
    scripts: [
      'zingchart.min.js',
      'modules/zingchart-selection-tool.min.js'
    ]
  }
]);

module.exports = {
  appVersion: version,
  basePath: __dirname,
  appPath: appPath,
  distPath: path.join(appPath, 'dist', 'opensphere'),
  templates: [{
    id: 'tools',
    file: 'tools-template.html',
    resources: toolsResources
  }],
  debugCss: path.relative(__dirname, path.join(buildPath, 'combined.css')),
  compiledCss: path.join(version, 'styles', 'opensphere.min.css'),
  compiledJs: path.join(version, 'opensphere.min.js')
};
