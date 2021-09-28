goog.declareModuleId('plugin.places.ext.menu');

import instanceOf from 'opensphere/src/os/instanceof.js';
import VectorSource from 'opensphere/src/os/source/vectorsource.js';
import placesEventType from 'opensphere/src/plugin/places/eventtype.js';
import * as placesPlugin from 'opensphere/src/plugin/places/places.js';
import {launchSavePlaces} from 'opensphere/src/plugin/places/ui/launchsaveplaces.js';
import * as listMenu from '../../../mist/menu/listmenu.js';

const {assert} = goog.require('goog.asserts');

const {default: MenuEvent} = goog.requireType('os.ui.menu.MenuEvent');
const {default: MenuItem} = goog.requireType('os.ui.menu.MenuItem');


/**
 * Set up places listeners in the list tool.
 */
export const listSetup = function() {
  if (!listMenu.MENU) {
    listMenu.setup();
  }

  const menu = listMenu.MENU;
  const root = menu.getRoot();
  const group = root.find(listMenu.GroupLabel.TOOLS);

  assert(group, 'Group "' + listMenu.GroupLabel.TOOLS + '" should exist! Check spelling?');

  group.addChild({
    eventType: placesEventType.SAVE_TO,
    label: 'Save to Places...',
    tooltip: 'Creates a new saved place from the selected feature',
    icons: ['<i class="fa fa-fw ' + placesPlugin.ICON + '"></i>'],
    beforeRender: canSaveListToPlaces,
    handler: saveListToPlaces
  });
};


/**
 * Clean up places listeners in the list tool.
 */
export const listDispose = function() {
  if (listMenu.MENU) {
    const group = listMenu.MENU.getRoot().find(listMenu.GroupLabel.TOOLS);
    if (group) {
      group.removeChild(placesEventType.SAVE_TO);
    }
  }
};


/**
 * Check if a source can be saved to Places.
 * @param {VectorSource} context The menu context.
 * @this {MenuItem}
 */
const canSaveListToPlaces = function(context) {
  this.visible = false;

  if (instanceOf(context, VectorSource.NAME)) {
    // can launch a save dialog for a source
    const source = /** @type {!VectorSource} */ (context);
    this.visible = source.getId() !== placesPlugin.ID;
  }
};


/**
 * Handle "Save to Places" event from the list menu.
 * @param {MenuEvent} event The action event.
 */
const saveListToPlaces = function(event) {
  const context = event.getContext();
  if (context && instanceOf(context, VectorSource.NAME)) {
    const source = /** @type {!VectorSource} */ (context);
    launchSavePlaces(source);
  }
};
