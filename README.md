# Analyze Tools for OpenSphere

This is a wrapper project that contains modified `plugin.mist.MISTPlugin` and `toolsmain.js`
files (`toolsplugin.js` and `toolsmain.js`). The goal here is to produce a plugin that only
references the Analyze window, List Tool, Count By, and Charts. All other plugins/widgets
are excluded. This is the quick-and-dirty solution to getting the Analyze window into GV.

## Environment

Your workspace (or build job), must clone [MIST](https://gitlab.devops.geointservices.io/uncanny-cougar/mist)
to `mist/` (not `opensphere-plugin-mist`) and also clone
[bits-internal](https://gitlab.devops.geointservices.io/uncanny-cougar/bits-internal).

`npm-workspace install` will need to be run in both of those. For build jobs, linking
or using npm link should suffice to wire up those projects before running `npm install --production`.

## Security

Due to the fact that the `bits-internal` and `mist` projects are private code, any builds
running with this plugin should only run in an uncanny-cougar security context.
