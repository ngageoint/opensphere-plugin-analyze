goog.module('tools.ui.AbstractToolsMainCtrl');
goog.module.declareLegacyNamespace();

goog.require('coreui.chart.vega.base.VegaChartUI');
goog.require('coreui.layout.LayoutPanelUI');
goog.require('os.style.StyleManager');
goog.require('os.ui.column.ColumnManagerUI');
goog.require('tools.ui.CountByContainerUI');
goog.require('tools.ui.CountByUI');
goog.require('tools.ui.ListToolUI');
goog.require('tools.ui.nav.ToolsNavUI');

const layout = goog.require('coreui.layout');
const AngularComponent = goog.require('coreui.layout.AngularComponent');
const googArray = goog.require('goog.array');
const Delay = goog.require('goog.async.Delay');
const dispose = goog.require('goog.dispose');
const dom = goog.require('goog.dom');
const ViewportSizeMonitor = goog.require('goog.dom.ViewportSizeMonitor');
const classlist = goog.require('goog.dom.classlist');
const EventType = goog.require('goog.events.EventType');
const KeyCodes = goog.require('goog.events.KeyCodes');
const KeyEvent = goog.require('goog.events.KeyEvent');
const KeyHandler = goog.require('goog.events.KeyHandler');
const log = goog.require('goog.log');
const {getValueByKeys} = goog.require('goog.object');
const googString = goog.require('goog.string');

const analyze = goog.require('mist.analyze');
const chart = goog.require('mist.chart');
const CountByMenu = goog.require('mist.menu.countBy');
const ListMenu = goog.require('mist.menu.list');
const olArray = goog.require('ol.array');
const os = goog.require('os');
const Dispatcher = goog.require('os.Dispatcher');
const AlertManager = goog.require('os.alert.AlertManager');
const CommandProcessor = goog.require('os.command.CommandProcessor');
const FeaturesVisibility = goog.require('os.command.FeaturesVisibility');
const Settings = goog.require('os.config.Settings');
const {Keys} = goog.require('os.config.theme');
const DataManager = goog.require('os.data.DataManager');
const events = goog.require('os.events');
const FilePersistence = goog.require('os.file.persist.FilePersistence');
const BaseFilterManager = goog.require('os.filter.BaseFilterManager');
const fn = goog.require('os.fn');
const Metrics = goog.require('os.metrics.Metrics');
const keys = goog.require('os.metrics.keys');
const addDefaultHandlers = goog.require('os.net.addDefaultHandlers');
const osObject = goog.require('os.object');
const PluginManager = goog.require('os.plugin.PluginManager');
const osString = goog.require('os.string');
const time = goog.require('os.time');
const ui = goog.require('os.ui');
const AbstractMainCtrl = goog.require('os.ui.AbstractMainCtrl');
const ResizeEventType = goog.require('os.ui.ResizeEventType');
const column = goog.require('os.ui.column');
const ExportManager = goog.require('os.ui.file.ExportManager');
const {LAYOUT_CONTAINER_ID} = goog.require('tools.ui');
const {Event: NavEvent} = goog.require('tools.ui.nav');
const {ROOT} = goog.require('tools');
const util = goog.require('tools.util');

const Logger = goog.requireType('goog.log.Logger');
const IPersistable = goog.requireType('os.IPersistable');


/**
 * Abstract controller for the main external tools directive.
 * @implements {IPersistable}
 * @unrestricted
 */
