goog.module('tools.ui.SourceSwitcherUI');
goog.module.declareLegacyNamespace();

goog.require('goog.events.EventType');
goog.require('mist.mixin.vectorsource');
goog.require('mist.ui.widget');
goog.require('ol.events');

const Module = goog.require('tools.ui.Module');
const SourceManager = goog.require('os.data.SourceManager');
const Timer = goog.require('goog.Timer');
const layout = goog.require('coreui.layout');
const osSource = goog.require('os.source');
const ui = goog.require('os.ui');
const {Event: NavEvent} = goog.require('tools.ui.nav');
const {ROOT} = goog.require('tools');

const ISource = goog.requireType('os.source.ISource');


/**
 * The source switcher directive
 * @return {angular.Directive}
 */
const directive = () => ({
  restrict: 'AE',
  replace: true,
  templateUrl: ROOT + 'views/tools/sourceswitcher.html',
  controller: Controller,
  controllerAs: 'srcSwitch'
});


/**
 * Add the directive to the tools module
 */
Module.directive('sourceswitcher', [directive]);



/**
 * Controller class for the source switcher
 * @unrestricted
 */
class Controller extends SourceManager {
  /**
   * Constructor.
   * @param {!angular.Scope} $scope
   * @param {!angular.JQLite} $element
   * @ngInject
   */
  constructor($scope, $element) {
    super();

    // use the base update events, and add the show in analyze event
    this.updateEvents = this.updateEvents.slice();
    this.updateEvents.push(osSource.SHOW_ANALYZE);

    // show the source if it is visible, and flagged to show in analyze
    this.validationFunctions = [
      osSource.isEnabled,
      osSource.isVisible,
      osSource.showInAnalyze
    ];

    /**
     * @type {?angular.Scope}
     * @private
     */
    this.scope_ = $scope;

    /**
     * Create new objects for Angular to use in the select so we don't run into weird uid collisions when multiple
     * Analyze windows are open.
     * @type {!Array<!Object>}
     */
    this.scope_['sources'] = [];

    /**
     * If the source changed warning should be displayed.
     * @type {boolean}
     */
    this['enableWarning'] = false;

    this.init();

    $scope.$on(NavEvent.PREV_SOURCE, this.onPrevSource.bind(this));
    $scope.$on(NavEvent.NEXT_SOURCE, this.onNextSource.bind(this));
    $scope.$on(NavEvent.SOURCE, this.onSource.bind(this));

    $scope.$on('$destroy', this.dispose.bind(this));
  }

  /**
   * @inheritDoc
   */
  disposeInternal() {
    super.disposeInternal();

    this.scope_['sources'] = null;
    this.scope_ = null;
  }

  /**
   * Initialize the selected source.
   * @protected
   */
  initSource() {
    if (this.scope_) {
      var sources = this.scope_['sources'];
      if (sources.length > 0) {
        this.scope_['source'] = null;

        // find the first non-empty source
        for (var i = 0; i < sources.length; i++) {
          if (sources[i].getFeatureCount() > 0) {
            this.scope_['source'] = sources[i];
            break;
          }
        }

        // if all sources are empty, just pick the first one in the list
        if (!this.scope_['source']) {
          this.scope_['source'] = sources[0];
        }
      }
    }
  }

  /**
   * @inheritDoc
   */
  addSource(source) {
    super.addSource(source);

    if (this.scope_ && this.scope_['sources'] && this.scope_['sources'].indexOf(source) === -1) {
      this.scope_['sources'].push(source);
      this.scope_['sources'].sort(osSource.titleCompare);

      if (!this.scope_['source']) {
        this.scope_['source'] = source;
      }
    }
  }

  /**
   * @inheritDoc
   */
  removeSource(source) {
    super.removeSource(source);

    if (this.scope_) {
      goog.array.remove(this.scope_['sources'], source);

      if (this.scope_['source'] == source) {
        this.initSource();

        // only enable the warning if the currently selected source is being removed
        this['enableWarning'] = true;
      }

      this.onUpdateDelay();
    }
  }

  /**
   * @inheritDoc
   */
  onUpdateDelay() {
    if (this.scope_) {
      var title = 'Analyze';
      if (this.scope_['source']) {
        title = this.scope_['source'].getTitle();
      }
      document.title = title;

      // clear the active Golden Layout component when the source is changed
      layout.setActiveComponentId(undefined);

      this.scope_.$emit(NavEvent.SOURCE, this.scope_['source']);

      ui.apply(this.scope_, 0);
    }
  }

  /**
   * Handle the next source event.
   * @param {angular.Scope.Event} event The Angular event.
   * @protected
   */
  onNextSource(event) {
    if (this.scope_ && this.scope_['sources'].length) {
      var idx = this.scope_['sources'].indexOf(this.scope_['source']);
      if (idx == 0) {
        idx = this.scope_['sources'].length;
      }
      this.scope_['source'] = this.scope_['sources'][idx - 1];
      this.onUpdateDelay();
    }
  }

  /**
   * Handle the previous source event.
   * @param {angular.Scope.Event} event The Angular event.
   * @protected
   */
  onPrevSource(event) {
    if (this.scope_ && this.scope_['sources'].length) {
      var idx = this.scope_['sources'].indexOf(this.scope_['source']) + 1;
      if (idx == this.scope_['sources'].length) {
        idx = 0;
      }
      this.scope_['source'] = this.scope_['sources'][idx];
      this.onUpdateDelay();
    }
  }

  /**
   * Handles source change events.
   * @param {angular.Scope.Event} event The Angular event.
   * @param {ISource} source The new source.
   * @protected
   */
  onSource(event, source) {
    if (this.scope_['source'] !== source) {
      this.scope_['source'] = source;
      this.onUpdateDelay();
    }
  }

  /**
   * Gets a label for a source
   * @param {?ISource} item
   * @return {string} The title of the source
   * @export
   */
  getTitle(item) {
    if (item) {
      return item.getTitle();
    }

    return '';
  }

  /**
   * Gets the status
   * @param {boolean=} opt_immediate Ignore the timeout and clear the warning immediately.  Defaults to false.
   * @export
   */
  clearWarning(opt_immediate) {
    if (this['enableWarning'] == true) {
      if (opt_immediate) {
        // don't provide a delay, just clear the warning
        this['enableWarning'] = false;
        this.onUpdateDelay();
      } else {
        // kick off a timer so that there is a little delay
        var toggleTimer = function() {
          this['enableWarning'] = false;
          this.onUpdateDelay();
        };
        Timer.callOnce(toggleTimer, 5000, this);
      }
    }
  }

  /**
   * When the user selects a new source, update the UI to make the tab name match
   * @export
   */
  onSourceSelection() {
    this.onUpdateDelay();
  }
}

exports = {
  Controller,
  directive
};
