goog.declareModuleId('mist.ui.DedupeNodeUI');

const {Analyze} = goog.require('mist.metrics.keys');
const Module = goog.require('os.ui.Module');
const AbstractNodeUICtrl = goog.require('os.ui.slick.AbstractNodeUICtrl');
const {ROOT} = goog.require('tools');

const {DedupeNode} = goog.requireType('mist.ui.DedupeNode');


/**
 * The selected/highlighted node UI directive for dedupes
 * @return {angular.Directive}
 */
export const directive = () => ({
  restrict: 'AE',
  replace: true,
  templateUrl: ROOT + 'views/tools/dedupenodeui.html',
  controller: Controller,
  controllerAs: 'nodeUi'
});

/**
 * Add the directive to the module
 */
Module.directive('dedupenodeui', [directive]);

/**
 * Controller for selected/highlighted node UI
 * @unrestricted
 */
export class Controller extends AbstractNodeUICtrl {
  /**
   * Constructor.
   * @param {!angular.Scope} $scope
   * @param {!angular.JQLite} $element
   * @ngInject
   */
  constructor($scope, $element) {
    super($scope, $element);
    this.scope.$watch('selected', this.select.bind(this));
  }

  /**
   * Handle changes to columns on the scope.
   * @param {DedupeNode=} opt_new The new node
   * @param {DedupeNode=} opt_old The old node
   * @protected
   */
  select(opt_new, opt_old) {
    if (this.scope && this.scope['selected']) {
      const dedupe = /** @type {DedupeNode} */ (this.scope['item']);
      const selected = /** @type {DedupeNode} */ (this.scope['selected']);
      if (selected === dedupe) {
        this.scope.$emit('dedupeActive', dedupe);
      }
    }
  }

  /**
   * Removes the dedupe
   * @export
   */
  remove() {
    const dedupe = /** @type {DedupeNode} */ (this.scope['item']);
    this.scope.$emit('dedupeRemove', dedupe);
    os.metrics.Metrics.getInstance().updateMetric(Analyze.DEDUPE_BY_REMOVE, 1);
  }

  /**
   * Copy a thing
   * @export
   */
  copy() {
    const dedupe = /** @type {DedupeNode} */ (this.scope['item']);
    this.scope.$emit('dedupeCopy', dedupe.getItem());
    os.metrics.Metrics.getInstance().updateMetric(Analyze.DEDUPE_BY_COPY, 1);
  }

  /**
   * Show that the config doesn't match the source
   * @return {boolean}
   * @export
   */
  showInvalid() {
    const dedupe = /** @type {DedupeNode} */ (this.scope['item']).getItem();
    return dedupe.invalid;
  }
}

/**
 * Return html used for the ui
 * @return {string}
 */
export const getNodeUi = function() {
  return '<dedupenodeui></dedupenodeui>';
};
