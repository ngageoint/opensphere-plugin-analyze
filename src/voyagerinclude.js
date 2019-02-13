goog.provide('voyager');
goog.require('plugin.voyager.VoyagerPlugin');

(function() {
  os.plugin.PluginManager.getInstance().addPlugin(plugin.voyager.VoyagerPlugin.getInstance());
})();
