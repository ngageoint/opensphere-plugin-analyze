goog.declareModuleId('mist.ui.MistDedupeUI');

import {apply} from 'opensphere/src/os/ui/ui.js';
import {ROOT} from '../../tools/tools.js';
import {Analyze} from '../metrics/keys.js';
import {DedupeNode} from './dedupenode.js';

const settings = goog.require('os.config.Settings');
const Disposable = goog.require('goog.Disposable');
const array = goog.require('goog.array');
const Delay = goog.require('goog.async.Delay');
const AlertEventSeverity = goog.require('os.alert.AlertEventSeverity');
const AlertManager = goog.require('os.alert.AlertManager');
const Module = goog.require('os.ui.Module');
const SlickTreeNode = goog.require('os.ui.slick.SlickTreeNode');
const {nameCompare} = goog.require('os.ui.slick.column');
const window = goog.require('os.ui.window');
const ConfirmTextUI = goog.require('os.ui.window.ConfirmTextUI');
const osMetrics = goog.require('os.metrics.Metrics');

const VectorSource = goog.requireType('os.source.Vector');


/**
 * The mistexport directive
 * @return {angular.Directive}
 */
export const directive = () => ({
  restrict: 'E',
  replace: true,
  scope: true,
  templateUrl: ROOT + 'views/tools/dedupedialog.html',
  controller: Controller,
  controllerAs: 'dedupe'
});

/**
 * Add the directive to the module.
 */
Module.directive('mistdedupe', [directive]);

/**
 * Controller function for the mistdedupe directive
 * @unrestricted
 */
export class Controller extends Disposable {
  /**
   * Constructor.
   * @param {!angular.Scope} $scope
   * @param {!angular.JQLite} $element
   * @ngInject
   */
  constructor($scope, $element) {
    super();

    /**
     * @type {?angular.Scope}
     * @protected
     */
    this.scope = $scope;

    /**
     * @type {?angular.JQLite}
     * @protected
     */
    this.element = $element;

    this['popoverTitle'] = 'Deduplicate-By';
    this['popoverHelpText'] = `The Deduplicate-By Tool will use the columns specified below to detect and select
        duplicate records where every column listed is the same. The user may then purge, hide, or otherwise
        operate on the selected records`;


    this.window = (this.scope['window']);

    /**
     * @type {VectorSource}
     * @protected
     */
    this.source = /** @type {VectorSource} */ (this.scope['source']);
    this.scope['columns'] = angular.copy(this.source.getColumnsArray());
    this.scope['columns'].sort(nameCompare);

    /**
     * @type {Object}
     * @protected
     */
    this.columnNames = {};
    for (let i = 0; i < this.scope['columns'].length; i++) {
      this.columnNames[this.scope['columns'][i]['field']] = true;
    }

    /**
     * @type {number}
     * @protected
     */
    this.numEmpty = 0;

    /**
     * @type {boolean}
     * @protected
     */
    this.hasNoDupes = true;

    /**
     * @type {boolean}
     * @protected
     */
    this.allColsValid = true;

    /**
     * @type {Object}
     * @protected
     */
    this['activeConfig'] = {};

    /**
     * @type {DedupeNode}
     * @protected
     */
    this.currentDedupe = null;

    /**
     * @type {SlickTreeNode}
     */
    this.scope['selected'] = null;

    /**
     * A base node to hold the application root
     * @type {!SlickTreeNode}
     * @protected
     */
    this.scope['dedupes'] = new SlickTreeNode();
    const configs = angular.copy(settings.getInstance().get('mist.dedupeby', []));
    for (let i = 0; configs && i < configs.length; i++) {
      const config = configs[i];
      config.invalid = !this.allColumnsValid(config);
      if (config.invalid) {
        osMetrics.getInstance().updateMetric(Analyze.DEDUPE_BY_NON_COMPAT_CONFIG, 1);
      }
      const node = new DedupeNode(config);
      this.scope['dedupes'].addChild(node);
    }

    if (this.scope['dedupes'].hasChildren()) {
      const sel = this.scope['dedupes'].getChildren()[0];
      this.selectNode_(sel);
    } else {
      this.useTempConfig_();
    }
    this.adjustSize();
    this.scope.$on('dedupeActive', this.setActive_.bind(this));
    this.scope.$on('dedupeCopy', this.copyConfig_.bind(this));
    this.scope.$on('dedupeRemove', this.removeConfig_.bind(this));
    this.scope.$on('$destroy', this.dispose.bind(this));
  }

