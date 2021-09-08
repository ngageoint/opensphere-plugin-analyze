goog.declareModuleId('coreui.chart.vega.interaction.ClickContext');

import {default as ChartType} from '../charttype.js';
import {default as Charts} from '../base/charts.js';
import {default as Model} from '../data/model.js';
import {default as SourceModel} from '../data/sourcemodel.js';
import {default as AbstractInteraction} from './abstractinteraction.js';
import {default as ClickContextEventType} from './clickcontexteventtype.js';

import * as os from 'opensphere/src/os/os.js';
import * as dispatcher from 'opensphere/src/os/dispatcher.js';

const bitsCoreuiMenuList = goog.require('bits.coreui.menu.list');
const dispose = goog.require('goog.dispose');
const GoogEvent = goog.require('goog.events.Event');
const AlertEventSeverity = goog.require('os.alert.AlertEventSeverity');
const AlertManager = goog.require('os.alert.AlertManager');
const instanceOf = goog.require('os.instanceOf');
const VectorSource = goog.require('os.source.Vector');
const GlobalMenuEventType = goog.require('os.ui.GlobalMenuEventType');
const {launchAddColumn} = goog.require('os.ui.data.AddColumnUI');
const Menu = goog.require('os.ui.menu.Menu');
const MenuItem = goog.require('os.ui.menu.MenuItem');
const MenuItemType = goog.require('os.ui.menu.MenuItemType');
const list = goog.require('os.ui.menu.list');

const {default: Event} = goog.requireType('coreui.chart.vega.base.Event');
const MenuEvent = goog.requireType('os.ui.menu.MenuEvent');


/**
 */
class ClickContext extends AbstractInteraction {
  /**
   * Constructor.
   * @param {Model} model
   * @param {string=} opt_chartType
   */
  constructor(model, opt_chartType) {
    super(model, opt_chartType);
    this.spec = {
      'signals': [
        {
          // Right click on the chart to trigger context menu
          'name': this.id,
          'value': null,
          'on': [
            {
              'events':
              {
                'type': 'mousedown',
                'filter': 'event.button === 2'
              },
              'update': 'xy()'
            }
          ]
        }
      ]
    };

    // setup the menu so it's ready for use
    ClickContext.setup();

    /**
     * The context menu for the UI.
     * @type {Menu|undefined}
     * @protected
     */
    this.contextMenu = ClickContext.MENU;

    if (this.model) {
      const events = ClickContextEventType;
      for (const key in events) {
        this.model.listen(events[key], this.runSelection, false, this);
      }
    }
  }

  /**
   * The callback function for the interaction
   * @inheritDoc
   */
  disposeInternal() {
    if (this.model) {
      const events = ClickContextEventType;
      for (const key in events) {
        this.model.unlisten(events[key], this.runSelection, false, this);
      }
    }
    ClickContext.MENU = undefined;
    super.disposeInternal();
  }

  /**
   * The callback function for the interaction
   * @inheritDoc
   */
  callback(name, value) {
    if (this.model && Array.isArray(value) && value.length == 2) {
      this.view.signal('selectController', this.id);

      const x = 5 + value[0] + this.view.origin()[0] || 0;
      const y = 5 + value[1] + this.view.origin()[1] || 0;
      this.contextMenu.open(this.model, {
        my: 'left top',
        at: 'left+' + x + ' top+' + y,
        of: '#' + this.view.container()['id']
      });

      dispatcher.getInstance().listenOnce(GlobalMenuEventType.MENU_CLOSE, function() {
        // reset the view so the changes take effect
        if (this.model) {
          setTimeout(function() {
            if (this.chartType === ChartType.SCATTER) {
              this.model.softReset();
            } else {
              this.model.resetDomainDebounce.fire();
            }

            if (this.view) {
              this.view.signal('selectController', null);
            }
          }.bind(this), 100);
        }
      }.bind(this));
    }
  }

