goog.provide('tools');
goog.provide('tools.Module');
goog.provide('tools.ToolsMainCtrl');
goog.provide('tools.toolsMainDirective');

goog.require('goog.events.EventType');
goog.require('goog.log');
goog.require('goog.log.Logger');
goog.require('goog.object');
goog.require('mist.action.chart');
goog.require('mist.action.countBy');
goog.require('mist.action.list');
goog.require('mist.chart');
goog.require('mist.mixin.action.buffer');
goog.require('mist.ui.widget');
goog.require('mist.ui.widget.WidgetEvent');
goog.require('mist.ui.widget.WidgetType');
goog.require('mist.ui.widget.sourceWidgetDirective');
goog.require('mistdefines');
goog.require('ol.events');
goog.require('os');
goog.require('os.IPersistable');
goog.require('os.MapContainer');
goog.require('os.action.buffer');
goog.require('os.command.CommandProcessor');
goog.require('os.data.DataManager');
goog.require('os.debug');
goog.require('os.debug.FancierWindow');
goog.require('os.events');
goog.require('os.file.persist.FilePersistence');
goog.require('os.net.ExtDomainHandler');
goog.require('os.net.RequestHandlerFactory');
goog.require('os.net.SameDomainHandler');
goog.require('os.style.StyleManager');
goog.require('os.time');
goog.require('os.time.TimelineController');
goog.require('os.ui.AbstractMainCtrl');
goog.require('os.ui.Module');
goog.require('os.ui.column.columnManagerDirective');
goog.require('os.ui.columnactions.ColumnActionEvent');
goog.require('os.ui.columnactions.ColumnActionManager');
goog.require('os.ui.config.SettingsManager');
goog.require('os.ui.exportManager');
goog.require('os.ui.im.ImportManager');
goog.require('os.ui.ngRightClickDirective');
goog.require('os.ui.slick.column');
goog.require('os.ui.util.autoHeightDirective');
goog.require('os.ui.widget.WidgetEventType');
goog.require('os.ui.widget.WidgetManager');
goog.require('plugin.chart.scatter.ScatterChartPlugin');
goog.require('plugin.file.kml.KMLPluginExt');
goog.require('plugin.im.action.feature.PluginExt');
goog.require('tools.ui.Module');
goog.require('tools.ui.chartToolDirective');
goog.require('tools.ui.countByContainerDirective');
goog.require('tools.ui.listToolDirective');
goog.require('tools.ui.sourceSwitcherDirective');


/**
 * @define {string} The root for views
 */
goog.define('tools.ROOT', '../opensphere-plugin-analyze/');


/**
 * Angular module 'tools'
 * @type {angular.Module}
 */
tools.Module = angular.module('tools', [
  'ngSanitize',
  'os.ui',
  'tools.ui']);


/**
 * The tools-main directive
 * @return {angular.Directive}
 */
tools.toolsMainDirective = function() {
  return {
    restrict: 'E',
    replace: true,
    scope: true,
    templateUrl: tools.ROOT + 'views/toolsmain.html',
    controller: tools.ToolsMainCtrl,
    controllerAs: 'toolsMain'
  };
};


tools.Module.directive('toolsMain', [tools.toolsMainDirective]);



/**
 * Controller function for the Tools Main directive
 * @param {!angular.Scope} $scope
 * @param {!angular.JQLite} $element
 * @param {!angular.$compile} $compile
 * @param {!angular.$timeout} $timeout
 * @param {!angular.$injector} $injector
 * @implements {os.IPersistable}
 * @constructor
 * @ngInject
 * @extends {os.ui.AbstractMainCtrl}
 */
