goog.declareModuleId('plugin.places.ext.menu');

const {assert} = goog.require('goog.asserts');
const listMenu = goog.require('mist.menu.list');
const instanceOf = goog.require('os.instanceOf');
const VectorSource = goog.require('os.source.Vector');
const placesPlugin = goog.require('plugin.places');
const placesEventType = goog.require('plugin.places.EventType');
const {launchSavePlaces} = goog.require('plugin.places.ui.launchSavePlaces');

const MenuEvent = goog.requireType('os.ui.menu.MenuEvent');
const MenuItem = goog.requireType('os.ui.menu.MenuItem');


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