class Controller extends AbstractMainCtrl {
  /**
   * Constructor.
   * @param {!angular.Scope} $scope The Angular scope.
   * @param {!angular.JQLite} $element The root DOM element.
   * @param {!angular.$compile} $compile The Angular $compile service.
   * @param {!angular.$timeout} $timeout The Angular $timeout service.
   * @param {!angular.$injector} $injector The Angular injector.
   * @ngInject
   */
  constructor($scope, $element, $compile, $timeout, $injector) {
    super($scope, $injector, ROOT, 'Tools');

    // disable animation on the tools window as it is an enormous performance killer with our Angular integration
    try {
      var $animate = /** @type {angular.$animate} */ (ui.injector.get('$animate'));
      $animate.enabled($element, false);
    } catch (e) {
      // animate service not available, we don't really care
    }

    // prevent all browser context menu events before they bubble back out to the browser
    events.preventBrowserContextMenu();

    /**
     * The root DOM element.
     * @type {angular.JQLite|undefined}
     * @protected
     */
    this.element = $element;

    /**
     * The Angular $compile service.
     * @type {angular.$compile|undefined}
     * @protected
     */
    this.compile = $compile;

    /**
     * The Angular $timeout service.
     * @type {angular.$timeout|undefined}
     * @protected
     */
    this.timeout = $timeout;

    /**
     * The logger.
     * @type {Logger}
     * @protected
     */
    this.log = LOGGER_;

    /**
     * Identifier for the external window.
     * @type {string}
     * @const
     */
    this.windowId = 'analyze-' + googString.getRandomString();

    /**
     * @type {boolean}
     */
    this['connected'] = false;

    /**
     * @type {boolean}
     */
    this['isExternal'] = !os.inIframe();

    /**
     * Golden Layout instance.
     * @type {GoldenLayout|undefined}
     */
    this['layout'] = undefined;

    /**
     * If the layout panel is displayed.
     * @type {GoldenLayout|undefined}
     */
    this['showLayoutPanel'] = false;

    /**
     * Array of available layout configs.
     * @type {Array<Object>}
     */
    this['layoutConfigs'] = [];

    /**
     * Counter for new tabs.
     * @type {number}
     * @private
     */
    this.tabCount_ = 1;

    /**
     * Keyboard event handler.
     * @type {KeyHandler|undefined}
     * @private
     */
    this.keyHandler_ = undefined;

    /**
     * Golden Layout configuration.
     * @type {GoldenLayout.Config|undefined}
     * @private
     */
    this.layoutConfig_ = undefined;

    /**
     * Delay to debounce layout state changes.
     * @type {Delay|undefined}
     * @private
     */
    this.layoutStateDelay_ = new Delay(this.onLayoutStateDelay_, 50, this);

    /**
     * Tracks when components are being dragged while the layout panel is open, so it can be restored on drag stop.
     * @type {boolean}
     * @private
     */
    this.restoreLayoutOnDragStop_ = false;

    if (!this['isExternal']) {
      // iframe will fire unload, not beforeunload
      window.addEventListener(EventType.UNLOAD, this.onClose.bind(this));
    }

    // set up request handlers
    addDefaultHandlers();

    // set up actions
    this.initActions_();

    this.initialize();
    this.initPlugins();

    // do not allow overflow on the body. the layout should be a single page, always.
    classlist.add(document.body, 'u-overflow-x-hidden');
    classlist.add(document.body, 'u-overflow-y-hidden');

    this.scope.$on(layout.LayoutEvent.DRAGGING, this.onLayoutDragging_.bind(this));
    this.scope.$on(layout.LayoutEvent.TOGGLE_PANEL, this.onToggleLayoutPanel_.bind(this));
    this.scope.$on(layout.LayoutEvent.REMOVE_ALL, this.onWidgetCloseAll_.bind(this));
    this.scope.$on(layout.LayoutEvent.RESET, this.onWidgetReset_.bind(this));

    this.scope.$on(NavEvent.SET_TAB, this.onSetTab_.bind(this));
    this.scope.$on(NavEvent.ADD_TAB, this.onAddTab_.bind(this));
    this.scope.$on(NavEvent.REMOVE_TAB, this.onRemoveTab_.bind(this));
  }

