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

const appPath = resolver.resolveModulePath('opensphere');
const sharedResources = require(appPath).sharedResources;

/**
 * Resources for `bits-index` to include in `tools.html`.
 * @type {Array<Object>}
 */
const toolsResources = sharedResources.concat([
  {
    source: resolver.resolveModulePath('opensphere-plugin-mist/views'),
    target: path.join('views'),
    files: [
      'data',
      'plugin/chart/scatter',
      'plugin/omar',
      'plugin/benum',
      'plugin/metacarta',
      'tools',
      'toolsmain.html'
    ]
  },
  {
    source: resolver.resolveModulePath('bits-internal/views'),
    target: 'views',
    files: ['chart', 'layout']
  },
  {
    source: resolver.resolveModulePath('golden-layout/dist', __dirname),
    target: 'vendor/golden-layout',
    scripts: [
      'goldenlayout.min.js'
    ]
  },
  {
    source: resolver.resolveModulePath('golden-layout/src/css', __dirname),
    target: 'vendor/golden-layout',
    css: [
      'goldenlayout-base.css',
      'goldenlayout-dark-theme.css'
    ]
  },
  {
    source: resolver.resolveModulePath('zingchart/client'),
    target: 'vendor/zingchart',
    scripts: [
      'zingchart.min.js',
      'modules/zingchart-selection-tool.min.js'
    ]
  },
  {
    source: resolver.resolveModulePath('vega/build', __dirname),
    target: 'vendor/vega',
    scripts: [
      'vega.min.js'
    ],
    files: [
      'vega-schema.json'
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
  debugCss: path.relative(__dirname, path.join(buildPath, 'themes', 'default.combined.css')),
  compiledCss: path.join(version, 'styles', 'themes', 'default.min.css'),
  debugJs: path.relative(__dirname, path.join(buildPath, 'opensphere.js')),
  compiledJs: path.join(version, 'opensphere.min.js')
};
