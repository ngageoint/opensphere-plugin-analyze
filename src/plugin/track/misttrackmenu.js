goog.declareModuleId('plugin.mist.track.menu');

import * as Dispatcher from 'opensphere/src/os/dispatcher.js';
import {getFilterColumns} from 'opensphere/src/os/source/source.js';
import PlacesManager from 'opensphere/src/plugin/places/placesmanager.js';
import TrackEventType from 'opensphere/src/plugin/track/eventtype.js';
import * as TrackPlugin from 'opensphere/src/plugin/track/track.js';
import TrackEvent from 'opensphere/src/plugin/track/trackevent.js';
import TrackManager from 'opensphere/src/plugin/track/trackmanager.js';
import * as TrackMenu from 'opensphere/src/plugin/track/trackmenu.js';
import TrackMetrics from 'opensphere/src/plugin/track/trackmetrics.js';
import * as countByMenu from '../../mist/menu/countbymenu.js';
import * as listMenu from '../../mist/menu/listmenu.js';
import {LAYER_TITLE} from './constants.js';
import {MistTrackEventType} from './eventtype.js';
import {createFromBinEvent} from './misttrack.js';
import {ExpandTrackCtrl} from './misttrackexpand.js';
import {Keys} from './misttrackmetrics.js';
import {checkQueryTrack, requestTrack} from './misttrackquery.js';

const {addToTrack, getSortField, isTrackFeature, promptForTitle} = goog.require('os.track');
const AlertEventSeverity = goog.require('os.alert.AlertEventSeverity');
const AlertManager = goog.require('os.alert.AlertManager');
const {assert} = goog.require('goog.asserts');
const BaseFilterManager = goog.require('os.filter.BaseFilterManager');
const {createFilter, filterValidControllers} = goog.require('os.data.histo');
const Feature = goog.require('ol.Feature');
const FilterEntry = goog.require('os.filter.FilterEntry');
const MapContainer = goog.require('os.MapContainer');
const MenuItemType = goog.require('os.ui.menu.MenuItemType');
const osFeatureMenu = goog.require('os.ui.menu.feature');
const osInstanceOf = goog.require('os.instanceOf');
const osLayerMenu = goog.require('os.ui.menu.layer');
const osListMenu = goog.require('os.ui.menu.list');
const osSpatialMenu = goog.require('os.ui.menu.spatial');
const VectorSource = goog.require('os.source.Vector');

const CountByContainerUI = goog.requireType('tools.ui.CountByContainerUI');
const CountByUI = goog.requireType('tools.ui.CountByUI');
const CreateOptions = goog.requireType('os.track.CreateOptions');
const ILayer = goog.requireType('os.layer.ILayer');
const ISource = goog.requireType('os.source.ISource');
const Menu = goog.requireType('os.ui.menu.Menu');
const MenuEvent = goog.requireType('os.ui.menu.MenuEvent');
const MenuItem = goog.requireType('os.ui.menu.MenuItem');


/**
 * Context menu submenu for grouped actions.
 * @type {string}
 * @const
 */
const GROUP = 'Tracks';

/**
 * Sets up track actions in the Count By.
 */