  /**
   * @inheritDoc
   */
  destroy() {
    Settings.getInstance().set(this.getConfigKeys_(), this.persist());

    super.destroy();

    dispose(this.keyHandler_);
    this.keyHandler_ = undefined;

    dispose(this.layoutStateDelay_);
    this.layoutStateDelay_ = undefined;

    if (this['layout']) {
      this['layout'].destroy();
      this['layout'] = undefined;
    }

    this.disposeActions_();

    // TODO: os.ui.pluginManager is created in os.ui.AbstractMainCtrl and will probably be removed at some point
    dispose(ui.pluginManager);
    ui.pluginManager = undefined;

    this.element = undefined;
    this.compile = undefined;
    this.timeout = undefined;
  }

  /**
   * Initialize bindings to global references that need to be shared with the main application window. If you need access
   * to something that isn't in the list, add it to {@link mist.MainCtrl#initializeExports_} or you'll have a bad time.
   * @inheritDoc
   */
  initInstances() {
    // Tools has its own plugin manager
    // TODO: os.ui.pluginManager is created in os.ui.AbstractMainCtrl and will probably be removed at some point
    // This might even be invalid right now.
    ui.pluginManager = PluginManager.getInstance();
    ui.pluginManager.listenOnce(EventType.LOAD, this.onPluginsLoaded, false, this);

    var xports = analyze.getExports();
    if (xports) {
      var registerExternal = /** @type {Function} */ (getValueByKeys(xports, ['registerExternal']));
      registerExternal(this.windowId, window);
    }

    analyze.restoreSingletonsFromExports();
  }

  /**
   * @inheritDoc
   */
  initialize() {
    super.initialize();

    time.initOffset();

    // find the main mist application
    var xports = analyze.getExports();
    if (xports) {
      const exportManager = /** @type {ExportManager} */ (getValueByKeys(xports, ['exportManager']));
      if (os.inIframe()) {
        // internal tools should reuse the main export manager so dialogs are launched in the main window
        Object.assign(ExportManager, {
          getInstance: function() {
            return exportManager;
          }
        });

        // TODO: Can't really do anything about this now

        const launchColumnManager = getValueByKeys(xports, ['functions', 'launchColumnManager']);
        column.launchColumnManager = /** @type {!Function} */ (launchColumnManager);

        const edit = getValueByKeys(xports, ['functions', 'launchFilterEdit']);
        BaseFilterManager.edit = /** @type {!Function} */ (edit);

        const launchPropertyInfo = getValueByKeys(xports, ['functions', 'launchPropertyInfo']);
        ui.launchPropertyInfo = /** @type {!Function} */ (launchPropertyInfo);
      } else {
        // we want export methods to run in the main application window context so any instanceof or
        // goog.asserts.assertInstanceof checks will be comparing objects to classes in the correct context. this was a
        // problem with the KML exporter, which uses OL3 functions calling goog.asserts.assertInstanceOf. it worked in
        // compiled mode (assertions removed), but failed in debug mode.
        const em = ExportManager.getInstance();
        em.registerExportMethod(exportManager.getExportMethods());

        // external tools should create its own persistence methods so dialogs are launched locally
        em.registerPersistenceMethod(new FilePersistence());
      }

      // show alerts in all windows, regardless of the where the alert occurs
      const alertManager = getValueByKeys(xports, ['AlertManager']);
      AlertManager.setInstance(/** @type {!AlertManager} */ (alertManager));

      // try to connect the DataManager
      const dm = DataManager.getInstance();
      os.setDataManager(dm);

      const datamanager = getValueByKeys(xports, ['dataManager']);
      if (dm && dm === datamanager && Dispatcher.getInstance()) {
        this['connected'] = true;
      }
    }

    // register supported charts
    chart.registerVegaCharts();
  }