  /**
   * Menu selection was made, do the stuff
   * @param {Event} event
   * @protected
   */
  runSelection(event) {
    if (!this.model) {
      const msg = 'Layer source has been disconnected from the chart, please close ' +
          'and reopen the chart';
      AlertManager.getInstance().sendAlert(msg, AlertEventSeverity.ERROR);
    } else {
      switch (event.type) {
        case ClickContextEventType.SELECT_ALL:
          this.model.selectAll();
          break;
        case ClickContextEventType.DESELECT_ALL:
          this.model.clearSelection();
          break;
        case ClickContextEventType.INVERT_SELECTION:
          this.model.invertSelection();
          break;
        case ClickContextEventType.HIDE_SELECTED:
          this.model.hideBins([], true);
          break;
        case ClickContextEventType.HIDE_UNSELECTED:
          this.model.hideBins([], false);
          break;
        case ClickContextEventType.DISPLAY_ALL:
          this.view.signal('windowBrush', false);
          if (this.model instanceof SourceModel) {
            this.model.displayAll();
          }
          break;
        case ClickContextEventType.AUTO_COLOR:
          if (this.model instanceof SourceModel) {
            this.model.autoColor();
          }
          break;
        case ClickContextEventType.COLOR_SELECTED:
          if (this.model instanceof SourceModel) {
            this.model.colorSelected();
          }
          break;
        case ClickContextEventType.COLOR_SELECTED_BINS:
          if (this.model instanceof SourceModel) {
            this.model.colorSelected(true);
          }
          break;
        case ClickContextEventType.AUTO_COLOR_BY_COUNT:
          if (this.model instanceof SourceModel) {
            this.model.autoColorByCount();
          }
          break;
        case ClickContextEventType.RESET_COLOR:
          if (this.model instanceof SourceModel) {
            this.model.resetColor();
          }
          break;
        case ClickContextEventType.REMOVE_SELECTED:
          this.model.removeBins([], true);
          break;
        case ClickContextEventType.REMOVE_UNSELECTED:
          this.model.removeBins([], false);
          break;
        case ClickContextEventType.SORT_BY_LABEL:
        case ClickContextEventType.SORT_BY_COUNT:
          this.model.sort(event.type);
          break;
        case ClickContextEventType.RESET_VIEW:
        default:
          this.model.resetDomainDebounce.fire();
          break;
      }
    }
  }

