goog.module('imagery');

const ImageryPlugin = goog.require('plugin.imagery.ImageryPlugin');
os.plugin.PluginManager.getInstance().addPlugin(ImageryPlugin.getInstance());