  /**
   * @inheritDoc
   */
  onClose() {
    window.removeEventListener(EventType.UNLOAD, this.onClose.bind(this), true);

    // do not persist after disposal, or the config will be empty
    if (this.scope) {
      Settings.getInstance().set(this.getConfigKeys_(), this.persist());
    }

    time.disposeOffset();

    // unregister with the main application
    var xports = analyze.getExports();
    if (xports) {
      var unregisterExternal = /** @type {Function} */ (getValueByKeys(xports, ['unregisterExternal']));
      unregisterExternal(this.windowId);
    }

    // Destroy the root scope
    // In normal applications this would not be necessary. However, since this application
    // sets up many listeners to things in the main window, we need to clean these listeners
    // up before the window closes.
    var scope = angular.element('.ng-scope').scope();
    if (scope && scope.$root) {
      scope.$root.$destroy();
    }
  }

  /**
   * Handle viewport resize events.
   * @private
   */
  onViewportResize_() {
    if (this['layout']) {
      this['layout'].updateSize();
    }
  }

  /**
   * Handle update size delay.
   * @private
   */
  onThemeChange_() {
    // the browser can take a moment to update everything, and waitForAngular isn't particularly helpful here
    if (this.timeout) {
      this.timeout(this.onViewportResize_.bind(this), 500);
    }
  }

  /**
   * @inheritDoc
   */
  registerListeners() {
    var vsm = ViewportSizeMonitor.getInstanceForWindow();
    vsm.listen(EventType.RESIZE, this.onViewportResize_, false, this);

    // update the layout when the theme changes
    Settings.getInstance().listen(Keys.THEME, this.onThemeChange_, false, this);
  }

  /**
   * @inheritDoc
   */
  removeListeners() {
    var vsm = ViewportSizeMonitor.getInstanceForWindow();
    vsm.unlisten(EventType.RESIZE, this.onViewportResize_, false, this);

    Settings.getInstance().unlisten(Keys.THEME, this.onThemeChange_, false, this);
  }

  /**
   * @inheritDoc
   */
  onPluginsLoaded(event) {
    super.onPluginsLoaded(event);

    if (this.scope) {
      // internal and external will be restored separately, since they typically have very different screen real
      // estate available.
      var config = /** @type {(Object|undefined)} */ (Settings.getInstance().get(this.getConfigKeys_()));

      // the object that we get from Settings is created in the main window context, so do a deep clone to recreate
      // it in this window context.
      // this is done to workaround a bad {@code array instanceof Array} check in GoldenLayout that fails without it
      config = util.transform(osObject.unsafeClone(config));

      // wait for Angular to initialize everything prior to restoring tools
      ui.waitForAngular(function() {
        // restore previous state, or initialize from an empty state
        this.restore(config || {});

        // initialize the layout
        this.initLayout_();
      }.bind(this));

      // set up key handlers using capture instead of bubble
      this.keyHandler_ = new KeyHandler(dom.getDocument(), true);
      this.keyHandler_.listen(KeyEvent.EventType.KEY, this.handleKeyEvent_, true, this);
    }
  }

  /**
   * Initializes all action managers for the analyze window.
   * @private
   */
  initActions_() {
    ListMenu.setup();
    CountByMenu.setup();
  }

  /**
   * Initializes all action managers for the analyze window.
   * @private
   */
  disposeActions_() {
    ListMenu.dispose();
    CountByMenu.dispose();
  }

  /**
   * Get the Golden Layout instance.
   * @private
   */
  initLayout_() {
    var layoutContainer = document.getElementById(LAYOUT_CONTAINER_ID);
    if (layoutContainer && this.scope) {
      // we've encountered an issue where this array contains duplicate configs, this removeDuplicates call fixes it
      googArray.removeDuplicates(this['layoutConfigs'], undefined, function(config) {
        return config['$$hashKey'] || osString.randomString();
      });

      if (!this.layoutConfig_) {
        this['layoutConfigs'] = util.getDefaultConfigs();
        this.layoutConfig_ = this['layoutConfigs'][0];
        this.layoutConfig_['active'] = true;
      }

      if (!this.layoutConfig_['content'] || !this.layoutConfig_['content'].length) {
        this.layoutConfig_['content'] = util.createDefaultContent();
      } else {
        // clean up potential configuration snafus
        layout.cleanConfig(this.layoutConfig_);
      }

      if (!this['layout']) {
        this['layout'] = new GoldenLayout(this.layoutConfig_, layoutContainer);
        this['layout'].registerComponent('angular', AngularComponent.bind(undefined, this.scope));
        this['layout'].on(layout.GoldenLayoutEvent.STATE_CHANGED, function(event) {
          if (this.layoutStateDelay_) {
            this.layoutStateDelay_.start();
          }

          this.scope.$broadcast(ResizeEventType.UPDATE_RESIZE);
        }, this);
        this['layout'].init();
      }
    }
  }

