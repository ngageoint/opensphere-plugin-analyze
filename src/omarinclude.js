goog.provide('omar');
goog.require('plugin.omar.OMARPlugin');

(function() {
  os.plugin.PluginManager.getInstance().addPlugin(plugin.omar.OMARPlugin.getInstance());
})();