  /**
   * @inheritDoc
   */
  disposeInternal() {
    super.disposeInternal();
    this.scope = null;
    this.element = null;
  }

  /**
   * Adjust the window size based on the use of configs
   */
  adjustSize() {
    const el = window.getById('mistDedupe');
    if (this.scope['dedupes'].hasChildren()) {
      el.height(400);
      el.width(600);
    } else {
      el.height(375);
      el.width(330);
    }
  }

  /**
   * Fire the cancel callback and close the window.
   * @export
   */
  cancel() {
    this.close_();
    osMetrics.getInstance().updateMetric(Analyze.DEDUPE_BY_CANCEL, 1);
  }

  /**
   * Close the window.
   * @private
   */
  close_() {
    window.close(this.element);
  }

  /**
   * Save the changes to settings
   * @export
   */
  save() {
    if (!this.scope['dedupes'].hasChildren()) {
      this.launchForm_();
    } else {
      if (this.currentDedupe && this['activeConfig']) {
        const oldCfg = this.currentDedupe.getItem();
        if (oldCfg['title'] != this['activeConfig']['title']) {
          osMetrics.getInstance().updateMetric(Analyze.DEDUPE_BY_NAME_CHANGE, 1);
        }
      }
      const activeConfig = angular.copy(this['activeConfig']);
      this.currentDedupe.setItem(activeConfig);
    }
    this.saveConfig_();
    osMetrics.getInstance().updateMetric(Analyze.DEDUPE_BY_SAVE, 1);
  }

  /**
   * Refresh the ui
   * @private
   */
  saveConfig_() {
    const configs = [];
    if (this.scope['dedupes'].hasChildren()) {
      const children = this.scope['dedupes'].getChildren();
      for (let i = 0; i < children.length; i++) {
        const config = children[i].getItem();
        if (this.findNumEmpty_(config) == 0 && this.checkForDupesAndInvalid_(config, true)) {
          configs.push(config); // only save the valid ones
        }
      }
    }
    settings.getInstance().set('mist.dedupeby', configs);
  }

  /**
   * Show the configuration ui
   * @return {boolean}
   * @export
   */
  hasConfig() {
    return this.scope['dedupes'].hasChildren();
  }

  /**
   * Report if the config columns are from other sources
   * @param {Object=} opt_config
   * @return {boolean}
   * @export
   */
  allColumnsValid(opt_config) {
    const cfg = opt_config ? opt_config : this['activeConfig'];
    let allColsValid = true;
    if (cfg['columns']) {
      for (let i = 0; i < cfg['columns'].length; i++) {
        const col = cfg['columns'][i]['column'];
        if (col && !this.columnNames[col]) {
          allColsValid = false;
          break; // stop on the first invalid column
        }
      }
    }
    return allColsValid;
  }

  /**
   * Search the columns for duplicates, handles multiple duplicates
   * @param {Object=} opt_config
   * @param {boolean=} opt_noinvalid
   * @return {boolean}
   * @private
   */
  checkForDupesAndInvalid_(opt_config, opt_noinvalid) {
    const cfg = opt_config ? opt_config : this['activeConfig'];
    const map = {};
    let allColsValid = true;
    let hasNoDupes = true;
    for (let i = 0; i < cfg['columns'].length; i++) {
      const col = cfg['columns'][i]['column'];
      if (!this.columnNames[col] && !opt_noinvalid) {
        allColsValid = false;
        break; // stop on the first invalid column
      }
      if (map[col]) {
        hasNoDupes = false;
        break; // stop on the first duplicate
      }
      map[col] = true;
    }
    if (!opt_config) {
      this.allColsValid = allColsValid;
      this.hasNoDupes = hasNoDupes;
    }
    return allColsValid && hasNoDupes;
  }

  /**
   * Search the columns for empty columns
   * @param {Object=} opt_config
   * @return {number}
   * @private
   */
  findNumEmpty_(opt_config) {
    const cfg = opt_config ? opt_config : this['activeConfig'];
    let empty = 0;
    if (!cfg['columns']) {
      return -1;
    }
    for (let i = 0; i < cfg['columns'].length; i++) {
      if (!cfg['columns'][i]['column']) {
        empty++;
      }
    }
    return empty;
  }

  /**
   * Handles column changes
   * @param {Object} column
   * @param {!string} oldCol
   * @export
   */
  onColumnChange(column, oldCol) {
    if (oldCol == '') {
      this.numEmpty--;
    } else if (!column['column']) {
      this.numEmpty++;
    }
    if (this.numEmpty == 0) {
      this.checkForDupesAndInvalid_(); // only check if no empty columns
    }
    osMetrics.getInstance().updateMetric(Analyze.DEDUPE_BY_EDIT_COLUMN, 1);
  }