  /**
   * Handle layout state changed delay completion.
   * @private
   */
  onLayoutStateDelay_() {
    // persist the layout if it hasn't been destroyed
    if (this['layout']) {
      this.layoutConfig_['content'] = this['layout'].toConfig()['content'];
      Settings.getInstance().set(this.getConfigKeys_(), this.persist());
    }
  }

  /**
   * Get the Settings keys used to store config. Internal and external configs are stored separately because these will
   * generally have very different screen real estate available.
   * @return {!Array<string>}
   * @private
   */
  getConfigKeys_() {
    return ['toolsWindow', (os.inIframe() ? 'internal' : 'external')];
  }

  /**
   * Handle layout dragging events.
   * @param {!angular.Scope.Event} event The Angular event.
   * @param {boolean=} opt_dragging The layout dragging state.
   * @private
   */
  onLayoutDragging_(event, opt_dragging) {
    event.stopPropagation();

    // hide the layout panel while a component is being dragged and show it again when dragging stops
    if (opt_dragging && this['showLayoutPanel']) {
      this['showLayoutPanel'] = false;
      this.restoreLayoutOnDragStop_ = true;
    } else if (opt_dragging === false && this.restoreLayoutOnDragStop_) {
      this.restoreLayoutOnDragStop_ = false;
      this['showLayoutPanel'] = true;
    }

    ui.apply(this.scope);
  }

  /**
   * Handle Angular events to toggle the layout options panel.
   * @param {!angular.Scope.Event} event The Angular event.
   * @param {boolean=} opt_value Optional value. If not set, the value will be toggled.
   * @private
   */
  onToggleLayoutPanel_(event, opt_value) {
    this['showLayoutPanel'] = opt_value != null ? opt_value : !this['showLayoutPanel'];
  }

  /**
   * Handle widget "close all" event.
   * @param {!angular.Scope.Event} event The event.
   * @private
   */
  onWidgetCloseAll_(event) {
    event.stopPropagation();

    if (this['layout'] && this['layout'].root && this['layout'].root.contentItems &&
        this['layout'].root.contentItems.length) {
      // remove all content from the root node
      this['layout'].root.contentItems[0].remove();
    }

    this.layoutConfig_['content'] = this['layout'].toConfig()['content'];

    this.persist();
  }

  /**
   * Resets widgets to the default
   * @param {!angular.Scope.Event} event The event.
   * @private
   */
  onWidgetReset_(event) {
    event.stopPropagation();

    if (this['layout'] && this['layout'].root) {
      if (this['layout'].root.contentItems && this['layout'].root.contentItems.length) {
        // remove the root content item
        this['layout'].root.contentItems[0].remove();
      }

      // add the default content
      this['layout'].root.addChild(util.createDefaultContent()[0]);
    }

    this.layoutConfig_['content'] = this['layout'].toConfig()['content'];

    this.persist();
  }

  /**
   * Handles events to set the current tab.
   * @param {!angular.Scope.Event} event The event.
   * @param {!GoldenLayout.Config} config The config corresponding to the tab to set.
   * @private
   */
  onSetTab_(event, config) {
    event.stopPropagation();

    this.setTab_(config);
  }