export const countBySetup = function() {
  const menu = countByMenu.MENU;
  if (menu) {
    const root = menu.getRoot();
    const group = root.find(countByMenu.GroupLabel.TOOLS);
    assert(group, 'Group "' + countByMenu.GroupLabel.TOOLS + '" should exist! Check spelling?');

    group.addChild({
      label: GROUP,
      icons: ['<i class="fa fa-fw fa-share-alt"></i>'],
      type: MenuItemType.SUBMENU,
      children: [
        {
          eventType: countByMenu.PREFIX + TrackEventType.CREATE_TRACK,
          label: 'Create Single',
          tooltip: 'Create a single track that combines all features in the Count By. The track will be created by ' +
            'linking all features in time order. Operates on selected bins, or all bins if none are selected.',
          icons: ['<i class="fa fa-fw fa-share-alt"></i>'],
          metricKey: Keys.CREATE_SINGLE_COUNTBY,
          handler: handleCountByAction,
          sort: 0
        },
        {
          eventType: countByMenu.PREFIX + MistTrackEventType.CREATE_TRACKS,
          label: 'Create Multiple',
          tooltip: 'Create a new track for each bin in the Count By. Each track will be created by linking bin ' +
            'features in time order. Operates on selected bins, or all bins if none are selected.',
          icons: ['<i class="fa fa-fw fa-share-alt"></i>'],
          metricKey: Keys.CREATE_MULTI_COUNTBY,
          handler: handleCountByAction,
          sort: 1
        },
        {
          eventType: countByMenu.PREFIX + TrackEventType.ADD_TO,
          label: 'Add Selected to Track...',
          tooltip: 'Adds features in selected bins to an existing track.',
          icons: ['<i class="fa fa-fw fa-share-alt"></i>'],
          metricKey: Keys.ADD_TO_COUNTBY,
          beforeRender: visibleIfHasTrackAndCountBySelection,
          handler: handleCountByAction,
          sort: 2
        }
      ]
    });
  }
};

/**
 * Show a menu item if one or more tracks exist and the menu source has a selection.
 * @param {Menu} context The context menu.
 * @param {CountByUI.Controller} ctrl The count by controller.
 * @this {MenuItem}
 */
const visibleIfHasTrackAndCountBySelection = function(context, ctrl) {
  this.visible = false;

  // only show this option when tracks exist and the source has one or more selected features
  const trackNode = PlacesManager.getInstance().getPlacesRoot();
  if (trackNode && trackNode.hasFeatures()) {
    this.visible = countByMenu.hasSelection(ctrl);
  }
};

/**
 * Handle track actions from the Count By.
 * @param {MenuEvent} event The event
 */
const handleCountByAction = function(event) {
  const countBy = /** @type {CountByUI.Controller} */ (event.target);
  const container = /** @type {CountByContainerUI.Controller} */ (countBy ? countBy.getContainer() : null);
  const source = countBy ? countBy.getSource() : null;
  if (countBy && container && source) {
    let bins;
    const eventType = event.type.replace(countByMenu.PREFIX_REGEXP, '');
    switch (eventType) {
      case TrackEventType.CREATE_TRACK:
      case MistTrackEventType.CREATE_TRACKS:
        const histogram = countBy.getHistogram();
        bins = countBy.getSelectedBins();
        if (!bins || bins.length == 0) {
          bins = histogram.getResults();
        }

        if (bins && bins.length > 0) {
          const testFeature = bins[0].getItems()[0];
          if (testFeature && osInstanceOf(testFeature, Feature.NAME)) {
            getSortField(/** @type {!Feature} */ (testFeature)).then(function(sortField) {
              const binMethod = histogram.getBinMethod();
              const field = binMethod ? binMethod.getField() : 'Unknown Column';

              // create the base event
              const trackEvent = new TrackEvent(eventType);
              trackEvent.bins = bins;
              trackEvent.title = field;
              trackEvent.sortField = sortField;
              trackEvent.sourceId = source.getId();

              // create filters from the count by to enable querying additional track features
              const filterable = BaseFilterManager.getInstance().getFilterable(source.getId());
              const isFilterable = filterable != null && filterable.isFilterable();
              if (isFilterable) {
                const columns = getFilterColumns(source, false) || [];
                const countBys = filterValidControllers(container.getHistogramUIs(countBy), columns, true);

                if (eventType === TrackEventType.CREATE_TRACK) {
                  // creating a single track, so create one filter for it
                  const filter = createFilter(countBys, columns, true);
                  if (filter) {
                    trackEvent.filters = [filter];
                  }
                } else {
                  // creating multiple tracks, so create one filter per track
                  const filters = [];
                  let baseFilter = '<And></And>';
                  if (countBys.length > 1) {
                    countBys.pop();

                    const parentFilter = createFilter(countBys, columns, true);
                    if (parentFilter) {
                      baseFilter = parentFilter.getFilter();
                    }
                  }

                  for (let i = 0; i < bins.length; i++) {
                    const bin = bins[i];
                    const binFilter = binMethod.exportAsFilter([bin]);
                    if (binFilter) {
                      // add the bin filter to the end of the base filter
                      const combinedFilter = baseFilter.replace(/(<\/(And|Or)>)$/, binFilter + '$1');

                      const entry = new FilterEntry();
                      entry.setEnabled(true);
                      entry.setFilter(combinedFilter);

                      filters.push(entry);
                    }
                  }

                  trackEvent.filters = filters;
                }
              }

              // fire the event to create the track
              Dispatcher.getInstance().dispatchEvent(trackEvent);
            });
          }
        } else {
          AlertManager.getInstance().sendAlert('No bins available to create tracks.', AlertEventSeverity.WARNING);
        }
        break;
      case TrackEventType.ADD_TO:
        bins = countBy.getSelectedBins();
        if (bins && bins.length > 0) {
          let features = [];
          for (let i = 0; i < bins.length; i++) {
            features = features.concat(bins[i].getItems());
          }

          if (features.length > 0) {
            const tm = TrackManager.getInstance();
            tm.promptForTrack().then(function(track) {
              if (track) {
                const trackEvent = new TrackEvent(TrackEventType.ADD_TO);
                trackEvent.track = track;
                trackEvent.features = features;

                Dispatcher.getInstance().dispatchEvent(trackEvent);
              }
            });
          }
        }
        break;
      default:
        break;
    }
  }
};

