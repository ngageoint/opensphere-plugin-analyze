goog.provide('voyager');
goog.require('plugin.voyager.VoyagerPlugin');

(function() {
  os.plugin.PluginManager.getInstance().addPlugin(new plugin.voyager.VoyagerPlugin());
})();