  /**
   * Add a new column
   * @export
   */
  addColumn() {
    this['activeConfig']['columns'].push({});
    this.numEmpty++;
    osMetrics.getInstance().updateMetric(Analyze.DEDUPE_BY_ADD_COLUMN, 1);
  }

  /**
   * Remove a column
   * @param {Object} column
   * @export
   */
  removeColumn(column) {
    array.remove(this['activeConfig']['columns'], column);
    if (!column['column']) {
      this.numEmpty--;
    }
    if (this.numEmpty == 0) {
      this.checkForDupesAndInvalid_(); // only check if no empty columns
    }
    osMetrics.getInstance().updateMetric(Analyze.DEDUPE_BY_REMOVE_COLUMN, 1);
  }

  /**
   * runs dedupe algorithm
   * @suppress {accessControls}
   * @export
   */
  run() {
    const selected = [];
    const features = this.source.getFilteredFeatures().sort(function(a, b) { // sort by ID
      const aid = parseInt(a.values_['ID'], 10); // using integer comparison because string comparison may not suffice
      const bid = parseInt(b.values_['ID'], 10); // ie "001" > "50" because the string is longer
      return aid < bid ? -1 : aid > bid ? 1 : 0;
    });
    const validator = {};
    const len = this['activeConfig']['columns'].length;
    for (let i = 0; i < features.length; i++) {
      const feat = features[i];
      let curValidator = validator;
      for (let j = 0; j < len; j++) {
        const col = this['activeConfig']['columns'][j]['column'];
        const prop = feat.values_[col];
        if (!curValidator[prop]) {
          curValidator[prop] = {}; // build out new node, but don't stop here in case the full branch isn't created
        } else if (j + 1 === len) {
          selected.push(feat); // found a similar entry - track it, and stop comparing
          break;
        }
        curValidator = curValidator[prop];
      }
    }
    osMetrics.getInstance().updateMetric(Analyze.DEDUPE_BY_RUN, 1);
    this.source.setSelectedItems(selected);

    let msg = 'Deduplicate-by finished. ';
    if (selected.length > 0) {
      msg += 'Found ' + selected.length + ' duplicates.';
    } else {
      msg += 'No duplicates found.';
    }
    AlertManager.getInstance().sendAlert(msg, AlertEventSeverity.INFO);
    this.close_();
  }

  /**
   * Change the selected config
   * @param {?angular.Scope.Event} event
   * @param {DedupeNode=} opt_dedupe
   * @param {Object=} opt_config
   * @private
   */
  setActive_(event, opt_dedupe, opt_config) {
    if (opt_dedupe) {
      this.currentDedupe = opt_dedupe;
      this.scope.selected = this.currentDedupe;
    }
    const config = opt_config ? opt_config : this.currentDedupe.getItem();
    this['activeConfig'] = angular.copy(config);
    if (!config.columns || !(config.columns.length > 0)) {
      this['activeConfig'].columns = [];
      this.addColumn(); // start the first column
    }
    this.numEmpty = this.findNumEmpty_(); // set empty baseline
    if (this.numEmpty == 0) {
      this.checkForDupesAndInvalid_(); // only check if no empty columns
    }
  }

  /**
   * Make sure active config has a name - empty name makes it disappear
   * @private
   * @suppress {accessControls}
   */
  useTempConfig_() {
    this.addConfig(undefined, true);
  }

  /**
   * Adds a new config
   * @param {string} title
   * @export
   */
  stageConfig(title) {
    const newConfig = angular.copy(this['activeConfig']);
    newConfig.title = title ? title : 'dedupe ' + this.source.getTitle(true);
    this.addConfig(newConfig);
  }

  /**
   * Adds a new config
   * @param {Object=} opt_config
   * @param {boolean=} opt_nottemp
   * @export
   */
  addConfig(opt_config, opt_nottemp) {
    if (!opt_config && !opt_nottemp) {
      osMetrics.getInstance().updateMetric(Analyze.DEDUPE_BY_CREATE, 1);
    }
    const newConfig = opt_config ? opt_config : {'title': 'dedupe ' + this.source.getTitle(true)};
    let newdupe = undefined;
    if (!opt_nottemp) {
      newdupe = new DedupeNode(newConfig);
      this.scope['dedupes'].addChild(newdupe);
      this.selectNode_(newdupe);
    } else {
      this.setActive_(null, newdupe, newConfig);
    }
    if (this.scope['dedupes'].hasChildren() && this.scope['dedupes'].getChildren().length == 1) {
      this.adjustSize();
    }
    this.saveConfig_();
  }

