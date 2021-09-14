goog.declareModuleId('plugin.im.action.feature.ext.menu');

import {EventType, Metrics} from './featureactionext.js';
import {EXPORT_PROPERTY} from '../../mist/analyze/analyze.js';
import * as countByMenu from '../../mist/menu/countbymenu.js';
import * as CountByUI from '../../tools/ui/countby.js';

import * as dispatcher from 'opensphere/src/os/dispatcher.js';
import {inIframe} from 'opensphere/src/os/os.js';
import {getFilterColumns} from 'opensphere/src/os/source/source.js';

const action = goog.require('os.im.action');
const AlertManager = goog.require('os.alert.AlertManager');
const AlertEventSeverity = goog.require('os.alert.AlertEventSeverity');
const {assert} = goog.require('goog.asserts');
const featureAction = goog.require('plugin.im.action.feature');
const googObject = goog.require('goog.object');
const ImportActionEvent = goog.require('os.im.action.ImportActionEvent');
const ImportActionEventType = goog.require('os.im.action.ImportActionEventType');
const ImportActionManager = goog.require('os.im.action.ImportActionManager');
const IImportSource = goog.require('os.source.IImportSource');
const instanceOf = goog.require('os.instanceOf');
const {launchEditFeatureAction} = goog.require('plugin.im.action.feature.ui');
const osImplements = goog.require('os.implements');

const Entry = goog.requireType('plugin.im.action.feature.Entry');
const IHistogramUI = goog.requireType('os.ui.IHistogramUI');
const ISource = goog.requireType('os.source.ISource');
const Menu = goog.requireType('os.ui.menu.Menu');
const MenuItem = goog.requireType('os.ui.menu.MenuItem');
const MenuEvent = goog.requireType('os.ui.menu.MenuEvent');


/**
 * Counter for feature actions generated from a Count By.
 * @type {number}
 */
let cbActionCount = 1;

/**
 * Sets up import actions in the Layers window.
 */
export const countBySetup = () => {
  const menu = countByMenu.MENU;
  if (menu) {
    const root = menu.getRoot();
    const group = root.find(countByMenu.GroupLabel.FILTER);
    assert(group, 'Group "' + countByMenu.GroupLabel.TOOLS + '" should exist! Check spelling?');

    group.addChild({
      eventType: EventType.CREATE_FROM_COUNTBY,
      label: 'Create Feature Action',
      tooltip: 'Create a new feature action with a filter generated from cascaded bins',
      icons: ['<i class="fa fa-fw ' + action.ICON + '"></i>'],
      metricKey: Metrics.CREATE_FROM_COUNTBY,
      beforeRender: visibleIfCanCreateFromHistoUI,
      handler: createFromCountBy
    });
  }
};

/**
 * Clean up buffer region listeners in the layers window.
 */
export const countByDispose = () => {
  if (countByMenu.MENU) {
    const group = countByMenu.MENU.getRoot().find(countByMenu.GroupLabel.FILTER);
    if (group) {
      group.removeChild(EventType.CREATE_FROM_COUNTBY);
    }
  }
};

/**
 * Checks if there are selected bins in the Count By to show/hide the Color Selected menu item.
 * @param {IHistogramUI=} opt_histoUi
 * @return {boolean}
 */
export const canCreateHistogramFilter = (opt_histoUi) => {
  if (opt_histoUi) {
    try {
      if (osImplements(opt_histoUi.getSource(), IImportSource.ID)) {
        const parent = opt_histoUi.getParent();

        // we can create a filter if the count by has selected bins, is cascaded and has cascaded bins, or the parent
        // is able to create a filter
        return opt_histoUi.hasSelectedBins() || (opt_histoUi.isCascaded() && opt_histoUi.hasCascadedBins()) ||
            canCreateHistogramFilter(parent);
      }
    } catch (e) {
      // wasn't a histogram controller? fall through to return false
    }
  }

  return false;
};

/**
 * Shows a menu item if a feature action can be created from a histogram UI.
 * @this {MenuItem}
 * @param {Menu} context The context menu.
 * @param {IHistogramUI} ctrl The histogram UI.
 */
const visibleIfCanCreateFromHistoUI = function(context, ctrl) {
  this.visible = false;

  if (ctrl) {
    try {
      if (osImplements(ctrl.getSource(), IImportSource.ID)) {
        const parent = ctrl.getParent();

        // we can create a filter if:
        //  - the histogram has selected bins
        //  - the histogram is cascaded and has cascaded bins
        //  - the parent is able to create a filter
        this.visible = ctrl.hasSelectedBins() || (ctrl.isCascaded() && ctrl.hasCascadedBins()) ||
            canCreateHistogramFilter(parent);
      }
    } catch (e) {
      // wasn't a histogram controller? fall through to give false
    }
  }
};


/**
 * Create a feature action from a Count By.
 * @param {MenuEvent} event The event.
 */
export const createFromCountBy = (event) => {
  let countBy = event.target;
  if (!instanceOf(countBy, CountByUI.NAME)) {
    countBy = event.getContext();
  }
  const source = countBy ? countBy.getSource() : null;
  const container = countBy ? countBy.getContainer() : null;
  if (source && container) {
    const columns = getFilterColumns(source, true);
    if (columns) {
      const filterEntry = container.getFilter(columns);
      if (filterEntry) {
        const entry = ImportActionManager.getInstance().createActionEntry();
        entry.restore(filterEntry.persist());
        entry.setTitle('Count By Action ' + cbActionCount++);

        const sourceId = source.getId();
        entry.setType(sourceId);

        let editActionFn;
        if (inIframe()) {
          // for internal analyze, launch the edit in the main window
          editActionFn = /** @type {Function|undefined} */ (googObject.getValueByKeys(
              window, EXPORT_PROPERTY, 'functions', 'launchFeatureActionEdit'));
        }

        if (!editActionFn) {
          editActionFn = launchEditFeatureAction;
        }

        const callback = onEntryReady.bind(undefined, source);
        editActionFn(sourceId, columns, callback, entry);
      }
    }
  }
};


/**
 * Handle user saving the feature action.
 * @param {ISource} source The source.
 * @param {Entry} entry The feature action entry.
 */
const onEntryReady = (source, entry) => {
  if (entry && source) {
    const event = new ImportActionEvent(ImportActionEventType.ADD_ENTRY, entry, true);
    dispatcher.getInstance().dispatchEvent(event);

    const layerName = source ? ('<strong>' + source.getTitle() + '</strong>') : 'the selected data source';
    AlertManager.getInstance().sendAlert(
        'Created a new ' + featureAction.ENTRY_TITLE + ' for ' + layerName + '.',
        AlertEventSeverity.SUCCESS);
  }
};