  /**
   * Handles events to add a new tab.
   * @param {!angular.Scope.Event} event The event.
   * @param {GoldenLayout.Config=} opt_config Optional config parameter
   * @private
   */
  onAddTab_(event, opt_config) {
    event.stopPropagation();

    var config = opt_config ||
    /** @type {!GoldenLayout.Config} */ (Settings.getInstance().get('toolsWindow.defaultConfig', {}));

    if (!opt_config) {
      config['title'] = 'New Tab ' + this.tabCount_++;
      config['content'] = util.createDefaultContent();
      config['showClose'] = true;
    }

    this['layoutConfigs'].push(config);
    this.setTab_(config);
  }

  /**
   * Removes a tab.
   * @param {!angular.Scope.Event} event The event.
   * @param {!GoldenLayout.Config} config The config corresponding to the tab to remove.
   * @private
   */
  onRemoveTab_(event, config) {
    event.stopPropagation();

    if (config['showClose']) {
      // don't even try if the tab is not removable
      var removedIndex = olArray.findIndex(this['layoutConfigs'], function(c) {
        return config === c;
      });
      var currentIndex = olArray.findIndex(this['layoutConfigs'], function(c) {
        return this.layoutConfig_ === c;
      }.bind(this));

      googArray.remove(this['layoutConfigs'], config);

      if (currentIndex == this['layoutConfigs'].length) {
        // if we were on the last tab, go to the new last tab
        this.setTab_(googArray.peek(this['layoutConfigs']));
      } else if (removedIndex == currentIndex) {
        // current tab was removed, so set us to the new tab at the current index
        this.setTab_(this['layoutConfigs'][currentIndex]);
      }

      // otherwise do nothing as the current tab was not removed
    }
  }

  /**
   * Removes a tab.
   * @param {!GoldenLayout.Config} config The config corresponding to the tab to remove.
   * @private
   */
  setTab_(config) {
    var layoutContainer = document.getElementById(LAYOUT_CONTAINER_ID);
    if (layoutContainer && this.scope) {
      this.layoutConfig_['active'] = false;
      this.layoutConfig_ = config;
      this.layoutConfig_['active'] = true;

      var root = this['layout'].root;
      if (root.contentItems && root.contentItems.length) {
        // remove the root content item
        root.contentItems[0].remove();
      }

      // BARF. GoldenLayout blows up on setting an element with no child content here for some reason, so I have to
      // check all of this garbage to make sure it doesn't.
      if (this.layoutConfig_['content'][0] &&
          this.layoutConfig_['content'][0]['content'] &&
          this.layoutConfig_['content'][0]['content'].length > 0) {
        root.addChild(this.layoutConfig_['content'][0]);
      }

      this.persist();
    }
  }

  /**
   * @inheritDoc
   */
  persist(opt_to) {
    opt_to = opt_to || {};

    if (this.scope && this.scope['source']) {
      opt_to['source'] = this.scope['source'].getId();
    }

    if (this['layoutConfigs']) {
      opt_to['layoutConfigs'] = osObject.unsafeClone(this['layoutConfigs']);
    }

    return opt_to;
  }

  /**
   * @inheritDoc
   */
  restore(config) {
    if (config['source']) {
      var source = DataManager.getInstance().getSource(/** @type {string} */ (config['source']));
      if (source && source.isEnabled() && source.getVisible() && source.getFeatureCount() > 0) {
        // restore the last used source if it's still available, visible and has features. otherwise allow the source
        // picker to auto select one.
        this.scope['source'] = source;
        this.scope.$broadcast(NavEvent.SOURCE, source);
      }
    }

    this['layoutConfigs'] = config['layoutConfigs'] || [];

    for (var i = 0, ii = this['layoutConfigs'].length; i < ii; i++) {
      if (this['layoutConfigs'][i]['active']) {
        // set the current config to the active one in the array
        this.layoutConfig_ = /** @type {GoldenLayout.Config|undefined} */ (this['layoutConfigs'][i]);
        break;
      }
    }

    ui.apply(this.scope);
  }