tools.ToolsMainCtrl = function($scope, $element, $compile, $timeout, $injector) {
  goog.log.info(tools.ToolsMainCtrl.LOGGER_, 'Starting up Tools Main - Main window logger has been substituted.');

  // Call the abstract constructor.
  tools.ToolsMainCtrl.base(this, 'constructor', $scope, $injector, plugin.mist.ROOT, 'Tools');

  // prevent all browser context menu events before they bubble back out to the browser
  os.events.preventBrowserContextMenu();

  // add window close handler
  window.addEventListener(goog.events.EventType.UNLOAD, this.onClose.bind(this));

  /**
   * @type {?angular.JQLite}
   * @private
   */
  this.element_ = $element;

  /**
   * @type {?angular.$timeout}
   * @private
   */
  this.timeout_ = $timeout;

  /**
   * If data should be displayed for all time.
   * @type {boolean}
   */
  this['allTime'] = false;

  /**
   * @type {boolean}
   */
  this['connected'] = false;

  /**
   * @type {boolean}
   */
  this['isExternal'] = !os.inIframe();

  /**
   * @type {Object}
   * @private
   */
  this.gridster_ = null;

  /**
   * @type {Object<string, *>}
   */
  this['gridsterOptions'] = /** @type {gridster.Options} */ ({
    columns: tools.ToolsMainCtrl.GRID_COLUMNS_,
    colWidth: 'auto',
    defaultSizeX: 8,
    defaultSizeY: 8,
    margins: [5, 5],
    minSizeX: 5,
    minSizeY: 5,
    mobileModeEnabled: false, // TODO: see THIN-5670
    // mobileBreakPoint: 800,
    floating: true,
    pushing: true,
    swapping: false,
    draggable: {
      enabled: true,
      handle: '.window-header'
    },
    resizable: {
      enabled: true,
      handles: ['ne', 'se', 'sw', 'nw']
    }
  });

  /**
   * @type {Array<os.ui.widget.WidgetConfig>}
   */
  this['widgets'] = [];

  // set up request handlers
  os.net.RequestHandlerFactory.addHandler(os.net.SameDomainHandler);
  os.net.RequestHandlerFactory.addHandler(os.net.ExtDomainHandler);
  os.net.RequestHandlerFactory.addHandler(os.net.ProxyHandler);

  // set up actions
  this.initActions_();

  this.initialize();
  this.initPlugins();
};
goog.inherits(tools.ToolsMainCtrl, os.ui.AbstractMainCtrl);


/**
 * The number of columns to create in the grid.
 * @type {number}
 * @private
 * @const
 */
tools.ToolsMainCtrl.GRID_COLUMNS_ = 40;


/**
 * Logger
 * @type {goog.log.Logger}
 * @private
 * @const
 */
tools.ToolsMainCtrl.LOGGER_ = goog.log.getLogger('tools.ToolsMainCtrl');


/**
 * @inheritDoc
 */
tools.ToolsMainCtrl.prototype.destroy = function() {
  tools.ToolsMainCtrl.base(this, 'destroy');

  this.disposeActions_();
  goog.dispose(os.ui.pluginManager);
  os.ui.pluginManager = null;

  this.element_ = null;
  this.timeout_ = null;
};


/**
 * Initialize bindings to global references that need to be shared with the main application window. If you need access
 * to something that isn't in the list, add it to {@link mist.MainCtrl#initializeExports_} or you'll have a bad time.
 * @inheritDoc
 */
