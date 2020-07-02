goog.module('metacarta');

const MetacartaPlugin = goog.require('plugin.metacarta.MetacartaPlugin');
os.plugin.PluginManager.getInstance().addPlugin(MetacartaPlugin.getInstance());