/**
 * Add track items to the layer menu.
 */
export const layerSetup = function() {
  const menu = osLayerMenu.getMenu();
  if (menu && !menu.getRoot().find(MistTrackEventType.EXPAND_TRACK)) {
    const group = menu.getRoot().find(osLayerMenu.GroupLabel.TOOLS);
    assert(group, 'Group should exist! Check spelling?');

    group.addChild({
      label: 'Query Track',
      tooltip: 'Query the track, outside the current spatial/temporal boundaries.',
      icons: ['<i class="fa fa-fw fa-download"></i>'],
      type: MenuItemType.SUBMENU,
      beforeRender: TrackMenu.visibleIfTrackNode,
      sort: 225, // this places the option between Follow Track and Hide Track Line
      children: [
        {
          eventType: MistTrackEventType.EXPAND_TRACK_DAY,
          label: '+/- Day',
          tooltip: 'Query more data for the track by adding a day before and a day after the track time range',
          icons: ['<i class="fa fa-fw fa-calendar"></i>'],
          metricKey: Keys.LAYERS_EXPAND_TRACK_DAY,
          handler: goog.partial(handleLayerQueryTrackEvent, 24 * 60 * 60 * 1000),
          sort: 0
        }, {
          eventType: MistTrackEventType.EXPAND_TRACK_WEEK,
          label: '+/- Week',
          tooltip: 'Query more data for the track, adding a week before and a week after the track time range',
          icons: ['<i class="fa fa-fw fa-calendar"></i>'],
          metricKey: Keys.LAYERS_EXPAND_TRACK_WEEK,
          handler: goog.partial(handleLayerQueryTrackEvent, 24 * 60 * 60 * 1000 * 7),
          sort: 1
        }, {
          eventType: MistTrackEventType.EXPAND_TRACK_MONTH,
          label: '+/- Month',
          tooltip: 'Query more data for the track by adding a month (30 days) before and after the track time range',
          icons: ['<i class="fa fa-fw fa-calendar"></i>'],
          metricKey: Keys.LAYERS_EXPAND_TRACK_MONTH,
          handler: goog.partial(handleLayerQueryTrackEvent, 24 * 60 * 60 * 1000 * 30),
          sort: 2
        }, {
          eventType: MistTrackEventType.EXPAND_TRACK,
          label: 'Custom...',
          tooltip: 'Pick a custom date range',
          icons: ['<i class="fa fa-fw fa-calendar"></i>'],
          metricKey: Keys.LAYERS_EXPAND_TRACK,
          handler: goog.partial(handleLayerQueryTrackEvent, 0),
          sort: 3
        }
      ]
    });
  }
};

/**
 * Set up track items in the spatial menu.
 */