tools.ToolsMainCtrl.prototype.initInstances = function() {
  // Tools has its own plugin manager
  os.ui.pluginManager = os.plugin.PluginManager.getInstance();
  os.ui.pluginManager.listenOnce(goog.events.EventType.LOAD, this.onPluginsLoaded, false, this);

  // find the main application
  var exports = os.getExports();
  if (exports) {
    /** @type {Function} */ (exports['registerExternal'])(window);

    // make the same exports list available on this window
    window['exports'] = exports;

    goog.object.extend(os.command.CommandProcessor, {
      getInstance: function() {
        return /** @type {!os.command.CommandProcessor} */ (exports['commandStack']);
      }});

    goog.object.extend(os.ui.im.ImportManager, {
      getInstance: function() {
        return /** @type {!os.ui.im.ImportManager} */ (exports['importManager']);
      }});

    goog.object.extend(os.data.DataManager, {
      getInstance: function() {
        return /** @type {!os.data.DataManager} */ (exports['dataManager']);
      }});

    goog.object.extend(os.data.OSDataManager, {
      getInstance: function() {
        return /** @type {!os.data.OSDataManager} */ (exports['dataManager']);
      }});

    goog.object.extend(os.ui.filter.FilterManager, {
      getInstance: function() {
        return /** @type {!os.ui.filter.FilterManager} */ (exports['filterManager']);
      }});

    goog.object.extend(os.MapContainer, {
      getInstance: function() {
        return /** @type {!os.MapContainer} */ (exports['map']);
      }});

    goog.object.extend(os.xt.Peer, {
      getInstance: function() {
        return /** @type {!os.xt.Peer} */ (exports['peer']);
      }});

    goog.object.extend(os.style.StyleManager, {
      getInstance: function() {
        return /** @type {!os.style.StyleManager} */ (exports['styleManager']);
      }});

    goog.object.extend(os.ui.config.SettingsManager, {
      getInstance: function() {
        return /** @type {!os.ui.config.SettingsManager} */ (exports['settingsManager']);
      }});

    goog.object.extend(os.ui.widget.WidgetManager, {
      getInstance: function() {
        return /** @type {!os.ui.widget.WidgetManager} */ (exports['widgetManager']);
      }});

    goog.object.extend(os.alert.AlertManager, {
      getInstance: function() {
        return /** @type {!os.alert.AlertManager} */ (exports['alertManager']);
      }});

    goog.object.extend(os.metrics.Metrics, {
      getInstance: function() {
        return /** @type {!os.metrics.Metrics} */ (exports['metrics']);
      }});

    goog.object.extend(os.time.TimelineController, {
      getInstance: function() {
        return /** @type {!os.time.TimelineController} */ (exports['timelineController']);
      }});

    os.dispatcher = /** @type {goog.events.EventTarget} */ (exports['dispatcher']);
  }
};


/**
 * @inheritDoc
 */
tools.ToolsMainCtrl.prototype.initialize = function() {
  tools.ToolsMainCtrl.base(this, 'initialize');

  os.time.initOffset();

  // find the main mist application
  var exports = os.getExports();
  if (exports) {
    if (os.inIframe()) {
      // internal tools should reuse the main export manager so dialogs are launched in the main window
      os.ui.exportManager = /** @type {os.ui.file.ExportManager} */ (exports['exportManager']);
      os.column.launchColumnManager = /** @type {function(Array<os.parse.IColumnDefinition>, Function)} */
          (exports['functions']['launchColumnManager']);
    } else {
      // we want export methods to run in the main application window context so any instanceof or
      // goog.asserts.assertInstanceof checks will be comparing objects to classes in the correct context. this was a
      // problem with the KML exporter, which uses OL3 functions calling goog.asserts.assertInstanceOf. it worked in
      // compiled mode (assertions removed), but failed in debug mode.
      var em = /** @type {os.ui.file.ExportManager} */ (exports['exportManager']);
      os.ui.exportManager.registerExportMethod(em.getExportMethods());

      // external tools should create its own persistence methods so dialogs are launched locally
      os.ui.exportManager.registerPersistenceMethod(new os.file.persist.FilePersistence());
    }

    // show alerts in all windows, regardless of the where the alert occurs
    os.alertManager = /** @type {!os.alert.AlertManager} */ (exports['alertManager']);

    var dm = os.dataManager = os.osDataManager = os.data.OSDataManager.getInstance();

    if (dm && dm === exports['dataManager']) {
      this['allTime'] = !dm.getTimeFilterEnabled();
      dm.listen(goog.events.EventType.PROPERTYCHANGE, this.onDataManagerChange_, false, this);

      if (os.dispatcher) {
        this['connected'] = true;
      }
    }
  }

  // register supported charts
  mist.chart.registerChartTypes();
};


/**
 * @inheritDoc
 */
tools.ToolsMainCtrl.prototype.onClose = function() {
  window.removeEventListener(goog.events.EventType.UNLOAD, this.onClose.bind(this), true);
  os.settings.set(this.getConfigKeys_(), this.persist());
  os.time.disposeOffset();

  // unregister with the main application
  var exports = os.getExports();
  /** @type {Function} */ (exports['unregisterExternal'])(window);

  // Destroy the root scope
  // In normal applications this would not be necessary. However, since this application
  // sets up many listeners to things in the main window, we need to clean these listeners
  // up before the window closes.
  angular.element('.ng-scope').scope().$root.$destroy();
};


/**
 * @inheritDoc
 */