  /**
   * Create the chart menu.
   */
  static setup() {
    if (!ClickContext.MENU) {
      const selectChildren = [{
        label: 'Select All',
        eventType: ClickContextEventType.SELECT_ALL,
        tooltip: 'Select all items',
        icons: ['<i class="fa fa-fw fa-check-circle"></i> '],
        handler: ClickContext.sendChartMenuEvent,
        beforeRender: ClickContext.chartActionAllowed,
        shortcut: 'ctrl+A',
        sort: 10
      }, {
        label: 'Deselect All',
        eventType: ClickContextEventType.DESELECT_ALL,
        tooltip: 'Deselect all items',
        icons: ['<i class="fa fa-fw fa-times-circle"></i> '],
        handler: ClickContext.sendChartMenuEvent,
        beforeRender: ClickContext.chartActionAllowed,
        shortcut: 'ctrl+D',
        sort: 20
      }, {
        label: 'Invert Selection',
        eventType: ClickContextEventType.INVERT_SELECTION,
        tooltip: 'Invert selection on all items',
        icons: ['<i class="fa fa-fw fa-adjust"></i> '],
        handler: ClickContext.sendChartMenuEvent,
        beforeRender: ClickContext.chartActionAllowed,
        sort: 30
      }, {
        label: 'Add Custom Label',
        eventType: ClickContextEventType.ADD_CUSTOM_LABEL,
        tooltip: 'Adds a column to the selected records where custom data and labels can be provided',
        icons: ['<i class="fa fa-fw fa-plus"></i>'],
        handler: os.inIframe() ? undefined : ClickContext.handleAddColumn,
        beforeRender: ClickContext.chartActionAllowed,
        sort: 40
      }];

      const hideChildren = [{
        label: 'Hide Selected',
        eventType: ClickContextEventType.HIDE_SELECTED,
        tooltip: 'Hide selected items',
        icons: ['<i class="fa fa-fw fa-eye-slash"></i> '],
        handler: ClickContext.sendChartMenuEvent,
        beforeRender: ClickContext.chartActionAllowed,
        shortcut: 'ctrl+H',
        sort: 10
      }, {
        label: 'Hide Unselected',
        eventType: ClickContextEventType.HIDE_UNSELECTED,
        tooltip: 'Hide unselected items',
        icons: ['<i class="fa fa-fw fa-eye-slash"></i> '],
        handler: ClickContext.sendChartMenuEvent,
        beforeRender: ClickContext.chartActionAllowed,
        sort: 20
      }, {
        label: 'Display All',
        eventType: ClickContextEventType.DISPLAY_ALL,
        tooltip: 'Display all items',
        icons: ['<i class="fa fa-fw fa-eye"></i> '],
        beforeRender: Charts.chartWindowInactive,
        handler: ClickContext.sendChartMenuEvent,
        shortcut: 'ctrl+shift+A',
        sort: 30
      }, {
        label: 'Remove Window and Display All',
        eventType: ClickContextEventType.DISPLAY_ALL,
        tooltip: 'Remove the window and display all items',
        icons: ['<i class="fa fa-fw fa-eye"></i> '],
        beforeRender: Charts.chartWindowActive,
        handler: ClickContext.sendChartMenuEvent,
        sort: 30
      }, {
        label: 'Reset Chart',
        eventType: ClickContextEventType.RESET_VIEW,
        tooltip: 'Reset the bounds of the chart to default',
        icons: ['<i class="fa fa-fw fa-undo"></i> '],
        handler: ClickContext.sendChartMenuEvent,
        beforeRender: ClickContext.chartActionAllowed,
        shortcut: 'R',
        sort: 40
      }];

      const colorChildren = [{
        label: list.Strings.COLOR_SELECTED_LABEL,
        eventType: ClickContextEventType.COLOR_SELECTED,
        tooltip: list.Strings.COLOR_SELECTED_TOOLTIP,
        icons: ['<i class="fa fa-fw fa-tint"></i> '],
        handler: ClickContext.sendChartMenuEvent,
        beforeRender: ClickContext.chartActionAllowed,
        sort: 0
      }, {
        label: bitsCoreuiMenuList.Strings.COLOR_SELECTED_BINS_LABEL,
        eventType: ClickContextEventType.COLOR_SELECTED_BINS,
        tooltip: bitsCoreuiMenuList.Strings.COLOR_SELECTED_BINS_TOOLTIP,
        icons: ['<i class="fa fa-fw fa-tint"></i> '],
        handler: ClickContext.sendChartMenuEvent,
        beforeRender: ClickContext.chartActionAllowed,
        sort: 1
      }, {
        label: bitsCoreuiMenuList.Strings.COLOR_AUTO_LABEL,
        eventType: ClickContextEventType.AUTO_COLOR,
        tooltip: bitsCoreuiMenuList.Strings.COLOR_AUTO_TOOLTIP,
        icons: ['<i class="fa fa-fw fa-tint"></i> '],
        handler: ClickContext.sendChartMenuEvent,
        beforeRender: ClickContext.chartActionAllowed,
        sort: 10
      }, {
        label: list.Strings.COLOR_RESET_LABEL,
        eventType: ClickContextEventType.RESET_COLOR,
        tooltip: list.Strings.COLOR_RESET_TOOLTIP,
        icons: ['<i class="fa fa-fw fa-tint"></i> '],
        handler: ClickContext.sendChartMenuEvent,
        beforeRender: ClickContext.chartActionAllowed,
        sort: 30
      }];

      const removeChildren = [{
        label: 'Remove Selected',
        eventType: ClickContextEventType.REMOVE_SELECTED,
        tooltip: 'Remove selected items',
        icons: ['<i class="fa fa-fw fa-times"></i> '],
        handler: ClickContext.sendChartMenuEvent,
        beforeRender: ClickContext.chartActionAllowed,
        sort: 10
      }, {
        label: 'Remove Unselected',
        eventType: ClickContextEventType.REMOVE_UNSELECTED,
        tooltip: 'Remove unselected items',
        icons: ['<i class="fa fa-fw fa-times"></i> '],
        handler: ClickContext.sendChartMenuEvent,
        beforeRender: ClickContext.chartActionAllowed,
        sort: 20
      }];

      const sortChildren = [{
        label: 'Sort by Label',
        eventType: ClickContextEventType.SORT_BY_LABEL,
        tooltip: 'Sort the bins by label',
        icons: ['<i class="fa fa-fw fa-sort-alpha-asc"></i> '],
        handler: ClickContext.sendChartMenuEvent,
        beforeRender: ClickContext.chartActionAllowed,
        sort: 10
      }, {
        label: 'Sort by Count',
        eventType: ClickContextEventType.SORT_BY_COUNT,
        tooltip: 'Sort the bins by count',
        icons: ['<i class="fa fa-fw fa-sort-numeric-asc"></i> '],
        handler: ClickContext.sendChartMenuEvent,
        beforeRender: ClickContext.chartActionAllowed,
        sort: 20
      }];

      const toolsChildren = [{
        label: 'Export Chart',
        eventType: ClickContextEventType.EXPORT,
        tooltip: 'Export the chart as an image',
        icons: ['<i class="fa fa-fw fa-download"></i> '],
        handler: ClickContext.sendChartMenuEvent,
        beforeRender: ClickContext.chartActionAllowed,
        sort: 10
      }];

      const mi = new MenuItem({
        type: MenuItemType.ROOT
      });

      mi.addChild({
        label: 'Select',
        type: MenuItemType.GROUP,
        sort: 10,
        children: selectChildren
      });

      mi.addChild({
        label: 'Show/Hide',
        type: MenuItemType.GROUP,
        sort: 20,
        children: hideChildren
      });

      mi.addChild({
        label: 'Color',
        type: MenuItemType.GROUP,
        sort: 30,
        children: colorChildren
      });

      mi.addChild({
        label: 'Remove',
        type: MenuItemType.GROUP,
        sort: 40,
        children: removeChildren
      });

      mi.addChild({
        label: 'Tools',
        type: MenuItemType.GROUP,
        sort: 60,
        children: toolsChildren
      });

      mi.addChild({
        label: 'Sort',
        type: MenuItemType.GROUP,
        sort: 50,
        children: sortChildren
      });

      ClickContext.MENU = new Menu(mi);
    }
  }