  /**
   * Handle keyboard events.
   * @param {goog.events.KeyEvent} event
   * @private
   */
  handleKeyEvent_(event) {
    var ctrlOr = os.isOSX() ? event.metaKey : event.ctrlKey;

    if (!document.querySelector(ui.MODAL_SELECTOR)) {
      switch (event.keyCode) {
        case KeyCodes.A:
          if (ctrlOr) {
            event.preventDefault();
            event.stopPropagation();
            if (event.shiftKey) this.timeout(this.showAll.bind(this)); // instead of selectNone; most people use Ctrl+D
            else this.timeout(this.selectAll.bind(this));
          }
          break;
        case KeyCodes.D:
          if (ctrlOr) {
            event.preventDefault();
            event.stopPropagation();
            this.timeout(this.selectNone.bind(this));
          }
          break;
        case KeyCodes.H:
          if (ctrlOr) {
            event.preventDefault();
            event.stopPropagation();
            // key handler doesn't get called in chrome for Ctrl+Shift+H
            if (event.shiftKey) this.timeout(this.showAll.bind(this));
            else this.timeout(this.hideSelected.bind(this));
          }
          break;
        case KeyCodes.Y:
          if (ctrlOr) {
            event.preventDefault();
            this.timeout(this.redoCommand.bind(this));
          }
          break;
        case KeyCodes.Z:
          if (ctrlOr) {
            event.preventDefault();
            // macs default to cmd+shift+z for undo
            var callback = event.shiftKey ? this.redoCommand : this.undoCommand;
            this.timeout(callback.bind(this));
          }
          break;
        case KeyCodes.OPEN_SQUARE_BRACKET:
          if (ctrlOr) {
            event.preventDefault();
            this.scope.$broadcast(NavEvent.PREV_SOURCE);
            ui.apply(this.scope);
          }
          break;
        case KeyCodes.CLOSE_SQUARE_BRACKET:
          if (ctrlOr) {
            event.preventDefault();
            this.scope.$broadcast(NavEvent.NEXT_SOURCE);
            ui.apply(this.scope);
          }
          break;
        default:
          break;
      }
    }
  }

  /**
   * Undo the last command.
   */
  undoCommand() {
    Metrics.getInstance().updateMetric(keys.Map.UNDO, 1);
    CommandProcessor.getInstance().undo();
  }

  /**
   * Redo the last undone command.
   */
  redoCommand() {
    Metrics.getInstance().updateMetric(keys.Map.REDO, 1);
    CommandProcessor.getInstance().redo();
  }

  /**
   * Select all the items in this source
   */
  selectAll() {
    const source = this.scope['source'];
    if (source) source.selectAll();
  }

  /**
   * Deselect all the items in this source
   */
  selectNone() {
    const source = this.scope['source'];
    if (source) source.selectNone();
  }

  /**
   * Hide the selected items from this source
   */
  hideSelected() {
    // implemented as a command because it's a destructive action; also follows chartmenu.js DISPLAY_ALL click handler
    const source = this.scope['source'];
    if (!source) return;

    var selected = source.getSelectedItems();
    const cmd = (selected && selected.length > 0) ?
      new FeaturesVisibility(source.getId(), selected, false) :
      null;

    if (cmd) {
      CommandProcessor.getInstance().addCommand(cmd);
    }
  }

  /**
   * Show all the items from this source; bringing back any manually filtered/hidden items
   */
  showAll() {
    // implemented as a command because it's a destructive action; also follows chartmenu.js DISPLAY_ALL click handler
    const source = this.scope['source'];
    if (!source) return;

    const cmd = new FeaturesVisibility(source.getId(), source.getHiddenItems(), true);

    if (cmd) {
      CommandProcessor.getInstance().addCommand(cmd);
    }
  }
}

/**
 * Logger
 * @type {Logger}
 * @private
 * @const
 */
const LOGGER_ = log.getLogger('tools.ui.AbstractToolsMainCtrl');


/**
 * @inheritDoc
 */
Controller.prototype.doCertNazi = fn.noop;
exports = Controller;