  /**
   * Removes a config
   * @param {angular.Scope.Event} event
   * @param {DedupeNode} dedupe
   * @private
   */
  removeConfig_(event, dedupe) {
    const selected = this.scope['selected'];
    const removeSelected = selected == dedupe;
    const children = this.scope['dedupes'].getChildren();
    const selectedIndex = children.indexOf(selected);
    this.scope['dedupes'].removeChild(dedupe);
    dedupe.dispose();
    if (this.scope['dedupes'].hasChildren()) { // what is the next active config?
      if (!removeSelected) {
        this.selectNode_(selected);
      } else {
        this.selectNode_(children[selectedIndex >= children.length ? selectedIndex - 1 : selectedIndex]);
      }
    } else {
      this.useTempConfig_(); // no configs!
      this.adjustSize();
    }
    this.saveConfig_();
  }

  /**
   * Selects a node, uses a delay to overcome a bug in slicktree
   * @param {DedupeNode} node
   * @private
   */
  selectNode_(node) {
    const selectDelay = new Delay(function() {
      this.scope['selected'] = node;
      apply(this.scope);
    }, 10, this);
    selectDelay.start();
  }

  /**
   * Copies a config
   * @param {angular.Scope.Event} event
   * @param {Object=} opt_config
   * @private
   */
  copyConfig_(event, opt_config) {
    const newConfig = angular.copy(opt_config ? opt_config : this['activeConfig']);
    newConfig['title'] = newConfig['title'] + ' (copy)';
    this.addConfig(newConfig);
  }

  /**
   * Check if the current config is vaild
   * @param {Object=} opt_config
   * @return {boolean}
   * @export
   */
  isValid(opt_config) {
    if (!opt_config) {
      return this.numEmpty == 0 && this.hasNoDupes && this.allColsValid;
    }
    return this.findNumEmpty_(opt_config) == 0 && this.checkForDupesAndInvalid_(opt_config);
  }

  /**
   * Check if the current config is vaild
   * @return {boolean}
   * @export
   */
  isValidSave() {
    return this.isValid() && this['activeConfig'].title;
  }

  /**
   * Gets the status
   * @return {string}
   * @suppress {accessControls}
   * @export
   */
  getStatus() {
    let msg = '';
    if (!this.isValidSave()) {
      msg = '<i class="fa fa-warning text-warning"></i>&nbsp;';
      if (!this['activeConfig'].title) {
        msg += 'Cannot save config with blank name';
      } else if (this.numEmpty != 0) {
        msg += 'Choose a column';
      } else if (!this.hasNoDupes) {
        msg += 'Duplicate column';
      } else if (!this.allColsValid) {
        let srcName = this.source.getTitle(true);
        srcName = srcName.length < 20 ? srcName : srcName.substr(0, 18) + '...';
        msg += 'Not all columns valid for ' + srcName;
      }
    }
    return msg;
  }

  /**
   * Launch
   * @private
   */
  launchForm_() {
    const options = /** @type {!osx.window.ConfirmTextOptions} */ ({
      confirm: this.stageConfig.bind(this),
      defaultValue: /** @type {string} */ (this['activeConfig']['title']),
      prompt: 'Choose a name for the deduplicate configuration:',
      windowOptions: /** @type {!osx.window.WindowOptions} */ ({
        label: 'Choose Name'
      })
    });

    ConfirmTextUI.launchConfirmText(options);
  }
}

/**
 * Starts the dedupe process for the provided source
 * @param {VectorSource} source The source
 */
export const launchDedupeUI = (source) => {
  const windowId = 'mistDedupe';
  if (window.exists(windowId)) {
    window.bringToFront(windowId);
  } else {
    const scopeOptions = {
      'source': source
    };

    const windowOptions = {
      'id': windowId,
      'label': 'Deduplicate-By',
      'icon': 'fa fa-sitemap fa-rotate-90',
      'x': 'center',
      'y': 'center',
      'width': '550',
      'height': '400',
      'show-close': true,
      'modal': true
    };

    const template = '<mistdedupe></mistdedupe>';
    window.create(windowOptions, template, undefined, undefined, undefined, scopeOptions);
  }
};
