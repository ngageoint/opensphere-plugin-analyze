goog.provide('imagery');
goog.require('plugin.imagery.ImageryPlugin');

(function() {
  os.plugin.PluginManager.getInstance().addPlugin(plugin.imagery.ImageryPlugin.getInstance());
})();
