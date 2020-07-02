goog.module('voyager');

const VoyagerPlugin = goog.require('plugin.voyager.VoyagerPlugin');
os.plugin.PluginManager.getInstance().addPlugin(new VoyagerPlugin());
