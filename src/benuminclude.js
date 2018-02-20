goog.provide('benum');
goog.require('plugin.benum.BEPlugin');

(function() {
  os.plugin.PluginManager.getInstance().addPlugin(plugin.benum.BEPlugin.getInstance());
})();