tools.ToolsMainCtrl.prototype.registerListeners = function() {
  goog.events.listen(this.element_.find('.tools-main')[0], goog.events.EventType.CONTEXTMENU,
      this.openContextMenu, false, this);
};


/**
 * @inheritDoc
 */
tools.ToolsMainCtrl.prototype.removeListeners = function() {
  goog.events.unlisten(this.element_.find('.tools-main')[0], goog.events.EventType.CONTEXTMENU,
      this.openContextMenu, false, this);

  var dm = os.data.DataManager.getInstance();
  dm.unlisten(goog.events.EventType.PROPERTYCHANGE, this.onDataManagerChange_, false, this);
};


/**
 * @inheritDoc
 * @suppress {accessControls}
 */
tools.ToolsMainCtrl.prototype.addPlugins = function() {
  // set up plugins

  // TODO: Due to the new way we load plugins, plugins for the main application
  // will attempt to load themselves into the Analyze window. This is a quick
  // way to get what we want, but we should look into a better way to do this.
  os.ui.pluginManager.plugins_.length = 0;

  os.ui.pluginManager.addPlugin(new plugin.file.kml.KMLPluginExt());
  os.ui.pluginManager.addPlugin(plugin.chart.scatter.ScatterChartPlugin.getInstance());
  os.ui.pluginManager.addPlugin(plugin.im.action.feature.PluginExt.getInstance());
};


/**
 * @inheritDoc
 */
tools.ToolsMainCtrl.prototype.onPluginsLoaded = function(event) {
  tools.ToolsMainCtrl.base(this, 'onPluginsLoaded', event);

  if (this.scope) {
    // register widget listeners
    this.scope.$on(os.ui.widget.WidgetEventType.CLOSE, goog.bind(this.onCloseWidget_, this));

    // internal and external will be restored separately, since they typically have very different screen real
    // estate available.
    var configKeys = this.getConfigKeys_();
    var settings = os.settings;

    var config = /** @type {(Object|undefined)} */ (settings.get(configKeys));
    if (config) {
      // wipe out the settings so only one Analyze window restores the last settings. others should use defaults.
      settings.set(configKeys, {});
    }

    // wait for Angular to initialize everything prior to restoring tools
    os.ui.waitForAngular(goog.bind(function() {
      // restore previous state, or initialize from an empty state
      this.restore(config || {});
    }, this));
  }
};


/**
 * Initializes all action managers for the analyze window.
 * @private
 */
tools.ToolsMainCtrl.prototype.initActions_ = function() {
  mist.action.list.setup();
  mist.action.countBy.setup();
  mist.action.chart.setup();
  mist.mixin.action.buffer.listSetup();

  mist.ui.widget.actionSetup();
  mist.ui.widget.action.listen(os.ui.widget.WidgetEventType.LAUNCH, this.onWidgetChoice_, false, this);
  mist.ui.widget.action.listen(mist.ui.widget.WidgetEvent.CLOSE_ALL, this.onWidgetCloseAll_, false, this);
  mist.ui.widget.action.listen(mist.ui.widget.WidgetEvent.RESET, this.onWidgetReset_, false, this);
};


/**
 * Initializes all action managers for the analyze window.
 * @private
 */
tools.ToolsMainCtrl.prototype.disposeActions_ = function() {
  mist.ui.widget.actionDispose();

  mist.mixin.action.buffer.listDispose();
  mist.action.list.dispose();
  mist.action.countBy.dispose();
  mist.action.chart.dispose();
};


/**
 * Get the gridster controller.
 * @return {Object}
 * @private
 */
tools.ToolsMainCtrl.prototype.getGridster_ = function() {
  if (!this.gridster_) {
    var gridsterScope = this.element_.find('.gridster').scope();
    if (gridsterScope && gridsterScope['gridster']) {
      this.gridster_ = gridsterScope['gridster'];
    }
  }

  return this.gridster_;
};


/**
 * Get the settings keys used to store config. Internal and external configs are stored separately because these will
 * generally have very different screen real estate available.
 * @return {!Array<string>}
 * @private
 */
tools.ToolsMainCtrl.prototype.getConfigKeys_ = function() {
  return ['toolsWindow', (os.inIframe() ? 'internal' : 'external')];
};