export const spatialSetup = function() {
  const menu = osSpatialMenu.getMenu();
  if (menu && !menu.getRoot().find(MistTrackEventType.EXPAND_TRACK)) {
    const group = menu.getRoot().find(osSpatialMenu.Group.FEATURES);
    assert(group, 'Group "' + osSpatialMenu.Group.FEATURES + '" should exist! Check spelling?');

    group.addChild({
      label: 'Query Track',
      tooltip: 'Query more data for the track, outside the current spatial/temporal boundaries.',
      icons: ['<i class="fa fa-fw fa-download"></i>'],
      type: MenuItemType.SUBMENU,
      beforeRender: TrackMenu.visibleIfTrackFeature,
      sort: 70,
      children: [
        {
          eventType: MistTrackEventType.EXPAND_TRACK_DAY,
          label: '+/- Day',
          tooltip: 'Query more data for the track by adding a day before and a day after the track time range',
          icons: ['<i class="fa fa-fw fa-calendar"></i>'],
          metricKey: Keys.MAP_EXPAND_TRACK_DAY,
          handler: goog.partial(handleExpandTrackEvent, 24 * 60 * 60 * 1000),
          sort: 0
        }, {
          eventType: MistTrackEventType.EXPAND_TRACK_WEEK,
          label: '+/- Week',
          tooltip: 'Query more data for the track by adding a week before and a week after the track time range',
          icons: ['<i class="fa fa-fw fa-calendar"></i>'],
          metricKey: Keys.MAP_EXPAND_TRACK_WEEK,
          handler: goog.partial(handleExpandTrackEvent, 24 * 60 * 60 * 1000 * 7),
          sort: 1
        }, {
          eventType: MistTrackEventType.EXPAND_TRACK_MONTH,
          label: '+/- Month',
          tooltip: 'Query more data for the track by adding a month (30 days) before and after the track time range',
          icons: ['<i class="fa fa-fw fa-calendar"></i>'],
          metricKey: Keys.MAP_EXPAND_TRACK_MONTH,
          handler: goog.partial(handleExpandTrackEvent, 24 * 60 * 60 * 1000 * 30),
          sort: 2
        }, {
          eventType: MistTrackEventType.EXPAND_TRACK,
          label: 'Custom...',
          tooltip: 'Pick a custom date range',
          icons: ['<i class="fa fa-fw fa-calendar"></i>'],
          metricKey: Keys.MAP_EXPAND_TRACK,
          handler: goog.partial(handleExpandTrackEvent, 0),
          sort: 3
        }
      ]
    });
  }
};

/**
 * Handle the expand track menu event from the layer menu.
 * @param {number} time The amount of time, in milliseconds, to query before and after the track range
 * @param {!MenuEvent<osLayerMenu.Context>} event The menu event.
 */
export const handleLayerQueryTrackEvent = function(time, event) {
  const context = event.getContext();
  if (Array.isArray(context) && context.length > 0) {
    for (let i = 0; i < context.length; i++) {
      const trackNodes = TrackMenu.getTrackNodes([context[i]]);
      if (trackNodes.length) {
        const track = trackNodes[0].getFeature();
        if (track && checkQueryTrack(track)) {
          if (time > 0) {
            requestTrack(track, time);
          } else {
            ExpandTrackCtrl.launch(track);
          }
        }
      }
    }
  }
};

/**
 * Handle the expand track menu event.
 * @param {number} time The amount of time, in milliseconds, to query before and after the track range
 * @param {!MenuEvent<Object|undefined>} event The menu event.
 */
export const handleExpandTrackEvent = function(time, event) {
  const context = event.getContext();
  if (context && context.feature && isTrackFeature(context.feature)) {
    if (time > 0) {
      requestTrack(/** @type {!Feature} */ (context.feature), time);
    } else {
      ExpandTrackCtrl.launch(/** @type {!Feature} */ (context.feature));
    }
  }
};

/**
 * Sets up track actions in the List tool.
 */
