goog.provide('metacarta');
goog.require('plugin.metacarta.MetacartaPlugin');

(function() {
  os.plugin.PluginManager.getInstance().addPlugin(plugin.metacarta.MetacartaPlugin.getInstance());
})();