/**
 * Closes a widget by id
 * @param {angular.Scope.Event} event
 * @param {string} id
 * @private
 */
tools.ToolsMainCtrl.prototype.onCloseWidget_ = function(event, id) {
  for (var i = 0, n = this['widgets'].length; i < n; i++) {
    var widget = this['widgets'][i];
    if (widget['id'] == id) {
      this['widgets'].splice(i, 1);
      break;
    }
  }
};


/**
 * Opens the context menu at the mouse position if an event was provided, or the menu button if not provided.
 * @param {goog.events.BrowserEvent=} opt_event
 */
tools.ToolsMainCtrl.prototype.openContextMenu = function(opt_event) {
  if (opt_event) {
    opt_event.preventDefault();
    opt_event.stopPropagation();

    os.ui.openMenu(mist.ui.widget.action, {x: opt_event.clientX, y: opt_event.clientY});
  } else {
    var target = this.element_.find('.layout-btn');
    var offset = target.offset();
    os.ui.openMenu(mist.ui.widget.action, {x: offset.left, y: offset.top + target.outerHeight() + 4});
  }
};
goog.exportProperty(tools.ToolsMainCtrl.prototype, 'openContextMenu', tools.ToolsMainCtrl.prototype.openContextMenu);


/**
 * Handles a widget selection
 * @param {!os.ui.widget.WidgetEvent} event
 * @private
 */
tools.ToolsMainCtrl.prototype.onWidgetChoice_ = function(event) {
  if (goog.isDefAndNotNull(event.config)) {
    var widget = event.config;
    this.setMinSize_(widget);
    this['widgets'].push(widget);

    this.timeout_(goog.bind(function() {
      // scroll to the new widget
      var widgetEl = this.element_.find('#' + widget['id'] + '>.widget');
      if (widgetEl && widgetEl.length > 0) {
        this.element_.find('.tools-main').scrollTop(widgetEl.position()['top']);
      }
    }, this));
  }
};


/**
 * Closes all widgets
 * @param {os.ui.action.ActionEvent} event
 * @private
 */
tools.ToolsMainCtrl.prototype.onWidgetCloseAll_ = function(event) {
  this['widgets'] = [];
};


/**
 * Resets widgets to the default
 * @param {os.ui.action.ActionEvent} event
 * @private
 */
tools.ToolsMainCtrl.prototype.onWidgetReset_ = function(event) {
  this['widgets'] = this.createDefaultWidgets_();
};


/**
 * Adds the default widgets to the list tool, sized based on the container size.
 * @return {Array<os.ui.widget.WidgetConfig>}
 * @private
 */
tools.ToolsMainCtrl.prototype.createDefaultWidgets_ = function() {
  var widgets = [];

  var gridster = this.getGridster_();
  if (gridster) {
    var numRows = Math.floor(this.element_.find('.tools-main').height() / gridster['curColWidth']);
    var numColumns = tools.ToolsMainCtrl.GRID_COLUMNS_;

    var wm = os.ui.widget.WidgetManager.getInstance();

    // set Count By to full height
    var countByWidget = wm.createWidget(mist.ui.widget.WidgetType.COUNT_BY);
    countByWidget['itemOptions']['sizeY'] = numRows;
    this.setMinSize_(countByWidget);

    // set List to the remaining columns wide
    var listWidget = wm.createWidget(mist.ui.widget.WidgetType.LIST);
    listWidget['itemOptions']['col'] = countByWidget['itemOptions']['sizeX'];
    listWidget['itemOptions']['sizeX'] = numColumns - countByWidget['itemOptions']['sizeX'];
    this.setMinSize_(listWidget);

    // create and size the charts
    var pieChart = wm.createWidget(mist.ui.widget.WidgetType.CHART);
    var barChart = wm.createWidget(mist.ui.widget.WidgetType.CHART);
    this.setMinSize_(pieChart);
    this.setMinSize_(barChart);

    // charts will be under the List, so base List height off the chart height
    listWidget['itemOptions']['sizeY'] = numRows - pieChart['itemOptions']['sizeY'];

    // pie chart will be on the left
    pieChart['itemOptions']['row'] = listWidget['itemOptions']['sizeY'];
    pieChart['itemOptions']['col'] = countByWidget['itemOptions']['sizeX'];

    // bar chart will be positioned by gridster and we'll use the remaining width
    barChart['template'] = '<charttool source="source" config="config" chartid="bar"></charttool>';
    barChart['itemOptions']['sizeX'] = numColumns - countByWidget['itemOptions']['sizeX'] -
        pieChart['itemOptions']['sizeX'];

    widgets.push(countByWidget);
    widgets.push(listWidget);
    widgets.push(pieChart);
    widgets.push(barChart);
  }

  return widgets;
};