export const listSetup = function() {
  const menu = listMenu.MENU;
  if (menu) {
    const root = menu.getRoot();
    const group = root.find(osFeatureMenu.GroupLabel.TOOLS);
    assert(group, 'Group "' + listMenu.GroupLabel.TOOLS + '" should exist! Check spelling?');

    group.addChild({
      eventType: listMenu.PREFIX + TrackEventType.CREATE_TRACK,
      label: 'Create Track From Selection',
      tooltip: 'Creates a new track by linking selected features in time order.',
      icons: ['<i class="fa fa-fw fa-share-alt"></i>'],
      metricKey: Keys.CREATE_LIST,
      beforeRender: osListMenu.visibleIfHasSelected,
      handler: handleListAction_
    });

    group.addChild({
      eventType: listMenu.PREFIX + TrackEventType.ADD_TO,
      label: 'Add Selection to Track...',
      tooltip: 'Adds selected features to an existing track.',
      icons: ['<i class="fa fa-fw fa-share-alt"></i>'],
      handler: handleListAction_,
      metricKey: Keys.ADD_TO_LIST,
      beforeRender: visibleIfHasTrackAndListSelection
    });

    group.addChild({
      eventType: listMenu.PREFIX + TrackEventType.FOLLOW,
      label: 'Follow Track',
      tooltip: 'Follow the track as it animates.',
      icons: ['<i class="fa fa-fw fa-globe"></i>'],
      handler: TrackMenu.handleFollowTrackEvent,
      metricKey: TrackMetrics.Keys.FOLLOW_TRACK,
      beforeRender: TrackMenu.visibleIfIsNotFollowed
    });

    group.addChild({
      eventType: listMenu.PREFIX + TrackEventType.UNFOLLOW,
      label: 'Unfollow Track',
      tooltip: 'Adds selected features to an existing track.',
      icons: ['<i class="fa fa-fw fa-globe"></i>'],
      handler: TrackMenu.handleUnfollowTrackEvent,
      metricKey: TrackMetrics.Keys.UNFOLLOW_TRACK,
      beforeRender: TrackMenu.visibleIfIsFollowed
    });

    group.addChild({
      eventType: listMenu.PREFIX + TrackEventType.HIDE_LINE,
      label: 'Hide Track Line',
      tooltip: 'Do not show the track line.',
      icons: ['<i class="fa fa-fw fa-level-up"></i>'],
      metricKey: TrackMetrics.Keys.HIDE_TRACK_LINE,
      sort: 100,
      handler: goog.partial(TrackMenu.setShowTrackLine, false),
      beforeRender: TrackMenu.visibleIfLineIsShown
    });

    group.addChild({
      eventType: listMenu.PREFIX + TrackEventType.SHOW_LINE,
      label: 'Show Track Line',
      tooltip: 'Show the track line.',
      icons: ['<i class="fa fa-fw fa-level-up"></i>'],
      metricKey: TrackMetrics.Keys.SHOW_TRACK_LINE,
      sort: 100,
      handler: goog.partial(TrackMenu.setShowTrackLine, true),
      beforeRender: TrackMenu.visibleIfLineIsHidden
    });

    group.addChild({
      eventType: listMenu.PREFIX + TrackEventType.ENABLE_INTERPOLATE_MARKER,
      label: 'Disable Track Interpolation',
      tooltip: 'Only move track marker when there is a supporting feature.',
      icons: ['<i class="fa fa-fw fa-star-half-o fa-rotate-270"></i>'],
      metricKey: TrackMetrics.Keys.ENABLE_INTERPOLATE_MARKER,
      beforeRender: TrackMenu.visibleIfMarkerInterpolationEnabled,
      handler: goog.partial(TrackMenu.setMarkerInterpolationEnabled, false)
    });

    group.addChild({
      eventType: listMenu.PREFIX + TrackEventType.DISABLE_INTERPOLATE_MARKER,
      label: 'Enable Track Interpolation',
      tooltip: 'Show the interpolated position of the track marker.',
      icons: ['<i class="fa fa-fw fa-star-half-o fa-rotate-270"></i>'],
      metricKey: TrackMetrics.Keys.DISABLE_INTERPOLATE_MARKER,
      beforeRender: TrackMenu.visibleIfMarkerInterpolationDisabled,
      handler: goog.partial(TrackMenu.setMarkerInterpolationEnabled, true)
    });
  }
};