  /**
   * Dispose the chart menu.
   */
  static dispose() {
    dispose(ClickContext.MENU);
    ClickContext.MENU = undefined;
  }

  /**
   * Handle chart menu events.
   * @param {MenuEvent} event The event.
   */
  static sendChartMenuEvent(event) {
    const model = /** @type {Model} */ (event.getContext());

    if (model instanceof Model) {
      model.dispatchEvent(event);
    }
  }

  /**
   * Check whether the chart action is allowed for a a given chart model.
   * @param {string} model The chart model.
   * @this {MenuItem}
   */
  static chartActionAllowed(model) {
    this.visible = false;

    // todo change to Charts.getIn().getChart()
    const chart = model && Charts.getInstance().getChart(model.id);
    if (chart && this.eventType) {
      this.visible = chart.supportsAction(this.eventType);
    }
  }

  /**
   * @param {MenuEvent} event
   */
  static handleAddColumn(event) {
    if (event instanceof GoogEvent && !os.inIframe()) {
      // handle the event
      event.preventDefault();
      event.stopPropagation();

      const context = event.getContext();
      let source = context && /** @type {SourceModel} */ (context).source;

      if (instanceOf(source, VectorSource.NAME)) {
        source = /** @type {VectorSource} */ (source);
        launchAddColumn(source);
      }
    }
  }
}


/**
 * Menu for vega charts
 * @type {Menu|undefined}
 */
ClickContext.MENU = undefined;


export default ClickContext;