/**
 * Set the minimum pixel size for a widget. Uses the current grid cell size to determine row/column size.
 * @param {?os.ui.widget.WidgetConfig} config The gridster item config
 * @private
 */
tools.ToolsMainCtrl.prototype.setMinSize_ = function(config) {
  var gridster = this.getGridster_();
  if (config && gridster && goog.isNumber(gridster['curColWidth']) && gridster['curColWidth'] > 0) {
    var colWidth = /** @type {number} */ (gridster['curColWidth']);
    var minSize = config['minSizePx'] || [250, 250];
    var minX = Math.ceil(minSize[0] / colWidth);
    var minY = Math.ceil(minSize[1] / colWidth);

    config['itemOptions']['sizeX'] = Math.max(config['itemOptions']['sizeX'], minX);
    config['itemOptions']['sizeY'] = Math.max(config['itemOptions']['sizeY'], minY);
  }
};


/**
 * Update the allTime value in settings.
 */
tools.ToolsMainCtrl.prototype.onAllTimeChange = function() {
  os.data.DataManager.getInstance().setTimeFilterEnabled(!this['allTime']);
};
goog.exportProperty(tools.ToolsMainCtrl.prototype, 'onAllTimeChange', tools.ToolsMainCtrl.prototype.onAllTimeChange);


/**
 * Handle property change events from the data manager.
 * @param {os.events.PropertyChangeEvent} event The change event
 * @private
 */
tools.ToolsMainCtrl.prototype.onDataManagerChange_ = function(event) {
  var p = event.getProperty();
  if (p === os.data.PropertyChange.TIME_FILTER_ENABLED) {
    this['allTime'] = !os.data.DataManager.getInstance().getTimeFilterEnabled();
  }
};


/**
 * @inheritDoc
 */
tools.ToolsMainCtrl.prototype.persist = function(opt_to) {
  if (!opt_to) {
    opt_to = {};
  }

  if (this.scope['source']) {
    opt_to['source'] = this.scope['source'].getId();
  }

  opt_to['widgets'] = this['widgets'];
  opt_to['internal'] = os.inIframe();

  return opt_to;
};


/**
 * @inheritDoc
 */
tools.ToolsMainCtrl.prototype.restore = function(config) {
  if (config['source']) {
    var source = os.data.DataManager.getInstance().getSource(/** @type {string} */ (config['source']));
    if (source && source.getVisible() && source.getFeatureCount() > 0) {
      // restore the last used source if it's still available, visible and has features. otherwise allow the source
      // picker to auto select one.
      this.scope['source'] = source;
    }
  }

  var widgets = /** @type {Array<os.ui.widget.WidgetConfig>} */ (config['widgets']);
  if (widgets && widgets.length > 0) {
    this.cleanWidgets_(widgets);
  } else {
    widgets = this.createDefaultWidgets_();
  }

  this['widgets'] = widgets;

  os.ui.apply(this.scope);
};


/**
 * Comb through saved widget configurations and make sure they're up to date.
 * @param {Array<os.ui.widget.WidgetConfig>} widgets The widget configurations
 * @private
 */
tools.ToolsMainCtrl.prototype.cleanWidgets_ = function(widgets) {
  for (var i = 0; i < widgets.length; i++) {
    var widget = widgets[i];
    if (goog.string.startsWith(widget['id'], mist.ui.widget.WidgetType.COUNT_BY)) {
      widget['template'] = mist.ui.widget.COUNTBY_TEMPLATE;
    }
  }
};


/**
 * @inheritDoc
 */
tools.ToolsMainCtrl.prototype.doCertNazi = goog.nullFunction;