/**
 * Show a menu item if one or more tracks exist and the menu source has a selection.
 * @param {VectorSource} context The menu context.
 * @this {MenuItem}
 */
const visibleIfHasTrackAndListSelection = function(context) {
  this.visible = false;

  // only show this option when tracks exist and the source has one or more selected features
  const trackNode = PlacesManager.getInstance().getPlacesRoot();
  if (trackNode && trackNode.hasFeatures()) {
    this.visible = osListMenu.hasSelected(context);
  }
};

/**
 * Handle track actions from the List tool.
 * @param {MenuEvent} event The event
 * @private
 */
const handleListAction_ = function(event) {
  let source = /** @type {ISource} */ (event.getContext());
  if (osInstanceOf(source, VectorSource.NAME)) {
    source = /** @type {!VectorSource} */ (source);

    // slice the array, because sorting the original will break binary insert/remove
    const selected = source.getSelectedItems();
    if (selected.length > 0) {
      const eventType = event.type.replace(osListMenu.PREFIX_REGEXP, '');
      switch (eventType) {
        case TrackEventType.CREATE_TRACK:
          let trackTitle;

          // prepopulate the track name using the layer title if possible
          const layer = MapContainer.getInstance().getLayer(source.getId());
          if (layer) {
            trackTitle = /** @type {ILayer} */ (layer).getTitle() + ' Track';
          }

          promptForTitle(trackTitle).then(function(title) {
            getSortField(selected[0]).then(function(sortField) {
              const trackEvent = new TrackEvent(TrackEventType.CREATE_TRACK);
              trackEvent.features = selected;
              trackEvent.title = title;

              Dispatcher.getInstance().dispatchEvent(trackEvent);

              AlertManager.getInstance().sendAlert('Created a new track and added it to the ' + LAYER_TITLE +
                  ' layer.', AlertEventSeverity.SUCCESS);
            });
          });
          break;
        case TrackEventType.ADD_TO:
          const tm = TrackManager.getInstance();
          tm.promptForTrack().then(function(track) {
            if (track) {
              const trackEvent = new TrackEvent(TrackEventType.ADD_TO);
              trackEvent.track = track;
              trackEvent.features = selected;

              Dispatcher.getInstance().dispatchEvent(trackEvent);
            }
          });
          break;
        default:
          break;
      }
    }
  }
};

/**
 * Sets up track actions that must be handled from the main window context. These actions create objects that will cause
 * a leak if created in the external context (commands, features, etc).
 */
export const setupInternal = function() {
  Dispatcher.getInstance().listen(TrackEventType.CREATE_TRACK, handleInternalEvent);
  Dispatcher.getInstance().listen(MistTrackEventType.CREATE_TRACKS, handleInternalEvent);
  Dispatcher.getInstance().listen(TrackEventType.ADD_TO, handleInternalEvent);
};

/**
 * Cleans up internal track actions.
 */
export const disposeInternal = function() {
  Dispatcher.getInstance().unlisten(TrackEventType.CREATE_TRACK, handleInternalEvent);
  Dispatcher.getInstance().unlisten(MistTrackEventType.CREATE_TRACKS, handleInternalEvent);
  Dispatcher.getInstance().unlisten(TrackEventType.ADD_TO, handleInternalEvent);
};

/**
 * @param {TrackEvent} event
 */
const handleInternalEvent = function(event) {
  switch (event.type) {
    case TrackEventType.CREATE_TRACK:
    case MistTrackEventType.CREATE_TRACKS:
      if (event.features) {
        const options = /** @type {!CreateOptions} */ ({
          features: event.features,
          name: event.title,
          includeMetadata: true
        });

        TrackPlugin.createAndAdd(options);
      } else if (event.bins && event.title) {
        createFromBinEvent(event);
      }
      break;
    case TrackEventType.ADD_TO:
      if (event.track && event.features) {
        addToTrack({
          features: event.features,
          track: event.track
        });
      }
      break;
    default:
      break;
  }
};
